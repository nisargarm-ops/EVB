import React, { useState } from 'react';
import { Activity, Calendar, Info, AlertCircle, ChevronDown } from 'lucide-react';
import { BatteryMetricPoint } from '../../types';

interface HealthTrendLineChartProps {
  data: BatteryMetricPoint[];
  batteryId: string;
  batteryList: Array<{ id: string; serial: string; model: string }>;
  onSelectBattery: (id: string) => void;
  dateFilter: '30D' | '90D' | '1Y' | 'ALL';
  onDateFilterChange: (filter: '30D' | '90D' | '1Y' | 'ALL') => void;
  loading: boolean;
}

export const HealthTrendLineChart: React.FC<HealthTrendLineChartProps> = ({
  data,
  batteryId,
  batteryList,
  onSelectBattery,
  dateFilter,
  onDateFilterChange,
  loading,
}) => {
  const [hoveredPoint, setHoveredPoint] = useState<BatteryMetricPoint | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(null);

  // Chart dimensions
  const width = 640;
  const height = 240;
  const padding = { top: 25, right: 30, bottom: 40, left: 50 };
  const innerWidth = width - padding.left - padding.right;
  const innerHeight = height - padding.top - padding.bottom;

  // Compute scales based exclusively on actual recorded data
  const yMin = 50;
  const yMax = 100;

  const validPoints = data.filter(p => !isNaN(new Date(p.recorded_at).getTime()) && p.state_of_health_pct >= 0);

  // Time range calculation
  const times = validPoints.map(p => new Date(p.recorded_at).getTime());
  const minTime = times.length > 1 ? Math.min(...times) : (times[0] ? times[0] - 86400000 : Date.now() - 86400000);
  const maxTime = times.length > 1 ? Math.max(...times) : (times[0] ? times[0] + 86400000 : Date.now());
  const timeSpan = Math.max(maxTime - minTime, 1);

  const getX = (timestamp: string) => {
    if (validPoints.length === 1) return padding.left + innerWidth / 2;
    const t = new Date(timestamp).getTime();
    return padding.left + ((t - minTime) / timeSpan) * innerWidth;
  };

  const getY = (soh: number) => {
    const clamped = Math.max(yMin, Math.min(yMax, soh));
    return padding.top + innerHeight - ((clamped - yMin) / (yMax - yMin)) * innerHeight;
  };

  // Build SVG path
  let pathD = '';
  if (validPoints.length > 1) {
    pathD = validPoints.reduce((acc, point, i) => {
      const x = getX(point.recorded_at);
      const y = getY(point.state_of_health_pct);
      return i === 0 ? `M ${x} ${y}` : `${acc} L ${x} ${y}`;
    }, '');
  }

  // 80% & 70% threshold Y positions
  const y80 = getY(80);
  const y70 = getY(70);

  return (
    <div className="p-6 rounded-3xl bg-white dark:bg-[#121F17] border border-[#E5E7EB] dark:border-[#1E382B] shadow-sm space-y-4">
      {/* Chart Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 rounded-2xl bg-[#ECFDF3] dark:bg-[#064E3B]/40 text-[#059669] border border-[#D1FAE5] dark:border-[#065F46]">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-extrabold text-[#14532D] dark:text-[#34D399]">
              Battery Health Degradation Trends
            </h3>
            <p className="text-xs text-[#64748B] dark:text-[#94A3B8]">
              Verified BMS telemetry records over time (EU Regulation 2023/1542 Metrology).
            </p>
          </div>
        </div>

        {/* Battery Selector & Date Filters */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Battery Dropdown */}
          <div className="relative">
            <select
              value={batteryId}
              onChange={(e) => onSelectBattery(e.target.value)}
              className="appearance-none bg-[#F8FAF7] dark:bg-[#16261D] border border-[#E5E7EB] dark:border-[#1E382B] rounded-xl pl-3 pr-8 py-1.5 text-xs font-mono font-bold text-[#14532D] dark:text-[#34D399] focus:outline-none focus:border-[#14532D]"
              aria-label="Select Battery Pack"
            >
              {batteryList.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.id} ({b.serial})
                </option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-[#64748B] pointer-events-none" />
          </div>

          {/* Date Filter Pills */}
          <div className="flex items-center p-1 rounded-xl bg-[#F8FAF7] dark:bg-[#16261D] border border-[#E5E7EB] dark:border-[#1E382B] text-xs">
            {(['30D', '90D', '1Y', 'ALL'] as const).map((filter) => (
              <button
                key={filter}
                onClick={() => onDateFilterChange(filter)}
                className={`px-2.5 py-1 rounded-lg font-semibold text-[11px] transition-all ${
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
      </div>

      {/* Main Graph Area */}
      {loading ? (
        <div className="h-64 flex flex-col items-center justify-center space-y-2">
          <div className="w-7 h-7 border-2 border-[#14532D] border-t-transparent rounded-full animate-spin" />
          <span className="text-xs text-[#64748B] dark:text-[#94A3B8]">Loading telemetry readings from Supabase...</span>
        </div>
      ) : validPoints.length === 0 ? (
        <div className="h-64 flex flex-col items-center justify-center p-6 text-center rounded-2xl bg-[#F8FAF7] dark:bg-[#16261D] border border-dashed border-[#E5E7EB] dark:border-[#1E382B] space-y-2">
          <AlertCircle className="w-7 h-7 text-[#D97706]" />
          <div className="text-xs font-bold text-[#1F2937] dark:text-[#F1F5F9]">
            No Telemetry Measurements Recorded
          </div>
          <p className="text-[11px] text-[#64748B] dark:text-[#94A3B8] max-w-md">
            No telemetry data has been recorded for pack <strong>{batteryId}</strong> within the selected date window ({dateFilter}).
            Health measurements must be ingested directly from BMS diagnostics.
          </p>
        </div>
      ) : (
        <div className="relative overflow-x-auto">
          <svg
            viewBox={`0 0 ${width} ${height}`}
            className="w-full h-auto min-w-[500px] select-none"
            role="img"
            aria-label={`Battery Health Trend Chart for ${batteryId}`}
          >
            {/* Gridlines & Y-Axis Labels */}
            {[100, 90, 80, 70, 60, 50].map((tick) => {
              const y = getY(tick);
              return (
                <g key={tick}>
                  <line
                    x1={padding.left}
                    y1={y}
                    x2={width - padding.right}
                    y2={y}
                    stroke="currentColor"
                    strokeOpacity={0.12}
                    strokeDasharray={tick === 80 || tick === 70 ? '4 4' : undefined}
                    strokeWidth={1}
                  />
                  <text
                    x={padding.left - 10}
                    y={y + 3.5}
                    textAnchor="end"
                    fontSize="10"
                    fill="currentColor"
                    opacity={0.6}
                    fontFamily="monospace"
                  >
                    {tick}%
                  </text>
                </g>
              );
            })}

            {/* Threshold Annotations */}
            <text
              x={width - padding.right - 5}
              y={y80 - 6}
              textAnchor="end"
              fontSize="9"
              fill="#059669"
              fontWeight="bold"
            >
              80% EU Second-Life Threshold
            </text>
            <text
              x={width - padding.right - 5}
              y={y70 - 6}
              textAnchor="end"
              fontSize="9"
              fill="#D97706"
              fontWeight="bold"
            >
              70% EU End-of-Life Threshold
            </text>

            {/* Trend Line */}
            {validPoints.length > 1 && (
              <path
                d={pathD}
                fill="none"
                stroke="#059669"
                strokeWidth={2.5}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            )}

            {/* Area under curve */}
            {validPoints.length > 1 && (
              <path
                d={`${pathD} L ${getX(validPoints[validPoints.length - 1].recorded_at)} ${padding.top + innerHeight} L ${getX(validPoints[0].recorded_at)} ${padding.top + innerHeight} Z`}
                fill="#059669"
                fillOpacity={0.08}
              />
            )}

            {/* Data Points */}
            {validPoints.map((point, idx) => {
              const cx = getX(point.recorded_at);
              const cy = getY(point.state_of_health_pct);
              const isHovered = hoveredPoint?.recorded_at === point.recorded_at;

              return (
                <g key={idx}>
                  <circle
                    cx={cx}
                    cy={cy}
                    r={isHovered ? 6 : 4}
                    fill={point.state_of_health_pct >= 80 ? '#059669' : point.state_of_health_pct >= 70 ? '#D97706' : '#DC2626'}
                    stroke="#FFFFFF"
                    strokeWidth={2}
                    className="cursor-pointer transition-all"
                    onMouseEnter={(e) => {
                      setHoveredPoint(point);
                      const rect = e.currentTarget.getBoundingClientRect();
                      setTooltipPos({ x: cx, y: cy });
                    }}
                    onMouseLeave={() => setHoveredPoint(null)}
                  />
                  {/* Date labels on X-axis */}
                  <text
                    x={cx}
                    y={height - padding.bottom + 18}
                    textAnchor="middle"
                    fontSize="9"
                    fill="currentColor"
                    opacity={0.65}
                    fontFamily="monospace"
                  >
                    {new Date(point.recorded_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                  </text>
                </g>
              );
            })}
          </svg>

          {/* Interactive Tooltip */}
          {hoveredPoint && tooltipPos && (
            <div
              className="absolute z-20 pointer-events-none p-3 rounded-xl bg-white dark:bg-[#16261D] border border-[#D1FAE5] dark:border-[#065F46] shadow-lg text-xs space-y-1 transform -translate-x-1/2 -translate-y-full"
              style={{
                left: `${(tooltipPos.x / width) * 100}%`,
                top: `${(tooltipPos.y / height) * 100}%`,
                marginTop: '-12px',
              }}
            >
              <div className="font-bold text-[#14532D] dark:text-[#34D399] flex items-center justify-between gap-4">
                <span>SoH: {hoveredPoint.state_of_health_pct}%</span>
                <span className="text-[10px] text-[#64748B] font-mono">{hoveredPoint.source}</span>
              </div>
              <div className="text-[11px] text-[#475569] dark:text-[#CBD5E1]">
                SOC: {hoveredPoint.state_of_charge_pct}% • Cycles: {hoveredPoint.cycle_count}
              </div>
              <div className="text-[10px] text-[#64748B] dark:text-[#94A3B8] font-mono">
                Resistance: {hoveredPoint.internal_resistance_mohm} mΩ
              </div>
              <div className="text-[9px] text-[#94A3B8] font-mono">
                {new Date(hoveredPoint.recorded_at).toLocaleString()}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Mandatory Data Integrity Policy Footnote */}
      <div className="pt-2 border-t border-[#E5E7EB] dark:border-[#1E382B] flex items-start space-x-2 text-[11px] text-[#64748B] dark:text-[#94A3B8]">
        <Info className="w-3.5 h-3.5 mt-0.5 text-[#059669] shrink-0" />
        <p className="leading-relaxed">
          <strong>EU Metrology Standard:</strong> Battery health is measured strictly via recorded BMS telematics and diagnostic logging. Health is <em>never</em> estimated from calendar age or operational status.
        </p>
      </div>
    </div>
  );
};