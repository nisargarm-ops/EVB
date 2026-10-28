from typing import List, Dict, Optional, Any
from pydantic import BaseModel, Field

class QpiAIOptAllocationRequest(BaseModel):
    battery_ids: List[str] = Field(..., min_items=1, description="List of Battery IDs to allocate into circular pathways")
    target_destinations: List[str] = Field(
        default=["stationary_bess", "cell_reconditioning", "deep_recycling"],
        description="Target second-life or recycling pathways"
    )
    carbon_penalty_weight: float = Field(0.4, ge=0.0, le=1.0)
    logistics_distance_weight: float = Field(0.3, ge=0.0, le=1.0)
    degradation_cost_weight: float = Field(0.3, ge=0.0, le=1.0)

class QpiAIOptResponse(BaseModel):
    status: str  # SUCCESS, SUBMITTED, NOT_CONFIGURED, ERROR
    configured: bool
    problem_type: str = "QUBO"
    num_variables: int
    qubo_edges_count: int
    qubo_sample_matrix: Dict[str, float]
    objective_value: Optional[float] = None
    recommended_allocations: Optional[Dict[str, str]] = None
    execution_time_seconds: Optional[float] = None
    job_id: Optional[str] = None
    message: str
    instructions: Optional[str] = None

class QpiAIQuantumSimulationRequest(BaseModel):
    battery_id: str
    cathode_material: str = Field("NMC 811", description="e.g. NMC 811, LFP, NCA")
    state_of_health_pct: float = Field(88.4, ge=0.0, le=100.0)
    cycle_count: int = Field(420, ge=0)
    backend: Optional[str] = "QpiAI-QSV-Local"
    shots: int = Field(1024, ge=100, le=10000)

class QpiAIQuantumResponse(BaseModel):
    status: str  # SUCCESS, SUBMITTED, SIMULATION_COMPLETED, AUTH_REQUIRED, ERROR
    configured_for_cloud: bool
    backend_used: str
    num_qubits: int
    circuit_depth: int
    quantum_gate_counts: Dict[str, int]
    measured_probabilities: Dict[str, float]
    estimated_ground_state_energy_hartree: float
    projected_capacity_fade_rate: float
    molecular_degradation_risk: str
    message: str
    instructions: Optional[str] = None
