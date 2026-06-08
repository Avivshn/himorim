const STEPS = [
  { icon: '📊', label: 'קורא נתוני משחק...' },
  { icon: '⚡', label: 'מפעיל מנוע ניתוח...' },
  { icon: '🧠', label: 'מעבד אינטליגנציה...' },
  { icon: '📈', label: 'מחשב הסתברויות...' },
  { icon: '✅', label: 'מכין תחזית...' },
];

export default function LoadingState() {
  return (
    <div className="card-animate bg-pitch-800/80 border border-white/[0.08] rounded-2xl p-8">
      {/* Central spinner */}
      <div className="flex flex-col items-center gap-6 mb-8">
        <div className="relative">
          <div className="w-16 h-16 rounded-2xl bg-pitch-700 border border-white/[0.08] flex items-center justify-center">
            <svg
              className="w-8 h-8 text-emerald-400 animate-spin-slow"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            >
              <circle cx="12" cy="12" r="10" />
              <path d="M12 2C12 2 9 6 9 12s3 10 3 10M12 2c0 0 3 4 3 10s-3 10-3 10M2 12h20M4.2 7h15.6M4.2 17h15.6" strokeLinecap="round" />
            </svg>
          </div>
          {/* Pulsing ring */}
          <div className="absolute -inset-2 rounded-3xl border border-emerald-500/20 animate-ping" />
        </div>

        <div className="text-center">
          <h3 className="text-base font-semibold text-white mb-1">מנתח משחק...</h3>
          <p className="text-sm text-gray-500">Claude Opus 4.8 עובד על הניתוח</p>
        </div>
      </div>

      {/* Animated steps */}
      <div className="space-y-2.5">
        {STEPS.map((step, i) => (
          <div
            key={i}
            className="flex items-center gap-3 py-2.5 px-3 rounded-lg shimmer"
            style={{ animationDelay: `${i * 0.4}s` }}
          >
            <span className="text-base flex-shrink-0">{step.icon}</span>
            <div className="flex-1 h-2.5 bg-white/5 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-emerald-500/60 to-emerald-300/40 rounded-full"
                style={{
                  width: '0%',
                  animation: `fillBar 3s ease-in-out ${i * 0.5}s infinite`,
                }}
              />
            </div>
            <span className="text-xs text-gray-600 flex-shrink-0 w-36 text-right">{step.label}</span>
          </div>
        ))}
      </div>

      {/* Inline keyframes */}
      <style>{`
        @keyframes fillBar {
          0% { width: 0%; }
          50% { width: 85%; }
          100% { width: 0%; }
        }
      `}</style>
    </div>
  );
}
