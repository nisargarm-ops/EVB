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

export interface UserOrganizationMembership {
  organization_id: string;
  organization_name: string;
  role: UserRole;
  is_verified?: boolean;
}

export interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  organization_id: string;
  organization_name: string;
  authorized_memberships?: UserOrganizationMembership[];
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
  consecutive_failed_attempts?: number;
  is_flagged_for_investigation?: boolean;
  lockout_until?: string | null;
  investigation_reason?: string | null;
  flagged_at?: string | null;
  review_notes?: string | null;
  reviewed_by?: string | null;
  reviewed_at?: string | null;
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

export type DualIdVerificationStatus =
  | 'MATCHED'
  | 'MISMATCH_FRAUD'
  | 'UNREGISTERED_SERIAL'
  | 'PENDING_INSPECTION'
  | 'SUSPICIOUS_VERIFICATION_REQUIRED';

export interface PhysicalVerificationRequest {
  physical_serial: string;
  inspector_notes?: string;
  barcode_type?: 'LASER_ETCHED' | 'DATA_MATRIX' | 'BARCODE_1D' | 'MANUAL';
  device_info?: string;
}

export interface PhysicalVerificationResponse {
  status: 'MATCHED' | 'MISMATCH_FRAUD' | 'UNREGISTERED_SERIAL' | 'SUSPICIOUS_VERIFICATION_REQUIRED';
  is_authentic: boolean;
  battery_id: string;
  battery_did: string;
  registered_serial_number?: string;
  physical_serial_entered: string;
  manufacturer_name: string;
  model_designation: string;
  match_details: string;
  fraud_detected: boolean;
  fraud_type?: 'QR_STICKER_SWAP_DETECTED' | 'UNREGISTERED_PHYSICAL_CASING' | 'EXCESSIVE_FAILED_VERIFICATIONS' | null;
  conflicting_battery_id?: string | null;
  suspicious_repeated_scans: boolean;
  recent_scan_count_15m: number;
  verified_at: string;
  verifier: {
    id?: string;
    role: string;
    organization?: string;
  };
  tamper_report_count: number;
  consecutive_failed_attempts?: number;
  remaining_attempts?: number;
  is_flagged_for_investigation?: boolean;
  lockout_until?: string | null;
  investigation_reason?: string | null;
  passport_details?: PublicVerification | null;
}

export interface TwoStepPrecheckResponse {
  battery_id: string;
  battery_did: string;
  status: 'AWAITING_PHYSICAL_UID' | 'SUSPICIOUS_LOCKED';
  is_flagged: boolean;
  is_locked: boolean;
  consecutive_failed_attempts: number;
  remaining_attempts: number;
  lockout_until?: string | null;
  investigation_reason?: string | null;
  flagged_at?: string | null;
  manufacturer_hint?: string;
  model_designation?: string;
  requires_physical_uid: true;
  message: string;
}

export interface ResetLockoutRequest {
  review_notes?: string;
}

export interface ResetLockoutResponse {
  success: boolean;
  message: string;
  battery_id: string;
  reset_at: string;
  reviewed_by?: string;
}

export interface FlaggedBatteryAlert {
  battery_id: string;
  battery_did: string;
  manufacturer_name: string;
  model_designation: string;
  consecutive_failed_attempts: number;
  is_flagged_for_investigation: boolean;
  lockout_until?: string | null;
  investigation_reason?: string | null;
  flagged_at?: string | null;
  tamper_reports_count: number;
  last_attempt_at?: string;
}

export interface TamperReportRequest {
  reason: 'REPLACED_QR_STICKER' | 'SCRATCHED_SERIAL' | 'MISMATCHED_CASING' | 'DAMAGED_SEAL' | 'OTHER';
  description: string;
  reported_serial?: string;
}

export interface TamperReportResponse {
  success: boolean;
  report_id: string;
  battery_id: string;
  status: string;
  message: string;
  timestamp: string;
}

export interface FraudAuditStatus {
  battery_id: string;
  battery_did: string;
  registered_serial_number: string;
  total_physical_verifications: number;
  matched_count: number;
  fraud_alerts_count: number;
  tamper_reports_count: number;
  recent_scan_count_15m: number;
  suspicious_repeated_scans: boolean;
  last_physical_verification?: {
    status: string;
    verified_at: string;
    verifier_role: string;
  } | null;
}

export interface PublicVerification {
  is_authentic: boolean;
  battery_id: string;
  battery_did: string;
  serial_number?: string;
  manufacturer_name: string;
  model_designation: string;
  chemistry: string;
  manufacturing_date: string;
  manufacturing_country?: string;
  manufacturing_facility?: string;
  current_custodian_name?: string;
  status: string;
  state_of_health_pct: number;
  carbon_footprint_total: number;
  eu_compliance_class: string;
  total_custody_events: number;
  is_audit_chain_valid: boolean;
  verification_timestamp: string;
  physical_verification_status?: DualIdVerificationStatus;
  fraud_alert_count?: number;
  tamper_report_count?: number;
  recent_scan_count_15m?: number;
  suspicious_repeated_scans?: boolean;
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

export interface BatteryMetricPoint {
  id?: string;
  battery_id: string;
  state_of_health_pct: number;
  state_of_charge_pct: number;
  cycle_count: number;
  internal_resistance_mohm: number;
  capacity_fade_rate_pct_yr?: number;
  recorded_at: string;
  source: string;
}

export interface QpiAIExecutionAnalyticsItem {
  id: string;
  engine_type: 'QPIAI_OPT' | 'QPIAI_QUANTUM';
  battery_id?: string;
  status: string;
  backend: string;
  is_cloud_result: boolean;
  execution_time_seconds?: number | null;
  created_at: string;
  parameters?: Record<string, any>;
  results?: Record<string, any>;
  error_message?: string | null;
}

export interface AnalyticsOverview {
  total_passports: number;
  lifecycle_distribution: Record<string, number>;
  health_summary: {
    avg_soh_pct: number;
    min_soh_pct: number;
    max_soh_pct: number;
    total_metrics_recorded: number;
  };
  custody_transfers_summary: {
    total: number;
    by_state: Record<string, number>;
    recent_transfers: Array<{
      id: string;
      battery_id: string;
      sender_org_name: string;
      receiver_org_name: string;
      state: string;
      transfer_type: string;
      initiated_at: string;
    }>;
  };
  anti_fraud_summary: {
    total_checks: number;
    matched_count: number;
    mismatch_fraud_count: number;
    verification_required_count: number;
    tamper_reports_count: number;
    suspicious_scans_detected: number;
    recent_checks: Array<{
      id?: string;
      battery_id: string;
      status: string;
      is_authentic: boolean;
      verified_at: string;
      verifier_role: string;
    }>;
  };
  qpiai_summary: {
    total_executions: number;
    cloud_executions_count: number;
    local_simulation_count: number;
    recent_executions: QpiAIExecutionAnalyticsItem[];
  };
}
