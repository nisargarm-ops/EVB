import React, { useState, useEffect } from 'react';
import {
  Cpu,
  Zap,
  CheckCircle2,
  AlertTriangle,
  Play,
  AlertCircle,
  ShieldCheck,
  RefreshCw,
} from 'lucide-react';
import {
  IntegrationsStatusResponse,
  OptimizationRunResponse,
  PredefinedQuantumExperiment,
  QuantumRunResponse,
  SupportedQpiAIBackend,
  UserRole,
} from '../types';
import { api } from '../services/api';

interface QpiAIConsoleProps {
  activeRole: UserRole;
}

export const QpiAIConsole: React.FC<QpiAIConsoleProps> = () => {
  const [activeTab, setActiveTab] = useState<'opt' | 'quantum'>('opt');
  const [statusData, setStatusData] = useState<IntegrationsStatusResponse | null>(null);
  const [statusLoading, setStatusLoading] = useState(false);

  const [availableBatteries, setAvailableBatteries] = useState<string[]>([
    'BAT-NMC-8A2F91C0',
    'BAT-LFP-3C7D410E',
    'BAT-NCA-F104A7B2',
  ]);

  // QpiAI Opt Disposition State
  const [selectedBatteries, setSelectedBatteries] = useState<string[]>([
    'BAT-NMC-8A2F91C0',
    'BAT-LFP-3C7D410E',
    'BAT-NCA-F104A7B2',
  ]);
  const [bessSlotCap, setBessSlotCap] = useState<number>(2);
  const [reuseSlotCap, setReuseSlotCap] = useState<number>(2);
  const [flagThermalOnLast, setFlagThermalOnLast] = useState<boolean>(false);
  const [allowOptDemo, setAllowOptDemo] = useState<boolean>(false);
  const [optResult, setOptResult] = useState<OptimizationRunResponse | null>(null);
  const [optLoading, setOptLoading] = useState(false);
  const [optError, setOptError] = useState<string | null>(null);

  // QpiAI QCloud State
  const [experimentType, setExperimentType] =
    useState<PredefinedQuantumExperiment>('telemetry_anomaly_ising');
  const [quantumBackend, setQuantumBackend] =
    useState<SupportedQpiAIBackend>('QpiAI-QSV-Local');
  const [shots, setShots] = useState<number>(1024);
  const [allowQuantumDemo, setAllowQuantumDemo] = useState<boolean>(false);
  const [quantumResult, setQuantumResult] = useState<QuantumRunResponse | null>(null);
  const [quantumLoading, setQuantumLoading] = useState(false);
  const [quantumError, setQuantumError] = useState<string | null>(null);

  const loadIntegrationStatus = async () => {
    setStatusLoading(true);
    try {
      const s = await api.getIntegrationsStatus();
      setStatusData(s);
    } catch {
      // Non-fatal UI status refresh
    } finally {
      setStatusLoading(false);
    }
  };

  useEffect(() => {
    loadIntegrationStatus();
    api
      .listPassports()
      .then(list => {
        if (list.length > 0) {
          setAvailableBatteries(list.map(p => p.battery_id));
        }
      })
      .catch(() => {});
  }, []);

  const handleRunOpt = async () => {
    setOptLoading(true);
    setOptError(null);
    try {
      const flags =
        flagThermalOnLast && selectedBatteries.length > 0
          ? {
              [selectedBatteries[selectedBatteries.length - 1]]: {
                thermal_event_detected: true,
              },
            }
          : undefined;

      const res = await api.runDispositionOptimization({
        battery_ids: selectedBatteries,
        pathway_capacities: {
          direct_reuse: reuseSlotCap,
          second_life_bess: bessSlotCap,
          remanufacturing: selectedBatteries.length,
          material_recycling: selectedBatteries.length,
        },
        inspection_flags_by_battery: flags,
        allow_demo_fallback: allowOptDemo,
      });
      setOptResult(res);
    } catch (err: any) {
      setOptError(err.message || 'Optimization request failed');
    } finally {
      setOptLoading(false);
    }
  };

  const handleRunQuantum = async () => {
    setQuantumLoading(true);
    setQuantumError(null);
    try {
      const res = await api.runQuantumExperiment({
        experiment_type: experimentType,
        battery_ids: selectedBatteries.slice(0, 2),
        backend: quantumBackend,
        shots,
        allow_demo_simulation: allowQuantumDemo,
      });
      setQuantumResult(res);
    } catch (err: any) {
      setQuantumError(err.message || 'Quantum experiment failed');
    } finally {
      setQuantumLoading(false);
    }
  };

  const statusBadgeClass = (state?: string) => {
    switch (state) {
      case 'configured_and_reachable':
        return 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30';
      case 'simulator_only':
        return 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30';
      case 'demo_mode':
        return 'bg-amber-500/15 text-amber-300 border-amber-500/30';
      case 'missing_credentials':
      case 'configured_but_unavailable':
        return 'bg-slate-800 text-slate-300 border-slate-700';
      default:
        return 'bg-rose-500/15 text-rose-300 border-rose-500/30';
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center space-x-2">
            <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
              <Cpu className="w-5 h-5" />
            </div>
            <h1 className="text-2xl font-extrabold text-white">
              QpiAI Optimization & QCloud Quantum Studio
            </h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Distinct workflows: <span className="text-cyan-400 font-semibold">QpiAI Opt</span>{' '}
            constrained disposition optimization vs{' '}
            <span className="text-emerald-400 font-semibold">QpiAI QCloud</span> quantum circuit
            execution
          </p>
        </div>

        {/* Studio Switcher */}
        <div className="flex p-1 rounded-xl bg-slate-900 border border-slate-800">
          <button
            onClick={() => setActiveTab('opt')}
            className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'opt'
                ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            1. QpiAI Opt (Disposition)
          </button>
          <button
            onClick={() => setActiveTab('quantum')}
            className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'quantum'
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            2. QpiAI QCloud (Quantum SDK)
          </button>
        </div>
      </div>

      {/* Integration Status Bar (/api/integrations/status) */}
      {statusData && (
        <div className="glass-panel rounded-2xl p-4 border border-slate-800 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-start justify-between gap-3 p-3 rounded-xl bg-slate-900/70 border border-slate-800">
            <div className="space-y-1 text-xs">
              <div className="font-bold text-slate-200">{statusData.qpiai_opt.service_name}</div>
              <p className="text-slate-400 text-[11px]">{statusData.qpiai_opt.diagnostic_message}</p>
            </div>
            <span
              className={`px-2.5 py-1 rounded-md border font-mono text-[10px] whitespace-nowrap ${statusBadgeClass(
                statusData.qpiai_opt.status
              )}`}
            >
              {statusData.qpiai_opt.status}
            </span>
          </div>

          <div className="flex items-start justify-between gap-3 p-3 rounded-xl bg-slate-900/70 border border-slate-800">
            <div className="space-y-1 text-xs">
              <div className="font-bold text-slate-200">{statusData.qpiai_qcloud.service_name}</div>
              <p className="text-slate-400 text-[11px]">
                {statusData.qpiai_qcloud.diagnostic_message}
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <span
                className={`px-2.5 py-1 rounded-md border font-mono text-[10px] whitespace-nowrap ${statusBadgeClass(
                  statusData.qpiai_qcloud.status
                )}`}
              >
                {statusData.qpiai_qcloud.status}
              </span>
              <button
                onClick={loadIntegrationStatus}
                disabled={statusLoading}
                title="Refresh Integration Status"
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${statusLoading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 1: QpiAI Opt View */}
      {activeTab === 'opt' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Controls */}
          <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-5">
            <div>
              <h3 className="text-base font-bold text-white">
                Constrained Battery Disposition Model (QpiAI Opt)
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Evaluates trusted passport condition, chemistry, hard safety gates, and facility
                slot limits across Direct Reuse, Second-Life BESS, Remanufacturing, and Recycling.
              </p>
            </div>

            {optError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
                <span>{optError}</span>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-xs text-slate-400 block font-semibold">
                Select Trusted Registry Passports
              </label>
              {availableBatteries.map(id => (
                <label
                  key={id}
                  className="flex items-center space-x-2 text-xs font-mono text-slate-300 p-2 rounded-lg bg-slate-900 border border-slate-800 cursor-pointer"
                >
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
                </label>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <label className="text-slate-400 block mb-1">Direct Reuse Slot Limit</label>
                <input
                  type="number"
                  min={0}
                  max={12}
                  value={reuseSlotCap}
                  onChange={e => setReuseSlotCap(parseInt(e.target.value, 10) || 0)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2 text-white font-mono"
                />
              </div>
              <div>
                <label className="text-slate-400 block mb-1">Second-Life BESS Slot Limit</label>
                <input
                  type="number"
                  min={0}
                  max={12}
                  value={bessSlotCap}
                  onChange={e => setBessSlotCap(parseInt(e.target.value, 10) || 0)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2 text-white font-mono"
                />
              </div>
            </div>

            <div className="space-y-2 pt-1">
              <label className="flex items-center space-x-2 text-xs text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={flagThermalOnLast}
                  onChange={e => setFlagThermalOnLast(e.target.checked)}
                  className="rounded bg-slate-800 border-slate-700 text-rose-500"
                />
                <span>
                  Flag safety inspection thermal hazard on last selected battery (tests hard safety
                  gate)
                </span>
              </label>

              <label className="flex items-center space-x-2 text-xs text-amber-300/90 cursor-pointer">
                <input
                  type="checkbox"
                  checked={allowOptDemo}
                  onChange={e => setAllowOptDemo(e.target.checked)}
                  className="rounded bg-slate-800 border-slate-700 text-amber-500"
                />
                <span>
                  Allow labelled local reference fallback when QpiAI Opt cloud credentials are
                  missing
                </span>
              </label>
            </div>

            <button
              onClick={handleRunOpt}
              disabled={optLoading || selectedBatteries.length === 0}
              className="w-full flex items-center justify-center space-x-2 py-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs shadow-lg shadow-cyan-500/20 transition-all disabled:opacity-50 cursor-pointer"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>
                {optLoading ? 'Evaluating Constraints & QUBO...' : 'Run Disposition Optimization'}
              </span>
            </button>
          </div>

          {/* Results Console */}
          <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4">
            <h3 className="text-sm font-bold text-slate-200">Optimization Decision & Telemetry</h3>

            {optResult ? (
              <div className="space-y-4 text-xs">
                <div
                  className={`p-4 rounded-xl border flex items-start space-x-3 ${
                    optResult.is_live_qpiai_execution
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                      : optResult.is_demo
                        ? 'bg-amber-500/10 border-amber-500/30 text-amber-200'
                        : 'bg-slate-900 border-slate-700 text-slate-300'
                  }`}
                >
                  {optResult.is_live_qpiai_execution ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                  ) : (
                    <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0" />
                  )}
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2 font-mono font-bold">
                      <span>STATUS: {optResult.solver_status}</span>
                      <span className="px-2 py-0.5 rounded bg-slate-950/70 text-[10px]">
                        {optResult.is_live_qpiai_execution
                          ? 'LIVE QPIAI OPT CLOUD'
                          : optResult.is_demo
                            ? 'DEMO LOCAL REFERENCE'
                            : 'UNEXECUTED / FORMULATED'}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-400 font-mono">
                      Solver: {optResult.solver_name}
                    </div>
                    <p className="text-slate-300">{optResult.message}</p>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 font-mono">
                  <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                    <div className="text-[10px] text-slate-500">QUBO Variables</div>
                    <div className="text-sm font-bold text-white mt-0.5">
                      {optResult.qubo_metadata.num_binary_variables}
                    </div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                    <div className="text-[10px] text-slate-500">QUBO Edges</div>
                    <div className="text-sm font-bold text-cyan-400 mt-0.5">
                      {optResult.qubo_metadata.num_qubo_edges}
                    </div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                    <div className="text-[10px] text-slate-500">Data Completeness</div>
                    <div className="text-sm font-bold text-emerald-400 mt-0.5">
                      {optResult.data_completeness.overall_completeness_pct}%
                    </div>
                  </div>
                </div>

                {/* Selected Pathways */}
                {optResult.allocations.length > 0 && (
                  <div className="space-y-2">
                    <div className="font-bold text-slate-300">Battery Pathway Decisions</div>
                    {optResult.allocations.map(alloc => (
                      <div
                        key={alloc.battery_id}
                        className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-mono font-bold text-white">{alloc.battery_id}</span>
                          <span className="px-2 py-0.5 rounded bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 font-mono text-[11px]">
                            {alloc.selected_pathway || 'UNASSIGNED'}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400">{alloc.rationale}</p>
                      </div>
                    ))}
                  </div>
                )}

                {/* Constraints Summary */}
                {optResult.constraints_considered.length > 0 && (
                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5">
                    <div className="text-[10px] uppercase tracking-wider text-slate-500 font-mono">
                      Hard Safety & Configurable Constraints
                    </div>
                    {optResult.constraints_considered.map(c => (
                      <div
                        key={c.constraint_id}
                        className="flex items-start justify-between gap-2 text-[11px]"
                      >
                        <span className="text-slate-300">
                          <strong className="font-mono text-slate-200">{c.constraint_id}:</strong>{' '}
                          {c.details}
                        </span>
                        <span
                          className={`font-mono font-bold ${
                            c.satisfied ? 'text-emerald-400' : 'text-rose-400'
                          }`}
                        >
                          {c.satisfied ? 'OK' : 'VIOLATED'}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {optResult.data_completeness.warnings.length > 0 && (
                  <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-200 space-y-1">
                    <div className="font-bold">Data Completeness & Audit Warnings:</div>
                    {optResult.data_completeness.warnings.map((w, idx) => (
                      <div key={idx}>• {w}</div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-14 text-slate-500 text-xs">
                Configure battery batch & slot constraints, then click Run Disposition Optimization.
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: QpiAI QCloud Quantum View */}
      {activeTab === 'quantum' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Controls */}
          <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-5">
            <div>
              <h3 className="text-base font-bold text-white">
                Predefined Quantum Circuit Experiments (QpiAI QCloud)
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Executes bounded, documented 2–4 qubit circuits via the official{' '}
                <code className="text-emerald-400">qpiai-quantum</code> SDK. Strictly separated from
                classical disposition optimization.
              </p>
            </div>

            {quantumError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
                <span>{quantumError}</span>
              </div>
            )}

            <div className="space-y-4 text-xs">
              <div>
                <label className="text-slate-400 block mb-1 font-semibold">
                  Predefined Experiment Type
                </label>
                <select
                  value={experimentType}
                  onChange={e =>
                    setExperimentType(e.target.value as PredefinedQuantumExperiment)
                  }
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-white"
                >
                  <option value="telemetry_anomaly_ising">
                    4-Qubit Telemetry Angle Encoding (telemetry_anomaly_ising)
                  </option>
                  <option value="toy_disposition_ising_2pack">
                    2-Qubit Toy BESS Slot Ising Coupling (toy_disposition_ising_2pack)
                  </option>
                  <option value="bell_calibration_check">
                    2-Qubit Bell State Readout Calibration (bell_calibration_check)
                  </option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-slate-400 block mb-1 font-semibold">
                    QpiAI Backend Target
                  </label>
                  <select
                    value={quantumBackend}
                    onChange={e =>
                      setQuantumBackend(e.target.value as SupportedQpiAIBackend)
                    }
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-white font-mono text-[11px]"
                  >
                    <option value="QpiAI-QSV-Local">QpiAI-QSV-Local (SDK Sim)</option>
                    <option value="QpiAI-QSV-Simulator">QpiAI-QSV-Simulator (Cloud Sim)</option>
                    <option value="QpiAI-QDM-Simulator">QpiAI-QDM-Simulator (Density Sim)</option>
                    <option value="QpiAI-QTN-Simulator">QpiAI-QTN-Simulator (Tensor Sim)</option>
                    <option value="QpiAI-Indus-1">QpiAI-Indus-1 (Physical QPU)</option>
                  </select>
                </div>

                <div>
                  <label className="text-slate-400 block mb-1 font-semibold">
                    Bounded Shots (64–4096)
                  </label>
                  <input
                    type="number"
                    min={64}
                    max={4096}
                    step={64}
                    value={shots}
                    onChange={e => setShots(parseInt(e.target.value, 10) || 1024)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-white font-mono"
                  />
                </div>
              </div>

              <label className="flex items-center space-x-2 text-xs text-amber-300/90 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={allowQuantumDemo}
                  onChange={e => setAllowQuantumDemo(e.target.checked)}
                  className="rounded bg-slate-800 border-slate-700 text-amber-500"
                />
                <span>
                  Allow labelled local educational statevector demo when QPIAI_QUANTUM_API_KEY is
                  absent
                </span>
              </label>
            </div>

            <button
              onClick={handleRunQuantum}
              disabled={quantumLoading}
              className="w-full flex items-center justify-center space-x-2 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-lg shadow-emerald-500/20 transition-all disabled:opacity-50 cursor-pointer"
            >
              <Zap className="w-4 h-4 fill-current" />
              <span>
                {quantumLoading ? 'Executing Quantum Circuit...' : 'Run Quantum Experiment'}
              </span>
            </button>
          </div>

          {/* Quantum Results Console */}
          <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4">
            <h3 className="text-sm font-bold text-slate-200">
              Quantum Measurement & Provenance Telemetry
            </h3>

            {quantumResult ? (
              <div className="space-y-4 text-xs">
                <div
                  className={`p-4 rounded-xl border space-y-1.5 ${
                    quantumResult.execution_status === 'CLOUD_COMPLETED'
                      ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200'
                      : quantumResult.execution_status === 'SIMULATOR_COMPLETED'
                        ? 'border-cyan-500/40 bg-cyan-500/10 text-cyan-200'
                        : quantumResult.is_demo
                          ? 'border-amber-500/40 bg-amber-500/10 text-amber-200'
                          : 'border-slate-700 bg-slate-900 text-slate-300'
                  }`}
                >
                  <div className="flex flex-wrap items-center gap-2 font-mono font-bold">
                    <span>STATUS: {quantumResult.execution_status}</span>
                    <span className="px-2 py-0.5 rounded bg-slate-950/80 text-[10px]">
                      {quantumResult.is_demo
                        ? 'DEMO LOCAL SIMULATION'
                        : quantumResult.is_cloud_execution && !quantumResult.is_simulated
                          ? 'CLOUD HARDWARE QPU'
                          : quantumResult.is_simulated
                            ? 'SIMULATED EXECUTION'
                            : 'UNEXECUTED'}
                    </span>
                  </div>
                  <div className="font-mono text-[11px] text-slate-400">
                    Backend Used: {quantumResult.backend_used || 'none (not executed)'}
                  </div>
                  <p className="text-slate-300">{quantumResult.message}</p>
                </div>

                <div className="p-3 rounded-xl bg-slate-900/70 border border-slate-800 space-y-1">
                  <div className="font-bold text-slate-200 flex items-center space-x-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    <span>{quantumResult.experiment_title}</span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    {quantumResult.scientific_purpose_and_limits}
                  </p>
                </div>

                <div className="grid grid-cols-3 gap-2 font-mono">
                  <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                    <div className="text-[10px] text-slate-500">Qubits</div>
                    <div className="text-sm font-bold text-white mt-0.5">
                      {quantumResult.circuit_summary.num_qubits}q /{' '}
                      {quantumResult.circuit_summary.num_clbits}c
                    </div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                    <div className="text-[10px] text-slate-500">Circuit Depth</div>
                    <div className="text-sm font-bold text-emerald-400 mt-0.5">
                      {quantumResult.circuit_summary.circuit_depth}
                    </div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                    <div className="text-[10px] text-slate-500">Measured Time</div>
                    <div className="text-sm font-bold text-cyan-400 mt-0.5">
                      {quantumResult.execution_time_ms !== null
                        ? `${quantumResult.execution_time_ms} ms`
                        : 'N/A'}
                    </div>
                  </div>
                </div>

                {/* Qubit Encoding Map */}
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 font-mono text-[11px] space-y-1">
                  <div className="text-[10px] text-slate-500 uppercase tracking-wider">
                    Qubit & Parameter Mapping
                  </div>
                  {Object.entries(quantumResult.variable_encoding_map).map(([k, desc]) => (
                    <div key={k} className="text-slate-300">
                      <span className="text-emerald-400 font-bold">{k}:</span> {desc}
                    </div>
                  ))}
                </div>

                {/* Measurement Counts */}
                {quantumResult.measurement_counts ? (
                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 font-mono">
                    <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-2">
                      Measurement Counts ({quantumResult.shots_requested} shots)
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {Object.entries(quantumResult.measurement_counts).map(([bitstr, cnt]) => (
                        <div
                          key={bitstr}
                          className="p-2 rounded bg-slate-900 border border-slate-800 flex items-center justify-between text-[11px]"
                        >
                          <span className="text-emerald-400 font-bold">|{bitstr}⟩</span>
                          <span className="text-slate-200">{cnt}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="p-3 rounded-xl bg-slate-900/50 border border-slate-800 text-[11px] text-slate-400 font-mono">
                    Measurement counts: null (Zero fabricated outcomes when unauthenticated or
                    unexecuted).
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-14 text-slate-500 text-xs">
                Select a predefined experiment and click Run Quantum Experiment.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
