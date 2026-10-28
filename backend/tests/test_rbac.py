import pytest

def test_unauthenticated_request_denied(client):
    res = client.post("/api/batteries", json={"serial_number": "ANON-001"})
    assert res.status_code == 401
    assert "not provided or are invalid" in res.json()["detail"]

def test_non_manufacturer_cannot_create_battery(client, recycler_headers, public_headers, service_headers):
    payload = {
        "serial_number": "DENIED-001",
        "manufacturer_name": "EcoRecycle Metals",
        "model_designation": "IllegalPack",
        "chemistry": "NMC 811",
        "technical_specs": {
            "rated_capacity_kwh": 60.0, "nominal_voltage_v": 350.0, "max_charge_power_kw": 100.0,
            "cell_count": 96, "pack_weight_kg": 300.0
        },
        "carbon_footprint": {
            "total_co2_kg_per_kwh": 60.0, "manufacturing_co2_kg": 25.0, "raw_materials_co2_kg": 25.0,
            "transport_co2_kg": 10.0, "eu_compliance_class": "Class B"
        },
        "recycled_content": {
            "cobalt_percentage": 10.0, "lithium_percentage": 4.0, "nickel_percentage": 5.0, "lead_percentage": 0.0
        }
    }
    # Recycler attempt -> 403
    res_rec = client.post("/api/batteries", json=payload, headers=recycler_headers)
    assert res_rec.status_code == 403
    assert "Access denied" in res_rec.json()["detail"]

    # Public attempt -> 403
    res_pub = client.post("/api/batteries", json=payload, headers=public_headers)
    assert res_pub.status_code == 403

    # Service Center attempt -> 403
    res_sc = client.post("/api/batteries", json=payload, headers=service_headers)
    assert res_sc.status_code == 403

def test_telemetry_update_allowed_roles(client, fleet_headers, service_headers, public_headers):
    telemetry = {
        "state_of_health_pct": 87.5,
        "state_of_charge_pct": 68.0,
        "cycle_count": 435,
        "internal_resistance_mohm": 20.2,
        "telemetry_notes": "Fleet quarterly diagnostic"
    }
    # Fleet Operator -> Allowed
    res_fleet = client.patch("/api/batteries/BAT-NMC-8A2F91C0/telemetry", json=telemetry, headers=fleet_headers)
    assert res_fleet.status_code == 200
    assert res_fleet.json()["health_state"]["state_of_health_pct"] == 87.5

    # Service Center -> Allowed
    res_sc = client.patch("/api/batteries/BAT-NMC-8A2F91C0/telemetry", json=telemetry, headers=service_headers)
    assert res_sc.status_code == 200

    # Public -> Denied 403
    res_pub = client.patch("/api/batteries/BAT-NMC-8A2F91C0/telemetry", json=telemetry, headers=public_headers)
    assert res_pub.status_code == 403

def test_admin_has_superuser_privileges(client, admin_headers):
    telemetry = {
        "state_of_health_pct": 89.0,
        "state_of_charge_pct": 80.0,
        "cycle_count": 400,
        "internal_resistance_mohm": 19.5,
        "telemetry_notes": "Administrative calibration"
    }
    res = client.patch("/api/batteries/BAT-NMC-8A2F91C0/telemetry", json=telemetry, headers=admin_headers)
    assert res.status_code == 200
