// Phase-driven screenshots: waits for __ferrum.phase beats instead of wall-clock times.
import puppeteer from 'puppeteer-core';

const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

// [minPhase, extra wait ms once reached, label]
const SHOTS = [
  ['cine', 2000, 'glide'],
  ['impact', 400, 'slowmo'],
  ['artistic', 1200, 'stamp'],
  ['form', 900, 'navform'],
  ['extract', 800, 'extract'],
  ['done', 1900, 'final'],
];
const ORDER = ['boot', 'cine', 'impact', 'artistic', 'flight', 'form', 'extract', 'done'];

(async () => {
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: 'new',
    args: ['--window-size=1600,900', '--hide-scrollbars', '--enable-unsafe-swiftshader'],
    defaultViewport: { width: 1600, height: 900 },
  });
  const page = await browser.newPage();
  page.on('pageerror', e => console.log('[PAGEERROR]', e.message));
  // slow the page's animation clock so headless screenshot overhead can't race the cinematic
  await page.evaluateOnNewDocument(() => {
    const raf = window.requestAnimationFrame.bind(window);
    window.requestAnimationFrame = cb => raf(t => cb(t * 0.3));
  });
  await page.goto('http://localhost:8123', { waitUntil: 'load' });

  for (const [phase, extra, label] of SHOTS) {
    const idx = ORDER.indexOf(phase);
    await page.waitForFunction(
      `window.__ferrum && ${'window.__ferrum.phase'} && (${JSON.stringify(ORDER)}).indexOf(window.__ferrum.phase) >= ${idx}`,
      { timeout: 45000 }
    );
    if (extra) await new Promise(r => setTimeout(r, extra));
    await page.screenshot({ path: `shots/p-${label}.png` });
    console.log('shot', label, 'phase=', await page.evaluate('window.__ferrum.phase'));
  }
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
