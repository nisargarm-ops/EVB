export type UserRole = 
  | 'MANUFACTURER'
  | 'OEM'
  | 'FLEET_OPERATOR'
  | 'RECYCLER'
  | 'REGULATOR_AUDITOR'
  | 'PUBLIC';

export interface TechnicalSpecs {
  rated_capacity_kwh: number;
  nominal_voltage_v: number;
  max_charge_power_kw: number;
  cell_count: number;
  pack_weight_kg: number;
  temperature_range_min_c?: number;
  temperature_range_max_c?: number;
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
  status: 'MANUFACTURED' | 'IN_SERVICE' | 'SECOND_LIFE' | 'END_OF_LIFE' | 'RECYCLED';
  current_custodian: string;
  current_vehicle_vin?: string | null;
  technical_specs: TechnicalSpecs;
  carbon_footprint: CarbonFootprint;
  recycled_content: RecycledContent;
  health_state: HealthState;
  qr_code_url: string;
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

export type QRVerificationState = 'VERIFIED' | 'NEEDS_REVIEW' | 'INVALID' | 'REVOKED';

export interface PublicVerification {
  is_authentic: boolean;
  state: QRVerificationState;
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
  notes?: string;
}

export interface CustodyTransferRecord {
  transfer_id: string;
  battery_id: string;
  from_custodian: string;
  from_role: UserRole;
  to_custodian: string;
  to_role: UserRole;
  transfer_location: string;
  condition_grade: string;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED';
  odometer_km?: number;
  notes?: string;
  created_at: string;
  completed_at?: string;
  tx_hash?: string;
}

export interface DecisionRecommendation {
  battery_id: string;
  chemistry: string;
  current_soh: number;
  cycle_count: number;
  primary_recommendation: 'STATIONARY_BESS' | 'CELL_RECONDITIONING' | 'DEEP_RECYCLING';
  confidence_score: number;
  residual_capacity_kwh: number;
  estimated_second_life_years: number;
  avoided_co2_kg: number;
  material_recovery_value_eur: number;
  rationale: string[];
  qpiai_opt_recommended: boolean;
}

export interface IntegrationStatusItem {
  id: string;
  name: string;
  category: 'CORE_API' | 'STORAGE' | 'SECURITY' | 'OPTIMIZATION' | 'COMPLIANCE';
  status: 'ONLINE' | 'STANDBY' | 'DEGRADED' | 'CONFIG_REQUIRED';
  endpoint_url: string;
  latency_ms: number;
  auth_configured: boolean;
  details: string;
  last_checked: string;
}

export interface OrganizationMember {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  organization: string;
  verified: boolean;
  permissions: string[];
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
