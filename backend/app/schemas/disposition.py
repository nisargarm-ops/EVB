from typing import Dict, Any, Optional
from pydantic import BaseModel, Field

class DispositionDecisionResponse(BaseModel):
    id: str
    battery_id: str
    recommendation: str  # STATIONARY_BESS, CELL_RECONDITIONING, DEEP_RECYCLING, CONTINUE_IN_SERVICE
    recommended_pathway: str
    constraints: Dict[str, Any]
    explanation: str
    approval_status: str  # PROPOSED, APPROVED, REJECTED, EXECUTED
    decided_by: Optional[str] = None
    decided_at: str
    approved_by: Optional[str] = None
    approved_at: Optional[str] = None
