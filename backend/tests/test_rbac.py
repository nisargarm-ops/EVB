import pytest
from httpx import AsyncClient

@pytest.mark.asyncio
async def test_recycler_cannot_create_passport(client: AsyncClient, recycler_token: str):
    payload = {
        "serial_number": "FAIL-SN",
        "manufacturer_name": "Illegal Actor",
        "model_designation": "X",
        "chemistry": "NMC 811",
        "manufacturing_date": "2026-10-01T00:00:00Z",
        "current_custodian": "Illegal Actor",
        "technical_specs": {"rated_capacity_kwh": 50, "nominal_voltage_v": 350, "max_charge_power_kw": 100, "pack_weight_kg": 300},
        "carbon_footprint": {"total_co2_kg_per_kwh": 60, "manufacturing_co2_kg": 25, "raw_materials_co2_kg": 30, "transport_co2_kg": 5},
        "recycled_content": {"cobalt_percentage": 0, "lithium_percentage": 0, "nickel_percentage": 0, "lead_percentage": 0}
    }
    # Recycler role lacks permission to create initial passport
    res = await client.post(
        "/api/v1/passports",
        json=payload,
        headers={"Authorization": f"Bearer {recycler_token}"}
    )
    assert res.status_code == 403
    assert "Access forbidden" in res.json()["detail"]

@pytest.mark.asyncio
async def test_fleet_operator_can_update_telemetry(client: AsyncClient, fleet_token: str):
    res = await client.patch(
        "/api/v1/passports/BAT-NMC-8A2F91C0/telemetry",
        json={
            "state_of_health_pct": 87.5,
            "state_of_charge_pct": 65.0,
            "cycle_count": 435,
            "internal_resistance_mohm": 20.1,
            "telemetry_notes": "Quarterly fleet depot health diagnostic"
        },
        headers={"Authorization": f"Bearer {fleet_token}"}
    )
    assert res.status_code == 200
    data = res.json()
    assert data["health_state"]["state_of_health_pct"] == 87.5
    assert data["health_state"]["cycle_count"] == 435
