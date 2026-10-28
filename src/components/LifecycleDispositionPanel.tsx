import React, { useState, useEffect } from 'react';
import { 
  GitBranch, 
  CheckCircle, 
  ArrowRight, 
  Sparkles, 
  ShieldCheck, 
  AlertTriangle, 
  TrendingUp, 
  Euro, 
  Leaf,
  Layers,
  Wrench,
  RotateCcw
} from 'lucide-react';
import { LifecycleStatus, VALID_LIFECYCLE_TRANSITIONS, DispositionDecision, UserRole } from '../types';
import { api } from '../services/api';

interface LifecycleDispositionPanelProps {
  batteryId: string;
  currentStatus: LifecycleStatus;
  activeRole: UserRole;
  onStatusUpdated: () => void;
}

const ALL_STATES: { id: LifecycleStatus; label: string; stage: string }[] = [
  { id: 'MANUFACTURED', label: 'Manufactured', stage: 'Genesis' },
  { id: 'IN_SERVICE', label: 'In Service', stage: 'First Life' },
  { id: 'INSPECTION', label: 'Inspection', stage: 'Diagnostics' },
  { id: 'REPAIR', label: 'Repair', stage: 'Maintenance' },
  { id: 'SECOND_LIFE_ASSESSMENT', label: '2nd Life Assessment', stage: 'Triage' },
  { id: 'SECOND_LIFE', label: 'Second Life (BESS)', stage: 'Repurposed' },
  { id: 'REMANUFACTURED', label: 'Remanufactured', stage: 'Circularity' },
  { id: 'END_OF_LIFE', label: 'End of Life', stage: 'Decommissioned' },
  { id: 'RECYCLED', label: 'Recycled', stage: 'Terminal Recovery' },
];

export const LifecycleDispositionPanel: React.FC<LifecycleDispositionPanelProps> = ({
  batteryId,
  currentStatus,
  activeRole,
  onStatusUpdated
}) => {
  const [decision, setDecision] = useState<DispositionDecision | null>(null);
  const [loadingDecision, setLoadingDecision] = useState(false);
  const [showTransitionModal, setShowTransitionModal] = useState(false);
  const [targetState, setTargetState] = useState<LifecycleStatus>('INSPECTION');
  const [transitionReason, setTransitionReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const allowedTransitions = VALID_LIFECYCLE_TRANSITIONS[currentStatus] || [];

  const loadDecision = async () => {
    setLoadingDecision(true);
    try {
      const res = await api.getDispositionDecision(batteryId);
      setDecision(res);
    } catch (err: any) {
      console.error('Decision API error:', err);
    } finally {
      setLoadingDecision(false);
    }
  };

  useEffect(() => {
    loadDecision();
    if (allowedTransitions.length > 0) {
      setTargetState(allowedTransitions[0]);
    }
  }, [batteryId, currentStatus]);

  const handleExecuteTransition = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await api.transitionLifecycle(batteryId, targetState, transitionReason || 'Authorized lifecycle state change');
      setShowTransitionModal(false);
      setTransitionReason('');
      onStatusUpdated();
    } catch (err: any) {
      setError(err.message || 'State transition failed');
    } finally {
      setSubmitting(false);
    }
  };

  const getPathwayBadge = (pathway: DispositionDecision['recommended_pathway']) => {
    switch (pathway) {
      case 'REUSE_DIRECT':
        return { label: 'Direct EV Reuse', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30' };
      case 'SECOND_LIFE_BESS':
        return { label: 'Stationary BESS Second-Life', color: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30' };
      case 'REMANUFACTURE':
        return { label: 'Module Remanufacture', color: 'text-amber-400 bg-amber-500/10 border-amber-500/30' };
      case 'RECYCLE':
        return { label: 'Closed-Loop Hydrometallurgy', color: 'text-purple-400 bg-purple-500/10 border-purple-500/30' };
    }
  };

  return (
    <div className="glass-panel rounded-2xl p-6 border border-slate-800 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <GitBranch className="w-5 h-5 text-emerald-400" />
            <h3 className="text-base font-bold text-white">Lifecycle State Machine & Disposition Engine</h3>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Enforces validated state transitions according to EU 2023/1542 Circular Economy Annex VII. Arbitrary skips are blocked.
          </p>
        </div>

        {activeRole !== 'PUBLIC' && allowedTransitions.length > 0 && (
          <button
            onClick={() => setShowTransitionModal(!showTransitionModal)}
            className="flex items-center space-x-2 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-all"
          >
            <Wrench className="w-3.5 h-3.5 text-cyan-400" />
            <span>Advance Lifecycle State</span>
          </button>
        )}
      </div>

      {error && (
        <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center space-x-2">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* State Transition Modal / Form */}
      {showTransitionModal && (
        <form onSubmit={handleExecuteTransition} className="p-5 rounded-2xl bg-slate-900 border border-cyan-500/30 space-y-4">
          <div className="text-xs font-bold text-cyan-400 uppercase tracking-wider flex items-center space-x-1.5">
            <GitBranch className="w-4 h-4" />
            <span>Validated Lifecycle Transition Protocol</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="text-slate-400 block mb-1">Current Battery State</label>
              <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-emerald-400 font-bold font-mono">
                {currentStatus.replace('_', ' ')}
              </div>
            </div>

            <div>
              <label className="text-slate-400 block mb-1">Authorized Target State *</label>
              <select
                value={targetState}
                onChange={e => setTargetState(e.target.value as LifecycleStatus)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white focus:outline-none"
              >
                {allowedTransitions.map(st => (
                  <option key={st} value={st}>
                    {st.replace('_', ' ')}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs text-slate-400 block mb-1">State Transition Audit Rationale *</label>
            <input
              type="text"
              required
              placeholder="e.g. Battery reached 75% SoH threshold; qualified for Stationary Energy Storage repurposing"
              value={transitionReason}
              onChange={e => setTransitionReason(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-xs text-white focus:outline-none"
            />
          </div>

          <div className="flex justify-end space-x-2">
            <button
              type="button"
              onClick={() => setShowTransitionModal(false)}
              className="px-3.5 py-1.5 rounded-lg bg-slate-800 text-slate-300 text-xs"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs"
            >
              {submitting ? 'Verifying Transition...' : 'Confirm & Commit State'}
            </button>
          </div>
        </form>
      )}

      {/* State Machine Visualizer */}
      <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800/80">
        <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-3">
          Lifecycle Progression Map
        </div>
        <div className="grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-9 gap-2">
          {ALL_STATES.map((s, idx) => {
            const isCurrent = s.id === currentStatus;
            const isAllowed = allowedTransitions.includes(s.id);
            return (
              <div
                key={s.id}
                className={`p-2.5 rounded-xl border text-center transition-all ${
                  isCurrent
                    ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300 shadow-md shadow-emerald-500/10'
                    : isAllowed
                    ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-300 hover:border-cyan-400'
                    : 'bg-slate-900/40 border-slate-800/60 text-slate-500 opacity-60'
                }`}
              >
                <div className="text-[9px] font-mono uppercase tracking-wider text-slate-400 truncate">
                  {s.stage}
                </div>
                <div className="text-xs font-bold mt-1 truncate">{s.label}</div>
                {isCurrent && (
                  <span className="inline-block mt-1.5 text-[9px] font-bold px-1.5 py-0.2 rounded bg-emerald-500/30 text-emerald-300">
                    Active
                  </span>
                )}
                {isAllowed && (
                  <span className="inline-block mt-1.5 text-[9px] font-medium px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-400">
                    Next Path
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Algorithmic Disposition Recommendations (/api/decisions/{battery_id}) */}
      {decision && (
        <div className="p-5 rounded-2xl bg-gradient-to-br from-slate-900/90 to-slate-950 border border-cyan-500/25 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
            <div className="flex items-center space-x-2">
              <Sparkles className="w-4 h-4 text-cyan-400" />
              <h4 className="text-sm font-bold text-white">Algorithmic End-of-First-Life Disposition Recommendation</h4>
            </div>
            <div className="flex items-center space-x-2">
              <span className={`px-2.5 py-1 rounded-lg text-xs font-bold border ${getPathwayBadge(decision.recommended_pathway).color}`}>
                {getPathwayBadge(decision.recommended_pathway).label}
              </span>
              <span className="text-xs font-mono text-slate-400">
                Confidence: {Math.round(decision.pathway_confidence_score * 100)}%
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800/80">
              <div className="text-slate-500 flex items-center space-x-1">
                <Euro className="w-3 h-3 text-emerald-400" />
                <span>Estimated Residual Value</span>
              </div>
              <div className="text-lg font-bold font-mono text-emerald-400 mt-1">
                €{decision.residual_value_eur.toLocaleString()}
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5">Viability Index: {decision.economic_viability_index}/1.0</div>
            </div>

            <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800/80">
              <div className="text-slate-500 flex items-center space-x-1">
                <Leaf className="w-3 h-3 text-cyan-400" />
                <span>Avoided Carbon Emissions</span>
              </div>
              <div className="text-lg font-bold font-mono text-cyan-400 mt-1">
                {decision.environmental_benefit_avoided_co2_kg} kg CO₂e
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5">vs. New Manufacturing</div>
            </div>

            <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800/80">
              <div className="text-slate-500 flex items-center space-x-1">
                <ShieldCheck className="w-3 h-3 text-amber-400" />
                <span>Diagnostic Inputs</span>
              </div>
              <div className="text-lg font-bold font-mono text-slate-200 mt-1">
                {decision.current_soh_pct}% SoH
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5">{decision.current_cycle_count} recorded cycles</div>
            </div>
          </div>

          {/* Rationale and Prerequisites */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs pt-1">
            <div className="space-y-1.5">
              <span className="font-semibold text-slate-300">Decision Rationale:</span>
              <ul className="space-y-1 text-slate-400">
                {decision.disposition_reasons.map((r, i) => (
                  <li key={i} className="flex items-start space-x-1.5">
                    <span className="text-cyan-400 font-bold">•</span>
                    <span>{r}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="space-y-1.5">
              <span className="font-semibold text-slate-300">Mandatory Safety Prerequisites:</span>
              <ul className="space-y-1 text-slate-400">
                {decision.safety_prerequisites.map((p, i) => (
                  <li key={i} className="flex items-start space-x-1.5">
                    <span className="text-amber-400 font-bold">✓</span>
                    <span>{p}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="text-[10px] text-slate-500 font-mono pt-1 border-t border-slate-800/60 flex items-center justify-between">
            <span>Framework: {decision.regulatory_framework}</span>
            <span>Evaluated: {new Date(decision.decision_timestamp).toLocaleDateString()}</span>
          </div>
        </div>
      )}
    </div>
  );
};
