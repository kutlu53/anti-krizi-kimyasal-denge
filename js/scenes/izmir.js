import * as THREE from 'three';
import { World } from '../engine/world.js';
import { mat, reactor, water, station, label, rock } from '../engine/props.js';
import { dialog } from '../ui/dialog.js';
import { hud } from '../ui/hud.js';
import { openFactory } from '../ui/factory.js';
import { runQuiz } from '../ui/quiz.js';
import { izmirCheck } from '../data/questions.js';
import { state, save, addCard } from '../state.js';
import { sfx } from '../audio.js';

const SKY_DIRTY = 0xb9b1a0, SKY_CLEAN = 0x8ccfff;
const SEA_DIRTY = 0x6b6a4a, SEA_CLEAN = 0x2f8fe0;

/** Bölüm 2: İzmir – Ege reaktörü. Karışımlar ve ayırma yöntemleri. */
export function runIzmir(ctx) {
  const { canvas, controls } = ctx;
  const world = new World(canvas, controls, { sky: SKY_DIRTY, fog: { color: SKY_DIRTY, near: 30, far: 90 }, hemi: 0.75, sun: 1.3 });
  world.camOffset.set(0, 7.5, 10.5);
  ctx.world = world;
  let alive = true;
  const guard = () => { if (!alive) throw new Error('scene-exit'); };

  // --- deniz ve iskele ---
  const sea = water(160, 160, SEA_DIRTY); sea.material.opacity = 0.9; sea.position.set(0, -1.2, -20); world.scene.add(sea);
  const seabed = new THREE.Mesh(new THREE.PlaneGeometry(160, 160), mat(0x3a3a30)); seabed.rotation.x = -Math.PI / 2; seabed.position.set(0, -4, -20); world.scene.add(seabed);
  const concrete = mat(0x9aa0a8);
  world.addBox(0, -3, -12, 14, 3, 44, concrete);              // ana iskele z 10..-34
  world.addBox(12, -3, -20, 8, 3, 12, concrete);              // yan rıhtım
  // iskele kazıkları
  for (let z = 8; z > -34; z -= 6) [-7.3, 7.3].forEach((x) => { const p = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 4, 6), mat(0x4a4f63)); p.position.set(x, -2, z); world.scene.add(p); });

  // konteynerler (engel + platform)
  const cols = [0xff5d6c, 0x3ee8ff, 0xffb347, 0x5ee87a, 0x9b5cff];
  const boxes = [[-4, 0, -4, 3, 1.6, 2], [-4, 1.6, -4, 3, 1.6, 2], [4, 0, -9, 3, 1.6, 2], [0, 0, -16, 4, 1.6, 2], [3, 1.6, -16, 2, 1.6, 2], [-5, 0, -22, 3, 1.6, 2]];
  boxes.forEach(([x, y, z, w, h, d], i) => world.addBox(x, y, z, w, h, d, mat(cols[i % cols.length])));

  // vinçler
  const crane = (x, z) => {
    const g = new THREE.Group();
    const legM = mat(0xffb347);
    [[-1.5, -1.5], [1.5, -1.5], [-1.5, 1.5], [1.5, 1.5]].forEach(([dx, dz]) => { const l = new THREE.Mesh(new THREE.BoxGeometry(0.3, 10, 0.3), legM); l.position.set(dx, 5, dz); g.add(l); });
    const top = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.6, 3.6), legM); top.position.y = 10; g.add(top);
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 14), legM); arm.position.set(0, 10.5, -4); g.add(arm);
    const cab = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.4, 1.6), mat(0x2b3352)); cab.position.set(0, 11.5, 0); g.add(cab);
    g.position.set(x, 0, z); g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
    world.scene.add(g);
  };
  crane(20, -8); crane(-14, -30);

  // sokak lambaları (finalde yanar)
  const lamps = [];
  for (let z = 4; z > -30; z -= 8) [-6.4, 6.4].forEach((x) => {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 3.4, 6), mat(0x2b3352)); post.position.set(x, 1.7, z); world.scene.add(post);
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.25, 8, 8), mat(0x555566, { emissive: 0x000000 })); bulb.position.set(x, 3.5, z); world.scene.add(bulb);
    lamps.push(bulb);
  });

  // arıtma tesisi (iskele sonunda) ve kapı
  world.addBox(0, 0, -39, 16, 7, 8, mat(0x3a4466));
  const doorMesh = new THREE.Mesh(new THREE.BoxGeometry(3, 4, 0.3), mat(0x8a5a2b, { emissive: 0xff5d6c, emissiveIntensity: 0.4 }));
  doorMesh.position.set(0, 2, -34.9); world.scene.add(doorMesh);
  const sign = label('ARITMA TESİSİ', { color: '#3ee8ff', size: 40, scale: 1.6 }); sign.position.set(0, 7.8, -34.8); world.scene.add(sign);
  const pipeM = mat(0x8a8f9c);
  [[-5, -30], [5, -30]].forEach(([x, z]) => { const p = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 10, 8), pipeM); p.rotation.x = Math.PI / 2; p.position.set(x, 0.5, z); world.scene.add(p); });

  // reaktör (yan rıhtımda)
  const reactorMesh = reactor(); reactorMesh.position.set(12, 0, -22); world.scene.add(reactorMesh);
  world.addBlocker(9.6, -24.4, 14.4, -19.6, -1, 3);
  world.updaters.push((dt, t) => { reactorMesh.userData.update(t); sea.position.y = -1.2 + Math.sin(t * 0.8) * 0.05; });

  // kirli deniz: yüzen çöp/yağ lekeleri
  for (let i = 0; i < 14; i++) {
    const r = rock(0.5 + Math.random() * 0.6, i % 3 ? 0x5a5040 : 0xffd84a); r.scale.y = 0.2;
    r.position.set((Math.random() - 0.5) * 60, -1.1, -20 + (Math.random() - 0.5) * 60); world.scene.add(r);
  }

  let factoryDone = false;
  const doorTrigger = world.addTrigger(0, -33, 2.6, 'Arıtma tesisine gir', async () => {
    doorTrigger.enabled = false; world.onPrompt(null); world.frozen = true;
    try {
      await dialog.say('anti', 'Tesisime hoş geldin, küçük simyacı. Boruları tuz bloklarıyla tıkadım, filtreleri karıştırdım. Hangisi neyi ayırır, biliyor musun bakalım?'); guard();
      await dialog.say('aria', 'Kontrol odası senin. Önce tıkanan boruyu aç, sonra ayırma hatlarını kur. Her istasyonun ne tuttuğunu okumayı unutma.'); guard();
      hud.hide();
      await openFactory({ onLevelDone: () => sfx.collect() }); guard();
      hud.show();
      factoryDone = true;
      doorMesh.material.emissive.set(0x3ee8ff);
      await dialog.say('aria', 'Filtre hattı çalışıyor! Şimdi yan rıhtımdaki Ege reaktörünü başlat; arıtılmış su şehre yayılsın.'); guard();
      hud.setObjective('Ege reaktörünü başlat (E)');
      reactorTrigger.enabled = true;
    } catch (e) { if (e.message !== 'scene-exit') throw e; return; }
    world.frozen = false;
  });

  const reactorTrigger = world.addTrigger(12, -18.5, 3, 'Reaktörü başlat', async () => {
    reactorTrigger.enabled = false; world.onPrompt(null); world.frozen = true;
    try {
      await dialog.say('aria', 'Ege reaktörü çevrim içi! Arıtılmış su körfeze dönüyor... İzle!'); guard();
      sfx.success();
      const sky0 = new THREE.Color(SKY_DIRTY), sky1 = new THREE.Color(SKY_CLEAN);
      reactorMesh.userData.setActive(true);
      await world.tween(5, (e) => {
        world.scene.background.lerpColors(sky0, sky1, e); world.scene.fog.color.copy(world.scene.background);
        sea.material.color.lerpColors(new THREE.Color(SEA_DIRTY), new THREE.Color(SEA_CLEAN), e);
        sea.material.opacity = 0.9 - 0.2 * e;
        lamps.forEach((b) => { b.material.emissive.setHex(0xffe9a0); b.material.emissiveIntensity = e * 1.5; b.material.color.lerpColors(new THREE.Color(0x555566), new THREE.Color(0xfff2c0), e); });
      }); guard();
      await dialog.say('elif', '(cızırtı) İzmir... Körfez maviye döndü, görüyorum! Konya\'daki topraklar asitle yanıyor; sıradaki hedef orası.'); guard();
      await dialog.say('anti', 'İki reaktör. Konya\'da sana kimya değil, şemsiye lazım olacak. Asit yağmuru geliyor.'); guard();
      if (addCard('NaCl')) sfx.card();
      await dialog.say('aria', '🃏 Yeni kart: Tuz (NaCl). Şimdi kısa kontrol: 3 soru.'); guard();
      const res = await runQuiz({ title: 'A.R.I.A. Bölüm Kontrolü: İzmir', questions: izmirCheck, mode: 'check' }); guard();
      state.checks.izmir = { score: res.score, total: res.total };
      state.chapters.izmir = true; save();
      await dialog.say('aria', 'Haritaya dönüyoruz. Konya bir sonraki sürümde açılacak.'); guard();
      await hud.fadeOut();
      if (!alive) return;
      ctx.finish();
    } catch (e) { if (e.message !== 'scene-exit') throw e; }
  });
  reactorTrigger.enabled = false;

  world.onPrompt = (l) => hud.setPrompt(l);
  world.onFall = () => hud.toast('Körfez suyu zehirli! Geri ışınlandın.');
  world.setSpawn(0, 0, 6);
  world.teleport(0, 0, 6);
  world.player.group.rotation.y = Math.PI;

  (async () => {
    hud.show(); hud.setInventory({}, [{ icon: '🃏', text: state.cards.length }]); hud.setObjective('İskelenin sonundaki arıtma tesisine gir (E)');
    world.start(); world.frozen = true;
    await hud.fadeIn();
    try {
      await dialog.lines([
        ['sys', 'İzmir, Alsancak Limanı. Drone iniş yaptı.'],
        ['aria', 'Körfez çamur rengine dönmüş. A.N.T.İ. arıtma tesisinin filtrelerini kilitlemiş; deniz suyundaki tuz, kum, hatta hurda demir şehre akıyor.'],
        ['aria', 'Plan: İskelenin sonundaki tesise gir, ayırma istasyonlarını doğru sıraya diz. Her karışım farklı yöntem ister. Unutma: tuz suda çözünür, süzgeç onu tutamaz!'],
      ]);
    } catch (e) { return; }
    world.frozen = false;
  })();

  return () => { alive = false; world.dispose(); };
}
