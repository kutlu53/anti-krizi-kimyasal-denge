import { Controls } from './ui/controls.js';
import { hud } from './ui/hud.js';
import { dialog } from './ui/dialog.js';
import { modal } from './ui/modal.js';
import { state, save, resetState, hasProgress } from './state.js';
import { showTitle } from './scenes/title.js';
import { showMap } from './scenes/map.js';
import { runProlog } from './scenes/prolog.js';
import { runOrdu } from './scenes/ordu.js';
import { runIzmir } from './scenes/izmir.js';
import { runKonya } from './scenes/konya.js';
import { runZonguldak } from './scenes/zonguldak.js';
import { runAnkara } from './scenes/ankara.js';
import { runEpilog } from './scenes/epilog.js';
import { runMuseum } from './scenes/museum.js';

const canvas = document.getElementById('gl');
const controls = new Controls();
let cleanup = null;

const ctx = { canvas, controls, go, finish: () => go('map') };

function go(name) {
  if (cleanup) { cleanup(); cleanup = null; }
  hud.hide(); dialog.hide(); modal.close();
  controls.clear();
  controls.enabled = ['prolog', 'ordu', 'izmir', 'konya', 'zonguldak', 'ankara'].includes(name);
  document.getElementById('fade').classList.remove('on');

  switch (name) {
    case 'title':
      cleanup = showTitle({
        hasProgress: hasProgress(),
        onStart: () => { resetState(); state.startedAt = Date.now(); save(); go('prolog'); },
        onContinue: () => go('map'),
      });
      break;
    case 'map':
      cleanup = showMap({
        onPick: (id) => go(id),
        onMuseum: () => go('museum'),
        onEpilog: () => go('epilog'),
        onReset: () => { if (confirm('Tüm ilerleme silinsin mi?')) { resetState(); go('title'); } },
        toast: (t) => hud.toast(t),
      });
      break;
    case 'prolog':
      document.getElementById('fade').classList.add('on');
      cleanup = runProlog(ctx);
      break;
    case 'ordu':
      document.getElementById('fade').classList.add('on');
      cleanup = runOrdu(ctx);
      break;
    case 'izmir':
      document.getElementById('fade').classList.add('on');
      cleanup = runIzmir(ctx);
      break;
    case 'konya':
      document.getElementById('fade').classList.add('on');
      cleanup = runKonya(ctx);
      break;
    case 'zonguldak':
      document.getElementById('fade').classList.add('on');
      cleanup = runZonguldak(ctx);
      break;
    case 'ankara':
      document.getElementById('fade').classList.add('on');
      cleanup = runAnkara(ctx);
      break;
    case 'epilog':
      cleanup = runEpilog(ctx);
      break;
    case 'museum':
      cleanup = runMuseum(ctx);
      break;
    default:
      go('map');
  }
}

// Oyun içinden haritaya dönüş (Esc veya ✕)
const exitToMap = () => { if (confirm('Haritaya dönülsün mü? Bölüm ilerlemesi kaybolur.')) go('map'); };
window.addEventListener('keydown', (e) => { if (e.key === 'Escape' && controls.enabled) exitToMap(); });
document.getElementById('btn-exit').addEventListener('click', exitToMap);

// Sayfa kaydırmasını engelle (mobil)
document.addEventListener('touchmove', (e) => { if (!e.target.closest('#modal-card, .screen')) e.preventDefault(); }, { passive: false });

// Geliştirici/test kancası
window.__anti = { go, ctx, state };

go('title');
