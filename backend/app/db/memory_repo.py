import asyncio
import copy
from datetime import datetime, timezone
from typing import Dict, List, Optional, Any
import uuid

from .repository import BaseBatteryRepository
from ..core.hasher import (
    GENESIS_PREV_HASH,
    calculate_event_hash,
    generate_immutable_battery_id
)

class InMemoryBatteryRepository(BaseBatteryRepository):
    """
    Thread-safe in-memory repository pre-seeded with EV battery records,
    tamper-evident hash chains, custody transfers, and disposition decisions.
    """
    def __init__(self):
        self._lock = asyncio.Lock()
        self.batteries: Dict[str, Dict[str, Any]] = {}
        self.custody_events: Dict[str, List[Dict[str, Any]]] = {}
        self.custody_transfers: Dict[str, Dict[str, Any]] = {}
        self.disposition_decisions: Dict[str, Dict[str, Any]] = {}
        self.audit_logs: List[Dict[str, Any]] = []
        self._seed_initial_data()

    def _seed_initial_data(self):
        now = "2024-01-15T09:00:00Z"
        # Battery 1: NMC 811
        did1, id1 = generate_immutable_battery_id(
            "QuantumVolt Gigafactory",
            "QV-2024-NMC-98124",
            "NMC 811",
            now
        )
        b1 = {
            "id": "b1111111-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
            "battery_id": "BAT-NMC-8A2F91C0",
            "battery_did": did1,
            "serial_number": "QV-2024-NMC-98124",
            "manufacturer_name": "QuantumVolt Gigafactory",
            "model_designation": "QV-HighEnergy-90X",
            "chemistry": "NMC 811",
            "manufacturing_date": now,
            "manufacturing_country": "DE",
            "manufacturing_facility": "Berlin-Brandenburg Gigafactory",
            "status": "IN_SERVICE",
            "current_custodian": "Apex EV Mobility Fleet",
            "current_vehicle_vin": "WAUZZZF28NA091244",
            "technical_specs": {
                "rated_capacity_kwh": 92.4,
                "nominal_voltage_v": 400.0,
                "max_charge_power_kw": 250.0,
                "cell_count": 192,
                "pack_weight_kg": 485.0
            },
            "carbon_footprint": {
                "total_co2_kg_per_kwh": 62.5,
                "manufacturing_co2_kg": 28.0,
                "raw_materials_co2_kg": 29.5,
                "transport_co2_kg": 5.0,
                "eu_compliance_class": "Class A"
            },
            "recycled_content": {
                "cobalt_percentage": 16.5,
                "lithium_percentage": 6.0,
                "nickel_percentage": 12.0,
                "lead_percentage": 0.0
            },
            "health_state": {
                "state_of_health_pct": 88.4,
                "state_of_charge_pct": 72.0,
                "cycle_count": 420,
                "internal_resistance_mohm": 19.8,
                "capacity_fade_rate_pct_yr": 1.9,
                "last_telemetry_timestamp": "2026-10-25T14:30:00Z"
            },
            "qr_code_url": "/api/v1/verify/BAT-NMC-8A2F91C0",
            "created_at": now,
            "updated_at": "2026-10-25T14:30:00Z"
        }
        self.batteries[b1["battery_id"]] = b1

        # Events for Battery 1 (3 blocks)
        ev1_0_payload = {"batch_id": "BATCH-2024-Q1-90", "quality_grade": "A+", "initial_soh": 100.0}
        ev1_0_hash = calculate_event_hash(
            prev_hash=GENESIS_PREV_HASH,
            battery_id=b1["battery_id"],
            event_type="MANUFACTURED",
            timestamp=now,
            actor_id="ACTOR-MFG-001",
            payload=ev1_0_payload
        )
        ev1_0 = {
            "event_id": "EVT-001-GENESIS",
            "battery_id": b1["battery_id"],
            "event_type": "MANUFACTURED",
            "timestamp": now,
            "actor_id": "ACTOR-MFG-001",
            "actor_role": "MANUFACTURER",
            "actor_organization": "QuantumVolt Gigafactory",
            "location": "Berlin, Germany",
            "payload": ev1_0_payload,
            "prev_hash": GENESIS_PREV_HASH,
            "hash": ev1_0_hash
        }

        ev1_1_payload = {"vehicle_vin": "WAUZZZF28NA091244", "model": "Apex GT Sedan", "inverter_kw": 250}
        ev1_1_hash = calculate_event_hash(
            prev_hash=ev1_0_hash,
            battery_id=b1["battery_id"],
            event_type="OEM_ASSEMBLED",
            timestamp="2024-02-10T11:20:00Z",
            actor_id="ACTOR-OEM-042",
            payload=ev1_1_payload
        )
        ev1_1 = {
            "event_id": "EVT-001-OEM",
            "battery_id": b1["battery_id"],
            "event_type": "OEM_ASSEMBLED",
            "timestamp": "2024-02-10T11:20:00Z",
            "actor_id": "ACTOR-OEM-042",
            "actor_role": "OEM",
            "actor_organization": "Apex Motors AG",
            "location": "Stuttgart, Germany",
            "payload": ev1_1_payload,
            "prev_hash": ev1_0_hash,
            "hash": ev1_1_hash
        }

        ev1_2_payload = {"fleet_id": "FLEET-BER-88", "current_soh": 88.4, "odometer_km": 68500}
        ev1_2_hash = calculate_event_hash(
            prev_hash=ev1_1_hash,
            battery_id=b1["battery_id"],
            event_type="TELEMETRY_UPDATED",
            timestamp="2026-10-25T14:30:00Z",
            actor_id="ACTOR-FLEET-109",
            payload=ev1_2_payload
        )
        ev1_2 = {
            "event_id": "EVT-001-TELEMETRY",
            "battery_id": b1["battery_id"],
            "event_type": "TELEMETRY_UPDATED",
            "timestamp": "2026-10-25T14:30:00Z",
            "actor_id": "ACTOR-FLEET-109",
            "actor_role": "FLEET_OPERATOR",
            "actor_organization": "Apex EV Mobility Fleet",
            "location": "Berlin, Germany",
            "payload": ev1_2_payload,
            "prev_hash": ev1_1_hash,
            "hash": ev1_2_hash
        }
        self.custody_events[b1["battery_id"]] = [ev1_0, ev1_1, ev1_2]

        # Battery 2: LFP (Second Life)
        did2, id2 = generate_immutable_battery_id(
            "Nordic Battery Systems",
            "NBS-2023-LFP-44109",
            "LFP",
            "2023-05-10T10:00:00Z"
        )
        b2 = {
            "id": "b2222222-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
            "battery_id": "BAT-LFP-3C7D410E",
            "battery_did": did2,
            "serial_number": "NBS-2023-LFP-44109",
            "manufacturer_name": "Nordic Battery Systems",
            "model_designation": "NBS-SafeCell-60",
            "chemistry": "LFP",
            "manufacturing_date": "2023-05-10T10:00:00Z",
            "manufacturing_country": "SE",
            "manufacturing_facility": "Skelleftea Gigafactory",
            "status": "SECOND_LIFE",
            "current_custodian": "GridStore Second-Life Energy Storage",
            "current_vehicle_vin": None,
            "technical_specs": {
                "rated_capacity_kwh": 64.0,
                "nominal_voltage_v": 320.0,
                "max_charge_power_kw": 150.0,
                "cell_count": 100,
                "pack_weight_kg": 420.0
            },
            "carbon_footprint": {
                "total_co2_kg_per_kwh": 51.2,
                "manufacturing_co2_kg": 22.0,
                "raw_materials_co2_kg": 24.2,
                "transport_co2_kg": 5.0,
                "eu_compliance_class": "Class A"
            },
            "recycled_content": {
                "cobalt_percentage": 0.0,
                "lithium_percentage": 4.5,
                "nickel_percentage": 0.0,
                "lead_percentage": 0.0
            },
            "health_state": {
                "state_of_health_pct": 76.8,
                "state_of_charge_pct": 55.0,
                "cycle_count": 1850,
                "internal_resistance_mohm": 26.4,
                "capacity_fade_rate_pct_yr": 2.1,
                "last_telemetry_timestamp": "2026-10-20T12:00:00Z"
            },
            "qr_code_url": "/api/v1/verify/BAT-LFP-3C7D410E",
            "created_at": "2023-05-10T10:00:00Z",
            "updated_at": "2026-10-20T12:00:00Z"
        }
        self.batteries[b2["battery_id"]] = b2

        ev2_0_hash = calculate_event_hash(
            prev_hash=GENESIS_PREV_HASH,
            battery_id=b2["battery_id"],
            event_type="MANUFACTURED",
            timestamp="2023-05-10T10:00:00Z",
            actor_id="ACTOR-MFG-002",
            payload={"batch_id": "NBS-LFP-Q2"}
        )
        ev2_0 = {
            "event_id": "EVT-002-GENESIS",
            "battery_id": b2["battery_id"],
            "event_type": "MANUFACTURED",
            "timestamp": "2023-05-10T10:00:00Z",
            "actor_id": "ACTOR-MFG-002",
            "actor_role": "MANUFACTURER",
            "actor_organization": "Nordic Battery Systems",
            "location": "Skelleftea, Sweden",
            "payload": {"batch_id": "NBS-LFP-Q2"},
            "prev_hash": GENESIS_PREV_HASH,
            "hash": ev2_0_hash
        }
        ev2_1_hash = calculate_event_hash(
            prev_hash=ev2_0_hash,
            battery_id=b2["battery_id"],
            event_type="SECOND_LIFE_ASSIGNED",
            timestamp="2026-10-20T12:00:00Z",
            actor_id="ACTOR-RECYCLER-009",
            payload={"repurposing_application": "Stationary Solar BESS", "tested_soh": 76.8}
        )
        ev2_1 = {
            "event_id": "EVT-002-SECOND-LIFE",
            "battery_id": b2["battery_id"],
            "event_type": "SECOND_LIFE_ASSIGNED",
            "timestamp": "2026-10-20T12:00:00Z",
            "actor_id": "ACTOR-RECYCLER-009",
            "actor_role": "RECYCLER",
            "actor_organization": "GridStore Second-Life Energy Storage",
            "location": "Stockholm, Sweden",
            "payload": {"repurposing_application": "Stationary Solar BESS", "tested_soh": 76.8},
            "prev_hash": ev2_0_hash,
            "hash": ev2_1_hash
        }
        self.custody_events[b2["battery_id"]] = [ev2_0, ev2_1]

        # Battery 3: NCA (End of Life)
        did3, id3 = generate_immutable_battery_id(
            "Rhine Energy Cells",
            "REC-2021-NCA-10042",
            "NCA",
            "2021-08-20T08:00:00Z"
        )
        b3 = {
            "id": "b3333333-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
            "battery_id": "BAT-NCA-F104A7B2",
            "battery_did": did3,
            "serial_number": "REC-2021-NCA-10042",
            "manufacturer_name": "Rhine Energy Cells",
            "model_designation": "REC-EVMax-85",
            "chemistry": "NCA",
            "manufacturing_date": "2021-08-20T08:00:00Z",
            "manufacturing_country": "FR",
            "manufacturing_facility": "Dunkirk Gigafactory",
            "status": "END_OF_LIFE",
            "current_custodian": "EcoRecycle Metals Recovery",
            "current_vehicle_vin": None,
            "technical_specs": {
                "rated_capacity_kwh": 85.0,
                "nominal_voltage_v": 380.0,
                "max_charge_power_kw": 200.0,
                "cell_count": 180,
                "pack_weight_kg": 460.0
            },
            "carbon_footprint": {
                "total_co2_kg_per_kwh": 78.0,
                "manufacturing_co2_kg": 35.0,
                "raw_materials_co2_kg": 36.0,
                "transport_co2_kg": 7.0,
                "eu_compliance_class": "Class B"
            },
            "recycled_content": {
                "cobalt_percentage": 22.0,
                "lithium_percentage": 8.0,
                "nickel_percentage": 18.0,
                "lead_percentage": 0.0
            },
            "health_state": {
                "state_of_health_pct": 64.2,
                "state_of_charge_pct": 20.0,
                "cycle_count": 2480,
                "internal_resistance_mohm": 34.0,
                "capacity_fade_rate_pct_yr": 3.2,
                "last_telemetry_timestamp": "2026-10-18T16:00:00Z"
            },
            "qr_code_url": "/api/v1/verify/BAT-NCA-F104A7B2",
            "created_at": "2021-08-20T08:00:00Z",
            "updated_at": "2026-10-18T16:00:00Z"
        }
        self.batteries[b3["battery_id"]] = b3

        ev3_0_hash = calculate_event_hash(
            prev_hash=GENESIS_PREV_HASH,
            battery_id=b3["battery_id"],
            event_type="MANUFACTURED",
            timestamp="2021-08-20T08:00:00Z",
            actor_id="ACTOR-MFG-003",
            payload={"batch_id": "REC-NCA-2021"}
        )
        ev3_0 = {
            "event_id": "EVT-003-GENESIS",
            "battery_id": b3["battery_id"],
            "event_type": "MANUFACTURED",
            "timestamp": "2021-08-20T08:00:00Z",
            "actor_id": "ACTOR-MFG-003",
            "actor_role": "MANUFACTURER",
            "actor_organization": "Rhine Energy Cells",
            "location": "Dunkirk, France",
            "payload": {"batch_id": "REC-NCA-2021"},
            "prev_hash": GENESIS_PREV_HASH,
            "hash": ev3_0_hash
        }
        self.custody_events[b3["battery_id"]] = [ev3_0]

        # Demo Custody Transfer
        transfer_id = "c1111111-cccc-cccc-cccc-cccccccccccc"
        self.custody_transfers[transfer_id] = {
            "id": transfer_id,
            "battery_id": b1["battery_id"],
            "sender_org_id": "11111111-1111-1111-1111-111111111111",
            "sender_org_name": "QuantumVolt Gigafactory",
            "receiver_org_id": "22222222-2222-2222-2222-222222222222",
            "receiver_org_name": "Apex Motors AG",
            "sender_actor_id": "a1111111-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
            "receiver_actor_id": "a2222222-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
            "state": "ACCEPTED",
            "transfer_type": "OEM_DELIVERY",
            "notes": "Initial gigafactory batch delivery for vehicle assembly",
            "initiated_at": "2024-01-20T10:00:00Z",
            "responded_at": "2024-01-22T14:00:00Z",
            "rejection_reason": None
        }

        # Demo Disposition Decision for Battery 2
        self.disposition_decisions[b2["battery_id"]] = {
            "id": "d1111111-dddd-dddd-dddd-dddddddddddd",
            "battery_id": b2["battery_id"],
            "recommendation": "STATIONARY_BESS",
            "recommended_pathway": "Second-Life Grid Peak Shaving Container",
            "constraints": {"min_soh": 70.0, "max_temp_c": 45.0, "max_c_rate": 0.5},
            "explanation": "Degradation profile and remaining capacity (76.8% SoH, 1850 cycles) are optimal for stationary containerized grid energy storage.",
            "approval_status": "APPROVED",
            "decided_by": "a5555555-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
            "decided_at": "2026-10-20T12:00:00Z",
            "approved_by": "a5555555-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
            "approved_at": "2026-10-20T12:30:00Z"
        }

    async def get_all_passports(self, status_filter: Optional[str] = None) -> List[Dict[str, Any]]:
        async with self._lock:
            res = list(self.batteries.values())
            if status_filter and status_filter != "ALL":
                res = [p for p in res if p.get("status") == status_filter]
            return copy.deepcopy(res)

    async def get_passport_by_id(self, battery_id: str) -> Optional[Dict[str, Any]]:
        async with self._lock:
            # Check by battery_id, DID, or serial
            if battery_id in self.batteries:
                return copy.deepcopy(self.batteries[battery_id])
            for p in self.batteries.values():
                if p.get("battery_did") == battery_id or p.get("serial_number") == battery_id or p.get("id") == battery_id:
                    return copy.deepcopy(p)
            return None

    async def create_passport(self, passport_data: Dict[str, Any]) -> Dict[str, Any]:
        async with self._lock:
            b_id = passport_data["battery_id"]
            self.batteries[b_id] = copy.deepcopy(passport_data)
            return copy.deepcopy(passport_data)

    async def update_passport(self, battery_id: str, updates: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        async with self._lock:
            found_key = None
            if battery_id in self.batteries:
                found_key = battery_id
            else:
                for k, v in self.batteries.items():
                    if v.get("battery_did") == battery_id or v.get("serial_number") == battery_id or v.get("id") == battery_id:
                        found_key = k
                        break
            if not found_key:
                return None
            
            p = self.batteries[found_key]
            for k, val in updates.items():
                if val is not None:
                    p[k] = val
            p["updated_at"] = datetime.now(timezone.utc).isoformat()
            return copy.deepcopy(p)

    async def get_custody_events(self, battery_id: str) -> List[Dict[str, Any]]:
        async with self._lock:
            # find key
            found_key = battery_id
            if battery_id not in self.custody_events:
                for k, v in self.batteries.items():
                    if v.get("battery_did") == battery_id or v.get("id") == battery_id:
                        found_key = k
                        break
            return copy.deepcopy(self.custody_events.get(found_key, []))

    async def append_custody_event(self, event_data: Dict[str, Any]) -> Dict[str, Any]:
        async with self._lock:
            b_id = event_data["battery_id"]
            if b_id not in self.custody_events:
                self.custody_events[b_id] = []
            
            chain = self.custody_events[b_id]
            expected_prev = chain[-1]["hash"] if chain else GENESIS_PREV_HASH
            
            # Cryptographically calculate hash
            actual_hash = calculate_event_hash(
                prev_hash=expected_prev,
                battery_id=b_id,
                event_type=event_data["event_type"],
                timestamp=event_data["timestamp"],
                actor_id=event_data.get("actor_id", "ACTOR-SYSTEM"),
                payload=event_data.get("payload", {})
            )
            
            stored_event = copy.deepcopy(event_data)
            stored_event["prev_hash"] = expected_prev
            stored_event["hash"] = actual_hash
            chain.append(stored_event)
            return copy.deepcopy(stored_event)

    async def create_custody_transfer(self, transfer_data: Dict[str, Any]) -> Dict[str, Any]:
        async with self._lock:
            t_id = transfer_data.get("id") or str(uuid.uuid4())
            transfer_data["id"] = t_id
            self.custody_transfers[t_id] = copy.deepcopy(transfer_data)
            return copy.deepcopy(transfer_data)

    async def get_custody_transfer(self, transfer_id: str) -> Optional[Dict[str, Any]]:
        async with self._lock:
            t = self.custody_transfers.get(transfer_id)
            return copy.deepcopy(t) if t else None

    async def update_custody_transfer(self, transfer_id: str, updates: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        async with self._lock:
            t = self.custody_transfers.get(transfer_id)
            if not t:
                return None
            for k, v in updates.items():
                if v is not None:
                    t[k] = v
            return copy.deepcopy(t)

    async def get_disposition_decision(self, battery_id: str) -> Optional[Dict[str, Any]]:
        async with self._lock:
            # find key
            found_key = battery_id
            if battery_id not in self.disposition_decisions:
                for k, v in self.batteries.items():
                    if v.get("battery_did") == battery_id or v.get("id") == battery_id:
                        found_key = k
                        break
            d = self.disposition_decisions.get(found_key)
            return copy.deepcopy(d) if d else None

    async def create_disposition_decision(self, decision_data: Dict[str, Any]) -> Dict[str, Any]:
        async with self._lock:
            b_id = decision_data["battery_id"]
            self.disposition_decisions[b_id] = copy.deepcopy(decision_data)
            return copy.deepcopy(decision_data)

    async def log_audit(self, audit_data: Dict[str, Any]) -> None:
        async with self._lock:
            self.audit_logs.append(copy.deepcopy(audit_data))
