from datetime import timedelta
import pytest
from app.core.security import create_access_token

# ------------------------------------------------------------------------------
# Test 1: Unauthenticated request to protected endpoint returns 401 Unauthorized
# ------------------------------------------------------------------------------
def test_1_unauthenticated_request_denied(client):
    res = client.post("/api/batteries", json={"serial_number": "ANON-001"})
    assert res.status_code == 401
    assert "not provided or are invalid" in res.json()["detail"]

# ------------------------------------------------------------------------------
# Test 2: Expired or tampered JWT returns 401 Unauthorized
# ------------------------------------------------------------------------------
def test_2_expired_and_tampered_jwt_denied(client):
    # Expired token (-1 hour)
    expired_token = create_access_token(
        {"sub": "usr-exp", "role": "manufacturer"},
        expires_delta=timedelta(hours=-1)
    )
    res_exp = client.post(
        "/api/batteries",
        json={"serial_number": "EXP-001"},
        headers={"Authorization": f"Bearer {expired_token}"}
    )
    assert res_exp.status_code == 401
    assert "expired" in res_exp.json()["detail"].lower()

    # Tampered token (modified signature payload)
    valid_token = create_access_token({"sub": "usr-valid", "role": "manufacturer"})
    tampered_token = valid_token[:-6] + "tamper"
    res_tampered = client.post(
        "/api/batteries",
        json={"serial_number": "TAMPER-001"},
        headers={"Authorization": f"Bearer {tampered_token}"}
    )
    assert res_tampered.status_code == 401
    assert "could not be verified" in res_tampered.json()["detail"].lower()

# ------------------------------------------------------------------------------
# Test 3: User with Role A attempting action reserved for Role B returns 403
# ------------------------------------------------------------------------------
def test_3_role_a_cannot_perform_role_b_action(client, recycler_headers, public_headers):
    # Recycler trying to mint new battery (reserved for Manufacturer / Admin)
    payload = {
        "serial_number": "UNAUTH-ROLE-001",
        "manufacturer_name": "EcoRecycle Metals Recovery",
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
    res_rec = client.post("/api/batteries", json=payload, headers=recycler_headers)
    assert res_rec.status_code == 403
    assert "Access denied" in res_rec.json()["detail"]

    # Public user trying to mint new battery
    res_pub = client.post("/api/batteries", json=payload, headers=public_headers)
    assert res_pub.status_code == 403

# ------------------------------------------------------------------------------
# Test 4: Accepting custody transfer meant for different organization returns 403
# ------------------------------------------------------------------------------
def test_4_cross_tenant_transfer_acceptance_denied(client, mfg_headers, recycler_headers):
    # Setup pending transfer to Nordic Remanufacturing Hub
    res_init = client.post(
        "/api/custody/transfers",
        json={
            "battery_id": "BAT-NMC-8A2F91C0",
            "receiver_org_id": "55555555-5555-5555-5555-555555555555",
            "receiver_organization_name": "Nordic Remanufacturing Hub",
            "transfer_type": "SECOND_LIFE_EVALUATION",
            "notes": "Stewardship transition"
        },
        headers=mfg_headers
    )
    assert res_init.status_code == 201
    transfer_id = res_init.json()["id"]

    # Recycler (EcoRecycle Metals Recovery) tries to accept transfer meant for Nordic Reman
    res_accept = client.post(
        f"/api/custody/transfers/{transfer_id}/accept",
        json={"notes": "Illegal intercepted acceptance"},
        headers=recycler_headers
    )
    assert res_accept.status_code == 403
    assert "Only the designated receiver organization" in res_accept.json()["detail"]

# ------------------------------------------------------------------------------
# Test 5: Minting battery under different organization returns 403 Forbidden
# ------------------------------------------------------------------------------
def test_5_organization_spoofing_denied(client, mfg_headers):
    # mfg_headers belongs to "QuantumVolt Gigafactory"
    # Attempting to mint under "Apex Motors AG"
    payload = {
        "serial_number": "SPOOF-001",
        "manufacturer_name": "Apex Motors AG",  # Spoofed organization
        "model_designation": "SpoofedPack",
        "chemistry": "LFP",
        "technical_specs": {
            "rated_capacity_kwh": 70.0, "nominal_voltage_v": 380.0, "max_charge_power_kw": 150.0,
            "cell_count": 100, "pack_weight_kg": 380.0
        },
        "carbon_footprint": {
            "total_co2_kg_per_kwh": 50.0, "manufacturing_co2_kg": 20.0, "raw_materials_co2_kg": 25.0,
            "transport_co2_kg": 5.0, "eu_compliance_class": "Class A"
        },
        "recycled_content": {
            "cobalt_percentage": 0.0, "lithium_percentage": 5.0, "nickel_percentage": 0.0, "lead_percentage": 0.0
        }
    }
    res = client.post("/api/batteries", json=payload, headers=mfg_headers)
    assert res.status_code == 403
    assert "Organization isolation violation" in res.json()["detail"]

# ------------------------------------------------------------------------------
# Test 6: Public verification succeeds without token & returns whitelisted fields
# ------------------------------------------------------------------------------
def test_6_public_verification_succeeds_without_token(client):
    res = client.get("/api/verify/BAT-NMC-8A2F91C0")
    assert res.status_code == 200
    data = res.json()
    assert data["is_authentic"] is True
    assert data["battery_id"] == "BAT-NMC-8A2F91C0"
    assert "eu_compliance_class" in data
    assert "state_of_health_pct" in data

# ------------------------------------------------------------------------------
# Test 7: Public verification does not leak confidential internal data
# ------------------------------------------------------------------------------
def test_7_public_verification_redacts_trade_secrets(client):
    res = client.get("/api/verify/BAT-NMC-8A2F91C0")
    assert res.status_code == 200
    data = res.json()
    # Confidential trade secrets must NOT appear in public verification response
    assert "current_vehicle_vin" not in data
    assert "internal_notes" not in data
    assert "supplier_margins" not in data
    assert "raw_telemetry" not in data
    assert "actor_ip" not in data

# ------------------------------------------------------------------------------
# Test 8: Arbitrary role switching endpoint is blocked without authorization
# ------------------------------------------------------------------------------
def test_8_unauthorized_role_switching_blocked(client, recycler_headers):
    # Unauthenticated client attempting role switch to administrator
    res_anon = client.post("/api/v1/auth/switch-role", json={"role": "administrator"})
    assert res_anon.status_code == 403

    # Authenticated recycler attempting privilege escalation to administrator
    res_rec = client.post("/api/v1/auth/switch-role", json={"role": "administrator"}, headers=recycler_headers)
    assert res_rec.status_code == 403

# ------------------------------------------------------------------------------
# Test 9: Dev token bypass (jwt-*) is strictly rejected with 401 Unauthorized
# ------------------------------------------------------------------------------
def test_9_dev_token_bypass_rejected(client):
    fake_header = {"Authorization": "Bearer jwt-administrator-fake-token-bypass"}
    res = client.get("/api/auth/me", headers=fake_header)
    assert res.status_code == 401
    assert "could not be verified" in res.json()["detail"].lower()

# ------------------------------------------------------------------------------
# Test 10: Valid token for authorized user succeeds with 200/201
# ------------------------------------------------------------------------------
def test_10_authorized_operation_succeeds(client, mfg_headers, fleet_headers):
    # 1. Manufacturer creates battery for their own organization
    payload = {
        "serial_number": "VALID-MFG-001",
        "manufacturer_name": "QuantumVolt Gigafactory",
        "model_designation": "QV-SafePack-100",
        "chemistry": "NMC 811",
        "technical_specs": {
            "rated_capacity_kwh": 100.0, "nominal_voltage_v": 400.0, "max_charge_power_kw": 250.0,
            "cell_count": 200, "pack_weight_kg": 500.0
        },
        "carbon_footprint": {
            "total_co2_kg_per_kwh": 55.0, "manufacturing_co2_kg": 25.0, "raw_materials_co2_kg": 25.0,
            "transport_co2_kg": 5.0, "eu_compliance_class": "Class A"
        },
        "recycled_content": {
            "cobalt_percentage": 15.0, "lithium_percentage": 5.0, "nickel_percentage": 10.0, "lead_percentage": 0.0
        }
    }
    res = client.post("/api/batteries", json=payload, headers=mfg_headers)
    assert res.status_code == 201
    battery_id = res.json()["battery_id"]

    # 2. Custodian updates telemetry
    telemetry = {
        "state_of_health_pct": 88.0,
        "state_of_charge_pct": 75.0,
        "cycle_count": 425,
        "internal_resistance_mohm": 20.0,
        "telemetry_notes": "Authorized fleet diagnostic"
    }
    # BAT-NMC-8A2F91C0 current custodian is Apex EV Mobility Fleet
    res_telem = client.patch(
        "/api/batteries/BAT-NMC-8A2F91C0/telemetry",
        json=telemetry,
        headers=fleet_headers
    )
    assert res_telem.status_code == 200
    assert res_telem.json()["health_state"]["state_of_health_pct"] == 88.0
