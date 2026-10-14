import { sfx } from '../audio.js';
import { modal } from './modal.js';

const SUB = ['₀', '₁', '₂', '₃', '₄', '₅', '₆', '₇', '₈', '₉'];
export const pretty = (f) => f.replace(/\d/g, (d) => SUB[+d]);
const ELEMENT_COLORS = { H: '#f4f6ff', O: '#ff5d5d', N: '#5d8bff', C: '#4a4f63', Mg: '#7fe04a', Fe: '#ffb347', Na: '#9b5cff', Cl: '#5ee87a' };

/** 'CH4' → {C:1,H:4} */
export function parseFormula(f) {
  const out = {};
  for (const m of f.matchAll(/([A-Z][a-z]?)(\d*)/g)) out[m[1]] = (out[m[1]] || 0) + (m[2] ? +m[2] : 1);
  return out;
}
/** Katsayılarla toplam atom sayıları. */
export function countSide(formulas, coefs) {
  const tot = {};
  formulas.forEach((f, i) => { const p = parseFormula(f); for (const [el, n] of Object.entries(p)) tot[el] = (tot[el] || 0) + n * coefs[i]; });
  return tot;
}
export function isBalanced(eq, coefs) {
  const L = countSide(eq.left, coefs.slice(0, eq.left.length));
  const R = countSide(eq.right, coefs.slice(eq.left.length));
  const els = new Set([...Object.keys(L), ...Object.keys(R)]);
  for (const el of els) if ((L[el] || 0) !== (R[el] || 0)) return { ok: false, el, l: L[el] || 0, r: R[el] || 0 };
  return { ok: true };
}

export const EQUATIONS = [
  { left: ['Mg', 'O2'], right: ['MgO'], answer: [2, 1, 2], name: 'Magnezyum yanması', story: 'Isınma kemerini yakıyorum! Magnezyum + oksijen → magnezyum oksit. Dengele bakalım.' },
  { left: ['H2', 'O2'], right: ['H2O'], answer: [2, 1, 2], name: 'Su sentezi', story: 'Ordu\'da su yaptın, hatırlıyor musun? Peki kaç hidrojen, kaç oksijen molekülü? Terazi şaşmaz.' },
  { left: ['N2', 'H2'], right: ['NH3'], answer: [1, 3, 2], name: 'Amonyak sentezi', story: 'Konya\'daki gübre fabrikası. Azot inatçıdır: ikili gezer. Hadi, dengele.' },
  { left: ['CH4', 'O2'], right: ['CO2', 'H2O'], answer: [1, 2, 1, 2], name: 'Metan yanması', story: 'Zonguldak\'ın yakıtı. Metan yanınca ne çıkar? Karbon da hidrojen de korunur. Son denklem, küçük simyacı!' },
];

/**
 * Tepkime terazisi. Çözüm: {success:true, attempts} ya da kalp bitince {success:false}.
 */
export function openBalance(eq, { hearts = 3, onWrong } = {}) {
  return new Promise((resolve) => {
    const card = modal.open();
    const n = eq.left.length + eq.right.length;
    const coefs = Array(n).fill(1);
    let attempts = 0, solved = false, raf = 0, tilt = 0, glow = 0;
    const W = 640, H = 300;
    const termHtml = (f, i) => `<div class="bl-term"><div class="bl-coef"><button data-i="${i}" data-d="-1">−</button><b id="bl-c${i}">1</b><button data-i="${i}" data-d="1">+</button></div><div class="bl-formula">${pretty(f)}</div></div>`;
    card.innerHTML = `
      <h2>Tepkime Terazisi</h2>
      <div class="hint">${eq.name}. Her elementin giren atom sayısı çıkan atom sayısına eşit olmalı: <b>kütle korunur</b>. Katsayıları ayarla.</div>
      <canvas id="bl-canvas" width="${W}" height="${H}"></canvas>
      <div class="bl-eq">${eq.left.map(termHtml).join('<span class="bl-plus">+</span>')}<span class="bl-arrow">→</span>${eq.right.map((f, k) => termHtml(f, eq.left.length + k)).join('<span class="bl-plus">+</span>')}</div>
      <div class="status" id="bl-status"><div class="mini">🤖</div><span>Önce atomları say: sol kefe girenler, sağ kefe ürünler.</span></div>
      <div class="modal-foot"><span class="hint" id="bl-hearts"></span><button class="btn orange small" id="bl-check">Dengele! ⚖️</button></div>
    `;
    const canvas = card.querySelector('#bl-canvas'), g = canvas.getContext('2d');
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = W * dpr; canvas.height = H * dpr; canvas.style.aspectRatio = `${W}/${H}`; g.scale(dpr, dpr);
    const status = card.querySelector('#bl-status'), heartsEl = card.querySelector('#bl-hearts'), checkBtn = card.querySelector('#bl-check');
    const say = (t, cls = '') => { status.className = 'status ' + cls; status.querySelector('span').textContent = t; };
    const drawHearts = () => { heartsEl.textContent = 'Kalkan: ' + '❤️'.repeat(hearts) + '🖤'.repeat(Math.max(0, 3 - hearts)); };
    drawHearts();

    card.querySelectorAll('.bl-coef button').forEach((b) => b.addEventListener('click', () => {
      if (solved) return;
      const i = +b.dataset.i, d = +b.dataset.d;
      coefs[i] = Math.max(1, Math.min(6, coefs[i] + d));
      card.querySelector(`#bl-c${i}`).textContent = coefs[i];
      sfx.click();
    }));

    const counts = () => ({ L: countSide(eq.left, coefs.slice(0, eq.left.length)), R: countSide(eq.right, coefs.slice(eq.left.length)) });
    const drawPan = (cx, cy, tot, title) => {
      g.strokeStyle = '#9aa6d1'; g.lineWidth = 3; g.beginPath(); g.moveTo(cx - 70, cy); g.lineTo(cx + 70, cy); g.stroke();
      g.fillStyle = '#9aa6d1'; g.font = '800 12px Nunito'; g.textAlign = 'center'; g.fillText(title, cx, cy + 18);
      const els = Object.keys(tot); let k = 0;
      els.forEach((el) => {
        for (let j = 0; j < tot[el]; j++) {
          const col = Math.floor(k / 4), row = k % 4; k++;
          const x = cx - 56 + row * 36 + (col % 2) * 10, y = cy - 14 - col * 22;
          g.fillStyle = ELEMENT_COLORS[el] || '#ccc'; g.strokeStyle = 'rgba(0,0,0,.4)'; g.beginPath(); g.arc(x, y, 11, 0, Math.PI * 2); g.fill(); g.stroke();
          g.fillStyle = el === 'H' || el === 'Mg' || el === 'Cl' ? '#111' : '#fff'; g.font = '900 11px Nunito'; g.textBaseline = 'middle'; g.fillText(el, x, y + 1); g.textBaseline = 'alphabetic';
        }
      });
    };
    const draw = () => {
      const { L, R } = counts();
      const lTot = Object.values(L).reduce((a, b) => a + b, 0), rTot = Object.values(R).reduce((a, b) => a + b, 0);
      const target = solved ? 0 : Math.max(-0.25, Math.min(0.25, (rTot - lTot) * 0.05));
      tilt += (target - tilt) * 0.1; glow = Math.max(0, glow - 0.02);
      g.fillStyle = '#0a0f24'; g.fillRect(0, 0, W, H);
      // kaide
      g.fillStyle = '#2b3764'; g.beginPath(); g.moveTo(W / 2 - 30, H - 20); g.lineTo(W / 2 + 30, H - 20); g.lineTo(W / 2, 110); g.closePath(); g.fill();
      // kiriş
      g.save(); g.translate(W / 2, 110); g.rotate(tilt);
      g.strokeStyle = solved ? '#5ee87a' : '#eef2ff'; g.lineWidth = 8; g.lineCap = 'round'; g.beginPath(); g.moveTo(-210, 0); g.lineTo(210, 0); g.stroke();
      g.strokeStyle = '#9aa6d1'; g.lineWidth = 2;
      [[-210, 1], [210, 1]].forEach(([x]) => { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, 70); g.stroke(); });
      g.restore();
      const lx = W / 2 - 210 * Math.cos(tilt), ly = 110 + 70 - 210 * Math.sin(tilt);
      const rx = W / 2 + 210 * Math.cos(tilt), ry = 110 + 70 + 210 * Math.sin(tilt);
      drawPan(lx, ly, L, 'GİRENLER'); drawPan(rx, ry, R, 'ÜRÜNLER');
      // element tablosu
      const els = [...new Set([...Object.keys(L), ...Object.keys(R)])];
      g.font = '900 14px Nunito'; g.textAlign = 'center';
      els.forEach((el, i) => {
        const x = W / 2 + (i - (els.length - 1) / 2) * 110, y = 30;
        const eqv = (L[el] || 0) === (R[el] || 0);
        g.fillStyle = eqv ? '#5ee87a' : '#ff5d6c';
        g.fillText(`${el}: ${L[el] || 0} ${eqv ? '=' : '≠'} ${R[el] || 0}`, x, y);
      });
      if (glow > 0) { g.fillStyle = `rgba(94,232,122,${glow * 0.35})`; g.fillRect(0, 0, W, H); }
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);

    checkBtn.addEventListener('click', () => {
      if (solved) { cancelAnimationFrame(raf); modal.close(); resolve({ success: true, attempts }); return; }
      attempts += 1;
      const r = isBalanced(eq, coefs);
      if (r.ok) {
        solved = true; glow = 1; sfx.success();
        const minimal = coefs.every((c, i) => c === eq.answer[i]);
        say(`Dengede! ${minimal ? 'Hem de en küçük katsayılarla.' : `Doğru ama daha küçük katsayılar da var: ${eq.answer.join(', ')}.`} Giren atom sayısı = çıkan atom sayısı: kütle korundu.`, 'ok');
        checkBtn.textContent = 'Saldır! ⚡'; checkBtn.className = 'btn small';
      } else {
        hearts -= 1; drawHearts(); sfx.fail(); onWrong?.(hearts);
        say(`${r.el} dengede değil: girenlerde ${r.l}, ürünlerde ${r.r}. Atomlar yoktan var olmaz, vardan yok olmaz.`, 'bad');
        if (hearts <= 0) { cancelAnimationFrame(raf); modal.close(); resolve({ success: false, attempts }); }
      }
    });
  });
}
