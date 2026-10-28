import type { BatteryPassport, CustodyEvent } from '../types/index.ts';
import {
  GENESIS_PREV_HASH,
  calculateEventHash,
  generateImmutableBatteryId,
  verifyChainIntegrity,
} from './hasher.ts';

export class InMemoryBatteryRepository {
  private passports: Map<string, BatteryPassport> = new Map();
  private custodyEvents: Map<string, CustodyEvent[]> = new Map();

  constructor() {
    this.seedInitialData();
  }

  private seedInitialData(): void {
    // 1. NMC 811 Battery (In Service, High Performance EV Pack)
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
        temperature_range_min_c: -20.0,
        temperature_range_max_c: 55.0,
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

    const ev1_0_payload = {
      batch_id: 'BATCH-2024-Q1-90',
      quality_grade: 'A+',
      initial_soh: 100.0,
    };
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

    const ev1_1_payload = {
      vehicle_vin: 'WAUZZZF28NA091244',
      model: 'Apex GT Sedan',
      inverter_kw: 250,
    };
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

    const ev1_2_payload = {
      fleet_id: 'FLEET-BER-88',
      current_soh: 88.4,
      odometer_km: 68500,
    };
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

    // 2. LFP Battery (Second Life Assigned to Stationary BESS)
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
        temperature_range_min_c: -20.0,
        temperature_range_max_c: 55.0,
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

    const ev2_0_payload = { batch_id: 'NBS-LFP-Q2' };
    const ev2_0_hash = calculateEventHash(
      GENESIS_PREV_HASH,
      p2.battery_id,
      'MANUFACTURED',
      '2023-05-10T10:00:00Z',
      'ACTOR-MFG-002',
      ev2_0_payload
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
      payload: ev2_0_payload,
      prev_hash: GENESIS_PREV_HASH,
      hash: ev2_0_hash,
    };

    const ev2_1_payload = {
      repurposing_application: 'Stationary Solar BESS',
      tested_soh: 76.8,
    };
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

    // 3. End of Life Battery (Ready for QpiAI-Opt Logistics / Recycling)
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
        temperature_range_min_c: -20.0,
        temperature_range_max_c: 55.0,
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

    const ev3_0_payload = { batch_id: 'REC-NCA-2021' };
    const ev3_0_hash = calculateEventHash(
      GENESIS_PREV_HASH,
      p3.battery_id,
      'MANUFACTURED',
      '2021-08-20T08:00:00Z',
      'ACTOR-MFG-003',
      ev3_0_payload
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
      payload: ev3_0_payload,
      prev_hash: GENESIS_PREV_HASH,
      hash: ev3_0_hash,
    };
    this.custodyEvents.set(p3.battery_id, [ev3_0]);
  }

  async getAllPassports(): Promise<BatteryPassport[]> {
    return Array.from(this.passports.values());
  }

  async getPassportById(batteryId: string): Promise<BatteryPassport | null> {
    if (this.passports.has(batteryId)) {
      return this.passports.get(batteryId) ?? null;
    }
    for (const p of this.passports.values()) {
      if (p.battery_did === batteryId || p.serial_number === batteryId) {
        return p;
      }
    }
    return null;
  }

  async createPassport(passport: BatteryPassport): Promise<BatteryPassport> {
    this.passports.set(passport.battery_id, passport);
    return passport;
  }

  async updatePassport(
    batteryId: string,
    updates: Partial<BatteryPassport>
  ): Promise<BatteryPassport | null> {
    const passport = this.passports.get(batteryId);
    if (!passport) return null;

    const updated: BatteryPassport = {
      ...passport,
      ...updates,
      updated_at: new Date().toISOString(),
    };
    this.passports.set(batteryId, updated);
    return updated;
  }

  async getCustodyEvents(batteryId: string): Promise<CustodyEvent[]> {
    return [...(this.custodyEvents.get(batteryId) ?? [])];
  }

  async appendCustodyEvent(event: CustodyEvent): Promise<CustodyEvent> {
    const chain = this.custodyEvents.get(event.battery_id) ?? [];
    const expectedPrev = chain.length > 0 ? chain[chain.length - 1].hash : GENESIS_PREV_HASH;
    const actualHash = calculateEventHash(
      expectedPrev,
      event.battery_id,
      String(event.event_type),
      event.timestamp,
      event.actor_id,
      event.payload
    );

    const verifiedEvent: CustodyEvent = {
      ...event,
      prev_hash: expectedPrev,
      hash: actualHash,
    };
    chain.push(verifiedEvent);
    this.custodyEvents.set(event.battery_id, chain);
    return verifiedEvent;
  }

  async verifyAuditTrail(batteryId: string): Promise<{
    isValid: boolean;
    errorMessage: string | null;
    tamperedIndex: number | null;
  }> {
    const events = this.custodyEvents.get(batteryId) ?? [];
    return verifyChainIntegrity(events);
  }
}

let repoInstance: InMemoryBatteryRepository | null = null;

export function getRepository(): InMemoryBatteryRepository {
  if (!repoInstance) {
    repoInstance = new InMemoryBatteryRepository();
  }
  return repoInstance;
}
