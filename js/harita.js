/* Yeni harita üretimi (GMRT derinlik/yükseklik verisi), denetim ve rota kontrolü. Masaüstündeki harita.py ve hikaye.py'nin karşılığı. */
"use strict";
const HARITA = (() => {
  const mY = la => Math.log(Math.tan(Math.PI / 4 + la * Math.PI / 360));

  /* sıkıştırılmamış GeoTIFF (GMRT'nin verdiği biçim) */
  function tiff(buf) {
    const v = new DataView(buf), le = v.getUint16(0) === 0x4949, u16 = o => v.getUint16(o, le), u32 = o => v.getUint32(o, le);
    const ifd = u32(4), n = u16(ifd), T = {};
    const boy = { 1: 1, 2: 1, 3: 2, 4: 4, 5: 8, 11: 4, 12: 8, 16: 8 };
    for (let k = 0; k < n; k++) { const e = ifd + 2 + k * 12, tag = u16(e), tip = u16(e + 2), say = u32(e + 4), b = boy[tip] || 1, off = say * b > 4 ? u32(e + 8) : e + 8, d = [];
      for (let i = 0; i < say; i++) { const o = off + i * b; d.push(tip === 3 ? u16(o) : tip === 4 ? u32(o) : tip === 12 ? v.getFloat64(o, le) : tip === 11 ? v.getFloat32(o, le) : tip === 16 ? Number(v.getBigUint64(o, le)) : v.getUint8(o)); }
      T[tag] = tip === 2 ? String.fromCharCode(...d).replace(/\0+$/, "") : d; }
    if ((T[259] || [1])[0] !== 1) throw new Error("Sıkıştırılmış GeoTIFF desteklenmiyor");
    const W = T[256][0], H = T[257][0], bit = T[258][0], fmt = (T[339] || [1])[0], z = new Float32Array(W * H);
    const oku = (o) => fmt === 3 ? (bit === 64 ? v.getFloat64(o, le) : v.getFloat32(o, le)) : fmt === 2 ? (bit === 16 ? v.getInt16(o, le) : v.getInt32(o, le)) : (bit === 16 ? v.getUint16(o, le) : v.getUint32(o, le));
    const B = bit / 8;
    if (T[273]) { const rps = (T[278] || [H])[0]; T[273].forEach((off, s) => { for (let r = 0; r < rps; r++) { const y = s * rps + r; if (y >= H) break; for (let x = 0; x < W; x++) z[y * W + x] = oku(off + (r * W + x) * B); } }); }
    else if (T[324]) { const tw = T[322][0], th = T[323][0], ac = Math.ceil(W / tw); T[324].forEach((off, t) => { const tx = (t % ac) * tw, ty = Math.floor(t / ac) * th;
        for (let r = 0; r < th; r++) for (let c = 0; c < tw; c++) { const x = tx + c, y = ty + r; if (x < W && y < H) z[y * W + x] = oku(off + (r * tw + c) * B); } }); }
    const nod = T[42113] ? parseFloat(T[42113]) : null;
    for (let i = 0; i < z.length; i++) if (!isFinite(z[i]) || (nod != null && z[i] === nod)) z[i] = 0;
    const sc = T[33550], tp = T[33922];
    return { z, W, H, lo0: tp[3] - tp[0] * sc[0], latop: tp[4] + tp[1] * sc[1], dx: sc[0], dy: sc[1] };
  }
  function ornek(g, lo, la) {
    const c = (lo - g.lo0) / g.dx - .5, r = (g.latop - la) / g.dy - .5, x0 = Math.max(0, Math.min(g.W - 1, Math.floor(c))), y0 = Math.max(0, Math.min(g.H - 1, Math.floor(r)));
    const x1 = Math.min(g.W - 1, x0 + 1), y1 = Math.min(g.H - 1, y0 + 1), fx = Math.max(0, Math.min(1, c - x0)), fy = Math.max(0, Math.min(1, r - y0)), z = g.z, W = g.W;
    return (z[y0 * W + x0] * (1 - fx) + z[y0 * W + x1] * fx) * (1 - fy) + (z[y1 * W + x0] * (1 - fx) + z[y1 * W + x1] * fx) * fy;
  }
  async function uret(lo0, lo1, la0, la1, W, log) {
    const H = Math.round(W * (mY(la1) - mY(la0)) / ((lo1 - lo0) * Math.PI / 180));
    const q = new URLSearchParams({ north: la1, south: la0, west: lo0, east: lo1, layer: "topo", format: "geotiff", resolution: (lo1 - lo0) < 3 ? "high" : "default" });
    log("GMRT verisi indiriliyor…");
    const r = await fetch("https://www.gmrt.org/services/GridServer?" + q); if (!r.ok) throw new Error("GMRT verisi alınamadı (" + r.status + ")");
    const g = tiff(await r.arrayBuffer()); log(`Veri ${g.W}×${g.H}; harita ${W}×${H} işleniyor…`);
    const N = W * H, zz = new Float32Array(N), LO = new Float32Array(W), LA = new Float32Array(H);
    for (let x = 0; x < W; x++) LO[x] = lo0 + (x + .5) / W * (lo1 - lo0);
    for (let y = 0; y < H; y++) { const yv = mY(la1) - (y + .5) / H * (mY(la1) - mY(la0)); LA[y] = (2 * Math.atan(Math.exp(yv)) - Math.PI / 2) * 180 / Math.PI; }
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) zz[y * W + x] = ornek(g, LO[x], LA[y]);
    for (const [c0, c1, a0, a1, yuz] of [[35.0, 35.9, 29.4, 33.0, -400], [25.5, 30.0, 28.3, 30.8, -9999], [39.3, 41.5, 12.8, 15.5, -9999]])
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const i = y * W + x; if (LO[x] >= c0 && LO[x] <= c1 && LA[y] >= a0 && LA[y] <= a1 && zz[i] <= 0) zz[i] = zz[i] > yuz ? 1 : -5; }
    let sea = new Uint8Array(N); for (let i = 0; i < N; i++) sea[i] = zz[i] <= 0 ? 1 : 0;
    /* açma (aşındır + genişlet, artı yapı) | derin */
    const komsu = (a, op) => { const b = new Uint8Array(N); for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const i = y * W + x, v = [a[i], x > 0 ? a[i - 1] : op, x < W - 1 ? a[i + 1] : op, y > 0 ? a[i - W] : op, y < H - 1 ? a[i + W] : op];
      b[i] = op ? (v.every(Boolean) ? 1 : 0) : (v.some(Boolean) ? 1 : 0); } return b; };
    const ac = komsu(komsu(sea, 1), 0); for (let i = 0; i < N; i++) sea[i] = ac[i] || zz[i] < -5 ? 1 : 0;
    /* kenara değmeyen küçük, derin deniz parçaları: kara çukuru */
    const lb = new Int32Array(N); let n = 0; const alan = [0], kenar = new Set(), derin = [false];
    for (let s = 0; s < N; s++) if (sea[s] && !lb[s]) { n++; alan.push(0); derin.push(false); const yig = [s]; lb[s] = n;
      while (yig.length) { const i = yig.pop(), x = i % W, y = (i / W) | 0; alan[n]++; if (zz[i] < -20) derin[n] = true; if (x === 0 || y === 0 || x === W - 1 || y === H - 1) kenar.add(n);
        for (const j of [x > 0 ? i - 1 : -1, x < W - 1 ? i + 1 : -1, y > 0 ? i - W : -1, y < H - 1 ? i + W : -1]) if (j >= 0 && sea[j] && !lb[j]) { lb[j] = n; yig.push(j); } } }
    if (n > 1) for (let i = 0; i < N; i++) { const k = lb[i]; if (k && !kenar.has(k) && alan[k] < .003 * N && derin[k]) sea[i] = 0; }
    /* yükseklik dosyası: ham yükseklik, denizde en az -1 m (kıyı çizgisi ana haritayla aynı kalsın); v = metre + 12000 */
    const yc = document.createElement("canvas"); yc.width = W; yc.height = H; const yx = yc.getContext("2d"), yi = yx.createImageData(W, H);
    for (let i = 0; i < N; i++) { const e = sea[i] ? Math.min(zz[i], -1) : zz[i], v = Math.max(0, Math.min(65535, Math.round(e) + 12000)); yi.data[4 * i] = v >> 8; yi.data[4 * i + 1] = v & 255; yi.data[4 * i + 2] = 0; yi.data[4 * i + 3] = 255; }
    yx.putImageData(yi, 0, 0); const yuk = await new Promise(ok => yc.toBlob(ok, "image/png"));
    for (let i = 0; i < N; i++) if (!sea[i]) zz[i] = Math.max(zz[i], 1);
    const out = new Uint8Array(N), dd = []; for (let i = 0; i < N; i++) if (sea[i]) dd.push(Math.max(0, -zz[i]));
    dd.sort((a, b) => a - b); const dmax = Math.max(dd.length ? dd[Math.floor(.99 * (dd.length - 1))] : 1, 20);
    for (let i = 0; i < N; i++) if (sea[i]) out[i] = Math.max(0, Math.min(127, Math.round(127 * Math.log1p(Math.max(0, -zz[i])) / Math.log1p(dmax))));
    const mlat = (la0 + la1) / 2 * Math.PI / 180, pxx = (lo1 - lo0) / W * 111320 * Math.cos(mlat), pxy = (mY(la1) - mY(la0)) / H * 6371000 * Math.cos(mlat);
    const ab = 1.6 * Math.sqrt(Math.max(1, (lo1 - lo0) / 2)), az = 315 * Math.PI / 180, alt = 45 * Math.PI / 180, Z = i => sea[i] ? 0 : zz[i];
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const i = y * W + x; if (sea[i]) continue;
      const gx = x === 0 ? Z(i + 1) - Z(i) : x === W - 1 ? Z(i) - Z(i - 1) : (Z(i + 1) - Z(i - 1)) / 2, gy = y === 0 ? Z(i + W) - Z(i) : y === H - 1 ? Z(i) - Z(i - W) : (Z(i + W) - Z(i - W)) / 2;
      const gxx = gx / pxx, gyy = gy / pxy, slope = Math.atan(Math.hypot(gxx, gyy) * ab), asp = Math.atan2(-gxx, gyy);
      const hs = Math.sin(alt) * Math.cos(slope) + Math.cos(alt) * Math.sin(slope) * Math.cos(az - asp);
      out[i] = 128 + Math.max(0, Math.min(31, Math.round(20 + (hs - Math.sin(alt)) * 32))) * 4; }
    const cv = document.createElement("canvas"); cv.width = W; cv.height = H; const c = cv.getContext("2d"), im = c.createImageData(W, H);
    for (let i = 0; i < N; i++) { im.data[4 * i] = im.data[4 * i + 1] = im.data[4 * i + 2] = out[i]; im.data[4 * i + 3] = 255; } c.putImageData(im, 0, 0);
    const png = await new Promise(ok => cv.toBlob(ok, "image/png"));
    /* renkli önizleme */
    const k = Math.min(1, 640 / Math.max(W, H)), pw = Math.round(W * k), ph = Math.round(H * k), pc = document.createElement("canvas"); pc.width = W; pc.height = H; const p = pc.getContext("2d"), pi = p.createImageData(W, H);
    for (let i = 0; i < N; i++) { const v = out[i]; let r, gg, b; if (v < 128) { const t = v / 127; r = 214 + (60 - 214) * t; gg = 228 + (96 - 228) * t; b = 236 + (128 - 236) * t; } else { const l = Math.max(60, Math.min(250, 150 + (((v - 128) >> 2) - 20) * 6)); r = Math.min(255, l + 20); gg = Math.min(255, l + 14); b = l; }
      pi.data[4 * i] = r; pi.data[4 * i + 1] = gg; pi.data[4 * i + 2] = b; pi.data[4 * i + 3] = 255; } p.putImageData(pi, 0, 0);
    const kc = document.createElement("canvas"); kc.width = pw; kc.height = ph; kc.getContext("2d").drawImage(pc, 0, 0, pw, ph);
    const onizle = await new Promise(ok => kc.toBlob(ok, "image/jpeg", .82));
    return { meta: { lo0: +lo0.toFixed(6), lo1: +lo1.toFixed(6), la0: +la0.toFixed(6), la1: +la1.toFixed(6), w: W, h: H }, png, onizle, yuk };
  }

  /* ---------- Save the Cat denetimi ---------- */
  const HOOK = ["HOOK — en çarpıcı an, soru ya da sayı", 3, 8];
  const BEATS = { 1: ["Açılış görüntüsü + tema", 6, 12], 2: ["Kurulum: kahraman, yer, zaman", 7, 14], 3: ["Tetikleyici", 6, 12], 4: ["Tereddüt → ikinci perdeye geçiş", 7, 14],
    5: ["Eğlence ve oyunlar + B hikâyesi", 8, 16], 6: ["Orta nokta: sahte zafer ya da sahte yenilgi", 6, 12], 7: ["Kötüler yaklaşıyor → her şey kaybedildi → karanlık gece", 9, 18], 8: ["Final + son görüntü + kapanış", 8, 16] };
  const kel = s => (s || "").split(/\s+/).filter(Boolean).length;
  function denetle(d) {
    const O = []; let sorun = 0; const G = [];
    d.steps.forEach((st, i) => { if (!G.length || G[G.length - 1][0] !== st.perde) G.push([st.perde, []]); G[G.length - 1][1].push(i); });
    for (const [ad, idx] of G) {
      O.push({ b: `${ad}: ${idx.length} sahne` });
      if (idx.length !== 8) { O.push({ u: 1, t: `8 sahne olmalı (şu an ${idx.length})` }); sorun++; }
      const h = d.steps[idx[0]].hook;
      if (!h) { O.push({ u: 1, t: "İlk sahnede hook yok" }); sorun++; }
      else { const n = kel(h.ses); O.push({ u: n > HOOK[2], t: `Hook · ${HOOK[1]} sn · ${n}/${HOOK[2]} kelime`, k: h.ses }); sorun += n > HOOK[2] ? 1 : 0; }
      idx.forEach((j, k) => { const st = d.steps[j]; if (st.vurus !== k + 1) { O.push({ u: 1, t: `Adım ${j + 1}: vuruş ${st.vurus}, beklenen ${k + 1}` }); sorun++; }
        const [ba, sn, ke] = BEATS[k + 1] || ["(fazla sahne)", 0, 0], n = kel(st.ses), u = n > ke || n < ke * .5; sorun += u ? 1 : 0;
        O.push({ u, t: `S${k + 1} · ${sn} sn · ${n}/${ke} kelime · ${ba}` }); });
      if (!(d.meta || {}).soru) { O.push({ u: 1, t: "Kapanış sorusu yok: reel etkileşim sorusuyla bitmeli" }); sorun++; }
      if (!((d.meta || {}).paylasim || {})[ad]) { O.push({ u: 1, t: "Bu bölümün Instagram paylaşım paketi yok" }); sorun++; }
      O.push({ t: `Toplam ${HOOK[1] + Object.values(BEATS).reduce((a, b) => a + b[1], 0)} sn` });
    }
    return { O, sorun };
  }
  /* gemi rotalarının karadan geçtiği yerler */
  const _px = {};
  async function pikseller(ad) { if (_px[ad]) return _px[ad]; const b = await DEPO.haritaPng(ad), im = await createImageBitmap(b), c = document.createElement("canvas"); c.width = im.width; c.height = im.height;
    const x = c.getContext("2d", { willReadFrequently: true }); x.drawImage(im, 0, 0); const d = x.getImageData(0, 0, im.width, im.height).data, V = new Uint8Array(im.width * im.height);
    for (let i = 0; i < V.length; i++) V[i] = d[4 * i]; return (_px[ad] = { V, W: im.width, H: im.height }); }
  async function deniz(d) {
    const kat = await DEPO.kutuphane(), S = []; let bad = 0;
    for (const [si, st] of d.steps.entries()) { const m = kat[st.map]; if (!m) continue; const P = await pikseller(st.map);
      const sea = (lo, la) => { const x = Math.floor((lo - m.lo0) / (m.lo1 - m.lo0) * P.W), y = Math.floor((mY(m.la1) - mY(la)) / (mY(m.la1) - mY(m.la0)) * P.H); return !(x >= 0 && x < P.W && y >= 0 && y < P.H) || P.V[y * P.W + x] < 128; };
      for (const sh of st.ships || []) { if (sh.k === "dot" || sh.kara) continue; const legs = sh.L ? sh.L.map(l => l[0]) : [sh.p];
        for (const Pp of legs) for (let k = 0; k + 1 < Pp.length; k++) { const [a, b] = [Pp[k], Pp[k + 1]];
          for (let s = 0; s <= 10; s++) { const t = s / 10, lo = a[0] + (b[0] - a[0]) * t, la = a[1] + (b[1] - a[1]) * t; if (!sea(lo, la)) { S.push(`S${si + 1} ${sh.n || "(adsız)"}: karada ${lo.toFixed(4)}, ${la.toFixed(4)}`); bad++; break; } } } } }
    return { S, bad };
  }
  return { uret, denetle, deniz, tiff, pikseller };
})();
