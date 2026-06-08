import { useState, useEffect } from 'react';
import type { MatchFormData } from '../types';

const FORM_RESULTS = ['נ', 'ת', 'ה'] as const;
type FormResult = typeof FORM_RESULTS[number];

const FORM_LABELS: Record<FormResult, { label: string; color: string; bg: string }> = {
  'נ': { label: 'נ', color: 'text-emerald-400', bg: 'bg-emerald-500/20 border-emerald-500/40' },
  'ת': { label: 'ת', color: 'text-gray-400', bg: 'bg-gray-600/20 border-gray-600/40' },
  'ה': { label: 'ה', color: 'text-red-400', bg: 'bg-red-500/20 border-red-500/40' },
};

function FormSelector({
  value,
  onChange,
  label,
}: {
  value: string[];
  onChange: (v: string[]) => void;
  label: string;
}) {
  const toggle = (idx: number, result: FormResult) => {
    const updated = [...value];
    updated[idx] = updated[idx] === result ? '' : result;
    onChange(updated);
  };

  return (
    <div>
      <label className="block text-xs text-gray-500 font-medium mb-2 uppercase tracking-wide">
        {label} — 5 משחקים אחרונים
      </label>
      <div className="flex gap-2">
        {Array.from({ length: 5 }, (_, i) => (
          <div key={i} className="flex flex-col gap-1">
            <span className="text-[10px] text-gray-600 text-center">{i + 1}</span>
            <div className="flex flex-col gap-1">
              {FORM_RESULTS.map((r) => {
                const info = FORM_LABELS[r];
                const selected = value[i] === r;
                return (
                  <button
                    key={r}
                    type="button"
                    onClick={() => toggle(i, r)}
                    className={`w-8 h-7 rounded-md text-xs font-bold border transition-all duration-150 ${
                      selected
                        ? `${info.bg} ${info.color} border-current`
                        : 'bg-pitch-700 border-white/10 text-gray-600 hover:border-white/20'
                    }`}
                  >
                    {r}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
        <div className="flex flex-col justify-end gap-1 mr-2 text-[10px] text-gray-600 leading-7">
          <span>נצחון</span>
          <span>תיקו</span>
          <span>הפסד</span>
        </div>
      </div>
    </div>
  );
}

interface MatchFormProps {
  onAnalyze: (data: MatchFormData) => void;
  loading: boolean;
  initialData?: MatchFormData;
}

export default function MatchForm({ onAnalyze, loading, initialData }: MatchFormProps) {
  const [form, setForm] = useState<MatchFormData>(initialData ?? {
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
  });

  // Sync when a match card is clicked (initialData changes)
  useEffect(() => {
    if (initialData) setForm(initialData);
  }, [initialData]);

  const update = <K extends keyof MatchFormData>(key: K, val: MatchFormData[K]) =>
    setForm((prev) => ({ ...prev, [key]: val }));

  const canSubmit = form.homeTeam.trim() && form.awayTeam.trim();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit || loading) return;
    onAnalyze(form);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Match header */}
      <div className="form-section">
        <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-4 flex items-center gap-2">
          <span className="w-1.5 h-4 bg-emerald-500 rounded-full" />
          פרטי המשחק
        </h2>

        <div className="grid grid-cols-2 gap-3 mb-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1.5">תחרות</label>
            <input
              type="text"
              placeholder="גביע העולם, ליגת האלופות..."
              className="input-field text-sm"
              value={form.competition}
              onChange={(e) => update('competition', e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1.5">מיקום</label>
            <input
              type="text"
              placeholder="שם האצטדיון"
              className="input-field text-sm"
              value={form.venue}
              onChange={(e) => update('venue', e.target.value)}
            />
          </div>
        </div>

        <label className="flex items-center gap-2.5 cursor-pointer">
          <input
            type="checkbox"
            checked={form.isNeutralVenue}
            onChange={(e) => update('isNeutralVenue', e.target.checked)}
            className="w-4 h-4 rounded"
          />
          <span className="text-sm text-gray-400">מגרש ניטרלי (ללא יתרון בית)</span>
        </label>
      </div>

      {/* Teams — side by side */}
      <div className="relative">
        {/* VS divider */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
          <div className="w-10 h-10 rounded-full bg-pitch-900 border border-white/10 flex items-center justify-center">
            <span className="text-xs font-bold text-gray-500">VS</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {/* Home team */}
          <div className="form-section border-emerald-500/15 space-y-3">
            <h3 className="text-xs font-semibold text-emerald-400/70 uppercase tracking-widest flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              בית
            </h3>
            <div>
              <input
                type="text"
                placeholder="שם קבוצה *"
                className="input-field text-sm font-semibold"
                value={form.homeTeam}
                onChange={(e) => update('homeTeam', e.target.value)}
                required
              />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">דירוג</label>
              <input
                type="text"
                placeholder="#1 / 85 נקודות"
                className="input-field text-sm"
                value={form.homeRanking}
                onChange={(e) => update('homeRanking', e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs text-gray-600 mb-1">שערים ל</label>
                <input type="text" placeholder="2.1" className="input-field text-sm"
                  value={form.homeGoalsFor} onChange={(e) => update('homeGoalsFor', e.target.value)} />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">שערים נגד</label>
                <input type="text" placeholder="0.8" className="input-field text-sm"
                  value={form.homeGoalsAgainst} onChange={(e) => update('homeGoalsAgainst', e.target.value)} />
              </div>
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">שחקני מפתח</label>
              <textarea
                rows={2}
                placeholder="מסי, מבאפה..."
                className="input-field text-sm resize-none"
                value={form.homeKeyPlayers}
                onChange={(e) => update('homeKeyPlayers', e.target.value)}
              />
            </div>
          </div>

          {/* Away team */}
          <div className="form-section border-blue-500/15 space-y-3">
            <h3 className="text-xs font-semibold text-blue-400/70 uppercase tracking-widest flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
              אורח
            </h3>
            <div>
              <input
                type="text"
                placeholder="שם קבוצה *"
                className="input-field text-sm font-semibold"
                value={form.awayTeam}
                onChange={(e) => update('awayTeam', e.target.value)}
                required
              />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">דירוג</label>
              <input
                type="text"
                placeholder="#5 / 72 נקודות"
                className="input-field text-sm"
                value={form.awayRanking}
                onChange={(e) => update('awayRanking', e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs text-gray-600 mb-1">שערים ל</label>
                <input type="text" placeholder="1.8" className="input-field text-sm"
                  value={form.awayGoalsFor} onChange={(e) => update('awayGoalsFor', e.target.value)} />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">שערים נגד</label>
                <input type="text" placeholder="1.1" className="input-field text-sm"
                  value={form.awayGoalsAgainst} onChange={(e) => update('awayGoalsAgainst', e.target.value)} />
              </div>
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">שחקני מפתח</label>
              <textarea
                rows={2}
                placeholder="הלינד, ויניסיוס..."
                className="input-field text-sm resize-none"
                value={form.awayKeyPlayers}
                onChange={(e) => update('awayKeyPlayers', e.target.value)}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Recent form */}
      <div className="form-section space-y-5">
        <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-widest flex items-center gap-2">
          <span className="w-1.5 h-4 bg-blue-500 rounded-full" />
          כושר אחרון
        </h2>
        <FormSelector
          label={form.homeTeam || 'קבוצת בית'}
          value={form.homeForm}
          onChange={(v) => update('homeForm', v)}
        />
        <div className="border-t border-white/5" />
        <FormSelector
          label={form.awayTeam || 'קבוצת אורח'}
          value={form.awayForm}
          onChange={(v) => update('awayForm', v)}
        />
      </div>

      {/* H2H and notes */}
      <div className="form-section space-y-3">
        <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-widest flex items-center gap-2">
          <span className="w-1.5 h-4 bg-amber-500 rounded-full" />
          עימותים ישירים ומידע נוסף
        </h2>
        <div>
          <label className="block text-xs text-gray-500 mb-1.5">עימותים ישירים</label>
          <textarea
            rows={2}
            placeholder="5 משחקים אחרונים: 3 נצחונות לבית, 1 תיקו, 1 הפסד..."
            className="input-field text-sm resize-none"
            value={form.headToHead}
            onChange={(e) => update('headToHead', e.target.value)}
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1.5">הערות נוספות</label>
          <textarea
            rows={3}
            placeholder="פציעות, שחקנים מורחקים, לחץ טורניר, מזג אוויר..."
            className="input-field text-sm resize-none"
            value={form.additionalNotes}
            onChange={(e) => update('additionalNotes', e.target.value)}
          />
        </div>
      </div>

      {/* Submit */}
      <button
        type="submit"
        disabled={!canSubmit || loading}
        className="btn-primary w-full text-base"
      >
        {loading ? (
          <>
            <svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 12a9 9 0 11-6.219-8.56" strokeLinecap="round" />
            </svg>
            מנתח...
          </>
        ) : (
          <>
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            נתח משחק
          </>
        )}
      </button>
    </form>
  );
}
