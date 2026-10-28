import 'dotenv/config';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import cors from 'cors';
import QRCode from 'qrcode';

import type {
  BatteryPassport,
  CustodyEvent,
  HealthState,
  PassportSummary,
  UserRole,
} from './src/types/index.ts';
import {
  GENESIS_PREV_HASH,
  calculateEventHash,
  generateImmutableBatteryId,
} from './src/server/hasher.ts';
import {
  DEMO_USERS,
  ROLE_PERSONA_MAP,
  createAccessToken,
  requireAuth,
  requireRoles,
} from './src/server/rbac.ts';
import { getRepository } from './src/server/repository.ts';
import { runQuantumSimulation, solveAllocation } from './src/server/qpiai.ts';
import { createQpiAIRouter } from './src/server/api/qpiai.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;
  const API_PREFIX = process.env.API_V1_STR || '/api/v1';

  app.use(cors());
  app.use(express.json());

  const apiRouter = express.Router();

  // Health Check
  apiRouter.get('/health', (_req, res) => {
    res.json({
      status: 'online',
      service: process.env.PROJECT_NAME || 'BatteryPass 360',
      version: '1.0.0',
      environment: process.env.ENVIRONMENT || 'development',
      memory_db: process.env.USE_MEMORY_DB !== 'false',
      qpiai_opt_configured: Boolean((process.env.QPIAI_OPT_API_KEY || '').trim()),
      qpiai_quantum_configured: Boolean((process.env.QPIAI_QUANTUM_API_KEY || '').trim()),
    });
  });

  // Auth & RBAC Endpoints
  apiRouter.post('/auth/login', (req, res) => {
    const usernameRaw = String(req.body?.username || 'manufacturer');
    const usernameClean = usernameRaw.trim().toLowerCase();
    const demoUser = DEMO_USERS[usernameClean] ?? {
      user_id: `USR-${usernameClean.toUpperCase()}`,
      role: 'MANUFACTURER' as UserRole,
      org: 'Enterprise Partner',
      name: usernameRaw.charAt(0).toUpperCase() + usernameRaw.slice(1),
    };

    const accessToken = createAccessToken({
      sub: demoUser.user_id,
      username: usernameClean,
      role: demoUser.role,
      org: demoUser.org,
      name: demoUser.name,
    });

    res.json({
      access_token: accessToken,
      token_type: 'bearer',
      user_id: demoUser.user_id,
      username: usernameClean,
      role: demoUser.role,
      organization: demoUser.org,
      full_name: demoUser.name,
    });
  });

  apiRouter.post('/auth/switch-role', (req, res) => {
    const role = (req.body?.role || 'MANUFACTURER') as UserRole;
    const persona = ROLE_PERSONA_MAP[role] ?? {
      uid: 'USR-CUSTOM',
      defaultOrg: 'Custom Org',
      name: 'Test User',
    };
    const org = req.body?.organization || persona.defaultOrg;

    const token = createAccessToken({
      sub: persona.uid,
      username: role.toLowerCase(),
      role,
      org,
      name: persona.name,
    });

    res.json({
      access_token: token,
      token_type: 'bearer',
      user_id: persona.uid,
      username: role.toLowerCase(),
      role,
      organization: org,
      full_name: persona.name,
    });
  });

  apiRouter.get('/auth/me', requireAuth, (req, res) => {
    res.json((req as any).currentUser);
  });

  // Passports Endpoints
  apiRouter.get('/passports', async (req, res) => {
    const repo = getRepository();
    const statusFilter = typeof req.query.status === 'string' ? req.query.status : undefined;
    let allPassports = await repo.getAllPassports();

    if (statusFilter) {
      allPassports = allPassports.filter(
        p => p.status.toUpperCase() === statusFilter.toUpperCase()
      );
    }

    const summaries: PassportSummary[] = allPassports.map(p => ({
      battery_id: p.battery_id,
      battery_did: p.battery_did,
      serial_number: p.serial_number,
      manufacturer_name: p.manufacturer_name,
      chemistry: p.chemistry,
      status: p.status,
      current_custodian: p.current_custodian,
      state_of_health_pct: p.health_state.state_of_health_pct,
      rated_capacity_kwh: p.technical_specs.rated_capacity_kwh,
      updated_at: p.updated_at,
    }));

    res.json(summaries);
  });

  apiRouter.get('/passports/:battery_id', async (req, res) => {
    const repo = getRepository();
    const passport = await repo.getPassportById(req.params.battery_id);
    if (!passport) {
      res.status(404).json({
        detail: `Battery Passport '${req.params.battery_id}' was not found.`,
      });
      return;
    }
    res.json(passport);
  });

  apiRouter.post(
    '/passports',
    requireRoles(['MANUFACTURER']),
    async (req, res) => {
      const repo = getRepository();
      const body = req.body;
      const currentUser = (req as any).currentUser;

      if (!body?.serial_number || !body?.manufacturer_name || !body?.chemistry) {
        res.status(400).json({ detail: 'Missing required manufacturing identity fields.' });
        return;
      }

      const mfgDate = body.manufacturing_date || new Date().toISOString();
      const { did, shortId } = generateImmutableBatteryId(
        body.manufacturer_name,
        body.serial_number,
        body.chemistry,
        mfgDate
      );

      const existing = await repo.getPassportById(shortId);
      if (existing) {
        res.status(409).json({
          detail: `Battery Passport with ID '${shortId}' already exists.`,
        });
        return;
      }

      const nowIso = new Date().toISOString();
      const health: HealthState = body.health_state ?? {
        state_of_health_pct: 100.0,
        state_of_charge_pct: 100.0,
        cycle_count: 0,
        internal_resistance_mohm: 16.0,
        capacity_fade_rate_pct_yr: 1.5,
        last_telemetry_timestamp: nowIso,
      };

      const passport: BatteryPassport = {
        battery_did: did,
        battery_id: shortId,
        serial_number: body.serial_number,
        manufacturer_name: body.manufacturer_name,
        model_designation: body.model_designation || 'Standard EV Pack',
        chemistry: body.chemistry,
        manufacturing_date: mfgDate,
        manufacturing_country: body.manufacturing_country || 'DE',
        manufacturing_facility: body.manufacturing_facility || 'Gigafactory Berlin',
        status: 'MANUFACTURED',
        current_custodian: body.current_custodian || body.manufacturer_name,
        current_vehicle_vin: null,
        technical_specs: {
          rated_capacity_kwh: Number(body.technical_specs?.rated_capacity_kwh ?? 88.0),
          nominal_voltage_v: Number(body.technical_specs?.nominal_voltage_v ?? 400.0),
          max_charge_power_kw: Number(body.technical_specs?.max_charge_power_kw ?? 240.0),
          cell_count: Number(body.technical_specs?.cell_count ?? 192),
          pack_weight_kg: Number(body.technical_specs?.pack_weight_kg ?? 470.0),
          temperature_range_min_c: -20.0,
          temperature_range_max_c: 55.0,
        },
        carbon_footprint: {
          total_co2_kg_per_kwh: Number(body.carbon_footprint?.total_co2_kg_per_kwh ?? 58.0),
          manufacturing_co2_kg: Number(body.carbon_footprint?.manufacturing_co2_kg ?? 25.0),
          raw_materials_co2_kg: Number(body.carbon_footprint?.raw_materials_co2_kg ?? 28.0),
          transport_co2_kg: Number(body.carbon_footprint?.transport_co2_kg ?? 5.0),
          eu_compliance_class: body.carbon_footprint?.eu_compliance_class || 'Class A',
        },
        recycled_content: {
          cobalt_percentage: Number(body.recycled_content?.cobalt_percentage ?? 0),
          lithium_percentage: Number(body.recycled_content?.lithium_percentage ?? 0),
          nickel_percentage: Number(body.recycled_content?.nickel_percentage ?? 0),
          lead_percentage: Number(body.recycled_content?.lead_percentage ?? 0),
        },
        health_state: health,
        qr_code_url: `/api/v1/verify/${shortId}`,
        created_at: nowIso,
        updated_at: nowIso,
      };

      await repo.createPassport(passport);

      const genesisPayload = {
        event: 'Genesis Battery Creation',
        rated_capacity_kwh: passport.technical_specs.rated_capacity_kwh,
        chemistry: passport.chemistry,
        facility: passport.manufacturing_facility,
      };
      const genesisHash = calculateEventHash(
        GENESIS_PREV_HASH,
        shortId,
        'MANUFACTURED',
        nowIso,
        currentUser?.sub || 'SYSTEM',
        genesisPayload
      );

      const genesisEvent: CustodyEvent = {
        event_id: `EVT-${shortId}-000`,
        battery_id: shortId,
        event_type: 'MANUFACTURED',
        timestamp: nowIso,
        actor_id: currentUser?.sub || 'SYSTEM',
        actor_role: currentUser?.role || 'MANUFACTURER',
        actor_organization: currentUser?.org || passport.manufacturer_name,
        location: `${passport.manufacturing_facility}, ${passport.manufacturing_country}`,
        payload: genesisPayload,
        prev_hash: GENESIS_PREV_HASH,
        hash: genesisHash,
      };
      await repo.appendCustodyEvent(genesisEvent);

      res.status(201).json(passport);
    }
  );

  apiRouter.patch(
    '/passports/:battery_id/telemetry',
    requireRoles(['FLEET_OPERATOR', 'OEM', 'MANUFACTURER']),
    async (req, res) => {
      const repo = getRepository();
      const batteryId = String(req.params.battery_id);
      const passport = await repo.getPassportById(batteryId);
      if (!passport) {
        res.status(404).json({
          detail: `Battery Passport '${batteryId}' was not found.`,
        });
        return;
      }

      const body = req.body;
      const currentUser = (req as any).currentUser;
      const nowIso = new Date().toISOString();

      const newHealth: HealthState = {
        state_of_health_pct: Number(body.state_of_health_pct),
        state_of_charge_pct: Number(body.state_of_charge_pct),
        cycle_count: Number(body.cycle_count),
        internal_resistance_mohm: Number(body.internal_resistance_mohm),
        capacity_fade_rate_pct_yr:
          body.capacity_fade_rate_pct_yr !== undefined
            ? Number(body.capacity_fade_rate_pct_yr)
            : passport.health_state.capacity_fade_rate_pct_yr,
        last_telemetry_timestamp: nowIso,
      };

      const updated = await repo.updatePassport(passport.battery_id, {
        health_state: newHealth,
      });

      const events = await repo.getCustodyEvents(passport.battery_id);
      const prevHash = events.length > 0 ? events[events.length - 1].hash : GENESIS_PREV_HASH;
      const payload = {
        state_of_health_pct: newHealth.state_of_health_pct,
        state_of_charge_pct: newHealth.state_of_charge_pct,
        cycle_count: newHealth.cycle_count,
        notes: body.telemetry_notes || 'Regular BMS telemetry sync',
      };
      const evtHash = calculateEventHash(
        prevHash,
        passport.battery_id,
        'TELEMETRY_UPDATED',
        nowIso,
        currentUser?.sub || 'ACTOR',
        payload
      );

      const evt: CustodyEvent = {
        event_id: `EVT-${passport.battery_id}-${String(events.length).padStart(3, '0')}`,
        battery_id: passport.battery_id,
        event_type: 'TELEMETRY_UPDATED',
        timestamp: nowIso,
        actor_id: currentUser?.sub || 'ACTOR',
        actor_role: currentUser?.role || 'FLEET_OPERATOR',
        actor_organization: currentUser?.org || 'Fleet Ops',
        location: 'BMS Gateway Cloud Sync',
        payload,
        prev_hash: prevHash,
        hash: evtHash,
      };
      await repo.appendCustodyEvent(evt);

      res.json(updated);
    }
  );

  // Custody Endpoints
  apiRouter.get('/custody/:battery_id', async (req, res) => {
    const repo = getRepository();
    const passport = await repo.getPassportById(req.params.battery_id);
    if (!passport) {
      res.status(404).json({
        detail: `Battery Passport '${req.params.battery_id}' was not found.`,
      });
      return;
    }
    const events = await repo.getCustodyEvents(passport.battery_id);
    res.json(events);
  });

  apiRouter.post('/custody/:battery_id/events', requireAuth, async (req, res) => {
    const repo = getRepository();
    const batteryId = String(req.params.battery_id);
    const passport = await repo.getPassportById(batteryId);
    if (!passport) {
      res.status(404).json({
        detail: `Battery Passport '${batteryId}' was not found.`,
      });
      return;
    }

    const body = req.body;
    const currentUser = (req as any).currentUser;
    const nowIso = new Date().toISOString();
    const events = await repo.getCustodyEvents(passport.battery_id);
    const eventId = `EVT-${passport.battery_id}-${String(events.length).padStart(3, '0')}`;

    const event: CustodyEvent = {
      event_id: eventId,
      battery_id: passport.battery_id,
      event_type: body.event_type,
      timestamp: nowIso,
      actor_id: body.actor_id || currentUser?.sub || 'ACTOR',
      actor_role: body.actor_role || currentUser?.role || 'OPERATOR',
      actor_organization: body.actor_organization || currentUser?.org || 'Partner Org',
      location: body.location || 'Unknown',
      payload: body.payload || {},
      prev_hash: '',
      hash: '',
    };

    const savedEvent = await repo.appendCustodyEvent(event);

    if (body.event_type === 'SECOND_LIFE_ASSIGNED') {
      await repo.updatePassport(passport.battery_id, {
        status: 'SECOND_LIFE',
        current_custodian: event.actor_organization,
      });
    } else if (body.event_type === 'DECOMMISSIONED') {
      await repo.updatePassport(passport.battery_id, { status: 'END_OF_LIFE' });
    } else if (body.event_type === 'RECYCLED') {
      await repo.updatePassport(passport.battery_id, {
        status: 'RECYCLED',
        current_custodian: event.actor_organization,
      });
    } else if (body.event_type === 'TRANSFERRED_CUSTODY') {
      await repo.updatePassport(passport.battery_id, {
        current_custodian: event.actor_organization,
      });
    }

    res.status(201).json(savedEvent);
  });

  // Public Verification & Audit Trail Endpoints
  apiRouter.get('/verify/:battery_id', async (req, res) => {
    const repo = getRepository();
    const passport = await repo.getPassportById(req.params.battery_id);
    if (!passport) {
      res.status(404).json({
        detail: `Battery Passport '${req.params.battery_id}' was not found on this metrology registry.`,
      });
      return;
    }

    const events = await repo.getCustodyEvents(passport.battery_id);
    const { isValid } = await repo.verifyAuditTrail(passport.battery_id);

    res.json({
      is_authentic: true,
      battery_id: passport.battery_id,
      battery_did: passport.battery_did,
      manufacturer_name: passport.manufacturer_name,
      model_designation: passport.model_designation,
      chemistry: passport.chemistry,
      manufacturing_date: passport.manufacturing_date,
      status: passport.status,
      state_of_health_pct: passport.health_state.state_of_health_pct,
      carbon_footprint_total: passport.carbon_footprint.total_co2_kg_per_kwh,
      eu_compliance_class: passport.carbon_footprint.eu_compliance_class,
      total_custody_events: events.length,
      is_audit_chain_valid: isValid,
      verification_timestamp: new Date().toISOString(),
    });
  });

  apiRouter.get('/verify/:battery_id/audit-trail', async (req, res) => {
    const repo = getRepository();
    const passport = await repo.getPassportById(req.params.battery_id);
    if (!passport) {
      res.status(404).json({
        detail: `Battery Passport '${req.params.battery_id}' was not found.`,
      });
      return;
    }

    const events = await repo.getCustodyEvents(passport.battery_id);
    const { isValid, errorMessage, tamperedIndex } = await repo.verifyAuditTrail(
      passport.battery_id
    );

    res.json({
      battery_id: passport.battery_id,
      total_events: events.length,
      is_valid: isValid,
      genesis_hash: events.length > 0 ? events[0].hash : null,
      latest_block_hash: events.length > 0 ? events[events.length - 1].hash : null,
      error_message: errorMessage,
      tampered_block_index: tamperedIndex,
      verified_at: new Date().toISOString(),
    });
  });

  apiRouter.get('/verify/:battery_id/qr', async (req, res) => {
    const repo = getRepository();
    const passport = await repo.getPassportById(req.params.battery_id);
    if (!passport) {
      res.status(404).json({
        detail: `Battery Passport '${req.params.battery_id}' was not found.`,
      });
      return;
    }

    const origin = `${req.protocol}://${req.get('host')}`;
    const qrData = `${origin}/verify/${passport.battery_id}`;
    const buffer = await QRCode.toBuffer(qrData, {
      errorCorrectionLevel: 'M',
      margin: 4,
      scale: 10,
      color: {
        dark: '#0F172A',
        light: '#FFFFFF',
      },
    });
    res.setHeader('Content-Type', 'image/png');
    res.send(buffer);
  });

  // QpiAI Optimization & Quantum Endpoints
  apiRouter.post(
    '/qpiai/opt/allocate',
    requireRoles(['MANUFACTURER', 'FLEET_OPERATOR', 'RECYCLER']),
    async (req, res) => {
      const repo = getRepository();
      const result = await solveAllocation(req.body, repo);
      res.json(result);
    }
  );

  apiRouter.post(
    '/qpiai/quantum/simulate-cathode',
    requireRoles(['MANUFACTURER', 'REGULATOR_AUDITOR', 'FLEET_OPERATOR']),
    async (req, res) => {
      const result = await runQuantumSimulation(req.body);
      res.json(result);
    }
  );

  const qpiaiDedicatedRouter = createQpiAIRouter();
  app.use('/api', qpiaiDedicatedRouter);
  apiRouter.use('/', qpiaiDedicatedRouter);
  app.use(API_PREFIX, apiRouter);

  // Vite middleware for development vs static serving for production
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

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`BatteryPass 360 server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
