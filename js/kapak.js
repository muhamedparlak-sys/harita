/* Kapak görseli (1080×1920): videonun en sert anından taktik kapak. */
"use strict";
const KAPAK = (() => {
  const W = 1080, H = 1920, K = 2;
  const RENK = { beyaz: "#FFFFFF", sari: "#F4A261", kirmizi: "#E63946", mavi: "#4EA8FF", deniz: "#0B132B", hud: "#7FDBFF" };
  const VARSAYILAN = { s1: "", s1r: "beyaz", s2: "", s2r: "kirmizi", alt: "", mavi: "ALLIED FLEET", kirmizi: "OTTOMAN MINES", kanal: "", marka: "", kare: "oto" };
  const AILE = "Anton, Impact, 'Arial Narrow', sans-serif";

  /* motor içinde çalışan yardımcı: odak noktası, aktörler, koordinat */
  const YARDIMCI = `window.__kapakBilgi=function(k,tur,t){
    const c=ST[k], m=c.m, ov=document.getElementById("ov"), R=ov.getBoundingClientRect();
    const merkez=e=>{ const r=e.getBoundingClientRect(); return [r.x+r.width/2-R.x, r.y+r.height/2-R.y]; };
    const ters=(X,Y)=>{ const a=mx(m,0), b=mx(m,1), lo=(X-a)/(b-a); let u=-85, v=85; for(let i=0;i<50;i++){ const o=(u+v)/2; if(my(m,o)>Y) u=o; else v=o; } return [lo,(u+v)/2]; };
    let odak=null, geo=null;
    if(tur==="batis"){ const o=c.S.filter(o=>o.sh.sink!=null).sort((a,b)=>Math.abs(a.sh.sink-t)-Math.abs(b.sh.sink-t))[0];
      if(o){ odak=merkez(o.hull); const a=shipAt(o,t); geo=ters(a.X,a.Y); } }
    else if(tur==="patlama"||tur==="buyukpatlama"){ const b=c.B.slice().sort((a,b)=>(b.k-a.k)||Math.abs(a.t-t)-Math.abs(b.t-t))[0];
      if(b){ odak=merkez(b.c2); geo=ters(b.p[0],b.p[1]); } }
    const aktor=c.S.filter(o=>!o.sh.ikon&&+o.g.getAttribute("opacity")>.3).map(o=>{ const tr=o.g.getAttribute("transform")||"", r=tr.match(/rotate\\(([-\\d.]+)\\)/);
      return {p:merkez(o.hull), a:r?+r[1]:0, s:o.sh.s||"", k:o.kind||"big", n:o.sh.n||""}; });
    if(!odak){ const v=(c.V||[])[0]; if(v&&v.ring) odak=merkez(v.ring); else if(aktor.length) odak=aktor[aktor.length-1].p; else odak=[R.width/2,R.height*.55]; }
    if(!geo&&m){ const r=c.rect; if(r) geo=ters(r[0]+r[2]*odak[0]/R.width, r[1]+r[3]*odak[1]/R.height); }
    const mayin=(c.mines||[]).length>0;
    return {odak, geo, aktor, mayin, tarih:c.date||"", w:R.width, h:R.height};
  };
  window.__kapakSade=function(){ const ov=document.getElementById("ov");
    ov.querySelectorAll("text").forEach(t=>t.setAttribute("display","none"));
    ov.querySelectorAll('circle[r="2.5"]').forEach(c=>{ if((c.getAttribute("style")||"").includes("fill:var(--ink)")) c.setAttribute("style","fill:#E63946;stroke:#07101F"); }); };`;

  /* kare seçimi: S5 patlama/batış → S4 → en sert an → S4 kilitlenme */
  function kareSec(olaylar, adimlar, secim) {
    const n = olaylar.length, agir = { buyukpatlama: 3, batis: 2.6, patlama: 2 };
    const enIyi = k => (olaylar[k] || []).filter(e => agir[e.tur]).sort((a, b) => agir[b.tur] - agir[a.tur] || a.t - b.t)[0];
    if (secim && secim !== "oto") { const k = Math.min(n - 1, Math.max(0, +secim - 1)), e = enIyi(k); return e ? { k, e } : { k, e: { tur: "kilit", t: .8 } }; }
    for (const k of [4, 3]) { if (k < n) { const e = enIyi(k); if (e) return { k, e }; } }
    let best = null;
    for (let k = 0; k < n; k++) { if (adimlar[k] && adimlar[k].hook) continue; const e = enIyi(k); if (!e) continue;
      const puan = agir[e.tur] - .15 * Math.abs(k - 4); if (!best || puan > best.puan) best = { k, e, puan }; }
    if (best) return best;
    return { k: Math.min(3, n - 1), e: { tur: "kilit", t: .8 } };
  }

  const yuvarla = (c, x, y, w, h, r) => { c.beginPath(); if (c.roundRect) c.roundRect(x, y, w, h, r); else c.rect(x, y, w, h); };
  function sigdir(c, metin, maxW, maxF, minF) { let f = maxF; for (; f > minF; f -= 4) { c.font = `${f}px ${AILE}`; if (c.measureText(metin).width <= maxW) break; } return f; }
  const derece = (v, poz, neg) => { const a = Math.abs(v), d = Math.floor(a), m = (a - d) * 60; return `${d}°${m.toFixed(2).padStart(5, "0")}′${v >= 0 ? poz : neg}`; };

  function vinyet(c) {
    const g = c.createRadialGradient(W / 2, H * .52, H * .18, W / 2, H * .52, H * .62);
    g.addColorStop(0, "rgba(0,0,0,0)"); g.addColorStop(.55, "rgba(0,0,0,.28)"); g.addColorStop(1, "rgba(0,0,0,.88)");
    c.fillStyle = g; c.fillRect(0, 0, W, H);
    const ust = c.createLinearGradient(0, 0, 0, H * .42); ust.addColorStop(0, "rgba(3,6,14,.78)"); ust.addColorStop(1, "rgba(3,6,14,0)");
    c.fillStyle = ust; c.fillRect(0, 0, W, H * .42);
    const alt = c.createLinearGradient(0, H * .66, 0, H); alt.addColorStop(0, "rgba(3,6,14,0)"); alt.addColorStop(1, "rgba(3,6,14,.9)");
    c.fillStyle = alt; c.fillRect(0, H * .66, W, H * .34);
  }
  function izgara(c) {
    c.save(); c.strokeStyle = RENK.hud; c.globalAlpha = .07; c.lineWidth = 1.5;
    for (let x = 90; x < W; x += 180) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x, H); c.stroke(); }
    for (let y = 120; y < H; y += 180) { c.beginPath(); c.moveTo(0, y); c.lineTo(W, y); c.stroke(); }
    c.restore();
  }
  function patlama(c, x, y) {
    c.save(); c.globalCompositeOperation = "lighter";
    const g = c.createRadialGradient(x, y, 0, x, y, 230); g.addColorStop(0, "rgba(255,240,200,.95)"); g.addColorStop(.12, "rgba(255,150,70,.85)");
    g.addColorStop(.35, "rgba(230,57,70,.45)"); g.addColorStop(1, "rgba(230,57,70,0)"); c.fillStyle = g; c.beginPath(); c.arc(x, y, 230, 0, 7); c.fill();
    c.restore(); c.save();
    for (const [r, a, w] of [[120, .9, 5], [175, .5, 3], [235, .25, 2]]) { c.strokeStyle = `rgba(255,120,110,${a})`; c.lineWidth = w; c.beginPath(); c.arc(x, y, r, 0, 7); c.stroke(); }
    c.fillStyle = "#fff"; for (let i = 0; i < 26; i++) { const t = i * 2.399, r = 30 + (i * 37) % 140, s = 2 + (i % 3); c.globalAlpha = .55 + (i % 4) * .1; c.beginPath(); c.arc(x + Math.cos(t) * r, y + Math.sin(t) * r, s, 0, 7); c.fill(); }
    c.restore();
  }
  function nisangah(c, x, y, r, renk) {
    c.save(); c.strokeStyle = renk; c.lineWidth = 4; c.shadowColor = renk; c.shadowBlur = 18;
    const b = r * .38;
    for (const [sx, sy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) { c.beginPath(); c.moveTo(x + sx * r, y + sy * (r - b)); c.lineTo(x + sx * r, y + sy * r); c.lineTo(x + sx * (r - b), y + sy * r); c.stroke(); }
    c.lineWidth = 2.5; c.beginPath(); c.arc(x, y, r * .55, 0, 7); c.stroke();
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { c.beginPath(); c.moveTo(x + dx * r * .25, y + dy * r * .25); c.lineTo(x + dx * r * .75, y + dy * r * .75); c.stroke(); }
    c.fillStyle = renk; c.beginPath(); c.arc(x, y, 5, 0, 7); c.fill();
    c.restore();
  }
  function ok(c, x, y, aci, renk, uz) {
    const a = aci * Math.PI / 180, d0 = 34, d1 = d0 + uz, ux = Math.cos(a), uy = Math.sin(a), nx = -uy, ny = ux;
    const x0 = x + ux * d0, y0 = y + uy * d0, x1 = x + ux * d1, y1 = y + uy * d1;
    c.save(); c.strokeStyle = renk; c.fillStyle = renk; c.lineWidth = 7; c.lineCap = "round"; c.shadowColor = renk; c.shadowBlur = 14;
    c.setLineDash([18, 10]); c.beginPath(); c.moveTo(x0, y0); c.lineTo(x1 - ux * 18, y1 - uy * 18); c.stroke(); c.setLineDash([]);
    c.beginPath(); c.moveTo(x1 + ux * 16, y1 + uy * 16); c.lineTo(x1 - ux * 18 + nx * 17, y1 - uy * 18 + ny * 17); c.lineTo(x1 - ux * 18 - nx * 17, y1 - uy * 18 - ny * 17); c.closePath(); c.fill();
    c.restore();
  }
  const AY = { ocak: "JAN", şubat: "FEB", mart: "MAR", nisan: "APR", mayıs: "MAY", haziran: "JUN", temmuz: "JUL", ağustos: "AUG", eylül: "SEP", ekim: "OCT", kasım: "NOV", aralık: "DEC", gecesi: "NIGHT", gece: "NIGHT", akşam: "EVENING", sabah: "MORNING", öğle: "NOON", şafak: "DAWN" };
  const ingTarih = t => t.toLocaleLowerCase("tr-TR").replace(/[\p{L}]+/gu, w => AY[w] || w.toLocaleUpperCase("en-US")).replace(/(\d{1,2})\.(\d{2})\b/g, "$1:$2").replace(/,\s*/g, " · ").toLocaleUpperCase("en-US");
  function telemetri(c, b, sinif, op) {
    c.save(); c.font = `600 26px Inter, sans-serif`; c.textBaseline = "top";
    const sol = [`OP CLOCK  ${b.tarih ? ingTarih(b.tarih) : "—"}`, b.geo ? `${derece(b.geo[1], "N", "S")}  ${derece(b.geo[0], "E", "W")}` : "", `UNIT CLASS  ${sinif || "—"}`].filter(Boolean);
    const sag = ["◉ REC  TACTICAL", op ? op.toLocaleUpperCase("en-US") : "", "GRID 180 · Z-1"].filter(Boolean);
    c.globalAlpha = .62; c.fillStyle = RENK.hud;
    sol.forEach((s, i) => c.fillText(s, 56, 250 + i * 34));
    c.textAlign = "right"; sag.forEach((s, i) => c.fillText(s, W - 56, 250 + i * 34));
    c.globalAlpha = .45; c.strokeStyle = RENK.hud; c.lineWidth = 2.5;
    for (const [x, y, sx, sy] of [[36, 232, 1, 1], [W - 36, 232, -1, 1]]) { c.beginPath(); c.moveTo(x, y + 60 * sy); c.lineTo(x, y); c.lineTo(x + 60 * sx, y); c.stroke(); }
    c.restore();
  }
  function metin(c, o) {
    const sat = [[o.s1, RENK[o.s1r] || RENK.beyaz, 210], [o.s2, RENK[o.s2r] || RENK.kirmizi, 170]].filter(s => s[0] && s[0].trim());
    let y = 400; c.save(); c.textAlign = "center"; c.textBaseline = "alphabetic";
    for (const [s, renk, maxF] of sat) { const t = s.trim().toLocaleUpperCase("en-US"), f = sigdir(c, t, W - 120, maxF, 60);
      c.font = `${f}px ${AILE}`; y += f * .98;
      c.shadowColor = "rgba(0,0,0,.85)"; c.shadowBlur = 28; c.shadowOffsetY = 6; c.lineJoin = "round"; c.lineWidth = f * .07; c.strokeStyle = "rgba(0,0,0,.9)"; c.strokeText(t, W / 2, y);
      c.shadowBlur = 0; c.shadowOffsetY = 0; c.fillStyle = renk; c.fillText(t, W / 2, y); y += f * .12; }
    if (o.alt && o.alt.trim()) { const t = o.alt.trim().toLocaleUpperCase("en-US"); c.font = `600 30px Inter, sans-serif`; if ("letterSpacing" in c) c.letterSpacing = "6px";
      y += 34; const w = c.measureText(t).width; c.fillStyle = "rgba(3,6,14,.6)"; yuvarla(c, W / 2 - w / 2 - 22, y - 32, w + 44, 46, 6); c.fill();
      c.fillStyle = "#DDE6F2"; c.fillText(t, W / 2, y); if ("letterSpacing" in c) c.letterSpacing = "0px"; }
    c.restore(); return y;
  }
  function lejant(c, o) {
    const p = [[o.mavi, RENK.mavi, "BLUE"], [o.kirmizi, RENK.kirmizi, "RED"]].filter(x => x[0] && x[0].trim()); if (!p.length) return;
    c.save(); c.font = `700 30px Inter, sans-serif`; c.textBaseline = "middle";
    const parca = p.map(([t, r, ad]) => ({ t: `${ad}: ${t.trim().toLocaleUpperCase("en-US")}`, r })), ara = 34, kare = 22;
    const gen = parca.reduce((a, x) => a + kare + 14 + c.measureText(x.t).width, 0) + ara * (parca.length - 1) + 56;
    const bx = Math.max(40, (W - gen) / 2 - 60), by = 1430, bh = 72;   /* sağdaki düğmelerden uzak, alt çubuğun üstünde */
    c.fillStyle = "rgba(5,10,22,.78)"; yuvarla(c, bx, by, gen, bh, 10); c.fill(); c.strokeStyle = "rgba(127,219,255,.35)"; c.lineWidth = 2; c.stroke();
    let x = bx + 28;
    for (const q of parca) { c.fillStyle = q.r; c.fillRect(x, by + bh / 2 - kare / 2, kare, kare); x += kare + 14; c.fillStyle = "#F1F5FA"; c.fillText(q.t, x, by + bh / 2 + 1); x += c.measureText(q.t).width + ara; }
    c.restore();
  }
  function marka(c, o) {
    const x = 56, y = 1556; c.save();
    if (window.__MARKA_LOGO) { c.globalAlpha = 1; c.drawImage(window.__MARKA_LOGO, x - 18, y - 18, 84, 84); }
    else { c.globalAlpha = .9; c.strokeStyle = "#fff"; c.lineWidth = 3.5; c.beginPath(); c.arc(x + 24, y + 24, 20, 0, 7); c.stroke();
    c.beginPath(); c.moveTo(x + 24, y - 2); c.lineTo(x + 24, y + 50); c.moveTo(x - 2, y + 24); c.lineTo(x + 50, y + 24); c.stroke();
    c.fillStyle = RENK.kirmizi; c.beginPath(); c.arc(x + 24, y + 24, 6, 0, 7); c.fill(); }
    c.textBaseline = "alphabetic"; c.fillStyle = "#fff";
    if (o.marka) { c.font = `34px ${AILE}`; if ("letterSpacing" in c) c.letterSpacing = "3px"; c.fillText(o.marka.toLocaleUpperCase("en-US"), x + (window.__MARKA_LOGO ? 82 : 64), y + 22); if ("letterSpacing" in c) c.letterSpacing = "0px"; }
    c.font = `600 26px Inter, sans-serif`; c.globalAlpha = .82; c.fillText(o.kanal || "", x + (window.__MARKA_LOGO ? 82 : 64), y + (o.marka ? 52 : 34));
    c.restore();
  }

  async function hazirla(hk) {
    try { await document.fonts.load(`120px Anton`); await document.fonts.load(`600 26px Inter`); } catch (e) { }
    const M = await VIDEO.cerceveAc(hk, { w: 540, h: 960, top: 130 }, "taktik"); M.W.eval(YARDIMCI); return M;
  }
  async function ciz(M, o, sec) {
    const t = sec.e.tur === "batis" ? Math.max(0, sec.e.t - .03) : Math.min(.999, sec.e.t + .05);
      const ham = document.createElement("canvas"); ham.width = W; ham.height = H; const hc = ham.getContext("2d");
      hc.fillStyle = RENK.deniz; hc.fillRect(0, 0, W, H);
      VIDEO.kare(hc, M, sec.k + t, true, null, 0); M.W.__kapakSade();
      hc.drawImage(M.W.document.getElementById("cv"), 0, 0, W, H); VIDEO.svgCiz(hc, M.W.document.getElementById("ov"), M.degisken, "Inter, sans-serif");
      const b = M.W.__kapakBilgi(sec.k, sec.e.tur, t), sx = W / b.w, sy = H / b.h;
      const odak = [b.odak[0] * sx, b.odak[1] * sy];
      /* yakınlaştır: odak ekranın alt-ortasına gelsin (metne yer kalır), kenarlar boş kalmasın */
      const z = 1.2, hedef = [W / 2, H * .6];
      let dx = hedef[0] - odak[0] * z, dy = hedef[1] - odak[1] * z;
      /* odak kenardaysa harita kayar; açılan boşluk deniz rengi + vinyetle kapanır (odak her zaman ortada) */
      dx = Math.min(W * .35, Math.max(W - W * z - W * .35, dx)); dy = Math.min(H * .2, Math.max(H - H * z - H * .2, dy));
      const P = ([x, y]) => [x * z + dx, y * z + dy];
      const cv = document.createElement("canvas"); cv.width = W; cv.height = H; const c = cv.getContext("2d");
      c.fillStyle = RENK.deniz; c.fillRect(0, 0, W, H); c.drawImage(ham, dx, dy, W * z, H * z);
      izgara(c); vinyet(c);
      /* aktörlerin rota okları */
      const f = P(odak), konan = [];
      for (const a of b.aktor) { const p = P([a.p[0] * sx, a.p[1] * sy]);
        if (Math.hypot(p[0] - f[0], p[1] - f[1]) < 90 || konan.some(q => Math.hypot(q[0] - p[0], q[1] - p[1]) < 120) || konan.length >= 4) continue;
        konan.push(p); ok(c, p[0], p[1], a.a, a.s === "o" ? RENK.kirmizi : a.s === "y" ? RENK.sari : RENK.mavi, 120); }
      if (sec.e.tur === "kilit") nisangah(c, f[0], f[1], 120, RENK.kirmizi);
      else { patlama(c, f[0], f[1]); nisangah(c, f[0], f[1], 150, "rgba(255,90,100,.9)"); }
      const sinif = [...new Set(b.aktor.map(a => ({ big: "BB", small: "DD", sub: "SS" })[a.k]).filter(Boolean))].concat(b.mayin ? ["MINE"] : []).join(" · ");
      telemetri(c, b, sinif, o.alt ? o.alt.split(/[-–—(]/)[0].trim() : "");
      metin(c, o); lejant(c, o); marka(c, o);
      const blob = await new Promise(ok_ => cv.toBlob(ok_, "image/png"));
      return { blob, kare: sec.k + 1, tur: sec.e.tur, ayar: o };
  }
  async function uret(hk, ayar) {
    const o = Object.assign({}, VARSAYILAN, ayar || {}), M = await hazirla(hk);
    try { return await ciz(M, o, kareSec(M.W.__olaylar(), hk.veri.steps, o.kare)); } finally { M.kapat(); }
  }
  /* birkaç aday: farklı anlar (S5/S4 önce, sonra en sert anlar) ve iki renk düzeni */
  async function adaylar(hk, ayar, n = 4) {
    const o = Object.assign({}, VARSAYILAN, ayar || {}), M = await hazirla(hk), steps = hk.veri.steps;
    try {
      const ol = M.W.__olaylar(), agir = { buyukpatlama: 3, batis: 2.6, patlama: 2 }, L = [], gor = new Set();
      const ekle = (k, e) => { const key = k + ":" + e.tur + ":" + Math.round(e.t * 10); if (!gor.has(key) && L.length < n) { gor.add(key); L.push({ k, e }); } };
      if (o.kare && o.kare !== "oto") ekle(...Object.values(kareSec(ol, steps, o.kare)));
      else { const ilk = kareSec(ol, steps, "oto"); ekle(ilk.k, ilk.e); }
      const T = []; ol.forEach((E, k) => { if (steps[k] && steps[k].hook) return; for (const e of E) if (agir[e.tur]) T.push({ k, e, p: agir[e.tur] - .15 * Math.abs(k - 4) }); });
      T.sort((a, b) => b.p - a.p); const adimda = new Set(L.map(x => x.k));
      for (const x of T) if (!adimda.has(x.k)) { adimda.add(x.k); ekle(x.k, x.e); }
      for (const x of T) ekle(x.k, x.e);
      for (const k of [3, 4, 2, 5]) if (k < steps.length) ekle(k, { tur: "kilit", t: .8 });
      const R = [];
      for (const [i, sec] of L.entries()) { const v = Object.assign({}, o); if (i % 2) { v.s1r = o.s1r === "sari" ? "beyaz" : "sari"; v.s2r = o.s2r === "kirmizi" ? "beyaz" : "kirmizi"; } v.kare = String(sec.k + 1); R.push(await ciz(M, v, sec)); }
      return R;
    } finally { M.kapat(); }
  }
  /* 0,5 sn kuralı denetimi */
  function denetle(o, baslik) {
    const U = [], n = s => (s || "").toLocaleLowerCase("tr-TR").replace(/[^\p{L}\p{N}]+/gu, " ").trim();
    const k = [o.s1, o.s2].join(" ").trim().split(/\s+/).filter(Boolean).length;
    if (!k) U.push("Kapak yazısı boş."); else if (k > 4) U.push(`${k} kelime: en çok 3–4 kelime olmalı.`);
    if (baslik && n([o.s1, o.s2].join(" ")) === n(baslik)) U.push("Kapak yazısı başlığın aynısı: başlığı kopyalamayın, ölçek + sonuç yazın.");
    return U;
  }
  return { uret, adaylar, denetle, VARSAYILAN };
})();
