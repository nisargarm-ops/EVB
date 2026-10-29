import React, { useState } from 'react';
import { PieChart, AlertCircle, Layers } from 'lucide-react';

interface LifecycleDonutChartProps {
  distribution: Record<string, number>;
  loading: boolean;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; desc: string }> = {
  IN_SERVICE: { label: 'In-Service Fleet', color: '#059669', desc: 'Active primary deployment' },
  SECOND_LIFE: { label: 'Second-Life BESS', color: '#0D9488', desc: 'Repurposed stationary storage' },
  END_OF_LIFE: { label: 'End of Life', color: '#D97706', desc: 'Decommissioning inspection pending' },
  RECYCLED: { label: 'Recycled', color: '#4F46E5', desc: 'Direct material closed-loop recovery' },
  MANUFACTURED: { label: 'Manufactured / OEM', color: '#14532D', desc: 'Fresh gigafactory production' },
  MAINTENANCE: { label: 'Maintenance / Diagnostic', color: '#2563EB', desc: 'Service center conditioning' },
  DECOMMISSIONED: { label: 'Decommissioned', color: '#94A3B8', desc: 'Retired from active ledger' },
};

export const LifecycleDonutChart: React.FC<LifecycleDonutChartProps> = ({
  distribution,
  loading,
}) => {
  const [hoveredStatus, setHoveredStatus] = useState<string | null>(null);

  // Compute total packs across non-zero statuses
  const entries = Object.entries(distribution).filter(([_, count]) => count > 0);
  const totalPacks = entries.reduce((acc, [_, count]) => acc + count, 0);

  // SVG Donut metrics
  const size = 180;
  const strokeWidth = 24;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  let cumulativeOffset = 0;
  const segments = entries.map(([status, count]) => {
    const fraction = totalPacks > 0 ? count / totalPacks : 0;
    const strokeDasharray = `${fraction * circumference} ${circumference}`;
    const strokeDashoffset = -cumulativeOffset;
    cumulativeOffset += fraction * circumference;
    const config = STATUS_CONFIG[status] || {
      label: status,
      color: '#64748B',
      desc: 'Registered lifecycle status',
    };

    return {
      status,
      count,
      fraction,
      percentage: (fraction * 100).toFixed(1),
      strokeDasharray,
      strokeDashoffset,
      ...config,
    };
  });

  return (
    <div className="p-6 rounded-3xl bg-white dark:bg-[#121F17] border border-[#E5E7EB] dark:border-[#1E382B] shadow-sm space-y-4">
      {/* Header */}
      <div className="flex items-center space-x-3">
        <div className="p-2.5 rounded-2xl bg-[#ECFDF3] dark:bg-[#064E3B]/40 text-[#059669] border border-[#D1FAE5] dark:border-[#065F46]">
          <PieChart className="w-5 h-5" />
        </div>
        <div>
          <h3 className="text-base font-extrabold text-[#14532D] dark:text-[#34D399]">
            Lifecycle Status Distribution
          </h3>
          <p className="text-xs text-[#64748B] dark:text-[#94A3B8]">
            Circular economy disposition breakdown across all registered battery packs.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="h-48 flex items-center justify-center">
          <div className="w-6 h-6 border-2 border-[#14532D] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : totalPacks === 0 ? (
        <div className="h-48 flex flex-col items-center justify-center p-6 text-center rounded-2xl bg-[#F8FAF7] dark:bg-[#16261D] border border-dashed border-[#E5E7EB] dark:border-[#1E382B] space-y-2">
          <AlertCircle className="w-6 h-6 text-[#64748B]" />
          <div className="text-xs font-bold text-[#1F2937] dark:text-[#F1F5F9]">
            No Battery Passports Registered
          </div>
          <p className="text-[11px] text-[#64748B] dark:text-[#94A3B8]">
            No battery records exist in the database yet. Mint a passport to populate the circular distribution.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center pt-2">
          {/* Donut Chart Visual */}
          <div className="md:col-span-5 flex flex-col items-center justify-center relative">
            <svg
              width={size}
              height={size}
              className="transform -rotate-90 select-none"
              role="img"
              aria-label="Lifecycle Status Distribution Donut"
            >
              <circle
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke="currentColor"
                strokeOpacity={0.08}
                strokeWidth={strokeWidth}
              />
              {segments.map((seg) => {
                const isHovered = hoveredStatus === seg.status;
                return (
                  <circle
                    key={seg.status}
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    fill="none"
                    stroke={seg.color}
                    strokeWidth={isHovered ? strokeWidth + 4 : strokeWidth}
                    strokeDasharray={seg.strokeDasharray}
                    strokeDashoffset={seg.strokeDashoffset}
                    className="cursor-pointer transition-all duration-200"
                    onMouseEnter={() => setHoveredStatus(seg.status)}
                    onMouseLeave={() => setHoveredStatus(null)}
                  />
                );
              })}
            </svg>

            {/* Donut Center Display */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
              <span className="text-2xl font-black font-mono text-[#14532D] dark:text-[#34D399]">
                {totalPacks}
              </span>
              <span className="text-[10px] text-[#64748B] dark:text-[#94A3B8] font-bold uppercase tracking-wider">
                Total Packs
              </span>
            </div>
          </div>

          {/* Detailed Legend & Status Breakdown */}
          <div className="md:col-span-7 space-y-2">
            {segments.map((seg) => {
              const isHovered = hoveredStatus === seg.status;
              return (
                <div
                  key={seg.status}
                  onMouseEnter={() => setHoveredStatus(seg.status)}
                  onMouseLeave={() => setHoveredStatus(null)}
                  className={`p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                    isHovered
                      ? 'bg-[#F8FAF7] dark:bg-[#16261D] border-[#14532D] shadow-xs scale-[1.01]'
                      : 'bg-white dark:bg-[#121F17] border-[#E5E7EB] dark:border-[#1E382B]'
                  }`}
                >
                  <div className="flex items-center space-x-2.5 min-w-0">
                    <span
                      className="w-3 h-3 rounded-full shrink-0"
                      style={{ backgroundColor: seg.color }}
                    />
                    <div className="truncate">
                      <div className="text-xs font-bold text-[#1F2937] dark:text-[#F1F5F9] truncate">
                        {seg.label}
                      </div>
                      <div className="text-[10px] text-[#64748B] dark:text-[#94A3B8] truncate">
                        {seg.desc}
                      </div>
                    </div>
                  </div>

                  <div className="text-right shrink-0 pl-2">
                    <span className="font-mono text-xs font-black text-[#14532D] dark:text-[#34D399]">
                      {seg.count}
                    </span>
                    <span className="text-[10px] text-[#64748B] dark:text-[#94A3B8] font-mono ml-1.5">
                      ({seg.percentage}%)
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};