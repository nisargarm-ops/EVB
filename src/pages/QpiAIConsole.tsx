import React, { useState } from 'react';
import { Cpu, Zap, CheckCircle2, AlertTriangle, Play, Info } from 'lucide-react';
import { QpiAIOptResponse, QpiAIQuantumResponse, UserRole } from '../types';
import { api } from '../services/api';

interface QpiAIConsoleProps {
  activeRole: UserRole;
}

export const QpiAIConsole: React.FC<QpiAIConsoleProps> = () => {
  const [activeTab, setActiveTab] = useState<'opt' | 'quantum'>('opt');

  // Opt State
  const [selectedBatteries, setSelectedBatteries] = useState<string[]>([
    'BAT-NMC-8A2F91C0',
    'BAT-LFP-3C7D410E',
    'BAT-NCA-F104A7B2',
  ]);
  const [optMode, setOptMode] = useState<'platform' | 'local'>('platform');
  const [optResult, setOptResult] = useState<QpiAIOptResponse | null>(null);
  const [optLoading, setOptLoading] = useState(false);

  // Quantum State
  const [cathode, setCathode] = useState('NMC 811');
  const [simSoH, setSimSoH] = useState(88.4);
  const [simCycles, setSimCycles] = useState(420);
  const [quantumBackend, setQuantumBackend] = useState('QpiAI-QSV-Local');
  const [quantumResult, setQuantumResult] = useState<QpiAIQuantumResponse | null>(null);
  const [quantumLoading, setQuantumLoading] = useState(false);
  const [consoleError, setConsoleError] = useState<string | null>(null);

  const handleRunOpt = async () => {
    setOptLoading(true);
    setConsoleError(null);
    try {
      const res = await api.runQpiAIOpt(selectedBatteries, optMode);
      setOptResult(res);
    } catch (err: any) {
      setConsoleError(err.message || 'Optimization request failed');
    } finally {
      setOptLoading(false);
    }
  };

  const handleRunQuantum = async () => {
    setQuantumLoading(true);
    setConsoleError(null);
    try {
      const res = await api.runQpiAIQuantum(
        'BAT-NMC-8A2F91C0',
        cathode,
        simSoH,
        simCycles,
        quantumBackend,
        1024
      );
      setQuantumResult(res);
    } catch (err: any) {
      setConsoleError(err.message || 'Quantum simulation request failed');
    } finally {
      setQuantumLoading(false);
    }
  };

  const getOptBannerClasses = (res: QpiAIOptResponse) => {
    if (res.status === 'SUCCESS' && res.is_cloud_result) {
      return 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300';
    }
    if (res.status === 'LOCAL_SOLVED' || res.status === 'SUBMITTED') {
      return 'bg-cyan-500/10 border-cyan-500/30 text-cyan-300';
    }
    if (res.status === 'ERROR' || res.status === 'AUTH_REQUIRED') {
      return 'bg-rose-500/10 border-rose-500/30 text-rose-300';
    }
    return 'bg-amber-500/10 border-amber-500/30 text-amber-300';
  };

  const getQuantumBannerClasses = (res: QpiAIQuantumResponse) => {
    if (res.status === 'SUCCESS' && res.is_cloud_execution) {
      return 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300';
    }
    if (res.status === 'SIMULATION_COMPLETED' || res.status === 'SUBMITTED') {
      return 'bg-cyan-500/10 border-cyan-500/30 text-cyan-300';
    }
    if (res.status === 'ERROR' || res.status === 'AUTH_REQUIRED') {
      return 'bg-rose-500/10 border-rose-500/30 text-rose-300';
    }
    return 'bg-amber-500/10 border-amber-500/30 text-amber-300';
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-8">
      {consoleError && (
        <div className="p-4 rounded-xl border bg-rose-500/10 border-rose-500/30 text-rose-300 text-xs font-semibold flex items-center justify-between">
          <span>{consoleError}</span>
          <button
            onClick={() => setConsoleError(null)}
            className="text-slate-400 hover:text-white ml-4"
          >
            ✕
          </button>
        </div>
      )}
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center space-x-2">
            <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
              <Cpu className="w-5 h-5" />
            </div>
            <h1 className="text-2xl font-extrabold text-white">QpiAI Advanced Computing Studio</h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Live backend integration with{' '}
            <span className="text-cyan-400 font-semibold">QpiAI-Opt Platform</span> and{' '}
            <span className="text-emerald-400 font-semibold">QpiAI Quantum / QCloud</span>
          </p>
        </div>

        {/* Studio Switcher */}
        <div className="flex p-1 rounded-xl bg-slate-900 border border-slate-800">
          <button
            onClick={() => setActiveTab('opt')}
            className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'opt'
                ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            QpiAI-Opt (QUBO Logistics)
          </button>
          <button
            onClick={() => setActiveTab('quantum')}
            className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'quantum'
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            QpiAI Quantum (Cathode Chemistry)
          </button>
        </div>
      </div>

      {/* QpiAI Opt View */}
      {activeTab === 'opt' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Controls */}
          <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-5">
            <div>
              <h3 className="text-base font-bold text-white">
                Second-Life & Reverse Logistics Allocation
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Formulates retired battery allocation as a symmetric Quadratic Unconstrained Binary
                Optimization (QUBO) problem.
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-xs text-slate-400 block font-semibold">
                Select Battery Batch for Optimization
              </label>
              {['BAT-NMC-8A2F91C0', 'BAT-LFP-3C7D410E', 'BAT-NCA-F104A7B2'].map((id) => (
                <div
                  key={id}
                  className="flex items-center space-x-2 text-xs font-mono text-slate-300 p-2 rounded-lg bg-slate-900 border border-slate-800"
                >
                  <input
                    type="checkbox"
                    checked={selectedBatteries.includes(id)}
                    onChange={(e) => {
                      if (e.target.checked) setSelectedBatteries([...selectedBatteries, id]);
                      else setSelectedBatteries(selectedBatteries.filter((b) => b !== id));
                    }}
                    className="rounded bg-slate-800 border-slate-700 text-cyan-500"
                  />
                  <span>{id}</span>
                </div>
              ))}
            </div>

            <div>
              <label className="text-xs text-slate-400 block mb-1 font-semibold">
                Execution Target
              </label>
              <select
                value={optMode}
                onChange={(e) => setOptMode(e.target.value as 'platform' | 'local')}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-xs text-white"
              >
                <option value="platform">QpiAI-Opt Cloud Platform (opt-server.qpiai.tech)</option>
                <option value="local">Local Exact QUBO Enumerator (Offline Reference)</option>
              </select>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 text-xs text-slate-400 space-y-1">
              <div className="font-semibold text-slate-300">Allocation Target Pathways:</div>
              <div>
                1. <span className="text-cyan-400">Stationary BESS</span> (Second-Life grid storage)
              </div>
              <div>
                2. <span className="text-amber-400">Cell Reconditioning</span> (Refurbishment)
              </div>
              <div>
                3. <span className="text-purple-400">Deep Recycling</span> (Cobalt / Lithium / Nickel
                recovery)
              </div>
            </div>

            <button
              onClick={handleRunOpt}
              disabled={optLoading || selectedBatteries.length === 0}
              className="w-full flex items-center justify-center space-x-2 py-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs shadow-lg shadow-cyan-500/20 transition-all disabled:opacity-50"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>
                {optLoading
                  ? 'Formulating & Dispatching...'
                  : optMode === 'platform'
                  ? 'Execute on QpiAI-Opt Cloud'
                  : 'Run Local Exact QUBO Reference'}
              </span>
            </button>
          </div>

          {/* Results Console */}
          <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-200">QpiAI-Opt Execution Telemetry</h3>
              {optResult && (
                <span
                  className={`text-[10px] font-mono px-2 py-0.5 rounded border ${
                    optResult.is_cloud_result
                      ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
                      : 'bg-slate-800 border-slate-700 text-slate-300'
                  }`}
                >
                  {optResult.is_cloud_result ? 'VERIFIED CLOUD SOLVER' : 'NON-CLOUD / LOCAL'}
                </span>
              )}
            </div>

            {optResult ? (
              <div className="space-y-4">
                <div
                  className={`p-4 rounded-xl border flex items-start space-x-3 ${getOptBannerClasses(
                    optResult
                  )}`}
                >
                  {optResult.status === 'SUCCESS' && optResult.is_cloud_result ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                  ) : optResult.status === 'LOCAL_SOLVED' ? (
                    <Info className="w-5 h-5 text-cyan-400 flex-shrink-0" />
                  ) : (
                    <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0" />
                  )}
                  <div className="text-xs min-w-0">
                    <div className="font-bold">
                      STATUS: {optResult.status}
                      {optResult.solver_backend ? ` • ${optResult.solver_backend}` : ''}
                    </div>
                    <p className="mt-1 text-slate-300 break-words">{optResult.message}</p>
                    {(optResult.problem_id || optResult.job_id) && (
                      <div className="mt-1.5 text-[11px] font-mono text-slate-400 space-x-3">
                        {optResult.problem_id && <span>Problem ID: {optResult.problem_id}</span>}
                        {optResult.job_id && <span>Job ID: {optResult.job_id}</span>}
                      </div>
                    )}
                    {optResult.instructions && (
                      <pre className="mt-2 text-[11px] text-amber-200/90 whitespace-pre-wrap font-mono">
                        {optResult.instructions}
                      </pre>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs font-mono">
                  <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                    <div className="text-slate-500">Binary Variables</div>
                    <div className="text-lg font-bold text-white mt-1">
                      {optResult.num_variables}
                    </div>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                    <div className="text-slate-500">QUBO Edges</div>
                    <div className="text-lg font-bold text-cyan-400 mt-1">
                      {optResult.qubo_edges_count}
                    </div>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                    <div className="text-slate-500">Objective Value</div>
                    <div className="text-lg font-bold text-emerald-400 mt-1">
                      {optResult.objective_value !== null && optResult.objective_value !== undefined
                        ? optResult.objective_value
                        : '—'}
                    </div>
                  </div>
                </div>

                {optResult.recommended_allocations && (
                  <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 text-xs space-y-2">
                    <div className="font-semibold text-slate-300 flex items-center justify-between">
                      <span>Recommended Pathway Allocations</span>
                      <span className="text-[10px] font-mono text-cyan-400">
                        {optResult.is_cloud_result ? 'QpiAI Cloud Result' : 'Local Exact Solver'}
                      </span>
                    </div>
                    <div className="space-y-1 font-mono text-[11px]">
                      {Object.entries(optResult.recommended_allocations).map(([batId, pathway]) => (
                        <div key={batId} className="flex justify-between text-slate-300">
                          <span>{batId}</span>
                          <span className="text-cyan-400 font-semibold">{pathway}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {optResult.local_reference_solution && !optResult.recommended_allocations && (
                  <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 text-xs space-y-2">
                    <div className="font-semibold text-slate-300 flex items-center justify-between">
                      <span>Local Exact Mathematical Reference</span>
                      <span className="text-[10px] font-mono text-amber-400">
                        NOT CLOUD EXECUTION
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400">
                      {optResult.local_reference_solution.note}
                    </p>
                    <div className="space-y-1 font-mono text-[11px]">
                      {Object.entries(optResult.local_reference_solution.allocations).map(
                        ([batId, pathway]) => (
                          <div key={batId} className="flex justify-between text-slate-300">
                            <span>{batId}</span>
                            <span className="text-slate-200">{pathway}</span>
                          </div>
                        )
                      )}
                    </div>
                  </div>
                )}

                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono">
                  <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-2">
                    QUBO Sample Matrix Edges (u, v) : Weight
                  </div>
                  <div className="max-h-36 overflow-y-auto space-y-1 text-[11px] text-cyan-300">
                    {Object.entries(optResult.qubo_sample_matrix).map(([pair, weight]) => (
                      <div key={pair} className="flex justify-between">
                        <span>{pair}</span>
                        <span>{weight}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-12 text-slate-500 text-xs">
                Select batteries and click Execute to run the QUBO optimization workflow.
              </div>
            )}
          </div>
        </div>
      )}

      {/* QpiAI Quantum View */}
      {activeTab === 'quantum' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Controls */}
          <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-5">
            <div>
              <h3 className="text-base font-bold text-white">
                Cathode Degradation Molecular Simulation
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Constructs a 4-qubit parameterized OpenQASM 2.0 variational ansatz for active
                d-orbital configurations in lithium-ion cathodes.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs text-slate-400 block mb-1">
                  Cathode Compound Chemistry
                </label>
                <select
                  value={cathode}
                  onChange={(e) => setCathode(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-xs text-white"
                >
                  <option value="NMC 811">NMC 811 (LiNi0.8Mn0.1Co0.1O2)</option>
                  <option value="LFP">LFP (LiFePO4)</option>
                  <option value="NCA">NCA (LiNi0.8Co0.15Al0.05O2)</option>
                </select>
              </div>

              <div>
                <label className="text-xs text-slate-400 block mb-1">
                  QpiAI Quantum / QCloud Target Backend
                </label>
                <select
                  value={quantumBackend}
                  onChange={(e) => setQuantumBackend(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-xs text-white"
                >
                  <option value="QpiAI-QSV-Local">
                    QpiAI-QSV-Local (QCloud Auth + Local Statevector Simulator)
                  </option>
                  <option value="QpiAI-QSV-Simulator">
                    QpiAI-QSV-Simulator (QCloud Remote Statevector)
                  </option>
                  <option value="QpiAI-QSV-Lite">
                    QpiAI-QSV-Lite (QCloud Remote Lite Simulator)
                  </option>
                  <option value="QpiAI-QDM-Simulator">
                    QpiAI-QDM-Simulator (QCloud Density Matrix)
                  </option>
                  <option value="QpiAI-QTN-Simulator">
                    QpiAI-QTN-Simulator (QCloud Tensor Network)
                  </option>
                  <option value="QpiAI-Indus-1">
                    QpiAI-Indus-1 (25-Qubit Superconducting QPU Hardware)
                  </option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Observed SoH (%)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={simSoH}
                    onChange={(e) => setSimSoH(parseFloat(e.target.value))}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Cycle Count</label>
                  <input
                    type="number"
                    value={simCycles}
                    onChange={(e) => setSimCycles(parseInt(e.target.value, 10))}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-xs text-white"
                  />
                </div>
              </div>
            </div>

            <button
              onClick={handleRunQuantum}
              disabled={quantumLoading}
              className="w-full flex items-center justify-center space-x-2 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-lg shadow-emerald-500/20 transition-all disabled:opacity-50"
            >
              <Zap className="w-4 h-4 fill-current" />
              <span>
                {quantumLoading ? 'Executing Quantum Circuit...' : 'Simulate Cathode Degradation'}
              </span>
            </button>
          </div>

          {/* Results Console */}
          <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-200">QpiAI Quantum SDK Telemetry</h3>
              {quantumResult && (
                <span
                  className={`text-[10px] font-mono px-2 py-0.5 rounded border ${
                    quantumResult.is_hardware_execution
                      ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                      : quantumResult.is_cloud_execution
                      ? 'bg-cyan-500/20 border-cyan-500/40 text-cyan-300'
                      : 'bg-slate-800 border-slate-700 text-slate-300'
                  }`}
                >
                  {quantumResult.is_hardware_execution
                    ? 'PHYSICAL QPU HARDWARE'
                    : quantumResult.is_cloud_execution
                    ? 'QCLOUD REMOTE SIMULATOR'
                    : 'LOCAL SIMULATOR — NOT QPU'}
                </span>
              )}
            </div>

            {quantumResult ? (
              <div className="space-y-4">
                <div
                  className={`p-4 rounded-xl border text-xs ${getQuantumBannerClasses(
                    quantumResult
                  )}`}
                >
                  <div className="font-bold">
                    STATUS: {quantumResult.status} • {quantumResult.backend_used}
                  </div>
                  <p className="mt-1 text-slate-300 break-words">{quantumResult.message}</p>
                  {(quantumResult.circuit_id || quantumResult.job_id) && (
                    <div className="mt-1.5 text-[11px] font-mono text-slate-400 space-x-3">
                      {quantumResult.circuit_id && (
                        <span>Circuit ID: {quantumResult.circuit_id}</span>
                      )}
                      {quantumResult.job_id && <span>Job ID: {quantumResult.job_id}</span>}
                    </div>
                  )}
                  {quantumResult.instructions && (
                    <pre className="mt-2 text-[11px] text-amber-200/90 whitespace-pre-wrap font-mono">
                      {quantumResult.instructions}
                    </pre>
                  )}
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs font-mono">
                  <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                    <div className="text-slate-500">Qubits</div>
                    <div className="text-lg font-bold text-white mt-1">
                      {quantumResult.num_qubits} Qubits
                    </div>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                    <div className="text-slate-500">Circuit Depth</div>
                    <div className="text-lg font-bold text-emerald-400 mt-1">
                      {quantumResult.circuit_depth} ops
                    </div>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                    <div className="text-slate-500">Degradation Risk</div>
                    <div className="text-lg font-bold text-amber-400 mt-1">
                      {quantumResult.molecular_degradation_risk}
                    </div>
                  </div>
                </div>

                {quantumResult.estimated_ground_state_energy_hartree !== 0 && (
                  <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 flex justify-between items-center text-xs">
                    <span className="text-slate-400">Estimated Ground State Energy:</span>
                    <span className="font-mono font-bold text-emerald-400">
                      {quantumResult.estimated_ground_state_energy_hartree} Hartree
                    </span>
                  </div>
                )}

                {Object.keys(quantumResult.measured_probabilities || {}).length > 0 && (
                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono">
                    <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-2">
                      Measured Bitstring Probabilities ({quantumResult.shots || 1024} shots)
                    </div>
                    <div className="max-h-28 overflow-y-auto grid grid-cols-2 gap-x-4 gap-y-1 text-[11px] text-emerald-300">
                      {Object.entries(quantumResult.measured_probabilities).map(([bits, prob]) => (
                        <div key={bits} className="flex justify-between">
                          <span>|{bits}⟩</span>
                          <span>{prob}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono">
                  <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-2">
                    Gate Composition (H, CX, RZ, RX, MEASURE)
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(quantumResult.quantum_gate_counts).map(([gate, count]) => (
                      <span
                        key={gate}
                        className="px-2 py-1 rounded bg-slate-900 border border-slate-800 text-slate-200"
                      >
                        {gate}: {count}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-12 text-slate-500 text-xs">
                Configure cathode chemistry and backend, then click Simulate to execute the circuit.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
