export type UserRole = 
  | 'MANUFACTURER'
  | 'OEM'
  | 'FLEET_OPERATOR'
  | 'RECYCLER'
  | 'REGULATOR_AUDITOR'
  | 'PUBLIC';

export type LifecycleStatus =
  | 'MANUFACTURED'
  | 'IN_SERVICE'
  | 'INSPECTION'
  | 'REPAIR'
  | 'SECOND_LIFE_ASSESSMENT'
  | 'SECOND_LIFE'
  | 'REMANUFACTURED'
  | 'END_OF_LIFE'
  | 'RECYCLED';

export const VALID_LIFECYCLE_TRANSITIONS: Record<LifecycleStatus, LifecycleStatus[]> = {
  MANUFACTURED: ['IN_SERVICE', 'INSPECTION'],
  IN_SERVICE: ['INSPECTION', 'REPAIR', 'SECOND_LIFE_ASSESSMENT'],
  INSPECTION: ['IN_SERVICE', 'REPAIR', 'SECOND_LIFE_ASSESSMENT', 'END_OF_LIFE'],
  REPAIR: ['INSPECTION', 'IN_SERVICE'],
  SECOND_LIFE_ASSESSMENT: ['SECOND_LIFE', 'REMANUFACTURED', 'END_OF_LIFE'],
  SECOND_LIFE: ['INSPECTION', 'REPAIR', 'END_OF_LIFE'],
  REMANUFACTURED: ['IN_SERVICE', 'INSPECTION'],
  END_OF_LIFE: ['RECYCLED'],
  RECYCLED: [], // terminal state
};

export interface TechnicalSpecs {
  rated_capacity_kwh: number;
  nominal_voltage_v: number;
  max_charge_power_kw: number;
  cell_count: number;
  pack_weight_kg: number;
  temperature_range_min_c?: number;
  temperature_range_max_c?: number;
  cell_chemistry_detail?: string;
  energy_density_wh_kg?: number;
  max_continuous_discharge_a?: number;
}

export interface CarbonFootprint {
  total_co2_kg_per_kwh: number;
  manufacturing_co2_kg: number;
  raw_materials_co2_kg: number;
  transport_co2_kg: number;
  eu_compliance_class: string;
}

export interface RecycledContent {
  cobalt_percentage: number;
  lithium_percentage: number;
  nickel_percentage: number;
  lead_percentage: number;
}

export interface HealthState {
  state_of_health_pct: number;
  state_of_charge_pct: number;
  cycle_count: number;
  internal_resistance_mohm: number;
  capacity_fade_rate_pct_yr: number;
  last_telemetry_timestamp: string;
  source_type: 'BMS_DIRECT_TELEMETRY' | 'WORKSHOP_DIAGNOSTIC' | 'THIRD_PARTY_EVALUATION' | 'SELF_REPORTED';
  source_confidence_pct: number;
  source_device_id?: string;
  data_classification: 'VERIFIED_FACT' | 'REPORTED_INFO' | 'ESTIMATED';
  cell_voltage_deviation_mv?: number;
  max_pack_temperature_c?: number;
}

export interface WarrantyInfo {
  warranty_id: string;
  provider: string;
  coverage_type: string;
  valid_until: string;
  max_cycles_covered: number;
  capacity_retention_guarantee_pct: number;
  status: 'ACTIVE' | 'EXPIRED' | 'CLAIM_PENDING' | 'VOIDED';
  terms_summary: string;
}

export interface InspectionRecord {
  inspection_id: string;
  inspection_date: string;
  inspector_name: string;
  inspector_organization: string;
  inspection_facility: string;
  result: 'PASS' | 'ADVISORY' | 'FAIL' | 'SECOND_LIFE_ELIGIBLE';
  mechanical_integrity: 'SOUND' | 'MINOR_DENT' | 'DEFORMED';
  thermal_damage_detected: boolean;
  moisture_ingress_detected: boolean;
  notes: string;
  evidence_ref?: string;
}

export interface BatteryPassport {
  battery_did: string;
  battery_id: string;
  serial_number: string;
  manufacturer_name: string;
  model_designation: string;
  chemistry: string;
  manufacturing_date: string;
  manufacturing_country: string;
  manufacturing_facility: string;
  status: LifecycleStatus;
  current_custodian: string;
  current_vehicle_vin?: string | null;
  technical_specs: TechnicalSpecs;
  carbon_footprint: CarbonFootprint;
  recycled_content: RecycledContent;
  health_state: HealthState;
  warranty?: WarrantyInfo;
  latest_inspection?: InspectionRecord;
  qr_code_url: string;
  qr_lookup_identifier: string;
  is_flagged_suspicious?: boolean;
  suspicious_reason?: string | null;
  is_revoked?: boolean;
  created_at: string;
  updated_at: string;
}

export interface PassportSummary {
  battery_id: string;
  battery_did: string;
  serial_number: string;
  manufacturer_name: string;
  chemistry: string;
  status: string;
  current_custodian: string;
  state_of_health_pct: number;
  rated_capacity_kwh: number;
  updated_at: string;
  is_flagged_suspicious?: boolean;
}

export interface CustodyEvent {
  event_id: string;
  battery_id: string;
  event_type: string;
  timestamp: string;
  actor_id: string;
  actor_role: string;
  actor_organization: string;
  location: string;
  payload: Record<string, any>;
  prev_hash: string;
  hash: string;
  evidence_ref?: string;
  verification_status?: 'VERIFIED' | 'LOOKUP_ONLY' | 'UNVERIFIED' | 'SUSPICIOUS';
}

export type TransferStatus = 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'CANCELLED';

export interface CustodyTransfer {
  transfer_id: string;
  battery_id: string;
  battery_did: string;
  sender_organization: string;
  sender_actor_id: string;
  receiver_organization: string;
  intended_receiver_role: UserRole;
  requested_at: string;
  responded_at?: string;
  status: TransferStatus;
  transfer_reason: string;
  notes?: string;
  legal_declaration_signed: boolean;
  manifest_hash: string;
  evidence_ref?: string;
  rejection_reason?: string;
}

export interface AuditVerification {
  battery_id: string;
  total_events: number;
  is_valid: boolean;
  genesis_hash: string | null;
  latest_block_hash: string | null;
  error_message?: string | null;
  tampered_block_index?: number | null;
  verified_at: string;
}

export interface PublicVerification {
  is_authentic: boolean;
  verification_level: 'CRYPTOGRAPHICALLY_VERIFIED' | 'LOOKUP_ONLY' | 'VERIFICATION_UNAVAILABLE' | 'TAMPER_DETECTED' | 'DUPLICATE_OR_CLONED' | 'REVOKED';
  battery_id: string;
  battery_did: string;
  manufacturer_name: string;
  model_designation: string;
  chemistry: string;
  manufacturing_date: string;
  status: string;
  state_of_health_pct: number;
  carbon_footprint_total: number;
  eu_compliance_class: string;
  total_custody_events: number;
  is_audit_chain_valid: boolean;
  verification_timestamp: string;
  warning_message?: string | null;
  is_flagged_suspicious?: boolean;
  scan_count?: number;
  source_confidence?: string;
}

export interface SuspiciousReportRequest {
  battery_id: string;
  reporter_role: string;
  reporter_org: string;
  location: string;
  reason: 'DUPLICATE_PHYSICAL_LABEL' | 'CLONED_QR_CODE' | 'INCONSISTENT_SPECIFICATIONS' | 'PHYSICAL_TAMPERING' | 'OTHER';
  details: string;
  claimed_soh_pct?: number;
}

export interface DispositionDecision {
  battery_id: string;
  current_soh_pct: number;
  current_cycle_count: number;
  recommended_pathway: 'REUSE_DIRECT' | 'SECOND_LIFE_BESS' | 'REMANUFACTURE' | 'RECYCLE';
  pathway_confidence_score: number;
  economic_viability_index: number;
  residual_value_eur: number;
  environmental_benefit_avoided_co2_kg: number;
  disposition_reasons: string[];
  safety_prerequisites: string[];
  decision_timestamp: string;
  regulatory_framework: string;
}

export interface QpiAIOptResponse {
  status: 'SUCCESS' | 'SUBMITTED' | 'NOT_CONFIGURED' | 'ERROR';
  configured: boolean;
  problem_type: string;
  num_variables: number;
  qubo_edges_count: number;
  qubo_sample_matrix: Record<string, number>;
  objective_value?: number | null;
  recommended_allocations?: Record<string, string> | null;
  execution_time_seconds?: number | null;
  job_id?: string | null;
  message: string;
  instructions?: string | null;
}

export interface QpiAIQuantumResponse {
  status: 'SUCCESS' | 'SUBMITTED' | 'SIMULATION_COMPLETED' | 'AUTH_REQUIRED' | 'ERROR';
  configured_for_cloud: boolean;
  backend_used: string;
  num_qubits: number;
  circuit_depth: number;
  quantum_gate_counts: Record<string, number>;
  measured_probabilities: Record<string, number>;
  estimated_ground_state_energy_hartree: number;
  projected_capacity_fade_rate: number;
  molecular_degradation_risk: string;
  message: string;
  instructions?: string | null;
}
