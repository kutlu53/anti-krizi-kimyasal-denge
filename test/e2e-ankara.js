// Ankara finali + epilog: terazi (yanlış/doğru/kalkan düşmesi), sızıntılar, yeşil kimya, kurtarma, son-test, sertifika
const puppeteer = require('puppeteer-core');
const path = require('path');
const OUT = path.join(__dirname, 'shots'); require('fs').mkdirSync(OUT, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const ANSWERS = [[2, 1, 2], [2, 1, 2], [1, 3, 2], [1, 2, 1, 2]];

(async () => {
  const browser = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true,
    args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox'] });
  const page = await browser.newPage(); await page.setViewport({ width: 1280, height: 800 });
  const errors = [];
  page.on('console', (m) => { if (['error', 'warning'].includes(m.type())) errors.push(m.type() + ': ' + m.text()); });
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  const log = (...a) => console.log('[ankara]', ...a);
  const shot = (n) => page.screenshot({ path: path.join(OUT, n + '.png') });
  const text = (sel) => page.$eval(sel, (e) => e.textContent.trim()).catch(() => null);
  const dialogVisible = () => page.$eval('#dialog', (d) => !d.classList.contains('hidden'));
  const modalVisible = () => page.$eval('#modal', (d) => !d.classList.contains('hidden'));
  const advance = async (max = 10) => { for (let i = 0; i < max; i++) { if (!(await dialogVisible())) return; if (await page.$('#dialog-options button')) return; await page.keyboard.press('Enter'); await sleep(220); await page.keyboard.press('Enter'); await sleep(260); } };
  const waitFor = async (fn, label, timeout = 20000) => { const t0 = Date.now(); while (Date.now() - t0 < timeout) { if (await page.evaluate(fn)) return true; await sleep(150); } log('TIMEOUT', label); return false; };
  const waitDialog = (label, t = 40000) => waitFor(() => !document.getElementById('dialog').classList.contains('hidden'), label, t);
  const waitModal = (label, t = 30000) => waitFor(() => !document.getElementById('modal').classList.contains('hidden'), label, t);
  const unfrozen = () => waitFor(() => !window.__anti.ctx.world.frozen, 'unfrozen', 40000);
  const tp = (x, y, z) => page.evaluate((x, y, z) => window.__anti.ctx.world.teleport(x, y, z), x, y, z);
  const pressE = async () => { await sleep(350); await page.keyboard.press('e'); await sleep(500); };
  const setCoefs = async (ans) => { for (let i = 0; i < ans.length; i++) for (let k = 1; k < ans[i]; k++) { await page.click(`.bl-coef button[data-i="${i}"][data-d="1"]`); await sleep(40); } };
  const solveRound = async (r) => { await waitModal('balance ' + r); await setCoefs(ANSWERS[r]); await page.click('#bl-check'); await sleep(300); const st = await text('#bl-status'); await page.click('#bl-check'); await sleep(300); return st; };

  await page.evaluateOnNewDocument(() => { localStorage.setItem('anti-krizi-save-v1', JSON.stringify({ preTest: { score: 2, total: 5, answers: { atom1: 1, compound1: 2, mixture1: 0, ph1: 0, heat1: 0 } }, checks: { ordu: { score: 3, total: 3 }, izmir: { score: 2, total: 3 }, konya: { score: 3, total: 3 }, zonguldak: { score: 2, total: 3 } }, chapters: { prolog: true, ordu: true, izmir: true, konya: true, zonguldak: true }, cards: ['He', 'H', 'O', 'H2O', 'NaCl', 'NH3', 'CH4'], startedAt: 1 })); });
  await page.goto('http://127.0.0.1:8080/', { waitUntil: 'networkidle0', timeout: 90000 });
  await page.click('#t-continue'); await sleep(500);
  await shot('a01-map-final');
  log('ankara city present:', !!(await page.$('.city[data-id="ankara"]')), 'prolog hidden:', !(await page.$('.city[data-id="prolog"]')));
  await page.click('.city[data-id="ankara"]'); await sleep(2500);
  await advance(); await unfrozen();
  await shot('a02-plaza');
  await tp(0, 0, -22); await waitDialog('boss intro'); await advance(6);
  // 1. tur: önce yanlış, sonra doğru
  await waitModal('balance 0');
  await shot('a03-balance');
  await page.click('#bl-check'); await sleep(300);
  log('wrong:', (await text('#bl-status')).slice(0, 70), '|', await text('#bl-hearts'));
  await setCoefs(ANSWERS[0]); await page.click('#bl-check'); await sleep(300);
  log('right:', (await text('#bl-status')).slice(0, 60));
  await shot('a04-balanced');
  await page.click('#bl-check'); await sleep(300);
  await waitDialog('hit'); await advance(3); await unfrozen();
  log('objective:', await text('#objective'));
  await tp(-16, 0, -6); await pressE();
  // 2. tur: kalkanı düşür (2 yanlış), kalkan pedi, sonra çöz
  await waitDialog('round2 story'); await advance(3); await waitModal('balance 1');
  await page.click('#bl-check'); await sleep(250); await page.click('#bl-check'); await sleep(300);
  log('modal closed after 0 hearts:', !(await modalVisible()));
  await waitDialog('shield dialog'); await advance(4); await unfrozen();
  log('objective:', await text('#objective'));
  await tp(0, 0, -8); await pressE();
  await waitDialog('round2 again'); await advance(3);
  log('round2:', (await solveRound(1)).slice(0, 40));
  await waitDialog('hit2'); await advance(3); await unfrozen();
  await tp(16, 0, -18); await pressE();
  await waitDialog('round3 story'); await advance(3);
  log('round3:', (await solveRound(2)).slice(0, 40));
  await waitDialog('hit3'); await advance(3); await unfrozen();
  await tp(-10, 3.2, -47.2); await pressE();
  await waitDialog('round4 story'); await advance(3);
  log('round4:', (await solveRound(3)).slice(0, 40));
  await waitDialog('hit4'); await advance(3); await unfrozen();
  await tp(16, 0, -40); await pressE();
  // yenilgi ve seçim
  await waitDialog('defeat', 60000); await advance(6);
  await waitFor(() => !!document.querySelector('#dialog-options button'), 'choice');
  await shot('a05-choice');
  await page.click('#dialog-options button:nth-child(2)'); await sleep(400);
  await waitDialog('green intro'); await advance(3); await unfrozen();
  log('green objective:', await text('#objective'));
  for (const [x, z] of [[-16, -30], [14, -8], [0, -52]]) { await tp(x, 0, z); await pressE(); }
  await waitDialog('green done', 20000); await advance(2);
  await sleep(500);
  await waitDialog('elif', 60000);
  await shot('a06-rescue');
  await advance(8);
  // epilog
  await waitDialog('epilog aria', 30000); await advance(3);
  await waitModal('post test');
  log('post-test:', await text('#modal-card h2'));
  for (let i = 0; i < 5; i++) { await page.click('.quiz-opts button:nth-child(2)'); await sleep(150); await page.click('#quiz-next'); await sleep(150); }
  await page.click('#quiz-done'); await sleep(300);
  await advance(3);
  await waitFor(() => !!document.querySelector('#cert-make'), 'epilog screen');
  await page.type('#cert-name', 'Kutay Demir'); await page.click('#cert-make'); await sleep(600);
  const href = await page.$eval('#cert-dl', (a) => a.href.slice(0, 22));
  log('cert link:', href, '| state:', await page.evaluate(() => JSON.stringify({ ending: window.__anti.state.ending, post: window.__anti.state.postTest?.score, ankara: window.__anti.state.chapters.ankara })));
  await shot('a07-epilog');
  await page.click('#ep-map'); await sleep(600);
  log('map epilog button:', !!(await page.$('#map-epilog')), 'ankara done:', await page.$eval('.city[data-id="ankara"]', (e) => e.dataset.st));
  await shot('a08-map-complete');
  await page.click('#map-museum'); await waitFor(() => !!document.querySelector('#museum-back'), 'museum'); await sleep(500);
  await page.click('.card-btn[data-id="CO2"]'); await sleep(700); await shot('a09-museum-co2');
  console.log('\nERRORS (' + errors.length + '):'); errors.slice(0, 20).forEach((e) => console.log('  ' + e));
  await browser.close();
})().catch((e) => { console.error('ANKARA E2E FAILED', e); process.exit(1); });
