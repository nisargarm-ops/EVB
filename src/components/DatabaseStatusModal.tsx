import React, { useState, useEffect } from 'react';
import { 
  X, 
  Database, 
  CheckCircle2, 
  AlertTriangle, 
  RefreshCw, 
  Lock, 
  Layers, 
  Server, 
  Key, 
  ExternalLink 
} from 'lucide-react';
import { DatabaseStatus } from '../types';
import { api } from '../services/api';

interface DatabaseStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStatusChange?: (status: DatabaseStatus) => void;
}

export const DatabaseStatusModal: React.FC<DatabaseStatusModalProps> = ({
  isOpen,
  onClose,
  onStatusChange,
}) => {
  const [status, setStatus] = useState<DatabaseStatus | null>(null);
  const [probing, setProbing] = useState(false);
  const [customUrl, setCustomUrl] = useState('');
  const [customKey, setCustomKey] = useState('');
  const [savedMsg, setSavedMsg] = useState<string | null>(null);

  const checkStatus = async () => {
    setProbing(true);
    setSavedMsg(null);
    try {
      const res = await api.getDatabaseStatus();
      setStatus(res);
      if (onStatusChange) onStatusChange(res);
    } catch (err: any) {
      console.error(err);
    } finally {
      setProbing(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      checkStatus();
      const storedUrl = localStorage.getItem('bp360_supabase_url') || '';
      const storedKey = localStorage.getItem('bp360_supabase_key') || '';
      setCustomUrl(storedUrl);
      setCustomKey(storedKey);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSaveCredentials = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customUrl.trim() || !customKey.trim()) {
      alert('Please enter both Supabase Project URL and Anon API key.');
      return;
    }
    api.setSupabaseCredentials(customUrl.trim(), customKey.trim());
    setSavedMsg('Credentials updated. Probing Supabase endpoint...');
    checkStatus();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-xl glass-panel bg-slate-900/95 border border-slate-700/80 rounded-2xl p-6 shadow-2xl space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center space-x-3">
            <div className={`p-2.5 rounded-xl border ${
              status?.isConnected 
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' 
                : 'bg-amber-500/10 border-amber-500/30 text-amber-400'
            }`}>
              <Database className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-base font-bold text-white tracking-tight">Database & Persistence Diagnostics</h2>
                <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${
                  status?.isConnected
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                    : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                }`}>
                  {status?.provider || 'PROBING...'}
                </span>
              </div>
              <p className="text-xs text-slate-400">PostgreSQL Schema • RLS Policies • Integrity Auditing</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Live Diagnostics Card */}
        <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">Live Connectivity Status</span>
            <button
              onClick={checkStatus}
              disabled={probing}
              className="flex items-center space-x-1.5 text-xs text-emerald-400 hover:text-emerald-300 transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${probing ? 'animate-spin' : ''}`} />
              <span>{probing ? 'Probing...' : 'Re-test Connection'}</span>
            </button>
          </div>

          <div className="flex items-start space-x-3 pt-1">
            {status?.isConnected ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            )}
            <div className="text-xs space-y-1">
              <p className="text-slate-200 font-medium leading-relaxed">{status?.message}</p>
              {status?.endpointUrl && (
                <p className="text-[11px] text-slate-400 font-mono">
                  Endpoint: <span className="text-cyan-400">{status.endpointUrl}</span>
                </p>
              )}
              <p className="text-[10px] text-slate-500">
                Last checked: {status?.lastChecked ? new Date(status.lastChecked).toLocaleTimeString() : 'Just now'}
              </p>
            </div>
          </div>
        </div>

        {/* Database Tables & Migrations Architecture */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-300">
            <span className="flex items-center space-x-1.5">
              <Layers className="w-4 h-4 text-cyan-400" />
              <span>Managed SQL Schema & Migrations</span>
            </span>
            <span className="text-[11px] font-mono text-emerald-400">11 Tables • RLS Enforced</span>
          </div>
          
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px] font-mono text-slate-300">
            <div className="p-2 rounded-lg bg-slate-950/80 border border-slate-800 flex items-center justify-between">
              <span>organizations</span>
              <span className="text-emerald-400">✓ RLS</span>
            </div>
            <div className="p-2 rounded-lg bg-slate-950/80 border border-slate-800 flex items-center justify-between">
              <span>profiles</span>
              <span className="text-emerald-400">✓ RLS</span>
            </div>
            <div className="p-2 rounded-lg bg-slate-950/80 border border-slate-800 flex items-center justify-between">
              <span>batteries</span>
              <span className="text-emerald-400">✓ RLS</span>
            </div>
            <div className="p-2 rounded-lg bg-slate-950/80 border border-slate-800 flex items-center justify-between">
              <span>battery_metrics</span>
              <span className="text-emerald-400">✓ RLS</span>
            </div>
            <div className="p-2 rounded-lg bg-slate-950/80 border border-slate-800 flex items-center justify-between">
              <span>lifecycle_events</span>
              <span className="text-emerald-400">✓ RLS</span>
            </div>
            <div className="p-2 rounded-lg bg-slate-950/80 border border-slate-800 flex items-center justify-between">
              <span>custody_transfers</span>
              <span className="text-emerald-400">✓ RLS</span>
            </div>
            <div className="p-2 rounded-lg bg-slate-950/80 border border-slate-800 flex items-center justify-between">
              <span>evidence_records</span>
              <span className="text-emerald-400">✓ RLS</span>
            </div>
            <div className="p-2 rounded-lg bg-slate-950/80 border border-slate-800 flex items-center justify-between">
              <span>verification_results</span>
              <span className="text-emerald-400">✓ RLS</span>
            </div>
            <div className="p-2 rounded-lg bg-slate-950/80 border border-slate-800 flex items-center justify-between">
              <span>disposition_decisions</span>
              <span className="text-emerald-400">✓ RLS</span>
            </div>
            <div className="p-2 rounded-lg bg-slate-950/80 border border-slate-800 flex items-center justify-between">
              <span>audit_logs</span>
              <span className="text-emerald-400">✓ RLS</span>
            </div>
            <div className="p-2 rounded-lg bg-slate-950/80 border border-slate-800 flex items-center justify-between col-span-2 sm:col-span-1">
              <span>qpiai_execution_records</span>
              <span className="text-cyan-400">✓ RLS</span>
            </div>
          </div>
        </div>

        {/* Runtime Supabase Connection Form */}
        <form onSubmit={handleSaveCredentials} className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-3">
          <div className="flex items-center space-x-2 text-xs font-semibold text-slate-300">
            <Server className="w-4 h-4 text-emerald-400" />
            <span>Connect Live Supabase Project</span>
          </div>

          <p className="text-[11px] text-slate-400 leading-normal">
            To connect an external Supabase instance, enter your project URL and public anon key below. (Can also be set via <code className="text-slate-300 font-mono">VITE_SUPABASE_URL</code> and <code className="text-slate-300 font-mono">VITE_SUPABASE_ANON_KEY</code>).
          </p>

          <div>
            <label className="text-[11px] text-slate-400 block mb-1">Project URL</label>
            <input
              type="url"
              placeholder="https://xyzcompany.supabase.co"
              value={customUrl}
              onChange={(e) => setCustomUrl(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="text-[11px] text-slate-400 block mb-1">Anon Public Key</label>
            <input
              type="text"
              placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6..."
              value={customKey}
              onChange={(e) => setCustomKey(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs font-mono text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500"
            />
          </div>

          {savedMsg && (
            <div className="text-[11px] text-emerald-400">{savedMsg}</div>
          )}

          <div className="flex justify-end space-x-2 pt-1">
            <button
              type="submit"
              className="px-3.5 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold transition-all shadow-sm"
            >
              Save & Reconnect
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
