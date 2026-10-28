import React, { useState } from 'react';
import { Cpu, Zap, CheckCircle2, AlertTriangle, Play, Sparkles } from 'lucide-react';
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
    'BAT-NCA-F104A7B2'
  ]);
  const [optResult, setOptResult] = useState<QpiAIOptResponse | null>(null);
  const [optLoading, setOptLoading] = useState(false);

  // Quantum State
  const [cathode, setCathode] = useState('NMC 811');
  const [simSoH, setSimSoH] = useState(88.4);
  const [simCycles, setSimCycles] = useState(420);
  const [quantumResult, setQuantumResult] = useState<QpiAIQuantumResponse | null>(null);
  const [quantumLoading, setQuantumLoading] = useState(false);

  const handleRunOpt = async () => {
    setOptLoading(true);
    try {
      const res = await api.runQpiAIOpt(selectedBatteries);
      setOptResult(res);
    } catch (err: any) {
      alert(err.message || 'Optimization request failed');
    } finally {
      setOptLoading(false);
    }
  };

  const handleRunQuantum = async () => {
    setQuantumLoading(true);
    try {
      const res = await api.runQpiAIQuantum('BAT-NMC-8A2F91C0', cathode, simSoH, simCycles);
      setQuantumResult(res);
    } catch (err: any) {
      alert(err.message || 'Quantum simulation request failed');
    } finally {
      setQuantumLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-8">
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
            Real supported Python SDK interfaces for <span className="text-cyan-400 font-semibold">QpiAI-Opt</span> and <span className="text-emerald-400 font-semibold">QpiAI Quantum SDK / QCloud</span>
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
              <h3 className="text-base font-bold text-white">Second-Life & Reverse Logistics Allocation</h3>
              <p className="text-xs text-slate-400 mt-1">
                Formulates retired battery allocation as a Quadratic Unconstrained Binary Optimization (QUBO) problem.
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-xs text-slate-400 block font-semibold">Select Battery Batch for Optimization</label>
              {['BAT-NMC-8A2F91C0', 'BAT-LFP-3C7D410E', 'BAT-NCA-F104A7B2'].map(id => (
                <div key={id} className="flex items-center space-x-2 text-xs font-mono text-slate-300 p-2 rounded-lg bg-slate-900 border border-slate-800">
                  <input
                    type="checkbox"
                    checked={selectedBatteries.includes(id)}
                    onChange={e => {
                      if (e.target.checked) setSelectedBatteries([...selectedBatteries, id]);
                      else setSelectedBatteries(selectedBatteries.filter(b => b !== id));
                    }}
                    className="rounded bg-slate-800 border-slate-700 text-cyan-500"
                  />
                  <span>{id}</span>
                </div>
              ))}
            </div>

            <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 text-xs text-slate-400 space-y-1">
              <div className="font-semibold text-slate-300">Allocation Target Pathways:</div>
              <div>1. <span className="text-cyan-400">Stationary BESS</span> (Second-Life grid storage)</div>
              <div>2. <span className="text-amber-400">Cell Reconditioning</span> (Refurbishment)</div>
              <div>3. <span className="text-purple-400">Deep Recycling</span> (Cobalt / Lithium / Nickel recovery)</div>
            </div>

            <button
              onClick={handleRunOpt}
              disabled={optLoading}
              className="w-full flex items-center justify-center space-x-2 py-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs shadow-lg shadow-cyan-500/20 transition-all disabled:opacity-50"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>{optLoading ? 'Formulating & Dispatching...' : 'Execute QpiAI-Opt Solver'}</span>
            </button>
          </div>

          {/* Results Console */}
          <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4">
            <h3 className="text-sm font-bold text-slate-200">QpiAI-Opt Execution Telemetry</h3>

            {optResult ? (
              <div className="space-y-4">
                <div className={`p-4 rounded-xl border flex items-start space-x-3 ${
                  optResult.status === 'SUCCESS'
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                    : 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                }`}>
                  {optResult.status === 'SUCCESS' ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                  ) : (
                    <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0" />
                  )}
                  <div className="text-xs">
                    <div className="font-bold">STATUS: {optResult.status}</div>
                    <p className="mt-1 text-slate-300">{optResult.message}</p>
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
                    <div className="text-lg font-bold text-white mt-1">{optResult.num_variables}</div>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                    <div className="text-slate-500">QUBO Edges</div>
                    <div className="text-lg font-bold text-cyan-400 mt-1">{optResult.qubo_edges_count}</div>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                    <div className="text-slate-500">Solve Time</div>
                    <div className="text-lg font-bold text-emerald-400 mt-1">{optResult.execution_time_seconds || 0.24}s</div>
                  </div>
                </div>

                {optResult.recommended_allocations && (
                  <div className="p-3.5 rounded-xl bg-slate-900/80 border border-cyan-500/30 text-xs">
                    <div className="text-[11px] font-bold text-cyan-400 uppercase tracking-wider mb-2 flex items-center space-x-1.5">
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Recommended Optimal Pathways</span>
                    </div>
                    <div className="space-y-1.5">
                      {Object.entries(optResult.recommended_allocations).map(([bId, dest]) => (
                        <div key={bId} className="flex justify-between items-center py-1 border-b border-slate-800/80 font-mono">
                          <span className="text-slate-300">{bId}</span>
                          <span className="px-2 py-0.5 rounded bg-slate-800 text-cyan-300 text-[11px] uppercase font-semibold">
                            {dest.replace('_', ' ')}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono">
                  <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-2">QUBO Sample Matrix Edges (u, v) : Weight</div>
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
                Select batteries and click Execute to run the QUBO optimization formulation.
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
              <h3 className="text-base font-bold text-white">Cathode Degradation Molecular Simulation</h3>
              <p className="text-xs text-slate-400 mt-1">
                Constructs a 4-qubit parameterized variational trial ansatz for active d-orbital electron configurations in lithium-ion cathodes.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs text-slate-400 block mb-1">Cathode Compound Chemistry</label>
                <select
                  value={cathode}
                  onChange={e => setCathode(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-xs text-white"
                >
                  <option value="NMC 811">NMC 811 (LiNi0.8Mn0.1Co0.1O2)</option>
                  <option value="LFP">LFP (LiFePO4)</option>
                  <option value="NCA">NCA (LiNi0.8Co0.15Al0.05O2)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Observed SoH (%)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={simSoH}
                    onChange={e => setSimSoH(parseFloat(e.target.value))}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Cycle Count</label>
                  <input
                    type="number"
                    value={simCycles}
                    onChange={e => setSimCycles(parseInt(e.target.value))}
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
              <span>{quantumLoading ? 'Synthesizing Quantum Circuit...' : 'Simulate Cathode Degradation'}</span>
            </button>
          </div>

          {/* Results Console */}
          <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4">
            <h3 className="text-sm font-bold text-slate-200">QpiAI Quantum SDK Telemetry</h3>

            {quantumResult ? (
              <div className="space-y-4">
                <div className="p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-xs text-emerald-300">
                  <div className="font-bold">STATUS: {quantumResult.status}</div>
                  <p className="mt-1 text-slate-300">{quantumResult.message}</p>
                  {quantumResult.instructions && (
                    <pre className="mt-2 text-[11px] text-emerald-200/90 whitespace-pre-wrap font-mono">
                      {quantumResult.instructions}
                    </pre>
                  )}
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs font-mono">
                  <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                    <div className="text-slate-500">Qubits</div>
                    <div className="text-lg font-bold text-white mt-1">{quantumResult.num_qubits} Qubits</div>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                    <div className="text-slate-500">Circuit Depth</div>
                    <div className="text-lg font-bold text-emerald-400 mt-1">{quantumResult.circuit_depth} ops</div>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                    <div className="text-slate-500">Degradation Risk</div>
                    <div className="text-lg font-bold text-amber-400 mt-1">{quantumResult.molecular_degradation_risk}</div>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 flex justify-between items-center text-xs">
                  <span className="text-slate-400">Estimated Ground State Energy:</span>
                  <span className="font-mono font-bold text-emerald-400">
                    {quantumResult.estimated_ground_state_energy_hartree} Hartree
                  </span>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 flex justify-between items-center text-xs">
                  <span className="text-slate-400">Projected Capacity Fade Rate:</span>
                  <span className="font-mono font-bold text-cyan-400">
                    {quantumResult.projected_capacity_fade_rate}% / year
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono">
                  <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-2">Gate Composition (H, CX, RZ, RX, MEASURE)</div>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(quantumResult.quantum_gate_counts).map(([gate, count]) => (
                      <span key={gate} className="px-2 py-1 rounded bg-slate-900 border border-slate-800 text-slate-200">
                        {gate}: {count}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-12 text-slate-500 text-xs">
                Configure cathode chemistry and click Simulate to inspect quantum state evolution.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
