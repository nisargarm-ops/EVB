import React, { useState, useEffect } from 'react';
import { 
  Recycle, 
  Cpu, 
  Zap, 
  Leaf, 
  Sparkles, 
  CheckCircle2, 
  AlertTriangle, 
  TrendingUp, 
  Layers, 
  Play,
  ArrowRight,
  ShieldAlert
} from 'lucide-react';
import { DecisionRecommendation, PassportSummary, QpiAIOptResponse, QpiAIQuantumResponse, UserRole } from '../types';
import { api } from '../services/api';
import { HealthRing } from '../components/HealthRing';

interface CircularDecisionsPageProps {
  onSelectPassport: (id: string) => void;
  activeRole: UserRole;
  preselectedBatch?: string[];
}

export const CircularDecisionsPage: React.FC<CircularDecisionsPageProps> = ({
  onSelectPassport,
  activeRole,
  preselectedBatch = []
}) => {
  const [passports, setPassports] = useState<PassportSummary[]>([]);
  const [selectedBatteryId, setSelectedBatteryId] = useState<string>('BAT-NMC-8A2F91C0');
  const [decision, setDecision] = useState<DecisionRecommendation | null>(null);
  const [loadingDecision, setLoadingDecision] = useState(false);

  // QpiAI Opt State
  const [batchBatteries, setBatchBatteries] = useState<string[]>([
    'BAT-NMC-8A2F91C0',
    'BAT-LFP-3C7D410E',
    'BAT-NCA-F104A7B2'
  ]);
  const [optResult, setOptResult] = useState<QpiAIOptResponse | null>(null);
  const [optLoading, setOptLoading] = useState(false);

  // QpiAI Quantum State
  const [cathodeMaterial, setCathodeMaterial] = useState('NMC 811');
  const [quantumResult, setQuantumResult] = useState<QpiAIQuantumResponse | null>(null);
  const [quantumLoading, setQuantumLoading] = useState(false);

  useEffect(() => {
    const init = async () => {
      const list = await api.listPassports();
      setPassports(list);
      if (preselectedBatch.length > 0) {
        setBatchBatteries(preselectedBatch);
        setSelectedBatteryId(preselectedBatch[0]);
      } else if (list.length > 0) {
        setSelectedBatteryId(list[0].battery_id);
      }
    };
    init();
  }, [preselectedBatch]);

  useEffect(() => {
    if (!selectedBatteryId) return;
    const fetchDecision = async () => {
      setLoadingDecision(true);
      try {
        const d = await api.getDecisionRecommendation(selectedBatteryId);
        setDecision(d);
        if (d.chemistry) setCathodeMaterial(d.chemistry);
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingDecision(false);
      }
    };
    fetchDecision();
  }, [selectedBatteryId]);

  const handleRunOpt = async () => {
    setOptLoading(true);
    try {
      const res = await api.runQpiAIOpt(batchBatteries);
      setOptResult(res);
    } catch (err: any) {
      alert(err.message || 'Optimization request failed');
    } finally {
      setOptLoading(false);
    }
  };

  const handleRunQuantum = async () => {
    if (!decision) return;
    setQuantumLoading(true);
    try {
      const res = await api.runQpiAIQuantum(
        decision.battery_id,
        cathodeMaterial,
        decision.current_soh,
        decision.cycle_count
      );
      setQuantumResult(res);
    } catch (err: any) {
      alert(err.message || 'Quantum simulation request failed');
    } finally {
      setQuantumLoading(false);
    }
  };

  const getDecisionBadge = (rec: string) => {
    switch (rec) {
      case 'STATIONARY_BESS':
        return {
          title: 'Repurpose for Stationary BESS Grid Storage',
          color: 'bg-cyan-500/15 border-cyan-500/40 text-cyan-300',
          badge: 'bg-cyan-500 text-slate-950',
          desc: 'High residual capacity and low resistance make this pack ideal for solar/wind buffering and peak shaving.'
        };
      case 'CELL_RECONDITIONING':
        return {
          title: 'Remanufacture & Module Reconditioning',
          color: 'bg-amber-500/15 border-amber-500/40 text-amber-300',
          badge: 'bg-amber-500 text-slate-950',
          desc: 'Moderate degradation with salvageable module strings. Recommended for low-speed municipal utility vehicles.'
        };
      case 'DEEP_RECYCLING':
      default:
        return {
          title: 'Closed-Loop Deep Hydrometallurgical Recycling',
          color: 'bg-purple-500/15 border-purple-500/40 text-purple-300',
          badge: 'bg-purple-500 text-white',
          desc: 'Significant cell fatigue (<65% SoH). Certified hydrometallurgical dissolution yields >95% pure Cobalt, Nickel & Lithium.'
        };
    }
  };

  const recTheme = decision ? getDecisionBadge(decision.primary_recommendation) : null;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center space-x-2">
            <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/30">
              <Recycle className="w-5 h-5" />
            </div>
            <h1 className="text-2xl font-extrabold text-white">Reuse, Remanufacture & Recycling Triage</h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Algorithmic disposition decision matrix compliant with EU 2023/1542 Circular Economy guidelines.
          </p>
        </div>

        {/* Battery Selector */}
        <div className="flex items-center space-x-2">
          <span className="text-xs text-slate-400 font-semibold">Analyze Battery:</span>
          <select
            value={selectedBatteryId}
            onChange={e => setSelectedBatteryId(e.target.value)}
            className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-emerald-400 font-mono font-bold focus:outline-none"
          >
            {passports.map(p => (
              <option key={p.battery_id} value={p.battery_id}>
                {p.battery_id} ({p.chemistry} - {p.state_of_health_pct}%)
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Decision Summary Card */}
      {decision && recTheme && (
        <div className="glass-panel-glow rounded-3xl p-6 sm:p-8 border border-slate-800 space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-slate-800">
            <div className="flex items-start sm:items-center space-x-5">
              <HealthRing value={decision.current_soh} size={110} strokeWidth={9} subLabel="SoH" />
              <div className="space-y-1">
                <div className="flex items-center space-x-2">
                  <span className="font-mono text-xs font-bold text-emerald-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                    {decision.battery_id}
                  </span>
                  <span className="text-xs font-semibold text-slate-300">{decision.chemistry}</span>
                </div>
                <h2 className="text-xl sm:text-2xl font-extrabold text-white">{recTheme.title}</h2>
                <p className="text-xs text-slate-300 max-w-xl">{recTheme.desc}</p>
              </div>
            </div>

            <div className="flex flex-col items-start md:items-end justify-center space-y-1.5 flex-shrink-0">
              <span className="text-xs text-slate-400">Decision Confidence</span>
              <div className="text-2xl font-black text-emerald-400 font-mono">
                {Math.round(decision.confidence_score * 100)}%
              </div>
              <span className="text-[10px] font-mono text-slate-400">EU Annex VII Rule-Set #03</span>
            </div>
          </div>

          {/* Value and Carbon Impact Badges */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-xs font-mono">
            <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
              <div className="text-slate-400 font-sans text-[11px] flex items-center space-x-1.5 mb-1">
                <Leaf className="w-3.5 h-3.5 text-emerald-400" />
                <span>Avoided Carbon Footprint</span>
              </div>
              <div className="text-xl font-extrabold text-emerald-400">
                {decision.avoided_co2_kg} <span className="text-xs font-sans">kg CO₂e</span>
              </div>
              <p className="text-[10px] text-slate-500 font-sans mt-0.5">vs virgin cell manufacturing</p>
            </div>

            <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
              <div className="text-slate-400 font-sans text-[11px] flex items-center space-x-1.5 mb-1">
                <TrendingUp className="w-3.5 h-3.5 text-cyan-400" />
                <span>Recoverable Economic Value</span>
              </div>
              <div className="text-xl font-extrabold text-cyan-400">
                €{decision.material_recovery_value_eur}
              </div>
              <p className="text-[10px] text-slate-500 font-sans mt-0.5">Residual market value / recovery</p>
            </div>

            <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
              <div className="text-slate-400 font-sans text-[11px] flex items-center space-x-1.5 mb-1">
                <Zap className="w-3.5 h-3.5 text-amber-400" />
                <span>Secondary Service Life</span>
              </div>
              <div className="text-xl font-extrabold text-white">
                {decision.estimated_second_life_years} <span className="text-xs font-sans">years</span>
              </div>
              <p className="text-[10px] text-slate-500 font-sans mt-0.5">Stationary duty projection</p>
            </div>

            <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
              <div className="text-slate-400 font-sans text-[11px] flex items-center space-x-1.5 mb-1">
                <Layers className="w-3.5 h-3.5 text-purple-400" />
                <span>Residual Capacity</span>
              </div>
              <div className="text-xl font-extrabold text-slate-200">
                {decision.residual_capacity_kwh} <span className="text-xs font-sans">kWh</span>
              </div>
              <p className="text-[10px] text-slate-500 font-sans mt-0.5">Remaining usable energy</p>
            </div>
          </div>

          {/* Rationale Bullet Points */}
          <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-2">
            <div className="text-xs font-bold text-slate-300 uppercase tracking-wider">
              Diagnostic Decision Rationale:
            </div>
            <ul className="space-y-1.5 text-xs text-slate-300">
              {decision.rationale.map((r, i) => (
                <li key={i} className="flex items-start space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                  <span>{r}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Two Specialized Advanced Computing Modules: QpiAI-Opt & QpiAI Quantum */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Module 1: QpiAI-Opt Solver */}
        <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center space-x-2">
              <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
                <Cpu className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">QpiAI-Opt: Reverse Logistics Allocation</h3>
                <p className="text-[11px] text-slate-400">Quadratic Unconstrained Binary Optimization (QUBO)</p>
              </div>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 font-bold">
              QUBO ENGINE
            </span>
          </div>

          <p className="text-xs text-slate-300 leading-relaxed">
            Formulates multi-battery reverse logistics routing across Stationary BESS, Reconditioning, and Deep Recycling facilities 
            minimizing transportation carbon penalty and degradation costs.
          </p>

          <div className="space-y-2">
            <label className="text-xs text-slate-400 block font-semibold">Included Batch Passports:</label>
            <div className="flex flex-wrap gap-2">
              {batchBatteries.map(id => (
                <span key={id} className="font-mono text-xs px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-cyan-300">
                  {id}
                </span>
              ))}
            </div>
          </div>

          <button
            onClick={handleRunOpt}
            disabled={optLoading}
            className="w-full flex items-center justify-center space-x-2 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs shadow-md shadow-cyan-500/20 transition-all disabled:opacity-50"
          >
            <Play className="w-4 h-4 fill-current" />
            <span>{optLoading ? 'Formulating QUBO & Dispatching...' : 'Run QpiAI-Opt Multi-Pack Allocation'}</span>
          </button>

          {optResult && (
            <div className="p-4 rounded-xl bg-slate-950 border border-cyan-500/30 space-y-3 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-emerald-400 font-bold">STATUS: {optResult.status}</span>
                <span className="font-mono text-slate-400">{optResult.num_variables} Binary Vars · {optResult.qubo_edges_count} Edges</span>
              </div>
              {optResult.recommended_allocations && (
                <div className="space-y-1 font-mono text-[11px] border-t border-slate-800 pt-2">
                  <div className="text-slate-400 font-sans text-xs mb-1 font-bold">Optimized Pathway Allocations:</div>
                  {Object.entries(optResult.recommended_allocations).map(([bId, dest]) => (
                    <div key={bId} className="flex justify-between py-0.5">
                      <span className="text-slate-300">{bId}:</span>
                      <strong className="text-cyan-400 uppercase">{dest.replace('_', ' ')}</strong>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Module 2: QpiAI Quantum Simulation */}
        <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center space-x-2">
              <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                <Zap className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">QpiAI Quantum: Cathode Chemistry Simulation</h3>
                <p className="text-[11px] text-slate-400">4-Qubit Parameterized Variational Trial Ansatz</p>
              </div>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-bold">
              QPU ANSATZ
            </span>
          </div>

          <p className="text-xs text-slate-300 leading-relaxed">
            Constructs and executes quantum trial circuits modeling molecular d-orbital electron configurations and oxygen ligand entanglement 
            to predict microscopic lattice distortion.
          </p>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <label className="text-slate-400 block mb-1">Cathode Chemistry</label>
              <select
                value={cathodeMaterial}
                onChange={e => setCathodeMaterial(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2 text-xs text-white"
              >
                <option value="NMC 811">NMC 811</option>
                <option value="LFP">LFP</option>
                <option value="NCA">NCA</option>
              </select>
            </div>
            <div>
              <label className="text-slate-400 block mb-1">Target Pack</label>
              <div className="font-mono text-xs p-2 rounded-xl bg-slate-900 border border-slate-800 text-emerald-400 truncate">
                {selectedBatteryId}
              </div>
            </div>
          </div>

          <button
            onClick={handleRunQuantum}
            disabled={quantumLoading}
            className="w-full flex items-center justify-center space-x-2 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-md shadow-emerald-500/20 transition-all disabled:opacity-50"
          >
            <Zap className="w-4 h-4 fill-current" />
            <span>{quantumLoading ? 'Synthesizing Quantum Circuit...' : 'Simulate Cathode Degradation'}</span>
          </button>

          {quantumResult && (
            <div className="p-4 rounded-xl bg-slate-950 border border-emerald-500/30 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-emerald-400 font-bold">STATUS: {quantumResult.status}</span>
                <span className="font-mono text-slate-400">{quantumResult.num_qubits} Qubits · {quantumResult.circuit_depth} Ops</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-slate-300 pt-1 border-t border-slate-800 font-mono text-[11px]">
                <div>Ground Energy: <strong className="text-emerald-400">{quantumResult.estimated_ground_state_energy_hartree} Ha</strong></div>
                <div>Degradation Risk: <strong className="text-amber-400">{quantumResult.molecular_degradation_risk}</strong></div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
