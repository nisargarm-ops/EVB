import pytest
from httpx import AsyncClient
from app.core.hasher import calculate_event_hash, verify_chain_integrity, GENESIS_PREV_HASH

def test_cryptographic_hash_chain_tamper_detection():
    # 1. Build a valid 3-block chain
    b0_hash = calculate_event_hash(GENESIS_PREV_HASH, "BAT-TEST", "MANUFACTURED", "2026-01-01T00:00:00Z", "ACTOR-1", {"grade": "A"})
    block0 = {"prev_hash": GENESIS_PREV_HASH, "hash": b0_hash, "battery_id": "BAT-TEST", "event_type": "MANUFACTURED", "timestamp": "2026-01-01T00:00:00Z", "actor_id": "ACTOR-1", "payload": {"grade": "A"}}

    b1_hash = calculate_event_hash(b0_hash, "BAT-TEST", "OEM_ASSEMBLED", "2026-01-05T00:00:00Z", "ACTOR-2", {"vin": "WAU123"})
    block1 = {"prev_hash": b0_hash, "hash": b1_hash, "battery_id": "BAT-TEST", "event_type": "OEM_ASSEMBLED", "timestamp": "2026-01-05T00:00:00Z", "actor_id": "ACTOR-2", "payload": {"vin": "WAU123"}}

    b2_hash = calculate_event_hash(b1_hash, "BAT-TEST", "TELEMETRY_UPDATED", "2026-01-10T00:00:00Z", "ACTOR-3", {"soh": 98.0})
    block2 = {"prev_hash": b1_hash, "hash": b2_hash, "battery_id": "BAT-TEST", "event_type": "TELEMETRY_UPDATED", "timestamp": "2026-01-10T00:00:00Z", "actor_id": "ACTOR-3", "payload": {"soh": 98.0}}

    valid_chain = [block0, block1, block2]
    is_valid, err, tampered_idx = verify_chain_integrity(valid_chain)
    assert is_valid is True
    assert err is None

    # 2. Tamper with block 1 payload
    tampered_chain = [
        block0,
        {**block1, "payload": {"vin": "TAMPERED_VIN_MALICIOUS"}},
        block2
    ]
    is_valid_t, err_t, tampered_idx_t = verify_chain_integrity(tampered_chain)
    assert is_valid_t is False
    assert tampered_idx_t == 1
    assert "Tampering detected at block 1" in err_t

@pytest.mark.asyncio
async def test_audit_trail_endpoint_seeded_battery(client: AsyncClient):
    res = await client.get("/api/v1/verify/BAT-NMC-8A2F91C0/audit-trail")
    assert res.status_code == 200
    data = res.json()
    assert data["is_valid"] is True
    assert data["total_events"] == 3
    assert data["genesis_hash"] is not None
    assert data["latest_block_hash"] is not None
