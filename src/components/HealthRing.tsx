import React from 'react';

interface HealthRingProps {
  value: number; // 0 - 100
  size?: number;
  strokeWidth?: number;
  showLabel?: boolean;
  subLabel?: string;
  animate?: boolean;
  gradeBadge?: boolean;
}

export const HealthRing: React.FC<HealthRingProps> = ({
  value,
  size = 140,
  strokeWidth = 10,
  showLabel = true,
  subLabel = 'State of Health',
  animate = true,
  gradeBadge = true
}) => {
  const clampedValue = Math.min(100, Math.max(0, value));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (clampedValue / 100) * circumference;

  // Determine gradient colors and tier grade
  const getHealthMeta = () => {
    if (clampedValue >= 85) {
      return { 
        start: '#10B981', 
        end: '#06B6D4', 
        glow: 'rgba(16, 185, 129, 0.25)', 
        grade: 'GRADE A+',
        gradeColor: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
        statusText: 'Optimal In-Vehicle Service'
      };
    }
    if (clampedValue >= 75) {
      return { 
        start: '#06B6D4', 
        end: '#3B82F6', 
        glow: 'rgba(6, 182, 212, 0.25)', 
        grade: 'GRADE A',
        gradeColor: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20',
        statusText: 'BESS Second-Life Candidate'
      };
    }
    if (clampedValue >= 65) {
      return { 
        start: '#F59E0B', 
        end: '#D97706', 
        glow: 'rgba(245, 158, 11, 0.25)', 
        grade: 'GRADE B',
        gradeColor: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
        statusText: 'Reconditioning Recommended'
      };
    }
    return { 
      start: '#EF4444', 
      end: '#DC2626', 
      glow: 'rgba(239, 68, 68, 0.25)', 
      grade: 'EOL RECYCLE',
      gradeColor: 'text-rose-400 bg-rose-500/10 border-rose-500/20',
      statusText: 'Hydrometallurgical Recovery'
    };
  };

  const meta = getHealthMeta();
  const gradId = `healthGrad-${Math.round(value)}-${size}`;

  return (
    <div 
      className="relative inline-flex flex-col items-center justify-center select-none"
      role="progressbar"
      aria-valuenow={Math.round(clampedValue)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={`${subLabel}: ${clampedValue.toFixed(1)}%`}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="rotate-[-90deg] overflow-visible"
        style={{ filter: `drop-shadow(0 0 14px ${meta.glow})` }}
      >
        <defs>
          <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={meta.start} />
            <stop offset="100%" stopColor={meta.end} />
          </linearGradient>
        </defs>

        {/* Outer subtle ticks circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius + 4}
          fill="transparent"
          stroke="#1E293B"
          strokeWidth={1}
          strokeDasharray="2 6"
          opacity={0.4}
        />

        {/* Background track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="transparent"
          stroke="#0F172A"
          strokeWidth={strokeWidth}
          className="opacity-90"
        />

        {/* Track border ring */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="transparent"
          stroke="#1E293B"
          strokeWidth={1}
          opacity={0.6}
        />

        {/* Foreground animated meter */}
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
            transition: animate ? 'stroke-dashoffset 1.4s cubic-bezier(0.16, 1, 0.3, 1)' : 'none'
          }}
        />
      </svg>

      {showLabel && (
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <div className="text-2xl sm:text-3xl font-black font-mono tracking-tight text-white flex items-baseline">
            <span>{clampedValue.toFixed(1)}</span>
            <span className="text-xs font-semibold text-slate-400 ml-0.5">%</span>
          </div>
          {subLabel && (
            <div className="text-[10px] uppercase font-bold tracking-wider text-slate-400 mt-0.5">
              {subLabel}
            </div>
          )}
          {gradeBadge && (
            <div className={`mt-1 text-[9px] font-mono font-semibold px-2 py-0.5 rounded-full border ${meta.gradeColor}`}>
              {meta.grade}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
