from typing import Dict, List, Optional, Any
import copy
from datetime import datetime, timezone
from .repository import BaseBatteryRepository
from ..core.hasher import GENESIS_PREV_HASH, calculate_event_hash

class SupabaseBatteryRepository(BaseBatteryRepository):
    """
    Production Supabase PostgreSQL repository implementing RLS and persistent tables.
    """
    def __init__(self, client):
        self.client = client

    async def get_all_passports(self, status_filter: Optional[str] = None) -> List[Dict[str, Any]]:
        query = self.client.table("batteries").select("*")
        if status_filter and status_filter != "ALL":
            query = query.eq("status", status_filter)
        res = query.execute()
        return res.data or []

    async def get_passport_by_id(self, battery_id: str) -> Optional[Dict[str, Any]]:
        # Match by human ID or DID
        res = self.client.table("batteries").select("*").or_(f"battery_id.eq.{battery_id},battery_did.eq.{battery_id}").execute()
        if res.data and len(res.data) > 0:
            return res.data[0]
        return None

    async def create_passport(self, passport_data: Dict[str, Any]) -> Dict[str, Any]:
        res = self.client.table("batteries").insert(passport_data).execute()
        return res.data[0] if res.data else passport_data

    async def update_passport(self, battery_id: str, updates: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        updates["updated_at"] = datetime.now(timezone.utc).isoformat()
        res = self.client.table("batteries").update(updates).eq("battery_id", battery_id).execute()
        return res.data[0] if res.data else None

    async def get_custody_events(self, battery_id: str) -> List[Dict[str, Any]]:
        res = self.client.table("lifecycle_events").select("*").eq("battery_id", battery_id).order("event_number", desc=False).execute()
        return res.data or []

    async def append_custody_event(self, event_data: Dict[str, Any]) -> Dict[str, Any]:
        b_id = event_data["battery_id"]
        # get existing events
        existing = await self.get_custody_events(b_id)
        prev_hash = existing[-1]["hash"] if existing else GENESIS_PREV_HASH
        event_num = len(existing)

        actual_hash = calculate_event_hash(
            prev_hash=prev_hash,
            battery_id=b_id,
            event_type=event_data["event_type"],
            timestamp=event_data["timestamp"],
            actor_id=event_data.get("actor_id", "ACTOR-SYSTEM"),
            payload=event_data.get("payload", {})
        )

        to_insert = copy.deepcopy(event_data)
        to_insert["prev_hash"] = prev_hash
        to_insert["hash"] = actual_hash
        to_insert["event_number"] = event_num

        res = self.client.table("lifecycle_events").insert(to_insert).execute()
        return res.data[0] if res.data else to_insert

    async def create_custody_transfer(self, transfer_data: Dict[str, Any]) -> Dict[str, Any]:
        res = self.client.table("custody_transfers").insert(transfer_data).execute()
        return res.data[0] if res.data else transfer_data

    async def get_custody_transfer(self, transfer_id: str) -> Optional[Dict[str, Any]]:
        res = self.client.table("custody_transfers").select("*").eq("id", transfer_id).execute()
        return res.data[0] if res.data else None

    async def update_custody_transfer(self, transfer_id: str, updates: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        updates["updated_at"] = datetime.now(timezone.utc).isoformat()
        res = self.client.table("custody_transfers").update(updates).eq("id", transfer_id).execute()
        return res.data[0] if res.data else None

    async def get_disposition_decision(self, battery_id: str) -> Optional[Dict[str, Any]]:
        res = self.client.table("disposition_decisions").select("*").eq("battery_id", battery_id).execute()
        return res.data[0] if res.data else None

    async def create_disposition_decision(self, decision_data: Dict[str, Any]) -> Dict[str, Any]:
        res = self.client.table("disposition_decisions").insert(decision_data).execute()
        return res.data[0] if res.data else decision_data

    async def log_audit(self, audit_data: Dict[str, Any]) -> None:
        try:
            self.client.table("audit_logs").insert(audit_data).execute()
        except Exception:
            pass
