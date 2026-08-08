/* ==========================================================================
   sword — leaderboard and basic interactions (Clean Version)
   ========================================================================== */

const qs = (s, r = document) => r.querySelector(s);
const qsa = (s, r = document) => [...r.querySelectorAll(s)];

const heroEl = qs('#hero');
const emblemEl = qs('#emblem');
const navEl = qs('#nav');
const podiumEl = qs('#podium');
const boardRows = qs('#boardRows');
const boardTimer = qs('#boardTimer');

let pageFxStarted = false;

/* ============================ page: leaderboard / extras / socials ============================ */

/* last-known-good board (scrape-lb.mjs refreshes leaderboard.json) */
const FALLBACK_LB = {
  name: "Sword's $1,000 LB",
  pool: 1000,
  end: '2026-09-07 23:59:59',
  rows: [
    { position: 1, name: 'Newbie78', wagered: 50.95, prize: 400.46 },
    { position: 2, name: 'Naksu67', wagered: 50.9, prize: 250.29 },
    { position: 3, name: 'Mohitkabhai', wagered: 50.66, prize: 200.23 },
    { position: 4, name: 'Bigate', wagered: 50.59, prize: 100.12 },
    { position: 5, name: 'Mohitonbreak', wagered: 50.57, prize: 50.06 },
    { position: 6, name: 'NarutoBet', wagered: 50.28, prize: 0 },
    { position: 7, name: 'Yailomc', wagered: 50.0, prize: 0 },
    { position: 8, name: 'uk07cash', wagered: 0.01, prize: 0 },
    { position: 9, name: 'Ms2solidd', wagered: 0.0, prize: 0 },
  ],
};

const money = n => '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const initial = n => (n || '?')[0].toUpperCase();

/* seeded per-name so a player's doodles don't reshuffle on every refresh */
function nameSeed(name) {
  let h = 0;
  for (let i = 0; i < (name || '').length; i++) h = (h * 31 + name.charCodeAt(i)) | 0;
  return Math.abs(h);
}

/* laurels for 1st, medal ribbons for the rest — hand-inked, no images */
const CREST = {
  1: `<svg viewBox="0 0 80 46" aria-hidden="true"><g filter="url(#rough)" fill="none" stroke="#241a12" stroke-width="2.4" stroke-linecap="round">
        <path d="M32 42 Q14 36 11 20 Q10 11 16 8 Q24 14 26 24 Q28 34 32 42" fill="#e8b431"/>
        <path d="M48 42 Q66 36 69 20 Q70 11 64 8 Q56 14 54 24 Q52 34 48 42" fill="#e8b431"/>
        <path d="M40 4 L44 13 L54 14 L46 21 L48 31 L40 26 L32 31 L34 21 L26 14 L36 13 Z" fill="#d92b1f"/>
      </g></svg>`,
  2: `<svg viewBox="0 0 80 46" aria-hidden="true"><g filter="url(#rough)" fill="none" stroke="#241a12" stroke-width="2.4" stroke-linecap="round">
        <path d="M28 6 L36 22 M52 6 L44 22" stroke-width="3.2"/>
        <circle cx="40" cy="31" r="12" fill="#d5dade"/>
        <path d="M40 24 L42.6 29.4 L48 30 L44 34 L45 39.4 L40 36.6 L35 39.4 L36 34 L32 30 L37.4 29.4 Z" fill="#9fb0bc" stroke-width="1.6"/>
      </g></svg>`,
  3: `<svg viewBox="0 0 80 46" aria-hidden="true"><g filter="url(#rough)" fill="none" stroke="#241a12" stroke-width="2.4" stroke-linecap="round">
        <path d="M28 6 L36 22 M52 6 L44 22" stroke-width="3.2"/>
        <circle cx="40" cy="31" r="12" fill="#d2905a"/>
        <path d="M40 24 L42.6 29.4 L48 30 L44 34 L45 39.4 L40 36.6 L35 39.4 L36 34 L32 30 L37.4 29.4 Z" fill="#a86a38" stroke-width="1.6"/>
      </g></svg>`,
};
const BLADE_CREST = `<svg viewBox="0 0 80 46" aria-hidden="true"><g filter="url(#rough)" fill="none" stroke="#241a12" stroke-width="2.4" stroke-linecap="round">
    <path d="M40 6 L43 11 V30 L40 34 L37 30 V11 Z" fill="#e6edf3"/>
    <path d="M31 32 H49" stroke-width="3"/>
  </g></svg>`;

function podiumCard(r, slot) {
  const p = r.position;
  const seed = nameSeed(r.name);
  const tilt = ((seed % 7) - 3) * 0.32;              // tiny hand-pinned rotation
  const crest = CREST[p] || BLADE_CREST;
  const label = p === 1 ? 'champion' : p === 2 ? 'runner-up' : 'third place';
  return `
    <div class="pod pod-${p}" style="--slot:${slot}; --tilt:${tilt}deg">
      ${p === 1 ? '<span class="pod-crown" aria-hidden="true">king of the hill</span>' : ''}
      <div class="pod-card">
        <span class="pod-crest" aria-hidden="true">${crest}</span>
        <i class="pod-av">${initial(r.name)}</i>
        <span class="pod-name" title="${r.name}">${r.name}</span>
        <span class="pod-label">${label}</span>
        <span class="pod-wager">${money(r.wagered)}<small>wagered</small></span>
        <span class="pod-prize">${r.prize > 0 ? '+$' + Math.round(r.prize).toLocaleString('en-US') : '—'}</span>
      </div>
      <div class="pod-plinth">
        <span class="pod-rank">${p}</span>
        <span class="pod-ord">${p === 1 ? 'st' : p === 2 ? 'nd' : 'rd'}</span>
      </div>
    </div>`;
}

function renderBoard(rows) {
  const top = rows.slice(0, 3);
  const rest = rows.slice(3);

  // visual order for top-3 podium: 2 · 1 · 3 — tallest in the middle
  const ORDER = [2, 1, 3];
  const byPos = new Map(top.map(r => [r.position, r]));
  podiumEl.innerHTML = ORDER
    .map((pos, slot) => { const r = byPos.get(pos); return r ? podiumCard(r, slot) : ''; })
    .join('');

  boardRows.innerHTML = rest.map((r, i) => `
    <div class="row" style="--i:${i}">
      <span class="rank">${r.position}</span>
      <span class="pname"><i class="avatar">${initial(r.name)}</i>${r.name}</span>
      <span class="wager">${money(r.wagered)}<small>WAGERED</small></span>
      <span class="prize">${r.prize > 0 ? '+$' + Math.round(r.prize).toLocaleString('en-US') : '—'}</span>
    </div>`).join('');

  const pack = qs('.pack');
  if (pack) pack.style.display = rest.length ? '' : 'none';
}

let seasonEnd = null;
function tickTimer() {
  if (!seasonEnd) return;
  let s = Math.max(0, Math.floor((seasonEnd - Date.now()) / 1000));
  const d = Math.floor(s / 86400); s %= 86400;
  const h = Math.floor(s / 3600); s %= 3600;
  const m = Math.floor(s / 60);
  const sec = s % 60;
  const pad = n => String(n).padStart(2, '0');
  boardTimer.innerHTML = `
    <span class="ct-block"><b>${pad(d)}</b><em>days</em></span>
    <span class="ct-sep">:</span>
    <span class="ct-block"><b>${pad(h)}</b><em>hrs</em></span>
    <span class="ct-sep">:</span>
    <span class="ct-block"><b>${pad(m)}</b><em>min</em></span>
    <span class="ct-sep">:</span>
    <span class="ct-block"><b>${pad(sec)}</b><em>sec</em></span>
  `;
}

async function loadLeaderboard() {
  let data = FALLBACK_LB;
  try {
    let res = await fetch('/api/leaderboard', { cache: 'no-store' });
    if (!res.ok) {
      res = await fetch('leaderboard.json', { cache: 'no-store' });
    }
    if (res.ok) {
      const json = await res.json();
      if (json && Array.isArray(json.rows) && json.rows.length) data = json;
    }
  } catch { /* file:// or missing json — fallback rides */ }
  renderBoard(data.rows);
  const chip = qs('.race-chip');
  if (chip && data.pool) chip.textContent = `$${Math.round(data.pool).toLocaleString('en-US')} pool · top 3 paid`;
  seasonEnd = new Date(String(data.end).replace(' ', 'T') + 'Z').getTime();
  tickTimer();
  setInterval(tickTimer, 1000);
}

function setActiveNav(sel) {
  qsa('.nav-link', navEl).forEach(l => l.classList.toggle('active', l.getAttribute('href') === sel));
}

function startPageFx() {
  if (pageFxStarted) return;
  pageFxStarted = true;

  /* leaderboard — scraped from gamba (see scrape-lb.mjs) */
  loadLeaderboard();

  /* section reveals */
  const revealObs = new IntersectionObserver(es => {
    es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('on'); revealObs.unobserve(e.target); } });
  }, { threshold: 0.15 });
  qsa('.reveal').forEach(el => revealObs.observe(el));

  /* active nav link follows scroll */
  const secObs = new IntersectionObserver(es => {
    es.forEach(e => { if (e.isIntersecting) setActiveNav('#' + e.target.id); });
  }, { rootMargin: '-40% 0px -55% 0px' });
  ['leaderboard', 'rewards', 'socials'].forEach(id => secObs.observe(qs('#' + id)));
}

/* ============================ smooth scroll ============================ */
/* Eases the real window scroll position instead of transforming a wrapper, so
   the fixed nav, gutter splats and the section IntersectionObservers all keep
   reading true offsets. Trackpads/mice only — touch keeps its native momentum. */
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const smoothScroll = (() => {
  const EASE = 0.135;              // share of the remaining gap eaten per 60fps frame
  const ARROW_STEP = 110;
  const SETTLE = 0.4;              // px — close enough, snap and stop
  const LINE = 16;                 // px per wheel "line" for deltaMode 1

  const coarse = matchMedia('(hover: none), (pointer: coarse)').matches;
  const eased = !reduceMotion && !coarse;

  let target = scrollY;
  let raf = 0;
  let wrote = scrollY;             // last position we set — anything else is the user
  let prev = 0;

  const limit = () => Math.max(0, document.documentElement.scrollHeight - innerHeight);
  const clamp = v => Math.min(Math.max(v, 0), limit());
  const locked = () => document.body.classList.contains('loading');

  function step(now) {
    const dt = Math.min((now - prev) / 1000, 0.05);
    prev = now;

    const gap = target - scrollY;
    if (Math.abs(gap) < SETTLE) {
      raf = 0;
      wrote = target = clamp(target);
      window.scrollTo(0, target);
      return;
    }
    // frame-rate independent exponential ease
    const k = 1 - Math.pow(1 - EASE, dt * 60);
    wrote = scrollY + gap * k;
    window.scrollTo(0, wrote);
    raf = requestAnimationFrame(step);
  }

  function run() {
    if (raf) return;
    prev = performance.now();
    raf = requestAnimationFrame(step);
  }

  /* the page moved without us — scrollbar drag, find-in-page, browser restore */
  addEventListener('scroll', () => {
    if (Math.abs(scrollY - wrote) > 2) { target = wrote = scrollY; if (raf) { cancelAnimationFrame(raf); raf = 0; } }
  }, { passive: true });

  addEventListener('resize', () => { target = clamp(target); });

  function nudge(by) {
    target = clamp((raf ? target : scrollY) + by);
    run();
  }

  function to(v) {
    if (!eased) { window.scrollTo({ top: clamp(v), behavior: reduceMotion ? 'auto' : 'smooth' }); return; }
    target = clamp(v);
    run();
  }

  if (eased) {
    /* is something under the cursor going to eat this wheel tick itself? */
    const nested = (el, dy) => {
      for (let n = el; n && n !== document.body; n = n.parentElement) {
        if (n.scrollHeight - n.clientHeight > 2 && /auto|scroll/.test(getComputedStyle(n).overflowY)) {
          if (dy < 0 ? n.scrollTop > 0 : n.scrollTop < n.scrollHeight - n.clientHeight - 1) return true;
        }
      }
      return false;
    };

    addEventListener('wheel', e => {
      if (locked() || e.ctrlKey || e.defaultPrevented) return;          // pinch-zoom stays native
      if (nested(e.target, e.deltaY)) return;
      e.preventDefault();
      nudge(e.deltaMode === 1 ? e.deltaY * LINE : e.deltaMode === 2 ? e.deltaY * innerHeight : e.deltaY);
    }, { passive: false });

    addEventListener('keydown', e => {
      if (locked() || e.ctrlKey || e.metaKey || e.altKey) return;
      const t = e.target;
      if (t instanceof HTMLElement && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;

      const page = innerHeight * 0.88;
      let by = null, abs = null;
      switch (e.key) {
        case 'ArrowDown':  by = ARROW_STEP; break;
        case 'ArrowUp':    by = -ARROW_STEP; break;
        case 'PageDown':   by = page; break;
        case 'PageUp':     by = -page; break;
        case ' ':          by = e.shiftKey ? -page : page; break;
        case 'Home':       abs = 0; break;
        case 'End':        abs = limit(); break;
        default: return;
      }
      e.preventDefault();
      abs === null ? nudge(by) : to(abs);
    });
  }

  /* in-page anchors: nav links and anything else pointing at a #section */
  addEventListener('click', e => {
    const a = e.target instanceof Element ? e.target.closest('a[href^="#"]') : null;
    if (!a || e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;

    const id = a.getAttribute('href');
    if (!id || id === '#') return;
    const el = document.getElementById(decodeURIComponent(id.slice(1)));
    if (!el) return;

    e.preventDefault();
    // honour the scroll-margin-top the CSS sets so sections clear the floating nav
    const inset = parseFloat(getComputedStyle(el).scrollMarginTop) || 0;
    to(el.getBoundingClientRect().top + scrollY - inset);
    setActiveNav(id);
    history.replaceState(null, '', id);
  });

  return { to, enabled: eased };
})();

/* ============================ boot ============================ */
if (heroEl) heroEl.classList.add('on');
if (emblemEl) emblemEl.classList.add('shown');
if (navEl) navEl.classList.add('formed');
startPageFx();
