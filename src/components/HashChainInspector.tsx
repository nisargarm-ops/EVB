import React, { useState } from 'react';
import { ShieldCheck, RefreshCw, Link2, CheckCircle2, AlertTriangle, Fingerprint } from 'lucide-react';
import { CustodyEvent, AuditVerification } from '../types';
import { api } from '../services/api';

interface HashChainInspectorProps {
  batteryId: string;
  events: CustodyEvent[];
}

export const HashChainInspector: React.FC<HashChainInspectorProps> = ({ batteryId, events }) => {
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
    <div className="bg-white rounded-2xl p-6 border border-[#E5E7EB] shadow-sm">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center space-x-2">
            <Fingerprint className="w-5 h-5 text-[#059669]" />
            <h3 className="text-base font-bold text-[#14532D]">Cryptographic Tamper-Evident Audit Chain</h3>
          </div>
          <p className="text-xs text-[#64748B] mt-1">
            SHA-256 block hash chaining enforces cross-enterprise immutability from genesis to EoL.
          </p>
        </div>

        <button
          onClick={handleVerify}
          disabled={loading}
          className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-[#14532D] hover:bg-[#166534] text-white font-bold text-xs shadow-sm transition-all disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>{loading ? 'Recalculating...' : 'Verify Cryptographic Audit Trail'}</span>
        </button>
      </div>

      {/* Verification Status Banner */}
      {verification && (
        <div className={`mb-6 p-4 rounded-xl border flex items-start space-x-3 ${
          verification.is_valid
            ? 'bg-[#ECFDF3] border-[#D1FAE5] text-[#14532D]'
            : 'bg-[#FEE2E2] border-[#FECACA] text-[#DC2626]'
        }`}>
          {verification.is_valid ? (
            <CheckCircle2 className="w-5 h-5 text-[#059669] mt-0.5 flex-shrink-0" />
          ) : (
            <AlertTriangle className="w-5 h-5 text-[#DC2626] mt-0.5 flex-shrink-0" />
          )}
          <div className="text-xs">
            <div className="font-bold text-sm">
              {verification.is_valid
                ? 'Cryptographic Chain Integrity Verified: Zero Tampering Detected'
                : 'CRITICAL AUDIT FAILURE: Tampering Detected in Custody Chain!'}
            </div>
            <p className="text-[#64748B] mt-1">
              Recalculated SHA-256 digest across all {verification.total_events} blocks.
              Genesis link: <span className="font-mono text-[#059669] font-bold">{verification.genesis_hash?.slice(0, 16)}...</span>
            </p>
            {verification.error_message && (
              <p className="mt-2 text-[#DC2626] font-mono font-bold">{verification.error_message}</p>
            )}
          </div>
        </div>
      )}

      {/* Blocks List */}
      <div className="space-y-4">
        {events.map((evt, idx) => (
          <div 
            key={evt.event_id}
            className="p-4 rounded-xl bg-[#F8FAF7] border border-[#E5E7EB] hover:border-[#14532D] transition-all shadow-sm"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2">
                <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-white border border-[#E5E7EB] text-[#1F2937]">
                  Block #{idx}
                </span>
                <span className="text-xs font-bold text-[#059669]">
                  {evt.event_type}
                </span>
              </div>
              <span className="text-[11px] text-[#64748B] font-mono">
                {new Date(evt.timestamp).toLocaleString()}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs font-mono mt-3">
              <div className="p-2.5 rounded-lg bg-white border border-[#E5E7EB]">
                <div className="text-[10px] text-[#64748B] font-bold uppercase tracking-wider mb-1 flex items-center space-x-1">
                  <Link2 className="w-3 h-3 text-[#64748B]" />
                  <span>Previous Block Hash (prev_hash)</span>
                </div>
                <div className="text-[#64748B] truncate text-[11px]">{evt.prev_hash}</div>
              </div>

              <div className="p-2.5 rounded-lg bg-[#ECFDF3] border border-[#D1FAE5]">
                <div className="text-[10px] text-[#059669] font-bold uppercase tracking-wider mb-1 flex items-center space-x-1">
                  <ShieldCheck className="w-3 h-3 text-[#059669]" />
                  <span>Block Hash (SHA-256)</span>
                </div>
                <div className="text-[#14532D] truncate text-[11px] font-bold">{evt.hash}</div>
              </div>
            </div>

            <div className="mt-2.5 pt-2 border-t border-[#E5E7EB] flex items-center justify-between text-xs text-[#64748B]">
              <div>
                <span className="text-[#64748B]">Actor: </span>
                <span className="text-[#1F2937] font-semibold">{evt.actor_organization} ({evt.actor_role})</span>
              </div>
              <div className="text-[#64748B] truncate max-w-xs">
                Location: <span className="text-[#1F2937] font-medium">{evt.location}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
