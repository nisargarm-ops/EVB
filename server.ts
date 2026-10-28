import dotenv from 'dotenv';
dotenv.config({ override: true });

import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import type { Request, Response } from 'express';
import type { AuthRequest } from './src/server/auth.ts';
import {
  ROLE_DEFAULT_ORGS,
  ROLE_PROFILE_UUIDS,
  actorToProfile,
  createAuthMiddleware,
  issueServerJwt,
  normalizeUserRole,
} from './src/server/auth.ts';
import { DomainError, supabaseBackendRepo } from './src/server/supabaseRepository.ts';
import { QpiAIOptEngine, QpiAIQuantumEngine } from './src/services/qpiai.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '1mb' }));

  const auth = createAuthMiddleware((uid, email, meta, rawToken) =>
    supabaseBackendRepo.resolveOrSyncSupabaseUser(uid, email, meta, rawToken)
  );

  const apiRouter = express.Router();

  function sendError(res: Response, err: unknown, fallbackMsg: string) {
    if (err instanceof DomainError) {
      res.status(err.statusCode).json({ detail: err.message });
      return;
    }
    console.error(fallbackMsg, err);
    res.status(500).json({ detail: fallbackMsg });
  }

  // Health & Live Supabase Connectivity Diagnostics
  apiRouter.get('/health', async (_req: Request, res: Response) => {
    const dbStatus = await supabaseBackendRepo.getDatabaseStatus();
    res.json({
      status: 'ok',
      service: process.env.PROJECT_NAME || 'BatteryPass 360',
      database: dbStatus,
    });
  });

  apiRouter.get('/db/status', async (_req: Request, res: Response) => {
    const status = await supabaseBackendRepo.getDatabaseStatus();
    res.json(status);
  });

  // Authentication & Stakeholder Persona Endpoints
  apiRouter.post('/auth/switch-role', auth.optionalAuth, async (req: AuthRequest, res: Response) => {
    try {
      const envName = String(process.env.ENVIRONMENT || 'development').toLowerCase();
      const allowSwitch =
        String(process.env.ENABLE_DEV_ROLE_SWITCHING ?? 'true').toLowerCase() === 'true';

      if (!allowSwitch || envName === 'production') {
        res.status(403).json({
          detail:
            'Role switching endpoint is disabled in production. Authenticate via Supabase Auth.',
        });
        return;
      }

      const targetRole = normalizeUserRole(req.body?.role);
      if (targetRole === 'ADMINISTRATOR' && req.actor?.role !== 'ADMINISTRATOR') {
        res.status(403).json({
          detail:
            'Privilege escalation denied: You cannot switch to Administrator without existing administrator credentials.',
        });
        return;
      }

      const defaults = ROLE_DEFAULT_ORGS[targetRole];
      let orgId = defaults.id;
      let orgName = String(req.body?.organization || defaults.name).trim();

      if (supabaseBackendRepo.isConfigured() && targetRole !== 'PUBLIC') {
        const resolvedOrg = await supabaseBackendRepo.resolveOrCreateOrganization(
          orgName,
          targetRole
        );
        orgId = resolvedOrg.id;
        orgName = resolvedOrg.name;
      }

      const actorPayload = {
        id: ROLE_PROFILE_UUIDS[targetRole],
        email: defaults.email,
        full_name: defaults.fullName,
        role: targetRole,
        organization_id: orgId,
        organization_name: orgName,
      };

      const token = issueServerJwt(
        actorPayload,
        Number(process.env.ACCESS_TOKEN_EXPIRE_MINUTES) || 1440
      );

      res.json({
        access_token: token,
        token_type: 'bearer',
        role: targetRole,
        organization: orgName,
        user: actorPayload,
      });
    } catch (err) {
      sendError(res, err, 'Failed to switch role');
    }
  });

  apiRouter.get('/auth/me', auth.requireAuth, async (req: AuthRequest, res: Response) => {
    res.json(actorToProfile(req.actor!));
  });

  apiRouter.post('/auth/sync-profile', auth.requireAuth, async (req: AuthRequest, res: Response) => {
    res.json(actorToProfile(req.actor!));
  });

  // Enterprise Directory
  apiRouter.get('/organizations', async (_req: Request, res: Response) => {
    try {
      const orgs = await supabaseBackendRepo.listOrganizations();
      res.json(orgs);
    } catch (err) {
      sendError(res, err, 'Failed to load enterprise directory');
    }
  });

  // Battery Passports
  apiRouter.get('/passports', async (req: Request, res: Response) => {
    try {
      const status = typeof req.query.status === 'string' ? req.query.status : undefined;
      const list = await supabaseBackendRepo.listPassports(status);
      res.json(list);
    } catch (err) {
      sendError(res, err, 'Failed to fetch battery passports');
    }
  });

  apiRouter.get('/passports/:id', async (req: Request, res: Response) => {
    try {
      const passport = await supabaseBackendRepo.getPassport(String(req.params.id));
      res.json(passport);
    } catch (err) {
      sendError(res, err, 'Failed to load battery passport');
    }
  });

  apiRouter.post(
    '/passports',
    auth.requireRoles(['MANUFACTURER', 'ADMINISTRATOR']),
    async (req: AuthRequest, res: Response) => {
      try {
        const created = await supabaseBackendRepo.createPassport(req.body, req.actor!);
        res.status(201).json(created);
      } catch (err) {
        sendError(res, err, 'Failed to register battery passport');
      }
    }
  );

  apiRouter.patch(
    '/passports/:id/telemetry',
    auth.requireRoles([
      'MANUFACTURER',
      'OEM',
      'FLEET_OPERATOR',
      'SERVICE_CENTER',
      'REMANUFACTURER',
      'ADMINISTRATOR',
    ]),
    async (req: AuthRequest, res: Response) => {
      try {
        const updated = await supabaseBackendRepo.updateTelemetry(
          String(req.params.id),
          req.body,
          req.actor!
        );
        res.json(updated);
      } catch (err) {
        sendError(res, err, 'Failed to update battery telemetry');
      }
    }
  );

  // Custody Hash-Chain Events
  apiRouter.get('/custody/:batteryId', async (req: Request, res: Response) => {
    try {
      const events = await supabaseBackendRepo.getCustodyEvents(String(req.params.batteryId));
      res.json(events);
    } catch (err) {
      sendError(res, err, 'Failed to load custody events');
    }
  });

  apiRouter.post(
    '/custody/:batteryId/events',
    auth.requireAuth,
    async (req: AuthRequest, res: Response) => {
      try {
        const ev = await supabaseBackendRepo.appendCustodyEvent(
          String(req.params.batteryId),
          req.body,
          req.actor!
        );
        res.status(201).json(ev);
      } catch (err) {
        sendError(res, err, 'Failed to append custody event');
      }
    }
  );

  // Custody Transfers
  apiRouter.get('/custody-transfers', async (_req: Request, res: Response) => {
    try {
      const transfers = await supabaseBackendRepo.listTransfers();
      res.json(transfers);
    } catch (err) {
      sendError(res, err, 'Failed to load custody transfers');
    }
  });

  apiRouter.post(
    '/custody-transfers',
    auth.requireAuth,
    async (req: AuthRequest, res: Response) => {
      try {
        const created = await supabaseBackendRepo.createTransfer(req.body, req.actor!);
        res.status(201).json(created);
      } catch (err) {
        sendError(res, err, 'Failed to initiate custody transfer');
      }
    }
  );

  apiRouter.post(
    '/custody-transfers/:id/accept',
    auth.requireAuth,
    async (req: AuthRequest, res: Response) => {
      try {
        const accepted = await supabaseBackendRepo.acceptTransfer(
          String(req.params.id),
          req.body?.notes,
          req.actor!
        );
        res.json(accepted);
      } catch (err) {
        sendError(res, err, 'Failed to accept custody transfer');
      }
    }
  );

  apiRouter.post(
    '/custody-transfers/:id/reject',
    auth.requireAuth,
    async (req: AuthRequest, res: Response) => {
      try {
        const rejected = await supabaseBackendRepo.rejectTransfer(
          String(req.params.id),
          String(req.body?.reason || ''),
          req.actor!
        );
        res.json(rejected);
      } catch (err) {
        sendError(res, err, 'Failed to reject custody transfer');
      }
    }
  );

  // Public QR Verification & Cryptographic Audit Trail
  apiRouter.get('/verify/:batteryId/audit-trail', async (req: Request, res: Response) => {
    try {
      const audit = await supabaseBackendRepo.verifyAuditTrail(String(req.params.batteryId));
      res.json(audit);
    } catch (err) {
      sendError(res, err, 'Failed to verify cryptographic audit trail');
    }
  });

  apiRouter.get('/verify/:batteryId', async (req: Request, res: Response) => {
    try {
      const cert = await supabaseBackendRepo.verifyPublic(String(req.params.batteryId));
      res.json(cert);
    } catch (err) {
      sendError(res, err, 'Failed to verify public battery passport');
    }
  });

  // Disposition Decisions
  apiRouter.get('/decisions/:batteryId', async (req: Request, res: Response) => {
    try {
      const decision = await supabaseBackendRepo.getDispositionDecision(
        String(req.params.batteryId)
      );
      res.json(decision);
    } catch (err) {
      sendError(res, err, 'Failed to load disposition decision');
    }
  });

  // QpiAI Optimization & Quantum Endpoints (persisting execution records in Supabase)
  apiRouter.post(
    '/qpiai/opt/allocate',
    auth.optionalAuth,
    async (req: AuthRequest, res: Response) => {
      try {
        const batteryIds: string[] = Array.isArray(req.body?.battery_ids)
          ? req.body.battery_ids.map(String)
          : ['BAT-NMC-8A2F91C0'];

        const batteryData: Array<{
          battery_id: string;
          state_of_health_pct: number;
          cycle_count: number;
          total_co2_kg_per_kwh: number;
        }> = [];

        for (const id of batteryIds) {
          try {
            const p = await supabaseBackendRepo.getPassport(id);
            batteryData.push({
              battery_id: p.battery_id,
              state_of_health_pct: p.health_state.state_of_health_pct,
              cycle_count: p.health_state.cycle_count,
              total_co2_kg_per_kwh: p.carbon_footprint.total_co2_kg_per_kwh,
            });
          } catch {
            // Skip unknown IDs safely
          }
        }

        if (batteryData.length === 0) {
          res.status(400).json({ detail: 'No valid battery passports found for optimization.' });
          return;
        }

        const result = await QpiAIOptEngine.solveAllocation(batteryData);
        await supabaseBackendRepo.logQpiAIExecution({
          engineType: 'QPIAI_OPT',
          batteryId: batteryData[0].battery_id,
          actor: req.actor,
          rawStatus: result.status,
          backend: 'QpiAI-Opt-Cloud',
          jobId: result.job_id || null,
          parameters: { battery_ids: batteryIds, num_variables: result.num_variables },
          results: {
            qubo_sample: result.qubo_sample_matrix,
            objective: result.objective_value ?? null,
          },
          executionTimeSeconds: result.execution_time_seconds ?? null,
        });

        res.json(result);
      } catch (err) {
        sendError(res, err, 'QpiAI Opt execution failed');
      }
    }
  );

  apiRouter.post(
    '/qpiai/quantum/simulate-cathode',
    auth.optionalAuth,
    async (req: AuthRequest, res: Response) => {
      try {
        const batteryId = String(req.body?.battery_id || 'BAT-NMC-8A2F91C0');
        const cathode = String(req.body?.cathode_material || 'NMC 811');
        const soh = Number(req.body?.state_of_health_pct ?? 88.4);
        const cycles = Number(req.body?.cycle_count ?? 420);
        const backend = String(
          req.body?.backend || process.env.QPIAI_QUANTUM_BACKEND || 'QpiAI-QSV-Local'
        );

        const result = QpiAIQuantumEngine.simulateCathodeDegradation(
          batteryId,
          cathode,
          soh,
          cycles,
          backend
        );

        await supabaseBackendRepo.logQpiAIExecution({
          engineType: 'QPIAI_QUANTUM',
          batteryId,
          actor: req.actor,
          rawStatus: result.status,
          backend: result.backend_used,
          parameters: {
            cathode,
            soh,
            cycles,
            num_qubits: result.num_qubits,
            depth: result.circuit_depth,
          },
          results: {
            probabilities: result.measured_probabilities,
            energy_hartree: result.estimated_ground_state_energy_hartree,
          },
          errorMessage: result.status === 'AUTH_REQUIRED' ? result.message : null,
        });

        res.json(result);
      } catch (err) {
        sendError(res, err, 'QpiAI Quantum simulation failed');
      }
    }
  );

  // Mount under both /api/v1 and /api
  app.use('/api/v1', apiRouter);
  app.use('/api', apiRouter);

  // Frontend serving (Vite dev middleware in development, static dist in production)
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const port = Number(process.env.PORT) || 3000;
  app.listen(port, '0.0.0.0', () => {
    console.log(`BatteryPass 360 full-stack server listening on http://0.0.0.0:${port}`);
  });
}

startServer().catch((err) => {
  console.error('Fatal server startup error:', err);
  process.exit(1);
});
