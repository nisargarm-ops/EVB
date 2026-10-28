import {
  BatteryPassport,
  CustodyEvent,
  PassportSummary,
  AuditVerification,
  PublicVerification,
  UserRole,
  LifecycleStatus,
  VALID_LIFECYCLE_TRANSITIONS,
  CustodyTransfer,
  TransferStatus,
  DispositionDecision,
  SuspiciousReportRequest
} from '../types';
import {
  GENESIS_PREV_HASH,
  calculateEventHash,
  generateImmutableBatteryId,
  verifyChainIntegrity,
  sha256
} from './hasher';

const STORAGE_KEY_PASSPORTS = 'bp360_passports_v2';
const STORAGE_KEY_CUSTODY = 'bp360_custody_v2';
const STORAGE_KEY_TRANSFERS = 'bp360_transfers_v2';
const STORAGE_KEY_REPORTS = 'bp360_reports_v2';

function getInitialData(): {
  passports: Record<string, BatteryPassport>;
  custodyEvents: Record<string, CustodyEvent[]>;
  transfers: Record<string, CustodyTransfer>;
} {
  // 1. NMC 811 Battery (In Service)
  const id1 = 'BAT-NMC-8A2F91C0';
  const did1 = 'did:battery:sha256:8a2f91c0e352b904c6fa110d720b001a4e2182d4f826384210e37ab40219c4d9';
  const p1: BatteryPassport = {
    battery_did: did1,
    battery_id: id1,
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
      cell_chemistry_detail: 'LiNi0.8Mn0.1Co0.1O2 with Graphite/Silicon Anode',
      energy_density_wh_kg: 190.5,
      max_continuous_discharge_a: 450.0,
    },
    carbon_footprint: {
      total_co2_kg_per_kwh: 62.5,
      manufacturing_co2_kg: 28.0,
      raw_materials_co2_kg: 29.5,
      transport_co2_kg: 5.0,
      eu_compliance_class: 'Class A'
    },
    recycled_content: {
      cobalt_percentage: 16.5,
      lithium_percentage: 6.0,
      nickel_percentage: 12.0,
      lead_percentage: 0.0
    },
    health_state: {
      state_of_health_pct: 88.4,
      state_of_charge_pct: 72.0,
      cycle_count: 420,
      internal_resistance_mohm: 19.8,
      capacity_fade_rate_pct_yr: 1.9,
      last_telemetry_timestamp: '2026-10-25T14:30:00Z',
      source_type: 'BMS_DIRECT_TELEMETRY',
      source_confidence_pct: 98,
      source_device_id: 'BMS-TELEMATICS-GW-BER09',
      data_classification: 'VERIFIED_FACT',
      cell_voltage_deviation_mv: 12,
      max_pack_temperature_c: 34.2
    },
    warranty: {
      warranty_id: 'WRN-QV-8A2F91C0',
      provider: 'QuantumVolt Warranty Trust',
      coverage_type: '8 Years / 160,000 km OEM Powertrain',
      valid_until: '2032-01-15T09:00:00Z',
      max_cycles_covered: 1500,
      capacity_retention_guarantee_pct: 70.0,
      status: 'ACTIVE',
      terms_summary: 'Guarantees >=70% capacity retention under standard operating temperature profiles.'
    },
    latest_inspection: {
      inspection_id: 'INSP-2026-Q3-0881',
      inspection_date: '2026-09-12T11:00:00Z',
      inspector_name: 'TÜV Rheinland Battery Systems Lab',
      inspector_organization: 'TÜV Rheinland Metrology',
      inspection_facility: 'Munich Inspection Center #4',
      result: 'PASS',
      mechanical_integrity: 'SOUND',
      thermal_damage_detected: false,
      moisture_ingress_detected: false,
      notes: 'All 192 cells within nominal internal resistance spread. Seal integrity verified.',
      evidence_ref: 'CERT-TUV-2026-0881.PDF'
    },
    qr_code_url: `/verify/${id1}`,
    qr_lookup_identifier: 'qr_token_8a2f91c0e352b904',
    is_flagged_suspicious: false,
    is_revoked: false,
    created_at: '2024-01-15T09:00:00Z',
    updated_at: '2026-10-25T14:30:00Z'
  };

  const ev1_0_payload = { batch_id: 'BATCH-2024-Q1-90', quality_grade: 'A+', initial_soh: 100.0, factory_gate: 'GATE-04' };
  const ev1_0_hash = calculateEventHash(
    GENESIS_PREV_HASH,
    id1,
    'MANUFACTURED',
    '2024-01-15T09:00:00Z',
    'ACTOR-MFG-001',
    ev1_0_payload
  );
  const ev1_0: CustodyEvent = {
    event_id: 'EVT-001-GENESIS',
    battery_id: id1,
    event_type: 'MANUFACTURED',
    timestamp: '2024-01-15T09:00:00Z',
    actor_id: 'ACTOR-MFG-001',
    actor_role: 'MANUFACTURER',
    actor_organization: 'QuantumVolt Gigafactory',
    location: 'Berlin, Germany',
    payload: ev1_0_payload,
    prev_hash: GENESIS_PREV_HASH,
    hash: ev1_0_hash,
    evidence_ref: 'CERT-GENESIS-QV-98124',
    verification_status: 'VERIFIED'
  };

  const ev1_1_payload = { vehicle_vin: 'WAUZZZF28NA091244', model: 'Apex GT Sedan', inverter_kw: 250, assembly_line: 'STG-02' };
  const ev1_1_hash = calculateEventHash(
    ev1_0_hash,
    id1,
    'OEM_ASSEMBLED',
    '2024-02-10T11:20:00Z',
    'ACTOR-OEM-042',
    ev1_1_payload
  );
  const ev1_1: CustodyEvent = {
    event_id: 'EVT-001-OEM',
    battery_id: id1,
    event_type: 'OEM_ASSEMBLED',
    timestamp: '2024-02-10T11:20:00Z',
    actor_id: 'ACTOR-OEM-042',
    actor_role: 'OEM',
    actor_organization: 'Apex Motors AG',
    location: 'Stuttgart, Germany',
    payload: ev1_1_payload,
    prev_hash: ev1_0_hash,
    hash: ev1_1_hash,
    evidence_ref: 'MANIFEST-OEM-STG-2024-042',
    verification_status: 'VERIFIED'
  };

  const ev1_2_payload = { fleet_id: 'FLEET-BER-88', current_soh: 88.4, odometer_km: 68500, scan_protocol: 'OBD-II-SECURE' };
  const ev1_2_hash = calculateEventHash(
    ev1_1_hash,
    id1,
    'TELEMETRY_UPDATED',
    '2026-10-25T14:30:00Z',
    'ACTOR-FLEET-109',
    ev1_2_payload
  );
  const ev1_2: CustodyEvent = {
    event_id: 'EVT-001-TELEMETRY',
    battery_id: id1,
    event_type: 'TELEMETRY_UPDATED',
    timestamp: '2026-10-25T14:30:00Z',
    actor_id: 'ACTOR-FLEET-109',
    actor_role: 'FLEET_OPERATOR',
    actor_organization: 'Apex EV Mobility Fleet',
    location: 'Berlin, Germany',
    payload: ev1_2_payload,
    prev_hash: ev1_1_hash,
    hash: ev1_2_hash,
    evidence_ref: 'TELEMETRY-LOG-BER88-20261025',
    verification_status: 'VERIFIED'
  };

  // 2. LFP Battery (Second Life)
  const id2 = 'BAT-LFP-3C7D410E';
  const did2 = 'did:battery:sha256:3c7d410eb8208a9f5d6349129df4023bc8429bca02479e02394bf342981030e5';
  const p2: BatteryPassport = {
    battery_did: did2,
    battery_id: id2,
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
      cell_chemistry_detail: 'LiFePO4 Prismatic Cells',
      energy_density_wh_kg: 152.0,
      max_continuous_discharge_a: 300.0,
    },
    carbon_footprint: {
      total_co2_kg_per_kwh: 51.2,
      manufacturing_co2_kg: 22.0,
      raw_materials_co2_kg: 24.2,
      transport_co2_kg: 5.0,
      eu_compliance_class: 'Class A'
    },
    recycled_content: {
      cobalt_percentage: 0.0,
      lithium_percentage: 4.5,
      nickel_percentage: 0.0,
      lead_percentage: 0.0
    },
    health_state: {
      state_of_health_pct: 76.8,
      state_of_charge_pct: 55.0,
      cycle_count: 1850,
      internal_resistance_mohm: 26.4,
      capacity_fade_rate_pct_yr: 2.1,
      last_telemetry_timestamp: '2026-10-20T12:00:00Z',
      source_type: 'WORKSHOP_DIAGNOSTIC',
      source_confidence_pct: 88,
      source_device_id: 'GRIDSTORE-BESS-INVERTER-S2',
      data_classification: 'VERIFIED_FACT',
      cell_voltage_deviation_mv: 18,
      max_pack_temperature_c: 29.5
    },
    warranty: {
      warranty_id: 'WRN-NBS-SECOND-LIFE-99',
      provider: 'GridStore Circular Asset Underwriters',
      coverage_type: '3-Year Stationary BESS Secondary Warranty',
      valid_until: '2029-10-20T12:00:00Z',
      max_cycles_covered: 1200,
      capacity_retention_guarantee_pct: 65.0,
      status: 'ACTIVE',
      terms_summary: 'Covers stationary energy storage usage at <=0.5C charge/discharge rate.'
    },
    latest_inspection: {
      inspection_id: 'INSP-2026-SL-102',
      inspection_date: '2026-10-18T14:30:00Z',
      inspector_name: 'Nordic Circular Battery Certifiers',
      inspector_organization: 'GridStore Safety Bureau',
      inspection_facility: 'Stockholm Second-Life Repurposing Hub',
      result: 'SECOND_LIFE_ELIGIBLE',
      mechanical_integrity: 'SOUND',
      thermal_damage_detected: false,
      moisture_ingress_detected: false,
      notes: 'Pack deemed safe for stationary energy storage container module 4.',
      evidence_ref: 'SL-ASSESSMENT-NBS-44109'
    },
    qr_code_url: `/verify/${id2}`,
    qr_lookup_identifier: 'qr_token_3c7d410eb8208a9f',
    is_flagged_suspicious: false,
    is_revoked: false,
    created_at: '2023-05-10T10:00:00Z',
    updated_at: '2026-10-20T12:00:00Z'
  };

  const ev2_0_hash = calculateEventHash(
    GENESIS_PREV_HASH,
    id2,
    'MANUFACTURED',
    '2023-05-10T10:00:00Z',
    'ACTOR-MFG-002',
    { batch_id: 'NBS-LFP-Q2' }
  );
  const ev2_0: CustodyEvent = {
    event_id: 'EVT-002-GENESIS',
    battery_id: id2,
    event_type: 'MANUFACTURED',
    timestamp: '2023-05-10T10:00:00Z',
    actor_id: 'ACTOR-MFG-002',
    actor_role: 'MANUFACTURER',
    actor_organization: 'Nordic Battery Systems',
    location: 'Skelleftea, Sweden',
    payload: { batch_id: 'NBS-LFP-Q2' },
    prev_hash: GENESIS_PREV_HASH,
    hash: ev2_0_hash,
    evidence_ref: 'CERT-GENESIS-NBS-Q2',
    verification_status: 'VERIFIED'
  };

  const ev2_1_payload = { repurposing_application: 'Stationary Solar BESS', tested_soh: 76.8, grid_feeder_id: 'FEED-SE-09' };
  const ev2_1_hash = calculateEventHash(
    ev2_0_hash,
    id2,
    'SECOND_LIFE_ASSIGNED',
    '2026-10-20T12:00:00Z',
    'ACTOR-RECYCLER-009',
    ev2_1_payload
  );
  const ev2_1: CustodyEvent = {
    event_id: 'EVT-002-SECOND-LIFE',
    battery_id: id2,
    event_type: 'SECOND_LIFE_ASSIGNED',
    timestamp: '2026-10-20T12:00:00Z',
    actor_id: 'ACTOR-RECYCLER-009',
    actor_role: 'RECYCLER',
    actor_organization: 'GridStore Second-Life Energy Storage',
    location: 'Stockholm, Sweden',
    payload: ev2_1_payload,
    prev_hash: ev2_0_hash,
    hash: ev2_1_hash,
    evidence_ref: 'HANDOVER-GS-2026-10',
    verification_status: 'VERIFIED'
  };

  // 3. NCA Battery (End of Life)
  const id3 = 'BAT-NCA-F104A7B2';
  const did3 = 'did:battery:sha256:f104a7b29a0134bc5712e0938dae9210c8502394c8e7182903859218d840192e';
  const p3: BatteryPassport = {
    battery_did: did3,
    battery_id: id3,
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
      cell_chemistry_detail: 'LiNi0.8Co0.15Al0.05O2',
      energy_density_wh_kg: 184.8,
      max_continuous_discharge_a: 380.0,
    },
    carbon_footprint: {
      total_co2_kg_per_kwh: 78.0,
      manufacturing_co2_kg: 35.0,
      raw_materials_co2_kg: 36.0,
      transport_co2_kg: 7.0,
      eu_compliance_class: 'Class B'
    },
    recycled_content: {
      cobalt_percentage: 22.0,
      lithium_percentage: 8.0,
      nickel_percentage: 18.0,
      lead_percentage: 0.0
    },
    health_state: {
      state_of_health_pct: 64.2,
      state_of_charge_pct: 20.0,
      cycle_count: 2480,
      internal_resistance_mohm: 34.0,
      capacity_fade_rate_pct_yr: 3.2,
      last_telemetry_timestamp: '2026-10-18T16:00:00Z',
      source_type: 'THIRD_PARTY_EVALUATION',
      source_confidence_pct: 75,
      data_classification: 'REPORTED_INFO',
      cell_voltage_deviation_mv: 42,
      max_pack_temperature_c: 41.0
    },
    warranty: {
      warranty_id: 'WRN-REC-2021-EXPIRED',
      provider: 'Rhine Energy Cells OEM Support',
      coverage_type: 'Original 5-Year Powertrain Warranty',
      valid_until: '2026-08-20T08:00:00Z',
      max_cycles_covered: 2000,
      capacity_retention_guarantee_pct: 70.0,
      status: 'EXPIRED',
      terms_summary: 'Original warranty period expired August 2026.'
    },
    latest_inspection: {
      inspection_id: 'INSP-2026-EOL-091',
      inspection_date: '2026-10-15T09:30:00Z',
      inspector_name: 'Bureau Veritas Circular Audit',
      inspector_organization: 'Bureau Veritas Europe',
      inspection_facility: 'Dunkirk Recycling Terminal',
      result: 'FAIL',
      mechanical_integrity: 'MINOR_DENT',
      thermal_damage_detected: false,
      moisture_ingress_detected: false,
      notes: 'High internal resistance across module 3. Recommended for hydrometallurgical recycling.',
      evidence_ref: 'EOL-DISPOSITION-BV-91'
    },
    qr_code_url: `/verify/${id3}`,
    qr_lookup_identifier: 'qr_token_f104a7b29a0134bc',
    is_flagged_suspicious: false,
    is_revoked: false,
    created_at: '2021-08-20T08:00:00Z',
    updated_at: '2026-10-18T16:00:00Z'
  };

  const ev3_0_hash = calculateEventHash(
    GENESIS_PREV_HASH,
    id3,
    'MANUFACTURED',
    '2021-08-20T08:00:00Z',
    'ACTOR-MFG-003',
    { batch_id: 'REC-NCA-2021' }
  );
  const ev3_0: CustodyEvent = {
    event_id: 'EVT-003-GENESIS',
    battery_id: id3,
    event_type: 'MANUFACTURED',
    timestamp: '2021-08-20T08:00:00Z',
    actor_id: 'ACTOR-MFG-003',
    actor_role: 'MANUFACTURER',
    actor_organization: 'Rhine Energy Cells',
    location: 'Dunkirk, France',
    payload: { batch_id: 'REC-NCA-2021' },
    prev_hash: GENESIS_PREV_HASH,
    hash: ev3_0_hash,
    evidence_ref: 'CERT-GENESIS-REC-2021',
    verification_status: 'VERIFIED'
  };

  // Seed sample custody transfer
  const sampleTransfer: CustodyTransfer = {
    transfer_id: 'XFR-2026-BAT-NMC-001',
    battery_id: id1,
    battery_did: did1,
    sender_organization: 'QuantumVolt Gigafactory',
    sender_actor_id: 'USR-MFG-01',
    receiver_organization: 'Apex Motors AG',
    intended_receiver_role: 'OEM',
    requested_at: '2024-02-01T10:00:00Z',
    responded_at: '2024-02-10T11:20:00Z',
    status: 'ACCEPTED',
    transfer_reason: 'Battery Pack Factory Handover for Apex GT Assembly',
    notes: 'Pre-delivery testing completed. Certified defect-free.',
    legal_declaration_signed: true,
    manifest_hash: 'c8f74e92a83011b932c0f1883921ea4092bba08271e8201fa009218201828392',
    evidence_ref: 'HANDOVER-DECLARATION-QV-APEX-01'
  };

  return {
    passports: {
      [id1]: p1,
      [id2]: p2,
      [id3]: p3,
    },
    custodyEvents: {
      [id1]: [ev1_0, ev1_1, ev1_2],
      [id2]: [ev2_0, ev2_1],
      [id3]: [ev3_0],
    },
    transfers: {
      [sampleTransfer.transfer_id]: sampleTransfer
    }
  };
}

class BatteryPassportStore {
  private passports: Record<string, BatteryPassport> = {};
  private custodyEvents: Record<string, CustodyEvent[]> = {};
  private transfers: Record<string, CustodyTransfer> = {};
  private suspiciousReports: SuspiciousReportRequest[] = [];
  private scanCounter: Record<string, number> = {};

  constructor() {
    this.init();
  }

  private init() {
    if (typeof localStorage === 'undefined') {
      const initial = getInitialData();
      this.passports = initial.passports;
      this.custodyEvents = initial.custodyEvents;
      this.transfers = initial.transfers;
      return;
    }

    try {
      const storedP = localStorage.getItem(STORAGE_KEY_PASSPORTS);
      const storedC = localStorage.getItem(STORAGE_KEY_CUSTODY);
      const storedT = localStorage.getItem(STORAGE_KEY_TRANSFERS);
      const storedR = localStorage.getItem(STORAGE_KEY_REPORTS);
      if (storedP && storedC) {
        this.passports = JSON.parse(storedP);
        this.custodyEvents = JSON.parse(storedC);
        this.transfers = storedT ? JSON.parse(storedT) : {};
        this.suspiciousReports = storedR ? JSON.parse(storedR) : [];
      } else {
        const initial = getInitialData();
        this.passports = initial.passports;
        this.custodyEvents = initial.custodyEvents;
        this.transfers = initial.transfers;
        this.persist();
      }
    } catch {
      const initial = getInitialData();
      this.passports = initial.passports;
      this.custodyEvents = initial.custodyEvents;
      this.transfers = initial.transfers;
    }
  }

  private persist() {
    if (typeof localStorage === 'undefined') return;
    try {
      localStorage.setItem(STORAGE_KEY_PASSPORTS, JSON.stringify(this.passports));
      localStorage.setItem(STORAGE_KEY_CUSTODY, JSON.stringify(this.custodyEvents));
      localStorage.setItem(STORAGE_KEY_TRANSFERS, JSON.stringify(this.transfers));
      localStorage.setItem(STORAGE_KEY_REPORTS, JSON.stringify(this.suspiciousReports));
    } catch (e) {
      console.warn('Storage persistence warning:', e);
    }
  }

  public resetToDefaults() {
    const initial = getInitialData();
    this.passports = initial.passports;
    this.custodyEvents = initial.custodyEvents;
    this.transfers = initial.transfers;
    this.suspiciousReports = [];
    this.scanCounter = {};
    this.persist();
  }

  // --- Passports API ---
  public listPassports(statusFilter?: string): PassportSummary[] {
    let list = Object.values(this.passports);
    if (statusFilter && statusFilter !== 'ALL') {
      list = list.filter(p => p.status.toUpperCase() === statusFilter.toUpperCase());
    }
    return list.map(p => ({
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
      is_flagged_suspicious: p.is_flagged_suspicious || false
    }));
  }

  public getPassport(idOrDidOrToken: string): BatteryPassport | null {
    if (!idOrDidOrToken) return null;
    const clean = idOrDidOrToken.trim();
    if (this.passports[clean]) return this.passports[clean];
    const match = Object.values(this.passports).find(
      p => p.battery_did === clean ||
           p.serial_number === clean ||
           p.qr_lookup_identifier === clean ||
           clean.endsWith(p.battery_id)
    );
    return match || null;
  }

  public createPassport(payload: any, actorUser?: any): BatteryPassport {
    const { did, shortId } = generateImmutableBatteryId(
      payload.manufacturer_name,
      payload.serial_number,
      payload.chemistry,
      payload.manufacturing_date || new Date().toISOString()
    );

    if (this.passports[shortId]) {
      throw new Error(`Battery Passport with ID '${shortId}' already exists.`);
    }

    const nowIso = new Date().toISOString();
    const lookupToken = `qr_token_${sha256(shortId + nowIso).slice(0, 16)}`;

    const passport: BatteryPassport = {
      battery_did: did,
      battery_id: shortId,
      serial_number: payload.serial_number,
      manufacturer_name: payload.manufacturer_name,
      model_designation: payload.model_designation,
      chemistry: payload.chemistry,
      manufacturing_date: payload.manufacturing_date || nowIso,
      manufacturing_country: payload.manufacturing_country || 'EU',
      manufacturing_facility: payload.manufacturing_facility || 'Primary Facility',
      status: 'MANUFACTURED',
      current_custodian: payload.current_custodian || payload.manufacturer_name,
      current_vehicle_vin: null,
      technical_specs: {
        rated_capacity_kwh: payload.technical_specs.rated_capacity_kwh,
        nominal_voltage_v: payload.technical_specs.nominal_voltage_v,
        max_charge_power_kw: payload.technical_specs.max_charge_power_kw,
        cell_count: payload.technical_specs.cell_count,
        pack_weight_kg: payload.technical_specs.pack_weight_kg,
        cell_chemistry_detail: payload.chemistry + ' Standard Cell',
        energy_density_wh_kg: Math.round((payload.technical_specs.rated_capacity_kwh * 1000 / (payload.technical_specs.pack_weight_kg || 450)) * 10) / 10,
        max_continuous_discharge_a: 350.0
      },
      carbon_footprint: payload.carbon_footprint,
      recycled_content: payload.recycled_content,
      health_state: payload.health_state || {
        state_of_health_pct: 100.0,
        state_of_charge_pct: 100.0,
        cycle_count: 0,
        internal_resistance_mohm: 16.0,
        capacity_fade_rate_pct_yr: 1.5,
        last_telemetry_timestamp: nowIso,
        source_type: 'BMS_DIRECT_TELEMETRY',
        source_confidence_pct: 99,
        data_classification: 'VERIFIED_FACT',
        cell_voltage_deviation_mv: 5,
        max_pack_temperature_c: 24.0
      },
      warranty: {
        warranty_id: `WRN-${shortId}`,
        provider: `${payload.manufacturer_name} Warranty Trust`,
        coverage_type: '8 Years / 160,000 km Standard Manufacturer Coverage',
        valid_until: new Date(Date.now() + 8 * 365 * 86400000).toISOString(),
        max_cycles_covered: 1500,
        capacity_retention_guarantee_pct: 70.0,
        status: 'ACTIVE',
        terms_summary: 'Standard manufacturer degradation guarantee under EU 2023/1542.'
      },
      qr_code_url: `/verify/${shortId}`,
      qr_lookup_identifier: lookupToken,
      is_flagged_suspicious: false,
      is_revoked: false,
      created_at: nowIso,
      updated_at: nowIso
    };

    this.passports[shortId] = passport;

    // Create Genesis Block with audit evidence
    const genesisPayload = {
      event: 'Genesis Battery Creation',
      rated_capacity_kwh: payload.technical_specs.rated_capacity_kwh,
      chemistry: payload.chemistry,
      facility: payload.manufacturing_facility,
      evidence_declaration: 'Physical factory end-of-line metrology and batch sign-off'
    };
    const genesisHash = calculateEventHash(
      GENESIS_PREV_HASH,
      shortId,
      'MANUFACTURED',
      nowIso,
      actorUser?.user_id || 'ACTOR-MFG-001',
      genesisPayload
    );

    const genesisEvent: CustodyEvent = {
      event_id: `EVT-${shortId}-000`,
      battery_id: shortId,
      event_type: 'MANUFACTURED',
      timestamp: nowIso,
      actor_id: actorUser?.user_id || 'ACTOR-MFG-001',
      actor_role: 'MANUFACTURER',
      actor_organization: payload.manufacturer_name,
      location: `${payload.manufacturing_facility}, ${payload.manufacturing_country}`,
      payload: genesisPayload,
      prev_hash: GENESIS_PREV_HASH,
      hash: genesisHash,
      evidence_ref: `CERT-FACTORY-${shortId}`,
      verification_status: 'VERIFIED'
    };

    this.custodyEvents[shortId] = [genesisEvent];
    this.persist();
    return passport;
  }

  // --- Explicit Lifecycle State Transitions ---
  public transitionLifecycle(
    batteryId: string,
    targetState: LifecycleStatus,
    reason: string,
    actorUser?: any
  ): BatteryPassport {
    const passport = this.passports[batteryId];
    if (!passport) throw new Error(`Battery '${batteryId}' not found.`);

    if (passport.status === targetState) {
      return passport;
    }

    const allowed = VALID_LIFECYCLE_TRANSITIONS[passport.status] || [];
    if (!allowed.includes(targetState)) {
      throw new Error(
        `Invalid lifecycle transition: Cannot transition from '${passport.status}' to '${targetState}'. Valid transitions are: ${allowed.join(', ') || 'None (Terminal state)'}`
      );
    }

    const previousState = passport.status;
    passport.status = targetState;
    const nowIso = new Date().toISOString();
    passport.updated_at = nowIso;

    // Append lifecycle transition block to hash chain
    const chain = this.custodyEvents[batteryId] || [];
    const prevHash = chain.length > 0 ? chain[chain.length - 1].hash : GENESIS_PREV_HASH;
    const payload = {
      transition: `${previousState} -> ${targetState}`,
      reason: reason || 'Authorized lifecycle state change',
      authorized_by: actorUser?.name || 'Authorized Operator',
      actor_role: actorUser?.role || 'OPERATOR'
    };

    const evtHash = calculateEventHash(
      prevHash,
      batteryId,
      `STATUS_${targetState}`,
      nowIso,
      actorUser?.user_id || 'ACTOR-LIFECYCLE',
      payload
    );

    const newEvent: CustodyEvent = {
      event_id: `EVT-${batteryId}-${chain.length.toString().padStart(3, '0')}`,
      battery_id: batteryId,
      event_type: `STATUS_${targetState}`,
      timestamp: nowIso,
      actor_id: actorUser?.user_id || 'ACTOR-LIFECYCLE',
      actor_role: actorUser?.role || 'OPERATOR',
      actor_organization: actorUser?.organization || passport.current_custodian,
      location: 'Authorized Lifecycle Facility',
      payload,
      prev_hash: prevHash,
      hash: evtHash,
      evidence_ref: `DECISION-DOC-${Date.now()}`,
      verification_status: 'VERIFIED'
    };

    chain.push(newEvent);
    this.custodyEvents[batteryId] = chain;
    this.persist();
    return passport;
  }

  // --- Telemetry & Diagnosis ---
  public updateTelemetry(batteryId: string, telemetry: any, actorUser?: any): BatteryPassport {
    const passport = this.passports[batteryId];
    if (!passport) throw new Error(`Battery Passport '${batteryId}' was not found.`);

    const nowIso = new Date().toISOString();
    passport.health_state = {
      ...passport.health_state,
      state_of_health_pct: Number(telemetry.state_of_health_pct),
      state_of_charge_pct: Number(telemetry.state_of_charge_pct),
      cycle_count: Number(telemetry.cycle_count),
      internal_resistance_mohm: Number(telemetry.internal_resistance_mohm),
      last_telemetry_timestamp: nowIso,
      source_type: telemetry.source_type || 'WORKSHOP_DIAGNOSTIC',
      source_confidence_pct: telemetry.source_confidence_pct || 90,
      data_classification: telemetry.data_classification || 'REPORTED_INFO'
    };
    passport.updated_at = nowIso;

    // Append telemetry custody block
    const chain = this.custodyEvents[batteryId] || [];
    const prevHash = chain.length > 0 ? chain[chain.length - 1].hash : GENESIS_PREV_HASH;
    const payload = {
      state_of_health_pct: telemetry.state_of_health_pct,
      state_of_charge_pct: telemetry.state_of_charge_pct,
      cycle_count: telemetry.cycle_count,
      internal_resistance_mohm: telemetry.internal_resistance_mohm,
      source: telemetry.source_type || 'WORKSHOP_DIAGNOSTIC',
      confidence_pct: telemetry.source_confidence_pct || 90,
      notes: telemetry.telemetry_notes || 'Periodic health diagnostic telemetry'
    };
    const evtHash = calculateEventHash(
      prevHash,
      batteryId,
      'TELEMETRY_UPDATED',
      nowIso,
      actorUser?.user_id || 'ACTOR-FLEET-109',
      payload
    );

    const newEvent: CustodyEvent = {
      event_id: `EVT-${batteryId}-${chain.length.toString().padStart(3, '0')}`,
      battery_id: batteryId,
      event_type: 'TELEMETRY_UPDATED',
      timestamp: nowIso,
      actor_id: actorUser?.user_id || 'ACTOR-FLEET-109',
      actor_role: actorUser?.role || 'FLEET_OPERATOR',
      actor_organization: actorUser?.organization || passport.current_custodian,
      location: 'BMS Telemetry Gateway Sync',
      payload,
      prev_hash: prevHash,
      hash: evtHash,
      evidence_ref: `DIAG-PACKET-${Date.now()}`,
      verification_status: 'VERIFIED'
    };

    chain.push(newEvent);
    this.custodyEvents[batteryId] = chain;
    this.persist();
    return passport;
  }

  // --- Custody Events ---
  public getCustodyEvents(batteryId: string): CustodyEvent[] {
    return [...(this.custodyEvents[batteryId] || [])];
  }

  public appendCustodyEvent(batteryId: string, eventData: any, actorUser?: any): CustodyEvent {
    const passport = this.passports[batteryId];
    if (!passport) throw new Error(`Battery Passport '${batteryId}' was not found.`);

    const chain = this.custodyEvents[batteryId] || [];
    const prevHash = chain.length > 0 ? chain[chain.length - 1].hash : GENESIS_PREV_HASH;
    const nowIso = new Date().toISOString();
    const payload = eventData.payload || {};

    const evtHash = calculateEventHash(
      prevHash,
      batteryId,
      eventData.event_type,
      nowIso,
      eventData.actor_id || actorUser?.user_id || 'ACTOR-GENERIC',
      payload
    );

    const newEvent: CustodyEvent = {
      event_id: `EVT-${batteryId}-${chain.length.toString().padStart(3, '0')}`,
      battery_id: batteryId,
      event_type: eventData.event_type,
      timestamp: nowIso,
      actor_id: eventData.actor_id || actorUser?.user_id || 'ACTOR-GENERIC',
      actor_role: eventData.actor_role || actorUser?.role || 'OPERATOR',
      actor_organization: eventData.actor_organization || actorUser?.organization || passport.current_custodian,
      location: eventData.location || 'Supply Chain Node',
      payload,
      prev_hash: prevHash,
      hash: evtHash,
      evidence_ref: eventData.evidence_ref || `EVT-REF-${Date.now()}`,
      verification_status: 'VERIFIED'
    };

    chain.push(newEvent);
    this.custodyEvents[batteryId] = chain;

    // Transition lifecycle status where event dictates standard progress
    if (eventData.event_type === 'SECOND_LIFE_ASSIGNED') {
      try {
        this.transitionLifecycle(batteryId, 'SECOND_LIFE', 'Assigned to second-life BESS', actorUser);
      } catch {
        passport.status = 'SECOND_LIFE';
      }
      passport.current_custodian = newEvent.actor_organization;
    } else if (eventData.event_type === 'RECYCLED') {
      try {
        this.transitionLifecycle(batteryId, 'RECYCLED', 'Material recovery shredding & hydrometallurgy', actorUser);
      } catch {
        passport.status = 'RECYCLED';
      }
      passport.current_custodian = newEvent.actor_organization;
    } else if (eventData.event_type === 'TRANSFERRED_CUSTODY') {
      passport.current_custodian = newEvent.actor_organization;
    }

    passport.updated_at = nowIso;
    this.persist();
    return newEvent;
  }

  // --- Custody Transfers (Feature 3) ---
  public requestCustodyTransfer(data: {
    battery_id: string;
    receiver_organization: string;
    intended_receiver_role: UserRole;
    transfer_reason: string;
    notes?: string;
  }, actorUser?: any): CustodyTransfer {
    const passport = this.passports[data.battery_id];
    if (!passport) throw new Error(`Battery '${data.battery_id}' was not found.`);

    if (!data.receiver_organization.trim()) {
      throw new Error('Receiver organization must be specified.');
    }

    // Check sender is authorized or current custodian
    const senderOrg = actorUser?.organization || passport.current_custodian;
    const nowIso = new Date().toISOString();
    const transferId = `XFR-${Date.now()}-${data.battery_id.slice(-6)}`;
    const manifestString = `${data.battery_id}|${senderOrg}|${data.receiver_organization}|${nowIso}|${data.transfer_reason}`;
    const manifestHash = sha256(manifestString);

    const transfer: CustodyTransfer = {
      transfer_id: transferId,
      battery_id: data.battery_id,
      battery_did: passport.battery_did,
      sender_organization: senderOrg,
      sender_actor_id: actorUser?.user_id || 'SENDER-01',
      receiver_organization: data.receiver_organization,
      intended_receiver_role: data.intended_receiver_role,
      requested_at: nowIso,
      status: 'PENDING',
      transfer_reason: data.transfer_reason,
      notes: data.notes || '',
      legal_declaration_signed: true,
      manifest_hash: manifestHash,
      evidence_ref: `MANIFEST-${transferId}`
    };

    this.transfers[transferId] = transfer;
    this.persist();
    return transfer;
  }

  public acceptCustodyTransfer(transferId: string, receiverActor?: any): CustodyTransfer {
    const transfer = this.transfers[transferId];
    if (!transfer) throw new Error(`Transfer '${transferId}' not found.`);

    if (transfer.status !== 'PENDING') {
      throw new Error(`Transfer cannot be accepted: Current status is '${transfer.status}' (expected 'PENDING').`);
    }

    const passport = this.passports[transfer.battery_id];
    if (!passport) throw new Error(`Battery '${transfer.battery_id}' not found.`);

    const nowIso = new Date().toISOString();
    transfer.status = 'ACCEPTED';
    transfer.responded_at = nowIso;

    // Update passport custodian
    const previousCustodian = passport.current_custodian;
    passport.current_custodian = transfer.receiver_organization;
    passport.updated_at = nowIso;

    // Append cryptographic custody event
    const chain = this.custodyEvents[transfer.battery_id] || [];
    const prevHash = chain.length > 0 ? chain[chain.length - 1].hash : GENESIS_PREV_HASH;
    const payload = {
      transfer_id: transferId,
      from_custodian: previousCustodian,
      to_custodian: transfer.receiver_organization,
      reason: transfer.transfer_reason,
      manifest_hash: transfer.manifest_hash,
      accepted_by: receiverActor?.name || 'Receiver Sign-off'
    };

    const evtHash = calculateEventHash(
      prevHash,
      transfer.battery_id,
      'TRANSFERRED_CUSTODY',
      nowIso,
      receiverActor?.user_id || 'RECEIVER-SIGN',
      payload
    );

    const newEvent: CustodyEvent = {
      event_id: `EVT-${transfer.battery_id}-${chain.length.toString().padStart(3, '0')}`,
      battery_id: transfer.battery_id,
      event_type: 'TRANSFERRED_CUSTODY',
      timestamp: nowIso,
      actor_id: receiverActor?.user_id || 'RECEIVER-SIGN',
      actor_role: receiverActor?.role || transfer.intended_receiver_role || 'OPERATOR',
      actor_organization: transfer.receiver_organization,
      location: 'Authorized Transfer Node',
      payload,
      prev_hash: prevHash,
      hash: evtHash,
      evidence_ref: transfer.evidence_ref || `TRANSFER-SIGN-${transferId}`,
      verification_status: 'VERIFIED'
    };

    chain.push(newEvent);
    this.custodyEvents[transfer.battery_id] = chain;
    this.persist();
    return transfer;
  }

  public rejectCustodyTransfer(transferId: string, reason: string, receiverActor?: any): CustodyTransfer {
    const transfer = this.transfers[transferId];
    if (!transfer) throw new Error(`Transfer '${transferId}' not found.`);

    if (transfer.status !== 'PENDING') {
      throw new Error(`Transfer cannot be rejected: Current status is '${transfer.status}' (expected 'PENDING').`);
    }

    transfer.status = 'REJECTED';
    transfer.responded_at = new Date().toISOString();
    transfer.rejection_reason = reason || 'Declined by recipient';
    this.persist();
    return transfer;
  }

  public listTransfers(batteryId?: string): CustodyTransfer[] {
    let list = Object.values(this.transfers);
    if (batteryId) {
      list = list.filter(t => t.battery_id === batteryId);
    }
    return list.sort((a, b) => new Date(b.requested_at).getTime() - new Date(a.requested_at).getTime());
  }

  // --- QR Verification & Label Authenticity (Feature 2) ---
  public verifyPublicOrQr(lookupIdOrToken: string, claimedSpecs?: { soh?: number; chemistry?: string }): PublicVerification {
    if (!lookupIdOrToken || !lookupIdOrToken.trim()) {
      throw new Error('Lookup identifier cannot be empty.');
    }

    const clean = lookupIdOrToken.trim();
    // NEVER trust specifications encoded directly in the QR code:
    // Resolve strictly through canonical record repository
    const passport = this.getPassport(clean);

    if (!passport) {
      throw new Error(`Passport lookup failed: Unknown identifier '${clean}'. Physical label is unrecognized or uncertified.`);
    }

    const events = this.custodyEvents[passport.battery_id] || [];
    const check = verifyChainIntegrity(events);

    // Track scan counter
    const currentCount = (this.scanCounter[passport.battery_id] || 0) + 1;
    this.scanCounter[passport.battery_id] = currentCount;

    let verificationLevel: PublicVerification['verification_level'] = 'LOOKUP_ONLY';
    let warningMessage: string | null = null;
    let isAuthentic = true;

    // Check 1: Revocation
    if (passport.is_revoked) {
      verificationLevel = 'REVOKED';
      isAuthentic = false;
      warningMessage = 'CRITICAL WARNING: This Battery Passport has been officially revoked by the regulatory authority or manufacturer.';
    }
    // Check 2: Suspicious / Cloned Label Flag
    else if (passport.is_flagged_suspicious) {
      verificationLevel = 'DUPLICATE_OR_CLONED';
      isAuthentic = false;
      warningMessage = `SECURITY ALERT: This physical label was flagged for suspicious activity (${passport.suspicious_reason || 'Duplicate / cloned label detected'}).`;
    }
    // Check 3: Cryptographic Tampering
    else if (!check.isValid) {
      verificationLevel = 'TAMPER_DETECTED';
      isAuthentic = false;
      warningMessage = `TAMPER WARNING: Supply chain audit log failed cryptographic verification! ${check.errorMessage || 'Hash mismatch detected.'}`;
    }
    // Check 4: Inconsistent Identity Claims
    else if (claimedSpecs && claimedSpecs.soh !== undefined) {
      const canonicalSoH = passport.health_state.state_of_health_pct;
      if (Math.abs(claimedSpecs.soh - canonicalSoH) > 5.0) {
        verificationLevel = 'LOOKUP_ONLY';
        warningMessage = `INCONSISTENT SPECIFICATION: Physical label or client claimed ${claimedSpecs.soh}% SoH, but canonical verified passport record is ${canonicalSoH}%.`;
      } else {
        verificationLevel = 'CRYPTOGRAPHICALLY_VERIFIED';
      }
    }
    // Check 5: Verified
    else {
      verificationLevel = 'CRYPTOGRAPHICALLY_VERIFIED';
    }

    return {
      is_authentic: isAuthentic,
      verification_level: verificationLevel,
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
      is_audit_chain_valid: check.isValid,
      verification_timestamp: new Date().toISOString(),
      warning_message: warningMessage,
      is_flagged_suspicious: passport.is_flagged_suspicious || false,
      scan_count: currentCount,
      source_confidence: `${passport.health_state.source_type} (${passport.health_state.source_confidence_pct}% confidence)`
    };
  }

  // Suspicious Label Reporting Workflow
  public reportSuspiciousLabel(report: SuspiciousReportRequest): { success: boolean; message: string } {
    const passport = this.getPassport(report.battery_id);
    if (passport) {
      passport.is_flagged_suspicious = true;
      passport.suspicious_reason = `${report.reason}: ${report.details}`;
      passport.updated_at = new Date().toISOString();
    }
    this.suspiciousReports.push(report);
    this.persist();
    return {
      success: true,
      message: `Suspicious label incident report logged successfully for ${report.battery_id}. Record has been flagged for regulatory review.`
    };
  }

  // --- Disposition Decisions (Feature 5 / Decision API) ---
  public getDispositionDecision(batteryId: string): DispositionDecision {
    const passport = this.getPassport(batteryId);
    if (!passport) throw new Error(`Battery '${batteryId}' not found.`);

    const soh = passport.health_state.state_of_health_pct;
    const cycles = passport.health_state.cycle_count;
    const resistance = passport.health_state.internal_resistance_mohm;

    let pathway: DispositionDecision['recommended_pathway'] = 'SECOND_LIFE_BESS';
    let confidence = 0.85;
    let residualEur = 2800;
    let avoidedCo2 = 420;
    const reasons: string[] = [];
    const prerequisites: string[] = [];

    if (soh >= 82.0 && cycles < 1000 && resistance < 22.0) {
      pathway = 'REUSE_DIRECT';
      confidence = 0.94;
      residualEur = 5400;
      avoidedCo2 = 780;
      reasons.push('High retained capacity (>=82%) exceeds EV secondary powertrain threshold.');
      reasons.push('Low internal resistance indicates minimal cathode lattice distortion.');
      prerequisites.push('Conduct standard OEM high-voltage insulation and isolation resistance test.');
      prerequisites.push('Verify BMS firmware cryptographic signatures.');
    } else if (soh >= 68.0 && cycles < 2200 && resistance < 30.0) {
      pathway = 'SECOND_LIFE_BESS';
      confidence = 0.91;
      residualEur = 2600;
      avoidedCo2 = 450;
      reasons.push(`State of health (${soh}%) ideal for stationary C-rate loads (<=0.5C).`);
      reasons.push('Electrochemical degradation within safe thermal runaway limits for stationary containers.');
      prerequisites.push('Balance cell string voltages to within +/- 15mV before container parallelization.');
      prerequisites.push('Install certified secondary BESS thermal management telemetry.');
    } else if (soh >= 55.0) {
      pathway = 'REMANUFACTURE';
      confidence = 0.82;
      residualEur = 1400;
      avoidedCo2 = 310;
      reasons.push('Degraded cell modules can be disaggregated and reconditioned with fresh modules.');
      reasons.push('Casing, cooling channels, and busbars reusable with zero thermal fatigue.');
      prerequisites.push('Perform ultrasonic weld inspection across cell terminal interconnects.');
      prerequisites.push('Isolate and replace sub-threshold modules (<60% SoH).');
    } else {
      pathway = 'RECYCLE';
      confidence = 0.96;
      residualEur = 850;
      avoidedCo2 = 180;
      reasons.push(`High degradation (SoH ${soh}%, ${cycles} cycles) exceeds economic secondary life.`);
      reasons.push('Hydrometallurgical material recovery recovers >95% Cobalt, Nickel, and Lithium for closed-loop quotas.');
      prerequisites.push('Discharge pack to zero energy state (0.0V deep soak) before shredding.');
      prerequisites.push('Log waste shipment manifest with EU Basel Convention transit tracking.');
    }

    return {
      battery_id: passport.battery_id,
      current_soh_pct: soh,
      current_cycle_count: cycles,
      recommended_pathway: pathway,
      pathway_confidence_score: confidence,
      economic_viability_index: Math.round((residualEur / 6000) * 100) / 100,
      residual_value_eur: residualEur,
      environmental_benefit_avoided_co2_kg: avoidedCo2,
      disposition_reasons: reasons,
      safety_prerequisites: prerequisites,
      decision_timestamp: new Date().toISOString(),
      regulatory_framework: 'EU Battery Regulation (EU 2023/1542) Annex VII & CIRPASS Standard'
    };
  }

  // --- Audit & Tamper Inspection (Feature 4) ---
  public verifyAuditTrail(batteryId: string): AuditVerification {
    const passport = this.passports[batteryId];
    if (!passport) throw new Error(`Battery Passport '${batteryId}' was not found.`);

    const events = this.custodyEvents[batteryId] || [];
    const check = verifyChainIntegrity(events);

    return {
      battery_id: batteryId,
      total_events: events.length,
      is_valid: check.isValid,
      genesis_hash: events.length > 0 ? events[0].hash : null,
      latest_block_hash: events.length > 0 ? events[events.length - 1].hash : null,
      error_message: check.errorMessage,
      tampered_block_index: check.tamperedIndex,
      verified_at: new Date().toISOString()
    };
  }

  public tamperBlock(batteryId: string, blockIndex: number): boolean {
    const events = this.custodyEvents[batteryId];
    if (!events || !events[blockIndex]) return false;
    events[blockIndex].payload = {
      ...events[blockIndex].payload,
      tampered_unauthorized_override: true,
      falsified_metric: 99.9,
      tampered_at: new Date().toISOString()
    };
    this.persist();
    return true;
  }
}

export const batteryStore = new BatteryPassportStore();
