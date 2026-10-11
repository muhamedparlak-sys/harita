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
  async function yer(ad) {
    if (!Object.keys(YERLER).length) { try { YERLER = await (await fetch("kut/yerler.json")).json(); } catch (e) { } Object.assign(YERLER, (await al("ayar", "yerler")) || {}); }
    if (YERLER[ad]) return YERLER[ad];
    const bekle = 1100 - (Date.now() - sonArama); if (bekle > 0) await new Promise(r => setTimeout(r, bekle)); sonArama = Date.now();
    const q = new URLSearchParams({ q: ad, format: "json", limit: 1, "accept-language": "tr" });
    const r = await fetch("https://nominatim.openstreetmap.org/search?" + q); if (!r.ok) throw new Error("Yer araması yapılamadı");
    const j = await r.json(); if (!j.length) return null;
    YERLER[ad] = [+(+j[0].lon).toFixed(5), +(+j[0].lat).toFixed(5), j[0].display_name.slice(0, 90)];
    const d = (await al("ayar", "yerler")) || {}; d[ad] = YERLER[ad]; await yaz("ayar", "yerler", d);
    return YERLER[ad];
  }
  async function noktalar(metin) {
    const P = [];
    for (const t of metin.split(",").map(x => x.trim()).filter(Boolean)) {
      const m = t.match(/^(-?[\d.]+)\s*[, ]\s*(-?[\d.]+)$/);
      if (m) { P.push([t, +m[1], +m[2]]); continue; }
      const r = await yer(t); if (r) P.push([t, r[0], r[1]]);
    }
    return P;
  }
  async function sec(metin) {
    const P = await noktalar(metin), kat = await kutuphane();
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
      const v = mod === "dikey" ? "window.__VID={w:540,h:960,top:70,alt:.27};" : mod === "video" ? `window.__VID=${JSON.stringify(vid)};` : "";
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
    hikayeler, hikaye, hikayeKaydet, hikayeSil, yeniHikaye, iceAktar, disaAktar, kayitKaydet, kayit, kayitlar, sayfaKur, sesOnb, sesOnbYaz, ayar, ayarYaz };
})();
