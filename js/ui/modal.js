const root = document.getElementById('modal');
const card = document.getElementById('modal-card');

export const modal = {
  open() { card.innerHTML = ''; root.classList.remove('hidden'); return card; },
  close() { root.classList.add('hidden'); card.innerHTML = ''; },
  get isOpen() { return !root.classList.contains('hidden'); },
};
