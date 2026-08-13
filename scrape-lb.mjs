// Scrape Sword's Gamba leaderboard -> leaderboard.json
// No deps. Gamba's site is Nuxt + GraphQL at /_api/@ behind a CSRF token.
// Usage: node scrape-lb.mjs [raceId]     (default 17491)
import { writeFileSync } from 'node:fs';

const RACE_ID = Number(process.argv[2] || 17491);
const BASE = 'https://gamba.com';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)';

async function main() {
  // 1) CSRF token (+ session cookies)
  const csrfRes = await fetch(`${BASE}/_api/auth/csrf-token`, { headers: { 'User-Agent': UA } });
  if (!csrfRes.ok) throw new Error(`csrf: HTTP ${csrfRes.status}`);
  const { 'x-csrf-token': token } = await csrfRes.json();
  const cookie = (csrfRes.headers.getSetCookie?.() || []).map(c => c.split(';')[0]).join('; ');

  // 2) the race query
  const query = `query getRaceById($raceId: Int!) {
    getRaceById(raceId: $raceId) {
      id prize_pool start_date end_date race_name status
      competitors { position display_name total_wagered winner_amount vip_level_name }
      prize_distribution { position percentage amount }
      currency { code }
    }
  }`;
  const res = await fetch(`${BASE}/_api/@`, {
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
  if (!res.ok) throw new Error(`graphql: HTTP ${res.status}`);
  const json = await res.json();
  const race = json?.data?.getRaceById;
  if (!race) throw new Error(`no race data: ${JSON.stringify(json).slice(0, 200)}`);

  // 3) normalize
  const prizeByPos = Object.fromEntries((race.prize_distribution || []).map(p => [p.position, p.amount]));
  const rows = (race.competitors || [])
    .slice()
    .sort((a, b) => a.position - b.position)
    .slice(0, 10)
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
  writeFileSync(new URL('./leaderboard.json', import.meta.url), JSON.stringify(out, null, 2));
  console.log(`${out.name} — ${rows.length} competitors, pool ${out.pool} ${out.currency}, ends ${out.end}`);
}

main().catch(e => { console.error('scrape failed:', e.message); process.exit(1); });
