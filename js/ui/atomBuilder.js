import { sfx } from '../audio.js';
import { modal } from './modal.js';

const W = 640, H = 440;
const CX = 320, CY = 185;
const NUC_R = 58, ORB_R = 135;
const GOAL = { p: 2, n: 2, e: 2 };
const STYLE = {
  p: { color: '#ff5d6c', text: '+', name: 'proton' },
  n: { color: '#aab2c8', text: '', name: 'nötron' },
  e: { color: '#3ee8ff', text: '−', name: 'elektron' },
};
const NUC_SLOTS = [[-16, -14], [16, -14], [-16, 16], [16, 16], [0, 0], [0, -30], [0, 30]];

/** 2D atom kurma bulmacası (Prolog). Helyum tamamlanınca çözülür. */
export function openAtomBuilder() {
  return new Promise((resolve) => {
    const card = modal.open();
    card.innerHTML = `
      <h2>Atom Modeli Konsolu</h2>
      <div class="hint">Dr. Elif'in modeli bir <b>Helyum</b> atomu. Parçacıkları sürükle: çekirdeğe <b>2 proton + 2 nötron</b>, yörüngeye <b>2 elektron</b>.</div>
      <canvas id="ab-canvas" width="${W}" height="${H}"></canvas>
      <div class="status" id="ab-status"><div class="mini">🤖</div><span>Önce bir parçacığı tut ve sürükle.</span></div>
      <div class="modal-foot"><span class="hint" id="ab-count"></span><button class="btn hidden" id="ab-done">Modeli Kaydet ✓</button></div>
    `;
    const canvas = card.querySelector('#ab-canvas');
    const status = card.querySelector('#ab-status');
    const countEl = card.querySelector('#ab-count');
    const doneBtn = card.querySelector('#ab-done');
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = W * dpr; canvas.height = H * dpr;
    canvas.style.aspectRatio = `${W}/${H}`;
    const g = canvas.getContext('2d');
    g.scale(dpr, dpr);

    const particles = [];
    const trayX = { p: 70, n: 320, e: 570 };
    ['p', 'n', 'e'].forEach((type) => {
      for (let i = 0; i < 3; i++) {
        const hx = trayX[type] + (i - 1) * 46, hy = 395;
        particles.push({ type, x: hx, y: hy, hx, hy, zone: null, angle: 0, drag: false });
      }
    });
    let dragging = null, off = { x: 0, y: 0 }, solved = false, raf = 0, last = performance.now();

    const say = (text, cls = '') => { status.className = 'status ' + cls; status.querySelector('span').textContent = text; };
    const counts = () => {
      const c = { p: 0, n: 0, e: 0 };
      particles.forEach((q) => { if (q.zone) c[q.type] += 1; });
      return c;
    };
    const refreshCount = () => {
      const c = counts();
      countEl.textContent = `Çekirdek: ${c.p} proton, ${c.n} nötron · Yörünge: ${c.e} elektron`;
    };

    const toLocal = (e) => {
      const r = canvas.getBoundingClientRect();
      return { x: (e.clientX - r.left) / r.width * W, y: (e.clientY - r.top) / r.height * H };
    };

    const layoutNucleus = () => {
      const inNuc = particles.filter((q) => q.zone === 'nucleus');
      inNuc.forEach((q, i) => { const s = NUC_SLOTS[i % NUC_SLOTS.length]; q.x = CX + s[0]; q.y = CY + s[1]; });
    };

    const check = () => {
      const c = counts();
      if (c.p === GOAL.p && c.n === GOAL.n && c.e === GOAL.e) {
        solved = true;
        say('Helyum atomu! Çekirdekte 2 proton ve 2 nötron, yörüngede 2 elektron. Model kararlı.', 'ok');
        doneBtn.classList.remove('hidden');
        sfx.success();
      } else if (c.p > 2) {
        say(`${c.p} proton bu atomu Helyum değil ${c.p === 3 ? 'Lityum' : 'başka bir element'} yapar. Proton sayısı elementi belirler!`, 'bad');
      } else if (c.e > 2) {
        say('Fazla elektron! Helyumun 2 protonu 2 elektronla dengelenir.', 'bad');
      } else if (c.n > 2) {
        say('Fazla nötron atomu ağırlaştırır (izotop). Helyum için 2 nötron yeter.', 'bad');
      }
    };

    const onDown = (e) => {
      if (solved) return;
      const m = toLocal(e);
      for (let i = particles.length - 1; i >= 0; i--) {
        const q = particles[i];
        if (Math.hypot(m.x - q.x, m.y - q.y) < 24) {
          dragging = q; q.drag = true; q.zone = null; off = { x: q.x - m.x, y: q.y - m.y };
          particles.splice(i, 1); particles.push(q);
          layoutNucleus();
          canvas.setPointerCapture(e.pointerId);
          sfx.click();
          return;
        }
      }
    };
    const onMove = (e) => {
      if (!dragging) return;
      const m = toLocal(e);
      dragging.x = m.x + off.x; dragging.y = m.y + off.y;
    };
    const onUp = () => {
      if (!dragging) return;
      const q = dragging; dragging = null; q.drag = false;
      const d = Math.hypot(q.x - CX, q.y - CY);
      let zone = null;
      if (d <= NUC_R + 22) zone = 'nucleus';
      else if (Math.abs(d - ORB_R) <= 40) zone = 'orbit';
      if (zone === 'nucleus' && q.type === 'e') {
        say('Elektronlar çekirdekte durmaz! Onlar çekirdeğin çevresindeki katmanlarda döner.', 'bad');
        sfx.fail(); q.x = q.hx; q.y = q.hy; zone = null;
      } else if (zone === 'orbit' && q.type !== 'e') {
        say(`${STYLE[q.type].name[0].toUpperCase() + STYLE[q.type].name.slice(1)} yörüngede dönmez. Proton ve nötron çekirdeğin içinde oturur.`, 'bad');
        sfx.fail(); q.x = q.hx; q.y = q.hy; zone = null;
      } else if (!zone) {
        q.x = q.hx; q.y = q.hy;
      } else {
        q.zone = zone;
        if (zone === 'orbit') q.angle = Math.atan2(q.y - CY, q.x - CX);
        sfx.collect();
        say(zone === 'nucleus' ? 'Çekirdeğe yerleşti.' : 'Yörüngeye yerleşti.');
      }
      layoutNucleus();
      refreshCount();
      check();
    };
    canvas.addEventListener('pointerdown', onDown);
    canvas.addEventListener('pointermove', onMove);
    canvas.addEventListener('pointerup', onUp);
    canvas.addEventListener('pointercancel', onUp);

    const draw = (now) => {
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      g.clearRect(0, 0, W, H);
      // arka plan ızgarası
      g.fillStyle = '#0a0f24'; g.fillRect(0, 0, W, H);
      g.strokeStyle = 'rgba(62,232,255,0.06)'; g.lineWidth = 1;
      for (let x = 0; x < W; x += 32) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, H); g.stroke(); }
      for (let y = 0; y < H; y += 32) { g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke(); }
      // yörünge
      g.setLineDash([8, 8]); g.strokeStyle = 'rgba(62,232,255,0.5)'; g.lineWidth = 3;
      g.beginPath(); g.arc(CX, CY, ORB_R, 0, Math.PI * 2); g.stroke(); g.setLineDash([]);
      g.fillStyle = 'rgba(62,232,255,0.7)'; g.font = '800 13px Nunito'; g.textAlign = 'center';
      g.fillText('YÖRÜNGE', CX, CY - ORB_R - 12);
      // çekirdek
      const grad = g.createRadialGradient(CX, CY, 10, CX, CY, NUC_R + 20);
      grad.addColorStop(0, 'rgba(255,93,108,0.35)'); grad.addColorStop(1, 'rgba(255,93,108,0)');
      g.fillStyle = grad; g.beginPath(); g.arc(CX, CY, NUC_R + 20, 0, Math.PI * 2); g.fill();
      g.strokeStyle = 'rgba(255,93,108,0.6)'; g.lineWidth = 2; g.setLineDash([4, 6]);
      g.beginPath(); g.arc(CX, CY, NUC_R, 0, Math.PI * 2); g.stroke(); g.setLineDash([]);
      g.fillStyle = 'rgba(255,93,108,0.8)'; g.fillText('ÇEKİRDEK', CX, CY + NUC_R + 20);
      // tepsi
      g.fillStyle = 'rgba(255,255,255,0.05)'; g.beginPath(); g.roundRect(16, 360, W - 32, 70, 16); g.fill();
      g.fillStyle = '#9aa6d1'; g.font = '800 12px Nunito';
      g.fillText('PROTON (+)', trayX.p, 372); g.fillText('NÖTRON (0)', trayX.n, 372); g.fillText('ELEKTRON (−)', trayX.e, 372);
      // yörüngedeki elektronlar döner
      particles.forEach((q) => {
        if (q.zone === 'orbit' && !q.drag) { q.angle += dt * 1.2; q.x = CX + Math.cos(q.angle) * ORB_R; q.y = CY + Math.sin(q.angle) * ORB_R; }
      });
      // parçacıklar
      particles.forEach((q) => {
        const s = STYLE[q.type];
        const r = q.type === 'e' ? 13 : 20;
        g.shadowColor = s.color; g.shadowBlur = q.drag ? 24 : 10;
        g.fillStyle = s.color; g.beginPath(); g.arc(q.x, q.y, r, 0, Math.PI * 2); g.fill();
        g.shadowBlur = 0;
        g.fillStyle = q.type === 'n' ? '#2b3352' : '#111'; g.font = `900 ${r}px Nunito`; g.textAlign = 'center'; g.textBaseline = 'middle';
        g.fillText(s.text, q.x, q.y + 1);
        g.textBaseline = 'alphabetic';
      });
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    refreshCount();

    doneBtn.addEventListener('click', () => {
      cancelAnimationFrame(raf);
      modal.close();
      resolve();
    });
  });
}
