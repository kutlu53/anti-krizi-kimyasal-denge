import { state } from '../state.js';
import { sfx } from '../audio.js';

// Stilize Türkiye silüeti (1000x500 kutuda).
const OUTLINE = [
  [118, 128], [160, 118], [205, 112], [232, 128], [262, 118], [300, 100], [335, 88], [390, 76], [440, 66], [480, 60],
  [520, 76], [560, 86], [600, 94], [650, 96], [700, 102], [750, 110], [800, 122], [828, 150], [846, 200], [858, 250],
  [862, 300], [846, 350], [820, 372], [775, 376], [720, 384], [670, 400], [628, 424], [596, 392], [548, 388], [500, 384],
  [440, 400], [385, 408], [330, 388], [280, 384], [236, 376], [206, 350], [184, 318], [172, 280], [178, 250], [196, 232],
  [186, 206], [164, 182], [134, 160],
];

const CITIES = [
  { id: 'prolog', name: 'Ankara Sığınağı', form: 'Prolog', x: 404, y: 210, req: null },
  { id: 'ordu', name: 'Ordu', form: 'H₂O', x: 592, y: 110, req: 'prolog' },
  { id: 'izmir', name: 'İzmir', form: 'NaCl', x: 192, y: 268, req: 'ordu' },
  { id: 'konya', name: 'Konya', form: 'NH₃', x: 436, y: 306, req: 'izmir' },
  { id: 'zonguldak', name: 'Zonguldak', form: 'CH₄', x: 336, y: 104, req: 'konya' },
  { id: 'ankara', name: 'Ankara: Final', form: 'CO₂', x: 404, y: 210, req: 'zonguldak' },
];

/** Harita ekranı. Bir şehir seçildiğinde onPick(id) çağrılır. Kaldırma fonksiyonu döner. */
export function showMap({ onPick, onMuseum, onEpilog, onReset, toast }) {
  const root = document.getElementById('screens');
  const div = document.createElement('div');
  div.className = 'screen';
  const pts = OUTLINE.map((p) => p.join(',')).join(' ');
  const done = state.chapters;
  const finalOpen = !!done.zonguldak;
  const cityStatus = (c) => {
    if (c.id === 'prolog' && finalOpen) return 'hidden';
    if (c.id === 'ankara' && !finalOpen) return 'hidden';
    if (done[c.id]) return 'done';
    if (!c.req || done[c.req]) return c.soon ? 'locked' : 'open';
    return 'locked';
  };

  div.innerHTML = `
    <div id="map-wrap">
      <div id="map-head">
        <div><h2>Türkiye Reaktör Ağı</h2><div class="hint">Yıl 2140 · A.N.T.İ. krizi · Hedef: 5 reaktörü yeniden başlat</div></div>
        <div class="row">
          <div class="chip"><span>🃏</span>${state.cards.length} kart</div>
          <button class="btn secondary small" id="map-museum">Molekül Müzesi</button>
          ${done.ankara ? '<button class="btn small" id="map-epilog">Epilog & Sertifika</button>' : ''}
          <button class="btn secondary small" id="map-reset">Sıfırla</button>
        </div>
      </div>
      <svg id="map-svg" viewBox="0 0 1000 500" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="land" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#4b3b2a"/><stop offset="1" stop-color="#2d2419"/></linearGradient>
          <linearGradient id="landOk" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3f9a4f"/><stop offset="1" stop-color="#1f5a2d"/></linearGradient>
          <clipPath id="clip"><polygon points="${pts}"/></clipPath>
        </defs>
        <polygon points="${pts}" fill="url(#land)" stroke="#8fa3ff" stroke-width="3" stroke-linejoin="round"/>
        ${CITIES.filter((c) => done[c.id] && cityStatus(c) !== 'hidden').map((c) => `<circle cx="${c.x}" cy="${c.y}" r="90" fill="url(#landOk)" clip-path="url(#clip)" opacity="0.9"/>`).join('')}
        <text x="520" y="42" fill="#5d8bff" font-size="16" font-weight="800" font-family="Nunito">KARADENİZ</text>
        <text x="60" y="300" fill="#5d8bff" font-size="16" font-weight="800" font-family="Nunito">EGE</text>
        <text x="430" y="460" fill="#5d8bff" font-size="16" font-weight="800" font-family="Nunito">AKDENİZ</text>
        ${CITIES.filter((c) => cityStatus(c) !== 'hidden').map((c) => {
          const st = cityStatus(c);
          return `<g class="city ${st}" data-id="${c.id}" data-st="${st}">
            <circle class="ring" cx="${c.x}" cy="${c.y}" r="14"/>
            <circle class="dot" cx="${c.x}" cy="${c.y}" r="11" fill="#aab2c8" stroke="#0e1a3a" stroke-width="3"/>
            <text x="${c.x}" y="${c.y - 22}" text-anchor="middle">${c.name}</text>
            <text class="form" x="${c.x}" y="${c.y + 34}" text-anchor="middle">${st === 'locked' && c.soon ? 'yakında' : c.form}</text>
          </g>`;
        }).join('')}
      </svg>
      <div class="legend">
        <span><i style="background:#ffb347"></i>Oynanabilir</span>
        <span><i style="background:#5ee87a"></i>Kurtarıldı</span>
        <span><i style="background:#aab2c8"></i>Kilitli</span>
        <span style="margin-left:auto">Bilgisayar: WASD/ok tuşları, Boşluk zıpla, E etkileşim · Mobil: ekran kontrolleri</span>
      </div>
    </div>
  `;
  root.appendChild(div);

  div.querySelectorAll('.city').forEach((el) => {
    el.addEventListener('click', () => {
      const st = el.dataset.st, id = el.dataset.id;
      sfx.click();
      if (st === 'locked') { toast?.('Önce önceki reaktörü kurtar.'); return; }
      onPick(id);
    });
  });
  div.querySelector('#map-museum').addEventListener('click', () => { sfx.click(); onMuseum(); });
  div.querySelector('#map-epilog')?.addEventListener('click', () => { sfx.click(); onEpilog(); });
  div.querySelector('#map-reset').addEventListener('click', () => { sfx.click(); onReset(); });

  return () => div.remove();
}
