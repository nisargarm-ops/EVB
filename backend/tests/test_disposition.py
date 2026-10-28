import pytest

def test_get_disposition_decision_pre_seeded(client):
    # Battery 2 is pre-seeded with SECOND_LIFE / STATIONARY_BESS
    res = client.get("/api/decisions/BAT-LFP-3C7D410E")
    assert res.status_code == 200
    data = res.json()
    assert data["battery_id"] == "BAT-LFP-3C7D410E"
    assert data["recommendation"] == "STATIONARY_BESS"
    assert data["approval_status"] == "APPROVED"
    assert "constraints" in data
    assert "explanation" in data

def test_compute_disposition_decision_for_end_of_life(client):
    # Battery 3 is End of Life (SoH 64.2%)
    res = client.get("/api/decisions/BAT-NCA-F104A7B2")
    assert res.status_code == 200
    data = res.json()
    assert data["battery_id"] == "BAT-NCA-F104A7B2"
    assert data["recommendation"] in ("DEEP_RECYCLING", "CELL_RECONDITIONING")
    assert "constraints" in data
    assert len(data["explanation"]) > 10

def test_disposition_non_existent_battery(client):
    res = client.get("/api/decisions/INVALID_BATTERY")
    assert res.status_code == 404

def test_integrations_status_endpoint(client):
    res = client.get("/api/integrations/status")
    assert res.status_code == 200
    data = res.json()
    assert "database" in data
    assert "qpiai_opt" in data
    assert "qpiai_quantum" in data
    assert data["database"]["service"].startswith("Supabase")
