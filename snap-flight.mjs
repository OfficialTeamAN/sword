// Freeze the splat mid-flight to the navbar and screenshot it
import puppeteer from 'puppeteer-core';

const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

(async () => {
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: 'new',
    args: ['--window-size=1600,900', '--hide-scrollbars', '--enable-unsafe-swiftshader'],
    defaultViewport: { width: 1600, height: 900 },
  });
  const page = await browser.newPage();
  page.on('pageerror', e => console.log('[PAGEERROR]', e.message));
  await page.goto('http://localhost:8123', { waitUntil: 'load' });

  await page.waitForFunction('window.__ferrum && window.__ferrum.phase === "flight"', { timeout: 30000 });
  await new Promise(r => setTimeout(r, 300)); // mid-arc
  const info = await page.evaluate(() => {
    document.getAnimations().forEach(a => a.pause());
    const f = document.querySelector('.flyer');
    if (!f) return 'NO FLYER';
    const r = f.getBoundingClientRect();
    const cs = getComputedStyle(f);
    return {
      rect: { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) },
      transform: cs.transform, opacity: cs.opacity, display: cs.display,
      anims: f.getAnimations().map(a => ({ playState: a.playState, time: Math.round(a.currentTime) })),
    };
  });
  console.log(JSON.stringify(info, null, 1));
  await page.screenshot({ path: 'shots/flight.png' });
  console.log('captured mid-flight');
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
