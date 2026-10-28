import React, { useState } from 'react';
import { 
  ShieldCheck, 
  RefreshCw, 
  Link2, 
  CheckCircle2, 
  AlertTriangle, 
  Fingerprint, 
  ShieldAlert, 
  RotateCcw,
  FileText,
  Info
} from 'lucide-react';
import { CustodyEvent, AuditVerification } from '../types';
import { api } from '../services/api';

interface HashChainInspectorProps {
  batteryId: string;
  events: CustodyEvent[];
  onReload?: () => void;
}

export const HashChainInspector: React.FC<HashChainInspectorProps> = ({ batteryId, events, onReload }) => {
  const [verification, setVerification] = useState<AuditVerification | null>(null);
  const [loading, setLoading] = useState(false);
  const [tampered, setTampered] = useState(false);

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

  const handleSimulateTampering = async () => {
    if (events.length > 1) {
      api.tamperBlockForAudit(batteryId, 1);
      setTampered(true);
      if (onReload) onReload();
      // Auto verify to demonstrate immediate detection
      const res = await api.verifyAuditTrail(batteryId);
      setVerification(res);
    }
  };

  const handleRestoreChain = async () => {
    api.resetDefaults();
    setTampered(false);
    if (onReload) onReload();
    const res = await api.verifyAuditTrail(batteryId);
    setVerification(res);
  };

  return (
    <div className="glass-panel rounded-2xl p-6 border border-slate-800 space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <Fingerprint className="w-5 h-5 text-emerald-400" />
            <h3 className="text-base font-bold text-white">Cryptographic SHA-256 Hash-Linked Audit Chain</h3>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Tamper-evident hash-linked event history. Each custody block cryptographically references the prior block's SHA-256 digest.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          {tampered ? (
            <button
              onClick={handleRestoreChain}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs border border-slate-700"
            >
              <RotateCcw className="w-3.5 h-3.5 text-emerald-400" />
              <span>Restore Verified Chain</span>
            </button>
          ) : (
            <button
              onClick={handleSimulateTampering}
              title="Test cryptographic audit failure by modifying block #1 payload"
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 text-xs border border-rose-500/30"
            >
              <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
              <span>Simulate Tampering Test</span>
            </button>
          )}

          <button
            onClick={handleVerify}
            disabled={loading}
            className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-slate-950 font-bold text-xs shadow-lg shadow-emerald-500/20 transition-all disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>{loading ? 'Recalculating...' : 'Verify Audit Trail'}</span>
          </button>
        </div>
      </div>

      {/* Disclosing Architectural Reality: Hash chain != blockchain */}
      <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 text-[11px] text-slate-400 flex items-start space-x-2">
        <Info className="w-4 h-4 text-cyan-400 mt-0.5 flex-shrink-0" />
        <span>
          <strong>Architecture Transparency Notice:</strong> This ledger uses mathematical SHA-256 hash chaining to enforce tamper evidence across supply chain organizations. 
          A cryptographic hash-linked log is an immutable audit structure and does not require or claim to be a distributed blockchain.
        </span>
      </div>

      {/* Verification Status Banner */}
      {verification && (
        <div className={`p-4 rounded-xl border flex items-start space-x-3 ${
          verification.is_valid
            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
            : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
        }`}>
          {verification.is_valid ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-400 mt-0.5 flex-shrink-0" />
          ) : (
            <AlertTriangle className="w-5 h-5 text-rose-400 mt-0.5 flex-shrink-0" />
          )}
          <div className="text-xs">
            <div className="font-bold text-sm">
              {verification.is_valid
                ? 'Cryptographic Chain Integrity Verified: Zero Tampering Detected'
                : 'CRITICAL AUDIT FAILURE: Tampering or Broken Link Detected in Event Chain!'}
            </div>
            <p className="text-slate-400 mt-1">
              Recalculated SHA-256 digest across all {verification.total_events} blocks.
              Genesis link: <span className="font-mono text-emerald-400">{verification.genesis_hash?.slice(0, 16)}...</span>
            </p>
            {verification.error_message && (
              <p className="mt-2 text-rose-400 font-mono font-medium">{verification.error_message}</p>
            )}
          </div>
        </div>
      )}

      {/* Blocks List */}
      <div className="space-y-4">
        {events.map((evt, idx) => {
          const isGenesis = idx === 0;
          const prevMatches = isGenesis || (events[idx - 1] && evt.prev_hash === events[idx - 1].hash);

          return (
            <div 
              key={evt.event_id}
              className={`p-4 rounded-xl border transition-all ${
                !prevMatches
                  ? 'bg-rose-950/20 border-rose-500/40'
                  : 'bg-slate-900/70 border-slate-800/80 hover:border-slate-700'
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-2">
                <div className="flex items-center space-x-2">
                  <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                    Block #{idx}
                  </span>
                  <span className="text-xs font-semibold text-emerald-400">
                    {evt.event_type}
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                    {evt.verification_status || 'VERIFIED'}
                  </span>
                </div>
                <span className="text-[11px] text-slate-500 font-mono">
                  {new Date(evt.timestamp).toLocaleString()}
                </span>
              </div>

              {!prevMatches && (
                <div className="my-2 p-2 rounded bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center space-x-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-rose-400 flex-shrink-0" />
                  <span>BROKEN LINK WARNING: prev_hash does not match hash of Block #{idx - 1}!</span>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs font-mono mt-3">
                <div className="p-2.5 rounded bg-slate-950 border border-slate-800/70">
                  <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-1 flex items-center space-x-1">
                    <Link2 className="w-3 h-3 text-slate-400" />
                    <span>Previous Block Hash (prev_hash)</span>
                  </div>
                  <div className="text-slate-400 truncate text-[11px]">{evt.prev_hash}</div>
                </div>

                <div className="p-2.5 rounded bg-slate-950 border border-slate-800/70">
                  <div className="text-[10px] text-emerald-500 uppercase tracking-wider mb-1 flex items-center space-x-1">
                    <ShieldCheck className="w-3 h-3 text-emerald-400" />
                    <span>Block Hash (SHA-256)</span>
                  </div>
                  <div className="text-emerald-400 truncate text-[11px] font-semibold">{evt.hash}</div>
                </div>
              </div>

              <div className="mt-2.5 pt-2 border-t border-slate-800/60 flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs text-slate-400">
                <div>
                  <span className="text-slate-500">Actor: </span>
                  <span className="text-slate-300">{evt.actor_organization} ({evt.actor_role})</span>
                </div>
                <div className="text-slate-400 flex items-center space-x-1">
                  <FileText className="w-3 h-3 text-cyan-400" />
                  <span>Audit Evidence Ref: {evt.evidence_ref || 'FACTORY-METROLOGY-RECORD'}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
