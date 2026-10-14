import * as THREE from 'three';
import { World } from '../engine/world.js';
import { mat, atomMesh, enemyMesh, tree, rock, station, reactor, water, cardMesh, label } from '../engine/props.js';
import { dialog } from '../ui/dialog.js';
import { hud } from '../ui/hud.js';
import { openMoleculeBuilder } from '../ui/moleculeBuilder.js';
import { runQuiz } from '../ui/quiz.js';
import { orduCheck } from '../data/questions.js';
import { state, save, addCard } from '../state.js';
import { sfx } from '../audio.js';

const SKY_DRY = 0xd9c7a3, SKY_WET = 0x8ccfff;

/** Bölüm 1: Ordu – Karadeniz reaktörü. Saf maddeler, element ve bileşik. */
export function runOrdu(ctx) {
  const { canvas, controls } = ctx;
  const world = new World(canvas, controls, { sky: SKY_DRY, fog: { color: SKY_DRY, near: 30, far: 90 }, hemi: 0.8, sun: 1.5 });
  world.camOffset.set(0, 7.5, 10.5);
  ctx.world = world;
  let alive = true;
  const guard = () => { if (!alive) throw new Error('scene-exit'); };

  const inventory = { H: 0, O: 0 };
  const refreshInv = () => hud.setInventory(inventory, [{ icon: '🃏', text: state.cards.length }]);

  // --- zemin: kuru nehir yatağı ---
  const bed = new THREE.Mesh(new THREE.PlaneGeometry(60, 140), mat(0x8a6b45));
  bed.rotation.x = -Math.PI / 2; bed.position.set(0, -3, -45); bed.receiveShadow = true;
  world.scene.add(bed);
  const river = water(60, 140, 0x6b5a3a); river.material.opacity = 0.5;
  river.position.set(0, -2.9, -45); world.scene.add(river);
  // kıyı tepeleri
  const hillM = mat(0x9c7f55);
  for (let z = 10; z > -100; z -= 12) {
    [-20, 20].forEach((x) => { const h = rock(4 + Math.random() * 3, 0x9c7f55); h.position.set(x + (Math.random() - 0.5) * 4, -2, z); h.scale.y = 0.6; world.scene.add(h); });
  }

  // --- platolar ---
  const groundM = mat(0xb08a5a);
  const plateaus = [
    { name: 'A', z1: 8, z2: -12, w: 18 },
    { name: 'B', z1: -20, z2: -42, w: 18 },
    { name: 'C', z1: -52, z2: -74, w: 18 },
    { name: 'D', z1: -82, z2: -96, w: 16 },
  ];
  plateaus.forEach((p) => {
    const d = p.z1 - p.z2;
    world.addBox(0, -3, (p.z1 + p.z2) / 2, p.w, 3, d, groundM);
    // kenar çimi/kaya dekoru
    for (let i = 0; i < 5; i++) {
      const r = rock(0.4 + Math.random() * 0.5, 0x7a6a4a);
      r.position.set((Math.random() < 0.5 ? -1 : 1) * (p.w / 2 - 0.6), 0, p.z2 + Math.random() * d);
      world.scene.add(r);
    }
  });

  // ağaçlar (ölü → canlı)
  const trees = [];
  const treeSpots = [[-7.5, 6], [7.5, 2], [-7.5, -4], [7.5, -24], [-7.5, -28], [-7.5, -38], [7.5, -56], [-7.5, -60], [7.5, -68], [-6, -94], [6, -94], [-7, -86], [7, -86]];
  treeSpots.forEach(([x, z]) => { const t = tree(1 + Math.random() * 0.5, true); t.position.set(x, 0, z); world.scene.add(t); trees.push(t); });

  // --- engeller ve basamak kayalar ---
  const stepM = mat(0x8a8f9c);
  const steps = [[-7, 0, -34, 2, 1, 2], [-7, 0, -36.2, 2, 2, 2], [-7, 0, -38.4, 2, 3, 2], [3, 0, -30, 2.2, 1, 2.2], [0, 0, -62, 2, 1.2, 2], [-4, 0, -66, 2, 1, 2]];
  steps.forEach(([x, y, z, w, h, d]) => world.addBox(x, y, z, w, h, d, stepM));
  const bigRocks = [[-6, -8, 1.3], [6, -4, 1.1], [0, -26, 1.4], [5, -36, 1.2], [-3, -56, 1.3], [6, -62, 1.1], [-6, -70, 1.2]];
  bigRocks.forEach(([x, z, s]) => { const r = rock(s); r.position.set(x, 0.1, z); world.scene.add(r); world.addBlocker(x - s * 0.8, z - s * 0.8, x + s * 0.8, z + s * 0.8, -1, s); });

  // --- sallar ve su seviyesi ---
  const raftM = mat(0x6b4a2b);
  const gaps = [
    { need: 1, rafts: [[0, -14.5], [1.5, -17.8]], station: [5, -10], waterY: -2.2 },
    { need: 2, rafts: [[-1, -44.5], [1.5, -47.5], [-0.5, -50]], station: [5, -40], waterY: -1.4 },
    { need: 3, rafts: [[0, -76], [1.5, -79.3]], station: [5, -72], waterY: -0.6 },
  ];
  gaps.forEach((gp) => {
    gp.raftRecs = gp.rafts.map(([x, z]) => {
      const r = world.addBox(x, -3.6, z, 2.6, 0.4, 2.6, raftM);
      r.enabled = false; return r;
    });
    gp.built = 0; gp.done = false;
    const st = station(0xffb347); st.position.set(gp.station[0], 0, gp.station[1]); world.scene.add(st); gp.mesh = st;
    gp.trigger = world.addTrigger(gp.station[0], gp.station[1], 2.4, 'Su sentezle', () => useStation(gp));
  });

  async function useStation(gp) {
    if (gp.done) { hud.toast('Bu sentezleyici işini bitirdi. İleri!'); return; }
    world.frozen = true; world.onPrompt(null);
    try {
      const res = await openMoleculeBuilder({ inventory, need: gp.need, built: gp.built, onBuilt: () => { refreshInv(); } }); guard();
      refreshInv();
      gp.built = res.built;
      if (gp.built >= gp.need) {
        gp.done = true; gp.mesh.userData.setColor(0x3ee8ff); gp.trigger.enabled = false;
        sfx.water();
        await dialog.say('aria', `Su geliyor! ${gp.need} molekül... Aslında gerçek bir nehir için katrilyonlarca gerekir ama reaktör gerisini çoğaltıyor. Sallara atla!`); guard();
        const y0 = river.position.y;
        await world.tween(2.5, (e) => {
          river.position.y = y0 + (gp.waterY - y0) * e;
          gp.raftRecs.forEach((r) => { r.mesh.position.y = -3.4 + e * 3.2; world.syncBox(r); });
        }); guard();
        gp.raftRecs.forEach((r) => (r.enabled = true));
        river.material.color.lerp(new THREE.Color(0x3aa0ff), 0.5);
        hud.setObjective('Sallardan karşıya geç');
      } else {
        hud.toast(`${gp.need - gp.built} su molekülü daha lazım.`);
      }
    } catch (e) { if (e.message !== 'scene-exit') throw e; return; }
    world.frozen = false;
  }
  // sallar hafif sallanır
  world.updaters.push((dt, t) => {
    gaps.forEach((gp) => { if (gp.done) gp.raftRecs.forEach((r, i) => { r.mesh.rotation.z = Math.sin(t * 1.5 + i) * 0.05; }); });
    reactorMesh.userData.update(t);
  });

  // --- atomlar ---
  const atoms = [
    ['H', -6, 2], ['H', -3, -6], ['H', 6, 5], ['H', 2, -9], ['O', -7, -9], ['O', 7, -2],
    ['H', -5, -23], ['H', 4, -27], ['H', -2, -33], ['H', 7, -31], ['H', -6, -40], ['H', 2, -38], ['O', -4, -28], ['O', 6, -39], ['O', 0, -36], ['O', 3, -30.2],
    ['H', -6, -55], ['H', 5, -58], ['H', -2, -60], ['H', 7, -65], ['H', -7, -64], ['H', 3, -69], ['H', -3, -72], ['H', 1, -62.2], ['O', 6, -54], ['O', -5, -59], ['O', 2, -66], ['O', -6, -73], ['O', 7, -71],
  ];
  const spawnAtom = (sym, x, z, y = 1) => world.addCollectible(atomMesh(sym), x, y, z, () => {
    inventory[sym] += 1; sfx.collect(); refreshInv(); hud.bump(sym);
  });
  atoms.forEach(([s, x, z]) => spawnAtom(s, x, z, z === -30.2 ? 2 : z === -62.2 ? 2.2 : 1));

  // --- kartlar ---
  world.addCollectible(cardMesh('H'), -8, 0.9, 7, () => { addCard('H'); sfx.card(); refreshInv(); hud.toast('🃏 Element kartı: Hidrojen! Müzede incele.', 3000); });
  world.addCollectible(cardMesh('O'), -7, 3.9, -38.4, () => { addCard('O'); sfx.card(); refreshInv(); hud.toast('🃏 Element kartı: Oksijen! Müzede incele.', 3000); });

  // --- düşmanlar ---
  const enemyPaths = [
    [[-7, 0, -30], [7, 0, -30]],
    [[-7, 0, -57], [7, 0, -57]],
    [[7, 0, -67], [-7, 0, -67]],
  ];
  enemyPaths.forEach(([a, b], i) => world.addEnemy(enemyMesh(), new THREE.Vector3(...a), new THREE.Vector3(...b), 2.4 + i * 0.5));
  world.onHit = () => {
    const have = Object.entries(inventory).filter(([, n]) => n > 0).map(([s]) => s);
    if (!have.length) { hud.toast('Entropi yaratığı seni savurdu!'); return; }
    const sym = have[Math.floor(Math.random() * have.length)];
    inventory[sym] -= 1; refreshInv();
    const p = world.pos;
    const ang = Math.random() * Math.PI * 2;
    const nx = Math.max(-8, Math.min(8, p.x + Math.cos(ang) * 3));
    spawnAtom(sym, nx, p.z + Math.sin(ang) * 3, 1.2);
    hud.toast(`Entropi yaratığı bir ${sym} atomunu kaptı! Geri al.`);
  };
  world.onFall = () => hud.toast('Nehir yatağı entropi tozuyla dolu. Geri ışınlandın!');
  world.updaters.push(() => { if (world.pos.y < -2 && world.onGround) { world.pos.y = -20; } });

  // --- kontrol noktaları ve A.N.T.İ. sataşması ---
  world.addTrigger(0, -21, 9, '', () => { world.setSpawn(0, 0, -21); }, { auto: true });
  world.addTrigger(0, -53, 9, '', () => { world.setSpawn(0, 0, -53); }, { auto: true });
  world.addTrigger(0, -83, 8, '', () => { world.setSpawn(0, 0, -83); hud.setObjective('Reaktörü başlat (E)'); }, { auto: true });
  world.addTrigger(0, -24, 4, '', async () => {
    world.frozen = true;
    try {
      await dialog.say('anti', 'Hâlâ buradasın demek. Sana küçük bir ipucu: oksijeni İKİ KAT koy. Daha güçlü su olur. Hahaha.'); guard();
      await dialog.say('aria', 'Ona inanma! Oksijeni ikiye katlarsan su değil, H₂O₂ hidrojen peroksit olur. Tarif değişirse madde değişir.'); guard();
    } catch (e) { return; }
    world.frozen = false;
    hud.setObjective('Atom topla ve 2 su molekülü sentezle');
  }, { auto: true });
  world.addTrigger(0, -56, 4, '', () => hud.setObjective('Atom topla ve 3 su molekülü sentezle'), { auto: true });

  // --- reaktör ---
  const reactorMesh = reactor();
  reactorMesh.position.set(0, 0, -92); world.scene.add(reactorMesh);
  world.addBlocker(-2.4, -94.4, 2.4, -89.6, -1, 3);
  const reactorTrigger = world.addTrigger(0, -88.5, 3, 'Reaktörü başlat', async () => {
    reactorTrigger.enabled = false; world.onPrompt(null); world.frozen = true;
    try {
      await dialog.say('aria', 'Karadeniz reaktörü çevrim içi! Su döngüsü başlıyor: buharlaşma, yağış, nehir... İzle!'); guard();
      sfx.success();
      const sky0 = new THREE.Color(SKY_DRY), sky1 = new THREE.Color(SKY_WET);
      const riverY = river.position.y;
      reactorMesh.userData.setActive(true);
      await world.tween(5, (e) => {
        world.scene.background.lerpColors(sky0, sky1, e);
        world.scene.fog.color.copy(world.scene.background);
        river.position.y = riverY + (-0.4 - riverY) * e;
        river.material.color.lerpColors(new THREE.Color(0x6b5a3a), new THREE.Color(0x3aa0ff), Math.min(1, e * 1.5));
        river.material.opacity = 0.5 + 0.3 * e;
        trees.forEach((t) => t.userData.setLife(e));
        bed.material.color.lerpColors(new THREE.Color(0x8a6b45), new THREE.Color(0x4a8a4f), e);
        groundM.color.lerpColors(new THREE.Color(0xb08a5a), new THREE.Color(0x6fbf5a), e);
      }); guard();
      await dialog.say('elif', '(cızırtı) ...duyuyor musun? Nehrin sesi... Harika iş. Ben Ankara\'da, A.N.T.İ. çekirdeğinin yanında kilitliyim. Sonraki hedef İzmir: deniz suyu tuzdan ayrılmalı.'); guard();
      await dialog.say('anti', 'Tek nehir. Tebrikler. Diğerleri için bu kadar nazik olmayacağım.'); guard();
      if (addCard('H2O')) { sfx.card(); refreshInv(); }
      await dialog.say('aria', '🃏 Yeni kart: Su (H₂O). Şimdi küçük bir kontrol: bu bölümde ne öğrendin? 3 soru.'); guard();
      const res = await runQuiz({ title: 'A.R.I.A. Bölüm Kontrolü: Ordu', questions: orduCheck, mode: 'check' }); guard();
      state.checks.ordu = { score: res.score, total: res.total };
      state.chapters.ordu = true; save();
      await dialog.say('aria', 'Haritaya dönüyoruz. Diğer reaktörler bir sonraki sürümde açılacak. Müzede kartlarına bakabilirsin!'); guard();
      await hud.fadeOut();
      if (!alive) return;
      ctx.finish();
    } catch (e) { if (e.message !== 'scene-exit') throw e; }
  });

  world.onPrompt = (l) => hud.setPrompt(l);
  world.setSpawn(0, 0, 4);
  world.teleport(0, 0, 4);
  world.player.group.rotation.y = Math.PI;

  // --- hikâye ---
  (async () => {
    hud.show(); refreshInv(); hud.setObjective('Atom topla: su için 2 H + 1 O');
    world.start(); world.frozen = true;
    await hud.fadeIn();
    try {
      await dialog.lines([
        ['sys', 'Ordu, Karadeniz kıyısı. Drone iniş yaptı.'],
        ['aria', 'Nehir yatağı bomboş. A.N.T.İ. su moleküllerini hidrojen ve oksijene ayırmış; atomlar etrafta başıboş dolaşıyor.'],
        ['aria', 'Plan: Atomları topla, turuncu sentezleyicide suya çevir. Su yükselince sallar yüzer ve karşıya geçersin.'],
        ['aria', 'Dikkat: mor entropi yaratıkları atomlarını çalar. Zıplayarak kaç! Bir de parlayan kartları ara, müzeye gidiyorlar.'],
      ]);
    } catch (e) { return; }
    world.frozen = false;
  })();

  return () => { alive = false; world.dispose(); };
}
