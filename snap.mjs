// Screenshot the cinematic at timeline moments: node snap.js [outprefix] [t1,t2,...]
import puppeteer from 'puppeteer-core';

const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const times = (process.argv[3] || '1400,3100,4300,5600,7300,8800,12000')
  .split(',').map(Number);
const prefix = process.argv[2] || 'shots/s';

(async () => {
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: 'new',
    args: ['--window-size=1600,900', '--hide-scrollbars', '--enable-unsafe-swiftshader'],
    defaultViewport: { width: 1600, height: 900 },
  });
  const page = await browser.newPage();
  page.on('console', m => console.log('[console]', m.type(), m.text()));
  page.on('pageerror', e => console.log('[PAGEERROR]', e.message));
  page.on('requestfailed', r => console.log('[REQFAIL]', r.url(), r.failure()?.errorText));

  await page.goto('http://localhost:8123', { waitUntil: 'load' });
  const t0 = Date.now();
  for (const t of times) {
    const waitMs = t - (Date.now() - t0);
    if (waitMs > 0) await new Promise(r => setTimeout(r, waitMs));
    await page.screenshot({ path: `${prefix}${t}.png` });
    console.log(`shot @${t}ms`);
  }
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
