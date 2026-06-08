import { useEffect, useState } from 'react';
import ConfidenceGauge from './ConfidenceGauge';
import type { PredictionData } from '../types';

interface PredictionCardProps {
  prediction: PredictionData;
  homeTeam: string;
  awayTeam: string;
  analyzedAt?: string | null;
  onReanalyze?: () => void;
}

const RISK_CONFIG = {
  'נמוכה': { label: 'סיכון נמוך', color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/25' },
  'בינונית': { label: 'סיכון בינוני', color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/25' },
  'גבוהה': { label: 'סיכון גבוה', color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/25' },
};

const ANALYSIS_ICONS = {
  current_form: (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  tactical_advantage: (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  decisive_factor: (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
};

const ANALYSIS_LABELS = {
  current_form: 'ניתוח כושר נוכחי',
  tactical_advantage: 'יתרון טקטי',
  decisive_factor: 'גורם מכריע',
};

const ANALYSIS_COLORS = {
  current_form: { border: 'border-blue-500/20', icon: 'bg-blue-500/15 text-blue-400', accent: '#3b82f6' },
  tactical_advantage: { border: 'border-purple-500/20', icon: 'bg-purple-500/15 text-purple-400', accent: '#a855f7' },
  decisive_factor: { border: 'border-amber-500/20', icon: 'bg-amber-500/15 text-amber-400', accent: '#f59e0b' },
};

function ScoreDisplay({ score, homeTeam, awayTeam, winner }: {
  score: PredictionData['score'];
  homeTeam: string;
  awayTeam: string;
  winner: PredictionData['winner'];
}) {
  const [displayed, setDisplayed] = useState({ home: 0, away: 0 });

  useEffect(() => {
    const timer = setTimeout(() => {
      setDisplayed({ home: score.home, away: score.away });
    }, 300);
    return () => clearTimeout(timer);
  }, [score]);

  return (
    <div className="flex items-center justify-center gap-4 py-6">
      {/* Home team */}
      <div className={`flex-1 text-center ${winner === 'home' ? 'opacity-100' : 'opacity-60'}`}>
        <div className={`inline-flex items-center justify-center w-10 h-10 rounded-full mb-2 ${
          winner === 'home' ? 'bg-emerald-500/20 ring-1 ring-emerald-500/40' : 'bg-pitch-700'
        }`}>
          <span className="text-lg">🏠</span>
        </div>
        <p className="text-sm font-semibold text-gray-300 truncate max-w-[100px] mx-auto">{homeTeam || 'בית'}</p>
        {winner === 'home' && (
          <span className="text-[10px] text-emerald-400 font-semibold uppercase tracking-wider">מנצח</span>
        )}
      </div>

      {/* Score */}
      <div className="flex items-center gap-3 flex-shrink-0">
        <span
          className="text-6xl font-black tabular-nums leading-none score-number"
          style={{
            color: winner === 'home' ? '#10b981' : winner === 'draw' ? '#f59e0b' : '#9ca3af',
          }}
        >
          {displayed.home}
        </span>
        <span className="text-2xl text-gray-600 font-light">—</span>
        <span
          className="text-6xl font-black tabular-nums leading-none score-number"
          style={{
            animationDelay: '0.15s',
            color: winner === 'away' ? '#10b981' : winner === 'draw' ? '#f59e0b' : '#9ca3af',
          }}
        >
          {displayed.away}
        </span>
      </div>

      {/* Away team */}
      <div className={`flex-1 text-center ${winner === 'away' ? 'opacity-100' : 'opacity-60'}`}>
        <div className={`inline-flex items-center justify-center w-10 h-10 rounded-full mb-2 ${
          winner === 'away' ? 'bg-emerald-500/20 ring-1 ring-emerald-500/40' : 'bg-pitch-700'
        }`}>
          <span className="text-lg">✈️</span>
        </div>
        <p className="text-sm font-semibold text-gray-300 truncate max-w-[100px] mx-auto">{awayTeam || 'אורח'}</p>
        {winner === 'away' && (
          <span className="text-[10px] text-emerald-400 font-semibold uppercase tracking-wider">מנצח</span>
        )}
      </div>
    </div>
  );
}

export default function PredictionCard({ prediction, homeTeam, awayTeam, analyzedAt, onReanalyze }: PredictionCardProps) {
  const riskInfo = RISK_CONFIG[prediction.risk] ?? RISK_CONFIG['בינונית'];

  const analyzedLabel = analyzedAt
    ? new Date(analyzedAt).toLocaleString('he-IL', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
    : null;

  return (
    <div className="space-y-4">
      {/* Main prediction card */}
      <div className="card-animate bg-gradient-to-br from-pitch-800 to-pitch-700 border border-white/[0.08] rounded-2xl overflow-hidden">
        {/* Header strip */}
        <div className="h-1 w-full bg-gradient-to-r from-emerald-500 via-blue-500 to-purple-500 opacity-70" />

        <div className="p-6">
          {/* Title */}
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                <svg className="w-3.5 h-3.5 text-emerald-400" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                </svg>
              </div>
              <span className="text-xs text-gray-500 uppercase tracking-widest font-semibold">תחזית מדויקת</span>
            </div>
            <div className="flex items-center gap-2">
              <span className={`text-xs font-semibold px-3 py-1 rounded-full border ${riskInfo.bg} ${riskInfo.color}`}>
                {riskInfo.label}
              </span>
            </div>
          </div>

          {/* Timestamp + re-analyze */}
          {(analyzedLabel || onReanalyze) && (
            <div className="flex items-center justify-between mb-3 px-0.5">
              {analyzedLabel && (
                <span className="text-[11px] text-gray-600 flex items-center gap-1">
                  <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                  </svg>
                  נותח: {analyzedLabel}
                </span>
              )}
              {onReanalyze && (
                <button
                  onClick={onReanalyze}
                  className="flex items-center gap-1.5 text-[11px] font-semibold text-amber-400 hover:text-amber-300 transition-colors bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 rounded-lg px-2.5 py-1"
                >
                  <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
                  </svg>
                  נתח מחדש
                </button>
              )}
            </div>
          )}

          {/* Score */}
          <ScoreDisplay
            score={prediction.score}
            homeTeam={homeTeam}
            awayTeam={awayTeam}
            winner={prediction.winner}
          />

          {/* Divider */}
          <div className="border-t border-white/5 my-4" />

          {/* Confidence */}
          <div className="flex items-center justify-center">
            <ConfidenceGauge value={prediction.confidence} />
          </div>
        </div>
      </div>

      {/* Analysis sections */}
      {(Object.keys(ANALYSIS_LABELS) as Array<keyof typeof ANALYSIS_LABELS>).map((key, i) => {
        const config = ANALYSIS_COLORS[key];
        return (
          <div
            key={key}
            className={`card-animate analysis-card border ${config.border}`}
            style={{ animationDelay: `${(i + 1) * 0.12}s` }}
          >
            {/* Accent bar */}
            <div
              className="absolute top-0 right-0 bottom-0 w-0.5 rounded-r-xl"
              style={{ background: config.accent, opacity: 0.5 }}
            />

            <div className="flex items-start gap-3">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 ${config.icon}`}>
                {ANALYSIS_ICONS[key]}
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-1.5">
                  {ANALYSIS_LABELS[key]}
                </h4>
                <p className="text-sm text-gray-300 leading-relaxed">
                  {prediction.analysis[key]}
                </p>
              </div>
            </div>
          </div>
        );
      })}

      {/* Footer */}
      <div className="text-center py-2">
        <p className="text-[11px] text-gray-700">
          ניתוח מבוסס AI • Groq · Llama 3.3 70B • לידיעה בלבד, לא ייעוץ פיננסי
        </p>
      </div>
    </div>
  );
}
