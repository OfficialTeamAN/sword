// Verify the eased smooth scroll: node test-scroll.mjs
import puppeteer from 'puppeteer-core';

const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const sleep = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: 'new',
    args: ['--window-size=1600,900', '--enable-unsafe-swiftshader'],
    defaultViewport: { width: 1600, height: 900 },
  });
  const page = await browser.newPage();
  page.on('pageerror', e => console.log('[PAGEERROR]', e.message));
  page.on('console', m => { if (m.type() === 'error') console.log('[console error]', m.text()); });

  await page.goto('http://localhost:8123', { waitUntil: 'load' });

  // skip the cinematic so the page is unlocked
  await page.waitForSelector('#skip');
  await page.click('#skip');
  await sleep(600);
  console.log('body.loading after skip:', await page.evaluate(() => document.body.classList.contains('loading')));

  // --- wheel: sample the position over time, it must ramp, not jump ---
  await page.mouse.move(800, 500);
  await page.evaluate(() => { window.__s = []; addEventListener('scroll', () => window.__s.push(Math.round(scrollY)), { passive: true }); });
  await page.mouse.wheel({ deltaY: 900 });
  await sleep(1200);
  const samples = await page.evaluate(() => window.__s);
  console.log('wheel samples (first 12):', samples.slice(0, 12));
  console.log('wheel sample count:', samples.length, '| final scrollY:', await page.evaluate(() => Math.round(scrollY)));

  const monotonic = samples.every((v, i) => i === 0 || v >= samples[i - 1]);
  console.log('monotonic down:', monotonic, '| eased (>8 frames):', samples.length > 8);

  // --- anchor click: nav link must land on the section, offset by scroll-margin ---
  for (const [sel, id] of [['a.nav-link[href="#rewards"]', 'rewards'], ['a.nav-link[href="#socials"]', 'socials'], ['a.nav-link[href="#leaderboard"]', 'leaderboard']]) {
    await page.evaluate(() => { window.__s = []; });
    await page.click(sel);
    await sleep(1600);
    const r = await page.evaluate(i => {
      const el = document.getElementById(i);
      return { top: Math.round(el.getBoundingClientRect().top), margin: parseFloat(getComputedStyle(el).scrollMarginTop) || 0, frames: window.__s.length, hash: location.hash, active: document.querySelector('.nav-link.active')?.getAttribute('href') };
    }, id);
    console.log(`#${id}: rect.top=${r.top} (want ~${r.margin}) frames=${r.frames} hash=${r.hash} active=${r.active}`);
  }

  // --- keyboard ---
  await page.evaluate(() => { window.scrollTo(0, 0); window.__s = []; });
  await sleep(400);
  await page.keyboard.press('End');
  await sleep(2000);
  const atEnd = await page.evaluate(() => ({ y: Math.round(scrollY), max: Math.round(document.documentElement.scrollHeight - innerHeight), frames: window.__s.length }));
  console.log('End key:', atEnd, '| reached bottom:', Math.abs(atEnd.y - atEnd.max) <= 2);

  await page.evaluate(() => { window.__s = []; });
  await page.keyboard.press('Home');
  await sleep(2200);
  console.log('Home key -> scrollY:', await page.evaluate(() => Math.round(scrollY)));

  // --- typing in a field must not be hijacked (no inputs here, so inject one) ---
  await page.evaluate(() => {
    const i = document.createElement('input');
    i.id = 'probe'; i.style.cssText = 'position:fixed;top:200px;left:20px;z-index:999';
    document.body.appendChild(i); i.focus();
  });
  const before = await page.evaluate(() => Math.round(scrollY));
  await page.keyboard.type('hello world');
  await sleep(500);
  const after = await page.evaluate(() => ({ y: Math.round(scrollY), val: document.getElementById('probe').value }));
  console.log(`input guard: value="${after.val}" scroll ${before} -> ${after.y} (should be equal)`);

  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
