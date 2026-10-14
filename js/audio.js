// Küçük sentez sesleri (dosya yok, WebAudio ile üretilir).
let ctx = null;
function ac() {
  if (!ctx) {
    try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return null; }
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

function tone(freq, dur = 0.12, type = 'sine', vol = 0.18, slide = 0) {
  const c = ac(); if (!c) return;
  const o = c.createOscillator(); const g = c.createGain();
  o.type = type; o.frequency.setValueAtTime(freq, c.currentTime);
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(40, freq + slide), c.currentTime + dur);
  g.gain.setValueAtTime(vol, c.currentTime);
  g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + dur);
  o.connect(g).connect(c.destination);
  o.start(); o.stop(c.currentTime + dur + 0.02);
}

export const sfx = {
  unlock() { ac(); },
  click() { tone(520, 0.06, 'square', 0.08); },
  collect() { tone(880, 0.08, 'triangle', 0.15); setTimeout(() => tone(1320, 0.12, 'triangle', 0.15), 60); },
  jump() { tone(300, 0.15, 'sine', 0.12, 300); },
  success() { [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => tone(f, 0.18, 'triangle', 0.16), i * 90)); },
  fail() { tone(220, 0.25, 'sawtooth', 0.12, -120); },
  hit() { tone(120, 0.2, 'sawtooth', 0.2, -60); },
  card() { [660, 880, 1100, 1320, 1760].forEach((f, i) => setTimeout(() => tone(f, 0.15, 'sine', 0.14), i * 70)); },
  water() { tone(200, 0.6, 'sine', 0.1, 400); },
  type() { tone(1400, 0.02, 'square', 0.02); },
};
