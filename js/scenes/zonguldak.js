import * as THREE from 'three';
import { World } from '../engine/world.js';
import { mat, reactor, station, label, dynamicLabel, rock, enemyMesh, cardMesh, water, crate } from '../engine/props.js';
import { dialog } from '../ui/dialog.js';
import { hud } from '../ui/hud.js';
import { runQuiz } from '../ui/quiz.js';
import { zonguldakCheck } from '../data/questions.js';
import { state, save, addCard } from '../state.js';
import { sfx } from '../audio.js';

const HEAT_MAX = 50; // kJ

/** Bölüm 4: Zonguldak – Karadeniz maden reaktörü. Isı, sıcaklık, öz ısı, hal değişimi. */
export function runZonguldak(ctx) {
  const { canvas, controls } = ctx;
  const world = new World(canvas, controls, { sky: 0x070a14, fog: { color: 0x070a14, near: 18, far: 50 }, hemi: 0.6, sun: 0.55 });
  world.camOffset.set(0, 7.5, 9.5);
  ctx.world = world;
  let alive = true;
  const guard = () => { if (!alive) throw new Error('scene-exit'); };

  let heat = HEAT_MAX;
  const refreshInv = () => hud.setInventory({}, [{ icon: '🔥', text: `${heat} kJ` }, { icon: '🃏', text: state.cards.length }]);

  // --- tünel ---
  const floorM = mat(0x44434f), wallM = mat(0x3a3c4e), iceM = () => mat(0xcdf4ff, { transparent: true, opacity: 0.85, emissive: 0x3ee8ff, emissiveIntensity: 0.12, roughness: 0.3 });
  const segs = [[8, -12, 10], [-20, -56, 10], [-56, -82, 18]]; // [z1, z2, genişlik]
  segs.forEach(([z1, z2, w]) => {
    const d = z1 - z2;
    world.addBox(0, -3, (z1 + z2) / 2, w, 3, d, floorM);
    world.addBox(-w / 2 - 0.5, 0, (z1 + z2) / 2, 1, 7, d, wallM);
    world.addBox(w / 2 + 0.5, 0, (z1 + z2) / 2, 1, 7, d, wallM);
  });
  world.addBox(0, 0, -83, 18, 7, 1, wallM); // son duvar
  // raylar
  for (let z = 6; z > -56; z -= 1) { [-1.2, 1.2].forEach((x) => { const r = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.06, 1), mat(0x8a8f9c)); r.position.set(x, 0.03, z); world.scene.add(r); }); }
  // lambalar
  const lamps = [];
  for (let z = 4; z > -80; z -= 8) [-4.6, 4.6].forEach((x, i) => {
    if (i === 0 && z < -56) x = -8.6; if (i === 1 && z < -56) x = 8.6;
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.2, 8, 8), mat(0xffd27a, { emissive: 0xffb347, emissiveIntensity: 1 })); bulb.position.set(x, 3.2, z); world.scene.add(bulb);
    if ((z / 8) % 2 === 0) { const pl = new THREE.PointLight(0xffc98a, 9, 18); pl.position.set(x * 0.8, 3, z); world.scene.add(pl); lamps.push(pl); }
  });
  // dekor: vagon, kayalar
  const cart = crate(1); cart.scale.set(2, 1, 1.4); cart.position.set(-3, 0.5, 2); world.scene.add(cart); world.addBlocker(-4.1, 1.2, -1.9, 2.8, -1, 1);
  [[3.5, -4, 0.8], [-3.5, -24, 0.9], [3.8, -44, 0.7], [-7, -60, 1], [7, -78, 1]].forEach(([x, z, s]) => { const r = rock(s, 0x4a4a55); r.position.set(x, 0.1, z); world.scene.add(r); });

  // --- Isı şarj istasyonları ---
  const charger = (z) => {
    const st = station(0xffb347); st.position.set(-3.5, 0, z); world.scene.add(st);
    const l = label('ISI ŞARJI', { color: '#ffb347', size: 40, scale: 1.1 }); l.position.set(-3.5, 2.8, z); world.scene.add(l);
    world.addTrigger(-3.5, z, 2.2, 'Isı tabancasını doldur', () => { heat = HEAT_MAX; refreshInv(); sfx.collect(); hud.toast(`Isı tabancası dolu: ${HEAT_MAX} kJ`); });
  };
  charger(-6); charger(-44);

  // --- Bölge 1: su çukuru → buz köprüsü ---
  const pool = water(10, 8, 0x2f7fd0); pool.position.set(0, -2.2, -16); world.scene.add(pool);
  world.addBox(0, -4, -16, 10, 1, 8, mat(0x1e2a44)); // çukur tabanı (düşünce geri döner)
  const bridge = world.addBox(0, -2.9, -16, 10, 0.6, 8, iceM()); bridge.enabled = false; bridge.mesh.visible = false;
  const thermo1 = dynamicLabel('15 °C su', { color: '#3ee8ff' }); thermo1.position.set(0, 1.2, -16); world.scene.add(thermo1);
  const freezeTrigger = world.addTrigger(0, -11, 2.4, 'Suyu dondur (ısı al)', async () => {
    freezeTrigger.enabled = false; world.onPrompt(null); world.frozen = true;
    try {
      bridge.mesh.visible = true; sfx.water();
      await world.tween(4, (e, u) => {
        if (u < 0.35) thermo1.userData.set(`${Math.round(15 - (u / 0.35) * 15)} °C su`);
        else if (u < 0.8) { thermo1.userData.set('0 °C  donuyor...', '#ffffff'); bridge.mesh.position.y = -2.6 + ((u - 0.35) / 0.45) * 2.3; world.syncBox(bridge); }
        else thermo1.userData.set(`${Math.round(-((u - 0.8) / 0.2) * 5)} °C buz`, '#cdf4ff');
      }); guard();
      bridge.mesh.position.y = -0.3; world.syncBox(bridge); bridge.enabled = true;
      await dialog.say('aria', 'Donma: sıvıdan katıya. Fark ettin mi? Su donarken termometre 0 °C\'de takılı kaldı. Hal değişirken alınan ısı sıcaklığı değil, hâli değiştirir.'); guard();
      hud.setObjective('Buz köprüden geç');
    } catch (e) { if (e.message !== 'scene-exit') throw e; return; }
    world.frozen = false;
  });
  world.addTrigger(0, -22, 3, '', () => { world.setSpawn(0, 0, -22); hud.setObjective('Tünelde ilerle'); }, { auto: true });

  // --- Bölge 2: buz duvarı ---
  const wall = world.addBox(0, 0, -34, 10, 4, 1.6, iceM());
  const thermo2 = dynamicLabel('−10 °C buz', { color: '#cdf4ff' }); thermo2.position.set(0, 5, -34); world.scene.add(thermo2);
  const meltTrigger = world.addTrigger(0, -31.5, 2.4, 'Buz duvarını erit (10 kJ ısı ver)', async () => {
    if (heat < 10) { hud.toast('Isı yetersiz! Şarj istasyonuna dön.'); sfx.fail(); return; }
    meltTrigger.enabled = false; world.onPrompt(null); world.frozen = true;
    heat -= 10; refreshInv();
    try {
      sfx.water();
      await world.tween(4, (e, u) => {
        if (u < 0.3) thermo2.userData.set(`${Math.round(-10 + (u / 0.3) * 10)} °C buz`);
        else if (u < 0.85) { thermo2.userData.set('0 °C  eriyor...', '#ffffff'); const s = 1 - (u - 0.3) / 0.55; wall.mesh.scale.y = Math.max(0.02, s); wall.mesh.position.y = 2 * s; }
        else thermo2.userData.set(`${Math.round((u - 0.85) / 0.15 * 4)} °C su`, '#3ee8ff');
      }); guard();
      wall.enabled = false; wall.mesh.visible = false;
      const puddle = water(8, 2, 0x2f7fd0); puddle.position.set(0, 0.03, -34); world.scene.add(puddle);
      await dialog.say('aria', 'Erime: katıdan sıvıya. Yine 0 °C\'de bekledi, sonra su olarak ısınmaya başladı. Erime noktası ve donma noktası aynı sıcaklık: 0 °C.'); guard();
    } catch (e) { if (e.message !== 'scene-exit') throw e; return; }
    world.frozen = false;
  });
  // basamaklı çıkıntı + metan kartı
  [[4, 0, -27, 2, 1, 2], [4, 0, -29.2, 2, 2, 2]].forEach(([x, y, z, w, h, d]) => world.addBox(x, y, z, w, h, d, mat(0x55576a)));
  world.addCollectible(cardMesh('CH₄'), 4, 2.9, -29.2, () => { addCard('CH4'); sfx.card(); refreshInv(); hud.toast('🃏 Kart: Metan (CH₄), santralin yakıtı. Müzede incele.', 3000); });
  world.addEnemy(enemyMesh(), new THREE.Vector3(-4, 0, -26), new THREE.Vector3(4, 0, -26), 2.6);
  world.addEnemy(enemyMesh(), new THREE.Vector3(4, 0, -38), new THREE.Vector3(-4, 0, -38), 2.8);
  world.onHit = () => hud.toast('Entropi yaratığı seni savurdu!');

  // --- Bölge 3: öz ısı kapısı ---
  const door = world.addBox(0, 0, -52, 10, 5, 1, mat(0x8a5a2b, { emissive: 0xff5d6c, emissiveIntensity: 0.3 }));
  const doorLabel = label('KAPI: 60 °C GEREKİR', { color: '#ff5d6c', size: 36, scale: 1.4 }); doorLabel.position.set(0, 5.6, -51.6); world.scene.add(doorLabel);
  const lever = (x, color, text) => {
    const st = station(color); st.position.set(x, 0, -48); world.scene.add(st);
    const l = label(text, { color: '#fff', size: 34, scale: 1.3 }); l.position.set(x, 2.9, -48); world.scene.add(l);
    return st;
  };
  const ironSt = lever(-3, 0x8a8f9c, 'DEMİR KOL 1 kg');
  const waterSt = lever(3, 0x3ee8ff, 'SU TANKI 1 kg');
  let doorOpen = false;
  const heatTarget = async (name, c, mesh, trig) => {
    const Q = Math.round(1 * c * 40); const cs = String(c).replace('.', ',');
    if (doorOpen) return;
    world.frozen = true; trig.enabled = false; world.onPrompt(null);
    try {
      if (Q > heat) {
        heat = 0; refreshInv(); sfx.fail();
        await dialog.say('aria', `${name}: Q = m·c·ΔT = 1 kg × ${cs} kJ/kg°C × 40 °C = ${Q} kJ. Tabancada ${HEAT_MAX} kJ vardı, hepsi gitti ve yetmedi! Suyun öz ısısı demirin 9 katı: aynı ısınma için 9 kat ısı ister.`); guard();
        await dialog.say('anti', 'Suyu ısıtmak mı? Bütün günün geçer. Hahaha. Şarj istasyonu arkanda, küçük simyacı.'); guard();
        trig.enabled = true;
      } else {
        heat -= Q; refreshInv(); sfx.success(); mesh.userData.setColor(0xff5d6c);
        await dialog.say('aria', `${name}: Q = m·c·ΔT = 1 kg × ${cs} kJ/kg°C × 40 °C = ${Q} kJ. Az ısıyla 60 °C! Küçük öz ısı, hızlı ısınma. Kapı açılıyor.`); guard();
        doorOpen = true; ironTrig.enabled = false; waterTrig.enabled = false;
        await world.tween(1.5, (e) => { door.mesh.position.y = 2.5 + e * 5; world.syncBox(door); }); guard();
        door.enabled = false; door.mesh.visible = false; world.scene.remove(doorLabel);
        hud.setObjective('Reaktör odasına in');
      }
    } catch (e) { if (e.message !== 'scene-exit') throw e; return; }
    world.frozen = false;
  };
  const ironTrig = world.addTrigger(-3, -48, 2, 'Demir kolu ısıt (20 → 60 °C)', () => heatTarget('Demir', 0.45, ironSt, ironTrig));
  const waterTrig = world.addTrigger(3, -48, 2, 'Su tankını ısıt (20 → 60 °C)', () => heatTarget('Su', 4.18, waterSt, waterTrig));

  // --- Bölge 4: çekirdek ve soğutma vanaları ---
  const reactorMesh = reactor(); reactorMesh.position.set(0, 0, -74); world.scene.add(reactorMesh);
  world.addBlocker(-2.4, -76.4, 2.4, -71.6, -1, 3);
  [[-7, 0, -60, 2, 1, 2], [-7, 0, -62.2, 2, 2, 2]].forEach(([x, y, z, w, h, d]) => world.addBox(x, y, z, w, h, d, mat(0x55576a)));
  [[6, 0, -68, 2, 1.5, 2], [8, 0, -68, 2, 1.5, 2]].forEach(([x, y, z, w, h, d]) => world.addBox(x, y, z, w, h, d, mat(0x6b4a2b)));
  const valves = [];
  const valveDefs = [[-7, 2, -62.2], [7, 0, -70.5], [0, 0, -79]];
  const coreLabel = dynamicLabel('90 °C', { color: '#ff5d6c' }); coreLabel.position.set(0, 5.2, -74); world.scene.add(coreLabel);
  const core = { temp: 90, rise: 0, active: false, opened: 0, done: false };
  valveDefs.forEach(([x, y, z], i) => {
    const st = station(0x3ee8ff); st.position.set(x, y, z); world.scene.add(st);
    const l = label(`VANA ${i + 1}`, { color: '#3ee8ff', size: 40, scale: 1.1 }); l.position.set(x, y + 2.8, z); world.scene.add(l);
    const trig = world.addTrigger(x, z, 2, `Soğutma vanası ${i + 1}'i aç`, () => {
      if (!core.active) return;
      trig.enabled = false; world.onPrompt(null); st.userData.setColor(0x5ee87a); sfx.collect();
      core.opened += 1; core.rise = core.opened >= 3 ? -3 : 0.5 - core.opened * 0.18;
      hud.toast(core.opened >= 3 ? 'Üç vana açık: soğutma sıvısı akıyor!' : `Vana ${core.opened}/3 açık, ısınma yavaşladı.`);
    });
    trig.enabled = false;
    valves.push({ st, trig });
  });
  const resetCore = () => { core.temp = 90; core.rise = 0.5; core.opened = 0; valves.forEach((v) => { v.trig.enabled = true; v.st.userData.setColor(0x3ee8ff); }); };
  world.updaters.push((dt, t) => {
    reactorMesh.userData.update(t);
    if (!core.active || core.done || world.frozen) return;
    core.temp += core.rise * dt;
    coreLabel.userData.set(`${core.temp.toFixed(1)} °C`, core.temp > 97 ? '#ff2d2d' : '#ff5d6c');
    hud.setObjective(`Çekirdek ${core.temp.toFixed(1)} °C (kaynama 100 °C) · Vana ${core.opened}/3`);
    if (core.temp >= 100) {
      sfx.fail(); hud.toast('KAYNADI! Buhar borusu patladı. Vanalar sıfırlandı.', 2600);
      resetCore(); world.teleport(0, 0, -58);
    } else if (core.temp <= 40) {
      core.done = true; finale();
    }
  });
  world.addTrigger(0, -58, 4, '', async () => {
    world.setSpawn(0, 0, -58); world.frozen = true;
    try {
      await dialog.say('anti', 'Kazan dairesine hoş geldin. Çekirdek 90 derece ve ısınıyor. Su 100\'de kaynar, borular patlar. Tik tak.'); guard();
      await dialog.say('aria', 'Üç soğutma vanası var: biri basamaklı çıkıntıda, biri kasaların arkasında, biri çekirdeğin arkasında. Hepsini aç; her vana ısınmayı yavaşlatır, üçü birden soğutur. Acele et!'); guard();
    } catch (e) { return; }
    resetCore(); core.active = true; world.frozen = false;
  }, { auto: true });

  const finale = async () => {
    world.frozen = true; world.onPrompt(null);
    world.teleport(0, 0, -67); world.player.group.rotation.y = Math.PI;
    hud.setObjective('Çekirdek güvende');
    try {
      reactorMesh.userData.setActive(true); sfx.success();
      await world.tween(3, (e) => { lamps.forEach((l) => { l.intensity = 9 + e * 10; l.color.lerpColors(new THREE.Color(0xffc98a), new THREE.Color(0xffffff), e); }); world.hemi.intensity = 0.6 + e * 0.5; coreLabel.userData.set(`${Math.round(40 - e * 15)} °C`, '#3ee8ff'); }); guard();
      await dialog.say('aria', 'Karadeniz maden reaktörü güvende! Santral ısı dengesinde çalışıyor; Zonguldak sokakları ve maden tesisleri ışıl ışıl.'); guard();
      await dialog.say('elif', '(cızırtı) Dört reaktör... Sinyalin güçleniyor, demek yaklaşıyorsun. Ankara\'dayım, A.N.T.İ. çekirdeğinin tam yanında. Son reaktör burada.'); guard();
      await dialog.say('anti', 'Dört. Peki. O zaman seni evimde bekliyorum, küçük simyacı. Ankara\'da denklemler dengelenmeyecek.'); guard();
      await dialog.say('aria', 'Kısa kontrol: 3 soru. Sonra başkente.'); guard();
      const res = await runQuiz({ title: 'A.R.I.A. Bölüm Kontrolü: Zonguldak', questions: zonguldakCheck, mode: 'check' }); guard();
      state.checks.zonguldak = { score: res.score, total: res.total };
      state.chapters.zonguldak = true; save();
      await dialog.say('aria', 'Haritaya dönüyoruz. Ankara finali bir sonraki sürümde.'); guard();
      await hud.fadeOut();
      if (!alive) return;
      ctx.finish();
    } catch (e) { if (e.message !== 'scene-exit') throw e; }
  };

  world.onPrompt = (l) => hud.setPrompt(l);
  world.onFall = () => { hud.toast('Buz gibi su! Geri ışınlandın.'); };
  world.updaters.push(() => { if (world.pos.y < -2.5 && world.onGround) world.pos.y = -20; });
  world.setSpawn(0, 0, 5);
  world.teleport(0, 0, 5);
  world.player.group.rotation.y = Math.PI;

  (async () => {
    hud.show(); refreshInv(); hud.setObjective('Tünelde ilerle: su çukurunu geç');
    world.start(); world.frozen = true;
    await hud.fadeIn();
    try {
      await dialog.lines([
        ['sys', 'Zonguldak. Maden asansörü −120 m. Drone yüzeyde bekliyor.'],
        ['aria', 'Kömür santralinin reaktörü madenin dibinde. A.N.T.İ. tünelleri bir buz, bir ateş yapmış: donma-erime döngüsü bozuk.'],
        ['aria', 'Elinde ısı tabancası var: bir şeyi ısıtabilir ya da soğutabilirsin ama ısı bütçen sınırlı (50 kJ). Turuncu istasyonlar doldurur. Her hal değişiminde termometreyi izle!'],
      ]);
    } catch (e) { return; }
    world.frozen = false;
  })();

  return () => { alive = false; world.dispose(); };
}
