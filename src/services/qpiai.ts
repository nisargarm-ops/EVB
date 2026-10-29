import type { QpiAIOptResponse, QpiAIQuantumResponse } from '../types/index.ts';

const DEFAULT_OPT_SERVER_URL = 'https://opt-server.qpiai.tech/api';
const DEFAULT_QCLOUD_SERVER_URL = 'https://qcloud-server.qpiai.tech';

export const SUPPORTED_QCLOUD_BACKENDS = [
  'QpiAI-QSV-Local',
  'QpiAI-QSV-Simulator',
  'QpiAI-QSV-Lite',
  'QpiAI-QDM-Simulator',
  'QpiAI-QDM-Lite',
  'QpiAI-QTN-Simulator',
  'QpiAI-Indus-1',
] as const;

function readServerEnv(serverKey: string): string {
  try {
    if (typeof process !== 'undefined' && process.env && process.env[serverKey]) {
      return String(process.env[serverKey]).trim();
    }
  } catch {
    // Ignore in browser environment
  }
  return '';
}

/**
 * Normalizes QPIAI_OPT_URL. Legacy templates set `https://opt.qpiai.tech/api/v1` or
 * `https://opt.qpiai.tech` (which now hosts the Next.js web portal UI, not the REST API).
 * Maps those legacy portal URLs to the official QpiAI-Opt Platform API (`https://opt-server.qpiai.tech/api`)
 * while preserving explicit custom URLs for enterprise deployments or outage testing.
 */
export function resolveOptBaseUrl(overrideUrl?: string): string {
  const raw = (overrideUrl ?? readServerEnv('QPIAI_OPT_URL')).trim().replace(/\/+$/, '');
  if (!raw) return DEFAULT_OPT_SERVER_URL;
  if (
    raw === 'https://opt.qpiai.tech' ||
    raw === 'https://opt.qpiai.tech/api' ||
    raw === 'https://opt.qpiai.tech/api/v1'
  ) {
    return DEFAULT_OPT_SERVER_URL;
  }
  return raw;
}

export function resolveQCloudBaseUrl(overrideUrl?: string): string {
  const raw = (overrideUrl ?? readServerEnv('QPIAI_SERVER_URL')).trim().replace(/\/+$/, '');
  return raw || DEFAULT_QCLOUD_SERVER_URL;
}

async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs: number
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

function parseErrorMessage(bodyText: string, fallback: string): string {
  if (!bodyText) return fallback;
  try {
    const parsed = JSON.parse(bodyText);
    if (typeof parsed === 'object' && parsed !== null) {
      for (const k of ['error', 'message', 'detail']) {
        if (typeof parsed[k] === 'string' && parsed[k].trim()) {
          return parsed[k].trim();
        }
      }
    }
  } catch {
    // non-JSON response
  }
  return bodyText.slice(0, 280) || fallback;
}

export interface OptExecutionOptions {
  apiKey?: string;
  baseUrl?: string;
  mode?: 'platform' | 'local';
  timeoutMs?: number;
  pollTimeoutMs?: number;
  includeLocalReferenceOnQuotaBlock?: boolean;
}

export interface QuantumExecutionOptions {
  apiKey?: string;
  serverUrl?: string;
  shots?: number;
  timeoutMs?: number;
  pollTimeoutMs?: number;
}

export class QpiAIOptEngine {
  /**
   * Formulate EV Battery Second-Life & Recycling Allocation as a Quadratic
   * Unconstrained Binary Optimization (QUBO) dictionary (upper-triangular).
   */
  static formulateQuboProblem(
    batteryData: Array<{
      battery_id: string;
      state_of_health_pct: number;
      cycle_count: number;
      total_co2_kg_per_kwh: number;
    }>,
    destinations: string[] = ['stationary_bess', 'cell_reconditioning', 'deep_recycling'],
    carbonWeight: number = 0.4,
    distanceWeight: number = 0.3,
    degradationWeight: number = 0.3,
    penaltyLambda: number = 50.0
  ): {
    numVars: number;
    quboUpper: Record<string, number>;
    quboSymmetric: Record<string, number>;
    offset: number;
  } {
    if (!Array.isArray(batteryData) || batteryData.length === 0) {
      throw new Error('At least one battery record is required to formulate a QUBO problem.');
    }
    if (!Array.isArray(destinations) || destinations.length < 2) {
      throw new Error('At least two destination pathways are required for QUBO formulation.');
    }

    const numBatteries = batteryData.length;
    const numDestinations = destinations.length;
    const numVars = numBatteries * numDestinations;
    const upperPairs = new Map<string, { u: number; v: number; w: number }>();

    const addWeight = (u: number, v: number, w: number) => {
      const minVal = Math.min(u, v);
      const maxVal = Math.max(u, v);
      const key = `(${minVal},${maxVal})`;
      const prev = upperPairs.get(key)?.w ?? 0.0;
      const next = Math.round((prev + w) * 10000) / 10000;
      upperPairs.set(key, { u: minVal, v: maxVal, w: next });
    };

    // 1. Hard one-hot constraint: sum_j x_{i,j} = 1 -> penalty * (sum_j x_{i,j} - 1)^2
    // Constant offset across N batteries is N * penaltyLambda
    const offset = numBatteries * penaltyLambda;
    for (let i = 0; i < numBatteries; i++) {
      for (let j = 0; j < numDestinations; j++) {
        const varIdx = i * numDestinations + j;
        addWeight(varIdx, varIdx, -penaltyLambda);
      }
      for (let j = 0; j < numDestinations; j++) {
        for (let k = j + 1; k < numDestinations; k++) {
          const varJ = i * numDestinations + j;
          const varK = i * numDestinations + k;
          addWeight(varJ, varK, 2.0 * penaltyLambda);
        }
      }
    }

    // 2. Lifecycle objective terms per (battery, pathway)
    for (let i = 0; i < batteryData.length; i++) {
      const b = batteryData[i];
      const soh = Number(b.state_of_health_pct ?? 80.0);
      const cycles = Number(b.cycle_count ?? 500);
      const co2 = Number(b.total_co2_kg_per_kwh ?? 60.0);

      for (let j = 0; j < destinations.length; j++) {
        const dest = destinations[j];
        const varIdx = i * numDestinations + j;
        let cost = 0.0;

        if (dest === 'stationary_bess') {
          if (soh >= 75.0) {
            cost -= (soh - 75.0) * degradationWeight * 2.0;
          } else {
            cost += (75.0 - soh) * degradationWeight * 5.0;
          }
          cost += co2 * 0.1 * carbonWeight + 1.5 * distanceWeight;
        } else if (dest === 'cell_reconditioning') {
          const targetMid = 72.0;
          cost += Math.abs(soh - targetMid) * degradationWeight * 1.5;
          cost += (cycles / 1000.0) * 5.0 + 2.0 * distanceWeight;
        } else if (dest === 'deep_recycling') {
          if (soh < 70.0) {
            cost -= (70.0 - soh) * degradationWeight * 3.0;
          } else {
            cost += (soh - 70.0) * degradationWeight * 2.0;
          }
          cost -= co2 * 0.2 * carbonWeight;
          cost += 1.0 * distanceWeight;
        }

        addWeight(varIdx, varIdx, cost);
      }
    }

    const quboUpper: Record<string, number> = {};
    const quboSymmetric: Record<string, number> = {};

    for (const [displayKey, entry] of upperPairs.entries()) {
      if (entry.w === 0) continue;
      quboUpper[displayKey] = entry.w;
      if (entry.u === entry.v) {
        quboSymmetric[`${entry.u},${entry.v}`] = entry.w;
      } else {
        const half = Math.round((entry.w / 2.0) * 1000000) / 1000000;
        quboSymmetric[`${entry.u},${entry.v}`] = half;
        quboSymmetric[`${entry.v},${entry.u}`] = half;
      }
    }

    return { numVars, quboUpper, quboSymmetric, offset };
  }

  /**
   * Evaluates x^T Q x for a binary vector using the symmetric QUBO dictionary.
   */
  static evaluateSymmetricQuboEnergy(
    quboSymmetric: Record<string, number>,
    bits: number[]
  ): number {
    let energy = 0.0;
    for (const [pair, coeff] of Object.entries(quboSymmetric)) {
      const [uStr, vStr] = pair.split(',');
      const u = Number(uStr);
      const v = Number(vStr);
      if (bits[u] && bits[v]) {
        energy += coeff;
      }
    }
    return Math.round(energy * 10000) / 10000;
  }

  /**
   * Exact exhaustive binary QUBO solver for bounded small batches (numVars <= 18),
   * matching qpiai-opt 0.0.9's NATIVE_EXACT_MAX_VARIABLES capability.
   */
  static solveExactLocal(
    numVars: number,
    quboSymmetric: Record<string, number>,
    batteryData: Array<{ battery_id: string }>,
    destinations: string[]
  ): { objective: number; solutionBits: number[]; allocations: Record<string, string> } {
    if (numVars > 18) {
      throw new Error(`Exact local QUBO enumeration is bounded to 18 binary variables (got ${numVars}).`);
    }
    const totalStates = 1 << numVars;
    let bestEnergy = Number.POSITIVE_INFINITY;
    let bestMask = 0;

    // Pre-parse nonzero terms for fast evaluation
    const terms: Array<{ u: number; v: number; c: number }> = [];
    for (const [pair, c] of Object.entries(quboSymmetric)) {
      const [uStr, vStr] = pair.split(',');
      terms.push({ u: Number(uStr), v: Number(vStr), c });
    }

    for (let mask = 0; mask < totalStates; mask++) {
      let energy = 0.0;
      for (let t = 0; t < terms.length; t++) {
        const term = terms[t];
        if (((mask >> term.u) & 1) === 1 && ((mask >> term.v) & 1) === 1) {
          energy += term.c;
        }
      }
      if (energy < bestEnergy) {
        bestEnergy = energy;
        bestMask = mask;
      }
    }

    const solutionBits: number[] = [];
    for (let idx = 0; idx < numVars; idx++) {
      solutionBits.push((bestMask >> idx) & 1);
    }

    const allocations = this.decodeAllocations(solutionBits, batteryData, destinations);
    return {
      objective: Math.round(bestEnergy * 10000) / 10000,
      solutionBits,
      allocations,
    };
  }

  static decodeAllocations(
    solutionBits: number[],
    batteryData: Array<{ battery_id: string }>,
    destinations: string[]
  ): Record<string, string> {
    const allocations: Record<string, string> = {};
    const numDest = destinations.length;
    for (let i = 0; i < batteryData.length; i++) {
      let chosen = destinations[0];
      for (let j = 0; j < numDest; j++) {
        if (solutionBits[i * numDest + j] === 1) {
          chosen = destinations[j];
          break;
        }
      }
      allocations[batteryData[i].battery_id] = chosen;
    }
    return allocations;
  }

  /**
   * Executes QUBO allocation against the live QpiAI-Opt Platform API (`https://opt-server.qpiai.tech/api`)
   * using the official `qpiai-opt` v0.0.9 REST specification (`X-Secret-Token`, `/problems/create`, `/jobs/opt`).
   * Never fabricates cloud results or disguises local calculations as cloud runs.
   */
  static async solveAllocation(
    batteryData: Array<{
      battery_id: string;
      state_of_health_pct: number;
      cycle_count: number;
      total_co2_kg_per_kwh: number;
    }>,
    destinations: string[] = ['stationary_bess', 'cell_reconditioning', 'deep_recycling'],
    options: OptExecutionOptions = {}
  ): Promise<QpiAIOptResponse> {
    const startMs = Date.now();
    const { numVars, quboUpper, quboSymmetric } = this.formulateQuboProblem(
      batteryData,
      destinations
    );

    const sampleMatrix: Record<string, number> = {};
    for (const k of Object.keys(quboUpper).slice(0, 25)) {
      sampleMatrix[k] = quboUpper[k];
    }
    const edgesCount = Object.keys(quboUpper).length;

    // Explicit local solver mode (clearly labelled LOCAL_SOLVED, never QPIAI_OPT_CLOUD)
    if (options.mode === 'local') {
      const localRes = this.solveExactLocal(numVars, quboSymmetric, batteryData, destinations);
      const elapsed = Math.round(((Date.now() - startMs) / 1000) * 10000) / 10000;
      return {
        status: 'LOCAL_SOLVED',
        configured: Boolean(options.apiKey ?? readServerEnv('QPIAI_OPT_API_KEY')),
        authenticated: false,
        is_cloud_result: false,
        execution_mode: 'LOCAL_EXACT_SOLVER',
        solver_backend: 'Local-Exact-QUBO-Enumerator',
        problem_type: 'QUBO',
        problem_id: null,
        num_variables: numVars,
        qubo_edges_count: edgesCount,
        qubo_sample_matrix: sampleMatrix,
        objective_value: localRes.objective,
        recommended_allocations: localRes.allocations,
        execution_time_seconds: elapsed,
        job_id: null,
        message:
          'Solved locally via exact binary QUBO enumeration (mode="local"). This result was NOT executed on QpiAI-Opt Cloud.',
        instructions: null,
      };
    }

    const apiKey = (options.apiKey ?? readServerEnv('QPIAI_OPT_API_KEY')).trim();
    if (!apiKey) {
      return {
        status: 'NOT_CONFIGURED',
        configured: false,
        authenticated: false,
        is_cloud_result: false,
        execution_mode: 'FORMULATION_ONLY',
        solver_backend: null,
        problem_type: 'QUBO',
        problem_id: null,
        num_variables: numVars,
        qubo_edges_count: edgesCount,
        qubo_sample_matrix: sampleMatrix,
        objective_value: null,
        recommended_allocations: null,
        execution_time_seconds: null,
        job_id: null,
        message:
          'QpiAI-Opt API credentials are not configured on the backend. The symmetric QUBO matrix was formulated locally without cloud execution.',
        instructions:
          'Configure QPIAI_OPT_API_KEY on the backend server and ensure QUBO Solver quota is active on https://opt.qpiai.tech.',
      };
    }

    const baseUrl = resolveOptBaseUrl(options.baseUrl);
    const timeoutMs = options.timeoutMs ?? 15000;
    const pollTimeoutMs = options.pollTimeoutMs ?? 30000;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-Secret-Token': apiKey,
    };

    try {
      // 1. Verify API key against live QpiAI-Opt Platform (/users/me)
      const meRes = await fetchWithTimeout(`${baseUrl}/users/me`, { method: 'GET', headers }, timeoutMs);
      if (meRes.status === 401 || meRes.status === 403) {
        const body = await meRes.text();
        return {
          status: 'AUTH_REQUIRED',
          configured: true,
          authenticated: false,
          is_cloud_result: false,
          execution_mode: 'ERROR',
          solver_backend: 'QpiAI-Opt-Platform',
          problem_type: 'QUBO',
          num_variables: numVars,
          qubo_edges_count: edgesCount,
          qubo_sample_matrix: sampleMatrix,
          objective_value: null,
          recommended_allocations: null,
          execution_time_seconds: null,
          job_id: null,
          provider_http_status: meRes.status,
          message: `QpiAI-Opt authentication rejected (HTTP ${meRes.status}): ${parseErrorMessage(
            body,
            'Invalid or expired QPIAI_OPT_API_KEY'
          )}`,
          instructions: 'Verify QPIAI_OPT_API_KEY in your QpiAI-Opt account settings at https://opt.qpiai.tech.',
        };
      }
      if (meRes.status === 429) {
        return {
          status: 'RATE_LIMITED',
          configured: true,
          authenticated: false,
          is_cloud_result: false,
          execution_mode: 'ERROR',
          problem_type: 'QUBO',
          num_variables: numVars,
          qubo_edges_count: edgesCount,
          qubo_sample_matrix: sampleMatrix,
          provider_http_status: 429,
          message: 'QpiAI-Opt rate limit exceeded (HTTP 429). Please retry after a short backoff.',
          instructions: null,
        };
      }
      if (!meRes.ok) {
        const body = await meRes.text();
        return {
          status: 'ERROR',
          configured: true,
          authenticated: false,
          is_cloud_result: false,
          execution_mode: 'ERROR',
          problem_type: 'QUBO',
          num_variables: numVars,
          qubo_edges_count: edgesCount,
          qubo_sample_matrix: sampleMatrix,
          provider_http_status: meRes.status,
          message: `QpiAI-Opt platform error (HTTP ${meRes.status}): ${parseErrorMessage(
            body,
            'Unexpected upstream status'
          )}`,
          instructions: null,
        };
      }

      // 2. Resolve Default Experiment & QUBO Solver resource
      const [expRes, crRes] = await Promise.all([
        fetchWithTimeout(
          `${baseUrl}/experiments/by-name?name=${encodeURIComponent('Default Experiment')}`,
          { method: 'GET', headers },
          timeoutMs
        ),
        fetchWithTimeout(`${baseUrl}/compute-resources/`, { method: 'GET', headers }, timeoutMs),
      ]);

      if (!expRes.ok) {
        const expText = await expRes.text();
        return {
          status: 'ERROR',
          configured: true,
          authenticated: true,
          is_cloud_result: false,
          execution_mode: 'ERROR',
          problem_type: 'QUBO',
          num_variables: numVars,
          qubo_edges_count: edgesCount,
          qubo_sample_matrix: sampleMatrix,
          provider_http_status: expRes.status,
          message: `Failed to resolve QpiAI-Opt Default Experiment (HTTP ${expRes.status}): ${parseErrorMessage(
            expText,
            'Experiment lookup failed'
          )}`,
          instructions: 'Ensure "Default Experiment" exists in your QpiAI-Opt workspace.',
        };
      }

      const expJson = (await expRes.json()) as { experiment_id?: string };
      const experimentId = expJson.experiment_id;
      let quboResourceId: string | undefined;
      let quboBackendName = 'QUBO Solver';

      if (crRes.ok) {
        const resources = (await crRes.json()) as Array<{
          ID?: string;
          id?: string;
          backend_name?: string;
          type?: string;
          status?: string;
        }>;
        if (Array.isArray(resources)) {
          const found = resources.find((r) =>
            String(r.type || r.backend_name || '')
              .toUpperCase()
              .includes('QUBO')
          );
          if (found) {
            quboResourceId = found.ID || found.id;
            quboBackendName = found.backend_name || 'QUBO Solver';
          }
        }
      }

      // 3. Register validated QUBO problem on QpiAI-Opt Platform (/problems/create)
      const problemName = `bp360_qubo_${Date.now()}`;
      const createRes = await fetchWithTimeout(
        `${baseUrl}/problems/create`,
        {
          method: 'POST',
          headers,
          body: JSON.stringify({
            name: problemName,
            method: 'QUBO',
            num_variables: numVars,
            max_evaluations: 1000,
            qubo_dict: quboSymmetric,
          }),
        },
        timeoutMs
      );

      const createBody = await createRes.text();
      if (!createRes.ok) {
        return {
          status: createRes.status === 429 ? 'RATE_LIMITED' : 'ERROR',
          configured: true,
          authenticated: true,
          is_cloud_result: false,
          execution_mode: 'ERROR',
          solver_backend: quboBackendName,
          problem_type: 'QUBO',
          num_variables: numVars,
          qubo_edges_count: edgesCount,
          qubo_sample_matrix: sampleMatrix,
          provider_http_status: createRes.status,
          message: `QpiAI-Opt rejected QUBO problem payload (HTTP ${createRes.status}): ${parseErrorMessage(
            createBody,
            'Invalid QUBO specification'
          )}`,
          instructions: null,
        };
      }

      const createdProblem = JSON.parse(createBody) as { id?: string; ID?: string };
      const problemId = createdProblem.id || createdProblem.ID || null;

      // 4. Submit optimization job (/jobs/opt)
      const jobPayload: Record<string, any> = {
        problem_id: problemId,
        experiment_id: experimentId,
        method: 'QUBO',
      };
      if (quboResourceId) {
        jobPayload.compute_resource_id = quboResourceId;
      }

      const submitRes = await fetchWithTimeout(
        `${baseUrl}/jobs/opt`,
        {
          method: 'POST',
          headers,
          body: JSON.stringify(jobPayload),
        },
        timeoutMs
      );

      const submitBody = await submitRes.text();
      if (!submitRes.ok) {
        // Clean up unexecuted problem record, matching official qpiai-opt 0.0.9 SDK behavior
        if (problemId && submitRes.status >= 400 && submitRes.status < 500 && submitRes.status !== 429) {
          await fetchWithTimeout(
            `${baseUrl}/problems/${encodeURIComponent(problemId)}`,
            { method: 'DELETE', headers },
            8000
          ).catch(() => {});
        }

        const providerMsg = parseErrorMessage(submitBody, 'QpiAI-Opt job creation failed');
        const lower = providerMsg.toLowerCase();
        const isQuotaOrAccess =
          submitRes.status === 402 ||
          lower.includes('quota') ||
          lower.includes('does not have access') ||
          lower.includes('subscription') ||
          lower.includes('credits');

        let localRef: QpiAIOptResponse['local_reference_solution'] = null;
        if (isQuotaOrAccess && (options.includeLocalReferenceOnQuotaBlock ?? true) && numVars <= 18) {
          const exact = this.solveExactLocal(numVars, quboSymmetric, batteryData, destinations);
          localRef = {
            note: 'Computed locally via exact binary QUBO enumeration for engineering reference ONLY — NOT executed on QpiAI-Opt Cloud.',
            objective_value: exact.objective,
            allocations: exact.allocations,
          };
        }

        return {
          status: submitRes.status === 429 ? 'RATE_LIMITED' : isQuotaOrAccess ? 'QUOTA_EXCEEDED' : 'ERROR',
          configured: true,
          authenticated: true,
          is_cloud_result: false,
          execution_mode: isQuotaOrAccess ? 'CLOUD_REJECTED_QUOTA' : 'ERROR',
          solver_backend: quboBackendName,
          problem_type: 'QUBO',
          problem_id: problemId,
          num_variables: numVars,
          qubo_edges_count: edgesCount,
          qubo_sample_matrix: sampleMatrix,
          objective_value: null,
          recommended_allocations: null,
          local_reference_solution: localRef,
          execution_time_seconds: Math.round(((Date.now() - startMs) / 1000) * 10000) / 10000,
          job_id: null,
          provider_http_status: submitRes.status,
          message: `QpiAI-Opt authenticated and validated QUBO problem (${problemId}), but cloud solver execution was rejected (HTTP ${submitRes.status}): ${providerMsg}`,
          instructions:
            'Allocate organization compute quota / subscription credits for "QUBO Solver" in the QpiAI-Opt portal (https://opt.qpiai.tech) to enable cloud job execution.',
        };
      }

      const submission = JSON.parse(submitBody) as {
        job?: { id?: string; status?: string };
        job_id?: string;
        id?: string;
        status?: string;
      };
      const jobId = submission.job?.id || submission.job_id || submission.id || null;
      if (!jobId) {
        return {
          status: 'ERROR',
          configured: true,
          authenticated: true,
          is_cloud_result: false,
          execution_mode: 'ERROR',
          solver_backend: quboBackendName,
          problem_type: 'QUBO',
          problem_id: problemId,
          num_variables: numVars,
          qubo_edges_count: edgesCount,
          qubo_sample_matrix: sampleMatrix,
          message: 'QpiAI-Opt accepted submission but did not return a job_id.',
          instructions: null,
        };
      }

      // 5. Poll /jobs/{jobId} until completion or bounded pollTimeoutMs
      const deadline = Date.now() + pollTimeoutMs;
      let latestStatus = String(submission.job?.status || submission.status || 'pending').toLowerCase();
      let jobRecord: any = null;

      while (Date.now() < deadline) {
        const pollRes = await fetchWithTimeout(
          `${baseUrl}/jobs/${encodeURIComponent(jobId)}`,
          { method: 'GET', headers },
          timeoutMs
        );
        if (pollRes.ok) {
          jobRecord = await pollRes.json();
          latestStatus = String(jobRecord.status || jobRecord.job?.status || latestStatus).toLowerCase();
          if (['completed', 'success', 'failed', 'cancelled'].includes(latestStatus)) {
            break;
          }
        }
        await new Promise((r) => setTimeout(r, 1500));
      }

      if (latestStatus === 'failed' || latestStatus === 'cancelled') {
        return {
          status: 'ERROR',
          configured: true,
          authenticated: true,
          is_cloud_result: false,
          execution_mode: 'ERROR',
          solver_backend: quboBackendName,
          problem_type: 'QUBO',
          problem_id: problemId,
          num_variables: numVars,
          qubo_edges_count: edgesCount,
          qubo_sample_matrix: sampleMatrix,
          job_id: jobId,
          message: `QpiAI-Opt cloud job ${jobId} ended with status '${latestStatus}': ${
            jobRecord?.error || 'Solver terminated without feasible solution'
          }`,
          instructions: null,
        };
      }

      if (latestStatus !== 'completed' && latestStatus !== 'success') {
        return {
          status: 'SUBMITTED',
          configured: true,
          authenticated: true,
          is_cloud_result: false,
          execution_mode: 'QPIAI_OPT_CLOUD',
          solver_backend: quboBackendName,
          problem_type: 'QUBO',
          problem_id: problemId,
          num_variables: numVars,
          qubo_edges_count: edgesCount,
          qubo_sample_matrix: sampleMatrix,
          job_id: jobId,
          execution_time_seconds: Math.round(((Date.now() - startMs) / 1000) * 10000) / 10000,
          message: `QpiAI-Opt cloud job ${jobId} submitted and currently '${latestStatus}'.`,
          instructions: null,
        };
      }

      // Extract & validate cloud solution payload
      let rawResult = jobRecord?.server_response ?? jobRecord?.result ?? jobRecord;
      if (typeof rawResult === 'string') {
        try {
          rawResult = JSON.parse(rawResult);
        } catch {
          // keep raw
        }
      }
      if (rawResult && typeof rawResult === 'object' && (rawResult.result || rawResult.results)) {
        rawResult = rawResult.result || rawResult.results;
      }

      const solutionBits: number[] = Array.isArray(rawResult?.solution)
        ? rawResult.solution.map((v: any) => Number(v))
        : [];
      if (solutionBits.length !== numVars || solutionBits.some((b) => b !== 0 && b !== 1)) {
        return {
          status: 'ERROR',
          configured: true,
          authenticated: true,
          is_cloud_result: false,
          execution_mode: 'ERROR',
          solver_backend: quboBackendName,
          problem_type: 'QUBO',
          problem_id: problemId,
          num_variables: numVars,
          qubo_edges_count: edgesCount,
          qubo_sample_matrix: sampleMatrix,
          job_id: jobId,
          message: `QpiAI-Opt job ${jobId} returned malformed binary solution (expected ${numVars} bits).`,
          instructions: null,
        };
      }

      const verifiedEnergy = this.evaluateSymmetricQuboEnergy(quboSymmetric, solutionBits);
      const reportedObjective =
        typeof rawResult?.objective === 'number' && Number.isFinite(rawResult.objective)
          ? rawResult.objective
          : verifiedEnergy;
      const allocations = this.decodeAllocations(solutionBits, batteryData, destinations);
      const execSec =
        typeof rawResult?.solver_time_s === 'number'
          ? rawResult.solver_time_s
          : typeof jobRecord?.execution_time_ms === 'number'
          ? jobRecord.execution_time_ms / 1000
          : Math.round(((Date.now() - startMs) / 1000) * 10000) / 10000;

      return {
        status: 'SUCCESS',
        configured: true,
        authenticated: true,
        is_cloud_result: true,
        execution_mode: 'QPIAI_OPT_CLOUD',
        solver_backend: quboBackendName,
        problem_type: 'QUBO',
        problem_id: problemId,
        num_variables: numVars,
        qubo_edges_count: edgesCount,
        qubo_sample_matrix: sampleMatrix,
        objective_value: reportedObjective,
        recommended_allocations: allocations,
        execution_time_seconds: execSec,
        job_id: jobId,
        provider_http_status: 200,
        message: `Successfully solved QUBO allocation on QpiAI-Opt Cloud (${quboBackendName}, job ${jobId}).`,
        instructions: null,
      };
    } catch (err: any) {
      const isAbort = err?.name === 'AbortError' || String(err?.message || '').includes('aborted');
      return {
        status: 'ERROR',
        configured: true,
        authenticated: false,
        is_cloud_result: false,
        execution_mode: 'ERROR',
        problem_type: 'QUBO',
        num_variables: numVars,
        qubo_edges_count: edgesCount,
        qubo_sample_matrix: sampleMatrix,
        execution_time_seconds: Math.round(((Date.now() - startMs) / 1000) * 10000) / 10000,
        message: isAbort
          ? `QpiAI-Opt request timed out after ${timeoutMs}ms connecting to ${baseUrl}.`
          : `QpiAI-Opt network/service error: ${err?.message || 'Connection failed'}`,
        instructions: 'Verify network connectivity and QPIAI_OPT_URL configuration.',
      };
    }
  }
}

export class QpiAIQuantumEngine {
  /**
   * Builds the OpenQASM 2.0 4-qubit cathode orbital ansatz circuit matching qpiai_quantum_adapter.py.
   */
  static buildCathodeOpenQasm(soh: number, cycleCount: number): {
    qasm: string;
    theta: number;
    phi: number;
    gateCounts: Record<string, number>;
  } {
    const clampedSoh = Math.max(0.0, Math.min(100.0, Number(soh)));
    const clampedCycles = Math.max(0, Number(cycleCount));
    const degradationFactor = Math.max(0.0, (100.0 - clampedSoh) / 100.0);
    const theta = (Math.PI / 4.0) * (1.0 + degradationFactor);
    const phi = (Math.PI / 6.0) * (clampedCycles / 1000.0);

    const qasm = [
      'OPENQASM 2.0;',
      'include "qelib1.inc";',
      'qreg q[4];',
      'creg c[4];',
      'h q[0];',
      'h q[1];',
      'h q[2];',
      'h q[3];',
      'cx q[0],q[1];',
      'cx q[1],q[2];',
      'cx q[2],q[3];',
      `rz(${theta.toFixed(8)}) q[0];`,
      `rz(${(theta * 1.5).toFixed(8)}) q[1];`,
      `rx(${phi.toFixed(8)}) q[2];`,
      `rx(${(phi * 1.2).toFixed(8)}) q[3];`,
      'cx q[0],q[2];',
      'cx q[1],q[3];',
      'measure q[0] -> c[0];',
      'measure q[1] -> c[1];',
      'measure q[2] -> c[2];',
      'measure q[3] -> c[3];',
    ].join('\n');

    return {
      qasm,
      theta,
      phi,
      gateCounts: { H: 4, CX: 5, RZ: 2, RX: 2, MEASURE: 4 },
    };
  }

  /**
   * Exact 4-qubit complex statevector unitary simulator matching the gate sequence in buildCathodeOpenQasm.
   * Used ONLY when backend === 'QpiAI-QSV-Local' (matching official qpiai-quantum 0.7.5 SDK local simulator mode)
   * and ALWAYS labelled LOCAL_STATEVECTOR_SIMULATOR (is_cloud_execution: false).
   */
  static executeLocalStatevectorCircuit(
    theta: number,
    phi: number,
    shots: number
  ): { counts: Record<string, number>; probabilities: Record<string, number>; zzExpectation: number } {
    const dim = 16; // 2^4
    const re = new Float64Array(dim);
    const im = new Float64Array(dim);
    re[0] = 1.0; // |0000>

    const invSqrt2 = Math.SQRT1_2;

    const applyH = (q: number) => {
      const bit = 1 << q;
      for (let i = 0; i < dim; i++) {
        if ((i & bit) === 0) {
          const j = i | bit;
          const r0 = re[i];
          const m0 = im[i];
          const r1 = re[j];
          const m1 = im[j];
          re[i] = (r0 + r1) * invSqrt2;
          im[i] = (m0 + m1) * invSqrt2;
          re[j] = (r0 - r1) * invSqrt2;
          im[j] = (m0 - m1) * invSqrt2;
        }
      }
    };

    const applyCX = (control: number, target: number) => {
      const cBit = 1 << control;
      const tBit = 1 << target;
      for (let i = 0; i < dim; i++) {
        if ((i & cBit) !== 0 && (i & tBit) === 0) {
          const j = i | tBit;
          const tr = re[i];
          const ti = im[i];
          re[i] = re[j];
          im[i] = im[j];
          re[j] = tr;
          im[j] = ti;
        }
      }
    };

    const applyRZ = (q: number, angle: number) => {
      // RZ(a) = diag(e^{-i a/2}, e^{+i a/2})
      const c = Math.cos(angle / 2.0);
      const s = Math.sin(angle / 2.0);
      const bit = 1 << q;
      for (let i = 0; i < dim; i++) {
        const sign = (i & bit) === 0 ? -1.0 : 1.0;
        const r = re[i];
        const m = im[i];
        re[i] = r * c - m * (sign * s);
        im[i] = r * (sign * s) + m * c;
      }
    };

    const applyRX = (q: number, angle: number) => {
      // RX(a) = [[cos(a/2), -i sin(a/2)], [-i sin(a/2), cos(a/2)]]
      const c = Math.cos(angle / 2.0);
      const s = Math.sin(angle / 2.0);
      const bit = 1 << q;
      for (let i = 0; i < dim; i++) {
        if ((i & bit) === 0) {
          const j = i | bit;
          const r0 = re[i];
          const m0 = im[i];
          const r1 = re[j];
          const m1 = im[j];
          re[i] = c * r0 + s * m1;
          im[i] = c * m0 - s * r1;
          re[j] = s * m0 + c * r1;
          im[j] = -s * r0 + c * m1;
        }
      }
    };

    // Apply exact circuit unitary operations
    applyH(0);
    applyH(1);
    applyH(2);
    applyH(3);
    applyCX(0, 1);
    applyCX(1, 2);
    applyCX(2, 3);
    applyRZ(0, theta);
    applyRZ(1, theta * 1.5);
    applyRX(2, phi);
    applyRX(3, phi * 1.2);
    applyCX(0, 2);
    applyCX(1, 3);

    // Born-rule exact state probabilities |psi_i|^2
    const exactProbs = new Float64Array(dim);
    for (let i = 0; i < dim; i++) {
      exactProbs[i] = re[i] * re[i] + im[i] * im[i];
    }

    // Sample `shots` measurement outcomes according to Born distribution
    const rawCounts = new Int32Array(dim);
    for (let s = 0; s < shots; s++) {
      const r = Math.random();
      let acc = 0.0;
      let picked = dim - 1;
      for (let i = 0; i < dim; i++) {
        acc += exactProbs[i];
        if (r <= acc) {
          picked = i;
          break;
        }
      }
      rawCounts[picked]++;
    }

    const counts: Record<string, number> = {};
    const probabilities: Record<string, number> = {};
    let zzExpectation = 0.0;

    for (let i = 0; i < dim; i++) {
      if (rawCounts[i] > 0) {
        const bitStr = i.toString(2).padStart(4, '0');
        counts[bitStr] = rawCounts[i];
        const p = rawCounts[i] / shots;
        probabilities[bitStr] = Math.round(p * 10000) / 10000;
        const z0 = (i & 1) === 0 ? 1.0 : -1.0;
        const z1 = ((i >> 1) & 1) === 0 ? 1.0 : -1.0;
        zzExpectation += p * z0 * z1;
      }
    }

    return { counts, probabilities, zzExpectation };
  }

  private static mapDeviceToMethod(deviceName: string): string {
    switch (deviceName) {
      case 'QpiAI-QSV-Simulator':
        return 'statevector';
      case 'QpiAI-QSV-Lite':
        return 'statevector_sampling';
      case 'QpiAI-QDM-Simulator':
      case 'QpiAI-QDM-Lite':
        return 'density_matrix';
      case 'QpiAI-QTN-Simulator':
        return 'tensor_network';
      case 'QpiAI-Indus-1':
        return 'qpu';
      default:
        return 'statevector';
    }
  }

  /**
   * Authenticates with QpiAI QCloud (`https://qcloud-server.qpiai.tech`) and executes the
   * 4-qubit cathode degradation ansatz on either an authorized remote QCloud backend
   * or the SDK's authenticated local statevector simulator (`QpiAI-QSV-Local`).
   */
  static async simulateCathodeDegradation(
    batteryId: string,
    cathodeMaterial: string,
    soh: number,
    cycleCount: number,
    backendChoice?: string,
    options: QuantumExecutionOptions = {}
  ): Promise<QpiAIQuantumResponse> {
    const startMs = Date.now();
    const resolvedBackend = (
      backendChoice ||
      readServerEnv('QPIAI_QUANTUM_BACKEND') ||
      'QpiAI-QSV-Local'
    ).trim();

    const shots = Math.max(64, Math.min(4096, Math.trunc(options.shots ?? 1024)));
    const { qasm, theta, phi, gateCounts } = this.buildCathodeOpenQasm(soh, cycleCount);
    const degradationRatio = Math.max(0.0, (100.0 - soh) / 100.0);
    const risk = soh < 75.0 ? 'HIGH' : soh < 85.0 ? 'MODERATE' : 'LOW';

    if (!(SUPPORTED_QCLOUD_BACKENDS as readonly string[]).includes(resolvedBackend)) {
      return {
        status: 'ERROR',
        configured_for_cloud: false,
        qcloud_authenticated: false,
        is_cloud_execution: false,
        is_hardware_execution: false,
        execution_mode: 'ERROR',
        backend_used: resolvedBackend,
        shots,
        num_qubits: 4,
        circuit_depth: 14,
        quantum_gate_counts: gateCounts,
        measured_probabilities: {},
        estimated_ground_state_energy_hartree: 0,
        projected_capacity_fade_rate: 0,
        molecular_degradation_risk: 'UNKNOWN',
        message: `Unsupported QpiAI Quantum backend '${resolvedBackend}'. Supported backends: ${SUPPORTED_QCLOUD_BACKENDS.join(', ')}.`,
        instructions: null,
      };
    }

    const apiKey = (options.apiKey ?? readServerEnv('QPIAI_QUANTUM_API_KEY')).trim();
    if (!apiKey) {
      return {
        status: 'AUTH_REQUIRED',
        configured_for_cloud: false,
        qcloud_authenticated: false,
        is_cloud_execution: false,
        is_hardware_execution: false,
        execution_mode: 'FORMULATION_ONLY',
        backend_used: resolvedBackend,
        shots,
        num_qubits: 4,
        circuit_depth: 14,
        quantum_gate_counts: gateCounts,
        measured_probabilities: {},
        estimated_ground_state_energy_hartree: 0,
        projected_capacity_fade_rate: Math.round((1.5 + degradationRatio * 2.8) * 100) / 100,
        molecular_degradation_risk: risk,
        message:
          'QPIAI_QUANTUM_API_KEY is not configured on the backend server. OpenQASM 2.0 circuit was synthesized without execution.',
        instructions:
          'Set QPIAI_QUANTUM_API_KEY on the backend server from your QpiAI QCloud account (https://qcloud.qpiai.tech).',
      };
    }

    const qServer = resolveQCloudBaseUrl(options.serverUrl);
    const timeoutMs = options.timeoutMs ?? 15000;
    const pollTimeoutMs = options.pollTimeoutMs ?? 30000;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-Secret-Token': apiKey,
    };

    try {
      // 1. Live QCloud Authentication check (/api/users/me), required by qpiai-quantum 0.7.5 for all backends
      const meRes = await fetchWithTimeout(
        `${qServer}/api/users/me`,
        { method: 'GET', headers },
        timeoutMs
      );

      if (meRes.status === 401 || meRes.status === 403) {
        const body = await meRes.text();
        return {
          status: 'AUTH_REQUIRED',
          configured_for_cloud: false,
          qcloud_authenticated: false,
          is_cloud_execution: false,
          is_hardware_execution: false,
          execution_mode: 'ERROR',
          backend_used: resolvedBackend,
          shots,
          provider_http_status: meRes.status,
          num_qubits: 4,
          circuit_depth: 14,
          quantum_gate_counts: gateCounts,
          measured_probabilities: {},
          estimated_ground_state_energy_hartree: 0,
          projected_capacity_fade_rate: 0,
          molecular_degradation_risk: 'UNKNOWN',
          message: `QpiAI QCloud authentication failed (HTTP ${meRes.status}): ${parseErrorMessage(
            body,
            'API key is invalid or expired'
          )}`,
          instructions: 'Verify QPIAI_QUANTUM_API_KEY in the QpiAI QCloud portal (https://qcloud.qpiai.tech).',
        };
      }

      if (meRes.status === 429) {
        return {
          status: 'RATE_LIMITED',
          configured_for_cloud: true,
          qcloud_authenticated: false,
          is_cloud_execution: false,
          is_hardware_execution: false,
          execution_mode: 'ERROR',
          backend_used: resolvedBackend,
          shots,
          provider_http_status: 429,
          num_qubits: 4,
          circuit_depth: 14,
          quantum_gate_counts: gateCounts,
          measured_probabilities: {},
          estimated_ground_state_energy_hartree: 0,
          projected_capacity_fade_rate: 0,
          molecular_degradation_risk: 'UNKNOWN',
          message: 'QpiAI QCloud rate limit exceeded (HTTP 429). Please retry shortly.',
          instructions: null,
        };
      }

      if (!meRes.ok) {
        const body = await meRes.text();
        return {
          status: 'ERROR',
          configured_for_cloud: true,
          qcloud_authenticated: false,
          is_cloud_execution: false,
          is_hardware_execution: false,
          execution_mode: 'ERROR',
          backend_used: resolvedBackend,
          shots,
          provider_http_status: meRes.status,
          num_qubits: 4,
          circuit_depth: 14,
          quantum_gate_counts: gateCounts,
          measured_probabilities: {},
          estimated_ground_state_energy_hartree: 0,
          projected_capacity_fade_rate: 0,
          molecular_degradation_risk: 'UNKNOWN',
          message: `QpiAI QCloud server returned HTTP ${meRes.status}: ${parseErrorMessage(
            body,
            'Upstream service error'
          )}`,
          instructions: null,
        };
      }

      // Fetch available QCloud compute resources
      let availableBackends: string[] = [];
      let resourcesList: Array<{ ID?: string; backend_name?: string; device_name?: string }> = [];
      const crRes = await fetchWithTimeout(
        `${qServer}/api/compute-resources`,
        { method: 'GET', headers },
        timeoutMs
      );
      if (crRes.ok) {
        const crData = await crRes.json();
        resourcesList = Array.isArray(crData)
          ? crData
          : Array.isArray(crData?.compute_resources)
          ? crData.compute_resources
          : [];
        availableBackends = resourcesList
          .map((r) => r.backend_name || r.device_name || '')
          .filter(Boolean);
      }

      // 2A. Official QpiAI-QSV-Local mode: QCloud API key verified live, statevector simulated locally
      if (resolvedBackend === 'QpiAI-QSV-Local') {
        const sim = this.executeLocalStatevectorCircuit(theta, phi, shots);
        const energyHartree =
          Math.round((-75.85 + degradationRatio * 2.95 - 0.35 * sim.zzExpectation) * 10000) / 10000;
        const fadeRate = Math.round((1.45 + degradationRatio * 2.85) * 100) / 100;
        const elapsed = Math.round(((Date.now() - startMs) / 1000) * 10000) / 10000;

        return {
          status: 'SIMULATION_COMPLETED',
          configured_for_cloud: true,
          qcloud_authenticated: true,
          is_cloud_execution: false,
          is_hardware_execution: false,
          execution_mode: 'LOCAL_STATEVECTOR_SIMULATOR',
          backend_used: 'QpiAI-QSV-Local',
          job_id: null,
          circuit_id: null,
          shots,
          measured_counts: sim.counts,
          execution_time_seconds: elapsed,
          provider_http_status: 200,
          available_cloud_backends: availableBackends,
          num_qubits: 4,
          circuit_depth: 14,
          quantum_gate_counts: gateCounts,
          measured_probabilities: sim.probabilities,
          estimated_ground_state_energy_hartree: energyHartree,
          projected_capacity_fade_rate: fadeRate,
          molecular_degradation_risk: risk,
          message:
            `Authenticated with QpiAI QCloud (HTTP 200) and executed 4-qubit ${cathodeMaterial} ansatz (${shots} shots) ` +
            `on local statevector simulator 'QpiAI-QSV-Local' (not executed on remote QCloud compute or quantum hardware).`,
          instructions: null,
        };
      }

      // 2B. Remote QCloud execution (QpiAI-QSV-Simulator, QpiAI-QSV-Lite, QpiAI-Indus-1, etc.)
      const expRes = await fetchWithTimeout(
        `${qServer}/api/experiments/by-name?name=${encodeURIComponent('Default Experiment')}`,
        { method: 'GET', headers },
        timeoutMs
      );
      if (!expRes.ok) {
        const expText = await expRes.text();
        return {
          status: 'ERROR',
          configured_for_cloud: true,
          qcloud_authenticated: true,
          is_cloud_execution: false,
          is_hardware_execution: false,
          execution_mode: 'ERROR',
          backend_used: resolvedBackend,
          shots,
          provider_http_status: expRes.status,
          available_cloud_backends: availableBackends,
          num_qubits: 4,
          circuit_depth: 14,
          quantum_gate_counts: gateCounts,
          measured_probabilities: {},
          estimated_ground_state_energy_hartree: 0,
          projected_capacity_fade_rate: 0,
          molecular_degradation_risk: 'UNKNOWN',
          message: `Failed to resolve QCloud 'Default Experiment' (HTTP ${expRes.status}): ${parseErrorMessage(
            expText,
            'Experiment lookup failed'
          )}`,
          instructions: 'Create "Default Experiment" in the QpiAI QCloud web portal.',
        };
      }

      const expData = (await expRes.json()) as { experiment_id?: string };
      const experimentId = expData.experiment_id;

      const associatedDevice =
        resolvedBackend === 'QpiAI-QSV-Lite'
          ? 'QpiAI-QSV-Simulator'
          : resolvedBackend === 'QpiAI-QDM-Lite'
          ? 'QpiAI-QDM-Simulator'
          : resolvedBackend;

      const safeBatteryTag = batteryId.replace(/[^A-Za-z0-9_-]/g, '').slice(0, 24) || 'bat';
      const circuitName = `bp360_${safeBatteryTag}_${Date.now()}`;

      const createCircRes = await fetchWithTimeout(
        `${qServer}/api/circuits/create`,
        {
          method: 'POST',
          headers,
          body: JSON.stringify({
            openqasm_string: qasm,
            shots,
            name: circuitName,
            device_name: associatedDevice,
            source_type: 'sdk',
          }),
        },
        timeoutMs
      );

      const createCircBody = await createCircRes.text();
      if (!createCircRes.ok) {
        return {
          status: 'ERROR',
          configured_for_cloud: true,
          qcloud_authenticated: true,
          is_cloud_execution: false,
          is_hardware_execution: false,
          execution_mode: 'ERROR',
          backend_used: resolvedBackend,
          shots,
          provider_http_status: createCircRes.status,
          available_cloud_backends: availableBackends,
          num_qubits: 4,
          circuit_depth: 14,
          quantum_gate_counts: gateCounts,
          measured_probabilities: {},
          estimated_ground_state_energy_hartree: 0,
          projected_capacity_fade_rate: 0,
          molecular_degradation_risk: 'UNKNOWN',
          message: `QCloud circuit creation failed (HTTP ${createCircRes.status}): ${parseErrorMessage(
            createCircBody,
            'Invalid OpenQASM payload'
          )}`,
          instructions: null,
        };
      }

      const createdCircuit = JSON.parse(createCircBody) as { id?: string };
      const circuitId = createdCircuit.id || null;
      const method = this.mapDeviceToMethod(resolvedBackend);
      const matchedResource = resourcesList.find((r) => r.backend_name === resolvedBackend);
      const needDensityMatrix =
        resolvedBackend === 'QpiAI-QDM-Simulator' ||
        resolvedBackend === 'QpiAI-QDM-Lite' ||
        resolvedBackend === 'QpiAI-QTN-Simulator';
      const needStatevector = resolvedBackend === 'QpiAI-QTN-Simulator';

      const jobPayload: Record<string, any> = {
        circuit_id: circuitId,
        experiment_id: experimentId,
        method,
        need_statevector: needStatevector,
        need_density_matrix: needDensityMatrix,
        shots,
        device_name: resolvedBackend,
      };
      if (matchedResource?.ID) {
        jobPayload.compute_resource_id = matchedResource.ID;
      }

      const jobRes = await fetchWithTimeout(
        `${qServer}/api/jobs/qasm`,
        {
          method: 'POST',
          headers,
          body: JSON.stringify(jobPayload),
        },
        timeoutMs
      );

      const jobBody = await jobRes.text();
      if (!jobRes.ok) {
        // Clean up unexecuted test circuit on QCloud
        if (circuitId && jobRes.status >= 400 && jobRes.status < 500) {
          await fetchWithTimeout(
            `${qServer}/api/circuits/${encodeURIComponent(circuitId)}`,
            { method: 'DELETE', headers },
            8000
          ).catch(() => {});
        }

        const errMsg = parseErrorMessage(jobBody, 'QCloud job submission rejected');
        const lower = errMsg.toLowerCase();
        const isSubOrQuota =
          jobRes.status === 402 ||
          lower.includes('subscription') ||
          lower.includes('credit') ||
          lower.includes('quota') ||
          lower.includes('permission') ||
          lower.includes('access');

        return {
          status:
            jobRes.status === 429
              ? 'RATE_LIMITED'
              : lower.includes('subscription')
              ? 'SUBSCRIPTION_REQUIRED'
              : isSubOrQuota
              ? 'QUOTA_EXCEEDED'
              : 'ERROR',
          configured_for_cloud: true,
          qcloud_authenticated: true,
          is_cloud_execution: false,
          is_hardware_execution: false,
          execution_mode: 'QCLOUD_REJECTED_SUBSCRIPTION',
          backend_used: resolvedBackend,
          job_id: null,
          circuit_id: circuitId,
          shots,
          execution_time_seconds: Math.round(((Date.now() - startMs) / 1000) * 10000) / 10000,
          provider_http_status: jobRes.status,
          available_cloud_backends: availableBackends,
          num_qubits: 4,
          circuit_depth: 14,
          quantum_gate_counts: gateCounts,
          measured_probabilities: {},
          estimated_ground_state_energy_hartree: 0,
          projected_capacity_fade_rate: 0,
          molecular_degradation_risk: risk,
          message: `QCloud authenticated and registered OpenQASM circuit (${circuitId}), but remote job submission on '${resolvedBackend}' was rejected (HTTP ${jobRes.status}): ${errMsg}`,
          instructions:
            'Activate a QCloud subscription / credits at https://qcloud.qpiai.tech for remote cloud execution, or select "QpiAI-QSV-Local" for authenticated local statevector execution.',
        };
      }

      const jobData = JSON.parse(jobBody) as {
        job?: { id?: string; status?: string };
        id?: string;
        status?: string;
      };
      const jobId = jobData.job?.id || jobData.id || null;
      if (!jobId) {
        return {
          status: 'ERROR',
          configured_for_cloud: true,
          qcloud_authenticated: true,
          is_cloud_execution: false,
          is_hardware_execution: false,
          execution_mode: 'ERROR',
          backend_used: resolvedBackend,
          circuit_id: circuitId,
          shots,
          num_qubits: 4,
          circuit_depth: 14,
          quantum_gate_counts: gateCounts,
          measured_probabilities: {},
          estimated_ground_state_energy_hartree: 0,
          projected_capacity_fade_rate: 0,
          molecular_degradation_risk: 'UNKNOWN',
          message: 'QCloud accepted job request but returned no job_id.',
          instructions: null,
        };
      }

      // Poll /api/jobs/{jobId}
      const deadline = Date.now() + pollTimeoutMs;
      let latestStatus = String(jobData.job?.status || jobData.status || 'submitted').toLowerCase();
      let jobDetail: any = null;

      while (Date.now() < deadline) {
        const pollRes = await fetchWithTimeout(
          `${qServer}/api/jobs/${encodeURIComponent(jobId)}`,
          { method: 'GET', headers },
          timeoutMs
        );
        if (pollRes.ok) {
          jobDetail = await pollRes.json();
          latestStatus = String(jobDetail.status || jobDetail.job?.status || latestStatus).toLowerCase();
          if (['completed', 'success', 'failed', 'cancelled'].includes(latestStatus)) {
            break;
          }
        }
        await new Promise((r) => setTimeout(r, 1500));
      }

      if (latestStatus === 'failed' || latestStatus === 'cancelled') {
        return {
          status: 'ERROR',
          configured_for_cloud: true,
          qcloud_authenticated: true,
          is_cloud_execution: false,
          is_hardware_execution: false,
          execution_mode: 'ERROR',
          backend_used: resolvedBackend,
          job_id: jobId,
          circuit_id: circuitId,
          shots,
          num_qubits: 4,
          circuit_depth: 14,
          quantum_gate_counts: gateCounts,
          measured_probabilities: {},
          estimated_ground_state_energy_hartree: 0,
          projected_capacity_fade_rate: 0,
          molecular_degradation_risk: 'UNKNOWN',
          message: `QCloud job ${jobId} on '${resolvedBackend}' ended with status '${latestStatus}'.`,
          instructions: null,
        };
      }

      const isHardware = resolvedBackend === 'QpiAI-Indus-1';

      if (latestStatus !== 'completed' && latestStatus !== 'success') {
        return {
          status: 'SUBMITTED',
          configured_for_cloud: true,
          qcloud_authenticated: true,
          is_cloud_execution: true,
          is_hardware_execution: isHardware,
          execution_mode: isHardware ? 'QCLOUD_QUANTUM_HARDWARE' : 'QCLOUD_REMOTE_SIMULATOR',
          backend_used: resolvedBackend,
          job_id: jobId,
          circuit_id: circuitId,
          shots,
          num_qubits: 4,
          circuit_depth: 14,
          quantum_gate_counts: gateCounts,
          measured_probabilities: {},
          estimated_ground_state_energy_hartree: 0,
          projected_capacity_fade_rate: Math.round((1.45 + degradationRatio * 2.85) * 100) / 100,
          molecular_degradation_risk: risk,
          message: `Quantum job ${jobId} submitted to QCloud backend '${resolvedBackend}' (current status: '${latestStatus}').`,
          instructions: null,
        };
      }

      // Extract counts & probabilities from completed QCloud job
      let serverResp = jobDetail?.server_response ?? jobDetail?.result ?? jobDetail;
      if (typeof serverResp === 'string') {
        try {
          serverResp = JSON.parse(serverResp);
        } catch {
          // keep
        }
      }
      const rawCounts: Record<string, number> =
        serverResp?.counts || serverResp?.results?.counts || jobDetail?.counts || {};
      const totalMeasured =
        Object.values(rawCounts).reduce((acc, v) => acc + Number(v || 0), 0) || shots;
      const probs: Record<string, number> =
        serverResp?.probabilities && typeof serverResp.probabilities === 'object'
          ? serverResp.probabilities
          : {};

      if (Object.keys(probs).length === 0 && Object.keys(rawCounts).length > 0) {
        for (const [bitStr, cnt] of Object.entries(rawCounts)) {
          probs[bitStr] = Math.round((Number(cnt) / totalMeasured) * 10000) / 10000;
        }
      }

      let zzExp = 0.0;
      for (const [bitStr, p] of Object.entries(probs)) {
        const cleanBits = bitStr.replace(/\s+/g, '');
        const b0 = cleanBits[cleanBits.length - 1] === '1' ? -1.0 : 1.0;
        const b1 = cleanBits[cleanBits.length - 2] === '1' ? -1.0 : 1.0;
        zzExp += Number(p) * b0 * b1;
      }

      const energyHartree =
        Math.round((-75.85 + degradationRatio * 2.95 - 0.35 * zzExp) * 10000) / 10000;
      const fadeRate = Math.round((1.45 + degradationRatio * 2.85) * 100) / 100;
      const execSec =
        typeof jobDetail?.execution_time_ms === 'number'
          ? jobDetail.execution_time_ms / 1000
          : Math.round(((Date.now() - startMs) / 1000) * 10000) / 10000;

      return {
        status: 'SUCCESS',
        configured_for_cloud: true,
        qcloud_authenticated: true,
        is_cloud_execution: true,
        is_hardware_execution: isHardware,
        execution_mode: isHardware ? 'QCLOUD_QUANTUM_HARDWARE' : 'QCLOUD_REMOTE_SIMULATOR',
        backend_used: resolvedBackend,
        job_id: jobId,
        circuit_id: circuitId,
        shots,
        measured_counts: rawCounts,
        execution_time_seconds: execSec,
        provider_http_status: 200,
        available_cloud_backends: availableBackends,
        num_qubits: 4,
        circuit_depth: 14,
        quantum_gate_counts: gateCounts,
        measured_probabilities: probs,
        estimated_ground_state_energy_hartree: energyHartree,
        projected_capacity_fade_rate: fadeRate,
        molecular_degradation_risk: risk,
        message: isHardware
          ? `Quantum circuit executed on QpiAI Indus-1 physical quantum hardware (job ${jobId}).`
          : `Quantum circuit executed on QpiAI QCloud remote simulator '${resolvedBackend}' (job ${jobId}).`,
        instructions: null,
      };
    } catch (err: any) {
      const isAbort = err?.name === 'AbortError' || String(err?.message || '').includes('aborted');
      return {
        status: 'ERROR',
        configured_for_cloud: true,
        qcloud_authenticated: false,
        is_cloud_execution: false,
        is_hardware_execution: false,
        execution_mode: 'ERROR',
        backend_used: resolvedBackend,
        shots,
        execution_time_seconds: Math.round(((Date.now() - startMs) / 1000) * 10000) / 10000,
        num_qubits: 4,
        circuit_depth: 14,
        quantum_gate_counts: gateCounts,
        measured_probabilities: {},
        estimated_ground_state_energy_hartree: 0,
        projected_capacity_fade_rate: 0,
        molecular_degradation_risk: 'UNKNOWN',
        message: isAbort
          ? `QpiAI QCloud request timed out after ${timeoutMs}ms connecting to ${qServer}.`
          : `QpiAI QCloud network/service error: ${err?.message || 'Connection failed'}`,
        instructions: 'Verify network connectivity and QPIAI_QUANTUM_API_KEY configuration.',
      };
    }
  }
}
