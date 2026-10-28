import asyncio
from datetime import datetime, timezone
from typing import Dict, List, Optional, Tuple, Any
import copy

from .repository import BaseBatteryRepository
from ..models.passport import (
    BatteryPassport,
    BatteryChemistry,
    LifecycleStatus,
    TechnicalSpecs,
    CarbonFootprint,
    RecycledContent,
    HealthState
)
from ..models.custody import CustodyEvent, CustodyEventType
from ..core.hasher import (
    GENESIS_PREV_HASH,
    calculate_event_hash,
    generate_immutable_battery_id,
    verify_chain_integrity
)

class InMemoryBatteryRepository(BaseBatteryRepository):
    """
    Thread-safe in-memory repository pre-seeded with sample EV battery passports
    and complete, tamper-evident SHA-256 custody chains.
    """
    def __init__(self):
        self._lock = asyncio.Lock()
        self.passports: Dict[str, BatteryPassport] = {}
        self.custody_events: Dict[str, List[CustodyEvent]] = {}
        self._seed_initial_data()

    def _seed_initial_data(self):
        # 1. NMC 811 Battery (In Service, High Performance EV Pack)
        did1, id1 = generate_immutable_battery_id(
            manufacturer="QuantumVolt Gigafactory",
            serial_number="QV-2024-NMC-98124",
            chemistry=BatteryChemistry.NMC_811.value,
            manufacture_date="2024-01-15T09:00:00Z"
        )
        p1 = BatteryPassport(
            battery_did=did1,
            battery_id="BAT-NMC-8A2F91C0",
            serial_number="QV-2024-NMC-98124",
            manufacturer_name="QuantumVolt Gigafactory",
            model_designation="QV-HighEnergy-90X",
            chemistry=BatteryChemistry.NMC_811,
            manufacturing_date="2024-01-15T09:00:00Z",
            manufacturing_country="DE",
            manufacturing_facility="Berlin-Brandenburg Gigafactory",
            status=LifecycleStatus.IN_SERVICE,
            current_custodian="Apex EV Mobility Fleet",
            current_vehicle_vin="WAUZZZF28NA091244",
            technical_specs=TechnicalSpecs(
                rated_capacity_kwh=92.4,
                nominal_voltage_v=400.0,
                max_charge_power_kw=250.0,
                cell_count=192,
                pack_weight_kg=485.0
            ),
            carbon_footprint=CarbonFootprint(
                total_co2_kg_per_kwh=62.5,
                manufacturing_co2_kg=28.0,
                raw_materials_co2_kg=29.5,
                transport_co2_kg=5.0,
                eu_compliance_class="Class A"
            ),
            recycled_content=RecycledContent(
                cobalt_percentage=16.5,
                lithium_percentage=6.0,
                nickel_percentage=12.0,
                lead_percentage=0.0
            ),
            health_state=HealthState(
                state_of_health_pct=88.4,
                state_of_charge_pct=72.0,
                cycle_count=420,
                internal_resistance_mohm=19.8,
                capacity_fade_rate_pct_yr=1.9,
                last_telemetry_timestamp="2026-10-25T14:30:00Z"
            ),
            qr_code_url="/api/v1/verify/BAT-NMC-8A2F91C0",
            created_at="2024-01-15T09:00:00Z",
            updated_at="2026-10-25T14:30:00Z"
        )
        self.passports[p1.battery_id] = p1

        # Chain of Custody for Battery 1 (3 linked blocks)
        # Block 0: Genesis (Manufactured)
        ev1_0_payload = {"batch_id": "BATCH-2024-Q1-90", "quality_grade": "A+", "initial_soh": 100.0}
        ev1_0_hash = calculate_event_hash(
            prev_hash=GENESIS_PREV_HASH,
            battery_id=p1.battery_id,
            event_type=CustodyEventType.MANUFACTURED.value,
            timestamp="2024-01-15T09:00:00Z",
            actor_id="ACTOR-MFG-001",
            payload=ev1_0_payload
        )
        ev1_0 = CustodyEvent(
            event_id="EVT-001-GENESIS",
            battery_id=p1.battery_id,
            event_type=CustodyEventType.MANUFACTURED,
            timestamp="2024-01-15T09:00:00Z",
            actor_id="ACTOR-MFG-001",
            actor_role="MANUFACTURER",
            actor_organization="QuantumVolt Gigafactory",
            location="Berlin, Germany",
            payload=ev1_0_payload,
            prev_hash=GENESIS_PREV_HASH,
            hash=ev1_0_hash
        )

        # Block 1: OEM Assembly
        ev1_1_payload = {"vehicle_vin": "WAUZZZF28NA091244", "model": "Apex GT Sedan", "inverter_kw": 250}
        ev1_1_hash = calculate_event_hash(
            prev_hash=ev1_0_hash,
            battery_id=p1.battery_id,
            event_type=CustodyEventType.OEM_ASSEMBLED.value,
            timestamp="2024-02-10T11:20:00Z",
            actor_id="ACTOR-OEM-042",
            payload=ev1_1_payload
        )
        ev1_1 = CustodyEvent(
            event_id="EVT-001-OEM",
            battery_id=p1.battery_id,
            event_type=CustodyEventType.OEM_ASSEMBLED,
            timestamp="2024-02-10T11:20:00Z",
            actor_id="ACTOR-OEM-042",
            actor_role="OEM",
            actor_organization="Apex Motors AG",
            location="Stuttgart, Germany",
            payload=ev1_1_payload,
            prev_hash=ev1_0_hash,
            hash=ev1_1_hash
        )

        # Block 2: Fleet Telemetry & Registration
        ev1_2_payload = {"fleet_id": "FLEET-BER-88", "current_soh": 88.4, "odometer_km": 68500}
        ev1_2_hash = calculate_event_hash(
            prev_hash=ev1_1_hash,
            battery_id=p1.battery_id,
            event_type=CustodyEventType.TELEMETRY_UPDATED.value,
            timestamp="2026-10-25T14:30:00Z",
            actor_id="ACTOR-FLEET-109",
            payload=ev1_2_payload
        )
        ev1_2 = CustodyEvent(
            event_id="EVT-001-TELEMETRY",
            battery_id=p1.battery_id,
            event_type=CustodyEventType.TELEMETRY_UPDATED,
            timestamp="2026-10-25T14:30:00Z",
            actor_id="ACTOR-FLEET-109",
            actor_role="FLEET_OPERATOR",
            actor_organization="Apex EV Mobility Fleet",
            location="Berlin, Germany",
            payload=ev1_2_payload,
            prev_hash=ev1_1_hash,
            hash=ev1_2_hash
        )
        self.custody_events[p1.battery_id] = [ev1_0, ev1_1, ev1_2]

        # 2. LFP Battery (Second Life Assigned to Stationary BESS)
        did2, id2 = generate_immutable_battery_id(
            manufacturer="Nordic Battery Systems",
            serial_number="NBS-2023-LFP-44109",
            chemistry=BatteryChemistry.LFP.value,
            manufacture_date="2023-05-10T10:00:00Z"
        )
        p2 = BatteryPassport(
            battery_did=did2,
            battery_id="BAT-LFP-3C7D410E",
            serial_number="NBS-2023-LFP-44109",
            manufacturer_name="Nordic Battery Systems",
            model_designation="NBS-SafeCell-60",
            chemistry=BatteryChemistry.LFP,
            manufacturing_date="2023-05-10T10:00:00Z",
            manufacturing_country="SE",
            manufacturing_facility="Skelleftea Gigafactory",
            status=LifecycleStatus.SECOND_LIFE,
            current_custodian="GridStore Second-Life Energy Storage",
            current_vehicle_vin=None,
            technical_specs=TechnicalSpecs(
                rated_capacity_kwh=64.0,
                nominal_voltage_v=320.0,
                max_charge_power_kw=150.0,
                cell_count=100,
                pack_weight_kg=420.0
            ),
            carbon_footprint=CarbonFootprint(
                total_co2_kg_per_kwh=51.2,
                manufacturing_co2_kg=22.0,
                raw_materials_co2_kg=24.2,
                transport_co2_kg=5.0,
                eu_compliance_class="Class A"
            ),
            recycled_content=RecycledContent(
                cobalt_percentage=0.0,
                lithium_percentage=4.5,
                nickel_percentage=0.0,
                lead_percentage=0.0
            ),
            health_state=HealthState(
                state_of_health_pct=76.8,
                state_of_charge_pct=55.0,
                cycle_count=1850,
                internal_resistance_mohm=26.4,
                capacity_fade_rate_pct_yr=2.1,
                last_telemetry_timestamp="2026-10-20T12:00:00Z"
            ),
            qr_code_url="/api/v1/verify/BAT-LFP-3C7D410E",
            created_at="2023-05-10T10:00:00Z",
            updated_at="2026-10-20T12:00:00Z"
        )
        self.passports[p2.battery_id] = p2

        # Chain for Battery 2
        ev2_0_hash = calculate_event_hash(
            prev_hash=GENESIS_PREV_HASH,
            battery_id=p2.battery_id,
            event_type=CustodyEventType.MANUFACTURED.value,
            timestamp="2023-05-10T10:00:00Z",
            actor_id="ACTOR-MFG-002",
            payload={"batch_id": "NBS-LFP-Q2"}
        )
        ev2_0 = CustodyEvent(
            event_id="EVT-002-GENESIS",
            battery_id=p2.battery_id,
            event_type=CustodyEventType.MANUFACTURED,
            timestamp="2023-05-10T10:00:00Z",
            actor_id="ACTOR-MFG-002",
            actor_role="MANUFACTURER",
            actor_organization="Nordic Battery Systems",
            location="Skelleftea, Sweden",
            payload={"batch_id": "NBS-LFP-Q2"},
            prev_hash=GENESIS_PREV_HASH,
            hash=ev2_0_hash
        )
        ev2_1_hash = calculate_event_hash(
            prev_hash=ev2_0_hash,
            battery_id=p2.battery_id,
            event_type=CustodyEventType.SECOND_LIFE_ASSIGNED.value,
            timestamp="2026-10-20T12:00:00Z",
            actor_id="ACTOR-RECYCLER-009",
            payload={"repurposing_application": "Stationary Solar BESS", "tested_soh": 76.8}
        )
        ev2_1 = CustodyEvent(
            event_id="EVT-002-SECOND-LIFE",
            battery_id=p2.battery_id,
            event_type=CustodyEventType.SECOND_LIFE_ASSIGNED,
            timestamp="2026-10-20T12:00:00Z",
            actor_id="ACTOR-RECYCLER-009",
            actor_role="RECYCLER",
            actor_organization="GridStore Second-Life Energy Storage",
            location="Stockholm, Sweden",
            payload={"repurposing_application": "Stationary Solar BESS", "tested_soh": 76.8},
            prev_hash=ev2_0_hash,
            hash=ev2_1_hash
        )
        self.custody_events[p2.battery_id] = [ev2_0, ev2_1]

        # 3. End of Life Battery (Ready for QpiAI-Opt Logistics / Recycling)
        did3, id3 = generate_immutable_battery_id(
            manufacturer="Rhine Energy Cells",
            serial_number="REC-2021-NCA-10042",
            chemistry=BatteryChemistry.NCA.value,
            manufacture_date="2021-08-20T08:00:00Z"
        )
        p3 = BatteryPassport(
            battery_did=did3,
            battery_id="BAT-NCA-F104A7B2",
            serial_number="REC-2021-NCA-10042",
            manufacturer_name="Rhine Energy Cells",
            model_designation="REC-EVMax-85",
            chemistry=BatteryChemistry.NCA,
            manufacturing_date="2021-08-20T08:00:00Z",
            manufacturing_country="FR",
            manufacturing_facility="Dunkirk Gigafactory",
            status=LifecycleStatus.END_OF_LIFE,
            current_custodian="EcoRecycle Metals Recovery",
            current_vehicle_vin=None,
            technical_specs=TechnicalSpecs(
                rated_capacity_kwh=85.0,
                nominal_voltage_v=380.0,
                max_charge_power_kw=200.0,
                cell_count=180,
                pack_weight_kg=460.0
            ),
            carbon_footprint=CarbonFootprint(
                total_co2_kg_per_kwh=78.0,
                manufacturing_co2_kg=35.0,
                raw_materials_co2_kg=36.0,
                transport_co2_kg=7.0,
                eu_compliance_class="Class B"
            ),
            recycled_content=RecycledContent(
                cobalt_percentage=22.0,
                lithium_percentage=8.0,
                nickel_percentage=18.0,
                lead_percentage=0.0
            ),
            health_state=HealthState(
                state_of_health_pct=64.2,
                state_of_charge_pct=20.0,
                cycle_count=2480,
                internal_resistance_mohm=34.0,
                capacity_fade_rate_pct_yr=3.2,
                last_telemetry_timestamp="2026-10-18T16:00:00Z"
            ),
            qr_code_url="/api/v1/verify/BAT-NCA-F104A7B2",
            created_at="2021-08-20T08:00:00Z",
            updated_at="2026-10-18T16:00:00Z"
        )
        self.passports[p3.battery_id] = p3

        ev3_0_hash = calculate_event_hash(
            prev_hash=GENESIS_PREV_HASH,
            battery_id=p3.battery_id,
            event_type=CustodyEventType.MANUFACTURED.value,
            timestamp="2021-08-20T08:00:00Z",
            actor_id="ACTOR-MFG-003",
            payload={"batch_id": "REC-NCA-2021"}
        )
        ev3_0 = CustodyEvent(
            event_id="EVT-003-GENESIS",
            battery_id=p3.battery_id,
            event_type=CustodyEventType.MANUFACTURED,
            timestamp="2021-08-20T08:00:00Z",
            actor_id="ACTOR-MFG-003",
            actor_role="MANUFACTURER",
            actor_organization="Rhine Energy Cells",
            location="Dunkirk, France",
            payload={"batch_id": "REC-NCA-2021"},
            prev_hash=GENESIS_PREV_HASH,
            hash=ev3_0_hash
        )
        self.custody_events[p3.battery_id] = [ev3_0]

    async def get_all_passports(self) -> List[BatteryPassport]:
        async with self._lock:
            return list(self.passports.values())

    async def get_passport_by_id(self, battery_id: str) -> Optional[BatteryPassport]:
        async with self._lock:
            # Check by human ID or DID
            if battery_id in self.passports:
                return self.passports[battery_id]
            for p in self.passports.values():
                if p.battery_did == battery_id or p.serial_number == battery_id:
                    return p
            return None

    async def create_passport(self, passport: BatteryPassport) -> BatteryPassport:
        async with self._lock:
            self.passports[passport.battery_id] = passport
            return passport

    async def update_passport(self, battery_id: str, updates: Dict[str, Any]) -> Optional[BatteryPassport]:
        async with self._lock:
            passport = self.passports.get(battery_id)
            if not passport:
                return None
            
            p_dict = passport.model_dump()
            for k, v in updates.items():
                if v is not None:
                    p_dict[k] = v
            p_dict["updated_at"] = datetime.now(timezone.utc).isoformat()
            updated_passport = BatteryPassport(**p_dict)
            self.passports[battery_id] = updated_passport
            return updated_passport

    async def get_custody_events(self, battery_id: str) -> List[CustodyEvent]:
        async with self._lock:
            return list(self.custody_events.get(battery_id, []))

    async def append_custody_event(self, event: CustodyEvent) -> CustodyEvent:
        async with self._lock:
            if event.battery_id not in self.custody_events:
                self.custody_events[event.battery_id] = []
            
            chain = self.custody_events[event.battery_id]
            expected_prev = chain[-1].hash if chain else GENESIS_PREV_HASH
            
            # Recalculate hash to enforce cryptographic integrity
            actual_hash = calculate_event_hash(
                prev_hash=expected_prev,
                battery_id=event.battery_id,
                event_type=event.event_type.value if hasattr(event.event_type, "value") else str(event.event_type),
                timestamp=event.timestamp,
                actor_id=event.actor_id,
                payload=event.payload
            )
            
            verified_event = CustodyEvent(
                event_id=event.event_id,
                battery_id=event.battery_id,
                event_type=event.event_type,
                timestamp=event.timestamp,
                actor_id=event.actor_id,
                actor_role=event.actor_role,
                actor_organization=event.actor_organization,
                location=event.location,
                payload=event.payload,
                prev_hash=expected_prev,
                hash=actual_hash
            )
            chain.append(verified_event)
            return verified_event

    async def verify_audit_trail(self, battery_id: str) -> Tuple[bool, Optional[str], Optional[int]]:
        async with self._lock:
            events = self.custody_events.get(battery_id, [])
            event_dicts = [e.model_dump(mode="json") for e in events]
            return verify_chain_integrity(event_dicts)
