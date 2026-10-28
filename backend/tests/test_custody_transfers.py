import pytest

def test_initiate_custody_transfer(client, fleet_headers):
    payload = {
        "battery_id": "BAT-NMC-8A2F91C0",
        "receiver_org_id": "55555555-5555-5555-5555-555555555555",
        "receiver_organization_name": "Nordic Remanufacturing Hub",
        "transfer_type": "SECOND_LIFE_EVALUATION",
        "notes": "Transfer for stationary repurposing assessment"
    }
    res = client.post("/api/custody/transfers", json=payload, headers=fleet_headers)
    assert res.status_code == 201
    transfer = res.json()
    assert transfer["battery_id"] == "BAT-NMC-8A2F91C0"
    assert transfer["state"] == "PENDING"
    assert transfer["receiver_org_name"] == "Nordic Remanufacturing Hub"
    return transfer["id"]

def test_accept_custody_transfer_workflow(client, fleet_headers, reman_headers, recycler_headers):
    # 1. Initiate
    init_res = client.post("/api/custody/transfers", json={
        "battery_id": "BAT-NMC-8A2F91C0",
        "receiver_org_id": "org-remanufacturer",
        "receiver_organization_name": "Nordic Remanufacturing Hub",
        "transfer_type": "REMANUFACTURING_HANDOFF"
    }, headers=fleet_headers)
    transfer_id = init_res.json()["id"]

    # 2. Unauthorized org attempt to accept -> Denied
    # (Recycler is not the intended receiver 'remanufacturer')
    # Use headers that do not match receiver
    unauthorized_headers = {"Authorization": "Bearer jwt-random_party-99"}
    res_deny = client.post(f"/api/custody/transfers/{transfer_id}/accept", json={"notes": "Unauthorized intercept"}, headers=unauthorized_headers)
    assert res_deny.status_code == 403
    assert "designated receiver" in res_deny.json()["detail"].lower()

    # 3. Designated receiver accepts -> Success
    res_accept = client.post(f"/api/custody/transfers/{transfer_id}/accept", json={"notes": "Received pack in good condition"}, headers=reman_headers)
    assert res_accept.status_code == 200
    accepted = res_accept.json()
    assert accepted["state"] == "ACCEPTED"

    # 4. Verify battery custodian was updated
    bat_res = client.get("/api/batteries/BAT-NMC-8A2F91C0")
    assert "remanufacturer" in bat_res.json()["current_custodian"].lower() or "nordic" in bat_res.json()["current_custodian"].lower()

    # 5. Cannot re-accept already accepted transfer -> 400
    res_reaccept = client.post(f"/api/custody/transfers/{transfer_id}/accept", json={}, headers=reman_headers)
    assert res_reaccept.status_code == 400
    assert "already in 'ACCEPTED' state" in res_reaccept.json()["detail"]

def test_reject_custody_transfer_workflow(client, fleet_headers, reman_headers):
    # Initiate transfer
    init_res = client.post("/api/custody/transfers", json={
        "battery_id": "BAT-LFP-3C7D410E",
        "receiver_org_id": "org-remanufacturer",
        "receiver_organization_name": "Nordic Remanufacturing Hub",
        "transfer_type": "EVALUATION"
    }, headers=fleet_headers)
    transfer_id = init_res.json()["id"]

    # Reject
    res_reject = client.post(f"/api/custody/transfers/{transfer_id}/reject", json={"rejection_reason": "Cell casing dented in transit"}, headers=reman_headers)
    assert res_reject.status_code == 200
    rejected = res_reject.json()
    assert rejected["state"] == "REJECTED"
    assert rejected["rejection_reason"] == "Cell casing dented in transit"
