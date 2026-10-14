const puppeteer = require('puppeteer-core');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
  const browser = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true,
    args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox'] });
  const page = await browser.newPage(); await page.setViewport({ width: 1280, height: 800 });
  page.on('console', (m) => { if (['error', 'warning'].includes(m.type())) console.log('CONSOLE', m.type(), m.text()); });
  page.on('response', (r) => { if (r.status() >= 400) console.log('HTTP', r.status(), r.url()); });
  page.on('pageerror', (e) => console.log('PAGEERROR', e.message));
  await page.evaluateOnNewDocument(() => { localStorage.setItem('anti-krizi-save-v1', JSON.stringify({ preTest: null, checks: {}, chapters: { prolog: true, ordu: true }, cards: ['He', 'H', 'O', 'H2O'], startedAt: 1 })); });
  await page.goto('http://127.0.0.1:8080/', { waitUntil: 'networkidle0' });
  await page.click('#t-continue'); await sleep(500);
  await page.click('#map-museum'); await sleep(2500);
  console.log('museum-back exists:', !!(await page.$('#museum-back')), 'ui:', !!(await page.$('#museum-ui')));
  await page.screenshot({ path: 'shots/16-museum.png' });
  await page.click('.card-btn[data-id="He"]').catch(e => console.log('click fail', e.message)); await sleep(800);
  await page.screenshot({ path: 'shots/17-museum-he.png' });
  await browser.close();
})();
