# A.N.T.İ. Krizi: Kimyasal Denge (Prototip)

Tarayıcıda çalışan, mobil ve bilgisayardan oynanabilen 3D/2D eğitim oyunu.
MEB 7. ve 8. sınıf Fen Bilimleri kimya/madde kazanımlarına uygundur.

Oyun baştan sona oynanabilir: **Prolog** (Ankara sığınağı, atom yapısı), **Bölüm 1: Ordu** (saf maddeler, element ve bileşik), **Bölüm 2: İzmir** (karışımlar, ayırma yöntemleri, çözünme hızı), **Bölüm 3: Konya** (asit, baz, pH, indikatör, nötralleşme), **Bölüm 4: Zonguldak** (ısı-sıcaklık, hal değişimi, öz ısı, kaynama), **Bölüm 5: Ankara finali** (kütlenin korunumu, denklem denkleştirme, yeşil kimya) ve **Epilog** (son-test, kazanım artışı, sertifika).

## Çalıştırma

Kurulum yok. Tek gereken bir yerel sunucu (ES modülleri `file://` ile açılmaz).

- Windows: `baslat.bat` dosyasına çift tıkla. Tarayıcı `http://localhost:8080` adresini açar.
- Alternatif: proje klasöründe `python -m http.server 8080` ya da `npx serve .`

Telefonda oynamak için telefon ve bilgisayar aynı Wi‑Fi'da olmalı. Bilgisayarın IP adresini
(`ipconfig` → IPv4) telefonun tarayıcısına `http://<ip>:8080` olarak yaz.

## Kontroller

| | Bilgisayar | Mobil |
|---|---|---|
| Yürü | WASD / ok tuşları | Sol yarıya dokunup sürükle (joystick) |
| Zıpla | Boşluk | ⤒ düğmesi |
| Etkileşim | E / Enter | E düğmesi |
| Diyalog ilerlet | Enter / tıkla | Dokun |
| Haritaya dön | Esc | ✕ (sağ üst) |

## Yapı

```
index.html            tek sayfa; Three.js importmap ile CDN'den gelir
css/style.css         arayüz
js/main.js            ekran yönlendirici (başlık → prolog → harita → ordu → müze)
js/state.js           localStorage kayıt (ön-test, bölüm, kartlar)
js/audio.js           WebAudio ile üretilen küçük ses efektleri
js/engine/world.js    mini platform motoru: kutu çarpışma, kamera, tetikleyici, düşman, tween
js/engine/props.js    düşük poligonlu nesneler: oyuncu, atom, ağaç, reaktör, yaratık...
js/ui/                diyalog, test, HUD, 2D oyunlar (atom kurucu, su sentezleyici, fabrika hattı, pH drone, tepkime terazisi), kontroller
js/scenes/            title, map (SVG Türkiye), prolog (3D), ordu (3D), izmir (3D + 2D fabrika), konya (3D + 2D drone), zonguldak (3D bulmaca), ankara (3D boss + 2D terazi), epilog (2D rapor + sertifika), museum (3D)
js/data/questions.js  ön-test, bölüm kontrolü ve kart metinleri
```

## Pedagojik akış

1. **Prolog**: 3 parçacık kutusu bulunur → 2D konsolda Helyum atomu kurulur (proton/nötron çekirdeğe, elektron yörüngeye) → gizli **ön-test** "A.R.I.A. hafıza taraması" olarak yapılır.
2. **Ordu**: H ve O atomları toplanır → 2D sentezleyicide 2H+1O oranı denenir; H₂, O₂, HO, H₂O₂ gibi yanlış denemeler açıklanır → su yükselince sallar yüzer → reaktör nehri canlandırır → 3 soruluk **bölüm kontrolü**.
3. **İzmir**: 3D limanda arıtma tesisine girilir → 2D kontrol odası: önce **çözünme yarışı** (tanecik boyutu, sıcaklık, karıştırma), sonra 5 seviyelik **ayırma hattı** (mıknatıs, elek, süzgeç, ayırma hunisi, buharlaştırıcı, damıtıcı). Yanlış sıra ve yöntemler açıklanır (tuz süzgeçten geçer, buharlaştırma suyu kaybeder, yağ damıtıcıyı bozar) → Ege reaktörü körfezi temizler → 3 soruluk kontrol.
4. **Konya**: 3D çatlak ovada drone pistine gidilir → üstten 2D **pH drone** oyunu, 3 gün: lahana suyu indikatörü toprağı boyar (kırmızı asit, mor nötr, sarı baz), amonyak (+2 pH) ve sirke (−2 pH) dozlanır, fazla doz ters yöne kaçırır; asit yağmuru bulutları altlarını asitler ve amonyakla nötrlenir; 3. gün asit sızıntısı borusu tıkanır → reaktör ovayı altın buğdaya çevirir → 3 soruluk kontrol.
5. **Zonguldak**: Tamamen 3D maden tüneli. Isı tabancasının 50 kJ bütçesi var. Su çukuru dondurulup buz köprü olur (termometre 0 °C'de takılır), buz duvar eritilir (yine 0 °C platosu), öz ısı kapısında demir kol (18 kJ) ile su tankı (167 kJ) arasında seçim yapılır ve Q = m·c·ΔT gösterilir, finalde çekirdek 100 °C'de kaynamadan üç soğutma vanası açılır → 3 soruluk kontrol.
6. **Ankara**: Dumanlı meydanda A.N.T.İ. çekirdeği. Dört tur: 2D **tepkime terazisinde** denklem denkleştirilir (Mg+O₂, H₂+O₂, N₂+H₂, CH₄+O₂; kefeler atom sayısına göre eğilir, yanlış denemede kalkan düşer, kalkan sıfırlanınca pede koşulur), sonra 3D meydanda sızıntı kapatılır. Yenilgiden sonra **yeşil kimya seçimi**: hızlı yol (CO₂, gri gökyüzü) ya da 60 saniyede 3 katalizör pedi (temiz gökyüzü). Dr. Elif kurtarılır.
7. **Epilog**: Prologdaki 5 soru açıklamalı olarak tekrar sorulur, ön-test/son-test ve kazanım artışı yüzdesi gösterilir, bölüm kontrolleri listelenir, isimle **sertifika** PNG olarak indirilir, öğretmen raporu panoya kopyalanır.
8. Toplanan 8 kart **3D Molekül Müzesi**'nde incelenir.

## Sonraki adımlar

- Gerçek cihazlarda çocuklarla oynatma ve geri bildirim.
- Müzik ve daha fazla ses efekti.
- Öğretmen paneli (sınıf kodu ile sonuçları sunucuda toplama); şimdilik rapor panoya kopyalanıyor.
