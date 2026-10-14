// İzmir bölümü: 3D liman → fabrika bulmacası (6 seviye) → reaktör → kontrol testi → harita
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
  const log = (...a) => console.log('[izmir]', ...a);
  const shot = (n) => page.screenshot({ path: path.join(OUT, n + '.png') });
  const text = (sel) => page.$eval(sel, (e) => e.textContent.trim()).catch(() => null);
  const dialogVisible = () => page.$eval('#dialog', (d) => !d.classList.contains('hidden'));
  const advance = async (max = 10) => { for (let i = 0; i < max; i++) { if (!(await dialogVisible())) return; await page.keyboard.press('Enter'); await sleep(220); await page.keyboard.press('Enter'); await sleep(260); } };
  const waitFor = async (fn, label, timeout = 20000) => { const t0 = Date.now(); while (Date.now() - t0 < timeout) { if (await page.evaluate(fn)) return true; await sleep(150); } log('TIMEOUT', label); return false; };
  const tp = (x, y, z) => page.evaluate((x, y, z) => window.__anti.ctx.world.teleport(x, y, z), x, y, z);
  const pressE = async () => { await sleep(300); await page.keyboard.press('e'); await sleep(500); };

  await page.evaluateOnNewDocument(() => { localStorage.setItem('anti-krizi-save-v1', JSON.stringify({ preTest: { score: 2, total: 5, answers: {} }, checks: {}, chapters: { prolog: true, ordu: true }, cards: ['He', 'H', 'O', 'H2O'], startedAt: 1 })); });
  await page.goto('http://127.0.0.1:8080/', { waitUntil: 'networkidle0', timeout: 90000 });
  await page.click('#t-continue'); await sleep(500);
  await shot('i01-map');
  await page.click('.city[data-id="izmir"]'); await sleep(2500);
  await advance();
  await waitFor(() => !window.__anti.ctx.world.frozen, 'intro');
  await shot('i02-harbor');
  await tp(0, 0, -33); await pressE();
  await advance(4);
  await waitFor(() => !!window.__factory, 'factory');
  log('factory level:', await page.evaluate(() => window.__factory.level.title));
  await shot('i03-dissolve');

  // --- çözünme yarışı: parçala x3, ısıt x2, karıştır (basılı) ---
  for (let i = 0; i < 3; i++) { await page.click('#d-crush'); await sleep(80); }
  await page.click('#d-heat'); await page.click('#d-heat');
  const stir = await page.$('#d-stir'); const sb = await stir.boundingBox();
  await page.mouse.move(sb.x + sb.width / 2, sb.y + sb.height / 2); await page.mouse.down();
  await waitFor(() => window.__factory.solved, 'dissolve solved', 20000);
  await page.mouse.up();
  log('dissolve:', await text('#f-status'));
  await shot('i04-dissolve-done');
  await page.click('#f-run'); await sleep(400);

  // --- hat seviyeleri ---
  const placeViaTap = async (i, id) => {
    await page.click(`.pal[data-id="${id}"]`); await sleep(80);
    const p = await page.evaluate((i) => window.__factory.slotPos(i), i);
    const r = await page.$eval('#f-canvas', (c) => { const b = c.getBoundingClientRect(); return { x: b.x, y: b.y }; });
    await page.mouse.click(r.x + p.x, r.y + p.y); await sleep(100);
  };
  const runAndWait = async () => {
    await page.click('#f-run');
    await waitFor(() => window.__factory.sim && window.__factory.sim.finished, 'sim finished', 30000);
    return text('#f-status');
  };
  const solutions = [
    { wrong: [[0, 'elek'], [1, 'buhar']], right: [[0, 'elek'], [1, 'damitici']] },
    { wrong: [[0, 'suzgec'], [1, 'miknatis']], right: [[0, 'miknatis'], [1, 'suzgec']] },
    { wrong: [[0, 'buhar']], right: [[0, 'suzgec'], [1, 'buhar']] },
    { wrong: [[0, 'suzgec'], [1, 'damitici'], [2, 'huni']], right: [[0, 'suzgec'], [1, 'huni'], [2, 'damitici']] },
    { wrong: [[0, 'suzgec'], [1, 'miknatis'], [2, 'huni'], [3, 'damitici']], right: [[0, 'miknatis'], [1, 'suzgec'], [2, 'huni'], [3, 'damitici']] },
  ];
  for (let k = 0; k < solutions.length; k++) {
    const s = solutions[k];
    log('level:', await page.evaluate(() => window.__factory.level.title));
    for (const [i, id] of s.wrong) await placeViaTap(i, id);
    log('  wrong →', (await runAndWait()).slice(0, 80));
    if (k === 0) await shot('i05-line-wrong');
    await page.click('#f-run'); await sleep(200); // "Tekrar dene" → düzenleme moduna
    await page.click('#f-clear'); await sleep(150);
    for (const [i, id] of s.right) await placeViaTap(i, id);
    log('  right →', (await runAndWait()).slice(0, 60));
    if (k === 4) await shot('i06-line-final');
    await page.click('#f-run'); await sleep(400); // Sonraki
  }
  await waitFor(() => !document.querySelector('.factory'), 'factory closed');
  await advance(3);
  log('objective:', await text('#objective'));
  await tp(12, 0, -18.5); await pressE();
  await advance(2);
  await waitFor(() => !document.getElementById('dialog').classList.contains('hidden'), 'finale dialog', 60000);
  await shot('i07-finale');
  await advance(6);
  await waitFor(() => !document.getElementById('modal').classList.contains('hidden'), 'check quiz');
  log('quiz:', await text('#modal-card h2'));
  for (let i = 0; i < 3; i++) { await page.click('.quiz-opts button:nth-child(2)'); await sleep(150); await page.click('#quiz-next'); await sleep(150); }
  await page.click('#quiz-done'); await sleep(300);
  await advance(4);
  await waitFor(() => !!document.querySelector('#map-svg'), 'map');
  log('state:', await page.evaluate(() => JSON.stringify({ chapters: window.__anti.state.chapters, checks: window.__anti.state.checks, cards: window.__anti.state.cards })));
  await shot('i08-map-done');
  await page.click('#map-museum'); await waitFor(() => !!document.querySelector('#museum-back'), 'museum'); await sleep(600);
  await page.click('.card-btn[data-id="NaCl"]'); await sleep(800);
  await shot('i09-museum-nacl');

  // mobil (dikey) fabrika görünümü
  await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
  await sleep(800);
  await page.tap('#t-continue').catch(() => {}); await sleep(500);
  await page.tap('.city[data-id="izmir"]'); await sleep(2500);
  for (let i = 0; i < 8; i++) { await page.touchscreen.tap(195, 760); await sleep(300); }
  await waitFor(() => !window.__anti.ctx.world.frozen, 'intro-m');
  await tp(0, 0, -33); await sleep(300); await page.tap('#btn-interact'); await sleep(500);
  for (let i = 0; i < 6; i++) { await page.touchscreen.tap(195, 760); await sleep(300); }
  await waitFor(() => !!window.__factory, 'factory-m');
  await page.tap('#f-run'); await sleep(300); // yeniden başlat (sadece görüntü)
  await shot('i10-factory-mobile-dissolve');
  console.log('\nERRORS (' + errors.length + '):'); errors.slice(0, 20).forEach((e) => console.log('  ' + e));
  await browser.close();
})().catch((e) => { console.error('IZMIR E2E FAILED', e); process.exit(1); });
