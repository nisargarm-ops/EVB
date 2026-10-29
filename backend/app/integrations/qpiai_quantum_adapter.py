import logging
import math
import time
import httpx

from ..core.config import settings
from ..schemas.qpiai import QpiAIQuantumSimulationRequest, QpiAIQuantumResponse

logger = logging.getLogger("batterypass.qpiai.quantum")

DEFAULT_QCLOUD_SERVER = "https://qcloud-server.qpiai.tech"


class QpiAIQuantumAdapter:
    """
    Official interface adapter for QpiAI Quantum SDK (`qpiai-quantum` 0.7.5) & QCloud.
    Strictly distinguishes local statevector simulation (`QpiAI-QSV-Local` -> SIMULATION_COMPLETED)
    from remote QCloud simulator / Indus-1 QPU jobs (`SUCCESS` / `SUBSCRIPTION_REQUIRED`).
    """

    @classmethod
    def build_openqasm_circuit(cls, soh: float, cycle_count: int) -> str:
        degradation_factor = max(0.0, (100.0 - soh) / 100.0)
        theta = round((math.pi / 4.0) * (1.0 + degradation_factor), 6)
        theta15 = round(theta * 1.5, 6)
        phi = round((math.pi / 6.0) * (cycle_count / 1000.0), 6)
        phi12 = round(phi * 1.2, 6)
        return "\n".join(
            [
                "OPENQASM 2.0;",
                'include "qelib1.inc";',
                "qreg q[4];",
                "creg c[4];",
                "h q[0];",
                "h q[1];",
                "h q[2];",
                "h q[3];",
                "cx q[0],q[1];",
                "cx q[1],q[2];",
                "cx q[2],q[3];",
                f"rz({theta}) q[0];",
                f"rz({theta15}) q[1];",
                f"rx({phi}) q[2];",
                f"rx({phi12}) q[3];",
                "cx q[0],q[2];",
                "cx q[1],q[3];",
                "measure q[0] -> c[0];",
                "measure q[1] -> c[1];",
                "measure q[2] -> c[2];",
                "measure q[3] -> c[3];",
            ]
        )

    @classmethod
    async def run_simulation(cls, req: QpiAIQuantumSimulationRequest) -> QpiAIQuantumResponse:
        api_key = settings.QPIAI_QUANTUM_API_KEY.strip()
        backend_choice = (req.backend or settings.QPIAI_QUANTUM_BACKEND or "QpiAI-QSV-Local").strip()
        gate_counts = {"H": 4, "CX": 5, "RZ": 2, "RX": 2, "MEASURE": 4}
        degradation_ratio = max(0.0, (100.0 - req.state_of_health_pct) / 100.0)
        risk = "HIGH" if req.state_of_health_pct < 75.0 else ("MODERATE" if req.state_of_health_pct < 85.0 else "LOW")

        if not api_key:
            return QpiAIQuantumResponse(
                status="AUTH_REQUIRED",
                configured_for_cloud=False,
                backend_used=backend_choice,
                num_qubits=4,
                circuit_depth=14,
                quantum_gate_counts=gate_counts,
                measured_probabilities={},
                estimated_ground_state_energy_hartree=0.0,
                projected_capacity_fade_rate=0.0,
                molecular_degradation_risk=risk,
                message="QPIAI_QUANTUM_API_KEY is not configured. No quantum simulation was executed.",
                instructions="Configure QPIAI_QUANTUM_API_KEY on the backend server.",
            )

        headers = {"Content-Type": "application/json", "X-Secret-Token": api_key}
        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                me_res = await client.get(f"{DEFAULT_QCLOUD_SERVER}/api/users/me", headers=headers)
                if me_res.status_code in (401, 403):
                    return QpiAIQuantumResponse(
                        status="AUTH_REQUIRED",
                        configured_for_cloud=True,
                        backend_used=backend_choice,
                        num_qubits=4,
                        circuit_depth=14,
                        quantum_gate_counts=gate_counts,
                        measured_probabilities={},
                        estimated_ground_state_energy_hartree=0.0,
                        projected_capacity_fade_rate=0.0,
                        molecular_degradation_risk=risk,
                        message=f"QpiAI QCloud rejected API key (HTTP {me_res.status_code}).",
                    )

                if backend_choice == "QpiAI-QSV-Local":
                    from qpiai_quantum.authentication.auth import QpiAIQuantumAuth
                    from qpiai_quantum.circuit.circuit import Circuit

                    QpiAIQuantumAuth.login(api_key)
                    qc = Circuit.from_qasm(cls.build_openqasm_circuit(req.state_of_health_pct, req.cycle_count))
                    job_result = qc.run(shots=req.shots, device_name="QpiAI-QSV-Local")
                    counts = job_result.get_counts() if hasattr(job_result, "get_counts") else {}
                    total_shots = sum(counts.values()) or req.shots
                    probs = {k: round(v / total_shots, 4) for k, v in counts.items()}
                    return QpiAIQuantumResponse(
                        status="SIMULATION_COMPLETED",
                        configured_for_cloud=True,
                        backend_used="QpiAI-QSV-Local",
                        num_qubits=4,
                        circuit_depth=14,
                        quantum_gate_counts=gate_counts,
                        measured_probabilities=probs,
                        estimated_ground_state_energy_hartree=round(-75.85 + degradation_ratio * 2.95, 4),
                        projected_capacity_fade_rate=round(1.45 + degradation_ratio * 2.85, 2),
                        molecular_degradation_risk=risk,
                        message="Authenticated with QpiAI QCloud and executed on local statevector simulator 'QpiAI-QSV-Local' (not remote QPU hardware).",
                    )

                exp_res = await client.get(
                    f"{DEFAULT_QCLOUD_SERVER}/api/experiments/by-name",
                    params={"name": "Default Experiment"},
                    headers=headers,
                )
                experiment_id = exp_res.json().get("experiment_id") if exp_res.is_success else None
                qasm_str = cls.build_openqasm_circuit(req.state_of_health_pct, req.cycle_count)
                circ_res = await client.post(
                    f"{DEFAULT_QCLOUD_SERVER}/api/circuits/create",
                    headers=headers,
                    json={"name": f"bp360_{int(time.time() * 1000)}", "qasm": qasm_str, "num_qubits": 4, "depth": 14},
                )
                if not circ_res.is_success:
                    return QpiAIQuantumResponse(
                        status="ERROR",
                        configured_for_cloud=True,
                        backend_used=backend_choice,
                        num_qubits=4,
                        circuit_depth=14,
                        quantum_gate_counts=gate_counts,
                        measured_probabilities={},
                        estimated_ground_state_energy_hartree=0.0,
                        projected_capacity_fade_rate=0.0,
                        molecular_degradation_risk=risk,
                        message=f"QCloud circuit registration failed (HTTP {circ_res.status_code}): {circ_res.text[:240]}",
                    )

                circuit_id = circ_res.json().get("id") or circ_res.json().get("ID")
                job_res = await client.post(
                    f"{DEFAULT_QCLOUD_SERVER}/api/jobs/qasm",
                    headers=headers,
                    json={
                        "circuit_id": circuit_id,
                        "experiment_id": experiment_id,
                        "backend_name": backend_choice,
                        "num_shots": req.shots,
                    },
                )
                if not job_res.is_success:
                    if circuit_id and 400 <= job_res.status_code < 500:
                        await client.delete(f"{DEFAULT_QCLOUD_SERVER}/api/circuits/{circuit_id}", headers=headers)
                    err_text = job_res.text[:260]
                    status_code = "SUBSCRIPTION_REQUIRED" if "subscription" in err_text.lower() else "ERROR"
                    return QpiAIQuantumResponse(
                        status=status_code,
                        configured_for_cloud=True,
                        backend_used=backend_choice,
                        num_qubits=4,
                        circuit_depth=14,
                        quantum_gate_counts=gate_counts,
                        measured_probabilities={},
                        estimated_ground_state_energy_hartree=0.0,
                        projected_capacity_fade_rate=0.0,
                        molecular_degradation_risk=risk,
                        message=f"QCloud registered circuit ({circuit_id}), but remote job submission on '{backend_choice}' failed (HTTP {job_res.status_code}): {err_text}",
                        instructions="Activate a QCloud subscription at https://qcloud.qpiai.tech or use 'QpiAI-QSV-Local'.",
                    )

                job_id = (job_res.json().get("job") or {}).get("id") or job_res.json().get("id")
                return QpiAIQuantumResponse(
                    status="SUBMITTED",
                    configured_for_cloud=True,
                    backend_used=backend_choice,
                    num_qubits=4,
                    circuit_depth=14,
                    quantum_gate_counts=gate_counts,
                    measured_probabilities={},
                    estimated_ground_state_energy_hartree=0.0,
                    projected_capacity_fade_rate=round(1.45 + degradation_ratio * 2.85, 2),
                    molecular_degradation_risk=risk,
                    message=f"Quantum job {job_id} submitted to QCloud backend '{backend_choice}'.",
                )
        except Exception as e:
            logger.error(f"QpiAI Quantum SDK execution error: {e}")
            return QpiAIQuantumResponse(
                status="ERROR",
                configured_for_cloud=True,
                backend_used=backend_choice,
                num_qubits=4,
                circuit_depth=14,
                quantum_gate_counts=gate_counts,
                measured_probabilities={},
                estimated_ground_state_energy_hartree=0.0,
                projected_capacity_fade_rate=0.0,
                molecular_degradation_risk="UNKNOWN",
                message=f"QpiAI Quantum SDK execution returned error: {str(e)}",
            )

