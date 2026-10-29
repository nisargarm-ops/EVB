import React from 'react';
import { Truck, CheckCircle2, Clock, AlertOctagon, XCircle, AlertCircle, ArrowRight } from 'lucide-react';

interface CustodyTransferItem {
  id: string;
  battery_id: string;
  sender_org_name: string;
  receiver_org_name: string;
  state: string;
  transfer_type: string;
  initiated_at: string;
}

interface CustodyTransfersBarChartProps {
  total: number;
  byState: Record<string, number>;
  recentTransfers: CustodyTransferItem[];
  loading: boolean;
}

export const CustodyTransfersBarChart: React.FC<CustodyTransfersBarChartProps> = ({
  total,
  byState,
  recentTransfers,
  loading,
}) => {
  const states = [
    { key: 'ACCEPTED', label: 'Accepted Handoffs', color: '#059669', icon: CheckCircle2, count: byState['ACCEPTED'] || 0 },
    { key: 'PENDING', label: 'Pending Signature', color: '#D97706', icon: Clock, count: byState['PENDING'] || 0 },
    { key: 'REJECTED', label: 'Rejected / Disputed', color: '#DC2626', icon: AlertOctagon, count: byState['REJECTED'] || 0 },
    { key: 'CANCELLED', label: 'Cancelled', color: '#94A3B8', icon: XCircle, count: byState['CANCELLED'] || 0 },
  ];

  const maxCount = Math.max(1, ...states.map(s => s.count));

  return (
    <div className="p-6 rounded-3xl bg-white dark:bg-[#121F17] border border-[#E5E7EB] dark:border-[#1E382B] shadow-sm space-y-5">
      {/* Header */}
      <div className="flex items-center space-x-3">
        <div className="p-2.5 rounded-2xl bg-[#ECFDF3] dark:bg-[#064E3B]/40 text-[#059669] border border-[#D1FAE5] dark:border-[#065F46]">
          <Truck className="w-5 h-5" />
        </div>
        <div>
          <h3 className="text-base font-extrabold text-[#14532D] dark:text-[#34D399]">
            Chain of Custody & Stewardship Transfers
          </h3>
          <p className="text-xs text-[#64748B] dark:text-[#94A3B8]">
            Multi-enterprise ownership handoffs verified by cryptographic SHA-256 blocks.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="h-48 flex items-center justify-center">
          <div className="w-6 h-6 border-2 border-[#14532D] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : total === 0 ? (
        <div className="h-48 flex flex-col items-center justify-center p-6 text-center rounded-2xl bg-[#F8FAF7] dark:bg-[#16261D] border border-dashed border-[#E5E7EB] dark:border-[#1E382B] space-y-2">
          <AlertCircle className="w-6 h-6 text-[#64748B]" />
          <div className="text-xs font-bold text-[#1F2937] dark:text-[#F1F5F9]">
            No Custody Transfers Recorded
          </div>
          <p className="text-[11px] text-[#64748B] dark:text-[#94A3B8]">
            No cross-enterprise custody transfers have been initiated or logged yet in the repository.
          </p>
        </div>
      ) : (
        <div className="space-y-5">
          {/* Proportional Bar Status Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {states.map((st) => {
              const Icon = st.icon;
              const pct = total > 0 ? ((st.count / total) * 100).toFixed(0) : '0';
              return (
                <div
                  key={st.key}
                  className="p-3.5 rounded-2xl bg-[#F8FAF7] dark:bg-[#16261D] border border-[#E5E7EB] dark:border-[#1E382B] space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-[#64748B] dark:text-[#94A3B8]">
                      {st.label}
                    </span>
                    <Icon className="w-4 h-4" style={{ color: st.color }} />
                  </div>
                  <div className="flex items-baseline space-x-1.5">
                    <span className="text-xl font-mono font-extrabold text-[#1F2937] dark:text-[#F1F5F9]">
                      {st.count}
                    </span>
                    <span className="text-[11px] font-mono text-[#64748B] dark:text-[#94A3B8]">
                      ({pct}%)
                    </span>
                  </div>

                  {/* Relative fill bar */}
                  <div className="w-full h-1.5 rounded-full bg-[#E5E7EB] dark:bg-[#1E382B] overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${(st.count / maxCount) * 100}%`,
                        backgroundColor: st.color,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Persisted Transfer Timeline Records */}
          <div className="space-y-2">
            <div className="text-xs font-bold text-[#14532D] dark:text-[#34D399] uppercase tracking-wider font-mono">
              Persisted Handoff Events ({recentTransfers.length} Recorded)
            </div>

            <div className="space-y-2">
              {recentTransfers.map((item) => (
                <div
                  key={item.id}
                  className="p-3 rounded-2xl bg-[#F8FAF7] dark:bg-[#16261D] border border-[#E5E7EB] dark:border-[#1E382B] flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs"
                >
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <span className="font-mono font-bold text-[#14532D] dark:text-[#34D399]">
                        {item.battery_id}
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded-md font-mono bg-white dark:bg-[#121F17] border border-[#E5E7EB] dark:border-[#1E382B] text-[#64748B]">
                        {item.transfer_type}
                      </span>
                    </div>

                    <div className="flex items-center space-x-1.5 text-[11px] text-[#475569] dark:text-[#CBD5E1]">
                      <span className="font-medium text-[#1F2937] dark:text-[#F1F5F9]">{item.sender_org_name}</span>
                      <ArrowRight className="w-3 h-3 text-[#94A3B8]" />
                      <span className="font-medium text-[#1F2937] dark:text-[#F1F5F9]">{item.receiver_org_name}</span>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 shrink-0 sm:text-right">
                    <span
                      className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${
                        item.state === 'ACCEPTED'
                          ? 'bg-[#ECFDF3] dark:bg-[#064E3B]/40 text-[#059669] border-[#D1FAE5]'
                          : item.state === 'PENDING'
                          ? 'bg-[#FFFBEB] dark:bg-[#78350F]/30 text-[#D97706] border-[#FDE68A]'
                          : 'bg-[#FEF2F2] dark:bg-[#7F1D1D]/30 text-[#DC2626] border-[#FEE2E2]'
                      }`}
                    >
                      {item.state}
                    </span>
                    <span className="text-[10px] font-mono text-[#64748B]">
                      {new Date(item.initiated_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};