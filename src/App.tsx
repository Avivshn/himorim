import { useState } from 'react';
import Header from './components/Header';
import MatchForm from './components/MatchForm';
import PredictionCard from './components/PredictionCard';
import LoadingState from './components/LoadingState';
import UpcomingMatches, { type FetchedMatch } from './components/UpcomingMatches';
import type { MatchFormData, PredictionData } from './types';

function buildMatchDataString(data: MatchFormData): string {
  const formLabel = (arr: string[]) => arr.filter(Boolean).join(' - ') || 'לא סופק';
  return `
=== נתוני המשחק ===
תחרות: ${data.competition || 'לא צוין'}
מגרש: ${data.venue || 'לא צוין'} ${data.isNeutralVenue ? '(מגרש ניטרלי)' : '(מגרש בית)'}

--- קבוצת בית: ${data.homeTeam} ---
דירוג FIFA/עולמי: ${data.homeRanking || 'לא ידוע'}
כושר אחרון (5 משחקים): ${formLabel(data.homeForm)}
שחקנים מרכזיים: ${data.homeKeyPlayers || 'לא צוין'}
ממוצע שערים ל (עונה): ${data.homeGoalsFor || 'לא ידוע'}
ממוצע שערים נגד (עונה): ${data.homeGoalsAgainst || 'לא ידוע'}

--- קבוצת אורח: ${data.awayTeam} ---
דירוג FIFA/עולמי: ${data.awayRanking || 'לא ידוע'}
כושר אחרון (5 משחקים): ${formLabel(data.awayForm)}
שחקנים מרכזיים: ${data.awayKeyPlayers || 'לא צוין'}
ממוצע שערים ל (עונה): ${data.awayGoalsFor || 'לא ידוע'}
ממוצע שערים נגד (עונה): ${data.awayGoalsAgainst || 'לא ידוע'}

--- עימותים ישירים ---
${data.headToHead || 'אין נתוני עימות ישיר'}

--- מידע נוסף ---
${data.additionalNotes || 'אין הערות נוספות'}
`.trim();
}

const EMPTY_FORM: MatchFormData = {
  homeTeam: '',
  awayTeam: '',
  homeRanking: '',
  awayRanking: '',
  homeForm: Array(5).fill(''),
  awayForm: Array(5).fill(''),
  homeKeyPlayers: '',
  awayKeyPlayers: '',
  homeGoalsFor: '',
  homeGoalsAgainst: '',
  awayGoalsFor: '',
  awayGoalsAgainst: '',
  venue: '',
  competition: '',
  headToHead: '',
  additionalNotes: '',
  isNeutralVenue: false,
};

export default function App() {
  const [prediction, setPrediction] = useState<PredictionData | null>(null);
  const [analyzedAt, setAnalyzedAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [homeTeamName, setHomeTeamName] = useState('');
  const [awayTeamName, setAwayTeamName] = useState('');
  const [formData, setFormData] = useState<MatchFormData>(EMPTY_FORM);
  const [selectedMatch, setSelectedMatch] = useState<FetchedMatch | null>(null);

  async function buildMatchForm(match: FetchedMatch): Promise<MatchFormData> {
    const d = new Date(match.utcDate);
    const dateStr = d.toLocaleDateString('he-IL', { day: 'numeric', month: 'long', year: 'numeric' });

    // WC2026 host nations have real home advantage
    const HOST_NATIONS = ['Canada', 'United States', 'USA', 'Mexico'];
    const homeIsHost = HOST_NATIONS.some(h => match.homeTeam.name.includes(h));
    const awayIsHost = HOST_NATIONS.some(h => match.awayTeam.name.includes(h));
    const isHost = homeIsHost || awayIsHost;

    const hostNote = homeIsHost
      ? `⚠️ יתרון בית: ${match.homeTeam.name} משחקת על מגרש ביתי — קהל ביתי מלא, הכרת המגרשים, אין עייפות טיסות. יתרון עצום.`
      : awayIsHost
      ? `⚠️ יתרון בית: ${match.awayTeam.name} (קבוצת אורח על הנייר) משחקת בפועל על מגרש ביתי — קהל ביתי מלא, הכרת המגרשים, אין עייפות טיסות. יתרון עצום.`
      : '';

    let form: MatchFormData = {
      ...EMPTY_FORM,
      homeTeam: match.homeTeam.name,
      awayTeam: match.awayTeam.name,
      competition: 'FIFA World Cup 2026',
      venue: homeIsHost ? match.homeTeam.name + ' — מגרש בית' : awayIsHost ? match.awayTeam.name + ' — מגרש בית' : 'ארה"ב / קנדה / מקסיקו',
      isNeutralVenue: !isHost,
      additionalNotes: `תאריך: ${dateStr} | שלב: ${match.stage}${match.group ? ` | ${match.group}` : ''}${hostNote ? '\n\n' + hostNote : ''}`,
    };

    try {
      const statsRes = await fetch(`/api/team-form?homeId=${match.homeTeam.id}&awayId=${match.awayTeam.id}`);
      if (statsRes.ok) {
        const stats = await statsRes.json();
        const mapForm = (arr: string[]) => arr.map(r => r === 'W' ? 'נ' : r === 'D' ? 'ת' : 'ה');
        const h2hStr = stats.h2h?.length
          ? stats.h2h.map((m: { date: string; home: string; away: string; score: string }) =>
              `${m.date}: ${m.home} ${m.score} ${m.away}`).join('\n')
          : '';
        const homeRecent = stats.home?.recentMatches?.map(
          (m: { date: string; opponent: string; score: string; venue: string }) =>
            `${m.date} נגד ${m.opponent} ${m.score} (${m.venue})`
        ).join(' | ') || '';
        const awayRecent = stats.away?.recentMatches?.map(
          (m: { date: string; opponent: string; score: string; venue: string }) =>
            `${m.date} נגד ${m.opponent} ${m.score} (${m.venue})`
        ).join(' | ') || '';

        form = {
          ...form,
          homeForm: mapForm(stats.home?.form || []),
          awayForm: mapForm(stats.away?.form || []),
          homeGoalsFor: stats.home?.avgFor || '',
          homeGoalsAgainst: stats.home?.avgAgainst || '',
          awayGoalsFor: stats.away?.avgFor || '',
          awayGoalsAgainst: stats.away?.avgAgainst || '',
          headToHead: h2hStr,
          additionalNotes: form.additionalNotes
            + (homeRecent ? `\n\n${match.homeTeam.name} אחרונים: ${homeRecent}` : '')
            + (awayRecent ? `\n\n${match.awayTeam.name} אחרונים: ${awayRecent}` : ''),
        };
      }
    } catch { /* continue with basic data */ }

    return form;
  }

  async function runFreshAnalysis(builtForm: MatchFormData, matchId?: number, matchMeta?: object) {
    setLoading(true);
    setError(null);
    setPrediction(null);
    setAnalyzedAt(null);
    setHomeTeamName(builtForm.homeTeam);
    setAwayTeamName(builtForm.awayTeam);

    try {
      const matchData = buildMatchDataString(builtForm);
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ matchData, matchId, matchMeta }),
      });
      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error((errData as { error?: string }).error || 'שגיאה בשרת');
      }
      setPrediction(await response.json());
      setAnalyzedAt(new Date().toISOString());
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'שגיאה לא ידועה');
    } finally {
      setLoading(false);
    }
  }

  const handleMatchSelect = async (match: FetchedMatch) => {
    setSelectedMatch(match);
    setHomeTeamName(match.homeTeam.name);
    setAwayTeamName(match.awayTeam.name);

    setTimeout(() => {
      document.getElementById('results-panel')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);

    // Check for saved analysis first
    try {
      const savedRes = await fetch(`/api/analyses/${match.id}`);
      if (savedRes.ok) {
        const saved = await savedRes.json();
        const builtForm = await buildMatchForm(match);
        setFormData(builtForm);
        setPrediction(saved.prediction);
        setAnalyzedAt(saved.analyzedAt);
        setError(null);
        setLoading(false);
        return;
      }
    } catch { /* no saved analysis */ }

    // No saved analysis — run fresh
    const builtForm = await buildMatchForm(match);
    setFormData(builtForm);
    await runFreshAnalysis(builtForm, match.id, {
      id: match.id,
      homeTeam: match.homeTeam.name,
      awayTeam: match.awayTeam.name,
      utcDate: match.utcDate,
      stage: match.stage,
    });
  };

  const handleReanalyze = async () => {
    if (!selectedMatch) return;
    const builtForm = await buildMatchForm(selectedMatch);
    setFormData(builtForm);
    await runFreshAnalysis(builtForm, selectedMatch.id, {
      id: selectedMatch.id,
      homeTeam: selectedMatch.homeTeam.name,
      awayTeam: selectedMatch.awayTeam.name,
      utcDate: selectedMatch.utcDate,
      stage: selectedMatch.stage,
    });
  };

  const handleManualAnalyze = (data: MatchFormData) => {
    setSelectedMatch(null);
    setFormData(data);
    runFreshAnalysis(data);
  };

  return (
    <div className="min-h-screen bg-pitch-950 bg-grid">
      <Header />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-20 space-y-6">
        <UpcomingMatches onMatchSelect={handleMatchSelect} selectedId={selectedMatch?.id ?? null} />

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 items-start">
          <MatchForm
            onAnalyze={handleManualAnalyze}
            loading={loading}
            initialData={formData}
          />

          <div id="results-panel" className="sticky top-8">
            {!loading && !prediction && !error && <EmptyState />}
            {loading && <LoadingState />}
            {error && !loading && (
              <ErrorState message={error} onDismiss={() => setError(null)} />
            )}
            {prediction && !loading && (
              <PredictionCard
                prediction={prediction}
                homeTeam={homeTeamName}
                awayTeam={awayTeamName}
                analyzedAt={analyzedAt}
                onReanalyze={selectedMatch ? handleReanalyze : undefined}
              />
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="w-20 h-20 rounded-2xl bg-pitch-700 border border-white/5 flex items-center justify-center mb-6">
        <svg className="w-10 h-10 text-gray-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <circle cx="12" cy="12" r="10" />
          <path d="M12 2C12 2 9 6 9 12s3 10 3 10M12 2c0 0 3 4 3 10s-3 10-3 10M2 12h20M4.2 7h15.6M4.2 17h15.6" />
        </svg>
      </div>
      <h3 className="text-lg font-semibold text-gray-400 mb-2">ממתין לנתוני משחק</h3>
      <p className="text-sm text-gray-600 max-w-xs leading-relaxed">
        לחץ על משחק קרוב מלמעלה לניתוח מיידי, או מלא את הטופס ידנית
      </p>
    </div>
  );
}

function ErrorState({ message, onDismiss }: { message: string; onDismiss: () => void }) {
  return (
    <div className="card-animate bg-red-950/40 border border-red-500/20 rounded-2xl p-6">
      <div className="flex items-start gap-4">
        <div className="w-10 h-10 rounded-xl bg-red-500/20 flex items-center justify-center flex-shrink-0">
          <svg className="w-5 h-5 text-red-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        </div>
        <div className="flex-1">
          <h3 className="text-red-400 font-semibold mb-1">שגיאה בניתוח</h3>
          <p className="text-red-300/70 text-sm">{message}</p>
        </div>
        <button onClick={onDismiss} className="text-red-500/50 hover:text-red-400 transition-colors">
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>
    </div>
  );
}
