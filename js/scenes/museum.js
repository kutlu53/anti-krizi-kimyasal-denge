import * as THREE from 'three';
import { World } from '../engine/world.js';
import { mat, ATOM } from '../engine/props.js';
import { cards as CARD_INFO } from '../data/questions.js';
import { state } from '../state.js';
import { sfx } from '../audio.js';

const ORDER = ['He', 'H', 'O', 'H2O', 'NaCl', 'NH3', 'CH4', 'CO2'];

function sphere(r, color, emissive = 0.3) {
  const m = new THREE.Mesh(new THREE.IcosahedronGeometry(r, 2), mat(color, { emissive: color, emissiveIntensity: emissive, flatShading: false }));
  m.castShadow = true; return m;
}
function bond(a, b) {
  const dir = new THREE.Vector3().subVectors(b, a);
  const len = dir.length();
  const m = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, len, 8), mat(0xdde3ff, { flatShading: false }));
  m.position.copy(a).addScaledVector(dir, 0.5);
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
  return m;
}

/** Kart kimliğine göre 3D model. */
function model(id) {
  const g = new THREE.Group();
  if (id === 'H') g.add(sphere(0.7, ATOM.H.color));
  else if (id === 'O') g.add(sphere(0.85, ATOM.O.color));
  else if (id === 'H2O') {
    const o = new THREE.Vector3(0, 0.2, 0);
    const half = (104.5 / 2) * Math.PI / 180;
    const h1 = new THREE.Vector3(-Math.sin(half) * 1.4, 0.2 - Math.cos(half) * 1.4, 0);
    const h2 = new THREE.Vector3(Math.sin(half) * 1.4, 0.2 - Math.cos(half) * 1.4, 0);
    const O = sphere(0.8, ATOM.O.color); O.position.copy(o);
    const H1 = sphere(0.5, ATOM.H.color); H1.position.copy(h1);
    const H2 = sphere(0.5, ATOM.H.color); H2.position.copy(h2);
    g.add(O, H1, H2, bond(o, h1), bond(o, h2));
  } else if (id === 'CO2') {
    const c = new THREE.Vector3(0, 0, 0);
    const C = sphere(0.7, 0x4a4f63); g.add(C);
    [-1.5, 1.5].forEach((x) => { const o = new THREE.Vector3(x, 0, 0); const O = sphere(0.65, 0xff4d4d); O.position.copy(o); g.add(O); [-0.18, 0.18].forEach((dz) => { const b = bond(c.clone().setZ(dz), o.clone().setZ(dz)); g.add(b); }); });
  } else if (id === 'CH4') {
    // dörtyüzlü: C merkezde, 4 H köşelerde
    const c = new THREE.Vector3(0, 0, 0);
    const C = sphere(0.75, 0x4a4f63); g.add(C);
    [[1, 1, 1], [-1, -1, 1], [-1, 1, -1], [1, -1, -1]].forEach(([x, y, z]) => {
      const h = new THREE.Vector3(x, y, z).multiplyScalar(0.8);
      const H = sphere(0.42, 0xf4f6ff); H.position.copy(h); g.add(H, bond(c, h));
    });
  } else if (id === 'NH3') {
    // üçgen piramit: N tepede, 3 H altta
    const n = new THREE.Vector3(0, 0.45, 0);
    const N = sphere(0.75, 0x4d7dff); N.position.copy(n); g.add(N);
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI * 2;
      const h = new THREE.Vector3(Math.cos(a) * 1.25, -0.35, Math.sin(a) * 1.25);
      const H = sphere(0.45, 0xf4f6ff); H.position.copy(h); g.add(H, bond(n, h));
    }
  } else if (id === 'NaCl') {
    // kaya tuzu kristal kafesi: Na (mor) ve Cl (yeşil) dönüşümlü
    const step = 0.9;
    for (let x = 0; x < 3; x++) for (let y = 0; y < 3; y++) for (let z = 0; z < 3; z++) {
      const isNa = (x + y + z) % 2 === 0;
      const s = sphere(isNa ? 0.22 : 0.34, isNa ? 0x9b5cff : 0x5ee87a, 0.2);
      s.position.set((x - 1) * step, (y - 1) * step, (z - 1) * step); g.add(s);
      if (x < 2) g.add(bond(s.position, new THREE.Vector3((x) * step, (y - 1) * step, (z - 1) * step)));
      if (y < 2) g.add(bond(s.position, new THREE.Vector3((x - 1) * step, (y) * step, (z - 1) * step)));
      if (z < 2) g.add(bond(s.position, new THREE.Vector3((x - 1) * step, (y - 1) * step, (z) * step)));
    }
    g.rotation.x = 0.4;
  } else if (id === 'He') {
    const nuc = new THREE.Group();
    [[0.2, 0.2, 0], [-0.2, -0.2, 0], [0.2, -0.2, 0.1], [-0.2, 0.2, -0.1]].forEach(([x, y, z], i) => {
      const s = sphere(0.26, i < 2 ? 0xff5d6c : 0xaab2c8); s.position.set(x, y, z); nuc.add(s);
    });
    const ring = new THREE.Mesh(new THREE.TorusGeometry(1.6, 0.02, 6, 48), mat(0x3ee8ff, { emissive: 0x3ee8ff, emissiveIntensity: 0.8 }));
    const e1 = sphere(0.14, 0x3ee8ff, 1), e2 = sphere(0.14, 0x3ee8ff, 1);
    g.add(nuc, ring, e1, e2);
    g.userData.anim = (t) => { ring.rotation.y = t * 0.4; ring.rotation.x = 0.6; e1.position.set(Math.cos(t * 2) * 1.6, Math.sin(t * 2) * 1.6 * Math.sin(0.6), Math.sin(t * 2) * 1.6 * Math.cos(0.6)); e2.position.copy(e1.position).negate(); };
  }
  return g;
}

export function runMuseum(ctx) {
  const { canvas, controls } = ctx;
  const world = new World(canvas, controls, { sky: 0x0b1020, fog: { color: 0x0b1020, near: 12, far: 40 }, hemi: 0.5, sun: 1.2 });
  world.frozen = true;
  world.hidePlayer = true;
  world.camOffset.set(0, 2.6, 7.5); world.camLookUp = 1.8;
  world.addBox(0, -1, 0, 30, 1, 30, mat(0x141b33));
  const pedestal = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 1.7, 0.5, 12), mat(0x2b3764));
  pedestal.position.y = 0.25; pedestal.castShadow = true; pedestal.receiveShadow = true; world.scene.add(pedestal);
  const glow = new THREE.PointLight(0xffd84a, 10, 12); glow.position.set(0, 3, 2); world.scene.add(glow);
  for (let i = 0; i < 6; i++) {
    const col = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 6, 8), mat(0x1d2749));
    const a = (i / 6) * Math.PI * 2; col.position.set(Math.cos(a) * 8, 3, Math.sin(a) * 8 - 2); world.scene.add(col);
  }
  world.teleport(0, 0, 0);
  world.snapCamera();

  let current = null;
  const show = (id) => {
    if (current) { world.scene.remove(current); }
    current = model(id); current.position.y = 2.2; current.scale.setScalar(1.3); world.scene.add(current);
    const info = CARD_INFO[id];
    ui.querySelector('#museum-info').innerHTML = `<h3>${info.title}</h3>${info.text}`;
    ui.querySelectorAll('.card-btn').forEach((b) => b.classList.toggle('active', b.dataset.id === id));
  };
  world.updaters.push((dt, t) => { if (current) { current.rotation.y = t * 0.6; current.userData.anim?.(t); } });

  const ui = document.createElement('div');
  ui.id = 'museum-ui';
  const owned = ORDER.filter((id) => state.cards.includes(id));
  ui.innerHTML = `
    <div class="row" style="justify-content:space-between">
      <h2 style="color:var(--gold)">3D Molekül Müzesi</h2>
      <button class="btn secondary small" id="museum-back">← Harita</button>
    </div>
    <div>
      <div id="museum-info">${owned.length ? '' : '<h3>Müze boş</h3>Bölümlerde parlayan kartları topla; burada 3D olarak incele.'}</div>
      <div class="card-row" style="margin-top:10px">
        ${ORDER.map((id) => `<button class="card-btn ${state.cards.includes(id) ? '' : 'locked'}" data-id="${id}" ${state.cards.includes(id) ? '' : 'disabled'}>${state.cards.includes(id) ? CARD_INFO[id].title : '???'}</button>`).join('')}
      </div>
    </div>
  `;
  document.getElementById('screens').appendChild(ui);
  ui.querySelectorAll('.card-btn:not(.locked)').forEach((b) => b.addEventListener('click', () => { sfx.click(); show(b.dataset.id); }));
  ui.querySelector('#museum-back').addEventListener('click', () => { sfx.click(); ctx.go('map'); });
  if (owned.length) show(owned[owned.length - 1]);
  world.start();

  return () => { ui.remove(); world.dispose(); };
}
