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
  | 'SECOND_LIFE'
  | 'END_OF_LIFE'
  | 'RECYCLED';

export type CustodyEventType =
  | 'MANUFACTURED'
  | 'OEM_ASSEMBLED'
  | 'REGISTERED_FLEET'
  | 'MAINTENANCE_LOGGED'
  | 'TELEMETRY_UPDATED'
  | 'TRANSFERRED_CUSTODY'
  | 'SECOND_LIFE_ASSIGNED'
  | 'DECOMMISSIONED'
  | 'RECYCLED';

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
  status: LifecycleStatus;
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

export interface PublicVerification {
  is_authentic: boolean;
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

// Structured QpiAI Opt & QCloud contracts
export type IntegrationHealthState =
  | 'configured_and_reachable'
  | 'configured_but_unavailable'
  | 'missing_credentials'
  | 'simulator_only'
  | 'demo_mode'
  | 'execution_error';

export type DispositionPathway =
  | 'direct_reuse'
  | 'second_life_bess'
  | 'remanufacturing'
  | 'material_recycling';

export type PredefinedQuantumExperiment =
  | 'telemetry_anomaly_ising'
  | 'toy_disposition_ising_2pack'
  | 'bell_calibration_check';

export type SupportedQpiAIBackend =
  | 'QpiAI-QSV-Local'
  | 'QpiAI-QSV-Simulator'
  | 'QpiAI-QDM-Simulator'
  | 'QpiAI-QTN-Simulator'
  | 'QpiAI-Indus-1';

export interface ServiceIntegrationStatus {
  service_name: string;
  status: IntegrationHealthState;
  sdk_package: string;
  sdk_installed: boolean;
  credentials_configured: boolean;
  endpoint_url: string;
  active_execution_mode: string;
  supported_backends?: readonly string[];
  diagnostic_message: string;
  setup_instructions: string[];
}

export interface IntegrationsStatusResponse {
  checked_at: string;
  overall_summary: string;
  qpiai_opt: ServiceIntegrationStatus;
  qpiai_qcloud: ServiceIntegrationStatus;
}

export interface PathwayEligibilityDetail {
  pathway: DispositionPathway;
  eligible: boolean;
  rule_category: 'authoritative_safety_or_lifecycle' | 'configurable_demo_threshold' | 'eligible';
  reasons: string[];
  estimated_net_value_eur: number;
  estimated_net_co2_kg: number;
  linear_objective_score: number;
}

export interface BatteryAllocationDecision {
  battery_id: string;
  selected_pathway: DispositionPathway | null;
  estimated_net_value_eur: number | null;
  estimated_net_co2_kg: number | null;
  available_energy_kwh: number;
  rationale: string;
  pathway_evaluations: PathwayEligibilityDetail[];
}

export interface ConstraintSummaryItem {
  constraint_id: string;
  category: 'hard_authoritative' | 'hard_capacity' | 'configurable_eligibility';
  description: string;
  satisfied: boolean;
  details: string;
}

export interface OptimizationRunResponse {
  solver_status: string;
  solver_name: string;
  execution_mode: string;
  is_demo: boolean;
  is_live_qpiai_execution: boolean;
  objective_value: number | null;
  qubo_metadata: {
    problem_type: 'QUBO';
    num_binary_variables: number;
    num_qubo_edges: number;
    penalty_multiplier: number;
    sample_edges: Record<string, number>;
  };
  allocations: BatteryAllocationDecision[];
  constraints_considered: ConstraintSummaryItem[];
  assumptions_and_weights: {
    objective_weights: {
      economic_value_weight: number;
      carbon_impact_weight: number;
      degradation_risk_weight: number;
    };
    configurable_demo_thresholds: Record<string, number>;
    methodology_notes: string[];
  };
  data_completeness: {
    overall_completeness_pct: number;
    complete_batteries_count: number;
    total_batteries_count: number;
    missing_or_imputed_fields: Record<string, string[]>;
    warnings: string[];
  };
  execution_time_ms: number | null;
  job_id: string | null;
  message: string;
}

export interface QuantumRunResponse {
  execution_status: string;
  experiment_type: PredefinedQuantumExperiment;
  experiment_title: string;
  scientific_purpose_and_limits: string;
  variable_encoding_map: Record<string, string>;
  backend_requested: string;
  backend_used: string | null;
  execution_mode: string;
  is_simulated: boolean;
  is_cloud_execution: boolean;
  is_demo: boolean;
  circuit_summary: {
    num_qubits: number;
    num_clbits: number;
    circuit_depth: number;
    gate_counts: Record<string, number>;
    rotation_angles_rad: Record<string, number>;
  };
  shots_requested: number;
  measurement_counts: Record<string, number> | null;
  measurement_probabilities: Record<string, number> | null;
  device_metadata: Record<string, any> | null;
  execution_time_ms: number | null;
  job_id: string | null;
  message: string;
}
