import React, { useState, useEffect } from 'react';
import { 
  BatteryCharging, 
  Leaf, 
  Recycle, 
  Activity, 
  PlusCircle, 
  Cpu, 
  AlertCircle
} from 'lucide-react';
import { PassportSummary, UserRole } from '../types';
import { api } from '../services/api';
import { PassportCard } from '../components/PassportCard';
import { HealthRing } from '../components/HealthRing';
import { useLanguage } from '../context/LanguageContext';

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
  const { t } = useLanguage();
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
    <div className="space-y-8 max-w-7xl mx-auto px-4 sm:px-6 py-6 text-[#1F2937] dark:text-[#F1F5F9]">
      {/* Executive Command Banner */}
      <div className="bg-white dark:bg-[#121F17] border border-[#E5E7EB] dark:border-[#1E382B] rounded-3xl p-6 sm:p-8 relative shadow-sm transition-colors">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center relative z-10">
          <div className="lg:col-span-8 space-y-3">
            <div className="flex items-center space-x-2 text-xs text-[#64748B] dark:text-[#94A3B8]">
              <span className="font-semibold text-[#059669] dark:text-[#34D399]">BatteryPass 360 Metrology Core</span>
              <span aria-hidden="true">·</span>
              <span>EU Regulation 2023/1542</span>
              <span aria-hidden="true">·</span>
              <span className="font-mono text-[#14532D] dark:text-[#34D399] font-bold">SHA-256 Ledger</span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#14532D] dark:text-[#34D399] tracking-tight">
              {t.dashTitle}
            </h1>

            <p className="text-[#475569] dark:text-[#CBD5E1] text-sm sm:text-base leading-relaxed max-w-2xl">
              {t.dashSubtitle}
            </p>

            {/* Quick Actions */}
            <div className="pt-2 flex flex-wrap gap-3">
              {(activeRole === 'MANUFACTURER' || activeRole === 'ADMINISTRATOR') && (
                <button
                  onClick={onNavigateCreate}
                  className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-[#14532D] hover:bg-[#166534] text-white font-bold text-xs shadow-sm transition-all"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>{t.navMintPassport}</span>
                </button>
              )}

              <button
                onClick={onNavigateQpiAI}
                className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-[#F8FAF7] dark:bg-[#16261D] hover:bg-[#ECFDF3] dark:hover:bg-[#1F382B] text-[#14532D] dark:text-[#34D399] font-semibold text-xs border border-[#E5E7EB] dark:border-[#1E382B] hover:border-[#14532D] transition-all"
              >
                <Cpu className="w-4 h-4 text-[#059669]" />
                <span>Launch QpiAI Optimization Studio</span>
              </button>
            </div>
          </div>

          {/* Average Fleet Health Ring Widget */}
          <div className="lg:col-span-4 flex items-center justify-center p-5 rounded-2xl bg-[#F8FAF7] dark:bg-[#16261D] border border-[#E5E7EB] dark:border-[#1E382B]">
            <div className="text-center space-y-2">
              <HealthRing value={avgSoHNumber} size={120} strokeWidth={9} subLabel="Fleet Average" />
              <div className="text-[11px] text-[#64748B] dark:text-[#94A3B8] font-mono">
                {totalBatteries} Registered Packs Monitored
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* KPI Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-[#121F17] p-5 rounded-2xl border border-[#E5E7EB] dark:border-[#1E382B] space-y-1 shadow-sm">
          <div className="flex items-center justify-between text-[#64748B] dark:text-[#94A3B8] text-xs">
            <span>{t.kpiTotalPassports}</span>
            <BatteryCharging className="w-4 h-4 text-[#14532D] dark:text-[#34D399]" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-[#1F2937] dark:text-[#F1F5F9] font-mono">{totalBatteries}</div>
          <p className="text-[11px] text-[#64748B] dark:text-[#94A3B8]">Cross-enterprise registered</p>
        </div>

        <div className="bg-white dark:bg-[#121F17] p-5 rounded-2xl border border-[#E5E7EB] dark:border-[#1E382B] space-y-1 shadow-sm">
          <div className="flex items-center justify-between text-[#64748B] dark:text-[#94A3B8] text-xs">
            <span>{t.filterActive}</span>
            <Leaf className="w-4 h-4 text-[#059669] dark:text-[#34D399]" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-[#059669] dark:text-[#34D399] font-mono">{inServiceCount}</div>
          <p className="text-[11px] text-[#64748B] dark:text-[#94A3B8]">Tier-1 OEM deployment</p>
        </div>

        <div className="bg-white dark:bg-[#121F17] p-5 rounded-2xl border border-[#E5E7EB] dark:border-[#1E382B] space-y-1 shadow-sm">
          <div className="flex items-center justify-between text-[#64748B] dark:text-[#94A3B8] text-xs">
            <span>{t.filterSecondLife}</span>
            <Recycle className="w-4 h-4 text-[#0D9488] dark:text-[#2DD4BF]" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-[#0D9488] dark:text-[#2DD4BF] font-mono">{secondLifeCount}</div>
          <p className="text-[11px] text-[#64748B] dark:text-[#94A3B8]">Stationary BESS containers</p>
        </div>

        <div className="bg-white dark:bg-[#121F17] p-5 rounded-2xl border border-[#E5E7EB] dark:border-[#1E382B] space-y-1 shadow-sm">
          <div className="flex items-center justify-between text-[#64748B] dark:text-[#94A3B8] text-xs">
            <span>Total Fleet Energy</span>
            <Activity className="w-4 h-4 text-[#D97706] dark:text-[#FBBF24]" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-[#1F2937] dark:text-[#F1F5F9] font-mono">
            {totalCapacityKwh.toFixed(0)} <span className="text-sm font-sans font-normal text-[#64748B] dark:text-[#94A3B8]">kWh</span>
          </div>
          <p className="text-[11px] text-[#64748B] dark:text-[#94A3B8]">Cumulative rated energy</p>
        </div>
      </div>

      {/* Segmented Filter Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-2">
        <div className="text-xs font-bold text-[#1F2937] dark:text-[#F1F5F9] uppercase tracking-wider flex items-center space-x-2">
          <span>Lifecycle Status Filter</span>
          <span aria-hidden="true" className="text-[#CBD5E1]">·</span>
          <span className="text-[#64748B] dark:text-[#94A3B8] font-normal">{passports.length} Records</span>
        </div>

        {/* Controls: Segmented filters + Quick Register */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex flex-wrap gap-1 p-1 rounded-xl bg-white dark:bg-[#121F17] border border-[#E5E7EB] dark:border-[#1E382B] shadow-sm">
            {[
              { id: 'ALL', label: t.filterAll },
              { id: 'IN_SERVICE', label: t.filterActive },
              { id: 'SECOND_LIFE', label: t.filterSecondLife },
              { id: 'END_OF_LIFE', label: t.filterEol },
              { id: 'RECYCLED', label: t.filterTransferred },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setFilter(tab.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  filter === tab.id
                    ? 'bg-[#14532D] text-white shadow-sm'
                    : 'text-[#64748B] dark:text-[#94A3B8] hover:text-[#1F2937] dark:hover:text-white hover:bg-[#F8FAF7] dark:hover:bg-[#16261D]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {(activeRole === 'MANUFACTURER' || activeRole === 'ADMINISTRATOR') && (
            <button
              onClick={onNavigateCreate}
              className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-[#14532D] hover:bg-[#166534] text-white text-xs font-bold shadow-sm transition-all"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Register Battery</span>
            </button>
          )}
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="p-4 rounded-2xl bg-[#FEE2E2] dark:bg-[#7F1D1D]/30 border border-[#FECACA] dark:border-[#991B1B] text-[#DC2626] dark:text-[#F87171] text-xs flex items-center space-x-2 font-medium">
          <AlertCircle className="w-4 h-4 text-[#DC2626] flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Loading & Grid */}
      {loading ? (
        <div className="text-center py-20 space-y-3">
          <div className="w-8 h-8 border-2 border-[#14532D] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-[#64748B] dark:text-[#94A3B8]">{t.loading}</p>
        </div>
      ) : passports.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-[#121F17] rounded-3xl border border-[#E5E7EB] dark:border-[#1E382B] shadow-sm space-y-2">
          <p className="text-sm font-semibold text-[#1F2937] dark:text-[#F1F5F9]">{t.noPassportsFound}</p>
          <p className="text-xs text-[#64748B] dark:text-[#94A3B8]">Select another lifecycle status or mint a new passport.</p>
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
