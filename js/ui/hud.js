const ATOM_COLORS = { H: '#f4f6ff', O: '#ff5d5d', N: '#5d8bff', C: '#555b6e' };

const el = {
  hud: document.getElementById('hud'),
  objective: document.getElementById('objective'),
  inventory: document.getElementById('inventory'),
  prompt: document.getElementById('prompt'),
  promptText: document.getElementById('prompt-text'),
  toast: document.getElementById('toast'),
  fade: document.getElementById('fade'),
};

let toastTimer = null;

export const hud = {
  show() { el.hud.classList.remove('hidden'); },
  hide() { el.hud.classList.add('hidden'); this.setPrompt(null); },

  setObjective(text) { el.objective.textContent = text; el.objective.classList.toggle('hidden', !text); },

  /** inv: {H: 2, O: 1}, extra: [{icon, text}] */
  setInventory(inv = {}, extra = []) {
    const chips = [];
    for (const [sym, n] of Object.entries(inv)) {
      chips.push(`<div class="chip" data-sym="${sym}"><span class="ball" style="background:${ATOM_COLORS[sym] || '#ccc'}">${sym}</span>${n}</div>`);
    }
    for (const x of extra) chips.push(`<div class="chip"><span>${x.icon}</span>${x.text}</div>`);
    el.inventory.innerHTML = chips.join('');
  },

  bump(sym) {
    const c = el.inventory.querySelector(`.chip[data-sym="${sym}"]`);
    if (!c) return;
    c.classList.remove('bump'); void c.offsetWidth; c.classList.add('bump');
  },

  /** Dokunmatik düğme etiketleri (bölüme göre). */
  setButtons(interact = 'E', jump = '⤒') {
    document.getElementById('btn-interact').textContent = interact;
    document.getElementById('btn-jump').textContent = jump;
  },

  setPrompt(label) {
    if (!label) { el.prompt.classList.add('hidden'); return; }
    el.promptText.textContent = label;
    el.prompt.classList.remove('hidden');
  },

  toast(text, ms = 2200) {
    el.toast.textContent = text;
    el.toast.classList.remove('hidden');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.toast.classList.add('hidden'), ms);
  },

  /** Siyaha geçiş; await ile beklenir. */
  fadeOut() { el.fade.classList.add('on'); return new Promise((r) => setTimeout(r, 520)); },
  fadeIn() { el.fade.classList.remove('on'); return new Promise((r) => setTimeout(r, 520)); },
};

export { ATOM_COLORS };
