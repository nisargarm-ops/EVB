from fastapi import APIRouter, Depends
from ...schemas.qpiai import QpiAIQuantumSimulationRequest, QpiAIQuantumResponse
from ...integrations.qpiai_quantum_adapter import QpiAIQuantumAdapter
from ...core.security import require_roles
from ...core.rbac import UserRole

router = APIRouter(prefix="/qpiai/quantum", tags=["QpiAI Quantum Engine"])

@router.post("/simulate-cathode", response_model=QpiAIQuantumResponse)
async def simulate_cathode_molecular_degradation(
    req: QpiAIQuantumSimulationRequest,
    current_user: dict = Depends(require_roles([UserRole.MANUFACTURER, UserRole.RECYCLER, UserRole.AUDITOR, UserRole.ADMINISTRATOR]))
):
    """
    Constructs and simulates the 4-qubit parameterized variational trial ansatz
    for cathode material degradation modeling using the QpiAI Quantum SDK.
    """
    return await QpiAIQuantumAdapter.run_simulation(req=req)
