// Oyun ilerlemesi tarayıcıda (localStorage) saklanır.
const KEY = 'anti-krizi-save-v1';

const defaults = () => ({
  preTest: null,            // { score, total, answers:{id:idx} }
  checks: {},               // bölüm kontrolleri: { ordu: {score,total} }
  chapters: { prolog: false, ordu: false, izmir: false, konya: false, zonguldak: false, ankara: false },
  postTest: null,
  ending: null,
  playerName: '',
  cards: [],                // toplanan element kartları: 'H','O','H2O', ...
  startedAt: null,
});

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return { ...defaults(), ...JSON.parse(raw) };
  } catch (e) { /* özel pencere vb. */ }
  return defaults();
}

export const state = load();

export function save() {
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* yok say */ }
}

export function resetState() {
  Object.assign(state, defaults());
  save();
}

export function addCard(id) {
  if (!state.cards.includes(id)) { state.cards.push(id); save(); return true; }
  return false;
}

export function hasProgress() {
  return !!state.startedAt;
}
