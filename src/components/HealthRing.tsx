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

  // Determine colors and tier grade according to Option A palette
  const getHealthMeta = () => {
    if (clampedValue >= 85) {
      return { 
        start: '#14532D', 
        end: '#059669', 
        grade: 'GRADE A+',
        gradeColor: 'text-[#059669] bg-[#ECFDF3] border-[#D1FAE5]',
        statusText: 'Optimal In-Vehicle Service'
      };
    }
    if (clampedValue >= 75) {
      return { 
        start: '#059669', 
        end: '#0D9488', 
        grade: 'GRADE A',
        gradeColor: 'text-[#0D9488] bg-[#F0FDFA] border-[#CCFBF1]',
        statusText: 'BESS Second-Life Candidate'
      };
    }
    if (clampedValue >= 65) {
      return { 
        start: '#D97706', 
        end: '#B45309', 
        grade: 'GRADE B',
        gradeColor: 'text-[#D97706] bg-[#FEF3C7] border-[#FDE68A]',
        statusText: 'Reconditioning Recommended'
      };
    }
    return { 
      start: '#DC2626', 
      end: '#991B1B', 
      grade: 'EOL RECYCLE',
      gradeColor: 'text-[#DC2626] bg-[#FEE2E2] border-[#FECACA]',
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
      >
        <defs>
          <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={meta.start} />
            <stop offset="100%" stopColor={meta.end} />
          </linearGradient>
        </defs>

        {/* Background track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="transparent"
          stroke="#E5E7EB"
          strokeWidth={strokeWidth}
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
          <div className="text-2xl sm:text-3xl font-black font-mono tracking-tight text-[#1F2937] flex items-baseline">
            <span>{clampedValue.toFixed(1)}</span>
            <span className="text-xs font-semibold text-[#64748B] ml-0.5">%</span>
          </div>
          {subLabel && (
            <div className="text-[10px] uppercase font-bold tracking-wider text-[#64748B] mt-0.5">
              {subLabel}
            </div>
          )}
          {gradeBadge && (
            <div className={`mt-1 text-[9px] font-mono font-bold px-2 py-0.5 rounded-full border ${meta.gradeColor}`}>
              {meta.grade}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
