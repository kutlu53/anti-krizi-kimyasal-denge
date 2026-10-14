const puppeteer = require('puppeteer-core');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
  const browser = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true,
    args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
  page.on('console', (m) => { if (['error', 'warning'].includes(m.type())) console.log('CONSOLE', m.type(), m.text()); });
  page.on('pageerror', (e) => console.log('PAGEERROR', e.message));
  await page.evaluateOnNewDocument(() => { localStorage.setItem('anti-krizi-save-v1', JSON.stringify({ preTest: null, checks: {}, chapters: { prolog: true, ordu: false }, cards: ['He'], startedAt: 1 })); });
  await page.goto('http://127.0.0.1:8080/', { waitUntil: 'networkidle0' });
  await page.screenshot({ path: 'shots/m1-title.png' });
  await page.tap('#t-continue'); await sleep(600);
  await page.screenshot({ path: 'shots/m2-map.png' });
  await page.tap('.city[data-id="ordu"]'); await sleep(2500);
  await page.screenshot({ path: 'shots/m3-ordu-dialog.png' });
  for (let i = 0; i < 8; i++) { await page.touchscreen.tap(195, 760); await sleep(350); }
  await sleep(500);
  // joystick: sol tarafa bas ve ileri sürükle
  await page.touchscreen.touchStart(100, 600); await sleep(100);
  await page.touchscreen.touchMove(100, 540); await sleep(900);
  await page.screenshot({ path: 'shots/m4-ordu-joystick.png' });
  await page.touchscreen.touchEnd();
  const pos = await page.evaluate(() => window.__anti.ctx.world.pos.toArray().map((v) => +v.toFixed(2)));
  console.log('player pos after joystick:', pos);
  // zıpla düğmesi
  await page.tap('#btn-jump'); await sleep(250);
  const y = await page.evaluate(() => window.__anti.ctx.world.pos.y);
  console.log('y after jump tap:', y.toFixed(2));
  // E düğmesi ile istasyon
  await page.evaluate(() => window.__anti.ctx.world.teleport(5, 0, -10)); await sleep(400);
  await page.tap('#btn-interact'); await sleep(600);
  console.log('modal open via touch E:', await page.$eval('#modal', (m) => !m.classList.contains('hidden')));
  await page.screenshot({ path: 'shots/m5-ordu-builder.png' });
  await browser.close();
})();
