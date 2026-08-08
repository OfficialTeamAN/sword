const RACE_ID = 17491;
const BASE = 'https://gamba.com';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)';

export default async function handler(req, res) {
  try {
    const csrfRes = await fetch(`${BASE}/_api/auth/csrf-token`, {
      headers: { 'User-Agent': UA },
    });
    if (!csrfRes.ok) throw new Error(`csrf: HTTP ${csrfRes.status}`);
    
    const { 'x-csrf-token': token } = await csrfRes.json();
    const cookie = (csrfRes.headers.getSetCookie?.() || []).map(c => c.split(';')[0]).join('; ');

    const query = `query getRaceById($raceId: Int!) {
      getRaceById(raceId: $raceId) {
        id prize_pool start_date end_date race_name status
        competitors { position display_name total_wagered winner_amount vip_level_name }
        prize_distribution { position percentage amount }
        currency { code }
      }
    }`;

    const graphqlRes = await fetch(`${BASE}/_api/@`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': UA,
        Origin: BASE,
        Referer: `${BASE}/promotions/exclusive-leaderboards/${RACE_ID}`,
        'x-csrf-token': token,
        ...(cookie ? { Cookie: cookie } : {}),
      },
      body: JSON.stringify({ query, variables: { raceId: RACE_ID } }),
    });

    if (!graphqlRes.ok) throw new Error(`graphql: HTTP ${graphqlRes.status}`);
    const json = await graphqlRes.json();
    const race = json?.data?.getRaceById;
    if (!race) throw new Error('No race data returned from Gamba API');

    const prizeByPos = Object.fromEntries((race.prize_distribution || []).map(p => [p.position, p.amount]));
    const rows = (race.competitors || [])
      .slice()
      .sort((a, b) => a.position - b.position)
      .map(c => ({
        position: c.position,
        name: c.display_name,
        wagered: Math.round((c.total_wagered || 0) * 100) / 100,
        prize: Math.round(((c.winner_amount ?? prizeByPos[c.position]) || 0) * 100) / 100,
      }));

    const out = {
      name: race.race_name,
      status: race.status,
      pool: Math.round((race.prize_pool || 0) * 100) / 100,
      currency: race.currency?.code || 'USDT',
      start: race.start_date,
      end: race.end_date,
      url: `${BASE}/promotions/exclusive-leaderboards/${RACE_ID}`,
      fetchedAt: new Date().toISOString(),
      rows,
    };

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300');
    return res.status(200).json(out);
  } catch (err) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    return res.status(500).json({ error: err.message || 'Failed to fetch leaderboard' });
  }
}
