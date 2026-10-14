const puppeteer = require('puppeteer-core');
const path = require('path');
const OUT = path.join(__dirname, 'shots');
require('fs').mkdirSync(OUT, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  const browser = await puppeteer.launch({
    executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
    headless: true,
    args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox', '--window-size=1280,800', '--autoplay-policy=no-user-gesture-required'],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });
  const errors = [];
  page.on('console', (m) => { if (['error', 'warning'].includes(m.type())) errors.push(m.type() + ': ' + m.text()); });
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  page.on('dialog', async (d) => { await d.accept(); });
  const shot = (n) => page.screenshot({ path: path.join(OUT, n + '.png') });
  const log = (...a) => console.log('[e2e]', ...a);

  const dialogVisible = () => page.$eval('#dialog', (d) => !d.classList.contains('hidden'));
  const modalVisible = () => page.$eval('#modal', (d) => !d.classList.contains('hidden'));
  const advance = async (max = 14) => {
    for (let i = 0; i < max; i++) {
      if (!(await dialogVisible())) return;
      await page.keyboard.press('Enter'); await sleep(220);
      await page.keyboard.press('Enter'); await sleep(260);
    }
  };
  const text = (sel) => page.$eval(sel, (e) => e.textContent.trim()).catch(() => null);
  const canvasDrag = async (sel, from, to, W = 640, H = 440) => {
    const r = await page.$eval(sel, (c) => { const b = c.getBoundingClientRect(); return { x: b.x, y: b.y, w: b.width, h: b.height }; });
    const cx = (p) => r.x + p[0] / W * r.w, cy = (p) => r.y + p[1] / H * r.h;
    await page.mouse.move(cx(from), cy(from)); await page.mouse.down(); await sleep(60);
    await page.mouse.move((cx(from) + cx(to)) / 2, (cy(from) + cy(to)) / 2, { steps: 5 });
    await page.mouse.move(cx(to), cy(to), { steps: 5 }); await sleep(60);
    await page.mouse.up(); await sleep(120);
  };
  const tp = (x, y, z) => page.evaluate((x, y, z) => window.__anti.ctx.world.teleport(x, y, z), x, y, z);
  const waitFor = async (fn, label, timeout = 15000) => {
    const t0 = Date.now();
    while (Date.now() - t0 < timeout) { if (await page.evaluate(fn)) return true; await sleep(150); }
    log('TIMEOUT waiting for', label); return false;
  };
  const waitUnfrozen = () => waitFor(() => window.__anti.ctx.world && !window.__anti.ctx.world.frozen, 'unfrozen');
  const dbg = async (tag) => log(tag, await page.evaluate(() => { const w = window.__anti.ctx.world; return JSON.stringify({ frozen: w.frozen, pos: w.pos.toArray().map((v) => +v.toFixed(1)), trig: w.activeTrigger?.label ?? null, dialog: !document.getElementById('dialog').classList.contains('hidden'), modal: !document.getElementById('modal').classList.contains('hidden') }); }));
  const pressE = async () => { await sleep(300); await page.keyboard.press('e'); await sleep(500); };
  const runQuiz = async (n) => {
    for (let i = 0; i < n; i++) {
      await page.click('.quiz-opts button:nth-child(2)'); await sleep(200);
      await page.click('#quiz-next'); await sleep(200);
    }
    await page.click('#quiz-done'); await sleep(300);
  };

  await page.goto('http://127.0.0.1:8080/', { waitUntil: 'networkidle0', timeout: 90000 });
  await sleep(800);
  await shot('01-title');
  await page.click('#t-start');
  await sleep(2200);
  await shot('02-prolog-intro');
  await advance();
  log('prolog objective:', await text('#objective'));
  await shot('03-prolog-room');

  // parçacıkları topla
  for (const p of [[-9, 0.2, -7], [10.4, 2.4, -6], [-8.3, 1.4, 6.7]]) { await tp(...p); await sleep(700); }
  log('after collect objective:', await text('#objective'));
  await shot('04-prolog-collected');
  await tp(0, 0, -4); await pressE();
  await advance(4);
  log('modal open (atom builder):', await modalVisible());
  await shot('05-atom-builder');
  // sürükle: 2 proton, 2 nötron çekirdeğe; 2 elektron yörüngeye
  const C = '#ab-canvas';
  await canvasDrag(C, [24, 395], [320, 185]);
  await canvasDrag(C, [70, 395], [330, 190]);
  await canvasDrag(C, [274, 395], [315, 180]);
  await canvasDrag(C, [320, 395], [325, 195]);
  await canvasDrag(C, [524, 395], [455, 185]);
  await canvasDrag(C, [570, 395], [185, 185]);
  log('atom status:', await text('#ab-status'));
  await shot('06-atom-done');
  await page.click('#ab-done'); await sleep(400);
  await advance(6);
  log('quiz open:', await modalVisible(), await text('#modal-card h2'));
  await shot('07-pretest');
  await runQuiz(5);
  await advance(8);
  await waitFor(() => document.getElementById('objective').textContent.includes('Kapıdan'), 'door objective');
  log('door objective:', await text('#objective'));
  await shot('08-door-open');
  await tp(0, 0, -8.6); await sleep(1800);
  log('map visible:', !!(await page.$('#map-svg')));
  await shot('09-map');

  // ---- Ordu ----
  await page.click('.city[data-id="ordu"]'); await sleep(2200);
  await advance();
  await shot('10-ordu-start');
  const collectZone = async (z1, z2) => {
    await page.evaluate(async (z1, z2) => {
      const w = window.__anti.ctx.world;
      for (const c of w.collectibles) {
        if (!c.alive || c.mesh.position.z > z1 || c.mesh.position.z < z2) continue;
        w.teleport(c.mesh.position.x, Math.max(0, c.mesh.position.y - 0.8), c.mesh.position.z);
        const t0 = Date.now();
        while (c.alive && Date.now() - t0 < 2000) await new Promise((r) => setTimeout(r, 50));
        if (c.alive) console.log('collect failed at', c.mesh.position.toArray());
      }
    }, z1, z2);
  };
  const build = async (n) => {
    for (let i = 0; i < n; i++) {
      await canvasDrag('#mb-canvas', [90, 130], [380, 170]);
      await canvasDrag('#mb-canvas', [90, 130], [420, 170]);
      await canvasDrag('#mb-canvas', [90, 280], [400, 220]);
      await page.click('#mb-build'); await sleep(1600);
      log('  build status:', await text('#mb-status'));
    }
  };
  // yanlış deneme: H2O2
  await collectZone(8, -12);
  log('inv:', await text('#inventory'));
  await tp(5, 0, -10); await pressE();
  log('molecule builder open:', await modalVisible());
  await canvasDrag('#mb-canvas', [90, 130], [380, 170]);
  await canvasDrag('#mb-canvas', [90, 130], [420, 170]);
  await canvasDrag('#mb-canvas', [90, 280], [400, 220]);
  await canvasDrag('#mb-canvas', [90, 280], [400, 150]);
  await shot('11-mol-h2o2');
  await page.click('#mb-build'); await sleep(300);
  log('wrong status:', await text('#mb-status'));
  await sleep(700);
  await build(1);
  await shot('12-mol-done');
  await page.click('#mb-exit'); await sleep(400);
  await advance(3); await waitUnfrozen(); await sleep(300);
  await shot('13-rafts');
  const raftOk = await page.evaluate(() => window.__anti.ctx.world.platforms.filter((p) => p.mesh && p.enabled && Math.abs(p.mesh.position.y + 0.2) < 0.05 && p.w === 2.6).length);
  log('rafts raised:', raftOk, 'objective:', await text('#objective'));

  await tp(0, 0, -22); await sleep(600); await advance(4);
  await collectZone(-20, -42);
  await tp(5, 0, -40); await sleep(300); await dbg('at station 2'); await pressE(); await build(2);
  await page.click('#mb-exit'); await sleep(400); await advance(3); await waitUnfrozen();
  await tp(0, 0, -54); await sleep(600);
  await collectZone(-52, -74);
  await dbg('before station 3');
  await tp(5, 0, -72); await sleep(300); await dbg('at station 3'); await pressE(); await dbg('after E');
  await build(3);
  await page.click('#mb-exit'); await sleep(400); await advance(3); await waitUnfrozen();
  await tp(0, 0, -88.5); await pressE();
  await advance(2);
  await waitFor(() => !document.getElementById('dialog').classList.contains('hidden'), 'finale dialog', 60000);
  await shot('14-finale');
  await advance(6);
  await waitFor(() => !document.getElementById('modal').classList.contains('hidden'), 'check quiz', 20000);
  log('check quiz:', await modalVisible(), await text('#modal-card h2'));
  await runQuiz(3);
  await advance(4);
  await waitFor(() => !!document.querySelector('#map-svg'), 'map', 20000);
  log('back on map:', !!(await page.$('#map-svg')));
  await shot('15-map-done');
  const st = await page.evaluate(() => JSON.stringify(window.__anti.state));
  log('state:', st);

  await page.click('#map-museum'); await waitFor(() => !!document.querySelector('#museum-back'), 'museum', 20000); await sleep(800);
  await shot('16-museum');
  await page.click('.card-btn[data-id="H2O"]'); await sleep(800);
  await shot('17-museum-h2o');

  // mobil görünüm
  await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
  await page.click('#museum-back'); await sleep(800);
  await shot('18-map-mobile');
  await page.click('.city[data-id="ordu"]'); await sleep(2500);
  await page.touchscreen.tap(195, 700); await sleep(400); await page.touchscreen.tap(195, 700); await sleep(400);
  await shot('19-ordu-mobile');

  console.log('\nERRORS (' + errors.length + '):'); errors.slice(0, 30).forEach((e) => console.log('  ' + e));
  await browser.close();
})().catch((e) => { console.error('E2E FAILED', e); process.exit(1); });
