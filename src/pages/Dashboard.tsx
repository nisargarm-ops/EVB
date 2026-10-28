import React, { useState, useEffect } from 'react';
import { 
  BatteryCharging, 
  Leaf, 
  Recycle, 
  Activity, 
  ShieldCheck, 
  PlusCircle, 
  Cpu, 
  AlertCircle,
  Truck,
  ArrowRight,
  TrendingUp,
  RefreshCw
} from 'lucide-react';
import { PassportSummary, UserRole } from '../types';
import { api } from '../services/api';
import { PassportCard } from '../components/PassportCard';
import { HealthRing } from '../components/HealthRing';

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
  activeRole
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
      setError(err.message || 'Failed to load passports from metrology registry');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPassports();
  }, [filter]);

  // Aggregate Metrics
  const totalBatteries = passports.length;
  const avgSoHNumber = totalBatteries > 0
    ? (passports.reduce((acc, p) => acc + p.state_of_health_pct, 0) / totalBatteries)
    : 0;
  const secondLifeCount = passports.filter(p => p.status === 'SECOND_LIFE').length;
  const inServiceCount = passports.filter(p => p.status === 'IN_SERVICE').length;
  const totalCapacityKwh = passports.reduce((acc, p) => acc + p.rated_capacity_kwh, 0);

  return (
    <div className="space-y-8 max-w-7xl mx-auto px-4 sm:px-6 py-6">
      {/* Executive Command Banner */}
      <div className="glass-panel-glow rounded-3xl p-6 sm:p-8 relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-gradient-to-l from-emerald-500/10 via-cyan-500/5 to-transparent pointer-events-none" />
        
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center relative z-10">
          <div className="lg:col-span-8 space-y-3">
            <div className="flex items-center space-x-2 text-xs text-slate-400">
              <span className="font-semibold text-emerald-400">BatteryPass 360 Metrology Core</span>
              <span aria-hidden="true">·</span>
              <span>EU Regulation 2023/1542</span>
              <span aria-hidden="true">·</span>
              <span className="font-mono text-cyan-400">SHA-256 Ledger</span>
            </div>

            <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
              Enterprise Battery Intelligence & Lifecycle Operations
            </h1>

            <p className="text-slate-300 text-sm sm:text-base leading-relaxed max-w-2xl">
              Real-time monitoring of State of Health, carbon intensity, and tamper-evident custody handoffs 
              across cell manufacturers, OEMs, fleet operators, and circular recyclers.
            </p>

            {/* Quick Actions */}
            <div className="pt-2 flex flex-wrap gap-3">
              {activeRole === 'MANUFACTURER' && (
                <button
                  onClick={onNavigateCreate}
                  className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-lg shadow-emerald-500/20 transition-all transform hover:-translate-y-0.5"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>Mint Genesis Passport</span>
                </button>
              )}

              <button
                onClick={onNavigateQpiAI}
                className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 font-semibold text-xs border border-slate-700 hover:border-cyan-500/40 transition-all"
              >
                <Cpu className="w-4 h-4 text-cyan-400" />
                <span>Launch QpiAI Optimization Studio</span>
              </button>
            </div>
          </div>

          {/* Average Fleet Health Ring Widget */}
          <div className="lg:col-span-4 flex items-center justify-center p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80">
            <div className="text-center space-y-2">
              <HealthRing value={avgSoHNumber} size={120} strokeWidth={9} subLabel="Fleet Average" />
              <div className="text-[11px] text-slate-400 font-mono">
                {totalBatteries} Registered Packs Monitored
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* KPI Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Tracked Fleet</span>
            <BatteryCharging className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-white font-mono">{totalBatteries}</div>
          <p className="text-[11px] text-slate-500">Cross-enterprise registered</p>
        </div>

        <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Active Vehicle Fleet</span>
            <Leaf className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-emerald-400 font-mono">{inServiceCount}</div>
          <p className="text-[11px] text-slate-500">Tier-1 OEM deployment</p>
        </div>

        <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Second-Life Assigned</span>
            <Recycle className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-cyan-400 font-mono">{secondLifeCount}</div>
          <p className="text-[11px] text-slate-500">Stationary BESS containers</p>
        </div>

        <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Total Fleet Energy</span>
            <Activity className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-slate-200 font-mono">{totalCapacityKwh.toFixed(0)} <span className="text-sm font-sans font-normal text-slate-400">kWh</span></div>
          <p className="text-[11px] text-slate-500">Cumulative rated energy</p>
        </div>
      </div>

      {/* Segmented Filter Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-2">
        <div className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center space-x-2">
          <span>Lifecycle Status Filter</span>
          <span aria-hidden="true" className="text-slate-600">·</span>
          <span className="text-slate-400 font-normal">{passports.length} Records</span>
        </div>

        {/* Segmented button controls (Functional buttons, clean interactive styling) */}
        <div className="flex flex-wrap gap-1 p-1 rounded-xl bg-slate-900 border border-slate-800">
          {[
            { id: 'ALL', label: 'All Fleet' },
            { id: 'IN_SERVICE', label: 'In Service' },
            { id: 'SECOND_LIFE', label: 'Second Life' },
            { id: 'END_OF_LIFE', label: 'End of Life' },
            { id: 'RECYCLED', label: 'Recycled' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setFilter(tab.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                filter === tab.id
                  ? 'bg-slate-800 text-emerald-400 shadow-sm border border-emerald-500/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Loading & Grid */}
      {loading ? (
        <div className="text-center py-20 space-y-3">
          <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-slate-400">Loading battery passports from cryptographic registry...</p>
        </div>
      ) : passports.length === 0 ? (
        <div className="text-center py-16 glass-panel rounded-3xl border border-slate-800 space-y-2">
          <p className="text-sm font-semibold text-slate-300">No battery passports found matching filter.</p>
          <p className="text-xs text-slate-500">Select another lifecycle status or mint a new passport.</p>
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
