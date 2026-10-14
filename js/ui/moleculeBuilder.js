import { sfx } from '../audio.js';
import { modal } from './modal.js';

const W = 640, H = 440;
const CH = { x: 400, y: 190, r: 125 }; // sentez odası
const TRAY = { H: { x: 90, y: 130 }, O: { x: 90, y: 280 } };
const STYLE = { H: { color: '#f4f6ff', r: 22, text: '#111' }, O: { color: '#ff5d5d', r: 28, text: '#111' } };
const SUB = ['₀', '₁', '₂', '₃', '₄', '₅', '₆', '₇', '₈', '₉'];
const sub = (n) => (n <= 1 ? '' : String(n).split('').map((d) => SUB[+d]).join(''));

export function formula(h, o) {
  if (!h && !o) return '—';
  return (h ? 'H' + sub(h) : '') + (o ? 'O' + sub(o) : '');
}

/** Sonuç yorumu: {ok, text} */
export function judge(h, o) {
  if (h === 2 && o === 1) return { ok: true, text: 'H₂O! 2 hidrojen + 1 oksijen = su. Bir bileşik doğdu.' };
  if (h === 0 && o === 0) return { ok: false, text: 'Sentez odası boş. Tepsiden atom sürükle.' };
  if (h === 2 && o === 2) return { ok: false, text: 'H₂O₂ hidrojen peroksit! Saç açıcı yapar, nehir doldurmaz. Tek fazla oksijen maddeyi değiştirdi.' };
  if (o === 0 && h === 2) return { ok: false, text: 'H₂ hidrojen gazı. Tek cins atom = element, bileşik değil. Oksijen lazım.' };
  if (h === 0 && o === 2) return { ok: false, text: 'O₂ oksijen gazı. Nefes almak için süper, ama bu su değil.' };
  if (h === 1 && o === 1) return { ok: false, text: 'HO kararsız, anında dağıldı. Oksijen iki el ister: iki hidrojen!' };
  if (h === 4 && o === 2) return { ok: false, text: 'Bu 2 su molekülü olabilirdi ama oda tek seferde bir molekül kurar. 2 H + 1 O koy.' };
  if (o === 0 || h === 0) return { ok: false, text: 'Tek cins atomla bileşik olmaz. Su için hem H hem O gerekir.' };
  return { ok: false, text: `${formula(h, o)} suya dönüşmüyor. Su her zaman 2 H + 1 O oranındadır.` };
}

/**
 * 2D su sentezleyici. inventory {H,O} doğrudan güncellenir.
 * Dönüş: Promise<{built}>
 */
export function openMoleculeBuilder({ inventory, need, built = 0, onBuilt }) {
  return new Promise((resolve) => {
    const card = modal.open();
    card.innerHTML = `
      <h2>Su Sentezleyici</h2>
      <div class="hint">Tepsiden atomları <b>sentez odasına</b> sürükle, sonra <b>Birleştir</b>. Odadaki bir atoma dokunursan tepsiye döner.</div>
      <canvas id="mb-canvas" width="${W}" height="${H}"></canvas>
      <div class="status" id="mb-status"><div class="mini">🤖</div><span>Nehir için su lazım. Su molekülünün tarifi sende: 2 H + 1 O.</span></div>
      <div class="modal-foot">
        <span class="hint" id="mb-progress"></span>
        <span class="row">
          <button class="btn secondary small" id="mb-exit">Çık</button>
          <button class="btn orange small" id="mb-build">Birleştir ⚡</button>
        </span>
      </div>
    `;
    const canvas = card.querySelector('#mb-canvas');
    const status = card.querySelector('#mb-status');
    const progress = card.querySelector('#mb-progress');
    const buildBtn = card.querySelector('#mb-build');
    const exitBtn = card.querySelector('#mb-exit');
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = W * dpr; canvas.height = H * dpr;
    canvas.style.aspectRatio = `${W}/${H}`;
    const g = canvas.getContext('2d');
    g.scale(dpr, dpr);

    const chamber = []; // {sym,x,y,tx,ty}
    let drag = null;    // {sym,x,y}
    let anim = null;    // başarı animasyonu
    let raf = 0, last = performance.now();
    let busy = false;

    const say = (t, cls = '') => { status.className = 'status ' + cls; status.querySelector('span').textContent = t; };
    const refresh = () => { progress.textContent = `Su molekülü: ${built} / ${need}`; };
    const toLocal = (e) => { const r = canvas.getBoundingClientRect(); return { x: (e.clientX - r.left) / r.width * W, y: (e.clientY - r.top) / r.height * H }; };
    const counts = () => chamber.reduce((c, a) => (c[a.sym]++, c), { H: 0, O: 0 });

    const layout = () => {
      const n = chamber.length;
      chamber.forEach((a, i) => {
        if (n === 1) { a.tx = CH.x; a.ty = CH.y; return; }
        const ang = -Math.PI / 2 + (i / n) * Math.PI * 2;
        const rr = Math.min(70, 30 + n * 10);
        a.tx = CH.x + Math.cos(ang) * rr; a.ty = CH.y + Math.sin(ang) * rr;
      });
    };

    const onDown = (e) => {
      if (busy) return;
      const m = toLocal(e);
      // odadaki atoma dokunma → tepsiye dön
      for (let i = chamber.length - 1; i >= 0; i--) {
        const a = chamber[i];
        if (Math.hypot(m.x - a.x, m.y - a.y) < STYLE[a.sym].r + 6) {
          chamber.splice(i, 1); inventory[a.sym] += 1; layout(); sfx.click(); return;
        }
      }
      for (const sym of ['H', 'O']) {
        const t = TRAY[sym];
        if (Math.hypot(m.x - t.x, m.y - t.y) < 44) {
          if (inventory[sym] <= 0) { say(`${sym} atomun kalmadı. Haritada daha fazlasını topla.`, 'bad'); sfx.fail(); return; }
          inventory[sym] -= 1;
          drag = { sym, x: m.x, y: m.y };
          canvas.setPointerCapture(e.pointerId);
          sfx.click();
          return;
        }
      }
    };
    const onMove = (e) => { if (drag) { const m = toLocal(e); drag.x = m.x; drag.y = m.y; } };
    const onUp = () => {
      if (!drag) return;
      const d = Math.hypot(drag.x - CH.x, drag.y - CH.y);
      if (d < CH.r + 10) {
        chamber.push({ sym: drag.sym, x: drag.x, y: drag.y, tx: drag.x, ty: drag.y });
        layout(); sfx.collect();
        const c = counts();
        say(`Odada: ${formula(c.H, c.O)}`);
      } else {
        inventory[drag.sym] += 1;
      }
      drag = null;
    };
    canvas.addEventListener('pointerdown', onDown);
    canvas.addEventListener('pointermove', onMove);
    canvas.addEventListener('pointerup', onUp);
    canvas.addEventListener('pointercancel', onUp);

    buildBtn.addEventListener('click', () => {
      if (busy) return;
      const c = counts();
      const res = judge(c.H, c.O);
      say(res.text, res.ok ? 'ok' : 'bad');
      if (!res.ok) {
        sfx.fail();
        // atomlar dağılır ve tepsiye döner
        busy = true;
        anim = { kind: 'scatter', t: 0 };
        setTimeout(() => {
          chamber.forEach((a) => (inventory[a.sym] += 1));
          chamber.length = 0; anim = null; busy = false;
        }, 700);
        return;
      }
      sfx.water();
      busy = true;
      anim = { kind: 'water', t: 0 };
      // H–O–H düzeni (104,5°)
      const o = chamber.find((a) => a.sym === 'O'); const hs = chamber.filter((a) => a.sym === 'H');
      o.tx = CH.x; o.ty = CH.y - 10;
      const half = (104.5 / 2) * Math.PI / 180;
      hs[0].tx = CH.x - Math.sin(half) * 62; hs[0].ty = CH.y - 10 + Math.cos(half) * 62;
      hs[1].tx = CH.x + Math.sin(half) * 62; hs[1].ty = CH.y - 10 + Math.cos(half) * 62;
      setTimeout(() => {
        built += 1; refresh(); onBuilt?.(built);
        chamber.length = 0; anim = null; busy = false;
        if (built >= need) {
          say('Yeterli su sentezlendi! Reaktör vanaları açılıyor.', 'ok');
          sfx.success();
          buildBtn.classList.add('hidden');
          exitBtn.textContent = 'Nehre Dön →'; exitBtn.className = 'btn small';
        } else {
          say(`Harika, ${built}. molekül hazır. ${need - built} tane daha lazım.`, 'ok');
        }
      }, 1300);
    });

    const close = () => {
      cancelAnimationFrame(raf);
      chamber.forEach((a) => (inventory[a.sym] += 1));
      if (drag) inventory[drag.sym] += 1;
      modal.close();
      resolve({ built });
    };
    exitBtn.addEventListener('click', close);

    const drawAtom = (sym, x, y, glow = false) => {
      const s = STYLE[sym];
      g.shadowColor = s.color; g.shadowBlur = glow ? 26 : 10;
      g.fillStyle = s.color; g.beginPath(); g.arc(x, y, s.r, 0, Math.PI * 2); g.fill();
      g.shadowBlur = 0;
      g.fillStyle = s.text; g.font = `900 ${s.r}px Nunito`; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText(sym, x, y + 1); g.textBaseline = 'alphabetic';
    };

    const draw = (now) => {
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      g.fillStyle = '#0a0f24'; g.fillRect(0, 0, W, H);
      // tepsi
      g.fillStyle = 'rgba(255,255,255,0.05)'; g.beginPath(); g.roundRect(16, 40, 150, 330, 16); g.fill();
      g.fillStyle = '#9aa6d1'; g.font = '800 13px Nunito'; g.textAlign = 'center'; g.fillText('ATOM TEPSİSİ', 91, 66);
      for (const sym of ['H', 'O']) {
        const t = TRAY[sym];
        drawAtom(sym, t.x, t.y);
        g.fillStyle = inventory[sym] > 0 ? '#fff' : '#ff5d6c'; g.font = '900 18px Nunito';
        g.fillText(`× ${inventory[sym]}`, t.x, t.y + 54);
      }
      // sentez odası
      const pulse = 0.5 + Math.sin(now / 400) * 0.15;
      const grad = g.createRadialGradient(CH.x, CH.y, 20, CH.x, CH.y, CH.r);
      grad.addColorStop(0, `rgba(62,232,255,${anim?.kind === 'water' ? 0.35 : 0.12})`); grad.addColorStop(1, 'rgba(62,232,255,0)');
      g.fillStyle = grad; g.beginPath(); g.arc(CH.x, CH.y, CH.r, 0, Math.PI * 2); g.fill();
      g.strokeStyle = `rgba(62,232,255,${pulse})`; g.lineWidth = 3; g.setLineDash([10, 8]);
      g.beginPath(); g.arc(CH.x, CH.y, CH.r, 0, Math.PI * 2); g.stroke(); g.setLineDash([]);
      g.fillStyle = 'rgba(62,232,255,0.8)'; g.font = '800 13px Nunito'; g.fillText('SENTEZ ODASI', CH.x, CH.y - CH.r - 10);
      const c = counts();
      g.fillStyle = '#fff'; g.font = '900 26px Nunito'; g.fillText(formula(c.H, c.O) + (anim?.kind === 'water' ? '  ✓' : ''), CH.x, CH.y + CH.r + 36);

      // atomları hedefe yumuşat
      if (anim) anim.t += dt;
      chamber.forEach((a, i) => {
        if (anim?.kind === 'scatter') { a.tx += (a.x - CH.x) * dt * 4; a.ty += (a.y - CH.y) * dt * 4; }
        a.x += (a.tx - a.x) * Math.min(1, dt * 8); a.y += (a.ty - a.y) * Math.min(1, dt * 8);
      });
      if (anim?.kind === 'water') {
        const o = chamber.find((a) => a.sym === 'O');
        g.strokeStyle = '#fff'; g.lineWidth = 5;
        chamber.filter((a) => a.sym === 'H').forEach((h) => { g.beginPath(); g.moveTo(o.x, o.y); g.lineTo(h.x, h.y); g.stroke(); });
        g.fillStyle = '#3ee8ff'; g.font = '800 14px Nunito'; g.fillText('104,5°', o.x, o.y + 60);
      }
      chamber.forEach((a) => drawAtom(a.sym, a.x, a.y, anim?.kind === 'water'));
      if (drag) drawAtom(drag.sym, drag.x, drag.y, true);
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    refresh();
  });
}
