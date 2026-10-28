import hashlib
import json
from typing import Any, Dict, List, Optional, Tuple

GENESIS_PREV_HASH = "0" * 64

def canonical_json_dumps(data: Any) -> str:
    """Produce deterministic, canonical JSON string with sorted keys."""
    return json.dumps(data, sort_keys=True, separators=(",", ":"), default=str)

def generate_immutable_battery_id(
    manufacturer: str,
    serial_number: str,
    chemistry: str,
    manufacture_date: str
) -> Tuple[str, str]:
    """
    Generate a deterministic, immutable battery DID and human-readable ID.
    Formula: SHA-256(manufacturer:serial:chemistry:date)
    """
    raw_material = f"{manufacturer.strip().upper()}:{serial_number.strip()}:{chemistry.strip().upper()}:{manufacture_date.strip()}"
    digest = hashlib.sha256(raw_material.encode("utf-8")).hexdigest()
    did = f"did:battery:sha256:{digest}"
    
    clean_chem = chemistry.replace(" ", "").replace("-", "").upper()[:4]
    short_id = f"BAT-{clean_chem}-{digest[:8].upper()}"
    return did, short_id

def calculate_event_hash(
    prev_hash: str,
    battery_id: str,
    event_type: Any,
    timestamp: str,
    actor_id: str,
    payload: Dict[str, Any]
) -> str:
    """
    Calculate cryptographic SHA-256 hash for a custody event block.
    Formula: SHA-256(prev_hash | battery_id | event_type_str | timestamp | actor_id | canonical_json(payload))
    """
    event_type_str = event_type.value if hasattr(event_type, "value") else str(event_type)
    payload_str = canonical_json_dumps(payload)
    block_content = (
        f"{prev_hash}|"
        f"{battery_id}|"
        f"{event_type_str}|"
        f"{timestamp}|"
        f"{actor_id}|"
        f"{payload_str}"
    )
    return hashlib.sha256(block_content.encode("utf-8")).hexdigest()

def verify_chain_integrity(events: List[Dict[str, Any]]) -> Tuple[bool, Optional[str], Optional[int]]:
    """
    Verifies the tamper-evident cryptographic hash chain of custody events.
    Returns:
        (is_valid, error_message, tampered_index)
    """
    if not events:
        return True, None, None

    for i, event in enumerate(events):
        prev_hash = event.get("prev_hash")
        stored_hash = event.get("hash")
        battery_id = event.get("battery_id")
        event_type = event.get("event_type")
        event_type_str = event_type.value if hasattr(event_type, "value") else str(event_type)
        timestamp = str(event.get("timestamp"))
        actor_id = event.get("actor_id")
        payload = event.get("payload", {})

        # Genesis block check
        if i == 0:
            if prev_hash != GENESIS_PREV_HASH:
                return False, f"Genesis block at index 0 has invalid prev_hash: {prev_hash} (expected {GENESIS_PREV_HASH})", 0
        else:
            expected_prev = events[i - 1].get("hash")
            if prev_hash != expected_prev:
                return False, f"Block {i} broken link: prev_hash ({prev_hash}) does not match Block {i-1} hash ({expected_prev})", i

        # Content hash recalculation check
        recalculated_hash = calculate_event_hash(
            prev_hash=prev_hash,
            battery_id=battery_id,
            event_type=event_type_str,
            timestamp=timestamp,
            actor_id=actor_id,
            payload=payload
        )

        if recalculated_hash != stored_hash:
            return (
                False,
                f"Tampering detected at block {i}! Recalculated hash {recalculated_hash} != stored hash {stored_hash}",
                i
            )

    return True, None, None
