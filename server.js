const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const Groq = require('groq-sdk');

const app = express();
app.use(cors());
app.use(express.json());

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// --- Analyses persistence ---
const DATA_DIR = path.join(__dirname, 'data');
const ANALYSES_FILE = path.join(DATA_DIR, 'analyses.json');

function loadAnalyses() {
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    if (!fs.existsSync(ANALYSES_FILE)) return {};
    return JSON.parse(fs.readFileSync(ANALYSES_FILE, 'utf8'));
  } catch { return {}; }
}

function saveAnalyses(data) {
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(ANALYSES_FILE, JSON.stringify(data, null, 2));
  } catch (e) { console.error('Save analyses error:', e.message); }
}

const SYSTEM_PROMPT = `You are a professional football analysis system at the level of a senior FIFA scout. You analyze matches in a cold, statistical, data-driven way — without emotional bias. You respond in Hebrew.

=== Analysis Principles ===

1. Statistical realism: In World Cup group stage, ~25-30% of matches end in draws. 40% are won by the stronger team, 30% are upsets. Do NOT be biased toward wins — draws are frequent and legitimate.

2. Factors to always check:
   - FIFA ranking gap: gap over 20 = significant advantage. Under 10 = very balanced.
   - Recent form: 3 wins from 5 = good form. Under 2 = poor form.
   - Playing style: attacking vs defensive = usually tight result.
   - Motivation: both teams need points = open, intense match.
   - Key players: missing captain or striker = 15-20% drop in attacking power.
   - H2H history: psychological impact.
   - Fatigue: 3rd group stage match = high fatigue, more errors.

3. Realistic score rules:
   - Small ranking gap (under 15) + similar styles = seriously consider draw
   - Defensive team vs attacking team = usually 1-0 or 1-1
   - Two attacking teams = 2-1 or 2-2
   - Large gap (40+ ranking) = 3-0 or 2-0
   - Do NOT default to 2-1 — calculate from the data

4. Realistic confidence:
   - 75-90%: huge gap, one team clearly stronger in all parameters
   - 55-74%: clear advantage but not absolute
   - 40-54%: balanced, draw possible — high risk

5. JSON only — no text, no markdown outside JSON.

=== Response format (JSON only, Hebrew text in analysis fields) ===
{
  "score": { "home": X, "away": Y },
  "analysis": {
    "current_form": "deep analysis of both teams form, key players, known injuries, playing style — compare with numbers",
    "tactical_advantage": "which team holds a specific tactical advantage, why, and how it will affect the match",
    "decisive_factor": "the single most critical factor — injury, motivation, defense, specific player"
  },
  "confidence": XX,
  "risk": "נמוכה|בינונית|גבוהה",
  "winner": "home|away|draw"
}

Required fields: score, analysis (3 fields), confidence (0-100), risk, winner.
Pure JSON only — no \`\`\`json wrapper.`;

// --- AI Analysis ---
app.post('/api/analyze', async (req, res) => {
  const { matchData, matchId, matchMeta } = req.body;
  if (!matchData) return res.status(400).json({ error: 'נדרשים נתוני משחק' });

  try {
    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: `Match data to analyze:\n\n${matchData}\n\nAnalyze all factors deeply: FIFA ranking, recent form, playing style, key players, H2H history, motivation. Give a realistic prediction — if teams are balanced, draw is a valid answer. Do NOT default to 2-1. Calculate from data. Return JSON only, with Hebrew text in the analysis fields.` },
      ],
      temperature: 0.55,
      max_tokens: 1200,
    });

    const text = completion.choices[0]?.message?.content?.trim() || '';
    let jsonStr = text;
    const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (fenced) jsonStr = fenced[1].trim();
    else {
      const obj = text.match(/\{[\s\S]*\}/);
      if (obj) jsonStr = obj[0];
    }

    const prediction = JSON.parse(jsonStr);

    // Save if matchId provided
    if (matchId) {
      const analyses = loadAnalyses();
      analyses[matchId] = {
        prediction,
        matchMeta: matchMeta || null,
        analyzedAt: new Date().toISOString(),
      };
      saveAnalyses(analyses);
    }

    res.json(prediction);
  } catch (err) {
    console.error('Analyze error:', err.status, err.message);
    res.status(500).json({ error: err.message || 'שגיאה בניתוח.' });
  }
});

// --- Get saved analysis for a match ---
app.get('/api/analyses/:matchId', (req, res) => {
  const analyses = loadAnalyses();
  const entry = analyses[req.params.matchId];
  if (!entry) return res.status(404).json({ error: 'not_found' });
  res.json(entry);
});

// --- Get all saved analyses ---
app.get('/api/analyses', (req, res) => {
  res.json(loadAnalyses());
});

// --- Upcoming WC2026 Matches ---
app.get('/api/matches', async (req, res) => {
  const apiKey = process.env.FOOTBALL_DATA_KEY;
  if (!apiKey) return res.status(503).json({ error: 'FOOTBALL_DATA_KEY_MISSING' });

  try {
    const today = new Date().toISOString().split('T')[0];
    const future = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const response = await fetch(
      `https://api.football-data.org/v4/competitions/WC/matches?status=SCHEDULED&dateFrom=${today}&dateTo=${future}`,
      { headers: { 'X-Auth-Token': apiKey } }
    );

    if (!response.ok) {
      const errText = await response.text();
      console.error('Football API error:', response.status, errText);
      return res.status(response.status).json({ error: 'Football API error: ' + response.status });
    }

    const data = await response.json();
    const matches = (data.matches || []).map(m => ({
      id: m.id,
      utcDate: m.utcDate,
      stage: m.stage,
      group: m.group,
      homeTeam: { id: m.homeTeam.id, name: m.homeTeam.name, shortName: m.homeTeam.shortName, crest: m.homeTeam.crest },
      awayTeam: { id: m.awayTeam.id, name: m.awayTeam.name, shortName: m.awayTeam.shortName, crest: m.awayTeam.crest },
    }));

    res.json(matches);
  } catch (err) {
    console.error('Matches error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// --- Team Form (last 5 matches + H2H) ---
async function fetchTeamMatches(teamId, apiKey) {
  const res = await fetch(
    `https://api.football-data.org/v4/teams/${teamId}/matches?status=FINISHED&limit=5`,
    { headers: { 'X-Auth-Token': apiKey } }
  );
  if (!res.ok) return [];
  const data = await res.json();
  return data.matches || [];
}

function computeFormStats(matches, teamId) {
  const form = [];
  let goalsFor = 0, goalsAgainst = 0, count = 0;

  for (const m of matches.slice(0, 5)) {
    const isHome = m.homeTeam.id === parseInt(teamId);
    const gf = isHome ? m.score.fullTime.home : m.score.fullTime.away;
    const ga = isHome ? m.score.fullTime.away : m.score.fullTime.home;
    if (gf === null || ga === null) continue;
    goalsFor += gf;
    goalsAgainst += ga;
    count++;
    if (gf > ga) form.push('W');
    else if (gf === ga) form.push('D');
    else form.push('L');
  }

  return {
    form,
    avgFor: count ? (goalsFor / count).toFixed(1) : null,
    avgAgainst: count ? (goalsAgainst / count).toFixed(1) : null,
    recentMatches: matches.slice(0, 5).map(m => {
      const isHome = m.homeTeam.id === parseInt(teamId);
      return {
        opponent: isHome ? m.awayTeam.name : m.homeTeam.name,
        score: `${m.score.fullTime.home}-${m.score.fullTime.away}`,
        date: m.utcDate.split('T')[0],
        venue: isHome ? 'בית' : 'חוץ',
      };
    }),
  };
}

async function fetchH2H(homeId, awayId, apiKey) {
  try {
    const res = await fetch(
      `https://api.football-data.org/v4/teams/${homeId}/matches?status=FINISHED&limit=20`,
      { headers: { 'X-Auth-Token': apiKey } }
    );
    if (!res.ok) return [];
    const data = await res.json();
    const h2h = (data.matches || []).filter(
      m => m.homeTeam.id === parseInt(awayId) || m.awayTeam.id === parseInt(awayId)
    ).slice(0, 5);
    return h2h.map(m => ({
      date: m.utcDate.split('T')[0],
      home: m.homeTeam.name,
      away: m.awayTeam.name,
      score: `${m.score.fullTime.home}-${m.score.fullTime.away}`,
    }));
  } catch {
    return [];
  }
}

app.get('/api/team-form', async (req, res) => {
  const { homeId, awayId } = req.query;
  const apiKey = process.env.FOOTBALL_DATA_KEY;
  if (!apiKey) return res.status(503).json({ error: 'FOOTBALL_DATA_KEY_MISSING' });
  if (!homeId || !awayId) return res.status(400).json({ error: 'Missing homeId or awayId' });

  try {
    const [homeMatches, awayMatches, h2h] = await Promise.all([
      fetchTeamMatches(homeId, apiKey),
      fetchTeamMatches(awayId, apiKey),
      fetchH2H(homeId, awayId, apiKey),
    ]);

    res.json({
      home: computeFormStats(homeMatches, homeId),
      away: computeFormStats(awayMatches, awayId),
      h2h,
    });
  } catch (err) {
    console.error('Team form error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`⚽ Football AI server running on http://localhost:${PORT}`);
  console.log(`   AI: Groq Llama 3.3 70B | Matches: ${process.env.FOOTBALL_DATA_KEY ? 'football-data.org ✓' : 'No key'}`);
});
