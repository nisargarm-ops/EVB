from abc import ABC, abstractmethod
from typing import Dict, List, Optional, Tuple, Any

class BaseBatteryRepository(ABC):
    @abstractmethod
    async def get_all_passports(self, status_filter: Optional[str] = None) -> List[Dict[str, Any]]:
        pass

    @abstractmethod
    async def get_passport_by_id(self, battery_id: str) -> Optional[Dict[str, Any]]:
        pass

    @abstractmethod
    async def create_passport(self, passport_data: Dict[str, Any]) -> Dict[str, Any]:
        pass

    @abstractmethod
    async def update_passport(self, battery_id: str, updates: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        pass

    @abstractmethod
    async def get_custody_events(self, battery_id: str) -> List[Dict[str, Any]]:
        pass

    @abstractmethod
    async def append_custody_event(self, event_data: Dict[str, Any]) -> Dict[str, Any]:
        pass

    @abstractmethod
    async def create_custody_transfer(self, transfer_data: Dict[str, Any]) -> Dict[str, Any]:
        pass

    @abstractmethod
    async def get_custody_transfer(self, transfer_id: str) -> Optional[Dict[str, Any]]:
        pass

    @abstractmethod
    async def update_custody_transfer(self, transfer_id: str, updates: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        pass

    @abstractmethod
    async def get_disposition_decision(self, battery_id: str) -> Optional[Dict[str, Any]]:
        pass

    @abstractmethod
    async def create_disposition_decision(self, decision_data: Dict[str, Any]) -> Dict[str, Any]:
        pass

    @abstractmethod
    async def log_audit(self, audit_data: Dict[str, Any]) -> None:
        pass
