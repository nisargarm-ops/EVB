from fastapi import APIRouter, Depends, HTTPException
from ...schemas.qpiai import QpiAIQuantumSimulationRequest, QpiAIQuantumResponse
from ...integrations.qpiai_quantum_adapter import QpiAIQuantumAdapter
from ...core.security import get_current_user, require_roles
from ...core.rbac import UserRole

router = APIRouter(prefix="/qpiai/quantum", tags=["QpiAI Quantum SDK & QCloud"])

@router.post("/simulate-cathode", response_model=QpiAIQuantumResponse)
async def simulate_cathode_degradation(
    req: QpiAIQuantumSimulationRequest,
    current_user: dict = Depends(require_roles([UserRole.MANUFACTURER, UserRole.REGULATOR_AUDITOR, UserRole.FLEET_OPERATOR]))
):
    """
    Executes or formulates quantum circuit simulation for EV battery cathode material degradation
    using the official QpiAI Quantum SDK.
    Supports execution on QpiAI-QSV-Local simulator and QpiAI-Indus-1 QPU on QpiAI QCloud.
    Strictly truthful about authentication requirements.
    """
    return await QpiAIQuantumAdapter.run_simulation(req=req)
