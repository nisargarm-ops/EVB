import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  CheckCircle2, 
  Search, 
  Award, 
  AlertTriangle, 
  ShieldAlert, 
  Flag, 
  Eye, 
  Info, 
  Clock, 
  FileCheck,
  AlertOctagon,
  HelpCircle
} from 'lucide-react';
import { PublicVerification } from '../types';
import { api } from '../services/api';
import { ReportSuspiciousModal } from '../components/ReportSuspiciousModal';

interface VerifyPublicProps {
  initialId?: string;
  onNavigateDetail: (id: string) => void;
}

export const VerifyPublic: React.FC<VerifyPublicProps> = ({ initialId, onNavigateDetail }) => {
  const [searchId, setSearchId] = useState(initialId || 'BAT-NMC-8A2F91C0');
  const [result, setResult] = useState<PublicVerification | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Inconsistent claims test input
  const [claimTesting, setClaimTesting] = useState(false);
  const [claimedSoh, setClaimedSoh] = useState<number | undefined>(undefined);
  const [showReportModal, setShowReportModal] = useState(false);

  const handleVerify = async (idToVerify: string, claimedSohVal?: number) => {
    if (!idToVerify.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await api.verifyBattery(
        idToVerify.trim(),
        claimedSohVal !== undefined ? { soh: claimedSohVal } : undefined
      );
      setResult(res);
    } catch (err: any) {
      setError(err.message || 'Public verification failed. Battery ID or QR token not recognized on registry.');
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (initialId) {
      setSearchId(initialId);
      handleVerify(initialId);
    } else {
      handleVerify('BAT-NMC-8A2F91C0');
    }
  }, [initialId]);

  const getVerificationLevelBadge = (level: PublicVerification['verification_level']) => {
    switch (level) {
      case 'CRYPTOGRAPHICALLY_VERIFIED':
        return (
          <div className="flex items-center space-x-2 px-3 py-1.5 rounded-full bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-xs font-bold shadow-sm">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>Cryptographically Verified (SHA-256 Hash Chain Match)</span>
          </div>
        );
      case 'LOOKUP_ONLY':
        return (
          <div className="flex items-center space-x-2 px-3 py-1.5 rounded-full bg-amber-500/15 border border-amber-500/40 text-amber-300 text-xs font-bold">
            <Info className="w-4 h-4 text-amber-400" />
            <span>Lookup Only (Verification Unavailable / Inconsistent Specs)</span>
          </div>
        );
      case 'TAMPER_DETECTED':
        return (
          <div className="flex items-center space-x-2 px-3 py-1.5 rounded-full bg-rose-500/20 border border-rose-500/50 text-rose-300 text-xs font-bold">
            <AlertOctagon className="w-4 h-4 text-rose-400" />
            <span>CRITICAL: Tamper Detected in Audit Chain</span>
          </div>
        );
      case 'DUPLICATE_OR_CLONED':
        return (
          <div className="flex items-center space-x-2 px-3 py-1.5 rounded-full bg-rose-500/20 border border-rose-500/50 text-rose-300 text-xs font-bold">
            <ShieldAlert className="w-4 h-4 text-rose-400" />
            <span>SECURITY WARNING: Flagged Duplicate / Cloned Physical Label</span>
          </div>
        );
      case 'REVOKED':
        return (
          <div className="flex items-center space-x-2 px-3 py-1.5 rounded-full bg-rose-500/25 border border-rose-500/60 text-rose-200 text-xs font-bold">
            <AlertTriangle className="w-4 h-4 text-rose-400" />
            <span>PASSPORT REVOKED</span>
          </div>
        );
      default:
        return (
          <div className="flex items-center space-x-2 px-3 py-1.5 rounded-full bg-slate-500/15 border border-slate-500/40 text-slate-300 text-xs font-bold">
            <HelpCircle className="w-4 h-4 text-slate-400" />
            <span>Unverified Record</span>
          </div>
        );
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-8">
      {/* Search Header */}
      <div className="text-center space-y-3">
        <div className="inline-flex p-3 rounded-2xl bg-gradient-to-tr from-emerald-500/20 to-teal-500/20 border border-emerald-500/40 text-emerald-400">
          <ShieldCheck className="w-8 h-8" />
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white">Public EV Battery Verification Portal</h1>
        <p className="text-xs sm:text-sm text-slate-400 max-w-lg mx-auto">
          Resolves physical QR pointers or passport IDs against canonical registry records. 
          Enforces cryptographic tamper detection, label cloning detection, and specification consistency.
        </p>

        {/* Input Bar */}
        <div className="max-w-md mx-auto pt-2">
          <div className="flex items-center space-x-2 bg-slate-900 border border-slate-800 rounded-2xl p-1.5 focus-within:border-emerald-500/50 shadow-lg">
            <Search className="w-4 h-4 text-slate-400 ml-3" />
            <input
              type="text"
              placeholder="e.g. BAT-NMC-8A2F91C0 or qr_token_..."
              value={searchId}
              onChange={e => setSearchId(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleVerify(searchId, claimedSoh)}
              className="w-full bg-transparent border-none text-xs text-white focus:outline-none placeholder-slate-500"
            />
            <button
              onClick={() => handleVerify(searchId, claimedSoh)}
              disabled={loading}
              className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold transition-all shadow-md shadow-emerald-500/20 disabled:opacity-50"
            >
              {loading ? 'Resolving...' : 'Verify'}
            </button>
          </div>

          {/* Quick preset links for demo */}
          <div className="mt-2 flex flex-wrap justify-center gap-1.5 text-[11px] text-slate-500 font-mono">
            <span>Try sample records:</span>
            <button
              onClick={() => {
                setSearchId('BAT-NMC-8A2F91C0');
                handleVerify('BAT-NMC-8A2F91C0');
              }}
              className="text-cyan-400 hover:underline"
            >
              BAT-NMC-8A2F91C0
            </button>
            <span>•</span>
            <button
              onClick={() => {
                setSearchId('BAT-LFP-3C7D410E');
                handleVerify('BAT-LFP-3C7D410E');
              }}
              className="text-cyan-400 hover:underline"
            >
              BAT-LFP-3C7D410E
            </button>
            <span>•</span>
            <button
              onClick={() => {
                setSearchId('BAT-NCA-F104A7B2');
                handleVerify('BAT-NCA-F104A7B2');
              }}
              className="text-cyan-400 hover:underline"
            >
              BAT-NCA-F104A7B2
            </button>
          </div>
        </div>

        {/* Claim Inconsistency Test Switcher */}
        <div className="max-w-md mx-auto pt-2">
          <button
            onClick={() => setClaimTesting(!claimTesting)}
            className="text-[11px] text-slate-400 hover:text-slate-200 underline font-medium"
          >
            {claimTesting ? 'Hide Inconsistent Label Claim Tester' : 'Simulate Forged Label Claim (e.g. Sticker claims 98% SoH)'}
          </button>

          {claimTesting && (
            <div className="mt-2 p-3 rounded-xl bg-slate-900 border border-slate-800 text-left space-y-2 text-xs">
              <span className="text-slate-300 font-semibold block">
                Test Claimed State of Health on Physical Sticker:
              </span>
              <p className="text-[11px] text-slate-400">
                If an unauthorized actor prints a sticker claiming 95% SoH on a degraded pack (e.g. 64% SoH), the system detects this inconsistency and flags the verification.
              </p>
              <div className="flex items-center space-x-2">
                <input
                  type="number"
                  placeholder="e.g. 95.0"
                  value={claimedSoh !== undefined ? claimedSoh : ''}
                  onChange={e => setClaimedSoh(e.target.value ? parseFloat(e.target.value) : undefined)}
                  className="bg-slate-950 border border-slate-700 rounded-lg p-1.5 text-xs text-white w-28"
                />
                <button
                  onClick={() => handleVerify(searchId, claimedSoh)}
                  className="px-3 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs"
                >
                  Re-evaluate Claim
                </button>
                {claimedSoh !== undefined && (
                  <button
                    onClick={() => {
                      setClaimedSoh(undefined);
                      handleVerify(searchId);
                    }}
                    className="px-2 py-1 text-slate-400 text-[11px] hover:text-white"
                  >
                    Clear Claim
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Security Architecture Notice */}
      <div className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800 text-xs text-slate-400 flex items-start space-x-2.5">
        <Info className="w-4 h-4 text-cyan-400 mt-0.5 flex-shrink-0" />
        <div>
          <strong>QR Security Guarantee:</strong> A physical QR label is strictly an opaque lookup pointer. 
          Specifications are resolved dynamically from the canonical registry. 
          A QR scan cannot change ownership, rewrite battery degradation, or create fresh identities.
        </div>
      </div>

      {/* Error View */}
      {error && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center space-x-3">
          <AlertTriangle className="w-5 h-5 text-rose-400 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Verification Certificate Result */}
      {result && (
        <div className="glass-panel-glow rounded-3xl p-6 sm:p-8 border border-slate-800 relative overflow-hidden shadow-2xl space-y-6">
          <div className="absolute right-0 top-0 p-8 text-emerald-500/5 pointer-events-none">
            <Award className="w-48 h-48" />
          </div>

          {/* Certificate Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-800/80">
            <div>
              <div className="mb-2">
                {getVerificationLevelBadge(result.verification_level)}
              </div>
              <h2 className="text-2xl font-extrabold text-white mt-1">{result.battery_id}</h2>
              <p className="text-[11px] font-mono text-slate-400 mt-0.5">{result.battery_did}</p>
            </div>

            <div className="text-left sm:text-right space-y-1">
              <span className="px-3 py-1 rounded-full bg-emerald-500/15 text-emerald-300 text-xs font-bold border border-emerald-500/30">
                EU 2023/1542 Metrology
              </span>
              <div className="text-[10px] text-slate-400 font-mono">
                Verified: {new Date(result.verification_timestamp).toLocaleString()}
              </div>
              <div className="text-[10px] text-slate-500 font-mono">
                Scan Audit Count: {result.scan_count || 1}
              </div>
            </div>
          </div>

          {/* Warning Message if any */}
          {result.warning_message && (
            <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-start space-x-2.5">
              <AlertTriangle className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" />
              <div>
                <div className="font-bold">Security / Consistency Alert:</div>
                <div className="mt-0.5">{result.warning_message}</div>
              </div>
            </div>
          )}

          {/* Core Metrology Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 py-2">
            <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800">
              <div className="text-[11px] text-slate-500">Manufacturer</div>
              <div className="text-xs font-bold text-slate-100 mt-1">{result.manufacturer_name}</div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800">
              <div className="text-[11px] text-slate-500">Chemistry</div>
              <div className="text-xs font-bold text-emerald-400 mt-1">{result.chemistry}</div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800">
              <div className="text-[11px] text-slate-500">State of Health (SoH)</div>
              <div className="text-xs font-bold text-emerald-400 mt-1">{result.state_of_health_pct}%</div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800">
              <div className="text-[11px] text-slate-500">Carbon Footprint</div>
              <div className="text-xs font-bold text-cyan-400 mt-1">{result.carbon_footprint_total} kg CO₂e</div>
            </div>
          </div>

          {/* Condition Data Confidence & Source */}
          <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
            <div>
              <span className="text-slate-500">Data Source Integrity: </span>
              <span className="text-slate-200 font-medium">{result.source_confidence || 'BMS Direct Telemetry (98% confidence)'}</span>
            </div>
            <div className="text-slate-400 font-mono text-[11px]">
              Compliance Class: <span className="text-emerald-400 font-bold">{result.eu_compliance_class}</span>
            </div>
          </div>

          {/* Tamper Evidence Audit Banner */}
          <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center space-x-3">
              <div className={`p-2 rounded-xl ${result.is_audit_chain_valid ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
                {result.is_audit_chain_valid ? <ShieldCheck className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
              </div>
              <div className="text-xs">
                <div className="font-bold text-slate-200">
                  {result.is_audit_chain_valid ? 'Cryptographic Hash-Linked Audit Chain Valid' : 'Audit Chain Mismatch Detected'}
                </div>
                <div className="text-slate-400 mt-0.5">
                  All {result.total_custody_events} lifecycle custody events recalculate against mathematical SHA-256 block hashes.
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={() => setShowReportModal(true)}
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 text-xs font-semibold transition-all"
              >
                <Flag className="w-3.5 h-3.5" />
                <span>Flag / Report Label</span>
              </button>

              <button
                onClick={() => onNavigateDetail(result.battery_id)}
                className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold transition-all"
              >
                <Eye className="w-3.5 h-3.5 text-emerald-400" />
                <span>Full Passport</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Flag Suspicious Label Modal */}
      {showReportModal && result && (
        <ReportSuspiciousModal
          batteryId={result.battery_id}
          onClose={() => setShowReportModal(false)}
          onReportSubmitted={() => {
            handleVerify(searchId);
          }}
        />
      )}
    </div>
  );
};
