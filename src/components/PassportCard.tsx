import React from 'react';
import { QrCode, ArrowRight, Zap, Leaf } from 'lucide-react';
import { PassportSummary } from '../types';
import { useLanguage } from '../context/LanguageContext';

interface PassportCardProps {
  passport: PassportSummary;
  onSelect: (id: string) => void;
  onShowQr: (id: string) => void;
}

export const PassportCard: React.FC<PassportCardProps> = ({ passport, onSelect, onShowQr }) => {
  const { t } = useLanguage();

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'IN_SERVICE':
        return { dot: 'bg-[#059669]', text: 'text-[#059669] dark:text-[#34D399]', bg: 'bg-[#ECFDF3] dark:bg-[#064E3B]/40 border-[#D1FAE5] dark:border-[#065F46]' };
      case 'SECOND_LIFE':
        return { dot: 'bg-[#0D9488]', text: 'text-[#0D9488] dark:text-[#2DD4BF]', bg: 'bg-[#F0FDFA] dark:bg-[#134E4A]/40 border-[#CCFBF1] dark:border-[#115E59]' };
      case 'END_OF_LIFE':
        return { dot: 'bg-[#D97706]', text: 'text-[#D97706] dark:text-[#FBBF24]', bg: 'bg-[#FEF3C7] dark:bg-[#78350F]/40 border-[#FDE68A] dark:border-[#854D0E]' };
      case 'RECYCLED':
        return { dot: 'bg-[#64748B]', text: 'text-[#64748B] dark:text-[#94A3B8]', bg: 'bg-[#F1F5F9] dark:bg-[#1E293B]/40 border-[#E2E8F0] dark:border-[#334155]' };
      default:
        return { dot: 'bg-[#14532D]', text: 'text-[#14532D] dark:text-[#34D399]', bg: 'bg-[#ECFDF3] dark:bg-[#064E3B]/40 border-[#D1FAE5] dark:border-[#065F46]' };
    }
  };

  const getSoHColor = (soh: number) => {
    if (soh >= 85) return 'text-[#059669] dark:text-[#34D399]';
    if (soh >= 75) return 'text-[#0D9488] dark:text-[#2DD4BF]';
    if (soh >= 65) return 'text-[#D97706] dark:text-[#FBBF24]';
    return 'text-[#DC2626] dark:text-[#F87171]';
  };

  const badge = getStatusBadge(passport.status);

  return (
    <div className="bg-white dark:bg-[#121F17] rounded-2xl p-5 border border-[#E5E7EB] dark:border-[#1E382B] hover:border-[#14532D] dark:hover:border-[#059669] shadow-sm hover:shadow-md flex flex-col justify-between group transition-all text-[#1F2937] dark:text-[#F1F5F9]">
      <div>
        {/* Top Header */}
        <div className="flex items-center justify-between text-xs mb-3">
          <span className="font-mono font-bold text-[#14532D] dark:text-[#34D399] tracking-wide">
            {passport.battery_id}
          </span>

          <div className={`flex items-center space-x-1.5 text-[11px] font-semibold px-2.5 py-0.5 rounded-full border ${badge.bg} ${badge.text}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`} />
            <span>{passport.status.replace('_', ' ')}</span>
          </div>
        </div>

        {/* Model & Chemistry Title */}
        <h3 className="font-bold text-base text-[#1F2937] dark:text-[#F1F5F9] group-hover:text-[#14532D] dark:group-hover:text-[#34D399] transition-colors">
          {passport.chemistry} EV Pack
        </h3>
        <div className="text-xs text-[#64748B] dark:text-[#94A3B8] flex items-center space-x-2 mt-0.5 mb-4">
          <span>{passport.manufacturer_name}</span>
          <span aria-hidden="true">·</span>
          <span className="font-mono text-[11px] text-[#64748B] dark:text-[#94A3B8]">EU Cirpass</span>
        </div>

        {/* State of Health & Capacity Progress Meter */}
        <div className="p-3.5 rounded-xl bg-[#F8FAF7] dark:bg-[#16261D] border border-[#E5E7EB] dark:border-[#1E382B] mb-4 space-y-2.5">
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="text-[#64748B] dark:text-[#94A3B8] flex items-center space-x-1 font-sans">
              <Zap className="w-3.5 h-3.5 text-[#D97706]" />
              <span>{t.stateOfHealth.split('(')[0].trim()}</span>
            </span>
            <span className={`font-bold text-sm ${getSoHColor(passport.state_of_health_pct)}`}>
              {passport.state_of_health_pct}%
            </span>
          </div>

          <div className="w-full bg-[#E5E7EB] dark:bg-[#1E382B] h-2 rounded-full overflow-hidden p-0.5">
            <div
              className="bg-[#059669] h-full rounded-full transition-all duration-700"
              style={{ width: `${passport.state_of_health_pct}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-[11px] text-[#64748B] dark:text-[#94A3B8] pt-1 border-t border-[#E5E7EB] dark:border-[#1E382B]">
            <span className="flex items-center space-x-1">
              <Leaf className="w-3.5 h-3.5 text-[#059669]" />
              <span>{t.capacity}</span>
            </span>
            <span className="text-[#1F2937] dark:text-[#F1F5F9] font-bold font-mono">{passport.rated_capacity_kwh} kWh</span>
          </div>
        </div>

        {/* Custodian details */}
        <div className="text-xs text-[#64748B] dark:text-[#94A3B8] truncate mb-4 flex items-center space-x-1.5">
          <span>{t.currentOwner}:</span>
          <span className="text-[#1F2937] dark:text-[#F1F5F9] font-medium truncate">{passport.current_custodian}</span>
        </div>
      </div>

      {/* Action Footer */}
      <div className="pt-3 border-t border-[#E5E7EB] dark:border-[#1E382B] flex items-center justify-between">
        <button
          onClick={() => onShowQr(passport.battery_id)}
          className="p-2 rounded-xl bg-[#F8FAF7] dark:bg-[#16261D] hover:bg-[#ECFDF3] dark:hover:bg-[#1F382B] text-[#64748B] dark:text-[#94A3B8] hover:text-[#14532D] dark:hover:text-[#34D399] border border-[#E5E7EB] dark:border-[#1E382B] transition-colors"
          title={t.viewQr}
        >
          <QrCode className="w-4 h-4" />
        </button>

        <button
          onClick={() => onSelect(passport.battery_id)}
          className="flex items-center space-x-1.5 text-xs font-semibold px-3.5 py-1.5 rounded-xl bg-[#14532D] hover:bg-[#166534] text-white shadow-sm transition-all"
        >
          <span>{t.viewDetails}</span>
          <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
        </button>
      </div>
    </div>
  );
};
