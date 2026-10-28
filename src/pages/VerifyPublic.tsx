import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  CheckCircle2,
  Search,
  Award,
  AlertTriangle,
} from 'lucide-react';
import { PublicVerification } from '../types';
import { api } from '../services/api';

interface VerifyPublicProps {
  initialId?: string;
  onNavigateDetail: (id: string) => void;
}

export const VerifyPublic: React.FC<VerifyPublicProps> = ({
  initialId,
  onNavigateDetail,
}) => {
  const [searchId, setSearchId] = useState(initialId || 'BAT-NMC-8A2F91C0');
  const [result, setResult] = useState<PublicVerification | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleVerify = async (idToVerify: string) => {
    if (!idToVerify.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await api.verifyPublic(idToVerify.trim());
      setResult(res);
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
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-8">
      {/* Search Header */}
      <div className="text-center space-y-3">
        <div className="inline-flex p-3 rounded-2xl bg-gradient-to-tr from-emerald-500/20 to-teal-500/20 border border-emerald-500/40 text-emerald-400">
          <ShieldCheck className="w-8 h-8" />
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
          Public EV Battery Verification Portal
        </h1>
        <p className="text-xs sm:text-sm text-slate-400 max-w-lg mx-auto">
          Scan or enter any European Union Battery Passport ID to verify official authenticity,
          tamper-evident custody integrity, and state of health.
        </p>

        {/* Input Bar */}
        <div className="max-w-md mx-auto pt-2">
          <div className="flex items-center space-x-2 bg-slate-900 border border-slate-800 rounded-2xl p-1.5 focus-within:border-emerald-500/50 shadow-lg">
            <Search className="w-4 h-4 text-slate-400 ml-3" />
            <input
              type="text"
              placeholder="e.g. BAT-NMC-8A2F91C0"
              value={searchId}
              onChange={e => setSearchId(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleVerify(searchId)}
              className="w-full bg-transparent border-none text-xs text-white focus:outline-none placeholder-slate-500"
            />
            <button
              onClick={() => handleVerify(searchId)}
              disabled={loading}
              className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold transition-all shadow-md shadow-emerald-500/20 disabled:opacity-50 cursor-pointer"
            >
              {loading ? 'Verifying...' : 'Verify'}
            </button>
          </div>
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
        <div className="glass-panel-glow rounded-3xl p-6 sm:p-8 border border-emerald-500/40 relative overflow-hidden shadow-2xl">
          <div className="absolute right-0 top-0 p-8 text-emerald-500/5 pointer-events-none">
            <Award className="w-48 h-48" />
          </div>

          {/* Certificate Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-800/80">
            <div>
              <div className="flex items-center space-x-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
                  Authentic Metrology Record
                </span>
              </div>
              <h2 className="text-xl font-extrabold text-white mt-1">{result.battery_id}</h2>
              <p className="text-[11px] font-mono text-slate-400 mt-0.5 break-all">
                {result.battery_did}
              </p>
            </div>

            <div className="text-left sm:text-right">
              <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-bold border border-emerald-500/30">
                EU 2023/1542 Compliant
              </span>
              <div className="text-[10px] text-slate-400 font-mono mt-1">
                Verified: {new Date(result.verification_timestamp).toLocaleDateString()}
              </div>
            </div>
          </div>

          {/* Core Metrology Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 py-6">
            <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800">
              <div className="text-[11px] text-slate-500">Manufacturer</div>
              <div className="text-xs font-bold text-slate-100 mt-1">
                {result.manufacturer_name}
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800">
              <div className="text-[11px] text-slate-500">Chemistry</div>
              <div className="text-xs font-bold text-emerald-400 mt-1">{result.chemistry}</div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800">
              <div className="text-[11px] text-slate-500">State of Health (SoH)</div>
              <div className="text-xs font-bold text-emerald-400 mt-1">
                {result.state_of_health_pct}%
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800">
              <div className="text-[11px] text-slate-500">Carbon Footprint</div>
              <div className="text-xs font-bold text-cyan-400 mt-1">
                {result.carbon_footprint_total} kg CO₂e
              </div>
            </div>
          </div>

          {/* Tamper Evidence Seal */}
          <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div className="text-xs">
                <div className="font-bold text-emerald-300">
                  Cryptographic Hash Chain Verified
                </div>
                <div className="text-slate-400 mt-0.5">
                  All {result.total_custody_events} lifecycle custody blocks match mathematical
                  SHA-256 digests.
                </div>
              </div>
            </div>

            <button
              onClick={() => onNavigateDetail(result.battery_id)}
              className="px-3.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-emerald-400 border border-emerald-500/30 text-xs font-bold transition-all cursor-pointer"
            >
              Full Passport
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
