import React from 'react';
import { BatteryCharging, QrCode, ShieldCheck, ArrowRight, Zap, Leaf } from 'lucide-react';
import { PassportSummary } from '../types';

interface PassportCardProps {
  passport: PassportSummary;
  onSelect: (id: string) => void;
  onShowQr: (id: string) => void;
}

export const PassportCard: React.FC<PassportCardProps> = ({ passport, onSelect, onShowQr }) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'IN_SERVICE':
        return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30';
      case 'SECOND_LIFE':
        return 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30';
      case 'END_OF_LIFE':
        return 'text-amber-400 bg-amber-500/10 border-amber-500/30';
      case 'RECYCLED':
        return 'text-purple-400 bg-purple-500/10 border-purple-500/30';
      default:
        return 'text-blue-400 bg-blue-500/10 border-blue-500/30';
    }
  };

  const getSoHColor = (soh: number) => {
    if (soh >= 85) return 'text-emerald-400';
    if (soh >= 75) return 'text-cyan-400';
    if (soh >= 65) return 'text-amber-400';
    return 'text-rose-400';
  };

  return (
    <div className="glass-panel hover:border-slate-700/80 transition-all rounded-2xl p-5 flex flex-col justify-between group shadow-lg hover:shadow-emerald-500/5">
      <div>
        {/* Header Badges */}
        <div className="flex items-center justify-between mb-3">
          <span className="font-mono text-xs px-2.5 py-1 rounded-md bg-slate-900 border border-slate-800 text-emerald-400 font-bold">
            {passport.battery_id}
          </span>
          <span className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full border ${getStatusColor(passport.status)}`}>
            {passport.status.replace('_', ' ')}
          </span>
        </div>

        {/* Model & Manufacturer */}
        <h3 className="font-bold text-base text-slate-100 group-hover:text-emerald-300 transition-colors">
          {passport.chemistry} EV Battery Pack
        </h3>
        <p className="text-xs text-slate-400 mb-4">{passport.manufacturer_name}</p>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-2 p-3 rounded-xl bg-slate-900/60 border border-slate-800/80 mb-4">
          <div>
            <div className="text-[11px] text-slate-500 flex items-center space-x-1">
              <Zap className="w-3 h-3 text-amber-400" />
              <span>State of Health</span>
            </div>
            <div className={`text-lg font-bold font-mono ${getSoHColor(passport.state_of_health_pct)}`}>
              {passport.state_of_health_pct}%
            </div>
          </div>
          <div>
            <div className="text-[11px] text-slate-500 flex items-center space-x-1">
              <Leaf className="w-3 h-3 text-emerald-400" />
              <span>Rated Capacity</span>
            </div>
            <div className="text-lg font-bold font-mono text-slate-200">
              {passport.rated_capacity_kwh} kWh
            </div>
          </div>
        </div>

        {/* Custodian */}
        <div className="text-xs text-slate-400 mb-4 truncate">
          <span className="text-slate-500">Custodian: </span>
          <span className="text-slate-300 font-medium">{passport.current_custodian}</span>
        </div>
      </div>

      {/* Action Footer */}
      <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
        <button
          onClick={() => onShowQr(passport.battery_id)}
          className="p-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-emerald-400 border border-slate-800 transition-colors"
          title="View Verification QR Code"
        >
          <QrCode className="w-4 h-4" />
        </button>

        <button
          onClick={() => onSelect(passport.battery_id)}
          className="flex items-center space-x-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 transition-all"
        >
          <span>View Passport</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
