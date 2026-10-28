import pytest

def test_public_verification_endpoint(client):
    res = client.post("/api/batteries/BAT-NMC-8A2F91C0/verify")
    assert res.status_code == 200
    data = res.json()
    assert data["is_authentic"] is True
    assert data["battery_id"] == "BAT-NMC-8A2F91C0"
    assert data["is_audit_chain_valid"] is True
    assert data["eu_compliance_class"] == "Class A"
    assert data["total_custody_events"] >= 3

def test_v1_verify_public_endpoint(client):
    res = client.get("/api/v1/verify/BAT-NMC-8A2F91C0")
    assert res.status_code == 200
    data = res.json()
    assert data["is_authentic"] is True
    assert data["is_audit_chain_valid"] is True

def test_v1_verify_audit_trail_endpoint(client):
    res = client.get("/api/v1/verify/BAT-NMC-8A2F91C0/audit-trail")
    assert res.status_code == 200
    data = res.json()
    assert data["is_valid"] is True
    assert data["total_events"] >= 3
    assert data["genesis_hash"] is not None
    assert data["latest_block_hash"] is not None
    assert data["error_message"] is None

def test_verify_non_existent_battery(client):
    res = client.post("/api/batteries/DOES_NOT_EXIST/verify")
    assert res.status_code == 404
