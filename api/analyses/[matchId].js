const { Redis } = require('@upstash/redis');
const kv = new Redis({ url: process.env.UPSTASH_REDIS_REST_URL, token: process.env.UPSTASH_REDIS_REST_TOKEN });

module.exports = async (req, res) => {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const { matchId } = req.query;
  try {
    const entry = await kv.get(`analysis:${matchId}`);
    if (!entry) return res.status(404).json({ error: 'not_found' });
    res.json(entry);
  } catch (err) {
    console.error('Analysis get error:', err.message);
    res.status(500).json({ error: err.message });
  }
};
