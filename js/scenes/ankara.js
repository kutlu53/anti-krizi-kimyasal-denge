import * as THREE from 'three';
import { World } from '../engine/world.js';
import { mat, reactor, station, label, dynamicLabel, enemyMesh, crate } from '../engine/props.js';
import { dialog } from '../ui/dialog.js';
import { hud } from '../ui/hud.js';
import { openBalance, EQUATIONS } from '../ui/balance.js';
import { state, save, addCard } from '../state.js';
import { sfx } from '../audio.js';

const SKY_SMOG = 0x6b6a72, SKY_CLEAN = 0x8ccfff, SKY_DARK = 0x4a4850;

/** Bölüm 5: Ankara – Merkez reaktör ve A.N.T.İ. finali. Kütlenin korunumu, yeşil kimya. */
export function runAnkara(ctx) {
  const { canvas, controls } = ctx;
  const world = new World(canvas, controls, { sky: SKY_SMOG, fog: { color: SKY_SMOG, near: 28, far: 80 }, hemi: 0.7, sun: 1.0 });
  world.camOffset.set(0, 8, 11);
  ctx.world = world;
  let alive = true;
  const guard = () => { if (!alive) throw new Error('scene-exit'); };

  let hearts = 3;
  const refreshInv = () => hud.setInventory({}, [{ icon: '🛡️', text: hearts }, { icon: '🃏', text: state.cards.length }]);

  // --- meydan ve şehir ---
  const plazaM = mat(0x6e7280);
  world.addBox(0, -3, -22, 44, 3, 64, plazaM);
  for (let i = 0; i < 24; i++) { // meydan taşları çizgileri
    const l = new THREE.Mesh(new THREE.BoxGeometry(44, 0.03, 0.12), mat(0x5a5e6c)); l.position.set(0, 0.02, 8 - i * 2.6); world.scene.add(l);
  }
  const bldM = mat(0x3f4252), winM = mat(0xffd27a, { emissive: 0xffb347, emissiveIntensity: 0.6 });
  const windows = [];
  const building = (x, z, w, h, d) => {
    world.addBox(x, 0, z, w, h, d, bldM);
    for (let y = 2; y < h - 1; y += 3) for (let k = -w / 2 + 1.5; k < w / 2 - 1; k += 3) {
      const win = new THREE.Mesh(new THREE.BoxGeometry(1, 1.4, 0.1), winM.clone()); win.position.set(x + k, y, z + d / 2 + 0.06); win.material.emissiveIntensity = 0; win.material.color.set(0x2b2d3a); world.scene.add(win); windows.push(win);
    }
  };
  [[-30, -10, 12, 18, 10], [-30, -36, 12, 26, 12], [30, -4, 12, 22, 10], [30, -34, 12, 30, 12], [-14, -62, 16, 20, 8], [14, -62, 16, 24, 8]].forEach((b) => building(...b));
  // kule ve A.N.T.İ. çekirdeği
  const tower = reactor(); tower.position.set(0, 0, -34); tower.scale.setScalar(1.6); world.scene.add(tower);
  world.addBlocker(-4, -38, 4, -30, -1, 6);
  const core = new THREE.Group();
  const coreMesh = new THREE.Mesh(new THREE.IcosahedronGeometry(2.6, 1), mat(0x6a1fb5, { emissive: 0xb43cff, emissiveIntensity: 0.9, flatShading: true }));
  const eye = new THREE.Mesh(new THREE.SphereGeometry(0.6), mat(0xffffff, { emissive: 0xffffff, emissiveIntensity: 1 })); eye.position.set(0, 0.3, 2.3);
  const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.3), mat(0x000000)); pupil.position.set(0, 0.3, 2.8);
  const shards = new THREE.Group();
  for (let i = 0; i < 8; i++) { const s = new THREE.Mesh(new THREE.TetrahedronGeometry(0.7), mat(0xb43cff, { emissive: 0xb43cff, emissiveIntensity: 0.6 })); const a = (i / 8) * Math.PI * 2; s.position.set(Math.cos(a) * 4, Math.sin(a * 2) * 0.8, Math.sin(a) * 4); shards.add(s); }
  const coreLight = new THREE.PointLight(0xb43cff, 30, 30);
  core.add(coreMesh, eye, pupil, shards, coreLight); core.position.set(0, 11, -34); world.scene.add(core);
  const hpLabel = dynamicLabel('A.N.T.İ.  ◆◆◆◆', { color: '#ff5d6c', scale: 2 }); hpLabel.position.set(0, 16, -34); world.scene.add(hpLabel);
  let coreHp = 4, hitFlash = 0, coreT = 0;
  world.updaters.push((dt, t) => {
    tower.userData.update(t);
    coreT += dt; hitFlash = Math.max(0, hitFlash - dt);
    core.rotation.y = t * 0.4; shards.rotation.y = -t * 0.8; shards.rotation.x = Math.sin(t) * 0.3;
    core.position.y = 11 + Math.sin(t * 1.3) * 0.5;
    const s = 1 + (hitFlash > 0 ? Math.sin(hitFlash * 40) * 0.15 : 0); core.scale.setScalar(s);
    coreMesh.material.emissiveIntensity = hitFlash > 0 ? 2.5 : 0.9;
    const dx = world.pos.x - core.position.x, dz = world.pos.z - core.position.z; eye.position.set(Math.max(-1.2, Math.min(1.2, dx * 0.1)), 0.3, 2.3); pupil.position.set(eye.position.x * 1.1, 0.3, 2.8);
    if (green.timer > 0 && !world.frozen) { green.timer -= dt; hud.setObjective(`Katalizör pedleri ${green.done}/3 · süre ${Math.ceil(green.timer)} s`); if (green.timer <= 0) greenFail(); }
  });
  // Dr. Elif kapsülü
  const capsule = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.2, 3.4, 12), mat(0x3ee8ff, { transparent: true, opacity: 0.35, emissive: 0x3ee8ff, emissiveIntensity: 0.3 }));
  capsule.position.set(8, 1.7, -30); world.scene.add(capsule);
  const elif = new THREE.Group();
  const eb = new THREE.Mesh(new THREE.CapsuleGeometry(0.35, 0.7, 4, 8), mat(0xffffff)); eb.position.y = 0.8; const eh = new THREE.Mesh(new THREE.SphereGeometry(0.3), mat(0xf1c27d)); eh.position.y = 1.6; const hair = new THREE.Mesh(new THREE.SphereGeometry(0.33, 8, 6, 0, Math.PI * 2, 0, Math.PI / 2), mat(0x5a3a1a)); hair.position.y = 1.65;
  elif.add(eb, eh, hair); elif.position.set(8, 0, -30); world.scene.add(elif);
  world.addBlocker(6.6, -31.4, 9.4, -28.6, -1, 4);
  const capsuleLabel = label('DR. ELİF', { color: '#ffb347', size: 40, scale: 1.2 }); capsuleLabel.position.set(8, 4.2, -30); world.scene.add(capsuleLabel);

  // kasalar (engel/platform)
  [[-8, 0, -6, 2, 1.6, 2], [8, 0, -14, 2, 1.6, 2], [-10, 0, -44, 2, 1.6, 2], [-10, 1.6, -44, 2, 1.6, 2], [10, 0, -48, 2, 1.6, 2]].forEach(([x, y, z, w, h, d]) => world.addBox(x, y, z, w, h, d, crate(1).material));
  // düşmanlar
  [[[-16, 0, -12], [16, 0, -12]], [[16, 0, -24], [-16, 0, -24]], [[-16, 0, -46], [16, 0, -46]]].forEach(([a, b], i) => world.addEnemy(enemyMesh(), new THREE.Vector3(...a), new THREE.Vector3(...b), 3 + i * 0.4));
  world.onHit = () => hud.toast('Entropi yaratığı seni savurdu!');

  // sızıntı vanaları
  const ventDefs = [[-16, -6], [16, -18], [-10, -47.2], [16, -40]];
  const vents = ventDefs.map(([x, z], i) => {
    const st = station(0xff5d6c); st.position.set(x, i === 2 ? 3.2 : 0, z); world.scene.add(st);
    const l = label(`SIZINTI ${i + 1}`, { color: '#ff5d6c', size: 40, scale: 1.1 }); l.position.set(x, (i === 2 ? 3.2 : 0) + 2.8, z); world.scene.add(l);
    const trig = world.addTrigger(x, z, 2.2, `Sızıntı ${i + 1}'i kapat`, () => sealVent(i));
    trig.enabled = false;
    return { st, trig, l };
  });
  // kalkan pedi
  const shieldSt = station(0x5ee87a); shieldSt.position.set(0, 0, -8); world.scene.add(shieldSt);
  const shieldLabel = label('KALKAN', { color: '#5ee87a', size: 40, scale: 1.1 }); shieldLabel.position.set(0, 2.8, -8); world.scene.add(shieldLabel);
  const shieldTrig = world.addTrigger(0, -8, 2.2, 'Kalkanı yenile', async () => {
    if (hearts >= 3) { hud.toast('Kalkan zaten dolu.'); return; }
    hearts = 3; refreshInv(); sfx.collect(); shieldTrig.enabled = false;
    hud.toast('Kalkan yenilendi!');
    await startRound();
  });
  shieldTrig.enabled = false;
  // katalizör pedleri (yeşil kimya)
  const green = { timer: 0, done: 0, active: false };
  const catDefs = [[-16, -30], [14, -8], [0, -52]];
  const cats = catDefs.map(([x, z], i) => {
    const st = station(0x5ee87a); st.position.set(x, 0, z); st.visible = false; world.scene.add(st);
    const trig = world.addTrigger(x, z, 2.2, `Katalizör ${i + 1}'i yerleştir`, () => {
      trig.enabled = false; green.done += 1; sfx.collect(); st.userData.setColor(0xffd84a);
      if (green.done >= 3) { green.timer = 0; finishGreen(); } else hud.toast(`Katalizör ${green.done}/3 yerleşti.`);
    });
    trig.enabled = false;
    return { st, trig };
  });

  // --- savaş akışı ---
  let round = 0;
  const startRound = async () => {
    const eq = EQUATIONS[round];
    world.frozen = true; world.onPrompt(null);
    try {
      await dialog.say('anti', eq.story); guard();
      const res = await openBalance(eq, { hearts, onWrong: (h) => { hearts = h; refreshInv(); } }); guard();
      if (!res.success) {
        hearts = 0; refreshInv();
        await dialog.say('anti', 'Kalkanın düştü! Atomları sayamayan simyacıdan korkmam. Hahaha.'); guard();
        await dialog.say('aria', 'Yeşil kalkan pedine koş ve kalkanı yenile; sonra denklemi tekrar deneriz. İpucu: önce en karmaşık molekülden başla.'); guard();
        hud.setObjective('Kalkan pedine git (E)'); shieldTrig.enabled = true;
        world.frozen = false; return;
      }
      // vuruş
      coreHp -= 1; hitFlash = 1.2; sfx.hit();
      hpLabel.userData.set('A.N.T.İ.  ' + '◆'.repeat(coreHp) + '◇'.repeat(4 - coreHp));
      await dialog.say('aria', `Dengeli denklem A.N.T.İ.'yi sarstı! Şimdi ${round + 1}. sızıntıyı kapat; kırmızı istasyon.`); guard();
      hud.setObjective(`Sızıntı ${round + 1}'i kapat (E) · A.N.T.İ. ${coreHp}/4`);
      vents[round].trig.enabled = true;
    } catch (e) { if (e.message !== 'scene-exit') throw e; return; }
    world.frozen = false;
  };
  const sealVent = async (i) => {
    vents[i].trig.enabled = false; world.onPrompt(null); vents[i].st.userData.setColor(0x5ee87a); sfx.success();
    round += 1;
    if (round < EQUATIONS.length) { hud.toast(`Sızıntı ${i + 1} kapandı.`); await startRound(); }
    else await defeat();
  };
  const defeat = async () => {
    world.frozen = true;
    try {
      hitFlash = 3; sfx.success();
      await world.tween(2.5, (e) => { core.position.y = 11 - e * 6; coreMesh.material.color.lerpColors(new THREE.Color(0x6a1fb5), new THREE.Color(0x4a4a55), e); coreMesh.material.emissiveIntensity = 2 * (1 - e); coreLight.intensity = 30 * (1 - e); shards.children.forEach((s) => s.scale.setScalar(1 - e * 0.9)); }); guard();
      hpLabel.userData.set('A.N.T.İ.  ◇◇◇◇', '#9aa6d1');
      await dialog.say('anti', 'Kkkkh... dört denklem... hepsi dengede. Atomlar... korunuyor. Ama çekirdeğim hâlâ sıcak, kapatmak sana kalmış, simyacı.'); guard();
      await dialog.say('aria', 'Çekirdeği kalıcı olarak kapatmak için bir tepkime gerek. İki yol var ve ikisi de işe yarar. Seçim senin.'); guard();
      const choice = await dialog.choose('aria', 'Hangi yolu seçiyorsun?', [
        { label: '⚡ Hızlı Yol: Fosil yakıt yak, çekirdeği aşırı yükle. 1 dakika sürer, bol CO₂ çıkar.', value: 'fast' },
        { label: '🌿 Yeşil Kimya: 3 katalizör pedi yerleştir, yenilenebilir reaktifle kapat. Koşturur ama sıfır emisyon.', value: 'green' },
      ]); guard();
      state.ending = choice; save();
      if (choice === 'fast') {
        await dialog.say('aria', 'Yakıyoruz... CH₄ + 2O₂ → CO₂ + 2H₂O. Çekirdek kapanıyor ama gökyüzüne tonlarca karbondioksit gidiyor.'); guard();
        await world.tween(3, (e) => { world.scene.background.lerpColors(new THREE.Color(SKY_SMOG), new THREE.Color(SKY_DARK), e); world.scene.fog.color.copy(world.scene.background); world.scene.fog.near = 28 - e * 10; }); guard();
        await dialog.say('aria', 'Kriz bitti ama hava hâlâ gri. Yeşil kimya daha uzun sürerdi ama şehir nefes alırdı. Bunu not ediyorum; bir dahaki sefere?'); guard();
        await rescue();
      } else {
        await dialog.say('aria', 'Katalizör pedleri meydanda belirdi: yeşil ışıklar. Üçüne de dokun. Katalizör soğumadan 60 saniye!'); guard();
        cats.forEach((c) => { c.st.visible = true; c.trig.enabled = true; });
        green.active = true; green.timer = 60; green.done = 0;
      }
    } catch (e) { if (e.message !== 'scene-exit') throw e; return; }
    world.frozen = false;
  };
  const greenFail = () => {
    sfx.fail(); hud.toast('Katalizör soğudu! Pedler sıfırlandı, tekrar.', 2500);
    green.done = 0; green.timer = 60; cats.forEach((c) => { c.trig.enabled = true; c.st.userData.setColor(0x5ee87a); });
  };
  const finishGreen = async () => {
    world.frozen = true; world.onPrompt(null); hud.setObjective('Çekirdek kapanıyor');
    try {
      sfx.success();
      await dialog.say('aria', 'Katalizör devrede! Tepkime düşük sıcaklıkta, atık yok, emisyon sıfır. Çekirdek kapanıyor... ve gökyüzüne bak!'); guard();
      await world.tween(5, (e) => {
        world.scene.background.lerpColors(new THREE.Color(SKY_SMOG), new THREE.Color(SKY_CLEAN), e); world.scene.fog.color.copy(world.scene.background); world.scene.fog.near = 28 + e * 30; world.scene.fog.far = 80 + e * 60;
        windows.forEach((w) => { w.material.emissiveIntensity = e * 0.8; w.material.color.lerpColors(new THREE.Color(0x2b2d3a), new THREE.Color(0xffd27a), e); });
        tower.userData.setActive(true);
      }); guard();
      await rescue();
    } catch (e) { if (e.message !== 'scene-exit') throw e; return; }
  };
  const rescue = async () => {
    world.teleport(5, 0, -26); world.player.group.rotation.y = Math.PI / 2; hud.setObjective('Dr. Elif kurtarıldı');
    await world.tween(1.5, (e) => { capsule.material.opacity = 0.35 * (1 - e); capsule.position.y = 1.7 + e * 4; }); guard();
    await dialog.say('elif', 'Sonunda! A.R.I.A. haklıymış, sen gerçekten simyacısın. Beş reaktör, beş şehir... Türkiye yeniden nefes alıyor.'); guard();
    await dialog.say('elif', state.ending === 'green'
      ? 'Ve yeşil yolu seçtin. Bilim yalnızca sorunu çözmek değil, nasıl çözdüğünü de düşünmektir. Seninle gurur duyuyorum.'
      : 'Çekirdeği kapattın, teşekkürler. Gökyüzü hâlâ gri ama bunu da öğreneceğiz: her tepkimenin bir bedeli var.'); guard();
    if (addCard('CO2')) sfx.card();
    await dialog.say('aria', '🃏 Son kart: Karbondioksit (CO₂). Şimdi A.R.I.A. laboratuvarına dönüyoruz: hafıza taramasını yenileyip ne kadar öğrendiğini göreceğiz.'); guard();
    state.chapters.ankara = true; save();
    await hud.fadeOut();
    if (!alive) return;
    ctx.go('epilog');
  };

  world.addTrigger(0, -22, 4, '', async () => {
    world.setSpawn(0, 0, -22); world.frozen = true;
    try {
      await dialog.say('anti', 'Hoş geldin, küçük simyacı. Evimdesin. Dr. Elif şu kapsülde, ben tepende. Bana dengeli bir denklem göster; her biri beni zayıflatır. Ama yanılırsan kalkanın gider.'); guard();
      await dialog.say('aria', 'Plan: Terazide denklemi dengele, sonra meydandaki kırmızı sızıntıyı kapat. Dört kez. Entropi yaratıklarından uzak dur!'); guard();
    } catch (e) { return; }
    await startRound();
  }, { auto: true });

  world.onPrompt = (l) => hud.setPrompt(l);
  world.onFall = () => hud.toast('Meydandan düştün!');
  world.setSpawn(0, 0, 6);
  world.teleport(0, 0, 6);
  world.player.group.rotation.y = Math.PI;

  (async () => {
    hud.show(); refreshInv(); hud.setObjective('Kuleye yaklaş');
    world.start(); world.frozen = true;
    await hud.fadeIn();
    try {
      await dialog.lines([
        ['sys', 'Ankara, Kızılay Meydanı. Yıl 2140.'],
        ['aria', 'Başkent dumanın altında. CO₂ seviyesi tavan, asit yağmuru pencereleri aşındırmış. A.N.T.İ.\'nin kaynağı kulenin tepesinde: entropi çekirdeği.'],
        ['aria', 'Dr. Elif kulenin dibindeki kapsülde. Çekirdeği susturmanın tek yolu, A.N.T.İ.\'nin bozduğu şeyi onarmak: kimyasal tepkimelerde kütlenin korunumu.'],
      ]);
    } catch (e) { return; }
    world.frozen = false;
  })();

  return () => { alive = false; world.dispose(); };
}
