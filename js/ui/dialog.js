import { sfx } from '../audio.js';

const SPEAKERS = {
  aria: { name: 'A.R.I.A.', icon: '🤖' },
  anti: { name: 'A.N.T.İ.', icon: '👾' },
  elif: { name: 'Dr. Elif', icon: '👩‍🔬' },
  you: { name: 'Sen', icon: '🧑‍🚀' },
  sys: { name: 'Sistem', icon: '📡' },
};

const el = {
  root: document.getElementById('dialog'),
  box: document.getElementById('dialog-box'),
  portrait: document.getElementById('portrait'),
  icon: document.getElementById('portrait-icon'),
  speaker: document.getElementById('speaker'),
  text: document.getElementById('dialog-text'),
  options: document.getElementById('dialog-options'),
  next: document.getElementById('dialog-next'),
};

let tw = null; // aktif daktilo efekti {timer, finish}
let ac = null; // aktif dinleyicileri iptal eder (sahne değişiminde)

function typewrite(text) {
  el.text.textContent = '';
  return new Promise((resolve) => {
    let i = 0;
    const finish = () => { if (tw) clearTimeout(tw.timer); el.text.textContent = text; tw = null; resolve(); };
    const tick = () => {
      i += 1;
      el.text.textContent = text.slice(0, i);
      if (i % 3 === 0) sfx.type();
      if (i >= text.length) { tw = null; resolve(); return; }
      tw.timer = setTimeout(tick, 18);
    };
    tw = { timer: null, finish };
    tick();
  });
}

function setSpeaker(who) {
  const s = SPEAKERS[who] || SPEAKERS.sys;
  el.portrait.className = who;
  el.icon.textContent = s.icon;
  el.speaker.textContent = s.name;
  el.box.classList.toggle('anti', who === 'anti');
}

export const dialog = {
  /** Bir replik göster; dokunma/Enter ile devam. */
  say(who, text) {
    setSpeaker(who);
    el.options.innerHTML = '';
    el.next.classList.remove('hidden');
    el.root.classList.remove('hidden');
    ac?.abort(); ac = new AbortController();
    const signal = ac.signal;
    return new Promise((resolve) => {
      let finished = false;
      typewrite(text).then(() => { finished = true; });
      const advance = () => {
        if (!finished) { tw?.finish(); return; }
        ac?.abort(); ac = null;
        el.root.classList.add('hidden');
        resolve();
      };
      const onKey = (e) => { if (['Enter', ' ', 'e', 'E'].includes(e.key)) { e.preventDefault(); advance(); } };
      const onTap = (e) => { e.preventDefault(); advance(); };
      // kısa gecikme: önceki dokunuşun bu kutuya düşmesini önler
      setTimeout(() => {
        if (signal.aborted) return;
        el.box.addEventListener('pointerdown', onTap, { signal });
        window.addEventListener('keydown', onKey, { signal });
      }, 150);
    });
  },

  /** Art arda replikler: [[who, text], ...] */
  async lines(list) { for (const [who, text] of list) await this.say(who, text); },

  /** Seçenekli replik; seçilen değerle çözülür. */
  choose(who, text, options) {
    setSpeaker(who);
    el.options.innerHTML = '';
    el.next.classList.add('hidden');
    el.root.classList.remove('hidden');
    ac?.abort(); ac = new AbortController();
    const signal = ac.signal;
    return new Promise(async (resolve) => {
      await typewrite(text);
      if (signal.aborted) return;
      options.forEach((o) => {
        const b = document.createElement('button');
        b.textContent = o.label;
        b.addEventListener('pointerdown', (e) => {
          e.stopPropagation(); e.preventDefault(); sfx.click();
          ac?.abort(); ac = null;
          el.root.classList.add('hidden'); resolve(o.value);
        }, { signal });
        el.options.appendChild(b);
      });
    });
  },

  /** Sahne değişiminde: kutuyu gizler, bekleyen replikleri iptal eder (asla çözülmezler). */
  hide() {
    ac?.abort(); ac = null;
    if (tw) { clearTimeout(tw.timer); tw = null; }
    el.root.classList.add('hidden');
  },
};
