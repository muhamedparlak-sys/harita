/* Karttaki "hareket" ve "olay" alanlarından haritaya otomatik animasyon kurar.
   Telefon ve masaüstü stüdyo ortak kullanır. Gemi rotaları haritadaki denizden geçer (A* yol bulma).

   hareket: Nusret [kızıl, küçük gemi] Nara Burnu → Erenköy Koyu; Bouvet [lacivert, büyük gemi] Kumkale açığı → Erenköy Koyu
   olay:    patlama Erenköy Koyu; büyük patlama Kilitbahir; atış Kilitbahir → Erenköy Koyu; batış Bouvet;
            vurgu Erenköy Koyu; bayrak tr Seddülbahir; mayın Kepez → Erenköy Koyu
*/
"use strict";
(function (kok) {
  const mY = la => Math.log(Math.tan(Math.PI / 4 + la * Math.PI / 360));
  const iY = y => (2 * Math.atan(Math.exp(y)) - Math.PI / 2) * 180 / Math.PI;
  const kucuk = s => (s || "").toLocaleLowerCase("tr-TR").trim();
  const TUR = { "büyük gemi": "big", "gemi": "big", "zırhlı": "big", "kruvazör": "big", "küçük gemi": "small", "mayın gemisi": "small", "tekne": "small", "muhrip": "small",
    "denizaltı": "sub", "kara": "dot", "birlik": "dot", "kişi": "dot", "kervan": "dot" };
  /* motorun ikonları (Türkçe adı → ikon anahtarı). Hareket türü olarak kullanılırsa ikon rota boyunca ilerler. */
  const IKON = { "at": "at", "atlı": "at", "süvari": "suvari", "asker": "asker", "piyade": "asker", "ordu": "ordu", "tank": "tank", "araba": "araba", "kamyon": "araba",
    "tren": "tren", "uçak": "ucak", "yelkenli": "yelkenli", "kalyon": "yelkenli", "kadırga": "yelkenli", "gemi ikonu": "gemi", "denizaltı ikonu": "denizalti",
    "kılıç": "kilic", "çatışma": "catisma", "savaş": "catisma", "kale": "kale", "kule": "kule", "çapa": "capa", "liman": "capa", "çadır": "cadir", "ordugâh": "cadir",
    "yangın": "yangin", "bayrak": "bayrak", "kalkan": "kalkan", "ölüm": "olum", "kayıp": "olum", "taç": "tac", "taht": "tac", "bomba": "bomba", "cami": "cami",
    "kilise": "kilise", "köprü": "kopru", "fabrika": "fabrika", "fener": "fener", "hedef": "hedef", "dağ": "dag", "nişan": "nisan", "madalya": "nisan" };
  const DENIZ_IKON = new Set(["yelkenli", "gemi", "denizalti"]);
  const TARAF = { "kızıl": "o", "kirmizi": "o", "kırmızı": "o", "lacivert": "i", "mavi": "i", "nötr": "", "notr": "" };
  const BAYRAK_AD = { "türk": "tr", "türkiye": "tr", "osmanlı": "osm", "ingiliz": "gb", "ingiltere": "gb", "britanya": "gb", "fransız": "fr", "fransa": "fr",
    "alman": "de", "almanya": "de", "rus": "ru", "rusya": "ru", "italyan": "it", "italya": "it", "yunan": "gr", "yunanistan": "gr", "amerikan": "us", "abd": "us",
    "avusturya": "at", "bulgar": "bg", "bulgaristan": "bg", "avustralya": "au", "yeni zelanda": "nz", "japon": "jp", "japonya": "jp", "ispanyol": "es", "ispanya": "es" };
  const ok = s => s.split(/\s*(?:→|->|=>|›|>)\s*/).map(x => x.trim()).filter(Boolean);

  function hareketCoz(t) {
    return (t || "").split(";").map(x => x.trim()).filter(Boolean).map(x => {
      const m = x.match(/^(.+?)\s*[\[(]([^\])]*)[\])]\s*(.+)$/); let ad, oz = "", yol;
      if (m) { ad = m[1].trim(); oz = kucuk(m[2]); yol = ok(m[3]); } else { const y = ok(x); const ilk = y[0].split(/\s+/); ad = ""; yol = y; }
      let taraf = "", tur = "big", ikon = null, bayrak = null;
      for (const p of oz.split(/[,;/]/).map(x => x.trim()).filter(Boolean)) {
        const b = p.match(/^bayrak\s+(.+)$/); if (b) { bayrak = BAYRAK_AD[b[1].trim()] || b[1].trim(); continue; }
        if (p in TARAF) taraf = TARAF[p]; else if (TUR[p]) tur = TUR[p]; else if (IKON[p]) { ikon = IKON[p]; tur = DENIZ_IKON.has(ikon) ? "small" : "dot"; }
        else { const k = Object.keys(TUR).find(k => p.includes(k)); if (k) tur = TUR[k]; } }
      return { ad, taraf, tur, ikon, bayrak, yol };
    }).filter(h => h.yol.length >= 2);
  }
  function olayCoz(t) {
    const O = [];
    for (let x of (t || "").split(";").map(x => x.trim()).filter(Boolean)) {
      const k = kucuk(x); let m;
      if ((m = x.match(/^büyük\s+patlama\s+(.+)$/i))) O.push({ tur: "patlama", yer: m[1].trim(), k: 2.2 });
      else if ((m = x.match(/^(patlama|infilak)\s+(.+)$/i))) O.push({ tur: "patlama", yer: m[2].trim(), k: 1 });
      else if ((m = x.match(/^ikon\s+(.+?)\s*(?:\[([^\]]*)\])?\s+(\S.*)$/i)) && IKON[kucuk(m[1])]) {
        let taraf = "", etiket = ""; for (const p of (m[2] || "").split(",").map(x => x.trim()).filter(Boolean)) { if (kucuk(p) in TARAF) taraf = TARAF[kucuk(p)]; else etiket = p; }
        O.push({ tur: "ikon", ikon: IKON[kucuk(m[1])], yer: m[3].trim(), taraf, etiket }); }
      else if ((m = x.match(/^(atış|ateş|bombardıman|top atışı)\s+(.+)$/i))) { const y = ok(m[2]); O.push({ tur: "atis", yer: y[0], hedef: y[1] || null }); }
      else if ((m = x.match(/^(batış|batar|batırılır|batma)\s+(.+)$/i))) O.push({ tur: "batis", gemi: m[2].trim() });
      else if ((m = x.match(/^(vurgu|odak)\s+(.+)$/i))) O.push({ tur: "vurgu", yer: m[2].trim() });
      else if ((m = x.match(/^(mayın|mayın hattı)\s+(.+)$/i))) { const y = ok(m[2]); O.push({ tur: "mayin", yer: y[0], hedef: y[1] || null }); }
      else if ((m = x.match(/^bayrak\s+(\S+)\s+(.+)$/i))) { const kod = BAYRAK_AD[kucuk(m[1])] || kucuk(m[1]); O.push({ tur: "bayrak", kod, yer: m[2].trim() }); }
      else if ((m = x.match(/^(\S+)\s+(.+)$/)) && IKON[kucuk(m[1])]) O.push({ tur: "ikon", ikon: IKON[kucuk(m[1])], yer: m[2].trim(), taraf: "", etiket: "" });
      else O.push({ tur: "?", ham: x });
    }
    return O;
  }

  /* ---------- denizden geçen yol (A*) ---------- */
  function izgara(H) {
    if (H._iz) return H._iz;
    const f = Math.max(1, Math.ceil(Math.max(H.W, H.H) / 420)), w = Math.ceil(H.W / f), h = Math.ceil(H.H / f), deniz = new Uint8Array(w * h);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { let s = 0, n = 0;
      for (let yy = y * f; yy < Math.min(H.H, (y + 1) * f); yy++) for (let xx = x * f; xx < Math.min(H.W, (x + 1) * f); xx++) { n++; if (H.V[yy * H.W + xx] < 128) s++; }
      deniz[y * w + x] = s * 2 > n ? 1 : 0; }
    /* kıyıya yakın hücreler pahalı: rota kıyıdan biraz açıkta gitsin */
    const ceza = new Float32Array(w * h);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { if (!deniz[y * w + x]) continue; let yakin = 0;
      for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) { const X = x + dx, Y = y + dy; if (X >= 0 && Y >= 0 && X < w && Y < h && !deniz[Y * w + X]) yakin = Math.max(yakin, 3 - Math.max(Math.abs(dx), Math.abs(dy))); }
      ceza[y * w + x] = yakin * 1.5; }
    return (H._iz = { f, w, h, deniz, ceza });
  }
  const px = (M, H, lo, la) => [(lo - M.lo0) / (M.lo1 - M.lo0) * H.W, (mY(M.la1) - mY(la)) / (mY(M.la1) - mY(M.la0)) * H.H];
  const geo = (M, H, x, y) => [+(M.lo0 + x / H.W * (M.lo1 - M.lo0)).toFixed(4), +iY(mY(M.la1) - y / H.H * (mY(M.la1) - mY(M.la0))).toFixed(4)];
  function enYakinDeniz(I, x, y) {
    x = Math.max(0, Math.min(I.w - 1, x)); y = Math.max(0, Math.min(I.h - 1, y)); if (I.deniz[y * I.w + x]) return [x, y];
    for (let r = 1; r < Math.max(I.w, I.h); r++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
      if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue; const X = x + dx, Y = y + dy; if (X >= 0 && Y >= 0 && X < I.w && Y < I.h && I.deniz[Y * I.w + X]) return [X, Y]; }
    return [x, y];
  }
  function astar(I, a, b) {
    const W = I.w, N = W * I.h, g = new Float32Array(N).fill(Infinity), geldi = new Int32Array(N).fill(-1), kapali = new Uint8Array(N);
    const s = a[1] * W + a[0], e = b[1] * W + b[0], hh = i => { const dx = Math.abs(i % W - b[0]), dy = Math.abs((i / W | 0) - b[1]); return Math.max(dx, dy) + .414 * Math.min(dx, dy); };
    const yig = [[hh(s), s]]; g[s] = 0;
    const it = (i, j) => { const tmp = yig[i]; yig[i] = yig[j]; yig[j] = tmp; };
    const ekle = v => { yig.push(v); let i = yig.length - 1; while (i > 0) { const p = (i - 1) >> 1; if (yig[p][0] <= yig[i][0]) break; it(i, p); i = p; } };
    const al = () => { const top = yig[0], son = yig.pop(); if (yig.length) { yig[0] = son; let i = 0; for (;;) { const l = 2 * i + 1, r = l + 1; let k = i; if (l < yig.length && yig[l][0] < yig[k][0]) k = l; if (r < yig.length && yig[r][0] < yig[k][0]) k = r; if (k === i) break; it(i, k); i = k; } } return top; };
    let say = 0;
    while (yig.length) { const [, u] = al(); if (kapali[u]) continue; kapali[u] = 1; if (u === e) break; if (++say > 400000) break;
      const ux = u % W, uy = u / W | 0;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { if (!dx && !dy) continue; const X = ux + dx, Y = uy + dy; if (X < 0 || Y < 0 || X >= W || Y >= I.h) continue;
        const v = Y * W + X; if (!I.deniz[v] || kapali[v]) continue; if (dx && dy && (!I.deniz[uy * W + X] || !I.deniz[Y * W + ux])) continue;
        const ng = g[u] + (dx && dy ? 1.414 : 1) + I.ceza[v]; if (ng < g[v]) { g[v] = ng; geldi[v] = u; ekle([ng + hh(v), v]); } } }
    if (geldi[e] < 0 && s !== e) return null;
    const P = []; for (let v = e; v >= 0; v = geldi[v]) { P.push([v % W, v / W | 0]); if (v === s) break; } return P.reverse();
  }
  function gorur(I, a, b) { const n = Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) * 2) + 1;
    for (let k = 0; k <= n; k++) { const x = Math.round(a[0] + (b[0] - a[0]) * k / n), y = Math.round(a[1] + (b[1] - a[1]) * k / n); if (!I.deniz[y * I.w + x] || I.ceza[y * I.w + x] > 2) return false; } return true; }
  function sadelestir(I, P) { if (P.length < 3) return P; const S = [P[0]]; let i = 0;
    while (i < P.length - 1) { let j = P.length - 1; while (j > i + 1 && !gorur(I, P[i], P[j])) j--; S.push(P[j]); i = j; } return S; }
  function denizYolu(M, H, A) {
    const I = izgara(H), out = [];
    for (let k = 0; k + 1 < A.length; k++) {
      const a = px(M, H, ...A[k]), b = px(M, H, ...A[k + 1]);
      const ga = enYakinDeniz(I, Math.floor(a[0] / I.f), Math.floor(a[1] / I.f)), gb = enYakinDeniz(I, Math.floor(b[0] / I.f), Math.floor(b[1] / I.f));
      const P = astar(I, ga, gb); if (!P) return null;
      const S = sadelestir(I, P).map(([x, y]) => [(x + .5) * I.f, (y + .5) * I.f]);
      /* uç noktalar ince haritada karadaysa komşu noktaya doğru denize kaydır */
      const denizMi = ([x, y]) => { const X = Math.round(x), Y = Math.round(y); return X < 0 || Y < 0 || X >= H.W || Y >= H.H || H.V[Y * H.W + X] < 128; };
      for (const [u, v] of [[0, 1], [S.length - 1, S.length - 2]]) { if (v < 0 || v >= S.length) continue;
        for (let t = 0; t < 12 && !denizMi(S[u]); t++) S[u] = [S[u][0] + (S[v][0] - S[u][0]) * .12, S[u][1] + (S[v][1] - S[u][1]) * .12]; }
      const G = S.map(([x, y]) => geo(M, H, x, y));
      out.push(...(k ? G.slice(1) : G));
    }
    return out;
  }

  /* ---------- kurulum ---------- */
  /* st: sahne; s: {hareket, olay}; c: {yerBul(ad)->[lo,la]|null, harita(ad)->{V,W,H}, kat: katalog, bayraklar: [...], log} */
  async function kur(st, s, c) {
    const log = c.log || (() => { }), M = c.kat[st.map], H = M ? await c.harita(st.map) : null, yer = {}, eklendi = [];
    const bul = async ad => { const k = kucuk(ad); if (k in yer) return yer[k];
      const p = (st.pts || []).find(p => kucuk(p[2]) === k); if (p) return (yer[k] = [p[0], p[1]]);
      let r = null; try { r = await c.yerBul(ad); } catch (e) { } if (!r) log(`  bulunamadı: ${ad}`); return (yer[k] = r); };
    const H_ = hareketCoz(s.hareket), O = olayCoz(s.olay), n = H_.length;
    st.ships = st.ships || [];
    for (const [j, h] of H_.entries()) {
      const A = []; for (const y of h.yol) { const p = await bul(y); if (p) A.push(p); } if (A.length < 2) { log(`  rota kurulamadı: ${h.ad || h.yol.join(" → ")}`); continue; }
      let P = A, notu = "";
      if (h.tur !== "dot" && !(h.ikon && !DENIZ_IKON.has(h.ikon)) && M && H) { const D = denizYolu(M, H, A); if (D && D.length >= 2) { P = D; notu = " (denizden)"; } else notu = " (düz; deniz yolu bulunamadı)"; }
      const t0 = +(.04 + j * .08).toFixed(2), t1 = +Math.min(.85, .55 + j * .08).toFixed(2);
      const sh = { n: h.ad, s: h.taraf, k: h.tur, p: P, t: [t0, t1] }; if (h.ad) sh.lab = [0, -14, "middle"]; if (h.tur === "dot") sh.kara = true;
      if (h.ikon) { sh.ikon = h.ikon; if (h.ad) sh.lab = [0, -22, "middle"]; } if (h.bayrak && (c.bayraklar || []).includes(h.bayrak)) sh.bayrak = h.bayrak;
      if (st.ships.some(x => x.n && x.n === h.ad)) st.ships = st.ships.filter(x => x.n !== h.ad);
      st.ships.push(sh); eklendi.push(`rota ${h.ad || ""}${notu}`);
    }
    const sonT = n ? Math.min(.9, .6 + (n - 1) * .08) : .3;
    for (const [j, o] of O.entries()) {
      const t = +Math.min(.92, sonT + .04 + j * .05).toFixed(2);
      if (o.tur === "patlama") { const p = await bul(o.yer); if (p) { (st.booms = st.booms || []).push([p[0], p[1], t, o.k]); eklendi.push(o.k > 1 ? "büyük patlama" : "patlama"); } }
      else if (o.tur === "atis") { const a = await bul(o.yer), b = o.hedef ? await bul(o.hedef) : null; if (a && b) { const t0 = +Math.max(.1, t - .25).toFixed(2); (st.shots = st.shots || []).push([a[0], a[1], b[0], b[1], t0, +Math.min(1, t0 + .15).toFixed(2)]); eklendi.push("atış"); } }
      else if (o.tur === "batis") { const g = st.ships.find(x => kucuk(x.n) === kucuk(o.gemi));
        if (g) { g.sink = +Math.min(.95, Math.max(t, (g.t || [0, .6])[1] + .02)).toFixed(2); (st.booms = st.booms || []).push([...g.p[g.p.length - 1], +(g.sink - .03).toFixed(2), 1.4]); eklendi.push(`batış ${g.n}`); }
        else log(`  batış: “${o.gemi}” bu sahnenin hareketlerinde yok`); }
      else if (o.tur === "vurgu") { const p = await bul(o.yer); if (p) { (st.vurgu = st.vurgu || []).push([p[0], p[1], 3, +Math.max(.2, t - .3).toFixed(2), +Math.min(1, t + .25).toFixed(2), "", 3]); eklendi.push("vurgu"); } }
      else if (o.tur === "bayrak") { const p = await bul(o.yer); if (p) { const kod = (c.bayraklar || []).includes(o.kod) ? o.kod : null; if (kod) { (st.bayrak = st.bayrak || []).push([p[0], p[1], kod, +(.12 + j * .04).toFixed(2)]); eklendi.push(`bayrak ${kod}`); } else log(`  bilinmeyen bayrak: ${o.kod}`); } }
      else if (o.tur === "ikon") { const p = await bul(o.yer); if (p) { const v = [p[0], p[1], o.ikon, o.taraf, 1, +(.1 + j * .06).toFixed(2), 1]; if (o.etiket) v.push(o.etiket); (st.ikon = st.ikon || []).push(v); eklendi.push(`ikon ${o.ikon}`); } }
      else if (o.tur === "mayin") { const a = await bul(o.yer), b = o.hedef ? await bul(o.hedef) : null;
        if (a && b) { const k = 26, R = []; for (let i = 0; i < k; i++) R.push([+(a[0] + (b[0] - a[0]) * i / (k - 1)).toFixed(4), +(a[1] + (b[1] - a[1]) * i / (k - 1)).toFixed(4)]); (st.mines = st.mines || []).push(R); eklendi.push("mayın hattı"); } }
      else log(`  anlaşılmayan olay: ${o.ham}`);
    }
    /* kamera rotaları ve olayları da kapsasın */
    const T = [...(st.pts || []).map(p => [p[0], p[1]])]; for (const sh of st.ships) for (const p of sh.p || []) T.push(p);
    for (const b of st.booms || []) T.push([b[0], b[1]]);
    if (T.length && M && (H_.length || O.length)) { const los = T.map(p => p[0]), las = T.map(p => p[1]), lo0 = Math.min(...los), lo1 = Math.max(...los), la0 = Math.min(...las), la1 = Math.max(...las);
      st.cam = { lo: +((lo0 + lo1) / 2).toFixed(4), la: +((la0 + la1) / 2).toFixed(4), w: +Math.min(M.lo1 - M.lo0, Math.max((lo1 - lo0) * 1.5, (la1 - la0) * 2.2, (M.lo1 - M.lo0) * .12, .05)).toFixed(3) }; }
    return eklendi;
  }
  kok.OTOMATIK = { kur, hareketCoz, olayCoz, denizYolu, IKON };
})(typeof window !== "undefined" ? window : globalThis);
