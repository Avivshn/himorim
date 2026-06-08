export default function Header() {
  return (
    <header className="relative border-b border-white/5 mb-8 overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-emerald-950/20 to-transparent pointer-events-none" />
      <div className="absolute inset-0 pitch-lines opacity-50 pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 relative">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center shadow-lg">
                <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M12 2C12 2 9 6 9 12s3 10 3 10M12 2c0 0 3 4 3 10s-3 10-3 10M2 12h20M4.2 7h15.6M4.2 17h15.6" strokeLinecap="round" />
                </svg>
              </div>
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-400 rounded-full animate-pulse" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-white">
                HIMORIM
                <span className="text-emerald-400 ml-1.5 text-sm font-medium tracking-widest uppercase">
                  AI
                </span>
              </h1>
              <p className="text-[11px] text-gray-500 tracking-wide uppercase font-medium">
                Football Intelligence System
              </p>
            </div>
          </div>

          {/* Status badge */}
          <div className="flex items-center gap-2 bg-pitch-800 border border-white/[0.08] rounded-full px-3.5 py-1.5">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs text-gray-400 font-medium">Groq · Llama 3.3 70B</span>
          </div>
        </div>

        {/* Subtitle */}
        <div className="mt-4 flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <p className="text-gray-400 text-sm leading-relaxed max-w-2xl">
            מנוע ניתוח כדורגל מקצועי המבוסס על בינה מלאכותית. הזן נתוני משחק לקבלת תחזית מדויקת וניתוח טקטי מעמיק.
          </p>
          <div className="flex gap-2 flex-shrink-0">
            {['דירוגים', 'כושר', 'טקטיקה'].map((tag) => (
              <span
                key={tag}
                className="text-[11px] px-2.5 py-1 bg-pitch-700 border border-white/[0.08] rounded-full text-gray-400 font-medium"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      </div>
    </header>
  );
}
