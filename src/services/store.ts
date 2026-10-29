import {
  BatteryPassport,
  PassportSummary,
  CustodyEvent,
  CustodyTransfer,
  DispositionDecision,
  AuditVerification,
  PublicVerification,
  Organization
} from '../types';
import {
  GENESIS_PREV_HASH,
  calculateEventHash,
  generateImmutableBatteryId,
  verifyChainIntegrity,
} from './hasher';
import { safeStorage } from './safeStorage';

const STORAGE_KEY_PASSPORTS = 'bp360_passports_v2';
const STORAGE_KEY_CUSTODY = 'bp360_custody_events_v2';
const STORAGE_KEY_TRANSFERS = 'bp360_custody_transfers_v2';
const STORAGE_KEY_DECISIONS = 'bp360_decisions_v2';

export class BatteryRepository {
  private passports: Map<string, BatteryPassport> = new Map();
  private custodyEvents: Map<string, CustodyEvent[]> = new Map();
  private custodyTransfers: Map<string, CustodyTransfer> = new Map();
  private dispositionDecisions: Map<string, DispositionDecision> = new Map();
  private organizations: Map<string, Organization> = new Map();

  constructor() {
    this.init();
  }

  private init() {
    this.seedOrganizations();

    const savedPassports = safeStorage.getItem(STORAGE_KEY_PASSPORTS);
    const savedCustody = safeStorage.getItem(STORAGE_KEY_CUSTODY);
    const savedTransfers = safeStorage.getItem(STORAGE_KEY_TRANSFERS);
    const savedDecisions = safeStorage.getItem(STORAGE_KEY_DECISIONS);

    if (savedPassports && savedCustody) {
      try {
        const parsedPassports: Record<string, BatteryPassport> = JSON.parse(savedPassports);
        const parsedCustody: Record<string, CustodyEvent[]> = JSON.parse(savedCustody);

        for (const [id, p] of Object.entries(parsedPassports)) {
          this.passports.set(id, p);
        }
        for (const [id, evts] of Object.entries(parsedCustody)) {
          this.custodyEvents.set(id, evts);
        }
        if (savedTransfers) {
          const parsedTransfers: Record<string, CustodyTransfer> = JSON.parse(savedTransfers);
          for (const [id, t] of Object.entries(parsedTransfers)) {
            this.custodyTransfers.set(id, t);
          }
        }
        if (savedDecisions) {
          const parsedDecisions: Record<string, DispositionDecision> = JSON.parse(savedDecisions);
          for (const [id, d] of Object.entries(parsedDecisions)) {
            this.dispositionDecisions.set(id, d);
          }
        }
        return;
      } catch (e) {
        console.warn('Failed to parse cached records, restoring seed data', e);
      }
    }

    this.seedInitialData();
  }

  private persist() {
    try {
      const pObj: Record<string, BatteryPassport> = {};
      for (const [k, v] of this.passports.entries()) pObj[k] = v;
      const cObj: Record<string, CustodyEvent[]> = {};
      for (const [k, v] of this.custodyEvents.entries()) cObj[k] = v;
      const tObj: Record<string, CustodyTransfer> = {};
      for (const [k, v] of this.custodyTransfers.entries()) tObj[k] = v;
      const dObj: Record<string, DispositionDecision> = {};
      for (const [k, v] of this.dispositionDecisions.entries()) dObj[k] = v;

      safeStorage.setItem(STORAGE_KEY_PASSPORTS, JSON.stringify(pObj));
      safeStorage.setItem(STORAGE_KEY_CUSTODY, JSON.stringify(cObj));
      safeStorage.setItem(STORAGE_KEY_TRANSFERS, JSON.stringify(tObj));
      safeStorage.setItem(STORAGE_KEY_DECISIONS, JSON.stringify(dObj));
    } catch (e) {
      console.warn('Persistence update warning', e);
    }
  }

  private seedOrganizations() {
    const orgs: Organization[] = [
      {
        id: '11111111-1111-1111-1111-111111111111',
        name: 'QuantumVolt Gigafactory',
        org_type: 'MANUFACTURER',
        registration_number: 'HRB-BER-2024-991',
        country: 'DE',
        facility_location: 'Berlin-Brandenburg Gigafactory',
        contact_email: 'compliance@quantumvolt.de',
        is_verified: true,
        created_at: '2024-01-01T00:00:00Z',
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
        created_at: '2023-01-01T00:00:00Z',
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
        created_at: '2024-02-01T00:00:00Z',
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
        created_at: '2022-01-01T00:00:00Z',
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
        created_at: '2023-01-01T00:00:00Z',
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
        created_at: '2021-01-01T00:00:00Z',
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
        created_at: '2023-01-01T00:00:00Z',
      },
    ];

    for (const org of orgs) {
      this.organizations.set(org.id, org);
      this.organizations.set(org.name.toLowerCase(), org);
    }
  }

  private seedInitialData() {
    // 1. NMC 811 Battery (In Service)
    const { did: did1 } = generateImmutableBatteryId(
      'QuantumVolt Gigafactory',
      'QV-2024-NMC-98124',
      'NMC 811',
      '2024-01-15T09:00:00Z'
    );
    const p1: BatteryPassport = {
      battery_did: did1,
      battery_id: 'BAT-NMC-8A2F91C0',
      serial_number: 'QV-2024-NMC-98124',
      manufacturer_name: 'QuantumVolt Gigafactory',
      model_designation: 'QV-HighEnergy-90X',
      chemistry: 'NMC 811',
      manufacturing_date: '2024-01-15T09:00:00Z',
      manufacturing_country: 'DE',
      manufacturing_facility: 'Berlin-Brandenburg Gigafactory',
      status: 'IN_SERVICE',
      current_custodian: 'Apex EV Mobility Fleet',
      current_vehicle_vin: 'WAUZZZF28NA091244',
      technical_specs: {
        rated_capacity_kwh: 92.4,
        nominal_voltage_v: 400.0,
        max_charge_power_kw: 250.0,
        cell_count: 192,
        pack_weight_kg: 485.0,
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
      health_state: {
        state_of_health_pct: 88.4,
        state_of_charge_pct: 72.0,
        cycle_count: 420,
        internal_resistance_mohm: 19.8,
        capacity_fade_rate_pct_yr: 1.9,
        last_telemetry_timestamp: '2026-10-25T14:30:00Z',
      },
      qr_code_url: '/api/v1/verify/BAT-NMC-8A2F91C0',
      created_at: '2024-01-15T09:00:00Z',
      updated_at: '2026-10-25T14:30:00Z',
    };
    this.passports.set(p1.battery_id, p1);

    const ev1_0_payload = { batch_id: 'BATCH-2024-Q1-90', quality_grade: 'A+', initial_soh: 100.0 };
    const ev1_0_hash = calculateEventHash(
      GENESIS_PREV_HASH,
      p1.battery_id,
      'MANUFACTURED',
      '2024-01-15T09:00:00Z',
      'ACTOR-MFG-001',
      ev1_0_payload
    );
    const ev1_0: CustodyEvent = {
      event_id: 'EVT-001-GENESIS',
      battery_id: p1.battery_id,
      event_type: 'MANUFACTURED',
      timestamp: '2024-01-15T09:00:00Z',
      actor_id: 'ACTOR-MFG-001',
      actor_role: 'MANUFACTURER',
      actor_organization: 'QuantumVolt Gigafactory',
      location: 'Berlin, Germany',
      payload: ev1_0_payload,
      prev_hash: GENESIS_PREV_HASH,
      hash: ev1_0_hash,
    };

    const ev1_1_payload = { vehicle_vin: 'WAUZZZF28NA091244', model: 'Apex GT Sedan', inverter_kw: 250 };
    const ev1_1_hash = calculateEventHash(
      ev1_0_hash,
      p1.battery_id,
      'OEM_ASSEMBLED',
      '2024-02-10T11:20:00Z',
      'ACTOR-OEM-042',
      ev1_1_payload
    );
    const ev1_1: CustodyEvent = {
      event_id: 'EVT-001-OEM',
      battery_id: p1.battery_id,
      event_type: 'OEM_ASSEMBLED',
      timestamp: '2024-02-10T11:20:00Z',
      actor_id: 'ACTOR-OEM-042',
      actor_role: 'OEM',
      actor_organization: 'Apex Motors AG',
      location: 'Stuttgart, Germany',
      payload: ev1_1_payload,
      prev_hash: ev1_0_hash,
      hash: ev1_1_hash,
    };

    const ev1_2_payload = { fleet_id: 'FLEET-BER-88', current_soh: 88.4, odometer_km: 68500 };
    const ev1_2_hash = calculateEventHash(
      ev1_1_hash,
      p1.battery_id,
      'TELEMETRY_UPDATED',
      '2026-10-25T14:30:00Z',
      'ACTOR-FLEET-109',
      ev1_2_payload
    );
    const ev1_2: CustodyEvent = {
      event_id: 'EVT-001-TELEMETRY',
      battery_id: p1.battery_id,
      event_type: 'TELEMETRY_UPDATED',
      timestamp: '2026-10-25T14:30:00Z',
      actor_id: 'ACTOR-FLEET-109',
      actor_role: 'FLEET_OPERATOR',
      actor_organization: 'Apex EV Mobility Fleet',
      location: 'Berlin, Germany',
      payload: ev1_2_payload,
      prev_hash: ev1_1_hash,
      hash: ev1_2_hash,
    };
    this.custodyEvents.set(p1.battery_id, [ev1_0, ev1_1, ev1_2]);

    // 2. LFP Battery (Second Life)
    const { did: did2 } = generateImmutableBatteryId(
      'Nordic Battery Systems',
      'NBS-2023-LFP-44109',
      'LFP',
      '2023-05-10T10:00:00Z'
    );
    const p2: BatteryPassport = {
      battery_did: did2,
      battery_id: 'BAT-LFP-3C7D410E',
      serial_number: 'NBS-2023-LFP-44109',
      manufacturer_name: 'Nordic Battery Systems',
      model_designation: 'NBS-SafeCell-60',
      chemistry: 'LFP',
      manufacturing_date: '2023-05-10T10:00:00Z',
      manufacturing_country: 'SE',
      manufacturing_facility: 'Skelleftea Gigafactory',
      status: 'SECOND_LIFE',
      current_custodian: 'GridStore Second-Life Energy Storage',
      current_vehicle_vin: null,
      technical_specs: {
        rated_capacity_kwh: 64.0,
        nominal_voltage_v: 320.0,
        max_charge_power_kw: 150.0,
        cell_count: 100,
        pack_weight_kg: 420.0,
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
      health_state: {
        state_of_health_pct: 76.8,
        state_of_charge_pct: 55.0,
        cycle_count: 1850,
        internal_resistance_mohm: 26.4,
        capacity_fade_rate_pct_yr: 2.1,
        last_telemetry_timestamp: '2026-10-20T12:00:00Z',
      },
      qr_code_url: '/api/v1/verify/BAT-LFP-3C7D410E',
      created_at: '2023-05-10T10:00:00Z',
      updated_at: '2026-10-20T12:00:00Z',
    };
    this.passports.set(p2.battery_id, p2);

    const ev2_0_hash = calculateEventHash(
      GENESIS_PREV_HASH,
      p2.battery_id,
      'MANUFACTURED',
      '2023-05-10T10:00:00Z',
      'ACTOR-MFG-002',
      { batch_id: 'NBS-LFP-Q2' }
    );
    const ev2_0: CustodyEvent = {
      event_id: 'EVT-002-GENESIS',
      battery_id: p2.battery_id,
      event_type: 'MANUFACTURED',
      timestamp: '2023-05-10T10:00:00Z',
      actor_id: 'ACTOR-MFG-002',
      actor_role: 'MANUFACTURER',
      actor_organization: 'Nordic Battery Systems',
      location: 'Skelleftea, Sweden',
      payload: { batch_id: 'NBS-LFP-Q2' },
      prev_hash: GENESIS_PREV_HASH,
      hash: ev2_0_hash,
    };

    const ev2_1_payload = { repurposing_application: 'Stationary Solar BESS', tested_soh: 76.8 };
    const ev2_1_hash = calculateEventHash(
      ev2_0_hash,
      p2.battery_id,
      'SECOND_LIFE_ASSIGNED',
      '2026-10-20T12:00:00Z',
      'ACTOR-RECYCLER-009',
      ev2_1_payload
    );
    const ev2_1: CustodyEvent = {
      event_id: 'EVT-002-SECOND-LIFE',
      battery_id: p2.battery_id,
      event_type: 'SECOND_LIFE_ASSIGNED',
      timestamp: '2026-10-20T12:00:00Z',
      actor_id: 'ACTOR-RECYCLER-009',
      actor_role: 'RECYCLER',
      actor_organization: 'GridStore Second-Life Energy Storage',
      location: 'Stockholm, Sweden',
      payload: ev2_1_payload,
      prev_hash: ev2_0_hash,
      hash: ev2_1_hash,
    };
    this.custodyEvents.set(p2.battery_id, [ev2_0, ev2_1]);

    // 3. NCA Battery (End of Life)
    const { did: did3 } = generateImmutableBatteryId(
      'Rhine Energy Cells',
      'REC-2021-NCA-10042',
      'NCA',
      '2021-08-20T08:00:00Z'
    );
    const p3: BatteryPassport = {
      battery_did: did3,
      battery_id: 'BAT-NCA-F104A7B2',
      serial_number: 'REC-2021-NCA-10042',
      manufacturer_name: 'Rhine Energy Cells',
      model_designation: 'REC-EVMax-85',
      chemistry: 'NCA',
      manufacturing_date: '2021-08-20T08:00:00Z',
      manufacturing_country: 'FR',
      manufacturing_facility: 'Dunkirk Gigafactory',
      status: 'END_OF_LIFE',
      current_custodian: 'EcoRecycle Metals Recovery',
      current_vehicle_vin: null,
      technical_specs: {
        rated_capacity_kwh: 85.0,
        nominal_voltage_v: 380.0,
        max_charge_power_kw: 200.0,
        cell_count: 180,
        pack_weight_kg: 460.0,
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
      health_state: {
        state_of_health_pct: 64.2,
        state_of_charge_pct: 20.0,
        cycle_count: 2480,
        internal_resistance_mohm: 34.0,
        capacity_fade_rate_pct_yr: 3.2,
        last_telemetry_timestamp: '2026-10-18T16:00:00Z',
      },
      qr_code_url: '/api/v1/verify/BAT-NCA-F104A7B2',
      created_at: '2021-08-20T08:00:00Z',
      updated_at: '2026-10-18T16:00:00Z',
    };
    this.passports.set(p3.battery_id, p3);

    const ev3_0_hash = calculateEventHash(
      GENESIS_PREV_HASH,
      p3.battery_id,
      'MANUFACTURED',
      '2021-08-20T08:00:00Z',
      'ACTOR-MFG-003',
      { batch_id: 'REC-NCA-2021' }
    );
    const ev3_0: CustodyEvent = {
      event_id: 'EVT-003-GENESIS',
      battery_id: p3.battery_id,
      event_type: 'MANUFACTURED',
      timestamp: '2021-08-20T08:00:00Z',
      actor_id: 'ACTOR-MFG-003',
      actor_role: 'MANUFACTURER',
      actor_organization: 'Rhine Energy Cells',
      location: 'Dunkirk, France',
      payload: { batch_id: 'REC-NCA-2021' },
      prev_hash: GENESIS_PREV_HASH,
      hash: ev3_0_hash,
    };
    this.custodyEvents.set(p3.battery_id, [ev3_0]);

    // Initial Custody Transfers
    const t1: CustodyTransfer = {
      id: 'c1111111-cccc-cccc-cccc-cccccccccccc',
      battery_id: 'BAT-NMC-8A2F91C0',
      sender_org_id: '11111111-1111-1111-1111-111111111111',
      sender_org_name: 'QuantumVolt Gigafactory',
      receiver_org_id: '22222222-2222-2222-2222-222222222222',
      receiver_org_name: 'Apex Motors AG',
      state: 'ACCEPTED',
      transfer_type: 'OEM_DELIVERY',
      notes: 'Initial gigafactory batch delivery for vehicle assembly',
      initiated_at: '2024-01-20T10:00:00Z',
      responded_at: '2024-01-22T14:00:00Z',
    };
    const t2: CustodyTransfer = {
      id: 'c2222222-cccc-cccc-cccc-cccccccccccc',
      battery_id: 'BAT-LFP-3C7D410E',
      sender_org_id: '33333333-3333-3333-3333-333333333333',
      sender_org_name: 'Apex EV Mobility Fleet',
      receiver_org_id: '55555555-5555-5555-5555-555555555555',
      receiver_org_name: 'Nordic Remanufacturing Hub',
      state: 'PENDING',
      transfer_type: 'SECOND_LIFE_EVALUATION',
      notes: 'Handoff to repurposing hub for stationary solar storage integration',
      initiated_at: '2026-10-26T09:00:00Z',
      responded_at: null,
    };
    this.custodyTransfers.set(t1.id, t1);
    this.custodyTransfers.set(t2.id, t2);

    // Initial Disposition Decision
    const d1: DispositionDecision = {
      id: 'd1111111-dddd-dddd-dddd-dddddddddddd',
      battery_id: 'BAT-LFP-3C7D410E',
      recommendation: 'STATIONARY_BESS',
      recommended_pathway: 'Second-Life Grid Peak Shaving Container',
      constraints: { min_soh: 70.0, max_temp_c: 45.0, max_c_rate: 0.5 },
      explanation: 'Degradation profile and remaining capacity (76.8% SoH, 1850 cycles) are optimal for stationary containerized grid energy storage.',
      approval_status: 'APPROVED',
      decided_by: 'AUTOMATED_METROLOGY_ENGINE',
      decided_at: '2026-10-20T12:00:00Z',
    };
    this.dispositionDecisions.set(d1.battery_id, d1);

    this.persist();
  }

  async listPassports(statusFilter?: string): Promise<PassportSummary[]> {
    const list = Array.from(this.passports.values());
    const filtered = statusFilter && statusFilter !== 'ALL'
      ? list.filter(p => p.status === statusFilter)
      : list;

    return filtered.map(p => ({
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
  }

  async getPassport(id: string): Promise<BatteryPassport | null> {
    const found = this.passports.get(id);
    if (found) return found;

    for (const p of this.passports.values()) {
      if (p.battery_did === id || p.serial_number === id) return p;
    }
    return null;
  }

  async createPassport(
    payload: any,
    actor?: { role: string; organization: string }
  ): Promise<BatteryPassport> {
    if (actor) {
      const roleUpper = actor.role.toUpperCase();
      if (roleUpper !== 'MANUFACTURER' && roleUpper !== 'ADMINISTRATOR') {
        throw new Error(`Access denied: Role '${actor.role}' cannot register new battery passports.`);
      }
      if (
        roleUpper !== 'ADMINISTRATOR' &&
        actor.organization &&
        actor.organization.trim().toLowerCase() !== payload.manufacturer_name.trim().toLowerCase()
      ) {
        throw new Error(
          `Organization isolation violation: User belonging to '${actor.organization}' cannot mint battery under '${payload.manufacturer_name}'.`
        );
      }
    }

    const now = new Date().toISOString();
    const { did, shortId } = generateImmutableBatteryId(
      payload.manufacturer_name,
      payload.serial_number,
      payload.chemistry,
      payload.manufacturing_date || now
    );

    const passport: BatteryPassport = {
      battery_did: did,
      battery_id: shortId,
      serial_number: payload.serial_number,
      manufacturer_name: payload.manufacturer_name,
      model_designation: payload.model_designation,
      chemistry: payload.chemistry,
      manufacturing_date: payload.manufacturing_date || now,
      manufacturing_country: payload.manufacturing_country || 'DE',
      manufacturing_facility: payload.manufacturing_facility || 'Primary Facility',
      status: 'MANUFACTURED',
      current_custodian: payload.current_custodian || payload.manufacturer_name,
      current_vehicle_vin: null,
      technical_specs: {
        rated_capacity_kwh: payload.technical_specs?.rated_capacity_kwh ?? 80.0,
        nominal_voltage_v: payload.technical_specs?.nominal_voltage_v ?? 400.0,
        max_charge_power_kw: payload.technical_specs?.max_charge_power_kw ?? 200.0,
        cell_count: payload.technical_specs?.cell_count ?? 192,
        pack_weight_kg: payload.technical_specs?.pack_weight_kg ?? 450.0,
      },
      carbon_footprint: {
        total_co2_kg_per_kwh: payload.carbon_footprint?.total_co2_kg_per_kwh ?? 55.0,
        manufacturing_co2_kg: payload.carbon_footprint?.manufacturing_co2_kg ?? 25.0,
        raw_materials_co2_kg: payload.carbon_footprint?.raw_materials_co2_kg ?? 25.0,
        transport_co2_kg: payload.carbon_footprint?.transport_co2_kg ?? 5.0,
        eu_compliance_class: payload.carbon_footprint?.eu_compliance_class || 'Class A',
      },
      recycled_content: {
        cobalt_percentage: payload.recycled_content?.cobalt_percentage ?? 15.0,
        lithium_percentage: payload.recycled_content?.lithium_percentage ?? 5.0,
        nickel_percentage: payload.recycled_content?.nickel_percentage ?? 10.0,
        lead_percentage: payload.recycled_content?.lead_percentage ?? 0.0,
      },
      health_state: {
        state_of_health_pct: 100.0,
        state_of_charge_pct: 100.0,
        cycle_count: 0,
        internal_resistance_mohm: 18.0,
        capacity_fade_rate_pct_yr: 1.5,
        last_telemetry_timestamp: now,
      },
      qr_code_url: `/verify/${shortId}`,
      created_at: now,
      updated_at: now,
    };

    this.passports.set(shortId, passport);

    const genesisPayload = {
      batch_id: `BATCH-${new Date().getFullYear()}-01`,
      quality_grade: 'A+',
      initial_soh: 100.0,
    };
    const genesisHash = calculateEventHash(
      GENESIS_PREV_HASH,
      shortId,
      'MANUFACTURED',
      now,
      'ACTOR-MFG-GENESIS',
      genesisPayload
    );

    const genesisEvent: CustodyEvent = {
      event_id: `EVT-${shortId}-GENESIS`,
      battery_id: shortId,
      event_type: 'MANUFACTURED',
      timestamp: now,
      actor_id: 'ACTOR-MFG-GENESIS',
      actor_role: 'MANUFACTURER',
      actor_organization: passport.manufacturer_name,
      location: `${passport.manufacturing_facility}, ${passport.manufacturing_country}`,
      payload: genesisPayload,
      prev_hash: GENESIS_PREV_HASH,
      hash: genesisHash,
    };

    this.custodyEvents.set(shortId, [genesisEvent]);
    this.persist();
    return passport;
  }

  async updateTelemetry(
    batteryId: string,
    telemetry: any,
    actor?: { role: string; organization: string } | string
  ): Promise<BatteryPassport> {
    const passport = await this.getPassport(batteryId);
    if (!passport) {
      throw new Error(`Battery passport ${batteryId} not found`);
    }

    const actorOrg = typeof actor === 'string' ? actor : actor?.organization;
    if (actor && typeof actor === 'object') {
      const roleUpper = actor.role.toUpperCase();
      const allowedRoles = ['FLEET_OPERATOR', 'SERVICE_CENTER', 'OEM', 'MANUFACTURER', 'ADMINISTRATOR'];
      if (!allowedRoles.includes(roleUpper)) {
        throw new Error(`Access denied: Role '${actor.role}' cannot log BMS telemetry.`);
      }
      if (
        roleUpper !== 'ADMINISTRATOR' &&
        actor.organization &&
        actor.organization.trim().toLowerCase() !== passport.current_custodian.trim().toLowerCase()
      ) {
        throw new Error(
          `Access denied: Battery is under stewardship of '${passport.current_custodian}'. Organization '${actor.organization}' cannot record telemetry.`
        );
      }
    }

    const now = new Date().toISOString();
    passport.health_state.state_of_health_pct = telemetry.state_of_health_pct ?? passport.health_state.state_of_health_pct;
    passport.health_state.state_of_charge_pct = telemetry.state_of_charge_pct ?? passport.health_state.state_of_charge_pct;
    passport.health_state.cycle_count = telemetry.cycle_count ?? passport.health_state.cycle_count;
    passport.health_state.internal_resistance_mohm = telemetry.internal_resistance_mohm ?? passport.health_state.internal_resistance_mohm;
    passport.health_state.last_telemetry_timestamp = now;
    passport.updated_at = now;

    if (passport.health_state.state_of_health_pct < 70.0 && passport.status === 'IN_SERVICE') {
      passport.status = 'END_OF_LIFE';
    } else if (passport.health_state.state_of_health_pct < 80.0 && passport.status === 'IN_SERVICE') {
      passport.status = 'SECOND_LIFE';
    }

    const chain = this.custodyEvents.get(passport.battery_id) || [];
    const prevHash = chain.length > 0 ? chain[chain.length - 1].hash : GENESIS_PREV_HASH;
    const eventPayload = {
      soh: passport.health_state.state_of_health_pct,
      soc: passport.health_state.state_of_charge_pct,
      cycles: passport.health_state.cycle_count,
      internal_resistance: passport.health_state.internal_resistance_mohm,
      notes: telemetry.telemetry_notes || 'Periodic BMS telematics diagnostic',
    };

    const eventHash = calculateEventHash(
      prevHash,
      passport.battery_id,
      'TELEMETRY_UPDATED',
      now,
      'ACTOR-BMS-TELEMETRY',
      eventPayload
    );

    const event: CustodyEvent = {
      event_id: `EVT-TELEMETRY-${Date.now()}`,
      battery_id: passport.battery_id,
      event_type: 'TELEMETRY_UPDATED',
      timestamp: now,
      actor_id: 'ACTOR-BMS-TELEMETRY',
      actor_role: 'FLEET_OPERATOR',
      actor_organization: actorOrg || passport.current_custodian,
      location: 'Telematics Gateway',
      payload: eventPayload,
      prev_hash: prevHash,
      hash: eventHash,
    };

    chain.push(event);
    this.custodyEvents.set(passport.battery_id, chain);
    this.persist();

    return passport;
  }

  async getCustodyEvents(batteryId: string): Promise<CustodyEvent[]> {
    return this.custodyEvents.get(batteryId) || [];
  }

  async appendCustodyEvent(batteryId: string, event: Partial<CustodyEvent>): Promise<CustodyEvent> {
    const chain = this.custodyEvents.get(batteryId) || [];
    const prevHash = chain.length > 0 ? chain[chain.length - 1].hash : GENESIS_PREV_HASH;
    const now = new Date().toISOString();

    const verifiedHash = calculateEventHash(
      prevHash,
      batteryId,
      event.event_type || 'CUSTODY_EVENT',
      event.timestamp || now,
      event.actor_id || 'ACTOR-UNKNOWN',
      event.payload || {}
    );

    const newEvent: CustodyEvent = {
      event_id: event.event_id || `EVT-${Date.now()}`,
      battery_id: batteryId,
      event_type: event.event_type || 'CUSTODY_EVENT',
      timestamp: event.timestamp || now,
      actor_id: event.actor_id || 'ACTOR-UNKNOWN',
      actor_role: event.actor_role || 'FLEET_OPERATOR',
      actor_organization: event.actor_organization || 'Unknown Custodian',
      location: event.location || 'Unknown Location',
      payload: event.payload || {},
      prev_hash: prevHash,
      hash: verifiedHash,
    };

    chain.push(newEvent);
    this.custodyEvents.set(batteryId, chain);
    this.persist();
    return newEvent;
  }

  async listCustodyTransfers(): Promise<CustodyTransfer[]> {
    return Array.from(this.custodyTransfers.values()).sort(
      (a, b) => new Date(b.initiated_at).getTime() - new Date(a.initiated_at).getTime()
    );
  }

  async createCustodyTransfer(
    data: {
      battery_id: string;
      receiver_org_id: string;
      receiver_org_name: string;
      sender_org_id?: string;
      sender_org_name?: string;
      transfer_type: string;
      notes?: string;
    },
    actor?: { role: string; organization: string }
  ): Promise<CustodyTransfer> {
    const passport = await this.getPassport(data.battery_id);
    if (!passport) throw new Error(`Battery ${data.battery_id} not found.`);

    if (actor) {
      const roleUpper = actor.role.toUpperCase();
      if (
        roleUpper !== 'ADMINISTRATOR' &&
        actor.organization &&
        actor.organization.trim().toLowerCase() !== passport.current_custodian.trim().toLowerCase()
      ) {
        throw new Error(
          `Custody initiation denied: Only current custodian '${passport.current_custodian}' or Administrator can transfer custody of this battery.`
        );
      }
    }

    const now = new Date().toISOString();
    const id = `trans-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const transfer: CustodyTransfer = {
      id,
      battery_id: passport.battery_id,
      sender_org_id: data.sender_org_id || 'org-sender',
      sender_org_name: data.sender_org_name || passport.current_custodian,
      receiver_org_id: data.receiver_org_id,
      receiver_org_name: data.receiver_org_name,
      state: 'PENDING',
      transfer_type: data.transfer_type || 'FLEET_ASSIGNMENT',
      notes: data.notes || '',
      initiated_at: now,
      responded_at: null,
    };

    this.custodyTransfers.set(id, transfer);
    this.persist();
    return transfer;
  }

  async acceptCustodyTransfer(
    transferId: string,
    notes?: string,
    actor?: { role: string; organization: string }
  ): Promise<CustodyTransfer> {
    const transfer = this.custodyTransfers.get(transferId);
    if (!transfer) throw new Error(`Custody transfer ${transferId} not found.`);
    if (transfer.state !== 'PENDING') throw new Error(`Transfer is already in ${transfer.state} state.`);

    if (actor) {
      const roleUpper = actor.role.toUpperCase();
      const actorOrg = actor.organization.trim().toLowerCase();
      const receiverOrg = transfer.receiver_org_name.trim().toLowerCase();
      if (roleUpper !== 'ADMINISTRATOR' && actorOrg !== receiverOrg) {
        throw new Error(
          `Access denied: Only the designated receiver organization ('${transfer.receiver_org_name}') is authorized to accept this custody transfer.`
        );
      }
    }

    const now = new Date().toISOString();
    transfer.state = 'ACCEPTED';
    transfer.responded_at = now;
    if (notes) transfer.notes = (transfer.notes ? transfer.notes + ' | ' : '') + `Accepted: ${notes}`;

    const passport = await this.getPassport(transfer.battery_id);
    if (passport) {
      passport.current_custodian = transfer.receiver_org_name;
      passport.updated_at = now;

      // Append verified custody event block
      await this.appendCustodyEvent(transfer.battery_id, {
        event_type: 'TRANSFERRED_CUSTODY',
        actor_role: 'RECEIVER',
        actor_organization: transfer.receiver_org_name,
        location: 'Receiving Facility Gate',
        payload: {
          transfer_id: transferId,
          from: transfer.sender_org_name,
          to: transfer.receiver_org_name,
          notes: notes || 'Stewardship formally accepted',
        },
      });
    }

    this.persist();
    return transfer;
  }

  async rejectCustodyTransfer(
    transferId: string,
    reason: string,
    actor?: { role: string; organization: string }
  ): Promise<CustodyTransfer> {
    const transfer = this.custodyTransfers.get(transferId);
    if (!transfer) throw new Error(`Custody transfer ${transferId} not found.`);
    if (transfer.state !== 'PENDING') throw new Error(`Transfer is already in ${transfer.state} state.`);

    if (actor) {
      const roleUpper = actor.role.toUpperCase();
      const actorOrg = actor.organization.trim().toLowerCase();
      const receiverOrg = transfer.receiver_org_name.trim().toLowerCase();
      if (roleUpper !== 'ADMINISTRATOR' && actorOrg !== receiverOrg) {
        throw new Error(
          `Access denied: Only the designated receiver organization ('${transfer.receiver_org_name}') is authorized to reject this custody transfer.`
        );
      }
    }

    transfer.state = 'REJECTED';
    transfer.responded_at = new Date().toISOString();
    transfer.rejection_reason = reason || 'Declined by receiving party';
    this.persist();
    return transfer;
  }

  async listTransfers(): Promise<CustodyTransfer[]> {
    return this.listCustodyTransfers();
  }

  async createTransfer(
    data: {
      battery_id: string;
      receiver_org_id: string;
      receiver_org_name: string;
      sender_org_id?: string;
      sender_org_name?: string;
      transfer_type: string;
      notes?: string;
    },
    actor?: { role: string; organization: string }
  ): Promise<CustodyTransfer> {
    return this.createCustodyTransfer(data, actor);
  }

  async acceptTransfer(
    transferId: string,
    notes?: string,
    actor?: { role: string; organization: string }
  ): Promise<CustodyTransfer> {
    return this.acceptCustodyTransfer(transferId, notes, actor);
  }

  async rejectTransfer(
    transferId: string,
    reason: string,
    actor?: { role: string; organization: string }
  ): Promise<CustodyTransfer> {
    return this.rejectCustodyTransfer(transferId, reason, actor);
  }

  async getDispositionDecision(batteryId: string): Promise<DispositionDecision> {
    const passport = await this.getPassport(batteryId);
    if (!passport) throw new Error(`Battery ${batteryId} not found.`);

    const existing = this.dispositionDecisions.get(passport.battery_id);
    if (existing) return existing;

    const soh = passport.health_state.state_of_health_pct;
    const cycles = passport.health_state.cycle_count;
    const now = new Date().toISOString();

    let rec: DispositionDecision['recommendation'] = 'CONTINUE_IN_SERVICE';
    let pathway = 'Tier-1 Vehicle Fleet In-Service Operation';
    let constraints: Record<string, any> = { min_soh: 80.0, max_fade_rate_pct_yr: 2.5 };
    let explanation = `Battery health is strong (${soh}% SoH, ${cycles} cycles). Recommended to remain in primary EV automotive duty.`;
    let statusVal: DispositionDecision['approval_status'] = 'APPROVED';

    if (soh < 70.0 || cycles > 2200) {
      rec = 'DEEP_RECYCLING';
      pathway = 'Hydrometallurgical Critical Mineral Extraction';
      constraints = { target_recovery_cobalt_pct: 95.0, target_recovery_lithium_pct: 80.0, target_recovery_nickel_pct: 95.0 };
      explanation = `Automotive and second-life limits reached (${soh}% SoH, ${cycles} cycles). Required to enter closed-loop metal recovery.`;
      statusVal = 'PROPOSED';
    } else if (soh < 80.0) {
      rec = 'STATIONARY_BESS';
      pathway = 'Second-Life Containerized Grid Energy Storage';
      constraints = { min_soh: 70.0, max_temp_c: 45.0, max_c_rate: 0.5 };
      explanation = `Automotive retirement threshold reached (${soh}% SoH), but cell uniformity and capacity are optimal for stationary peak-shaving energy storage.`;
      statusVal = 'PROPOSED';
    }

    const decision: DispositionDecision = {
      id: `disp-${Date.now()}`,
      battery_id: passport.battery_id,
      recommendation: rec,
      recommended_pathway: pathway,
      recommended_action: rec,
      score: Math.min(100, Math.round(soh * 0.98)),
      is_second_life_suitable: soh >= 70.0 && cycles <= 2200,
      target_application: soh >= 80.0 ? 'Automotive Traction' : soh >= 70.0 ? 'Containerized Grid Energy Storage (BESS)' : 'Hydrometallurgical Smelting',
      estimated_remaining_useful_life_years: soh >= 80.0 ? 8 : soh >= 70.0 ? 5 : 0,
      recycling_efficiency_pct: 94.2,
      constraints,
      constraints_evaluated: constraints,
      explanation,
      approval_status: statusVal,
      decided_by: 'AUTOMATED_METROLOGY_ENGINE',
      decided_at: now,
    };

    this.dispositionDecisions.set(passport.battery_id, decision);
    this.persist();
    return decision;
  }

  async verifyAuditTrail(batteryId: string): Promise<AuditVerification> {
    const events = this.custodyEvents.get(batteryId) || [];
    const { isValid, errorMessage, tamperedIndex } = verifyChainIntegrity(events);

    return {
      battery_id: batteryId,
      total_events: events.length,
      is_valid: isValid,
      genesis_hash: events.length > 0 ? events[0].hash : null,
      latest_block_hash: events.length > 0 ? events[events.length - 1].hash : null,
      error_message: errorMessage,
      tampered_block_index: tamperedIndex,
      verified_at: new Date().toISOString(),
    };
  }

  async verifyPublic(batteryId: string): Promise<PublicVerification> {
    const passport = await this.getPassport(batteryId);
    if (!passport) {
      throw new Error(`Battery ID ${batteryId} not found in public registry`);
    }

    const events = this.custodyEvents.get(batteryId) || [];
    const { isValid } = verifyChainIntegrity(events);

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
      total_custody_events: events.length,
      is_audit_chain_valid: isValid,
      verification_timestamp: new Date().toISOString(),
    };
  }

  listOrganizations(): Organization[] {
    const seen = new Set<string>();
    const list: Organization[] = [];
    for (const org of this.organizations.values()) {
      if (!seen.has(org.id)) {
        seen.add(org.id);
        list.push(org);
      }
    }
    return list;
  }
}

export const batteryRepository = new BatteryRepository();
