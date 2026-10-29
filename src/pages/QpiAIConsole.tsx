import React, { useState } from 'react';
import { Cpu, Zap, CheckCircle2, AlertTriangle, Play, Info, X } from 'lucide-react';
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
      return 'bg-[#ECFDF3] border-[#D1FAE5] text-[#065F46]';
    }
    if (res.status === 'LOCAL_SOLVED' || res.status === 'SUBMITTED') {
      return 'bg-[#F0FDF4] border-[#BBF7D0] text-[#14532D]';
    }
    if (res.status === 'ERROR' || res.status === 'AUTH_REQUIRED') {
      return 'bg-[#FEF2F2] border-[#FECACA] text-[#991B1B]';
    }
    return 'bg-[#FFFBEB] border-[#FDE68A] text-[#92400E]';
  };

  const getQuantumBannerClasses = (res: QpiAIQuantumResponse) => {
    if (res.status === 'SUCCESS' && res.is_cloud_execution) {
      return 'bg-[#ECFDF3] border-[#D1FAE5] text-[#065F46]';
    }
    if (res.status === 'SIMULATION_COMPLETED' || res.status === 'SUBMITTED') {
      return 'bg-[#F0FDF4] border-[#BBF7D0] text-[#14532D]';
    }
    if (res.status === 'ERROR' || res.status === 'AUTH_REQUIRED') {
      return 'bg-[#FEF2F2] border-[#FECACA] text-[#991B1B]';
    }
    return 'bg-[#FFFBEB] border-[#FDE68A] text-[#92400E]';
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-8">
      {consoleError && (
        <div className="p-4 rounded-xl border bg-[#FEF2F2] border-[#FECACA] text-[#DC2626] text-xs font-semibold flex items-center justify-between shadow-xs">
          <span>{consoleError}</span>
          <button
            onClick={() => setConsoleError(null)}
            className="text-[#DC2626] hover:text-[#991B1B] ml-4 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E5E7EB]">
        <div>
          <div className="flex items-center space-x-2.5">
            <div className="p-2.5 rounded-xl bg-[#ECFDF3] text-[#14532D] border border-[#D1FAE5] shadow-xs">
              <Cpu className="w-5 h-5 stroke-[2.2]" />
            </div>
            <h1 className="text-2xl font-bold text-[#1F2937]">QpiAI Advanced Computing Studio</h1>
          </div>
          <p className="text-xs text-[#64748B] mt-1.5">
            Live backend integration with{' '}
            <span className="text-[#14532D] font-semibold">QpiAI-Opt Platform</span> and{' '}
            <span className="text-[#059669] font-semibold">QpiAI Quantum / QCloud</span>
          </p>
        </div>

        {/* Studio Switcher */}
        <div className="flex p-1 rounded-xl bg-white border border-[#E5E7EB] shadow-xs">
          <button
            onClick={() => setActiveTab('opt')}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'opt'
                ? 'bg-[#14532D] text-white shadow-sm'
                : 'text-[#64748B] hover:text-[#1F2937]'
            }`}
          >
            QpiAI-Opt (QUBO Logistics)
          </button>
          <button
            onClick={() => setActiveTab('quantum')}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'quantum'
                ? 'bg-[#14532D] text-white shadow-sm'
                : 'text-[#64748B] hover:text-[#1F2937]'
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
          <div className="bg-white p-6 rounded-2xl border border-[#E5E7EB] shadow-sm space-y-5">
            <div>
              <h3 className="text-base font-bold text-[#1F2937]">
                Second-Life & Reverse Logistics Allocation
              </h3>
              <p className="text-xs text-[#64748B] mt-1">
                Formulates retired battery allocation as a symmetric Quadratic Unconstrained Binary
                Optimization (QUBO) problem.
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-xs text-[#1F2937] block font-semibold">
                Select Battery Batch for Optimization
              </label>
              {['BAT-NMC-8A2F91C0', 'BAT-LFP-3C7D410E', 'BAT-NCA-F104A7B2'].map((id) => (
                <div
                  key={id}
                  className="flex items-center space-x-2.5 text-xs font-mono text-[#1F2937] p-2.5 rounded-xl bg-[#F8FAF7] border border-[#E5E7EB] hover:border-[#CBD5E1] transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={selectedBatteries.includes(id)}
                    onChange={(e) => {
                      if (e.target.checked) setSelectedBatteries([...selectedBatteries, id]);
                      else setSelectedBatteries(selectedBatteries.filter((b) => b !== id));
                    }}
                    className="rounded text-[#14532D] focus:ring-[#14532D] border-[#CBD5E1]"
                  />
                  <span>{id}</span>
                </div>
              ))}
            </div>

            <div>
              <label className="text-xs text-[#1F2937] block mb-1 font-semibold">
                Execution Target
              </label>
              <select
                value={optMode}
                onChange={(e) => setOptMode(e.target.value as 'platform' | 'local')}
                className="w-full bg-[#F8FAF7] border border-[#E5E7EB] rounded-xl p-2.5 text-xs text-[#1F2937] focus:outline-none focus:ring-2 focus:ring-[#14532D]/20 focus:border-[#14532D] transition-all"
              >
                <option value="platform">QpiAI-Opt Cloud Platform (opt-server.qpiai.tech)</option>
                <option value="local">Local Exact QUBO Enumerator (Offline Reference)</option>
              </select>
            </div>

            <div className="p-3.5 rounded-xl bg-[#F8FAF7] border border-[#E5E7EB] text-xs text-[#64748B] space-y-1.5">
              <div className="font-semibold text-[#1F2937]">Allocation Target Pathways:</div>
              <div className="flex items-center space-x-1.5">
                <span className="w-2 h-2 rounded-full bg-[#14532D]" />
                <span>
                  1. <strong className="text-[#14532D]">Stationary BESS</strong> (Second-Life grid storage)
                </span>
              </div>
              <div className="flex items-center space-x-1.5">
                <span className="w-2 h-2 rounded-full bg-[#D97706]" />
                <span>
                  2. <strong className="text-[#D97706]">Cell Reconditioning</strong> (Refurbishment)
                </span>
              </div>
              <div className="flex items-center space-x-1.5">
                <span className="w-2 h-2 rounded-full bg-[#059669]" />
                <span>
                  3. <strong className="text-[#059669]">Deep Recycling</strong> (Cobalt / Lithium / Nickel recovery)
                </span>
              </div>
            </div>

            <button
              onClick={handleRunOpt}
              disabled={optLoading || selectedBatteries.length === 0}
              className="w-full flex items-center justify-center space-x-2 py-3 rounded-xl bg-[#14532D] hover:bg-[#166534] text-white font-bold text-xs shadow-sm hover:shadow transition-all disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
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
          <div className="bg-white p-6 rounded-2xl border border-[#E5E7EB] shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-[#1F2937]">QpiAI-Opt Execution Telemetry</h3>
              {optResult && (
                <span
                  className={`text-[10px] font-mono px-2.5 py-1 rounded-md border font-semibold ${
                    optResult.is_cloud_result
                      ? 'bg-[#ECFDF3] border-[#D1FAE5] text-[#059669]'
                      : 'bg-[#F8FAF7] border-[#E5E7EB] text-[#64748B]'
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
                    <CheckCircle2 className="w-5 h-5 text-[#059669] flex-shrink-0 mt-0.5" />
                  ) : optResult.status === 'LOCAL_SOLVED' ? (
                    <Info className="w-5 h-5 text-[#14532D] flex-shrink-0 mt-0.5" />
                  ) : (
                    <AlertTriangle className="w-5 h-5 text-[#D97706] flex-shrink-0 mt-0.5" />
                  )}
                  <div className="text-xs min-w-0">
                    <div className="font-bold">
                      STATUS: {optResult.status}
                      {optResult.solver_backend ? ` • ${optResult.solver_backend}` : ''}
                    </div>
                    <p className="mt-1 text-[#1F2937] break-words leading-relaxed">{optResult.message}</p>
                    {(optResult.problem_id || optResult.job_id) && (
                      <div className="mt-2 text-[11px] font-mono text-[#64748B] space-x-3">
                        {optResult.problem_id && <span>Problem ID: {optResult.problem_id}</span>}
                        {optResult.job_id && <span>Job ID: {optResult.job_id}</span>}
                      </div>
                    )}
                    {optResult.instructions && (
                      <pre className="mt-2 text-[11px] text-[#92400E] bg-white/80 p-2.5 rounded-lg border border-[#FDE68A]/60 whitespace-pre-wrap font-mono">
                        {optResult.instructions}
                      </pre>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs font-mono">
                  <div className="p-3.5 rounded-xl bg-[#F8FAF7] border border-[#E5E7EB]">
                    <div className="text-[11px] font-medium text-[#64748B]">Binary Variables</div>
                    <div className="text-lg font-bold text-[#1F2937] mt-1">
                      {optResult.num_variables}
                    </div>
                  </div>
                  <div className="p-3.5 rounded-xl bg-[#F8FAF7] border border-[#E5E7EB]">
                    <div className="text-[11px] font-medium text-[#64748B]">QUBO Edges</div>
                    <div className="text-lg font-bold text-[#14532D] mt-1">
                      {optResult.qubo_edges_count}
                    </div>
                  </div>
                  <div className="p-3.5 rounded-xl bg-[#F8FAF7] border border-[#E5E7EB]">
                    <div className="text-[11px] font-medium text-[#64748B]">Objective Value</div>
                    <div className="text-lg font-bold text-[#059669] mt-1">
                      {optResult.objective_value !== null && optResult.objective_value !== undefined
                        ? optResult.objective_value
                        : '—'}
                    </div>
                  </div>
                </div>

                {optResult.recommended_allocations && (
                  <div className="p-4 rounded-xl bg-[#F8FAF7] border border-[#E5E7EB] text-xs space-y-2.5">
                    <div className="font-semibold text-[#1F2937] flex items-center justify-between">
                      <span>Recommended Pathway Allocations</span>
                      <span className="text-[10px] font-mono text-[#059669] bg-[#ECFDF3] border border-[#D1FAE5] px-2 py-0.5 rounded font-semibold">
                        {optResult.is_cloud_result ? 'QpiAI Cloud Result' : 'Local Exact Solver'}
                      </span>
                    </div>
                    <div className="space-y-1.5 font-mono text-[11px]">
                      {Object.entries(optResult.recommended_allocations).map(([batId, pathway]) => (
                        <div key={batId} className="flex justify-between items-center text-[#1F2937] py-1 border-b border-[#E5E7EB] last:border-b-0">
                          <span className="font-medium text-[#1F2937]">{batId}</span>
                          <span className="text-[#14532D] font-bold bg-white px-2 py-0.5 rounded border border-[#E5E7EB]">{pathway}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {optResult.local_reference_solution && !optResult.recommended_allocations && (
                  <div className="p-4 rounded-xl bg-[#FFFBEB] border border-[#FDE68A] text-xs space-y-2">
                    <div className="font-semibold text-[#92400E] flex items-center justify-between">
                      <span>Local Exact Mathematical Reference</span>
                      <span className="text-[10px] font-mono text-[#B45309] font-bold bg-white px-2 py-0.5 rounded border border-[#FDE68A]">
                        NOT CLOUD EXECUTION
                      </span>
                    </div>
                    <p className="text-[11px] text-[#78350F] leading-relaxed">
                      {optResult.local_reference_solution.note}
                    </p>
                    <div className="space-y-1 font-mono text-[11px] pt-1">
                      {Object.entries(optResult.local_reference_solution.allocations).map(
                        ([batId, pathway]) => (
                          <div key={batId} className="flex justify-between text-[#1F2937] py-1 border-b border-[#FDE68A]/40 last:border-b-0">
                            <span>{batId}</span>
                            <span className="font-semibold text-[#92400E]">{pathway}</span>
                          </div>
                        )
                      )}
                    </div>
                  </div>
                )}

                <div className="p-3.5 rounded-xl bg-[#F8FAF7] border border-[#E5E7EB] text-xs font-mono">
                  <div className="text-[10px] text-[#64748B] uppercase tracking-wider font-semibold mb-2">
                    QUBO Sample Matrix Edges (u, v) : Weight
                  </div>
                  <div className="max-h-36 overflow-y-auto space-y-1 text-[11px] text-[#14532D]">
                    {Object.entries(optResult.qubo_sample_matrix).map(([pair, weight]) => (
                      <div key={pair} className="flex justify-between py-0.5 border-b border-[#E5E7EB]/50 last:border-b-0">
                        <span className="text-[#1F2937]">{pair}</span>
                        <span className="font-bold">{weight}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-16 text-[#64748B] text-xs flex flex-col items-center justify-center space-y-2">
                <Cpu className="w-8 h-8 text-[#94A3B8]" />
                <p>Select batteries and click Execute to run the QUBO optimization workflow.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* QpiAI Quantum View */}
      {activeTab === 'quantum' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Controls */}
          <div className="bg-white p-6 rounded-2xl border border-[#E5E7EB] shadow-sm space-y-5">
            <div>
              <h3 className="text-base font-bold text-[#1F2937]">
                Cathode Degradation Molecular Simulation
              </h3>
              <p className="text-xs text-[#64748B] mt-1">
                Constructs a 4-qubit parameterized OpenQASM 2.0 variational ansatz for active
                d-orbital configurations in lithium-ion cathodes.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs text-[#1F2937] font-semibold block mb-1">
                  Cathode Compound Chemistry
                </label>
                <select
                  value={cathode}
                  onChange={(e) => setCathode(e.target.value)}
                  className="w-full bg-[#F8FAF7] border border-[#E5E7EB] rounded-xl p-2.5 text-xs text-[#1F2937] focus:outline-none focus:ring-2 focus:ring-[#14532D]/20 focus:border-[#14532D] transition-all"
                >
                  <option value="NMC 811">NMC 811 (LiNi0.8Mn0.1Co0.1O2)</option>
                  <option value="LFP">LFP (LiFePO4)</option>
                  <option value="NCA">NCA (LiNi0.8Co0.15Al0.05O2)</option>
                </select>
              </div>

              <div>
                <label className="text-xs text-[#1F2937] font-semibold block mb-1">
                  QpiAI Quantum / QCloud Target Backend
                </label>
                <select
                  value={quantumBackend}
                  onChange={(e) => setQuantumBackend(e.target.value)}
                  className="w-full bg-[#F8FAF7] border border-[#E5E7EB] rounded-xl p-2.5 text-xs text-[#1F2937] focus:outline-none focus:ring-2 focus:ring-[#14532D]/20 focus:border-[#14532D] transition-all"
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
                  <label className="text-xs text-[#1F2937] font-semibold block mb-1">Observed SoH (%)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={simSoH}
                    onChange={(e) => setSimSoH(parseFloat(e.target.value))}
                    className="w-full bg-[#F8FAF7] border border-[#E5E7EB] rounded-xl p-2.5 text-xs text-[#1F2937] focus:outline-none focus:ring-2 focus:ring-[#14532D]/20 focus:border-[#14532D] transition-all"
                  />
                </div>
                <div>
                  <label className="text-xs text-[#1F2937] font-semibold block mb-1">Cycle Count</label>
                  <input
                    type="number"
                    value={simCycles}
                    onChange={(e) => setSimCycles(parseInt(e.target.value, 10))}
                    className="w-full bg-[#F8FAF7] border border-[#E5E7EB] rounded-xl p-2.5 text-xs text-[#1F2937] focus:outline-none focus:ring-2 focus:ring-[#14532D]/20 focus:border-[#14532D] transition-all"
                  />
                </div>
              </div>
            </div>

            <button
              onClick={handleRunQuantum}
              disabled={quantumLoading}
              className="w-full flex items-center justify-center space-x-2 py-3 rounded-xl bg-[#14532D] hover:bg-[#166534] text-white font-bold text-xs shadow-sm hover:shadow transition-all disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
            >
              <Zap className="w-4 h-4 fill-current" />
              <span>
                {quantumLoading ? 'Executing Quantum Circuit...' : 'Simulate Cathode Degradation'}
              </span>
            </button>
          </div>

          {/* Results Console */}
          <div className="bg-white p-6 rounded-2xl border border-[#E5E7EB] shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-[#1F2937]">QpiAI Quantum SDK Telemetry</h3>
              {quantumResult && (
                <span
                  className={`text-[10px] font-mono px-2.5 py-1 rounded-md border font-semibold ${
                    quantumResult.is_hardware_execution
                      ? 'bg-[#ECFDF3] border-[#D1FAE5] text-[#059669]'
                      : quantumResult.is_cloud_execution
                      ? 'bg-[#F0FDF4] border-[#BBF7D0] text-[#14532D]'
                      : 'bg-[#F8FAF7] border-[#E5E7EB] text-[#64748B]'
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
                  <p className="mt-1 text-[#1F2937] break-words leading-relaxed">{quantumResult.message}</p>
                  {(quantumResult.circuit_id || quantumResult.job_id) && (
                    <div className="mt-2 text-[11px] font-mono text-[#64748B] space-x-3">
                      {quantumResult.circuit_id && (
                        <span>Circuit ID: {quantumResult.circuit_id}</span>
                      )}
                      {quantumResult.job_id && <span>Job ID: {quantumResult.job_id}</span>}
                    </div>
                  )}
                  {quantumResult.instructions && (
                    <pre className="mt-2 text-[11px] text-[#92400E] bg-white/80 p-2.5 rounded-lg border border-[#FDE68A]/60 whitespace-pre-wrap font-mono">
                      {quantumResult.instructions}
                    </pre>
                  )}
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs font-mono">
                  <div className="p-3.5 rounded-xl bg-[#F8FAF7] border border-[#E5E7EB]">
                    <div className="text-[11px] font-medium text-[#64748B]">Qubits</div>
                    <div className="text-lg font-bold text-[#1F2937] mt-1">
                      {quantumResult.num_qubits} Qubits
                    </div>
                  </div>
                  <div className="p-3.5 rounded-xl bg-[#F8FAF7] border border-[#E5E7EB]">
                    <div className="text-[11px] font-medium text-[#64748B]">Circuit Depth</div>
                    <div className="text-lg font-bold text-[#14532D] mt-1">
                      {quantumResult.circuit_depth} ops
                    </div>
                  </div>
                  <div className="p-3.5 rounded-xl bg-[#F8FAF7] border border-[#E5E7EB]">
                    <div className="text-[11px] font-medium text-[#64748B]">Degradation Risk</div>
                    <div className="text-lg font-bold text-[#D97706] mt-1">
                      {quantumResult.molecular_degradation_risk}
                    </div>
                  </div>
                </div>

                {quantumResult.estimated_ground_state_energy_hartree !== 0 && (
                  <div className="p-3.5 rounded-xl bg-[#F8FAF7] border border-[#E5E7EB] flex justify-between items-center text-xs">
                    <span className="text-[#64748B] font-medium">Estimated Ground State Energy:</span>
                    <span className="font-mono font-bold text-[#14532D]">
                      {quantumResult.estimated_ground_state_energy_hartree} Hartree
                    </span>
                  </div>
                )}

                {Object.keys(quantumResult.measured_probabilities || {}).length > 0 && (
                  <div className="p-3.5 rounded-xl bg-[#F8FAF7] border border-[#E5E7EB] text-xs font-mono">
                    <div className="text-[10px] text-[#64748B] uppercase tracking-wider font-semibold mb-2">
                      Measured Bitstring Probabilities ({quantumResult.shots || 1024} shots)
                    </div>
                    <div className="max-h-28 overflow-y-auto grid grid-cols-2 gap-x-4 gap-y-1 text-[11px] text-[#14532D]">
                      {Object.entries(quantumResult.measured_probabilities).map(([bits, prob]) => (
                        <div key={bits} className="flex justify-between py-0.5 border-b border-[#E5E7EB]/50 last:border-b-0">
                          <span className="text-[#1F2937]">|{bits}⟩</span>
                          <span className="font-bold">{prob}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="p-3.5 rounded-xl bg-[#F8FAF7] border border-[#E5E7EB] text-xs font-mono">
                  <div className="text-[10px] text-[#64748B] uppercase tracking-wider font-semibold mb-2">
                    Gate Composition (H, CX, RZ, RX, MEASURE)
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(quantumResult.quantum_gate_counts).map(([gate, count]) => (
                      <span
                        key={gate}
                        className="px-2.5 py-1 rounded-md bg-white border border-[#E5E7EB] text-[#1F2937] text-xs font-semibold shadow-2xs"
                      >
                        {gate}: {count}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-16 text-[#64748B] text-xs flex flex-col items-center justify-center space-y-2">
                <Zap className="w-8 h-8 text-[#94A3B8]" />
                <p>Configure cathode chemistry and backend, then click Simulate to execute the circuit.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
