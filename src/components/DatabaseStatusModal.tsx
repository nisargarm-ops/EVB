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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-xl bg-white border border-[#E5E7EB] rounded-2xl p-6 shadow-xl space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#E5E7EB] pb-4">
          <div className="flex items-center space-x-3">
            <div
              className={`p-2.5 rounded-xl border ${
                status?.isConnected
                  ? 'bg-[#ECFDF3] border-[#D1FAE5] text-[#059669]'
                  : 'bg-[#FEF3C7] border-[#FDE68A] text-[#D97706]'
              }`}
            >
              <Database className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-base font-bold text-[#14532D] tracking-tight">
                  Database & Persistence Architecture
                </h2>
                <span
                  className={`text-[10px] font-mono px-2 py-0.5 rounded-full border font-semibold ${
                    status?.isConnected
                      ? 'bg-[#ECFDF3] text-[#059669] border-[#D1FAE5]'
                      : 'bg-[#FEF3C7] text-[#D97706] border-[#FDE68A]'
                  }`}
                >
                  {status?.provider || 'PROBING...'}
                </span>
              </div>
              <p className="text-xs text-[#64748B]">
                Supabase PostgreSQL • Backend Proxy (`/api/v1`) • JWKS & RLS
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#64748B] hover:text-[#1F2937] hover:bg-[#F8FAF7] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Live Diagnostics Card */}
        <div className="p-4 rounded-xl bg-[#F8FAF7] border border-[#E5E7EB] space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#1F2937] uppercase tracking-wider">
              Backend & Supabase Connectivity
            </span>
            <button
              onClick={checkStatus}
              disabled={probing}
              className="flex items-center space-x-1.5 text-xs text-[#059669] hover:text-[#14532D] font-semibold transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${probing ? 'animate-spin' : ''}`} />
              <span>{probing ? 'Probing...' : 'Re-test Connection'}</span>
            </button>
          </div>

          <div className="flex items-start space-x-3 pt-1">
            {status?.isConnected ? (
              <CheckCircle2 className="w-5 h-5 text-[#059669] shrink-0 mt-0.5" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-[#D97706] shrink-0 mt-0.5" />
            )}
            <div className="text-xs space-y-1">
              <p className="text-[#1F2937] font-medium leading-relaxed">{status?.message}</p>
              {status?.endpointUrl && (
                <p className="text-[11px] text-[#64748B] font-mono">
                  Project: <span className="text-[#14532D] font-semibold">{status.endpointUrl}</span>
                </p>
              )}
              <p className="text-[10px] text-[#94A3B8]">
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
          <div className="flex items-center justify-between text-xs font-bold text-[#1F2937]">
            <span className="flex items-center space-x-1.5">
              <Layers className="w-4 h-4 text-[#059669]" />
              <span>Managed PostgreSQL Schema & Triggers</span>
            </span>
            <span className="text-[11px] font-mono text-[#059669]">
              {status?.tables
                ? `${status.tables.filter((t) => t.exists).length}/${status.tables.length} Tables Active • RLS`
                : 'Probing Schema...'}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px] font-mono">
            {(
              status?.tables ||
              [
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
              ].map((name) => ({ name, exists: Boolean(status?.isConnected), rowCount: null }))
            ).map((tbl) => (
              <div
                key={tbl.name}
                className="p-2 rounded-lg bg-white border border-[#E5E7EB] flex items-center justify-between shadow-sm"
              >
                <span className="truncate mr-1 text-[#1F2937]">{tbl.name}</span>
                {tbl.exists ? (
                  <span className="text-[#059669] font-bold shrink-0">
                    ✓{tbl.rowCount !== null ? ` (${tbl.rowCount})` : ' RLS'}
                  </span>
                ) : (
                  <span className="text-[#D97706] shrink-0 text-[10px] font-bold">Pending</span>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-[#F8FAF7] border border-[#E5E7EB] flex items-center space-x-2.5 text-xs text-[#64748B]">
          <ShieldCheck className="w-4 h-4 text-[#059669] shrink-0" />
          <span>
            Credentials (<code className="text-[#1F2937] font-mono font-semibold">SUPABASE_SECRET_KEY</code> &{' '}
            <code className="text-[#1F2937] font-mono font-semibold">SUPABASE_JWKS_URL</code>) are isolated
            server-side behind <code className="text-[#14532D] font-mono font-bold">/api/v1</code> routes.
          </span>
        </div>
      </div>
    </div>
  );
};
