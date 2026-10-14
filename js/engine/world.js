import * as THREE from 'three';
import { sfx } from '../audio.js';
import { makePlayer } from './props.js';

let renderer = null;
function getRenderer(canvas) {
  if (!renderer) {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
  }
  return renderer;
}

const PLAYER_R = 0.35;
const PLAYER_H = 1.6;

/**
 * Küçük platform motoru: kutu platformlar, duvarlar, toplanabilirler,
 * düşmanlar, etkileşim tetikleyicileri ve üçüncü şahıs kamera.
 */
export class World {
  constructor(canvas, controls, opts = {}) {
    this.canvas = canvas;
    this.controls = controls;
    this.renderer = getRenderer(canvas);
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(opts.sky ?? 0x8ccfff);
    if (opts.fog) this.scene.fog = new THREE.Fog(opts.fog.color, opts.fog.near, opts.fog.far);
    this.camera = new THREE.PerspectiveCamera(55, 1, 0.1, 400);
    this.camOffset = new THREE.Vector3(0, 7, 10);
    this.camLookUp = 1.2;

    this.hemi = new THREE.HemisphereLight(0xffffff, 0x3a5a7a, opts.hemi ?? 0.9);
    this.sun = new THREE.DirectionalLight(0xffffff, opts.sun ?? 1.6);
    this.sun.position.set(10, 24, 8);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048, 2048);
    const sc = this.sun.shadow.camera;
    sc.left = -40; sc.right = 40; sc.top = 40; sc.bottom = -40; sc.near = 1; sc.far = 100;
    this.sun.shadow.bias = -0.0005;
    this.scene.add(this.hemi, this.sun, this.sun.target);

    this.platforms = [];   // {x1,x2,z1,z2,bottom,top,mesh,enabled}
    this.triggers = [];    // {pos,radius,label,onInteract,onEnter,enabled}
    this.collectibles = []; // {mesh,baseY,phase,onCollect,radius}
    this.enemies = [];     // {mesh,a,b,speed,t,dir}
    this.updaters = [];    // fn(dt, t)
    this.tweens = [];

    this.player = makePlayer();
    this.scene.add(this.player.group);
    this.pos = this.player.group.position;
    this.vel = new THREE.Vector3();
    this.onGround = false;
    this.spawn = new THREE.Vector3(0, 0, 0);
    this.invuln = 0;
    this._frozen = false;
    this.activeTrigger = null;
    this.onPrompt = null;
    this.onFall = null;
    this.onHit = null;
    this.time = 0;
    this.running = false;
    this.clock = new THREE.Clock();
    this._raf = 0;
    this._onResize = () => this.resize();
    window.addEventListener('resize', this._onResize);
    this.resize();
  }

  /** Donmuşken girdi tüketilmez (2D oyunlar kullanabilir); çözülünce tampon temizlenir. */
  get frozen() { return this._frozen; }
  set frozen(v) { this._frozen = v; if (!v) this.controls.clear(); }

  resize() {
    const w = this.canvas.clientWidth || window.innerWidth;
    const h = this.canvas.clientHeight || window.innerHeight;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  // ---------- Seviye kurma yardımcıları ----------
  /** Yürünebilir kutu. Dönen kayıt tween ile hareket ettirilebilir. */
  addBox(x, y, z, w, h, d, material, { walkable = true, shadow = true } = {}) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
    mesh.position.set(x, y + h / 2, z);
    mesh.castShadow = shadow; mesh.receiveShadow = true;
    this.scene.add(mesh);
    const rec = { mesh, w, h, d, enabled: walkable, x1: 0, x2: 0, z1: 0, z2: 0, bottom: 0, top: 0 };
    this.syncBox(rec);
    this.platforms.push(rec);
    return rec;
  }
  syncBox(b) {
    const p = b.mesh.position;
    b.x1 = p.x - b.w / 2; b.x2 = p.x + b.w / 2;
    b.z1 = p.z - b.d / 2; b.z2 = p.z + b.d / 2;
    b.bottom = p.y - b.h / 2; b.top = p.y + b.h / 2;
  }
  /** Görünmez engel (duvar). */
  addBlocker(x1, z1, x2, z2, bottom = -5, top = 10) {
    const rec = { mesh: null, enabled: true, x1, x2, z1, z2, bottom, top, invisible: true };
    this.platforms.push(rec);
    return rec;
  }

  addTrigger(x, z, radius, label, onInteract, opts = {}) {
    const t = { pos: new THREE.Vector3(x, 0, z), radius, label, onInteract, onEnter: opts.onEnter, enabled: true, auto: !!opts.auto };
    this.triggers.push(t);
    return t;
  }

  addCollectible(mesh, x, y, z, onCollect, radius = 1.3) {
    mesh.position.set(x, y, z);
    this.scene.add(mesh);
    const c = { mesh, baseY: y, phase: Math.random() * 6.28, onCollect, radius, alive: true };
    this.collectibles.push(c);
    return c;
  }

  addEnemy(mesh, a, b, speed = 2) {
    mesh.position.copy(a);
    this.scene.add(mesh);
    const e = { mesh, a: a.clone(), b: b.clone(), speed, t: Math.random(), dir: 1, alive: true };
    this.enemies.push(e);
    return e;
  }

  tween(duration, fn, done) {
    const tw = { t: 0, duration, fn, done };
    this.tweens.push(tw);
    return new Promise((r) => { tw.resolve = r; });
  }

  setSpawn(x, y, z) { this.spawn.set(x, y, z); }
  teleport(x, y, z) { this.pos.set(x, y, z); this.vel.set(0, 0, 0); this.snapCamera(); }
  snapCamera() {
    this.camera.position.copy(this.pos).add(this.camOffset);
    this.camera.lookAt(this.pos.x, this.pos.y + this.camLookUp, this.pos.z);
  }

  // ---------- Döngü ----------
  start() {
    if (this.running) return;
    this.running = true;
    this.clock.start();
    const loop = () => {
      if (!this.running) return;
      const dt = Math.min(this.clock.getDelta(), 0.05);
      this.update(dt);
      this.renderer.render(this.scene, this.camera);
      this._raf = requestAnimationFrame(loop);
    };
    loop();
  }
  stop() { this.running = false; cancelAnimationFrame(this._raf); }

  update(dt) {
    this.time += dt;
    const p = this.pos, v = this.vel, ctl = this.controls;

    // --- girdi ---
    ctl.update();
    const speed = 6.5;
    let tx = 0, tz = 0;
    if (!this.frozen) { tx = ctl.axis.x * speed; tz = -ctl.axis.y * speed; }
    const k = 1 - Math.exp(-dt * 14);
    v.x += (tx - v.x) * k;
    v.z += (tz - v.z) * k;
    if (!this.frozen && ctl.consumeJump() && this.onGround) { v.y = 10; this.onGround = false; sfx.jump(); }
    v.y -= 28 * dt;

    // --- yatay hareket + duvar çözümü ---
    p.x += v.x * dt; p.z += v.z * dt;
    this.resolveWalls();

    // --- dikey hareket + zemin ---
    const prevY = p.y;
    p.y += v.y * dt;
    this.onGround = false;
    if (v.y <= 0) {
      for (const b of this.platforms) {
        if (!b.enabled || b.invisible) continue;
        if (p.x > b.x1 - PLAYER_R && p.x < b.x2 + PLAYER_R && p.z > b.z1 - PLAYER_R && p.z < b.z2 + PLAYER_R) {
          if (prevY >= b.top - 0.02 && p.y <= b.top) { p.y = b.top; v.y = 0; this.onGround = true; }
        }
      }
    }

    // --- düşme ---
    if (p.y < -14) {
      p.copy(this.spawn); v.set(0, 0, 0); this.invuln = 1;
      this.snapCamera();
      this.onFall?.();
    }

    // --- karakter animasyonu ---
    const moving = Math.hypot(v.x, v.z) > 0.5;
    if (moving) {
      const ang = Math.atan2(v.x, v.z);
      let d = ang - this.player.group.rotation.y;
      d = Math.atan2(Math.sin(d), Math.cos(d));
      this.player.group.rotation.y += d * Math.min(1, dt * 12);
    }
    this.player.animate(this.time, moving, this.onGround);

    // --- toplanabilirler ---
    for (const c of this.collectibles) {
      if (!c.alive) continue;
      c.mesh.position.y = c.baseY + Math.sin(this.time * 3 + c.phase) * 0.18;
      c.mesh.rotation.y += dt * 1.5;
      const dx = c.mesh.position.x - p.x, dy = c.mesh.position.y - (p.y + 0.8), dz = c.mesh.position.z - p.z;
      if (dx * dx + dy * dy + dz * dz < c.radius * c.radius) {
        c.alive = false; this.scene.remove(c.mesh);
        c.onCollect?.(c);
      }
    }

    // --- düşmanlar ---
    this.invuln = Math.max(0, this.invuln - dt);
    for (const e of this.enemies) {
      if (!e.alive) continue;
      const len = e.a.distanceTo(e.b) || 1;
      e.t += (e.speed / len) * dt * e.dir;
      if (e.t > 1) { e.t = 1; e.dir = -1; } else if (e.t < 0) { e.t = 0; e.dir = 1; }
      e.mesh.position.lerpVectors(e.a, e.b, e.t);
      e.mesh.position.y += Math.sin(this.time * 5 + e.t * 9) * 0.1;
      e.mesh.rotation.y += dt * 2; e.mesh.rotation.x += dt * 1.3;
      const s = 1 + Math.sin(this.time * 9) * 0.06; e.mesh.scale.set(s, 1 / s, s);
      if (this.invuln <= 0 && !this.frozen) {
        const dx = e.mesh.position.x - p.x, dz = e.mesh.position.z - p.z, dy = e.mesh.position.y - (p.y + 0.8);
        if (dx * dx + dz * dz < 1.3 && Math.abs(dy) < 1.5) {
          this.invuln = 1.6;
          const d = Math.hypot(dx, dz) || 1;
          v.x = -dx / d * 9; v.z = -dz / d * 9; v.y = 6;
          sfx.hit();
          this.onHit?.(e);
        }
      }
    }
    // hasar sonrası yanıp sönme
    this.player.group.visible = !this.hidePlayer && (this.invuln <= 0 || Math.floor(this.time * 12) % 2 === 0);

    // --- tetikleyiciler ---
    let nearest = null, nd = Infinity;
    for (const t of this.triggers) {
      if (!t.enabled) continue;
      const dx = t.pos.x - p.x, dz = t.pos.z - p.z;
      const d2 = dx * dx + dz * dz;
      if (d2 < t.radius * t.radius && d2 < nd) { nearest = t; nd = d2; }
    }
    if (nearest !== this.activeTrigger) {
      this.activeTrigger = nearest;
      if (nearest?.auto) { nearest.enabled = false; nearest.onInteract?.(); this.activeTrigger = null; }
      else { this.onPrompt?.(nearest ? nearest.label : null); nearest?.onEnter?.(); }
    }
    if (!this.frozen && ctl.consumeInteract() && this.activeTrigger) {
      this.activeTrigger.onInteract?.(this.activeTrigger);
    }

    // --- tween'ler ---
    for (let i = this.tweens.length - 1; i >= 0; i--) {
      const tw = this.tweens[i];
      tw.t += dt;
      const u = Math.min(1, tw.t / tw.duration);
      const e = u < 0.5 ? 2 * u * u : -1 + (4 - 2 * u) * u; // easeInOutQuad
      tw.fn(e, u);
      if (u >= 1) { this.tweens.splice(i, 1); tw.done?.(); tw.resolve?.(); }
    }

    for (const u of this.updaters) u(dt, this.time);

    // --- kamera ---
    const desired = this.pos.clone().add(this.camOffset);
    this.camera.position.lerp(desired, 1 - Math.exp(-dt * 6));
    this.camera.lookAt(p.x, p.y + this.camLookUp, p.z);
    this.sun.target.position.copy(p);
    this.sun.position.set(p.x + 10, p.y + 24, p.z + 8);
  }

  resolveWalls() {
    const p = this.pos;
    for (const b of this.platforms) {
      if (!b.enabled) continue;
      const feet = p.y, head = p.y + PLAYER_H;
      // yalnızca gövde kutunun içine giriyorsa (basamak çıkma payı 0.5)
      if (feet >= b.top - 0.5 || head <= b.bottom) continue;
      const x1 = b.x1 - PLAYER_R, x2 = b.x2 + PLAYER_R, z1 = b.z1 - PLAYER_R, z2 = b.z2 + PLAYER_R;
      if (p.x <= x1 || p.x >= x2 || p.z <= z1 || p.z >= z2) continue;
      const dx1 = p.x - x1, dx2 = x2 - p.x, dz1 = p.z - z1, dz2 = z2 - p.z;
      const m = Math.min(dx1, dx2, dz1, dz2);
      if (m === dx1) { p.x = x1; this.vel.x = Math.min(0, this.vel.x); }
      else if (m === dx2) { p.x = x2; this.vel.x = Math.max(0, this.vel.x); }
      else if (m === dz1) { p.z = z1; this.vel.z = Math.min(0, this.vel.z); }
      else { p.z = z2; this.vel.z = Math.max(0, this.vel.z); }
    }
  }

  dispose() {
    this.stop();
    window.removeEventListener('resize', this._onResize);
    this.scene.traverse((o) => {
      if (o.geometry) o.geometry.dispose();
      if (o.material) {
        const mats = Array.isArray(o.material) ? o.material : [o.material];
        mats.forEach((m) => { m.map?.dispose?.(); m.dispose(); });
      }
    });
    this.renderer.renderLists.dispose();
  }
}
