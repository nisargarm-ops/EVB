import pytest
from httpx import AsyncClient

@pytest.mark.asyncio
async def test_qpiai_opt_qubo_formulation_without_credentials(client: AsyncClient, manufacturer_token: str):
    res = await client.post(
        "/api/v1/qpiai/opt/allocate",
        json={
            "battery_ids": ["BAT-NMC-8A2F91C0", "BAT-LFP-3C7D410E", "BAT-NCA-F104A7B2"],
            "target_destinations": ["stationary_bess", "cell_reconditioning", "deep_recycling"],
            "carbon_penalty_weight": 0.4,
            "logistics_distance_weight": 0.3,
            "degradation_cost_weight": 0.3
        },
        headers={"Authorization": f"Bearer {manufacturer_token}"}
    )
    assert res.status_code == 200
    data = res.json()
    # Confirms authentic behavior: strictly does not fabricate solver outputs
    assert data["status"] == "NOT_CONFIGURED"
    assert data["configured"] is False
    assert data["problem_type"] == "QUBO"
    assert data["num_variables"] == 3 * 3  # 3 batteries * 3 destinations = 9 binary variables
    assert data["qubo_edges_count"] > 0
    assert len(data["qubo_sample_matrix"]) > 0
    assert "QpiAI-Opt API credentials are not configured" in data["message"]

@pytest.mark.asyncio
async def test_qpiai_quantum_circuit_simulation_truthful_auth(client: AsyncClient, manufacturer_token: str):
    res = await client.post(
        "/api/v1/qpiai/quantum/simulate-cathode",
        json={
            "battery_id": "BAT-NMC-8A2F91C0",
            "cathode_material": "NMC 811",
            "state_of_health_pct": 88.4,
            "cycle_count": 420,
            "backend": "QpiAI-QSV-Local",
            "shots": 1024
        },
        headers={"Authorization": f"Bearer {manufacturer_token}"}
    )
    assert res.status_code == 200
    data = res.json()
    # Verifies real quantum circuit construction and honest auth reporting
    assert data["status"] in ["AUTH_REQUIRED", "SUCCESS"]
    assert data["num_qubits"] == 4
    assert data["circuit_depth"] > 0
    assert "H" in data["quantum_gate_counts"]
    assert "CX" in data["quantum_gate_counts"]
    assert data["estimated_ground_state_energy_hartree"] != 0.0
