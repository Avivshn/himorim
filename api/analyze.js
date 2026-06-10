const Groq = require('groq-sdk');
const { Redis } = require('@upstash/redis');

const kv = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// Step 1: Deep reasoning prompt — AI thinks through every factor before deciding
const REASONING_PROMPT = `You are a senior FIFA football analyst. Your job is to deeply analyze a match before making any prediction.

Go through EVERY factor step by step, out loud. Be critical and honest. Do NOT jump to conclusions.

Analyze in this exact order:

1. FIFA RANKINGS: What is the gap? Who has the advantage and by how much?
2. HOME ADVANTAGE: Is this a neutral venue? Does either team have crowd support? For WC2026 (hosted in USA/Canada/Mexico) — Canada has massive home advantage.
3. RECENT FORM: Last 5 matches for each team. Who is in better form? Any winning/losing streaks?
4. KEY PLAYERS: Who are the star players on each side? Any known injuries or absences? (e.g. Alphonso Davies, Jonathan David for Canada; key attackers for other teams)
5. PLAYING STYLE: Is each team offensive or defensive? How do the styles match up?
6. HEAD TO HEAD: Historical results between these teams. Any psychological edge?
7. MOTIVATION & STAKES: What does each team need from this match? Group standing pressure?
8. BETTING MARKET SIGNAL: If odds/market data is provided, factor it in heavily — bookmakers aggregate huge amounts of data.
9. OVERALL ASSESSMENT: Who is the REAL favorite after considering all factors? What is the most likely scoreline?

After your reasoning, output ONLY a JSON block in this exact format:
###JSON###
{
  "score": { "home": X, "away": Y },
  "analysis": {
    "current_form": "Hebrew: deep analysis of both teams form, key players, injuries, style comparison with specific details",
    "tactical_advantage": "Hebrew: which team holds tactical advantage, why, and how it affects the match flow",
    "decisive_factor": "Hebrew: the single most critical deciding factor — injury, home crowd, specific player, motivation"
  },
  "confidence": XX,
  "risk": "נמוכה|בינונית|גבוהה",
  "winner": "home|away|draw"
}
###END###

Rules for the JSON:
- Draw is valid and common (~28% of WC group stage matches). Use it when teams are balanced.
- Confidence: 75-90% only for clear mismatches. 55-74% for slight favorites. 40-54% for balanced matches.
- Score must reflect the style: defensive teams = low scoring. Two attacking teams = higher scoring.
- NEVER default to 2-1. The score must follow logically from your analysis.
- Analysis fields must be in Hebrew.`;

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { matchData, matchId, matchMeta } = req.body;
  if (!matchData) return res.status(400).json({ error: 'נדרשים נתוני משחק' });

  try {
    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: REASONING_PROMPT },
        { role: 'user', content: `Analyze this match thoroughly before predicting:\n\n${matchData}\n\nThink through every factor step by step. Consider home advantage, key players, recent form, style matchup, and any market signals. Then output the ###JSON### block.` },
      ],
      temperature: 0.5,
      max_tokens: 2048,
    });

    const text = completion.choices[0]?.message?.content?.trim() || '';

    // Extract JSON from between ###JSON### and ###END### markers
    let jsonStr = '';
    const markerMatch = text.match(/###JSON###\s*([\s\S]*?)###END###/);
    if (markerMatch) {
      jsonStr = markerMatch[1].trim();
    } else {
      // Fallback: try fenced code block or raw object
      const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (fenced) jsonStr = fenced[1].trim();
      else {
        const obj = text.match(/\{[\s\S]*\}/);
        if (obj) jsonStr = obj[0];
      }
    }

    const prediction = JSON.parse(jsonStr);

    if (matchId) {
      await kv.set(`analysis:${matchId}`, {
        prediction,
        matchMeta: matchMeta || null,
        analyzedAt: new Date().toISOString(),
      });
    }

    res.json(prediction);
  } catch (err) {
    console.error('Analyze error:', err.message);
    res.status(500).json({ error: err.message || 'שגיאה בניתוח.' });
  }
};
