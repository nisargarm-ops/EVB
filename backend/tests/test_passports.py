import pytest
from httpx import AsyncClient

@pytest.mark.asyncio
async def test_health_check(client: AsyncClient):
    res = await client.get("/api/v1/health")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "online"
    assert data["service"] == "BatteryPass 360"

@pytest.mark.asyncio
async def test_list_passports(client: AsyncClient):
    res = await client.get("/api/v1/passports")
    assert res.status_code == 200
    passports = res.json()
    assert len(passports) >= 3
    # Check that pre-seeded batteries exist
    battery_ids = [p["battery_id"] for p in passports]
    assert "BAT-NMC-8A2F91C0" in battery_ids

@pytest.mark.asyncio
async def test_get_passport_detail(client: AsyncClient):
    res = await client.get("/api/v1/passports/BAT-NMC-8A2F91C0")
    assert res.status_code == 200
    data = res.json()
    assert data["battery_id"] == "BAT-NMC-8A2F91C0"
    assert data["chemistry"] == "NMC 811"
    assert data["carbon_footprint"]["eu_compliance_class"] == "Class A"
    assert data["technical_specs"]["rated_capacity_kwh"] == 92.4

@pytest.mark.asyncio
async def test_create_passport_as_manufacturer(client: AsyncClient, manufacturer_token: str):
    payload = {
        "serial_number": "TEST-SN-99901",
        "manufacturer_name": "Valence Battery GmbH",
        "model_designation": "VB-Aero-75",
        "chemistry": "LFP",
        "manufacturing_date": "2026-10-01T08:00:00Z",
        "manufacturing_country": "DE",
        "manufacturing_facility": "Dresden Gigafactory",
        "current_custodian": "Valence Battery GmbH",
        "technical_specs": {
            "rated_capacity_kwh": 75.0,
            "nominal_voltage_v": 350.0,
            "max_charge_power_kw": 180.0,
            "cell_count": 160,
            "pack_weight_kg": 410.0
        },
        "carbon_footprint": {
            "total_co2_kg_per_kwh": 55.0,
            "manufacturing_co2_kg": 24.0,
            "raw_materials_co2_kg": 26.0,
            "transport_co2_kg": 5.0,
            "eu_compliance_class": "Class A"
        },
        "recycled_content": {
            "cobalt_percentage": 0.0,
            "lithium_percentage": 5.0,
            "nickel_percentage": 0.0,
            "lead_percentage": 0.0
        }
    }
    res = await client.post(
        "/api/v1/passports",
        json=payload,
        headers={"Authorization": f"Bearer {manufacturer_token}"}
    )
    assert res.status_code == 201
    data = res.json()
    assert data["battery_did"].startswith("did:battery:sha256:")
    assert data["battery_id"].startswith("BAT-LFP-")
    assert data["status"] == "MANUFACTURED"
