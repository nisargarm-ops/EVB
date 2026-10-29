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
  Fingerprint,
  Flag,
  AlertOctagon,
  ShieldAlert,
  Info,
  Check,
  X,
  QrCode,
  ArrowRight,
  ExternalLink,
  Cpu,
  Layers,
  MapPin,
  Clock,
  UserCheck,
  RefreshCw,
  ShieldOff,
  Unlock,
  FileText
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { 
  PublicVerification, 
  PhysicalVerificationResponse, 
  TwoStepPrecheckResponse, 
  UserRole 
} from '../types';
import { api, canonicalizeSerial } from '../services/api';
import { useLanguage } from '../context/LanguageContext';
import { QRScannerModal } from '../components/QRScannerModal';

interface VerifyPublicProps {
  initialId?: string;
  activeRole?: UserRole;
  onNavigateDetail: (id: string) => void;
  onOpenScannerModal?: () => void;
}

type DisplayStatusType = 'MATCHED' | 'MISMATCH_FRAUD' | 'VERIFICATION_REQUIRED' | 'SUSPICIOUS_LOCKED';

export const VerifyPublic: React.FC<VerifyPublicProps> = ({ 
  initialId, 
  activeRole = 'PUBLIC',
  onNavigateDetail, 
  onOpenScannerModal 
}) => {
  const { t } = useLanguage();
  const [searchId, setSearchId] = useState(initialId || 'BAT-NMC-8A2F91C0');
  
  // Two-Step Pre-check session state (Public safe, zero secrets)
  const [precheck, setPrecheck] = useState<TwoStepPrecheckResponse | null>(null);
  
  // Authenticated full passport certificate (Unsealed strictly after physical UID match)
  const [result, setResult] = useState<PublicVerification | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [verifiedNonce, setVerifiedNonce] = useState<string>('');

  // Step 2 Physical UID Verification Input & Outcome
  const [physicalSerial, setPhysicalSerial] = useState('');
  const [inspectorNotes, setInspectorNotes] = useState('');
  const [physicalLoading, setPhysicalLoading] = useState(false);
  const [physicalResult, setPhysicalResult] = useState<PhysicalVerificationResponse | null>(null);
  const [physicalError, setPhysicalError] = useState<string | null>(null);
  
  // Modal for Step 1 QR Camera Scanner
  const [isDigitalScannerOpen, setIsDigitalScannerOpen] = useState(false);

  // Authorized Admin/Inspector Review & Reset Lockout State
  const [adminReviewNotes, setAdminReviewNotes] = useState('');
  const [resettingLockout, setResettingLockout] = useState(false);
  const [resetSuccessMessage, setResetSuccessMessage] = useState<string | null>(null);

  // Tamper Reporting State
  const [showTamperModal, setShowTamperModal] = useState(false);
  const [tamperReason, setTamperReason] = useState<'REPLACED_QR_STICKER' | 'SCRATCHED_SERIAL' | 'MISMATCHED_CASING' | 'DAMAGED_SEAL' | 'OTHER'>('REPLACED_QR_STICKER');
  const [tamperDesc, setTamperDesc] = useState('');
  const [submittingTamper, setSubmittingTamper] = useState(false);
  const [tamperSuccess, setTamperSuccess] = useState<string | null>(null);

  // Is current actor authorized to review & reset lockouts?
  const isAuthorizedAuditor = activeRole === 'ADMINISTRATOR' || activeRole === 'REGULATOR_AUDITOR';

  // Step 1: Resolve Digital QR Passport Reference (Safe Pre-Check)
  const handleVerify = async (idToVerify: string) => {
    if (!idToVerify.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);
    setPhysicalResult(null);
    setPhysicalError(null);
    setPhysicalSerial('');
    setTamperSuccess(null);
    setResetSuccessMessage(null);

    try {
      const pre = await api.getTwoStepPrecheck(idToVerify.trim());
      setPrecheck(pre);
      setVerifiedNonce(Math.random().toString(36).substring(2, 10).toUpperCase());
    } catch (err: any) {
      setError(err.message || 'Battery passport reference could not be resolved from registry.');
      setPrecheck(null);
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Submit Permanent Laser-Engraved UID for Backend Comparison
  const handlePhysicalVerify = async (serialToVerify?: string) => {
    const targetSerial = canonicalizeSerial(serialToVerify ?? physicalSerial);
    if (!targetSerial) {
      setPhysicalError('Please enter or scan the permanent laser-engraved UID from the physical battery pack casing.');
      return;
    }
    if (!precheck) {
      setPhysicalError('Digital passport QR must be resolved in Step 1 before physical UID can be verified.');
      return;
    }
    if (precheck.is_locked) {
      setPhysicalError('Physical verification is currently locked. Maximum attempts (5) exceeded. Flagged as Suspicious — Verification Required.');
      return;
    }

    setPhysicalLoading(true);
    setPhysicalError(null);
    setResetSuccessMessage(null);

    try {
      const outcome = await api.verifyPhysicalIdentity(precheck.battery_id, {
        physical_serial: targetSerial,
        inspector_notes: inspectorNotes.trim() || undefined,
        barcode_type: 'MANUAL',
      });

      setPhysicalResult(outcome);

      if (outcome.status === 'MATCHED') {
        // Successful Match: Unseal official battery passport details
        if (outcome.passport_details) {
          setResult(outcome.passport_details);
        } else {
          // Fallback fetch if not returned directly
          const unsealed = await api.verifyPublic(precheck.battery_id);
          setResult(unsealed);
        }

        setPrecheck(prev => prev ? {
          ...prev,
          consecutive_failed_attempts: 0,
          remaining_attempts: 5,
          is_locked: false,
          is_flagged: false,
        } : null);
        setPhysicalError(null);
      } else if (outcome.status === 'SUSPICIOUS_VERIFICATION_REQUIRED' || outcome.is_flagged_for_investigation) {
        // Fifth failed attempt reached: Lockout triggered
        setPrecheck(prev => prev ? {
          ...prev,
          is_locked: true,
          is_flagged: true,
          consecutive_failed_attempts: 5,
          remaining_attempts: 0,
          investigation_reason: outcome.match_details || 'Exceeded 5 consecutive failed verification attempts.',
        } : null);
        setPhysicalError(outcome.match_details || 'Maximum consecutive attempts (5) reached. Battery flagged as Suspicious — Verification Required.');
        setResult(null);
      } else {
        // Failed attempt 1-4: Generic error with remaining count
        const rem = outcome.remaining_attempts !== undefined ? outcome.remaining_attempts : Math.max(0, 5 - (outcome.consecutive_failed_attempts || 1));
        setPrecheck(prev => prev ? {
          ...prev,
          consecutive_failed_attempts: outcome.consecutive_failed_attempts || (prev.consecutive_failed_attempts + 1),
          remaining_attempts: rem,
        } : null);
        setPhysicalError(outcome.match_details || `Physical UID verification failed. Invalid serial. ${rem} attempt(s) remaining before security lockout.`);
        setResult(null);
      }
    } catch (err: any) {
      if (err.statusCode === 423 || err.is_locked) {
        setPrecheck(prev => prev ? {
          ...prev,
          is_locked: true,
          is_flagged: true,
          remaining_attempts: 0,
        } : null);
        setPhysicalError(err.message || 'Battery is locked due to excessive failed verification attempts. Flagged as Suspicious — Verification Required.');
      } else {
        setPhysicalError(err.message || 'Physical identity verification failed.');
      }
      setResult(null);
    } finally {
      setPhysicalLoading(false);
    }
  };

  // Authorized Admin / Inspector Review and Lockout Reset
  const handleResetLockout = async () => {
    if (!precheck) return;
    setResettingLockout(true);
    setPhysicalError(null);
    try {
      const outcome = await api.resetLockout(
        precheck.battery_id,
        adminReviewNotes.trim() || 'Lockout cleared by authorized inspector after physical casing inspection.'
      );
      setResetSuccessMessage(outcome.message || 'Security lockout cleared and battery restored for verification.');
      setAdminReviewNotes('');
      // Reload clean precheck session
      await handleVerify(precheck.battery_id);
    } catch (err: any) {
      setPhysicalError(err.message || 'Failed to reset lockout.');
    } finally {
      setResettingLockout(false);
    }
  };

  // Report Physical Tampering
  const handleSubmitTamperReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!precheck || !tamperDesc.trim()) return;

    setSubmittingTamper(true);
    try {
      const report = await api.reportTampering(precheck.battery_id, {
        reason: tamperReason,
        description: tamperDesc.trim(),
        reported_serial: physicalSerial.trim() || undefined,
      });
      setTamperSuccess(report.message || t.tamperReportSuccess);
      setShowTamperModal(false);
      setTamperDesc('');
    } catch (err: any) {
      setPhysicalError(err.message || 'Failed to submit tamper report.');
    } finally {
      setSubmittingTamper(false);
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

  // Overall Status Derivation
  const getOverallStatus = (): {
    statusType: DisplayStatusType;
    statusLabel: string;
    description: string;
    badgeStyle: string;
  } => {
    if (precheck?.is_locked) {
      return {
        statusType: 'SUSPICIOUS_LOCKED',
        statusLabel: 'Suspicious — Verification Required',
        description: 'Maximum consecutive failed attempts (5) reached. Battery flagged for regulatory investigation; verification is temporarily locked.',
        badgeStyle: 'bg-[#FEE2E2] dark:bg-[#7F1D1D]/50 text-[#DC2626] dark:text-[#F87171] border-[#FECACA] dark:border-[#991B1B]',
      };
    }

    if (!result || !physicalResult || physicalResult.status !== 'MATCHED') {
      return {
        statusType: 'VERIFICATION_REQUIRED',
        statusLabel: t.statusVerificationRequired,
        description: 'Step 1 complete (Digital QR reference resolved). Step 2 physical casing UID verification is required to unlock full passport details.',
        badgeStyle: 'bg-[#FEF3C7] dark:bg-[#78350F]/40 text-[#D97706] dark:text-[#FBBF24] border-[#FDE68A] dark:border-[#78350F]/60',
      };
    }

    return {
      statusType: 'MATCHED',
      statusLabel: t.statusMatched,
      description: `Identity strictly matched: Permanent laser-engraved casing UID '${physicalResult.registered_serial_number}' strictly matches registered passport '${physicalResult.battery_id}'.`,
      badgeStyle: 'bg-[#ECFDF3] dark:bg-[#064E3B]/50 text-[#059669] dark:text-[#34D399] border-[#D1FAE5] dark:border-[#065F46]',
    };
  };

  const overallStatus = getOverallStatus();
  const currentOrigin = typeof window !== 'undefined' ? window.location.origin : 'https://batterypass360.eu';
  const qrVerificationUrl = precheck ? `${currentOrigin}/verify/${encodeURIComponent(precheck.battery_id)}` : '';
  const remainingAttempts = precheck ? precheck.remaining_attempts : 5;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-8 select-none text-[#1F2937] dark:text-[#F1F5F9]">
      {/* Search & Header */}
      <div className="text-center space-y-3">
        <div className="inline-flex p-3 rounded-2xl bg-[#ECFDF3] dark:bg-[#064E3B]/30 border border-[#D1FAE5] dark:border-[#065F46] text-[#059669] shadow-sm">
          <ShieldCheck className="w-8 h-8 stroke-[2.2]" />
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-[#14532D] dark:text-[#34D399] tracking-tight">
          Two-Step Battery Identity Verification
        </h1>
        <p className="text-xs sm:text-sm text-[#64748B] dark:text-[#94A3B8] max-w-xl mx-auto leading-relaxed">
          Official European Union digital battery passport verification (EU 2023/1542). Protected passport telemetry, chemistry, and compliance records remain sealed until permanent physical casing UID is authenticated.
        </p>

        {/* 2-Step Workflow Progress Pill Header */}
        <div className="max-w-xl mx-auto pt-2">
          <div className="grid grid-cols-2 gap-2 p-1.5 rounded-2xl bg-white dark:bg-[#121F17] border border-[#E5E7EB] dark:border-[#1E382B] shadow-xs text-xs">
            <div className={`flex items-center justify-center space-x-2 py-2 px-3 rounded-xl font-medium transition-all ${
              precheck 
                ? 'bg-[#ECFDF3] dark:bg-[#064E3B]/40 text-[#059669] dark:text-[#34D399]' 
                : 'bg-[#F8FAF7] dark:bg-[#16261D] text-[#64748B] dark:text-[#94A3B8]'
            }`}>
              {precheck ? <CheckCircle2 className="w-4 h-4 shrink-0 text-[#059669]" /> : <QrCode className="w-4 h-4 shrink-0" />}
              <span className="font-semibold">Step 1: Digital QR Scan</span>
            </div>

            <div className={`flex items-center justify-center space-x-2 py-2 px-3 rounded-xl font-medium transition-all ${
              overallStatus.statusType === 'MATCHED'
                ? 'bg-[#ECFDF3] dark:bg-[#064E3B]/40 text-[#059669] dark:text-[#34D399]'
                : overallStatus.statusType === 'SUSPICIOUS_LOCKED'
                ? 'bg-[#FEE2E2] dark:bg-[#7F1D1D]/40 text-[#DC2626] dark:text-[#F87171]'
                : 'bg-[#FFFBEB] dark:bg-[#78350F]/30 text-[#D97706] dark:text-[#FBBF24]'
            }`}>
              {overallStatus.statusType === 'MATCHED' ? (
                <CheckCircle2 className="w-4 h-4 shrink-0 text-[#059669]" />
              ) : overallStatus.statusType === 'SUSPICIOUS_LOCKED' ? (
                <AlertOctagon className="w-4 h-4 shrink-0 text-[#DC2626]" />
              ) : (
                <Fingerprint className="w-4 h-4 shrink-0 text-[#D97706]" />
              )}
              <span className="font-semibold">Step 2: Physical UID Casing</span>
            </div>
          </div>
        </div>

        {/* Search Input Bar for Step 1 QR Reference */}
        <div className="max-w-lg mx-auto pt-2 space-y-2.5">
          <div className="flex items-center space-x-2 bg-white dark:bg-[#121F17] border border-[#E5E7EB] dark:border-[#1E382B] rounded-2xl p-1.5 focus-within:border-[#14532D] shadow-sm">
            <Search className="w-4 h-4 text-[#64748B] dark:text-[#94A3B8] ml-3" />
            <input
              type="text"
              placeholder="Enter Battery ID (e.g. BAT-NMC-8A2F91C0)"
              value={searchId}
              onChange={e => setSearchId(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleVerify(searchId)}
              className="w-full bg-transparent border-none text-xs text-[#1F2937] dark:text-[#F1F5F9] focus:outline-none placeholder-[#94A3B8] font-mono"
            />
            <button
              onClick={() => {
                if (onOpenScannerModal) {
                  onOpenScannerModal();
                } else {
                  setIsDigitalScannerOpen(true);
                }
              }}
              title="Scan QR Code"
              className="p-2 rounded-xl bg-[#F8FAF7] dark:bg-[#16261D] hover:bg-[#ECFDF3] dark:hover:bg-[#1F382B] text-[#14532D] dark:text-[#34D399] border border-[#E5E7EB] dark:border-[#1E382B] transition-colors"
            >
              <Camera className="w-4 h-4" />
            </button>
            <button
              onClick={() => handleVerify(searchId)}
              disabled={loading}
              className="px-4 py-2 rounded-xl bg-[#14532D] hover:bg-[#166534] text-white text-xs font-bold transition-all shadow-sm disabled:opacity-50"
            >
              {loading ? t.loading : 'Resolve QR'}
            </button>
          </div>

          <div className="flex items-center justify-center space-x-2 text-[11px] text-[#64748B] dark:text-[#94A3B8]">
            <span>Quick QR Passports:</span>
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

      {/* Reset Lockout Success Toast */}
      {resetSuccessMessage && (
        <div className="p-4 rounded-2xl bg-[#ECFDF3] dark:bg-[#064E3B]/30 border border-[#D1FAE5] dark:border-[#065F46] text-[#059669] dark:text-[#34D399] text-xs flex items-center space-x-3 font-medium">
          <Check className="w-5 h-5 shrink-0" />
          <span>{resetSuccessMessage}</span>
        </div>
      )}

      {/* STEP 1: RESOLVED QR PASSPORT REFERENCE (Shell State) */}
      {precheck && (
        <div className="bg-white dark:bg-[#121F17] rounded-3xl p-6 sm:p-8 border border-[#E5E7EB] dark:border-[#1E382B] shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#E5E7EB] dark:border-[#1E382B]">
            <div>
              <div className="flex items-center space-x-2">
                <QrCode className="w-4 h-4 text-[#059669]" />
                <span className="text-xs font-bold text-[#059669] dark:text-[#34D399] uppercase tracking-wider font-mono">
                  Step 1: Digital Passport QR Reference Resolved
                </span>
              </div>
              <h2 className="text-2xl font-extrabold text-[#14532D] dark:text-[#34D399] mt-1 font-mono tracking-tight">
                {precheck.battery_id}
              </h2>
              <p className="text-[11px] font-mono text-[#64748B] dark:text-[#94A3B8] mt-0.5 break-all">
                {precheck.battery_did}
              </p>
            </div>

            {/* Authoritative Single Status Display Badge */}
            <div className="text-left sm:text-right space-y-1.5">
              <div>
                <span className={`inline-flex items-center space-x-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold border transition-all ${overallStatus.badgeStyle}`}>
                  {overallStatus.statusType === 'MATCHED' && <CheckCircle2 className="w-4 h-4 text-[#059669]" />}
                  {overallStatus.statusType === 'SUSPICIOUS_LOCKED' && <AlertOctagon className="w-4 h-4 text-[#DC2626] animate-pulse" />}
                  {overallStatus.statusType === 'VERIFICATION_REQUIRED' && <Fingerprint className="w-4 h-4 text-[#D97706]" />}
                  <span>{overallStatus.statusLabel}</span>
                </span>
              </div>
              <div className="text-[10px] text-[#64748B] dark:text-[#94A3B8] font-mono">
                Manufacturer: <span className="font-bold text-[#1F2937] dark:text-[#F1F5F9]">{precheck.manufacturer_hint || 'Authorized OEM'}</span>
              </div>
              {verifiedNonce && (
                <div className="text-[9px] text-[#94A3B8] font-mono">
                  Session Nonce: <span className="text-[#14532D] dark:text-[#34D399] font-bold">{verifiedNonce}</span>
                </div>
              )}
            </div>
          </div>

          {/* Sealed Passport Details Notice (Before Step 2 Physical Match) */}
          {!result && (
            <div className="p-4 rounded-2xl bg-[#F8FAF7] dark:bg-[#16261D] border border-[#E5E7EB] dark:border-[#1E382B] flex items-start space-x-3.5">
              <div className="p-2 rounded-xl bg-[#FEF3C7] dark:bg-[#78350F]/40 text-[#D97706] shrink-0 mt-0.5">
                <Lock className="w-4 h-4" />
              </div>
              <div className="space-y-1 text-xs">
                <div className="font-bold text-[#1F2937] dark:text-[#F1F5F9]">
                  Protected Passport Telemetry & Health Records Sealed
                </div>
                <p className="text-[#64748B] dark:text-[#94A3B8] leading-relaxed">
                  In compliance with EU Regulation 2023/1542, battery state-of-health, cell chemistry, and compliance certificates are not disclosed merely by scanning a QR sticker. 
                  Inspect the physical battery pack and submit the permanent laser-engraved UID below to unlock authenticated records.
                </p>
              </div>
            </div>
          )}

          {/* STEP 2: PHYSICAL CASING UID VERIFICATION PANEL */}
          <div className="pt-2 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start space-x-3">
                <div className="p-2.5 rounded-2xl bg-[#ECFDF3] dark:bg-[#064E3B]/40 text-[#059669] border border-[#D1FAE5] dark:border-[#065F46] shrink-0">
                  <Fingerprint className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-[#14532D] dark:text-[#34D399]">
                    Step 2: Permanent Laser-Engraved UID Verification
                  </h3>
                  <p className="text-xs text-[#64748B] dark:text-[#94A3B8] mt-0.5">
                    Enter or scan the permanent UID / serial number engraved on the battery casing plate.
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-2 shrink-0">
                {/* Consecutive Failed Attempts Counter */}
                <div className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-[#F8FAF7] dark:bg-[#16261D] border border-[#E5E7EB] dark:border-[#1E382B] text-xs font-mono">
                  <span className="text-[#64748B] dark:text-[#94A3B8]">Remaining:</span>
                  <span className={`font-bold ${
                    remainingAttempts >= 4
                      ? 'text-[#059669]'
                      : remainingAttempts >= 2
                      ? 'text-[#D97706]'
                      : 'text-[#DC2626]'
                  }`}>
                    {remainingAttempts} / 5
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => setShowTamperModal(true)}
                  className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-xl bg-[#FEF2F2] dark:bg-[#7F1D1D]/30 border border-[#FEE2E2] dark:border-[#991B1B] text-[#DC2626] dark:text-[#F87171] text-xs font-bold hover:bg-[#FEE2E2] transition-colors"
                >
                  <Flag className="w-3.5 h-3.5" />
                  <span>Report Tamper</span>
                </button>
              </div>
            </div>

            {/* SECURITY LOCKOUT ALERT BOX (When 5 failures reached) */}
            {precheck.is_locked ? (
              <div className="p-5 rounded-2xl bg-[#FEF2F2] dark:bg-[#7F1D1D]/30 border border-[#FEE2E2] dark:border-[#991B1B] space-y-4">
                <div className="flex items-start space-x-3.5">
                  <div className="p-2.5 rounded-xl bg-[#DC2626] text-white shrink-0 mt-0.5">
                    <AlertOctagon className="w-6 h-6" />
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-sm font-extrabold text-[#991B1B] dark:text-[#F87171]">
                      Security Lockout: Battery Flagged as "Suspicious — Verification Required"
                    </h4>
                    <p className="text-xs text-[#7F1D1D] dark:text-[#FCA5A5] leading-relaxed">
                      Maximum allowable consecutive attempts (5) have failed. To prevent counterfeit QR swaps and brute-force guessing of physical serial numbers, this battery has been temporarily locked and logged to the immutable security audit trail.
                    </p>
                    {precheck.investigation_reason && (
                      <div className="text-[11px] font-mono text-[#991B1B] dark:text-[#F87171] pt-1">
                        Reason: {precheck.investigation_reason}
                      </div>
                    )}
                  </div>
                </div>

                {/* Authorized Review & Reset Panel for Administrators & Auditors */}
                {isAuthorizedAuditor ? (
                  <div className="pt-3 border-t border-[#FECACA] dark:border-[#991B1B]/60 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-[#991B1B] dark:text-[#F87171] uppercase tracking-wider font-mono flex items-center space-x-1.5">
                        <UserCheck className="w-4 h-4" />
                        <span>Authorized Auditor Lockout Management ({activeRole})</span>
                      </span>
                    </div>
                    <p className="text-[11px] text-[#7F1D1D] dark:text-[#FCA5A5]">
                      As an authorized auditor or administrator, you may inspect the physical pack, record your regulatory findings, and reset the lockout state.
                    </p>
                    <div className="flex flex-col sm:flex-row items-stretch gap-2">
                      <input
                        type="text"
                        placeholder="Enter audit review notes (e.g. In-person laser engraving verified against OEM ledger)..."
                        value={adminReviewNotes}
                        onChange={e => setAdminReviewNotes(e.target.value)}
                        className="flex-1 bg-white dark:bg-[#121F17] border border-[#FECACA] dark:border-[#991B1B] rounded-xl px-3 py-2 text-xs text-[#1F2937] dark:text-[#F1F5F9] focus:outline-none focus:border-[#991B1B]"
                      />
                      <button
                        type="button"
                        onClick={handleResetLockout}
                        disabled={resettingLockout}
                        className="px-4 py-2 rounded-xl bg-[#059669] hover:bg-[#047857] text-white text-xs font-bold transition-all shadow-sm flex items-center justify-center space-x-1.5 shrink-0 disabled:opacity-50"
                      >
                        <Unlock className="w-4 h-4" />
                        <span>{resettingLockout ? 'Clearing Lockout...' : 'Review & Clear Lockout'}</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="text-[11px] text-[#991B1B] dark:text-[#FCA5A5] italic pt-1">
                    Please contact an authorized regulator auditor or system administrator to inspect the physical pack and resolve this alert.
                  </p>
                )}
              </div>
            ) : (
              /* Physical UID Verification Form (Active when not locked) */
              <div className="space-y-3">
                <label className="block text-xs font-bold text-[#1F2937] dark:text-[#F1F5F9]">
                  Permanently Engraved Casing Serial Number
                </label>

                <div className="flex flex-col sm:flex-row items-stretch gap-2.5">
                  <div className="relative flex-1">
                    <FileText className="w-4 h-4 text-[#94A3B8] absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Enter the serial number engraved on the battery casing (e.g. QV-2024-NMC-98124)"
                      value={physicalSerial}
                      onChange={e => setPhysicalSerial(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handlePhysicalVerify()}
                      className="w-full bg-[#F8FAF7] dark:bg-[#16261D] border border-[#E5E7EB] dark:border-[#1E382B] rounded-xl pl-10 pr-3 py-2.5 text-xs text-[#1F2937] dark:text-[#F1F5F9] focus:outline-none focus:border-[#14532D] font-mono uppercase"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() => handlePhysicalVerify()}
                    disabled={physicalLoading}
                    className="px-6 py-2.5 rounded-xl bg-[#14532D] hover:bg-[#166534] text-white text-xs font-bold transition-all shadow-sm disabled:opacity-50 flex items-center justify-center space-x-2 shrink-0"
                  >
                    <Fingerprint className="w-4 h-4" />
                    <span>{physicalLoading ? t.loading : 'Verify Engraved Serial'}</span>
                  </button>
                </div>

                {/* Quick Simulation Chips */}
                <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px] text-[#64748B] dark:text-[#94A3B8]">
                  <span className="font-medium">Test Inputs:</span>
                  <button
                    type="button"
                    onClick={() => {
                      const sampleValid = precheck.battery_id.includes('NMC') 
                        ? 'QV-2024-NMC-98124' 
                        : precheck.battery_id.includes('LFP')
                        ? 'NBS-2023-LFP-44109'
                        : 'CATL-2024-NCA-10492';
                      setPhysicalSerial(sampleValid);
                      handlePhysicalVerify(sampleValid);
                    }}
                    className="px-2.5 py-1 rounded-lg bg-[#ECFDF3] dark:bg-[#064E3B]/40 text-[#059669] dark:text-[#34D399] border border-[#D1FAE5] dark:border-[#065F46] font-mono text-[10px] font-bold hover:bg-[#D1FAE5] transition-colors"
                  >
                    ✓ Valid Engraved Serial
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const swapped = precheck.battery_id.includes('NMC') ? 'NBS-2023-LFP-44109' : 'QV-2024-NMC-98124';
                      setPhysicalSerial(swapped);
                      handlePhysicalVerify(swapped);
                    }}
                    className="px-2.5 py-1 rounded-lg bg-[#FEF2F2] dark:bg-[#7F1D1D]/30 text-[#DC2626] dark:text-[#F87171] border border-[#FEE2E2] dark:border-[#991B1B] font-mono text-[10px] font-bold hover:bg-[#FEE2E2] transition-colors"
                  >
                    ⚠ Swapped QR Sticker
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const fake = 'FAKE-ENGRAVED-SERIAL-999';
                      setPhysicalSerial(fake);
                      handlePhysicalVerify(fake);
                    }}
                    className="px-2.5 py-1 rounded-lg bg-[#FFFBEB] dark:bg-[#78350F]/30 text-[#D97706] dark:text-[#FBBF24] border border-[#FDE68A] dark:border-[#78350F] font-mono text-[10px] font-bold hover:bg-[#FEF3C7] transition-colors"
                  >
                    ✕ Counterfeit Serial
                  </button>
                </div>
              </div>
            )}

            {/* Physical Error Banner */}
            {physicalError && !precheck.is_locked && (
              <div className="p-3.5 rounded-xl bg-[#FEE2E2] dark:bg-[#7F1D1D]/30 border border-[#FECACA] dark:border-[#991B1B] text-[#DC2626] dark:text-[#F87171] text-xs flex items-center space-x-2 font-medium">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{physicalError}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* STEP 3: UNLOCKED OFFICIAL BATTERY PASSPORT METROLOGY (Rendered strictly post-match) */}
      {result && physicalResult?.status === 'MATCHED' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-[#121F17] rounded-3xl p-6 sm:p-8 border border-[#D1FAE5] dark:border-[#065F46] relative overflow-hidden shadow-sm space-y-6">
            
            {/* Success Match Header */}
            <div className="p-4 rounded-2xl bg-[#ECFDF3] dark:bg-[#064E3B]/40 border border-[#A7F3D0] dark:border-[#065F46] flex items-center justify-between gap-3">
              <div className="flex items-center space-x-3">
                <div className="p-2 rounded-xl bg-[#059669] text-white shrink-0">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-[#065F46] dark:text-[#34D399]">
                    Dual-ID Matched: Official EU Battery Passport Unlocked
                  </h3>
                  <p className="text-xs text-[#047857] dark:text-[#A7F3D0] mt-0.5">
                    Physical permanent UID strictly matches registered Supabase passport. All metrology records are cryptographically verified.
                  </p>
                </div>
              </div>

              <button
                onClick={() => onNavigateDetail(result.battery_id)}
                className="px-4 py-2 rounded-xl bg-[#14532D] hover:bg-[#166534] text-white text-xs font-bold transition-all shadow-sm shrink-0"
              >
                {t.viewDetails}
              </button>
            </div>

            {/* DUAL IDENTIFIERS COMPARISON SUMMARY */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#14532D] dark:text-[#34D399] uppercase tracking-wider font-mono">
                  Dual-ID Verification Comparison (Digital vs Physical)
                </span>
                <span className="text-[11px] text-[#64748B] dark:text-[#94A3B8] font-medium">
                  EU Regulation 2023/1542 Compliant
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Identifier 1: Digital Passport QR Code */}
                <div className="p-4 rounded-2xl bg-[#F8FAF7] dark:bg-[#16261D] border border-[#E5E7EB] dark:border-[#1E382B] flex items-center space-x-4">
                  <div className="p-2 bg-white rounded-xl border border-[#E5E7EB] shrink-0 shadow-xs">
                    <QRCodeSVG
                      value={qrVerificationUrl || result.battery_id}
                      size={64}
                      level="M"
                      includeMargin={false}
                    />
                  </div>
                  <div className="space-y-1 min-w-0 flex-1">
                    <div className="flex items-center space-x-1.5 text-[11px] font-bold text-[#059669] dark:text-[#34D399]">
                      <Check className="w-3.5 h-3.5" />
                      <span>Identifier 1: Digital Passport QR</span>
                    </div>
                    <div className="font-mono text-xs font-bold text-[#1F2937] dark:text-[#F1F5F9] truncate">
                      {result.battery_id}
                    </div>
                    <div className="text-[10px] text-[#64748B] dark:text-[#94A3B8] truncate">
                      Source: Supabase Ledger (Registered)
                    </div>
                  </div>
                </div>

                {/* Identifier 2: Permanent Engraved Physical Serial */}
                <div className="p-4 rounded-2xl bg-[#F8FAF7] dark:bg-[#16261D] border border-[#E5E7EB] dark:border-[#1E382B] flex items-center space-x-4">
                  <div className="p-3 bg-white dark:bg-[#121F17] rounded-xl border border-[#E5E7EB] dark:border-[#1E382B] shrink-0 shadow-xs flex items-center justify-center">
                    <FileText className="w-8 h-8 text-[#059669]" />
                  </div>
                  <div className="space-y-1 min-w-0 flex-1">
                    <div className="flex items-center space-x-1.5 text-[11px] font-bold text-[#14532D] dark:text-[#34D399]">
                      <Check className="w-3.5 h-3.5" />
                      <span>Identifier 2: Permanently Engraved Serial</span>
                    </div>
                    <div className="font-mono text-xs font-bold text-[#1F2937] dark:text-[#F1F5F9] truncate">
                      {result.serial_number || physicalSerial}
                    </div>
                    <div className="text-[10px] text-[#64748B] dark:text-[#94A3B8]">
                      Physical Casing Laser Engraving (Matched)
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Core Metrology Grid (Real Data Unlocked) */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 py-2">
              <div className="p-3.5 rounded-xl bg-[#F8FAF7] dark:bg-[#16261D] border border-[#E5E7EB] dark:border-[#1E382B]">
                <div className="text-[11px] text-[#64748B] dark:text-[#94A3B8]">Manufacturer</div>
                <div className="text-xs font-bold text-[#1F2937] dark:text-[#F1F5F9] mt-1">{result.manufacturer_name}</div>
              </div>

              <div className="p-3.5 rounded-xl bg-[#F8FAF7] dark:bg-[#16261D] border border-[#E5E7EB] dark:border-[#1E382B]">
                <div className="text-[11px] text-[#64748B] dark:text-[#94A3B8]">{t.chemistry}</div>
                <div className="text-xs font-bold text-[#14532D] dark:text-[#34D399] mt-1">{result.chemistry}</div>
              </div>

              <div className="p-3.5 rounded-xl bg-[#F8FAF7] dark:bg-[#16261D] border border-[#E5E7EB] dark:border-[#1E382B]">
                <div className="text-[11px] text-[#64748B] dark:text-[#94A3B8]">{t.stateOfHealth} (BMS Telemetry)</div>
                <div className="text-xs font-bold text-[#059669] dark:text-[#34D399] mt-1 font-mono">{result.state_of_health_pct}%</div>
              </div>

              <div className="p-3.5 rounded-xl bg-[#F8FAF7] dark:bg-[#16261D] border border-[#E5E7EB] dark:border-[#1E382B]">
                <div className="text-[11px] text-[#64748B] dark:text-[#94A3B8]">{t.carbonFootprint}</div>
                <div className="text-xs font-bold text-[#0D9488] dark:text-[#2DD4BF] mt-1 font-mono">{result.carbon_footprint_total} kg CO₂/kWh</div>
              </div>
            </div>

            {/* Additional Manufacturing Details */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3.5 py-2 border-t border-[#E5E7EB] dark:border-[#1E382B]">
              <div className="p-3 rounded-xl bg-[#F8FAF7] dark:bg-[#16261D] border border-[#E5E7EB] dark:border-[#1E382B]">
                <div className="text-[10px] text-[#64748B] dark:text-[#94A3B8] flex items-center space-x-1">
                  <Calendar className="w-3 h-3" />
                  <span>Manufacturing Date</span>
                </div>
                <div className="text-xs font-mono font-bold text-[#1F2937] dark:text-[#F1F5F9] mt-0.5">
                  {new Date(result.manufacturing_date).toLocaleDateString()}
                </div>
              </div>

              <div className="p-3 rounded-xl bg-[#F8FAF7] dark:bg-[#16261D] border border-[#E5E7EB] dark:border-[#1E382B]">
                <div className="text-[10px] text-[#64748B] dark:text-[#94A3B8] flex items-center space-x-1">
                  <MapPin className="w-3 h-3" />
                  <span>Country & Facility</span>
                </div>
                <div className="text-xs font-bold text-[#1F2937] dark:text-[#F1F5F9] mt-0.5 truncate">
                  {result.manufacturing_country || 'EU'} • {result.manufacturing_facility || 'Certified OEM Facility'}
                </div>
              </div>

              <div className="p-3 rounded-xl bg-[#F8FAF7] dark:bg-[#16261D] border border-[#E5E7EB] dark:border-[#1E382B]">
                <div className="text-[10px] text-[#64748B] dark:text-[#94A3B8] flex items-center space-x-1">
                  <Layers className="w-3 h-3" />
                  <span>Model Designation</span>
                </div>
                <div className="text-xs font-bold text-[#1F2937] dark:text-[#F1F5F9] mt-0.5 truncate">
                  {result.model_designation}
                </div>
              </div>
            </div>

            {/* Tamper Evidence Seal & Lifecycle Hash Banner */}
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

              <div className="text-[11px] font-mono text-[#059669] dark:text-[#34D399] font-bold">
                ✓ Cryptographic Audit Valid
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Step 1 Digital QR Scanner Modal */}
      <QRScannerModal
        isOpen={isDigitalScannerOpen}
        onClose={() => setIsDigitalScannerOpen(false)}
        title="Scan Digital Battery Passport QR Code"
        onScanSuccess={(detectedCode) => {
          setIsDigitalScannerOpen(false);
          setSearchId(detectedCode);
          handleVerify(detectedCode);
        }}
      />

      {/* Report Tampering Modal */}
      {showTamperModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs select-none">
          <div className="bg-white dark:bg-[#121F17] border border-[#E5E7EB] dark:border-[#1E382B] rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl relative text-[#1F2937] dark:text-[#F1F5F9]">
            <button
              onClick={() => setShowTamperModal(false)}
              className="absolute top-4 right-4 p-2 rounded-xl bg-[#F8FAF7] dark:bg-[#16261D] text-[#64748B] hover:text-[#1F2937] dark:hover:text-white border border-[#E5E7EB] dark:border-[#1E382B]"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="text-center mb-5">
              <div className="inline-flex p-3 rounded-2xl bg-[#FEF2F2] dark:bg-[#7F1D1D]/30 border border-[#FEE2E2] dark:border-[#991B1B] text-[#DC2626] mb-2">
                <Flag className="w-6 h-6 stroke-[2.2]" />
              </div>
              <h3 className="text-lg font-bold text-[#14532D] dark:text-[#34D399]">
                {t.reportTamperTitle}
              </h3>
              <p className="text-xs text-[#64748B] dark:text-[#94A3B8] mt-1">
                {t.reportTamperDesc}
              </p>
            </div>

            <form onSubmit={handleSubmitTamperReport} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold mb-1 text-[#1F2937] dark:text-[#F1F5F9]">
                  {t.reportTamperReason}
                </label>
                <select
                  value={tamperReason}
                  onChange={(e: any) => setTamperReason(e.target.value)}
                  className="w-full bg-[#F8FAF7] dark:bg-[#16261D] border border-[#E5E7EB] dark:border-[#1E382B] rounded-xl p-2.5 text-xs text-[#1F2937] dark:text-[#F1F5F9] focus:outline-none focus:border-[#14532D]"
                >
                  <option value="REPLACED_QR_STICKER">Replaced / Peeled QR Sticker</option>
                  <option value="SCRATCHED_SERIAL">Scratched / Obscured Laser Engraving</option>
                  <option value="MISMATCHED_CASING">Casing Mismatch / Cell Enclosure Opened</option>
                  <option value="DAMAGED_SEAL">Damaged Tamper-Evident Security Seal</option>
                  <option value="OTHER">Other Regulatory Suspicion</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1 text-[#1F2937] dark:text-[#F1F5F9]">
                  {t.reportTamperDetails}
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="Describe the physical condition, location, or observed label alteration..."
                  value={tamperDesc}
                  onChange={e => setTamperDesc(e.target.value)}
                  className="w-full bg-[#F8FAF7] dark:bg-[#16261D] border border-[#E5E7EB] dark:border-[#1E382B] rounded-xl p-2.5 text-xs text-[#1F2937] dark:text-[#F1F5F9] focus:outline-none focus:border-[#14532D]"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowTamperModal(false)}
                  className="px-4 py-2 rounded-xl bg-[#F8FAF7] dark:bg-[#16261D] border border-[#E5E7EB] dark:border-[#1E382B] text-xs font-semibold text-[#64748B]"
                >
                  {t.close}
                </button>
                <button
                  type="submit"
                  disabled={submittingTamper}
                  className="px-5 py-2 rounded-xl bg-[#DC2626] hover:bg-[#B91C1C] text-white text-xs font-bold transition-all shadow-sm disabled:opacity-50"
                >
                  {submittingTamper ? t.loading : t.submitTamperReport}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default VerifyPublic;
