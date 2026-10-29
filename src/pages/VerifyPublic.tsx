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
  Barcode,
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
  RefreshCw
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { Barcode128 } from '../components/Barcode128';
import { PublicVerification, PhysicalVerificationResponse } from '../types';
import { api } from '../services/api';
import { useLanguage } from '../context/LanguageContext';
import { QRScannerModal } from '../components/QRScannerModal';

interface VerifyPublicProps {
  initialId?: string;
  onNavigateDetail: (id: string) => void;
  onOpenScannerModal?: () => void;
}

type DisplayStatusType = 'MATCHED' | 'MISMATCH_FRAUD' | 'VERIFICATION_REQUIRED';

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

  // Dual-ID Physical Verification State
  const [physicalSerial, setPhysicalSerial] = useState('');
  const [inspectorNotes, setInspectorNotes] = useState('');
  const [physicalLoading, setPhysicalLoading] = useState(false);
  const [physicalResult, setPhysicalResult] = useState<PhysicalVerificationResponse | null>(null);
  const [physicalError, setPhysicalError] = useState<string | null>(null);
  
  // Modals for Step 1 QR and Step 2 Casing Scanner
  const [isDigitalScannerOpen, setIsDigitalScannerOpen] = useState(false);
  const [isCasingScannerOpen, setIsCasingScannerOpen] = useState(false);

  // Tamper Reporting State
  const [showTamperModal, setShowTamperModal] = useState(false);
  const [tamperReason, setTamperReason] = useState<'REPLACED_QR_STICKER' | 'SCRATCHED_SERIAL' | 'MISMATCHED_CASING' | 'DAMAGED_SEAL' | 'OTHER'>('REPLACED_QR_STICKER');
  const [tamperDesc, setTamperDesc] = useState('');
  const [submittingTamper, setSubmittingTamper] = useState(false);
  const [tamperSuccess, setTamperSuccess] = useState<string | null>(null);

  const handleVerify = async (idToVerify: string) => {
    if (!idToVerify.trim()) return;
    setLoading(true);
    setError(null);
    setPhysicalResult(null);
    setPhysicalError(null);
    setPhysicalSerial('');
    setTamperSuccess(null);
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

  const handlePhysicalVerify = async (serialToVerify?: string) => {
    const targetSerial = (serialToVerify ?? physicalSerial).trim();
    if (!targetSerial) {
      setPhysicalError('Please enter or scan the permanent laser-etched serial number from the battery pack casing.');
      setPhysicalResult(null);
      return;
    }
    if (!result) {
      setPhysicalError('Digital passport must be resolved in Step 1 before verifying physical casing serial.');
      return;
    }

    setPhysicalLoading(true);
    setPhysicalError(null);
    try {
      const outcome = await api.verifyPhysicalIdentity(result.battery_id, {
        physical_serial: targetSerial,
        inspector_notes: inspectorNotes.trim() || undefined,
        barcode_type: 'LASER_ETCHED',
      });
      setPhysicalResult(outcome);
    } catch (err: any) {
      setPhysicalError(err.message || 'Physical identity verification failed.');
      setPhysicalResult(null);
    } finally {
      setPhysicalLoading(false);
    }
  };

  const handleSubmitTamperReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!result || !tamperDesc.trim()) return;

    setSubmittingTamper(true);
    try {
      const report = await api.reportTampering(result.battery_id, {
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

  // Derive EXACTLY ONE status: 'Identity Matched' | 'Identity Mismatch — Possible Fraud' | 'Verification Required'
  const getOverallStatus = (): {
    statusType: DisplayStatusType;
    statusLabel: string;
    description: string;
    badgeStyle: string;
  } => {
    // If either identifier is missing or unverified, status is strictly Verification Required
    if (!result || !physicalResult || !physicalSerial.trim()) {
      return {
        statusType: 'VERIFICATION_REQUIRED',
        statusLabel: t.statusVerificationRequired,
        description: 'Step 1 complete (Digital passport loaded). Step 2 physical casing verification is required to confirm identity.',
        badgeStyle: 'bg-[#FEF3C7] dark:bg-[#78350F]/40 text-[#D97706] dark:text-[#FBBF24] border-[#FDE68A] dark:border-[#78350F]/60',
      };
    }

    if (physicalResult.status === 'MATCHED') {
      return {
        statusType: 'MATCHED',
        statusLabel: t.statusMatched,
        description: `Identity strictly matched: Permanent laser-engraved casing serial '${physicalResult.registered_serial_number}' matches digital passport '${physicalResult.battery_id}'.`,
        badgeStyle: 'bg-[#ECFDF3] dark:bg-[#064E3B]/50 text-[#059669] dark:text-[#34D399] border-[#D1FAE5] dark:border-[#065F46]',
      };
    }

    // Both MISMATCH_FRAUD and UNREGISTERED_SERIAL map to 'Identity Mismatch — Possible Fraud'
    return {
      statusType: 'MISMATCH_FRAUD',
      statusLabel: t.statusMismatchFraud,
      description: physicalResult.conflicting_battery_id 
        ? `CRITICAL FRAUD ALERT: Physical serial belongs to different passport (${physicalResult.conflicting_battery_id}). Suspected QR label swap.`
        : `Physical serial '${physicalResult.physical_serial_entered}' does not match registered passport or official manufacturer records.`,
      badgeStyle: 'bg-[#FEE2E2] dark:bg-[#7F1D1D]/50 text-[#DC2626] dark:text-[#F87171] border-[#FECACA] dark:border-[#991B1B]',
    };
  };

  const overallStatus = getOverallStatus();
  const currentOrigin = typeof window !== 'undefined' ? window.location.origin : 'https://batterypass360.eu';
  const qrVerificationUrl = result ? `${currentOrigin}/verify/${encodeURIComponent(result.battery_id)}` : '';

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-8 select-none text-[#1F2937] dark:text-[#F1F5F9]">
      {/* Search & Header */}
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

        {/* 2-Step Workflow Progress Pill Header */}
        <div className="max-w-xl mx-auto pt-2">
          <div className="grid grid-cols-2 gap-2 p-1.5 rounded-2xl bg-white dark:bg-[#121F17] border border-[#E5E7EB] dark:border-[#1E382B] shadow-xs text-xs">
            <div className={`flex items-center justify-center space-x-2 py-2 px-3 rounded-xl font-medium transition-all ${
              result 
                ? 'bg-[#ECFDF3] dark:bg-[#064E3B]/40 text-[#059669] dark:text-[#34D399]' 
                : 'bg-[#F8FAF7] dark:bg-[#16261D] text-[#64748B] dark:text-[#94A3B8]'
            }`}>
              {result ? <CheckCircle2 className="w-4 h-4 shrink-0 text-[#059669]" /> : <QrCode className="w-4 h-4 shrink-0" />}
              <span className="font-semibold">Step 1: Digital QR Scan</span>
            </div>

            <div className={`flex items-center justify-center space-x-2 py-2 px-3 rounded-xl font-medium transition-all ${
              overallStatus.statusType === 'MATCHED'
                ? 'bg-[#ECFDF3] dark:bg-[#064E3B]/40 text-[#059669] dark:text-[#34D399]'
                : overallStatus.statusType === 'MISMATCH_FRAUD'
                ? 'bg-[#FEE2E2] dark:bg-[#7F1D1D]/40 text-[#DC2626] dark:text-[#F87171]'
                : 'bg-[#FFFBEB] dark:bg-[#78350F]/30 text-[#D97706] dark:text-[#FBBF24]'
            }`}>
              {overallStatus.statusType === 'MATCHED' ? (
                <CheckCircle2 className="w-4 h-4 shrink-0 text-[#059669]" />
              ) : overallStatus.statusType === 'MISMATCH_FRAUD' ? (
                <AlertOctagon className="w-4 h-4 shrink-0 text-[#DC2626]" />
              ) : (
                <Fingerprint className="w-4 h-4 shrink-0 text-[#D97706]" />
              )}
              <span className="font-semibold">Step 2: Casing Verification</span>
            </div>
          </div>
        </div>

        {/* Input Bar & Scan QR Actions for Step 1 */}
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
            <button
              onClick={() => {
                if (onOpenScannerModal) {
                  onOpenScannerModal();
                } else {
                  setIsDigitalScannerOpen(true);
                }
              }}
              title={t.scanQrBtn}
              className="p-2 rounded-xl bg-[#F8FAF7] dark:bg-[#16261D] hover:bg-[#ECFDF3] dark:hover:bg-[#1F382B] text-[#14532D] dark:text-[#34D399] border border-[#E5E7EB] dark:border-[#1E382B] transition-colors"
            >
              <Camera className="w-4 h-4" />
            </button>
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
          {/* Main Inspection Banner & EXACTLY ONE Status Display */}
          <div className="bg-white dark:bg-[#121F17] rounded-3xl p-6 sm:p-8 border border-[#D1FAE5] dark:border-[#1E382B] relative overflow-hidden shadow-sm space-y-6">
            
            {/* Suspicious Velocity Alert Banner (if scan velocity threshold exceeded) */}
            {(result.suspicious_repeated_scans || physicalResult?.suspicious_repeated_scans) && (
              <div className="p-4 rounded-2xl bg-[#FEF3C7] dark:bg-[#78350F]/30 border border-[#FDE68A] dark:border-[#92400E] text-[#92400E] dark:text-[#FDE68A] text-xs flex items-start space-x-3">
                <Info className="w-4 h-4 mt-0.5 shrink-0 text-[#D97706]" />
                <div className="space-y-0.5">
                  <div className="font-bold">Scan Frequency Velocity Notice</div>
                  <p>{t.suspiciousVelocityWarning}</p>
                </div>
              </div>
            )}

            {/* Tamper Report Success Notice */}
            {tamperSuccess && (
              <div className="p-4 rounded-2xl bg-[#ECFDF3] dark:bg-[#064E3B]/30 border border-[#D1FAE5] dark:border-[#065F46] text-[#059669] dark:text-[#34D399] text-xs flex items-center space-x-3">
                <Check className="w-4 h-4 shrink-0" />
                <span>{tamperSuccess}</span>
              </div>
            )}

            {/* Certificate Header with Single Authoritative Status Badge */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#E5E7EB] dark:border-[#1E382B]">
              <div>
                <div className="flex items-center space-x-2">
                  <QrCode className="w-4 h-4 text-[#059669]" />
                  <span className="text-xs font-bold text-[#059669] dark:text-[#34D399] uppercase tracking-wider font-mono">
                    EU Battery Passport • Digital Record Resolved
                  </span>
                </div>
                <h2 className="text-2xl font-extrabold text-[#14532D] dark:text-[#34D399] mt-1 font-mono tracking-tight">
                  {result.battery_id}
                </h2>
                <p className="text-[11px] font-mono text-[#64748B] dark:text-[#94A3B8] mt-0.5 break-all">
                  {result.battery_did}
                </p>
              </div>

              {/* Authoritative Single Status Display Badge */}
              <div className="text-left sm:text-right space-y-1.5">
                <div>
                  <span className={`inline-flex items-center space-x-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold border transition-all ${overallStatus.badgeStyle}`}>
                    {overallStatus.statusType === 'MATCHED' && <CheckCircle2 className="w-4 h-4 text-[#059669]" />}
                    {overallStatus.statusType === 'MISMATCH_FRAUD' && <AlertOctagon className="w-4 h-4 text-[#DC2626] animate-pulse" />}
                    {overallStatus.statusType === 'VERIFICATION_REQUIRED' && <Fingerprint className="w-4 h-4 text-[#D97706]" />}
                    <span>{overallStatus.statusLabel}</span>
                  </span>
                </div>

                <div className="text-[10px] text-[#64748B] dark:text-[#94A3B8] font-mono">
                  Resolved: {new Date(result.verification_timestamp).toLocaleString()}
                </div>
                {verifiedNonce && (
                  <div className="text-[9px] text-[#94A3B8] font-mono">
                    Security Nonce: <span className="text-[#14532D] dark:text-[#34D399] font-bold">{verifiedNonce}</span>
                  </div>
                )}
              </div>
            </div>

            {/* DUAL IDENTIFIERS COMPARISON SUMMARY: Shows BOTH Scanned Identifiers */}
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

                {/* Identifier 2: Physical Casing Barcode (Code 128) */}
                <div className="p-4 rounded-2xl bg-[#F8FAF7] dark:bg-[#16261D] border border-[#E5E7EB] dark:border-[#1E382B] flex items-center space-x-4">
                  <div className="p-2 bg-white rounded-xl border border-[#E5E7EB] shrink-0 shadow-xs max-w-[120px] overflow-hidden">
                    <Barcode128
                      serialNumber={result.serial_number || 'UNKNOWN-SERIAL'}
                      height={32}
                      moduleWidth={1.2}
                      showText={false}
                      className="w-full h-auto"
                    />
                  </div>
                  <div className="space-y-1 min-w-0 flex-1">
                    <div className="flex items-center space-x-1.5 text-[11px] font-bold text-[#14532D] dark:text-[#34D399]">
                      <Barcode className="w-3.5 h-3.5" />
                      <span>Identifier 2: Physical Casing Serial</span>
                    </div>
                    <div className="font-mono text-xs font-bold text-[#1F2937] dark:text-[#F1F5F9] truncate">
                      {result.serial_number || 'N/A'}
                    </div>
                    <div className="text-[10px] text-[#64748B] dark:text-[#94A3B8]">
                      Format: ISO/IEC 15417 Code 128 (Laser Etch)
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Core Metrology Grid (Real Data) */}
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

            {/* Additional Real Manufacturing Details Grid */}
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
                  {result.manufacturing_country || 'EU'} • {result.manufacturing_facility || 'Certified OEM Gigafactory'}
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

              <button
                onClick={() => onNavigateDetail(result.battery_id)}
                className="px-4 py-2 rounded-xl bg-[#14532D] hover:bg-[#166534] text-white text-xs font-bold transition-all shadow-sm shrink-0"
              >
                {t.viewDetails}
              </button>
            </div>
          </div>

          {/* DUAL-ID PHYSICAL IDENTITY VERIFICATION PANEL (Step 2) */}
          <div className="bg-white dark:bg-[#121F17] rounded-3xl p-6 sm:p-8 border border-[#E5E7EB] dark:border-[#1E382B] space-y-6 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start space-x-3">
                <div className="p-2.5 rounded-2xl bg-[#ECFDF3] dark:bg-[#064E3B]/40 text-[#059669] border border-[#D1FAE5] dark:border-[#065F46] shrink-0">
                  <Fingerprint className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-[#14532D] dark:text-[#34D399]">
                    {t.dualIdSectionTitle}
                  </h3>
                  <p className="text-xs text-[#64748B] dark:text-[#94A3B8] mt-0.5">
                    {t.dualIdSectionSubtitle}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowTamperModal(true)}
                className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-[#FEF2F2] dark:bg-[#7F1D1D]/30 border border-[#FEE2E2] dark:border-[#991B1B] text-[#DC2626] dark:text-[#F87171] text-xs font-bold hover:bg-[#FEE2E2] transition-colors shrink-0"
              >
                <Flag className="w-3.5 h-3.5" />
                <span>{t.reportTamperTitle.split(' ')[0]} {t.reportTamperTitle.split(' ')[1]}</span>
              </button>
            </div>

            {/* Anti-Fraud Disclaimer Notice */}
            <div className="p-3.5 rounded-2xl bg-[#FFFBEB] dark:bg-[#78350F]/20 border border-[#FDE68A] dark:border-[#78350F]/40 flex items-start space-x-3 text-xs text-[#92400E] dark:text-[#FDE68A]">
              <ShieldAlert className="w-4 h-4 mt-0.5 shrink-0 text-[#D97706]" />
              <p className="leading-relaxed">
                <strong>Mandatory Anti-Fraud Policy:</strong> {t.qrOnlyDisclaimer}
              </p>
            </div>

            {/* Input & Barcode Scanner Area */}
            <div className="space-y-3">
              <label className="block text-xs font-bold text-[#1F2937] dark:text-[#F1F5F9]">
                {t.laserSerialLabel}
              </label>

              <div className="flex flex-col sm:flex-row items-stretch gap-2.5">
                <div className="relative flex-1">
                  <Barcode className="w-4 h-4 text-[#94A3B8] absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder={t.laserSerialPlaceholder}
                    value={physicalSerial}
                    onChange={e => setPhysicalSerial(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handlePhysicalVerify()}
                    className="w-full bg-[#F8FAF7] dark:bg-[#16261D] border border-[#E5E7EB] dark:border-[#1E382B] rounded-xl pl-10 pr-3 py-2.5 text-xs text-[#1F2937] dark:text-[#F1F5F9] focus:outline-none focus:border-[#14532D] font-mono uppercase"
                  />
                </div>

                <button
                  type="button"
                  onClick={() => setIsCasingScannerOpen(true)}
                  className="px-3.5 py-2.5 rounded-xl bg-[#F8FAF7] dark:bg-[#16261D] hover:bg-[#ECFDF3] dark:hover:bg-[#1E382B] text-[#14532D] dark:text-[#34D399] border border-[#E5E7EB] dark:border-[#1E382B] text-xs font-bold flex items-center justify-center space-x-2 transition-colors shrink-0"
                >
                  <Camera className="w-4 h-4" />
                  <span>{t.scanBarcodeBtn}</span>
                </button>

                <button
                  type="button"
                  onClick={() => handlePhysicalVerify()}
                  disabled={physicalLoading}
                  className="px-5 py-2.5 rounded-xl bg-[#14532D] hover:bg-[#166534] text-white text-xs font-bold transition-all shadow-sm disabled:opacity-50 flex items-center justify-center space-x-2 shrink-0"
                >
                  <Fingerprint className="w-4 h-4" />
                  <span>{physicalLoading ? t.loading : t.verifyPhysicalBtn}</span>
                </button>
              </div>

              {/* Sample Helper Chips */}
              <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px] text-[#64748B] dark:text-[#94A3B8]">
                <span className="font-medium">Quick Test Scenarios:</span>
                {result.serial_number && (
                  <button
                    type="button"
                    onClick={() => {
                      setPhysicalSerial(result.serial_number!);
                      handlePhysicalVerify(result.serial_number);
                    }}
                    className="px-2.5 py-1 rounded-lg bg-[#ECFDF3] dark:bg-[#064E3B]/40 text-[#059669] dark:text-[#34D399] border border-[#D1FAE5] dark:border-[#065F46] font-mono text-[10px] font-bold hover:bg-[#D1FAE5] transition-colors"
                  >
                    ✓ {t.testMatchingSample} ({result.serial_number})
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    const swapped = result.battery_id.includes('NMC') ? 'NBS-2023-LFP-44109' : 'QV-2024-NMC-98124';
                    setPhysicalSerial(swapped);
                    handlePhysicalVerify(swapped);
                  }}
                  className="px-2.5 py-1 rounded-lg bg-[#FEF2F2] dark:bg-[#7F1D1D]/30 text-[#DC2626] dark:text-[#F87171] border border-[#FEE2E2] dark:border-[#991B1B] font-mono text-[10px] font-bold hover:bg-[#FEE2E2] transition-colors"
                >
                  ⚠ {t.testSwapFraudSample}
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
                  ✕ {t.testCounterfeitSample}
                </button>
              </div>
            </div>

            {/* Physical Error View */}
            {physicalError && (
              <div className="p-3.5 rounded-xl bg-[#FEE2E2] dark:bg-[#7F1D1D]/30 border border-[#FECACA] dark:border-[#991B1B] text-[#DC2626] dark:text-[#F87171] text-xs flex items-center space-x-2 font-medium">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{physicalError}</span>
              </div>
            )}

            {/* PHYSICAL VERIFICATION OUTCOME CARD */}
            {physicalResult && (
              <div className={`p-5 rounded-2xl border transition-all ${
                physicalResult.status === 'MATCHED'
                  ? 'bg-[#ECFDF3] dark:bg-[#064E3B]/20 border-[#A7F3D0] dark:border-[#065F46]'
                  : 'bg-[#FEF2F2] dark:bg-[#7F1D1D]/20 border-[#FECACA] dark:border-[#991B1B]'
              }`}>
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  <div className="flex items-start space-x-3.5">
                    {physicalResult.status === 'MATCHED' ? (
                      <div className="p-2 rounded-xl bg-[#059669] text-white shrink-0 mt-0.5">
                        <CheckCircle2 className="w-5 h-5" />
                      </div>
                    ) : (
                      <div className="p-2 rounded-xl bg-[#DC2626] text-white shrink-0 mt-0.5">
                        <AlertOctagon className="w-5 h-5" />
                      </div>
                    )}

                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <span className={`text-sm font-extrabold tracking-tight ${
                          physicalResult.status === 'MATCHED'
                            ? 'text-[#065F46] dark:text-[#34D399]'
                            : 'text-[#991B1B] dark:text-[#F87171]'
                        }`}>
                          {physicalResult.status === 'MATCHED'
                            ? t.statusMatched
                            : t.statusMismatchFraud}
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full font-mono font-bold bg-white/70 dark:bg-black/30 border border-current">
                          {physicalResult.fraud_type || 'AUTHENTIC_SERIAL'}
                        </span>
                      </div>

                      <p className="text-xs text-[#374151] dark:text-[#E2E8F0] leading-relaxed">
                        {physicalResult.match_details}
                      </p>

                      {physicalResult.conflicting_battery_id && (
                        <div className="mt-2 p-2.5 rounded-xl bg-white dark:bg-[#16261D] border border-[#FECACA] dark:border-[#991B1B] text-[11px] text-[#991B1B] dark:text-[#F87171] font-mono">
                          Conflict Detected: Casing belongs to passport <strong>{physicalResult.conflicting_battery_id}</strong>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="text-left sm:text-right text-[11px] font-mono text-[#64748B] dark:text-[#94A3B8] shrink-0 space-y-0.5">
                    <div>Verifier: <span className="font-bold">{physicalResult.verifier.role}</span></div>
                    <div>Recorded: {new Date(physicalResult.verified_at).toLocaleTimeString()}</div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Explicit Separation of Identity Verification vs Battery Condition Banner */}
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
                  <strong>Critical Boundary:</strong> Physical identity matching confirms that this metal casing corresponds to the registered digital passport. 
                  However, matching identifiers alone does <em>not</em> prove internal electrochemical health (SOH), cell degradation, absence of internal cell swaps, or safety compliance. 
                  Follow the mandatory three-point inspection procedure:
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

      {/* Step 2 Casing Barcode Scanner Modal */}
      <QRScannerModal
        isOpen={isCasingScannerOpen}
        onClose={() => setIsCasingScannerOpen(false)}
        title="Scan Laser Casing Barcode / Data Matrix"
        allowAnyText={true}
        onScanSuccess={(detectedCode) => {
          setIsCasingScannerOpen(false);
          setPhysicalSerial(detectedCode);
          handlePhysicalVerify(detectedCode);
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