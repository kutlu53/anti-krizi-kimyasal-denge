@echo off
title A.N.T.I. Krizi - yerel sunucu
echo Oyun http://localhost:8080 adresinde aciliyor...
echo Telefondan oynamak icin ayni Wi-Fi'da bu bilgisayarin IP adresini kullanin: http://^<ip^>:8080
echo Kapatmak icin bu pencereyi kapatin.
start "" http://localhost:8080
python -m http.server 8080 --bind 0.0.0.0
