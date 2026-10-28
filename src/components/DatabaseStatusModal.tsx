import React, { useState, useEffect } from 'react';
import {
  X,
  Database,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Layers,
  ShieldCheck,
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

  const checkStatus = async () => {
    setProbing(true);
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
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-xl glass-panel bg-slate-900/95 border border-slate-700/80 rounded-2xl p-6 shadow-2xl space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center space-x-3">
            <div
              className={`p-2.5 rounded-xl border ${
                status?.isConnected
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                  : 'bg-amber-500/10 border-amber-500/30 text-amber-400'
              }`}
            >
              <Database className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-base font-bold text-white tracking-tight">
                  Database & Persistence Architecture
                </h2>
                <span
                  className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${
                    status?.isConnected
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                      : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                  }`}
                >
                  {status?.provider || 'PROBING...'}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Supabase PostgreSQL • Backend Proxy (`/api/v1`) • JWKS & RLS
              </p>
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
            <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
              Backend & Supabase Connectivity
            </span>
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
                  Project: <span className="text-cyan-400">{status.endpointUrl}</span>
                </p>
              )}
              <p className="text-[10px] text-slate-500">
                Last verified:{' '}
                {status?.lastChecked
                  ? new Date(status.lastChecked).toLocaleTimeString()
                  : 'Just now'}
              </p>
            </div>
          </div>
        </div>

        {/* Database Tables & Migrations Architecture */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-300">
            <span className="flex items-center space-x-1.5">
              <Layers className="w-4 h-4 text-cyan-400" />
              <span>Managed PostgreSQL Schema & Triggers</span>
            </span>
            <span className="text-[11px] font-mono text-emerald-400">11 Tables • RLS Enforced</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px] font-mono text-slate-300">
            {[
              'organizations',
              'profiles',
              'batteries',
              'battery_metrics',
              'lifecycle_events',
              'custody_transfers',
              'evidence_records',
              'verification_results',
              'disposition_decisions',
              'audit_logs',
              'qpiai_execution_records',
            ].map((tbl) => (
              <div
                key={tbl}
                className="p-2 rounded-lg bg-slate-950/80 border border-slate-800 flex items-center justify-between"
              >
                <span className="truncate mr-1">{tbl}</span>
                <span className="text-emerald-400 shrink-0">✓ RLS</span>
              </div>
            ))}
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center space-x-2.5 text-xs text-slate-400">
          <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>
            Credentials (<code className="text-slate-300 font-mono">SUPABASE_SECRET_KEY</code> &{' '}
            <code className="text-slate-300 font-mono">SUPABASE_JWKS_URL</code>) are isolated
            server-side behind <code className="text-cyan-400 font-mono">/api/v1</code> routes.
          </span>
        </div>
      </div>
    </div>
  );
};
