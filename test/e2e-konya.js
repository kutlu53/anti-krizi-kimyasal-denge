// Konya bölümü: 3D ova → pH drone oyunu (3 gün) → reaktör → kontrol testi → harita
const puppeteer = require('puppeteer-core');
const path = require('path');
const OUT = path.join(__dirname, 'shots'); require('fs').mkdirSync(OUT, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  const browser = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true,
    args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox'] });
  const page = await browser.newPage(); await page.setViewport({ width: 1280, height: 800 });
  const errors = [];
  page.on('console', (m) => { if (['error', 'warning'].includes(m.type())) errors.push(m.type() + ': ' + m.text()); });
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  const log = (...a) => console.log('[konya]', ...a);
  const shot = (n) => page.screenshot({ path: path.join(OUT, n + '.png') });
  const text = (sel) => page.$eval(sel, (e) => e.textContent.trim()).catch(() => null);
  const dialogVisible = () => page.$eval('#dialog', (d) => !d.classList.contains('hidden'));
  const advance = async (max = 10) => { for (let i = 0; i < max; i++) { if (!(await dialogVisible())) return; await page.keyboard.press('Enter'); await sleep(220); await page.keyboard.press('Enter'); await sleep(260); } };
  const waitFor = async (fn, label, timeout = 20000) => { const t0 = Date.now(); while (Date.now() - t0 < timeout) { if (await page.evaluate(fn)) return true; await sleep(150); } log('TIMEOUT', label); return false; };
  const tp = (x, y, z) => page.evaluate((x, y, z) => window.__anti.ctx.world.teleport(x, y, z), x, y, z);
  const pressE = async () => { await sleep(300); await page.keyboard.press('e'); await sleep(500); };

  await page.evaluateOnNewDocument(() => { localStorage.setItem('anti-krizi-save-v1', JSON.stringify({ preTest: { score: 2, total: 5, answers: {} }, checks: {}, chapters: { prolog: true, ordu: true, izmir: true }, cards: ['He', 'H', 'O', 'H2O', 'NaCl'], startedAt: 1 })); });
  await page.goto('http://127.0.0.1:8080/', { waitUntil: 'networkidle0', timeout: 90000 });
  await page.click('#t-continue'); await sleep(500);
  await page.click('.city[data-id="konya"]'); await sleep(2500);
  await advance();
  await waitFor(() => !window.__anti.ctx.world.frozen, 'intro');
  await shot('k01-field');
  await tp(0, 0, -9.5); await pressE();
  await advance(4);
  await waitFor(() => !!window.__drone, 'drone');
  await advance(3);
  await waitFor(() => !window.__drone.paused, 'wave1 start');
  log('buttons:', await text('#btn-interact'), await text('#btn-jump'));
  await shot('k02-wave1');

  // klavye yolu: 1. dalgada bir kareye git ve E ile baz bırak
  await page.evaluate(() => window.__drone.setPos(1, 1));
  await sleep(200); await page.keyboard.press('e'); await sleep(300);
  log('tile(1,1) after E:', await page.evaluate(() => window.__drone.tiles[1][1].ph));
  await shot('k03-wave1-drop');

  // genel çözücü: her kareyi nötrle, depoda doldur, bulutları ve sızıntıyı nötrle
  const solveWave = async () => {
    for (let round = 0; round < 60; round++) {
      const st = await page.evaluate(() => {
        const d = window.__drone; if (!d.wave || d.paused) return null;
        const w = d.wave, tiles = d.tiles, dr = d.drone;
        const pad = { x: 0, y: w.rows - 1 };
        if (dr.nh3 < 2 || dr.acid < 2) { d.setPos(pad.x, pad.y); return 'refill'; }
        if (d.boss && !d.boss.sealed) { d.setPos(d.boss.x, d.boss.y); d.dropBase(); return 'boss'; }
        if (d.clouds.length) { const c = d.clouds[0]; d.setPos(c.x, c.y); d.dropBase(); return 'cloud'; }
        for (let r = 0; r < w.rows; r++) for (let c = 0; c < w.cols; c++) {
          const ph = tiles[r][c].ph;
          if (ph < 6) { d.setPos(c, r); d.dropBase(); return 'base'; }
          if (ph > 8) { d.setPos(c, r); d.dropAcid(); return 'acid'; }
        }
        return 'clean';
      });
      if (st === null) return 'paused';
      if (st === 'clean') return 'clean';
      await sleep(st === 'refill' ? 1400 : 120);
    }
    return 'stuck';
  };
  for (let w = 0; w < 3; w++) {
    const r = await solveWave();
    log(`wave ${w + 1} solve:`, r, 'hearts', await page.evaluate(() => window.__drone?.drone.hearts));
    if (w === 2) break;
    await waitFor(() => !document.getElementById('dialog').classList.contains('hidden'), 'wave done dialog');
    if (w === 1) await shot('k04-wave2-done');
    await advance(4);
    await waitFor(() => !window.__drone.paused, 'next wave start');
    if (w === 1) await shot('k05-wave3');
  }
  await waitFor(() => !document.getElementById('dialog').classList.contains('hidden'), 'final dialog');
  await advance(4);
  await waitFor(() => !document.querySelector('.drone'), 'drone closed');
  await advance(3);
  log('objective:', await text('#objective'), '| buttons:', await text('#btn-interact'), await text('#btn-jump'));
  await tp(0, 0, -36.5); await pressE();
  await advance(2);
  await waitFor(() => !document.getElementById('dialog').classList.contains('hidden'), 'finale dialog', 60000);
  await shot('k06-finale');
  await advance(6);
  await waitFor(() => !document.getElementById('modal').classList.contains('hidden'), 'check quiz');
  log('quiz:', await text('#modal-card h2'));
  for (let i = 0; i < 3; i++) { await page.click('.quiz-opts button:nth-child(2)'); await sleep(150); await page.click('#quiz-next'); await sleep(150); }
  await page.click('#quiz-done'); await sleep(300);
  await advance(4);
  await waitFor(() => !!document.querySelector('#map-svg'), 'map');
  log('state:', await page.evaluate(() => JSON.stringify({ chapters: window.__anti.state.chapters, checks: window.__anti.state.checks, cards: window.__anti.state.cards })));
  await shot('k07-map-done');
  await page.click('#map-museum'); await waitFor(() => !!document.querySelector('#museum-back'), 'museum'); await sleep(600);
  await page.click('.card-btn[data-id="NH3"]'); await sleep(800);
  await shot('k08-museum-nh3');

  // mobil dikey: drone oyunu görünümü ve dokunmatik düğmeler
  await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
  await sleep(800);
  await page.tap('#t-continue').catch(() => {}); await sleep(500);
  await page.evaluate(() => { window.__anti.state.chapters.konya = false; });
  await page.tap('.city[data-id="konya"]'); await sleep(2500);
  for (let i = 0; i < 8; i++) { await page.touchscreen.tap(195, 760); await sleep(300); }
  await waitFor(() => !window.__anti.ctx.world.frozen, 'intro-m');
  await tp(0, 0, -9.5); await sleep(300); await page.tap('#btn-interact'); await sleep(500);
  for (let i = 0; i < 6; i++) { await page.touchscreen.tap(195, 700); await sleep(300); }
  await waitFor(() => !!window.__drone, 'drone-m');
  for (let i = 0; i < 4; i++) { await page.touchscreen.tap(195, 700); await sleep(300); }
  await waitFor(() => !window.__drone.paused, 'wave1-m');
  await page.evaluate(() => window.__drone.setPos(1, 1)); await sleep(200);
  await page.tap('#btn-interact'); await sleep(300);
  log('mobile tile(1,1) after 🧪 tap:', await page.evaluate(() => window.__drone.tiles[1][1].ph));
  await shot('k09-drone-mobile');
  console.log('\nERRORS (' + errors.length + '):'); errors.slice(0, 20).forEach((e) => console.log('  ' + e));
  await browser.close();
})().catch((e) => { console.error('KONYA E2E FAILED', e); process.exit(1); });
