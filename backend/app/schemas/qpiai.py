from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field

class QpiAIOptAllocationRequest(BaseModel):
    battery_ids: List[str] = Field(..., description="List of retired or in-transit battery IDs to optimize for second-life / recycling")
    target_destinations: List[str] = Field(
        default=["stationary_bess", "cell_reconditioning", "deep_recycling"],
        description="Available EoL / second life allocation pathways"
    )
    carbon_penalty_weight: float = Field(default=0.4, description="Relative penalty weighting for carbon emissions")
    logistics_distance_weight: float = Field(default=0.3, description="Relative penalty weighting for transport logistics distance")
    degradation_cost_weight: float = Field(default=0.3, description="Relative weighting for battery health degradation cost")

class QpiAIOptResponse(BaseModel):
    status: str = Field(..., description="Status: 'SUCCESS', 'SUBMITTED', 'NOT_CONFIGURED', or 'ERROR'")
    configured: bool = Field(..., description="Whether real QpiAI-Opt API credentials are configured")
    problem_type: str = "QUBO"
    num_variables: int
    qubo_edges_count: int
    qubo_sample_matrix: Dict[str, float] = Field(..., description="Formulated QUBO dictionary edge weights for inspection")
    objective_value: Optional[float] = None
    recommended_allocations: Optional[Dict[str, str]] = None
    execution_time_seconds: Optional[float] = None
    job_id: Optional[str] = None
    message: str
    instructions: Optional[str] = None

class QpiAIQuantumSimulationRequest(BaseModel):
    battery_id: str
    cathode_material: str = Field(default="NMC 811", description="Cathode compound chemistry: NMC 811, LFP, NCA")
    state_of_health_pct: float = Field(default=85.0, description="Observed SoH % from telemetry")
    cycle_count: int = Field(default=500, description="Cycle count")
    backend: str = Field(default="QpiAI-QSV-Local", description="QpiAI backend: QpiAI-QSV-Local, QpiAI-QSV-Simulator, QpiAI-Indus-1")
    shots: int = Field(default=1024, ge=100, le=10000)

class QpiAIQuantumResponse(BaseModel):
    status: str = Field(..., description="Status: 'SUCCESS', 'SUBMITTED', 'SIMULATION_COMPLETED', 'AUTH_REQUIRED', or 'ERROR'")
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
