import crypto from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  AuditVerification,
  BatteryPassport,
  CustodyEvent,
  CustodyTransfer,
  DatabaseStatus,
  DatabaseTableStatus,
  DispositionDecision,
  HealthState,
  Organization,
  PassportSummary,
  PublicVerification,
  PhysicalVerificationRequest,
  PhysicalVerificationResponse,
  TamperReportRequest,
  TamperReportResponse,
  FraudAuditStatus,
  UserRole,
  BatteryMetricPoint,
  AnalyticsOverview,
  QpiAIExecutionAnalyticsItem,
  TwoStepPrecheckResponse,
  ResetLockoutResponse,
  FlaggedBatteryAlert,
} from '../types/index.ts';
import {
  GENESIS_PREV_HASH,
  calculateEventHash,
  generateImmutableBatteryId,
  verifyChainIntegrity,
} from '../services/hasher.ts';
import { batteryRepository } from '../services/store.ts';
import type { AuthenticatedActor } from './auth.ts';
import {
  ROLE_DEFAULT_ORGS,
  ROLE_PROFILE_UUIDS,
  actorToProfile,
  issueServerJwt,
  normalizeUserRole,
  roleToDbProfileRole,
} from './auth.ts';

export function canonicalizeSerial(s: string | null | undefined): string {
  return String(s || '')
    .trim()
    .toUpperCase()
    .replace(/[\u2010\u2011\u2012\u2013\u2014\u2015\u2212]/g, '-') // normalize Unicode hyphens/dashes to ASCII '-'
    .replace(/[\s\u00A0\u200B]+/g, ' '); // collapse whitespace & non-breaking spaces
}

export function normalizeSerialAlphanumeric(s: string | null | undefined): string {
  return String(s || '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');
}

export function isSerialMatch(entered: string | null | undefined, registered: string | null | undefined): boolean {
  const cleanEntered = canonicalizeSerial(entered);
  const cleanRegistered = canonicalizeSerial(registered);
  if (!cleanEntered || !cleanRegistered) return false;
  if (cleanEntered === cleanRegistered) return true;
  const normEntered = normalizeSerialAlphanumeric(entered);
  const normRegistered = normalizeSerialAlphanumeric(registered);
  return normEntered.length > 0 && normEntered === normRegistered;
}
import { getAdminSupabaseConfig } from './envLoader.ts';

export class DomainError extends Error {
  statusCode: number;
  constructor(message: string, statusCode = 400) {
    super(message);
    this.name = 'DomainError';
    this.statusCode = statusCode;
  }
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function toIsoUtc(ts: string | Date | null | undefined): string {
  if (!ts) return new Date().toISOString();
  const d = new Date(ts);
  return Number.isNaN(d.getTime()) ? String(ts) : d.toISOString();
}

export class SupabaseBackendRepository {
  private client: SupabaseClient | null = null;
  private supabaseUrl = '';
  private seedPromise: Promise<void> | null = null;

  private resolveServerSecretKey(): string {
    return getAdminSupabaseConfig().supabaseSecretKey;
  }

  private getAdminClient(): SupabaseClient {
    if (this.client) return this.client;

    const adminConfig = getAdminSupabaseConfig();
    if (!adminConfig.isConfigured) {
      throw new DomainError(
        `Supabase server credentials are not configured (${adminConfig.missingVars.join(', ')}).`,
        503
      );
    }

    this.supabaseUrl = adminConfig.supabaseUrl;
    this.client = createClient(adminConfig.supabaseUrl, adminConfig.supabaseSecretKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
    return this.client;
  }

  isConfigured(): boolean {
    return getAdminSupabaseConfig().isConfigured;
  }

  /**
   * Registers a new user via Supabase Auth and provisions their tenant profile & organization.
   */
  async signUpUser(payload: {
    email: string;
    password: string;
    fullName: string;
    role: UserRole;
    organization: string;
  }): Promise<{ user: any; session: any; profile: import('../types/index.ts').UserProfile }> {
    if (!this.isConfigured()) {
      throw new DomainError('Supabase Auth is not configured in this environment.', 503);
    }
    await this.ensureSeeded();
    const db = this.getAdminClient();

    // Enforce real RBAC: never trust client-claimed privileged roles (Admin / Auditor)
    const requestedRole = normalizeUserRole(payload.role);
    if (requestedRole === 'ADMINISTRATOR' || requestedRole === 'REGULATOR_AUDITOR') {
      throw new DomainError(
        'Self-registration for Administrator or Regulator/Auditor roles is forbidden. These roles require manual onboarding and verification by a governance authority.',
        403
      );
    }

    // Prefer Supabase Admin API to create user with email_confirm: true directly for local development
    let createdUser: any = null;
    let authSessionToken: string | null = null;

    const { data: adminCreated, error: adminErr } = await db.auth.admin.createUser({
      email: payload.email,
      password: payload.password,
      email_confirm: true,
      user_metadata: {
        full_name: payload.fullName,
        role: requestedRole,
        organization_name: payload.organization,
      },
    });

    if (adminErr) {
      // If admin createUser is restricted by cloud policy or user already exists, fallback to standard signUp
      const { data: standardData, error: standardErr } = await db.auth.signUp({
        email: payload.email,
        password: payload.password,
        options: {
          data: {
            full_name: payload.fullName,
            role: requestedRole,
            organization_name: payload.organization,
          },
        },
      });

      if (standardErr) {
        throw new DomainError(standardErr.message, 400);
      }

      createdUser = standardData.user;
      authSessionToken = standardData.session?.access_token || null;

      // Ensure user email is confirmed via admin service role
      if (createdUser && !(createdUser as any).email_confirmed_at) {
        try {
          await db.auth.admin.updateUserById(createdUser.id, { email_confirm: true });
        } catch {
          // ignore if provider restricts update
        }
      }
    } else {
      createdUser = adminCreated.user;
    }

    if (!createdUser) {
      throw new DomainError('Failed to create user in Supabase Auth.', 500);
    }

    const org = await this.resolveOrCreateOrganization(payload.organization, requestedRole);
    const actor = await this.resolveOrSyncSupabaseUser(
      createdUser.id,
      createdUser.email || payload.email,
      {
        full_name: payload.fullName,
        role: requestedRole,
        organization_id: org.id,
        organization_name: org.name,
      },
      authSessionToken || undefined
    );

    const userProfile: import('../types/index.ts').UserProfile = actor
      ? actorToProfile(actor)
      : {
          id: createdUser.id,
          email: createdUser.email || payload.email,
          full_name: payload.fullName,
          role: requestedRole,
          organization_id: org.id,
          organization_name: org.name,
        };

    const token = actor ? issueServerJwt(actor) : authSessionToken;

    return {
      user: createdUser,
      session: token
        ? {
            access_token: token,
            token_type: 'bearer',
            expires_in: 86400,
          }
        : null,
      profile: userProfile,
    };
  }

  /**
   * Signs in an existing user via Supabase Auth and returns active session & synchronized profile.
   */
  async signInUser(
    email: string,
    password: string
  ): Promise<{ user: any; session: any; profile: import('../types/index.ts').UserProfile }> {
    if (!this.isConfigured()) {
      throw new DomainError('Supabase Auth is not configured in this environment.', 503);
    }
    await this.ensureSeeded();
    const db = this.getAdminClient();

    const { data, error } = await db.auth.signInWithPassword({
      email,
      password,
    });

    let authUser = data?.user;
    let authSession = data?.session;

    if (error) {
      // Auto-confirm fallback: if email confirmation is pending in development, confirm via admin service role
      if (error.message && error.message.toLowerCase().includes('email not confirmed')) {
        try {
          const { data: usersData } = await db.auth.admin.listUsers();
          const target = usersData?.users?.find(
            (u: any) => u.email?.toLowerCase() === email.toLowerCase()
          );
          if (target) {
            await db.auth.admin.updateUserById(target.id, { email_confirm: true });
            const retry = await db.auth.signInWithPassword({ email, password });
            if (!retry.error && retry.data?.user) {
              authUser = retry.data.user;
              authSession = retry.data.session;
            } else {
              throw new DomainError(error.message, 401);
            }
          } else {
            throw new DomainError(error.message, 401);
          }
        } catch {
          throw new DomainError(
            'Email not confirmed. Please check your inbox for the Supabase confirmation link or click Sign In again.',
            401
          );
        }
      } else {
        throw new DomainError(error.message, 401);
      }
    }

    if (!authUser) {
      throw new DomainError('Invalid credentials.', 401);
    }

    const actor = await this.resolveOrSyncSupabaseUser(
      authUser.id,
      authUser.email || email,
      (authUser.user_metadata as Record<string, any>) || {},
      authSession?.access_token
    );

    const userProfile: import('../types/index.ts').UserProfile = actor
      ? actorToProfile(actor)
      : {
          id: authUser.id,
          email: authUser.email || email,
          full_name: String(authUser.user_metadata?.full_name || email.split('@')[0]),
          role: normalizeUserRole(authUser.user_metadata?.role),
          organization_id: String(authUser.user_metadata?.organization_id || ''),
          organization_name: String(authUser.user_metadata?.organization_name || 'Enterprise'),
        };

    return {
      user: authUser,
      session: authSession,
      profile: userProfile,
    };
  }

  /**
   * Lazily and idempotently seeds baseline EU 2023/1542 organizations, profiles,
   * battery passports, telematics, and SHA-256 hash-chained lifecycle events
   * when connecting to a freshly migrated empty Supabase project.
   */
  async ensureSeeded(): Promise<void> {
    if (!this.isConfigured()) return;
    if (!this.seedPromise) {
      this.seedPromise = this.performSeedIfEmpty().catch((err) => {
        this.seedPromise = null;
        console.error('Supabase initial seed check warning:', err);
      });
    }
    await this.seedPromise;
  }

  private async performSeedIfEmpty(): Promise<void> {
    const db = this.getAdminClient();

    const { count: orgCount, error: orgErr } = await db
      .from('organizations')
      .select('*', { count: 'exact', head: true });

    if (orgErr) {
      throw new Error(`Supabase schema check failed: ${orgErr.message}`);
    }

    if ((orgCount ?? 0) === 0) {
      await db.from('organizations').upsert(
        [
          {
            id: '11111111-1111-1111-1111-111111111111',
            name: 'QuantumVolt Gigafactory',
            org_type: 'MANUFACTURER',
            registration_number: 'HRB-BER-2024-991',
            country: 'DE',
            facility_location: 'Berlin-Brandenburg Gigafactory',
            contact_email: 'compliance@quantumvolt.de',
            is_verified: true,
          },
          {
            id: '22222222-2222-2222-2222-222222222222',
            name: 'Apex Motors AG',
            org_type: 'OEM',
            registration_number: 'HRB-STU-2023-412',
            country: 'DE',
            facility_location: 'Stuttgart Assembly Plant 1',
            contact_email: 'passport@apexmotors.de',
            is_verified: true,
          },
          {
            id: '33333333-3333-3333-3333-333333333333',
            name: 'Apex EV Mobility Fleet',
            org_type: 'FLEET_OPERATOR',
            registration_number: 'HRB-BER-2024-884',
            country: 'DE',
            facility_location: 'Berlin Fleet Hub',
            contact_email: 'fleet-ops@apexfleet.de',
            is_verified: true,
          },
          {
            id: '44444444-4444-4444-4444-444444444444',
            name: 'Berlin Battery Care',
            org_type: 'SERVICE_CENTER',
            registration_number: 'HRB-BER-2022-310',
            country: 'DE',
            facility_location: 'Berlin Service Depot',
            contact_email: 'service@berlinbatterycare.de',
            is_verified: true,
          },
          {
            id: '55555555-5555-5555-5555-555555555555',
            name: 'Nordic Remanufacturing Hub',
            org_type: 'REMANUFACTURER',
            registration_number: 'ORG-SE-556102-194',
            country: 'SE',
            facility_location: 'Gothenburg Reman Facility',
            contact_email: 'circular@nordicreman.se',
            is_verified: true,
          },
          {
            id: '66666666-6666-6666-6666-666666666666',
            name: 'EcoRecycle Metals Recovery',
            org_type: 'RECYCLER',
            registration_number: 'RCS-DUN-2021-99',
            country: 'FR',
            facility_location: 'Dunkirk Metallurgy Recovery',
            contact_email: 'metallurgy@ecorecycle.fr',
            is_verified: true,
          },
          {
            id: '77777777-7777-7777-7777-777777777777',
            name: 'EU Metrology Authority',
            org_type: 'REGULATOR_AUDITOR',
            registration_number: 'EU-AUDIT-2023-REG',
            country: 'BE',
            facility_location: 'Brussels Regulatory Office',
            contact_email: 'battery-audit@metrology.europa.eu',
            is_verified: true,
          },
        ],
        { onConflict: 'id' }
      );

      await db.from('profiles').upsert(
        [
          {
            id: 'a1111111-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
            organization_id: '11111111-1111-1111-1111-111111111111',
            email: 'manufacturer@quantumvolt.de',
            full_name: 'Elena Rostova',
            role: 'manufacturer',
            is_active: true,
          },
          {
            id: 'a2222222-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
            organization_id: '22222222-2222-2222-2222-222222222222',
            email: 'oem-admin@apexmotors.de',
            full_name: 'Marcus Weber',
            role: 'oem',
            is_active: true,
          },
          {
            id: 'a3333333-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
            organization_id: '33333333-3333-3333-3333-333333333333',
            email: 'fleet-manager@apexfleet.de',
            full_name: 'Sophie Laurent',
            role: 'fleet_operator',
            is_active: true,
          },
          {
            id: 'a4444444-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
            organization_id: '44444444-4444-4444-4444-444444444444',
            email: 'service-lead@berlinbatterycare.de',
            full_name: 'Hans Becker',
            role: 'service_center',
            is_active: true,
          },
          {
            id: 'a5555555-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
            organization_id: '55555555-5555-5555-5555-555555555555',
            email: 'reman-eng@nordicreman.se',
            full_name: 'Lars Lindqvist',
            role: 'remanufacturer',
            is_active: true,
          },
          {
            id: 'a6666666-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
            organization_id: '66666666-6666-6666-6666-666666666666',
            email: 'recycler@ecorecycle.fr',
            full_name: 'Camille Dubois',
            role: 'recycler',
            is_active: true,
          },
          {
            id: 'a7777777-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
            organization_id: '77777777-7777-7777-7777-777777777777',
            email: 'auditor@metrology.europa.eu',
            full_name: 'Dr. Aris Thorne',
            role: 'auditor',
            is_active: true,
          },
          {
            id: 'a8888888-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
            organization_id: '77777777-7777-7777-7777-777777777777',
            email: 'admin@batterypass360.eu',
            full_name: 'System Administrator',
            role: 'administrator',
            is_active: true,
          },
        ],
        { onConflict: 'id' }
      );
    }

    const { count: batCount } = await db
      .from('batteries')
      .select('*', { count: 'exact', head: true });

    if ((batCount ?? 0) === 0) {
      await db.from('batteries').upsert(
        [
          {
            id: 'b1111111-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
            battery_id: 'BAT-NMC-8A2F91C0',
            battery_did: 'did:battery:sha256:8a2f91c0e3a9c7b1a2d4e6f8a0b2c4d6e8f0a2b4c6d8e0f2a4b6c8d0e2f4a6b8',
            serial_number: 'QV-2024-NMC-98124',
            manufacturer_org_id: '11111111-1111-1111-1111-111111111111',
            current_custodian_org_id: '33333333-3333-3333-3333-333333333333',
            chemistry: 'NMC 811',
            model_designation: 'QV-HighEnergy-90X',
            manufacturing_date: '2024-01-15T09:00:00.000Z',
            manufacturing_country: 'DE',
            manufacturing_facility: 'Berlin-Brandenburg Gigafactory',
            status: 'IN_SERVICE',
            current_vehicle_vin: 'WAUZZZF28NA091244',
            technical_specs: {
              rated_capacity_kwh: 92.4,
              nominal_voltage_v: 400.0,
              max_charge_power_kw: 250.0,
              cell_count: 192,
              pack_weight_kg: 485.0,
              temperature_range_min_c: -25,
              temperature_range_max_c: 55,
            },
            carbon_footprint: {
              total_co2_kg_per_kwh: 62.5,
              manufacturing_co2_kg: 28.0,
              raw_materials_co2_kg: 29.5,
              transport_co2_kg: 5.0,
              eu_compliance_class: 'Class A',
            },
            recycled_content: {
              cobalt_percentage: 16.5,
              lithium_percentage: 6.0,
              nickel_percentage: 12.0,
              lead_percentage: 0.0,
            },
            created_at: '2024-01-15T09:00:00.000Z',
            updated_at: '2026-10-25T14:30:00.000Z',
          },
          {
            id: 'b2222222-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
            battery_id: 'BAT-LFP-3C7D410E',
            battery_did: 'did:battery:sha256:3c7d410eb7a9c8f2a1d3e5f7a9b1c3d5e7f9a1b3c5d7e9f1a3b5c7d9e1f3a5b7',
            serial_number: 'NBS-2023-LFP-44109',
            manufacturer_org_id: '11111111-1111-1111-1111-111111111111',
            current_custodian_org_id: '55555555-5555-5555-5555-555555555555',
            chemistry: 'LFP',
            model_designation: 'NBS-SafeCell-60',
            manufacturing_date: '2023-05-10T10:00:00.000Z',
            manufacturing_country: 'SE',
            manufacturing_facility: 'Skelleftea Gigafactory',
            status: 'SECOND_LIFE',
            current_vehicle_vin: null,
            technical_specs: {
              rated_capacity_kwh: 64.0,
              nominal_voltage_v: 320.0,
              max_charge_power_kw: 150.0,
              cell_count: 100,
              pack_weight_kg: 420.0,
              temperature_range_min_c: -20,
              temperature_range_max_c: 60,
            },
            carbon_footprint: {
              total_co2_kg_per_kwh: 51.2,
              manufacturing_co2_kg: 22.0,
              raw_materials_co2_kg: 24.2,
              transport_co2_kg: 5.0,
              eu_compliance_class: 'Class A',
            },
            recycled_content: {
              cobalt_percentage: 0.0,
              lithium_percentage: 4.5,
              nickel_percentage: 0.0,
              lead_percentage: 0.0,
            },
            created_at: '2023-05-10T10:00:00.000Z',
            updated_at: '2026-10-20T12:00:00.000Z',
          },
          {
            id: 'b3333333-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
            battery_id: 'BAT-NCA-F104A7B2',
            battery_did: 'did:battery:sha256:f104a7b2c8e0d9a3b2c4e6f8a1b3c5d7e9f0a2b4c6d8e0f2a4b6c8d0e2f4a6b8',
            serial_number: 'REC-2021-NCA-10042',
            manufacturer_org_id: '11111111-1111-1111-1111-111111111111',
            current_custodian_org_id: '66666666-6666-6666-6666-666666666666',
            chemistry: 'NCA',
            model_designation: 'REC-EVMax-85',
            manufacturing_date: '2021-08-20T08:00:00.000Z',
            manufacturing_country: 'FR',
            manufacturing_facility: 'Dunkirk Gigafactory',
            status: 'END_OF_LIFE',
            current_vehicle_vin: null,
            technical_specs: {
              rated_capacity_kwh: 85.0,
              nominal_voltage_v: 380.0,
              max_charge_power_kw: 200.0,
              cell_count: 180,
              pack_weight_kg: 460.0,
              temperature_range_min_c: -20,
              temperature_range_max_c: 55,
            },
            carbon_footprint: {
              total_co2_kg_per_kwh: 78.0,
              manufacturing_co2_kg: 35.0,
              raw_materials_co2_kg: 36.0,
              transport_co2_kg: 7.0,
              eu_compliance_class: 'Class B',
            },
            recycled_content: {
              cobalt_percentage: 22.0,
              lithium_percentage: 8.0,
              nickel_percentage: 18.0,
              lead_percentage: 0.0,
            },
            created_at: '2021-08-20T08:00:00.000Z',
            updated_at: '2026-10-18T16:00:00.000Z',
          },
        ],
        { onConflict: 'id' }
      );

      await db.from('battery_metrics').insert([
        {
          battery_id: 'b1111111-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
          state_of_health_pct: 88.4,
          state_of_charge_pct: 72.0,
          cycle_count: 420,
          internal_resistance_mohm: 19.8,
          capacity_fade_rate_pct_yr: 1.9,
          recorded_at: '2026-10-25T14:30:00.000Z',
          recorded_by: 'a3333333-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
          source: 'BMS_TELEMETRY',
        },
        {
          battery_id: 'b2222222-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
          state_of_health_pct: 76.8,
          state_of_charge_pct: 55.0,
          cycle_count: 1850,
          internal_resistance_mohm: 26.4,
          capacity_fade_rate_pct_yr: 2.1,
          recorded_at: '2026-10-20T12:00:00.000Z',
          recorded_by: 'a5555555-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
          source: 'BESS_DIAGNOSTIC',
        },
        {
          battery_id: 'b3333333-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
          state_of_health_pct: 64.2,
          state_of_charge_pct: 20.0,
          cycle_count: 2480,
          internal_resistance_mohm: 34.0,
          capacity_fade_rate_pct_yr: 3.2,
          recorded_at: '2026-10-18T16:00:00.000Z',
          recorded_by: 'a6666666-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
          source: 'RECYCLING_INGESTION',
        },
      ]);

      // Seed cryptographically valid SHA-256 lifecycle chains for all 3 batteries
      const seedChains: Array<{
        batteryUuid: string;
        humanId: string;
        events: Array<{
          event_type: string;
          timestamp: string;
          actor_id: string;
          actor_role: string;
          actor_organization_id: string;
          location: string;
          payload: Record<string, any>;
        }>;
      }> = [
        {
          batteryUuid: 'b1111111-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
          humanId: 'BAT-NMC-8A2F91C0',
          events: [
            {
              event_type: 'MANUFACTURED',
              timestamp: '2024-01-15T09:00:00.000Z',
              actor_id: 'a1111111-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
              actor_role: 'MANUFACTURER',
              actor_organization_id: '11111111-1111-1111-1111-111111111111',
              location: 'Berlin, Germany',
              payload: { batch_id: 'BATCH-2024-Q1-90', quality_grade: 'A+', initial_soh: 100.0 },
            },
            {
              event_type: 'OEM_ASSEMBLED',
              timestamp: '2024-02-10T11:20:00.000Z',
              actor_id: 'a2222222-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
              actor_role: 'OEM',
              actor_organization_id: '22222222-2222-2222-2222-222222222222',
              location: 'Stuttgart, Germany',
              payload: { vehicle_vin: 'WAUZZZF28NA091244', model: 'Apex GT Sedan', inverter_kw: 250 },
            },
            {
              event_type: 'TELEMETRY_UPDATED',
              timestamp: '2026-10-25T14:30:00.000Z',
              actor_id: 'a3333333-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
              actor_role: 'FLEET_OPERATOR',
              actor_organization_id: '33333333-3333-3333-3333-333333333333',
              location: 'Berlin, Germany',
              payload: { fleet_id: 'FLEET-BER-88', current_soh: 88.4, odometer_km: 68500 },
            },
          ],
        },
        {
          batteryUuid: 'b2222222-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
          humanId: 'BAT-LFP-3C7D410E',
          events: [
            {
              event_type: 'MANUFACTURED',
              timestamp: '2023-05-10T10:00:00.000Z',
              actor_id: 'a1111111-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
              actor_role: 'MANUFACTURER',
              actor_organization_id: '11111111-1111-1111-1111-111111111111',
              location: 'Skelleftea, Sweden',
              payload: { batch_id: 'BATCH-2023-LFP-44', initial_soh: 100.0 },
            },
            {
              event_type: 'SECOND_LIFE_ASSIGNED',
              timestamp: '2026-10-20T12:00:00.000Z',
              actor_id: 'a5555555-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
              actor_role: 'REMANUFACTURER',
              actor_organization_id: '55555555-5555-5555-5555-555555555555',
              location: 'Gothenburg, Sweden',
              payload: { application: 'Stationary Grid BESS Container', soh_at_handoff: 76.8 },
            },
          ],
        },
        {
          batteryUuid: 'b3333333-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
          humanId: 'BAT-NCA-F104A7B2',
          events: [
            {
              event_type: 'MANUFACTURED',
              timestamp: '2021-08-20T08:00:00.000Z',
              actor_id: 'a1111111-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
              actor_role: 'MANUFACTURER',
              actor_organization_id: '11111111-1111-1111-1111-111111111111',
              location: 'Dunkirk, France',
              payload: { batch_id: 'BATCH-2021-NCA-10', initial_soh: 100.0 },
            },
            {
              event_type: 'TRANSFERRED_CUSTODY',
              timestamp: '2026-10-18T16:00:00.000Z',
              actor_id: 'a6666666-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
              actor_role: 'RECYCLER',
              actor_organization_id: '66666666-6666-6666-6666-666666666666',
              location: 'Dunkirk, France',
              payload: { intake_reason: 'End-of-life hydrometallurgical recovery', soh_pct: 64.2 },
            },
          ],
        },
      ];

      const lifecycleRows: Array<Record<string, any>> = [];
      for (const chain of seedChains) {
        let prevHash = GENESIS_PREV_HASH;
        for (let idx = 0; idx < chain.events.length; idx++) {
          const ev = chain.events[idx];
          const isoTs = toIsoUtc(ev.timestamp);
          const hash = calculateEventHash(
            prevHash,
            chain.humanId,
            ev.event_type,
            isoTs,
            ev.actor_id,
            ev.payload
          );
          lifecycleRows.push({
            battery_id: chain.batteryUuid,
            event_number: idx,
            event_type: ev.event_type,
            timestamp: isoTs,
            actor_id: ev.actor_id,
            actor_role: ev.actor_role,
            actor_organization_id: ev.actor_organization_id,
            location: ev.location,
            payload: ev.payload,
            prev_hash: prevHash,
            hash,
          });
          prevHash = hash;
        }
      }

      await db.from('lifecycle_events').insert(lifecycleRows);

      await db.from('custody_transfers').upsert(
        [
          {
            id: 'c1111111-cccc-cccc-cccc-cccccccccccc',
            battery_id: 'b1111111-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
            sender_org_id: '11111111-1111-1111-1111-111111111111',
            receiver_org_id: '22222222-2222-2222-2222-222222222222',
            sender_actor_id: 'a1111111-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
            receiver_actor_id: 'a2222222-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
            state: 'ACCEPTED',
            transfer_type: 'OEM_DELIVERY',
            notes: 'Initial gigafactory batch delivery for vehicle assembly',
            initiated_at: '2024-01-20T10:00:00.000Z',
            responded_at: '2024-01-22T14:00:00.000Z',
          },
          {
            id: 'c2222222-cccc-cccc-cccc-cccccccccccc',
            battery_id: 'b1111111-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
            sender_org_id: '33333333-3333-3333-3333-333333333333',
            receiver_org_id: '44444444-4444-4444-4444-444444444444',
            sender_actor_id: 'a3333333-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
            receiver_actor_id: null,
            state: 'PENDING',
            transfer_type: 'MAINTENANCE_INSPECTION',
            notes: 'Scheduled 70,000 km high-voltage impedance inspection at Berlin Battery Care',
            initiated_at: '2026-10-26T09:15:00.000Z',
            responded_at: null,
          },
        ],
        { onConflict: 'id' }
      );

      await db.from('disposition_decisions').upsert(
        [
          {
            id: 'd1111111-dddd-dddd-dddd-dddddddddddd',
            battery_id: 'b1111111-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
            recommendation: 'CONTINUE_IN_SERVICE',
            recommended_pathway: 'Continue Primary Automotive Traction Service',
            constraints: { min_automotive_soh_pct: 80.0, measured_soh_pct: 88.4, internal_resistance_mohm: 19.8 },
            explanation: 'Pack retains 88.4% SoH with low internal resistance (19.8 mΩ) after 420 cycles; optimal to remain in primary EV traction service.',
            approval_status: 'APPROVED',
            decided_by: 'a3333333-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
            decided_at: '2026-10-25T14:35:00.000Z',
          },
          {
            id: 'd2222222-dddd-dddd-dddd-dddddddddddd',
            battery_id: 'b2222222-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
            recommendation: 'STATIONARY_BESS',
            recommended_pathway: 'Second-Life Grid Peak Shaving Container',
            constraints: { min_soh_pct: 70.0, max_temp_c: 45.0, max_c_rate: 0.5 },
            explanation: 'Degradation profile and remaining capacity (76.8% SoH, 1850 cycles) are optimal for stationary containerized grid energy storage.',
            approval_status: 'APPROVED',
            decided_by: 'a5555555-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
            decided_at: '2026-10-20T12:00:00.000Z',
          },
          {
            id: 'd3333333-dddd-dddd-dddd-dddddddddddd',
            battery_id: 'b3333333-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
            recommendation: 'DEEP_RECYCLING',
            recommended_pathway: 'Hydrometallurgical Co/Ni/Li Recovery',
            constraints: { min_second_life_soh_pct: 70.0, measured_soh_pct: 64.2, resistance_mohm: 34.0 },
            explanation: 'SoH below 70% threshold (64.2%) with elevated impedance (34.0 mΩ); routed to EU 2023/1542 certified hydrometallurgical recovery.',
            approval_status: 'APPROVED',
            decided_by: 'a6666666-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
            decided_at: '2026-10-18T16:05:00.000Z',
          },
        ],
        { onConflict: 'id' }
      );
    }
  }

  async getDatabaseStatus(): Promise<DatabaseStatus> {
    if (!this.isConfigured()) {
      return {
        isConfigured: false,
        isConnected: false,
        provider: 'MEMORY_FALLBACK',
        message:
          'Running on in-memory repository (USE_MEMORY_DB=true or Supabase server credentials absent).',
        lastChecked: new Date().toISOString(),
      };
    }

    try {
      await this.ensureSeeded();
      const db = this.getAdminClient();
      const expectedTables = [
        'organizations',
        'profiles',
        'batteries',
        'battery_metrics',
        'lifecycle_events',
        'custody_transfers',
        'evidence_records',
        'verification_results',
        'disposition_decisions',
        'audit_logs',
        'qpiai_execution_records',
      ];

      const probes = await Promise.all(
        expectedTables.map(async (name): Promise<DatabaseTableStatus> => {
          const { count, error } = await db
            .from(name)
            .select('id', { count: 'exact' })
            .limit(1);
          if (error) {
            return { name, exists: false, rowCount: null };
          }
          return { name, exists: true, rowCount: count ?? 0 };
        })
      );

      const batteriesTable = probes.find((t) => t.name === 'batteries');
      if (!batteriesTable || !batteriesTable.exists) {
        return {
          isConfigured: true,
          isConnected: false,
          provider: 'SUPABASE',
          message: 'Supabase reachable, but core `batteries` table is missing.',
          endpointUrl: this.supabaseUrl,
          lastChecked: new Date().toISOString(),
          tables: probes,
        };
      }

      const activeCount = probes.filter((t) => t.exists).length;
      return {
        isConfigured: true,
        isConnected: true,
        provider: 'SUPABASE',
        message: `Connected to live Supabase PostgreSQL (${batteriesTable.rowCount ?? 0} battery passports indexed, ${activeCount}/${expectedTables.length} tables active).`,
        endpointUrl: this.supabaseUrl,
        lastChecked: new Date().toISOString(),
        tables: probes,
      };
    } catch (err: any) {
      return {
        isConfigured: true,
        isConnected: false,
        provider: 'SUPABASE',
        message: `Supabase connection error: ${err?.message || 'Network failure'}`,
        endpointUrl: this.supabaseUrl || undefined,
        lastChecked: new Date().toISOString(),
      };
    }
  }

  /**
   * Resolves a Supabase Auth user (either from verified JWKS claims or via raw token)
   * and synchronizes their profile & organization in PostgreSQL.
   */
  async resolveOrSyncSupabaseUser(
    userId: string,
    email: string,
    metadata: Record<string, any>,
    rawToken?: string
  ): Promise<AuthenticatedActor | null> {
    if (!this.isConfigured()) return null;
    await this.ensureSeeded();
    const db = this.getAdminClient();

    let resolvedId = userId;
    let resolvedEmail = email;
    let resolvedMeta = metadata || {};

    if (rawToken) {
      const { data, error } = await db.auth.getUser(rawToken);
      if (error || !data?.user) {
        return null;
      }
      resolvedId = data.user.id;
      resolvedEmail = data.user.email || '';
      resolvedMeta = (data.user.user_metadata as Record<string, any>) || {};
    }

    if (!resolvedId) return null;

    // Look up existing profile in public.profiles
    const { data: existingProfile } = await db
      .from('profiles')
      .select('*')
      .eq('id', resolvedId)
      .maybeSingle();

    const orgMap = await this.getOrganizationsMap();

    if (existingProfile) {
      const role = normalizeUserRole(existingProfile.role);
      const org = existingProfile.organization_id
        ? orgMap.get(existingProfile.organization_id)
        : undefined;

      const memberships: Array<{ organization_id: string; organization_name: string; role: UserRole }> = [
        {
          organization_id: existingProfile.organization_id || ROLE_DEFAULT_ORGS[role].id,
          organization_name: org?.name || ROLE_DEFAULT_ORGS[role].name,
          role,
        },
      ];

      // Administrator has authorized governance across all verified enterprise organizations
      if (role === 'ADMINISTRATOR') {
        for (const [orgId, o] of orgMap.entries()) {
          if (orgId !== existingProfile.organization_id && o.is_verified) {
            memberships.push({
              organization_id: orgId,
              organization_name: o.name,
              role: 'ADMINISTRATOR',
            });
          }
        }
      } else if (Array.isArray(resolvedMeta.authorized_organizations)) {
        for (const extra of resolvedMeta.authorized_organizations) {
          if (extra.organization_id && extra.organization_name && extra.role) {
            memberships.push({
              organization_id: String(extra.organization_id),
              organization_name: String(extra.organization_name),
              role: normalizeUserRole(extra.role),
            });
          }
        }
      }

      return {
        id: existingProfile.id,
        email: existingProfile.email,
        full_name: existingProfile.full_name,
        role,
        organization_id: existingProfile.organization_id || ROLE_DEFAULT_ORGS[role].id,
        organization_name: org?.name || ROLE_DEFAULT_ORGS[role].name,
        auth_source: rawToken ? 'supabase_auth' : 'supabase_jwks',
        authorized_memberships: memberships,
      };
    }

    // Auto-provision profile row for newly signed-up Supabase Auth user
    const rawRole = normalizeUserRole(resolvedMeta.role || 'MANUFACTURER');
    // Prevent self-assigning ADMINISTRATOR via client user_metadata
    const safeRole: UserRole = rawRole === 'ADMINISTRATOR' ? 'MANUFACTURER' : rawRole;
    const requestedOrgName = String(
      resolvedMeta.organization_name || ROLE_DEFAULT_ORGS[safeRole].name
    ).trim();

    const orgRecord = await this.resolveOrCreateOrganization(requestedOrgName, safeRole);
    const fullName = String(
      resolvedMeta.full_name || resolvedEmail.split('@')[0] || 'Enterprise User'
    ).trim();

    await db.from('profiles').upsert(
      {
        id: resolvedId,
        organization_id: orgRecord.id,
        email: resolvedEmail || `${resolvedId}@batterypass360.eu`,
        full_name: fullName,
        role: roleToDbProfileRole(safeRole),
        is_active: true,
      },
      { onConflict: 'id' }
    );

    return {
      id: resolvedId,
      email: resolvedEmail,
      full_name: fullName,
      role: safeRole,
      organization_id: orgRecord.id,
      organization_name: orgRecord.name,
      auth_source: rawToken ? 'supabase_auth' : 'supabase_jwks',
    };
  }

  private async getOrganizationsMap(): Promise<Map<string, Organization>> {
    const orgs = await this.listOrganizations();
    const map = new Map<string, Organization>();
    for (const o of orgs) {
      map.set(o.id, o);
    }
    return map;
  }

  async resolveOrCreateOrganization(name: string, fallbackRole: UserRole): Promise<Organization> {
    if (!this.isConfigured()) {
      const orgs = batteryRepository.listOrganizations();
      const clean = name.trim().toLowerCase();
      const found = orgs.find((o) => o.name.trim().toLowerCase() === clean);
      if (found) return found;
      const def = ROLE_DEFAULT_ORGS[fallbackRole];
      return orgs.find((o) => o.id === def.id) || orgs[0];
    }
    await this.ensureSeeded();
    const orgs = await this.listOrganizations();
    const clean = name.trim().toLowerCase();
    const found = orgs.find((o) => o.name.trim().toLowerCase() === clean);
    if (found) return found;

    const db = this.getAdminClient();
    const orgType = fallbackRole === 'ADMINISTRATOR' ? 'REGULATOR_AUDITOR' : fallbackRole;
    const newId = crypto.randomUUID();
    const insertPayload = {
      id: newId,
      name: name.trim(),
      org_type: orgType === 'PUBLIC' ? 'MANUFACTURER' : orgType,
      registration_number: `EU-ORG-${Date.now().toString().slice(-6)}`,
      country: 'DE',
      facility_location: 'European Operations Facility',
      contact_email: `contact@${name.trim().toLowerCase().replace(/[^a-z0-9]/g, '') || 'enterprise'}.eu`,
      is_verified: true,
    };

    const { data, error } = await db
      .from('organizations')
      .insert(insertPayload)
      .select('*')
      .single();

    if (error || !data) {
      const def = ROLE_DEFAULT_ORGS[fallbackRole];
      return orgs.find((o) => o.id === def.id) || orgs[0];
    }

    return {
      id: data.id,
      name: data.name,
      org_type: data.org_type,
      type: data.org_type,
      registration_number: data.registration_number || '',
      country: data.country,
      facility_location: data.facility_location || 'Primary Facility',
      contact_email: data.contact_email,
      is_verified: Boolean(data.is_verified),
      created_at: toIsoUtc(data.created_at),
    };
  }

  private async resolveValidProfileUuid(actor: AuthenticatedActor): Promise<string> {
    const db = this.getAdminClient();
    if (UUID_REGEX.test(actor.id)) {
      const { data } = await db
        .from('profiles')
        .select('id')
        .eq('id', actor.id)
        .maybeSingle();
      if (data?.id) return data.id;
    }
    return ROLE_PROFILE_UUIDS[actor.role] || ROLE_PROFILE_UUIDS.MANUFACTURER;
  }

  async listOrganizations(): Promise<Organization[]> {
    if (!this.isConfigured()) {
      return batteryRepository.listOrganizations();
    }
    await this.ensureSeeded();
    const db = this.getAdminClient();
    const { data, error } = await db
      .from('organizations')
      .select('*')
      .order('name', { ascending: true });

    if (error) {
      console.error('Failed to query organizations:', error);
      throw new DomainError('Failed to query enterprise directory.', 500);
    }

    return (data || []).map((row: any) => ({
      id: row.id,
      name: row.name,
      org_type: row.org_type,
      type: row.org_type,
      registration_number: row.registration_number || '',
      country: row.country,
      facility_location: row.facility_location || 'Primary Facility',
      contact_email: row.contact_email,
      is_verified: Boolean(row.is_verified),
      created_at: toIsoUtc(row.created_at),
    }));
  }

  private async getLatestMetricsByBatteryUuids(
    batteryUuids: string[]
  ): Promise<Map<string, HealthState>> {
    const map = new Map<string, HealthState>();
    if (batteryUuids.length === 0) return map;

    const db = this.getAdminClient();
    const { data } = await db
      .from('battery_metrics')
      .select('*')
      .in('battery_id', batteryUuids)
      .order('recorded_at', { ascending: false });

    for (const row of data || []) {
      const bUuid = String(row.battery_id);
      if (!map.has(bUuid)) {
        map.set(bUuid, {
          state_of_health_pct: Number(row.state_of_health_pct ?? 100),
          state_of_charge_pct: Number(row.state_of_charge_pct ?? 80),
          cycle_count: Number(row.cycle_count ?? 0),
          internal_resistance_mohm: Number(row.internal_resistance_mohm ?? 18.0),
          capacity_fade_rate_pct_yr: Number(row.capacity_fade_rate_pct_yr ?? 1.5),
          last_telemetry_timestamp: toIsoUtc(row.recorded_at),
        });
      }
    }
    return map;
  }

  private mapBatteryRow(
    row: any,
    orgMap: Map<string, Organization>,
    health?: HealthState
  ): BatteryPassport {
    const mfgName = orgMap.get(row.manufacturer_org_id)?.name || 'Verified Manufacturer';
    const custName = orgMap.get(row.current_custodian_org_id)?.name || mfgName;

    return {
      id: row.id,
      battery_id: row.battery_id,
      battery_did: row.battery_did,
      serial_number: row.serial_number,
      manufacturer_name: mfgName,
      model_designation: row.model_designation,
      chemistry: row.chemistry,
      manufacturing_date: toIsoUtc(row.manufacturing_date),
      manufacturing_country: row.manufacturing_country,
      manufacturing_facility: row.manufacturing_facility || 'Primary Gigafactory',
      status: row.status,
      current_custodian: custName,
      current_vehicle_vin: row.current_vehicle_vin ?? null,
      technical_specs: row.technical_specs || {
        rated_capacity_kwh: 80,
        nominal_voltage_v: 400,
        max_charge_power_kw: 200,
        cell_count: 160,
        pack_weight_kg: 450,
      },
      carbon_footprint: row.carbon_footprint || {
        total_co2_kg_per_kwh: 60,
        manufacturing_co2_kg: 25,
        raw_materials_co2_kg: 30,
        transport_co2_kg: 5,
        eu_compliance_class: 'Class A',
      },
      recycled_content: row.recycled_content || {
        cobalt_percentage: 12,
        lithium_percentage: 5,
        nickel_percentage: 10,
        lead_percentage: 0,
      },
      health_state: health || {
        state_of_health_pct: 100,
        state_of_charge_pct: 85,
        cycle_count: 0,
        internal_resistance_mohm: 18.0,
        capacity_fade_rate_pct_yr: 1.2,
        last_telemetry_timestamp: toIsoUtc(row.updated_at),
      },
      qr_code_url: `/verify/${row.battery_id}`,
      created_at: toIsoUtc(row.created_at),
      updated_at: toIsoUtc(row.updated_at),
    };
  }

  private async findRawBatteryRow(idOrDid: string): Promise<any | null> {
    await this.ensureSeeded();
    const db = this.getAdminClient();
    const trimmed = idOrDid.trim();

    if (UUID_REGEX.test(trimmed)) {
      const { data } = await db.from('batteries').select('*').eq('id', trimmed).maybeSingle();
      if (data) return data;
    }

    const { data: byHuman } = await db
      .from('batteries')
      .select('*')
      .eq('battery_id', trimmed)
      .maybeSingle();
    if (byHuman) return byHuman;

    const { data: byDid } = await db
      .from('batteries')
      .select('*')
      .eq('battery_did', trimmed)
      .maybeSingle();
    return byDid || null;
  }

  async listPassports(statusFilter?: string, actor?: AuthenticatedActor | null): Promise<PassportSummary[]> {
    if (!this.isConfigured()) {
      return batteryRepository.listPassports(
        statusFilter,
        actor ? { role: actor.role, organization: actor.organization_name } : undefined
      );
    }
    await this.ensureSeeded();
    const db = this.getAdminClient();
    let query = db.from('batteries').select('*').order('created_at', { ascending: false });
    if (statusFilter && statusFilter !== 'ALL') {
      query = query.eq('status', statusFilter);
    }

    const { data, error } = await query;
    if (error) {
      console.error('Supabase listPassports failed:', error);
      throw new DomainError('Failed to fetch battery passports from Supabase.', 500);
    }

    let rows = data || [];
    const orgMap = await this.getOrganizationsMap();

    // Tenant Isolation:
    // Administrator & Regulator Auditor have network-wide oversight across all registered packs.
    // Specific enterprise tenants only see battery packs belonging to their organization
    // (i.e. where they are the manufacturer, current custodian, or previous custodian).
    if (actor && actor.role !== 'ADMINISTRATOR' && actor.role !== 'REGULATOR_AUDITOR') {
      const actorOrgName = (actor.organization_name || '').trim().toLowerCase();
      const actorOrgId = actor.organization_id || '';
      rows = rows.filter((r: any) => {
        const mfgOrg = orgMap.get(r.manufacturer_org_id);
        const custOrg = orgMap.get(r.current_custodian_org_id);
        const mfgMatch =
          r.manufacturer_org_id === actorOrgId ||
          (mfgOrg && mfgOrg.name.trim().toLowerCase() === actorOrgName);
        const custMatch =
          r.current_custodian_org_id === actorOrgId ||
          (custOrg && custOrg.name.trim().toLowerCase() === actorOrgName);
        return mfgMatch || custMatch;
      });
    }

    const metricsMap = await this.getLatestMetricsByBatteryUuids(rows.map((r: any) => r.id));

    return rows.map((r: any) => {
      const mapped = this.mapBatteryRow(r, orgMap, metricsMap.get(r.id));
      return {
        battery_id: mapped.battery_id,
        battery_did: mapped.battery_did,
        serial_number: mapped.serial_number,
        manufacturer_name: mapped.manufacturer_name,
        chemistry: mapped.chemistry,
        status: mapped.status,
        current_custodian: mapped.current_custodian,
        state_of_health_pct: mapped.health_state.state_of_health_pct,
        rated_capacity_kwh: mapped.technical_specs.rated_capacity_kwh,
        updated_at: mapped.updated_at,
      };
    });
  }

  async getPassport(idOrDid: string): Promise<BatteryPassport> {
    if (!this.isConfigured()) {
      const found = await batteryRepository.getPassport(idOrDid);
      if (!found) {
        throw new DomainError(`Battery passport '${idOrDid}' not found.`, 404);
      }
      return found;
    }
    const row = await this.findRawBatteryRow(idOrDid);
    if (!row) {
      throw new DomainError(`Battery passport '${idOrDid}' not found.`, 404);
    }
    const orgMap = await this.getOrganizationsMap();
    const metricsMap = await this.getLatestMetricsByBatteryUuids([row.id]);
    return this.mapBatteryRow(row, orgMap, metricsMap.get(row.id));
  }

  async createPassport(payload: any, actor: AuthenticatedActor): Promise<BatteryPassport> {
    if (!this.isConfigured()) {
      try {
        return await batteryRepository.createPassport(payload, {
          role: actor.role,
          organization: actor.organization_name,
        });
      } catch (err: any) {
        const msg = err.message || 'Failed to create battery passport';
        const code = msg.includes('Access denied') || msg.includes('violation') ? 403 : 400;
        throw new DomainError(msg, code);
      }
    }
    await this.ensureSeeded();
    if (actor.role !== 'MANUFACTURER' && actor.role !== 'ADMINISTRATOR') {
      throw new DomainError(
        `Access denied: Role '${actor.role}' cannot register new battery passports.`,
        403
      );
    }

    const mfgName = String(payload.manufacturer_name || actor.organization_name || '').trim();
    if (!mfgName || !payload.serial_number) {
      throw new DomainError('manufacturer_name and serial_number are required.', 400);
    }

    if (
      actor.role !== 'ADMINISTRATOR' &&
      actor.organization_name.trim().toLowerCase() !== mfgName.toLowerCase()
    ) {
      throw new DomainError(
        `Organization isolation violation: User belonging to '${actor.organization_name}' cannot mint battery under '${mfgName}'.`,
        403
      );
    }

    const db = this.getAdminClient();
    const orgRecord = await this.resolveOrCreateOrganization(mfgName, 'MANUFACTURER');

    // 1. Enforce that only verified manufacturer organizations can register new battery passports
    if (!orgRecord.is_verified) {
      throw new DomainError(
        `Access denied: Organization '${orgRecord.name}' is pending regulatory verification and is not yet authorized to mint official battery passports.`,
        403
      );
    }

    // 2. Prevent duplicate battery serial registrations
    const cleanSerial = String(payload.serial_number).trim();
    const { data: existingSerial } = await db
      .from('batteries')
      .select('battery_id, serial_number')
      .eq('serial_number', cleanSerial)
      .maybeSingle();

    if (existingSerial) {
      throw new DomainError(
        `Duplicate registration rejected: Battery with serial '${cleanSerial}' is already registered under passport ID '${existingSerial.battery_id}'. Each battery pack must possess a unique serial number.`,
        409
      );
    }

    const nowIso = new Date().toISOString();
    const mfgDateIso = payload.manufacturing_date ? toIsoUtc(payload.manufacturing_date) : nowIso;
    const chemistry = String(payload.chemistry || 'NMC 811').trim();
    const { did, shortId } = generateImmutableBatteryId(
      mfgName,
      String(payload.serial_number),
      chemistry,
      mfgDateIso
    );

    const batteryUuid = crypto.randomUUID();
    const insertRow = {
      id: batteryUuid,
      battery_id: shortId,
      battery_did: did,
      serial_number: String(payload.serial_number).trim(),
      manufacturer_org_id: orgRecord.id,
      current_custodian_org_id: orgRecord.id,
      chemistry,
      model_designation: String(payload.model_designation || 'EU-Pack-Standard').trim(),
      manufacturing_date: mfgDateIso,
      manufacturing_country: String(payload.manufacturing_country || 'DE').slice(0, 3).toUpperCase(),
      manufacturing_facility: String(payload.manufacturing_facility || orgRecord.facility_location || 'Gigafactory 1'),
      status: 'MANUFACTURED',
      current_vehicle_vin: null,
      technical_specs: payload.technical_specs || {
        rated_capacity_kwh: 85.0,
        nominal_voltage_v: 400.0,
        max_charge_power_kw: 220.0,
        cell_count: 192,
        pack_weight_kg: 470.0,
      },
      carbon_footprint: payload.carbon_footprint || {
        total_co2_kg_per_kwh: 58.0,
        manufacturing_co2_kg: 24.0,
        raw_materials_co2_kg: 29.0,
        transport_co2_kg: 5.0,
        eu_compliance_class: 'Class A',
      },
      recycled_content: payload.recycled_content || {
        cobalt_percentage: 16.0,
        lithium_percentage: 6.0,
        nickel_percentage: 10.0,
        lead_percentage: 0.0,
      },
      created_at: nowIso,
      updated_at: nowIso,
    };

    const { error: batErr } = await db.from('batteries').insert(insertRow);
    if (batErr) {
      throw new DomainError(`Could not register battery passport: ${batErr.message}`, 400);
    }

    const profileUuid = await this.resolveValidProfileUuid(actor);

    // Insert initial health reading into battery_metrics
    await db.from('battery_metrics').insert({
      battery_id: batteryUuid,
      state_of_health_pct: 100.0,
      state_of_charge_pct: 85.0,
      cycle_count: 0,
      internal_resistance_mohm: 18.0,
      capacity_fade_rate_pct_yr: 0.0,
      recorded_at: nowIso,
      recorded_by: profileUuid,
      source: 'FACTORY_EOL_TEST',
    });

    // Append Genesis SHA-256 block into lifecycle_events
    const genesisPayload = {
      serial_number: insertRow.serial_number,
      chemistry: insertRow.chemistry,
      rated_capacity_kwh: insertRow.technical_specs.rated_capacity_kwh,
      eu_compliance_class: insertRow.carbon_footprint.eu_compliance_class,
    };
    const genesisHash = calculateEventHash(
      GENESIS_PREV_HASH,
      shortId,
      'MANUFACTURED',
      nowIso,
      profileUuid,
      genesisPayload
    );

    await db.from('lifecycle_events').insert({
      battery_id: batteryUuid,
      event_number: 0,
      event_type: 'MANUFACTURED',
      timestamp: nowIso,
      actor_id: profileUuid,
      actor_role: actor.role,
      actor_organization_id: orgRecord.id,
      location: insertRow.manufacturing_facility,
      payload: genesisPayload,
      prev_hash: GENESIS_PREV_HASH,
      hash: genesisHash,
    });

    await this.writeAuditLog(
      profileUuid,
      actor.role,
      orgRecord.id,
      'CREATE_BATTERY_PASSPORT',
      'batteries',
      shortId,
      {
        serial_number: insertRow.serial_number,
        chemistry: insertRow.chemistry,
      }
    );

    return this.getPassport(shortId);
  }

  async updateTelemetry(
    idOrDid: string,
    telemetry: any,
    actor: AuthenticatedActor
  ): Promise<BatteryPassport> {
    if (!this.isConfigured()) {
      try {
        return await batteryRepository.updateTelemetry(idOrDid, telemetry, {
          role: actor.role,
          organization: actor.organization_name,
        });
      } catch (err: any) {
        const msg = err.message || 'Failed to update telemetry';
        const code = msg.includes('Access denied') ? 403 : 400;
        throw new DomainError(msg, code);
      }
    }
    const row = await this.findRawBatteryRow(idOrDid);
    if (!row) {
      throw new DomainError(`Battery passport '${idOrDid}' not found.`, 404);
    }

    const allowedRoles: UserRole[] = [
      'FLEET_OPERATOR',
      'SERVICE_CENTER',
      'OEM',
      'MANUFACTURER',
      'REMANUFACTURER',
      'ADMINISTRATOR',
    ];
    if (!allowedRoles.includes(actor.role)) {
      throw new DomainError(`Access denied: Role '${actor.role}' cannot log BMS telemetry.`, 403);
    }

    const orgMap = await this.getOrganizationsMap();
    const currentCustodianName = orgMap.get(row.current_custodian_org_id)?.name || '';
    if (
      actor.role !== 'ADMINISTRATOR' &&
      currentCustodianName &&
      actor.organization_name.trim().toLowerCase() !== currentCustodianName.trim().toLowerCase()
    ) {
      throw new DomainError(
        `Access denied: Battery is under stewardship of '${currentCustodianName}'. Organization '${actor.organization_name}' cannot record telemetry.`,
        403
      );
    }

    const db = this.getAdminClient();
    const metricsMap = await this.getLatestMetricsByBatteryUuids([row.id]);
    const prevHealth = metricsMap.get(row.id);

    const soh = Number(telemetry.state_of_health_pct ?? prevHealth?.state_of_health_pct ?? 88.0);
    const soc = Number(telemetry.state_of_charge_pct ?? prevHealth?.state_of_charge_pct ?? 70.0);
    const cycles = Number(telemetry.cycle_count ?? prevHealth?.cycle_count ?? 100);
    const resistance = Number(
      telemetry.internal_resistance_mohm ?? prevHealth?.internal_resistance_mohm ?? 20.0
    );
    const fadeRate = Number(
      telemetry.capacity_fade_rate_pct_yr ?? prevHealth?.capacity_fade_rate_pct_yr ?? 1.8
    );

    const nowIso = new Date().toISOString();
    const profileUuid = await this.resolveValidProfileUuid(actor);

    // Append immutable telemetry reading to battery_metrics
    const { error: metricErr } = await db.from('battery_metrics').insert({
      battery_id: row.id,
      state_of_health_pct: soh,
      state_of_charge_pct: soc,
      cycle_count: cycles,
      internal_resistance_mohm: resistance,
      capacity_fade_rate_pct_yr: fadeRate,
      recorded_at: nowIso,
      recorded_by: profileUuid,
      source: 'BMS_TELEMETRY',
      raw_telemetry: telemetry.telemetry_notes ? { notes: telemetry.telemetry_notes } : {},
    });

    if (metricErr) {
      throw new DomainError(`Failed to record BMS telemetry: ${metricErr.message}`, 400);
    }

    let nextStatus = row.status;
    if (soh < 68 && row.status !== 'RECYCLED') {
      nextStatus = 'END_OF_LIFE';
    } else if (soh < 78 && row.status === 'IN_SERVICE') {
      nextStatus = 'SECOND_LIFE';
    }

    await db
      .from('batteries')
      .update({ status: nextStatus, updated_at: nowIso })
      .eq('id', row.id);

    await this.appendLifecycleEventInternal({
      batteryUuid: row.id,
      humanBatteryId: row.battery_id,
      eventType: 'TELEMETRY_UPDATED',
      actor,
      location: actor.organization_name,
      payload: {
        state_of_health_pct: soh,
        state_of_charge_pct: soc,
        cycle_count: cycles,
        internal_resistance_mohm: resistance,
        notes: telemetry.telemetry_notes || 'BMS diagnostic check',
      },
    });

    await this.writeAuditLog(
      profileUuid,
      actor.role,
      row.current_custodian_org_id,
      'UPDATE_BATTERY_TELEMETRY',
      'battery_metrics',
      row.battery_id,
      {
        state_of_health_pct: soh,
        cycle_count: cycles,
        status: nextStatus,
      }
    );

    return this.getPassport(row.battery_id);
  }

  private async appendLifecycleEventInternal(params: {
    batteryUuid: string;
    humanBatteryId: string;
    eventType: string;
    actor: AuthenticatedActor;
    location: string;
    payload: Record<string, any>;
  }): Promise<CustodyEvent> {
    const db = this.getAdminClient();
    const existing = await this.getCustodyEventsByUuid(params.batteryUuid, params.humanBatteryId);
    const prevHash = existing.length > 0 ? existing[existing.length - 1].hash : GENESIS_PREV_HASH;
    const eventNumber = existing.length;
    const nowIso = new Date().toISOString();
    const profileUuid = await this.resolveValidProfileUuid(params.actor);
    const actorOrg = await this.resolveOrCreateOrganization(
      params.actor.organization_name,
      params.actor.role
    );

    const hash = calculateEventHash(
      prevHash,
      params.humanBatteryId,
      params.eventType,
      nowIso,
      profileUuid,
      params.payload
    );

    const { data, error } = await db
      .from('lifecycle_events')
      .insert({
        battery_id: params.batteryUuid,
        event_number: eventNumber,
        event_type: params.eventType,
        timestamp: nowIso,
        actor_id: profileUuid,
        actor_role: params.actor.role,
        actor_organization_id: actorOrg.id,
        location: params.location,
        payload: params.payload,
        prev_hash: prevHash,
        hash,
      })
      .select('*')
      .single();

    if (error || !data) {
      throw new DomainError(`Failed to append cryptographic custody block: ${error?.message}`, 500);
    }

    return {
      event_id: data.id,
      battery_id: params.humanBatteryId,
      event_type: data.event_type,
      timestamp: nowIso,
      actor_id: profileUuid,
      actor_role: data.actor_role,
      actor_organization: actorOrg.name,
      location: data.location || params.location,
      payload: data.payload || {},
      prev_hash: data.prev_hash,
      hash: data.hash,
    };
  }

  private async getCustodyEventsByUuid(
    batteryUuid: string,
    humanBatteryId: string
  ): Promise<CustodyEvent[]> {
    const db = this.getAdminClient();
    const orgMap = await this.getOrganizationsMap();
    const { data, error } = await db
      .from('lifecycle_events')
      .select('*')
      .eq('battery_id', batteryUuid)
      .order('event_number', { ascending: true });

    if (error) {
      throw new DomainError('Failed to load lifecycle events.', 500);
    }

    return (data || []).map((row: any) => ({
      event_id: row.id,
      battery_id: humanBatteryId,
      event_type: row.event_type,
      timestamp: toIsoUtc(row.timestamp),
      actor_id: String(row.actor_id || ROLE_PROFILE_UUIDS.MANUFACTURER),
      actor_role: row.actor_role,
      actor_organization: orgMap.get(row.actor_organization_id)?.name || 'Authorized Stakeholder',
      location: row.location || 'EU Facility',
      payload: row.payload || {},
      prev_hash: String(row.prev_hash).trim(),
      hash: String(row.hash).trim(),
    }));
  }

  async getCustodyEvents(idOrDid: string): Promise<CustodyEvent[]> {
    if (!this.isConfigured()) {
      return batteryRepository.getCustodyEvents(idOrDid);
    }
    const row = await this.findRawBatteryRow(idOrDid);
    if (!row) {
      throw new DomainError(`Battery passport '${idOrDid}' not found.`, 404);
    }
    return this.getCustodyEventsByUuid(row.id, row.battery_id);
  }

  async appendCustodyEvent(
    idOrDid: string,
    eventInput: any,
    actor: AuthenticatedActor
  ): Promise<CustodyEvent> {
    if (!this.isConfigured()) {
      try {
        return await batteryRepository.appendCustodyEvent(idOrDid, {
          ...eventInput,
          actor_role: actor.role,
          actor_organization: actor.organization_name,
        });
      } catch (err: any) {
        const msg = err.message || 'Failed to append custody event';
        const code = msg.includes('Access denied') ? 403 : 400;
        throw new DomainError(msg, code);
      }
    }
    const row = await this.findRawBatteryRow(idOrDid);
    if (!row) {
      throw new DomainError(`Battery passport '${idOrDid}' not found.`, 404);
    }

    const orgMap = await this.getOrganizationsMap();
    const custodianName = orgMap.get(row.current_custodian_org_id)?.name || '';
    if (
      actor.role !== 'ADMINISTRATOR' &&
      actor.role !== 'REGULATOR_AUDITOR' &&
      custodianName &&
      actor.organization_name.trim().toLowerCase() !== custodianName.trim().toLowerCase()
    ) {
      throw new DomainError(
        `Access denied: Organization '${actor.organization_name}' cannot append custody events for battery held by '${custodianName}'.`,
        403
      );
    }

    return this.appendLifecycleEventInternal({
      batteryUuid: row.id,
      humanBatteryId: row.battery_id,
      eventType: String(eventInput.event_type || 'MAINTENANCE_LOGGED'),
      actor,
      location: String(eventInput.location || actor.organization_name),
      payload: eventInput.payload || {},
    });
  }

  async listTransfers(actor?: AuthenticatedActor | null): Promise<CustodyTransfer[]> {
    if (!this.isConfigured()) {
      return batteryRepository.listTransfers(
        actor ? { role: actor.role, organization: actor.organization_name } : undefined
      );
    }
    await this.ensureSeeded();
    const db = this.getAdminClient();
    const [{ data: transfers, error }, orgMap, { data: batteries }] = await Promise.all([
      db.from('custody_transfers').select('*').order('initiated_at', { ascending: false }),
      this.getOrganizationsMap(),
      db.from('batteries').select('id, battery_id'),
    ]);

    if (error) {
      throw new DomainError('Failed to fetch custody transfers.', 500);
    }

    const batMap = new Map<string, string>();
    for (const b of batteries || []) {
      batMap.set(b.id, b.battery_id);
    }

    let list = (transfers || []).map((t: any) => ({
      id: t.id,
      battery_id: batMap.get(t.battery_id) || t.battery_id,
      sender_org_id: t.sender_org_id,
      sender_org_name: orgMap.get(t.sender_org_id)?.name || 'Sender Enterprise',
      receiver_org_id: t.receiver_org_id,
      receiver_org_name: orgMap.get(t.receiver_org_id)?.name || 'Receiver Enterprise',
      sender_actor_id: t.sender_actor_id,
      receiver_actor_id: t.receiver_actor_id,
      state: t.state,
      transfer_type: t.transfer_type,
      notes: t.notes,
      rejection_reason: t.rejection_reason,
      initiated_at: toIsoUtc(t.initiated_at),
      responded_at: t.responded_at ? toIsoUtc(t.responded_at) : null,
    }));

    // If tenant actor, return transfers where their organization is sender OR receiver (or admin sees all)
    if (actor && actor.role !== 'ADMINISTRATOR' && actor.role !== 'REGULATOR_AUDITOR') {
      const actorOrgName = (actor.organization_name || '').trim().toLowerCase();
      const actorOrgId = actor.organization_id || '';
      list = list.filter((t) => {
        const isSender =
          t.sender_org_id === actorOrgId ||
          t.sender_org_name.trim().toLowerCase() === actorOrgName;
        const isReceiver =
          t.receiver_org_id === actorOrgId ||
          t.receiver_org_name.trim().toLowerCase() === actorOrgName;
        return isSender || isReceiver;
      });
    }

    return list;
  }

  async createTransfer(
    payload: {
      battery_id: string;
      receiver_org_id: string;
      receiver_org_name: string;
      transfer_type: string;
      notes?: string;
    },
    actor: AuthenticatedActor
  ): Promise<CustodyTransfer> {
    if (!this.isConfigured()) {
      try {
        return await batteryRepository.createTransfer(payload, {
          role: actor.role,
          organization: actor.organization_name,
        });
      } catch (err: any) {
        const msg = err.message || 'Failed to create custody transfer';
        const code = msg.includes('Access denied') || msg.includes('denied') ? 403 : 400;
        throw new DomainError(msg, code);
      }
    }
    const row = await this.findRawBatteryRow(payload.battery_id);
    if (!row) {
      throw new DomainError(`Battery '${payload.battery_id}' not found.`, 404);
    }

    const orgMap = await this.getOrganizationsMap();
    const custodianOrg = orgMap.get(row.current_custodian_org_id);
    if (
      actor.role !== 'ADMINISTRATOR' &&
      custodianOrg &&
      actor.organization_name.trim().toLowerCase() !== custodianOrg.name.trim().toLowerCase()
    ) {
      throw new DomainError(
        `Custody initiation denied: Only current custodian '${custodianOrg.name}' or Administrator can transfer custody of this battery.`,
        403
      );
    }

    let receiverOrg = UUID_REGEX.test(payload.receiver_org_id || '')
      ? orgMap.get(payload.receiver_org_id)
      : undefined;
    if (!receiverOrg && payload.receiver_org_name) {
      receiverOrg = await this.resolveOrCreateOrganization(payload.receiver_org_name, 'OEM');
    }
    if (!receiverOrg) {
      throw new DomainError('Designated receiver organization could not be resolved.', 400);
    }

    const senderOrg =
      custodianOrg || (await this.resolveOrCreateOrganization(actor.organization_name, actor.role));
    const profileUuid = await this.resolveValidProfileUuid(actor);
    const nowIso = new Date().toISOString();

    const db = this.getAdminClient();
    const { data, error } = await db
      .from('custody_transfers')
      .insert({
        battery_id: row.id,
        sender_org_id: senderOrg.id,
        receiver_org_id: receiverOrg.id,
        sender_actor_id: profileUuid,
        state: 'PENDING',
        transfer_type: payload.transfer_type || 'FLEET_ASSIGNMENT',
        notes: payload.notes || null,
        initiated_at: nowIso,
      })
      .select('*')
      .single();

    if (error || !data) {
      throw new DomainError(`Failed to create custody transfer: ${error?.message}`, 400);
    }

    await this.writeAuditLog(
      profileUuid,
      actor.role,
      senderOrg.id,
      'INITIATE_CUSTODY_TRANSFER',
      'custody_transfers',
      data.id,
      {
        battery_id: row.battery_id,
        receiver_org_id: receiverOrg.id,
        transfer_type: data.transfer_type,
      }
    );

    return {
      id: data.id,
      battery_id: row.battery_id,
      sender_org_id: senderOrg.id,
      sender_org_name: senderOrg.name,
      receiver_org_id: receiverOrg.id,
      receiver_org_name: receiverOrg.name,
      sender_actor_id: profileUuid,
      receiver_actor_id: null,
      state: data.state,
      transfer_type: data.transfer_type,
      notes: data.notes,
      rejection_reason: null,
      initiated_at: toIsoUtc(data.initiated_at),
      responded_at: null,
    };
  }

  async acceptTransfer(
    transferId: string,
    notes: string | undefined,
    actor: AuthenticatedActor
  ): Promise<CustodyTransfer> {
    if (!this.isConfigured()) {
      try {
        return await batteryRepository.acceptCustodyTransfer(transferId, notes, {
          role: actor.role,
          organization: actor.organization_name,
        });
      } catch (err: any) {
        const msg = err.message || 'Failed to accept custody transfer';
        const code = msg.includes('Access denied') ? 403 : 400;
        throw new DomainError(msg, code);
      }
    }
    await this.ensureSeeded();
    const db = this.getAdminClient();
    const { data: transfer, error: fetchErr } = await db
      .from('custody_transfers')
      .select('*')
      .eq('id', transferId)
      .maybeSingle();

    if (fetchErr || !transfer) {
      throw new DomainError(`Custody transfer '${transferId}' not found.`, 404);
    }
    if (transfer.state !== 'PENDING') {
      throw new DomainError(`Transfer is already in '${transfer.state}' state.`, 400);
    }

    const orgMap = await this.getOrganizationsMap();
    const receiverOrg = orgMap.get(transfer.receiver_org_id);
    const senderOrg = orgMap.get(transfer.sender_org_id);
    const isReceiver =
      actor.organization_id === transfer.receiver_org_id ||
      (receiverOrg &&
        actor.organization_name.trim().toLowerCase() === receiverOrg.name.trim().toLowerCase());

    if (actor.role !== 'ADMINISTRATOR' && !isReceiver) {
      throw new DomainError(
        `Access denied: Only the designated receiver organization ('${receiverOrg?.name || 'Receiver'}') is authorized to accept this custody transfer.`,
        403
      );
    }

    const profileUuid = await this.resolveValidProfileUuid(actor);
    const nowIso = new Date().toISOString();

    const mergedNotes = notes
      ? transfer.notes
        ? `${transfer.notes} | Accepted: ${notes}`
        : notes
      : transfer.notes;

    const { error: updErr } = await db
      .from('custody_transfers')
      .update({
        state: 'ACCEPTED',
        receiver_actor_id: profileUuid,
        responded_at: nowIso,
        notes: mergedNotes,
        updated_at: nowIso,
      })
      .eq('id', transferId);

    if (updErr) {
      throw new DomainError(`Failed to accept transfer: ${updErr.message}`, 400);
    }

    // Update battery custodian and lifecycle status
    const batRow = await this.findRawBatteryRow(transfer.battery_id);
    if (batRow) {
      let nextStatus = batRow.status;
      if (transfer.transfer_type === 'OEM_DELIVERY' || transfer.transfer_type === 'FLEET_ASSIGNMENT') {
        nextStatus = 'IN_SERVICE';
      } else if (transfer.transfer_type === 'MAINTENANCE_INSPECTION') {
        nextStatus = 'MAINTENANCE';
      } else if (transfer.transfer_type === 'SECOND_LIFE_EVALUATION') {
        nextStatus = 'SECOND_LIFE';
      } else if (transfer.transfer_type === 'END_OF_LIFE_RECYCLING') {
        nextStatus = 'END_OF_LIFE';
      }

      await db
        .from('batteries')
        .update({
          current_custodian_org_id: transfer.receiver_org_id,
          status: nextStatus,
          updated_at: nowIso,
        })
        .eq('id', batRow.id);

      await this.appendLifecycleEventInternal({
        batteryUuid: batRow.id,
        humanBatteryId: batRow.battery_id,
        eventType: 'TRANSFERRED_CUSTODY',
        actor,
        location: receiverOrg?.facility_location || actor.organization_name,
        payload: {
          transfer_id: transferId,
          from_organization: senderOrg?.name || 'Previous Custodian',
          to_organization: receiverOrg?.name || actor.organization_name,
          transfer_type: transfer.transfer_type,
          acceptance_notes: notes || 'Custody accepted',
        },
      });
    }

    await this.writeAuditLog(
      profileUuid,
      actor.role,
      transfer.receiver_org_id,
      'ACCEPT_CUSTODY_TRANSFER',
      'custody_transfers',
      transfer.id,
      {
        battery_id: batRow?.battery_id || transfer.battery_id,
        sender_org_id: transfer.sender_org_id,
        receiver_org_id: transfer.receiver_org_id,
      }
    );

    return {
      id: transfer.id,
      battery_id: batRow?.battery_id || transfer.battery_id,
      sender_org_id: transfer.sender_org_id,
      sender_org_name: senderOrg?.name || 'Sender Enterprise',
      receiver_org_id: transfer.receiver_org_id,
      receiver_org_name: receiverOrg?.name || actor.organization_name,
      sender_actor_id: transfer.sender_actor_id,
      receiver_actor_id: profileUuid,
      state: 'ACCEPTED',
      transfer_type: transfer.transfer_type,
      notes: mergedNotes,
      rejection_reason: null,
      initiated_at: toIsoUtc(transfer.initiated_at),
      responded_at: nowIso,
    };
  }

  async rejectTransfer(
    transferId: string,
    reason: string,
    actor: AuthenticatedActor
  ): Promise<CustodyTransfer> {
    if (!reason || !reason.trim()) {
      throw new DomainError('A valid rejection reason is required under EU custody rules.', 400);
    }
    if (!this.isConfigured()) {
      try {
        return await batteryRepository.rejectCustodyTransfer(transferId, reason, {
          role: actor.role,
          organization: actor.organization_name,
        });
      } catch (err: any) {
        const msg = err.message || 'Failed to reject custody transfer';
        const code = msg.includes('Access denied') ? 403 : 400;
        throw new DomainError(msg, code);
      }
    }
    await this.ensureSeeded();
    const db = this.getAdminClient();
    const { data: transfer, error: fetchErr } = await db
      .from('custody_transfers')
      .select('*')
      .eq('id', transferId)
      .maybeSingle();

    if (fetchErr || !transfer) {
      throw new DomainError(`Custody transfer '${transferId}' not found.`, 404);
    }
    if (transfer.state !== 'PENDING') {
      throw new DomainError(`Transfer is already in '${transfer.state}' state.`, 400);
    }

    const orgMap = await this.getOrganizationsMap();
    const receiverOrg = orgMap.get(transfer.receiver_org_id);
    const senderOrg = orgMap.get(transfer.sender_org_id);
    const isReceiver =
      actor.organization_id === transfer.receiver_org_id ||
      (receiverOrg &&
        actor.organization_name.trim().toLowerCase() === receiverOrg.name.trim().toLowerCase());

    if (actor.role !== 'ADMINISTRATOR' && !isReceiver) {
      throw new DomainError(
        `Access denied: Only the designated receiver organization ('${receiverOrg?.name || 'Receiver'}') is authorized to reject this custody transfer.`,
        403
      );
    }

    const profileUuid = await this.resolveValidProfileUuid(actor);
    const nowIso = new Date().toISOString();

    const { error: updErr } = await db
      .from('custody_transfers')
      .update({
        state: 'REJECTED',
        receiver_actor_id: profileUuid,
        responded_at: nowIso,
        rejection_reason: reason.trim(),
        updated_at: nowIso,
      })
      .eq('id', transferId);

    if (updErr) {
      throw new DomainError(`Failed to reject transfer: ${updErr.message}`, 400);
    }

    const batRow = await this.findRawBatteryRow(transfer.battery_id);

    await this.writeAuditLog(
      profileUuid,
      actor.role,
      transfer.receiver_org_id,
      'REJECT_CUSTODY_TRANSFER',
      'custody_transfers',
      transfer.id,
      {
        battery_id: batRow?.battery_id || transfer.battery_id,
        reason: reason.trim(),
      }
    );

    return {
      id: transfer.id,
      battery_id: batRow?.battery_id || transfer.battery_id,
      sender_org_id: transfer.sender_org_id,
      sender_org_name: senderOrg?.name || 'Sender Enterprise',
      receiver_org_id: transfer.receiver_org_id,
      receiver_org_name: receiverOrg?.name || actor.organization_name,
      sender_actor_id: transfer.sender_actor_id,
      receiver_actor_id: profileUuid,
      state: 'REJECTED',
      transfer_type: transfer.transfer_type,
      notes: transfer.notes,
      rejection_reason: reason.trim(),
      initiated_at: toIsoUtc(transfer.initiated_at),
      responded_at: nowIso,
    };
  }

  async verifyAuditTrail(idOrDid: string): Promise<AuditVerification> {
    if (!this.isConfigured()) {
      return batteryRepository.verifyAuditTrail(idOrDid);
    }
    const row = await this.findRawBatteryRow(idOrDid);
    if (!row) {
      throw new DomainError(`Battery passport '${idOrDid}' not found.`, 404);
    }
    const events = await this.getCustodyEventsByUuid(row.id, row.battery_id);
    const check = verifyChainIntegrity(events);
    const verifiedAt = new Date().toISOString();

    const result: AuditVerification = {
      battery_id: row.battery_id,
      total_events: events.length,
      is_valid: check.isValid,
      genesis_hash: events.length > 0 ? events[0].hash : null,
      latest_block_hash: events.length > 0 ? events[events.length - 1].hash : null,
      error_message: check.errorMessage,
      tampered_block_index: check.tamperedIndex,
      verified_at: verifiedAt,
    };

    try {
      const db = this.getAdminClient();
      await db.from('verification_results').insert({
        battery_id: row.id,
        verifier_role: 'SYSTEM_VERIFIER',
        check_type: 'FULL_CRYPTOGRAPHIC_AUDIT',
        is_authentic: true,
        is_chain_valid: check.isValid,
        total_blocks_checked: events.length,
        error_details: check.errorMessage,
        genesis_hash: result.genesis_hash,
        latest_block_hash: result.latest_block_hash,
        verified_at: verifiedAt,
      });
    } catch {
      // Non-fatal audit recording
    }

    return result;
  }

  async verifyPublic(idOrDid: string): Promise<PublicVerification> {
    if (!this.isConfigured()) {
      return batteryRepository.verifyPublic(idOrDid);
    }
    const passport = await this.getPassport(idOrDid);
    const audit = await this.verifyAuditTrail(passport.battery_id);
    const fraudStatus = await this.getFraudStatus(passport.battery_id).catch(() => null);

    // Strictly whitelist public EU 2023/1542 fields — redact VIN, raw telemetry, and internal notes
    return {
      is_authentic: true,
      battery_id: passport.battery_id,
      battery_did: passport.battery_did,
      serial_number: passport.serial_number,
      manufacturer_name: passport.manufacturer_name,
      model_designation: passport.model_designation,
      chemistry: passport.chemistry,
      manufacturing_date: passport.manufacturing_date,
      manufacturing_country: passport.manufacturing_country,
      manufacturing_facility: passport.manufacturing_facility,
      current_custodian_name: passport.current_custodian,
      status: passport.status,
      state_of_health_pct: passport.health_state.state_of_health_pct,
      carbon_footprint_total: passport.carbon_footprint.total_co2_kg_per_kwh,
      eu_compliance_class: passport.carbon_footprint.eu_compliance_class,
      total_custody_events: audit.total_events,
      is_audit_chain_valid: audit.is_valid,
      verification_timestamp: new Date().toISOString(),
      physical_verification_status: fraudStatus?.last_physical_verification
        ? (fraudStatus.last_physical_verification.status as any)
        : 'PENDING_INSPECTION',
      tamper_report_count: fraudStatus?.tamper_reports_count || 0,
      recent_scan_count_15m: fraudStatus?.recent_scan_count_15m || 0,
      suspicious_repeated_scans: fraudStatus?.suspicious_repeated_scans || false,
    };
  }

  async getTwoStepPrecheck(batteryIdOrDid: string): Promise<TwoStepPrecheckResponse> {
    const cleanBatteryId = String(batteryIdOrDid || '').trim();
    if (!cleanBatteryId) {
      throw new DomainError('Digital battery ID is required for verification pre-check.', 400);
    }

    if (!this.isConfigured()) {
      return batteryRepository.getTwoStepPrecheck(cleanBatteryId);
    }

    const row = await this.findRawBatteryRow(cleanBatteryId);
    if (!row) {
      throw new DomainError(`Battery passport '${cleanBatteryId}' not found.`, 404);
    }

    const now = Date.now();
    const attempts = row.consecutive_failed_attempts || 0;
    const isFlagged = Boolean(row.is_flagged_for_investigation);
    const isTimeLocked = Boolean(
      row.lockout_until && new Date(row.lockout_until).getTime() > now
    );
    const isLocked = isFlagged || attempts >= 5 || isTimeLocked;

    return {
      battery_id: row.battery_id,
      battery_did: row.battery_did,
      status: isLocked ? 'SUSPICIOUS_LOCKED' : 'AWAITING_PHYSICAL_UID',
      is_flagged: isFlagged,
      is_locked: isLocked,
      consecutive_failed_attempts: attempts,
      remaining_attempts: Math.max(0, 5 - attempts),
      lockout_until: row.lockout_until || null,
      investigation_reason: row.investigation_reason || null,
      flagged_at: row.flagged_at || null,
      manufacturer_hint: row.manufacturer_name || 'Authorized OEM',
      model_designation: row.model_designation || undefined,
      requires_physical_uid: true,
      message: isLocked
        ? "This battery is currently flagged as 'Suspicious — Verification Required' due to 5 consecutive failed verification attempts. Further physical identity verification is temporarily blocked pending authorized review."
        : "Digital QR passport reference resolved. Step 2 required: Enter or scan the permanent UID engraved on the physical battery casing.",
    };
  }

  async verifyPhysicalIdentity(
    batteryIdOrDid: string,
    payload: PhysicalVerificationRequest,
    actor?: AuthenticatedActor | null,
    clientIp?: string
  ): Promise<PhysicalVerificationResponse> {
    const cleanBatteryId = String(batteryIdOrDid || '').trim();
    if (!cleanBatteryId) {
      throw new DomainError('Digital battery ID is required for verification.', 400);
    }
    const cleanEntered = canonicalizeSerial(payload?.physical_serial);
    if (!cleanEntered) {
      throw new DomainError('Physical serial number is required for verification.', 400);
    }
    if (cleanEntered.length > 120 || /[\x00-\x1F\x7F]/.test(cleanEntered)) {
      throw new DomainError('Malformed physical serial number. Must not contain control characters and must not exceed 120 characters.', 400);
    }

    if (!this.isConfigured()) {
      return batteryRepository.verifyPhysicalIdentity(
        cleanBatteryId,
        payload,
        actor ? actorToProfile(actor) : null,
        clientIp
      );
    }

    const row = await this.findRawBatteryRow(cleanBatteryId);
    if (!row) {
      throw new DomainError(`Battery passport '${cleanBatteryId}' not found.`, 404);
    }

    const now = Date.now();
    const attempts = row.consecutive_failed_attempts || 0;
    const isFlagged = Boolean(row.is_flagged_for_investigation);
    const isTimeLocked = Boolean(
      row.lockout_until && new Date(row.lockout_until).getTime() > now
    );

    // Enforce server-side lockout: Reject if flagged or already 5 failures or time locked
    if (isFlagged || attempts >= 5 || isTimeLocked) {
      throw new DomainError(
        "Physical verification temporarily blocked. Maximum attempts (5) exceeded. Battery flagged as 'Suspicious — Verification Required' pending authorized inspector review.",
        423
      );
    }

    const passport = await this.getPassport(row.battery_id);
    const db = this.getAdminClient();

    const cleanRegistered = canonicalizeSerial(row.serial_number);

    // 15-minute velocity check on verification_results
    const fifteenMinutesAgo = new Date(now - 15 * 60 * 1000).toISOString();
    const { data: recentAttempts } = await db
      .from('verification_results')
      .select('id, verified_at')
      .eq('battery_id', row.id)
      .gte('verified_at', fifteenMinutesAgo);

    const recentCount = (recentAttempts?.length || 0) + 1;
    const suspiciousRepeatedScans = recentCount >= 5;

    // Tamper report count from audit_logs
    const { data: tamperLogs } = await db
      .from('audit_logs')
      .select('id')
      .eq('entity_type', 'BATTERY')
      .eq('entity_id', row.battery_id)
      .eq('action', 'TAMPER_ALERT_REPORTED');

    const tamperCount = tamperLogs?.length || 0;

    let status: PhysicalVerificationResponse['status'] = 'MATCHED';
    let isAuthentic = true;
    let fraudDetected = false;
    let fraudType: PhysicalVerificationResponse['fraud_type'] = null;
    let conflictingBatteryId: string | null = null;
    let matchDetails = '';
    let passportDetails: PublicVerification | null = null;

    const isMatch = isSerialMatch(payload?.physical_serial, row.serial_number);

    if (isMatch) {
      status = 'MATCHED';
      isAuthentic = true;
      fraudDetected = false;
      matchDetails = `Identity Matched: Permanent laser-engraved casing serial '${row.serial_number}' strictly matches registered passport '${row.battery_id}'.`;

      // Reset failure counter in database
      try {
        await db
          .from('batteries')
          .update({
            consecutive_failed_attempts: 0,
            lockout_until: null,
            is_flagged_for_investigation: false,
          })
          .eq('id', row.id);
      } catch (e) {
        console.warn('Non-fatal: could not reset consecutive_failed_attempts in Supabase', e);
      }

      // Unseal passport details on authenticated physical match
      passportDetails = await this.verifyPublic(row.battery_id);
    } else {
      const newAttempts = attempts + 1;

      if (newAttempts >= 5) {
        status = 'SUSPICIOUS_VERIFICATION_REQUIRED';
        isAuthentic = false;
        fraudDetected = true;
        fraudType = 'EXCESSIVE_FAILED_VERIFICATIONS';
        matchDetails = `Maximum allowable attempts (5) reached. Battery has been flagged as 'Suspicious — Verification Required' and further verification is temporarily blocked pending authorized review.`;

        try {
          await db
            .from('batteries')
            .update({
              consecutive_failed_attempts: newAttempts,
              is_flagged_for_investigation: true,
              lockout_until: new Date(now + 15 * 60 * 1000).toISOString(),
              flagged_at: new Date().toISOString(),
              investigation_reason: 'Exceeded 5 consecutive failed physical UID verification attempts.',
            })
            .eq('id', row.id);
        } catch (e) {
          console.warn('Non-fatal: could not flag battery in Supabase', e);
        }
      } else {
        const remaining = 5 - newAttempts;
        // Check if serial belongs to any other battery (QR Sticker Swap detection)
        const { data: otherBattery } = await db
          .from('batteries')
          .select('id, battery_id, serial_number')
          .ilike('serial_number', cleanEntered)
          .neq('id', row.id)
          .maybeSingle();

        if (otherBattery) {
          status = 'MISMATCH_FRAUD';
          isAuthentic = false;
          fraudDetected = true;
          fraudType = 'QR_STICKER_SWAP_DETECTED';
          conflictingBatteryId = otherBattery.battery_id;
          matchDetails = `CRITICAL FRAUD ALERT: Physical casing serial belongs to a different battery passport (${otherBattery.battery_id}). ${remaining} attempt(s) remaining before security lockout.`;
        } else {
          status = 'UNREGISTERED_SERIAL';
          isAuthentic = false;
          fraudDetected = true;
          fraudType = 'UNREGISTERED_PHYSICAL_CASING';
          matchDetails = `Physical serial verification failed. The entered UID does not match the registered casing record. ${remaining} attempt(s) remaining before security lockout.`;
        }

        try {
          await db
            .from('batteries')
            .update({ consecutive_failed_attempts: newAttempts })
            .eq('id', row.id);
        } catch (e) {
          console.warn('Non-fatal: could not update consecutive_failed_attempts in Supabase', e);
        }
      }
    }

    const nowIso = new Date().toISOString();
    let profileUuid: string | null = null;
    if (actor) {
      try {
        profileUuid = await this.resolveValidProfileUuid(actor);
      } catch {
        profileUuid = null;
      }
    }

    // Persist into verification_results
    try {
      await db.from('verification_results').insert({
        battery_id: row.id,
        verified_by: profileUuid,
        verifier_role: actor?.role || 'PUBLIC',
        check_type: 'DUAL_ID_PHYSICAL_VERIFICATION',
        is_authentic: isAuthentic,
        is_chain_valid: true,
        total_blocks_checked: 1,
        error_details: isAuthentic ? null : matchDetails,
        metadata: {
          physical_serial_entered: payload.physical_serial,
          registered_serial: isMatch ? row.serial_number : undefined,
          match_status: status,
          fraud_detected: fraudDetected,
          fraud_type: fraudType,
          conflicting_battery_id: conflictingBatteryId,
          suspicious_repeated_scans: suspiciousRepeatedScans,
          client_ip: clientIp || null,
          inspector_notes: payload.inspector_notes || null,
          barcode_type: payload.barcode_type || 'MANUAL',
        },
        verified_at: nowIso,
      });
    } catch (e) {
      console.warn('Non-fatal: could not write verification_results row', e);
    }

    // Append security audit log
    try {
      await db.from('audit_logs').insert({
        action: isMatch
          ? 'DUAL_ID_VERIFIED_SUCCESS'
          : status === 'SUSPICIOUS_VERIFICATION_REQUIRED'
          ? 'BATTERY_FLAGGED_SUSPICIOUS'
          : 'VERIFICATION_FAILED_ATTEMPT',
        entity_type: 'BATTERY',
        entity_id: row.battery_id,
        actor_id: profileUuid,
        actor_role: actor?.role || 'PUBLIC',
        actor_ip: clientIp || null,
        details: {
          status,
          fraud_detected: fraudDetected,
          entered_serial: cleanEntered,
          registered_serial: isMatch ? row.serial_number : undefined,
          conflicting_battery_id: conflictingBatteryId,
          suspicious_repeated_scans: suspiciousRepeatedScans,
          inspector_notes: payload.inspector_notes || null,
        },
        timestamp: nowIso,
      });
    } catch (e) {
      console.warn('Non-fatal: could not write audit_logs row', e);
    }

    return {
      status,
      is_authentic: isAuthentic,
      battery_id: row.battery_id,
      battery_did: row.battery_did,
      physical_serial_entered: payload.physical_serial,
      manufacturer_name: passport.manufacturer_name,
      model_designation: passport.model_designation,
      match_details: matchDetails,
      fraud_detected: fraudDetected,
      fraud_type: fraudType,
      conflicting_battery_id: conflictingBatteryId,
      suspicious_repeated_scans: suspiciousRepeatedScans,
      recent_scan_count_15m: recentCount,
      verified_at: nowIso,
      verifier: {
        id: actor?.id,
        role: actor?.role || 'PUBLIC',
        organization: actor?.organization_name,
      },
      tamper_report_count: tamperCount,
      consecutive_failed_attempts: isMatch ? 0 : (attempts + 1),
      remaining_attempts: isMatch ? 5 : Math.max(0, 5 - (attempts + 1)),
      is_flagged_for_investigation: !isMatch && (attempts + 1) >= 5,
      passport_details: passportDetails,
      registered_serial_number: isMatch ? row.serial_number : undefined,
    };
  }

  async resetLockout(
    batteryIdOrDid: string,
    notes?: string,
    actor?: AuthenticatedActor | null
  ): Promise<ResetLockoutResponse> {
    if (!actor || (actor.role !== 'ADMINISTRATOR' && actor.role !== 'REGULATOR_AUDITOR')) {
      throw new DomainError(
        'Access denied: Only authorized administrators or inspectors can review and reset verification lockouts.',
        403
      );
    }

    if (!this.isConfigured()) {
      return batteryRepository.resetLockout(
        batteryIdOrDid,
        notes,
        actor ? actorToProfile(actor) : null
      );
    }

    const row = await this.findRawBatteryRow(batteryIdOrDid);
    if (!row) {
      throw new DomainError(`Battery passport '${batteryIdOrDid}' not found.`, 404);
    }

    const db = this.getAdminClient();
    const nowIso = new Date().toISOString();
    let profileUuid: string | null = null;
    try {
      profileUuid = await this.resolveValidProfileUuid(actor);
    } catch {
      profileUuid = null;
    }

    await db
      .from('batteries')
      .update({
        consecutive_failed_attempts: 0,
        is_flagged_for_investigation: false,
        lockout_until: null,
        investigation_reason: null,
        review_notes: notes || 'Lockout cleared by authorized inspector after review.',
        reviewed_by: profileUuid,
        reviewed_at: nowIso,
      })
      .eq('id', row.id);

    try {
      await db.from('audit_logs').insert({
        action: 'VERIFICATION_LOCKOUT_RESET',
        entity_type: 'BATTERY',
        entity_id: row.battery_id,
        actor_id: profileUuid,
        actor_role: actor.role,
        details: {
          notes: notes || 'Lockout cleared by authorized inspector after review.',
          reset_at: nowIso,
        },
        timestamp: nowIso,
      });
    } catch (e) {
      console.warn('Non-fatal: could not log lockout reset to Supabase audit_logs', e);
    }

    return {
      success: true,
      message: 'Security lockout successfully cleared and battery investigation flag resolved.',
      battery_id: row.battery_id,
      reset_at: nowIso,
      reviewed_by: actor.id,
    };
  }

  async getFlaggedBatteries(actor?: AuthenticatedActor | null): Promise<FlaggedBatteryAlert[]> {
    if (!this.isConfigured()) {
      return batteryRepository.getFlaggedBatteries();
    }

    const db = this.getAdminClient();
    const { data: rows } = await db
      .from('batteries')
      .select('id, battery_id, battery_did, manufacturer_name, model_designation, consecutive_failed_attempts, is_flagged_for_investigation, lockout_until, investigation_reason, flagged_at')
      .or('is_flagged_for_investigation.eq.true,consecutive_failed_attempts.gte.5');

    if (!rows || rows.length === 0) {
      return [];
    }

    return rows.map((r: any) => ({
      battery_id: r.battery_id,
      battery_did: r.battery_did,
      manufacturer_name: r.manufacturer_name,
      model_designation: r.model_designation,
      consecutive_failed_attempts: r.consecutive_failed_attempts || 0,
      is_flagged_for_investigation: Boolean(r.is_flagged_for_investigation),
      lockout_until: r.lockout_until || null,
      investigation_reason: r.investigation_reason || null,
      flagged_at: r.flagged_at || null,
      tamper_reports_count: 0,
    }));
  }

  async reportTampering(
    batteryIdOrDid: string,
    payload: TamperReportRequest,
    actor?: AuthenticatedActor | null,
    clientIp?: string
  ): Promise<TamperReportResponse> {
    if (!this.isConfigured()) {
      return batteryRepository.reportTampering(
        batteryIdOrDid,
        payload,
        actor ? actorToProfile(actor) : null,
        clientIp
      );
    }

    const row = await this.findRawBatteryRow(batteryIdOrDid);
    if (!row) {
      throw new DomainError(`Battery passport '${batteryIdOrDid}' not found.`, 404);
    }

    const db = this.getAdminClient();
    const nowIso = new Date().toISOString();
    const reportId = 'TR-' + crypto.randomUUID().slice(0, 8).toUpperCase();

    let profileUuid: string | null = null;
    if (actor) {
      try {
        profileUuid = await this.resolveValidProfileUuid(actor);
      } catch {
        profileUuid = null;
      }
    }

    try {
      await db.from('audit_logs').insert({
        action: 'TAMPER_ALERT_REPORTED',
        entity_type: 'BATTERY',
        entity_id: row.battery_id,
        actor_id: profileUuid,
        actor_role: actor?.role || 'PUBLIC',
        actor_ip: clientIp || null,
        details: {
          report_id: reportId,
          reason: payload.reason,
          description: payload.description,
          reported_serial: payload.reported_serial || null,
        },
        timestamp: nowIso,
      });
    } catch (e) {
      console.warn('Non-fatal: could not log tamper incident to audit_logs', e);
    }

    return {
      success: true,
      report_id: reportId,
      battery_id: row.battery_id,
      status: 'INVESTIGATION_PENDING',
      message: `Tamper incident '${payload.reason}' reported and logged onto immutable security audit trail.`,
      timestamp: nowIso,
    };
  }

  async getFraudStatus(batteryIdOrDid: string): Promise<FraudAuditStatus> {
    if (!this.isConfigured()) {
      return batteryRepository.getFraudStatus(batteryIdOrDid);
    }

    const row = await this.findRawBatteryRow(batteryIdOrDid);
    if (!row) {
      throw new DomainError(`Battery passport '${batteryIdOrDid}' not found.`, 404);
    }

    const db = this.getAdminClient();

    // Query physical verifications
    const { data: verifications } = await db
      .from('verification_results')
      .select('*')
      .eq('battery_id', row.id)
      .eq('check_type', 'DUAL_ID_PHYSICAL_VERIFICATION')
      .order('verified_at', { ascending: true });

    const list = verifications || [];
    const matchedCount = list.filter(v => v.is_authentic).length;
    const fraudAlertsCount = list.filter(v => !v.is_authentic).length;

    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString();
    const recentScans = list.filter(v => v.verified_at >= fifteenMinutesAgo);

    // Tamper logs count
    const { count: tamperCount } = await db
      .from('audit_logs')
      .select('*', { count: 'exact', head: true })
      .eq('entity_type', 'BATTERY')
      .eq('entity_id', row.battery_id)
      .eq('action', 'TAMPER_ALERT_REPORTED');

    const last = list.length > 0 ? list[list.length - 1] : null;

    return {
      battery_id: row.battery_id,
      battery_did: row.battery_did,
      registered_serial_number: row.serial_number,
      total_physical_verifications: list.length,
      matched_count: matchedCount,
      fraud_alerts_count: fraudAlertsCount,
      tamper_reports_count: tamperCount || 0,
      recent_scan_count_15m: recentScans.length,
      suspicious_repeated_scans: recentScans.length >= 5,
      last_physical_verification: last
        ? {
            status: last.is_authentic ? 'MATCHED' : ((last.metadata as any)?.match_status || 'MISMATCH_FRAUD'),
            verified_at: toIsoUtc(last.verified_at),
            verifier_role: last.verifier_role,
          }
        : null,
    };
  }

  async getDispositionDecision(idOrDid: string): Promise<DispositionDecision> {
    if (!this.isConfigured()) {
      try {
        return await batteryRepository.getDispositionDecision(idOrDid);
      } catch (err: any) {
        throw new DomainError(err.message || 'Disposition decision not found', 404);
      }
    }
    const row = await this.findRawBatteryRow(idOrDid);
    if (!row) {
      throw new DomainError(`Battery passport '${idOrDid}' not found.`, 404);
    }

    const db = this.getAdminClient();
    const { data: existing } = await db
      .from('disposition_decisions')
      .select('*')
      .eq('battery_id', row.id)
      .order('decided_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    const passport = await this.getPassport(row.battery_id);
    const soh = passport.health_state.state_of_health_pct;

    if (existing) {
      return {
        id: existing.id,
        battery_id: row.battery_id,
        recommendation: existing.recommendation,
        recommended_pathway: existing.recommended_pathway,
        recommended_action: existing.recommended_pathway,
        score: Math.round(soh),
        is_second_life_suitable: soh >= 70 && soh < 85,
        target_application: existing.recommended_pathway,
        estimated_remaining_useful_life_years: Math.max(0, Number(((soh - 60) * 0.35).toFixed(1))),
        recycling_efficiency_pct: 94.5,
        constraints: existing.constraints || {},
        constraints_evaluated: existing.constraints || {},
        explanation: existing.explanation,
        approval_status: existing.approval_status,
        decided_by: existing.decided_by,
        decided_at: toIsoUtc(existing.decided_at),
        approved_by: existing.approved_by,
        approved_at: existing.approved_at ? toIsoUtc(existing.approved_at) : null,
      };
    }

    // Generate and persist initial decision for newly minted battery
    const rec: DispositionDecision['recommendation'] =
      soh >= 82
        ? 'CONTINUE_IN_SERVICE'
        : soh >= 72
        ? 'STATIONARY_BESS'
        : soh >= 65
        ? 'CELL_RECONDITIONING'
        : 'DEEP_RECYCLING';

    const pathway =
      rec === 'CONTINUE_IN_SERVICE'
        ? 'Continue Primary Automotive Traction Service'
        : rec === 'STATIONARY_BESS'
        ? 'Second-Life Grid Peak Shaving Container'
        : rec === 'CELL_RECONDITIONING'
        ? 'Module Reconditioning & Cell Balancing'
        : 'Hydrometallurgical Co/Ni/Li Recovery';

    const explanation = `Evaluated live BMS SoH (${soh}%) and internal resistance (${passport.health_state.internal_resistance_mohm} mΩ) under EU 2023/1542 circularity criteria.`;
    const constraints = {
      soh_pct: soh,
      internal_resistance_mohm: passport.health_state.internal_resistance_mohm,
      cycle_count: passport.health_state.cycle_count,
    };

    const { data: inserted } = await db
      .from('disposition_decisions')
      .insert({
        battery_id: row.id,
        recommendation: rec,
        recommended_pathway: pathway,
        constraints,
        explanation,
        approval_status: 'PROPOSED',
      })
      .select('*')
      .maybeSingle();

    return {
      id: inserted?.id || crypto.randomUUID(),
      battery_id: row.battery_id,
      recommendation: rec,
      recommended_pathway: pathway,
      recommended_action: pathway,
      score: Math.round(soh),
      is_second_life_suitable: soh >= 70 && soh < 85,
      target_application: pathway,
      estimated_remaining_useful_life_years: Math.max(0, Number(((soh - 60) * 0.35).toFixed(1))),
      recycling_efficiency_pct: 94.5,
      constraints,
      constraints_evaluated: constraints,
      explanation,
      approval_status: 'PROPOSED',
      decided_at: new Date().toISOString(),
    };
  }

  async logQpiAIExecution(params: {
    engineType: 'QPIAI_OPT' | 'QPIAI_QUANTUM';
    batteryId?: string | null;
    actor?: AuthenticatedActor;
    rawStatus: string;
    backend: string;
    jobId?: string | null;
    parameters: Record<string, any>;
    results: Record<string, any>;
    errorMessage?: string | null;
    executionTimeSeconds?: number | null;
  }): Promise<void> {
    if (!this.isConfigured()) return;
    try {
      await this.ensureSeeded();
      const db = this.getAdminClient();

      let validHumanBatteryId: string | null = null;
      if (params.batteryId) {
        const found = await this.findRawBatteryRow(params.batteryId);
        if (found) validHumanBatteryId = found.battery_id;
      }

      const profileUuid = params.actor ? await this.resolveValidProfileUuid(params.actor) : null;
      const orgId =
        params.actor && UUID_REGEX.test(params.actor.organization_id)
          ? params.actor.organization_id
          : null;

      // 1. Always persist structured QpiAI execution telemetry to core `audit_logs` table
      await this.writeAuditLog(
        profileUuid,
        params.actor?.role || null,
        orgId,
        params.engineType === 'QPIAI_OPT' ? 'QPIAI_OPT_EXECUTION' : 'QPIAI_QUANTUM_EXECUTION',
        'qpiai_execution',
        params.jobId || validHumanBatteryId || params.engineType,
        {
          engine_type: params.engineType,
          battery_id: validHumanBatteryId,
          raw_status: params.rawStatus,
          backend: params.backend,
          job_id: params.jobId || null,
          parameters: params.parameters,
          results: params.results,
          error_message: params.errorMessage || null,
          execution_time_seconds: params.executionTimeSeconds ?? null,
        }
      );

      // 2. Also persist to `qpiai_execution_records` if Migration 002/004 is applied
      const legacyAllowedStatuses = new Set([
        'SUCCESS',
        'SUBMITTED',
        'NOT_CONFIGURED',
        'AUTH_REQUIRED',
        'ERROR',
        'FAILED',
      ]);
      const normalizedStatus = legacyAllowedStatuses.has(params.rawStatus)
        ? params.rawStatus
        : params.rawStatus === 'SIMULATION_COMPLETED' || params.rawStatus === 'LOCAL_SOLVED'
        ? 'SUBMITTED'
        : 'ERROR';

      await db.from('qpiai_execution_records').insert({
        engine_type: params.engineType,
        battery_id: validHumanBatteryId,
        user_id: profileUuid,
        organization_id: orgId,
        status: normalizedStatus,
        backend: params.backend,
        job_id: params.jobId || null,
        parameters: { ...params.parameters, raw_status: params.rawStatus },
        results: params.results,
        error_message: params.errorMessage || null,
        execution_time_seconds: params.executionTimeSeconds ?? null,
      });
    } catch (err) {
      console.warn('Non-fatal QpiAI execution log warning:', err);
    }
  }

  private async writeAuditLog(
    actorId: string | null,
    actorRole: string | null,
    organizationId: string | null,
    action: string,
    entityType: string,
    entityId: string,
    details: Record<string, any>
  ): Promise<void> {
    try {
      const db = this.getAdminClient();
      await db.from('audit_logs').insert({
        action,
        entity_type: entityType,
        entity_id: entityId,
        actor_id: actorId,
        actor_role: actorRole,
        details: {
          ...details,
          ...(organizationId ? { organization_id: organizationId } : {}),
        },
      });
    } catch {
      // Ignore non-fatal audit log errors
    }
  }

  async getBatteryMetricsHistory(
    batteryIdOrDid: string,
    startDate?: string,
    endDate?: string,
    actor?: AuthenticatedActor | null
  ): Promise<BatteryMetricPoint[]> {
    if (!this.isConfigured()) {
      return batteryRepository.getBatteryMetricsHistory(
        batteryIdOrDid,
        startDate,
        endDate,
        actor ? actorToProfile(actor) : null
      );
    }

    if (!actor || actor.role === 'PUBLIC') {
      throw new DomainError('Access denied: Detailed BMS telemetry history requires authorized enterprise credentials.', 403);
    }

    const cleanId = String(batteryIdOrDid || '').trim();
    if (!cleanId) {
      throw new DomainError('Battery ID is required to fetch health trend telemetry.', 400);
    }

    const row = await this.findRawBatteryRow(cleanId);
    if (!row) {
      throw new DomainError(`Battery passport '${cleanId}' not found.`, 404);
    }

    if (actor.role !== 'ADMINISTRATOR' && actor.role !== 'REGULATOR_AUDITOR') {
      const orgId = actor.organization_id;
      const isOwner = row.current_custodian_org_id === orgId || row.manufacturer_org_id === orgId;
      if (!isOwner && actor.role !== 'SERVICE_CENTER' && actor.role !== 'REMANUFACTURER') {
        throw new DomainError(`Access denied: Organization does not have stewardship or telemetry access for battery '${row.battery_id}'.`, 403);
      }
    }

    const db = this.getAdminClient();
    let query = db
      .from('battery_metrics')
      .select('*')
      .eq('battery_id', row.id);

    if (startDate) query = query.gte('recorded_at', startDate);
    if (endDate) query = query.lte('recorded_at', endDate);
    query = query.order('recorded_at', { ascending: true });

    const { data, error } = await query;
    if (error) {
      throw new DomainError(`Failed to fetch battery metrics: ${error.message}`, 500);
    }

    return (data || []).map((r) => ({
      id: r.id,
      battery_id: row.battery_id,
      state_of_health_pct: Number(r.state_of_health_pct),
      state_of_charge_pct: Number(r.state_of_charge_pct),
      cycle_count: Number(r.cycle_count),
      internal_resistance_mohm: Number(r.internal_resistance_mohm),
      capacity_fade_rate_pct_yr: Number(r.capacity_fade_rate_pct_yr ?? 0),
      recorded_at: toIsoUtc(r.recorded_at),
      source: r.source || 'BMS_TELEMETRY',
    }));
  }

  async getAnalyticsOverview(actor?: AuthenticatedActor | null): Promise<AnalyticsOverview> {
    if (!this.isConfigured()) {
      return batteryRepository.getAnalyticsOverview(actor ? actorToProfile(actor) : null);
    }

    const db = this.getAdminClient();

    // 1. Batteries & Lifecycle distribution
    const { data: batteryRows, error: bErr } = await db
      .from('batteries')
      .select('id, battery_id, status, manufacturer_org_id, current_custodian_org_id');

    if (bErr) throw new DomainError(`Failed to query batteries: ${bErr.message}`, 500);

    const lifecycleDist: Record<string, number> = {
      MANUFACTURED: 0,
      IN_SERVICE: 0,
      MAINTENANCE: 0,
      SECOND_LIFE: 0,
      END_OF_LIFE: 0,
      RECYCLED: 0,
      DECOMMISSIONED: 0,
    };
    for (const b of batteryRows || []) {
      const st = String(b.status || 'MANUFACTURED');
      lifecycleDist[st] = (lifecycleDist[st] || 0) + 1;
    }

    // 2. Health summary from actual recorded measurements in battery_metrics
    const { data: metricRows } = await db
      .from('battery_metrics')
      .select('state_of_health_pct, recorded_at');

    let totalSoh = 0;
    let minSoh = 100;
    let maxSoh = 0;
    const totalPoints = (metricRows || []).length;

    for (const m of metricRows || []) {
      const val = Number(m.state_of_health_pct);
      totalSoh += val;
      if (val < minSoh) minSoh = val;
      if (val > maxSoh) maxSoh = val;
    }
    const avgSoh = totalPoints > 0 ? Number((totalSoh / totalPoints).toFixed(1)) : 0;

    // 3. Custody transfers summary
    const { data: transferRows } = await db
      .from('custody_transfers')
      .select('*')
      .order('initiated_at', { ascending: false });

    const transfersByState: Record<string, number> = {
      ACCEPTED: 0,
      PENDING: 0,
      REJECTED: 0,
      CANCELLED: 0,
    };
    for (const t of transferRows || []) {
      const st = String(t.state || 'PENDING');
      transfersByState[st] = (transfersByState[st] || 0) + 1;
    }

    // 4. Verification results
    const { data: verifRows } = await db
      .from('verification_results')
      .select('*')
      .order('verified_at', { ascending: false });

    let matchedCount = 0;
    let mismatchFraudCount = 0;
    let verificationRequiredCount = 0;

    for (const v of verifRows || []) {
      const matchStatus = v.metadata?.match_status;
      if (v.is_authentic || matchStatus === 'MATCHED') {
        matchedCount++;
      } else if (matchStatus === 'MISMATCH_FRAUD' || matchStatus === 'UNREGISTERED_SERIAL' || !v.is_authentic) {
        mismatchFraudCount++;
      } else {
        verificationRequiredCount++;
      }
    }

    // 5. QpiAI execution records
    const { data: qpiaiRows } = await db
      .from('qpiai_execution_records')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20);

    let cloudCount = 0;
    let localCount = 0;
    const recentExecs: QpiAIExecutionAnalyticsItem[] = [];

    for (const q of qpiaiRows || []) {
      const isCloud = q.results?.is_cloud_result === true || q.backend === 'qpi_ai_cloud';
      if (isCloud) cloudCount++;
      else localCount++;

      recentExecs.push({
        id: q.id,
        engine_type: q.engine_type,
        battery_id: q.battery_id,
        status: q.status,
        backend: q.backend,
        is_cloud_result: isCloud,
        execution_time_seconds: q.execution_time_seconds ? Number(q.execution_time_seconds) : null,
        created_at: toIsoUtc(q.created_at),
        parameters: q.parameters || {},
        results: q.results || {},
        error_message: q.error_message || null,
      });
    }

    return {
      total_passports: (batteryRows || []).length,
      lifecycle_distribution: lifecycleDist,
      health_summary: {
        avg_soh_pct: avgSoh,
        min_soh_pct: totalPoints > 0 ? minSoh : 0,
        max_soh_pct: totalPoints > 0 ? maxSoh : 0,
        total_metrics_recorded: totalPoints,
      },
      custody_transfers_summary: {
        total: (transferRows || []).length,
        by_state: transfersByState,
        recent_transfers: (transferRows || []).slice(0, 10).map((t) => ({
          id: t.id,
          battery_id: t.battery_id,
          sender_org_name: 'Authorized Sender',
          receiver_org_name: 'Authorized Recipient',
          state: t.state,
          transfer_type: t.transfer_type,
          initiated_at: toIsoUtc(t.initiated_at),
        })),
      },
      anti_fraud_summary: {
        total_checks: (verifRows || []).length,
        matched_count: matchedCount,
        mismatch_fraud_count: mismatchFraudCount,
        verification_required_count: verificationRequiredCount,
        tamper_reports_count: 0,
        suspicious_scans_detected: 0,
        recent_checks: (verifRows || []).slice(0, 10).map((v) => ({
          id: v.id,
          battery_id: v.battery_id,
          status: v.metadata?.match_status || (v.is_authentic ? 'MATCHED' : 'MISMATCH_FRAUD'),
          is_authentic: v.is_authentic,
          verified_at: toIsoUtc(v.verified_at),
          verifier_role: v.verifier_role || 'PUBLIC',
        })),
      },
      qpiai_summary: {
        total_executions: (qpiaiRows || []).length,
        cloud_executions_count: cloudCount,
        local_simulation_count: localCount,
        recent_executions: recentExecs,
      },
    };
  }

  async getVerificationAnalytics(
    startDate?: string,
    endDate?: string,
    actor?: AuthenticatedActor | null
  ): Promise<any> {
    if (!this.isConfigured()) {
      return batteryRepository.getVerificationAnalytics(startDate, endDate, actor ? actorToProfile(actor) : null);
    }
    const db = this.getAdminClient();
    let query = db.from('verification_results').select('*');
    if (startDate) query = query.gte('verified_at', startDate);
    if (endDate) query = query.lte('verified_at', endDate);
    const { data } = await query.order('verified_at', { ascending: true });
    return data || [];
  }

  async getQpiAIExecutionsAnalytics(actor?: AuthenticatedActor | null): Promise<QpiAIExecutionAnalyticsItem[]> {
    if (!this.isConfigured()) {
      return batteryRepository.getQpiAIExecutionsAnalytics(actor ? actorToProfile(actor) : null);
    }
    const db = this.getAdminClient();
    const { data } = await db
      .from('qpiai_execution_records')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);

    return (data || []).map((q) => ({
      id: q.id,
      engine_type: q.engine_type,
      battery_id: q.battery_id,
      status: q.status,
      backend: q.backend,
      is_cloud_result: q.results?.is_cloud_result === true || q.backend === 'qpi_ai_cloud',
      execution_time_seconds: q.execution_time_seconds ? Number(q.execution_time_seconds) : null,
      created_at: toIsoUtc(q.created_at),
      parameters: q.parameters || {},
      results: q.results || {},
      error_message: q.error_message || null,
    }));
  }
}

export const supabaseBackendRepo = new SupabaseBackendRepository();
