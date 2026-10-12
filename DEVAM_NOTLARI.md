# Devam notları · Harita Hikâyesi Stüdyosu

## İşe başlamadan önce (her yeni oturumda, her hesapta)

1. **Telefon (iPhone/PWA) kodunun son hâlini GitHub'dan çek:**
   `git clone https://github.com/muhamedparlak-sys/harita` — klon zaten varsa `git pull`.
   Yayındaki uygulama: https://muhamedparlak-sys.github.io/harita/
2. **Masaüstü kodu için `HaritaHikaye_Tum.zip` dosyasını kullan.** Masaüstü kodu GitHub'da değil;
   kullanıcıdan bu zip'i iste.
3. Zip'in içindeki eski `DEVAM_NOTLARI.md` önceki oturumların notlarını içeriyor. Bu dosya o notların
   devamıdır: ikisini birleştir, tek dosya olarak tut.

---

## 12 Ekim 2026 · eklenenler (commit `efded1a`)

Eski devam notlarında bunlar yok; birleştirirken ekle:

- **Sinematik kamera:** dalış, takip, kilitlenme
- **Taktik tema**
- **Telsiz anonsu:** şimdilik yalnızca efekt sesi (tık, parazit, cızırtılı tını)
- **Sarı taraf:** kızıl ve laciverde ek, üçüncü taraf rengi
- **Sönen iz:** rota izi zamanla kayboluyor
- **Koordinatlı rota noktaları**
- **Harita dışından, kenardan giriş**
- **Sahneye göre harita seçimi**
- **Gece sisi**

---

## Açık işler

### Gemini önerilerinden yapılmayanlar
1. **3D eğik harita (45–55° eğim):** Motor 2D (canvas + SVG); bu, WebGL ile yeniden yazım demek.
   Telefonda video üretimini yavaşlatır. En büyük iş bu.
2. **60 fps:** Şu an 30 fps. Render süresi iki katına çıkar.
3. **Dönen kamera (S5–S7'de hedef etrafında hafif dönüş):** Haritayla birlikte yazıların da dönmesi
   gerekiyor; `video.js`'deki kare çiziminde de döndürme eklenmeli.
4. **Gerçek telsiz konuşması:** Anons şu an yalnızca efekt sesi. Karttaki tırnak içindeki sözün
   seslendirilip telsiz filtresinden geçirilmesi yapılmadı.
5. **Kalkan olayı:** Kıyı mevzisini çevreleyen yarı saydam koruma hattı yok; şu an yalnızca kalkan ikonu var.

### Kontrol edilmeyenler
6. Masaüstünde taktik temayla üretilen videonun karelerine bakılmadı; video hatasız üretildi ama
   görünüşü doğrulanmadı.
7. Telefonda düzenleme ekranındaki önizleme taktik temayı göstermiyor; tema yalnızca videoda uygulanıyor.

### Eskiden kalan küçük eksikler
8. Sisli gece sahnelerinde ışıldak huzmesi hâlâ soluk.
9. Gemiler bir yer adına çok yakın durunca etiketler çakışabiliyor.
10. Masaüstü, 8'den az sahneli kartı boş sahnelerle 8'e tamamlıyor.

### Belgeler ve düzen
11. Zip'teki `DEVAM_NOTLARI.md` bugünkü değişiklikleri içermiyor; yukarıdaki "eklenenler" bölümü
    oraya işlenmeli (madde 3).
12. Masaüstü kodu GitHub'da değil. İleride iki uygulamanın da aynı depoda tutulması işi kolaylaştırır
    (ör. `masaustu/` klasörü). Depo şu an herkese açık; masaüstü kodu eklenmeden önce bu karar
    kullanıcıyla konuşulmalı.
