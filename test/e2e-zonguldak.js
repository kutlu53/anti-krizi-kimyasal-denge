// Zonguldak: tünel → dondur → erit → öz ısı kapısı (yanlış + doğru) → çekirdek soğutma → kontrol testi → harita
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
  const log = (...a) => console.log('[zong]', ...a);
  const shot = (n) => page.screenshot({ path: path.join(OUT, n + '.png') });
  const text = (sel) => page.$eval(sel, (e) => e.textContent.trim()).catch(() => null);
  const dialogVisible = () => page.$eval('#dialog', (d) => !d.classList.contains('hidden'));
  const advance = async (max = 10) => { for (let i = 0; i < max; i++) { if (!(await dialogVisible())) return; await page.keyboard.press('Enter'); await sleep(220); await page.keyboard.press('Enter'); await sleep(260); } };
  const waitFor = async (fn, label, timeout = 20000) => { const t0 = Date.now(); while (Date.now() - t0 < timeout) { if (await page.evaluate(fn)) return true; await sleep(150); } log('TIMEOUT', label); return false; };
  const waitDialog = (label, t = 40000) => waitFor(() => !document.getElementById('dialog').classList.contains('hidden'), label, t);
  const unfrozen = () => waitFor(() => !window.__anti.ctx.world.frozen, 'unfrozen', 40000);
  const tp = (x, y, z) => page.evaluate((x, y, z) => window.__anti.ctx.world.teleport(x, y, z), x, y, z);
  const pressE = async () => { await sleep(350); await page.keyboard.press('e'); await sleep(500); };
  const inv = () => text('#inventory');

  await page.evaluateOnNewDocument(() => { localStorage.setItem('anti-krizi-save-v1', JSON.stringify({ preTest: { score: 2, total: 5, answers: {} }, checks: {}, chapters: { prolog: true, ordu: true, izmir: true, konya: true }, cards: ['He', 'H', 'O', 'H2O', 'NaCl', 'NH3'], startedAt: 1 })); });
  await page.goto('http://127.0.0.1:8080/', { waitUntil: 'networkidle0', timeout: 90000 });
  await page.click('#t-continue'); await sleep(500);
  await page.click('.city[data-id="zonguldak"]'); await sleep(2500);
  await advance(); await unfrozen();
  await shot('z01-tunnel');
  // 1) dondur
  await tp(0, 0, -11); await pressE();
  await sleep(1500); await shot('z02-freezing');
  await waitDialog('freeze dialog'); await advance(3); await unfrozen();
  log('bridge walkable:', await page.evaluate(() => window.__anti.ctx.world.platforms.some((p) => p.enabled && p.mesh && Math.abs(p.mesh.position.z + 16) < 0.1 && p.w === 10)));
  // 2) kart + erit
  await tp(0, 0, -22); await sleep(400);
  await tp(4, 2.2, -29.2); await sleep(600);
  await tp(0, 0, -31.5); await pressE();
  await sleep(1800); await shot('z03-melting');
  await waitDialog('melt dialog'); await advance(3); await unfrozen();
  log('after melt inv:', await inv());
  // 3) öz ısı: önce su (yanlış), şarj, sonra demir
  await tp(0, 0, -42); await sleep(300);
  await tp(3, 0, -48); await pressE();
  await waitDialog('water fail'); log('water:', (await text('#dialog-text')).slice(0, 90)); await advance(4); await unfrozen();
  log('heat after water:', await inv());
  await tp(-3.5, 0, -44); await pressE(); await sleep(300);
  log('heat after charge:', await inv());
  await tp(-3, 0, -48); await pressE();
  await waitDialog('iron ok'); await shot('z04-iron'); await advance(3); await unfrozen();
  log('door open:', await page.evaluate(() => !window.__anti.ctx.world.platforms.find((p) => p.mesh && Math.abs(p.mesh.position.z + 52) < 0.1 && p.w === 10).enabled));
  // 4) çekirdek
  await tp(0, 0, -58); await waitDialog('core intro'); await advance(4); await unfrozen();
  await sleep(1500); log('core objective:', await text('#objective'));
  await shot('z05-core');
  for (const [x, y, z] of [[-7, 2, -62.2], [7, 0, -70.5], [0, 0, -79]]) { await tp(x, y, z); await pressE(); await sleep(300); log('  ', await text('#objective')); }
  await waitDialog('finale', 60000);
  await shot('z06-finale');
  await advance(8);
  await waitFor(() => !document.getElementById('modal').classList.contains('hidden'), 'quiz');
  log('quiz:', await text('#modal-card h2'));
  for (let i = 0; i < 3; i++) { await page.click('.quiz-opts button:nth-child(1)'); await sleep(150); await page.click('#quiz-next'); await sleep(150); }
  await page.click('#quiz-done'); await sleep(300);
  await advance(4);
  await waitFor(() => !!document.querySelector('#map-svg'), 'map');
  log('state:', await page.evaluate(() => JSON.stringify({ chapters: window.__anti.state.chapters, checks: window.__anti.state.checks, cards: window.__anti.state.cards })));
  await shot('z07-map');
  await page.click('#map-museum'); await waitFor(() => !!document.querySelector('#museum-back'), 'museum'); await sleep(600);
  await page.click('.card-btn[data-id="CH4"]'); await sleep(800);
  await shot('z08-museum-ch4');
  console.log('\nERRORS (' + errors.length + '):'); errors.slice(0, 20).forEach((e) => console.log('  ' + e));
  await browser.close();
})().catch((e) => { console.error('ZONG E2E FAILED', e); process.exit(1); });
