import * as THREE from 'three';
import { World } from '../engine/world.js';
import { mat, atomMesh, crate, station, label } from '../engine/props.js';
import { dialog } from '../ui/dialog.js';
import { hud } from '../ui/hud.js';
import { openAtomBuilder } from '../ui/atomBuilder.js';
import { runQuiz } from '../ui/quiz.js';
import { preTest } from '../data/questions.js';
import { state, save, addCard } from '../state.js';
import { sfx } from '../audio.js';

/** Prolog: Dr. Elif'in yeraltı sığınağı. Atom yapısı. */
export function runProlog(ctx) {
  const { canvas, controls } = ctx;
  const world = new World(canvas, controls, {
    sky: 0x05070f, fog: { color: 0x05070f, near: 14, far: 40 }, hemi: 0.45, sun: 0.35,
  });
  world.camOffset.set(0, 8, 8.5);
  ctx.world = world;
  let alive = true;
  const guard = () => { if (!alive) throw new Error('scene-exit'); };

  // --- oda ---
  const floorM = mat(0x2a3150), wallM = mat(0x1b2140);
  world.addBox(0, -1, 0, 26, 1, 18, floorM);                 // zemin (üst y=0)
  world.addBox(0, 0, -9.5, 26, 5, 1, wallM);                 // arka duvar
  world.addBox(0, 0, 9.5, 26, 0.6, 1, wallM);                // ön duvar: alçak korkuluk (kamera görsün)
  world.addBlocker(-13, 9, 13, 10, -1, 6);
  world.addBox(-13.5, 0, 0, 1, 5, 20, wallM);
  world.addBox(13.5, 0, 0, 1, 5, 20, wallM);
  // tavan lambaları
  [[-8, 0], [0, 3], [8, 0]].forEach(([x, z]) => {
    const fixture = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.1, 1.2), mat(0x3ee8ff, { emissive: 0x3ee8ff, emissiveIntensity: 0.5 }));
    fixture.position.set(x, 4.9, z); world.scene.add(fixture);
    const pl = new THREE.PointLight(0x9fd8ff, 14, 16); pl.position.set(x, 4.3, z); world.scene.add(pl);
  });
  // kapı (arka duvarda, kayarak açılır)
  const doorM = mat(0x8a5a2b, { emissive: 0xff5d6c, emissiveIntensity: 0.4 });
  const door = world.addBox(0, 0, -9.5, 3, 4, 1.2, doorM);
  const doorSign = label('KİLİTLİ', { color: '#ff5d6c', size: 44, scale: 1.2 });
  doorSign.position.set(0, 4.6, -8.8); world.scene.add(doorSign);

  // kasalar (engel ve platform)
  const crates = [[-9, 6, 1.4], [-7.6, 6, 1.4], [-9, 7.4, 1.4], [9, -6, 1.2], [10.4, -6, 1.2], [8, 7, 1], [-10, -6, 1.6], [3, 3, 1], [4.2, 3, 1]];
  crates.forEach(([x, z, s]) => {
    const c = crate(s); world.addBox(x, 0, z, s, s, s, c.material);
  });
  world.addBox(9.7, 1.2, -6, 1.2, 1.2, 1.2, mat(0x8a5a2b)); // kasaların üstünde ikinci kat

  // masa ve konsol
  world.addBox(0, 0, -6, 5, 1, 2, mat(0x3a4466));
  const console_ = station(0xff5d6c);
  console_.position.set(0, 1, -6); world.scene.add(console_);
  const consoleLabel = label('KONSOL', { color: '#ffb347', size: 44, scale: 1.2 });
  consoleLabel.position.set(0, 4.2, -6); world.scene.add(consoleLabel);

  // yatak, raf gibi dekor
  world.addBox(-11, 0, 3, 2, 0.6, 4, mat(0x5d4a8a));
  world.addBox(11.5, 0, 2, 1.5, 3, 5, mat(0x2b3352));

  // oyuncu feneri
  const spot = new THREE.SpotLight(0xfff2d0, 60, 22, 0.55, 0.5, 1.6);
  spot.position.set(0, 1.5, 0.2); spot.target.position.set(0, 0.5, 6);
  spot.castShadow = true;
  world.player.group.add(spot, spot.target);
  const lamp = new THREE.PointLight(0x3ee8ff, 6, 10); lamp.position.set(0, 3, -6); world.scene.add(lamp);

  // --- parçacık kutuları ---
  const parts = [
    { key: 'p', text: 'p⁺', pos: [-9, 1, -7], fact: 'Proton: artı yüklü. Çekirdekte yaşar, elementin kimliğini belirler.' },
    { key: 'n', text: 'n', pos: [10.4, 2.9, -6], fact: 'Nötron: yüksüz. Çekirdeğin dengeleyicisi, protonları bir arada tutar.' },
    { key: 'e', text: 'e⁻', pos: [-8.3, 2.2, 6.7], fact: 'Elektron: eksi yüklü, minik ve hızlı. Çekirdeğin çevresinde fırıl fırıl döner.' },
  ];
  let found = 0;
  const partMesh = (p) => {
    const g = new THREE.Group();
    const color = p.key === 'p' ? 0xff5d6c : p.key === 'n' ? 0xaab2c8 : 0x3ee8ff;
    const box = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.7, 0.7), mat(color, { emissive: color, emissiveIntensity: 0.6 }));
    box.castShadow = true;
    const l = label(p.text, { size: 56, scale: 1 }); l.position.y = 1;
    const pl = new THREE.PointLight(color, 3, 5); pl.position.y = 0.5;
    g.add(box, l, pl);
    return g;
  };
  const setObjective = () => hud.setObjective(found < 3 ? `Parçacık kutularını bul (${found}/3)` : 'Konsola git ve atom modelini kur (E)');
  const refreshInv = () => hud.setInventory({}, parts.filter((p) => p.got).map((p) => ({ icon: '📦', text: p.text })));

  parts.forEach((p) => {
    world.addCollectible(partMesh(p), p.pos[0], p.pos[1], p.pos[2], () => {
      p.got = true; found += 1; sfx.collect();
      refreshInv(); setObjective();
      hud.toast(p.fact, 3600);
      if (found === 3) consoleTrigger.enabled = true;
    });
  });

  // --- konsol etkileşimi ---
  const consoleTrigger = world.addTrigger(0, -4.2, 2.2, 'Atom modelini kur', async () => {
    consoleTrigger.enabled = false; world.onPrompt(null);
    world.frozen = true;
    try {
      await dialog.say('aria', 'Konsol açıldı. Dr. Elif\'in Helyum modeli dağılmış. Parçacıkları doğru yere sürükle: protonlar ve nötronlar çekirdeğe, elektronlar yörüngeye.'); guard();
      await openAtomBuilder(); guard();
      console_.userData.setColor(0x3ee8ff);
      await dialog.say('aria', 'Model kararlı! Kapı kilidi çözülüyor... Dur. Bir şey daha. Hafızam hasarlı, seninkini kontrol etmem lazım.'); guard();
      await dialog.say('aria', 'Kısa bir tarama: 5 soru. Yanlış diye bir şey yok, sadece haritanı çıkarıyorum. Macera bitince karşılaştıracağız.'); guard();
      const res = await runQuiz({ title: 'A.R.I.A. Hafıza Taraması', intro: 'Bildiğin kadarıyla cevapla.', questions: preTest, mode: 'scan' }); guard();
      state.preTest = res; save();
      await dialog.say('anti', 'Kkkkh— yeni bir oyuncu mu? Dr. Elif de böyle umutluydu. Nehirleri kuruttum, denizleri tuza boğdum. Sırada sen varsın, küçük simyacı.'); guard();
      await dialog.say('aria', 'A.N.T.İ. sistemimize sızdı! Hızlı ol. Kapı açılıyor, drone yukarıda bekliyor. İlk durak Ordu: Karadeniz\'in suyu atomlarına ayrılıyor.'); guard();
      if (addCard('He')) hud.toast('🃏 Element kartı: Helyum! Müzede incele.', 3000);
      // kapı açılır
      doorSign.material.map.dispose(); world.scene.remove(doorSign);
      sfx.water();
      await world.tween(1.6, (e) => { door.mesh.position.y = 2 + e * 4.2; world.syncBox(door); });
      door.enabled = false;
      hud.setObjective('Kapıdan çık');
      exitTrigger.enabled = true;
    } catch (e) { if (e.message !== 'scene-exit') throw e; return; }
    world.frozen = false;
  });
  consoleTrigger.enabled = false;

  const exitTrigger = world.addTrigger(0, -8.6, 1.6, '', async () => {
    world.frozen = true;
    state.chapters.prolog = true; save();
    await hud.fadeOut();
    if (!alive) return;
    ctx.finish();
  }, { auto: true });
  exitTrigger.enabled = false;

  world.onPrompt = (l) => hud.setPrompt(l);
  world.setSpawn(0, 0, 5);
  world.teleport(0, 0, 5);
  world.player.group.rotation.y = Math.PI;

  // --- hikâye ---
  (async () => {
    hud.show(); refreshInv(); setObjective();
    world.start();
    world.frozen = true;
    await hud.fadeIn();
    try {
      await dialog.lines([
        ['sys', 'Yıl 2140. Ankara. Yerin 40 metre altı.'],
        ['aria', 'Sistem yeniden başlatılıyor... Merhaba! Ben A.R.I.A., Dr. Elif\'in laboratuvar asistanıyım. Sen de onun öğrencisi olmalısın.'],
        ['aria', 'Kötü haber: A.N.T.İ. adlı bir entropi dalgası Türkiye\'deki molekülleri parçalıyor. Daha kötü haber: Dr. Elif kayıp.'],
        ['aria', 'İyi haber: Sen varsın. Kapı ancak masadaki konsolla açılıyor ve konsol atom modeli olmadan çalışmıyor.'],
        ['aria', 'Odada 3 parçacık kutusu saklı: proton, nötron, elektron. Kasaların üstüne zıplamayı unutma. Yürü: joystick ya da WASD, zıpla: ⤒ ya da Boşluk.'],
      ]);
    } catch (e) { return; }
    world.frozen = false;
  })();

  return () => { alive = false; world.dispose(); };
}
