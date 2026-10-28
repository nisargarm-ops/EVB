import pytest
from app.core.hasher import (
    GENESIS_PREV_HASH,
    calculate_event_hash,
    verify_chain_integrity
)

def test_genesis_block_integrity(client):
    res = client.get("/api/batteries/BAT-NMC-8A2F91C0/events")
    assert res.status_code == 200
    events = res.json()
    assert len(events) >= 1
    # Block 0 is genesis
    genesis = events[0]
    assert genesis["event_type"] == "MANUFACTURED"
    assert genesis["prev_hash"] == GENESIS_PREV_HASH
    assert len(genesis["hash"]) == 64

def test_chain_linkage_and_recalculation(client):
    res = client.get("/api/batteries/BAT-NMC-8A2F91C0/events")
    events = res.json()
    # Verify each link
    for i in range(1, len(events)):
        assert events[i]["prev_hash"] == events[i - 1]["hash"]

    # Verify overall integrity algorithm
    is_valid, err, tampered_idx = verify_chain_integrity(events)
    assert is_valid is True
    assert err is None
    assert tampered_idx is None

def test_tamper_detection_on_altered_payload():
    # Prepare a valid sample 2-block chain
    ev0_hash = calculate_event_hash(
        prev_hash=GENESIS_PREV_HASH,
        battery_id="BAT-TEST-001",
        event_type="MANUFACTURED",
        timestamp="2024-01-01T00:00:00Z",
        actor_id="ACTOR-1",
        payload={"batch": "B1", "soh": 100.0}
    )
    ev0 = {
        "event_id": "EVT-0",
        "battery_id": "BAT-TEST-001",
        "event_type": "MANUFACTURED",
        "timestamp": "2024-01-01T00:00:00Z",
        "actor_id": "ACTOR-1",
        "payload": {"batch": "B1", "soh": 100.0},
        "prev_hash": GENESIS_PREV_HASH,
        "hash": ev0_hash
    }

    ev1_hash = calculate_event_hash(
        prev_hash=ev0_hash,
        battery_id="BAT-TEST-001",
        event_type="TELEMETRY_UPDATED",
        timestamp="2024-06-01T00:00:00Z",
        actor_id="ACTOR-2",
        payload={"soh": 92.0}
    )
    ev1 = {
        "event_id": "EVT-1",
        "battery_id": "BAT-TEST-001",
        "event_type": "TELEMETRY_UPDATED",
        "timestamp": "2024-06-01T00:00:00Z",
        "actor_id": "ACTOR-2",
        "payload": {"soh": 92.0},
        "prev_hash": ev0_hash,
        "hash": ev1_hash
    }

    # Clean chain is valid
    is_valid, _, _ = verify_chain_integrity([ev0, ev1])
    assert is_valid is True

    # Malicious actor changes SoH from 92.0 to 99.0 in block 1 without updating hash
    ev1_tampered = dict(ev1)
    ev1_tampered["payload"] = {"soh": 99.0}

    is_valid, err_msg, tampered_idx = verify_chain_integrity([ev0, ev1_tampered])
    assert is_valid is False
    assert tampered_idx == 1
    assert "Cryptographic tampering detected at block 1" in err_msg

def test_tamper_detection_on_broken_prev_hash():
    ev0_hash = calculate_event_hash(
        prev_hash=GENESIS_PREV_HASH,
        battery_id="BAT-TEST-002",
        event_type="MANUFACTURED",
        timestamp="2024-01-01T00:00:00Z",
        actor_id="ACTOR-1",
        payload={"batch": "B1"}
    )
    ev0 = {
        "event_id": "EVT-0",
        "battery_id": "BAT-TEST-002",
        "event_type": "MANUFACTURED",
        "timestamp": "2024-01-01T00:00:00Z",
        "actor_id": "ACTOR-1",
        "payload": {"batch": "B1"},
        "prev_hash": GENESIS_PREV_HASH,
        "hash": ev0_hash
    }

    ev1 = {
        "event_id": "EVT-1",
        "battery_id": "BAT-TEST-002",
        "event_type": "OEM_ASSEMBLED",
        "timestamp": "2024-02-01T00:00:00Z",
        "actor_id": "ACTOR-2",
        "payload": {"vin": "VIN123"},
        "prev_hash": "corrupted_fake_previous_hash_00000000000000000000000000000000000000",
        "hash": "some_hash"
    }

    is_valid, err_msg, tampered_idx = verify_chain_integrity([ev0, ev1])
    assert is_valid is False
    assert tampered_idx == 1
    assert "broken link" in err_msg
