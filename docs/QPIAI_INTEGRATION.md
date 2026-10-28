# QpiAI Integration Architecture & Truthful Execution Policy

BatteryPass 360 integrates two specialized Python SDKs provided by **QpiAI**:
1. **`qpiai-opt-api`**: Quantum-inspired combinatorial optimization platform.
2. **`qpiai-quantum`**: QpiAI Quantum SDK & QCloud platform for quantum circuit synthesis and hardware simulation.

---

## Truthful Execution Policy (Zero Fabrication)

> [!IMPORTANT]
> BatteryPass 360 strictly adheres to scientific and engineering honesty:
> - **We NEVER fabricate mock or simulated solver responses as "live cloud outputs".**
> - When `QPIAI_OPT_API_KEY` or `QPIAI_QUANTUM_API_KEY` are not configured, the system formulates the genuine mathematical problem (QUBO dictionary or quantum circuit), reports `status="NOT_CONFIGURED"` or `status="AUTH_REQUIRED"`, and returns clear diagnostic instructions.
> - When credentials ARE provided, the real SDK classes dispatch the workload to QpiAI's cloud servers.

---

## 1. QpiAI-Opt (Second-Life & Reverse Logistics QUBO)

### The Problem
When EV batteries reach End-of-Life (EoL) or End-of-First-Life (EoFL), cross-enterprise operators must decide the optimal allocation destination $j \in \{	ext{Stationary BESS}, 	ext{Cell Reconditioning}, 	ext{Deep Recycling}\}$ for each retired battery $i \in \{1, \dots, N\}$.

### Mathematical QUBO Formulation
We define binary decision variables:
$$x_{i,j} \in \{0, 1\} \quad 	ext{where } x_{i,j} = 1 \iff 	ext{battery } i 	ext{ is allocated to destination } j$$

Objective Function:
$$\min \sum_{i,j} C_{i,j} x_{i,j} + \lambda \sum_{i=1}^N \left( \sum_{j} x_{i,j} - 1 ight)^2$$
Where:
- $C_{i,j}$ evaluates the battery's observed State of Health ($	ext{SoH}_i$), cycle count, and logistics carbon footprint.
- $\lambda$ enforces the constraint that every battery is assigned to exactly one destination.

### SDK Interface
Implemented in `backend/app/integrations/qpiai_opt_adapter.py`:
```python
from qpiai_opt.problem.qubo import QUBOProblem
from qpiai_opt.solver.solver import Solver

problem = QUBOProblem(
    num_variables=num_vars,
    qubo_dict=qubo_dict,
    max_evaluations=1000,
    problem_type="QUBO"
)

solver = Solver(
    problem=problem,
    url=settings.QPIAI_OPT_URL,
    access_token=settings.QPIAI_OPT_API_KEY
)

solver.run(queue=False)
result = solver.get_result()
solution = solver.get_solution()
```

---

## 2. QpiAI Quantum SDK & QCloud (Cathode Degradation Simulation)

### The Problem
Simulating the degradation state of transition metal d-orbitals in high-nickel cathode compounds (e.g. $	ext{LiNi}_{0.8}	ext{Mn}_{0.1}	ext{Co}_{0.1}	ext{O}_2$) as a function of cycle count and thermal stress.

### Quantum Circuit Design
Implemented in `backend/app/integrations/qpiai_quantum_adapter.py`:
- 4 qubits representing active binding orbitals.
- Parameterized rotation gates $R_Z(0, 	heta)$ and $R_X(2, \phi)$ derived from telemetry degradation ratios.
- Multi-qubit entanglement gates ($CX$).
- Measurement into classical registers.

### SDK Interface
```python
from qpiai_quantum.circuit.circuit import Circuit
from qpiai_quantum.authentication.auth import QpiAIQuantumAuth
from qpiai_quantum.jobmanager.backend import Backend

qc = Circuit(4, 4, name="CathodeDegradation_NMC_811")
qc.h(0); qc.h(1); qc.h(2); qc.h(3)
qc.cx(0, 1); qc.cx(1, 2); qc.cx(2, 3)
qc.rz(0, theta); qc.rx(2, phi)
qc.measure(0, 0); qc.measure(1, 1); qc.measure(2, 2); qc.measure(3, 3)

# Authenticate if cloud key is provided:
QpiAIQuantumAuth.login(api_key)

# Execute on QpiAI QCloud or Indus-1 QPU:
job_result = qc.run(shots=1024, device_name="QpiAI-Indus-1")
```
