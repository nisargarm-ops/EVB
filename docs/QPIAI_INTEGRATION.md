# QpiAI Optimization & QCloud Quantum Integration Guide

BatteryPass 360 integrates two **distinct** QpiAI platforms with strict provenance boundaries:

1. **QpiAI Opt (`qpiai-opt-api`)** — Classical / hybrid constrained combinatorial optimization (QUBO) to assist battery disposition decisions across **Direct Reuse**, **Second-Life BESS**, **Remanufacturing**, and **Material Recycling**.
2. **QpiAI QCloud (`qpiai-quantum`)** — Quantum circuit construction, simulator execution, and hardware QPU readout (`QpiAI-Indus-1`) using the official QpiAI Quantum SDK (`https://docs.qcloud.qpiai.tech/`).

> **Scientific & Engineering Honesty Policy**
> - A quantum circuit experiment does **not** solve the industrial fleet disposition problem, and classical reference optimization results are **never** attributed to a quantum computer or live QpiAI cloud run.
> - Demo / local reference executions are disabled by default unless explicitly requested (`allow_demo_fallback: true` or `allow_demo_simulation: true`) and are always labelled with `is_demo: true`.
> - Credentials are read exclusively on the server and are never exposed to frontend code.

---

## 1. Verified SDK Packages & Installation

### QpiAI Opt (`qpiai-opt-api` v1.0.6)
```bash
pip install qpiai-opt-api networkx requests
```
Verified SDK classes and methods (`qpiai_opt`):
- `from qpiai_opt.problem.qubo import QUBOProblem`
  - `QUBOProblem(num_variables: int, qubo_dict: dict[tuple[int, int], float], max_evaluations: int = 1000, problem_type: str = "QUBO")`
- `from qpiai_opt.solver.solver import Solver`
  - `Solver(problem: BaseModel, url: str, access_token: str)`
  - `solver.run(queue: bool = False)`
  - `solver.get_result()` → `{'num_nodes': int, 'objective': float, 'time': float}`
  - `solver.get_solution()` → `dict[str, int]` binary assignment map

### QpiAI Quantum SDK (`qpiai-quantum` v0.7.5)
Documentation: [https://docs.qcloud.qpiai.tech/](https://docs.qcloud.qpiai.tech/)
```bash
pip install qpiai-quantum
```
Verified SDK classes, backends, and methods (`qpiai_quantum`):
- `from qpiai_quantum import Circuit, QpiAIQuantumAuth`
- `from qpiai_quantum.jobmanager.backend import Backend`
  - `Backend.LOCAL_SIMULATOR` → `"QpiAI-QSV-Local"` (`method="statevector"`, local SDK simulator; still requires API key auth via `ExecutionEngine._get_api_key`)
  - `Backend.STATEVECTOR_SIMULATOR_CPU` → `"QpiAI-QSV-Simulator"` (`method="statevector"`, QCloud simulator)
  - `Backend.DENSITY_MATRIX_SIMULATOR_CPU` → `"QpiAI-QDM-Simulator"` (`method="density_matrix"`, QCloud simulator)
  - `Backend.TENSOR_NETWORK_SIMULATOR_CPU` → `"QpiAI-QTN-Simulator"` (`method="tensor_network"`, QCloud simulator)
  - `Backend.INDUS_QPU` → `"QpiAI-Indus-1"` (`method="qpu"`, QpiAI Indus superconducting QPU)
- `from qpiai_quantum.jobmanager.execution_engine import ExecutionEngine`
  - `QpiAIQuantumAuth.login(api_key=...)` & `QpiAIQuantumAuth.verify_api_key()` (`GET {QPIAI_SERVER_URL}/api/users/me` with `X-Secret-Token`)
  - `ExecutionEngine.execute_circuit(circuit, shots=..., experiment_name=..., access_token=..., timeout=..., method=..., device_name=...)` → `JobResult` (`counts`, `probabilities`, `execution_time`, `job_id`, `job_status`, `credits_used`, `job_metadata`)

---

## 2. Required Server Environment Variables (`.env`)

```env
# QpiAI Opt
QPIAI_OPT_API_KEY=<your-qpiai-opt-access-token>
QPIAI_OPT_URL=<your-qpiai-opt-solver-endpoint-url>

# QpiAI QCloud
QPIAI_QUANTUM_API_KEY=<your-qcloud-api-key-from-qcloud.qpiai.tech>
QPIAI_SERVER_URL=https://qcloud-server.qpiai.tech
QPIAI_QUANTUM_BACKEND=QpiAI-QSV-Local
```

---

## 3. Dedicated API Contract

Mounted at `/api` (and `/api/v1`):

| Endpoint | Auth | Description |
| --- | --- | --- |
| `GET /api/integrations/status` | Public / Safe | Distinguishes `configured_and_reachable`, `configured_but_unavailable`, `missing_credentials`, `simulator_only`, `demo_mode`, and `execution_error` without exposing secrets. |
| `POST /api/optimization/run` | Bearer JWT (RBAC) | Retrieves trusted passports from repository, validates completeness, separates hard safety/capacity rules from configurable engineering thresholds, builds QUBO, and executes via `qpiai-opt-api` (or labelled demo fallback when `allow_demo_fallback: true`). |
| `POST /api/quantum/run` | Bearer JWT (RBAC) | Runs bounded (`shots` in `[64, 4096]`) predefined quantum experiments (`telemetry_anomaly_ising`, `toy_disposition_ising_2pack`, `bell_calibration_check`) with explicit simulated vs cloud QPU vs demo provenance. |

---

## 4. Running Mocked-SDK Reliability Tests

Tests require **zero** paid cloud calls or live API keys:

```bash
npm test
```
