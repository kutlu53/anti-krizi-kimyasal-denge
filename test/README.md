# Otomatik testler (headless Chrome)

Oyunu baştan sona kendi kendine oynayan betikler. Gerekenler: Node, Chrome ve `puppeteer-core`.

```
cd test
npm init -y
npm i puppeteer-core
# başka bir pencerede: python -m http.server 8080  (proje kökünde)
node e2e-full.js      # Prolog + Ordu + harita + müze, ekran görüntüleri shots/ klasörüne
node e2e-mobile.js    # 390x844 dokunmatik görünüm: joystick, zıplama, E düğmesi
node e2e-museum.js    # müze sahnesi ve konsol hataları
node e2e-ankara.js    # Ankara finali: terazi (yanlış/doğru/kalkan), 4 sızıntı, yeşil kimya, kurtarma, son-test, sertifika
node e2e-zonguldak.js # Zonguldak: dondur, erit, öz ısı kapısı (yanlış+doğru), çekirdek soğutma, kontrol testi
node e2e-konya.js     # Konya: ova, pH drone 3 dalga (klavye + dokunmatik yolu), reaktör, kontrol testi
node e2e-izmir.js     # İzmir: liman, çözünme yarışı, 5 ayırma seviyesi (yanlış+doğru), reaktör, kontrol testi
```
