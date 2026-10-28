import express from 'express';
import type { Request, Response, NextFunction } from 'express';

import type { BatteryPassport } from '../../types/index.ts';
import { requireRoles } from '../rbac.ts';
import { getRepository } from '../repository.ts';
import type { InMemoryBatteryRepository } from '../repository.ts';
import {
  ValidationError,
  validateOptimizationRequest,
  validateQuantumRequest,
} from '../schemas/qpiai.ts';
import type { IntegrationsStatusResponse } from '../schemas/qpiai.ts';
import {
  QpiAIOptIntegration,
  qpiaiOptIntegration,
} from '../integrations/qpiai_opt.ts';
import {
  QpiAIQCloudIntegration,
  qpiaiQCloudIntegration,
} from '../integrations/qpiai_qcloud.ts';

export interface QpiAIRouterDeps {
  optAdapter?: QpiAIOptIntegration;
  qcloudAdapter?: QpiAIQCloudIntegration;
  getRepo?: () => Pick<InMemoryBatteryRepository, 'getPassportById' | 'getAllPassports'>;
  maxRequestsPerMinute?: number;
}

export function createQpiAIRouter(deps: QpiAIRouterDeps = {}): express.Router {
  const router = express.Router();
  const optAdapter = deps.optAdapter ?? qpiaiOptIntegration;
  const qcloudAdapter = deps.qcloudAdapter ?? qpiaiQCloudIntegration;
  const resolveRepo = deps.getRepo ?? getRepository;
  const maxRpm = deps.maxRequestsPerMinute ?? 30;

  // Bounded sliding-window rate limiter per authenticated actor / IP
  const requestLog = new Map<string, number[]>();
  const rateLimitMiddleware = (req: Request, res: Response, next: NextFunction): void => {
    const user = (req as any).currentUser;
    const key = user?.sub || req.ip || 'anonymous';
    const now = Date.now();
    const windowStart = now - 60_000;
    const recent = (requestLog.get(key) ?? []).filter(ts => ts > windowStart);

    if (recent.length >= maxRpm) {
      res.status(429).json({
        detail: `Rate limit exceeded (${maxRpm} QpiAI requests per minute). Please retry shortly.`,
      });
      return;
    }
    recent.push(now);
    requestLog.set(key, recent);
    next();
  };

  /**
   * GET /integrations/status
   * Reports verified SDK availability, credential presence (boolean only),
   * endpoint reachability, simulator-only vs hardware mode, and demo fallback status.
   */
  router.get('/integrations/status', async (_req: Request, res: Response) => {
    const [optStatus, qcloudStatus] = await Promise.all([
      optAdapter.getStatus(),
      qcloudAdapter.getStatus(),
    ]);

    const payload: IntegrationsStatusResponse = {
      checked_at: new Date().toISOString(),
      overall_summary: `QpiAI Opt: ${optStatus.status} | QpiAI QCloud: ${qcloudStatus.status}`,
      qpiai_opt: optStatus,
      qpiai_qcloud: qcloudStatus,
    };

    res.json(payload);
  });

  /**
   * POST /optimization/run
   * Runs constrained battery disposition optimization (reuse, second-life BESS,
   * remanufacturing, material recycling) using trusted repository battery passports.
   */
  router.post(
    '/optimization/run',
    requireRoles(['MANUFACTURER', 'FLEET_OPERATOR', 'RECYCLER', 'REGULATOR_AUDITOR']),
    rateLimitMiddleware,
    async (req: Request, res: Response) => {
      try {
        const securityWarnings: string[] = [];

        // Detect and ignore any client attempt to override stored battery attributes or safety state
        if (
          req.body &&
          typeof req.body === 'object' &&
          ('battery_overrides' in req.body ||
            'batteries' in req.body ||
            'override_status' in req.body ||
            'override_soh' in req.body)
        ) {
          securityWarnings.push(
            'Ignored client-supplied battery attribute overrides; optimization strictly uses authoritative passport records from the repository.'
          );
        }

        const validated = validateOptimizationRequest(req.body);
        const repo = resolveRepo();

        const trustedPassports: BatteryPassport[] = [];
        const missingIds: string[] = [];

        for (const id of validated.battery_ids) {
          const passport = await repo.getPassportById(id);
          if (!passport) {
            missingIds.push(id);
          } else {
            trustedPassports.push(passport);
          }
        }

        const response = await optAdapter.runOptimization(
          validated,
          trustedPassports,
          missingIds,
          securityWarnings
        );

        if (response.solver_status === 'INVALID_INPUT') {
          res.status(400).json(response);
          return;
        }

        res.json(response);
      } catch (err: any) {
        if (err instanceof ValidationError) {
          res.status(400).json({ detail: err.message });
          return;
        }
        res.status(500).json({
          detail: `Unexpected optimization router error: ${err?.message || String(err)}`,
        });
      }
    }
  );

  /**
   * POST /quantum/run
   * Executes a small, predefined, scientifically bounded quantum circuit experiment
   * via QpiAI Quantum SDK / QCloud (or explicitly labelled demo simulation when requested).
   */
  router.post(
    '/quantum/run',
    requireRoles(['MANUFACTURER', 'FLEET_OPERATOR', 'RECYCLER', 'REGULATOR_AUDITOR']),
    rateLimitMiddleware,
    async (req: Request, res: Response) => {
      try {
        const validated = validateQuantumRequest(req.body);
        const repo = resolveRepo();

        const trustedPassports: BatteryPassport[] = [];
        if (validated.battery_ids && validated.battery_ids.length > 0) {
          for (const id of validated.battery_ids) {
            const passport = await repo.getPassportById(id);
            if (!passport) {
              res.status(404).json({
                detail: `Trusted battery passport '${id}' was not found in registry.`,
              });
              return;
            }
            trustedPassports.push(passport);
          }
        } else {
          const all = await repo.getAllPassports();
          trustedPassports.push(...all.slice(0, 2));
        }

        const response = await qcloudAdapter.runQuantumExperiment(
          validated,
          trustedPassports
        );
        res.json(response);
      } catch (err: any) {
        if (err instanceof ValidationError) {
          res.status(400).json({ detail: err.message });
          return;
        }
        res.status(500).json({
          detail: `Unexpected quantum router error: ${err?.message || String(err)}`,
        });
      }
    }
  );

  return router;
}
