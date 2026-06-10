const Groq = require('groq-sdk');
const { Redis } = require('@upstash/redis');

const kv = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const SYSTEM_PROMPT = `אתה מערכת ניתוח כדורגל מקצועית ברמת scout בכיר של FIFA. אתה מנתח משחקים בצורה קרה, סטטיסטית ומבוססת נתונים — בלי הטיות רגשיות.

=== עקרונות ניתוח ===

1. ריאליזם סטטיסטי: במונדיאל שלב הבתים, כ-25-30% מהמשחקים מסתיימים בתיקו. ב-40% מהמשחקים מנצחת הקבוצה החזקה יותר, ב-30% יש הפתעה. אל תהיה מוטה לניצחונות — תיקו הוא תוצאה שכיחה ולגיטימית.

2. גורמים שחייבים להיבדק:
   - פער דירוג FIFA: פער מעל 20 מקומות = יתרון משמעותי. פחות מ-10 = מאוזן מאוד.
   - כושר אחרון: 3 ניצחונות מ-5 = כושר טוב. פחות מ-2 = כושר ירוד.
   - סגנון משחק: קבוצה התקפית מול דפנסיבית = תוצאה צמודה לרוב.
   - מוטיבציה: שתי קבוצות צריכות ניקוד = משחק פתוח ואינטנסיבי.
   - שחקני מפתח: היעדר קפטן או חלוץ מרכזי = ירידה של 15-20% בכוח ההתקפה.
   - עימותים היסטוריים H2H: משפיע פסיכולוגית על הקבוצות.
   - עייפות: משחק שלישי בשלב הבתים = עייפות גבוהה ויותר שגיאות.

3. כללי תוצאה ריאליסטיים:
   - פער דירוג קטן (פחות מ-15) + סגנונות דומים = שקול תיקו ברצינות
   - קבוצה דפנסיבית מול התקפית = לרוב 1-0 או 1-1
   - שתי קבוצות התקפיות = 2-1 או 2-2
   - פער גדול מאוד (40+ דירוג) = 3-0 או 2-0
   - אל תיתן 2-1 כברירת מחדל — חשב את התוצאה מהנתונים בלבד

4. רמת ביטחון ריאליסטית:
   - 75-90%: פער גדול מאוד, קבוצה אחת חזקה בהרבה בכל הפרמטרים
   - 55-74%: יתרון ברור אבל לא מוחלט
   - 40-54%: מאוזן, תיקו אפשרי — סיכון גבוה

5. JSON בלבד — ללא טקסט, ללא markdown, ללא הסברים מחוץ ל-JSON.

=== פורמט תשובה (JSON בלבד, עברית) ===
{
  "score": { "home": X, "away": Y },
  "analysis": {
    "current_form": "ניתוח מעמיק של כושר שתי הקבוצות, שחקני מפתח, פציעות ידועות, וסגנון משחק — השווה ביניהן במספרים",
    "tactical_advantage": "איזו קבוצה מחזיקה יתרון טקטי ספציפי, למה, ואיך זה ישפיע על מהלך המשחק",
    "decisive_factor": "הגורם הבודד הכי קריטי שיכריע — פציעה, מוטיבציה, דפנסה, שחקן מסוים"
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
        { role: 'user', content: `נתוני המשחק לניתוח:\n\n${matchData}\n\nנתח לעומק את כל הגורמים: דירוג FIFA, כושר אחרון, סגנון משחק, שחקני מפתח, היסטוריית עימותים, ומוטיבציה. תן תחזית ריאליסטית — אם הקבוצות מאוזנות, תיקו הוא תשובה תקינה. אל תיתן 2-1 רק כי זה "בטוח". חשב מהנתונים. JSON בלבד.` },
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
