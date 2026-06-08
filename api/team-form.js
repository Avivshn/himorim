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

module.exports = async (req, res) => {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

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
};
