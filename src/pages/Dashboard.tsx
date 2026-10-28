import React, { useState, useEffect } from 'react';
import {
  BatteryCharging,
  Leaf,
  Recycle,
  Activity,
  ShieldCheck,
  Filter,
  PlusCircle,
  Cpu,
  AlertCircle,
} from 'lucide-react';
import { PassportSummary, UserRole } from '../types';
import { api } from '../services/api';
import { PassportCard } from '../components/PassportCard';

interface DashboardProps {
  onSelectPassport: (id: string) => void;
  onShowQr: (id: string) => void;
  onNavigateCreate: () => void;
  onNavigateQpiAI: () => void;
  activeRole: UserRole;
}

export const Dashboard: React.FC<DashboardProps> = ({
  onSelectPassport,
  onShowQr,
  onNavigateCreate,
  onNavigateQpiAI,
  activeRole,
}) => {
  const [passports, setPassports] = useState<PassportSummary[]>([]);
  const [filter, setFilter] = useState<string>('ALL');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPassports = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.listPassports(filter === 'ALL' ? undefined : filter);
      setPassports(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load passports');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPassports();
  }, [filter]);

  // Aggregate Metrics
  const totalBatteries = passports.length;
  const avgSoH =
    totalBatteries > 0
      ? (
          passports.reduce((acc, p) => acc + p.state_of_health_pct, 0) / totalBatteries
        ).toFixed(1)
      : '0';
  const secondLifeCount = passports.filter(p => p.status === 'SECOND_LIFE').length;
  const inServiceCount = passports.filter(p => p.status === 'IN_SERVICE').length;

  return (
    <div className="space-y-8 max-w-7xl mx-auto px-4 sm:px-6 py-6">
      {/* Hero Banner */}
      <div className="glass-panel-glow rounded-3xl p-6 sm:p-8 relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-gradient-to-l from-emerald-500/10 to-transparent pointer-events-none" />
        <div className="max-w-3xl relative z-10">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold mb-4">
            <ShieldCheck className="w-4 h-4" />
            <span>WEB3-03 Circular Metrology & Battery Passport Standard</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight leading-tight">
            Cross-Enterprise EV Battery Passport & Lifecycle Metrology
          </h1>
          <p className="mt-3 text-slate-300 text-sm sm:text-base leading-relaxed">
            Cryptographically anchored battery passports tracking State of Health, carbon footprint,
            and custody transitions across Manufacturers, OEMs, Fleets, and Circular Recyclers.
            Integrated with <span className="text-cyan-400 font-semibold">QpiAI Opt</span> for
            reverse logistics and{' '}
            <span className="text-emerald-400 font-semibold">QpiAI Quantum</span> for degradation
            simulation.
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            {activeRole === 'MANUFACTURER' && (
              <button
                onClick={onNavigateCreate}
                className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-lg shadow-emerald-500/20 transition-all cursor-pointer"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Mint New Battery Passport</span>
              </button>
            )}

            <button
              onClick={onNavigateQpiAI}
              className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs border border-slate-700 transition-all cursor-pointer"
            >
              <Cpu className="w-4 h-4 text-cyan-400" />
              <span>Launch QpiAI Optimization Studio</span>
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-panel p-5 rounded-2xl border border-slate-800">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-2">
            <span>Total Tracked Fleet</span>
            <BatteryCharging className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-extrabold text-white font-mono">{totalBatteries}</div>
          <p className="text-[11px] text-slate-500 mt-1">Cross-enterprise registered</p>
        </div>

        <div className="glass-panel p-5 rounded-2xl border border-slate-800">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-2">
            <span>Average State of Health</span>
            <Activity className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-2xl font-extrabold text-emerald-400 font-mono">{avgSoH}%</div>
          <p className="text-[11px] text-slate-500 mt-1">Real-time BMS telematics</p>
        </div>

        <div className="glass-panel p-5 rounded-2xl border border-slate-800">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-2">
            <span>Second-Life Assigned</span>
            <Recycle className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-2xl font-extrabold text-purple-400 font-mono">{secondLifeCount}</div>
          <p className="text-[11px] text-slate-500 mt-1">Stationary BESS containers</p>
        </div>

        <div className="glass-panel p-5 rounded-2xl border border-slate-800">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-2">
            <span>Active in Vehicle Fleet</span>
            <Leaf className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-extrabold text-slate-200 font-mono">{inServiceCount}</div>
          <p className="text-[11px] text-slate-500 mt-1">Tier-1 OEM deployment</p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-2">
        <div className="flex items-center space-x-2">
          <Filter className="w-4 h-4 text-slate-400" />
          <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
            Lifecycle Status:
          </span>
        </div>

        <div className="flex flex-wrap gap-1.5 p-1 rounded-xl bg-slate-900 border border-slate-800">
          {['ALL', 'MANUFACTURED', 'IN_SERVICE', 'SECOND_LIFE', 'END_OF_LIFE', 'RECYCLED'].map(
            tab => (
              <button
                key={tab}
                onClick={() => setFilter(tab)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  filter === tab
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {tab.replace(/_/g, ' ')}
              </button>
            )
          )}
        </div>
      </div>

      {/* Error / Loading / Grid */}
      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="text-center py-16">
          <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-xs text-slate-400">Loading battery passports from registry...</p>
        </div>
      ) : passports.length === 0 ? (
        <div className="text-center py-16 glass-panel rounded-3xl border border-slate-800">
          <p className="text-sm text-slate-400">
            No battery passports found matching this filter.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {passports.map(p => (
            <PassportCard
              key={p.battery_id}
              passport={p}
              onSelect={onSelectPassport}
              onShowQr={onShowQr}
            />
          ))}
        </div>
      )}
    </div>
  );
};
