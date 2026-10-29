import logging
import time
from typing import Dict, List, Tuple, Any
import httpx

from ..core.config import settings
from ..schemas.qpiai import QpiAIOptAllocationRequest, QpiAIOptResponse
from ..db.repository import BaseBatteryRepository

logger = logging.getLogger("batterypass.qpiai.opt")

DEFAULT_OPT_SERVER_URL = "https://opt-server.qpiai.tech/api"


def resolve_opt_base_url(raw_url: str) -> str:
    cleaned = (raw_url or "").strip().rstrip("/")
    if not cleaned or cleaned in (
        "https://opt.qpiai.tech",
        "https://opt.qpiai.tech/api",
        "https://opt.qpiai.tech/api/v1",
    ):
        return DEFAULT_OPT_SERVER_URL
    return cleaned


class QpiAIOptAdapter:
    """
    Official interface adapter for QpiAI-Opt Platform (`qpiai-opt` 0.0.9 REST protocol).
    Communicates with https://opt-server.qpiai.tech/api using `X-Secret-Token`.
    Strictly reports authentic status: never fabricates simulated execution results as cloud runs.
    """

    @staticmethod
    def formulate_qubo_problem(
        battery_data: List[Dict[str, Any]],
        destinations: List[str],
        carbon_weight: float = 0.4,
        distance_weight: float = 0.3,
        degradation_weight: float = 0.3,
        penalty_lambda: float = 50.0,
    ) -> Tuple[int, Dict[Tuple[int, int], float], Dict[str, float]]:
        num_batteries = len(battery_data)
        num_destinations = len(destinations)
        num_vars = num_batteries * num_destinations
        qubo_upper: Dict[Tuple[int, int], float] = {}

        def add_weight(u: int, v: int, w: float):
            pair = (min(u, v), max(u, v))
            qubo_upper[pair] = round(qubo_upper.get(pair, 0.0) + w, 4)

        for i in range(num_batteries):
            for j in range(num_destinations):
                var_idx = i * num_destinations + j
                add_weight(var_idx, var_idx, -penalty_lambda)
            for j in range(num_destinations):
                for k in range(j + 1, num_destinations):
                    add_weight(i * num_destinations + j, i * num_destinations + k, 2.0 * penalty_lambda)

        for i, b in enumerate(battery_data):
            soh = float(b.get("state_of_health_pct", 80.0))
            cycles = int(b.get("cycle_count", 500))
            co2 = float(b.get("total_co2_kg_per_kwh", 60.0))

            for j, dest in enumerate(destinations):
                var_idx = i * num_destinations + j
                cost = 0.0
                if dest == "stationary_bess":
                    cost += -(soh - 75.0) * degradation_weight * 2.0 if soh >= 75.0 else (75.0 - soh) * degradation_weight * 5.0
                    cost += (co2 * 0.1) * carbon_weight + (15.0 * distance_weight * 0.1)
                elif dest == "cell_reconditioning":
                    cost += abs(soh - 72.0) * degradation_weight * 1.5 + (cycles / 1000.0) * 5.0 + (25.0 * distance_weight * 0.1)
                elif dest == "deep_recycling":
                    cost += -(70.0 - soh) * degradation_weight * 3.0 if soh < 70.0 else (soh - 70.0) * degradation_weight * 2.0
                    cost -= (co2 * 0.2) * carbon_weight

                add_weight(var_idx, var_idx, cost)

        qubo_symmetric: Dict[str, float] = {}
        for (u, v), w in qubo_upper.items():
            if u == v:
                qubo_symmetric[f"{u},{v}"] = round(w, 4)
            else:
                half = round(w / 2.0, 4)
                qubo_symmetric[f"{u},{v}"] = half
                qubo_symmetric[f"{v},{u}"] = half

        return num_vars, qubo_upper, qubo_symmetric

    @classmethod
    async def solve_allocation(
        cls,
        req: QpiAIOptAllocationRequest,
        repo: BaseBatteryRepository,
    ) -> QpiAIOptResponse:
        battery_data = []
        for b_id in req.battery_ids:
            passport = await repo.get_passport_by_id(b_id)
            if passport:
                battery_data.append(
                    {
                        "battery_id": passport["battery_id"],
                        "state_of_health_pct": passport["health_state"]["state_of_health_pct"],
                        "cycle_count": passport["health_state"]["cycle_count"],
                        "total_co2_kg_per_kwh": passport["carbon_footprint"]["total_co2_kg_per_kwh"],
                    }
                )

        if not battery_data:
            return QpiAIOptResponse(
                status="ERROR",
                configured=bool(settings.QPIAI_OPT_API_KEY.strip()),
                problem_type="QUBO",
                num_variables=0,
                qubo_edges_count=0,
                qubo_sample_matrix={},
                message="No valid battery passports found for optimization.",
            )

        num_vars, qubo_upper, qubo_symmetric = cls.formulate_qubo_problem(
            battery_data=battery_data,
            destinations=req.target_destinations,
            carbon_weight=req.carbon_penalty_weight,
            distance_weight=req.logistics_distance_weight,
            degradation_weight=req.degradation_cost_weight,
        )
        sample_matrix = {f"({u},{v})": w for (u, v), w in list(qubo_upper.items())[:25]}
        api_key = settings.QPIAI_OPT_API_KEY.strip()
        base_url = resolve_opt_base_url(settings.QPIAI_OPT_URL)

        if not api_key:
            return QpiAIOptResponse(
                status="NOT_CONFIGURED",
                configured=False,
                problem_type="QUBO",
                num_variables=num_vars,
                qubo_edges_count=len(qubo_upper),
                qubo_sample_matrix=sample_matrix,
                message="QpiAI-Opt API credentials are not configured on the backend.",
                instructions="Set QPIAI_OPT_API_KEY on the backend server.",
            )

        headers = {"Content-Type": "application/json", "X-Secret-Token": api_key}
        start_ts = time.monotonic()

        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                me_res = await client.get(f"{base_url}/users/me", headers=headers)
                if me_res.status_code in (401, 403):
                    return QpiAIOptResponse(
                        status="AUTH_REQUIRED",
                        configured=True,
                        problem_type="QUBO",
                        num_variables=num_vars,
                        qubo_edges_count=len(qubo_upper),
                        qubo_sample_matrix=sample_matrix,
                        message=f"QpiAI-Opt rejected API token (HTTP {me_res.status_code}).",
                    )

                exp_res = await client.get(
                    f"{base_url}/experiments/by-name",
                    params={"name": "Default Experiment"},
                    headers=headers,
                )
                cr_res = await client.get(f"{base_url}/compute-resources/", headers=headers)
                experiment_id = exp_res.json().get("experiment_id") if exp_res.is_success else None
                qubo_res_id = None
                if cr_res.is_success and isinstance(cr_res.json(), list):
                    for item in cr_res.json():
                        if "QUBO" in str(item.get("type", "") or item.get("backend_name", "")).upper():
                            qubo_res_id = item.get("ID") or item.get("id")
                            break

                prob_res = await client.post(
                    f"{base_url}/problems/create",
                    headers=headers,
                    json={
                        "name": f"bp360_qubo_{int(time.time() * 1000)}",
                        "method": "QUBO",
                        "num_variables": num_vars,
                        "max_evaluations": 1000,
                        "qubo_dict": qubo_symmetric,
                    },
                )
                if not prob_res.is_success:
                    return QpiAIOptResponse(
                        status="ERROR",
                        configured=True,
                        problem_type="QUBO",
                        num_variables=num_vars,
                        qubo_edges_count=len(qubo_upper),
                        qubo_sample_matrix=sample_matrix,
                        message=f"QpiAI-Opt problem creation failed (HTTP {prob_res.status_code}): {prob_res.text[:240]}",
                    )

                problem_id = prob_res.json().get("id") or prob_res.json().get("ID")
                job_payload: Dict[str, Any] = {
                    "problem_id": problem_id,
                    "experiment_id": experiment_id,
                    "method": "QUBO",
                }
                if qubo_res_id:
                    job_payload["compute_resource_id"] = qubo_res_id

                job_res = await client.post(f"{base_url}/jobs/opt", headers=headers, json=job_payload)
                if not job_res.is_success:
                    if problem_id and 400 <= job_res.status_code < 500 and job_res.status_code != 429:
                        await client.delete(f"{base_url}/problems/{problem_id}", headers=headers)
                    err_text = job_res.text[:260]
                    status_code = "QUOTA_EXCEEDED" if "quota" in err_text.lower() or "does not have access" in err_text.lower() else "ERROR"
                    return QpiAIOptResponse(
                        status=status_code,
                        configured=True,
                        problem_type="QUBO",
                        num_variables=num_vars,
                        qubo_edges_count=len(qubo_upper),
                        qubo_sample_matrix=sample_matrix,
                        execution_time_seconds=round(time.monotonic() - start_ts, 4),
                        message=f"QpiAI-Opt authenticated and created QUBO problem ({problem_id}), but cloud solver execution was rejected (HTTP {job_res.status_code}): {err_text}",
                        instructions="Allocate organization quota for 'QUBO Solver' at https://opt.qpiai.tech.",
                    )

                job_json = job_res.json()
                job_id = (job_json.get("job") or {}).get("id") or job_json.get("job_id") or job_json.get("id")
                return QpiAIOptResponse(
                    status="SUBMITTED",
                    configured=True,
                    problem_type="QUBO",
                    num_variables=num_vars,
                    qubo_edges_count=len(qubo_upper),
                    qubo_sample_matrix=sample_matrix,
                    execution_time_seconds=round(time.monotonic() - start_ts, 4),
                    job_id=job_id,
                    message=f"QpiAI-Opt cloud job {job_id} submitted.",
                )
        except Exception as e:
            logger.error(f"QpiAI-Opt execution error: {str(e)}")
            return QpiAIOptResponse(
                status="ERROR",
                configured=True,
                problem_type="QUBO",
                num_variables=num_vars,
                qubo_edges_count=len(qubo_upper),
                qubo_sample_matrix=sample_matrix,
                message=f"QpiAI-Opt Cloud Solver network/service error: {str(e)}",
            )

