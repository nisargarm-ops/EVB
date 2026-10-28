import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  CheckCircle2, 
  Search, 
  Award, 
  AlertTriangle, 
  XCircle, 
  HelpCircle, 
  QrCode, 
  Download, 
  Bug, 
  ArrowRight,
  Fingerprint
} from 'lucide-react';
import { PublicVerification, QRVerificationState } from '../types';
import { api } from '../services/api';

interface QRVerificationPageProps {
  initialId?: string;
  onNavigateDetail: (id: string) => void;
}

export const QRVerificationPage: React.FC<QRVerificationPageProps> = ({ initialId, onNavigateDetail }) => {
  const [searchId, setSearchId] = useState(initialId || 'BAT-NMC-8A2F91C0');
  const [result, setResult] = useState<PublicVerification | null>(null);
  const [loading, setLoading] = useState(false);
  const [simulateTamper, setSimulateTamper] = useState(false);

  const handleVerify = async (id: string, tamper: boolean = simulateTamper) => {
    if (!id.trim()) return;
    setLoading(true);
    try {
      const res = await api.verifyPublic(id.trim(), tamper);
      setResult(res);
    } catch {
      setResult({
        is_authentic: false,
        state: 'INVALID',
        battery_id: id,
        battery_did: 'unknown',
        manufacturer_name: 'Unknown',
        model_designation: 'Unknown',
        chemistry: 'Unknown',
        manufacturing_date: new Date().toISOString(),
        status: 'UNKNOWN',
        state_of_health_pct: 0,
        carbon_footprint_total: 0,
        eu_compliance_class: 'Non-compliant',
        total_custody_events: 0,
        is_audit_chain_valid: false,
        verification_timestamp: new Date().toISOString(),
        notes: 'Passport ID not found in European Union registered database.'
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    handleVerify(searchId, simulateTamper);
  }, [searchId, simulateTamper]);

  const getStateTheme = (state: QRVerificationState) => {
    switch (state) {
      case 'VERIFIED':
        return {
          title: 'VERIFIED AUTHENTIC',
          color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/40',
          icon: CheckCircle2,
          badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
          desc: 'Cryptographically validated against the SHA-256 custody ledger. Compliant with EU 2023/1542.'
        };
      case 'NEEDS_REVIEW':
        return {
          title: 'NEEDS REGULATORY REVIEW',
          color: 'text-amber-400 bg-amber-500/10 border-amber-500/40',
          icon: AlertTriangle,
          badge: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
          desc: 'Battery has reached End-of-Life or pending transfer custody sign-off.'
        };
      case 'REVOKED':
        return {
          title: 'PASSPORT DECOMMISSIONED / REVOKED',
          color: 'text-purple-400 bg-purple-500/10 border-purple-500/40',
          icon: HelpCircle,
          badge: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
          desc: 'Battery pack has concluded hydrometallurgical recycling and raw material dissolution.'
        };
      case 'INVALID':
      default:
        return {
          title: 'CRITICAL AUDIT FAILURE / INVALID',
          color: 'text-rose-400 bg-rose-500/10 border-rose-500/40',
          icon: XCircle,
          badge: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
          desc: 'Cryptographic hash chain mismatch or unregistered decentralized identifier.'
        };
    }
  };

  const theme = result ? getStateTheme(result.state) : null;
  const StateIcon = theme ? theme.icon : ShieldCheck;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-8">
      {/* Header */}
      <div className="text-center space-y-3">
        <div className="inline-flex p-3 rounded-2xl bg-gradient-to-tr from-emerald-500/20 to-teal-500/20 border border-emerald-500/40 text-emerald-400 shadow-lg shadow-emerald-500/10">
          <ShieldCheck className="w-8 h-8" />
        </div>
        <h1 className="text-3xl font-extrabold text-white">Public EV Battery QR Verification</h1>
        <p className="text-xs sm:text-sm text-slate-400 max-w-xl mx-auto">
          Scan or enter any European Union Battery Passport ID to verify official authenticity, 
          tamper-evident SHA-256 custody integrity, and state of health.
        </p>

        {/* Input Bar */}
        <div className="max-w-lg mx-auto pt-2">
          <div className="flex items-center space-x-2 bg-slate-900 border border-slate-800 rounded-2xl p-1.5 focus-within:border-emerald-500/50 shadow-xl">
            <Search className="w-4 h-4 text-slate-400 ml-3" />
            <input
              type="text"
              placeholder="e.g. BAT-NMC-8A2F91C0"
              value={searchId}
              onChange={e => setSearchId(e.target.value)}
              className="w-full bg-transparent border-none text-xs text-white focus:outline-none placeholder-slate-500"
            />
            <button
              onClick={() => handleVerify(searchId)}
              disabled={loading}
              className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold transition-all shadow-md shadow-emerald-500/20 disabled:opacity-50"
            >
              {loading ? 'Verifying...' : 'Verify'}
            </button>
          </div>
        </div>

        {/* Auditor Tamper Simulation Control */}
        <div className="pt-2 flex items-center justify-center space-x-3 text-xs">
          <span className="text-slate-400">Auditor Tamper-Evidence Test:</span>
          <button
            onClick={() => setSimulateTamper(!simulateTamper)}
            className={`flex items-center space-x-1.5 px-3 py-1 rounded-xl text-xs font-mono font-bold border transition-all ${
              simulateTamper
                ? 'bg-rose-500/20 border-rose-500/50 text-rose-300'
                : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            <Bug className="w-3.5 h-3.5" />
            <span>{simulateTamper ? 'Simulating Hash Tampering: ON' : 'Simulate Hash Tampering: OFF'}</span>
          </button>
        </div>
      </div>

      {/* Verification Result Display */}
      {result && theme && (
        <div className="glass-panel-glow rounded-3xl p-6 sm:p-8 border border-slate-800 relative overflow-hidden shadow-2xl">
          <div className="absolute right-0 top-0 p-8 text-white/5 pointer-events-none">
            <Award className="w-56 h-56" />
          </div>

          {/* State Banner */}
          <div className={`p-4 rounded-2xl border mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${theme.color}`}>
            <div className="flex items-center space-x-3">
              <StateIcon className="w-6 h-6 flex-shrink-0" />
              <div>
                <div className="font-extrabold text-sm sm:text-base tracking-wide">{theme.title}</div>
                <p className="text-xs opacity-90 mt-0.5">{theme.desc}</p>
              </div>
            </div>
            <span className={`px-3 py-1 rounded-full text-xs font-bold border self-start sm:self-center font-mono ${theme.badge}`}>
              {result.state}
            </span>
          </div>

          {/* Header Info */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-800">
            <div>
              <div className="text-xs text-slate-400 font-mono">BATTERY PASSPORT IDENTIFIER</div>
              <h2 className="text-2xl font-black text-white mt-1 font-mono">{result.battery_id}</h2>
              <div className="text-[11px] font-mono text-emerald-400 mt-0.5 break-all">{result.battery_did}</div>
            </div>

            <div className="text-left sm:text-right">
              <div className="text-xs text-slate-400">EU Annex VI Compliance</div>
              <div className="text-sm font-bold text-emerald-300 mt-0.5">{result.eu_compliance_class}</div>
              <div className="text-[11px] text-slate-500 font-mono mt-1">
                Audited: {new Date(result.verification_timestamp).toLocaleString()}
              </div>
            </div>
          </div>

          {/* Technical Snapshot */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 py-6 text-xs">
            <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800">
              <span className="text-slate-500 block">Manufacturer</span>
              <strong className="text-slate-100 text-sm mt-1 block truncate">{result.manufacturer_name}</strong>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800">
              <span className="text-slate-500 block">Chemistry</span>
              <strong className="text-emerald-400 text-sm mt-1 block">{result.chemistry}</strong>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800">
              <span className="text-slate-500 block">State of Health (SoH)</span>
              <strong className="text-cyan-400 text-sm mt-1 block font-mono">{result.state_of_health_pct}%</strong>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800">
              <span className="text-slate-500 block">Carbon Intensity</span>
              <strong className="text-slate-200 text-sm mt-1 block font-mono">{result.carbon_footprint_total} kg CO₂/kWh</strong>
            </div>
          </div>

          {/* Cryptographic Hash Ledger Seal */}
          <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center space-x-3">
              <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                <Fingerprint className="w-5 h-5" />
              </div>
              <div className="text-xs">
                <div className="font-bold text-white flex items-center space-x-2">
                  <span>Tamper-Evident SHA-256 Custody Blocks: {result.total_custody_events}</span>
                  <span className={`text-[10px] font-mono px-2 py-0.5 rounded ${result.is_audit_chain_valid ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
                    {result.is_audit_chain_valid ? 'HASH MATCH: 100%' : 'CORRUPTED DIGEST'}
                  </span>
                </div>
                <div className="text-slate-400 text-[11px] mt-0.5">{result.notes}</div>
              </div>
            </div>

            <button
              onClick={() => onNavigateDetail(result.battery_id)}
              className="flex items-center justify-center space-x-1.5 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold transition-all shadow-md shadow-emerald-500/20 flex-shrink-0"
            >
              <span>Full Passport Details</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
