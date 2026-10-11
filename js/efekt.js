/* Ses efektleri: masaüstündeki efekt.py'nin aynısı, JavaScript'te. Hepsi kodla sentezlenir (telifsiz). 48 kHz stereo. */
"use strict";
const EFEKT = (() => {
  const SR = 48000;
  let tohum = 7;
  const rnd = () => { tohum |= 0; tohum = tohum + 0x6D2B79F5 | 0; let t = Math.imul(tohum ^ tohum >>> 15, 1 | tohum); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  const normal = () => { let u = 0; while (!u) u = rnd(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rnd()); };
  const N = d => Math.floor(d * SR);
  const zaman = d => { const t = new Float32Array(N(d)); for (let i = 0; i < t.length; i++) t[i] = i / SR; return t; };
  const gurultu = d => { const x = new Float32Array(N(d)); for (let i = 0; i < x.length; i++) x[i] = normal(); return x; };

  /* süzgeçler (Butterworth, bilinear) */
  function biquad(x, b0, b1, b2, a1, a2) { const y = new Float32Array(x.length); let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
    for (let i = 0; i < x.length; i++) { const v = x[i], o = b0 * v + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2; x2 = x1; x1 = v; y2 = y1; y1 = o; y[i] = o; } return y; }
  function bq(x, f, tip, Q = Math.SQRT1_2) { const w = 2 * Math.PI * Math.min(f, SR * .49) / SR, c = Math.cos(w), al = Math.sin(w) / (2 * Q), a0 = 1 + al;
    return tip === "low" ? biquad(x, (1 - c) / 2 / a0, (1 - c) / a0, (1 - c) / 2 / a0, -2 * c / a0, (1 - al) / a0)
      : biquad(x, (1 + c) / 2 / a0, -(1 + c) / a0, (1 + c) / 2 / a0, -2 * c / a0, (1 - al) / a0); }
  function bir(x, f, tip) { const k = Math.tan(Math.PI * Math.min(f, SR * .49) / SR), y = new Float32Array(x.length); let x1 = 0, y1 = 0;
    const b0 = tip === "low" ? k / (1 + k) : 1 / (1 + k), b1 = tip === "low" ? b0 : -b0, a1 = (k - 1) / (k + 1);
    for (let i = 0; i < x.length; i++) { const v = x[i], o = b0 * v + b1 * x1 - a1 * y1; x1 = v; y1 = o; y[i] = o; } return y; }
  const lp = (x, f, o = 2) => o === 1 ? bir(x, f, "low") : o === 3 ? bir(bq(x, f, "low"), f, "low") : bq(x, f, "low");
  const hp = (x, f, o = 2) => o === 1 ? bir(x, f, "high") : bq(x, f, "high");
  const bp = (x, a, b) => lp(hp(x, a), b);

  /* FFT ile evrişim (yankı) */
  function fft(re, im, ters) { const n = re.length;
    for (let i = 1, j = 0; i < n; i++) { let b = n >> 1; for (; j & b; b >>= 1) j ^= b; j ^= b; if (i < j) { [re[i], re[j]] = [re[j], re[i]]; [im[i], im[j]] = [im[j], im[i]]; } }
    for (let L = 2; L <= n; L <<= 1) { const a = 2 * Math.PI / L * (ters ? 1 : -1), wr = Math.cos(a), wi = Math.sin(a);
      for (let i = 0; i < n; i += L) { let cr = 1, ci = 0; for (let k = 0; k < L / 2; k++) { const p = i + k, q = p + L / 2, tr = re[q] * cr - im[q] * ci, ti = re[q] * ci + im[q] * cr;
        re[q] = re[p] - tr; im[q] = im[p] - ti; re[p] += tr; im[p] += ti; const nr = cr * wr - ci * wi; ci = cr * wi + ci * wr; cr = nr; } } }
    if (ters) for (let i = 0; i < n; i++) { re[i] /= n; im[i] /= n; } }
  function evris(x, h) { let n = 1; while (n < x.length + h.length) n <<= 1;
    const ar = new Float64Array(n), ai = new Float64Array(n), br = new Float64Array(n), bi = new Float64Array(n); ar.set(x); br.set(h);
    fft(ar, ai, false); fft(br, bi, false);
    for (let i = 0; i < n; i++) { const r = ar[i] * br[i] - ai[i] * bi[i]; ai[i] = ar[i] * bi[i] + ai[i] * br[i]; ar[i] = r; }
    fft(ar, ai, true); return Float32Array.from(ar.subarray(0, x.length)); }
  let IR = null;
  function yanki(x, wet = .25) { if (!IR) { const t = zaman(1.4), g = gurultu(1.4); for (let i = 0; i < g.length; i++) g[i] *= Math.exp(-t[i] * 4.2); IR = lp(g, 5000); let s = 0; for (const v of IR) s += Math.abs(v); const k = Math.sqrt(s) * 6; for (let i = 0; i < IR.length; i++) IR[i] /= k; }
    const w = evris(x, IR), y = new Float32Array(x.length); for (let i = 0; i < x.length; i++) y[i] = x[i] + wet * w[i]; return y; }

  const st = (x, pan = 0) => { const L = new Float32Array(x.length), R = new Float32Array(x.length);
    for (let i = 0; i < x.length; i++) { const p = Math.max(-1, Math.min(1, typeof pan === "number" ? pan : pan[i])); L[i] = x[i] * Math.sqrt((1 - p) / 2); R[i] = x[i] * Math.sqrt((1 + p) / 2); } return { L, R }; };
  const tepe = x => { let m = 0; for (const v of x) m = Math.max(m, Math.abs(v)); return m; };
  const norm = (x, p = .9) => { const m = tepe(x); if (m > 0) for (let i = 0; i < x.length; i++) x[i] *= p / m; return x; };
  const normS = (s, p) => { const m = Math.max(tepe(s.L), tepe(s.R)); if (m > 0) for (const c of [s.L, s.R]) for (let i = 0; i < c.length; i++) c[i] *= p / m; return s; };
  const map = (n, f) => { const y = new Float32Array(n); for (let i = 0; i < n; i++) y[i] = f(i, i / SR); return y; };

  /* ---------------- efektler ---------------- */
  function whoosh(d = .75) { const n = N(d), g = gurultu(d), lo = bp(g, 250, 1400), hi = bp(g, 1400, 5000);
    const x = map(n, (i, t) => { const u = Math.min(1, t / d), env = Math.pow(Math.sin(Math.PI * u), 2.2); return (lo[i] * (1 - u * .6) + hi[i] * u * .55) * env; });
    return st(norm(x, .55), map(n, i => -.7 + 1.4 * i / Math.max(1, n - 1))); }
  function gecis(d = 1.0) { const w = whoosh(.8), n = N(d), L = new Float32Array(n), R = new Float32Array(n);
    for (let i = 0; i < w.L.length && i < n; i++) { L[i] = w.L[i] * 1.5; R[i] = w.R[i] * 1.5; }
    const m = N(.7), g = lp(gurultu(.7), 1800);
    let hit = map(m, (i, t) => Math.sin(2 * Math.PI * (70 * t - 25 * t * t)) * Math.exp(-t * 9) * Math.min(1, t / .003) + g[i] * Math.exp(-t * 45) * .35);
    hit = yanki(hit, .22); const i0 = N(.34);
    for (let k = 0; k < hit.length && i0 + k < n; k++) { const v = hit[k] * .55 * Math.SQRT1_2; L[i0 + k] += v; R[i0 + k] += v; }
    return normS({ L, R }, .9); }
  function vurus(d = 1.6) { const g = lp(gurultu(d), 2500); const x = map(N(d), (i, t) => Math.sin(2 * Math.PI * (58 * t - 12 * t * t)) * Math.exp(-t * 3.2) + g[i] * Math.exp(-t * 28) * .5);
    return st(norm(yanki(x, .35), .95)); }
  function patlama(k = 1, d) { d = d || 1.6 + .6 * k; const body = lp(gurultu(d), 380 + 120 * k, 3), att = hp(gurultu(d), 900);
    const x = map(N(d), (i, t) => body[i] * 1.2 * Math.exp(-t * (3 / Math.sqrt(k))) + Math.sin(2 * Math.PI * (62 * t - 9 * t * t)) * Math.exp(-t * 5) * .9 + att[i] * Math.exp(-t * 40) * .25);
    return st(norm(yanki(x, .3), Math.min(.95, .7 + .1 * k)), (rnd() - .5) * .5); }
  function atis(d = 1.1) { const c = hp(gurultu(d), 1200), b = lp(gurultu(d), 160, 3);
    const x = map(N(d), (i, t) => c[i] * Math.exp(-t * 90) + b[i] * Math.exp(-t * 9) * 2.2);
    for (const [dl, g] of [[.13, .35], [.31, .18], [.55, .08]]) { const k = N(dl), e = lp(x.slice(0, x.length - k), 1200); for (let i = k; i < x.length; i++) x[i] += e[i - k] * g; }
    return st(norm(yanki(x, .2), .7), (rnd() - .5) * .6); }
  function batis(d = 2.6) { const n = N(d), r = lp(gurultu(d), 140, 3), bub = new Float32Array(n);
    for (let b = 0; b < 38; b++) { const s = .15 + rnd() * 1.9, L = .025 + rnd() * .04, f0 = 260 + rnd() * 380, i0 = N(s), m = N(L), a = (.25 + .5 * rnd()) * Math.exp(-s * .5);
      for (let k = 0; k < m && i0 + k < n; k++) { const tt = k / SR; bub[i0 + k] += Math.sin(2 * Math.PI * f0 * (tt + 6 * tt * tt)) * Math.pow(Math.sin(Math.PI * tt / L), 2) * a; } }
    const x = map(n, (i, t) => r[i] * Math.min(1, t / .3) * Math.exp(-Math.max(0, t - .6) * 1.6) * 1.4 + bub[i] * .6);
    return st(norm(yanki(x, .3), .8)); }
  function kalp(guc = 1, d = .45) { const g = lp(gurultu(d), 180); const x = map(N(d), (i, t) => Math.sin(2 * Math.PI * (52 * t - 30 * t * t)) * Math.exp(-t * 16) * Math.min(1, t / .004) + g[i] * Math.exp(-t * 30) * .5);
    return st(norm(yanki(x, .12), .85 * guc)); }
  function pop(d = .22) { return st(norm(yanki(map(N(d), (i, t) => Math.sin(2 * Math.PI * (520 * t + 900 * t * t)) * Math.exp(-t * 22) * Math.min(1, t / .003)), .15), .35)); }
  function bayrak(d = .5) { const g = bp(gurultu(d), 700, 4000); return st(norm(map(N(d), (i, t) => g[i] * [[.06, 1], [.18, .8], [.31, .55]].reduce((a, [c, k]) => a + Math.exp(-Math.pow((t - c) / .035, 2)) * k, 0)), .3)); }
  function ambiyans(d) { const n = N(d), g = gurultu(d); let s = 0; const br0 = new Float32Array(n); for (let i = 0; i < n; i++) { s += g[i]; br0[i] = s; }
    const tr = lp(br0, .5, 1); for (let i = 0; i < n; i++) br0[i] -= tr[i]; const br = norm(lp(br0, 320), 1), surf = norm(bp(gurultu(d), 900, 3200), 1);
    const x = map(n, (i, t) => (br[i] * .8 + surf[i] * .18 * (.55 + .45 * Math.pow(Math.sin(2 * Math.PI * t / 7.3 + 1.3), 2))) * Math.min(1, Math.min(t, d - t) / .06) * .9);
    return st(x, map(n, (i, t) => Math.sin(2 * Math.PI * t / 11) * .3)); }

  /* ---------------- hava sesleri ---------------- */
  function gok(d = 3.6) { const n = N(d), cr = hp(gurultu(d), 1500), ru = lp(gurultu(d), 110, 3), md = lp(gurultu(d), 4, 1); const mm = Math.max(1e-9, tepe(md));
    const x = map(n, (i, t) => cr[i] * Math.exp(-t * 38) * .9 + ru[i] * Math.min(1, t / .08) * Math.exp(-t * .9) * (.55 + .45 * md[i] / mm) * 2.4);
    return st(norm(yanki(x, .35), .95), (rnd() - .5) * .4); }
  function yagmurSes(d) { const n = N(d), L = hp(lp(gurultu(d), 7000), 900), R = hp(lp(gurultu(d), 7000), 900);
    const D = new Float32Array(n); for (let k = 0; k < d * 55; k++) { const i0 = Math.floor(rnd() * n), f0 = 2200 + rnd() * 3500, a = .3 + rnd() * .7; for (let j = 0; j < N(.012) && i0 + j < n; j++) { const t = j / SR; D[i0 + j] += Math.sin(2 * Math.PI * f0 * t) * Math.exp(-t * 420) * a; } }
    const Dl = hp(D, 1500); norm(L, 1); norm(R, 1); norm(Dl, 1);
    return { L: map(n, i => L[i] * .55 + Dl[i] * .45), R: map(n, i => R[i] * .55 + Dl[(i + 97) % n] * .45) }; }
  function ruzgarSes(d, yumusak) { const n = N(d), b = bp(gurultu(d), yumusak ? 150 : 220, yumusak ? 600 : 1100), g = lp(gurultu(d), .35, 1), gm = Math.max(1e-9, tepe(g));
    const ws = bp(gurultu(d), 520, 760); norm(b, 1); norm(ws, 1);
    const x = map(n, i => { const gust = .35 + .65 * Math.max(0, g[i] / gm * .5 + .5); return b[i] * gust + ws[i] * .25 * gust * gust; });
    return st(x, map(n, (i, t) => Math.sin(2 * Math.PI * t / 9) * .5)); }
  function geceSes(d) { const n = N(d), x = new Float32Array(n);
    for (let t0 = rnd() * .4; t0 < d; t0 += .55 + rnd() * .5) { const f0 = 4100 + rnd() * 400, a = .4 + rnd() * .6; for (let c = 0; c < 3; c++) { const i0 = N(t0 + c * .055); for (let j = 0; j < N(.03) && i0 + j < n; j++) { const t = j / SR; x[i0 + j] += Math.sin(2 * Math.PI * f0 * t) * Math.sin(Math.PI * t / .03) * a; } } }
    const dr = lp(gurultu(d), 180, 3); norm(dr, 1); norm(x, 1); return st(map(n, i => x[i] * .5 + dr[i] * .25), .15); }
  const HAVA_N = { "gece": "gece", "karanlık": "gece", "şafak": "safak", "sabah": "safak", "akşam": "aksam", "gün batımı": "aksam", "sis": "sis", "pus": "sis", "duman": "sis",
    "yağmur": "yagmur", "yagmur": "yagmur", "sağanak": "yagmur", "kar": "kar", "tipi": "kar", "rüzgâr": "ruzgar", "rüzgar": "ruzgar", "ruzgar": "ruzgar",
    "fırtına": "firtina", "firtina": "firtina", "yıldırım": "yildirim", "yildirim": "yildirim", "şimşek": "yildirim", "safak": "safak", "aksam": "aksam" };
  const havaNorm = L => { const S = new Set((L || []).map(x => HAVA_N[String(x).toLocaleLowerCase("tr-TR").trim()]).filter(Boolean)); if (S.has("firtina")) { S.add("yagmur"); S.add("ruzgar"); } return S; };
  function yatakEkle(L, R, yataklar) {
    for (const y of yataklar || []) { const H = havaNorm(y.hava); if (!H.size) continue; const d = y.t1 - y.t0; if (d <= .2) continue;
      const katman = []; const f = H.has("firtina");
      if (H.has("yagmur")) katman.push([yagmurSes(d), f ? .2 : .15]);
      if (H.has("ruzgar")) katman.push([ruzgarSes(d), f ? .2 : .13]);
      else if (H.has("kar")) katman.push([ruzgarSes(d, true), .09]);
      else if (H.has("sis")) katman.push([ruzgarSes(d, true), .05]);
      if (H.has("gece") && !H.has("yagmur") && !H.has("kar")) katman.push([geceSes(d), .07]);
      const i0 = N(y.t0), n = N(d), kenar = N(.45);
      for (const [s, g] of katman) for (let i = 0; i < n && i0 + i < L.length; i++) { const e = Math.min(1, i / kenar, (n - i) / kenar) * g; L[i0 + i] += s.L[i] * e; R[i0 + i] += s.R[i] * e; } } }

  const URET = { gok, gecis, whoosh, vurus, patlama, buyukpatlama: () => patlama(2.4, 3.2), atis, batis, kalp1: () => kalp(1), kalp2: () => kalp(.72), pop, bayrak };
  const SEVIYE = { gok: .85, gecis: .85, whoosh: .55, vurus: .9, patlama: .7, buyukpatlama: .85, atis: .55, batis: .7, kalp1: .8, kalp2: .8, pop: .45, bayrak: .4 };
  const onb = {};
  function efekt(ad, k) { const key = ad === "patlama" ? ad + Math.round((k || 0) * 10) : ad; if (!onb[key]) onb[key] = ad === "patlama" ? patlama(k || 1) : URET[ad](); return onb[key]; }
  function yerlestir(L, R, s, t, g) { const i = Math.floor(Math.max(0, t) * SR); for (let k = 0; k < s.L.length && i + k < L.length; k++) { L[i + k] += s.L[k] * g; R[i + k] += s.R[k] * g; } }

  /* bütün reelin karışımı. olaylar [{t, ad, k}], ses: mono Float32Array (zamana yerleşmiş) */
  function miks(sure, olaylar, ses, { efektG = 1, ambG = .10, ducKat = .72, yataklar = [] } = {}) {
    const n = N(sure), L = new Float32Array(n), R = new Float32Array(n), fL = new Float32Array(n), fR = new Float32Array(n);
    if (efektG) for (const o of olaylar) if (URET[o.ad]) yerlestir(fL, fR, efekt(o.ad, o.k), o.t, SEVIYE[o.ad] || .6);
    if (efektG) yatakEkle(fL, fR, yataklar);
    const duck = new Float32Array(n).fill(1);
    if (ses) { const a = new Float32Array(n); for (let i = 0; i < n && i < ses.length; i++) a[i] = Math.abs(ses[i]);
      /* konuşma varken efektler ve ambiyans belirgin biçimde kısılır; konuşma bitince yavaşça geri gelir */
      const e = lp(a, 4, 1), m = tepe(e) + 1e-9, sv = tepe(ses) || 1, kz = .92 / sv;
      for (let i = 0; i < n; i++) duck[i] = 1 - ducKat * Math.min(1, Math.max(0, e[i] / m * 4));
      for (let i = 0; i < n && i < ses.length; i++) { const v = ses[i] * kz; L[i] += v; R[i] += v; } }
    for (let i = 0; i < n; i++) { L[i] += fL[i] * duck[i] * efektG; R[i] += fR[i] * duck[i] * efektG; }
    if (ambG && efektG) { const A = ambiyans(sure); for (let i = 0; i < n; i++) { L[i] += A.L[i] * ambG * duck[i]; R[i] += A.R[i] * ambG * duck[i]; } }
    const p = Math.max(tepe(L), tepe(R)); if (p > .98) for (const c of [L, R]) for (let i = 0; i < n; i++) c[i] *= .98 / p;
    return { L, R };
  }
  /* kendi kaydı: 80 Hz altını keser, sesi eşitler, tepeyi sınırlar */
  function dengele(x) { if (!x.length) return x; x = hp(x, 80); const fr = N(.05), n = Math.floor(x.length / fr);
    if (n) { const e = []; for (let i = 0; i < n; i++) { let s = 0; for (let j = 0; j < fr; j++) s += x[i * fr + j] ** 2; e.push(Math.sqrt(s / fr)); }
      const m = Math.max(...e), k = e.filter(v => v > .2 * m), rms = k.length ? Math.sqrt(k.reduce((a, v) => a + v * v, 0) / k.length) : m, g = Math.min(12, .125 / Math.max(rms, 1e-6));
      for (let i = 0; i < x.length; i++) x[i] *= g; }
    const p = tepe(x); if (p > .95) for (let i = 0; i < x.length; i++) x[i] *= .95 / p; return x; }
  /* uzun sessizlikleri kısaltır, baştaki/sondaki sessizliği atar, kelime zamanlarını kaydırır */
  function sikistir(x, W, enCok = .32) { const fr = N(.01), n = Math.floor(x.length / fr); if (n < 5) return { x, W };
    const e = new Float32Array(n); let m = 0; for (let i = 0; i < n; i++) { let s = 0; for (let j = 0; j < fr; j++) s += x[i * fr + j] ** 2; e[i] = Math.sqrt(s / fr); m = Math.max(m, e[i]); }
    const keep = new Uint8Array(n).fill(1), kes = []; let k = 0;
    while (k < n) { if (e[k] < .025 * m) { let j = k; while (j < n && e[j] < .025 * m) j++; const L = j - k, izin = (k === 0 || j === n) ? 3 : Math.round(enCok * 100);
        if (L > izin) { const a = k + (k === 0 ? 0 : Math.floor(izin / 2)), b = a + (L - izin); keep.fill(0, a, b); kes.push([a / 100, (b - a) / 100]); } k = j; } else k++; }
    let say = 0; for (let i = 0; i < n; i++) if (keep[i]) say++; const y = new Float32Array(say * fr + (x.length - n * fr)); let o = 0;
    for (let i = 0; i < n; i++) if (keep[i]) { y.set(x.subarray(i * fr, (i + 1) * fr), o); o += fr; } y.set(x.subarray(n * fr), o);
    const yeni = t => t - kes.reduce((s, [a, d]) => s + Math.min(d, Math.max(0, t - a)), 0);
    return { x: y, W: W.map(w => [yeni(w[0]), w[1], w[2]]) }; }
  return { SR, miks, efekt, ambiyans, dengele, sikistir, URET, havaNorm, wav: yazWav };
  function yazWav(L, R) { const n = L.length, b = new DataView(new ArrayBuffer(44 + n * 4)), s = (o, t) => [...t].forEach((c, i) => b.setUint8(o + i, c.charCodeAt(0)));
    s(0, "RIFF"); b.setUint32(4, 36 + n * 4, true); s(8, "WAVEfmt "); b.setUint32(16, 16, true); b.setUint16(20, 1, true); b.setUint16(22, 2, true); b.setUint32(24, SR, true); b.setUint32(28, SR * 4, true); b.setUint16(32, 4, true); b.setUint16(34, 16, true); s(36, "data"); b.setUint32(40, n * 4, true);
    for (let i = 0; i < n; i++) { b.setInt16(44 + i * 4, Math.max(-1, Math.min(1, L[i])) * 32767, true); b.setInt16(46 + i * 4, Math.max(-1, Math.min(1, R[i])) * 32767, true); } return new Blob([b.buffer], { type: "audio/wav" }); }
})();
