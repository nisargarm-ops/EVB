import React from 'react';
import { QrCode, ArrowRight, Zap, Leaf, ShieldCheck } from 'lucide-react';
import { PassportSummary } from '../types';

interface PassportCardProps {
  passport: PassportSummary;
  onSelect: (id: string) => void;
  onShowQr: (id: string) => void;
}

export const PassportCard: React.FC<PassportCardProps> = ({ passport, onSelect, onShowQr }) => {
  const getStatusDot = (status: string) => {
    switch (status) {
      case 'IN_SERVICE':
        return 'bg-emerald-400 shadow-[0_0_8px_#10B981]';
      case 'SECOND_LIFE':
        return 'bg-cyan-400 shadow-[0_0_8px_#06B6D4]';
      case 'END_OF_LIFE':
        return 'bg-amber-400 shadow-[0_0_8px_#F59E0B]';
      case 'RECYCLED':
        return 'bg-purple-400 shadow-[0_0_8px_#A855F7]';
      default:
        return 'bg-blue-400 shadow-[0_0_8px_#3B82F6]';
    }
  };

  const getSoHColor = (soh: number) => {
    if (soh >= 85) return 'text-emerald-400';
    if (soh >= 75) return 'text-cyan-400';
    if (soh >= 65) return 'text-amber-400';
    return 'text-rose-400';
  };

  return (
    <div className="glass-card rounded-2xl p-5 flex flex-col justify-between group relative overflow-hidden">
      <div>
        {/* Top Header: Unboxed metadata with typographic separators */}
        <div className="flex items-center justify-between text-xs mb-3">
          <span className="font-mono font-bold text-emerald-400 tracking-wide">
            {passport.battery_id}
          </span>

          <div className="flex items-center space-x-1.5 text-[11px] font-medium text-slate-300">
            <span className={`w-2 h-2 rounded-full ${getStatusDot(passport.status)}`} />
            <span>{passport.status.replace('_', ' ')}</span>
          </div>
        </div>

        {/* Model & Chemistry Title */}
        <h3 className="font-bold text-base text-white group-hover:text-cyan-300 transition-colors">
          {passport.chemistry} EV Pack
        </h3>
        <div className="text-xs text-slate-400 flex items-center space-x-2 mt-0.5 mb-4">
          <span>{passport.manufacturer_name}</span>
          <span aria-hidden="true">·</span>
          <span className="font-mono text-[11px] text-slate-500">EU Cirpass</span>
        </div>

        {/* State of Health & Capacity Progress Meter */}
        <div className="p-3.5 rounded-xl bg-slate-900/70 border border-slate-800/80 mb-4 space-y-2.5">
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="text-slate-400 flex items-center space-x-1">
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              <span>Health (SoH)</span>
            </span>
            <span className={`font-bold text-sm ${getSoHColor(passport.state_of_health_pct)}`}>
              {passport.state_of_health_pct}%
            </span>
          </div>

          <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden p-0.5 border border-slate-800">
            <div
              className="bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-400 h-full rounded-full transition-all duration-700"
              style={{ width: `${passport.state_of_health_pct}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono pt-1 border-t border-slate-800/60">
            <span className="flex items-center space-x-1">
              <Leaf className="w-3 h-3 text-emerald-400" />
              <span>Rated Capacity</span>
            </span>
            <span className="text-slate-200 font-bold">{passport.rated_capacity_kwh} kWh</span>
          </div>
        </div>

        {/* Custodian details */}
        <div className="text-xs text-slate-400 truncate mb-4 flex items-center space-x-1.5">
          <span className="text-slate-500">Custodian:</span>
          <span className="text-slate-200 font-medium truncate">{passport.current_custodian}</span>
        </div>
      </div>

      {/* Action Footer */}
      <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between">
        <button
          onClick={() => onShowQr(passport.battery_id)}
          className="p-2 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-slate-400 hover:text-emerald-400 border border-slate-800 transition-colors"
          title="Inspect EU Digital QR Sticker"
        >
          <QrCode className="w-4 h-4" />
        </button>

        <button
          onClick={() => onSelect(passport.battery_id)}
          className="flex items-center space-x-1.5 text-xs font-semibold px-3.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-cyan-400 hover:text-cyan-300 border border-cyan-500/30 hover:border-cyan-500/50 transition-all"
        >
          <span>View Passport</span>
          <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
        </button>
      </div>
    </div>
  );
};
