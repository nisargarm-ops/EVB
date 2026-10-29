import React, { useState } from 'react';
import { 
  PlusCircle, 
  ArrowLeft, 
  Factory, 
  Zap, 
  Leaf, 
  Sparkles, 
  CheckCircle2, 
  Download, 
  Copy, 
  Check, 
  Printer, 
  ExternalLink, 
  ShieldCheck, 
  RotateCcw,
  AlertTriangle
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { api } from '../services/api';
import { BatteryPassport } from '../types';
import { useLanguage } from '../context/LanguageContext';

interface CreatePassportProps {
  onBack: () => void;
  onSuccess: (id: string) => void;
}

export const CreatePassport: React.FC<CreatePassportProps> = ({ onBack, onSuccess }) => {
  const { t } = useLanguage();

  // Form State
  const [serialNumber, setSerialNumber] = useState(() => `SN-2026-NMC-${Math.floor(10000 + Math.random() * 90000)}`);
  const [manufacturer, setManufacturer] = useState('QuantumVolt Gigafactory');
  const [model, setModel] = useState('QV-Pack-90X');
  const [chemistry, setChemistry] = useState('NMC 811');
  const [mfgDate, setMfgDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [facility, setFacility] = useState('Berlin-Brandenburg Gigafactory');
  const [country, setCountry] = useState('DE');
  const [custodian, setCustodian] = useState('QuantumVolt Gigafactory');

  // Technical Specs
  const [capacity, setCapacity] = useState(88.0);
  const [voltage, setVoltage] = useState(400.0);
  const [chargePower, setChargePower] = useState(240.0);
  const [cellCount, setCellCount] = useState(192);
  const [weight, setWeight] = useState(470.0);

  // Carbon & Recycled Content
  const [totalCo2, setTotalCo2] = useState(58.0);
  const [mfgCo2, setMfgCo2] = useState(25.0);
  const [rawMaterialsCo2, setRawMaterialsCo2] = useState(28.0);
  const [transportCo2, setTransportCo2] = useState(5.0);
  const [complianceClass, setComplianceClass] = useState('Class A');
  const [recCobalt, setRecCobalt] = useState(16.0);
  const [recLithium, setRecLithium] = useState(6.0);
  const [recNickel, setRecNickel] = useState(12.0);

  // Submission & Post-Save QR Generation State
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdPassport, setCreatedPassport] = useState<BatteryPassport | null>(null);
  const [copied, setCopied] = useState(false);

  // Helper to generate fresh serial number
  const handleGenerateSerial = () => {
    const prefix = chemistry.includes('LFP') ? 'LFP' : chemistry.includes('NCA') ? 'NCA' : 'NMC';
    const rand = Math.floor(10000 + Math.random() * 90000);
    const year = new Date().getFullYear();
    setSerialNumber(`SN-${year}-${prefix}-${rand}`);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    // Client-side validation
    if (!serialNumber.trim()) {
      setError('Please provide a valid, unique battery serial number.');
      setSubmitting(false);
      return;
    }
    if (capacity <= 0 || voltage <= 0) {
      setError('Rated capacity and voltage must be positive numeric values.');
      setSubmitting(false);
      return;
    }

    try {
      const payload = {
        serial_number: serialNumber.trim(),
        manufacturer_name: manufacturer.trim(),
        model_designation: model.trim(),
        chemistry: chemistry.trim(),
        manufacturing_date: new Date(mfgDate).toISOString(),
        manufacturing_country: country.trim().toUpperCase(),
        manufacturing_facility: facility.trim(),
        current_custodian: custodian.trim() || manufacturer.trim(),
        technical_specs: {
          rated_capacity_kwh: Number(capacity),
          nominal_voltage_v: Number(voltage),
          max_charge_power_kw: Number(chargePower),
          cell_count: Number(cellCount),
          pack_weight_kg: Number(weight),
        },
        carbon_footprint: {
          total_co2_kg_per_kwh: Number(totalCo2),
          manufacturing_co2_kg: Number(mfgCo2),
          raw_materials_co2_kg: Number(rawMaterialsCo2),
          transport_co2_kg: Number(transportCo2),
          eu_compliance_class: complianceClass,
        },
        recycled_content: {
          cobalt_percentage: Number(recCobalt),
          lithium_percentage: Number(recLithium),
          nickel_percentage: Number(recNickel),
          lead_percentage: 0.0,
        },
      };

      // 1. Submit to real backend & database
      const result = await api.createPassport(payload);

      // 2. Generate QR code ONLY after real database insertion is confirmed
      setCreatedPassport(result);
    } catch (err: any) {
      // If saving fails on the backend, do NOT generate a QR code or display success
      setError(err.message || 'Failed to register battery passport on database ledger.');
      setCreatedPassport(null);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCopyLink = async () => {
    if (!createdPassport) return;
    const verifyUrl = `${window.location.origin}/verify/${encodeURIComponent(createdPassport.battery_id)}`;
    try {
      await navigator.clipboard.writeText(verifyUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (err) {
      console.error('Failed to copy verification link:', err);
    }
  };

  const handleDownloadPng = () => {
    if (!createdPassport) return;
    const svg = document.getElementById('created-qr-svg');
    if (!svg) return;
    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    img.onload = () => {
      canvas.width = img.width + 100;
      canvas.height = img.height + 155;
      if (!ctx) return;
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 50, 45);

      // EU Regulation Banner
      ctx.fillStyle = '#059669';
      ctx.font = 'bold 13px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('EU 2023/1542 BATTERY PASSPORT', canvas.width / 2, 30);

      // Battery Serial
      ctx.fillStyle = '#14532D';
      ctx.font = 'bold 16px monospace';
      ctx.fillText(createdPassport.battery_id, canvas.width / 2, canvas.height - 50);

      // Footnote
      ctx.font = '11px sans-serif';
      ctx.fillStyle = '#64748B';
      ctx.fillText('Scan to inspect tamper-evident SHA-256 ledger', canvas.width / 2, canvas.height - 25);

      const a = document.createElement('a');
      a.download = `BatteryPass-${createdPassport.battery_id}-QR.png`;
      a.href = canvas.toDataURL('image/png');
      a.click();
    };
    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
  };

  const handleResetForm = () => {
    setCreatedPassport(null);
    setError(null);
    handleGenerateSerial();
  };

  // ---------------------------------------------------------------------------
  // STATE 2: SUCCESSFUL REGISTRATION & QR CODE GENERATION CARD
  // ---------------------------------------------------------------------------
  if (createdPassport) {
    const verifyUrl = `${window.location.origin}/verify/${encodeURIComponent(createdPassport.battery_id)}`;

    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-6 text-[#1F2937] dark:text-[#F1F5F9]">
        <div className="bg-white dark:bg-[#121F17] rounded-3xl p-6 sm:p-8 border border-[#D1FAE5] dark:border-[#065F46] shadow-sm space-y-6">
          {/* Header */}
          <div className="text-center space-y-2">
            <div className="inline-flex p-3 rounded-2xl bg-[#ECFDF3] dark:bg-[#064E3B]/40 text-[#059669] dark:text-[#34D399] border border-[#D1FAE5] dark:border-[#065F46] shadow-2xs">
              <CheckCircle2 className="w-8 h-8 stroke-[2.2]" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#14532D] dark:text-[#34D399] tracking-tight">
              Battery Passport Registered Successfully
            </h1>
            <p className="text-xs sm:text-sm text-[#64748B] dark:text-[#94A3B8] max-w-lg mx-auto">
              Battery record and genesis metrology have been cryptographically sealed on the live database ledger.
            </p>
          </div>

          {/* Generated Passport Identifiers */}
          <div className="p-4 rounded-2xl bg-[#F8FAF7] dark:bg-[#16261D] border border-[#E5E7EB] dark:border-[#1E382B] space-y-2 text-xs font-mono">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 pb-2 border-b border-[#E5E7EB] dark:border-[#1E382B]">
              <span className="text-[#64748B] dark:text-[#94A3B8]">Immutable Battery ID:</span>
              <span className="font-bold text-[#14532D] dark:text-[#34D399] text-sm">{createdPassport.battery_id}</span>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 pb-2 border-b border-[#E5E7EB] dark:border-[#1E382B]">
              <span className="text-[#64748B] dark:text-[#94A3B8]">Permanently Engraved Serial Number:</span>
              <span className="font-bold text-[#1F2937] dark:text-[#F1F5F9]">{createdPassport.serial_number}</span>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
              <span className="text-[#64748B] dark:text-[#94A3B8]">Decentralized Identifier (DID):</span>
              <span className="text-[11px] text-[#64748B] dark:text-[#94A3B8] break-all">{createdPassport.battery_did}</span>
            </div>
          </div>

          {/* Generated QR Code & Permanent Casing Engraving Card */}
          <div 
            id="qr-print-area"
            className="p-6 rounded-2xl bg-[#F8FAF7] dark:bg-[#16261D] border border-[#E5E7EB] dark:border-[#1E382B] flex flex-col items-center justify-center max-w-md mx-auto shadow-inner"
          >
            {/* Digital Passport QR Code (Only Machine-Readable Code) */}
            <div className="bg-white p-4 rounded-2xl border border-[#E5E7EB] shadow-xs">
              <QRCodeSVG
                id="created-qr-svg"
                value={verifyUrl}
                size={200}
                level="H"
                includeMargin={false}
              />
            </div>
            <div className="mt-3 text-center">
              <div className="font-mono font-bold text-[#14532D] dark:text-[#34D399] text-sm tracking-wider">
                {createdPassport.battery_id}
              </div>
              <div className="text-[10px] text-[#059669] dark:text-[#34D399] font-bold tracking-wider mt-0.5 uppercase">
                EU 2023/1542 Digital Passport QR
              </div>
            </div>

            {/* Permanent Engraved Physical Serial Number (Plain Readable Text) */}
            <div className="w-full mt-5 pt-4 border-t border-[#E5E7EB] dark:border-[#1E382B] flex flex-col items-center">
              <div className="text-[10px] text-[#059669] dark:text-[#34D399] font-bold tracking-wider mb-1.5 uppercase text-center">
                Permanently Engraved Casing Serial
              </div>
              <div className="bg-white dark:bg-[#121F17] px-5 py-2.5 rounded-xl border border-[#E5E7EB] dark:border-[#1E382B] shadow-2xs font-mono font-extrabold text-sm sm:text-base text-[#14532D] dark:text-[#34D399] tracking-wider text-center select-all">
                {createdPassport.serial_number}
              </div>
              <div className="text-[10px] text-[#64748B] dark:text-[#94A3B8] font-mono mt-1.5 text-center">
                Laser-engraved on physical casing • Manually entered in Step 2
              </div>
            </div>
          </div>

          {/* Action Buttons: Download QR, Copy Link, Print Sticker */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <button
              onClick={handleDownloadPng}
              className="flex items-center justify-center space-x-1.5 py-3 px-3 rounded-xl bg-[#F8FAF7] dark:bg-[#16261D] hover:bg-[#ECFDF3] dark:hover:bg-[#1F382B] text-[#1F2937] dark:text-[#F1F5F9] text-xs font-semibold border border-[#E5E7EB] dark:border-[#1E382B] hover:border-[#14532D] transition-all shadow-2xs"
              title="Download Digital QR Code PNG"
            >
              <Download className="w-4 h-4 text-[#059669]" />
              <span>Download QR PNG</span>
            </button>

            <button
              onClick={handleCopyLink}
              className={`flex items-center justify-center space-x-1.5 py-3 px-3 rounded-xl text-xs font-semibold border transition-all shadow-2xs ${
                copied
                  ? 'bg-[#ECFDF3] dark:bg-[#064E3B]/40 border-[#059669] text-[#059669]'
                  : 'bg-[#F8FAF7] dark:bg-[#16261D] hover:bg-[#ECFDF3] dark:hover:bg-[#1F382B] text-[#1F2937] dark:text-[#F1F5F9] border-[#E5E7EB] dark:border-[#1E382B] hover:border-[#14532D]'
              }`}
              title="Copy Passport Verification Link"
            >
              {copied ? <Check className="w-4 h-4 text-[#059669]" /> : <Copy className="w-4 h-4 text-[#64748B] dark:text-[#94A3B8]" />}
              <span>{copied ? 'Link Copied!' : 'Copy Link'}</span>
            </button>

            <button
              onClick={() => window.print()}
              className="flex items-center justify-center space-x-1.5 py-3 px-3 rounded-xl bg-[#F8FAF7] dark:bg-[#16261D] hover:bg-[#ECFDF3] dark:hover:bg-[#1F382B] text-[#1F2937] dark:text-[#F1F5F9] text-xs font-semibold border border-[#E5E7EB] dark:border-[#1E382B] hover:border-[#14532D] transition-all shadow-2xs"
              title="Print Passport Sticker"
            >
              <Printer className="w-4 h-4 text-[#14532D] dark:text-[#34D399]" />
              <span>Print Sticker</span>
            </button>
          </div>

          {/* Navigation Choices */}
          <div className="pt-4 border-t border-[#E5E7EB] dark:border-[#1E382B] flex flex-col sm:flex-row items-center justify-between gap-3">
            <button
              onClick={handleResetForm}
              className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-[#F8FAF7] dark:bg-[#16261D] border border-[#E5E7EB] dark:border-[#1E382B] text-xs font-semibold hover:bg-[#ECFDF3] transition-colors"
            >
              + Register Another Battery
            </button>

            <div className="flex items-center space-x-2 w-full sm:w-auto">
              <button
                onClick={onBack}
                className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl bg-[#F8FAF7] dark:bg-[#16261D] border border-[#E5E7EB] dark:border-[#1E382B] text-xs font-semibold hover:bg-[#ECFDF3] transition-colors"
              >
                Fleet Dashboard
              </button>

              <button
                onClick={() => onSuccess(createdPassport.battery_id)}
                className="flex-1 sm:flex-none flex items-center justify-center space-x-1.5 px-4 py-2.5 rounded-xl bg-[#14532D] hover:bg-[#166534] text-white text-xs font-bold transition-all shadow-sm"
              >
                <span>View Full Passport</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // STATE 1: BATTERY REGISTRATION FORM
  // ---------------------------------------------------------------------------
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-6 text-[#1F2937] dark:text-[#F1F5F9]">
      {/* Page Header */}
      <div className="flex items-center space-x-3">
        <button
          onClick={onBack}
          className="p-2 rounded-xl bg-white dark:bg-[#121F17] hover:bg-[#F8FAF7] dark:hover:bg-[#16261D] text-[#1F2937] dark:text-[#F1F5F9] border border-[#E5E7EB] dark:border-[#1E382B] transition-colors shadow-2xs"
          title="Back to Dashboard"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div>
          <h1 className="text-2xl font-extrabold text-[#14532D] dark:text-[#34D399] tracking-tight">
            Register New Battery Passport
          </h1>
          <p className="text-xs text-[#64748B] dark:text-[#94A3B8]">
            EU Regulation 2023/1542 compliant genesis record creation and QR generation
          </p>
        </div>
      </div>

      {/* Error Alert Banner */}
      {error && (
        <div className="p-4 rounded-2xl bg-[#FEF2F2] dark:bg-[#7F1D1D]/30 border border-[#FECACA] dark:border-[#991B1B] text-[#DC2626] dark:text-[#F87171] text-xs flex items-start space-x-2.5">
          <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span className="leading-relaxed font-medium">{error}</span>
        </div>
      )}

      {/* Registration Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Section 1: Manufacturer & General Identity */}
        <div className="bg-white dark:bg-[#121F17] p-6 rounded-2xl border border-[#E5E7EB] dark:border-[#1E382B] space-y-4 shadow-sm">
          <div className="flex items-center space-x-2 text-[#14532D] dark:text-[#34D399] text-sm font-bold">
            <Factory className="w-4 h-4 text-[#059669]" />
            <span>Manufacturing Identification & Traceability</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-[#1F2937] dark:text-[#F1F5F9]">
                  Serial Number *
                </label>
                <button
                  type="button"
                  onClick={handleGenerateSerial}
                  className="text-[10px] text-[#059669] hover:underline font-mono"
                >
                  Auto-Generate
                </button>
              </div>
              <input
                type="text"
                value={serialNumber}
                onChange={e => setSerialNumber(e.target.value)}
                placeholder="e.g. SN-2026-NMC-77412"
                className="w-full bg-[#F8FAF7] dark:bg-[#16261D] border border-[#E5E7EB] dark:border-[#1E382B] rounded-xl p-2.5 text-xs text-[#1F2937] dark:text-[#F1F5F9] font-mono focus:outline-none focus:border-[#14532D]"
                required
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-[#1F2937] dark:text-[#F1F5F9] block mb-1">
                Manufacturer Organization *
              </label>
              <input
                type="text"
                value={manufacturer}
                onChange={e => setManufacturer(e.target.value)}
                className="w-full bg-[#F8FAF7] dark:bg-[#16261D] border border-[#E5E7EB] dark:border-[#1E382B] rounded-xl p-2.5 text-xs text-[#1F2937] dark:text-[#F1F5F9] focus:outline-none focus:border-[#14532D]"
                required
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-[#1F2937] dark:text-[#F1F5F9] block mb-1">
                Model Designation *
              </label>
              <input
                type="text"
                value={model}
                onChange={e => setModel(e.target.value)}
                placeholder="e.g. QV-Pack-90X"
                className="w-full bg-[#F8FAF7] dark:bg-[#16261D] border border-[#E5E7EB] dark:border-[#1E382B] rounded-xl p-2.5 text-xs text-[#1F2937] dark:text-[#F1F5F9] focus:outline-none focus:border-[#14532D]"
                required
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-[#1F2937] dark:text-[#F1F5F9] block mb-1">
                Cathode Chemistry *
              </label>
              <select
                value={chemistry}
                onChange={e => setChemistry(e.target.value)}
                className="w-full bg-[#F8FAF7] dark:bg-[#16261D] border border-[#E5E7EB] dark:border-[#1E382B] rounded-xl p-2.5 text-xs text-[#1F2937] dark:text-[#F1F5F9] focus:outline-none focus:border-[#14532D]"
              >
                <option value="NMC 811">NMC 811 (LiNi0.8Mn0.1Co0.1O2)</option>
                <option value="LFP">LFP (LiFePO4)</option>
                <option value="NCA">NCA (LiNi0.8Co0.15Al0.05O2)</option>
                <option value="Sodium-Ion">Sodium-Ion (Na+ Hard Carbon)</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-[#1F2937] dark:text-[#F1F5F9] block mb-1">
                Manufacturing Date *
              </label>
              <input
                type="date"
                value={mfgDate}
                onChange={e => setMfgDate(e.target.value)}
                className="w-full bg-[#F8FAF7] dark:bg-[#16261D] border border-[#E5E7EB] dark:border-[#1E382B] rounded-xl p-2.5 text-xs text-[#1F2937] dark:text-[#F1F5F9] focus:outline-none focus:border-[#14532D]"
                required
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-[#1F2937] dark:text-[#F1F5F9] block mb-1">
                Manufacturing Country *
              </label>
              <input
                type="text"
                value={country}
                onChange={e => setCountry(e.target.value.toUpperCase())}
                placeholder="DE"
                maxLength={3}
                className="w-full bg-[#F8FAF7] dark:bg-[#16261D] border border-[#E5E7EB] dark:border-[#1E382B] rounded-xl p-2.5 text-xs text-[#1F2937] dark:text-[#F1F5F9] font-mono uppercase focus:outline-none focus:border-[#14532D]"
                required
              />
            </div>

            <div className="sm:col-span-2">
              <label className="text-xs font-semibold text-[#1F2937] dark:text-[#F1F5F9] block mb-1">
                Manufacturing Facility Location
              </label>
              <input
                type="text"
                value={facility}
                onChange={e => setFacility(e.target.value)}
                placeholder="e.g. Berlin-Brandenburg Gigafactory 1"
                className="w-full bg-[#F8FAF7] dark:bg-[#16261D] border border-[#E5E7EB] dark:border-[#1E382B] rounded-xl p-2.5 text-xs text-[#1F2937] dark:text-[#F1F5F9] focus:outline-none focus:border-[#14532D]"
              />
            </div>
          </div>
        </div>

        {/* Section 2: Technical Specifications */}
        <div className="bg-white dark:bg-[#121F17] p-6 rounded-2xl border border-[#E5E7EB] dark:border-[#1E382B] space-y-4 shadow-sm">
          <div className="flex items-center space-x-2 text-[#14532D] dark:text-[#34D399] text-sm font-bold">
            <Zap className="w-4 h-4 text-[#D97706]" />
            <span>Technical & Electrical Metrology</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-semibold text-[#1F2937] dark:text-[#F1F5F9] block mb-1">
                Rated Capacity (kWh) *
              </label>
              <input
                type="number"
                step="0.1"
                value={capacity}
                onChange={e => setCapacity(parseFloat(e.target.value) || 0)}
                className="w-full bg-[#F8FAF7] dark:bg-[#16261D] border border-[#E5E7EB] dark:border-[#1E382B] rounded-xl p-2.5 text-xs text-[#1F2937] dark:text-[#F1F5F9] font-mono focus:outline-none focus:border-[#14532D]"
                required
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-[#1F2937] dark:text-[#F1F5F9] block mb-1">
                Nominal Voltage (V) *
              </label>
              <input
                type="number"
                step="0.1"
                value={voltage}
                onChange={e => setVoltage(parseFloat(e.target.value) || 0)}
                className="w-full bg-[#F8FAF7] dark:bg-[#16261D] border border-[#E5E7EB] dark:border-[#1E382B] rounded-xl p-2.5 text-xs text-[#1F2937] dark:text-[#F1F5F9] font-mono focus:outline-none focus:border-[#14532D]"
                required
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-[#1F2937] dark:text-[#F1F5F9] block mb-1">
                Max Charge Power (kW)
              </label>
              <input
                type="number"
                step="1"
                value={chargePower}
                onChange={e => setChargePower(parseFloat(e.target.value) || 0)}
                className="w-full bg-[#F8FAF7] dark:bg-[#16261D] border border-[#E5E7EB] dark:border-[#1E382B] rounded-xl p-2.5 text-xs text-[#1F2937] dark:text-[#F1F5F9] font-mono focus:outline-none focus:border-[#14532D]"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-[#1F2937] dark:text-[#F1F5F9] block mb-1">
                Cell Count
              </label>
              <input
                type="number"
                value={cellCount}
                onChange={e => setCellCount(parseInt(e.target.value, 10) || 0)}
                className="w-full bg-[#F8FAF7] dark:bg-[#16261D] border border-[#E5E7EB] dark:border-[#1E382B] rounded-xl p-2.5 text-xs text-[#1F2937] dark:text-[#F1F5F9] font-mono focus:outline-none focus:border-[#14532D]"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-[#1F2937] dark:text-[#F1F5F9] block mb-1">
                Pack Weight (kg)
              </label>
              <input
                type="number"
                step="0.1"
                value={weight}
                onChange={e => setWeight(parseFloat(e.target.value) || 0)}
                className="w-full bg-[#F8FAF7] dark:bg-[#16261D] border border-[#E5E7EB] dark:border-[#1E382B] rounded-xl p-2.5 text-xs text-[#1F2937] dark:text-[#F1F5F9] font-mono focus:outline-none focus:border-[#14532D]"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-[#1F2937] dark:text-[#F1F5F9] block mb-1">
                Initial Factory SoH (%)
              </label>
              <input
                type="text"
                value="100.0% (Factory Tested)"
                disabled
                className="w-full bg-[#E5E7EB]/50 dark:bg-[#1E382B]/50 border border-[#E5E7EB] dark:border-[#1E382B] rounded-xl p-2.5 text-xs text-[#059669] font-mono font-bold"
              />
            </div>
          </div>
        </div>

        {/* Section 3: Carbon Footprint & Recycled Content */}
        <div className="bg-white dark:bg-[#121F17] p-6 rounded-2xl border border-[#E5E7EB] dark:border-[#1E382B] space-y-4 shadow-sm">
          <div className="flex items-center space-x-2 text-[#14532D] dark:text-[#34D399] text-sm font-bold">
            <Leaf className="w-4 h-4 text-[#059669]" />
            <span>Sustainability, Carbon Footprint & Circular Recycled Content</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-semibold text-[#1F2937] dark:text-[#F1F5F9] block mb-1">
                Total Carbon (kg CO₂/kWh)
              </label>
              <input
                type="number"
                step="0.1"
                value={totalCo2}
                onChange={e => setTotalCo2(parseFloat(e.target.value) || 0)}
                className="w-full bg-[#F8FAF7] dark:bg-[#16261D] border border-[#E5E7EB] dark:border-[#1E382B] rounded-xl p-2.5 text-xs text-[#1F2937] dark:text-[#F1F5F9] font-mono focus:outline-none focus:border-[#14532D]"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-[#1F2937] dark:text-[#F1F5F9] block mb-1">
                EU Compliance Class
              </label>
              <select
                value={complianceClass}
                onChange={e => setComplianceClass(e.target.value)}
                className="w-full bg-[#F8FAF7] dark:bg-[#16261D] border border-[#E5E7EB] dark:border-[#1E382B] rounded-xl p-2.5 text-xs text-[#1F2937] dark:text-[#F1F5F9] focus:outline-none focus:border-[#14532D]"
              >
                <option value="Class A">Class A (&lt; 60 kg CO₂/kWh)</option>
                <option value="Class B">Class B (60-80 kg CO₂/kWh)</option>
                <option value="Class C">Class C (80-100 kg CO₂/kWh)</option>
                <option value="Class D">Class D (&gt; 100 kg CO₂/kWh)</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-[#1F2937] dark:text-[#F1F5F9] block mb-1">
                Recycled Cobalt (%)
              </label>
              <input
                type="number"
                step="0.1"
                value={recCobalt}
                onChange={e => setRecCobalt(parseFloat(e.target.value) || 0)}
                className="w-full bg-[#F8FAF7] dark:bg-[#16261D] border border-[#E5E7EB] dark:border-[#1E382B] rounded-xl p-2.5 text-xs text-[#1F2937] dark:text-[#F1F5F9] font-mono focus:outline-none focus:border-[#14532D]"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-[#1F2937] dark:text-[#F1F5F9] block mb-1">
                Recycled Lithium (%)
              </label>
              <input
                type="number"
                step="0.1"
                value={recLithium}
                onChange={e => setRecLithium(parseFloat(e.target.value) || 0)}
                className="w-full bg-[#F8FAF7] dark:bg-[#16261D] border border-[#E5E7EB] dark:border-[#1E382B] rounded-xl p-2.5 text-xs text-[#1F2937] dark:text-[#F1F5F9] font-mono focus:outline-none focus:border-[#14532D]"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-[#1F2937] dark:text-[#F1F5F9] block mb-1">
                Recycled Nickel (%)
              </label>
              <input
                type="number"
                step="0.1"
                value={recNickel}
                onChange={e => setRecNickel(parseFloat(e.target.value) || 0)}
                className="w-full bg-[#F8FAF7] dark:bg-[#16261D] border border-[#E5E7EB] dark:border-[#1E382B] rounded-xl p-2.5 text-xs text-[#1F2937] dark:text-[#F1F5F9] font-mono focus:outline-none focus:border-[#14532D]"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-[#1F2937] dark:text-[#F1F5F9] block mb-1">
                Initial Custodian
              </label>
              <input
                type="text"
                value={custodian}
                onChange={e => setCustodian(e.target.value)}
                className="w-full bg-[#F8FAF7] dark:bg-[#16261D] border border-[#E5E7EB] dark:border-[#1E382B] rounded-xl p-2.5 text-xs text-[#1F2937] dark:text-[#F1F5F9] focus:outline-none focus:border-[#14532D]"
              />
            </div>
          </div>
        </div>

        {/* Submit Actions */}
        <div className="flex items-center justify-end space-x-3 pt-2">
          <button
            type="button"
            onClick={onBack}
            className="px-5 py-2.5 rounded-xl bg-white dark:bg-[#16261D] border border-[#E5E7EB] dark:border-[#1E382B] text-[#1F2937] dark:text-[#F1F5F9] text-xs font-semibold hover:bg-[#F8FAF7] transition-colors"
          >
            Cancel
          </button>

          <button
            type="submit"
            disabled={submitting}
            className="flex items-center space-x-2 px-6 py-2.5 rounded-xl bg-[#14532D] hover:bg-[#166534] text-white text-xs font-bold transition-all shadow-sm disabled:opacity-50"
          >
            {submitting ? (
              <>
                <RotateCcw className="w-4 h-4 animate-spin" />
                <span>Saving to Immutable Ledger...</span>
              </>
            ) : (
              <>
                <PlusCircle className="w-4 h-4" />
                <span>Save Record & Generate QR Code</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
