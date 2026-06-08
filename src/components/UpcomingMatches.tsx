import { useEffect, useState } from 'react';

export interface FetchedMatch {
  id: number;
  utcDate: string;
  stage: string;
  group: string | null;
  homeTeam: { id: number; name: string; shortName: string; crest: string };
  awayTeam: { id: number; name: string; shortName: string; crest: string };
}

interface Props {
  onMatchSelect: (match: FetchedMatch) => void;
  selectedId: number | null;
}

const STAGE_LABELS: Record<string, string> = {
  GROUP_STAGE: 'שלב הבתים',
  ROUND_OF_16: 'שמינית גמר',
  QUARTER_FINALS: 'רבע גמר',
  SEMI_FINALS: 'חצי גמר',
  FINAL: 'גמר',
  THIRD_PLACE: 'משחק 3-4',
};

function formatDate(utcDate: string) {
  const d = new Date(utcDate);
  return {
    day: d.toLocaleDateString('he-IL', { weekday: 'short', day: 'numeric', month: 'short' }),
    time: d.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' }),
  };
}

function TeamLogo({ crest, name }: { crest: string; name: string }) {
  const [failed, setFailed] = useState(false);
  if (failed || !crest) {
    return (
      <div className="w-8 h-8 rounded-full bg-pitch-600 border border-white/10 flex items-center justify-center text-xs font-bold text-gray-400">
        {name.slice(0, 2).toUpperCase()}
      </div>
    );
  }
  return (
    <img
      src={crest}
      alt={name}
      className="w-8 h-8 object-contain"
      onError={() => setFailed(true)}
    />
  );
}

export default function UpcomingMatches({ onMatchSelect, selectedId }: Props) {
  const [matches, setMatches] = useState<FetchedMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [noKey, setNoKey] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/matches')
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok) {
          if (data.error === 'FOOTBALL_DATA_KEY_MISSING') { setNoKey(true); return; }
          throw new Error(data.error || 'שגיאה');
        }
        setMatches(data);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="mb-6">
      {/* Section header */}
      <div className="flex items-center gap-2.5 mb-3 px-1">
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
          <span className="text-xs font-semibold text-gray-400 uppercase tracking-widest">
            מונדיאל 2026 — משחקים קרובים
          </span>
        </div>
        {matches.length > 0 && (
          <span className="text-[11px] text-gray-600 font-medium">לחץ על משחק לניתוח מיידי</span>
        )}
      </div>

      {/* Content */}
      {loading && <MatchesSkeleton />}

      {noKey && <NoKeyBanner />}

      {error && !noKey && (
        <div className="bg-red-950/30 border border-red-500/20 rounded-xl px-4 py-3 text-sm text-red-400">
          שגיאה בטעינת משחקים: {error}
        </div>
      )}

      {!loading && !noKey && !error && matches.length === 0 && (
        <div className="bg-pitch-800/40 border border-white/5 rounded-xl px-4 py-3 text-sm text-gray-500 text-center">
          אין משחקים מתוכננים ב-10 הימים הקרובים
        </div>
      )}

      {matches.length > 0 && (
        <div className="flex gap-3 overflow-x-auto pb-2 snap-x snap-mandatory scroll-smooth"
          style={{ scrollbarWidth: 'thin' }}>
          {matches.map((m) => {
            const { day, time } = formatDate(m.utcDate);
            const isSelected = m.id === selectedId;
            return (
              <button
                key={m.id}
                onClick={() => onMatchSelect(m)}
                className={`
                  flex-shrink-0 snap-start w-52 rounded-xl border p-3.5 text-right
                  transition-all duration-200 cursor-pointer group
                  ${isSelected
                    ? 'bg-emerald-500/10 border-emerald-500/40 ring-1 ring-emerald-500/30'
                    : 'bg-pitch-800/70 border-white/[0.08] hover:border-white/20 hover:bg-pitch-700/60'
                  }
                `}
              >
                {/* Date & stage */}
                <div className="flex items-center justify-between mb-2.5">
                  <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-md ${
                    isSelected ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/10 text-amber-400/80'
                  }`}>
                    {STAGE_LABELS[m.stage] || m.stage}
                    {m.group ? ` · ${m.group.replace('GROUP_', 'בית ')}` : ''}
                  </span>
                  {isSelected && (
                    <span className="text-emerald-400">
                      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/>
                      </svg>
                    </span>
                  )}
                </div>

                {/* Teams */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <TeamLogo crest={m.homeTeam.crest} name={m.homeTeam.shortName} />
                    <span className="text-sm font-semibold text-white truncate">{m.homeTeam.name}</span>
                  </div>
                  <div className="flex items-center gap-2 opacity-70">
                    <div className="w-8 flex justify-center">
                      <span className="text-[10px] text-gray-500 font-bold">VS</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <TeamLogo crest={m.awayTeam.crest} name={m.awayTeam.shortName} />
                    <span className="text-sm font-semibold text-white truncate">{m.awayTeam.name}</span>
                  </div>
                </div>

                {/* Time */}
                <div className="mt-3 pt-2.5 border-t border-white/5 flex items-center justify-between">
                  <span className="text-[11px] text-gray-500">{day}</span>
                  <span className="text-[11px] font-semibold text-gray-400">{time}</span>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function MatchesSkeleton() {
  return (
    <div className="flex gap-3 overflow-hidden">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="flex-shrink-0 w-52 h-40 rounded-xl bg-pitch-800/50 border border-white/5 shimmer" />
      ))}
    </div>
  );
}

function NoKeyBanner() {
  return (
    <div className="bg-amber-950/30 border border-amber-500/20 rounded-xl p-4">
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-lg bg-amber-500/15 flex items-center justify-center flex-shrink-0">
          <svg className="w-4 h-4 text-amber-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold text-amber-400 mb-1">הוסף מפתח API לטעינת משחקים חיה</p>
          <p className="text-xs text-amber-300/60 leading-relaxed mb-2">
            הירשם ב-<strong>football-data.org</strong> (חינמי, ללא כרטיס אשראי) וקבל API key.
            הוסף לקובץ <code className="bg-black/30 px-1 rounded">.env</code>:
          </p>
          <code className="text-xs bg-black/40 border border-amber-500/20 rounded-lg px-3 py-1.5 block text-amber-300/80 font-mono">
            FOOTBALL_DATA_KEY=your_key_here
          </code>
        </div>
      </div>
    </div>
  );
}
