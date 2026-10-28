import React, { useState } from 'react';
import {
  ShieldCheck,
  RefreshCw,
  Link2,
  CheckCircle2,
  AlertTriangle,
  Fingerprint,
} from 'lucide-react';
import { CustodyEvent, AuditVerification } from '../types';
import { api } from '../services/api';

interface HashChainInspectorProps {
  batteryId: string;
  events: CustodyEvent[];
}

export const HashChainInspector: React.FC<HashChainInspectorProps> = ({
  batteryId,
  events,
}) => {
  const [verification, setVerification] = useState<AuditVerification | null>(null);
  const [loading, setLoading] = useState(false);

  const handleVerify = async () => {
    setLoading(true);
    try {
      const res = await api.verifyAuditTrail(batteryId);
      setVerification(res);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="glass-panel rounded-2xl p-6 border border-slate-800">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center space-x-2">
            <Fingerprint className="w-5 h-5 text-emerald-400" />
            <h3 className="text-base font-bold text-white">
              Cryptographic Tamper-Evident Audit Chain
            </h3>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            SHA-256 block hash chaining enforces cross-enterprise immutability from genesis to EoL.
          </p>
        </div>

        <button
          onClick={handleVerify}
          disabled={loading}
          className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-slate-950 font-bold text-xs shadow-lg shadow-emerald-500/20 transition-all disabled:opacity-50 cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>{loading ? 'Recalculating...' : 'Verify Cryptographic Audit Trail'}</span>
        </button>
      </div>

      {/* Verification Status Banner */}
      {verification && (
        <div
          className={`mb-6 p-4 rounded-xl border flex items-start space-x-3 ${
            verification.is_valid
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
              : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
          }`}
        >
          {verification.is_valid ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-400 mt-0.5 flex-shrink-0" />
          ) : (
            <AlertTriangle className="w-5 h-5 text-rose-400 mt-0.5 flex-shrink-0" />
          )}
          <div className="text-xs">
            <div className="font-bold text-sm">
              {verification.is_valid
                ? 'Cryptographic Chain Integrity Verified: Zero Tampering Detected'
                : 'CRITICAL AUDIT FAILURE: Tampering Detected in Custody Chain!'}
            </div>
            <p className="text-slate-400 mt-1">
              Recalculated SHA-256 digest across all {verification.total_events} blocks. Genesis link:{' '}
              <span className="font-mono text-emerald-400">
                {verification.genesis_hash?.slice(0, 16)}...
              </span>
            </p>
            {verification.error_message && (
              <p className="mt-2 text-rose-400 font-mono font-medium">
                {verification.error_message}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Blocks List */}
      <div className="space-y-4">
        {events.map((evt, idx) => (
          <div
            key={evt.event_id}
            className="p-4 rounded-xl bg-slate-900/70 border border-slate-800/80 hover:border-slate-700 transition-all"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2">
                <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                  Block #{idx}
                </span>
                <span className="text-xs font-semibold text-emerald-400">{evt.event_type}</span>
              </div>
              <span className="text-[11px] text-slate-500 font-mono">
                {new Date(evt.timestamp).toLocaleString()}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs font-mono mt-3">
              <div className="p-2 rounded bg-slate-950 border border-slate-800/70">
                <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-1 flex items-center space-x-1">
                  <Link2 className="w-3 h-3 text-slate-400" />
                  <span>Previous Block Hash (prev_hash)</span>
                </div>
                <div className="text-slate-400 truncate text-[11px]">{evt.prev_hash}</div>
              </div>

              <div className="p-2 rounded bg-slate-950 border border-slate-800/70">
                <div className="text-[10px] text-emerald-500 uppercase tracking-wider mb-1 flex items-center space-x-1">
                  <ShieldCheck className="w-3 h-3 text-emerald-400" />
                  <span>Block Hash (SHA-256)</span>
                </div>
                <div className="text-emerald-400 truncate text-[11px] font-semibold">
                  {evt.hash}
                </div>
              </div>
            </div>

            <div className="mt-2.5 pt-2 border-t border-slate-800/60 flex items-center justify-between text-xs text-slate-400">
              <div>
                <span className="text-slate-500">Actor: </span>
                <span className="text-slate-300">
                  {evt.actor_organization} ({evt.actor_role})
                </span>
              </div>
              <div className="text-slate-500 truncate max-w-xs">
                Location: <span className="text-slate-400">{evt.location}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
