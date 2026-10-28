import React, { useState, useEffect } from 'react';
import { 
  Settings, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  Key, 
  RotateCcw, 
  ShieldCheck, 
  Activity, 
  Cpu, 
  Database,
  ExternalLink,
  Lock
} from 'lucide-react';
import { IntegrationStatusItem } from '../types';
import { api } from '../services/api';

export const IntegrationsStatusPage: React.FC = () => {
  const [integrations, setIntegrations] = useState<IntegrationStatusItem[]>([]);
  const [healthInfo, setHealthInfo] = useState<any>(null);
  const [resetting, setResetting] = useState(false);
  const [resetMessage, setResetMessage] = useState<string | null>(null);

  const loadData = async () => {
    try {
      const [ints, health] = await Promise.all([
        api.getIntegrationsStatus(),
        api.getHealth()
      ]);
      setIntegrations(ints);
      setHealthInfo(health);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleResetData = () => {
    setResetting(true);
    try {
      api.resetDemoData();
      setResetMessage('Local metrology ledger successfully restored to default European Union sample batteries.');
      setTimeout(() => setResetMessage(null), 4000);
      loadData();
    } catch {
      setResetMessage('Reset failed.');
    } finally {
      setResetting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ONLINE':
        return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30';
      case 'STANDBY':
        return 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30';
      case 'CONFIG_REQUIRED':
        return 'text-amber-400 bg-amber-500/10 border-amber-500/30';
      case 'DEGRADED':
      default:
        return 'text-rose-400 bg-rose-500/10 border-rose-500/30';
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center space-x-2">
            <div className="p-2 rounded-xl bg-slate-800 text-slate-200 border border-slate-700">
              <Settings className="w-5 h-5" />
            </div>
            <h1 className="text-2xl font-extrabold text-white">System Settings & Integration Status</h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Diagnostic verification of external cloud solvers, cryptographic engines, and database connections.
          </p>
        </div>

        <button
          onClick={handleResetData}
          disabled={resetting}
          className="flex items-center space-x-2 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 text-xs font-semibold border border-slate-700 transition-all self-start sm:self-center"
        >
          <RotateCcw className={`w-3.5 h-3.5 ${resetting ? 'animate-spin' : ''}`} />
          <span>Reset Demo Repository</span>
        </button>
      </div>

      {resetMessage && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center space-x-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
          <span>{resetMessage}</span>
        </div>
      )}

      {/* Integration Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {integrations.map(int => (
          <div
            key={int.id}
            className="glass-panel p-6 rounded-2xl border border-slate-800 flex flex-col justify-between space-y-4 shadow-lg"
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-400">
                  {int.category}
                </span>
                <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border ${getStatusBadge(int.status)}`}>
                  {int.status}
                </span>
              </div>

              <h3 className="font-bold text-base text-white">{int.name}</h3>
              <p className="text-xs text-slate-300 mt-2 leading-relaxed">{int.details}</p>
            </div>

            <div className="pt-3 border-t border-slate-800/80 space-y-2 text-xs font-mono">
              <div className="flex justify-between text-slate-400 text-[11px]">
                <span>Endpoint:</span>
                <span className="text-slate-300 truncate max-w-[180px]">{int.endpoint_url}</span>
              </div>
              <div className="flex justify-between text-slate-400 text-[11px]">
                <span>Latency:</span>
                <span className="text-emerald-400 font-bold">{int.latency_ms} ms</span>
              </div>
              <div className="flex justify-between text-slate-400 text-[11px]">
                <span>API Key Configured:</span>
                <span className={int.auth_configured ? 'text-emerald-400 font-bold' : 'text-slate-500'}>
                  {int.auth_configured ? 'YES (Active)' : 'STANDBY (Optional)'}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Zero Fabrication Policy & Authentic SDK Architecture */}
      <div className="glass-panel rounded-3xl p-6 sm:p-8 border border-emerald-500/30 space-y-4">
        <div className="flex items-center space-x-2 text-emerald-400">
          <ShieldCheck className="w-5 h-5" />
          <h3 className="text-base font-bold text-white">Zero Data Fabrication & Authentic Execution Architecture</h3>
        </div>
        <p className="text-xs text-slate-300 leading-relaxed max-w-4xl">
          In strict compliance with EU Battery Regulation (EU 2023/1542) metrology integrity requirements, BatteryPass 360 
          never fabricates solver results or claims live cloud executions when credentials are unset. 
          When running in local demo mode, optimization problems are mathematically formulated using valid QUBO dictionaries 
          and parameterized quantum circuits, and solved locally with complete transparency.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 text-xs font-mono">
          <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800">
            <div className="text-slate-400 font-bold mb-1">To enable live QpiAI-Opt Cloud Solver:</div>
            <p className="text-[11px] text-slate-500 font-sans">
              Register at <a href="https://qpiai.tech" target="_blank" rel="noreferrer" className="text-cyan-400 underline">qpiai.tech</a> and set <code className="text-emerald-400 font-mono">QPIAI_OPT_API_KEY</code> in <code className="text-slate-300 font-mono">.env</code>.
            </p>
          </div>
          <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800">
            <div className="text-slate-400 font-bold mb-1">To enable live QpiAI Indus QPU Hardware:</div>
            <p className="text-[11px] text-slate-500 font-sans">
              Set <code className="text-emerald-400 font-mono">QPIAI_QUANTUM_API_KEY</code> in <code className="text-slate-300 font-mono">.env</code> to dispatch circuits to the Indus-1 physical quantum processor.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
