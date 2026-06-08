module.exports = async (req, res) => {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

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
};
