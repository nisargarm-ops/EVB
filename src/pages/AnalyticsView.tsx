import React, { useState, useEffect } from 'react';
import { 
  BarChart3, 
  RefreshCw, 
  ShieldCheck, 
  Activity, 
  Layers, 
  Truck, 
  Cpu, 
  AlertTriangle,
  FileCheck2,
  Lock,
  ArrowRight
} from 'lucide-react';
import { AnalyticsOverview, BatteryMetricPoint, UserRole } from '../types';
import { api } from '../services/api';
import { useLanguage } from '../context/LanguageContext';
import { HealthTrendLineChart } from '../components/charts/HealthTrendLineChart';
import { LifecycleDonutChart } from '../components/charts/LifecycleDonutChart';
import { CustodyTransfersBarChart } from '../components/charts/CustodyTransfersBarChart';
import { AntiFraudVerificationChart } from '../components/charts/AntiFraudVerificationChart';
import { QpiAIOptimizationChart } from '../components/charts/QpiAIOptimizationChart';

interface AnalyticsViewProps {
  activeRole: UserRole;
  activeOrg: string;
  onNavigateDetail: (id: string) => void;
}

export const AnalyticsView: React.FC<AnalyticsViewProps> = ({
  activeRole,
  activeOrg,
  onNavigateDetail,
}) => {
  const { t } = useLanguage();
  const [overview, setOverview] = useState<AnalyticsOverview | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Health Trend Chart State
  const [selectedBatteryId, setSelectedBatteryId] = useState<string>('BAT-NMC-8A2F91C0');
  const [healthMetrics, setHealthMetrics] = useState<BatteryMetricPoint[]>([]);
  const [healthLoading, setHealthLoading] = useState<boolean>(false);
  const [healthDateFilter, setHealthDateFilter] = useState<'30D' | '90D' | '1Y' | 'ALL'>('ALL');
  const [batteryList, setBatteryList] = useState<Array<{ id: string; serial: string; model: string }>>([]);

  // Verification Chart State
  const [verifDateFilter, setVerifDateFilter] = useState<'7D' | '30D' | 'ALL'>('ALL');

  // Fetch full overview
  const fetchOverview = async () => {
    try {
      const data = await api.getAnalyticsOverview();
      setOverview(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load fleet analytics overview');
    }
  };

  // Fetch battery list for health selector
  const fetchBatteryList = async () => {
    try {
      const passports = await api.listPassports();
      const list = passports.map(p => ({
        id: p.battery_id,
        serial: p.serial_number,
        model: p.chemistry,
      }));
      setBatteryList(list);
      if (list.length > 0 && !list.find(b => b.id === selectedBatteryId)) {
        setSelectedBatteryId(list[0].id);
      }
    } catch {
      // Fallback to defaults
      setBatteryList([
        { id: 'BAT-NMC-8A2F91C0', serial: 'QV-2024-NMC-98124', model: 'NMC 811' },
        { id: 'BAT-LFP-3C7D410E', serial: 'NBS-2023-LFP-44109', model: 'LFP' },
        { id: 'BAT-NCA-F104A7B2', serial: 'REC-2021-NCA-10042', model: 'NCA' },
      ]);
    }
  };

  // Fetch health metrics for currently selected battery
  const fetchHealthMetrics = async (targetId: string, filter: '30D' | '90D' | '1Y' | 'ALL') => {
    setHealthLoading(true);
    try {
      let startDate: string | undefined = undefined;
      const now = Date.now();
      if (filter === '30D') {
        startDate = new Date(now - 30 * 86400000).toISOString();
      } else if (filter === '90D') {
        startDate = new Date(now - 90 * 86400000).toISOString();
      } else if (filter === '1Y') {
        startDate = new Date(now - 365 * 86400000).toISOString();
      }

      const points = await api.getHealthTrends(targetId, startDate);
      setHealthMetrics(points);
    } catch (err: any) {
      console.warn('Could not load health metrics for battery', targetId, err);
      setHealthMetrics([]);
    } finally {
      setHealthLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([
      fetchOverview(),
      fetchBatteryList(),
      fetchHealthMetrics(selectedBatteryId, healthDateFilter),
    ]);
    setRefreshing(false);
  };

  useEffect(() => {
    const initData = async () => {
      setLoading(true);
      await Promise.all([fetchOverview(), fetchBatteryList()]);
      setLoading(false);
    };
    initData();
  }, []);

  useEffect(() => {
    if (selectedBatteryId) {
      fetchHealthMetrics(selectedBatteryId, healthDateFilter);
    }
  }, [selectedBatteryId, healthDateFilter]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-8 select-none text-[#1F2937] dark:text-[#F1F5F9]">
      {/* Executive Command Header */}
      <div className="bg-white dark:bg-[#121F17] border border-[#E5E7EB] dark:border-[#1E382B] rounded-3xl p-6 sm:p-8 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center space-x-2 text-xs text-[#64748B] dark:text-[#94A3B8]">
              <span className="font-semibold text-[#059669] dark:text-[#34D399]">BatteryPass 360 Analytics</span>
              <span aria-hidden="true">·</span>
              <span>EU Regulation 2023/1542</span>
              <span aria-hidden="true">·</span>
              <span className="font-mono text-[#14532D] dark:text-[#34D399] font-bold">Supabase Metrology</span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#14532D] dark:text-[#34D399] tracking-tight">
              Interactive Fleet Analytics & Metrology
            </h1>

            <p className="text-xs sm:text-sm text-[#475569] dark:text-[#CBD5E1] max-w-2xl leading-relaxed">
              Real-time circular telemetry trends, lifecycle state transitions, custody chain verifications, 
              and QpiAI optimization outcomes powered strictly by authentic database records.
            </p>
          </div>

          <div className="flex items-center space-x-3 shrink-0">
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-[#F8FAF7] dark:bg-[#16261D] hover:bg-[#ECFDF3] dark:hover:bg-[#1F382B] text-[#14532D] dark:text-[#34D399] font-semibold text-xs border border-[#E5E7EB] dark:border-[#1E382B] transition-all shadow-xs disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              <span>{refreshing ? 'Refreshing...' : 'Refresh Metrology'}</span>
            </button>
          </div>
        </div>

        {/* Top KPI Metrics Row */}
        {overview && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-6 pt-6 border-t border-[#E5E7EB] dark:border-[#1E382B]">
            <div className="p-4 rounded-2xl bg-[#F8FAF7] dark:bg-[#16261D] border border-[#E5E7EB] dark:border-[#1E382B] space-y-1">
              <span className="text-[11px] text-[#64748B] dark:text-[#94A3B8]">Total Registered Passports</span>
              <div className="text-2xl font-mono font-black text-[#14532D] dark:text-[#34D399]">
                {overview.total_passports}
              </div>
              <span className="text-[10px] text-[#64748B] dark:text-[#94A3B8]">Cross-enterprise active</span>
            </div>

            <div className="p-4 rounded-2xl bg-[#F8FAF7] dark:bg-[#16261D] border border-[#E5E7EB] dark:border-[#1E382B] space-y-1">
              <span className="text-[11px] text-[#64748B] dark:text-[#94A3B8]">Recorded SOH Telemetry Avg</span>
              <div className="text-2xl font-mono font-black text-[#059669] dark:text-[#34D399]">
                {overview.health_summary.avg_soh_pct}%
              </div>
              <span className="text-[10px] text-[#64748B] dark:text-[#94A3B8]">
                {overview.health_summary.total_metrics_recorded} BMS data points
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-[#F8FAF7] dark:bg-[#16261D] border border-[#E5E7EB] dark:border-[#1E382B] space-y-1">
              <span className="text-[11px] text-[#64748B] dark:text-[#94A3B8]">Custody Handoff Events</span>
              <div className="text-2xl font-mono font-black text-[#0D9488] dark:text-[#2DD4BF]">
                {overview.custody_transfers_summary.total}
              </div>
              <span className="text-[10px] text-[#64748B] dark:text-[#94A3B8]">
                {overview.custody_transfers_summary.by_state['ACCEPTED'] || 0} accepted transfers
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-[#F8FAF7] dark:bg-[#16261D] border border-[#E5E7EB] dark:border-[#1E382B] space-y-1">
              <span className="text-[11px] text-[#64748B] dark:text-[#94A3B8]">Physical Anti-Fraud Verifications</span>
              <div className="text-2xl font-mono font-black text-[#14532D] dark:text-[#34D399]">
                {overview.anti_fraud_summary.total_checks}
              </div>
              <span className="text-[10px] text-[#64748B] dark:text-[#94A3B8]">
                {overview.anti_fraud_summary.matched_count} strict identity matches
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Error state */}
      {error && (
        <div className="p-4 rounded-2xl bg-[#FEE2E2] dark:bg-[#7F1D1D]/30 border border-[#FECACA] dark:border-[#991B1B] text-[#DC2626] dark:text-[#F87171] text-xs flex items-center space-x-2 font-medium">
          <AlertTriangle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Main Graphs Layout */}
      {loading ? (
        <div className="text-center py-20 space-y-3">
          <div className="w-8 h-8 border-2 border-[#14532D] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-[#64748B] dark:text-[#94A3B8]">Loading metrology graphs from Supabase...</p>
        </div>
      ) : (
        <div className="space-y-8">
          {/* 1. Battery Health Degradation Trends (Line Chart) */}
          <HealthTrendLineChart
            data={healthMetrics}
            batteryId={selectedBatteryId}
            batteryList={batteryList}
            onSelectBattery={(id) => setSelectedBatteryId(id)}
            dateFilter={healthDateFilter}
            onDateFilterChange={(filter) => setHealthDateFilter(filter)}
            loading={healthLoading}
          />

          {/* 2 & 3. Side-by-Side: Lifecycle Donut & Custody Transfers */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Graph 2: Circular Economy Lifecycle Distribution */}
            <LifecycleDonutChart
              distribution={overview?.lifecycle_distribution || {}}
              loading={loading}
            />

            {/* Graph 3: Custody Transfers & Stewardship */}
            <CustodyTransfersBarChart
              total={overview?.custody_transfers_summary.total || 0}
              byState={overview?.custody_transfers_summary.by_state || {}}
              recentTransfers={overview?.custody_transfers_summary.recent_transfers || []}
              loading={loading}
            />
          </div>

          {/* 4. Dual-ID Anti-Fraud & Physical Verification Audit Chart */}
          <AntiFraudVerificationChart
            totalChecks={overview?.anti_fraud_summary.total_checks || 0}
            matchedCount={overview?.anti_fraud_summary.matched_count || 0}
            mismatchFraudCount={overview?.anti_fraud_summary.mismatch_fraud_count || 0}
            verificationRequiredCount={overview?.anti_fraud_summary.verification_required_count || 0}
            tamperReportsCount={overview?.anti_fraud_summary.tamper_reports_count || 0}
            suspiciousScansCount={overview?.anti_fraud_summary.suspicious_scans_detected || 0}
            recentChecks={overview?.anti_fraud_summary.recent_checks || []}
            dateFilter={verifDateFilter}
            onDateFilterChange={(filter) => setVerifDateFilter(filter)}
            loading={loading}
          />

          {/* 5. QpiAI Optimization & Quantum Metrology Chart */}
          <QpiAIOptimizationChart
            executions={overview?.qpiai_summary.recent_executions || []}
            cloudCount={overview?.qpiai_summary.cloud_executions_count || 0}
            simulationCount={overview?.qpiai_summary.local_simulation_count || 0}
            loading={loading}
          />
        </div>
      )}
    </div>
  );
};