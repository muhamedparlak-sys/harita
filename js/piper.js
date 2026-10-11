/* Telefonda çalışan Türkçe/İngilizce yapay ses (Piper, ONNX Runtime Web).
   Ses modeli ilk kullanımda Hugging Face'ten bir kez indirilir ve telefonda saklanır (Cache Storage). */
"use strict";
const PIPER = (() => {
  const HF = "https://huggingface.co/diffusionstudio/piper-voices/resolve/main/";
  const SESLER = {
    fahrettin: { ad: "Fahrettin (Türkçe, erkek)", yol: "tr/tr_TR/fahrettin/medium/tr_TR-fahrettin-medium.onnx", dil: "tr" },
    fettah: { ad: "Fettah (Türkçe, erkek)", yol: "tr/tr_TR/fettah/medium/tr_TR-fettah-medium.onnx", dil: "tr" },
    dfki: { ad: "DFKI (Türkçe, erkek)", yol: "tr/tr_TR/dfki/medium/tr_TR-dfki-medium.onnx", dil: "tr" },
    ryan: { ad: "Ryan (İngilizce, ABD)", yol: "en/en_US/ryan/medium/en_US-ryan-medium.onnx", dil: "en" },
    alan: { ad: "Alan (İngilizce, İngiliz)", yol: "en/en_GB/alan/medium/en_GB-alan-medium.onnx", dil: "en" },
    amy: { ad: "Amy (İngilizce, kadın)", yol: "en/en_US/amy/medium/en_US-amy-medium.onnx", dil: "en" }
  };
  const KAP = "piper-sesleri-v1";
  let ortHazir = null, phData = null, phWasm = null, oturum = {}, ayar = {};
  const taban = () => (window.__PIPER_TABAN || HF);

  function betik(src) {
    return new Promise((ok, no) => { const s = document.createElement("script"); s.src = src; s.onload = ok; s.onerror = () => no(new Error(src + " yüklenemedi")); document.head.append(s); });
  }
  async function cekKayit(url, ilerle) {
    let c = null; try { c = await caches.open(KAP); const r = await c.match(url); if (r) return await r.arrayBuffer(); } catch (e) { c = null; }
    const r = await fetch(url); if (!r.ok) throw new Error("İndirilemedi (" + r.status + "): " + url.split("/").pop());
    const top = +(r.headers.get("Content-Length") || 0), okur = r.body && r.body.getReader();
    let buf;
    if (okur) { const P = []; let n = 0; for (;;) { const { done, value } = await okur.read(); if (done) break; P.push(value); n += value.length; ilerle && ilerle(n, top); }
      buf = new Uint8Array(n); let o = 0; for (const p of P) { buf.set(p, o); o += p.length; } buf = buf.buffer; }
    else buf = await r.arrayBuffer();
    if (c) { try { await c.put(url, new Response(buf.slice(0), { headers: { "Content-Type": "application/octet-stream" } })); } catch (e) { } }
    return buf;
  }
  async function hazirla() {
    if (!ortHazir) ortHazir = (async () => {
      if (!window.ort) await betik("vendor/ort.wasm.min.js");
      ort.env.wasm.numThreads = 1; ort.env.wasm.wasmPaths = new URL("vendor/", location.href).href;
      if (!window.createPiperPhonemize) await betik("vendor/piper_phonemize.js");
      const [d, w] = await Promise.all([fetch("vendor/piper_phonemize.data").then(r => r.arrayBuffer()), fetch("vendor/piper_phonemize.wasm").then(r => r.arrayBuffer())]);
      phData = URL.createObjectURL(new Blob([d])); phWasm = w;
    })();
    return ortHazir;
  }
  async function yuklu(ses) { try { const c = await caches.open(KAP); return !!(await c.match(taban() + SESLER[ses].yol)); } catch (e) { return false; } }
  async function sil(ses) { try { const c = await caches.open(KAP); await c.delete(taban() + SESLER[ses].yol); await c.delete(taban() + SESLER[ses].yol + ".json"); delete oturum[ses]; } catch (e) { } }
  async function oturumAl(ses, ilerle) {
    if (oturum[ses]) return oturum[ses];
    await hazirla(); const S = SESLER[ses]; if (!S) throw new Error("Bilinmeyen ses: " + ses);
    const cfg = JSON.parse(new TextDecoder().decode(await cekKayit(taban() + S.yol + ".json")));
    const model = await cekKayit(taban() + S.yol, ilerle);
    const s = await ort.InferenceSession.create(model, { executionProviders: ["wasm"] });
    return (oturum[ses] = { s, cfg });
  }
  async function fonem(metin, dil) {
    const satirlar = [];
    const m = await createPiperPhonemize({
      print: t => satirlar.push(t), printErr: () => { },
      wasmBinary: phWasm,
      locateFile: u => u.endsWith(".data") ? phData : u
    });
    m.callMain(["-l", dil, "--input", JSON.stringify([{ text: metin }]), "--espeak_data", "/espeak-ng-data"]);
    const ids = [];
    for (const s of satirlar) { try { const j = JSON.parse(s); if (j.phoneme_ids) ids.push(...j.phoneme_ids); } catch (e) { } }
    return ids;
  }
  async function yeniden(x, sr0, sr) {
    if (sr0 === sr) return x;
    const n = Math.ceil(x.length * sr / sr0), oc = new OfflineAudioContext(1, n, sr), b = oc.createBuffer(1, x.length, sr0);
    b.getChannelData(0).set(x); const k = oc.createBufferSource(); k.buffer = b; k.connect(oc.destination); k.start();
    return (await oc.startRendering()).getChannelData(0).slice();
  }
  /* metni cümle/öbek parçalarına böler; her parça ayrı okunur, böylece altyazı zamanları parça düzeyinde doğru olur */
  function parcala(metin) {
    const P = []; let cur = "";
    for (const w of metin.split(/\s+/).filter(Boolean)) { cur += (cur ? " " : "") + w; if (/[.!?…;:,]["”»)]*$/.test(w) && cur.split(" ").length >= 3) { P.push(cur); cur = ""; } }
    if (cur) { if (P.length && cur.split(" ").length < 2) P[P.length - 1] += " " + cur; else P.push(cur); }
    return P;
  }
  /* → {x: Float32Array (sr), W: [[t, süre, kelime], …]} */
  async function oku(metin, { ses = "fahrettin", hiz = 1, sr = 48000, ilerle } = {}) {
    const { s, cfg } = await oturumAl(ses, ilerle), sr0 = cfg.audio.sample_rate, inf = cfg.inference;
    const parcalar = parcala(metin), out = [], W = []; let t = 0;
    for (const p of parcalar) {
      const ids = await fonem(p, cfg.espeak.voice); if (!ids.length) continue;
      const feeds = { input: new ort.Tensor("int64", BigInt64Array.from(ids.map(BigInt)), [1, ids.length]),
        input_lengths: new ort.Tensor("int64", BigInt64Array.from([BigInt(ids.length)]), [1]),
        scales: new ort.Tensor("float32", Float32Array.from([inf.noise_scale, inf.length_scale / hiz, inf.noise_w]), [3]) };
      if (cfg.num_speakers > 1) feeds.sid = new ort.Tensor("int64", BigInt64Array.from([0n]), [1]);
      const r = await s.run(feeds); let x = await yeniden(r.output.data, sr0, sr);
      /* parçanın içindeki kelimeler: konuşma başı/sonu sessizliği dışında harf sayısına orantılı */
      const e = enerjiSinir(x, sr), K = p.split(/\s+/), L = K.reduce((a, k) => a + k.length + 1, 0); let a = 0;
      for (const k of K) { W.push([t + e[0] + (e[1] - e[0]) * a / L, (e[1] - e[0]) * (k.length + 1) / L, k]); a += k.length + 1; }
      out.push(x); t += x.length / sr;
    }
    const n = out.reduce((a, x) => a + x.length, 0), y = new Float32Array(n); let o = 0; for (const x of out) { y.set(x, o); o += x.length; }
    return { x: y, W };
  }
  function enerjiSinir(x, sr) {
    const fr = Math.round(.01 * sr), n = Math.floor(x.length / fr); if (n < 3) return [0, x.length / sr];
    const e = new Float32Array(n); let m = 0;
    for (let i = 0; i < n; i++) { let s = 0; for (let j = 0; j < fr; j++) { const v = x[i * fr + j]; s += v * v; } e[i] = Math.sqrt(s / fr); if (e[i] > m) m = e[i]; }
    let a = 0, b = n - 1; while (a < n && e[a] < .05 * m) a++; while (b > a && e[b] < .05 * m) b--;
    return [a * fr / sr, (b + 1) * fr / sr];
  }
  return { SESLER, oku, yuklu, sil, hazirla, oturumAl };
})();
