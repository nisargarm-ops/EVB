import pytest

def test_health_check(client):
    res = client.get("/api/health")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "HEALTHY"
    assert "EU 2023/1542" in data["eu_regulation"]

def test_list_batteries_public(client):
    res = client.get("/api/batteries")
    assert res.status_code == 200
    data = res.json()
    assert isinstance(data, list)
    assert len(data) >= 3
    # Check pre-seeded battery IDs
    battery_ids = [b["battery_id"] for b in data]
    assert "BAT-NMC-8A2F91C0" in battery_ids
    assert "BAT-LFP-3C7D410E" in battery_ids

def test_list_batteries_filter_status(client):
    res = client.get("/api/batteries?status=SECOND_LIFE")
    assert res.status_code == 200
    data = res.json()
    for b in data:
        assert b["status"] == "SECOND_LIFE"

def test_get_battery_details_success(client):
    res = client.get("/api/batteries/BAT-NMC-8A2F91C0")
    assert res.status_code == 200
    data = res.json()
    assert data["battery_id"] == "BAT-NMC-8A2F91C0"
    assert data["chemistry"] == "NMC 811"
    assert "technical_specs" in data
    assert "carbon_footprint" in data
    assert data["carbon_footprint"]["eu_compliance_class"] == "Class A"

def test_get_battery_not_found(client):
    res = client.get("/api/batteries/NON_EXISTENT_BATTERY_ID")
    assert res.status_code == 404
    assert "not found" in res.json()["detail"].lower()

def test_create_battery_by_manufacturer(client, mfg_headers):
    payload = {
        "serial_number": "TEST-SN-2026-NMC-001",
        "manufacturer_name": "QuantumVolt Gigafactory",
        "model_designation": "QV-Pack-Test",
        "chemistry": "NMC 811",
        "manufacturing_country": "DE",
        "manufacturing_facility": "Berlin Gigafactory",
        "technical_specs": {
            "rated_capacity_kwh": 95.0,
            "nominal_voltage_v": 400.0,
            "max_charge_power_kw": 250.0,
            "cell_count": 192,
            "pack_weight_kg": 480.0
        },
        "carbon_footprint": {
            "total_co2_kg_per_kwh": 59.5,
            "manufacturing_co2_kg": 25.0,
            "raw_materials_co2_kg": 29.5,
            "transport_co2_kg": 5.0,
            "eu_compliance_class": "Class A"
        },
        "recycled_content": {
            "cobalt_percentage": 16.0,
            "lithium_percentage": 6.0,
            "nickel_percentage": 12.0,
            "lead_percentage": 0.0
        }
    }
    res = client.post("/api/batteries", json=payload, headers=mfg_headers)
    assert res.status_code == 201
    created = res.json()
    assert created["serial_number"] == "TEST-SN-2026-NMC-001"
    assert created["battery_id"].startswith("BAT-NMC-")
    assert created["battery_did"].startswith("did:battery:sha256:")
    assert created["status"] == "MANUFACTURED"

    # Verify duplicate creation with same serial is rejected
    dup_res = client.post("/api/batteries", json=payload, headers=mfg_headers)
    assert dup_res.status_code == 409
    assert "already registered" in dup_res.json()["detail"]

def test_create_battery_validation_error(client, mfg_headers):
    invalid_payload = {
        "serial_number": "",  # invalid min_length
        "manufacturer_name": "Q",
        "technical_specs": {
            "rated_capacity_kwh": -5.0  # invalid negative capacity
        }
    }
    res = client.post("/api/batteries", json=invalid_payload, headers=mfg_headers)
    assert res.status_code == 422
    assert "error" in res.json()
