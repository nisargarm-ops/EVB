import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';

import { createAccessToken } from '../rbac.ts';
import { InMemoryBatteryRepository } from '../repository.ts';
import {
  QpiAIOptIntegration,
  type QpiAIOptSdkClient,
} from '../integrations/qpiai_opt.ts';
import {
  QpiAIQCloudIntegration,
  type QpiAIQCloudSdkClient,
} from '../integrations/qpiai_qcloud.ts';
import { createQpiAIRouter } from '../api/qpiai.ts';

function saveEnv(): Record<string, string | undefined> {
  return {
    QPIAI_OPT_API_KEY: process.env.QPIAI_OPT_API_KEY,
    QPIAI_OPT_URL: process.env.QPIAI_OPT_URL,
    QPIAI_QUANTUM_API_KEY: process.env.QPIAI_QUANTUM_API_KEY,
    QPIAI_SERVER_URL: process.env.QPIAI_SERVER_URL,
    QPIAI_QUANTUM_BACKEND: process.env.QPIAI_QUANTUM_BACKEND,
    QPIAI_DEMO_MODE: process.env.QPIAI_DEMO_MODE,
  };
}

function restoreEnv(snapshot: Record<string, string | undefined>) {
  for (const [k, v] of Object.entries(snapshot)) {
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
}

describe('QpiAI Opt & QpiAI QCloud Integration Suite (Mocked SDKs)', () => {
  let envSnapshot: Record<string, string | undefined>;
  let repo: InMemoryBatteryRepository;

  beforeEach(() => {
    envSnapshot = saveEnv();
    delete process.env.QPIAI_OPT_API_KEY;
    delete process.env.QPIAI_OPT_URL;
    delete process.env.QPIAI_QUANTUM_API_KEY;
    delete process.env.QPIAI_SERVER_URL;
    delete process.env.QPIAI_QUANTUM_BACKEND;
    delete process.env.QPIAI_DEMO_MODE;
    repo = new InMemoryBatteryRepository();
  });

  afterEach(() => {
    restoreEnv(envSnapshot);
  });

  it('1. Missing credentials never fabricate live QpiAI Opt or QCloud results', async () => {
    const mockOptSdk: QpiAIOptSdkClient = {
      checkInstalled: async () => true,
      solveQubo: async () => {
        throw new Error('Should not invoke cloud SDK without credentials');
      },
    };
    const mockQCloudSdk: QpiAIQCloudSdkClient = {
      checkInstalled: async () => true,
      verifyCloudAuth: async () => ({ reachable: true, authenticated: false, message: 'No key' }),
      executeExperiment: async () => {
        throw new Error('Should not invoke QCloud SDK without credentials');
      },
    };

    const opt = new QpiAIOptIntegration(mockOptSdk);
    const qcloud = new QpiAIQCloudIntegration(mockQCloudSdk);
    const passports = await repo.getAllPassports();

    const optRes = await opt.runOptimization(
      { battery_ids: [passports[0].battery_id], allow_demo_fallback: false },
      [passports[0]],
      []
    );
    assert.equal(optRes.solver_status, 'MISSING_CREDENTIALS');
    assert.equal(optRes.is_live_qpiai_execution, false);
    assert.equal(optRes.is_demo, false);
    assert.equal(optRes.allocations[0].selected_pathway, null);

    const qcRes = await qcloud.runQuantumExperiment(
      { experiment_type: 'bell_calibration_check', shots: 512, allow_demo_simulation: false },
      passports
    );
    assert.equal(qcRes.execution_status, 'MISSING_CREDENTIALS');
    assert.equal(qcRes.measurement_counts, null);
    assert.equal(qcRes.backend_used, null);
    assert.equal(qcRes.is_cloud_execution, false);
  });

  it('2. Handles QpiAI Opt solver errors cleanly without fabricating allocations', async () => {
    process.env.QPIAI_OPT_API_KEY = 'test-opt-key';
    process.env.QPIAI_OPT_URL = 'https://opt.example.test/api';

    const failingOptSdk: QpiAIOptSdkClient = {
      checkInstalled: async () => true,
      solveQubo: async () => ({
        ok: false,
        error_code: 'SOLVER_ERROR',
        message: 'Remote QUBO solver upstream HTTP 502 Bad Gateway',
      }),
    };

    const opt = new QpiAIOptIntegration(failingOptSdk);
    const p1 = (await repo.getPassportById('BAT-NMC-8A2F91C0'))!;
    const res = await opt.runOptimization({ battery_ids: [p1.battery_id] }, [p1], []);

    assert.equal(res.solver_status, 'SOLVER_ERROR');
    assert.equal(res.is_live_qpiai_execution, false);
    assert.equal(res.allocations.length, 0);
    assert.match(res.message, /502 Bad Gateway/);
  });

  it('3. Handles invalid or incomplete battery data and flags missing telemetry warnings', async () => {
    const mockOptSdk: QpiAIOptSdkClient = {
      checkInstalled: async () => true,
      solveQubo: async () => ({ ok: true, solution: { '0': 1, '1': 0, '2': 0, '3': 0 } }),
    };
    const opt = new QpiAIOptIntegration(mockOptSdk);

    // Case A: Unknown battery ID
    const missingRes = await opt.runOptimization(
      { battery_ids: ['BAT-DOES-NOT-EXIST'] },
      [],
      ['BAT-DOES-NOT-EXIST']
    );
    assert.equal(missingRes.solver_status, 'INVALID_INPUT');

    // Case B: Corrupt negative/out-of-range SoH
    const pValid = (await repo.getPassportById('BAT-NMC-8A2F91C0'))!;
    const corruptPassport = {
      ...pValid,
      health_state: { ...pValid.health_state, state_of_health_pct: 145.0 },
    };
    const corruptRes = await opt.runOptimization(
      { battery_ids: [corruptPassport.battery_id] },
      [corruptPassport],
      []
    );
    assert.equal(corruptRes.solver_status, 'INVALID_INPUT');

    // Case C: Incomplete non-fatal telemetry produces warnings & <100% completeness score
    const incompletePassport = {
      ...pValid,
      health_state: {
        ...pValid.health_state,
        last_telemetry_timestamp: '',
        internal_resistance_mohm: NaN,
      },
    };
    const incRes = await opt.runOptimization(
      { battery_ids: [incompletePassport.battery_id], allow_demo_fallback: true },
      [incompletePassport],
      []
    );
    assert.equal(incRes.solver_status, 'DEMO_REFERENCE_SOLVED');
    assert.equal(incRes.is_demo, true);
    assert.ok(incRes.data_completeness.overall_completeness_pct < 100);
    assert.ok(incRes.data_completeness.warnings.length >= 2);
  });

  it('4. Detects infeasible hard capacity and safety constraints', async () => {
    const mockOptSdk: QpiAIOptSdkClient = {
      checkInstalled: async () => true,
      solveQubo: async () => ({ ok: true, solution: {} }),
    };
    const opt = new QpiAIOptIntegration(mockOptSdk);
    const passports = await repo.getAllPassports(); // 3 batteries

    // Total capacity across all 4 pathways = 1 < 3 batteries -> strictly infeasible
    const infeasibleCapRes = await opt.runOptimization(
      {
        battery_ids: passports.map(p => p.battery_id),
        pathway_capacities: {
          direct_reuse: 1,
          second_life_bess: 0,
          remanufacturing: 0,
          material_recycling: 0,
        },
        allow_demo_fallback: true,
      },
      passports,
      []
    );
    assert.equal(infeasibleCapRes.solver_status, 'INFEASIBLE');
    assert.equal(infeasibleCapRes.allocations[0].selected_pathway, null);

    // Thermal safety hazard flagged on battery, while material_recycling capacity = 0 -> infeasible!
    const p1 = passports[0];
    const safetyInfeasible = await opt.runOptimization(
      {
        battery_ids: [p1.battery_id],
        pathway_capacities: {
          direct_reuse: 2,
          second_life_bess: 2,
          remanufacturing: 2,
          material_recycling: 0,
        },
        inspection_flags_by_battery: {
          [p1.battery_id]: { thermal_event_detected: true },
        },
        allow_demo_fallback: true,
      },
      [p1],
      []
    );
    assert.equal(safetyInfeasible.solver_status, 'INFEASIBLE');
  });

  it('5. Handles unavailable quantum backend safely', async () => {
    process.env.QPIAI_QUANTUM_API_KEY = 'valid-qcloud-key';
    const unavailableSdk: QpiAIQCloudSdkClient = {
      checkInstalled: async () => true,
      verifyCloudAuth: async () => ({ reachable: true, authenticated: true, message: 'OK' }),
      executeExperiment: async () => ({
        ok: false,
        error_code: 'BACKEND_UNAVAILABLE',
        message: 'Compute resource QpiAI-Indus-1 is currently in calibration maintenance window.',
      }),
    };

    const qcloud = new QpiAIQCloudIntegration(unavailableSdk);
    const passports = await repo.getAllPassports();
    const res = await qcloud.runQuantumExperiment(
      { experiment_type: 'bell_calibration_check', backend: 'QpiAI-Indus-1', shots: 512 },
      passports
    );

    assert.equal(res.execution_status, 'BACKEND_UNAVAILABLE');
    assert.equal(res.measurement_counts, null);
    assert.equal(res.is_cloud_execution, false);
  });

  it('6. Handles QpiAI QCloud authentication failures distinctly', async () => {
    process.env.QPIAI_QUANTUM_API_KEY = 'expired-or-revoked-key';
    const authFailSdk: QpiAIQCloudSdkClient = {
      checkInstalled: async () => true,
      verifyCloudAuth: async () => ({
        reachable: true,
        authenticated: false,
        message: 'QpiAI QCloud rejected API key (HTTP 401).',
      }),
      executeExperiment: async () => ({
        ok: false,
        error_code: 'AUTH_ERROR',
        message: 'APIKeyInvalidError: API key is invalid or expired',
      }),
    };

    const qcloud = new QpiAIQCloudIntegration(authFailSdk);
    const status = await qcloud.getStatus();
    assert.equal(status.status, 'execution_error');

    const passports = await repo.getAllPassports();
    const runRes = await qcloud.runQuantumExperiment(
      { experiment_type: 'telemetry_anomaly_ising', shots: 256 },
      passports
    );
    assert.equal(runRes.execution_status, 'AUTH_ERROR');
    assert.equal(runRes.measurement_counts, null);
  });

  it('7. Rejects malformed SDK responses from both QpiAI Opt and QpiAI QCloud', async () => {
    process.env.QPIAI_OPT_API_KEY = 'opt-key';
    process.env.QPIAI_OPT_URL = 'https://opt.example.test';
    process.env.QPIAI_QUANTUM_API_KEY = 'qc-key';

    // Opt returns non-binary solution values
    const badOptSdk: QpiAIOptSdkClient = {
      checkInstalled: async () => true,
      solveQubo: async () => ({
        ok: true,
        result: { objective: -12.3, time: 0.2 },
        solution: { '0': 99, '1': 0, '2': 0, '3': 0 },
      }),
    };
    const opt = new QpiAIOptIntegration(badOptSdk);
    const p1 = (await repo.getPassportById('BAT-NMC-8A2F91C0'))!;
    const optRes = await opt.runOptimization({ battery_ids: [p1.battery_id] }, [p1], []);
    assert.equal(optRes.solver_status, 'MALFORMED_RESPONSE');

    // QCloud returns wrong bitstring width / mismatched total shots
    const badQCloudSdk: QpiAIQCloudSdkClient = {
      checkInstalled: async () => true,
      verifyCloudAuth: async () => ({ reachable: true, authenticated: true, message: 'OK' }),
      executeExperiment: async () => ({
        ok: true,
        counts: { '00': 100, '11': 50 }, // sums to 150 != 512 requested shots
        execution_time_ms: 42,
      }),
    };
    const qcloud = new QpiAIQCloudIntegration(badQCloudSdk);
    const qcRes = await qcloud.runQuantumExperiment(
      { experiment_type: 'bell_calibration_check', shots: 512 },
      [p1]
    );
    assert.equal(qcRes.execution_status, 'MALFORMED_RESPONSE');
    assert.equal(qcRes.measurement_counts, null);
  });

  it('8. Handles timeout and quota exhaustion errors cleanly', async () => {
    process.env.QPIAI_QUANTUM_API_KEY = 'qc-key';
    const passports = await repo.getAllPassports();

    const timeoutSdk: QpiAIQCloudSdkClient = {
      checkInstalled: async () => true,
      verifyCloudAuth: async () => ({ reachable: true, authenticated: true, message: 'OK' }),
      executeExperiment: async () => ({
        ok: false,
        error_code: 'TIMEOUT',
        message: 'SSE job event listener timed out after 15s',
      }),
    };
    const resTimeout = await new QpiAIQCloudIntegration(timeoutSdk).runQuantumExperiment(
      { experiment_type: 'bell_calibration_check', shots: 256, timeout_ms: 1500 },
      passports
    );
    assert.equal(resTimeout.execution_status, 'TIMEOUT');

    const quotaSdk: QpiAIQCloudSdkClient = {
      checkInstalled: async () => true,
      verifyCloudAuth: async () => ({ reachable: true, authenticated: true, message: 'OK' }),
      executeExperiment: async () => ({
        ok: false,
        error_code: 'QUOTA_EXCEEDED',
        message: 'Insufficient QpiAI QCloud QPU credits remaining.',
      }),
    };
    const resQuota = await new QpiAIQCloudIntegration(quotaSdk).runQuantumExperiment(
      { experiment_type: 'bell_calibration_check', backend: 'QpiAI-Indus-1', shots: 256 },
      passports
    );
    assert.equal(resQuota.execution_status, 'QUOTA_EXCEEDED');
  });

  it('9. Accurately labels simulated vs cloud hardware QPU vs demo runs & enforces API security', async () => {
    process.env.QPIAI_OPT_API_KEY = 'opt-key';
    process.env.QPIAI_OPT_URL = 'https://opt.example.test';
    process.env.QPIAI_QUANTUM_API_KEY = 'qc-key';
    process.env.QPIAI_QUANTUM_BACKEND = 'QpiAI-QSV-Simulator';

    const liveOptSdk: QpiAIOptSdkClient = {
      checkInstalled: async () => true,
      solveQubo: async () => ({
        ok: true,
        result: { num_nodes: 4, objective: -214.5, time: 0.145 },
        solution: { '0': 1, '1': 0, '2': 0, '3': 0 }, // assigns battery 0 -> direct_reuse
        job_id: 'JOB-OPT-77',
      }),
    };

    const liveQCloudSdk: QpiAIQCloudSdkClient = {
      checkInstalled: async () => true,
      verifyCloudAuth: async () => ({ reachable: true, authenticated: true, message: 'OK' }),
      executeExperiment: async ({ backend, shots }) => ({
        ok: true,
        counts: { '00': shots / 2, '11': shots / 2 },
        execution_time_ms: 128.4,
        job_id: `JOB-QC-${backend}`,
        job_status: 'completed',
        credits_used: backend === 'QpiAI-Indus-1' ? 5 : 0,
      }),
    };

    const optAdapter = new QpiAIOptIntegration(liveOptSdk);
    const qcloudAdapter = new QpiAIQCloudIntegration(liveQCloudSdk);

    // Mount dedicated Express router on ephemeral port and test full HTTP contract
    const app = express();
    app.use(express.json());
    app.use('/api', createQpiAIRouter({ optAdapter, qcloudAdapter, getRepo: () => repo }));

    const server = app.listen(0);
    const port = (server.address() as any).port;
    const baseUrl = `http://127.0.0.1:${port}`;
    const token = createAccessToken({
      sub: 'USR-MFG-01',
      username: 'manufacturer',
      role: 'MANUFACTURER',
      org: 'QuantumVolt Gigafactory',
      name: 'Elena Rostova',
    });

    try {
      // A. Check GET /api/integrations/status reports simulator_only for QpiAI-QSV-Simulator
      const statusHttp = await fetch(`${baseUrl}/api/integrations/status`);
      assert.equal(statusHttp.status, 200);
      const statusJson = (await statusHttp.json()) as any;
      assert.equal(statusJson.qpiai_qcloud.status, 'simulator_only');

      // B. Simulator run -> SIMULATOR_COMPLETED, is_simulated: true, is_cloud_execution: true
      const simHttp = await fetch(`${baseUrl}/api/quantum/run`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          experiment_type: 'bell_calibration_check',
          backend: 'QpiAI-QSV-Simulator',
          shots: 512,
        }),
      });
      assert.equal(simHttp.status, 200);
      const simJson = (await simHttp.json()) as any;
      assert.equal(simJson.execution_status, 'SIMULATOR_COMPLETED');
      assert.equal(simJson.is_simulated, true);
      assert.equal(simJson.is_cloud_execution, true);
      assert.equal(simJson.is_demo, false);

      // C. Hardware QPU run -> CLOUD_COMPLETED, is_simulated: false, is_cloud_execution: true
      const qpuHttp = await fetch(`${baseUrl}/api/quantum/run`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          experiment_type: 'bell_calibration_check',
          backend: 'QpiAI-Indus-1',
          shots: 512,
        }),
      });
      assert.equal(qpuHttp.status, 200);
      const qpuJson = (await qpuHttp.json()) as any;
      assert.equal(qpuJson.execution_status, 'CLOUD_COMPLETED');
      assert.equal(qpuJson.is_simulated, false);
      assert.equal(qpuJson.is_cloud_execution, true);
      assert.equal(qpuJson.is_demo, false);

      // D. Reject unrestricted circuit / arbitrary code injection attempts with HTTP 400
      const exploitHttp = await fetch(`${baseUrl}/api/quantum/run`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          experiment_type: 'bell_calibration_check',
          qasm_string: 'OPENQASM 2.0; ...',
        }),
      });
      assert.equal(exploitHttp.status, 400);

      // E. Live Opt run + untrusted override warning verification
      const optHttp = await fetch(`${baseUrl}/api/optimization/run`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          battery_ids: ['BAT-NMC-8A2F91C0'],
          override_soh: 99.9, // untrusted override attempt must be ignored & logged!
        }),
      });
      assert.equal(optHttp.status, 200);
      const optJson = (await optHttp.json()) as any;
      assert.equal(optJson.solver_status, 'LIVE_SOLVED');
      assert.equal(optJson.is_live_qpiai_execution, true);
      assert.equal(optJson.is_demo, false);
      assert.equal(optJson.allocations[0].selected_pathway, 'direct_reuse');
      assert.ok(
        optJson.data_completeness.warnings.some((w: string) =>
          w.includes('Ignored client-supplied battery attribute overrides')
        )
      );
    } finally {
      server.close();
    }
  });
});
