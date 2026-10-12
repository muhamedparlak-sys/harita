/* Telefon içi depo: hikâyeler, haritalar, ses kayıtları, sözlük. Masaüstündeki sunucu.py'nin karşılığı. */
"use strict";
const DEPO = (() => {
  let dbp = null;
  function db() {
    if (!dbp) dbp = new Promise((ok, no) => {
      const r = indexedDB.open("harita-hikaye", 1);
      r.onupgradeneeded = () => { const d = r.result; for (const s of ["hikayeler", "haritalar", "kayitlar", "ayar", "sesonbellek"]) if (!d.objectStoreNames.contains(s)) d.createObjectStore(s); };
      r.onsuccess = () => ok(r.result); r.onerror = () => no(r.error);
    });
    return dbp;
  }
  async function islem(s, kip, f) { const d = await db(); return new Promise((ok, no) => { const t = d.transaction(s, kip), st = t.objectStore(s); let sonuc; const r = f(st); if (r) r.onsuccess = () => { sonuc = r.result; }; t.oncomplete = () => ok(sonuc); t.onerror = () => no(t.error); t.onabort = () => no(t.error); }); }
  const al = (s, k) => islem(s, "readonly", st => st.get(k));
  const yaz = (s, k, v) => islem(s, "readwrite", st => st.put(v, k));
  const sil = (s, k) => islem(s, "readwrite", st => st.delete(k));
  const anahtarlar = s => islem(s, "readonly", st => st.getAllKeys());

  /* ---------- kütüphane ---------- */
  let KAT = null, TEMEL_OKUNUS = {}, YERLER = {};
  async function kutuphane() {
    if (KAT) return KAT;
    const k = await (await fetch("kut/katalog.json")).json();
    for (const ad of await anahtarlar("haritalar")) { const h = await al("haritalar", ad); if (h) k[ad] = Object.assign({}, h.meta, { yerel: 1 }); }
    KAT = k; return KAT;
  }
  function kutuphaneSifirla() { KAT = null; }
  async function haritaPng(ad) { const h = await al("haritalar", ad); if (h) return h.png; const r = await fetch(`kut/${ad}.png`); if (!r.ok) throw new Error("Harita yok: " + ad); return await r.blob(); }
  async function onizleUrl(ad) { const h = await al("haritalar", ad); if (h && h.onizle) return URL.createObjectURL(h.onizle); return `kut/onizle/${ad}.jpg`; }
  async function haritaKaydet(ad, meta, png, onizle) { await yaz("haritalar", ad, { meta, png, onizle }); KAT = null; }
  async function haritaSil(ad) { await sil("haritalar", ad); KAT = null; }
  const _b64 = {};
  async function b64(ad) { if (_b64[ad]) return _b64[ad]; const b = await haritaPng(ad); const s = await new Promise(ok => { const r = new FileReader(); r.onload = () => ok(r.result.split(",")[1]); r.readAsDataURL(b); }); return (_b64[ad] = s); }

  async function okunusSozluk() {
    const temel = Object.keys(TEMEL_OKUNUS).length ? TEMEL_OKUNUS : (TEMEL_OKUNUS = Object.assign({}, await (await fetch("kut/okunus_temel.json")).json().catch(() => ({})), await (await fetch("kut/okunus.json")).json().catch(() => ({}))));
    return Object.assign({}, temel, (await al("ayar", "okunus")) || {});
  }
  async function okunusEkle(o) { const d = (await al("ayar", "okunus")) || {}; Object.assign(d, o); await yaz("ayar", "okunus", d); return Object.keys(await okunusSozluk()).length; }

  /* ---------- yer arama (önce yerler.json ve önbellek, sonra OpenStreetMap) ---------- */
  let sonArama = 0;
  /* kutu [lo0, lo1, la0, la1]: önce bu alanın içinde aranır (aynı adlı başka yerlere gitmesin), yoksa her yerde */
  const icinde = (r, k) => !k || (r[0] >= k[0] && r[0] <= k[1] && r[1] >= k[2] && r[1] <= k[3]);
  async function ara(ad, k) {
    const bekle = 1100 - (Date.now() - sonArama); if (bekle > 0) await new Promise(r => setTimeout(r, bekle)); sonArama = Date.now();
    const o = { q: ad, format: "json", limit: 6, "accept-language": "tr" }; if (k) Object.assign(o, { viewbox: `${k[0]},${k[3]},${k[1]},${k[2]}`, bounded: 1 });
    let j = null;
    for (let deneme = 0; deneme < 3 && !j; deneme++) {
      if (deneme) { await new Promise(r => setTimeout(r, 1500 * deneme)); sonArama = Date.now(); }
      try { const r = await fetch("https://nominatim.openstreetmap.org/search?" + new URLSearchParams(o)); if (r.ok) j = JSON.parse(await r.text()); } catch (e) { j = null; } }
    if (!j) throw new Error("yer arama servisine ulaşılamadı");
    /* müze, otel, dükkân gibi yapılar yerine burun, koy, köy, liman, fener gibi coğrafi noktaları yeğle */
    const puan = x => ["place", "natural", "waterway", "historic", "man_made", "military", "boundary", "landuse"].includes(x.class) ? 0
      : ["ferry_terminal", "marina", "harbour", "lighthouse", "beach"].includes(x.type) ? 1 : ["highway", "building", "shop", "office", "craft"].includes(x.class) ? 3 : 2;
    const s = j.reduce((a, x) => (!a || puan(x) < puan(a) ? x : a), null);
    return s ? [+(+s.lon).toFixed(5), +(+s.lat).toFixed(5), s.display_name.slice(0, 90)] : null;
  }
  async function yer(ad, kutu) {
    if (!Object.keys(YERLER).length) { try { YERLER = await (await fetch("kut/yerler.json")).json(); } catch (e) { } Object.assign(YERLER, (await al("ayar", "yerler")) || {}); }
    /* muğlak uzantılar (açığı, önleri, yakınları, bölgesi…) arama motorunda karşılığı olmadığından doğrudan çıkarılır; deniz olayı haritada en yakın denize oturtulur */
    ad = ad.replace(/\s+(açığı|açıkları|açıklarında|önleri|önü|önünde|yakınları|yakını|yakınında|bölgesi|civarı|çevresi|kıyıları|sahilleri|sularında|suları)$/i, "").trim();
    const kk = kutu ? `${ad}@${kutu.map(v => v.toFixed(1)).join(",")}` : ad;
    if (YERLER[ad] && icinde(YERLER[ad], kutu)) return YERLER[ad];
    if (YERLER[kk]) return YERLER[kk];
    let r = kutu ? await ara(ad, kutu) : null;
    const yalin = ad.replace(/\s+(koyu|körfezi|burnu|limanı|kalesi|açığı|adası|tabyası|feneri|köyü|ovası|sırtı|tepesi)$/i, "").trim();
    if (!r && kutu && yalin !== ad) r = await ara(yalin, kutu);
    const anahtar = r ? kk : ad;
    if (!r) { if (YERLER[ad] && icinde(YERLER[ad], kutu)) return YERLER[ad]; r = YERLER[ad] || await ara(ad, null); if (r && !icinde(r, kutu)) return null; }
    if (!r) return null;
    YERLER[anahtar] = r; const d = (await al("ayar", "yerler")) || {}; d[anahtar] = r; await yaz("ayar", "yerler", d);
    return r;
  }
  async function noktalar(metin, kutu) {
    const P = [];
    /* virgülle ayrılır ama parantez içindeki koordinat virgülü bölünmez: "Kabatepe (40.20, 26.27), Morto Koyu" */
    for (const t of metin.split(/,(?![^()\[\]]*[)\]])/).map(x => x.trim()).filter(Boolean)) {
      const kc = window.OTOMATIK && OTOMATIK.koordCoz(t);
      if (kc) { P.push([kc.ad || t, kc.p[0], kc.p[1]]); continue; }
      const r = await yer(t, kutu); if (r) P.push([t, r[0], r[1]]);
    }
    return P;
  }
  async function kutuHesapla(haritalar) { const kat = await kutuphane(), M = haritalar.map(h => kat[h]).filter(Boolean); if (!M.length) return null;
    const k = [Math.min(...M.map(m => m.lo0)), Math.max(...M.map(m => m.lo1)), Math.min(...M.map(m => m.la0)), Math.max(...M.map(m => m.la1))];
    const pw = (k[1] - k[0]) * .15, ph = (k[3] - k[2]) * .15; return [k[0] - pw, k[1] + pw, k[2] - ph, k[3] + ph]; }
  async function sec(metin, kutu) {
    const P = await noktalar(metin, kutu), kat = await kutuphane();
    const uy = Object.entries(kat).sort((a, b) => (a[1].lo1 - a[1].lo0) - (b[1].lo1 - b[1].lo0))
      .filter(([, m]) => P.length && P.every(([, lo, la]) => m.lo0 <= lo && lo <= m.lo1 && m.la0 <= la && la <= m.la1)).map(([a]) => a);
    return { haritalar: uy, noktalar: P };
  }

  /* ---------- hikâyeler ---------- */
  const VURUS = ["Açılış görüntüsü + tema", "Kurulum", "Tetikleyici", "Tereddüt → ikinci perde", "Eğlence ve oyunlar + B hikâyesi", "Orta nokta", "Kötüler yaklaşıyor → kayıp → karanlık gece", "Final + son görüntü"];
  const guvenli = ad => (String(ad).replace(/[^\p{L}\p{N}\- _]/gu, "").trim().replace(/ /g, "_").slice(0, 60) || "hikaye");
  const hikayeler = async () => (await anahtarlar("hikayeler")).sort((a, b) => a.localeCompare(b, "tr"));
  const hikaye = ad => al("hikayeler", ad);
  const hikayeKaydet = (ad, hk) => yaz("hikayeler", ad, hk);
  async function hikayeSil(ad) { await sil("hikayeler", ad); for (const k of await anahtarlar("kayitlar")) if (String(k).startsWith(ad + "/")) await sil("kayitlar", k); }
  async function yeniHikaye(ad, haritalar) {
    const kat = await kutuphane(), h0 = haritalar[0], m = kat[h0];
    const cam = { lo: +((m.lo0 + m.lo1) / 2).toFixed(4), la: +((m.la0 + m.la1) / 2).toFixed(4), w: +((m.lo1 - m.lo0) * .8).toFixed(4) };
    const baslik = ad.replace(/_/g, " ");
    const steps = Array.from({ length: 8 }, (_, k) => ({ map: h0, cam: { ...cam }, date: "", perde: baslik, text: "", ses: "", vurus: k + 1, pts: [], seas: [], ships: [], day: 19000101 }));
    steps[0].hook = { adim: 7, an: .6, ses: "" };
    const veri = { meta: { title: baslik, lab: "Harita hikâyesi", durum: "", h1: baslik, lead: "", listeBaslik: "", listeAciklama: "", dogrulanacak: [],
      yontem: [`Harita: ${m.kaynak || ""}`], kaynak: "", hazirlayan: "", paylasim: { [baslik]: { kapak: "", aciklama: "", etiketler: [], yorum: "" } }, okunus: {} },
      lg: [], notes: [], wr: [], wl: {}, steps };
    let a = guvenli(ad), k = 2; const var_ = await hikayeler(); while (var_.includes(a)) a = guvenli(ad) + "_" + k++;
    await hikayeKaydet(a, { haritalar, veri }); return a;
  }
  /* masaüstünden gelen hikaye.json ya da dışa aktarılmış paket (haritaları da içerebilir) */
  async function iceAktar(metin, onerilenAd) {
    const j = JSON.parse(metin); let hk = j, ad = onerilenAd;
    if (j.tur === "harita-hikaye-paket") { hk = j.hikaye; ad = j.ad || ad;
      for (const [h, v] of Object.entries(j.haritalar || {})) { const kat = await kutuphane(); if (!kat[h]) await haritaKaydet(h, v.meta, b64Blob(v.png, "image/png"), v.onizle ? b64Blob(v.onizle, "image/jpeg") : null); } }
    if (!hk.veri || !hk.veri.steps) throw new Error("Bu dosya bir hikâye değil (hikaye.json bekleniyor).");
    if (!hk.haritalar) hk.haritalar = [...new Set(hk.veri.steps.map(s => s.map))];
    const kat = await kutuphane(), eksik = hk.haritalar.filter(h => !kat[h]);
    let a = guvenli(ad || hk.veri.meta.title || "hikaye"), k = 2; const var_ = await hikayeler(); while (var_.includes(a)) a = guvenli(ad || hk.veri.meta.title) + "_" + k++;
    await hikayeKaydet(a, hk); return { ad: a, eksik };
  }
  async function disaAktar(ad) {
    const hk = await hikaye(ad), kat = await kutuphane(), H = {};
    for (const h of hk.haritalar) if (kat[h] && kat[h].yerel) { const v = await al("haritalar", h); H[h] = { meta: v.meta, png: await blobB64(v.png), onizle: v.onizle ? await blobB64(v.onizle) : null }; }
    return JSON.stringify({ tur: "harita-hikaye-paket", surum: 1, ad, hikaye: hk, haritalar: H });
  }
  const b64Blob = (s, t) => new Blob([Uint8Array.from(atob(s), c => c.charCodeAt(0))], { type: t });
  const blobB64 = b => new Promise(ok => { const r = new FileReader(); r.onload = () => ok(r.result.split(",")[1]); r.readAsDataURL(b); });

  /* ---------- kayıtlar (kendi sesiniz) ---------- */
  const kayitKaydet = (ad, parca, blob) => yaz("kayitlar", ad + "/" + parca, blob);
  const kayit = (ad, parca) => al("kayitlar", ad + "/" + parca);
  const kayitSil = (ad, parca) => sil("kayitlar", ad + "/" + parca);
  async function kayitlar(ad) { const o = {}; for (const k of await anahtarlar("kayitlar")) if (String(k).startsWith(ad + "/")) o[String(k).slice(ad.length + 1)] = 1; return o; }

  /* ---------- motor sayfası (masaüstündeki sayfa_kur) ---------- */
  let MOTOR = null;
  const motor = async () => MOTOR || (MOTOR = await (await fetch("motor.html")).text());
  async function fontCss() { const t = await (await fetch("fonts/inter.css")).text(); return t.replace(/url\(\.\//g, "url(" + new URL("fonts/", location.href).href); }
  const ONIZ_CSS = `html,body{overflow:hidden!important;margin:0!important;padding:0!important}
main{max-width:none!important;display:block!important}
main>section:not(#story),main>.top{display:none!important}
#steps,#hint,#scrim,.dots{display:none!important}
#story{margin:0!important}
.stick{position:fixed!important;inset:0!important;border-radius:0!important;border:0!important;box-shadow:none!important}
.stage{aspect-ratio:auto!important;width:100vw!important;height:100vh!important}
:root{--sans:Inter,"Instrument Sans",system-ui,-apple-system,sans-serif!important;padding:0!important}`;
  /* mod: null (dışa aktarılan sayfa), "yatay", "dikey" (önizleme), "video" (reel kaydı) */
  async function sayfaKur(hk, mod, vid) {
    const kat = await kutuphane(), L = (await motor()).split("\n"), i = L.findIndex(l => l.startsWith("const DATA="));
    const H = hk.haritalar.filter(h => kat[h]); for (const s of hk.veri.steps) if (kat[s.map] && !H.includes(s.map)) H.push(s.map);
    const M = H.map(h => `${h}:` + JSON.stringify({ lo0: kat[h].lo0, lo1: kat[h].lo1, la0: kat[h].la0, la1: kat[h].la1, w: kat[h].w, h: kat[h].h })).join(",");
    const S = (await Promise.all(H.map(async h => `${h}:"${await b64(h)}"`))).join(",");
    L[i] = "const DATA=" + JSON.stringify(hk.veri) + `, MAPS={${M}}, SRC={${S}};`;
    let html = L.join("\n");
    if (mod) {
      const v = mod === "dikey" ? "window.__VID={w:540,h:960,top:130,alt:.27};" : mod === "video" ? `window.__VID=${JSON.stringify(vid)};` : "";
      const bas = `<style>${await fontCss()}${ONIZ_CSS}</style><script>window.__ONIZLEME=1;${v}</script>`;
      html = html.replace('<script>\n"use strict";', bas + '<script>\n"use strict";');
      html = html.replace(/<link[^>]+fonts\.g[^>]+>/g, "");
    }
    return html;
  }
  /* ses önbelleği (yapay ses) */
  const sesOnb = k => al("sesonbellek", k);
  const sesOnbYaz = (k, v) => yaz("sesonbellek", k, v);
  const ayar = k => al("ayar", k), ayarYaz = (k, v) => yaz("ayar", k, v);
  return { kutuphane, kutuphaneSifirla, haritaPng, onizleUrl, haritaKaydet, haritaSil, okunusSozluk, okunusEkle, yer, noktalar, sec, VURUS, guvenli,
    kutuHesapla, hikayeler, hikaye, hikayeKaydet, hikayeSil, yeniHikaye, iceAktar, disaAktar, kayitKaydet, kayit, kayitSil, kayitlar, sayfaKur, sesOnb, sesOnbYaz, ayar, ayarYaz };
})();
