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

export const VALID_PATHWAYS: readonly DispositionPathway[] = [
  'direct_reuse',
  'second_life_bess',
  'remanufacturing',
  'material_recycling',
] as const;

export type PredefinedQuantumExperiment =
  | 'telemetry_anomaly_ising'
  | 'toy_disposition_ising_2pack'
  | 'bell_calibration_check';

export const VALID_QUANTUM_EXPERIMENTS: readonly PredefinedQuantumExperiment[] = [
  'telemetry_anomaly_ising',
  'toy_disposition_ising_2pack',
  'bell_calibration_check',
] as const;

export type SupportedQpiAIBackend =
  | 'QpiAI-QSV-Local'
  | 'QpiAI-QSV-Simulator'
  | 'QpiAI-QDM-Simulator'
  | 'QpiAI-QTN-Simulator'
  | 'QpiAI-Indus-1';

export const VALID_QPIAI_BACKENDS: readonly SupportedQpiAIBackend[] = [
  'QpiAI-QSV-Local',
  'QpiAI-QSV-Simulator',
  'QpiAI-QDM-Simulator',
  'QpiAI-QTN-Simulator',
  'QpiAI-Indus-1',
] as const;

export const SIMULATOR_BACKENDS: ReadonlySet<string> = new Set([
  'QpiAI-QSV-Local',
  'QpiAI-QSV-Simulator',
  'QpiAI-QDM-Simulator',
  'QpiAI-QTN-Simulator',
]);

export interface PathwayCapacityLimits {
  direct_reuse?: number;
  second_life_bess?: number;
  remanufacturing?: number;
  material_recycling?: number;
}

export interface ConfigurableDemoThresholds {
  direct_reuse_min_soh_pct: number;
  direct_reuse_max_cycles: number;
  direct_reuse_max_resistance_mohm: number;
  second_life_min_soh_pct: number;
  second_life_max_cycles: number;
  second_life_max_resistance_mohm: number;
  remanufacturing_min_soh_pct: number;
  remanufacturing_max_cycles: number;
  safety_max_resistance_mohm: number;
}

export const DEFAULT_DEMO_THRESHOLDS: ConfigurableDemoThresholds = {
  direct_reuse_min_soh_pct: 85.0,
  direct_reuse_max_cycles: 800,
  direct_reuse_max_resistance_mohm: 24.0,
  second_life_min_soh_pct: 70.0,
  second_life_max_cycles: 2200,
  second_life_max_resistance_mohm: 32.0,
  remanufacturing_min_soh_pct: 60.0,
  remanufacturing_max_cycles: 2600,
  safety_max_resistance_mohm: 50.0,
};

export interface ObjectiveWeights {
  economic_value_weight: number;
  carbon_impact_weight: number;
  degradation_risk_weight: number;
}

export const DEFAULT_OBJECTIVE_WEIGHTS: ObjectiveWeights = {
  economic_value_weight: 0.45,
  carbon_impact_weight: 0.3,
  degradation_risk_weight: 0.25,
};

export interface BatteryInspectionFlags {
  thermal_event_detected?: boolean;
  structural_damage_or_leakage?: boolean;
  bms_isolation_fault?: boolean;
}

export interface OptimizationRunRequest {
  battery_ids: string[];
  allowed_pathways?: DispositionPathway[];
  pathway_capacities?: PathwayCapacityLimits;
  objective_weights?: Partial<ObjectiveWeights>;
  demo_thresholds?: Partial<ConfigurableDemoThresholds>;
  inspection_flags_by_battery?: Record<string, BatteryInspectionFlags>;
  allow_demo_fallback?: boolean;
  max_evaluations?: number;
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

export interface DataCompletenessReport {
  overall_completeness_pct: number;
  complete_batteries_count: number;
  total_batteries_count: number;
  missing_or_imputed_fields: Record<string, string[]>;
  warnings: string[];
}

export type OptimizationSolverStatus =
  | 'LIVE_SOLVED'
  | 'LIVE_SUBMITTED'
  | 'DEMO_REFERENCE_SOLVED'
  | 'MISSING_CREDENTIALS'
  | 'SDK_NOT_INSTALLED'
  | 'INFEASIBLE'
  | 'INVALID_INPUT'
  | 'SOLVER_ERROR'
  | 'MALFORMED_RESPONSE';

export interface OptimizationRunResponse {
  solver_status: OptimizationSolverStatus;
  solver_name: string;
  execution_mode: 'live_qpiai_opt_cloud' | 'demo_local_reference' | 'unexecuted';
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
    objective_weights: ObjectiveWeights;
    configurable_demo_thresholds: ConfigurableDemoThresholds;
    methodology_notes: string[];
  };
  data_completeness: DataCompletenessReport;
  execution_time_ms: number | null;
  job_id: string | null;
  message: string;
}

export interface QuantumRunRequest {
  experiment_type: PredefinedQuantumExperiment;
  battery_ids?: string[];
  backend?: SupportedQpiAIBackend;
  shots?: number;
  timeout_ms?: number;
  allow_demo_simulation?: boolean;
}

export type QuantumExecutionStatus =
  | 'CLOUD_COMPLETED'
  | 'SIMULATOR_COMPLETED'
  | 'DEMO_SIMULATED'
  | 'MISSING_CREDENTIALS'
  | 'SDK_NOT_INSTALLED'
  | 'AUTH_ERROR'
  | 'BACKEND_UNAVAILABLE'
  | 'TIMEOUT'
  | 'QUOTA_EXCEEDED'
  | 'MALFORMED_RESPONSE'
  | 'INVALID_INPUT'
  | 'EXECUTION_ERROR';

export interface QuantumRunResponse {
  execution_status: QuantumExecutionStatus;
  experiment_type: PredefinedQuantumExperiment;
  experiment_title: string;
  scientific_purpose_and_limits: string;
  variable_encoding_map: Record<string, string>;
  backend_requested: string;
  backend_used: string | null;
  execution_mode:
    | 'qcloud_hardware_qpu'
    | 'qcloud_remote_simulator'
    | 'sdk_local_simulator'
    | 'demo_local_statevector'
    | 'unexecuted';
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

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export function validateOptimizationRequest(raw: any): OptimizationRunRequest {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    throw new ValidationError('Request body must be a JSON object.');
  }

  // Reject any attempt to pass executable code or arbitrary scripts
  const forbiddenKeys = ['code', 'script', 'python', 'command', 'shell', 'eval', 'qubo_raw'];
  for (const key of forbiddenKeys) {
    if (key in raw) {
      throw new ValidationError(`Forbidden parameter '${key}' is not permitted.`);
    }
  }

  if (!Array.isArray(raw.battery_ids) || raw.battery_ids.length === 0) {
    throw new ValidationError('battery_ids must be a non-empty array of battery identifiers.');
  }
  if (raw.battery_ids.length > 12) {
    throw new ValidationError(
      'Batch size exceeds safe optimization limit (maximum 12 batteries per request).'
    );
  }

  const batteryIds: string[] = [];
  for (const id of raw.battery_ids) {
    if (typeof id !== 'string' || !id.trim() || id.length > 128) {
      throw new ValidationError('Each battery_id must be a non-empty string up to 128 chars.');
    }
    if (!batteryIds.includes(id.trim())) {
      batteryIds.push(id.trim());
    }
  }

  let allowedPathways: DispositionPathway[] | undefined;
  if (raw.allowed_pathways !== undefined) {
    if (!Array.isArray(raw.allowed_pathways) || raw.allowed_pathways.length === 0) {
      throw new ValidationError('allowed_pathways must be a non-empty array when provided.');
    }
    allowedPathways = [];
    for (const p of raw.allowed_pathways) {
      if (!VALID_PATHWAYS.includes(p)) {
        throw new ValidationError(
          `Unsupported disposition pathway '${String(p)}'. Allowed: ${VALID_PATHWAYS.join(', ')}`
        );
      }
      if (!allowedPathways.includes(p)) allowedPathways.push(p);
    }
  }

  const pathwayCapacities: PathwayCapacityLimits | undefined = raw.pathway_capacities
    ? {}
    : undefined;
  if (raw.pathway_capacities !== undefined) {
    if (typeof raw.pathway_capacities !== 'object' || Array.isArray(raw.pathway_capacities)) {
      throw new ValidationError('pathway_capacities must be an object mapping pathways to non-negative integers.');
    }
    for (const [k, v] of Object.entries(raw.pathway_capacities)) {
      if (!VALID_PATHWAYS.includes(k as DispositionPathway)) {
        throw new ValidationError(`Invalid pathway key '${k}' in pathway_capacities.`);
      }
      const num = Number(v);
      if (!Number.isInteger(num) || num < 0 || num > 100) {
        throw new ValidationError(`Capacity for '${k}' must be an integer between 0 and 100.`);
      }
      pathwayCapacities![k as DispositionPathway] = num;
    }
  }

  let maxEvaluations = 1000;
  if (raw.max_evaluations !== undefined) {
    const me = Number(raw.max_evaluations);
    if (!Number.isInteger(me) || me < 50 || me > 10000) {
      throw new ValidationError('max_evaluations must be an integer between 50 and 10000.');
    }
    maxEvaluations = me;
  }

  return {
    battery_ids: batteryIds,
    allowed_pathways: allowedPathways,
    pathway_capacities: pathwayCapacities,
    objective_weights: raw.objective_weights,
    demo_thresholds: raw.demo_thresholds,
    inspection_flags_by_battery: raw.inspection_flags_by_battery,
    allow_demo_fallback: Boolean(raw.allow_demo_fallback),
    max_evaluations: maxEvaluations,
  };
}

export function validateQuantumRequest(raw: any): QuantumRunRequest {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    throw new ValidationError('Request body must be a JSON object.');
  }

  // Strictly forbid arbitrary circuits, QASM strings, gates, or code
  const forbiddenKeys = [
    'qasm',
    'qasm_string',
    'circuit',
    'gates',
    'operations',
    'code',
    'script',
    'python',
    'command',
  ];
  for (const key of forbiddenKeys) {
    if (key in raw) {
      throw new ValidationError(
        `Unrestricted circuit or code field '${key}' is forbidden. Select a predefined experiment_type.`
      );
    }
  }

  const expType = raw.experiment_type;
  if (!VALID_QUANTUM_EXPERIMENTS.includes(expType)) {
    throw new ValidationError(
      `Invalid experiment_type '${String(expType)}'. Allowed predefined experiments: ${VALID_QUANTUM_EXPERIMENTS.join(', ')}`
    );
  }

  let backend: SupportedQpiAIBackend = 'QpiAI-QSV-Local';
  if (raw.backend !== undefined) {
    if (!VALID_QPIAI_BACKENDS.includes(raw.backend)) {
      throw new ValidationError(
        `Unsupported backend '${String(raw.backend)}'. Allowed QpiAI SDK backends: ${VALID_QPIAI_BACKENDS.join(', ')}`
      );
    }
    backend = raw.backend;
  }

  let shots = 1024;
  if (raw.shots !== undefined) {
    const s = Number(raw.shots);
    if (!Number.isInteger(s) || s < 64 || s > 4096) {
      throw new ValidationError(
        'shots must be an integer within safe execution bounds [64, 4096].'
      );
    }
    shots = s;
  }

  let timeoutMs = 15000;
  if (raw.timeout_ms !== undefined) {
    const t = Number(raw.timeout_ms);
    if (!Number.isInteger(t) || t < 1000 || t > 30000) {
      throw new ValidationError('timeout_ms must be an integer between 1000 and 30000 ms.');
    }
    timeoutMs = t;
  }

  let batteryIds: string[] | undefined;
  if (raw.battery_ids !== undefined) {
    if (!Array.isArray(raw.battery_ids) || raw.battery_ids.length > 4) {
      throw new ValidationError('battery_ids must be an array of at most 4 battery IDs.');
    }
    batteryIds = raw.battery_ids.map((id: any) => {
      if (typeof id !== 'string' || !id.trim() || id.length > 128) {
        throw new ValidationError('Invalid battery_id in battery_ids.');
      }
      return id.trim();
    });
  }

  return {
    experiment_type: expType,
    battery_ids: batteryIds,
    backend,
    shots,
    timeout_ms: timeoutMs,
    allow_demo_simulation: Boolean(raw.allow_demo_simulation),
  };
}
