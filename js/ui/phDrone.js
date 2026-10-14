import { sfx } from '../audio.js';
import { hud } from './hud.js';
import { dialog } from './dialog.js';

/* Kırmızı lahana suyu indikatör renkleri, pH 0..14 */
export const PH_COLORS = ['#ff1f1f', '#ff3a3a', '#ff5a5a', '#ff6bb0', '#e66bff', '#b36bff', '#8f7bff', '#7a5cff', '#5f8cff', '#3fc3d8', '#3fd68a', '#7fe04a', '#c8e03a', '#f0dc2a', '#ffd400'];
export const isNeutral = (ph) => ph >= 6 && ph <= 8;
const NH3_MAX = 8, ACID_MAX = 4;

export const WAVES = [
  {
    name: '1. Gün: Tarama ve Nötrleme', cols: 8, rows: 5, clouds: 0,
    acid: [[1, 1, 4], [2, 3, 3], [5, 1, 5], [6, 3, 4], [3, 2, 2], [4, 4, 5]], base: [],
    brief: 'Tarlayı tara: lahana suyu asidik toprağı kırmızıya boyar. Kırmızı karenin üstünde amonyak (baz) bırak: E tuşu ya da 🧪. Sirke için Boşluk ya da 🍋. pH 6-8 olunca mor, yani nötr. Tanklar sol alttaki DEPO’da dolar.',
  },
  {
    name: '2. Gün: Asit Yağmuru', cols: 10, rows: 6, clouds: 2,
    acidRandom: 9, base: [[7, 1, 10], [2, 4, 11]],
    brief: 'Bulutlar geliyor! Altlarındaki toprağı asitlendirirler. Bulutun altında amonyak bırakırsan bulut nötrleşir. Dikkat: bazı kareler fazla BAZİK (yeşil-sarı), onlara sirke lazım.',
  },
  {
    name: '3. Gün: Sızıntı', cols: 10, rows: 6, clouds: 3,
    acidRandom: 8, base: [[8, 4, 10], [1, 1, 12], [5, 0, 9]], boss: { x: 7, y: 3, hp: 5 },
    brief: 'A.N.T.İ. bir asit borusu patlatmış: çevresini sürekli asitliyor. Önce boruya 5 doz amonyak ver ve tıka, sonra tarlayı temizle.',
  },
];

/**
 * Üstten görünümlü pH drone oyunu. controls: Controls örneği (axis, consumeInteract=baz, consumeJump=asit).
 * Dönüş: Promise<{ neutralized }>
 */
export function openPhDrone({ controls, waves = WAVES, startWave = 0, onWaveDone } = {}) {
  return new Promise((resolve) => {
    const root = document.getElementById('screens');
    const div = document.createElement('div');
    div.className = 'screen drone';
    div.innerHTML = '<canvas id="ph-canvas"></canvas>';
    root.appendChild(div);
    const canvas = div.querySelector('#ph-canvas'), g = canvas.getContext('2d');
    let W = 0, H = 0, dpr = 1, raf = 0, last = performance.now();
    let wi = startWave, wave = null, tiles = [], clouds = [], puffs = [], boss = null;
    const drone = { x: 0, y: 0, vx: 0, vy: 0, nh3: NH3_MAX, acid: ACID_MAX, hearts: 3, stun: 0, rot: 0 };
    let paused = true, done = false, t = 0, refillT = 0, msg = null, msgT = 0, neutralizedTotal = 0;
    const pad = () => ({ x: 0, y: wave.rows - 1 });

    const fit = () => {
      const r = div.getBoundingClientRect();
      const w = Math.max(200, Math.floor(r.width)), h = Math.max(200, Math.floor(r.height));
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      if (w !== W || h !== H) { W = w; H = h; canvas.width = W * dpr; canvas.height = H * dpr; canvas.style.width = W + 'px'; canvas.style.height = H + 'px'; }
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    // tarla yerleşimi: üstte 64px HUD payı, altta 150px dokunmatik payı (mobilde)
    const coarse = matchMedia('(pointer: coarse)').matches;
    const hudTop = document.getElementById('hud-top');
    const layout = () => {
      const hb = hudTop.getBoundingClientRect();
      const top = Math.max(60, hb.bottom + 6), bottom = coarse ? 170 : 40, side = 12;
      const ts = Math.floor(Math.min((W - 2 * side) / wave.cols, (H - top - bottom - 40) / wave.rows));
      const ox = (W - ts * wave.cols) / 2, oy = top + 40 + (H - top - bottom - 40 - ts * wave.rows) / 2;
      return { ts, ox, oy };
    };

    const refreshInv = () => hud.setInventory({}, [
      { icon: '🧪', text: `${drone.nh3}` }, { icon: '🍋', text: `${drone.acid}` }, { icon: '❤️', text: drone.hearts },
    ]);
    const flash = (text, ms = 2200) => { msg = text; msgT = ms / 1000; };

    const loadWave = () => {
      wave = waves[wi];
      tiles = [];
      for (let r = 0; r < wave.rows; r++) { tiles.push([]); for (let c = 0; c < wave.cols; c++) tiles[r].push({ ph: 7, scanned: false, sprout: 0 }); }
      (wave.acid || []).forEach(([c, r, ph]) => (tiles[r][c].ph = ph));
      if (wave.acidRandom) {
        let n = 0, guard = 0;
        while (n < wave.acidRandom && guard++ < 500) {
          const c = Math.floor(Math.random() * wave.cols), r = Math.floor(Math.random() * wave.rows);
          if (tiles[r][c].ph === 7 && !(c === 0 && r === wave.rows - 1) && !(wave.boss && c === wave.boss.x && r === wave.boss.y)) { tiles[r][c].ph = 2 + Math.floor(Math.random() * 4); n++; }
        }
      }
      (wave.base || []).forEach(([c, r, ph]) => (tiles[r][c].ph = ph));
      boss = wave.boss ? { ...wave.boss, timer: 0, sealed: false } : null;
      clouds = [];
      for (let i = 0; i < (wave.clouds || 0); i++) spawnCloud();
      const p = pad(); drone.x = p.x; drone.y = p.y; drone.vx = drone.vy = 0; drone.stun = 0;
      drone.nh3 = NH3_MAX; drone.acid = ACID_MAX; drone.hearts = 3;
      refreshInv();
      lastRemaining = -1; updateObjective();
    };
    const spawnCloud = () => {
      const fromLeft = Math.random() < 0.5;
      const sp = 0.9 + wi * 0.35;
      clouds.push({ x: fromLeft ? -1 : wave.cols, y: Math.random() * (wave.rows - 1), vx: (fromLeft ? 1 : -1) * sp, vy: (Math.random() - 0.5) * 0.6, hp: 2, rain: 0, zap: 0 });
    };

    let lastRemaining = -1;
    const updateObjective = () => { const n = remaining(); if (n !== lastRemaining) { lastRemaining = n; hud.setObjective(`${wave.name} · Kirli kare: ${n}`); } };
    const remaining = () => { let n = 0; tiles.forEach((row) => row.forEach((tl) => { if (!isNeutral(tl.ph)) n++; })); return n; };
    const tileAt = (x, y) => { const c = Math.round(x), r = Math.round(y); return (r >= 0 && r < wave.rows && c >= 0 && c < wave.cols) ? { c, r, tl: tiles[r][c] } : null; };

    const dropBase = () => {
      if (drone.nh3 <= 0) { flash('Amonyak bitti! Depoya dön (sol alt).'); sfx.fail(); return; }
      drone.nh3--; refreshInv();
      const cl = clouds.find((c) => Math.hypot(c.x - drone.x, c.y - drone.y) < 0.9);
      puffs.push({ x: drone.x, y: drone.y, t: 0, color: '#3ee8ff' });
      if (cl) { cl.hp--; sfx.collect(); if (cl.hp <= 0) { clouds.splice(clouds.indexOf(cl), 1); flash('Bulut nötrleşti: asit + baz → tuz + su ☔→💧'); sfx.success(); } return; }
      if (boss && !boss.sealed && Math.hypot(boss.x - drone.x, boss.y - drone.y) < 0.8) {
        boss.hp--; sfx.hit();
        if (boss.hp <= 0) { boss.sealed = true; flash('Sızıntı tıkandı! Şimdi tarlayı temizle.'); sfx.success(); }
        else flash(`Boru nötrleniyor... ${boss.hp} doz kaldı.`);
        return;
      }
      const h = tileAt(drone.x, drone.y); if (!h) return;
      const before = h.tl.ph; h.tl.ph = Math.min(14, h.tl.ph + 2); h.tl.scanned = true;
      sfx.water();
      if (isNeutral(h.tl.ph)) { flash(`pH ${before} → ${h.tl.ph}: nötr! Toprak mor.`); }
      else if (h.tl.ph > 8) flash(`pH ${before} → ${h.tl.ph}: fazla baz! Toprak bazik oldu, sirke gerek.`);
      else flash(`pH ${before} → ${h.tl.ph}: hâlâ asidik, bir doz daha.`);
    };
    const dropAcid = () => {
      if (drone.acid <= 0) { flash('Sirke bitti! Depoya dön.'); sfx.fail(); return; }
      drone.acid--; refreshInv();
      puffs.push({ x: drone.x, y: drone.y, t: 0, color: '#ffd84a' });
      const h = tileAt(drone.x, drone.y); if (!h) return;
      const before = h.tl.ph; h.tl.ph = Math.max(0, h.tl.ph - 2); h.tl.scanned = true;
      sfx.water();
      if (isNeutral(h.tl.ph)) flash(`pH ${before} → ${h.tl.ph}: nötr!`);
      else if (h.tl.ph < 6) flash(`pH ${before} → ${h.tl.ph}: fazla asit! Amonyakla düzelt.`);
      else flash(`pH ${before} → ${h.tl.ph}: hâlâ bazik, bir doz daha.`);
    };

    const hurt = async () => {
      drone.hearts--; refreshInv(); sfx.hit();
      drone.stun = 1.2; const p = pad(); drone.x = p.x; drone.y = p.y; drone.vx = drone.vy = 0;
      if (drone.hearts <= 0) {
        paused = true;
        await dialog.say('anti', 'Zzzt! Drone\'un asit yağmurunda eridi. Baştan, küçük simyacı.');
        loadWave(); paused = false;
      } else flash('Asit bulutu çarptı! Depoya döndün.');
    };

    const update = (dt) => {
      if (paused || done) return;
      t += dt;
      if (msgT > 0) { msgT -= dt; if (msgT <= 0) msg = null; }
      // hareket
      controls.update();
      const sp = 4.2, k = 1 - Math.exp(-dt * 10);
      if (drone.stun > 0) { drone.stun -= dt; controls.consumeInteract(); controls.consumeJump(); }
      else {
        drone.vx += (controls.axis.x * sp - drone.vx) * k; drone.vy += (-controls.axis.y * sp - drone.vy) * k;
        drone.x = Math.max(0, Math.min(wave.cols - 1, drone.x + drone.vx * dt));
        drone.y = Math.max(0, Math.min(wave.rows - 1, drone.y + drone.vy * dt));
        if (controls.consumeInteract()) dropBase();
        if (controls.consumeJump()) dropAcid();
      }
      drone.rot += dt * 30;
      // tarama
      tiles.forEach((row, r) => row.forEach((tl, c) => { if (Math.hypot(c - drone.x, r - drone.y) < 1.3) tl.scanned = true; if (isNeutral(tl.ph)) tl.sprout = Math.min(1, tl.sprout + dt * 0.4); else tl.sprout = 0; }));
      // depo
      const p = pad();
      if (Math.hypot(drone.x - p.x, drone.y - p.y) < 0.7) {
        refillT += dt;
        if (refillT > 0.3) { refillT = 0; let ch = false; if (drone.nh3 < NH3_MAX) { drone.nh3++; ch = true; } if (drone.acid < ACID_MAX) { drone.acid++; ch = true; } if (ch) { refreshInv(); sfx.type(); } }
      }
      // bulutlar
      clouds.forEach((cl) => {
        cl.x += cl.vx * dt; cl.y += cl.vy * dt;
        if (cl.y < 0 || cl.y > wave.rows - 1) cl.vy *= -1;
        if (cl.x < -1.5 || cl.x > wave.cols + 0.5) { cl.vx *= -1; cl.y = Math.random() * (wave.rows - 1); }
        cl.rain += dt;
        if (cl.rain > 1.4) { cl.rain = 0; const h = tileAt(cl.x, cl.y); if (h) { h.tl.ph = Math.max(0, h.tl.ph - 1); h.tl.scanned = true; } }
        cl.zap = Math.max(0, cl.zap - dt);
        if (drone.stun <= 0 && Math.hypot(cl.x - drone.x, cl.y - drone.y) < 0.55) { cl.zap = 0.3; hurt(); }
      });
      // sızıntı
      if (boss && !boss.sealed) {
        boss.timer += dt;
        if (boss.timer > 3) {
          boss.timer = 0;
          [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([dx, dy]) => { const h = tileAt(boss.x + dx, boss.y + dy); if (h) { h.tl.ph = Math.max(0, h.tl.ph - 1); h.tl.scanned = true; } });
        }
      }
      puffs.forEach((q) => (q.t += dt)); puffs = puffs.filter((q) => q.t < 0.6);
      // dalga bitti mi
      updateObjective();
      if (remaining() === 0 && (!boss || boss.sealed)) finishWave();
    };

    const finishWave = async () => {
      paused = true; sfx.success();
      neutralizedTotal += wave.cols * wave.rows;
      onWaveDone?.(wi);
      await dialog.say('aria', wi + 1 < waves.length
        ? `${wave.name} tamamlandı! Tarla mor: her kare nötr. Yarın daha zor olacak.`
        : 'Bütün tarla nötr! Nötralleşme: Asit + Baz → Tuz + Su. Konya Ovası yeniden ekilebilir.');
      wi += 1;
      if (wi >= waves.length) { done = true; cancelAnimationFrame(raf); div.remove(); resolve({ neutralized: neutralizedTotal }); return; }
      loadWave();
      await dialog.say('aria', waves[wi].brief);
      paused = false;
    };

    /* ---------- çizim ---------- */
    const rr = (x, y, w, h, r, fill, stroke) => { g.beginPath(); g.roundRect(x, y, w, h, r); if (fill) { g.fillStyle = fill; g.fill(); } if (stroke) { g.strokeStyle = stroke; g.stroke(); } };
    const draw = (now) => {
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      fit(); update(dt);
      const { ts, ox, oy } = layout();
      g.fillStyle = '#2a1d12'; g.fillRect(0, 0, W, H);
      // pH ölçeği
      const lw = Math.min(W - 24, 520), lx = (W - lw) / 2, ly = oy - 36;
      for (let i = 0; i <= 14; i++) { g.fillStyle = PH_COLORS[i]; g.fillRect(lx + (i / 15) * lw, ly, lw / 15 + 1, 12); }
      g.fillStyle = '#eef2ff'; g.font = '800 11px Nunito'; g.textAlign = 'left'; g.fillText('pH 0 ASİT (kırmızı)', lx, ly + 26);
      g.textAlign = 'center'; g.fillText('7 NÖTR (mor)', lx + lw / 2, ly + 26); g.textAlign = 'right'; g.fillText('14 BAZ (sarı)', lx + lw, ly + 26);
      // kareler
      const padT = pad();
      tiles.forEach((row, r) => row.forEach((tl, c) => {
        const x = ox + c * ts, y = oy + r * ts;
        const isPad = c === padT.x && r === padT.y;
        if (isPad) { rr(x + 2, y + 2, ts - 4, ts - 4, 8, '#0d3a44', '#3ee8ff'); g.fillStyle = '#3ee8ff'; g.font = `900 ${ts * 0.22}px Nunito`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('DEPO', x + ts / 2, y + ts / 2); g.textBaseline = 'alphabetic'; return; }
        if (!tl.scanned) { rr(x + 2, y + 2, ts - 4, ts - 4, 8, '#5a4330', '#3d2d1f'); g.fillStyle = 'rgba(255,255,255,0.25)'; g.font = `900 ${ts * 0.35}px Nunito`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('?', x + ts / 2, y + ts / 2); g.textBaseline = 'alphabetic'; return; }
        rr(x + 2, y + 2, ts - 4, ts - 4, 8, PH_COLORS[tl.ph], isNeutral(tl.ph) ? '#fff' : 'rgba(0,0,0,0.3)');
        if (tl.sprout > 0) { // filiz
          const s = tl.sprout * ts * 0.3; g.strokeStyle = '#1f7a2e'; g.lineWidth = 3; g.lineCap = 'round';
          g.beginPath(); g.moveTo(x + ts / 2, y + ts * 0.75); g.lineTo(x + ts / 2, y + ts * 0.75 - s); g.stroke();
          g.fillStyle = '#5ee87a'; g.beginPath(); g.ellipse(x + ts / 2 - s * 0.3, y + ts * 0.75 - s * 0.6, s * 0.35, s * 0.18, -0.6, 0, Math.PI * 2); g.fill();
          g.beginPath(); g.ellipse(x + ts / 2 + s * 0.3, y + ts * 0.75 - s * 0.8, s * 0.35, s * 0.18, 0.6, 0, Math.PI * 2); g.fill();
        }
        g.fillStyle = tl.ph <= 2 || tl.ph >= 12 ? '#111' : '#fff'; g.font = `900 ${ts * 0.26}px Nunito`; g.textAlign = 'left'; g.fillText(`pH ${tl.ph}`, x + 7, y + ts * 0.3);
      }));
      // sızıntı borusu
      if (boss) {
        const x = ox + boss.x * ts + ts / 2, y = oy + boss.y * ts + ts / 2;
        g.fillStyle = boss.sealed ? '#4a4f63' : '#8a8f9c'; rr(x - ts * 0.3, y - ts * 0.12, ts * 0.6, ts * 0.24, 6, boss.sealed ? '#4a4f63' : '#8a8f9c', '#111');
        if (!boss.sealed) { for (let i = 0; i < 4; i++) { const a = t * 3 + i * 1.6; g.fillStyle = 'rgba(255,60,60,0.7)'; g.beginPath(); g.arc(x + Math.cos(a) * ts * 0.3, y - ts * 0.2 - ((t * 0.5 + i * 0.25) % 1) * ts * 0.4, ts * 0.06, 0, Math.PI * 2); g.fill(); } }
        g.fillStyle = '#fff'; g.font = `900 ${ts * 0.2}px Nunito`; g.textAlign = 'center'; g.fillText(boss.sealed ? 'TIKALI' : `SIZINTI ${boss.hp}`, x, y + ts * 0.45);
      }
      // pufflar
      puffs.forEach((q) => { const x = ox + q.x * ts + ts / 2, y = oy + q.y * ts + ts / 2; g.globalAlpha = 1 - q.t / 0.6; g.strokeStyle = q.color; g.lineWidth = 4; g.beginPath(); g.arc(x, y, ts * 0.15 + q.t * ts * 0.8, 0, Math.PI * 2); g.stroke(); g.globalAlpha = 1; });
      // bulutlar
      clouds.forEach((cl) => {
        const x = ox + cl.x * ts + ts / 2, y = oy + cl.y * ts + ts / 2;
        g.fillStyle = cl.hp < 2 ? 'rgba(170,140,200,0.85)' : 'rgba(90,70,120,0.9)';
        [[0, 0, 0.42], [-0.3, 0.08, 0.3], [0.3, 0.1, 0.32], [0, -0.2, 0.3]].forEach(([dx, dy, r]) => { g.beginPath(); g.arc(x + dx * ts, y + dy * ts, r * ts, 0, Math.PI * 2); g.fill(); });
        // asit damlaları
        g.fillStyle = '#ff3a3a'; for (let i = 0; i < 3; i++) { const ph = (t * 1.5 + i * 0.33) % 1; g.beginPath(); g.arc(x + (i - 1) * ts * 0.25, y + ts * 0.3 + ph * ts * 0.35, 3, 0, Math.PI * 2); g.fill(); }
        if (cl.zap > 0) { g.strokeStyle = '#ffd84a'; g.lineWidth = 3; g.beginPath(); g.moveTo(x, y); g.lineTo(x - 8, y + 18); g.lineTo(x + 6, y + 22); g.lineTo(x - 4, y + 40); g.stroke(); }
        g.fillStyle = '#fff'; g.font = `900 ${ts * 0.18}px Nunito`; g.textAlign = 'center'; g.fillText('ASİT', x, y + 4);
      });
      // drone
      const dx = ox + drone.x * ts + ts / 2, dy = oy + drone.y * ts + ts / 2;
      g.fillStyle = 'rgba(0,0,0,0.3)'; g.beginPath(); g.ellipse(dx + 6, dy + ts * 0.35, ts * 0.28, ts * 0.12, 0, 0, Math.PI * 2); g.fill();
      if (drone.stun <= 0 || Math.floor(t * 12) % 2 === 0) {
        g.strokeStyle = '#2b3764'; g.lineWidth = 4; g.beginPath(); g.moveTo(dx - ts * 0.28, dy - ts * 0.28); g.lineTo(dx + ts * 0.28, dy + ts * 0.28); g.moveTo(dx + ts * 0.28, dy - ts * 0.28); g.lineTo(dx - ts * 0.28, dy + ts * 0.28); g.stroke();
        [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sy]) => { g.strokeStyle = 'rgba(255,255,255,0.7)'; g.lineWidth = 2; g.beginPath(); g.ellipse(dx + sx * ts * 0.28, dy + sy * ts * 0.28, ts * 0.14, ts * 0.14 * Math.abs(Math.sin(drone.rot)), 0, 0, Math.PI * 2); g.stroke(); });
        g.fillStyle = '#ffb347'; g.beginPath(); g.arc(dx, dy, ts * 0.18, 0, Math.PI * 2); g.fill();
        g.fillStyle = '#3ee8ff'; g.beginPath(); g.arc(dx, dy - ts * 0.05, ts * 0.07, 0, Math.PI * 2); g.fill();
        // tarama halkası
        g.strokeStyle = 'rgba(230,107,255,0.5)'; g.lineWidth = 2; g.setLineDash([6, 6]); g.beginPath(); g.arc(dx, dy, ts * 1.3, 0, Math.PI * 2); g.stroke(); g.setLineDash([]);
      }
      // mesaj
      if (msg) { g.font = '800 15px Nunito'; const tw = Math.min(W - 24, g.measureText(msg).width + 28); rr((W - tw) / 2, oy + wave.rows * ts + 10, tw, 32, 10, 'rgba(14,20,45,0.92)', '#ffb347'); g.fillStyle = '#eef2ff'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(msg, W / 2, oy + wave.rows * ts + 26, W - 40); g.textBaseline = 'alphabetic'; }
      raf = requestAnimationFrame(draw);
    };

    window.__drone = { get wave() { return wave; }, get tiles() { return tiles; }, get drone() { return drone; }, get clouds() { return clouds; }, get boss() { return boss; }, get paused() { return paused; }, remaining, dropBase, dropAcid, setPos: (x, y) => { drone.x = x; drone.y = y; } };

    loadWave();
    raf = requestAnimationFrame(draw);
    (async () => { await dialog.say('aria', waves[wi].brief); paused = false; })();
  });
}
