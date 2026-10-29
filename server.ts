import {
  loadAppEnvironment,
  getPublicSupabaseConfig,
  getAdminSupabaseConfig,
} from './src/server/envLoader.ts';

// Load environment variables across standard files and AI Studio container files
loadAppEnvironment();

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import type { Request, Response, NextFunction } from 'express';
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
import {
  QpiAIOptEngine,
  QpiAIQuantumEngine,
  SUPPORTED_QCLOUD_BACKENDS,
  resolveOptBaseUrl,
  resolveQCloudBaseUrl,
} from './src/services/qpiai.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Sliding-window rate limiter to protect paid QpiAI / QCloud compute endpoints
const qpiaiRateWindowMs = 60_000;
const qpiaiMaxRequestsPerWindow = 20;
const qpiaiHits = new Map<string, number[]>();

function qpiaiRateLimiter(req: AuthRequest, res: Response, next: NextFunction): void {
  const key = req.actor?.id || req.ip || 'anonymous';
  const now = Date.now();
  const recent = (qpiaiHits.get(key) || []).filter((t) => now - t < qpiaiRateWindowMs);
  if (recent.length >= qpiaiMaxRequestsPerWindow) {
    res.status(429).json({
      detail: 'Rate limit exceeded for QpiAI compute endpoints. Please wait 60 seconds before retrying.',
    });
    return;
  }
  recent.push(now);
  qpiaiHits.set(key, recent);
  next();
}

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

  const handleDbStatus = async (_req: Request, res: Response) => {
    const status = await supabaseBackendRepo.getDatabaseStatus();
    res.json(status);
  };
  apiRouter.get('/db/status', handleDbStatus);
  apiRouter.get('/database/status', handleDbStatus);

  apiRouter.get('/integrations/status', async (_req: Request, res: Response) => {
    const dbStatus = await supabaseBackendRepo.getDatabaseStatus();
    res.json({
      supabase: dbStatus,
      qpiai_opt: {
        configured: Boolean((process.env.QPIAI_OPT_API_KEY || '').trim()),
        endpoint: resolveOptBaseUrl(),
      },
      qpiai_qcloud: {
        configured: Boolean((process.env.QPIAI_QUANTUM_API_KEY || '').trim()),
        endpoint: resolveQCloudBaseUrl(),
        default_backend: process.env.QPIAI_QUANTUM_BACKEND || 'QpiAI-QSV-Local',
        supported_backends: SUPPORTED_QCLOUD_BACKENDS,
      },
      checked_at: new Date().toISOString(),
    });
  });

  // Authenticated Enterprise Multi-Organization Switching (strictly enforces authorized memberships)
  apiRouter.post('/auth/switch-role', auth.optionalAuth, async (req: AuthRequest, res: Response) => {
    try {
      if (!req.actor) {
        res.status(403).json({
          detail: 'Privilege escalation denied: Authentication required. Authenticate via Supabase Auth to access enterprise roles.',
        });
        return;
      }

      const targetRole = normalizeUserRole(req.body?.role);
      const targetOrgName = req.body?.organization ? String(req.body.organization).trim().toLowerCase() : '';
      const targetOrgId = req.body?.organization_id ? String(req.body.organization_id).trim() : '';

      const matchedMembership = req.actor.authorized_memberships?.find((m) => {
        if (targetOrgId && m.organization_id === targetOrgId) return true;
        if (targetOrgName && m.organization_name.toLowerCase() === targetOrgName) return true;
        if (targetRole && m.role === targetRole) return true;
        return false;
      });

      if (!matchedMembership) {
        res.status(403).json({
          detail: `Privilege escalation denied: You are not authorized for role '${targetRole}' or organization '${req.body?.organization || ''}'. Role switching requires explicit administrator assignment.`,
        });
        return;
      }

      const actorPayload = {
        id: req.actor.id,
        email: req.actor.email,
        full_name: req.actor.full_name,
        role: matchedMembership.role,
        organization_id: matchedMembership.organization_id,
        organization_name: matchedMembership.organization_name,
        authorized_memberships: req.actor.authorized_memberships,
      };

      const token = issueServerJwt(
        actorPayload,
        Number(process.env.ACCESS_TOKEN_EXPIRE_MINUTES) || 1440
      );

      res.json({
        access_token: token,
        token_type: 'bearer',
        role: matchedMembership.role,
        organization: matchedMembership.organization_name,
        user: actorToProfile(actorPayload as any),
      });
    } catch (err) {
      sendError(res, err, 'Failed to switch organization context');
    }
  });

  apiRouter.get('/auth/me', auth.requireAuth, async (req: AuthRequest, res: Response) => {
    res.json(actorToProfile(req.actor!));
  });

  apiRouter.post('/auth/sync-profile', auth.requireAuth, async (req: AuthRequest, res: Response) => {
    res.json(actorToProfile(req.actor!));
  });

  // Public Supabase Client Config Hydration (Safe: never leaks secret/service_role keys)
  apiRouter.get('/auth/config', (_req: Request, res: Response) => {
    const pub = getPublicSupabaseConfig();
    res.json({
      isConfigured: pub.isConfigured,
      supabaseUrl: pub.supabaseUrl || null,
      supabaseAnonKey: pub.supabaseAnonKey || null,
      authProvider: pub.isConfigured ? 'supabase' : 'memory',
      missing: pub.missingVars,
    });
  });

  // Real Supabase Auth Registration Endpoint (with tenant profile & org provisioning)
  apiRouter.post('/auth/signup', async (req: Request, res: Response) => {
    try {
      const { email, password, fullName, role, organization } = req.body || {};
      if (!email || !password) {
        res.status(400).json({ detail: 'Email and password are required.' });
        return;
      }

      const adminConfig = getAdminSupabaseConfig();
      const pubConfig = getPublicSupabaseConfig();
      if (!adminConfig.isConfigured && !pubConfig.isConfigured) {
        res.status(503).json({
          detail: 'Supabase Auth is not configured in this environment.',
          missing: pubConfig.missingVars,
        });
        return;
      }

      const created = await supabaseBackendRepo.signUpUser({
        email: String(email).trim(),
        password: String(password),
        fullName: String(fullName || email.split('@')[0]).trim(),
        role: normalizeUserRole(role),
        organization: String(organization || ROLE_DEFAULT_ORGS[normalizeUserRole(role)].name).trim(),
      });

      res.status(201).json(created);
    } catch (err) {
      sendError(res, err, 'Registration failed');
    }
  });

  // Real Supabase Auth Password Sign-In Endpoint
  apiRouter.post('/auth/signin', async (req: Request, res: Response) => {
    try {
      const { email, password } = req.body || {};
      if (!email || !password) {
        res.status(400).json({ detail: 'Email and password are required.' });
        return;
      }

      const adminConfig = getAdminSupabaseConfig();
      const pubConfig = getPublicSupabaseConfig();
      if (!adminConfig.isConfigured && !pubConfig.isConfigured) {
        res.status(503).json({
          detail: 'Supabase Auth is not configured in this environment.',
          missing: pubConfig.missingVars,
        });
        return;
      }

      const authenticated = await supabaseBackendRepo.signInUser(
        String(email).trim(),
        String(password)
      );

      res.json(authenticated);
    } catch (err) {
      sendError(res, err, 'Authentication failed');
    }
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

  // Battery Passports (supporting both /passports and /batteries path conventions)
  const handleListPassports = async (req: Request, res: Response) => {
    try {
      const status = typeof req.query.status === 'string' ? req.query.status : undefined;
      const list = await supabaseBackendRepo.listPassports(status);
      res.json(list);
    } catch (err) {
      sendError(res, err, 'Failed to fetch battery passports');
    }
  };
  apiRouter.get('/passports', handleListPassports);
  apiRouter.get('/batteries', handleListPassports);

  const handleGetPassport = async (req: Request, res: Response) => {
    try {
      const passport = await supabaseBackendRepo.getPassport(String(req.params.id));
      res.json(passport);
    } catch (err) {
      sendError(res, err, 'Failed to load battery passport');
    }
  };
  apiRouter.get('/passports/:id', handleGetPassport);
  apiRouter.get('/batteries/:id', handleGetPassport);

  const handleCreatePassport = async (req: AuthRequest, res: Response) => {
    try {
      const created = await supabaseBackendRepo.createPassport(req.body, req.actor!);
      res.status(201).json(created);
    } catch (err) {
      sendError(res, err, 'Failed to register battery passport');
    }
  };
  apiRouter.post(
    '/passports',
    auth.requireRoles(['MANUFACTURER', 'ADMINISTRATOR']),
    handleCreatePassport
  );
  apiRouter.post(
    '/batteries',
    auth.requireRoles(['MANUFACTURER', 'ADMINISTRATOR']),
    handleCreatePassport
  );

  const handleUpdateTelemetry = async (req: AuthRequest, res: Response) => {
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
  };
  const telemetryRoles: import('./src/types/index.ts').UserRole[] = [
    'MANUFACTURER',
    'OEM',
    'FLEET_OPERATOR',
    'SERVICE_CENTER',
    'REMANUFACTURER',
    'ADMINISTRATOR',
  ];
  apiRouter.patch(
    '/passports/:id/telemetry',
    auth.requireRoles(telemetryRoles),
    handleUpdateTelemetry
  );
  apiRouter.patch(
    '/batteries/:id/telemetry',
    auth.requireRoles(telemetryRoles),
    handleUpdateTelemetry
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

  // Secure Two-Step Battery Verification: Step 1 QR Reference Pre-Check
  // Never leaks physical UID/serial number, BMS health, or confidential specs before Step 2 match
  apiRouter.get('/verify/:batteryId/precheck', async (req: Request, res: Response) => {
    try {
      const pre = await supabaseBackendRepo.getTwoStepPrecheck(String(req.params.batteryId));
      res.json(pre);
    } catch (err) {
      sendError(res, err, 'Failed to resolve battery verification pre-check');
    }
  });

  apiRouter.get('/verify/:batteryId/session', async (req: Request, res: Response) => {
    try {
      const pre = await supabaseBackendRepo.getTwoStepPrecheck(String(req.params.batteryId));
      res.json(pre);
    } catch (err) {
      sendError(res, err, 'Failed to resolve battery verification session');
    }
  });

  // Dual-ID Physical Identity Cross-Verification
  apiRouter.post(
    '/verify/:batteryId/physical',
    auth.optionalAuth,
    async (req: AuthRequest, res: Response) => {
      try {
        const rawBatteryId = String(req.params.batteryId || '').trim();
        if (!rawBatteryId || rawBatteryId === 'undefined' || rawBatteryId === 'null') {
          res.status(400).json({ detail: 'Digital Battery ID or DID parameter is required for identity verification.' });
          return;
        }

        const { physical_serial, inspector_notes, barcode_type, device_info } = req.body || {};
        if (!physical_serial || typeof physical_serial !== 'string' || !physical_serial.trim()) {
          res.status(400).json({ detail: 'Physical casing serial number is required for cross-verification.' });
          return;
        }

        const cleanSerial = physical_serial.trim();
        if (cleanSerial.length > 120 || /[\x00-\x1F\x7F]/.test(cleanSerial)) {
          res.status(400).json({ detail: 'Malformed physical serial number. Must not contain control characters and must not exceed 120 characters.' });
          return;
        }

        const clientIp = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '127.0.0.1';
        const outcome = await supabaseBackendRepo.verifyPhysicalIdentity(
          rawBatteryId,
          { physical_serial: cleanSerial, inspector_notes, barcode_type, device_info },
          req.actor || null,
          clientIp
        );
        res.json(outcome);
      } catch (err) {
        sendError(res, err, 'Failed to perform physical identity verification');
      }
    }
  );

  // Anti-Fraud: Authorized Review & Reset of Locked/Flagged Batteries
  apiRouter.post(
    '/verify/:batteryId/reset-lockout',
    auth.requireRoles(['ADMINISTRATOR', 'REGULATOR_AUDITOR']),
    async (req: AuthRequest, res: Response) => {
      try {
        const { review_notes } = req.body || {};
        const outcome = await supabaseBackendRepo.resetLockout(
          String(req.params.batteryId),
          review_notes,
          req.actor!
        );
        res.json(outcome);
      } catch (err) {
        sendError(res, err, 'Failed to reset battery verification lockout');
      }
    }
  );

  // Anti-Fraud: Security Alert List of Flagged Batteries
  apiRouter.get(
    '/verify/alerts/flagged',
    auth.requireRoles(['ADMINISTRATOR', 'REGULATOR_AUDITOR', 'MANUFACTURER']),
    async (req: AuthRequest, res: Response) => {
      try {
        const flagged = await supabaseBackendRepo.getFlaggedBatteries(req.actor!);
        res.json(flagged);
      } catch (err) {
        sendError(res, err, 'Failed to fetch flagged battery security alerts');
      }
    }
  );

  // Anti-Fraud: Report Suspected QR Tampering or Replacement
  apiRouter.post(
    '/verify/:batteryId/report-tamper',
    auth.optionalAuth,
    async (req: AuthRequest, res: Response) => {
      try {
        const { reason, description, reported_serial } = req.body || {};
        if (!reason || !description) {
          res.status(400).json({ detail: 'Reason and description are required to report suspected tampering.' });
          return;
        }

        const clientIp = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '127.0.0.1';
        const report = await supabaseBackendRepo.reportTampering(
          String(req.params.batteryId),
          { reason, description, reported_serial },
          req.actor || null,
          clientIp
        );
        res.status(201).json(report);
      } catch (err) {
        sendError(res, err, 'Failed to submit tamper incident report');
      }
    }
  );

  // Anti-Fraud: Battery Fraud and Velocity Audit Status
  apiRouter.get('/verify/:batteryId/fraud-status', async (req: Request, res: Response) => {
    try {
      const status = await supabaseBackendRepo.getFraudStatus(String(req.params.batteryId));
      res.json(status);
    } catch (err) {
      sendError(res, err, 'Failed to retrieve battery anti-fraud status');
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

  // Analytics: Fleet Metrology Overview
  apiRouter.get(
    '/analytics/overview',
    auth.optionalAuth,
    async (req: AuthRequest, res: Response) => {
      try {
        const overview = await supabaseBackendRepo.getAnalyticsOverview(req.actor || null);
        res.json(overview);
      } catch (err) {
        sendError(res, err, 'Failed to load analytics overview');
      }
    }
  );

  // Analytics: Battery Health Trends (BMS Telemetry History)
  apiRouter.get(
    '/analytics/health-trends',
    auth.optionalAuth,
    async (req: AuthRequest, res: Response) => {
      try {
        const { batteryId, startDate, endDate } = req.query;
        if (!batteryId || typeof batteryId !== 'string') {
          res.status(400).json({ detail: 'Query parameter `batteryId` is required.' });
          return;
        }

        // Validate date filters if provided
        if (startDate && isNaN(new Date(String(startDate)).getTime())) {
          res.status(400).json({ detail: 'Invalid `startDate` filter. Must be an ISO date string.' });
          return;
        }
        if (endDate && isNaN(new Date(String(endDate)).getTime())) {
          res.status(400).json({ detail: 'Invalid `endDate` filter. Must be an ISO date string.' });
          return;
        }

        const metrics = await supabaseBackendRepo.getBatteryMetricsHistory(
          batteryId.trim(),
          startDate ? String(startDate) : undefined,
          endDate ? String(endDate) : undefined,
          req.actor || null
        );
        res.json(metrics);
      } catch (err) {
        sendError(res, err, 'Failed to load battery health trends');
      }
    }
  );

  // Analytics: Verification Outcomes
  apiRouter.get(
    '/analytics/verifications',
    auth.optionalAuth,
    async (req: AuthRequest, res: Response) => {
      try {
        const { startDate, endDate } = req.query;
        const verifs = await supabaseBackendRepo.getVerificationAnalytics(
          startDate ? String(startDate) : undefined,
          endDate ? String(endDate) : undefined,
          req.actor || null
        );
        res.json(verifs);
      } catch (err) {
        sendError(res, err, 'Failed to load verification analytics');
      }
    }
  );

  // Analytics: QpiAI Executions
  apiRouter.get(
    '/analytics/qpiai-executions',
    auth.optionalAuth,
    async (req: AuthRequest, res: Response) => {
      try {
        const execs = await supabaseBackendRepo.getQpiAIExecutionsAnalytics(req.actor || null);
        res.json(execs);
      } catch (err) {
        sendError(res, err, 'Failed to load QpiAI optimization analytics');
      }
    }
  );

  // QpiAI Optimization & Quantum Endpoints (authenticated, rate-limited, persisting execution records in Supabase)
  const QPIAI_ALLOWED_ROLES = [
    'MANUFACTURER',
    'OEM',
    'FLEET_OPERATOR',
    'SERVICE_CENTER',
    'REMANUFACTURER',
    'RECYCLER',
    'REGULATOR_AUDITOR',
    'ADMINISTRATOR',
  ] as const;

  apiRouter.post(
    '/qpiai/opt/allocate',
    auth.requireRoles([...QPIAI_ALLOWED_ROLES]),
    qpiaiRateLimiter,
    async (req: AuthRequest, res: Response) => {
      try {
        if (req.body?.battery_ids !== undefined && !Array.isArray(req.body.battery_ids)) {
          res.status(400).json({ detail: '`battery_ids` must be a non-empty array of battery IDs.' });
          return;
        }
        const rawIds: string[] = Array.isArray(req.body?.battery_ids)
          ? req.body.battery_ids.map((v: unknown) => String(v || '').trim()).filter(Boolean)
          : ['BAT-NMC-8A2F91C0'];

        if (rawIds.length === 0 || rawIds.length > 25) {
          res.status(400).json({
            detail: '`battery_ids` must contain between 1 and 25 valid battery passport IDs.',
          });
          return;
        }

        const mode: 'platform' | 'local' =
          req.body?.mode === 'local' ? 'local' : 'platform';

        const batteryData: Array<{
          battery_id: string;
          state_of_health_pct: number;
          cycle_count: number;
          total_co2_kg_per_kwh: number;
        }> = [];

        for (const id of rawIds) {
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

        const result = await QpiAIOptEngine.solveAllocation(
          batteryData,
          ['stationary_bess', 'cell_reconditioning', 'deep_recycling'],
          { mode }
        );

        await supabaseBackendRepo.logQpiAIExecution({
          engineType: 'QPIAI_OPT',
          batteryId: batteryData[0].battery_id,
          actor: req.actor,
          rawStatus: result.status,
          backend: result.solver_backend || (mode === 'local' ? 'Local-Exact-QUBO-Enumerator' : 'QUBO Solver'),
          jobId: result.job_id || result.problem_id || null,
          parameters: {
            battery_ids: batteryData.map((b) => b.battery_id),
            mode,
            num_variables: result.num_variables,
            problem_id: result.problem_id ?? null,
          },
          results: {
            is_cloud_result: Boolean(result.is_cloud_result),
            execution_mode: result.execution_mode ?? null,
            qubo_sample: result.qubo_sample_matrix,
            objective: result.objective_value ?? null,
            recommended_allocations: result.recommended_allocations ?? null,
          },
          errorMessage:
            result.status !== 'SUCCESS' && result.status !== 'LOCAL_SOLVED' && result.status !== 'SUBMITTED'
              ? result.message
              : null,
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
    auth.requireRoles([...QPIAI_ALLOWED_ROLES]),
    qpiaiRateLimiter,
    async (req: AuthRequest, res: Response) => {
      try {
        const batteryId = String(req.body?.battery_id || 'BAT-NMC-8A2F91C0').trim();
        const cathode = String(req.body?.cathode_material || 'NMC 811').trim();
        const soh = Number(req.body?.state_of_health_pct ?? 88.4);
        const cycles = Number(req.body?.cycle_count ?? 420);
        const shots = Number(req.body?.shots ?? 1024);

        if (Number.isNaN(soh) || soh < 0 || soh > 100) {
          res.status(400).json({ detail: '`state_of_health_pct` must be between 0 and 100.' });
          return;
        }
        if (Number.isNaN(cycles) || cycles < 0 || cycles > 100000) {
          res.status(400).json({ detail: '`cycle_count` must be between 0 and 100000.' });
          return;
        }
        if (!Number.isInteger(shots) || shots < 64 || shots > 4096) {
          res.status(400).json({ detail: '`shots` must be an integer between 64 and 4096.' });
          return;
        }

        const backend = String(
          req.body?.backend || process.env.QPIAI_QUANTUM_BACKEND || 'QpiAI-QSV-Local'
        ).trim();

        const result = await QpiAIQuantumEngine.simulateCathodeDegradation(
          batteryId,
          cathode,
          soh,
          cycles,
          backend,
          { shots }
        );

        await supabaseBackendRepo.logQpiAIExecution({
          engineType: 'QPIAI_QUANTUM',
          batteryId,
          actor: req.actor,
          rawStatus: result.status,
          backend: result.backend_used,
          jobId: result.job_id || result.circuit_id || null,
          parameters: {
            cathode,
            soh,
            cycles,
            shots,
            num_qubits: result.num_qubits,
            depth: result.circuit_depth,
            circuit_id: result.circuit_id ?? null,
          },
          results: {
            is_cloud_execution: Boolean(result.is_cloud_execution),
            is_hardware_execution: Boolean(result.is_hardware_execution),
            execution_mode: result.execution_mode ?? null,
            probabilities: result.measured_probabilities,
            energy_hartree: result.estimated_ground_state_energy_hartree,
          },
          errorMessage:
            result.status !== 'SUCCESS' &&
            result.status !== 'SIMULATION_COMPLETED' &&
            result.status !== 'SUBMITTED'
              ? result.message
              : null,
          executionTimeSeconds: result.execution_time_seconds ?? null,
        });

        res.json(result);
      } catch (err) {
        sendError(res, err, 'QpiAI Quantum simulation failed');
      }
    }
  );

  // Explicit 404 for any unhandled API route — NEVER let API requests fall through to Vite HTML SPA handler
  apiRouter.use((req: Request, res: Response) => {
    res.status(404).json({
      detail: `API endpoint '${req.method} ${req.originalUrl}' not found.`,
      error: 'Not Found',
    });
  });

  // Mount under both /api/v1 and /api
  app.use('/api/v1', apiRouter);
  app.use('/api', apiRouter);

  // Safety guard: reject any /api request from reaching static/Vite HTML fallbacks
  app.use('/api', (req: Request, res: Response) => {
    res.status(404).json({
      detail: `API endpoint '${req.method} ${req.originalUrl}' not found.`,
      error: 'Not Found',
    });
  });

  // Frontend serving (Vite dev middleware in development, static dist in production)
  const distPath = path.join(__dirname, 'dist');
  const distIndex = path.join(distPath, 'index.html');

  if (process.env.NODE_ENV !== 'production') {
    try {
      const { createServer: createViteServer } = await import('vite');
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: 'spa',
      });
      app.use(vite.middlewares);

      // Handle SPA index.html serving for non-API requests in dev mode
      app.use(async (req: Request, res: Response, next: NextFunction) => {
        const url = req.originalUrl;
        if (url.startsWith('/api')) return next();
        try {
          const indexPath = path.resolve(__dirname, 'index.html');
          if (fs.existsSync(indexPath)) {
            let template = fs.readFileSync(indexPath, 'utf-8');
            template = await vite.transformIndexHtml(url, template);
            res.status(200).set({ 'Content-Type': 'text/html' }).end(template);
            return;
          }
        } catch (e) {
          return next(e);
        }
        next();
      });
    } catch (viteErr) {
      console.warn('Vite dev middleware fallback:', viteErr);
      if (fs.existsSync(distIndex)) {
        app.use(express.static(distPath));
        app.use((_req: Request, res: Response) => {
          res.sendFile(distIndex);
        });
      }
    }
  } else {
    app.use(express.static(distPath));
    app.use((_req: Request, res: Response) => {
      res.sendFile(distIndex);
    });
  }

  const port = 3000;
  app.listen(port, 'localhost', () => {
    console.log(`BatteryPass 360 full-stack server listening on http://localhost:${port}`);
  });
}

startServer().catch((err) => {
  console.error('Fatal server startup error:', err);
  process.exit(1);
});
