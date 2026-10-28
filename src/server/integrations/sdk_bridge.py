#!/usr/bin/env python3
"""
Strictly isolated Python SDK bridge for verified QpiAI Python packages:
1. qpiai-opt-api (v1.0.6+): qpiai_opt.problem.qubo.QUBOProblem, qpiai_opt.solver.solver.Solver
2. qpiai-quantum (v0.7.5+): qpiai_quantum.QpiAIQuantumAuth, qpiai_quantum.Circuit,
   qpiai_quantum.jobmanager.backend.Backend, qpiai_quantum.jobmanager.execution_engine.ExecutionEngine

Reads structured JSON parameters from stdin and writes structured JSON to stdout.
Never executes user strings, arbitrary gates, or shell commands.
"""
import importlib.util
import json
import os
import sys
import time


def check_packages() -> dict:
    return {
        "qpiai_opt_installed": importlib.util.find_spec("qpiai_opt") is not None,
        "qpiai_quantum_installed": importlib.util.find_spec("qpiai_quantum") is not None,
    }


def run_opt(payload: dict) -> dict:
    if importlib.util.find_spec("qpiai_opt") is None:
        return {"ok": False, "error_code": "SDK_NOT_INSTALLED", "message": "Python package 'qpiai-opt-api' is not installed."}

    from qpiai_opt.problem.qubo import QUBOProblem
    from qpiai_opt.solver.solver import Solver

    api_key = os.environ.get("QPIAI_OPT_API_KEY", "").strip()
    opt_url = os.environ.get("QPIAI_OPT_URL", "").strip()
    if not api_key or not opt_url:
        return {"ok": False, "error_code": "MISSING_CREDENTIALS", "message": "QPIAI_OPT_API_KEY and QPIAI_OPT_URL are required."}

    num_variables = int(payload["num_variables"])
    max_evaluations = int(payload.get("max_evaluations", 1000))
    raw_edges = payload["qubo_edges"]
    qubo_dict = {(int(item[0]), int(item[1])): float(item[2]) for item in raw_edges}

    t0 = time.perf_counter()
    try:
        problem = QUBOProblem(
            num_variables=num_variables,
            qubo_dict=qubo_dict,
            max_evaluations=max_evaluations,
            problem_type="QUBO",
        )
        solver = Solver(problem=problem, url=opt_url, access_token=api_key)
        solver.run(queue=False)
        res = solver.get_result()
        sol = solver.get_solution()
        elapsed_ms = round((time.perf_counter() - t0) * 1000.0, 2)
        return {
            "ok": True,
            "result": res,
            "solution": sol,
            "job_id": getattr(solver, "job_id", None),
            "execution_time_ms": elapsed_ms,
        }
    except Exception as exc:
        return {"ok": False, "error_code": "SOLVER_ERROR", "message": str(exc)}


def run_quantum(payload: dict) -> dict:
    if importlib.util.find_spec("qpiai_quantum") is None:
        return {"ok": False, "error_code": "SDK_NOT_INSTALLED", "message": "Python package 'qpiai-quantum' is not installed."}

    from qpiai_quantum import Circuit, QpiAIQuantumAuth
    from qpiai_quantum.authentication.exceptions import (
        APIKeyEmptyError,
        APIKeyExpiredError,
        APIKeyInvalidError,
        APIKeyRevokedError,
        AuthError,
        UserNotFoundError,
    )
    from qpiai_quantum.jobmanager.backend import Backend
    from qpiai_quantum.jobmanager.exceptions import (
        AuthenticationError,
        InvalidResponseError,
        JobManagerError,
        JobStatusError,
        JobSubmissionError,
    )
    from qpiai_quantum.jobmanager.execution_engine import ExecutionEngine

    api_key = os.environ.get("QPIAI_QUANTUM_API_KEY", "").strip()
    if not api_key:
        return {"ok": False, "error_code": "MISSING_CREDENTIALS", "message": "QPIAI_QUANTUM_API_KEY is required."}

    exp_type = payload["experiment_type"]
    device_name = payload["backend"]
    shots = int(payload["shots"])
    timeout_sec = max(1, int(payload.get("timeout_ms", 15000) / 1000))
    angles = payload.get("angles", {})

    # Resolve official Backend enum to (method, device_name)
    method = "statevector"
    for b_enum in Backend:
        if b_enum.value == device_name:
            method, device_name = b_enum.to_method_and_device()
            break

    try:
        QpiAIQuantumAuth.login(api_key=api_key)

        if exp_type == "bell_calibration_check":
            qc = Circuit(2, 2, name="BatteryPass_BellCalibration")
            qc.h(0)
            qc.cx(0, 1)
            qc.measure([0, 1], [0, 1])
        elif exp_type == "toy_disposition_ising_2pack":
            theta0 = float(angles.get("theta0", 0.5))
            theta1 = float(angles.get("theta1", 0.8))
            gamma = float(angles.get("gamma", 0.4))
            beta = float(angles.get("beta", 0.35))
            qc = Circuit(2, 2, name="BatteryPass_ToyDisposition2Pack")
            qc.h(0)
            qc.h(1)
            qc.rz(0, theta0)
            qc.rz(1, theta1)
            qc.cx(0, 1)
            qc.rz(1, gamma)
            qc.cx(0, 1)
            qc.rx(0, beta)
            qc.rx(1, beta)
            qc.measure([0, 1], [0, 1])
        elif exp_type == "telemetry_anomaly_ising":
            a0 = float(angles.get("q0_fade", 0.3))
            a1 = float(angles.get("q1_resistance", 0.4))
            a2 = float(angles.get("q2_cycles", 0.5))
            a3 = float(angles.get("q3_thermal", 0.1))
            qc = Circuit(4, 4, name="BatteryPass_TelemetryEncoding")
            qc.ry(0, a0)
            qc.ry(1, a1)
            qc.ry(2, a2)
            qc.ry(3, a3)
            qc.cx(0, 1)
            qc.cx(1, 2)
            qc.cx(2, 3)
            qc.rz(1, (a0 + a1) * 0.5)
            qc.rz(2, (a1 + a2) * 0.5)
            qc.measure([0, 1, 2, 3], [0, 1, 2, 3])
        else:
            return {"ok": False, "error_code": "INVALID_INPUT", "message": f"Unsupported experiment: {exp_type}"}

        t0 = time.perf_counter()
        job_res = ExecutionEngine.execute_circuit(
            circuit=qc,
            shots=shots,
            experiment_name=f"BatteryPass_{exp_type}",
            access_token=api_key,
            timeout=timeout_sec,
            method=method,
            device_name=device_name,
        )
        elapsed_ms = round((time.perf_counter() - t0) * 1000.0, 2)

        counts = job_res.counts if hasattr(job_res, "counts") else (job_res.get_counts() if hasattr(job_res, "get_counts") else None)
        exec_time_sec = getattr(job_res, "execution_time", None)
        reported_ms = round(float(exec_time_sec) * 1000.0, 2) if exec_time_sec else elapsed_ms

        return {
            "ok": True,
            "counts": counts,
            "probabilities": getattr(job_res, "probabilities", None),
            "execution_time_ms": reported_ms,
            "job_id": getattr(job_res, "job_id", None),
            "job_status": getattr(job_res, "job_status", "completed"),
            "method": getattr(job_res, "method", method),
            "credits_used": getattr(job_res, "credits_used", 0),
            "job_metadata": getattr(job_res, "job_metadata", {}),
        }
    except (
        APIKeyInvalidError,
        APIKeyExpiredError,
        APIKeyRevokedError,
        APIKeyEmptyError,
        UserNotFoundError,
        AuthError,
        AuthenticationError,
    ) as exc:
        return {"ok": False, "error_code": "AUTH_ERROR", "message": str(exc)}
    except TimeoutError as exc:
        return {"ok": False, "error_code": "TIMEOUT", "message": str(exc)}
    except JobSubmissionError as exc:
        msg = str(exc)
        if "quota" in msg.lower() or "credit" in msg.lower() or "429" in msg:
            return {"ok": False, "error_code": "QUOTA_EXCEEDED", "message": msg}
        return {"ok": False, "error_code": "BACKEND_UNAVAILABLE", "message": msg}
    except InvalidResponseError as exc:
        return {"ok": False, "error_code": "MALFORMED_RESPONSE", "message": str(exc)}
    except (JobStatusError, JobManagerError) as exc:
        return {"ok": False, "error_code": "EXECUTION_ERROR", "message": str(exc)}
    except Exception as exc:
        msg = str(exc)
        if "timeout" in msg.lower() or "timed out" in msg.lower():
            return {"ok": False, "error_code": "TIMEOUT", "message": msg}
        if "quota" in msg.lower() or "credit" in msg.lower():
            return {"ok": False, "error_code": "QUOTA_EXCEEDED", "message": msg}
        return {"ok": False, "error_code": "EXECUTION_ERROR", "message": msg}


def main():
    raw = sys.stdin.read()
    req = json.loads(raw) if raw.strip() else {"action": "check"}
    action = req.get("action")
    if action == "check":
        out = check_packages()
    elif action == "opt":
        out = run_opt(req["payload"])
    elif action == "quantum":
        out = run_quantum(req["payload"])
    else:
        out = {"ok": False, "error_code": "INVALID_ACTION", "message": "Unknown bridge action"}
    sys.stdout.write(json.dumps(out))


if __name__ == "__main__":
    main()
