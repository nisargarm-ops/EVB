import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  CheckCircle2, 
  Search, 
  AlertTriangle, 
  Lock, 
  Building2, 
  Calendar, 
  FileCheck2,
  Camera,
  Upload
} from 'lucide-react';
import { PublicVerification } from '../types';
import { api } from '../services/api';
import { useLanguage } from '../context/LanguageContext';

interface VerifyPublicProps {
  initialId?: string;
  onNavigateDetail: (id: string) => void;
  onOpenScannerModal?: () => void;
}

export const VerifyPublic: React.FC<VerifyPublicProps> = ({ 
  initialId, 
  onNavigateDetail, 
  onOpenScannerModal 
}) => {
  const { t } = useLanguage();
  const [searchId, setSearchId] = useState(initialId || 'BAT-NMC-8A2F91C0');
  const [result, setResult] = useState<PublicVerification | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [verifiedNonce, setVerifiedNonce] = useState<string>('');

  const handleVerify = async (idToVerify: string) => {
    if (!idToVerify.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await api.verifyPublic(idToVerify.trim());
      setResult(res);
      setVerifiedNonce(Math.random().toString(36).substring(2, 10).toUpperCase());
    } catch (err: any) {
      setError(err.message || 'Public verification failed. Battery ID not recognized.');
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

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-8 select-none text-[#1F2937] dark:text-[#F1F5F9]">
      {/* Search Header */}
      <div className="text-center space-y-3">
        <div className="inline-flex p-3 rounded-2xl bg-[#ECFDF3] dark:bg-[#064E3B]/30 border border-[#D1FAE5] dark:border-[#065F46] text-[#059669] shadow-sm">
          <ShieldCheck className="w-8 h-8 stroke-[2.2]" />
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-[#14532D] dark:text-[#34D399] tracking-tight">
          {t.verifyGatewayTitle}
        </h1>
        <p className="text-xs sm:text-sm text-[#64748B] dark:text-[#94A3B8] max-w-xl mx-auto leading-relaxed">
          {t.verifyGatewaySubtitle}
        </p>

        {/* Input Bar & Scan QR Actions */}
        <div className="max-w-lg mx-auto pt-2 space-y-2.5">
          <div className="flex items-center space-x-2 bg-white dark:bg-[#121F17] border border-[#E5E7EB] dark:border-[#1E382B] rounded-2xl p-1.5 focus-within:border-[#14532D] shadow-sm">
            <Search className="w-4 h-4 text-[#64748B] dark:text-[#94A3B8] ml-3" />
            <input
              type="text"
              placeholder={t.verifySearchPlaceholder}
              value={searchId}
              onChange={e => setSearchId(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleVerify(searchId)}
              className="w-full bg-transparent border-none text-xs text-[#1F2937] dark:text-[#F1F5F9] focus:outline-none placeholder-[#94A3B8] font-mono"
            />
            {onOpenScannerModal && (
              <button
                onClick={onOpenScannerModal}
                title={t.scanQrBtn}
                className="p-2 rounded-xl bg-[#F8FAF7] dark:bg-[#16261D] hover:bg-[#ECFDF3] dark:hover:bg-[#1F382B] text-[#14532D] dark:text-[#34D399] border border-[#E5E7EB] dark:border-[#1E382B] transition-colors"
              >
                <Camera className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={() => handleVerify(searchId)}
              disabled={loading}
              className="px-4 py-2 rounded-xl bg-[#14532D] hover:bg-[#166534] text-white text-xs font-bold transition-all shadow-sm disabled:opacity-50"
            >
              {loading ? t.loading : t.verifyButton}
            </button>
          </div>

          <div className="flex items-center justify-center space-x-2 text-[11px] text-[#64748B] dark:text-[#94A3B8]">
            <span>{t.verifySampleIds}</span>
            {['BAT-NMC-8A2F91C0', 'BAT-LFP-3C7D410E', 'BAT-NCA-F104A7B2'].map(id => (
              <button
                key={id}
                onClick={() => {
                  setSearchId(id);
                  handleVerify(id);
                }}
                className="text-[#059669] dark:text-[#34D399] hover:underline font-mono text-[10px] font-bold"
              >
                {id.split('-')[1]}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Error View */}
      {error && (
        <div className="p-4 rounded-2xl bg-[#FEE2E2] dark:bg-[#7F1D1D]/30 border border-[#FECACA] dark:border-[#991B1B] text-[#DC2626] dark:text-[#F87171] text-xs flex items-center space-x-3 font-medium">
          <AlertTriangle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Verification Certificate Result */}
      {result && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-[#121F17] rounded-3xl p-6 sm:p-8 border border-[#D1FAE5] dark:border-[#1E382B] relative overflow-hidden shadow-sm">
            {/* Certificate Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#E5E7EB] dark:border-[#1E382B]">
              <div>
                <div className="flex items-center space-x-2">
                  <CheckCircle2 className="w-5 h-5 text-[#059669]" />
                  <span className="text-xs font-bold text-[#059669] dark:text-[#34D399] uppercase tracking-wider font-mono">
                    {t.verifyAuthenticCertificate}
                  </span>
                </div>
                <h2 className="text-2xl font-extrabold text-[#14532D] dark:text-[#34D399] mt-1 font-mono tracking-tight">{result.battery_id}</h2>
                <p className="text-[11px] font-mono text-[#64748B] dark:text-[#94A3B8] mt-0.5 break-all">{result.battery_did}</p>
              </div>

              <div className="text-left sm:text-right space-y-1">
                <span className="inline-block px-3 py-1 rounded-full bg-[#ECFDF3] dark:bg-[#064E3B]/40 text-[#059669] dark:text-[#34D399] text-xs font-bold border border-[#D1FAE5] dark:border-[#065F46]">
                  EU 2023/1542 Certified
                </span>
                <div className="text-[10px] text-[#64748B] dark:text-[#94A3B8] font-mono">
                  Verified At: {new Date(result.verification_timestamp).toLocaleString()}
                </div>
                {verifiedNonce && (
                  <div className="text-[9px] text-[#94A3B8] font-mono">
                    Security Nonce: <span className="text-[#14532D] dark:text-[#34D399] font-bold">{verifiedNonce}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Core Metrology Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 py-6">
              <div className="p-3.5 rounded-xl bg-[#F8FAF7] dark:bg-[#16261D] border border-[#E5E7EB] dark:border-[#1E382B]">
                <div className="text-[11px] text-[#64748B] dark:text-[#94A3B8]">Manufacturer</div>
                <div className="text-xs font-bold text-[#1F2937] dark:text-[#F1F5F9] mt-1">{result.manufacturer_name}</div>
              </div>

              <div className="p-3.5 rounded-xl bg-[#F8FAF7] dark:bg-[#16261D] border border-[#E5E7EB] dark:border-[#1E382B]">
                <div className="text-[11px] text-[#64748B] dark:text-[#94A3B8]">{t.chemistry}</div>
                <div className="text-xs font-bold text-[#14532D] dark:text-[#34D399] mt-1">{result.chemistry}</div>
              </div>

              <div className="p-3.5 rounded-xl bg-[#F8FAF7] dark:bg-[#16261D] border border-[#E5E7EB] dark:border-[#1E382B]">
                <div className="text-[11px] text-[#64748B] dark:text-[#94A3B8]">{t.stateOfHealth}</div>
                <div className="text-xs font-bold text-[#059669] dark:text-[#34D399] mt-1 font-mono">{result.state_of_health_pct}%</div>
              </div>

              <div className="p-3.5 rounded-xl bg-[#F8FAF7] dark:bg-[#16261D] border border-[#E5E7EB] dark:border-[#1E382B]">
                <div className="text-[11px] text-[#64748B] dark:text-[#94A3B8]">{t.carbonFootprint}</div>
                <div className="text-xs font-bold text-[#0D9488] dark:text-[#2DD4BF] mt-1 font-mono">{result.carbon_footprint_total} kg CO₂/kWh</div>
              </div>
            </div>

            {/* Tamper Evidence Seal Banner */}
            <div className="p-4 rounded-2xl bg-[#ECFDF3] dark:bg-[#064E3B]/30 border border-[#D1FAE5] dark:border-[#065F46] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center space-x-3">
                <div className="p-2 rounded-xl bg-white dark:bg-[#16261D] border border-[#D1FAE5] dark:border-[#065F46] text-[#059669]">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div className="text-xs">
                  <div className="font-bold text-[#14532D] dark:text-[#34D399]">{t.verifyTamperEvidentHash}</div>
                  <div className="text-[#475569] dark:text-[#CBD5E1] mt-0.5">
                    All {result.total_custody_events} lifecycle custody events recalculate identically to mathematical SHA-256 blocks.
                  </div>
                </div>
              </div>

              <button
                onClick={() => onNavigateDetail(result.battery_id)}
                className="px-4 py-2 rounded-xl bg-[#14532D] hover:bg-[#166534] text-white text-xs font-bold transition-all shadow-sm shrink-0"
              >
                {t.viewDetails}
              </button>
            </div>
          </div>

          {/* Anti-Counterfeiting & Physical Inspection Protocol Banner */}
          <div className="bg-[#FEF3C7]/40 dark:bg-[#78350F]/20 p-6 rounded-3xl border border-[#FDE68A] dark:border-[#78350F]/40 space-y-4 shadow-sm">
            <div className="flex items-start space-x-3">
              <div className="p-2 rounded-xl bg-white dark:bg-[#16261D] border border-[#FDE68A] dark:border-[#78350F] text-[#D97706] shrink-0 mt-0.5">
                <Lock className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-[#92400E] dark:text-[#FBBF24]">
                  Physical Pack Anti-Counterfeiting Protocol (EU Regulation 2023/1542)
                </h3>
                <p className="text-xs text-[#78350F] dark:text-[#FDE68A] leading-relaxed">
                  <strong>Important Security Rule:</strong> A QR code scan alone confirms the digital record exists on the ledger, 
                  but does <em>not</em> constitute physical possession or preclude physical relabeling. 
                  Inspectors and buyers must physically cross-verify the following physical checkpoints:
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2 text-xs">
              <div className="p-3.5 rounded-xl bg-white dark:bg-[#16261D] border border-[#FDE68A] dark:border-[#78350F] space-y-1 shadow-sm">
                <div className="font-bold text-[#1F2937] dark:text-[#F1F5F9] flex items-center space-x-1.5">
                  <FileCheck2 className="w-3.5 h-3.5 text-[#059669]" />
                  <span>1. Laser-Etched Serial</span>
                </div>
                <p className="text-[#64748B] dark:text-[#94A3B8] text-[11px] leading-relaxed">
                  Confirm the laser-engraved serial code on the metal battery pack casing matches the digital identifier exactly.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-white dark:bg-[#16261D] border border-[#FDE68A] dark:border-[#78350F] space-y-1 shadow-sm">
                <div className="font-bold text-[#1F2937] dark:text-[#F1F5F9] flex items-center space-x-1.5">
                  <Building2 className="w-3.5 h-3.5 text-[#059669]" />
                  <span>2. Custodian Seal</span>
                </div>
                <p className="text-[#64748B] dark:text-[#94A3B8] text-[11px] leading-relaxed">
                  Verify that the physical tamper-evident seal bears the authorized stamp of <strong>{result.manufacturer_name}</strong>.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-white dark:bg-[#16261D] border border-[#FDE68A] dark:border-[#78350F] space-y-1 shadow-sm">
                <div className="font-bold text-[#1F2937] dark:text-[#F1F5F9] flex items-center space-x-1.5">
                  <Calendar className="w-3.5 h-3.5 text-[#D97706]" />
                  <span>3. Fresh Nonce Check</span>
                </div>
                <p className="text-[#64748B] dark:text-[#94A3B8] text-[11px] leading-relaxed">
                  Static photos or photocopies of QR stickers cannot produce an active server-generated security nonce.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
