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
  UserRole,
} from '../types/index.ts';
import {
  GENESIS_PREV_HASH,
  calculateEventHash,
  generateImmutableBatteryId,
  verifyChainIntegrity,
} from '../services/hasher.ts';
import type { AuthenticatedActor } from './auth.ts';
import {
  ROLE_DEFAULT_ORGS,
  ROLE_PROFILE_UUIDS,
  normalizeUserRole,
  roleToDbProfileRole,
} from './auth.ts';

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
    const candidates = [
      process.env.SUPABASE_SECRET_KEY,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      process.env.SUPABASE_KEY,
    ];
    for (const raw of candidates) {
      const val = (raw || '').trim();
      if (
        val &&
        !val.startsWith('sb_publishable_') &&
        !val.includes('your_public_key') &&
        !val.includes('your_server_only')
      ) {
        return val;
      }
    }
    return '';
  }

  private getAdminClient(): SupabaseClient {
    if (this.client) return this.client;

    const url = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').trim();
    const secretKey = this.resolveServerSecretKey();

    if (!url || !secretKey || url.includes('your-project')) {
      throw new DomainError(
        'Supabase server credentials (SUPABASE_URL and SUPABASE_SECRET_KEY) are not configured.',
        503
      );
    }

    this.supabaseUrl = url;
    this.client = createClient(url, secretKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
    return this.client;
  }

  isConfigured(): boolean {
    const forceMemory = String(process.env.FORCE_MEMORY_DB || 'false').toLowerCase() === 'true';
    if (forceMemory) return false;
    const url = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').trim();
    const key = this.resolveServerSecretKey();
    return Boolean(url && key && url.startsWith('http') && !url.includes('your-project'));
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
      return {
        id: existingProfile.id,
        email: existingProfile.email,
        full_name: existingProfile.full_name,
        role,
        organization_id: existingProfile.organization_id || ROLE_DEFAULT_ORGS[role].id,
        organization_name: org?.name || ROLE_DEFAULT_ORGS[role].name,
        auth_source: rawToken ? 'supabase_auth' : 'supabase_jwks',
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

  async listPassports(statusFilter?: string): Promise<PassportSummary[]> {
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

    const rows = data || [];
    const orgMap = await this.getOrganizationsMap();
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
    const row = await this.findRawBatteryRow(idOrDid);
    if (!row) {
      throw new DomainError(`Battery passport '${idOrDid}' not found.`, 404);
    }
    const orgMap = await this.getOrganizationsMap();
    const metricsMap = await this.getLatestMetricsByBatteryUuids([row.id]);
    return this.mapBatteryRow(row, orgMap, metricsMap.get(row.id));
  }

  async createPassport(payload: any, actor: AuthenticatedActor): Promise<BatteryPassport> {
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

  async listTransfers(): Promise<CustodyTransfer[]> {
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

    return (transfers || []).map((t: any) => ({
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
    const passport = await this.getPassport(idOrDid);
    const audit = await this.verifyAuditTrail(passport.battery_id);

    // Strictly whitelist public EU 2023/1542 fields — redact VIN, raw telemetry, and internal notes
    return {
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
      total_custody_events: audit.total_events,
      is_audit_chain_valid: audit.is_valid,
      verification_timestamp: new Date().toISOString(),
    };
  }

  async getDispositionDecision(idOrDid: string): Promise<DispositionDecision> {
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
}

export const supabaseBackendRepo = new SupabaseBackendRepository();
