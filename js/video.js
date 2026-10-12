/* Reel üretimi telefonda: masaüstündeki video.py'nin karşılığı.
   Harita motoru gizli bir çerçevede 540×960 dikey kadrajda çalışır; her kare tuvale çizilir (harita + SVG katmanı + altyazı),
   WebCodecs ile H.264/AAC MP4'e kodlanır. WebCodecs yoksa gerçek zamanlı kayda (MediaRecorder) geçilir. */
"use strict";
const VIDEO = (() => {
  const SR = 48000, WV = 1080, HV = 1920, K = 2; /* CSS 540×960 → 1080×1920 */
  const LEAD = .3, TAIL = .4, HLEAD = .1, HTAIL = .35;

  /* ---------------- SVG katmanını tuvale çizen küçük çizici ---------------- */
  const imgOnb = {};
  function resim(href) { if (!imgOnb[href]) { const im = new Image(); im.src = href; imgOnb[href] = im; } return imgOnb[href]; }
  async function resimlerHazir(svg) { const L = [...svg.querySelectorAll("image")].map(e => resim(e.getAttribute("href"))); await Promise.all(L.map(im => im.complete ? 0 : new Promise(ok => { im.onload = im.onerror = ok; }))); }
  function stilAyir(s) { const o = {}; if (!s) return o; for (const p of s.split(";")) { const i = p.indexOf(":"); if (i > 0) o[p.slice(0, i).trim()] = p.slice(i + 1).trim(); } return o; }
  const MIRAS = ["fill", "stroke", "stroke-width", "stroke-opacity", "fill-opacity", "stroke-linecap", "stroke-linejoin", "stroke-dasharray", "stroke-dashoffset", "font-size", "font-weight", "text-anchor", "paint-order", "letter-spacing"];
  function svgCiz(ctx, svg, degisken, aile) {
    const vb = svg.viewBox.baseVal, sx = ctx.canvas.width / vb.width, sy = ctx.canvas.height / vb.height;
    const renk = v => { if (!v || v === "none") return null; const m = v.match(/^var\((--[\w-]+)\)$/); return m ? degisken(m[1]) : v; };
    ctx.save(); ctx.scale(sx, sy);
    const dugum = (e, ust, alfa) => {
      if (e.nodeType !== 1) return; if (e.style && e.style.display === "none") return; if (e.getAttribute("display") === "none") return;
      const st = Object.assign({}, ust), s = stilAyir(e.getAttribute("style"));
      for (const k of MIRAS) { const v = s[k] ?? e.getAttribute(k); if (v != null) st[k] = v; }
      const op = e.getAttribute("opacity"), a = alfa * (op == null ? 1 : +op); if (a <= 0.002) return;
      ctx.save(); const tr = e.getAttribute("transform"); if (tr) donustur(ctx, tr);
      const tag = e.tagName.toLowerCase();
      if (tag === "g" || tag === "svg") for (const c of e.children) dugum(c, st, a);
      else boya(ctx, e, tag, st, a, renk, aile);
      ctx.restore(); };
    const kok = { fill: "#000", "font-size": "16", "font-weight": "400", "text-anchor": "start" };
    for (const c of svg.children) dugum(c, kok, 1);
    ctx.restore();
  }
  function donustur(ctx, tr) {
    for (const m of tr.matchAll(/(translate|rotate|scale)\(([^)]*)\)/g)) { const v = m[2].split(/[\s,]+/).filter(Boolean).map(Number);
      if (m[1] === "translate") ctx.translate(v[0] || 0, v[1] || 0); else if (m[1] === "rotate") ctx.rotate((v[0] || 0) * Math.PI / 180); else ctx.scale(v[0], v[1] == null ? v[0] : v[1]); }
  }
  function boya(ctx, e, tag, st, a, renk, aile) {
    const g = n => +e.getAttribute(n) || 0;
    const fill = renk(st.fill), stroke = renk(st.stroke), sw = +(st["stroke-width"] || 1);
    const fo = st["fill-opacity"] == null ? 1 : +st["fill-opacity"], so = st["stroke-opacity"] == null ? 1 : +st["stroke-opacity"];
    ctx.lineWidth = sw; ctx.lineCap = st["stroke-linecap"] || "butt"; ctx.lineJoin = st["stroke-linejoin"] || "miter";
    const da = st["stroke-dasharray"]; ctx.setLineDash(da && da !== "none" ? da.split(/[\s,]+/).map(Number) : []); ctx.lineDashOffset = +(st["stroke-dashoffset"] || 0);
    const doldur = p => { if (fill && tag !== "line") { ctx.globalAlpha = a * fo; ctx.fillStyle = fill; p ? ctx.fill(p) : ctx.fill(); } };
    const ciz = p => { if (stroke) { ctx.globalAlpha = a * so; ctx.strokeStyle = stroke; p ? ctx.stroke(p) : ctx.stroke(); } };
    if (tag === "path") { const d = e.getAttribute("d"); if (!d) return; const p = new Path2D(d); doldur(p); ciz(p); }
    else if (tag === "circle") { const r = g("r"); if (r <= 0) return; ctx.beginPath(); ctx.arc(g("cx"), g("cy"), r, 0, 2 * Math.PI); doldur(); ciz(); }
    else if (tag === "line") { ctx.beginPath(); ctx.moveTo(g("x1"), g("y1")); ctx.lineTo(g("x2"), g("y2")); ciz(); }
    else if (tag === "rect") { ctx.beginPath(); const rx = g("rx"); if (ctx.roundRect && rx) ctx.roundRect(g("x"), g("y"), g("width"), g("height"), rx); else ctx.rect(g("x"), g("y"), g("width"), g("height")); doldur(); ciz(); }
    else if (tag === "image") { const im = resim(e.getAttribute("href")); if (im.complete && im.naturalWidth) { ctx.globalAlpha = a; ctx.drawImage(im, g("x"), g("y"), g("width"), g("height")); } }
    else if (tag === "text") { const t = e.textContent; if (!t) return; const fs = +(st["font-size"] || 16);
      ctx.font = `${st["font-weight"] || 400} ${fs}px ${aile}`; const an = st["text-anchor"]; ctx.textAlign = an === "middle" ? "center" : an === "end" ? "right" : "left"; ctx.textBaseline = "alphabetic";
      const ls = st["letter-spacing"]; if ("letterSpacing" in ctx) ctx.letterSpacing = ls ? (ls.endsWith("em") ? parseFloat(ls) * fs + "px" : ls) : "0px";
      const x = g("x"), y = g("y"), ilk = (st["paint-order"] || "").startsWith("stroke");
      if (ilk && stroke) { ctx.globalAlpha = a * so; ctx.strokeStyle = stroke; ctx.strokeText(t, x, y); }
      if (fill) { ctx.globalAlpha = a * fo; ctx.fillStyle = fill; ctx.fillText(t, x, y); }
      if (!ilk && stroke) { ctx.globalAlpha = a * so; ctx.strokeStyle = stroke; ctx.strokeText(t, x, y); }
      if ("letterSpacing" in ctx) ctx.letterSpacing = "0px"; }
  }

  /* ---------------- gizli motor çerçevesi ---------------- */
  async function cerceveAc(hk, vid, tema) {
    const f = document.createElement("iframe");
    f.style.cssText = "position:fixed;left:-10000px;top:0;width:540px;height:960px;border:0;opacity:0;pointer-events:none";
    f.setAttribute("aria-hidden", "true"); document.body.append(f);
    f.srcdoc = await DEPO.sayfaKur(hk, "video", vid);
    await new Promise(ok => f.onload = ok);
    const W = f.contentWindow;
    W.document.documentElement.setAttribute("data-theme", tema || "light");
    const t0 = Date.now(); while (!(W.__draw && W.eval("Object.values(MAPS).every(m=>m.ok)"))) { if (Date.now() - t0 > 60000) throw new Error("Haritalar yüklenemedi"); await new Promise(r => setTimeout(r, 50)); }
    try { await W.document.fonts.ready; } catch (e) { }
    await resimlerHazir(W.document.getElementById("ov"));
    const kokE = W.document.documentElement, cs = W.getComputedStyle(kokE), onb = {};
    const degisken = k => { const a = (kokE.dataset.gece || "") + k; return onb[a] || (onb[a] = cs.getPropertyValue(k).trim() || "#000"); };
    return { f, W, degisken, kapat: () => f.remove() };
  }

  /* ---------------- altyazı ---------------- */
  const NOK = "\"“”'‘’()[].,;:!?…«»-–—";
  const temiz = x => x.replace(new RegExp("^[" + NOK.replace(/[\]\\-]/g, "\\$&") + "]+|[" + NOK.replace(/[\]\\-]/g, "\\$&") + "]+$", "g"), "").toLocaleLowerCase("tr-TR");
  /* yabancı adları sözlükteki okunuşla değiştirir (ses için); Türkçe ek korunur */
  function okunus(metin, S) {
    const T = metin.split(/\s+/).filter(Boolean), Kk = Object.entries(S || {}).map(([k, v]) => [k.split(/\s+/), v]).sort((a, b) => b[0].length - a[0].length);
    const out = []; let i = 0;
    while (i < T.length) { let bul = false;
      for (const [kw, v] of Kk) { const L = kw.length; if (i + L > T.length) continue; let ok = true;
        for (let x = 0; x < L - 1; x++) if (temiz(T[i + x]) !== kw[x].toLocaleLowerCase("tr-TR")) { ok = false; break; } if (!ok) continue;
        const m = T[i + L - 1].match(/^(["“(«]*)(.+?)(['’][\p{L}]+)?([.,;:!?…”")»]*)$/u);
        if (m && m[2].toLocaleLowerCase("tr-TR") === kw[L - 1].toLocaleLowerCase("tr-TR")) { const lead = (T[i].match(/^["“(«]*/) || [""])[0];
          out.push([T.slice(i, i + L), (lead + v + (m[3] || "") + (m[4] || "")).split(/\s+/)]); i += L; bul = true; break; } }
      if (!bul) { out.push([[T[i]], [T[i]]]); i++; } }
    return { konusma: out.map(o => o[1].join(" ")).join(" "), es: out };
  }
  function kelimeler(metin, W, sure, S) {
    const { konusma, es } = okunus(metin, S), T = konusma.split(/\s+/).filter(Boolean), n = x => x.toLocaleLowerCase("tr-TR").replace(/[^\p{L}\p{N}]/gu, "");
    let out = [], j = 0;
    if (W && W.length) { for (const tok of T) { const key = n(tok); if (!key) { out.push([out.length ? out[out.length - 1][0] : 0, tok]); continue; }
        let acc = "", t0 = null, k = j; while (k < W.length && acc.length < key.length) { if (t0 == null) t0 = W[k][0]; acc += n(W[k][2]); k++; }
        if (acc !== key || t0 == null) { out = null; break; } out.push([t0, tok]); j = k; } }
    if (!out || !out.length) { const L = T.reduce((a, t) => a + t.length + 1, 0); let a = 0; out = []; for (const tok of T) { out.push([sure * a / L, tok]); a += tok.length + 1; } }
    const son = []; let k = 0;
    for (const [orj, sp] of es) { const t0 = out.length ? out[Math.min(k, out.length - 1)][0] : 0;
      orj.forEach((w, x) => son.push([orj.length === sp.length && out.length ? out[Math.min(k + x, out.length - 1)][0] : t0 + .12 * x, w])); k += sp.length; }
    return son;
  }
  function gruplar(Kl, son) {
    const G = []; let cur = [];
    for (const [t, w] of Kl) { cur.push([t, w]); if (cur.length >= 4 || cur.reduce((a, x) => a + x[1].length + 1, 0) > 24 || /[.,;:!?…]$/.test(w)) { G.push(cur); cur = []; } }
    if (cur.length) G.push(cur);
    return G.map((g, i) => ({ bas: g[0][0], son: i + 1 < G.length ? G[i + 1][0][0] : son, k: g }));
  }
  const zipla = y => { if (y >= .14) return [1, 1]; const u = Math.max(0, (y + .05) / .19), c1 = 1.70158, c3 = c1 + 1; return [1 + c3 * (u - 1) ** 3 + c1 * (u - 1) ** 2, Math.min(1, u * 2)]; };
  function altyaziCiz(ctx, G, t, kip) {
    let g = null; for (const x of G) if (x.bas - .05 <= t && t < x.son) { g = x; break; } if (!g) return;
    const yas = t - g.bas, [sc, op] = zipla(yas), soru = kip === "soru";
    const fs = (soru ? 40 : 32) * K, lh = fs * (soru ? 1.4 : 1.45), px = (soru ? 16 : 12) * K, py = (soru ? 6 : 3) * K, maxW = (540 - 44) * K - 2 * px;
    const cur = g.duz ? -1 : g.k.reduce((m, [tt], i) => tt <= t + .02 ? i : m, 0);
    ctx.save(); ctx.font = `800 ${fs}px Inter, -apple-system, sans-serif`; ctx.textBaseline = "middle";
    const bosluk = ctx.measureText(" ").width + .08 * fs, S = []; let satir = [], w = 0;
    g.k.forEach(([, s], i) => { const ww = ctx.measureText(s).width; if (satir.length && w + bosluk + ww > maxW) { S.push({ k: satir, w }); satir = []; w = 0; } w += (satir.length ? bosluk : 0) + ww; satir.push({ s, ww, i }); });
    if (satir.length) S.push({ k: satir, w });
    const toplam = S.length * lh; let y0;
    if (soru) y0 = .30 * HV; else if (kip === "ust") y0 = 150 * K; else y0 = HV - 200 * K - toplam;
    const ox = WV / 2, oy = y0 + toplam * .6; ctx.translate(ox, oy); ctx.scale(sc, sc); ctx.translate(-ox, -oy); ctx.globalAlpha = op;
    S.forEach((L, r) => { const cy = y0 + r * lh + lh / 2, x0 = WV / 2 - L.w / 2, h = fs * 1.21 + 2 * py;
      ctx.fillStyle = soru ? "rgba(14,20,23,.86)" : "rgba(14,20,23,.78)"; ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(x0 - px, cy - h / 2, L.w + 2 * px, h, 10 * K); else ctx.rect(x0 - px, cy - h / 2, L.w + 2 * px, h); ctx.fill();
      let x = x0; for (const k of L.k) { ctx.fillStyle = k.i === cur ? "#FFD54A" : "#fff"; ctx.fillText(k.s, x, cy + fs * .04); x += k.ww + bosluk; } });
    ctx.restore();
  }

  /* bir kare: harita tuvali + SVG katmanı + altyazı */
  function kare(ctx, M, p, solo, G, t, kip, u, hook) {
    const W = M.W; W.__solo = solo; W.__u = u == null ? null : u; W.__kbz = hook ? .2 : null; W.__kbYon = hook ? 1 : null; W.__draw(p);
    const cv = W.document.getElementById("cv"); ctx.globalAlpha = 1; ctx.drawImage(cv, 0, 0, WV, HV);
    svgCiz(ctx, W.document.getElementById("ov"), M.degisken, "Inter, \"Instrument Sans\", -apple-system, sans-serif");
    if (G && G.length) altyaziCiz(ctx, G, t, kip);
  }

  /* ---------------- ses kaynakları ---------------- */
  function karma(s) { let h1 = 0xdeadbeef, h2 = 0x41c6ce57; for (let i = 0; i < s.length; i++) { const c = s.charCodeAt(i); h1 = Math.imul(h1 ^ c, 2654435761); h2 = Math.imul(h2 ^ c, 1597334677); }
    h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909); h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
    return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36); }
  async function cozMono(blob) {
    const ab = await blob.arrayBuffer(), ac = new OfflineAudioContext(1, 1, SR);
    const b = await new Promise((ok, no) => { const p = ac.decodeAudioData(ab, ok, no); if (p && p.then) p.then(ok, no); });
    const n = b.length, x = new Float32Array(n); for (let c = 0; c < b.numberOfChannels; c++) { const d = b.getChannelData(c); for (let i = 0; i < n; i++) x[i] += d[i] / b.numberOfChannels; }
    if (b.sampleRate === SR) return x;
    const oc = new OfflineAudioContext(1, Math.ceil(n * SR / b.sampleRate), SR), bb = oc.createBuffer(1, n, b.sampleRate); bb.getChannelData(0).set(x);
    const s = oc.createBufferSource(); s.buffer = bb; s.connect(oc.destination); s.start(); return (await oc.startRendering()).getChannelData(0).slice();
  }

  /* ---------------- reel ---------------- */
  /* a: {ses:"tts"|"kendi"|"yok", konusmaci, ton, dil, altyazi_dil, altyazi, efekt, adimlar, tema}; log(metin), ilerle(oran) */
  async function uret(AD, hk, a, log, ilerle, durdur) {
    const V = hk.veri, steps = V.steps, META = V.meta || {}, n = steps.length;
    const sesOn = a.ses !== "yok", altOn = a.altyazi !== "off" && sesOn, efOn = a.efekt !== "off";
    let lo = 1, hi = n; if (a.adimlar) { const m = String(a.adimlar).match(/(\d+)\D+(\d+)/) || String(a.adimlar).match(/(\d+)/); if (m) { lo = Math.max(1, +m[1]); hi = Math.min(n, +(m[2] || m[1])); } }
    const adil = a.altyazi_dil || a.dil;
    const sesm = o => ((a.dil === "en" ? o.ses_en : o.ses) || ""), altm = o => ((adil === "en" ? o.ses_en : o.ses) || "");
    const SOZ = Object.assign({}, await DEPO.okunusSozluk(), META.okunus || {});
    const hiz = { sakin: 1.0, canli: 1.1, cok: 1.2 }[a.ton] || 1.1;

    async function seslendir(metin, parca) {
      if (!sesOn || !metin.trim()) return { x: null, W: [] };
      if (a.ses === "tts") {
        const okunan = a.dil === "tr" ? okunus(metin, SOZ).konusma : metin, key = karma(`${a.konusmaci}|${hiz}|${okunan}`);
        let r = await DEPO.sesOnb(key);
        if (!r) { log(`  ses üretiliyor: ${parca}`); r = await PIPER.oku(okunan, { ses: a.konusmaci, hiz, sr: SR, ilerle: (y, t) => log(`  ses modeli indiriliyor… ${t ? Math.round(y / t * 100) + "%" : Math.round(y / 1e6) + " MB"}`, true) }); await DEPO.sesOnbYaz(key, r); }
        return EFEKT.sikistir(r.x, r.W, .32);
      }
      const b = await DEPO.kayit(AD, parca); if (!b) { log(`  kayıt yok: ${parca} → sessiz`); return { x: null, W: [] }; }
      const W = (await DEPO.kayit(AD, parca + "#W")) || []; /* bilgisayarda üretilen kopya sesin kelime zamanları */
      return EFEKT.sikistir(EFEKT.dengele(await cozMono(b)), Array.isArray(W) ? W : [], .32);
    }
    function altyazi(o, x, W, bas, son) {
      if (!x || !altOn) return [];
      if (adil === a.dil) return gruplar(kelimeler(sesm(o), W, x.length / SR, a.dil === "tr" ? SOZ : {}).map(([t, w]) => [t + bas, w]), son);
      const m = altm(o); if (!m) return [];
      const G = gruplar(kelimeler(m, [], x.length / SR, {}).map(([t, w]) => [t + bas, w]), son); G.forEach(g => g.duz = 1); return G;
    }

    log("Harita motoru açılıyor…");
    const top = a.etiket === "off" ? 0 : 70;
    const M = await cerceveAc(hk, { w: 540, h: 960, top, alt: altOn ? .27 : 0 }, a.tema);
    try {
      const EV = M.W.__olaylar ? M.W.__olaylar() : steps.map(() => []);
      const evs = (i, f0, f1, sure, t0) => (EV[i] || []).filter(e => f0 <= e.t && e.t <= f1).map(e => ({ t: t0 + (e.t - f0) / Math.max(1e-6, f1 - f0) * sure, ad: e.tur, k: e.k }));
      const PARCA = [], OLAY = [], SESLER = []; let T = 0;
      const ekle = (p) => { p.t0 = T; PARCA.push(p); T += p.sure; };
      for (let i = lo - 1; i < hi; i++) {
        if (durdur()) throw new Error("Durduruldu");
        const st = steps[i], solo = i === 0 || steps[i - 1].perde !== st.perde;
        if (solo && st.hook) {
          const h = st.hook, j = (+h.adim || 7) - 1, an = +(h.an ?? .7);
          const { x, W } = await seslendir(sesm(h), `hook_${String(i + 1).padStart(2, "0")}`);
          const sure = x ? Math.max(2.2, HLEAD + x.length / SR + HTAIL) : +(h.sn || 3);
          const f0 = j + Math.max(0, an - .07), f1 = j + Math.min(.999, an + .07);
          const G = altyazi(h, x, W, HLEAD, sure - .1); const t0 = T;
          OLAY.push({ t: t0 + .02, ad: "vurus" }, ...evs(j, f0 - j, f1 - j, sure, t0)); if (x) SESLER.push([t0 + HLEAD, x]);
          ekle({ ad: "Hook", p0: f0, p1: f1, sure, solo: true, G, metin: sesm(h), i: j });
          log(`hook  ${sure.toFixed(1)} sn`);
        }
        const { x, W } = await seslendir(sesm(st), `sahne_${String(i + 1).padStart(2, "0")}`);
        const sure = x ? Math.max(7, LEAD + x.length / SR + TAIL) : (+st.sn || (st.ses ? Math.round((st.ses.split(/\s+/).length / 2.3 + 1) * 10) / 10 : 6));
        const G = altyazi(st, x, W, LEAD, sure - .15), t0 = T;
        if (!(solo && !st.hook)) OLAY.push({ t: t0, ad: "gecis" }); OLAY.push(...evs(i, 0, .999, sure, t0)); if (x) SESLER.push([t0 + LEAD, x]);
        ekle({ ad: `S${i + 1}`, p0: i, p1: i + .999, sure, solo: solo && !st.hook, G, metin: sesm(st), i });
        log(`sahne ${i + 1}  ${sure.toFixed(1)} sn`);
        const sonMu = i === n - 1 || steps[i + 1].perde !== st.perde, sq = { ses: META.soru || "", ses_en: META.soru_en || "" };
        if (sonMu && sesm(sq).trim()) {
          const { x, W } = await seslendir(sesm(sq), `soru_${String(n).padStart(2, "0")}`);
          const sure = x ? Math.max(3, LEAD + x.length / SR + 1.4) : 4; let G = altyazi(sq, x, W, LEAD, sure - .1);
          if (G.length) G = [{ bas: G[0].bas, son: sure, k: G.flatMap(g => g.k), duz: G[0].duz }];
          if (!G.length && altOn && altm(sq)) G = [{ bas: .2, son: sure, k: altm(sq).split(/\s+/).map(w => [.2, w]), duz: 1 }];
          if (!G.length && !sesOn && a.altyazi !== "off" && altm(sq)) G = [{ bas: .2, son: sure, k: altm(sq).split(/\s+/).map(w => [.2, w]), duz: 1 }];
          const t0 = T; OLAY.push({ t: t0 + .05, ad: "pop" }, { t: t0, ad: "whoosh" }); if (x) SESLER.push([t0 + LEAD, x]);
          ekle({ ad: "Soru", p0: i + .999, p1: i + .999, sure, solo: false, G, metin: sesm(sq), i, soru: true });
          log(`soru  ${sure.toFixed(1)} sn`);
        }
      }
      PARCA.forEach(p => { p.G = p.G.map(g => ({ ...g, bas: g.bas, son: g.son })); const od = M.W.__odak ? M.W.__odak(Math.floor(p.p0)) : [0, 0]; p.kip = p.soru ? "soru" : (od[1] > .66 ? "ust" : "alt"); });
      log(`Toplam ${T.toFixed(1)} sn. Ses karıştırılıyor…`);
      const ses = new Float32Array(Math.ceil((T + .2) * SR)); for (const [t, x] of SESLER) { const i0 = Math.floor(t * SR); for (let k = 0; k < x.length && i0 + k < ses.length; k++) ses[i0 + k] += x[k]; }
      const EG = { on: .6, kisik: .32, guclu: .9 }[a.efekt] ?? (efOn ? .6 : 0);
      const yataklar = PARCA.map(p => ({ t0: p.t0, t1: p.t0 + p.sure, hava: (steps[p.i] || {}).hava || [] }));
      const mix = EFEKT.miks(T + .05, OLAY, SESLER.length ? ses : null, { efektG: efOn ? EG : 0, ambG: efOn ? .10 * EG / .6 : 0, ducKat: .72, yataklar });
      try { await document.fonts.load(`800 64px Inter`); } catch (e) { }
      const blob = await kodla(M, PARCA, T, mix, log, ilerle, durdur);
      /* altyazı (.srt) ve seslendirme metni */
      const srt = [], S = [`=== ${META.title || AD} ===`]; const tc = t => { const ms = Math.round(t * 1000); return `${String(Math.floor(ms / 3600000)).padStart(2, "0")}:${String(Math.floor(ms / 60000) % 60).padStart(2, "0")}:${String(Math.floor(ms / 1000) % 60).padStart(2, "0")},${String(ms % 1000).padStart(3, "0")}`; };
      const dk = t => `${Math.floor(t / 60)}:${(t % 60).toFixed(1).padStart(4, "0")}`;
      for (const p of PARCA) { S.push(`[${dk(p.t0)} – ${dk(p.t0 + p.sure)}] ${p.ad.toLocaleUpperCase("tr-TR")}: ${p.metin}`);
        for (const g of p.G) srt.push(`${srt.length + 1}\n${tc(p.t0 + g.bas)} --> ${tc(p.t0 + g.son)}\n${g.k.map(x => x[1]).join(" ")}\n`); }
      S.push(`toplam ${T.toFixed(1)} sn`);
      return { blob, sure: T, srt: srt.join("\n"), seslendirme: S.join("\n"), uzanti: blob.type.includes("webm") ? "webm" : "mp4" };
    } finally { M.kapat(); }
  }

  function parcaBul(PARCA, t) { for (const p of PARCA) if (t < p.t0 + p.sure) return p; return PARCA[PARCA.length - 1]; }
  function cizZaman(ctx, M, PARCA, t) { const p = parcaBul(PARCA, t), u = Math.min(1, Math.max(0, (t - p.t0) / p.sure));
    /* hook ve soru kendi içinde yaklaşır; sahneler sahne ilerlemesini kullanır */
    kare(ctx, M, p.p0 + (p.p1 - p.p0) * u, p.solo, p.G, t - p.t0, p.kip, p.ad === "Hook" ? u : null, p.ad === "Hook"); }

  let ACX = null, YONTEM = "oto";
  /* iOS'ta ses motoru yalnızca bir dokunuşla açılır: Üret'e dokunulduğunda çağrılır */
  function sesKilidiAc() { try { if (!ACX || ACX.state === "closed") ACX = new (window.AudioContext || window.webkitAudioContext)(); ACX.resume();
      const b = ACX.createBuffer(1, 1, ACX.sampleRate), k = ACX.createBufferSource(); k.buffer = b; k.connect(ACX.destination); k.start(0); } catch (e) { } }
  const tepe = x => { let m = 0; for (let i = 0; i < x.length; i += 7) { const v = Math.abs(x[i]); if (v > m) m = v; } return m; };
  async function sesTepe(blob) { try { const ab = await blob.arrayBuffer(), ac = new OfflineAudioContext(1, 1, SR);
      const b = await new Promise((ok, no) => { const p = ac.decodeAudioData(ab, ok, no); if (p && p.then) p.then(ok, no); });
      let m = 0; for (let c = 0; c < b.numberOfChannels; c++) m = Math.max(m, tepe(b.getChannelData(c))); return m; } catch (e) { return null; } }
  async function kodlayiciSec() {
    if (!("VideoEncoder" in window) || !("AudioEncoder" in window) || !window.Mp4Muxer) return null;
    let v = null;
    for (const c of ["avc1.640028", "avc1.4d0028", "avc1.640032", "avc1.42003e"]) { try { const r = await VideoEncoder.isConfigSupported({ codec: c, width: WV, height: HV, bitrate: 8e6, framerate: 30 }); if (r.supported) { v = { kod: c, mux: "avc" }; break; } } catch (e) { } }
    if (!v) for (const c of ["vp09.00.40.08", "vp09.00.41.08"]) { try { const r = await VideoEncoder.isConfigSupported({ codec: c, width: WV, height: HV, bitrate: 8e6, framerate: 30 }); if (r.supported) { v = { kod: c, mux: "vp9" }; break; } } catch (e) { } }
    if (!v) return null;
    let s = null;
    for (const [c, mux] of [["mp4a.40.2", "aac"], ["opus", "opus"]]) { try { const r = await AudioEncoder.isConfigSupported({ codec: c, sampleRate: SR, numberOfChannels: 2, bitrate: 192000 }); if (r.supported) { s = { kod: c, mux }; break; } } catch (e) { } }
    if (!s) return null;
    return { v, s };
  }

  async function kodla(M, PARCA, T, mix, log, ilerle, durdur) {
    const cv = document.createElement("canvas"); cv.width = WV; cv.height = HV; const ctx = cv.getContext("2d", { alpha: false });
    let kilit = null; try { kilit = await navigator.wakeLock.request("screen"); } catch (e) { }
    try {
      const K_ = (window.__GERCEK_ZAMANLI || YONTEM === "gercek") ? null : await kodlayiciSec();
      const mixTepe = tepe(mix.L);
      if (K_) {
        let b = null;
        try { b = await webcodecs(ctx, cv, M, PARCA, T, mix, K_, log, ilerle, durdur); }
        catch (e) { if (/Durduruldu/.test(e.message)) throw e; if (e.message !== "SESSIZ") log("Hızlı kodlama başarısız: " + e.message); }
        if (b) return b;
        log("Bu cihazda hızlı modda ses kodlanamadı; gerçek zamanlı kayda geçiliyor (video süresi kadar sürer, uygulamayı açık tutun)."); ilerle(0);
      } else log("Gerçek zamanlı kayıt (video süresi kadar sürer, uygulamayı açık tutun).");
      return await gercekZamanli(ctx, cv, M, PARCA, T, mix, log, ilerle, durdur);
    } finally { try { kilit && kilit.release(); } catch (e) { } }
  }

  async function webcodecs(ctx, cv, M, PARCA, T, mix, K_, log, ilerle, durdur) {
    const FPS = 30, F = Math.round(T * FPS);
    log(`Kodlanıyor: ${K_.v.mux.toUpperCase()} + ${K_.s.mux.toUpperCase()}, ${F} kare`);
    const muxer = new Mp4Muxer.Muxer({ target: new Mp4Muxer.ArrayBufferTarget(), fastStart: "in-memory", firstTimestampBehavior: "offset",
      video: { codec: K_.v.mux, width: WV, height: HV, frameRate: FPS }, audio: { codec: K_.s.mux, numberOfChannels: 2, sampleRate: SR } });
    let hata = null;
    const ve = new VideoEncoder({ output: (c, m) => muxer.addVideoChunk(c, m), error: e => hata = e });
    ve.configure({ codec: K_.v.kod, width: WV, height: HV, bitrate: 8e6, framerate: FPS, ...(K_.v.mux === "avc" ? { avc: { format: "avc" } } : {}) });
    /* ses önce ayrı kodlanır ve kendi çözücüsüyle dinlenir; sessizse öteki biçimle denenir, yine sessizse video hiç kodlanmadan gerçek zamanlıya geçilir */
    const N = Math.min(mix.L.length, Math.ceil(F / FPS * SR));
    let ses = null; const sessizMiks = tepe(mix.L) < .005;
    for (const bicim of ["f32-planar", "f32"]) {
      const s_ = await sesKodla(K_, mix, N, bicim); const t = await sesDinle(s_, K_);
      log(`Ses denetimi (${bicim}): ${t == null ? "doğrulanamadı" : t > .002 ? "ses var" : "SES YOK"}`);
      if (t == null || t > .002 || sessizMiks) { ses = s_; break; }
    }
    if (!ses) throw new Error("SESSIZ");
    for (const [c, m] of ses.P) muxer.addAudioChunk(c, m);
    const t0 = performance.now();
    for (let k = 0; k < F; k++) {
      if (hata) throw hata; if (durdur()) throw new Error("Durduruldu");
      cizZaman(ctx, M, PARCA, k / FPS);
      const fr = new VideoFrame(cv, { timestamp: Math.round(k / FPS * 1e6), duration: Math.round(1e6 / FPS) });
      ve.encode(fr, { keyFrame: k % (FPS * 2) === 0 }); fr.close();
      while (ve.encodeQueueSize > 6) await new Promise(r => setTimeout(r, 4));
      if (k % 15 === 0) { ilerle(k / F); await new Promise(r => setTimeout(r, 0)); }
    }
    await ve.flush(); if (hata) throw hata; muxer.finalize(); ve.close();
    ilerle(1); log(`Kodlama ${((performance.now() - t0) / 1000).toFixed(0)} sn sürdü.`);
    return new Blob([muxer.target.buffer], { type: "video/mp4" });
  }

  async function sesKodla(K_, mix, N, bicim) {
    const P = []; let hata = null, ilk = true, aciklama = null;
    const ASC = new Uint8Array([0x11, 0x90]); /* AAC-LC, 48 kHz, 2 kanal */
    const ae = new AudioEncoder({ output: (c, m) => {
      let d = new Uint8Array(c.byteLength); c.copyTo(d);
      if (K_.s.mux === "aac") {
        if (d.length > 7 && d[0] === 0xFF && (d[1] & 0xF0) === 0xF0) d = d.subarray((d[1] & 1) ? 7 : 9);
        if (ilk) { const dc = (m && m.decoderConfig) || {}; if (!dc.description || !dc.description.byteLength) m = { decoderConfig: { codec: "mp4a.40.2", sampleRate: SR, numberOfChannels: 2, description: ASC } }; }
      }
      if (ilk && m && m.decoderConfig) aciklama = m.decoderConfig.description || null;
      ilk = false; P.push([new EncodedAudioChunk({ type: c.type, timestamp: c.timestamp, duration: c.duration, data: d }), m]); }, error: e => hata = e });
    ae.configure({ codec: K_.s.kod, sampleRate: SR, numberOfChannels: 2, bitrate: 192000 });
    const B = 4800;
    for (let i = 0; i < N; i += B) { const m = Math.min(B, N - i), d = new Float32Array(m * 2);
      if (bicim === "f32") { for (let j = 0; j < m; j++) { d[2 * j] = mix.L[i + j]; d[2 * j + 1] = mix.R[i + j]; } }
      else { d.set(mix.L.subarray(i, i + m), 0); d.set(mix.R.subarray(i, i + m), m); }
      const ad = new AudioData({ format: bicim, sampleRate: SR, numberOfFrames: m, numberOfChannels: 2, timestamp: Math.round(i / SR * 1e6), data: d }); ae.encode(ad); ad.close();
      if (i % (B * 50) === 0) await new Promise(r => setTimeout(r, 0)); }
    await ae.flush(); ae.close(); if (hata) throw hata; if (!P.length) throw new Error("Ses kodlanamadı");
    return { P, aciklama };
  }
  /* kodlanmış sesi geri çözüp en yüksek düzeyine bakar (null: bu cihazda çözülemedi) */
  async function sesDinle(s_, K_) {
    if (!("AudioDecoder" in window)) return null;
    try { let m = 0, hata = null; const cfg = { codec: K_.s.kod, sampleRate: SR, numberOfChannels: 2 }; if (s_.aciklama) cfg.description = s_.aciklama;
      if (!(await AudioDecoder.isConfigSupported(cfg)).supported) return null;
      const dec = new AudioDecoder({ output: a => { const n = a.numberOfFrames; for (let ch = 0; ch < a.numberOfChannels; ch++) { const x = new Float32Array(n);
          try { a.copyTo(x, { planeIndex: ch, format: "f32-planar" }); } catch (e) { try { a.copyTo(x, { planeIndex: ch }); } catch (e2) { } } const t = tepe(x); if (t > m) m = t; } a.close(); }, error: e => hata = e });
      dec.configure(cfg);
      const P = s_.P, adim = Math.max(1, Math.floor(P.length / 400)); for (let i = 0; i < P.length; i += adim) dec.decode(P[i][0]);
      await dec.flush(); dec.close(); return hata ? null : m;
    } catch (e) { return null; }
  }

  async function gercekZamanli(ctx, cv, M, PARCA, T, mix, log, ilerle, durdur) {
    if (!window.MediaRecorder || !cv.captureStream) throw new Error("Bu tarayıcı video kaydını desteklemiyor. iOS 16.4 ya da daha yeni bir sürüm gerekir.");
    const ac = ACX && ACX.state !== "closed" ? ACX : new (window.AudioContext || window.webkitAudioContext)(); try { await ac.resume(); } catch (e) { }
    if (ac.state !== "running") throw new Error("Ses motoru başlatılamadı. Üret düğmesine yeniden dokunun.");
    const buf = ac.createBuffer(2, mix.L.length, SR); buf.getChannelData(0).set(mix.L); buf.getChannelData(1).set(mix.R);
    const src = ac.createBufferSource(); src.buffer = buf; const hedef = ac.createMediaStreamDestination(); src.connect(hedef);
    const sus = ac.createGain(); sus.gain.value = 0; src.connect(sus); sus.connect(ac.destination);
    cizZaman(ctx, M, PARCA, 0);
    const akis = new MediaStream([...cv.captureStream(30).getVideoTracks(), ...hedef.stream.getAudioTracks()]);
    const tur = ["video/mp4;codecs=avc1,mp4a.40.2", "video/mp4", "video/webm;codecs=vp9,opus", "video/webm"].find(t => MediaRecorder.isTypeSupported(t)) || "";
    const rec = new MediaRecorder(akis, tur ? { mimeType: tur, videoBitsPerSecond: 8e6, audioBitsPerSecond: 192000 } : {});
    const P = []; rec.ondataavailable = e => e.data.size && P.push(e.data);
    const bitti = new Promise(ok => rec.onstop = ok);
    rec.start(1000); const bas = ac.currentTime + .05; src.start(bas);
    await new Promise((ok, no) => { const dong = () => { if (durdur()) { no(new Error("Durduruldu")); return; } const t = ac.currentTime - bas;
        if (t >= T) { ok(); return; } cizZaman(ctx, M, PARCA, Math.max(0, t)); ilerle(Math.max(0, t) / T); requestAnimationFrame(dong); }; requestAnimationFrame(dong); })
      .finally(() => { try { rec.stop(); } catch (e) { } try { src.stop(); } catch (e) { } });
    await bitti; try { src.disconnect(); } catch (e) { } ilerle(1);
    return new Blob(P, { type: (rec.mimeType || tur || "video/mp4").split(";")[0] });
  }

  /* ---------------- dikey kontrol tablosu ---------------- */
  async function kontrolTablosu(hk, tema) {
    const M = await cerceveAc(hk, { w: 540, h: 960, top: 70 }, tema), n = hk.veri.steps.length;
    try { const cv = document.createElement("canvas"); cv.width = WV; cv.height = HV; const ctx = cv.getContext("2d");
      const cols = 4, w = 180, h = 320, sh = document.createElement("canvas"); sh.width = cols * (w + 6) + 6; sh.height = Math.ceil(n / cols) * (h + 28) + 6;
      const s = sh.getContext("2d"); s.fillStyle = "#fff"; s.fillRect(0, 0, sh.width, sh.height); s.font = "600 15px Inter, sans-serif";
      for (let k = 0; k < n; k++) { kare(ctx, M, k + .7, true, null, 0); const x = 6 + (k % cols) * (w + 6), y = 6 + Math.floor(k / cols) * (h + 28);
        s.fillStyle = "#17232A"; s.fillText(`S${k + 1}`, x + 2, y + 16); s.drawImage(cv, x, y + 22, w, h); s.strokeStyle = "#D3DBD9"; s.strokeRect(x + .5, y + 22.5, w - 1, h - 1); }
      return await new Promise(ok => sh.toBlob(ok, "image/png"));
    } finally { M.kapat(); }
  }
  return { sesKilidiAc, yontem: v => { YONTEM = v; }, uret, kontrolTablosu, okunus, kelimeler, gruplar, svgCiz, cerceveAc, kare };
})();
