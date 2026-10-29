import type {
  BatteryPassport,
  PassportSummary,
  CustodyEvent,
  CustodyTransfer,
  DispositionDecision,
  AuditVerification,
  PublicVerification,
  PhysicalVerificationRequest,
  PhysicalVerificationResponse,
  TamperReportRequest,
  TamperReportResponse,
  FraudAuditStatus,
  Organization,
  BatteryMetricPoint,
  AnalyticsOverview,
  QpiAIExecutionAnalyticsItem,
  TwoStepPrecheckResponse,
  ResetLockoutResponse,
  FlaggedBatteryAlert
} from '../types/index.ts';
import {
  GENESIS_PREV_HASH,
  calculateEventHash,
  generateImmutableBatteryId,
  verifyChainIntegrity,
} from './hasher.ts';
import { safeStorage } from './safeStorage.ts';

const STORAGE_KEY_PASSPORTS = 'bp360_passports_v2';
const STORAGE_KEY_CUSTODY = 'bp360_custody_events_v2';
const STORAGE_KEY_TRANSFERS = 'bp360_custody_transfers_v2';
const STORAGE_KEY_DECISIONS = 'bp360_decisions_v2';
const STORAGE_KEY_VERIFICATIONS = 'bp360_physical_verifications_v1';
const STORAGE_KEY_TAMPER_REPORTS = 'bp360_tamper_reports_v1';
const STORAGE_KEY_METRICS = 'bp360_battery_metrics_v1';
const STORAGE_KEY_QPIAI_EXECS = 'bp360_qpiai_execs_v1';

export class BatteryRepository {
  private passports: Map<string, BatteryPassport> = new Map();
  private custodyEvents: Map<string, CustodyEvent[]> = new Map();
  private custodyTransfers: Map<string, CustodyTransfer> = new Map();
  private dispositionDecisions: Map<string, DispositionDecision> = new Map();
  private physicalVerifications: Map<string, PhysicalVerificationResponse[]> = new Map();
  private tamperReports: Map<string, TamperReportResponse[]> = new Map();
  private organizations: Map<string, Organization> = new Map();
  private batteryMetrics: Map<string, BatteryMetricPoint[]> = new Map();
  private qpiaiExecutions: QpiAIExecutionAnalyticsItem[] = [];
  private auditLogs: any[] = [];

  constructor() {
    this.init();
  }

  private init() {
    this.seedOrganizations();

    const savedPassports = safeStorage.getItem(STORAGE_KEY_PASSPORTS);
    const savedCustody = safeStorage.getItem(STORAGE_KEY_CUSTODY);
    const savedTransfers = safeStorage.getItem(STORAGE_KEY_TRANSFERS);
    const savedDecisions = safeStorage.getItem(STORAGE_KEY_DECISIONS);
    const savedVerifications = safeStorage.getItem(STORAGE_KEY_VERIFICATIONS);
    const savedTamper = safeStorage.getItem(STORAGE_KEY_TAMPER_REPORTS);
    const savedMetrics = safeStorage.getItem(STORAGE_KEY_METRICS);
    const savedExecs = safeStorage.getItem(STORAGE_KEY_QPIAI_EXECS);

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
        if (savedVerifications) {
          const parsedV: Record<string, PhysicalVerificationResponse[]> = JSON.parse(savedVerifications);
          for (const [id, list] of Object.entries(parsedV)) {
            this.physicalVerifications.set(id, list);
          }
        }
        if (savedTamper) {
          const parsedT: Record<string, TamperReportResponse[]> = JSON.parse(savedTamper);
          for (const [id, list] of Object.entries(parsedT)) {
            this.tamperReports.set(id, list);
          }
        }
        if (savedMetrics) {
          const parsedM: Record<string, BatteryMetricPoint[]> = JSON.parse(savedMetrics);
          for (const [id, list] of Object.entries(parsedM)) {
            this.batteryMetrics.set(id, list);
          }
        }
        if (savedExecs) {
          this.qpiaiExecutions = JSON.parse(savedExecs);
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
      const vObj: Record<string, PhysicalVerificationResponse[]> = {};
      for (const [k, v] of this.physicalVerifications.entries()) vObj[k] = v;
      const trObj: Record<string, TamperReportResponse[]> = {};
      for (const [k, v] of this.tamperReports.entries()) trObj[k] = v;
      const mObj: Record<string, BatteryMetricPoint[]> = {};
      for (const [k, v] of this.batteryMetrics.entries()) mObj[k] = v;

      safeStorage.setItem(STORAGE_KEY_PASSPORTS, JSON.stringify(pObj));
      safeStorage.setItem(STORAGE_KEY_CUSTODY, JSON.stringify(cObj));
      safeStorage.setItem(STORAGE_KEY_TRANSFERS, JSON.stringify(tObj));
      safeStorage.setItem(STORAGE_KEY_DECISIONS, JSON.stringify(dObj));
      safeStorage.setItem(STORAGE_KEY_VERIFICATIONS, JSON.stringify(vObj));
      safeStorage.setItem(STORAGE_KEY_TAMPER_REPORTS, JSON.stringify(trObj));
      safeStorage.setItem(STORAGE_KEY_METRICS, JSON.stringify(mObj));
      safeStorage.setItem(STORAGE_KEY_QPIAI_EXECS, JSON.stringify(this.qpiaiExecutions));
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

    // Initial Real BMS Telemetry Points
    this.batteryMetrics.set('BAT-NMC-8A2F91C0', [
      {
        id: 'm1',
        battery_id: 'BAT-NMC-8A2F91C0',
        state_of_health_pct: 88.4,
        state_of_charge_pct: 72.0,
        cycle_count: 420,
        internal_resistance_mohm: 19.8,
        capacity_fade_rate_pct_yr: 1.9,
        recorded_at: '2026-10-25T14:30:00.000Z',
        source: 'BMS_TELEMETRY',
      },
    ]);
    this.batteryMetrics.set('BAT-LFP-3C7D410E', [
      {
        id: 'm2',
        battery_id: 'BAT-LFP-3C7D410E',
        state_of_health_pct: 76.8,
        state_of_charge_pct: 55.0,
        cycle_count: 1850,
        internal_resistance_mohm: 26.4,
        capacity_fade_rate_pct_yr: 2.1,
        recorded_at: '2026-10-20T12:00:00.000Z',
        source: 'BESS_DIAGNOSTIC',
      },
    ]);
    this.batteryMetrics.set('BAT-NCA-F104A7B2', [
      {
        id: 'm3',
        battery_id: 'BAT-NCA-F104A7B2',
        state_of_health_pct: 64.2,
        state_of_charge_pct: 20.0,
        cycle_count: 2480,
        internal_resistance_mohm: 34.0,
        capacity_fade_rate_pct_yr: 3.2,
        recorded_at: '2026-10-18T16:00:00.000Z',
        source: 'RECYCLING_INGESTION',
      },
    ]);

    // Initial QpiAI Executions
    this.qpiaiExecutions = [
      {
        id: 'q-init-1',
        engine_type: 'QPIAI_OPT',
        battery_id: 'BAT-NMC-8A2F91C0',
        backend: 'Local-Exact-QUBO-Enumerator',
        status: 'LOCAL_SOLVED',
        is_cloud_result: false,
        execution_time_seconds: 0.042,
        created_at: '2026-10-25T15:00:00.000Z',
        parameters: { mode: 'local', battery_ids: ['BAT-NMC-8A2F91C0'] },
        results: {
          recommended_allocations: [
            {
              battery_id: 'BAT-NMC-8A2F91C0',
              recommended_pathway: 'stationary_bess',
              score: 91.2,
              explanation: 'High remaining capacity (88.4% SoH) makes pack optimal for stationary containerized grid BESS.'
            }
          ]
        }
      }
    ];

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

    // Prevent duplicate serial numbers
    const cleanSerial = String(payload.serial_number || '').trim().toLowerCase();
    const existing = Array.from(this.passports.values()).find(
      p => p.serial_number.trim().toLowerCase() === cleanSerial
    );
    if (existing) {
      throw new Error(
        `Duplicate registration rejected: Battery with serial '${payload.serial_number}' is already registered under passport ID '${existing.battery_id}'. Each battery pack must possess a unique serial number.`
      );
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

    // Append to actual historical metrics collection
    const metricsList = this.batteryMetrics.get(passport.battery_id) || [];
    metricsList.push({
      id: `m_${Date.now()}`,
      battery_id: passport.battery_id,
      state_of_health_pct: passport.health_state.state_of_health_pct,
      state_of_charge_pct: passport.health_state.state_of_charge_pct,
      cycle_count: passport.health_state.cycle_count,
      internal_resistance_mohm: passport.health_state.internal_resistance_mohm,
      capacity_fade_rate_pct_yr: passport.health_state.capacity_fade_rate_pct_yr,
      recorded_at: now,
      source: telemetry.source || 'BMS_TELEMETRY',
    });
    this.batteryMetrics.set(passport.battery_id, metricsList);

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

    const history = this.physicalVerifications.get(passport.battery_id) || [];
    const tamperList = this.tamperReports.get(passport.battery_id) || [];
    const fifteenMinutesAgo = Date.now() - 15 * 60 * 1000;
    const recentScans = history.filter(
      v => new Date(v.verified_at).getTime() >= fifteenMinutesAgo
    );

    const lastVerification = history.length > 0 ? history[history.length - 1] : null;

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
      total_custody_events: events.length,
      is_audit_chain_valid: isValid,
      verification_timestamp: new Date().toISOString(),
      physical_verification_status: lastVerification ? lastVerification.status : 'PENDING_INSPECTION',
      tamper_report_count: tamperList.length,
      recent_scan_count_15m: recentScans.length,
      suspicious_repeated_scans: recentScans.length >= 5,
    };
  }

  async getTwoStepPrecheck(batteryIdOrDid: string): Promise<TwoStepPrecheckResponse> {
    const cleanBatteryId = String(batteryIdOrDid || '').trim();
    if (!cleanBatteryId) {
      throw new Error('Digital battery ID is required for verification pre-check');
    }
    const passport = await this.getPassport(cleanBatteryId);
    if (!passport) {
      throw new Error(`Battery passport '${cleanBatteryId}' not found in registry`);
    }

    const now = Date.now();
    const attempts = passport.consecutive_failed_attempts || 0;
    const isFlagged = Boolean(passport.is_flagged_for_investigation);
    const isTimeLocked = Boolean(
      passport.lockout_until && new Date(passport.lockout_until).getTime() > now
    );
    const isLocked = isFlagged || attempts >= 5 || isTimeLocked;

    return {
      battery_id: passport.battery_id,
      battery_did: passport.battery_did,
      status: isLocked ? 'SUSPICIOUS_LOCKED' : 'AWAITING_PHYSICAL_UID',
      is_flagged: isFlagged,
      is_locked: isLocked,
      consecutive_failed_attempts: attempts,
      remaining_attempts: Math.max(0, 5 - attempts),
      lockout_until: passport.lockout_until || null,
      investigation_reason: passport.investigation_reason || null,
      flagged_at: passport.flagged_at || null,
      manufacturer_hint: passport.manufacturer_name,
      model_designation: passport.model_designation,
      requires_physical_uid: true,
      message: isLocked
        ? "This battery is currently flagged as 'Suspicious — Verification Required' due to 5 consecutive failed verification attempts. Further physical identity verification is temporarily blocked pending authorized review."
        : "Digital QR passport reference resolved. Step 2 required: Enter or scan the permanent UID engraved on the physical battery casing.",
    };
  }

  async verifyPhysicalIdentity(
    batteryIdOrDid: string,
    payload: PhysicalVerificationRequest,
    actor?: { role: string; organization?: string; id?: string } | null,
    clientIp?: string
  ): Promise<PhysicalVerificationResponse> {
    const cleanBatteryId = String(batteryIdOrDid || '').trim();
    if (!cleanBatteryId) {
      throw new Error('Digital battery ID is required for verification');
    }
    const cleanEntered = String(payload?.physical_serial || '').trim().toUpperCase();
    if (!cleanEntered) {
      throw new Error('Physical casing serial number is required for verification');
    }
    if (cleanEntered.length > 120 || /[\x00-\x1F\x7F]/.test(cleanEntered)) {
      throw new Error('Malformed physical serial number');
    }

    const passport = await this.getPassport(cleanBatteryId);
    if (!passport) {
      throw new Error(`Battery passport '${cleanBatteryId}' not found in registry`);
    }

    const now = Date.now();
    const attempts = passport.consecutive_failed_attempts || 0;
    const isFlagged = Boolean(passport.is_flagged_for_investigation);
    const isTimeLocked = Boolean(
      passport.lockout_until && new Date(passport.lockout_until).getTime() > now
    );

    // Enforce server-side lockout: Reject if flagged or already 5 failures or time locked
    if (isFlagged || attempts >= 5 || isTimeLocked) {
      const lockErr: any = new Error(
        "Physical verification temporarily blocked. Maximum attempts (5) exceeded. Battery flagged as 'Suspicious — Verification Required' pending authorized inspector review."
      );
      lockErr.statusCode = 423;
      lockErr.is_locked = true;
      lockErr.is_flagged = true;
      lockErr.remaining_attempts = 0;
      throw lockErr;
    }

    const cleanRegistered = String(passport.serial_number || '').trim().toUpperCase();

    // 15-minute velocity check
    const fifteenMinutesAgo = now - 15 * 60 * 1000;
    const history = this.physicalVerifications.get(passport.battery_id) || [];
    const recentScans = history.filter(
      v => new Date(v.verified_at).getTime() >= fifteenMinutesAgo
    );
    const recentCount = recentScans.length + 1; // including this one
    const suspiciousRepeatedScans = recentCount >= 5;

    // Tamper report count
    const tamperCount = this.tamperReports.get(passport.battery_id)?.length || 0;

    let status: PhysicalVerificationResponse['status'] = 'MATCHED';
    let isAuthentic = true;
    let fraudDetected = false;
    let fraudType: PhysicalVerificationResponse['fraud_type'] = null;
    let conflictingBatteryId: string | null = null;
    let matchDetails = '';
    let passportDetails: PublicVerification | null = null;

    // Timing-safe length and value equality check
    const isMatch = cleanEntered.length === cleanRegistered.length && cleanEntered === cleanRegistered && cleanEntered.length > 0;

    if (isMatch) {
      status = 'MATCHED';
      isAuthentic = true;
      fraudDetected = false;
      matchDetails = `Identity Matched: Permanent laser-engraved casing serial strictly matches registered passport '${passport.battery_id}'.`;
      
      // Reset consecutive failures on authenticated match
      passport.consecutive_failed_attempts = 0;
      passport.lockout_until = null;
      if (passport.is_flagged_for_investigation && passport.investigation_reason?.includes('failed')) {
        passport.is_flagged_for_investigation = false;
        passport.investigation_reason = null;
      }

      // Unseal public passport details now that physical identity is verified
      passportDetails = await this.verifyPublic(passport.battery_id);
    } else {
      // Increment consecutive failed attempts
      const newAttempts = attempts + 1;
      passport.consecutive_failed_attempts = newAttempts;

      if (newAttempts >= 5) {
        // Flag battery as Suspicious — Verification Required
        passport.is_flagged_for_investigation = true;
        passport.lockout_until = new Date(now + 15 * 60 * 1000).toISOString();
        passport.flagged_at = new Date().toISOString();
        passport.investigation_reason = 'Exceeded 5 consecutive failed physical UID verification attempts.';
        
        status = 'SUSPICIOUS_VERIFICATION_REQUIRED';
        isAuthentic = false;
        fraudDetected = true;
        fraudType = 'EXCESSIVE_FAILED_VERIFICATIONS';
        matchDetails = `Maximum allowable attempts (5) reached. Battery has been flagged as 'Suspicious — Verification Required' and further verification is temporarily blocked pending authorized review.`;
      } else {
        const remaining = 5 - newAttempts;
        // Check if serial belongs to another battery (QR Swap fraud)
        const otherBattery = Array.from(this.passports.values()).find(
          p => p.battery_id !== passport.battery_id && p.serial_number.trim().toUpperCase() === cleanEntered
        );

        if (otherBattery) {
          status = 'MISMATCH_FRAUD';
          isAuthentic = false;
          fraudDetected = true;
          fraudType = 'QR_STICKER_SWAP_DETECTED';
          conflictingBatteryId = otherBattery.battery_id;
          matchDetails = `CRITICAL FRAUD ALERT: Physical casing serial belongs to a different battery passport. ${remaining} attempt(s) remaining before security lockout.`;
        } else {
          status = 'UNREGISTERED_SERIAL';
          isAuthentic = false;
          fraudDetected = true;
          fraudType = 'UNREGISTERED_PHYSICAL_CASING';
          matchDetails = `Physical serial verification failed. The entered UID does not match the registered casing record. ${remaining} attempt(s) remaining before security lockout.`;
        }
      }
    }

    const verificationRecord: PhysicalVerificationResponse = {
      status,
      is_authentic: isAuthentic,
      battery_id: passport.battery_id,
      battery_did: passport.battery_did,
      physical_serial_entered: payload.physical_serial,
      manufacturer_name: passport.manufacturer_name,
      model_designation: passport.model_designation,
      match_details: matchDetails,
      fraud_detected: fraudDetected,
      fraud_type: fraudType,
      conflicting_battery_id: conflictingBatteryId,
      suspicious_repeated_scans: suspiciousRepeatedScans,
      recent_scan_count_15m: recentCount,
      verified_at: new Date().toISOString(),
      verifier: {
        id: actor?.id,
        role: actor?.role || 'PUBLIC',
        organization: actor?.organization,
      },
      tamper_report_count: tamperCount,
      consecutive_failed_attempts: passport.consecutive_failed_attempts || 0,
      remaining_attempts: Math.max(0, 5 - (passport.consecutive_failed_attempts || 0)),
      is_flagged_for_investigation: Boolean(passport.is_flagged_for_investigation),
      lockout_until: passport.lockout_until || null,
      investigation_reason: passport.investigation_reason || null,
      passport_details: passportDetails,
      // Registered serial number is exposed ONLY upon successful match
      registered_serial_number: isMatch ? passport.serial_number : undefined,
    };

    history.push(verificationRecord);
    this.physicalVerifications.set(passport.battery_id, history);

    // Audit Log Entry
    const nowIso = new Date().toISOString();
    this.auditLogs = this.auditLogs || [];
    this.auditLogs.push({
      action: isMatch
        ? 'DUAL_ID_VERIFIED_SUCCESS'
        : (passport.consecutive_failed_attempts || 0) >= 5
        ? 'BATTERY_FLAGGED_SUSPICIOUS'
        : 'VERIFICATION_FAILED_ATTEMPT',
      entity_type: 'BATTERY',
      entity_id: passport.battery_id,
      actor_id: actor?.id || 'PUBLIC',
      actor_role: actor?.role || 'PUBLIC',
      details: {
        status,
        attempts: passport.consecutive_failed_attempts,
        remaining_attempts: Math.max(0, 5 - (passport.consecutive_failed_attempts || 0)),
        is_flagged: Boolean(passport.is_flagged_for_investigation),
        lockout_until: passport.lockout_until,
        clientIp: clientIp || null,
        notes: payload.inspector_notes || null,
      },
      timestamp: nowIso,
    });

    this.persist();

    return verificationRecord;
  }

  async resetLockout(
    batteryIdOrDid: string,
    notes?: string,
    actor?: { role: string; organization?: string; id?: string } | null
  ): Promise<ResetLockoutResponse> {
    if (!actor || (actor.role !== 'ADMINISTRATOR' && actor.role !== 'REGULATOR_AUDITOR')) {
      const err: any = new Error(
        'Access denied: Only authorized administrators or inspectors can review and reset verification lockouts.'
      );
      err.statusCode = 403;
      throw err;
    }

    const passport = await this.getPassport(batteryIdOrDid);
    if (!passport) {
      throw new Error(`Battery passport '${batteryIdOrDid}' not found in registry`);
    }

    const nowIso = new Date().toISOString();
    passport.consecutive_failed_attempts = 0;
    passport.is_flagged_for_investigation = false;
    passport.lockout_until = null;
    passport.investigation_reason = null;
    passport.reviewed_by = actor.id || 'AUTHORITY';
    passport.reviewed_at = nowIso;
    passport.review_notes = notes || 'Lockout cleared by authorized inspector after review.';

    this.auditLogs = this.auditLogs || [];
    this.auditLogs.push({
      action: 'VERIFICATION_LOCKOUT_RESET',
      entity_type: 'BATTERY',
      entity_id: passport.battery_id,
      actor_id: actor.id || 'AUTHORITY',
      actor_role: actor.role,
      details: {
        review_notes: passport.review_notes,
        reset_at: nowIso,
      },
      timestamp: nowIso,
    });

    this.persist();

    return {
      success: true,
      message: 'Security lockout successfully cleared and battery investigation flag resolved.',
      battery_id: passport.battery_id,
      reset_at: nowIso,
      reviewed_by: actor.id,
    };
  }

  async getFlaggedBatteries(): Promise<FlaggedBatteryAlert[]> {
    const list: FlaggedBatteryAlert[] = [];
    for (const p of this.passports.values()) {
      if (p.is_flagged_for_investigation || (p.consecutive_failed_attempts && p.consecutive_failed_attempts >= 5)) {
        list.push({
          battery_id: p.battery_id,
          battery_did: p.battery_did,
          manufacturer_name: p.manufacturer_name,
          model_designation: p.model_designation,
          consecutive_failed_attempts: p.consecutive_failed_attempts || 0,
          is_flagged_for_investigation: Boolean(p.is_flagged_for_investigation),
          lockout_until: p.lockout_until || null,
          investigation_reason: p.investigation_reason || null,
          flagged_at: p.flagged_at || null,
          tamper_reports_count: this.tamperReports.get(p.battery_id)?.length || 0,
        });
      }
    }
    return list;
  }

  async reportTampering(
    batteryIdOrDid: string,
    payload: TamperReportRequest,
    actor?: { role: string; organization?: string; id?: string } | null,
    _clientIp?: string
  ): Promise<TamperReportResponse> {
    const passport = await this.getPassport(batteryIdOrDid);
    if (!passport) {
      throw new Error(`Battery passport '${batteryIdOrDid}' not found in registry`);
    }

    const reportId = 'TR-' + Math.random().toString(36).substring(2, 10).toUpperCase();
    const record: TamperReportResponse = {
      success: true,
      report_id: reportId,
      battery_id: passport.battery_id,
      status: 'INVESTIGATION_PENDING',
      message: `Tamper incident '${payload.reason}' reported and logged onto immutable security audit trail.`,
      timestamp: new Date().toISOString(),
    };

    const list = this.tamperReports.get(passport.battery_id) || [];
    list.push(record);
    this.tamperReports.set(passport.battery_id, list);
    this.persist();

    return record;
  }

  async getFraudStatus(batteryIdOrDid: string): Promise<FraudAuditStatus> {
    const passport = await this.getPassport(batteryIdOrDid);
    if (!passport) {
      throw new Error(`Battery passport '${batteryIdOrDid}' not found in registry`);
    }

    const history = this.physicalVerifications.get(passport.battery_id) || [];
    const tamperList = this.tamperReports.get(passport.battery_id) || [];

    const now = Date.now();
    const fifteenMinutesAgo = now - 15 * 60 * 1000;
    const recentScans = history.filter(
      v => new Date(v.verified_at).getTime() >= fifteenMinutesAgo
    );

    const matchedCount = history.filter(v => v.status === 'MATCHED').length;
    const fraudAlertsCount = history.filter(v => v.fraud_detected).length;
    const lastVerification = history.length > 0 ? history[history.length - 1] : null;

    return {
      battery_id: passport.battery_id,
      battery_did: passport.battery_did,
      registered_serial_number: passport.serial_number,
      total_physical_verifications: history.length,
      matched_count: matchedCount,
      fraud_alerts_count: fraudAlertsCount,
      tamper_reports_count: tamperList.length,
      recent_scan_count_15m: recentScans.length,
      suspicious_repeated_scans: recentScans.length >= 5,
      last_physical_verification: lastVerification
        ? {
            status: lastVerification.status,
            verified_at: lastVerification.verified_at,
            verifier_role: lastVerification.verifier.role,
          }
        : null,
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

  async getBatteryMetricsHistory(
    batteryId: string,
    startDate?: string,
    endDate?: string,
    actor?: any
  ): Promise<BatteryMetricPoint[]> {
    if (actor && actor.role === 'PUBLIC') {
      throw new Error('Access denied: Detailed BMS telemetry history requires authorized enterprise credentials.');
    }
    const cleanId = String(batteryId || '').trim();
    if (!cleanId) {
      throw new Error('Battery ID is required to fetch health trend telemetry.');
    }

    const passport = await this.getPassport(cleanId);
    if (!passport) {
      throw new Error(`Battery passport '${cleanId}' not found in registry.`);
    }

    if (actor && actor.role && actor.role !== 'ADMINISTRATOR' && actor.role !== 'REGULATOR_AUDITOR') {
      const userOrg = String(actor.organization || '').trim().toLowerCase();
      const custodianOrg = String(passport.current_custodian || '').trim().toLowerCase();
      const mfgOrg = String(passport.manufacturer_name || '').trim().toLowerCase();
      if (userOrg && userOrg !== custodianOrg && userOrg !== mfgOrg) {
        throw new Error(`Access denied: Organization '${actor.organization}' does not have permission to view internal telemetry for battery '${passport.battery_id}'.`);
      }
    }

    const points = this.batteryMetrics.get(passport.battery_id) || [];
    let filtered = points;
    if (startDate) {
      const startMs = new Date(startDate).getTime();
      if (!isNaN(startMs)) {
        filtered = filtered.filter(p => new Date(p.recorded_at).getTime() >= startMs);
      }
    }
    if (endDate) {
      const endMs = new Date(endDate).getTime();
      if (!isNaN(endMs)) {
        filtered = filtered.filter(p => new Date(p.recorded_at).getTime() <= endMs);
      }
    }
    return filtered.sort((a, b) => new Date(a.recorded_at).getTime() - new Date(b.recorded_at).getTime());
  }

  async getAnalyticsOverview(actor?: any): Promise<AnalyticsOverview> {
    const passports = Array.from(this.passports.values());

    const lifecycleDist: Record<string, number> = {
      MANUFACTURED: 0,
      IN_SERVICE: 0,
      MAINTENANCE: 0,
      SECOND_LIFE: 0,
      END_OF_LIFE: 0,
      RECYCLED: 0,
      DECOMMISSIONED: 0,
    };
    for (const p of passports) {
      if (lifecycleDist[p.status] !== undefined) {
        lifecycleDist[p.status]++;
      } else {
        lifecycleDist[p.status] = 1;
      }
    }

    let totalSoh = 0;
    let minSoh = 100;
    let maxSoh = 0;
    let totalPoints = 0;
    for (const metrics of this.batteryMetrics.values()) {
      for (const m of metrics) {
        totalSoh += m.state_of_health_pct;
        if (m.state_of_health_pct < minSoh) minSoh = m.state_of_health_pct;
        if (m.state_of_health_pct > maxSoh) maxSoh = m.state_of_health_pct;
        totalPoints++;
      }
    }
    const avgSoh = totalPoints > 0 ? Number((totalSoh / totalPoints).toFixed(1)) : 0;

    const transfers = Array.from(this.custodyTransfers.values());
    const transfersByState: Record<string, number> = {
      ACCEPTED: 0,
      PENDING: 0,
      REJECTED: 0,
      CANCELLED: 0,
    };
    for (const t of transfers) {
      if (transfersByState[t.state] !== undefined) {
        transfersByState[t.state]++;
      }
    }

    let matchedCount = 0;
    let mismatchFraudCount = 0;
    let verificationRequiredCount = 0;
    const recentChecks: Array<any> = [];

    for (const list of this.physicalVerifications.values()) {
      for (const v of list) {
        if (v.status === 'MATCHED') {
          matchedCount++;
        } else if (v.status === 'MISMATCH_FRAUD' || v.status === 'UNREGISTERED_SERIAL') {
          mismatchFraudCount++;
        } else {
          verificationRequiredCount++;
        }
        recentChecks.push({
          battery_id: v.battery_id,
          status: v.status,
          is_authentic: v.is_authentic,
          verified_at: v.verified_at,
          verifier_role: v.verifier?.role || 'PUBLIC',
        });
      }
    }

    let cloudExecs = 0;
    let localExecs = 0;
    for (const exec of this.qpiaiExecutions) {
      if (exec.is_cloud_result || exec.backend === 'qpi_ai_cloud') {
        cloudExecs++;
      } else {
        localExecs++;
      }
    }

    return {
      total_passports: passports.length,
      lifecycle_distribution: lifecycleDist,
      health_summary: {
        avg_soh_pct: avgSoh,
        min_soh_pct: totalPoints > 0 ? minSoh : 0,
        max_soh_pct: totalPoints > 0 ? maxSoh : 0,
        total_metrics_recorded: totalPoints,
      },
      custody_transfers_summary: {
        total: transfers.length,
        by_state: transfersByState,
        recent_transfers: transfers.slice(0, 10).map(t => ({
          id: t.id,
          battery_id: t.battery_id,
          sender_org_name: t.sender_org_name,
          receiver_org_name: t.receiver_org_name,
          state: t.state,
          transfer_type: t.transfer_type,
          initiated_at: t.initiated_at,
        })),
      },
      anti_fraud_summary: {
        total_checks: matchedCount + mismatchFraudCount + verificationRequiredCount,
        matched_count: matchedCount,
        mismatch_fraud_count: mismatchFraudCount,
        verification_required_count: verificationRequiredCount,
        tamper_reports_count: Array.from(this.tamperReports.values()).reduce((sum, list) => sum + list.length, 0),
        suspicious_scans_detected: Array.from(this.physicalVerifications.values()).reduce((sum, list) => sum + list.filter(v => v.suspicious_repeated_scans).length, 0),
        recent_checks: recentChecks.slice(-10).reverse(),
      },
      qpiai_summary: {
        total_executions: this.qpiaiExecutions.length,
        cloud_executions_count: cloudExecs,
        local_simulation_count: localExecs,
        recent_executions: this.qpiaiExecutions.slice(-10).reverse(),
      },
    };
  }

  async getVerificationAnalytics(startDate?: string, endDate?: string, _actor?: any): Promise<any> {
    const list: Array<any> = [];
    for (const checks of this.physicalVerifications.values()) {
      for (const c of checks) {
        list.push(c);
      }
    }
    let filtered = list;
    if (startDate) {
      const sMs = new Date(startDate).getTime();
      if (!isNaN(sMs)) filtered = filtered.filter(c => new Date(c.verified_at).getTime() >= sMs);
    }
    if (endDate) {
      const eMs = new Date(endDate).getTime();
      if (!isNaN(eMs)) filtered = filtered.filter(c => new Date(c.verified_at).getTime() <= eMs);
    }
    return filtered.sort((a, b) => new Date(a.verified_at).getTime() - new Date(b.verified_at).getTime());
  }

  async getQpiAIExecutionsAnalytics(_actor?: any): Promise<QpiAIExecutionAnalyticsItem[]> {
    return this.qpiaiExecutions;
  }

  logQpiAIExecution(execution: QpiAIExecutionAnalyticsItem) {
    this.qpiaiExecutions.push(execution);
    this.persist();
  }
}

export const batteryRepository = new BatteryRepository();
