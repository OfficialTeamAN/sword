import puppeteer from 'puppeteer-core';
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
(async () => {
  const browser = await puppeteer.launch({
    executablePath: CHROME, headless: 'new',
    args: ['--window-size=430,930', '--enable-unsafe-swiftshader'],
    defaultViewport: { width: 430, height: 930, isMobile: true },
  });
  const page = await browser.newPage();
  page.on('pageerror', e => console.log('[PAGEERROR]', e.message));
  await page.goto('http://localhost:8123', { waitUntil: 'load' });
  const t0 = Date.now();
  for (const t of [2300, 4200, 10500]) {
    const w = t - (Date.now() - t0);
    if (w > 0) await new Promise(r => setTimeout(r, w));
    await page.screenshot({ path: `shots/m${t}.png` });
    console.log('shot', t);
  }
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
