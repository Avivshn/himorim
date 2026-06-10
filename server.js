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

const SYSTEM_PROMPT = `אתה פועל בתור "מומחה ניתוח נתונים וסטטיסטיקה של כדורגל בינלאומי" עם ידע מעמיק על כל קבוצות העולם.

כללים קריטיים:
1. יש לך ידע פנימי עשיר על כל נבחרות הכדורגל — דירוגי FIFA, שחקני מפתח, סגנון משחק, כושר אחרון, חוזקות וחולשות. **השתמש בידע הזה תמיד**, גם כשהנתונים החיצוניים חלקיים.
2. תמיד תחזיר JSON מדויק בלבד — ללא טקסט, ללא markdown.
3. **אל תכתוב "אין מידע"** — אתה מומחה שיודע על הקבוצות. נתח על בסיס הידע שלך.
4. תמיד תבחר תוצאה — ניצחון לבית, ניצחון לאורח, או תיקו. תיקו הוא תוצאה לגיטימית לחלוטין וצריך להופיע כשהקבוצות מאוזנות.
5. כשיחסי הכוחות מאוזנים מאוד — שקול תיקו ברצינות וציין סיכון גבוה.
6. טון: מקצועי, קר, אנליטי.

לדוגמה: אם נתון "Mexico vs South Africa, World Cup 2026" — אתה יודע ש-Mexico דירוג ~13 FIFA, South Africa ~66, Mexico חזקה יותר מבחינה היסטורית, שחקני מפתח כמו Raul Jimenez / Hirving Lozano, וכו'.

פורמט התשובה (JSON בלבד, עברית):
{
  "score": { "home": X, "away": Y },
  "analysis": {
    "current_form": "ניתוח כושר אחרון, שחקנים, וסגנון משחק של שתי הקבוצות...",
    "tactical_advantage": "איזו קבוצה מחזיקה יתרון טקטי ומדוע...",
    "decisive_factor": "הגורם הכי קריטי שיכריע את המשחק..."
  },
  "confidence": XX,
  "risk": "נמוכה|בינונית|גבוהה",
  "winner": "home|away|draw"
}

שדות חובה: score, analysis (3 שדות), confidence (0-100), risk, winner.
JSON טהור בלבד — ללא \`\`\`json ולא כל עטיפה אחרת.`;

// --- AI Analysis ---
app.post('/api/analyze', async (req, res) => {
  const { matchData, matchId, matchMeta } = req.body;
  if (!matchData) return res.status(400).json({ error: 'נדרשים נתוני משחק' });

  try {
    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: `נתוני המשחק לניתוח:\n\n${matchData}\n\nחשוב: השתמש בידע הפנימי שלך על הקבוצות (דירוג FIFA, שחקני מפתח, כושר אחרון, סגנון משחק, היסטוריה) כדי לתת ניתוח מלא ועשיר — גם אם חלק מהנתונים לא סופקו במפורש. אל תכתוב "אין מידע". תן תחזית מקצועית בפורמט JSON בלבד.` },
      ],
      temperature: 0.3,
      max_tokens: 1024,
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
