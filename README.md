# SWORD — ink-and-blood loading cinematic + Gamba leaderboard

A cartoon, paintbrush-styled loading cinematic: a 3D sword glides in from the
left, impales a chainmail tournament dummy, a few fat blood splashes burst in
slow motion, freeze into painted ink splats — and one floats up and **paints
the navbar into existence**. Then the sword pulls back out, flies up, and
becomes the emblem hovering above the live leaderboard.

Frontpage: ensō-framed sword above **Sword's $1,000 LB** — real data scraped
from Gamba. The top five stand on a side-by-side podium (tallest in the middle,
stepping down outward), the rest list below as "the chasing pack". Then the
extras rack, and socials.

Splats are confined to the page gutters, measured off the live board width, so
the centre column always stays clean; narrow viewports get none at all.

## Run

Any static server works (ES modules need http, not `file://`):

```bash
npm start          # node serve.js -> http://localhost:8123
# or: python -m http.server 8123
```

## Leaderboard data

```bash
npm run scrape     # -> writes leaderboard.json from gamba.com
```

`scrape-lb.mjs` calls Gamba's GraphQL (`/_api/@`, query `getRaceById`,
race 17491) with a CSRF token and normalizes the standings into
`leaderboard.json` (name, pool, end date, rows with position/wagered/prize).
The page fetches that file and falls back to an embedded last-known-good copy
if it's missing. Re-run the scraper on a cron (hourly/daily) to keep it fresh.

## Stack

- **Three.js 0.185** (vendored in `vendor/` — works offline), no runtime deps
- Everything procedural: toon-shaded sword/bust with inverted-hull ink
  outlines, canvas-woven cartoon chainmail, blob blood particles, canvas-painted
  splats with ink outlines
- Beat order: glide → aim (letterbox) → wind-up → touch (sparks) →
  accelerate-in → impact (slow-mo splash) → artistic stamp → splat flight →
  navbar **draws itself** (SVG stroke + stamped letters/links) → sword
  extraction → SVG emblem hand-off → leaderboard reveal
- Respects `prefers-reduced-motion`, has a SKIP button, no-WebGL fallback
- `window.__ferrum.phase` tracks beats for debugging

## Tuning quick reference (main.js)

| What | Where |
|---|---|
| Beat timings | `const T = { ... }` |
| Sword travel positions | `SWORD_*` constants |
| Blood size/count | `buildParticles()`, `impact()` |
| Splat look | `makeSplatURL()` |
| Navbar styling | `styles.css` → `.nav` |
| Leaderboard fetch/fallback | `loadLeaderboard()`, `FALLBACK_LB` |
| Podium markup / visual order | `renderBoard()`, `podiumCard()`, `ORDER` |
| Splat-free centre column | `gutters()`, `gutterSplat()` |
