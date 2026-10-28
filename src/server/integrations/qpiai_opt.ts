import { execFile } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import type { BatteryPassport } from '../../types/index.ts';
import type {
  BatteryAllocationDecision,
  BatteryInspectionFlags,
  ConfigurableDemoThresholds,
  ConstraintSummaryItem,
  DataCompletenessReport,
  DispositionPathway,
  ObjectiveWeights,
  OptimizationRunRequest,
  OptimizationRunResponse,
  PathwayCapacityLimits,
  PathwayEligibilityDetail,
  ServiceIntegrationStatus,
} from '../schemas/qpiai.ts';
import {
  DEFAULT_DEMO_THRESHOLDS,
  DEFAULT_OBJECTIVE_WEIGHTS,
  VALID_PATHWAYS,
} from '../schemas/qpiai.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const BRIDGE_SCRIPT_PATH = path.join(__dirname, 'sdk_bridge.py');

export interface QpiAIOptSdkRawResult {
  ok: boolean;
  error_code?:
    | 'SDK_NOT_INSTALLED'
    | 'MISSING_CREDENTIALS'
    | 'SOLVER_ERROR'
    | 'TIMEOUT'
    | 'MALFORMED_RESPONSE';
  message?: string;
  result?: {
    num_nodes?: number;
    objective?: number;
    time?: number;
  } | null;
  solution?: Record<string, number> | null;
  job_id?: string | null;
  execution_time_ms?: number;
}

export interface QpiAIOptSdkClient {
  checkInstalled(): Promise<boolean>;
  solveQubo(params: {
    numVariables: number;
    quboEdges: Array<[number, number, number]>;
    maxEvaluations: number;
    apiKey: string;
    optUrl: string;
    timeoutMs?: number;
  }): Promise<QpiAIOptSdkRawResult>;
}

function execPythonBridge(
  inputObj: Record<string, any>,
  envOverrides: Record<string, string>,
  timeoutMs = 20000
): Promise<any> {
  return new Promise(resolve => {
    const child = execFile(
      'python3',
      [BRIDGE_SCRIPT_PATH],
      {
        timeout: timeoutMs,
        maxBuffer: 2 * 1024 * 1024,
        env: { ...process.env, ...envOverrides },
      },
      (err, stdout) => {
        if (err) {
          const isTimeout = (err as any).killed || /timed? out/i.test(err.message);
          resolve({
            ok: false,
            error_code: isTimeout ? 'TIMEOUT' : 'SOLVER_ERROR',
            message: err.message,
          });
          return;
        }
        try {
          resolve(JSON.parse(stdout));
        } catch {
          resolve({
            ok: false,
            error_code: 'MALFORMED_RESPONSE',
            message: 'Bridge returned non-JSON output.',
          });
        }
      }
    );
    child.stdin?.write(JSON.stringify(inputObj));
    child.stdin?.end();
  });
}

export const defaultQpiAIOptSdkClient: QpiAIOptSdkClient = {
  async checkInstalled(): Promise<boolean> {
    const res = await execPythonBridge({ action: 'check' }, {}, 5000);
    return Boolean(res?.qpiai_opt_installed);
  },
  async solveQubo({
    numVariables,
    quboEdges,
    maxEvaluations,
    apiKey,
    optUrl,
    timeoutMs = 20000,
  }): Promise<QpiAIOptSdkRawResult> {
    return execPythonBridge(
      {
        action: 'opt',
        payload: {
          num_variables: numVariables,
          qubo_edges: quboEdges,
          max_evaluations: maxEvaluations,
        },
      },
      {
        QPIAI_OPT_API_KEY: apiKey,
        QPIAI_OPT_URL: optUrl,
      },
      timeoutMs
    );
  },
};

function estimatePathwayEconomicsAndCarbon(
  passport: BatteryPassport,
  pathway: DispositionPathway
): { netValueEur: number; netCo2Kg: number; riskScore: number } {
  const capKwh = Math.max(1, Number(passport.technical_specs?.rated_capacity_kwh ?? 60));
  const sohFrac = Math.max(0, Math.min(1, Number(passport.health_state?.state_of_health_pct ?? 75) / 100));
  const usableKwh = capKwh * sohFrac;
  const chem = (passport.chemistry || '').toUpperCase();
  const resistance = Number(passport.health_state?.internal_resistance_mohm ?? 24);
  const fadeRate = Number(passport.health_state?.capacity_fade_rate_pct_yr ?? 2.0);
  const weightKg = Math.max(50, Number(passport.technical_specs?.pack_weight_kg ?? 400));

  const isHighNickelCobalt = chem.includes('NMC') || chem.includes('NCA');

  if (pathway === 'direct_reuse') {
    const residualPackValue = usableKwh * 92.0 - 380.0; // inspection + recertification cost
    const avoidedMfgCo2 = -usableKwh * 28.0 + 35.0; // negative = net carbon credit vs new pack
    const riskScore = Math.max(0, (90 - sohFrac * 100) * 1.4 + fadeRate * 4.0);
    return {
      netValueEur: Number(residualPackValue.toFixed(2)),
      netCo2Kg: Number(avoidedMfgCo2.toFixed(2)),
      riskScore: Number(riskScore.toFixed(2)),
    };
  }

  if (pathway === 'second_life_bess') {
    const lfpStabilityBonus = chem.includes('LFP') ? 320.0 : 0.0;
    const bessValue = usableKwh * 68.0 + lfpStabilityBonus - 520.0; // BMS + rack integration cost
    const netCo2 = -usableKwh * 19.5 + 55.0;
    const riskScore = Math.max(0, (80 - sohFrac * 100) * 0.9 + (resistance - 18) * 1.1);
    return {
      netValueEur: Number(bessValue.toFixed(2)),
      netCo2Kg: Number(netCo2.toFixed(2)),
      riskScore: Number(riskScore.toFixed(2)),
    };
  }

  if (pathway === 'remanufacturing') {
    const remanValue = usableKwh * 56.0 - 780.0; // module teardown + cell replacement labor
    const netCo2 = -usableKwh * 12.0 + 95.0;
    const riskScore = Math.max(0, (72 - sohFrac * 100) * 0.8 + fadeRate * 3.0);
    return {
      netValueEur: Number(remanValue.toFixed(2)),
      netCo2Kg: Number(netCo2.toFixed(2)),
      riskScore: Number(riskScore.toFixed(2)),
    };
  }

  // material_recycling
  const metalYieldPerKg = isHighNickelCobalt ? 7.4 : 3.1; // Co/Ni/Li black-mass value vs LFP Li/Cu/Al
  const recyclingCost = weightKg * 2.2 + 180.0;
  const netRecycleVal = weightKg * metalYieldPerKg - recyclingCost;
  const avoidedMiningCo2 = isHighNickelCobalt ? -weightKg * 3.2 + 110.0 : -weightKg * 1.4 + 90.0;
  const riskScore = 2.0; // lowest operational degradation risk at end-of-life
  return {
    netValueEur: Number(netRecycleVal.toFixed(2)),
    netCo2Kg: Number(avoidedMiningCo2.toFixed(2)),
    riskScore: Number(riskScore.toFixed(2)),
  };
}

function evaluateDataCompleteness(
  passports: BatteryPassport[],
  untrustedWarnings: string[]
): { report: DataCompletenessReport; hasFatalInvalidData: string | null } {
  const missingByBattery: Record<string, string[]> = {};
  const warnings: string[] = [...untrustedWarnings];
  let completeCount = 0;

  for (const p of passports) {
    const missing: string[] = [];
    const soh = p.health_state?.state_of_health_pct;
    const cap = p.technical_specs?.rated_capacity_kwh;
    const cycles = p.health_state?.cycle_count;
    const resMohm = p.health_state?.internal_resistance_mohm;
    const co2 = p.carbon_footprint?.total_co2_kg_per_kwh;

    if (typeof soh !== 'number' || Number.isNaN(soh) || soh < 0 || soh > 100) {
      return {
        report: {
          overall_completeness_pct: 0,
          complete_batteries_count: 0,
          total_batteries_count: passports.length,
          missing_or_imputed_fields: { [p.battery_id]: ['health_state.state_of_health_pct'] },
          warnings,
        },
        hasFatalInvalidData: `Battery '${p.battery_id}' has invalid State of Health (${String(soh)}). Must be in [0, 100].`,
      };
    }

    if (typeof cap !== 'number' || Number.isNaN(cap) || cap <= 0) {
      return {
        report: {
          overall_completeness_pct: 0,
          complete_batteries_count: 0,
          total_batteries_count: passports.length,
          missing_or_imputed_fields: { [p.battery_id]: ['technical_specs.rated_capacity_kwh'] },
          warnings,
        },
        hasFatalInvalidData: `Battery '${p.battery_id}' has invalid rated_capacity_kwh (${String(cap)}). Must be > 0.`,
      };
    }

    if (typeof cycles !== 'number' || Number.isNaN(cycles) || cycles < 0) {
      missing.push('health_state.cycle_count');
      warnings.push(`Battery '${p.battery_id}' missing valid cycle_count; conservatively imputed.`);
    }
    if (typeof resMohm !== 'number' || Number.isNaN(resMohm) || resMohm <= 0) {
      missing.push('health_state.internal_resistance_mohm');
      warnings.push(
        `Battery '${p.battery_id}' missing internal_resistance_mohm; conservatively imputed.`
      );
    }
    if (typeof co2 !== 'number' || Number.isNaN(co2) || co2 <= 0) {
      missing.push('carbon_footprint.total_co2_kg_per_kwh');
      warnings.push(
        `Battery '${p.battery_id}' missing lifecycle CO2 intensity; using conservative regional baseline.`
      );
    }
    if (!p.health_state?.last_telemetry_timestamp) {
      missing.push('health_state.last_telemetry_timestamp');
      warnings.push(
        `Battery '${p.battery_id}' lacks a BMS telemetry timestamp; verify physical inspection before reuse.`
      );
    }

    if (missing.length === 0) {
      completeCount++;
    } else {
      missingByBattery[p.battery_id] = missing;
    }
  }

  const totalFields = passports.length * 6;
  const missingTotal = Object.values(missingByBattery).reduce((a, b) => a + b.length, 0);
  const pct =
    totalFields > 0
      ? Number((((totalFields - missingTotal) / totalFields) * 100).toFixed(1))
      : 100;

  return {
    report: {
      overall_completeness_pct: pct,
      complete_batteries_count: completeCount,
      total_batteries_count: passports.length,
      missing_or_imputed_fields: missingByBattery,
      warnings,
    },
    hasFatalInvalidData: null,
  };
}

function evaluateEligibilityForBattery(
  passport: BatteryPassport,
  pathways: DispositionPathway[],
  thresholds: ConfigurableDemoThresholds,
  weights: ObjectiveWeights,
  safetyFlags?: BatteryInspectionFlags
): PathwayEligibilityDetail[] {
  const soh = passport.health_state.state_of_health_pct;
  const cycles = passport.health_state.cycle_count ?? 1000;
  const resistance = passport.health_state.internal_resistance_mohm ?? 25.0;

  const hasSafetyHazard = Boolean(
    safetyFlags?.thermal_event_detected ||
      safetyFlags?.structural_damage_or_leakage ||
      safetyFlags?.bms_isolation_fault ||
      resistance > thresholds.safety_max_resistance_mohm
  );

  const isAlreadyRecycled = passport.status === 'RECYCLED';

  return pathways.map(pathway => {
    const reasons: string[] = [];
    let eligible = true;
    let ruleCategory: PathwayEligibilityDetail['rule_category'] = 'eligible';

    // 1. Authoritative safety & lifecycle state rules (Hard constraints)
    if (isAlreadyRecycled && pathway !== 'material_recycling') {
      eligible = false;
      ruleCategory = 'authoritative_safety_or_lifecycle';
      reasons.push(
        `Authoritative lifecycle lock: Battery status is already RECYCLED and cannot re-enter '${pathway}'.`
      );
    }

    if (hasSafetyHazard && pathway !== 'material_recycling') {
      eligible = false;
      ruleCategory = 'authoritative_safety_or_lifecycle';
      if (safetyFlags?.thermal_event_detected) {
        reasons.push('Safety hazard gate: Thermal excursion flagged; reuse/remanufacturing prohibited.');
      }
      if (safetyFlags?.structural_damage_or_leakage) {
        reasons.push('Safety hazard gate: Structural casing damage or electrolyte leakage flagged.');
      }
      if (safetyFlags?.bms_isolation_fault) {
        reasons.push('Safety hazard gate: High-voltage BMS isolation fault flagged.');
      }
      if (resistance > thresholds.safety_max_resistance_mohm) {
        reasons.push(
          `Safety hazard gate: Internal resistance (${resistance} mΩ) exceeds safety ceiling (${thresholds.safety_max_resistance_mohm} mΩ).`
        );
      }
    }

    // 2. Configurable engineering / demo thresholds (explicitly non-statutory)
    if (eligible) {
      if (pathway === 'direct_reuse') {
        if (soh < thresholds.direct_reuse_min_soh_pct) {
          eligible = false;
          ruleCategory = 'configurable_demo_threshold';
          reasons.push(
            `Configurable reuse rule: SoH ${soh}% < ${thresholds.direct_reuse_min_soh_pct}% minimum.`
          );
        }
        if (cycles > thresholds.direct_reuse_max_cycles) {
          eligible = false;
          ruleCategory = 'configurable_demo_threshold';
          reasons.push(
            `Configurable reuse rule: Cycle count ${cycles} > ${thresholds.direct_reuse_max_cycles} max.`
          );
        }
        if (resistance > thresholds.direct_reuse_max_resistance_mohm) {
          eligible = false;
          ruleCategory = 'configurable_demo_threshold';
          reasons.push(
            `Configurable reuse rule: Resistance ${resistance} mΩ > ${thresholds.direct_reuse_max_resistance_mohm} mΩ max.`
          );
        }
      } else if (pathway === 'second_life_bess') {
        if (soh < thresholds.second_life_min_soh_pct) {
          eligible = false;
          ruleCategory = 'configurable_demo_threshold';
          reasons.push(
            `Configurable BESS rule: SoH ${soh}% < ${thresholds.second_life_min_soh_pct}% minimum.`
          );
        }
        if (cycles > thresholds.second_life_max_cycles) {
          eligible = false;
          ruleCategory = 'configurable_demo_threshold';
          reasons.push(
            `Configurable BESS rule: Cycle count ${cycles} > ${thresholds.second_life_max_cycles} max.`
          );
        }
        if (resistance > thresholds.second_life_max_resistance_mohm) {
          eligible = false;
          ruleCategory = 'configurable_demo_threshold';
          reasons.push(
            `Configurable BESS rule: Resistance ${resistance} mΩ > ${thresholds.second_life_max_resistance_mohm} mΩ max.`
          );
        }
      } else if (pathway === 'remanufacturing') {
        if (soh < thresholds.remanufacturing_min_soh_pct) {
          eligible = false;
          ruleCategory = 'configurable_demo_threshold';
          reasons.push(
            `Configurable remanufacturing rule: SoH ${soh}% < ${thresholds.remanufacturing_min_soh_pct}% minimum.`
          );
        }
        if (cycles > thresholds.remanufacturing_max_cycles) {
          eligible = false;
          ruleCategory = 'configurable_demo_threshold';
          reasons.push(
            `Configurable remanufacturing rule: Cycle count ${cycles} > ${thresholds.remanufacturing_max_cycles} max.`
          );
        }
      }
    }

    if (eligible && reasons.length === 0) {
      reasons.push(
        `Meets safety checks and configurable eligibility criteria for '${pathway}'.`
      );
    }

    const { netValueEur, netCo2Kg, riskScore } = estimatePathwayEconomicsAndCarbon(
      passport,
      pathway
    );

    // Lower QUBO linear score = better (minimization objective)
    const normalizedValueTerm = -(netValueEur / 1000.0) * weights.economic_value_weight * 10.0;
    const normalizedCarbonTerm = (netCo2Kg / 500.0) * weights.carbon_impact_weight * 10.0;
    const normalizedRiskTerm = (riskScore / 20.0) * weights.degradation_risk_weight * 10.0;
    const linearScore = Number(
      (normalizedValueTerm + normalizedCarbonTerm + normalizedRiskTerm).toFixed(4)
    );

    return {
      pathway,
      eligible,
      rule_category: ruleCategory,
      reasons,
      estimated_net_value_eur: netValueEur,
      estimated_net_co2_kg: netCo2Kg,
      linear_objective_score: linearScore,
    };
  });
}

function buildConstrainedQubo(
  evaluationsByBattery: PathwayEligibilityDetail[][],
  pathways: DispositionPathway[],
  capacities: Record<DispositionPathway, number>
): {
  numVariables: number;
  quboEdges: Array<[number, number, number]>;
  sampleEdges: Record<string, number>;
  penaltyMultiplier: number;
} {
  const numBatteries = evaluationsByBattery.length;
  const numPathways = pathways.length;
  const decisionVarsCount = numBatteries * numPathways;

  // Slack binary variables for pathway capacity constraints when K_j < numBatteries
  const slackBitsByPathway: Map<number, number[]> = new Map();
  let nextVarIdx = decisionVarsCount;

  for (let j = 0; j < numPathways; j++) {
    const cap = capacities[pathways[j]];
    if (cap < numBatteries && cap > 0) {
      const numBits = Math.floor(Math.log2(cap)) + 1;
      const bitIndices: number[] = [];
      for (let b = 0; b < numBits; b++) {
        bitIndices.push(nextVarIdx++);
      }
      slackBitsByPathway.set(j, bitIndices);
    }
  }

  const penaltyMultiplier = 200.0;
  const edgeMap = new Map<string, [number, number, number]>();

  const addTerm = (u: number, v: number, weight: number) => {
    if (Math.abs(weight) < 1e-9) return;
    const a = Math.min(u, v);
    const b = Math.max(u, v);
    const key = `${a}:${b}`;
    const existing = edgeMap.get(key);
    const updatedWeight = Number(((existing ? existing[2] : 0) + weight).toFixed(4));
    edgeMap.set(key, [a, b, updatedWeight]);
  };

  // 1. One-hot assignment constraint per battery: P * (sum_j x_{i,j} - 1)^2
  for (let i = 0; i < numBatteries; i++) {
    for (let j = 0; j < numPathways; j++) {
      const idx = i * numPathways + j;
      addTerm(idx, idx, -penaltyMultiplier);
      for (let k = j + 1; k < numPathways; k++) {
        const idxK = i * numPathways + k;
        addTerm(idx, idxK, 2.0 * penaltyMultiplier);
      }
    }
  }

  // 2. Objective score + hard ineligibility penalty per (battery, pathway)
  for (let i = 0; i < numBatteries; i++) {
    for (let j = 0; j < numPathways; j++) {
      const idx = i * numPathways + j;
      const detail = evaluationsByBattery[i][j];
      addTerm(idx, idx, detail.linear_objective_score);
      if (!detail.eligible || capacities[pathways[j]] === 0) {
        addTerm(idx, idx, penaltyMultiplier * 2.5);
      }
    }
  }

  // 3. Capacity constraint per pathway j when 0 < K_j < numBatteries:
  // P_cap * (sum_i x_{i,j} + sum_b w_b s_{j,b} - K_j)^2
  const capPenalty = penaltyMultiplier * 1.5;
  for (let j = 0; j < numPathways; j++) {
    const cap = capacities[pathways[j]];
    const slackIndices = slackBitsByPathway.get(j);
    if (!slackIndices) continue;

    // Weights for slack bits summing to exactly cap (bounded integer encoding)
    const terms: Array<{ idx: number; coeff: number }> = [];
    for (let i = 0; i < numBatteries; i++) {
      terms.push({ idx: i * numPathways + j, coeff: 1 });
    }
    let remaining = cap;
    for (let b = 0; b < slackIndices.length; b++) {
      const w = b < slackIndices.length - 1 ? 1 << b : remaining;
      remaining -= w;
      terms.push({ idx: slackIndices[b], coeff: w });
    }

    // Expand (sum_t c_t y_t - cap)^2 = sum_t (c_t^2 - 2*cap*c_t) y_t + 2 sum_{t<u} c_t c_u y_t y_u + const
    for (let t = 0; t < terms.length; t++) {
      const { idx: u, coeff: cu } = terms[t];
      addTerm(u, u, capPenalty * (cu * cu - 2 * cap * cu));
      for (let m = t + 1; m < terms.length; m++) {
        const { idx: v, coeff: cv } = terms[m];
        addTerm(u, v, capPenalty * 2 * cu * cv);
      }
    }
  }

  const quboEdges = Array.from(edgeMap.values());
  const sampleEdges: Record<string, number> = {};
  for (const [u, v, w] of quboEdges.slice(0, 24)) {
    sampleEdges[`(${u},${v})`] = w;
  }

  return {
    numVariables: nextVarIdx,
    quboEdges,
    sampleEdges,
    penaltyMultiplier,
  };
}

function solveExactConstrainedReference(
  evaluationsByBattery: PathwayEligibilityDetail[][],
  pathways: DispositionPathway[],
  capacities: Record<DispositionPathway, number>
): { bestAssignment: number[] | null; bestScore: number } {
  const n = evaluationsByBattery.length;
  const m = pathways.length;
  const usedCounts = new Array(m).fill(0);
  const current = new Array(n).fill(-1);
  let bestAssignment: number[] | null = null;
  let bestScore = Infinity;

  const dfs = (i: number, runningScore: number) => {
    if (i === n) {
      if (runningScore < bestScore) {
        bestScore = runningScore;
        bestAssignment = [...current];
      }
      return;
    }
    for (let j = 0; j < m; j++) {
      const ev = evaluationsByBattery[i][j];
      if (!ev.eligible) continue;
      if (usedCounts[j] + 1 > capacities[pathways[j]]) continue;
      usedCounts[j]++;
      current[i] = j;
      dfs(i + 1, runningScore + ev.linear_objective_score);
      usedCounts[j]--;
    }
  };

  dfs(0, 0);
  return { bestAssignment, bestScore: Number(bestScore.toFixed(4)) };
}

export class QpiAIOptIntegration {
  private sdkClient: QpiAIOptSdkClient;

  constructor(sdkClient: QpiAIOptSdkClient = defaultQpiAIOptSdkClient) {
    this.sdkClient = sdkClient;
  }

  async getStatus(): Promise<ServiceIntegrationStatus> {
    const apiKey = (process.env.QPIAI_OPT_API_KEY || '').trim();
    const optUrl = (process.env.QPIAI_OPT_URL || '').trim();
    const demoDefault = process.env.QPIAI_DEMO_MODE === 'true';
    const sdkInstalled = await this.sdkClient.checkInstalled();

    const setupInstructions = [
      'Install verified Python SDK: pip install qpiai-opt-api networkx requests',
      'Set server environment variables QPIAI_OPT_API_KEY and QPIAI_OPT_URL in .env',
      'Alternatively pass allow_demo_fallback=true in POST /api/optimization/run for explicitly labelled local reference evaluation',
    ];

    if (!apiKey || !optUrl) {
      return {
        service_name: 'QpiAI Opt (qpiai-opt-api)',
        status: demoDefault ? 'demo_mode' : 'missing_credentials',
        sdk_package: 'qpiai-opt-api (qpiai_opt.problem.qubo.QUBOProblem, qpiai_opt.solver.solver.Solver)',
        sdk_installed: sdkInstalled,
        credentials_configured: false,
        endpoint_url: optUrl || 'unconfigured',
        active_execution_mode: demoDefault ? 'demo_local_reference' : 'unconfigured',
        diagnostic_message:
          'QPIAI_OPT_API_KEY and/or QPIAI_OPT_URL are not set. Live QpiAI Opt cloud solver execution is disabled; opt-in local reference mode remains available and clearly labelled.',
        setup_instructions: setupInstructions,
      };
    }

    if (!sdkInstalled) {
      return {
        service_name: 'QpiAI Opt (qpiai-opt-api)',
        status: 'configured_but_unavailable',
        sdk_package: 'qpiai-opt-api',
        sdk_installed: false,
        credentials_configured: true,
        endpoint_url: optUrl,
        active_execution_mode: 'sdk_missing',
        diagnostic_message:
          'Credentials are configured, but the Python package qpiai-opt-api is not installed in the server environment.',
        setup_instructions: setupInstructions,
      };
    }

    // Lightweight HTTP reachability check to configured QPIAI_OPT_URL
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 4000);
      const res = await fetch(optUrl, {
        method: 'GET',
        headers: { access_token: apiKey },
        signal: controller.signal,
      });
      clearTimeout(timer);
      if (res.status < 500) {
        return {
          service_name: 'QpiAI Opt (qpiai-opt-api)',
          status: 'configured_and_reachable',
          sdk_package: 'qpiai-opt-api',
          sdk_installed: true,
          credentials_configured: true,
          endpoint_url: optUrl,
          active_execution_mode: 'live_qpiai_opt_cloud',
          diagnostic_message: 'QpiAI Opt SDK is installed and cloud solver endpoint responded.',
          setup_instructions: [],
        };
      }
      return {
        service_name: 'QpiAI Opt (qpiai-opt-api)',
        status: 'configured_but_unavailable',
        sdk_package: 'qpiai-opt-api',
        sdk_installed: true,
        credentials_configured: true,
        endpoint_url: optUrl,
        active_execution_mode: 'unavailable',
        diagnostic_message: `QpiAI Opt server returned HTTP ${res.status}.`,
        setup_instructions: setupInstructions,
      };
    } catch (err: any) {
      return {
        service_name: 'QpiAI Opt (qpiai-opt-api)',
        status: 'configured_but_unavailable',
        sdk_package: 'qpiai-opt-api',
        sdk_installed: true,
        credentials_configured: true,
        endpoint_url: optUrl,
        active_execution_mode: 'unavailable',
        diagnostic_message: `Configured QPIAI_OPT_URL is unreachable: ${err?.message || String(err)}`,
        setup_instructions: setupInstructions,
      };
    }
  }

  async runOptimization(
    req: OptimizationRunRequest,
    trustedPassports: BatteryPassport[],
    missingBatteryIds: string[],
    securityWarnings: string[] = []
  ): Promise<OptimizationRunResponse> {
    const pathways: DispositionPathway[] =
      req.allowed_pathways && req.allowed_pathways.length > 0
        ? req.allowed_pathways
        : [...VALID_PATHWAYS];

    const thresholds: ConfigurableDemoThresholds = {
      ...DEFAULT_DEMO_THRESHOLDS,
      ...(req.demo_thresholds ?? {}),
    };

    const rawWeights: ObjectiveWeights = {
      ...DEFAULT_OBJECTIVE_WEIGHTS,
      ...(req.objective_weights ?? {}),
    };
    const weightSum =
      rawWeights.economic_value_weight +
        rawWeights.carbon_impact_weight +
        rawWeights.degradation_risk_weight || 1.0;
    const weights: ObjectiveWeights = {
      economic_value_weight: Number((rawWeights.economic_value_weight / weightSum).toFixed(3)),
      carbon_impact_weight: Number((rawWeights.carbon_impact_weight / weightSum).toFixed(3)),
      degradation_risk_weight: Number((rawWeights.degradation_risk_weight / weightSum).toFixed(3)),
    };

    const methodologyNotes = [
      'Authoritative safety/lifecycle gates (already RECYCLED status, thermal event, structural leakage, BMS isolation fault, severe resistance spike) act as hard constraints.',
      'SoH, cycle count, and operational internal resistance thresholds are configurable engineering parameters—not statutory EU 2023/1542 legal cutoffs.',
      'QUBO formulation minimizes weighted (-NetEconomicValue + NetCarbonImpact + DegradationRisk) subject to exact single-pathway assignment and facility slot capacities.',
    ];

    if (missingBatteryIds.length > 0 || trustedPassports.length === 0) {
      return {
        solver_status: 'INVALID_INPUT',
        solver_name: 'none',
        execution_mode: 'unexecuted',
        is_demo: false,
        is_live_qpiai_execution: false,
        objective_value: null,
        qubo_metadata: {
          problem_type: 'QUBO',
          num_binary_variables: 0,
          num_qubo_edges: 0,
          penalty_multiplier: 0,
          sample_edges: {},
        },
        allocations: [],
        constraints_considered: [],
        assumptions_and_weights: {
          objective_weights: weights,
          configurable_demo_thresholds: thresholds,
          methodology_notes: methodologyNotes,
        },
        data_completeness: {
          overall_completeness_pct: 0,
          complete_batteries_count: 0,
          total_batteries_count: req.battery_ids.length,
          missing_or_imputed_fields: {},
          warnings: [
            `Unknown battery passport IDs not found in trusted registry: ${missingBatteryIds.join(', ')}`,
          ],
        },
        execution_time_ms: null,
        job_id: null,
        message: `Trusted passport lookup failed for: ${missingBatteryIds.join(', ')}`,
      };
    }

    const { report: completenessReport, hasFatalInvalidData } = evaluateDataCompleteness(
      trustedPassports,
      securityWarnings
    );

    if (hasFatalInvalidData) {
      return {
        solver_status: 'INVALID_INPUT',
        solver_name: 'none',
        execution_mode: 'unexecuted',
        is_demo: false,
        is_live_qpiai_execution: false,
        objective_value: null,
        qubo_metadata: {
          problem_type: 'QUBO',
          num_binary_variables: 0,
          num_qubo_edges: 0,
          penalty_multiplier: 0,
          sample_edges: {},
        },
        allocations: [],
        constraints_considered: [],
        assumptions_and_weights: {
          objective_weights: weights,
          configurable_demo_thresholds: thresholds,
          methodology_notes: methodologyNotes,
        },
        data_completeness: completenessReport,
        execution_time_ms: null,
        job_id: null,
        message: hasFatalInvalidData,
      };
    }

    const capacities: Record<DispositionPathway, number> = {
      direct_reuse: req.pathway_capacities?.direct_reuse ?? trustedPassports.length,
      second_life_bess: req.pathway_capacities?.second_life_bess ?? trustedPassports.length,
      remanufacturing: req.pathway_capacities?.remanufacturing ?? trustedPassports.length,
      material_recycling: req.pathway_capacities?.material_recycling ?? trustedPassports.length,
    };

    const evaluationsByBattery = trustedPassports.map(p =>
      evaluateEligibilityForBattery(
        p,
        pathways,
        thresholds,
        weights,
        req.inspection_flags_by_battery?.[p.battery_id]
      )
    );

    const quboSpec = buildConstrainedQubo(evaluationsByBattery, pathways, capacities);

    // Check mathematical feasibility across hard eligibility + capacity constraints
    const { bestAssignment: exactFeasibleAssignment, bestScore: exactObjectiveScore } =
      solveExactConstrainedReference(evaluationsByBattery, pathways, capacities);

    const noEligibleBatteries = trustedPassports
      .map((p, idx) =>
        evaluationsByBattery[idx].every(e => !e.eligible || capacities[e.pathway] === 0)
          ? p.battery_id
          : null
      )
      .filter(Boolean) as string[];

    const totalAllowedSlots = pathways.reduce((sum, pw) => sum + capacities[pw], 0);

    if (!exactFeasibleAssignment) {
      const infeasibleDetails =
        noEligibleBatteries.length > 0
          ? `No eligible pathway with non-zero capacity for battery(ies): ${noEligibleBatteries.join(', ')}.`
          : totalAllowedSlots < trustedPassports.length
            ? `Total pathway processing capacity (${totalAllowedSlots} slots) is smaller than batch size (${trustedPassports.length} batteries).`
            : 'Combined pathway eligibility and facility slot capacities admit no valid assignment.';

      const constraintsSummary: ConstraintSummaryItem[] = [
        {
          constraint_id: 'HARD_SINGLE_ASSIGNMENT',
          category: 'hard_authoritative',
          description: 'Each battery must be assigned to exactly one disposition pathway.',
          satisfied: false,
          details: infeasibleDetails,
        },
        {
          constraint_id: 'HARD_FACILITY_CAPACITY',
          category: 'hard_capacity',
          description: 'Assigned batteries per pathway cannot exceed facility slot capacities.',
          satisfied: totalAllowedSlots >= trustedPassports.length,
          details: `Configured capacities: ${pathways.map(p => `${p}=${capacities[p]}`).join(', ')}`,
        },
      ];

      return {
        solver_status: 'INFEASIBLE',
        solver_name: 'constraint-feasibility-verifier',
        execution_mode: 'unexecuted',
        is_demo: false,
        is_live_qpiai_execution: false,
        objective_value: null,
        qubo_metadata: {
          problem_type: 'QUBO',
          num_binary_variables: quboSpec.numVariables,
          num_qubo_edges: quboSpec.quboEdges.length,
          penalty_multiplier: quboSpec.penaltyMultiplier,
          sample_edges: quboSpec.sampleEdges,
        },
        allocations: trustedPassports.map((p, idx) => ({
          battery_id: p.battery_id,
          selected_pathway: null,
          estimated_net_value_eur: null,
          estimated_net_co2_kg: null,
          available_energy_kwh: Number(
            (
              p.technical_specs.rated_capacity_kwh *
              (p.health_state.state_of_health_pct / 100)
            ).toFixed(2)
          ),
          rationale: infeasibleDetails,
          pathway_evaluations: evaluationsByBattery[idx],
        })),
        constraints_considered: constraintsSummary,
        assumptions_and_weights: {
          objective_weights: weights,
          configurable_demo_thresholds: thresholds,
          methodology_notes: methodologyNotes,
        },
        data_completeness: completenessReport,
        execution_time_ms: 0,
        job_id: null,
        message: `Infeasible disposition problem: ${infeasibleDetails}`,
      };
    }

    const buildAllocationsFromIndices = (chosenIndices: number[]): BatteryAllocationDecision[] =>
      trustedPassports.map((p, idx) => {
        const chosenJ = chosenIndices[idx];
        const chosenDetail = evaluationsByBattery[idx][chosenJ];
        const usableKwh = Number(
          (
            p.technical_specs.rated_capacity_kwh *
            (p.health_state.state_of_health_pct / 100)
          ).toFixed(2)
        );
        return {
          battery_id: p.battery_id,
          selected_pathway: chosenDetail.pathway,
          estimated_net_value_eur: chosenDetail.estimated_net_value_eur,
          estimated_net_co2_kg: chosenDetail.estimated_net_co2_kg,
          available_energy_kwh: usableKwh,
          rationale: `Selected '${chosenDetail.pathway}' (${p.chemistry}, SoH ${p.health_state.state_of_health_pct}%, ${usableKwh} kWh residual energy): est. net value EUR ${chosenDetail.estimated_net_value_eur}, net carbon impact ${chosenDetail.estimated_net_co2_kg} kg CO2e.`,
          pathway_evaluations: evaluationsByBattery[idx],
        };
      });

    const buildConstraintReport = (chosenIndices: number[]): ConstraintSummaryItem[] => {
      const countsByPathway: Record<string, number> = {};
      for (const pw of pathways) countsByPathway[pw] = 0;
      let allEligible = true;
      for (let i = 0; i < chosenIndices.length; i++) {
        const pw = pathways[chosenIndices[i]];
        countsByPathway[pw] = (countsByPathway[pw] || 0) + 1;
        if (!evaluationsByBattery[i][chosenIndices[i]].eligible) allEligible = false;
      }
      const capSatisfied = pathways.every(pw => countsByPathway[pw] <= capacities[pw]);

      return [
        {
          constraint_id: 'HARD_SINGLE_ASSIGNMENT',
          category: 'hard_authoritative',
          description: 'Every battery in the batch is assigned to exactly one pathway.',
          satisfied: chosenIndices.length === trustedPassports.length,
          details: `${chosenIndices.length}/${trustedPassports.length} batteries uniquely assigned.`,
        },
        {
          constraint_id: 'HARD_SAFETY_AND_LIFECYCLE_GATES',
          category: 'hard_authoritative',
          description:
            'Thermal/structural/isolation hazards and terminal RECYCLED batteries cannot enter reuse or BESS.',
          satisfied: allEligible,
          details: allEligible
            ? 'Zero safety or lifecycle gate violations.'
            : 'WARNING: Solver returned an ineligible assignment.',
        },
        {
          constraint_id: 'HARD_FACILITY_CAPACITY',
          category: 'hard_capacity',
          description: 'Pathway assignments respect configured facility slot capacities.',
          satisfied: capSatisfied,
          details: pathways
            .map(pw => `${pw}: ${countsByPathway[pw]}/${capacities[pw]} used`)
            .join(', '),
        },
        {
          constraint_id: 'CONFIGURABLE_ENGINEERING_THRESHOLDS',
          category: 'configurable_eligibility',
          description:
            'Non-statutory SoH, cycle count, and internal resistance operational rules.',
          satisfied: allEligible,
          details: `Reuse >=${thresholds.direct_reuse_min_soh_pct}% SoH, BESS >=${thresholds.second_life_min_soh_pct}% SoH, Reman >=${thresholds.remanufacturing_min_soh_pct}% SoH.`,
        },
      ];
    };

    const apiKey = (process.env.QPIAI_OPT_API_KEY || '').trim();
    const optUrl = (process.env.QPIAI_OPT_URL || '').trim();
    const allowDemo = Boolean(req.allow_demo_fallback);

    if (!apiKey || !optUrl) {
      if (allowDemo) {
        const t0 = performance.now();
        const allocations = buildAllocationsFromIndices(exactFeasibleAssignment);
        const elapsedMs = Number((performance.now() - t0).toFixed(2));
        return {
          solver_status: 'DEMO_REFERENCE_SOLVED',
          solver_name: 'local-exact-constrained-reference (DEMO — NOT QpiAI Opt Cloud)',
          execution_mode: 'demo_local_reference',
          is_demo: true,
          is_live_qpiai_execution: false,
          objective_value: exactObjectiveScore,
          qubo_metadata: {
            problem_type: 'QUBO',
            num_binary_variables: quboSpec.numVariables,
            num_qubo_edges: quboSpec.quboEdges.length,
            penalty_multiplier: quboSpec.penaltyMultiplier,
            sample_edges: quboSpec.sampleEdges,
          },
          allocations,
          constraints_considered: buildConstraintReport(exactFeasibleAssignment),
          assumptions_and_weights: {
            objective_weights: weights,
            configurable_demo_thresholds: thresholds,
            methodology_notes: methodologyNotes,
          },
          data_completeness: completenessReport,
          execution_time_ms: elapsedMs,
          job_id: null,
          message:
            'DEMO MODE RESULT: QPIAI_OPT_API_KEY / QPIAI_OPT_URL are not configured. Solved locally using the deterministic classical reference optimizer for demonstration—NOT a live QpiAI Opt execution.',
        };
      }

      return {
        solver_status: 'MISSING_CREDENTIALS',
        solver_name: 'qpiai-opt-api (unconfigured)',
        execution_mode: 'unexecuted',
        is_demo: false,
        is_live_qpiai_execution: false,
        objective_value: null,
        qubo_metadata: {
          problem_type: 'QUBO',
          num_binary_variables: quboSpec.numVariables,
          num_qubo_edges: quboSpec.quboEdges.length,
          penalty_multiplier: quboSpec.penaltyMultiplier,
          sample_edges: quboSpec.sampleEdges,
        },
        allocations: trustedPassports.map((p, idx) => ({
          battery_id: p.battery_id,
          selected_pathway: null,
          estimated_net_value_eur: null,
          estimated_net_co2_kg: null,
          available_energy_kwh: Number(
            (
              p.technical_specs.rated_capacity_kwh *
              (p.health_state.state_of_health_pct / 100)
            ).toFixed(2)
          ),
          rationale:
            'QUBO problem formulated, but live QpiAI Opt credentials are not configured and allow_demo_fallback=false.',
          pathway_evaluations: evaluationsByBattery[idx],
        })),
        constraints_considered: buildConstraintReport(exactFeasibleAssignment).map(c => ({
          ...c,
          details: `Pre-solve feasibility verified. ${c.details}`,
        })),
        assumptions_and_weights: {
          objective_weights: weights,
          configurable_demo_thresholds: thresholds,
          methodology_notes: methodologyNotes,
        },
        data_completeness: completenessReport,
        execution_time_ms: null,
        job_id: null,
        message:
          'QPIAI_OPT_API_KEY and QPIAI_OPT_URL are required for live QpiAI Opt execution. Set credentials in .env or enable allow_demo_fallback=true for local reference mode.',
      };
    }

    // Credentials exist -> execute via verified SDK client boundary
    const sdkRes = await this.sdkClient.solveQubo({
      numVariables: quboSpec.numVariables,
      quboEdges: quboSpec.quboEdges,
      maxEvaluations: req.max_evaluations ?? 1000,
      apiKey,
      optUrl,
    });

    if (!sdkRes.ok) {
      if (sdkRes.error_code === 'SDK_NOT_INSTALLED' && allowDemo) {
        return {
          solver_status: 'DEMO_REFERENCE_SOLVED',
          solver_name: 'local-exact-constrained-reference (DEMO — qpiai-opt-api not installed)',
          execution_mode: 'demo_local_reference',
          is_demo: true,
          is_live_qpiai_execution: false,
          objective_value: exactObjectiveScore,
          qubo_metadata: {
            problem_type: 'QUBO',
            num_binary_variables: quboSpec.numVariables,
            num_qubo_edges: quboSpec.quboEdges.length,
            penalty_multiplier: quboSpec.penaltyMultiplier,
            sample_edges: quboSpec.sampleEdges,
          },
          allocations: buildAllocationsFromIndices(exactFeasibleAssignment),
          constraints_considered: buildConstraintReport(exactFeasibleAssignment),
          assumptions_and_weights: {
            objective_weights: weights,
            configurable_demo_thresholds: thresholds,
            methodology_notes: methodologyNotes,
          },
          data_completeness: completenessReport,
          execution_time_ms: 0,
          job_id: null,
          message:
            'DEMO MODE RESULT: Python package qpiai-opt-api is not installed in runtime; returned local classical reference solution.',
        };
      }

      const mappedStatus =
        sdkRes.error_code === 'SDK_NOT_INSTALLED'
          ? 'SDK_NOT_INSTALLED'
          : sdkRes.error_code === 'MALFORMED_RESPONSE'
            ? 'MALFORMED_RESPONSE'
            : 'SOLVER_ERROR';

      return {
        solver_status: mappedStatus,
        solver_name: 'qpiai-opt-api (Solver)',
        execution_mode: 'unexecuted',
        is_demo: false,
        is_live_qpiai_execution: false,
        objective_value: null,
        qubo_metadata: {
          problem_type: 'QUBO',
          num_binary_variables: quboSpec.numVariables,
          num_qubo_edges: quboSpec.quboEdges.length,
          penalty_multiplier: quboSpec.penaltyMultiplier,
          sample_edges: quboSpec.sampleEdges,
        },
        allocations: [],
        constraints_considered: [],
        assumptions_and_weights: {
          objective_weights: weights,
          configurable_demo_thresholds: thresholds,
          methodology_notes: methodologyNotes,
        },
        data_completeness: completenessReport,
        execution_time_ms: null,
        job_id: null,
        message: sdkRes.message || 'QpiAI Opt solver execution failed.',
      };
    }

    // Validate live SDK solution dictionary
    const sol = sdkRes.solution;
    if (!sol || typeof sol !== 'object' || Array.isArray(sol)) {
      return {
        solver_status: 'MALFORMED_RESPONSE',
        solver_name: 'qpiai-opt-api (Solver)',
        execution_mode: 'unexecuted',
        is_demo: false,
        is_live_qpiai_execution: false,
        objective_value: null,
        qubo_metadata: {
          problem_type: 'QUBO',
          num_binary_variables: quboSpec.numVariables,
          num_qubo_edges: quboSpec.quboEdges.length,
          penalty_multiplier: quboSpec.penaltyMultiplier,
          sample_edges: quboSpec.sampleEdges,
        },
        allocations: [],
        constraints_considered: [],
        assumptions_and_weights: {
          objective_weights: weights,
          configurable_demo_thresholds: thresholds,
          methodology_notes: methodologyNotes,
        },
        data_completeness: completenessReport,
        execution_time_ms: sdkRes.execution_time_ms ?? null,
        job_id: sdkRes.job_id ?? null,
        message: 'Malformed SDK response: Solver.get_solution() did not return a valid assignment dictionary.',
      };
    }

    const decodedIndices: number[] = [];
    for (let i = 0; i < trustedPassports.length; i++) {
      const activeJ: number[] = [];
      for (let j = 0; j < pathways.length; j++) {
        const varIdx = i * pathways.length + j;
        const bitVal = sol[String(varIdx)] ?? (sol as any)[varIdx];
        if (bitVal !== 0 && bitVal !== 1) {
          return {
            solver_status: 'MALFORMED_RESPONSE',
            solver_name: 'qpiai-opt-api (Solver)',
            execution_mode: 'unexecuted',
            is_demo: false,
            is_live_qpiai_execution: false,
            objective_value: null,
            qubo_metadata: {
              problem_type: 'QUBO',
              num_binary_variables: quboSpec.numVariables,
              num_qubo_edges: quboSpec.quboEdges.length,
              penalty_multiplier: quboSpec.penaltyMultiplier,
              sample_edges: quboSpec.sampleEdges,
            },
            allocations: [],
            constraints_considered: [],
            assumptions_and_weights: {
              objective_weights: weights,
              configurable_demo_thresholds: thresholds,
              methodology_notes: methodologyNotes,
            },
            data_completeness: completenessReport,
            execution_time_ms: sdkRes.execution_time_ms ?? null,
            job_id: sdkRes.job_id ?? null,
            message: `Malformed SDK response: variable ${varIdx} has non-binary value '${String(bitVal)}'.`,
          };
        }
        if (bitVal === 1) activeJ.push(j);
      }
      if (activeJ.length !== 1) {
        return {
          solver_status: 'SOLVER_ERROR',
          solver_name: 'qpiai-opt-api (Solver)',
          execution_mode: 'live_qpiai_opt_cloud',
          is_demo: false,
          is_live_qpiai_execution: true,
          objective_value: sdkRes.result?.objective ?? null,
          qubo_metadata: {
            problem_type: 'QUBO',
            num_binary_variables: quboSpec.numVariables,
            num_qubo_edges: quboSpec.quboEdges.length,
            penalty_multiplier: quboSpec.penaltyMultiplier,
            sample_edges: quboSpec.sampleEdges,
          },
          allocations: [],
          constraints_considered: [],
          assumptions_and_weights: {
            objective_weights: weights,
            configurable_demo_thresholds: thresholds,
            methodology_notes: methodologyNotes,
          },
          data_completeness: completenessReport,
          execution_time_ms: sdkRes.execution_time_ms ?? null,
          job_id: sdkRes.job_id ?? null,
          message: `Solver solution violated single-pathway constraint for battery ${trustedPassports[i].battery_id}.`,
        };
      }
      decodedIndices.push(activeJ[0]);
    }

    const reportedTimeMs =
      typeof sdkRes.result?.time === 'number'
        ? Number((sdkRes.result.time * 1000).toFixed(2))
        : (sdkRes.execution_time_ms ?? null);

    return {
      solver_status: 'LIVE_SOLVED',
      solver_name: 'qpiai-opt-api (qpiai_opt.solver.solver.Solver)',
      execution_mode: 'live_qpiai_opt_cloud',
      is_demo: false,
      is_live_qpiai_execution: true,
      objective_value:
        typeof sdkRes.result?.objective === 'number' ? sdkRes.result.objective : null,
      qubo_metadata: {
        problem_type: 'QUBO',
        num_binary_variables: quboSpec.numVariables,
        num_qubo_edges: quboSpec.quboEdges.length,
        penalty_multiplier: quboSpec.penaltyMultiplier,
        sample_edges: quboSpec.sampleEdges,
      },
      allocations: buildAllocationsFromIndices(decodedIndices),
      constraints_considered: buildConstraintReport(decodedIndices),
      assumptions_and_weights: {
        objective_weights: weights,
        configurable_demo_thresholds: thresholds,
        methodology_notes: methodologyNotes,
      },
      data_completeness: completenessReport,
      execution_time_ms: reportedTimeMs,
      job_id: sdkRes.job_id ?? null,
      message: 'Executed constrained QUBO disposition optimization on live QpiAI Opt Cloud Solver.',
    };
  }
}

export const qpiaiOptIntegration = new QpiAIOptIntegration();
