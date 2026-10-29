export type UserRole = 
  | 'MANUFACTURER'
  | 'OEM'
  | 'FLEET_OPERATOR'
  | 'SERVICE_CENTER'
  | 'REMANUFACTURER'
  | 'RECYCLER'
  | 'REGULATOR_AUDITOR'
  | 'ADMINISTRATOR'
  | 'PUBLIC';

export interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  organization_id: string;
  organization_name: string;
}

export type OrganizationType = 
  | 'MANUFACTURER'
  | 'OEM'
  | 'FLEET_OPERATOR'
  | 'SERVICE_CENTER'
  | 'REMANUFACTURER'
  | 'RECYCLER'
  | 'REGULATOR_AUDITOR'
  | 'ADMINISTRATOR';

export interface Organization {
  id: string;
  name: string;
  org_type: string;
  type?: OrganizationType | string;
  registration_number: string;
  country: string;
  facility_location: string;
  facility_id?: string;
  contact_email: string;
  is_verified: boolean;
  created_at: string;
}

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
  id?: string;
  battery_did: string;
  battery_id: string;
  serial_number: string;
  manufacturer_name: string;
  model_designation: string;
  chemistry: string;
  manufacturing_date: string;
  manufacturing_country: string;
  manufacturing_facility: string;
  status: 'MANUFACTURED' | 'IN_SERVICE' | 'MAINTENANCE' | 'SECOND_LIFE' | 'END_OF_LIFE' | 'RECYCLED' | 'DECOMMISSIONED';
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

export interface CustodyTransfer {
  id: string;
  battery_id: string;
  sender_org_id: string;
  sender_org_name: string;
  receiver_org_id: string;
  receiver_org_name: string;
  sender_actor_id?: string | null;
  receiver_actor_id?: string | null;
  state: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'CANCELLED';
  transfer_type: string;
  notes?: string | null;
  rejection_reason?: string | null;
  initiated_at: string;
  responded_at?: string | null;
}

export interface DispositionDecision {
  id: string;
  battery_id: string;
  recommendation: 'STATIONARY_BESS' | 'CELL_RECONDITIONING' | 'DEEP_RECYCLING' | 'CONTINUE_IN_SERVICE' | 'DECOMMISSION';
  recommended_pathway: string;
  recommended_action?: string;
  score?: number;
  is_second_life_suitable?: boolean;
  target_application?: string;
  estimated_remaining_useful_life_years?: number;
  recycling_efficiency_pct?: number;
  constraints: Record<string, any>;
  constraints_evaluated?: Record<string, any>;
  explanation: string;
  approval_status: 'PROPOSED' | 'APPROVED' | 'REJECTED' | 'EXECUTED';
  decided_by?: string | null;
  decided_at: string;
  approved_by?: string | null;
  approved_at?: string | null;
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
  status:
    | 'SUCCESS'
    | 'SUBMITTED'
    | 'LOCAL_SOLVED'
    | 'NOT_CONFIGURED'
    | 'AUTH_REQUIRED'
    | 'QUOTA_EXCEEDED'
    | 'RATE_LIMITED'
    | 'ERROR';
  configured: boolean;
  authenticated?: boolean;
  is_cloud_result?: boolean;
  is_live_cloud?: boolean;
  execution_mode?:
    | 'QPIAI_OPT_CLOUD'
    | 'LOCAL_EXACT_SOLVER'
    | 'CLOUD_REJECTED_QUOTA'
    | 'FORMULATION_ONLY'
    | 'ERROR'
    | 'unauthenticated_formulation_only'
    | 'authentication_failed'
    | 'qpiai_opt_cloud_platform'
    | 'qpiai_opt_authenticated_local'
    | 'error'
    | string;
  solver_backend?: string | null;
  solver_name?: string | null;
  problem_type: string;
  problem_id?: string | null;
  num_variables: number;
  qubo_edges_count: number;
  qubo_sample_matrix: Record<string, number>;
  objective_value?: number | null;
  recommended_allocations?: Record<string, string> | null;
  local_reference_solution?: {
    note: string;
    objective_value: number;
    allocations: Record<string, string>;
  } | null;
  execution_time_seconds?: number | null;
  job_id?: string | null;
  provider_http_status?: number | null;
  constraints_considered?: string[];
  allocation_reasoning?: Record<string, string> | string[];
  warnings?: string[];
  message: string;
  instructions?: string | null;
}

export interface QpiAIQuantumResponse {
  status:
    | 'SUCCESS'
    | 'SUBMITTED'
    | 'SIMULATION_COMPLETED'
    | 'AUTH_REQUIRED'
    | 'SUBSCRIPTION_REQUIRED'
    | 'QUOTA_EXCEEDED'
    | 'RATE_LIMITED'
    | 'ERROR';
  configured_for_cloud: boolean;
  qcloud_authenticated?: boolean;
  is_cloud_execution?: boolean;
  is_hardware_execution?: boolean;
  is_cloud_hardware?: boolean;
  execution_mode?:
    | 'QCLOUD_QUANTUM_HARDWARE'
    | 'QCLOUD_REMOTE_SIMULATOR'
    | 'LOCAL_STATEVECTOR_SIMULATOR'
    | 'QCLOUD_REJECTED_SUBSCRIPTION'
    | 'FORMULATION_ONLY'
    | 'ERROR'
    | 'unauthenticated_local_preview'
    | 'authentication_failed'
    | 'qcloud_authenticated_local_statevector'
    | 'qcloud_submission_error'
    | 'qcloud_hardware_qpu'
    | 'qcloud_remote_simulator'
    | 'error'
    | string;
  backend_used: string;
  job_id?: string | null;
  circuit_id?: string | null;
  shots?: number;
  measured_counts?: Record<string, number>;
  measurement_counts?: Record<string, number>;
  execution_time_seconds?: number | null;
  provider_http_status?: number | null;
  available_cloud_backends?: string[];
  available_backends?: string[];
  num_qubits: number;
  circuit_depth: number;
  quantum_gate_counts: Record<string, number>;
  measured_probabilities: Record<string, number>;
  estimated_ground_state_energy_hartree: number;
  projected_capacity_fade_rate: number;
  molecular_degradation_risk: string;
  openqasm_circuit?: string;
  message: string;
  instructions?: string | null;
}

export interface IntegrationsStatus {
  supabase: DatabaseStatus;
  qpiai_opt: {
    configured: boolean;
    authenticated?: boolean;
    endpoint?: string;
    endpoint_url?: string;
    plan_tier?: string;
    execution_mode?: string;
    message?: string;
  };
  qpiai_qcloud: {
    configured: boolean;
    authenticated?: boolean;
    endpoint?: string;
    endpoint_url?: string;
    default_backend: string;
    active_subscription?: boolean;
    supported_backends?: readonly string[] | string[];
    available_backends?: string[];
    message?: string;
  };
  checked_at: string;
}

export interface DatabaseTableStatus {
  name: string;
  exists: boolean;
  rowCount: number | null;
}

export interface DatabaseStatus {
  isConfigured: boolean;
  isConnected: boolean;
  provider: 'SUPABASE' | 'MEMORY_FALLBACK';
  message: string;
  endpointUrl?: string;
  lastChecked?: string;
  tables?: DatabaseTableStatus[];
}
