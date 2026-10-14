import * as THREE from 'three';

export const mat = (color, o = {}) => new THREE.MeshStandardMaterial({ color, flatShading: true, roughness: 0.85, metalness: 0.05, ...o });

export const ATOM = {
  H: { color: 0xf4f6ff, r: 0.42 },
  O: { color: 0xff4d4d, r: 0.52 },
  N: { color: 0x4d7dff, r: 0.5 },
  C: { color: 0x4a4f63, r: 0.5 },
};

/** Yazı etiketi (sprite). */
export function label(text, { color = '#ffffff', bg = 'rgba(0,0,0,0.55)', size = 48, scale = 1.6 } = {}) {
  const c = document.createElement('canvas');
  c.width = 256; c.height = 128;
  const g = c.getContext('2d');
  g.font = `900 ${size}px 'Baloo 2', 'Nunito', sans-serif`;
  const w = Math.min(240, g.measureText(text).width + 36);
  g.fillStyle = bg;
  g.beginPath(); g.roundRect((256 - w) / 2, 24, w, 80, 24); g.fill();
  g.fillStyle = color; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText(text, 128, 66);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false }));
  sp.scale.set(scale * 2, scale, 1);
  return sp;
}

/** Metni sonradan değiştirilebilen etiket: sprite.userData.set(text). */
export function dynamicLabel(text, { color = '#ffffff', bg = 'rgba(0,0,0,0.6)', size = 44, scale = 1.6 } = {}) {
  const c = document.createElement('canvas'); c.width = 320; c.height = 128;
  const g = c.getContext('2d');
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false }));
  sp.scale.set(scale * 2.5, scale, 1);
  const set = (t, col = color) => {
    g.clearRect(0, 0, 320, 128);
    g.font = `900 ${size}px 'Baloo 2', 'Nunito', sans-serif`;
    const w = Math.min(300, g.measureText(t).width + 36);
    g.fillStyle = bg; g.beginPath(); g.roundRect((320 - w) / 2, 24, w, 80, 24); g.fill();
    g.fillStyle = col; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(t, 160, 66);
    tex.needsUpdate = true;
  };
  set(text);
  sp.userData.set = set;
  return sp;
}

/** Oyuncu robotu. */
export function makePlayer() {
  const group = new THREE.Group();
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.38, 0.5, 4, 8), mat(0xffb347));
  body.position.y = 0.7; body.castShadow = true;
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.34, 12, 10), mat(0xf4f6ff));
  head.position.y = 1.35; head.castShadow = true;
  const visor = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.16, 0.12), mat(0x3ee8ff, { emissive: 0x3ee8ff, emissiveIntensity: 0.8 }));
  visor.position.set(0, 1.38, 0.3);
  const antenna = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.3), mat(0x888));
  antenna.position.y = 1.8;
  const tip = new THREE.Mesh(new THREE.SphereGeometry(0.07), mat(0xff5d6c, { emissive: 0xff5d6c, emissiveIntensity: 1 }));
  tip.position.y = 1.95;
  const armL = new THREE.Mesh(new THREE.CapsuleGeometry(0.1, 0.4, 3, 6), mat(0xe09a3a));
  const armR = armL.clone();
  armL.position.set(-0.5, 0.75, 0); armR.position.set(0.5, 0.75, 0);
  const footL = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.16, 0.4), mat(0x2b3764));
  const footR = footL.clone();
  footL.position.set(-0.2, 0.08, 0); footR.position.set(0.2, 0.08, 0);
  group.add(body, head, visor, antenna, tip, armL, armR, footL, footR);

  const animate = (t, moving, onGround) => {
    const s = moving ? Math.sin(t * 12) : 0;
    body.position.y = 0.7 + Math.abs(s) * 0.08;
    head.position.y = 1.35 + Math.abs(s) * 0.1;
    armL.rotation.x = s * 0.8; armR.rotation.x = -s * 0.8;
    footL.position.z = s * 0.25; footR.position.z = -s * 0.25;
    if (!onGround) { armL.rotation.x = -2.5; armR.rotation.x = -2.5; }
    tip.material.emissiveIntensity = 0.6 + Math.sin(t * 4) * 0.4;
  };
  return { group, animate };
}

/** Atom küresi + sembol etiketi. */
export function atomMesh(sym) {
  const a = ATOM[sym] || ATOM.H;
  const g = new THREE.Group();
  const s = new THREE.Mesh(new THREE.IcosahedronGeometry(a.r, 1), mat(a.color, { emissive: a.color, emissiveIntensity: 0.25 }));
  s.castShadow = true;
  const halo = new THREE.Mesh(new THREE.IcosahedronGeometry(a.r * 1.35, 1), new THREE.MeshBasicMaterial({ color: a.color, transparent: true, opacity: 0.18 }));
  const l = label(sym, { size: 64, scale: 1 });
  l.position.y = a.r + 0.6;
  g.add(s, halo, l);
  return g;
}

/** Entropi yaratığı: titreyen mor kristal. */
export function enemyMesh() {
  const g = new THREE.Group();
  const core = new THREE.Mesh(new THREE.OctahedronGeometry(0.6, 0), mat(0x6a1fb5, { emissive: 0xb43cff, emissiveIntensity: 0.7 }));
  core.castShadow = true;
  const eye = new THREE.Mesh(new THREE.SphereGeometry(0.16), mat(0xffffff, { emissive: 0xffffff, emissiveIntensity: 1 }));
  eye.position.set(0, 0.1, 0.5);
  const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.08), mat(0x000000));
  pupil.position.set(0, 0.1, 0.63);
  const shards = new THREE.Group();
  for (let i = 0; i < 5; i++) {
    const sh = new THREE.Mesh(new THREE.TetrahedronGeometry(0.22), mat(0xb43cff, { emissive: 0xb43cff, emissiveIntensity: 0.5 }));
    const a = (i / 5) * Math.PI * 2;
    sh.position.set(Math.cos(a) * 0.9, Math.sin(a * 2) * 0.3, Math.sin(a) * 0.9);
    shards.add(sh);
  }
  g.add(core, eye, pupil, shards);
  g.position.y = 0.9;
  return g;
}

/** Ağaç: canlı/ölü geçişi yapılabilir. */
export function tree(scale = 1, dead = true) {
  const g = new THREE.Group();
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.15 * scale, 0.25 * scale, 1.2 * scale, 6), mat(0x6b4a2b));
  trunk.position.y = 0.6 * scale; trunk.castShadow = true;
  const foliage = new THREE.Group();
  const deadColor = new THREE.Color(0x7a6a4a), liveColor = new THREE.Color(0x3fae4f);
  for (let i = 0; i < 3; i++) {
    const cone = new THREE.Mesh(new THREE.ConeGeometry((1.1 - i * 0.25) * scale, 1.1 * scale, 7), mat(dead ? deadColor : liveColor));
    cone.position.y = (1.3 + i * 0.6) * scale; cone.castShadow = true;
    foliage.add(cone);
  }
  if (dead) foliage.scale.set(0.55, 0.5, 0.55);
  g.add(trunk, foliage);
  g.userData.setLife = (t) => { // 0 ölü, 1 canlı
    foliage.children.forEach((c) => c.material.color.lerpColors(deadColor, liveColor, t));
    const s = 0.55 + 0.45 * t; foliage.scale.set(s, 0.5 + 0.5 * t, s);
  };
  return g;
}

export function rock(size = 1, color = 0x8a8f9c) {
  const m = new THREE.Mesh(new THREE.DodecahedronGeometry(size, 0), mat(color));
  m.castShadow = true; m.receiveShadow = true;
  m.rotation.set(Math.random() * 3, Math.random() * 3, 0);
  m.position.y = size * 0.6;
  return m;
}

export function crate(size = 1) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(size, size, size), mat(0x8a5a2b));
  m.castShadow = true; m.receiveShadow = true;
  return m;
}

/** Parlayan altın element kartı. */
export function cardMesh(text = 'KART') {
  const g = new THREE.Group();
  const c = new THREE.Mesh(new THREE.BoxGeometry(0.8, 1.1, 0.06), mat(0xffd84a, { emissive: 0xffd84a, emissiveIntensity: 0.5, metalness: 0.4 }));
  c.castShadow = true;
  const l = label(text, { size: 44, scale: 1, color: '#ffd84a' });
  l.position.y = 1.1;
  g.add(c, l);
  return g;
}

/** Reaktör: etkinleşince parlar. */
export function reactor() {
  const g = new THREE.Group();
  const base = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 2.6, 0.6, 12), mat(0x3a4466));
  base.position.y = 0.3; base.receiveShadow = true; base.castShadow = true;
  const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.7, 2.2, 8), mat(0x2b3352));
  pillar.position.y = 1.6; pillar.castShadow = true;
  const core = new THREE.Mesh(new THREE.IcosahedronGeometry(0.9, 1), mat(0xff5d6c, { emissive: 0xff5d6c, emissiveIntensity: 0.9 }));
  core.position.y = 3.4;
  const ring1 = new THREE.Mesh(new THREE.TorusGeometry(1.5, 0.08, 8, 32), mat(0x3ee8ff, { emissive: 0x3ee8ff, emissiveIntensity: 0.6 }));
  const ring2 = ring1.clone();
  ring1.position.y = 3.4; ring2.position.y = 3.4; ring2.rotation.x = Math.PI / 2;
  const light = new THREE.PointLight(0xff5d6c, 8, 14);
  light.position.y = 3.4;
  g.add(base, pillar, core, ring1, ring2, light);
  g.userData.update = (t) => { ring1.rotation.y = t; ring1.rotation.x = t * 0.7; ring2.rotation.z = t * 0.9; core.rotation.y = -t; };
  g.userData.setActive = (on) => {
    const c = on ? 0x3ee8ff : 0xff5d6c;
    core.material.color.set(c); core.material.emissive.set(c); light.color.set(c);
    core.material.emissiveIntensity = on ? 1.6 : 0.9; light.intensity = on ? 20 : 8;
  };
  return g;
}

/** Yarı saydam su düzlemi. */
export function water(w, d, color = 0x3aa0ff) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d, 1, 1), new THREE.MeshStandardMaterial({ color, transparent: true, opacity: 0.75, roughness: 0.2, metalness: 0.1 }));
  m.rotation.x = -Math.PI / 2;
  m.receiveShadow = true;
  return m;
}

/** Konsol / sentezleyici istasyonu. */
export function station(color = 0x3ee8ff) {
  const g = new THREE.Group();
  const base = new THREE.Mesh(new THREE.CylinderGeometry(1, 1.2, 0.3, 10), mat(0x2b3352));
  base.position.y = 0.15; base.receiveShadow = true;
  const post = new THREE.Mesh(new THREE.BoxGeometry(0.5, 1.2, 0.5), mat(0x3a4466));
  post.position.y = 0.9; post.castShadow = true;
  const screen = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.8, 0.12), mat(color, { emissive: color, emissiveIntensity: 0.7 }));
  screen.position.set(0, 1.7, 0); screen.rotation.x = -0.35;
  const ring = new THREE.Mesh(new THREE.TorusGeometry(1.3, 0.05, 6, 24), mat(color, { emissive: color, emissiveIntensity: 0.8 }));
  ring.rotation.x = Math.PI / 2; ring.position.y = 0.32;
  g.add(base, post, screen, ring);
  g.userData.setColor = (c) => { screen.material.color.set(c); screen.material.emissive.set(c); ring.material.color.set(c); ring.material.emissive.set(c); };
  return g;
}
