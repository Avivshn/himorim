interface ConfidenceGaugeProps {
  value: number;
}

export default function ConfidenceGauge({ value }: ConfidenceGaugeProps) {
  const radius = 44;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (value / 100) * circumference;

  const color =
    value >= 70 ? '#10b981' :
    value >= 45 ? '#f59e0b' :
    '#ef4444';

  const glowColor =
    value >= 70 ? 'rgba(16, 185, 129, 0.4)' :
    value >= 45 ? 'rgba(245, 158, 11, 0.4)' :
    'rgba(239, 68, 68, 0.4)';

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative" style={{ filter: `drop-shadow(0 0 12px ${glowColor})` }}>
        <svg width="108" height="108" viewBox="0 0 108 108" className="-rotate-90">
          {/* Track */}
          <circle
            cx="54"
            cy="54"
            r={radius}
            fill="none"
            stroke="rgba(255,255,255,0.06)"
            strokeWidth="8"
          />
          {/* Progress */}
          <circle
            cx="54"
            cy="54"
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            style={{
              transition: 'stroke-dashoffset 1.8s cubic-bezier(0.4, 0, 0.2, 1)',
            }}
          />
        </svg>
        {/* Value */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-black" style={{ color }}>
            {value}
          </span>
          <span className="text-[10px] text-gray-500 font-semibold tracking-wider uppercase">%</span>
        </div>
      </div>
      <span className="text-[11px] text-gray-500 uppercase tracking-widest font-semibold">
        רמת ביטחון
      </span>
    </div>
  );
}
