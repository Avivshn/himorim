const Groq = require('groq-sdk');
const { kv } = require('@vercel/kv');

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const SYSTEM_PROMPT = `אתה פועל בתור "מומחה ניתוח נתונים וסטטיסטיקה של כדורגל בינלאומי" עם ידע מעמיק על כל קבוצות העולם.

כללים קריטיים:
1. יש לך ידע פנימי עשיר על כל נבחרות הכדורגל — דירוגי FIFA, שחקני מפתח, סגנון משחק, כושר אחרון, חוזקות וחולשות. **השתמש בידע הזה תמיד**, גם כשהנתונים החיצוניים חלקיים.
2. תמיד תחזיר JSON מדויק בלבד — ללא טקסט, ללא markdown.
3. **אל תכתוב "אין מידע"** — אתה מומחה שיודע על הקבוצות. נתח על בסיס הידע שלך.
4. תמיד תבחר צד — אל תגיד "לא ניתן לדעת".
5. כשיחסי הכוחות מאוזנים מאוד — ציין כסיכון גבוה.
6. טון: מקצועי, קר, אנליטי.

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

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

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
