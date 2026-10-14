import { sfx } from '../audio.js';

/* ---------- Bileşenler ve istasyonlar ---------- */
export const COMP = {
  su: { name: 'Su', color: '#3aa0ff', shape: 'drop' },
  tuz: { name: 'Tuz', color: '#ffffff', shape: 'square' },
  kum: { name: 'Kum', color: '#d9b36b', shape: 'dot' },
  cakil: { name: 'Çakıl', color: '#8a8f9c', shape: 'rock' },
  demir: { name: 'Demir tozu', color: '#4a4f63', shape: 'dot' },
  yag: { name: 'Yağ', color: '#ffd84a', shape: 'blob' },
};

export const STATIONS = {
  miknatis: { name: 'Mıknatıs', icon: '🧲', removes: ['demir'], desc: 'Mıknatısla çekilen maddeleri (demir) ayırır.' },
  elek: { name: 'Elek', icon: '🥅', removes: ['cakil'], desc: 'Büyük taneleri (çakıl) tutar, küçükler ve sıvılar geçer.' },
  suzgec: { name: 'Süzgeç', icon: '🧻', removes: ['cakil', 'kum', 'demir'], desc: 'Suda çözünmeyen tüm katıları tutar. Çözünmüş tuzu tutamaz!' },
  huni: { name: 'Ayırma hunisi', icon: '⚗️', removes: ['yag'], desc: 'Birbirine karışmayan sıvıları yoğunluk farkıyla ayırır (yağ üstte).' },
  buhar: { name: 'Buharlaştırıcı', icon: '🔥', removes: [], terminal: true, desc: 'Suyu buharlaştırır; çözünmüş tuz kapta kalır. Su kaybolur!' },
  damitici: { name: 'Damıtıcı', icon: '🧪', removes: ['tuz', 'kum', 'cakil', 'demir'], desc: 'Suyu buharlaştırıp yeniden yoğuşturur: tuz geride kalır, saf su alınır. Yağ onu bozar.' },
};

/* ---------- Seviyeler ---------- */
export const LEVELS = [
  { type: 'dissolve', title: 'Tıkalı Boru', goal: 'Tuz bloğunu 15 saniyede çözündür. Üç silahın var: parçala, ısıt, karıştır.' },
  { type: 'line', title: 'Körfez Suyu', input: ['su', 'tuz', 'cakil'], output: ['su'], slots: 3, palette: ['elek', 'suzgec', 'buhar', 'damitici'], goal: 'Şehre temiz su gönder. Tuz görünmez ama orada!' },
  { type: 'line', title: 'Hurda İskelesi', input: ['su', 'kum', 'demir'], output: ['su'], slots: 3, palette: ['miknatis', 'elek', 'suzgec', 'damitici'], bins: { demir: 'miknatis' }, goal: 'Temiz su gönder. Demir tozu geri dönüşüm için AYRI toplanmalı.' },
  { type: 'line', title: 'Çamaltı Tuzlası', input: ['su', 'tuz', 'kum', 'cakil'], output: null, slots: 3, palette: ['elek', 'suzgec', 'miknatis', 'buhar', 'damitici'], pure: 'tuz', goal: 'Tuzla için SAF tuz elde et. Suya ihtiyaç yok.' },
  { type: 'line', title: 'Tanker Kazası', input: ['su', 'tuz', 'yag', 'kum'], output: ['su'], slots: 4, palette: ['miknatis', 'elek', 'suzgec', 'huni', 'buhar', 'damitici'], goal: 'Petrol sızıntısı! Temiz su gönder. Sıra önemli.' },
  { type: 'line', title: 'Büyük Arıtma', input: ['su', 'tuz', 'yag', 'kum', 'cakil', 'demir'], output: ['su'], slots: 5, palette: ['miknatis', 'elek', 'suzgec', 'huni', 'buhar', 'damitici'], bins: { demir: 'miknatis' }, pure: 'tuz', goal: 'Hepsi bir arada. Temiz su + ayrı demir + saf tuz.' },
];

/* ---------- Değerlendirme (saf mantık, test edilebilir) ---------- */
export function simulate(level, placed) {
  let stream = [...level.input];
  const bins = placed.map(() => []);
  const vapor = [];
  let error = null;
  for (let i = 0; i < placed.length; i++) {
    const id = placed[i]; if (!id) continue;
    const st = STATIONS[id];
    if (id === 'damitici' && stream.includes('yag')) { error = { code: 'yag-damitici', slot: i }; }
    if (st.terminal) {
      stream.forEach((c) => (c === 'su' ? vapor.push(c) : bins[i].push(c)));
      stream = []; break;
    }
    const removed = stream.filter((c) => st.removes.includes(c));
    bins[i].push(...removed);
    stream = stream.filter((c) => !st.removes.includes(c));
  }
  return { stream, bins, vapor, error };
}

export function judgeLine(level, placed, res) {
  const out = res.stream;
  if (res.error?.code === 'yag-damitici') return { ok: false, text: 'Yağ damıtıcıya girdi ve yandı, her yer duman! Yağı ayırma hunisiyle ÖNCE ayır.' };
  if (level.output) {
    const want = [...level.output].sort().join(), got = [...out].sort().join();
    if (want !== got) {
      if (out.length === 0 && res.vapor.length) return { ok: false, text: 'Buharlaştırıcı suyu buhar edip uçurdu! Şehre su lazım. Suyu geri kazanmak için damıtıcı kullan.' };
      if (out.includes('tuz')) return { ok: false, text: 'Çıkan su hâlâ tuzlu. Tuz çözünmüştür; süzgeç ve elek onu tutamaz. Homojen karışım için damıtıcı gerekir.' };
      if (out.includes('kum')) return { ok: false, text: 'Kum geçti. Kum elekten geçer ama süzgeçten geçemez. Süzgeç kullan.' };
      if (out.includes('cakil')) return { ok: false, text: 'Çakıl geçti. Büyük taneleri elek ya da süzgeç tutar.' };
      if (out.includes('demir')) return { ok: false, text: 'Demir tozu geçti. Demiri mıknatıs çeker.' };
      if (out.includes('yag')) return { ok: false, text: 'Yağ geçti. Yağ suyla karışmaz, üstte yüzer: ayırma hunisi.' };
      if (!out.includes('su')) return { ok: false, text: 'Hatta su kalmadı. Suyu kaybetmeden ayır: damıtıcı suyu geri verir.' };
      return { ok: false, text: 'Çıkış hedefe uymuyor. İstasyonların ne tuttuğuna bak.' };
    }
  }
  if (level.bins) {
    for (const [comp, stId] of Object.entries(level.bins)) {
      const idx = res.bins.findIndex((b) => b.includes(comp));
      if (idx < 0) return { ok: false, text: `${COMP[comp].name} hiç toplanmadı.` };
      if (placed[idx] !== stId) return { ok: false, text: `${COMP[comp].name} ${STATIONS[placed[idx]].name.toLowerCase()} kabına, başka katılarla karışık düştü. Geri dönüşüm ayrı ister: ${STATIONS[stId].name.toLowerCase()}ı ondan ÖNCE koy.` };
    }
  }
  if (level.pure) {
    const idx = res.bins.findIndex((b) => b.includes(level.pure));
    if (idx < 0) return { ok: false, text: `${COMP[level.pure].name} toplanmadı. Çözünmüş tuzu ancak buharlaştırma ya da damıtma geride bırakır.` };
    const others = res.bins[idx].filter((c) => c !== level.pure);
    if (others.length) return { ok: false, text: `Tuz kapta ${others.map((c) => COMP[c].name.toLowerCase()).join(', ')} ile karıştı. Katıları ÖNCE ayır, sonra buharlaştır ya da damıt.` };
  }
  return { ok: true, text: 'Hat temiz çalışıyor! Doğru yöntem, doğru sıra.' };
}

/* ---------- Ekran ---------- */
const PALETTE_ALL = Object.keys(STATIONS);

export function openFactory({ levels = LEVELS, startLevel = 0, onLevelDone } = {}) {
  return new Promise((resolve) => {
    const root = document.getElementById('screens');
    const div = document.createElement('div');
    div.className = 'screen factory';
    div.innerHTML = `
      <div class="f-top">
        <div><b id="f-title"></b><div class="hint" id="f-goal"></div></div>
        <div class="chip" id="f-level"></div>
      </div>
      <div id="f-canvas-wrap"><canvas id="f-canvas"></canvas></div>
      <div class="status" id="f-status"><div class="mini">🤖</div><span></span></div>
      <div class="f-palette" id="f-palette"></div>
      <div class="modal-foot">
        <span class="hint" id="f-hint"></span>
        <span class="row"><button class="btn secondary small" id="f-clear">Temizle</button><button class="btn orange small" id="f-run">Çalıştır ▶</button></span>
      </div>
    `;
    root.appendChild(div);
    const $ = (s) => div.querySelector(s);
    const canvas = $('#f-canvas'), wrap = $('#f-canvas-wrap'), g = canvas.getContext('2d');
    const status = $('#f-status'), palette = $('#f-palette'), runBtn = $('#f-run'), clearBtn = $('#f-clear');
    const say = (t, cls = '') => { status.className = 'status ' + cls; status.querySelector('span').textContent = t; };

    let li = startLevel, level = null;
    let placed = [], selected = null, sim = null, solved = false, raf = 0, last = performance.now();
    let W = 0, H = 0, dpr = 1, vertical = false;
    let diss = null; // çözünme seviyesi durumu

    const fit = () => {
      const r = wrap.getBoundingClientRect();
      const w = Math.max(280, Math.floor(r.width)), h = Math.max(220, Math.floor(r.height));
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      if (w !== W || h !== H) {
        W = w; H = h; canvas.width = W * dpr; canvas.height = H * dpr;
        canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
        vertical = H > W * 1.05;
      }
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    // ana eksen a (0..1) ve dik eksen b (px) → ekran
    const pad = 16;
    const P = (a, b = 0) => vertical
      ? { x: W * 0.36 + b, y: pad + 30 + a * (H - 2 * pad - 60) }
      : { x: pad + a * (W - 2 * pad), y: H * 0.36 + b };
    const slotA = (i) => 0.2 + (i + 0.5) * (0.6 / level.slots);
    const slotSize = () => Math.min(72, vertical ? W * 0.18 : (W * 0.6) / level.slots - 10);

    /* ---------- seviye kurulumu ---------- */
    const loadLevel = () => {
      level = levels[li]; solved = false; sim = null; selected = null;
      $('#f-title').textContent = `${li + 1}. ${level.title}`;
      $('#f-goal').textContent = level.goal;
      $('#f-level').textContent = `${li + 1} / ${levels.length}`;
      runBtn.textContent = 'Çalıştır ▶'; runBtn.className = 'btn orange small'; runBtn.disabled = false;
      palette.innerHTML = '';
      if (level.type === 'dissolve') { setupDissolve(); return; }
      clearBtn.classList.remove('hidden');
      placed = Array(level.slots).fill(null);
      say('Bir istasyon seç, sonra hatta bir yuvaya dokun. İstasyona tekrar dokunursan kaldırılır.');
      $('#f-hint').textContent = `Giriş: ${level.input.map((c) => COMP[c].name).join(' + ')}`;
      level.palette.forEach((id) => {
        const b = document.createElement('button');
        b.className = 'pal'; b.dataset.id = id;
        b.innerHTML = `<span class="ico">${STATIONS[id].icon}</span>${STATIONS[id].name}`;
        b.addEventListener('click', () => {
          sfx.click();
          selected = selected === id ? null : id;
          palette.querySelectorAll('.pal').forEach((x) => x.classList.toggle('active', x.dataset.id === selected));
          if (selected) say(`${STATIONS[id].name}: ${STATIONS[id].desc} Şimdi bir yuvaya dokun.`);
        });
        palette.appendChild(b);
      });
    };

    const onTapLine = (x, y) => {
      if (sim || solved) return;
      const s = slotSize();
      for (let i = 0; i < level.slots; i++) {
        const p = P(slotA(i));
        if (Math.abs(x - p.x) < s / 2 + 6 && Math.abs(y - p.y) < s / 2 + 6) {
          if (placed[i]) { placed[i] = null; sfx.click(); say('İstasyon kaldırıldı.'); }
          else if (selected) {
            placed[i] = selected; sfx.collect(); say(`${STATIONS[selected].name} ${i + 1}. yuvaya yerleşti.`);
            selected = null; palette.querySelectorAll('.pal').forEach((x) => x.classList.remove('active'));
          }
          else say('Önce alttan bir istasyon seç.');
          return;
        }
      }
    };

    const runLine = () => {
      if (sim || solved) return;
      if (!placed.some(Boolean)) { say('Hatta hiç istasyon yok!', 'bad'); sfx.fail(); return; }
      const res = simulate(level, placed);
      const verdict = judgeLine(level, placed, res);
      // parçacıklar: her bileşenden 3 tane; kaderi ilk tutan istasyon
      const particles = [];
      level.input.forEach((c, ci) => {
        for (let k = 0; k < 3; k++) {
          let fate = null;
          for (let i = 0; i < placed.length; i++) {
            const id = placed[i]; if (!id) continue;
            const st = STATIONS[id];
            if (st.terminal) { fate = { slot: i, kind: c === 'su' ? 'vapor' : 'bin' }; break; }
            if (st.removes.includes(c)) { fate = { slot: i, kind: 'bin' }; break; }
          }
          particles.push({ c, a: -0.05 - (ci * 3 + k) * 0.035, b: (k - 1) * 9, fate, done: false, off: 0 });
        }
      });
      sim = { particles, t: 0, res, verdict, finished: false };
      runBtn.disabled = true; say('Hat çalışıyor...');
      sfx.water();
    };

    const finishLine = () => {
      const v = sim.verdict;
      say(v.text, v.ok ? 'ok' : 'bad');
      if (v.ok) { solved = true; sfx.success(); runBtn.textContent = li + 1 < levels.length ? 'Sonraki →' : 'Tesisi Çalıştır ✓'; runBtn.className = 'btn small'; }
      else { sfx.fail(); runBtn.textContent = 'Tekrar Dene'; }
      runBtn.disabled = false;
      sim.finished = true;
    };

    /* ---------- çözünme yarışı ---------- */
    const setupDissolve = () => {
      clearBtn.classList.add('hidden');
      diss = { crush: 0, temp: 20, stir: false, progress: 0, time: 15, running: true, won: false, swirl: 0, bits: [] };
      say('A.N.T.İ. boruyu tuz bloğuyla tıkadı! Süre 15 saniye. Çözünmeyi hızlandır.');
      $('#f-hint').textContent = 'Tanecik boyutu · Sıcaklık · Karıştırma';
      const mk = (id, html) => { const b = document.createElement('button'); b.className = 'pal'; b.id = id; b.innerHTML = html; palette.appendChild(b); return b; };
      const crushB = mk('d-crush', '<span class="ico">🔨</span>Parçala');
      const heatB = mk('d-heat', '<span class="ico">🔥</span>Isıt');
      const stirB = mk('d-stir', '<span class="ico">🌀</span>Karıştır (basılı tut)');
      crushB.addEventListener('click', () => { if (!diss.running) return; if (diss.crush < 3) { diss.crush++; sfx.hit(); } crushB.classList.toggle('active', diss.crush === 3); });
      heatB.addEventListener('click', () => { if (!diss.running) return; diss.temp = diss.temp >= 80 ? 20 : diss.temp + 30; sfx.click(); heatB.classList.toggle('active', diss.temp === 80); });
      const stirOn = (e) => { e.preventDefault(); diss.stir = true; stirB.classList.add('active'); };
      const stirOff = () => { diss.stir = false; stirB.classList.remove('active'); };
      stirB.addEventListener('pointerdown', stirOn); stirB.addEventListener('pointerup', stirOff); stirB.addEventListener('pointercancel', stirOff); stirB.addEventListener('pointerleave', stirOff);
      runBtn.textContent = 'Yeniden Başlat'; runBtn.className = 'btn secondary small';
    };
    const updateDissolve = (dt) => {
      const d = diss; if (!d.running) return;
      d.time -= dt;
      const rate = 0.012 * (1 + d.crush * 0.7) * (1 + (d.temp - 20) / 40) * (d.stir ? 2 : 1);
      d.progress = Math.min(1, d.progress + rate * dt);
      if (d.stir) d.swirl += dt * 4;
      if (Math.random() < rate * 40 * dt) d.bits.push({ x: (Math.random() - 0.5) * 60, y: 0, vx: (Math.random() - 0.5) * 30, vy: -20 - Math.random() * 30, life: 1 });
      d.bits.forEach((b) => { b.x += (b.vx + (d.stir ? 60 : 0)) * dt; b.y += b.vy * dt; b.life -= dt * 0.5; });
      d.bits = d.bits.filter((b) => b.life > 0);
      const stat = `Tanecik: ${['Blok', 'Parçalı', 'Küçük', 'Toz'][d.crush]} · Sıcaklık: ${d.temp}°C · Karıştırma: ${d.stir ? 'açık' : 'kapalı'}`;
      $('#f-hint').textContent = stat;
      if (d.progress >= 1) {
        d.running = false; d.won = true; solved = true; sfx.success();
        say('Tuz çözündü, boru açıldı! Çözünme hızını üç şey artırır: küçük tanecik, yüksek sıcaklık ve karıştırma.', 'ok');
        runBtn.textContent = 'Sonraki →'; runBtn.className = 'btn small';
      } else if (d.time <= 0) {
        d.running = false; sfx.fail();
        say('Süre doldu! Tek faktör yetmez. Parçala, ısıt VE karıştır.', 'bad');
      }
    };

    /* ---------- çizim ---------- */
    const rr = (x, y, w, h, r, fill, stroke) => { g.beginPath(); g.roundRect(x, y, w, h, r); if (fill) { g.fillStyle = fill; g.fill(); } if (stroke) { g.strokeStyle = stroke; g.stroke(); } };
    const drawComp = (c, x, y, r = 7) => {
      const s = COMP[c]; g.fillStyle = s.color; g.strokeStyle = 'rgba(0,0,0,.35)'; g.lineWidth = 1.5;
      g.beginPath();
      if (s.shape === 'square') g.rect(x - r, y - r, 2 * r, 2 * r);
      else if (s.shape === 'rock') { g.moveTo(x - r, y + r * 0.6); g.lineTo(x - r * 0.6, y - r); g.lineTo(x + r * 0.7, y - r * 0.8); g.lineTo(x + r, y + r * 0.5); g.closePath(); }
      else if (s.shape === 'drop') { g.moveTo(x, y - r * 1.3); g.quadraticCurveTo(x + r * 1.2, y + r * 0.3, x, y + r); g.quadraticCurveTo(x - r * 1.2, y + r * 0.3, x, y - r * 1.3); }
      else if (s.shape === 'blob') g.ellipse(x, y, r * 1.3, r * 0.8, 0.3, 0, Math.PI * 2);
      else g.arc(x, y, r * 0.8, 0, Math.PI * 2);
      g.fill(); g.stroke();
    };
    const tank = (a0, a1, title, comps, color) => {
      const p0 = P(a0, -46), p1 = P(a1, 46);
      const x = Math.min(p0.x, p1.x), y = Math.min(p0.y, p1.y), w = Math.abs(p1.x - p0.x), h = Math.abs(p1.y - p0.y);
      rr(x, y, w, h, 12, color, '#2b3764');
      g.fillStyle = '#9aa6d1'; g.font = '800 11px Nunito'; g.textAlign = 'center'; g.fillText(title, x + w / 2, y - 6);
      comps.forEach((c, i) => drawComp(c, x + w / 2 + ((i % 3) - 1) * 18, y + h / 2 + (Math.floor(i / 3) - 0.5) * 18, 6));
    };

    const drawLine = (dt) => {
      // boru
      const s = P(0.12), e = P(0.88);
      g.lineCap = 'round'; g.lineWidth = 18; g.strokeStyle = '#1d2749'; g.beginPath(); g.moveTo(s.x, s.y); g.lineTo(e.x, e.y); g.stroke();
      g.lineWidth = 10; g.strokeStyle = sim ? '#3aa0ff' : '#2b3764'; g.beginPath(); g.moveTo(s.x, s.y); g.lineTo(e.x, e.y); g.stroke();
      // tanklar
      tank(0, 0.12, 'KARIŞIM', level.input, '#141b33');
      const outComps = sim?.finished ? sim.res.stream : [];
      tank(0.88, 1, 'ŞEHİR', outComps, sim?.finished && sim.verdict.ok ? '#12381f' : '#141b33');
      // yuvalar
      const sz = slotSize();
      for (let i = 0; i < level.slots; i++) {
        const p = P(slotA(i)); const id = placed[i];
        if (id) {
          rr(p.x - sz / 2, p.y - sz / 2, sz, sz, 12, '#1d2749', '#3ee8ff');
          g.font = `${sz * 0.5}px serif`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#fff'; g.fillText(STATIONS[id].icon, p.x, p.y);
          g.textBaseline = 'alphabetic'; g.font = '800 10px Nunito'; g.fillStyle = '#eef2ff';
          const lp = vertical ? { x: p.x, y: p.y + sz / 2 + 12 } : { x: p.x, y: p.y + sz / 2 + 12 };
          g.fillText(STATIONS[id].name, lp.x, lp.y);
          // kap
          const bp = P(slotA(i), vertical ? 0 : sz / 2 + 56); const bx = vertical ? p.x + sz / 2 + 54 : bp.x, by = vertical ? p.y : bp.y;
          rr(bx - 26, by - 18, 52, 36, 8, '#0a0f24', STATIONS[id].terminal ? '#ff5d6c' : '#2b3764');
          if (sim) {
            const got = sim.particles.filter((q) => q.fate?.slot === i && q.fate.kind === 'bin' && q.done);
            const kinds = [...new Set(got.map((q) => q.c))];
            kinds.forEach((c, k) => drawComp(c, bx + (k - (kinds.length - 1) / 2) * 14, by, 5));
          }
        } else {
          g.setLineDash([6, 6]); rr(p.x - sz / 2, p.y - sz / 2, sz, sz, 12, 'rgba(62,232,255,0.06)', selected ? '#3ee8ff' : '#2b3764'); g.setLineDash([]);
          g.fillStyle = '#9aa6d1'; g.font = '900 18px Nunito'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(String(i + 1), p.x, p.y); g.textBaseline = 'alphabetic';
        }
      }
      // simülasyon
      if (sim && !sim.finished) {
        sim.t += dt;
        let allDone = true;
        sim.particles.forEach((q) => {
          if (q.done) return;
          allDone = false;
          if (q.fate && q.a >= slotA(q.fate.slot)) {
            q.off += dt * 90;
            if (q.off > (q.fate.kind === 'vapor' ? 70 : 60)) q.done = true;
          } else {
            q.a += dt * 0.22;
            if (q.a >= 0.9) q.done = true;
          }
          if (q.done && !q.fate) sim.res.stream.includes(q.c) || (q.done = true);
          const sz2 = slotSize();
          let p;
          if (q.fate && q.a >= slotA(q.fate.slot)) {
            const base = P(slotA(q.fate.slot), q.b);
            const up = q.fate.kind === 'vapor';
            p = vertical ? { x: base.x + (up ? -q.off : q.off), y: base.y } : { x: base.x, y: base.y + (up ? -q.off : q.off) };
            if (up) g.globalAlpha = Math.max(0, 1 - q.off / 70);
          } else p = P(Math.max(0.02, q.a), q.b);
          drawComp(q.c, p.x, p.y, 7); g.globalAlpha = 1;
          void sz2;
        });
        if (allDone) finishLine();
      }
    };

    const drawDissolve = (dt) => {
      updateDissolve(dt);
      const d = diss;
      const cx = W / 2, cy = H * 0.55, tw = Math.min(W - 40, 360), th = Math.min(H - 90, 220);
      // tank
      const tcol = d.temp === 20 ? '#1e4f8a' : d.temp === 50 ? '#2a6aa0' : '#8a3a2a';
      rr(cx - tw / 2, cy - th / 2, tw, th, 16, tcol, '#2b3764');
      // girdap
      if (d.stir) { g.strokeStyle = 'rgba(255,255,255,0.25)'; g.lineWidth = 3; for (let i = 0; i < 3; i++) { g.beginPath(); g.ellipse(cx, cy, tw * 0.3 + i * 18, th * 0.18 + i * 8, d.swirl * 0.3 + i, 0, Math.PI * 2); g.stroke(); } }
      // blok
      const bs = 70 * (1 - d.progress) + 4;
      const n = [1, 2, 3, 4][d.crush];
      for (let i = 0; i < n; i++) {
        const ang = (i / n) * Math.PI * 2, r = n === 1 ? 0 : 22;
        const bx = cx + Math.cos(ang + d.swirl) * r, by = cy + 20 + Math.sin(ang + d.swirl) * r * 0.5;
        const s2 = bs / Math.sqrt(n);
        rr(bx - s2 / 2, by - s2 / 2, s2, s2, 6, '#f4f6ff', '#aab2c8');
      }
      // çözünen parçacıklar
      d.bits.forEach((b) => { g.globalAlpha = b.life; drawComp('tuz', cx + b.x, cy + 20 + b.y, 3); });
      g.globalAlpha = 1;
      // ısı dalgaları
      if (d.temp > 20) { g.strokeStyle = 'rgba(255,120,80,0.6)'; g.lineWidth = 3; for (let i = -1; i <= 1; i++) { g.beginPath(); const fx = cx + i * 40, fy = cy + th / 2 + 14; g.moveTo(fx - 8, fy + 8); g.quadraticCurveTo(fx - 12, fy, fx, fy - 6); g.quadraticCurveTo(fx + 12, fy - 12, fx + 8, fy - 18); g.stroke(); } }
      // süre ve ilerleme
      const bw = tw;
      rr(cx - bw / 2, cy - th / 2 - 36, bw, 12, 6, '#1d2749'); rr(cx - bw / 2, cy - th / 2 - 36, bw * Math.max(0, d.time / 15), 12, 6, d.time < 5 ? '#ff5d6c' : '#ffb347');
      rr(cx - bw / 2, cy - th / 2 - 18, bw, 12, 6, '#1d2749'); rr(cx - bw / 2, cy - th / 2 - 18, bw * d.progress, 12, 6, '#5ee87a');
      g.fillStyle = '#eef2ff'; g.font = '900 13px Nunito'; g.textAlign = 'left';
      g.fillText(`Süre ${Math.max(0, d.time).toFixed(1)} s`, cx - bw / 2, cy - th / 2 - 42);
      g.textAlign = 'right'; g.fillText(`Çözünme %${Math.round(d.progress * 100)}`, cx + bw / 2, cy - th / 2 - 42);
    };

    const draw = (now) => {
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      fit();
      g.fillStyle = '#0a0f24'; g.fillRect(0, 0, W, H);
      if (level.type === 'dissolve') drawDissolve(dt); else drawLine(dt);
      raf = requestAnimationFrame(draw);
    };

    /* ---------- olaylar ---------- */
    canvas.addEventListener('pointerdown', (e) => {
      const r = canvas.getBoundingClientRect();
      if (level.type === 'line') onTapLine(e.clientX - r.left, e.clientY - r.top);
    });
    clearBtn.addEventListener('click', () => { if (sim && !sim.finished) return; sim = null; solved = false; placed.fill(null); runBtn.textContent = 'Çalıştır ▶'; runBtn.className = 'btn orange small'; runBtn.disabled = false; say('Hat temizlendi.'); sfx.click(); });
    runBtn.addEventListener('click', () => {
      sfx.click();
      if (level.type === 'dissolve') {
        if (solved) { next(); return; }
        loadLevel(); return; // yeniden başlat
      }
      if (solved) { next(); return; }
      if (sim?.finished) { sim = null; runBtn.textContent = 'Çalıştır ▶'; say('Hattı düzenle ve tekrar çalıştır.'); return; }
      runLine();
    });
    const next = () => {
      onLevelDone?.(li);
      li += 1;
      if (li >= levels.length) { cancelAnimationFrame(raf); div.remove(); resolve(); return; }
      loadLevel();
    };

    // test kancası
    window.__factory = {
      get level() { return level; }, get placed() { return placed; }, get solved() { return solved; }, get sim() { return sim; }, get diss() { return diss; },
      slotPos: (i) => { fit(); return P(slotA(i)); },
    };

    loadLevel();
    raf = requestAnimationFrame(draw);
  });
}

export { PALETTE_ALL };
