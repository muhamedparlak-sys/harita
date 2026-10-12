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
    "kilise": "kilise", "köprü": "kopru", "fabrika": "fabrika", "fener": "fener", "hedef": "hedef", "dağ": "dag", "nişan": "nisan", "madalya": "nisan",
    "hoparlör": "hoparlor", "megafon": "hoparlor", "telsiz": "telsiz", "uydu": "uydu", "yel değirmeni": "degirmen", "değirmen": "degirmen", "rüzgâr türbini": "turbin", "rüzgar türbini": "turbin", "türbin": "turbin",
    "saray": "saray", "ev": "ev", "köy": "koy", "şehir": "sehir", "kent": "sehir", "kasaba": "koy", "ambar": "ambar", "çiftlik": "ambar", "silo": "silo", "okul": "okul", "hastane": "hastane", "kızılay": "kizilay", "hilal-i ahmer": "kizilay", "hilali ahmer": "kizilay", "ters hilal": "kizilay", "kızılhaç": "kizilhac", "kızıl haç": "kizilhac",
    "banka": "banka", "anıt": "anit", "sütun": "anit", "kapı": "kapi", "çan": "can", "orman": "orman", "ağaç": "agac", "ada": "ada", "su": "su", "kuyu": "su", "pınar": "su", "balık": "balik",
    "havaalanı": "havaalani", "havalimanı": "havaalani", "radar": "radar", "dürbün": "durbun", "gözetleme": "durbun", "gözcü": "durbun", "maden": "maden", "petrol": "petrol",
    "mezar": "mezar", "sağlık": "saglik", "yaralı": "saglik", "anlaşma": "anlasma", "barış": "anlasma", "belge": "belge", "antlaşma": "belge", "emir": "belge",
    "helikopter": "helikopter", "paraşüt": "parasut", "füze": "fuze", "roket": "fuze", "vapur": "vapur", "feribot": "vapur" };
  /* metnin başındaki en uzun ikon adını bulur: "yel değirmeni [kızıl] Bozcaada" → ["degirmen", "[kızıl] Bozcaada"] */
  function ikonBas(x) { const k = kucuk(x).replace(/â/g, "a"); let en = null;
    for (const a of Object.keys(IKON)) { const a2 = a.replace(/â/g, "a"); if (k.startsWith(a2) && (k.length === a2.length || /[\s\[(]/.test(k[a2.length])) && (!en || a2.length > en.length)) en = a2; }
    if (!en) return null; const key = Object.keys(IKON).find(a => a.replace(/â/g, "a") === en); return [IKON[key], x.trim().slice(en.length).trim()]; }
  const DENIZ_IKON = new Set(["yelkenli", "gemi", "denizalti", "vapur"]);
  const TARAF = { "kızıl": "o", "kirmizi": "o", "kırmızı": "o", "lacivert": "i", "mavi": "i", "sarı": "y", "sari": "y", "turuncu": "y", "nötr": "", "notr": "" };
  const BAYRAK_AD = { "türk": "tr", "türkiye": "tr", "osmanlı": "osm", "ingiliz": "gb", "ingiltere": "gb", "britanya": "gb", "fransız": "fr", "fransa": "fr",
    "alman": "de", "almanya": "de", "rus": "ru", "rusya": "ru", "italyan": "it", "italya": "it", "yunan": "gr", "yunanistan": "gr", "amerikan": "us", "abd": "us",
    "avusturya": "at", "bulgar": "bg", "bulgaristan": "bg", "avustralya": "au", "yeni zelanda": "nz", "japon": "jp", "japonya": "jp", "ispanyol": "es", "ispanya": "es" };
  /* sondaki "(26)" ya da "(26 mayın)" sayısını koordinattan ayırır */
  const sayiAyir = t => { const m = t.match(/\s*\((\d+)(?:\s*mayın)?\)\s*$/i); return m ? { g: t.slice(0, m.index), n: +m[1] } : { g: t, n: 0 }; };
  const ok = s => s.split(/\s*(?:→|->|=>|›|>)\s*/).map(x => x.trim()).filter(Boolean);
  /* koordinat: "Kabatepe (40.20, 26.27)", "~40.2, 26.3", "40°12′K 26°16′D", "40.20N 26.27E" → {ad, p:[boylam, enlem], yaklasik}
     sıra enlem, boylam (Google Haritalar gibi); K/N/G/S ve D/E/B/W harfleri varsa onlara uyulur */
  function koordCoz(t) {
    t = (t || "").trim(); if (!/\d/.test(t)) return null;
    const yaklasik = /~|≈|yaklaşık|yakl\./i.test(t);
    const m = t.match(/^(.*?)[\s(\[]*((?:~|≈|yaklaşık|yakl\.)?\s*-?\d[\d.°′'"″ºKNGSDEBWkngsdebw\s,;/-]*?\d\s*[°′'"″º]?\s*[KNGSDEBW]?)\s*[)\]]?\s*$/);
    if (!m) return null;
    const ad = m[1].replace(/[\s(\[:–—-]+$/, "").trim(), govde = m[2].replace(/~|≈|yaklaşık|yakl\./gi, "").trim();
    /* iki parçaya böl: virgül/noktalı virgül/eğik çizgi ya da harf sonrası boşluk */
    let P = govde.split(/\s*[;,/]\s*|(?<=[KNGSDEBWkngsdebw])\s+/).filter(Boolean);
    if (P.length !== 2) { const q = govde.split(/\s+/).filter(Boolean); if (q.length === 2) P = q; else return null; }
    const sayi = x => { const h = (x.match(/[KNGSDEBW]$/i) || [""])[0].toUpperCase(), n = x.replace(/[KNGSDEBW]$/i, "").match(/-?\d+(?:\.\d+)?/g); if (!n) return null;
      let v = Math.abs(+n[0]) + (n[1] ? +n[1] / 60 : 0) + (n[2] ? +n[2] / 3600 : 0); if (/^-/.test(x.trim()) || h === "S" || h === "G" || h === "W" || h === "B") v = -v; return { v, h }; };
    const A = sayi(P[0]), B = sayi(P[1]); if (!A || !B) return null;
    let la = A.v, lo = B.v; if ("DEBW".includes(A.h) && A.h || "KNGS".includes(B.h) && B.h) { la = B.v; lo = A.v; }
    if (Math.abs(la) > 90 && Math.abs(lo) <= 90) [la, lo] = [lo, la];
    if (Math.abs(la) > 90 || Math.abs(lo) > 180) return null;
    return { ad, p: [+lo.toFixed(5), +la.toFixed(5)], yaklasik };
  }

  function hareketCoz(t) {
    return (t || "").split(";").map(x => x.trim()).filter(Boolean).map(x => {
      const m = x.match(/^(.+?)\s*[\[(]([^\])]*)[\])]\s*(.+)$/); let ad, oz = "", yol;
      if (m) { ad = m[1].trim(); oz = kucuk(m[2]); yol = ok(m[3]); } else { yol = ok(x); ad = ""; if (yol.length < 2) return { yol: [] }; }
      let taraf = "", tur = "big", ikon = null, bayrak = null;
      for (const p of oz.split(/[,;/]/).map(x => x.trim()).filter(Boolean)) {
        const b = p.match(/^bayrak\s+(.+)$/); if (b) { bayrak = BAYRAK_AD[b[1].trim()] || b[1].trim(); continue; }
        if (p in TARAF) taraf = TARAF[p]; else if (TUR[p]) tur = TUR[p]; else if (IKON[p]) { ikon = IKON[p]; tur = DENIZ_IKON.has(ikon) ? "small" : "dot"; }
        else { const k = Object.keys(TUR).find(k => p.includes(k)); if (k) tur = TUR[k]; } }
      /* filo: "Fransız hattı: Suffren, Bouvet, Gaulois [..] A → B" → aynı rotada yan yana (hat hâlinde) giden gemiler */
      const fm = ad.match(/^(.+?)\s*:\s*(.+)$/);
      if (fm) { const adlar = fm[2].split(/\s*,\s*/).filter(Boolean); return adlar.map((a, i) => ({ ad: a, taraf, tur, ikon, bayrak, yol, grup: { ad: fm[1].trim(), i, n: adlar.length } })); }
      return [{ ad, taraf, tur, ikon, bayrak, yol }];
    }).flat().filter(h => h.yol.length >= 1);
  }
  const dizi = (a, b, n) => { const R = []; n = Math.max(2, n || 12); for (let i = 0; i < n; i++) R.push([+(a[0] + (b[0] - a[0]) * i / (n - 1)).toFixed(4), +(a[1] + (b[1] - a[1]) * i / (n - 1)).toFixed(4)]); return R; };
  function olayCoz(t) {
    const O = [];
    for (let x of (t || "").split(";").map(x => x.trim()).filter(Boolean)) {
      const k = kucuk(x); let m;
      if ((m = x.match(/^(çekilir|ayrılır|haritadan çıkar|kaybolur)\s+(.+)$/i))) { for (const g of m[2].split(/\s*,\s*/).filter(Boolean)) O.push({ tur: "cekil", gemi: g.trim() }); }
      else if ((m = x.match(/^büyük\s+patlama\s+(.+)$/i))) O.push({ tur: "patlama", yer: m[1].trim(), k: 2.2 });
      else if ((m = x.match(/^(patlama|infilak)\s+(.+)$/i))) O.push({ tur: "patlama", yer: m[2].trim(), k: 1 });
      else if ((m = x.match(/^(yıldırım|şimşek)\s+(.+)$/i))) O.push({ tur: "simsek", yer: m[2].trim() });
      else if ((m = x.match(/^(torpido|torpil)\s+(.+)$/i))) { const y = ok(m[2]); O.push({ tur: "torpido", yer: y[0], hedef: y[1] || null }); }
      else if ((m = x.match(/^(işaret lambası|işaret|sinyal|parola)\s+(.+)$/i))) O.push({ tur: "isaret", yer: m[2].trim() });
      else if ((m = x.match(/^(ışıldak|projektör|projektor|selektör|selektor)\s+(.+)$/i))) { const y = ok(m[2]); O.push({ tur: "isildak", yer: y[0], hedef: y[1] || null }); }
      else if ((m = x.match(/^(anons|hoparlör|seslenir|seslenme|çağrı|konuşma|haykırır)\s+(.+)$/i))) O.push({ tur: "anons", yer: m[2].trim() });
      else if ((m = x.match(/^(.+?)\s+(batar|batıyor|batırılır|batırıldı|battı|batmaya başlar)$/i))) O.push({ tur: "batis", gemi: m[1].trim() });
      else if ((m = x.match(/^ikon\s+(.+)$/i)) && ikonBas(m[1]) && (m = [m[0], ...ikonBas(m[1])]) && (m = [m[0], m[1], ...(m[2].match(/^(?:[\[(]([^\])]*)[\])])?\s*(.+)$/) || []).slice(1)]) && m[3]) {
        let taraf = "", etiket = ""; for (const p of (m[2] || "").split(",").map(x => x.trim()).filter(Boolean)) { if (kucuk(p) in TARAF) taraf = TARAF[kucuk(p)]; else etiket = p; }
        O.push({ tur: "ikon", ikon: m[1], yer: m[3].trim(), taraf, etiket }); }
      else if ((m = x.match(/^(atış|ateş|bombardıman|top atışı|topçu ateşi)\s+(.+)$/i))) { const y = ok(m[2]); O.push({ tur: "atis", yer: y[0], hedef: y[1] || null, salvo: /bombardıman|topçu/i.test(m[1]) ? 3 : 1 }); }
      else if ((m = x.match(/^(batış|batar|batırılır|batma|batan)\s*:?\s+(.+)$/i))) O.push({ tur: "batis", gemi: m[2].trim() });
      else if ((m = x.match(/^(vurgu|odak)\s+(.+)$/i))) O.push({ tur: "vurgu", yer: m[2].trim() });
      else if ((m = x.match(/^mayın\s+(döşer|döker|döşenir|serer|bırakır)\s+(.+)$/i))) { const { g, n } = sayiAyir(m[2]); const y = ok(g);
        const mm = y[0] && y[0].match(/^(\S+)\s+(.+)$/); /* "Nusret A → B": ilk sözcük(ler) gemi, gerisi başlangıç */
        if (y.length >= 2 && mm) O.push({ tur: "doser", gemi: mm[1], yer: mm[2], hedef: y[1], n: n || 26 }); else O.push({ tur: "?", ham: x }); }
      else if ((m = x.match(/^mayın\s+hatları\s+(\d+)\s*:?\s*(.+?)\s*\/\s*(.+)$/i))) { const a1 = ok(m[2]), b1 = ok(m[3]); O.push({ tur: "hatlar", n: +m[1], a: a1, b: b1 }); }
      else if ((m = x.match(/^(mayın|mayın hattı)\s+(.+)$/i))) { const { g, n } = sayiAyir(m[2]); const y = ok(g); O.push({ tur: "mayin", yer: y[0], hedef: y[1] || null, n: n || 12 }); }
      else if ((m = x.match(/^bayrak\s+(\S+)\s+(.+)$/i))) { const kod = BAYRAK_AD[kucuk(m[1])] || kucuk(m[1]); O.push({ tur: "bayrak", kod, yer: m[2].trim() }); }
      else if ((m = ikonBas(x)) && m[1] && !/^[\[(]/.test(m[1])) O.push({ tur: "ikon", ikon: m[0], yer: m[1], taraf: "", etiket: "" });
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
  /* ince haritada en yakın deniz pikseli (gemiler karaya oturmasın) */
  function denizeIt(M, H, p) {
    const [x0, y0] = px(M, H, ...p), X = Math.round(x0), Y = Math.round(y0), deniz = (x, y) => x >= 0 && y >= 0 && x < H.W && y < H.H && H.V[y * H.W + x] < 128;
    if (X < 0 || Y < 0 || X >= H.W || Y >= H.H || deniz(X, Y)) return p;
    for (let r = 2; r < 260; r += 2) for (let k = 0; k < 24; k++) { const a = k / 24 * 2 * Math.PI, x = Math.round(X + r * Math.cos(a)), y = Math.round(Y + r * Math.sin(a));
      if (deniz(x, y)) { /* kıyıdan biraz açığa */ const x2 = Math.round(X + (r + 6) * Math.cos(a)), y2 = Math.round(Y + (r + 6) * Math.sin(a)); return deniz(x2, y2) ? geo(M, H, x2, y2) : geo(M, H, x, y); } }
    return p;
  }
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
  const sade = x => kucuk(x).replace(/[^\p{L}\p{N} ]/gu, " ").replace(/\b(zırhlısı|zırhlı|gemisi|gemi|muhribi|muhrip|denizaltısı|botu|bot)\b/g, "").replace(/\s+/g, " ").trim();
  const esle = (a, b) => { a = sade(a); b = sade(b); return !!a && !!b && (a === b || a.includes(b) || b.includes(a)); };
  const denizNokta = (M, H, p) => { const [x, y] = px(M, H, ...p), X = Math.round(x), Y = Math.round(y); return X < 0 || Y < 0 || X >= H.W || Y >= H.H || H.V[Y * H.W + X] < 128; };
  /* rotayı yumuşat (Chaikin); gemi rotası karaya değerse son güvenli hâlde kalır */
  function yumusat(P, M, H, denizde) { if (P.length < 3) return P; let Q = P;
    for (let it = 0; it < 3; it++) { const R = [Q[0]]; for (let k = 0; k + 1 < Q.length; k++) { const a = Q[k], b = Q[k + 1]; R.push([a[0] * .75 + b[0] * .25, a[1] * .75 + b[1] * .25], [a[0] * .25 + b[0] * .75, a[1] * .25 + b[1] * .75]); } R.push(Q[Q.length - 1]);
      if (denizde && M && H && R.some(p => !denizNokta(M, H, p))) break; Q = R; }
    return Q.map(p => [+p[0].toFixed(4), +p[1].toFixed(4)]); }
  const SURE = { cekil: 0, doser: .02, hatlar: .02, torpido: .16, atis: .12, patlama: .06, batis: .16, isaret: .22, anons: .26, isildak: .08, vurgu: .1, simsek: .06, ikon: .04, bayrak: .04, mayin: .04 };
  const yakin = (a, b, M) => Math.hypot(a[0] - b[0], a[1] - b[1]) < Math.max(.006, (M ? (M.lo1 - M.lo0) : 1) * .04);

  /* st: sahne; s: {hareket, olay}; c: {yerBul(ad)->[lo,la]|null, harita(ad)->{V,W,H}, kat, bayraklar, log, aktorler: Map (sahneler arası durum)} */
  const mesafe = (a, b) => Math.hypot((a[0] - b[0]) * Math.cos(a[1] * Math.PI / 180), a[1] - b[1]);
  /* yolun sonunu diğer aktörlerden en az D uzakta bitirir (yaklaşma), tek noktalıysa yana kaydırır */
  function uzakTut(P, D_, D, M, H) {
    const yakinMi = q => D_.some(o => mesafe(q, o) < D * .98);
    if (!D_.length || !yakinMi(P[P.length - 1])) return P;
    if (P.length >= 2) {
      const Q = P.map(p => p.slice());
      while (Q.length >= 2 && yakinMi(Q[Q.length - 1])) {
        const a = Q[Q.length - 2], b = Q[Q.length - 1];
        if (!yakinMi(a)) { let lo = 0, hi = 1; for (let i = 0; i < 20; i++) { const m = (lo + hi) / 2, q = [a[0] + (b[0] - a[0]) * m, a[1] + (b[1] - a[1]) * m]; yakinMi(q) ? hi = m : lo = m; }
          Q[Q.length - 1] = [+(a[0] + (b[0] - a[0]) * lo).toFixed(4), +(a[1] + (b[1] - a[1]) * lo).toFixed(4)]; return Q; }
        Q.pop();
      }
      if (Q.length >= 2) return Q;
    }
    /* tek nokta ya da yolun tamamı yakında: denizde boş bir yan nokta ara */
    const o = P[P.length - 1];
    for (const r of [1, 1.4, 1.9]) for (let k = 0; k < 12; k++) { const u = Math.PI / 2 + k * Math.PI / 6, q = [o[0] + Math.cos(u) * D * r / Math.cos(o[1] * Math.PI / 180), o[1] + Math.sin(u) * D * r];
      const qq = H ? denizeIt(M, H, q) : q; if (!yakinMi(qq)) return P.length >= 2 ? [...P.slice(0, -1), qq] : [qq]; }
    return P;
  }
  /* iki nokta arasındaki düz çizgi karadan geçiyor mu (uçlardaki kıyı payı hariç) */
  function karaVar(M, H, a, b) { if (!M || !H) return false; const A = px(M, H, ...a), B = px(M, H, ...b), n = Math.ceil(Math.hypot(B[0] - A[0], B[1] - A[1])); let dizi = 0;
    for (let k = 0; k <= n; k++) { const f = k / Math.max(1, n); if (f < .08 || f > .92) continue; const x = Math.round(A[0] + (B[0] - A[0]) * f), y = Math.round(A[1] + (B[1] - A[1]) * f);
      if (x >= 0 && y >= 0 && x < H.W && y < H.H && H.V[y * H.W + x] >= 128) { if (++dizi > 3) return true; } else dizi = 0; }
    return false; }
  const YONLER = { kuzey: [0, 1], güney: [0, -1], doğu: [1, 0], batı: [-1, 0], kuzeydoğu: [1, 1], kuzeybatı: [-1, 1], güneydoğu: [1, -1], güneybatı: [-1, -1] };
  const yonCoz = y => { const m = kucuk(y).match(/^(kuzeydoğu|kuzeybatı|güneydoğu|güneybatı|kuzey|güney|doğu|batı)(dan|den|ya|ye|a|e)?(\s+kenarı(ndan)?)?$/); return m ? YONLER[m[1]] : null; };
  /* haritanın kenarında, N noktasından v yönünde giden çizginin çıktığı yer (biraz içeride) */
  function kenar(M, N, v) { const c = Math.cos(N[1] * Math.PI / 180), dx = v[0] / c, dy = v[1], pw = (M.lo1 - M.lo0) * .03, ph = (M.la1 - M.la0) * .03;
    let t = Infinity; if (dx > 0) t = Math.min(t, (M.lo1 - pw - N[0]) / dx); if (dx < 0) t = Math.min(t, (M.lo0 + pw - N[0]) / dx); if (dy > 0) t = Math.min(t, (M.la1 - ph - N[1]) / dy); if (dy < 0) t = Math.min(t, (M.la0 + ph - N[1]) / dy);
    if (!isFinite(t) || t < 0) t = 0; return [+(N[0] + dx * t).toFixed(4), +(N[1] + dy * t).toFixed(4)]; }
  async function kur(st, s, c) {
    const log = c.log || (() => { }), yer = {}, eklendi = [];
    const AK = c.aktorler || (c.aktorler = new Map());
    const aktorBul = ad => { for (const sh of st.ships || []) if (sh.n && esle(sh.n, ad)) return { p: sh.p[sh.p.length - 1], sh }; for (const [n, a] of AK) if (esle(n, ad)) return { p: a.p, a, n }; return null; };
    const bul = async (ad, sessiz) => { const kc = koordCoz(ad); if (kc) { if (kc.ad) yer[kucuk(kc.ad)] = kc.p; return kc.p; } const k = kucuk(ad); if (k in yer) return yer[k];
      const ak = aktorBul(ad); if (ak) return (yer[k] = ak.p);
      const p = (st.pts || []).find(p => kucuk(p[2]) === k); if (p) return (yer[k] = [p[0], p[1]]);
      let r = null; try { r = await c.yerBul(ad); } catch (e) { } if (!r && !sessiz) log(`  bulunamadı: ${ad}`); return (yer[k] = r); };
    const H_ = hareketCoz(s.hareket), O = olayCoz(s.olay);
    /* mayınlar kalıcıdır: önceki sahnelerde konan ya da döşenen hatlar bu sahnede de durur */
    const MY = c.mayinlar || (c.mayinlar = []);
    if (MY.length || O.some(o => ["mayin", "hatlar", "doser"].includes(o.tur))) { st.mines = MY.map(R => R.map(p => [...p])); delete st.nus; }
    /* 0) harita: hikâyenin haritalarından, sahnenin bütün noktalarını (yer, rota, olay, duran aktörler) en iyi kapsayan en dar olan */
    if ((c.haritalar || []).length > 1) {
      const T = (st.pts || []).map(p => [p[0], p[1]]);
      for (const h of H_) for (const y of h.yol) if (!yonCoz(y)) { const p = await bul(y, true); if (p) T.push(p); }
      for (const o of O) for (const k of ["yer", "hedef", "gemi"]) if (o[k]) { const p = await bul(o[k], true); if (p) T.push(p); }
      for (const [n, a] of AK) if (!a.batti) T.push(a.p);
      const ic = (m, p) => p[0] >= m.lo0 && p[0] <= m.lo1 && p[1] >= m.la0 && p[1] <= m.la1;
      const U = c.haritalar.map(h => [h, c.kat[h]]).filter(([, m]) => m), T2 = T.filter(p => U.some(([, m]) => ic(m, p)));
      if (T2.length) { const say = m => T2.filter(p => ic(m, p)).length;
        const [en] = U.sort((a, b) => say(b[1]) - say(a[1]) || (a[1].lo1 - a[1].lo0) - (b[1].lo1 - b[1].lo0));
        if (en && en[0] !== st.map && (!c.kat[st.map] || say(c.kat[st.map]) < say(en[1]))) { st.map = en[0]; log(`  harita: ${en[0]} (sahnenin bütün noktalarını kapsıyor)`); } }
    }
    /* ön tarama önbelleği temizlenir: aktörlerin bu sahnedeki konumları aşağıda yeniden hesaplanır (yer araması kendi önbelleğini tutar) */
    for (const k of Object.keys(yer)) delete yer[k];
    const M = c.kat[st.map], H = M ? await c.harita(st.map) : null;
    st.ships = (st.ships || []).filter(x => !x.fix);
    /* "çekilir X": X bu sahneden itibaren haritada durmaz */
    for (const o of O) if (o.tur === "cekil") { let bulundu = false; for (const n of [...AK.keys()]) if (esle(n, o.gemi)) { AK.delete(n); bulundu = true; } if (bulundu) eklendi.push(`çekildi ${o.gemi}`); else log(`  çekilir: “${o.gemi}” daha önce haritada yoktu`); }
    /* 1) daha önceki sahnelerden kalan aktörler yerinde durur (bu sahnede hareket etmiyorlarsa) */
    for (const [n, a] of AK) { if (a.batti || H_.some(h => esle(h.ad, n))) continue; if (M && !(a.p[0] >= M.lo0 && a.p[0] <= M.lo1 && a.p[1] >= M.la0 && a.p[1] <= M.la1)) continue;
      const sh = { n, s: a.s, k: a.k, p: [a.p], t: [0, 1], fix: true }; if (!a.etiketsiz) sh.lab = [0, a.ikon ? -22 : -14, "middle"]; if (a.ln) sh.ln = a.ln; if (a.ikon) sh.ikon = a.ikon; if (a.bayrak) sh.bayrak = a.bayrak; if (a.k === "dot") sh.kara = true; st.ships.push(sh); }
    /* 2) hareketler */
    const yeni = [];
    const GRUP = {};
    const yanKaydir = (P, k) => { if (!M || P.length < 2) return P; const d = (M.lo1 - M.lo0) * .011 * k;
      return P.map((p, i) => { const a = P[Math.max(0, i - 1)], b = P[Math.min(P.length - 1, i + 1)], c0 = Math.cos(p[1] * Math.PI / 180);
        const dx = (b[0] - a[0]) * c0, dy = b[1] - a[1], L = Math.hypot(dx, dy) || 1; let q = [+(p[0] + (-dy / L) * d / c0).toFixed(4), +(p[1] + (dx / L) * d).toFixed(4)];
        if (H) q = denizeIt(M, H, q); return q; }); };
    for (const h of H_) {
      if (h.grup && h.grup.i > 0 && GRUP[h.grup.ad]) { const g = GRUP[h.grup.ad], P = yanKaydir(g.P, h.grup.i - (h.grup.n - 1) / 2);
        const sh = { n: h.ad, s: h.taraf, k: h.tur, p: P, t: [0, 1], _g: h.grup.ad };
        st.ships = st.ships.filter(x => !(x.n && esle(x.n, h.ad))); st.ships.push(sh); yeni.push(sh); eklendi.push(`rota ${h.ad} (${h.grup.ad} düzeninde)`); continue; }
      const once = h.ad ? aktorBul(h.ad) : null, A = [];
      /* harita dışındaki yer (Cattaro, İstanbul…) ya da yön (batıdan, kuzey kenarı): araç haritanın o yöndeki kenarından girer/çıkar */
      const Y = [];
      for (const y of h.yol) { const v = yonCoz(y); if (v) { Y.push({ v, ad: y }); continue; } const kc = koordCoz(y); if (kc && M && !(kc.p[0] >= M.lo0 && kc.p[0] <= M.lo1 && kc.p[1] >= M.la0 && kc.p[1] <= M.la1)) { Y.push({ d: kc.p, ad: kc.ad || y }); continue; } const p = await bul(y, true); if (p) { Y.push({ p }); continue; }
        const d = c.yerDis ? await c.yerDis(y).catch(() => null) : null; if (d) Y.push({ d, ad: y }); else log(`  bulunamadı: ${y}`); }
      for (let i = 0; i < Y.length; i++) { const o = Y[i]; if (o.p) continue; const N = (Y.slice(i + 1).find(x => x.p) || Y.slice(0, i).reverse().find(x => x.p) || {}).p || (once && once.p);
        if (!N || !M) { Y.splice(i--, 1); continue; }
        const v = o.v || [(o.d[0] - N[0]) * Math.cos(N[1] * Math.PI / 180), o.d[1] - N[1]];
        o.p = kenar(M, N, v); log(`  ${h.ad || "rota"}: ${o.ad} harita dışında; ${i === 0 ? "kenardan giriyor" : "kenardan çıkıyor"}`); }
      for (const { p } of Y) if (p && !(A.length && Math.hypot(A[A.length - 1][0] - p[0], A[A.length - 1][1] - p[1]) < 1e-4)) A.push(p);
      if (once && once.a) { if (!A.length || A.length === 1 && yakin(A[0], once.p, M)) A.splice(0, A.length, once.p); else if (yakin(A[0], once.p, M) || A.length >= 2) A[0] = once.p; }
      if (!A.length) { log(`  rota kurulamadı: ${h.ad || h.yol.join(" → ")} (yerler bulunamadı)`); continue; }
      const denizde = h.tur !== "dot" && !(h.ikon && !DENIZ_IKON.has(h.ikon)) && M && H;
      let P = A, notu = "";
      if (A.length === 1) { P = denizde ? [denizeIt(M, H, A[0])] : A; notu = " (yerinde)"; }
      else if (denizde) { const D = denizYolu(M, H, A); if (D && D.length >= 2) { P = yumusat(D, M, H, true); notu = " (denizden)"; } else { P = A.map(p => denizeIt(M, H, p)); notu = " (düz)"; } }
      else P = yumusat(A, M, H, false);
      /* başka bir aktörün üstüne binmesin: hedefte durmadan önce yanaşma mesafesinde durur */
      if (M && h.tur !== "dot") { const D = (M.lo1 - M.lo0) * .018, digerleri = st.ships.filter(x => x.p && !(x.n && h.ad && esle(x.n, h.ad))).map(x => x.p[x.p.length - 1]);
        P = uzakTut(P, digerleri, D, M, denizde ? H : null); }
      if (h.grup) { GRUP[h.grup.ad] = { P }; P = yanKaydir(P, -(h.grup.n - 1) / 2); }
      const sh = { n: h.ad, s: h.taraf, k: h.tur, p: P, t: [0, 1] }; if (h.ad) sh.lab = [0, -14, "middle"]; if (h.tur === "dot") sh.kara = true; if (h.grup) { sh._g = h.grup.ad; sh.ln = h.grup.ad; }
      if (once && once.a) { if (!h.taraf && once.a.s) sh.s = once.a.s; if (h.tur === "big" && once.a.k && !/\[/.test(s.hareket || "")) sh.k = once.a.k; if (!h.ikon && once.a.ikon) sh.ikon = once.a.ikon; if (!h.bayrak && once.a.bayrak) sh.bayrak = once.a.bayrak; }
      if (h.ikon) { sh.ikon = h.ikon; if (h.ad) sh.lab = [0, -22, "middle"]; } if (h.bayrak && (c.bayraklar || []).includes(h.bayrak)) sh.bayrak = h.bayrak;
      st.ships = st.ships.filter(x => !(x.n && h.ad && esle(x.n, h.ad))); st.ships.push(sh); yeni.push(sh); eklendi.push(`rota ${h.ad || ""}${notu}`);
    }
    /* 3) zamanlama: gelenler önce gelir, sonra olaylar sırayla olur, olay yerinden ayrılanlar en son çekilir */
    const olayYer = []; for (const o of O) if (!["bayrak", "ikon", "mayin", "hatlar", "doser", "cekil"].includes(o.tur)) { const p = o.tur === "batis" ? (aktorBul(o.gemi) || {}).p : await bul(o.yer); if (p) olayYer.push(p); }
    const gelen = [], ayrilan = [];
    for (const sh of yeni) { if (sh.p.length < 2) { sh.t = [0, 1]; continue; } (olayYer.some(p => yakin(p, sh.p[0], M)) && !olayYer.some(p => yakin(p, sh.p[sh.p.length - 1], M)) ? ayrilan : gelen).push(sh); }
    gelen.forEach((sh, j) => { sh.t = [+(.03 + j * .06).toFixed(2), +Math.min(.62, .48 + j * .05).toFixed(2)]; });
    let t = gelen.length ? Math.min(.66, .5 + gelen.length * .05) : (O.length ? .12 : .3);
    /* gemiden gemiye torpido/atış karayı aşamaz: atan gemi denizden dolaşıp hedefi açıkça gördüğü yere gelir, sonra atar */
    const mevziAl = async (ad, a, b, tt) => {
      if (!M || !H || !karaVar(M, H, a, b)) return null;
      const D = denizYolu(M, H, [a, b]); if (!D || D.length < 2) return null;
      const adim = (M.lo1 - M.lo0) * .004, Y = [D[0]];
      for (let k = 1; k < D.length; k++) { const p = D[k - 1], q = D[k], n = Math.max(1, Math.ceil(mesafe(p, q) / adim)); for (let j = 1; j <= n; j++) Y.push([p[0] + (q[0] - p[0]) * j / n, p[1] + (q[1] - p[1]) * j / n]); }
      const en = (M.lo1 - M.lo0) * .05; let i = -1;
      for (let k = Y.length - 1; k >= 0; k--) if (mesafe(Y[k], b) >= en && !karaVar(M, H, Y[k], b)) { i = k; break; }
      if (i < 0) for (let k = 0; k < Y.length; k++) if (!karaVar(M, H, Y[k], b)) { i = k; break; }
      if (i < 0) return null;
      const L = [+Y[i][0].toFixed(4), +Y[i][1].toFixed(4)], yol = [...D.filter((p, k) => k === 0 || mesafe(D[0], p) < mesafe(D[0], L)), L];
      yer[kucuk(ad)] = L;
      const sh = st.ships.find(x => x.n && esle(x.n, ad));
      if (!sh) return { p: L, t: tt };
      const P = yumusat(yol, M, H, true);
      if (sh.fix || (sh.p || []).length < 2) { delete sh.fix; sh.p = P; sh.t = [tt, +Math.min(.9, tt + .22).toFixed(2)]; }
      else sh.p = [...sh.p, ...P.slice(1)];
      log(`  ${sh.n}: hedef karanın ardında; denizden dolaşıp atış yerine geliyor`);
      return { p: L, t: +Math.min(.92, tt + .24).toFixed(2) };
    };
    const gemiMi = ad => { const x = st.ships.find(x => x.n && esle(x.n, ad)); return !!x && x.k !== "dot" && !x.kara; };
    /* 4) olaylar, kartta yazıldıkları sırayla */
    for (const [j, o] of O.entries()) {
      const tt0 = +Math.min(.9, t).toFixed(2), tt = tt0, sure = SURE[o.tur] || .05;
      if (o.tur === "patlama") { const p = await bul(o.yer); if (p) { (st.booms = st.booms || []).push([p[0], p[1], tt, o.k]); eklendi.push(o.k > 1 ? "büyük patlama" : "patlama"); } }
      else if (o.tur === "atis") { let a = await bul(o.yer), tt = tt0; const b = o.hedef ? await bul(o.hedef) : null;
        if (a && b && o.hedef && gemiMi(o.yer) && gemiMi(o.hedef)) { const y = await mevziAl(o.yer, a, b, tt); if (y) { a = y.p; t += y.t - tt; tt = y.t; } }
        if (a && b) { for (let k = 0; k < (o.salvo || 1); k++) { const t0 = +Math.min(.92, tt + k * .07).toFixed(2), t1 = +Math.min(.98, t0 + .09).toFixed(2), sap = k ? (k % 2 ? 1 : -1) * .0025 * k : 0;
            (st.shots = st.shots || []).push([a[0], a[1], b[0] + sap, b[1] - sap, t0, t1]); (st.booms = st.booms || []).push([a[0], a[1], t0, .45], [b[0] + sap, b[1] - sap, t1, 1.25]); }
          eklendi.push(o.salvo > 1 ? "bombardıman" : "atış"); t += (o.salvo - 1) * .07; } }
      else if (o.tur === "torpido") { let a = await bul(o.yer), tt = tt0; const b = o.hedef ? await bul(o.hedef) : null;
        if (a && b) { const y = await mevziAl(o.yer, a, b, tt); if (y) { a = y.p; t += y.t - tt; tt = y.t; }
          const n = (st.torpido || []).length, t1 = +Math.min(.95, tt + .13).toFixed(2), sap = n ? (n % 2 ? 1 : -1) * Math.ceil(n / 2) * .0012 : 0,
            dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy) || 1, B = [+(b[0] - dy / L * sap).toFixed(4), +(b[1] + dx / L * sap).toFixed(4)];
          (st.torpido = st.torpido || []).push([a[0], a[1], B[0], B[1], tt, t1]); (st.booms = st.booms || []).push([B[0], B[1], t1, 1.3]); eklendi.push("torpido"); } }
      else if (o.tur === "batis") { let g = st.ships.find(x => x.n && esle(x.n, o.gemi));
        if (!g) { const ak = aktorBul(o.gemi); if (ak && ak.a) { g = { n: ak.n, s: ak.a.s, k: ak.a.k, p: [ak.a.p], t: [0, 1], lab: [0, -14, "middle"] }; st.ships.push(g); } }
        if (g) { delete g.fix; g.sink = +Math.min(.95, Math.max(tt, (g.t || [0, .6])[1] > .99 ? tt : (g.t[1] + .02))).toFixed(2); (st.booms = st.booms || []).push([...g.p[g.p.length - 1], +Math.max(0, g.sink - .02).toFixed(2), 1.5]); eklendi.push(`batış ${g.n}`); }
        else log(`  batış: “${o.gemi}” haritada yok (önce bir hareket satırında geçmeli)`); }
      else if (o.tur === "vurgu") { const p = await bul(o.yer); if (p) { (st.vurgu = st.vurgu || []).push([p[0], p[1], 3, +Math.max(.05, tt - .05).toFixed(2), +Math.min(1, tt + .35).toFixed(2), "", 3]); eklendi.push("vurgu"); } }
      else if (o.tur === "bayrak") { const p = await bul(o.yer); if (p) { const kod = (c.bayraklar || []).includes(o.kod) ? o.kod : null; if (kod) { (st.bayrak = st.bayrak || []).push([p[0], p[1], kod, +(.08 + j * .04).toFixed(2)]); eklendi.push(`bayrak ${kod}`); } else log(`  bilinmeyen bayrak: ${o.kod}`); } }
      else if (o.tur === "simsek") { const p = await bul(o.yer); if (p) { (st.simsek = st.simsek || []).push([p[0], p[1], tt]); eklendi.push("yıldırım"); } }
      else if (o.tur === "ikon") { const p = await bul(o.yer); if (p) { const v = [p[0], p[1], o.ikon, o.taraf, 1, +(.06 + j * .05).toFixed(2), 1]; if (o.etiket) v.push(o.etiket); (st.ikon = st.ikon || []).push(v); eklendi.push(`ikon ${o.ikon}`); } }
      else if (o.tur === "isaret") { const p = await bul(o.yer); if (p) { (st.isaret = st.isaret || []).push([p[0], p[1], tt, +Math.min(1, tt + .25).toFixed(2)]); eklendi.push("işaret lambası"); } }
      else if (o.tur === "anons") { const p = await bul(o.yer); if (p) { (st.anons = st.anons || []).push([p[0], p[1], tt, +Math.min(1, tt + .3).toFixed(2)]); eklendi.push("anons"); } }
      else if (o.tur === "isildak") { const p = await bul(o.yer); if (p) { let yon = -90; const hd = o.hedef ? await bul(o.hedef) : (st.ships.find(x => x.p && Math.hypot(x.p[x.p.length - 1][0] - p[0], x.p[x.p.length - 1][1] - p[1]) > 1e-3) || {}).p;
          const q = Array.isArray(hd) && Array.isArray(hd[0]) ? hd[hd.length - 1] : hd; if (q) yon = Math.atan2(-(q[1] - p[1]), (q[0] - p[0]) * Math.cos(p[1] * Math.PI / 180)) * 180 / Math.PI;
          (st.isildak = st.isildak || []).push([p[0], p[1], Math.max(0, tt - .05), 1, +yon.toFixed(0)]); eklendi.push("ışıldak"); } }
      else if (o.tur === "mayin") { const a = await bul(o.yer), b = o.hedef ? await bul(o.hedef) : null;
        if (a && b) { const R = dizi(a, b, o.n); (st.mines = st.mines || []).push(R); MY.push(R); eklendi.push("mayın hattı"); } }
      else if (o.tur === "hatlar") { const A1 = await bul(o.a[0]), B1 = await bul(o.a[1] || ""), A2 = await bul(o.b[0]), B2 = await bul(o.b[1] || "");
        if (A1 && B1 && A2 && B2) { for (let i = 0; i < o.n; i++) { const u = o.n > 1 ? i / (o.n - 1) : 0, a = [A1[0] + (A2[0] - A1[0]) * u, A1[1] + (A2[1] - A1[1]) * u], b = [B1[0] + (B2[0] - B1[0]) * u, B1[1] + (B2[1] - B1[1]) * u];
            const R = dizi(a, b, 10); (st.mines = st.mines || []).push(R); MY.push(R); } eklendi.push(`${o.n} mayın hattı`); }
        else log("  mayın hatları: ilk ve son hattın iki ucu koordinatla yazılmalı (A → B / C → D)"); }
      else if (o.tur === "doser") { let gemi = o.gemi, bas = o.yer;
        /* "Nusret Nara Burnu" gibi yazımlarda gemi adını aktörlerden bul */
        const sh0 = st.ships.find(x => x.n && (esle(x.n, gemi) || kucuk(o.gemi + " " + o.yer).startsWith(kucuk(x.n)))); if (sh0 && !esle(sh0.n, gemi)) { bas = (o.gemi + " " + o.yer).slice(sh0.n.length).trim(); gemi = sh0.n; }
        const a = await bul(bas), b = await bul(o.hedef), g = st.ships.find(x => x.n && esle(x.n, gemi));
        if (a && b) { const R = dizi(a, b, o.n); let fr = [0, 1];
          if (g && g.p && g.p.length > 1) { const P = g.p, cum = [0]; for (let k = 1; k < P.length; k++) cum.push(cum[k - 1] + mesafe(P[k - 1], P[k]));
            const L = cum[cum.length - 1] || 1, en = q => { let bi = 0, bd = 1e9; P.forEach((p, k) => { const d = mesafe(p, q); if (d < bd) { bd = d; bi = k; } }); return cum[bi] / L; };
            const f0 = en(a), f1 = en(b); fr = [+Math.min(f0, f1).toFixed(3), +Math.max(f0, f1, Math.min(f0, f1) + .05).toFixed(3)]; if (f1 < f0) R.reverse(); }
          st.nus = g ? { pts: R, ship: g.n, fr } : { pts: R, fr }; MY.push(R); eklendi.push(`${gemi} ${o.n} mayın döşüyor`); }
        else log(`  mayın döşer: başlangıç ya da bitiş bulunamadı (${bas} → ${o.hedef})`); }
      else if (o.tur === "cekil") { }
      else log(`  anlaşılmayan olay: ${o.ham}`);
      t += sure;
    }
    ayrilan.forEach((sh, j) => { const t0 = +Math.min(.85, t + .02 + j * .04).toFixed(2); sh.t = [t0, +Math.min(.99, t0 + .32).toFixed(2)]; });
    /* filo üyeleri liderle aynı anda yola çıkar ve varır */
    { const L = {}; for (const sh of st.ships) if (sh._g && !L[sh._g]) L[sh._g] = sh; for (const sh of st.ships) if (sh._g && L[sh._g] !== sh) sh.t = [...L[sh._g].t]; }
    /* 5) sahneler arası durum */
    for (const sh of st.ships) { if (!sh.n) continue; const e = AK.get(sh.n) || {}; AK.set(sh.n, { p: sh.p[sh.p.length - 1], s: sh.s, k: sh.k, ikon: sh.ikon, bayrak: sh.bayrak, ln: sh.ln, etiketsiz: !sh.lab, batti: e.batti || sh.sink != null }); if (sh.sink != null) sh.wd = st.day; }
    /* 6) kamera: hareketleri ve olayları kapsasın */
    const T = [...(st.pts || []).map(p => [p[0], p[1]])]; for (const sh of st.ships) if (!sh.fix) for (const p of sh.p || []) T.push(p);
    for (const b of st.booms || []) T.push([b[0], b[1]]); for (const k of ["torpido", "shots"]) for (const v of st[k] || []) T.push([v[0], v[1]], [v[2], v[3]]);
    if (T.length && M && (H_.length || O.length)) { const los = T.map(p => p[0]), las = T.map(p => p[1]), lo0 = Math.min(...los), lo1 = Math.max(...los), la0 = Math.min(...las), la1 = Math.max(...las);
      st.cam = { lo: +((lo0 + lo1) / 2).toFixed(4), la: +((la0 + la1) / 2).toFixed(4), w: +Math.min(M.lo1 - M.lo0, Math.max((lo1 - lo0) * 1.5, (la1 - la0) * 2.2, (M.lo1 - M.lo0) * (O.some(o => ["torpido", "isaret", "anons", "batis"].includes(o.tur)) ? .2 : .3), .05)).toFixed(3) }; }
    return eklendi;
  }
  kok.OTOMATIK = { kur, hareketCoz, olayCoz, denizYolu, IKON, esle, koordCoz };
})(typeof window !== "undefined" ? window : globalThis);
