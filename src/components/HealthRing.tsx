import React from 'react';

interface HealthRingProps {
  value: number; // 0 - 100
  size?: number;
  strokeWidth?: number;
  showLabel?: boolean;
  subLabel?: string;
  animate?: boolean;
}

export const HealthRing: React.FC<HealthRingProps> = ({
  value,
  size = 140,
  strokeWidth = 10,
  showLabel = true,
  subLabel = 'State of Health',
  animate = true
}) => {
  const clampedValue = Math.min(100, Math.max(0, value));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (clampedValue / 100) * circumference;

  // Determine gradient colors based on health
  const getHealthGradient = () => {
    if (clampedValue >= 80) return { start: '#10B981', end: '#06B6D4', glow: 'rgba(16, 185, 129, 0.3)' };
    if (clampedValue >= 70) return { start: '#06B6D4', end: '#3B82F6', glow: 'rgba(6, 182, 212, 0.3)' };
    if (clampedValue >= 60) return { start: '#F59E0B', end: '#D97706', glow: 'rgba(245, 158, 11, 0.3)' };
    return { start: '#EF4444', end: '#DC2626', glow: 'rgba(239, 68, 68, 0.3)' };
  };

  const colors = getHealthGradient();
  const gradId = `healthGrad-${Math.round(value)}-${size}`;

  return (
    <div className="relative inline-flex flex-col items-center justify-center">
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="rotate-[-90deg] overflow-visible"
        style={{ filter: `drop-shadow(0 0 12px ${colors.glow})` }}
      >
        <defs>
          <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={colors.start} />
            <stop offset="100%" stopColor={colors.end} />
          </linearGradient>
        </defs>

        {/* Background track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="transparent"
          stroke="#1E293B"
          strokeWidth={strokeWidth}
          className="opacity-70"
        />

        {/* Foreground animated ring */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="transparent"
          stroke={`url(#${gradId})`}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          style={{
            transition: animate ? 'stroke-dashoffset 1.2s cubic-bezier(0.16, 1, 0.3, 1)' : 'none'
          }}
        />
      </svg>

      {showLabel && (
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <div className="text-2xl font-black font-mono tracking-tight text-white">
            {clampedValue.toFixed(1)}
            <span className="text-xs font-semibold text-slate-400 ml-0.5">%</span>
          </div>
          {subLabel && (
            <div className="text-[10px] uppercase font-bold tracking-wider text-slate-400 mt-0.5">
              {subLabel}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
