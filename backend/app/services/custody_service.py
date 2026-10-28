from datetime import datetime, timezone
from typing import Dict, Any, List
from fastapi import HTTPException, status
import uuid

from ..db.repository import BaseBatteryRepository
from ..schemas.custody import CustodyTransferCreateRequest, CustodyTransferActionRequest, CustodyEventCreateRequest
from ..core.rbac import UserRole, normalize_role

class CustodyService:
    def __init__(self, repo: BaseBatteryRepository):
        self.repo = repo

    async def get_events(self, battery_id: str) -> List[Dict[str, Any]]:
        return await self.repo.get_custody_events(battery_id)

    async def append_event(self, battery_id: str, req: CustodyEventCreateRequest, current_user: Dict[str, Any]) -> Dict[str, Any]:
        p = await self.repo.get_passport_by_id(battery_id)
        if not p:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Battery '{battery_id}' not found.")
        
        user_role = normalize_role(current_user.get("role", "public"))
        user_org = current_user.get("organization", "").strip().lower()
        custodian_org = p.get("current_custodian", "").strip().lower()
        
        # Enforce that only custodian, auditor, or admin can append custody records
        if user_role not in (UserRole.ADMINISTRATOR, UserRole.AUDITOR):
            if user_org and user_org != custodian_org:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"Access denied. Organization '{current_user.get('organization')}' cannot append custody events for battery held by '{p.get('current_custodian')}'."
                )

        now = datetime.now(timezone.utc).isoformat()
        b_id = p["battery_id"]

        evt = await self.repo.append_custody_event({
            "event_id": f"EVT-{int(datetime.now().timestamp())}-{uuid.uuid4().hex[:6]}",
            "battery_id": b_id,
            "event_type": req.event_type,
            "timestamp": now,
            "actor_id": current_user.get("id", "ACTOR-CUSTOM"),
            "actor_role": user_role.value.upper(),
            "actor_organization": req.actor_organization or current_user.get("organization", "Authorized Enterprise"),
            "location": req.location or "Inspection Station",
            "payload": req.payload
        })
        return evt

    async def create_transfer(self, req: CustodyTransferCreateRequest, current_user: Dict[str, Any]) -> Dict[str, Any]:
        p = await self.repo.get_passport_by_id(req.battery_id)
        if not p:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Battery '{req.battery_id}' not found.")

        user_role = normalize_role(current_user.get("role", "public"))
        user_org = current_user.get("organization", "").strip().lower()
        custodian_org = p.get("current_custodian", "").strip().lower()

        # Enforce stewardship authorization: only current custodian or admin can initiate transfer
        if user_role != UserRole.ADMINISTRATOR and user_org:
            if user_org != custodian_org:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=(
                        f"Custody initiation denied: Only current custodian '{p.get('current_custodian')}' "
                        f"or Administrator can transfer custody of this battery."
                    )
                )

        sender_org_name = current_user.get("organization") or p["current_custodian"]
        now = datetime.now(timezone.utc).isoformat()
        transfer_id = str(uuid.uuid4())

        transfer_data = {
            "id": transfer_id,
            "battery_id": p["battery_id"],
            "sender_org_id": current_user.get("organization_id", "org-sender"),
            "sender_org_name": sender_org_name,
            "receiver_org_id": req.receiver_org_id,
            "receiver_org_name": req.receiver_organization_name or f"Organization {req.receiver_org_id}",
            "sender_actor_id": current_user.get("id"),
            "receiver_actor_id": None,
            "state": "PENDING",
            "transfer_type": req.transfer_type,
            "notes": req.notes or "Standard enterprise chain of custody transfer",
            "initiated_at": now,
            "responded_at": None,
            "rejection_reason": None,
        }

        created = await self.repo.create_custody_transfer(transfer_data)

        await self.repo.log_audit({
            "action": "INITIATE_CUSTODY_TRANSFER",
            "entity_type": "custody_transfer",
            "entity_id": transfer_id,
            "actor_id": current_user.get("id"),
            "actor_role": user_role.value,
            "details": {"battery_id": p["battery_id"], "receiver": req.receiver_org_id},
            "timestamp": now
        })

        return created

    async def accept_transfer(self, transfer_id: str, action_req: CustodyTransferActionRequest, current_user: Dict[str, Any]) -> Dict[str, Any]:
        t = await self.repo.get_custody_transfer(transfer_id)
        if not t:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Custody transfer '{transfer_id}' not found.")

        if t["state"] != "PENDING":
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Transfer is already in '{t['state']}' state.")

        user_role = normalize_role(current_user.get("role", "public"))
        user_org_id = str(current_user.get("organization_id", "")).strip().lower()
        user_org_name = str(current_user.get("organization", "")).strip().lower()

        receiver_org_id = str(t.get("receiver_org_id", "")).strip().lower()
        receiver_org_name = str(t.get("receiver_org_name", "")).strip().lower()

        is_admin = (user_role == UserRole.ADMINISTRATOR)
        is_receiver = (
            (bool(user_org_id) and user_org_id == receiver_org_id) or
            (bool(user_org_name) and user_org_name == receiver_org_name)
        )

        if not (is_admin or is_receiver):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=(
                    f"Access denied: Only the designated receiver organization ('{t.get('receiver_org_name')}') "
                    f"is authorized to accept this custody transfer."
                )
            )

        now = datetime.now(timezone.utc).isoformat()
        updated = await self.repo.update_custody_transfer(transfer_id, {
            "state": "ACCEPTED",
            "receiver_actor_id": current_user.get("id"),
            "responded_at": now,
            "notes": action_req.notes or t.get("notes")
        })

        # Update battery current_custodian
        b_id = t["battery_id"]
        new_custodian = current_user.get("organization") or t["receiver_org_name"]
        await self.repo.update_passport(b_id, {
            "current_custodian": new_custodian,
            "updated_at": now
        })

        # Append verified custody event block
        await self.repo.append_custody_event({
            "event_id": f"EVT-TRANSFER-{transfer_id[:8]}",
            "battery_id": b_id,
            "event_type": "TRANSFERRED_CUSTODY",
            "timestamp": now,
            "actor_id": current_user.get("id", "ACTOR-RECEIVER"),
            "actor_role": user_role.value.upper(),
            "actor_organization": new_custodian,
            "location": "Receiving Facility Ingestion Gate",
            "payload": {
                "transfer_id": transfer_id,
                "sender": t["sender_org_name"],
                "receiver": new_custodian,
                "notes": action_req.notes or "Handoff verified and accepted"
            }
        })

        return updated

    async def reject_transfer(self, transfer_id: str, action_req: CustodyTransferActionRequest, current_user: Dict[str, Any]) -> Dict[str, Any]:
        t = await self.repo.get_custody_transfer(transfer_id)
        if not t:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Custody transfer '{transfer_id}' not found.")

        if t["state"] != "PENDING":
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Transfer is already in '{t['state']}' state.")

        user_role = normalize_role(current_user.get("role", "public"))
        user_org_id = str(current_user.get("organization_id", "")).strip().lower()
        user_org_name = str(current_user.get("organization", "")).strip().lower()

        receiver_org_id = str(t.get("receiver_org_id", "")).strip().lower()
        receiver_org_name = str(t.get("receiver_org_name", "")).strip().lower()

        is_admin = (user_role == UserRole.ADMINISTRATOR)
        is_receiver = (
            (bool(user_org_id) and user_org_id == receiver_org_id) or
            (bool(user_org_name) and user_org_name == receiver_org_name)
        )

        if not (is_admin or is_receiver):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=(
                    f"Access denied: Only the designated receiver organization ('{t.get('receiver_org_name')}') "
                    f"is authorized to reject this custody transfer."
                )
            )

        now = datetime.now(timezone.utc).isoformat()
        reason = action_req.rejection_reason or "Transfer rejected by receiving party"
        updated = await self.repo.update_custody_transfer(transfer_id, {
            "state": "REJECTED",
            "receiver_actor_id": current_user.get("id"),
            "responded_at": now,
            "rejection_reason": reason
        })
        return updated
