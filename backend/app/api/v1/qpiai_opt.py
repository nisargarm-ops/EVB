from fastapi import APIRouter, Depends
from ...schemas.qpiai import QpiAIOptAllocationRequest, QpiAIOptResponse
from ...integrations.qpiai_opt_adapter import QpiAIOptAdapter
from ...db.supabase import get_repository
from ...db.repository import BaseBatteryRepository
from ...core.security import require_roles
from ...core.rbac import UserRole

router = APIRouter(prefix="/qpiai/opt", tags=["QpiAI-Opt Engine"])

@router.post("/allocate", response_model=QpiAIOptResponse)
async def solve_battery_allocation(
    req: QpiAIOptAllocationRequest,
    current_user: dict = Depends(require_roles([UserRole.MANUFACTURER, UserRole.FLEET_OPERATOR, UserRole.RECYCLER, UserRole.ADMINISTRATOR])),
    repo: BaseBatteryRepository = Depends(get_repository)
):
    """
    Solves or mathematically formulates the Second-Life & Recycling Allocation problem
    using the official QpiAI-Opt QUBO solver.
    """
    return await QpiAIOptAdapter.solve_allocation(req=req, repo=repo)
