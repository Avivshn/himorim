const { kv } = require('@vercel/kv');

module.exports = async (req, res) => {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const keys = await kv.keys('analysis:*');
    if (!keys.length) return res.json({});

    const values = await Promise.all(keys.map(k => kv.get(k)));
    const result = {};
    keys.forEach((k, i) => {
      const matchId = k.replace('analysis:', '');
      result[matchId] = values[i];
    });

    res.json(result);
  } catch (err) {
    console.error('Analyses index error:', err.message);
    res.status(500).json({ error: err.message });
  }
};
