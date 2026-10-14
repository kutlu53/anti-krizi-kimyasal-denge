// Ön-test: oyunun kapsadığı 7. ve 8. sınıf kazanımlarını tarar.
// Aynı sorular epilogdaki son-testte tekrar sorulur ve artış hesaplanır.
export const preTest = [
  {
    id: 'atom1',
    q: 'Bir atomun çekirdeğinde hangi parçacıklar bulunur?',
    opts: ['Elektron ve proton', 'Proton ve nötron', 'Sadece elektron', 'Nötron ve elektron'],
    a: 1,
    why: 'Proton ve nötron çekirdekte, elektronlar ise çekirdeğin çevresindeki katmanlarda bulunur.',
  },
  {
    id: 'compound1',
    q: 'Aşağıdakilerden hangisi bir bileşiktir?',
    opts: ['Oksijen (O₂)', 'Hidrojen (H₂)', 'Su (H₂O)', 'Demir (Fe)'],
    a: 2,
    why: 'Bileşikler farklı cins atomların belirli oranda birleşmesiyle oluşur. Su, 2 hidrojen ve 1 oksijenden oluşur.',
  },
  {
    id: 'mixture1',
    q: 'Tuzlu sudan tuzu ayırmak için en uygun yöntem hangisidir?',
    opts: ['Mıknatısla ayırma', 'Süzme', 'Buharlaştırma', 'Eleme'],
    a: 2,
    why: 'Tuz suda çözündüğü için süzülemez. Su buharlaştırılınca tuz geride kalır.',
  },
  {
    id: 'ph1',
    q: 'pH değeri 3 olan bir çözelti için ne söylenebilir?',
    opts: ['Nötrdür', 'Baziktir', 'Asidiktir', 'Saf sudur'],
    a: 2,
    why: 'pH 7\'nin altı asidik, 7 nötr, 7\'nin üstü baziktir.',
  },
  {
    id: 'heat1',
    q: 'Isı ve sıcaklık için hangisi doğrudur?',
    opts: [
      'İkisi aynı şeydir',
      'Isı bir enerji türüdür, sıcaklık ise bir ölçüdür',
      'Sıcaklık joule ile ölçülür',
      'Isı termometre ile ölçülür',
    ],
    a: 1,
    why: 'Isı aktarılan enerjidir (joule), sıcaklık ise maddenin ne kadar sıcak olduğunun ölçüsüdür (°C).',
  },
];

// Bölüm 1 (Ordu) sonunda A.R.I.A. kontrolü: bölüm kazanımlarını ölçer.
export const orduCheck = [
  {
    id: 'o1',
    q: 'Su molekülü (H₂O) kaç hidrojen ve kaç oksijen atomundan oluşur?',
    opts: ['1 H, 2 O', '2 H, 1 O', '2 H, 2 O', '1 H, 1 O'],
    a: 1,
    why: 'Su molekülünde 2 hidrojen atomu 1 oksijen atomuna bağlanır.',
  },
  {
    id: 'o2',
    q: 'H₂ (hidrojen gazı) ile H₂O (su) arasındaki fark nedir?',
    opts: [
      'İkisi de bileşiktir',
      'H₂ elementtir, H₂O bileşiktir',
      'H₂ bileşiktir, H₂O elementtir',
      'İkisi de elementtir',
    ],
    a: 1,
    why: 'Tek cins atomdan oluşan maddeler element, farklı cins atomlardan oluşanlar bileşiktir.',
  },
  {
    id: 'o3',
    q: 'Entropi yaratığı sana H₂O₂ yapmanı söyledi. Bu madde nedir?',
    opts: ['Su', 'Hidrojen peroksit, su değildir', 'Oksijen gazı', 'Saf hidrojen'],
    a: 1,
    why: 'Atom sayısı değişince madde tamamen değişir. H₂O₂ hidrojen peroksittir; saç açıcıda kullanılır, içilmez!',
  },
];

// Bölüm 2 (İzmir) sonunda A.R.I.A. kontrolü: karışımlar ve ayırma.
export const izmirCheck = [
  {
    id: 'i1',
    q: 'Tuzlu sudaki tuzu süzgeçle ayırabilir miyiz?',
    opts: ['Evet, süzgeç her şeyi tutar', 'Hayır, tuz çözündüğü için süzgeçten geçer', 'Evet ama çok yavaş', 'Hayır, tuz mıknatısla ayrılır'],
    a: 1,
    why: 'Tuz suda çözünür ve homojen karışım oluşturur. Süzgeç yalnızca çözünmeyen katıları tutar.',
  },
  {
    id: 'i2',
    q: 'Tuzlu sudan hem tuzu hem de suyu geri kazanmak için hangi yöntem kullanılır?',
    opts: ['Buharlaştırma', 'Damıtma', 'Süzme', 'Eleme'],
    a: 1,
    why: 'Damıtmada su buharlaştırılıp yeniden yoğuşturulur; tuz kapta kalır, saf su ayrıca toplanır. Buharlaştırmada su kaybolur.',
  },
  {
    id: 'i3',
    q: 'Şekerin suda daha hızlı çözünmesi için hangisi YAPILMAZ?',
    opts: ['Suyu ısıtmak', 'Karıştırmak', 'Şekeri toz hâline getirmek', 'Suyu soğutmak'],
    a: 3,
    why: 'Çözünme hızını sıcaklık, karıştırma ve tanecik boyutunun küçülmesi artırır. Soğutmak yavaşlatır.',
  },
];

// Bölüm 3 (Konya) sonunda A.R.I.A. kontrolü: asit, baz, pH, nötralleşme.
export const konyaCheck = [
  {
    id: 'k1',
    q: 'Kırmızı lahana suyu asidik bir toprağa püskürtülünce hangi renge döner?',
    opts: ['Yeşil-sarı', 'Kırmızı-pembe', 'Mor kalır', 'Mavi'],
    a: 1,
    why: 'Kırmızı lahana suyu doğal bir indikatördür: asitte kırmızı-pembe, nötrde mor, bazda yeşil-sarı olur.',
  },
  {
    id: 'k2',
    q: 'pH değeri 3 olan asidik toprağı nötrlemek için ne eklenmeli?',
    opts: ['Sirke (asit)', 'Amonyak ya da kireç (baz)', 'Saf su yeterlidir', 'Tuz'],
    a: 1,
    why: 'Asidik bir ortam bazla nötrlenir. Ama fazla baz pH\'ı 7\'nin üstüne çıkarır; doz önemlidir.',
  },
  {
    id: 'k3',
    q: 'Asit + Baz tepkimesinin ürünleri nelerdir?',
    opts: ['Tuz + su', 'Sadece gaz', 'Asit + su', 'Baz + tuz'],
    a: 0,
    why: 'Nötralleşme tepkimesi: Asit + Baz → Tuz + Su. H⁺ ve OH⁻ iyonları birleşip su oluşturur.',
  },
];

// Bölüm 4 (Zonguldak) sonunda A.R.I.A. kontrolü: ısı, sıcaklık, öz ısı, hal değişimi.
export const zonguldakCheck = [
  {
    id: 'z1',
    q: 'Buz erirken sıcaklığı nasıl değişir?',
    opts: ['Sürekli artar', '0 °C\'de sabit kalır', 'Düşer', 'Önce düşer sonra artar'],
    a: 1,
    why: 'Hal değişimi sırasında alınan ısı sıcaklığı değil hâli değiştirir. Buz tamamen eriyene kadar 0 °C\'de kalır.',
  },
  {
    id: 'z2',
    q: 'Eşit kütledeki demir ve suya aynı miktarda ısı verilirse hangisinin sıcaklığı daha çok artar?',
    opts: ['Su', 'Demir', 'İkisi eşit artar', 'Hiçbirinin sıcaklığı değişmez'],
    a: 1,
    why: 'Demirin öz ısısı (0,45 J/g°C) suyunkinden (4,18 J/g°C) çok küçüktür; aynı ısıyla çok daha fazla ısınır.',
  },
  {
    id: 'z3',
    q: 'Hangisi doğrudur?',
    opts: ['Isı joule, sıcaklık °C ile ölçülür', 'İkisi de termometreyle ölçülür', 'Sıcaklık bir enerji türüdür', 'Isı termometreyle ölçülür'],
    a: 0,
    why: 'Isı aktarılan enerjidir ve kalorimetreyle joule cinsinden ölçülür. Sıcaklık ise termometreyle °C cinsinden ölçülür.',
  },
];

// Müze kartları
export const cards = {
  CO2: { title: 'Karbondioksit (CO₂)', text: 'Bir karbon, iki oksijen; dümdüz bir molekül. Yanmanın ürünü, bitkilerin besini. Fazlası atmosferi ısıtır.' },
  CH4: { title: 'Metan (CH₄)', text: 'Bir karbon, dört hidrojen. Doğal gazın ana maddesi, santralin yakıtı. Yanınca ısı verir: CH₄ + 2O₂ → CO₂ + 2H₂O.' },
  NH3: { title: 'Amonyak (NH₃)', text: 'Bir azot, üç hidrojen. Keskin kokulu bir baz; suda OH⁻ verir. Gübrelerin hammaddesi, asitleri nötrler.' },
  NaCl: { title: 'Tuz (NaCl)', text: 'Sodyum + klor = sofra tuzu. Suda çözünür, görünmez olur ama tadı kalır. Damıtınca su gider, tuz kalır.' },
  H: { title: 'Hidrojen (H)', text: 'Evrendeki en hafif ve en bol element. Tek protonu, tek elektronu var. Yıldızların yakıtı!' },
  O: { title: 'Oksijen (O)', text: 'Nefes aldığımız gazın atomu. 8 protonu var. Çok sosyal: hemen başka atomlarla bağ kurar.' },
  H2O: { title: 'Su (H₂O)', text: '2 hidrojen + 1 oksijen = su. Bir bileşiktir. Açısı 104,5°, bu yüzden buz suda yüzer!' },
  He: { title: 'Helyum (He)', text: 'Çekirdeğinde 2 proton, 2 nötron; yörüngesinde 2 elektron. Balonları uçuran, sesi inceltip güldüren gaz.' },
};
