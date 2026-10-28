import { execFile } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import type { BatteryPassport } from '../../types/index.ts';
import type {
  PredefinedQuantumExperiment,
  QuantumRunRequest,
  QuantumRunResponse,
  ServiceIntegrationStatus,
  SupportedQpiAIBackend,
} from '../schemas/qpiai.ts';
import { SIMULATOR_BACKENDS, VALID_QPIAI_BACKENDS } from '../schemas/qpiai.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const BRIDGE_SCRIPT_PATH = path.join(__dirname, 'sdk_bridge.py');

export const DEFAULT_QCLOUD_SERVER_URL = 'https://qcloud-server.qpiai.tech';

export interface QpiAIQCloudSdkRawResult {
  ok: boolean;
  error_code?:
    | 'SDK_NOT_INSTALLED'
    | 'MISSING_CREDENTIALS'
    | 'AUTH_ERROR'
    | 'BACKEND_UNAVAILABLE'
    | 'TIMEOUT'
    | 'QUOTA_EXCEEDED'
    | 'MALFORMED_RESPONSE'
    | 'EXECUTION_ERROR';
  message?: string;
  counts?: Record<string, number> | null;
  probabilities?: Record<string, number> | null;
  execution_time_ms?: number | null;
  job_id?: string | null;
  job_status?: string | null;
  method?: string | null;
  credits_used?: number | null;
  job_metadata?: Record<string, any> | null;
}

export interface QpiAIQCloudSdkClient {
  checkInstalled(): Promise<boolean>;
  verifyCloudAuth(apiKey: string, serverUrl: string): Promise<{
    reachable: boolean;
    authenticated: boolean;
    message: string;
  }>;
  executeExperiment(params: {
    experimentType: PredefinedQuantumExperiment;
    backend: SupportedQpiAIBackend;
    shots: number;
    timeoutMs: number;
    angles: Record<string, number>;
    apiKey: string;
    serverUrl: string;
  }): Promise<QpiAIQCloudSdkRawResult>;
}

function execPythonQuantumBridge(
  inputObj: Record<string, any>,
  envOverrides: Record<string, string>,
  timeoutMs = 15000
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
            error_code: isTimeout ? 'TIMEOUT' : 'EXECUTION_ERROR',
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
            message: 'Quantum SDK bridge returned malformed non-JSON output.',
          });
        }
      }
    );
    child.stdin?.write(JSON.stringify(inputObj));
    child.stdin?.end();
  });
}

export const defaultQpiAIQCloudSdkClient: QpiAIQCloudSdkClient = {
  async checkInstalled(): Promise<boolean> {
    const res = await execPythonQuantumBridge({ action: 'check' }, {}, 5000);
    return Boolean(res?.qpiai_quantum_installed);
  },
  async verifyCloudAuth(apiKey: string, serverUrl: string) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 5000);
      // Matches QpiAIQuantumAuth.me() in qpiai_quantum/authentication/auth.py
      const res = await fetch(`${serverUrl.replace(/\/+$/, '')}/api/users/me`, {
        method: 'GET',
        headers: { 'X-Secret-Token': apiKey },
        signal: controller.signal,
      });
      clearTimeout(timer);
      if (res.status === 200) {
        return {
          reachable: true,
          authenticated: true,
          message: 'Authenticated with QpiAI QCloud (/api/users/me).',
        };
      }
      if (res.status === 401 || res.status === 403) {
        return {
          reachable: true,
          authenticated: false,
          message: `QpiAI QCloud rejected API key (HTTP ${res.status}).`,
        };
      }
      return {
        reachable: false,
        authenticated: false,
        message: `QpiAI QCloud returned unexpected HTTP ${res.status}.`,
      };
    } catch (err: any) {
      return {
        reachable: false,
        authenticated: false,
        message: `QpiAI QCloud endpoint unreachable: ${err?.message || String(err)}`,
      };
    }
  },
  async executeExperiment({
    experimentType,
    backend,
    shots,
    timeoutMs,
    angles,
    apiKey,
    serverUrl,
  }): Promise<QpiAIQCloudSdkRawResult> {
    return execPythonQuantumBridge(
      {
        action: 'quantum',
        payload: {
          experiment_type: experimentType,
          backend,
          shots,
          timeout_ms: timeoutMs,
          angles,
        },
      },
      {
        QPIAI_QUANTUM_API_KEY: apiKey,
        API_KEY: apiKey,
        QPIAI_SERVER_URL: serverUrl,
      },
      timeoutMs + 2000
    );
  },
};

interface Complex {
  re: number;
  im: number;
}

/**
 * Isolated 2-4 qubit exact statevector simulator used ONLY when allow_demo_simulation=true,
 * explicitly labelled as 'demo_local_statevector' and never attributed to QpiAI QCloud or Indus QPU.
 */
function simulateDemoStatevectorCounts(
  experimentType: PredefinedQuantumExperiment,
  angles: Record<string, number>,
  shots: number
): { counts: Record<string, number>; probabilities: Record<string, number> } {
  const numQubits = experimentType === 'telemetry_anomaly_ising' ? 4 : 2;
  const dim = 1 << numQubits;
  const state: Complex[] = Array.from({ length: dim }, (_, i) => ({
    re: i === 0 ? 1 : 0,
    im: 0,
  }));

  const applySingleQubit = (
    q: number,
    m00: Complex,
    m01: Complex,
    m10: Complex,
    m11: Complex
  ) => {
    const bit = 1 << (numQubits - 1 - q);
    for (let i = 0; i < dim; i++) {
      if ((i & bit) === 0) {
        const j = i | bit;
        const a = state[i];
        const b = state[j];
        state[i] = {
          re: m00.re * a.re - m00.im * a.im + (m01.re * b.re - m01.im * b.im),
          im: m00.re * a.im + m00.im * a.re + (m01.re * b.im + m01.im * b.re),
        };
        state[j] = {
          re: m10.re * a.re - m10.im * a.im + (m11.re * b.re - m11.im * b.im),
          im: m10.re * a.im + m10.im * a.re + (m11.re * b.im + m11.im * b.re),
        };
      }
    }
  };

  const hGate = (q: number) => {
    const s = 1 / Math.sqrt(2);
    applySingleQubit(q, { re: s, im: 0 }, { re: s, im: 0 }, { re: s, im: 0 }, { re: -s, im: 0 });
  };
  const ryGate = (q: number, theta: number) => {
    const c = Math.cos(theta / 2);
    const s = Math.sin(theta / 2);
    applySingleQubit(q, { re: c, im: 0 }, { re: -s, im: 0 }, { re: s, im: 0 }, { re: c, im: 0 });
  };
  const rxGate = (q: number, theta: number) => {
    const c = Math.cos(theta / 2);
    const s = Math.sin(theta / 2);
    applySingleQubit(q, { re: c, im: 0 }, { re: 0, im: -s }, { re: 0, im: -s }, { re: c, im: 0 });
  };
  const rzGate = (q: number, theta: number) => {
    const c = Math.cos(theta / 2);
    const s = Math.sin(theta / 2);
    applySingleQubit(q, { re: c, im: -s }, { re: 0, im: 0 }, { re: 0, im: 0 }, { re: c, im: s });
  };
  const cxGate = (control: number, target: number) => {
    const cBit = 1 << (numQubits - 1 - control);
    const tBit = 1 << (numQubits - 1 - target);
    for (let i = 0; i < dim; i++) {
      if ((i & cBit) !== 0 && (i & tBit) === 0) {
        const j = i | tBit;
        const tmp = state[i];
        state[i] = state[j];
        state[j] = tmp;
      }
    }
  };

  if (experimentType === 'bell_calibration_check') {
    hGate(0);
    cxGate(0, 1);
  } else if (experimentType === 'toy_disposition_ising_2pack') {
    hGate(0);
    hGate(1);
    rzGate(0, angles.theta0 ?? 0.5);
    rzGate(1, angles.theta1 ?? 0.8);
    cxGate(0, 1);
    rzGate(1, angles.gamma ?? 0.4);
    cxGate(0, 1);
    rxGate(0, angles.beta ?? 0.35);
    rxGate(1, angles.beta ?? 0.35);
  } else {
    const a0 = angles.q0_fade ?? 0.3;
    const a1 = angles.q1_resistance ?? 0.4;
    const a2 = angles.q2_cycles ?? 0.5;
    const a3 = angles.q3_thermal ?? 0.1;
    ryGate(0, a0);
    ryGate(1, a1);
    ryGate(2, a2);
    ryGate(3, a3);
    cxGate(0, 1);
    cxGate(1, 2);
    cxGate(2, 3);
    rzGate(1, (a0 + a1) * 0.5);
    rzGate(2, (a1 + a2) * 0.5);
  }

  const probsRaw = state.map(amp => amp.re * amp.re + amp.im * amp.im);
  const counts: Record<string, number> = {};
  const probabilities: Record<string, number> = {};

  // Deterministic largest-remainder multinomial allocation matching exact Born probabilities
  const exactExpected = probsRaw.map(p => p * shots);
  const floors = exactExpected.map(v => Math.floor(v));
  let allocated = floors.reduce((a, b) => a + b, 0);
  const remainders = exactExpected
    .map((v, idx) => ({ idx, rem: v - floors[idx] }))
    .sort((a, b) => b.rem - a.rem);

  for (let k = 0; k < shots - allocated; k++) {
    floors[remainders[k].idx]++;
  }

  for (let i = 0; i < dim; i++) {
    const bitstr = i.toString(2).padStart(numQubits, '0');
    if (floors[i] > 0) {
      counts[bitstr] = floors[i];
      probabilities[bitstr] = Number((floors[i] / shots).toFixed(4));
    }
  }

  return { counts, probabilities };
}

function buildExperimentDefinition(
  experimentType: PredefinedQuantumExperiment,
  passports: BatteryPassport[]
): {
  title: string;
  purposeAndLimits: string;
  encodingMap: Record<string, string>;
  numQubits: number;
  circuitDepth: number;
  gateCounts: Record<string, number>;
  angles: Record<string, number>;
} {
  const p0 = passports[0];
  const p1 = passports[1] ?? passports[0];

  if (experimentType === 'bell_calibration_check') {
    return {
      title: '2-Qubit Bell Entanglement & Readout Calibration Check',
      purposeAndLimits:
        'Constructs the canonical 2-qubit Bell state (|00> + |11>)/sqrt(2) from the official QpiAI Quantum SDK quickstart to verify backend connectivity, shot statistics, and readout correlation. Does not encode optimization decisions.',
      encodingMap: {
        q0: 'Control qubit initialized in uniform superposition via H(0)',
        q1: 'Target qubit entangled via CX(0, 1); ideal readout concentrates on 00 and 11',
      },
      numQubits: 2,
      circuitDepth: 3,
      gateCounts: { H: 1, CX: 1, MEASURE: 2 },
      angles: {},
    };
  }

  if (experimentType === 'toy_disposition_ising_2pack') {
    const soh0 = p0?.health_state?.state_of_health_pct ?? 88.4;
    const soh1 = p1?.health_state?.state_of_health_pct ?? 64.2;
    // Positive bias favors |0> (Second-Life BESS) when SoH > 75%, negative favors |1> (Material Recycling)
    const theta0 = Number((((75.0 - soh0) / 25.0) * (Math.PI / 2)).toFixed(4));
    const theta1 = Number((((75.0 - soh1) / 25.0) * (Math.PI / 2)).toFixed(4));
    const gamma = 0.45; // shared BESS slot coupling penalty
    const beta = 0.38; // transverse mixer angle

    return {
      title: '2-Qubit Toy Ising Encoding of 2-Battery BESS Slot Contention',
      purposeAndLimits:
        'Maps 2 battery passports onto a single-layer 2-qubit Ising/QAOA-style circuit (|0> = Second-Life BESS, |1> = Material Recycling) with an RZZ (CX-RZ-CX) coupling penalty representing a single shared BESS slot. Strictly an educational 2-qubit encoding demonstration—NOT a globally optimal industrial fleet solver.',
      encodingMap: {
        q0: `Battery ${p0?.battery_id || 'Pack-0'} (SoH ${soh0}%): |0>=Second-Life BESS, |1>=Recycling, RZ(${theta0} rad)`,
        q1: `Battery ${p1?.battery_id || 'Pack-1'} (SoH ${soh1}%): |0>=Second-Life BESS, |1>=Recycling, RZ(${theta1} rad)`,
        coupling_RZZ: `Shared BESS slot contention coupling gamma=${gamma} rad via CX(0,1)-RZ(1,gamma)-CX(0,1)`,
      },
      numQubits: 2,
      circuitDepth: 7,
      gateCounts: { H: 2, RZ: 3, CX: 2, RX: 2, MEASURE: 2 },
      angles: { theta0, theta1, gamma, beta },
    };
  }

  // telemetry_anomaly_ising (4 qubits)
  const soh = p0?.health_state?.state_of_health_pct ?? 88.4;
  const resistance = p0?.health_state?.internal_resistance_mohm ?? 19.8;
  const cycles = p0?.health_state?.cycle_count ?? 420;
  const fadeRate = p0?.health_state?.capacity_fade_rate_pct_yr ?? 1.9;

  const q0Fade = Number((Math.min(1, Math.max(0, (100 - soh) / 40)) * Math.PI * 0.85).toFixed(4));
  const q1Res = Number(
    (Math.min(1, Math.max(0, (resistance - 15) / 30)) * Math.PI * 0.85).toFixed(4)
  );
  const q2Cycles = Number((Math.min(1, Math.max(0, cycles / 3000)) * Math.PI * 0.85).toFixed(4));
  const q3Thermal = Number(
    (Math.min(1, Math.max(0, (fadeRate - 1.2) / 3.0)) * Math.PI * 0.85).toFixed(4)
  );

  return {
    title: '4-Qubit Battery Telemetry Angle Encoding & Correlation Readout',
    purposeAndLimits:
      'Encodes 4 normalized BMS degradation indicators from a trusted battery passport into 4 qubit RY rotation angles with nearest-neighbor CX entanglement to inspect multi-indicator excitation probabilities (e.g., |1111> high-stress bitstrings). Experimental quantum feature-map demonstration only; does not replace physical electrochemical or BMS safety testing.',
    encodingMap: {
      q0: `Capacity fade indicator (${(100 - soh).toFixed(1)}% loss) -> RY(${q0Fade} rad) on ${p0?.battery_id || 'sample'}`,
      q1: `Internal resistance indicator (${resistance} mΩ) -> RY(${q1Res} rad)`,
      q2: `Cycle aging indicator (${cycles} cycles) -> RY(${q2Cycles} rad)`,
      q3: `Annual fade stress indicator (${fadeRate}%/yr) -> RY(${q3Thermal} rad)`,
    },
    numQubits: 4,
    circuitDepth: 9,
    gateCounts: { RY: 4, CX: 3, RZ: 2, MEASURE: 4 },
    angles: {
      q0_fade: q0Fade,
      q1_resistance: q1Res,
      q2_cycles: q2Cycles,
      q3_thermal: q3Thermal,
    },
  };
}

function validateMeasurementCounts(
  counts: any,
  expectedQubits: number,
  expectedShots: number
): { valid: boolean; reason?: string; probabilities?: Record<string, number> } {
  if (!counts || typeof counts !== 'object' || Array.isArray(counts)) {
    return { valid: false, reason: 'SDK result counts is missing or not a dictionary.' };
  }
  const entries = Object.entries(counts);
  if (entries.length === 0) {
    return { valid: false, reason: 'SDK result counts dictionary is empty.' };
  }

  let total = 0;
  const bitPattern = new RegExp(`^[01]{${expectedQubits}}$`);
  for (const [bitstr, val] of entries) {
    if (!bitPattern.test(bitstr)) {
      return {
        valid: false,
        reason: `Invalid bitstring key '${bitstr}' for ${expectedQubits}-qubit register.`,
      };
    }
    if (typeof val !== 'number' || !Number.isInteger(val) || val < 0) {
      return {
        valid: false,
        reason: `Invalid shot count '${String(val)}' for bitstring '${bitstr}'.`,
      };
    }
    total += val;
  }

  if (total !== expectedShots) {
    return {
      valid: false,
      reason: `Total measured counts (${total}) does not match requested shots (${expectedShots}).`,
    };
  }

  const probabilities: Record<string, number> = {};
  for (const [bitstr, val] of entries) {
    probabilities[bitstr] = Number(((val as number) / total).toFixed(4));
  }

  return { valid: true, probabilities };
}

export class QpiAIQCloudIntegration {
  private sdkClient: QpiAIQCloudSdkClient;

  constructor(sdkClient: QpiAIQCloudSdkClient = defaultQpiAIQCloudSdkClient) {
    this.sdkClient = sdkClient;
  }

  async getStatus(): Promise<ServiceIntegrationStatus> {
    const apiKey = (process.env.QPIAI_QUANTUM_API_KEY || '').trim();
    const serverUrl = (process.env.QPIAI_SERVER_URL || DEFAULT_QCLOUD_SERVER_URL).trim();
    const configuredBackend = (process.env.QPIAI_QUANTUM_BACKEND || 'QpiAI-QSV-Local').trim();
    const demoDefault = process.env.QPIAI_DEMO_MODE === 'true';
    const sdkInstalled = await this.sdkClient.checkInstalled();

    const setupInstructions = [
      'Install verified Python SDK: pip install qpiai-quantum',
      'Obtain QCloud API key from https://qcloud.qpiai.tech/ and set QPIAI_QUANTUM_API_KEY in .env',
      'Optional: set QPIAI_SERVER_URL (defaults to https://qcloud-server.qpiai.tech) and QPIAI_QUANTUM_BACKEND',
    ];

    if (!apiKey) {
      return {
        service_name: 'QpiAI QCloud & Quantum SDK (qpiai-quantum)',
        status: demoDefault ? 'demo_mode' : 'missing_credentials',
        sdk_package:
          'qpiai-quantum (QpiAIQuantumAuth, Circuit, Backend, ExecutionEngine)',
        sdk_installed: sdkInstalled,
        credentials_configured: false,
        endpoint_url: serverUrl,
        active_execution_mode: demoDefault ? 'demo_local_statevector' : 'unconfigured',
        supported_backends: VALID_QPIAI_BACKENDS,
        diagnostic_message:
          'QPIAI_QUANTUM_API_KEY is not configured. Note: qpiai-quantum requires API key authentication for both remote QCloud backends and QpiAI-QSV-Local.',
        setup_instructions: setupInstructions,
      };
    }

    const authProbe = await this.sdkClient.verifyCloudAuth(apiKey, serverUrl);

    if (!sdkInstalled) {
      return {
        service_name: 'QpiAI QCloud & Quantum SDK (qpiai-quantum)',
        status: authProbe.authenticated ? 'configured_but_unavailable' : 'execution_error',
        sdk_package: 'qpiai-quantum',
        sdk_installed: false,
        credentials_configured: true,
        endpoint_url: serverUrl,
        active_execution_mode: 'sdk_missing',
        supported_backends: VALID_QPIAI_BACKENDS,
        diagnostic_message: `Python package 'qpiai-quantum' is not installed in runtime. Cloud auth probe: ${authProbe.message}`,
        setup_instructions: setupInstructions,
      };
    }

    if (!authProbe.reachable) {
      return {
        service_name: 'QpiAI QCloud & Quantum SDK (qpiai-quantum)',
        status: 'configured_but_unavailable',
        sdk_package: 'qpiai-quantum',
        sdk_installed: true,
        credentials_configured: true,
        endpoint_url: serverUrl,
        active_execution_mode: 'unavailable',
        supported_backends: VALID_QPIAI_BACKENDS,
        diagnostic_message: authProbe.message,
        setup_instructions: setupInstructions,
      };
    }

    if (!authProbe.authenticated) {
      return {
        service_name: 'QpiAI QCloud & Quantum SDK (qpiai-quantum)',
        status: 'execution_error',
        sdk_package: 'qpiai-quantum',
        sdk_installed: true,
        credentials_configured: true,
        endpoint_url: serverUrl,
        active_execution_mode: 'auth_failed',
        supported_backends: VALID_QPIAI_BACKENDS,
        diagnostic_message: authProbe.message,
        setup_instructions: setupInstructions,
      };
    }

    const isSimOnly = SIMULATOR_BACKENDS.has(configuredBackend);
    return {
      service_name: 'QpiAI QCloud & Quantum SDK (qpiai-quantum)',
      status: isSimOnly ? 'simulator_only' : 'configured_and_reachable',
      sdk_package: 'qpiai-quantum',
      sdk_installed: true,
      credentials_configured: true,
      endpoint_url: serverUrl,
      active_execution_mode: isSimOnly ? 'qcloud_simulator' : 'qcloud_hardware_qpu',
      supported_backends: VALID_QPIAI_BACKENDS,
      diagnostic_message: isSimOnly
        ? `Authenticated with QpiAI QCloud; default backend '${configuredBackend}' is a quantum simulator.`
        : `Authenticated with QpiAI QCloud; hardware QPU backend '${configuredBackend}' selected.`,
      setup_instructions: [],
    };
  }

  async runQuantumExperiment(
    req: QuantumRunRequest,
    trustedPassports: BatteryPassport[]
  ): Promise<QuantumRunResponse> {
    const backend: SupportedQpiAIBackend =
      req.backend ||
      ((process.env.QPIAI_QUANTUM_BACKEND as SupportedQpiAIBackend) || 'QpiAI-QSV-Local');
    const shots = req.shots ?? 1024;
    const timeoutMs = req.timeout_ms ?? 15000;
    const allowDemo = Boolean(req.allow_demo_simulation);

    const expDef = buildExperimentDefinition(req.experiment_type, trustedPassports);

    const baseSummary = {
      num_qubits: expDef.numQubits,
      num_clbits: expDef.numQubits,
      circuit_depth: expDef.circuitDepth,
      gate_counts: expDef.gateCounts,
      rotation_angles_rad: expDef.angles,
    };

    const apiKey = (process.env.QPIAI_QUANTUM_API_KEY || '').trim();
    const serverUrl = (process.env.QPIAI_SERVER_URL || DEFAULT_QCLOUD_SERVER_URL).trim();

    if (!apiKey) {
      if (allowDemo) {
        const t0 = performance.now();
        const { counts, probabilities } = simulateDemoStatevectorCounts(
          req.experiment_type,
          expDef.angles,
          shots
        );
        const elapsedMs = Number((performance.now() - t0).toFixed(2));
        return {
          execution_status: 'DEMO_SIMULATED',
          experiment_type: req.experiment_type,
          experiment_title: expDef.title,
          scientific_purpose_and_limits: expDef.purposeAndLimits,
          variable_encoding_map: expDef.encodingMap,
          backend_requested: backend,
          backend_used: 'local-ts-statevector-demo (NOT QpiAI QCloud)',
          execution_mode: 'demo_local_statevector',
          is_simulated: true,
          is_cloud_execution: false,
          is_demo: true,
          circuit_summary: baseSummary,
          shots_requested: shots,
          measurement_counts: counts,
          measurement_probabilities: probabilities,
          device_metadata: {
            provider: 'local-educational-reference',
            note: 'QPIAI_QUANTUM_API_KEY not configured; executed local statevector demonstration.',
          },
          execution_time_ms: elapsedMs,
          job_id: null,
          message:
            'DEMO SIMULATION: QPIAI_QUANTUM_API_KEY is missing. Executed on local educational statevector calculator—NOT on QpiAI QCloud or Indus QPU.',
        };
      }

      return {
        execution_status: 'MISSING_CREDENTIALS',
        experiment_type: req.experiment_type,
        experiment_title: expDef.title,
        scientific_purpose_and_limits: expDef.purposeAndLimits,
        variable_encoding_map: expDef.encodingMap,
        backend_requested: backend,
        backend_used: null,
        execution_mode: 'unexecuted',
        is_simulated: false,
        is_cloud_execution: false,
        is_demo: false,
        circuit_summary: baseSummary,
        shots_requested: shots,
        measurement_counts: null,
        measurement_probabilities: null,
        device_metadata: null,
        execution_time_ms: null,
        job_id: null,
        message:
          'QPIAI_QUANTUM_API_KEY is not configured. No quantum execution was performed and no measurement counts were fabricated. Set QPIAI_QUANTUM_API_KEY in .env or pass allow_demo_simulation=true for an explicitly labelled local demo.',
      };
    }

    const sdkRes = await this.sdkClient.executeExperiment({
      experimentType: req.experiment_type,
      backend,
      shots,
      timeoutMs,
      angles: expDef.angles,
      apiKey,
      serverUrl,
    });

    if (!sdkRes.ok) {
      if (sdkRes.error_code === 'SDK_NOT_INSTALLED' && allowDemo) {
        const t0 = performance.now();
        const { counts, probabilities } = simulateDemoStatevectorCounts(
          req.experiment_type,
          expDef.angles,
          shots
        );
        const elapsedMs = Number((performance.now() - t0).toFixed(2));
        return {
          execution_status: 'DEMO_SIMULATED',
          experiment_type: req.experiment_type,
          experiment_title: expDef.title,
          scientific_purpose_and_limits: expDef.purposeAndLimits,
          variable_encoding_map: expDef.encodingMap,
          backend_requested: backend,
          backend_used: 'local-ts-statevector-demo (qpiai-quantum not installed)',
          execution_mode: 'demo_local_statevector',
          is_simulated: true,
          is_cloud_execution: false,
          is_demo: true,
          circuit_summary: baseSummary,
          shots_requested: shots,
          measurement_counts: counts,
          measurement_probabilities: probabilities,
          device_metadata: {
            provider: 'local-educational-reference',
            note: 'Python package qpiai-quantum not installed; executed local demo simulation.',
          },
          execution_time_ms: elapsedMs,
          job_id: null,
          message:
            'DEMO SIMULATION: Python package qpiai-quantum is not installed; ran local statevector demo.',
        };
      }

      const errorStatusMap: Record<string, QuantumRunResponse['execution_status']> = {
        SDK_NOT_INSTALLED: 'SDK_NOT_INSTALLED',
        MISSING_CREDENTIALS: 'MISSING_CREDENTIALS',
        AUTH_ERROR: 'AUTH_ERROR',
        BACKEND_UNAVAILABLE: 'BACKEND_UNAVAILABLE',
        TIMEOUT: 'TIMEOUT',
        QUOTA_EXCEEDED: 'QUOTA_EXCEEDED',
        MALFORMED_RESPONSE: 'MALFORMED_RESPONSE',
        EXECUTION_ERROR: 'EXECUTION_ERROR',
      };

      return {
        execution_status: errorStatusMap[sdkRes.error_code || 'EXECUTION_ERROR'] || 'EXECUTION_ERROR',
        experiment_type: req.experiment_type,
        experiment_title: expDef.title,
        scientific_purpose_and_limits: expDef.purposeAndLimits,
        variable_encoding_map: expDef.encodingMap,
        backend_requested: backend,
        backend_used: null,
        execution_mode: 'unexecuted',
        is_simulated: false,
        is_cloud_execution: false,
        is_demo: false,
        circuit_summary: baseSummary,
        shots_requested: shots,
        measurement_counts: null,
        measurement_probabilities: null,
        device_metadata: null,
        execution_time_ms: null,
        job_id: null,
        message: sdkRes.message || 'QpiAI Quantum SDK execution failed.',
      };
    }

    const validation = validateMeasurementCounts(sdkRes.counts, expDef.numQubits, shots);
    if (!validation.valid) {
      return {
        execution_status: 'MALFORMED_RESPONSE',
        experiment_type: req.experiment_type,
        experiment_title: expDef.title,
        scientific_purpose_and_limits: expDef.purposeAndLimits,
        variable_encoding_map: expDef.encodingMap,
        backend_requested: backend,
        backend_used: null,
        execution_mode: 'unexecuted',
        is_simulated: false,
        is_cloud_execution: false,
        is_demo: false,
        circuit_summary: baseSummary,
        shots_requested: shots,
        measurement_counts: null,
        measurement_probabilities: null,
        device_metadata: null,
        execution_time_ms: sdkRes.execution_time_ms ?? null,
        job_id: sdkRes.job_id ?? null,
        message: `Malformed response from QpiAI Quantum SDK: ${validation.reason}`,
      };
    }

    const isSimulator = SIMULATOR_BACKENDS.has(backend);
    const isLocalSdkSim = backend === 'QpiAI-QSV-Local';
    const isCloud = !isLocalSdkSim;

    return {
      execution_status: isSimulator ? 'SIMULATOR_COMPLETED' : 'CLOUD_COMPLETED',
      experiment_type: req.experiment_type,
      experiment_title: expDef.title,
      scientific_purpose_and_limits: expDef.purposeAndLimits,
      variable_encoding_map: expDef.encodingMap,
      backend_requested: backend,
      backend_used: backend,
      execution_mode: isSimulator
        ? isLocalSdkSim
          ? 'sdk_local_simulator'
          : 'qcloud_remote_simulator'
        : 'qcloud_hardware_qpu',
      is_simulated: isSimulator,
      is_cloud_execution: isCloud,
      is_demo: false,
      circuit_summary: baseSummary,
      shots_requested: shots,
      measurement_counts: sdkRes.counts!,
      measurement_probabilities: validation.probabilities!,
      device_metadata: {
        device_name: backend,
        method: sdkRes.method || (isSimulator ? 'statevector' : 'qpu'),
        job_status: sdkRes.job_status || 'completed',
        credits_used: sdkRes.credits_used ?? 0,
        ...(sdkRes.job_metadata || {}),
      },
      execution_time_ms: sdkRes.execution_time_ms ?? null,
      job_id: sdkRes.job_id ?? null,
      message: isSimulator
        ? `SIMULATED EXECUTION: Circuit measured (${shots} shots) on QpiAI simulator backend '${backend}'.`
        : `CLOUD QPU EXECUTION: Circuit measured (${shots} shots) on physical QpiAI hardware '${backend}'.`,
    };
  }
}

export const qpiaiQCloudIntegration = new QpiAIQCloudIntegration();
