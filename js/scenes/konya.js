import * as THREE from 'three';
import { World } from '../engine/world.js';
import { mat, reactor, station, label, rock } from '../engine/props.js';
import { dialog } from '../ui/dialog.js';
import { hud } from '../ui/hud.js';
import { openPhDrone } from '../ui/phDrone.js';
import { runQuiz } from '../ui/quiz.js';
import { konyaCheck } from '../data/questions.js';
import { state, save, addCard } from '../state.js';
import { sfx } from '../audio.js';

const SKY_ACID = 0xc9b7a0, SKY_CLEAN = 0x8ccfff;

/** Bölüm 3: Konya – İç Anadolu reaktörü. Asit, baz, pH, nötralleşme. */
export function runKonya(ctx) {
  const { canvas, controls } = ctx;
  const world = new World(canvas, controls, { sky: SKY_ACID, fog: { color: SKY_ACID, near: 30, far: 90 }, hemi: 0.8, sun: 1.4 });
  world.camOffset.set(0, 7.5, 10.5);
  ctx.world = world;
  let alive = true;
  const guard = () => { if (!alive) throw new Error('scene-exit'); };

  // --- ova: çatlak toprak ---
  const groundM = mat(0x9c7a4f);
  world.addBox(0, -3, -20, 60, 3, 70, groundM);
  // çatlaklar (koyu ince kutular)
  const cracks = new THREE.Group();
  for (let i = 0; i < 30; i++) {
    const c = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.05, 2 + Math.random() * 4), mat(0x5a4330));
    c.position.set((Math.random() - 0.5) * 50, 0.03, -20 + (Math.random() - 0.5) * 60); c.rotation.y = Math.random() * Math.PI; cracks.add(c);
  }
  world.scene.add(cracks);
  // buğday sıraları (ölü, kısa; finalde altın ve uzun)
  const wheat = [];
  const wheatM = mat(0x7a6a4a);
  for (let x = -22; x <= 22; x += 2.2) for (let z = 4; z > -44; z -= 2.2) {
    if (Math.abs(x) < 3.5 && z > -40) continue; // yol
    const w = new THREE.Mesh(new THREE.ConeGeometry(0.35, 1, 5), wheatM);
    w.position.set(x + (Math.random() - 0.5) * 0.8, 0.5, z + (Math.random() - 0.5) * 0.8); w.scale.y = 0.5; w.castShadow = true;
    world.scene.add(w); wheat.push(w);
  }
  // çiftlik evi ve silo
  world.addBox(-14, 0, -30, 8, 4, 6, mat(0xe8d9c0));
  const roof = new THREE.Mesh(new THREE.ConeGeometry(6.5, 3, 4), mat(0xb8442f)); roof.position.set(-14, 5.5, -30); roof.rotation.y = Math.PI / 4; world.scene.add(roof);
  const silo = new THREE.Mesh(new THREE.CylinderGeometry(2, 2, 8, 12), mat(0x9aa0a8)); silo.position.set(-22, 4, -34); silo.castShadow = true; world.scene.add(silo);
  world.addBlocker(-24, -36, -20, -32, -1, 8);
  // asit yağmuru bulutları (3D dekor, finalde dağılır)
  const cloudsG = new THREE.Group();
  for (let i = 0; i < 8; i++) {
    const c = new THREE.Group();
    [[0, 0, 2.2], [-1.8, 0.2, 1.6], [1.8, 0.3, 1.7], [0, 0.8, 1.5]].forEach(([dx, dy, r]) => { const s = new THREE.Mesh(new THREE.IcosahedronGeometry(r, 1), mat(0x5a4a7a, { transparent: true, opacity: 0.85 })); s.position.set(dx, dy, 0); c.add(s); });
    c.position.set((Math.random() - 0.5) * 50, 12 + Math.random() * 3, -20 + (Math.random() - 0.5) * 50);
    cloudsG.add(c);
  }
  world.scene.add(cloudsG);
  world.updaters.push((dt, t) => { cloudsG.children.forEach((c, i) => { c.position.x += Math.sin(t * 0.3 + i) * dt * 0.5; }); reactorMesh.userData.update(t); });

  // drone pisti
  world.addBox(0, 0, -12, 6, 0.3, 6, mat(0x3a4466));
  const padRing = new THREE.Mesh(new THREE.TorusGeometry(2.4, 0.08, 6, 32), mat(0x3ee8ff, { emissive: 0x3ee8ff, emissiveIntensity: 0.8 })); padRing.rotation.x = Math.PI / 2; padRing.position.set(0, 0.35, -12); world.scene.add(padRing);
  const droneMesh = new THREE.Group();
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.5, 10, 8), mat(0xffb347)); droneMesh.add(body);
  [[-0.8, -0.8], [0.8, -0.8], [-0.8, 0.8], [0.8, 0.8]].forEach(([x, z]) => { const arm = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.1, 1.1), mat(0x2b3764)); arm.position.set(x / 2, 0, z / 2); arm.rotation.y = Math.atan2(x, z); droneMesh.add(arm); const rotor = new THREE.Mesh(new THREE.TorusGeometry(0.35, 0.04, 6, 16), mat(0xeef2ff)); rotor.rotation.x = Math.PI / 2; rotor.position.set(x, 0.1, z); droneMesh.add(rotor); });
  droneMesh.position.set(0, 0.9, -12); world.scene.add(droneMesh);
  const padLabel = label('DRONE', { color: '#3ee8ff', size: 44, scale: 1.2 }); padLabel.position.set(0, 2.6, -12); world.scene.add(padLabel);

  // reaktör
  const reactorMesh = reactor(); reactorMesh.position.set(0, 0, -40); world.scene.add(reactorMesh);
  world.addBlocker(-2.4, -42.4, 2.4, -37.6, -1, 3);

  const droneTrigger = world.addTrigger(0, -9.5, 2.6, 'Drone\'u başlat', async () => {
    droneTrigger.enabled = false; world.onPrompt(null); world.frozen = true;
    try {
      await dialog.say('anti', 'Konya Ovası artık benim asit tarlam. pH 3! Buğday yerine pas yetişir. Hahaha.'); guard();
      await dialog.say('aria', 'Drone\'da iki tank var: amonyak (baz) ve sirke (asit). Reaktör amonyağı sentezliyor, depodan doldurursun. Kırmızı lahana suyu püskürtücü açık: toprağın rengi pH\'ı söyler.'); guard();
      hud.setButtons('🧪', '🍋');
      const res = await openPhDrone({ controls, onWaveDone: () => sfx.collect() }); guard();
      hud.setButtons();
      void res;
      await dialog.say('aria', 'Tarla nötr! Şimdi İç Anadolu reaktörünü başlat; amonyak sentezi gübreye dönsün ve ova yeşersin.'); guard();
      hud.setObjective('Reaktörü başlat (E)');
      hud.setInventory({}, [{ icon: '🃏', text: state.cards.length }]);
      reactorTrigger.enabled = true;
    } catch (e) { if (e.message !== 'scene-exit') throw e; return; }
    world.frozen = false;
  });

  const reactorTrigger = world.addTrigger(0, -36.5, 3, 'Reaktörü başlat', async () => {
    reactorTrigger.enabled = false; world.onPrompt(null); world.frozen = true;
    try {
      await dialog.say('aria', 'İç Anadolu reaktörü çevrim içi! Asit bulutları dağılıyor, toprak nefes alıyor... İzle!'); guard();
      sfx.success();
      const sky0 = new THREE.Color(SKY_ACID), sky1 = new THREE.Color(SKY_CLEAN);
      reactorMesh.userData.setActive(true);
      await world.tween(5, (e) => {
        world.scene.background.lerpColors(sky0, sky1, e); world.scene.fog.color.copy(world.scene.background);
        groundM.color.lerpColors(new THREE.Color(0x9c7a4f), new THREE.Color(0x6a8a3a), e);
        wheatM.color.lerpColors(new THREE.Color(0x7a6a4a), new THREE.Color(0xf0c436), e);
        wheat.forEach((w) => { w.scale.y = 0.5 + e * 1.6; w.position.y = 0.5 * w.scale.y; });
        cloudsG.children.forEach((c) => { c.scale.setScalar(1 - e * 0.98); c.position.y += e * 0.2; });
        cracks.children.forEach((c) => { c.scale.x = 1 - e * 0.95; });
      }); guard();
      await dialog.say('elif', '(cızırtı) Altın sarısı... Konya\'yı görüyorum! Sırada Zonguldak var: santral aşırı ısınmış, donma-erime döngüsü bozulmuş.'); guard();
      await dialog.say('anti', 'Üç reaktör. Zonguldak\'ta seni ateşle değil, buzla karşılayacağım.'); guard();
      if (addCard('NH3')) sfx.card();
      await dialog.say('aria', '🃏 Yeni kart: Amonyak (NH₃). Kısa kontrol: 3 soru.'); guard();
      const res = await runQuiz({ title: 'A.R.I.A. Bölüm Kontrolü: Konya', questions: konyaCheck, mode: 'check' }); guard();
      state.checks.konya = { score: res.score, total: res.total };
      state.chapters.konya = true; save();
      await dialog.say('aria', 'Haritaya dönüyoruz. Zonguldak bir sonraki sürümde açılacak.'); guard();
      await hud.fadeOut();
      if (!alive) return;
      ctx.finish();
    } catch (e) { if (e.message !== 'scene-exit') throw e; }
  });
  reactorTrigger.enabled = false;

  world.onPrompt = (l) => hud.setPrompt(l);
  world.setSpawn(0, 0, 2);
  world.teleport(0, 0, 2);
  world.player.group.rotation.y = Math.PI;

  (async () => {
    hud.show(); hud.setInventory({}, [{ icon: '🃏', text: state.cards.length }]); hud.setObjective('Drone pistine git (E)');
    world.start(); world.frozen = true;
    await hud.fadeIn();
    try {
      await dialog.lines([
        ['sys', 'Konya Ovası. Drone iniş yaptı.'],
        ['aria', 'Toprak çatlamış, gökyüzü pas rengi. A.N.T.İ. asit yağmuru yağdırıyor; tarlaların pH\'ı 3\'e düşmüş. Hiçbir tohum çimlenmiyor.'],
        ['aria', 'Plan: Tarım drone\'unu başlat, toprağı indikatörle tara, asidik kareleri bazla nötrle. Fazla kaçırırsan toprak bazik olur, o da kötü!'],
      ]);
    } catch (e) { return; }
    world.frozen = false;
  })();

  return () => { alive = false; hud.setButtons(); world.dispose(); };
}
