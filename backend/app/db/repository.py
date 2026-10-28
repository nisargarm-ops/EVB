from abc import ABC, abstractmethod
from typing import List, Optional, Tuple, Dict, Any
from ..models.passport import BatteryPassport
from ..models.custody import CustodyEvent

class BaseBatteryRepository(ABC):
    @abstractmethod
    async def get_all_passports(self) -> List[BatteryPassport]:
        pass

    @abstractmethod
    async def get_passport_by_id(self, battery_id: str) -> Optional[BatteryPassport]:
        pass

    @abstractmethod
    async def create_passport(self, passport: BatteryPassport) -> BatteryPassport:
        pass

    @abstractmethod
    async def update_passport(self, battery_id: str, updates: Dict[str, Any]) -> Optional[BatteryPassport]:
        pass

    @abstractmethod
    async def get_custody_events(self, battery_id: str) -> List[CustodyEvent]:
        pass

    @abstractmethod
    async def append_custody_event(self, event: CustodyEvent) -> CustodyEvent:
        pass

    @abstractmethod
    async def verify_audit_trail(self, battery_id: str) -> Tuple[bool, Optional[str], Optional[int]]:
        pass
