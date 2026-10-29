import React from 'react';
import { ShieldCheck, CheckCircle2, AlertOctagon, Fingerprint, Flag, AlertCircle, Info } from 'lucide-react';

interface VerificationCheckItem {
  id?: string;
  battery_id: string;
  status: string;
  is_authentic: boolean;
  verified_at: string;
  verifier_role: string;
}

interface AntiFraudVerificationChartProps {
  totalChecks: number;
  matchedCount: number;
  mismatchFraudCount: number;
  verificationRequiredCount: number;
  tamperReportsCount: number;
  suspiciousScansCount: number;
  recentChecks: VerificationCheckItem[];
  dateFilter: '7D' | '30D' | 'ALL';
  onDateFilterChange: (filter: '7D' | '30D' | 'ALL') => void;
  loading: boolean;
}

export const AntiFraudVerificationChart: React.FC<AntiFraudVerificationChartProps> = ({
  totalChecks,
  matchedCount,
  mismatchFraudCount,
  verificationRequiredCount,
  tamperReportsCount,
  suspiciousScansCount,
  recentChecks,
  dateFilter,
  onDateFilterChange,
  loading,
}) => {
  const matchRate = totalChecks > 0 ? ((matchedCount / totalChecks) * 100).toFixed(1) : '0.0';

  const outcomeCategories = [
    {
      id: 'MATCHED',
      label: 'Identity Matched',
      count: matchedCount,
      pct: totalChecks > 0 ? ((matchedCount / totalChecks) * 100).toFixed(0) : '0',
      color: '#059669',
      bgColor: 'bg-[#ECFDF3] dark:bg-[#064E3B]/30',
      borderColor: 'border-[#D1FAE5] dark:border-[#065F46]',
      icon: CheckCircle2,
      sublabel: 'Dual identifiers strictly match registered passport',
    },
    {
      id: 'MISMATCH_FRAUD',
      label: 'Identity Mismatch — Possible Fraud',
      count: mismatchFraudCount,
      pct: totalChecks > 0 ? ((mismatchFraudCount / totalChecks) * 100).toFixed(0) : '0',
      color: '#DC2626',
      bgColor: 'bg-[#FEF2F2] dark:bg-[#7F1D1D]/30',
      borderColor: 'border-[#FECACA] dark:border-[#991B1B]',
      icon: AlertOctagon,
      sublabel: 'Conflicting pack serial or unregistered casing',
    },
    {
      id: 'VERIFICATION_REQUIRED',
      label: 'Verification Required',
      count: verificationRequiredCount,
      pct: totalChecks > 0 ? ((verificationRequiredCount / totalChecks) * 100).toFixed(0) : '0',
      color: '#D97706',
      bgColor: 'bg-[#FFFBEB] dark:bg-[#78350F]/20',
      borderColor: 'border-[#FDE68A] dark:border-[#78350F]/40',
      icon: Fingerprint,
      sublabel: 'Digital QR resolved; awaiting physical laser serial scan',
    },
  ];

  return (
    <div className="p-6 rounded-3xl bg-white dark:bg-[#121F17] border border-[#E5E7EB] dark:border-[#1E382B] shadow-sm space-y-5">
      {/* Header & Date Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 rounded-2xl bg-[#ECFDF3] dark:bg-[#064E3B]/40 text-[#059669] border border-[#D1FAE5] dark:border-[#065F46]">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-extrabold text-[#14532D] dark:text-[#34D399]">
              Dual-ID Anti-Fraud & Physical Verification Audit
            </h3>
            <p className="text-xs text-[#64748B] dark:text-[#94A3B8]">
              Server-side laser casing vs digital QR cross-comparison outcomes.
            </p>
          </div>
        </div>

        {/* Date Filter Pills */}
        <div className="flex items-center p-1 rounded-xl bg-[#F8FAF7] dark:bg-[#16261D] border border-[#E5E7EB] dark:border-[#1E382B] text-xs shrink-0">
          {(['7D', '30D', 'ALL'] as const).map((filter) => (
            <button
              key={filter}
              onClick={() => onDateFilterChange(filter)}
              className={`px-3 py-1 rounded-lg font-semibold text-[11px] transition-all ${
                dateFilter === filter
                  ? 'bg-[#14532D] text-white shadow-xs'
                  : 'text-[#64748B] dark:text-[#94A3B8] hover:text-[#1F2937] dark:hover:text-white'
              }`}
            >
              {filter}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="h-48 flex items-center justify-center">
          <div className="w-6 h-6 border-2 border-[#14532D] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : totalChecks === 0 ? (
        <div className="h-48 flex flex-col items-center justify-center p-6 text-center rounded-2xl bg-[#F8FAF7] dark:bg-[#16261D] border border-dashed border-[#E5E7EB] dark:border-[#1E382B] space-y-2">
          <AlertCircle className="w-6 h-6 text-[#64748B]" />
          <div className="text-xs font-bold text-[#1F2937] dark:text-[#F1F5F9]">
            No Verification Records in Timeframe
          </div>
          <p className="text-[11px] text-[#64748B] dark:text-[#94A3B8]">
            No physical identity checks recorded in the selected window ({dateFilter}). Use the QR Verification page to test pack cross-checks.
          </p>
        </div>
      ) : (
        <div className="space-y-5">
          {/* Top KPI Metrics Banner */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3.5 rounded-2xl bg-[#F8FAF7] dark:bg-[#16261D] border border-[#E5E7EB] dark:border-[#1E382B] space-y-1">
              <span className="text-[11px] text-[#64748B] dark:text-[#94A3B8]">Total Inspections</span>
              <div className="text-xl font-mono font-black text-[#1F2937] dark:text-[#F1F5F9]">{totalChecks}</div>
            </div>

            <div className="p-3.5 rounded-2xl bg-[#ECFDF3] dark:bg-[#064E3B]/20 border border-[#D1FAE5] dark:border-[#065F46] space-y-1">
              <span className="text-[11px] text-[#059669] dark:text-[#34D399] font-bold">Match Rate</span>
              <div className="text-xl font-mono font-black text-[#059669] dark:text-[#34D399]">{matchRate}%</div>
            </div>

            <div className="p-3.5 rounded-2xl bg-[#FEF2F2] dark:bg-[#7F1D1D]/20 border border-[#FECACA] dark:border-[#991B1B] space-y-1">
              <span className="text-[11px] text-[#DC2626] dark:text-[#F87171] font-bold">Tamper Incident Reports</span>
              <div className="text-xl font-mono font-black text-[#DC2626] dark:text-[#F87171]">{tamperReportsCount}</div>
            </div>

            <div className="p-3.5 rounded-2xl bg-[#FFFBEB] dark:bg-[#78350F]/20 border border-[#FDE68A] dark:border-[#78350F]/40 space-y-1">
              <span className="text-[11px] text-[#D97706] dark:text-[#FBBF24] font-bold">Velocity Alerts</span>
              <div className="text-xl font-mono font-black text-[#D97706] dark:text-[#FBBF24]">{suspiciousScansCount}</div>
            </div>
          </div>

          {/* Three Categorical Outcomes */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {outcomeCategories.map((cat) => {
              const Icon = cat.icon;
              return (
                <div
                  key={cat.id}
                  className={`p-4 rounded-2xl border space-y-2 ${cat.bgColor} ${cat.borderColor}`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-1.5">
                      <Icon className="w-4 h-4" style={{ color: cat.color }} />
                      <span className="text-xs font-bold" style={{ color: cat.color }}>
                        {cat.label}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-baseline space-x-2">
                    <span className="text-2xl font-mono font-extrabold text-[#1F2937] dark:text-[#F1F5F9]">
                      {cat.count}
                    </span>
                    <span className="text-xs font-mono text-[#64748B] dark:text-[#94A3B8]">
                      ({cat.pct}% of all checks)
                    </span>
                  </div>

                  <p className="text-[11px] text-[#64748B] dark:text-[#94A3B8] leading-tight">
                    {cat.sublabel}
                  </p>
                </div>
              );
            })}
          </div>

          {/* Recent Persisted Physical Verification Checks */}
          {recentChecks.length > 0 && (
            <div className="space-y-2 pt-1">
              <div className="text-xs font-bold text-[#14532D] dark:text-[#34D399] uppercase tracking-wider font-mono">
                Recent Physical Inspection Logs (Supabase verification_results)
              </div>

              <div className="space-y-1.5">
                {recentChecks.slice(0, 6).map((c, i) => (
                  <div
                    key={i}
                    className="p-2.5 rounded-xl bg-[#F8FAF7] dark:bg-[#16261D] border border-[#E5E7EB] dark:border-[#1E382B] flex items-center justify-between text-xs font-mono"
                  >
                    <div className="flex items-center space-x-2 truncate">
                      <span className="font-bold text-[#1F2937] dark:text-[#F1F5F9] truncate">{c.battery_id}</span>
                      <span className="text-[10px] text-[#64748B]">({c.verifier_role})</span>
                    </div>

                    <div className="flex items-center space-x-2 shrink-0">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          c.is_authentic || c.status === 'MATCHED'
                            ? 'bg-[#ECFDF3] text-[#059669]'
                            : 'bg-[#FEF2F2] text-[#DC2626]'
                        }`}
                      >
                        {c.status || (c.is_authentic ? 'MATCHED' : 'MISMATCH_FRAUD')}
                      </span>
                      <span className="text-[10px] text-[#94A3B8]">
                        {new Date(c.verified_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};