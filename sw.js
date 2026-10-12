/* Çevrimdışı çalışma: uygulama dosyaları ilk açılışta saklanır; ses altyapısı ilk kullanımda saklanır. */
const SURUM = "hh-mobil-28";
const CEKIRDEK = ["./", "fonts/inter-latin-500-normal.woff2", "fonts/inter-latin-600-normal.woff2", "fonts/inter-latin-800-normal.woff2", "fonts/inter-latin-ext-500-normal.woff2", "fonts/inter-latin-ext-600-normal.woff2", "fonts/inter-latin-ext-800-normal.woff2", "fonts/inter.css", "ikon/ikon-180.png", "ikon/ikon-192.png", "ikon/ikon-512.png", "index.html", "js/depo.js", "js/efekt.js", "js/harita.js", "js/piper.js", "js/uygulama.js", "js/video.js", "js/kapak.js", "vendor/uyanik.mp4", "fonts/anton-400.woff", "kut/akd.png", "kut/anadolu.png", "kut/balkan.png", "kut/bogaz.png", "kut/dar.png", "kut/dogu_akd.png", "kut/ege.png", "kut/istanbul.png", "kut/karadeniz.png", "kut/katalog.json", "kut/kibris.png", "kut/marmara.png", "kut/okunus.json", "kut/okunus_temel.json", "kut/onizle/akd.jpg", "kut/onizle/anadolu.jpg", "kut/onizle/balkan.jpg", "kut/onizle/bogaz.jpg", "kut/onizle/dar.jpg", "kut/onizle/dogu_akd.jpg", "kut/onizle/ege.jpg", "kut/onizle/istanbul.jpg", "kut/onizle/karadeniz.jpg", "kut/onizle/kibris.jpg", "kut/onizle/marmara.jpg", "kut/yerler.json", "manifest.webmanifest", "motor.html", "ornek/Bogaz_gecilmez.json", "vendor/mp4-muxer.js", "vendor/piper_phonemize.js", "js/otomatik.js"];
self.addEventListener("install", e => { e.waitUntil(caches.open(SURUM).then(c => c.addAll(CEKIRDEK)).then(() => self.skipWaiting())); });
self.addEventListener("activate", e => { e.waitUntil(caches.keys().then(K => Promise.all(K.filter(k => k.startsWith("hh-mobil-") && k !== SURUM).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener("fetch", e => {
  const u = new URL(e.request.url);
  if (e.request.method !== "GET" || u.origin !== location.origin) return;
  /* büyük, değişmeyen dosyalar (haritalar, ses altyapısı, yazı tipleri): önce önbellek;
     uygulamanın kendisi (html, js, json): önce internet, internet yoksa önbellek */
  const sabit = /\/(kut|vendor|fonts|ikon)\//.test(u.pathname);
  e.respondWith(caches.open(SURUM).then(async c => {
    if (sabit) { const k = await c.match(e.request, { ignoreSearch: true }); if (k) return k; }
    try { const r = await fetch(e.request, { cache: "no-cache" }); if (r.ok && r.status === 200) c.put(e.request, r.clone()); return r; }
    catch (er) { const k = await c.match(e.request, { ignoreSearch: true }); if (k) return k; throw er; }
  }));
});
