/* Harita Hikâyesi Stüdyosu — iPhone sürümü. Masaüstündeki editor.html'in dokunmatik karşılığı. */
"use strict";
const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const SURUM = "41 · 12 Ekim";
const BUTCE = [12, 14, 12, 14, 16, 12, 18, 16], HOOKB = 8;
const IPUCU = ["Geniş plan, “önce” hâli. Kim, nerede; tema cümlesi.", "Kahraman yerinde. Bağlam ve tek cümlede risk.", "Olayı başlatan hareket. 1. yeniden kanca.", "Eşik, sınır, giriş. Karar anı.", "Asıl hareket, rotalar; varsa yan hikâye.", "Sahte zafer ya da sahte yenilgi. “Ama…” ile 2. kanca.", "Çatışma, kayıp, en kötü an. Hook bu sahneden.", "Sonuç ve bugün; S1'in aynası. Son cümle hook'a döner."];

let AD = null, HK = null, V = null, CUR = 0, MOD = (() => { try { return localStorage.getItem("onizleme_kip") || "dikey"; } catch (e) { return "dikey"; } })(), ARAC = "sec", GECICI = [], GECMIS = [], SEKME = "sahneler";
let VAR = { ikonlar: [], bayraklar: [], vurus: DEPO.VURUS, okunus: {} }, KAT = {};
let kayitT = null, yukT = null, OYNA = null, SESLI = false, HAZIR = false;

/* ---------- küçük yardımcılar: bildirim, soru, onay, pencere, paylaşım ---------- */
function bildir(t, sn = 2.2) { const e = $("#toast"); e.textContent = t; e.classList.add("goster"); clearTimeout(e._t); e._t = setTimeout(() => e.classList.remove("goster"), sn * 1000); }
function sor(soru, varsayilan = "", ipucu = "") {
  return new Promise(ok => { const d = $("#sorDlg");
    $("#sorIc").innerHTML = `<label>${esc(soru)}<input id="sorGir" value="${esc(varsayilan)}" placeholder="${esc(ipucu)}" autocomplete="off"></label><div class="satir" style="justify-content:flex-end"><button id="sorIptal">Vazgeç</button><button id="sorTamam" class="ana">Tamam</button></div>`;
    const bit = v => { d.close(); ok(v); };
    $("#sorIptal").onclick = () => bit(null); $("#sorTamam").onclick = () => bit($("#sorGir").value);
    $("#sorGir").onkeydown = e => { if (e.key === "Enter") { e.preventDefault(); bit($("#sorGir").value); } };
    d.oncancel = e => { e.preventDefault(); bit(null); }; d.showModal(); setTimeout(() => $("#sorGir").focus(), 60); });
}
function onayla(metin, evet = "Evet") {
  return new Promise(ok => { const d = $("#sorDlg");
    $("#sorIc").innerHTML = `<p style="margin:0">${esc(metin)}</p><div class="satir" style="justify-content:flex-end"><button id="sorIptal">Vazgeç</button><button id="sorTamam" class="ana">${esc(evet)}</button></div>`;
    const bit = v => { d.close(); ok(v); }; $("#sorIptal").onclick = () => bit(false); $("#sorTamam").onclick = () => bit(true); d.oncancel = e => { e.preventDefault(); bit(false); }; d.showModal(); });
}
function pencere(baslik, html) { $("#dlgBaslik").textContent = baslik; $("#dlgIc").innerHTML = html; const d = $("#dlg"); if (!d.open) d.showModal(); $("#dlgIc").scrollTop = 0; }
const kapat = () => $("#dlg").close();
$("#dlgKapat").onclick = kapat;
async function paylas(blob, ad, baslik) {
  const f = new File([blob], ad, { type: blob.type || "application/octet-stream" });
  if (navigator.canShare && navigator.canShare({ files: [f] })) { try { await navigator.share({ files: [f], title: baslik || ad }); return; } catch (e) { if (e.name === "AbortError") return; } }
  const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = ad; document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 60000);
}
async function kopyala(metin, btn) { try { await navigator.clipboard.writeText(metin); if (btn) btn.textContent = "Kopyalandı"; else bildir("Kopyalandı"); } catch (e) { bildir("Kopyalanamadı; metni basılı tutup seçin."); } }

/* ---------- kayıt, geçmiş ---------- */
function degisti(onizle = true) { GECMIS.push(JSON.stringify(HK)); if (GECMIS.length > 60) GECMIS.shift(); $("#durum").textContent = "kaydediliyor…";
  clearTimeout(kayitT); kayitT = setTimeout(async () => { await DEPO.hikayeKaydet(AD, HK); $("#durum").textContent = "kaydedildi"; setTimeout(() => { if ($("#durum").textContent === "kaydedildi") $("#durum").textContent = ""; }, 1500); }, 350); if (onizle) yenile(); }
function sadeceKaydet() { $("#durum").textContent = "kaydediliyor…"; clearTimeout(kayitT); kayitT = setTimeout(async () => { await DEPO.hikayeKaydet(AD, HK); $("#durum").textContent = "kaydedildi"; setTimeout(() => { if ($("#durum").textContent === "kaydedildi") $("#durum").textContent = ""; }, 1500); }, 500); }
function geriAl() { if (GECMIS.length < 2) return bildir("Geri alınacak bir şey yok"); GECMIS.pop(); HK = JSON.parse(GECMIS[GECMIS.length - 1]); V = HK.veri; CUR = Math.min(CUR, V.steps.length - 1);
  ciz(); DEPO.hikayeKaydet(AD, HK); bildir("Geri alındı"); }
$("#geriBtn").onclick = geriAl;

/* ---------- önizleme ---------- */
const W = () => $("#on").contentWindow;
function boyutla() {
  const al = $("#sahnealan"), gen = al.clientWidth - 16, [w, h] = MOD === "dikey" ? [540, 960] : [1080, 660];
  const yuk = Math.round(MOD === "dikey" ? innerHeight * .5 : Math.min(gen * h / w, innerHeight * .40));
  const k = Math.min(gen / w, yuk / h); const f = $("#on"); f.width = w; f.height = h; f.style.transform = `scale(${k})`;
  $("#cerceve").style.width = Math.round(w * k) + "px"; $("#cerceve").style.height = Math.round(h * k) + "px"; al.style.height = Math.round(h * k + 16) + "px";
}
function yenile() { clearTimeout(yukT); yukT = setTimeout(async () => { boyutla(); HAZIR = false; $("#yukleniyor").hidden = false; $("#on").srcdoc = await DEPO.sayfaKur(HK, MOD); }, 120); }
$("#on").addEventListener("load", () => { const t0 = Date.now(); const bekle = () => { try { if (W().__draw && W().eval("Object.values(MAPS).every(m=>m.ok)")) { HAZIR = true; $("#yukleniyor").hidden = true; return goster(); } } catch (e) { } if (Date.now() - t0 < 20000) setTimeout(bekle, 60); }; bekle(); });
function goster() { if (!HAZIR) return; if (CUR < 0) { hookGoster(); $("#zamanyaz").textContent = "Hook"; return; }
  try { W().__solo = true; W().__draw(CUR + (+$("#zaman").value) / 1000); } catch (e) { } $("#zamanyaz").textContent = `S${CUR + 1} · ${(+$("#zaman").value / 1000).toFixed(2)}`; geciciCiz(); }
$("#zaman").addEventListener("input", goster);
function modYaz() { $("#modBtn").textContent = MOD === "dikey" ? "Yatay görünüm" : "Reel görünümü 9:16"; $("#guvenli").hidden = MOD !== "dikey"; }
$("#modBtn").onclick = () => { MOD = MOD === "dikey" ? "yatay" : "dikey"; try { localStorage.setItem("onizleme_kip", MOD); } catch (e) { } modYaz(); yenile(); };
modYaz();
addEventListener("resize", () => { boyutla(); });

/* oynatma; isteğe bağlı iPhone sesiyle (önizleme içindir; videoya telefonda üretilen yapay ses girer) */
function konus(metin) { if (!SESLI || !window.speechSynthesis || !metin) return; speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(metin.replace(/\.\.\./g, "…")); u.lang = "tr-TR";
  const v = speechSynthesis.getVoices().find(v => v.lang && v.lang.toLowerCase().startsWith("tr")); if (v) u.voice = v; u.rate = 1.05; speechSynthesis.speak(u); }
$("#sesliBtn").onclick = () => { SESLI = !SESLI; $("#sesliBtn").textContent = SESLI ? "🔊" : "🔈"; $("#sesliBtn").classList.toggle("on", SESLI); if (!SESLI && window.speechSynthesis) speechSynthesis.cancel(); bildir(SESLI ? "Önizleme iPhone sesiyle okunacak" : "Sesli önizleme kapalı"); };
function durdurOyna() { if (OYNA) { cancelAnimationFrame(OYNA.r); OYNA = null; } $("#oynatBtn").textContent = "▶ Sahne"; $("#reelBtn").textContent = "▶ Reel"; if (window.speechSynthesis) speechSynthesis.cancel(); }
function oynat(sahneler) { if (OYNA) return durdurOyna(); if (!HAZIR) return;
  const sure = i => Math.max(3.5, kelime(V.steps[i].ses) / 2.3 + 1.2) * 1000;
  let k = 0, t0 = performance.now(); OYNA = {}; konus(V.steps[sahneler[0]].ses);
  const adim = t => { const i = sahneler[k], u = (t - t0) / sure(i); if (u >= 1) { k++; t0 = t; if (k >= sahneler.length) { durdurOyna(); return; } konus(V.steps[sahneler[k]].ses); }
    const ii = sahneler[k]; try { W().__solo = (k === 0); W().__draw(ii + Math.min(.999, (t - t0) / sure(ii))); } catch (e) { }
    if (ii !== CUR) { CUR = ii; if (SEKME === "sahneler") sahneListe(); } OYNA.r = requestAnimationFrame(adim); };
  OYNA.r = requestAnimationFrame(adim); }
$("#oynatBtn").onclick = () => { if (OYNA) return durdurOyna(); if (CUR < 0) CUR = 0; $("#oynatBtn").textContent = "■ Durdur"; oynat([CUR]); };
$("#reelBtn").onclick = () => { if (OYNA) return durdurOyna(); $("#reelBtn").textContent = "■ Durdur"; oynat(V.steps.map((_, i) => i)); };

/* ---------- araçlar ---------- */
const IPUCLAR = { sec: "", yer: "Yer adı: haritaya dokunun.", deniz: "Deniz ya da koy adı: haritaya dokunun.", rota: "Rota: noktalara sırayla dokunun, sonra “Rotayı bitir”.",
  patlama: "Patlama: yere dokunun (zaman çubuğundaki anda olur).", atis: "Atış: önce atan yere, sonra hedefe dokunun.", vurgu: "Vurgu: merkeze dokunun (yanıp sönen halka).",
  ikon: "İkon: türü seçip haritaya dokunun.", simsek: "Yıldırım: düşeceği yere dokunun (zaman çubuğundaki anda; gök gürültüsü sesiyle).", bayrak: "Bayrak: ülkeyi seçip haritaya dokunun.", kamera: "Kamera: sahnenin merkezine dokunun. Gez kipinde iki parmakla yakınlaştırabilirsiniz." };
const SECENEK = { rota: ["taraf", "tur"], ikon: ["taraf", "ikonSec"], bayrak: ["bayrakSec"], atis: [], vurgu: [] };
function aracSec(a) { ARAC = a; $$("#araclar [data-a]").forEach(x => x.classList.toggle("on", x.dataset.a === a)); GECICI = []; geciciCiz();
  const ip = $("#ipucu"); ip.hidden = !IPUCLAR[a]; ip.textContent = IPUCLAR[a] || ""; ip.classList.toggle("ust", a === "rota"); $("#rotaBar").hidden = a !== "rota";
  const s = SECENEK[a] || []; $("#secenekler").hidden = !s.length; for (const id of ["taraf", "tur", "ikonSec", "bayrakSec"]) $("#" + id).hidden = !s.includes(id); boyutla(); }
$$("#araclar [data-a]").forEach(b => b.onclick = () => aracSec(b.dataset.a));
function vbNokta(cx, cy) { const r = $("#dokun").getBoundingClientRect(), vb = W().__vb(); return [(cx - r.left) / r.width * vb[0], (cy - r.top) / r.height * vb[1]]; }
function geo(cx, cy) { const [x, y] = vbNokta(cx, cy); return W().__geo(x, y); }
function geciciCiz() { const s = $("#geciciSvg"); s.innerHTML = ""; if (!GECICI.length || !HAZIR) return; let vb; try { vb = W().__vb(); } catch (e) { return; }
  s.setAttribute("viewBox", `0 0 ${vb[0]} ${vb[1]}`); const P = GECICI.map(([lo, la]) => W().__ekran(lo, la)).filter(Boolean);
  s.innerHTML = `<polyline points="${P.map(p => p.join(",")).join(" ")}" fill="none" stroke="#B4381F" stroke-width="3" stroke-dasharray="7 5"/>` + P.map(p => `<circle cx="${p[0]}" cy="${p[1]}" r="6" fill="#B4381F" stroke="#fff" stroke-width="2"/>`).join(""); }
const S = () => V.steps[CUR], f = () => { const v = +$("#zaman").value / 1000; return +(v > .9 ? .3 : v).toFixed(2); };
const ekle = (k, v) => { (S()[k] = S()[k] || []).push(v); degisti(); if (SEKME === "sahne") sagCiz(); bildir("Eklendi"); };
async function rotaBitir() { if (GECICI.length < 2) { bildir("Rota için en az iki nokta gerekir"); return; } const n = (await sor("Rota adı (boş bırakılabilir)", "", "ör. Nusret")) ?? null; if (n === null) return;
  const k = $("#tur").value, sh = { n, s: $("#taraf").value, k, p: GECICI.map(p => [+p[0].toFixed(4), +p[1].toFixed(4)]), t: [0, 1] }; if (n) sh.lab = [0, -14, "middle"]; if (k === "dot") sh.kara = true;
  GECICI = []; geciciCiz(); ekle("ships", sh); }
$("#rotaBitir").onclick = rotaBitir; $("#rotaIptal").onclick = () => { GECICI = []; geciciCiz(); }; $("#rotaGeri").onclick = () => { GECICI.pop(); geciciCiz(); };
async function dokunus(cx, cy) {
  if (!HAZIR) return; if (CUR < 0) { bildir("Önce bir sahne seçin"); return; } const g = geo(cx, cy); if (!g) return; const [lo, la] = g;
  if (ARAC === "yer") { const n = await sor("Yer adı", "", "ör. Kilitbahir"); if (n) ekle("pts", [lo, la, n, "start"]); }
  else if (ARAC === "deniz") { const n = await sor("Deniz ya da koy adı (deniz adını BÜYÜK harfle yazın; koy adı italik olur)", "", "ör. Erenköy Koyu"); if (n) ekle("seas", n === n.toLocaleUpperCase("tr-TR") ? [lo, la, n] : [lo, la, n, "b"]); }
  else if (ARAC === "rota") { GECICI.push([lo, la]); geciciCiz(); }
  else if (ARAC === "patlama") ekle("booms", [lo, la, f(), 1]);
  else if (ARAC === "atis") { GECICI.push([lo, la]); if (GECICI.length === 2) { const [a, b] = GECICI; GECICI = []; geciciCiz(); ekle("shots", [a[0], a[1], b[0], b[1], f(), Math.min(1, f() + .12)]); } else { geciciCiz(); bildir("Şimdi hedefe dokunun"); } }
  else if (ARAC === "vurgu") ekle("vurgu", [lo, la, 3, f(), Math.min(1, +(f() + .5).toFixed(2)), "", 3]);
  else if (ARAC === "ikon") { const et = await sor("İkon etiketi (boş bırakılabilir)", ""); if (et === null) return; const v = [lo, la, $("#ikonSec").value, $("#taraf").value, 1, f(), 1]; if (et) v.push(et); ekle("ikon", v); }
  else if (ARAC === "bayrak") ekle("bayrak", [lo, la, $("#bayrakSec").value, f()]);
  else if (ARAC === "simsek") ekle("simsek", [lo, la, f()]);
  else if (ARAC === "kamera") { if (MOD === "dikey") S().vcamFix = { lo: +lo.toFixed(4), la: +la.toFixed(4), w: +(S().vcamFix?.w || S().cam.w * .6).toFixed(4) }; else { S().cam.lo = +lo.toFixed(4); S().cam.la = +la.toFixed(4); } degisti(); if (SEKME === "sahne") sagCiz(); bildir("Kamera taşındı"); }
}
/* Gez kipi: tek parmakla kaydırma, iki parmakla yakınlaştırma (kamera canlı değişir) */
const PTR = new Map(); let JEST = null;
function kameraAl() { const i = CUR, s = V.steps[i]; if (MOD === "dikey") { if (!s.vcamFix) { const vb = W().__vb(), a = W().__geo(0, vb[1] / 2), b = W().__geo(vb[0], vb[1] / 2), c = W().__geo(vb[0] / 2, vb[1] / 2); s.vcamFix = { lo: c[0], la: c[1], w: b[0] - a[0] }; } return s.vcamFix; } return s.cam; }
function kameraUygula() { const i = CUR, s = V.steps[i], K = MOD === "dikey" ? s.vcamFix : s.cam;
  try { W().eval(`(()=>{const c=ST[${i}];${MOD === "dikey" ? `c.vcamFix=${JSON.stringify(K)};c.vr=vrect(c);` : `c.cam=${JSON.stringify(K)};`}})()`); } catch (e) { } goster(); }
$("#dokun").addEventListener("pointerdown", e => { try { $("#dokun").setPointerCapture(e.pointerId); } catch (er) { } PTR.set(e.pointerId, { x: e.clientX, y: e.clientY, x0: e.clientX, y0: e.clientY });
  if (ARAC === "sec" && HAZIR && CUR >= 0) { const vb = W().__vb(), a = W().__geo(0, 0), b = W().__geo(vb[0], vb[1]); const c = kameraAl();
    JEST = { cam: { ...c }, dlo: (b[0] - a[0]) / vb[0], dla: (a[1] - b[1]) / vb[1], mesafe: null, oynadi: false };
    if (PTR.size === 2) { const [p, q] = [...PTR.values()]; JEST.mesafe = Math.hypot(p.x - q.x, p.y - q.y); JEST.merkez = [(p.x + q.x) / 2, (p.y + q.y) / 2]; } } });
$("#dokun").addEventListener("pointermove", e => { const p = PTR.get(e.pointerId); if (!p) return; p.x = e.clientX; p.y = e.clientY; if (!JEST) return;
  const m = V.steps[CUR] && KAT[V.steps[CUR].map]; const c = MOD === "dikey" ? V.steps[CUR].vcamFix : V.steps[CUR].cam, r = $("#dokun").getBoundingClientRect(), vb = W().__vb(), sk = vb[0] / r.width;
  if (PTR.size >= 2 && JEST.mesafe) { const [a, b] = [...PTR.values()], d = Math.hypot(a.x - b.x, a.y - b.y), mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
    c.w = +Math.max(.01, Math.min(m ? (m.lo1 - m.lo0) : 360, JEST.cam.w * JEST.mesafe / Math.max(10, d))).toFixed(4);
    const k = c.w / JEST.cam.w; c.lo = +(JEST.cam.lo - (mx - JEST.merkez[0]) * sk * JEST.dlo * k).toFixed(4); c.la = +(JEST.cam.la + (my - JEST.merkez[1]) * sk * JEST.dla * k).toFixed(4); JEST.oynadi = true; kameraUygula(); }
  else if (PTR.size === 1) { const dx = (p.x - p.x0) * sk, dy = (p.y - p.y0) * sk; if (Math.hypot(dx, dy) < 4 && !JEST.oynadi) return;
    c.lo = +(JEST.cam.lo - dx * JEST.dlo).toFixed(4); c.la = +(JEST.cam.la + dy * JEST.dla).toFixed(4);
    if (m) { c.lo = Math.max(m.lo0, Math.min(m.lo1, c.lo)); c.la = Math.max(m.la0, Math.min(m.la1, c.la)); } JEST.oynadi = true; kameraUygula(); } });
function birak(e) { const p = PTR.get(e.pointerId); PTR.delete(e.pointerId);
  if (JEST) { if (JEST.oynadi && PTR.size === 0) { degisti(false); if (SEKME === "sahne") sagCiz(); } if (PTR.size === 0) JEST = null; else if (PTR.size === 1) { const q = [...PTR.values()][0]; q.x0 = q.x; q.y0 = q.y; JEST.cam = { ...kameraAl() }; JEST.mesafe = null; } return; }
  if (p && e.type === "pointerup" && ARAC !== "sec" && Math.hypot(p.x - p.x0, p.y - p.y0) < 12) dokunus(e.clientX, e.clientY); }
$("#dokun").addEventListener("pointerup", birak); $("#dokun").addEventListener("pointercancel", birak);

/* ---------- panel: sahneler ---------- */
const kelime = s => (s || "").split(/\s+/).filter(Boolean).length;
function sayac(n, b) { const c = n > b ? "cok" : (n < b * .5 ? "az" : "iyi"); return `<span class="sayac ${c}">${n}/${b}</span>`; }
function sekmeAc(s) { SEKME = s; $$("#sekmeler button").forEach(b => b.classList.toggle("on", b.dataset.s === s)); panelCiz(); $("#panel").scrollTop = 0; }
$$("#sekmeler button").forEach(b => b.onclick = () => sekmeAc(b.dataset.s));
function panelCiz() { if (!V) return; if (SEKME === "sahneler") sahneListe(); else if (SEKME === "sahne") sagCiz(); else if (SEKME === "hikaye") hikayeSekme(); else okunusSekme(); }
function sahneListe() { if (SEKME !== "sahneler") return; const el = $("#panel"), st = V.steps, h = st[0].hook;
  let html = `<div class="sahneler"><div class="sahne ${CUR === -1 ? "sec" : ""}" data-i="-1"><b>H</b><div><b>Hook ve kapanış sorusu</b><small>${esc(h?.ses || "— açılış kancası")}</small></div>${sayac(kelime(h?.ses), HOOKB)}</div>`;
  st.forEach((s, i) => { const b = BUTCE[i] ?? 16; html += `<div class="sahne ${i === CUR ? "sec" : ""}" data-i="${i}"><b>S${i + 1}</b><div><b>${esc(VAR.vurus[i] || "Ek sahne")}</b><small>${esc(s.date || "tarih yok")} · ${esc(s.ses || "seslendirme yok")}</small></div>${sayac(kelime(s.ses), b)}</div>`; });
  html += `</div><div class="satir"><button id="sEkle">+ Sahne ekle</button><button id="sYukari" aria-label="Yukarı taşı">↑</button><button id="sAsagi" aria-label="Aşağı taşı">↓</button><button id="sSil" class="tehlike">Sil</button></div>`;
  html += st.length !== 8 ? `<div class="ipucu">Save the Cat reeli tam 8 sahnedir; şu an ${st.length}.</div>` : "";
  html += `<div class="ipucu">Bir sahneye dokunun: harita o sahneye geçer, “Sahne” sekmesinde metni, kamerayı ve öğeleri düzenlersiniz. Haritaya öğe eklemek için yukarıdaki araç şeridini kullanın.</div>`;
  el.innerHTML = html;
  el.querySelectorAll(".sahne").forEach(d => d.onclick = () => { const i = +d.dataset.i; CUR = i; if (i === -1) hookGoster(); else goster(); sekmeAc("sahne"); });
  $("#sEkle").onclick = () => { const i = Math.max(0, CUR), k = JSON.parse(JSON.stringify(st[i])); delete k.hook; delete k.vcamFix; Object.assign(k, { date: "", ses: "", ses_en: "", text: "", ships: [], booms: [], shots: [], vurgu: [], ikon: [], bayrak: [] }); st.splice(i + 1, 0, k); CUR = i + 1; vuruslar(); degisti(); sahneListe(); };
  $("#sSil").onclick = async () => { if (st.length <= 1 || CUR < 0) return bildir("Önce silinecek sahneyi seçin"); if (!await onayla(`S${CUR + 1} silinsin mi?`, "Sil")) return; const h = st[0].hook; st.splice(CUR, 1); if (h && !st[0].hook) st[0].hook = h; CUR = Math.min(CUR, st.length - 1); vuruslar(); degisti(); sahneListe(); };
  $("#sYukari").onclick = () => tasi(-1); $("#sAsagi").onclick = () => tasi(1); }
function tasi(d) { const st = V.steps, j = CUR + d; if (CUR < 0 || j < 0 || j >= st.length) return; const h = st[0].hook; delete st[0].hook; [st[CUR], st[j]] = [st[j], st[CUR]]; st[0].hook = h; CUR = j; vuruslar(); degisti(); sahneListe(); }
function vuruslar() { V.steps.forEach((s, i) => { s.vurus = i + 1; s.perde = V.meta.title || s.perde; }); }
function hookGoster() { const h = V.steps[0].hook; if (!h || !HAZIR) return; try { W().__solo = true; W().__draw((h.adim - 1) + h.an); } catch (e) { } $("#zamanyaz").textContent = "Hook"; }

/* ---------- panel: sahne düzenleyici ---------- */
const HAVA_SEC = [["gece", "Gece"], ["şafak", "Şafak"], ["akşam", "Akşam"], ["sis", "Sis"], ["yağmur", "Yağmur"], ["kar", "Kar"], ["rüzgâr", "Rüzgâr"], ["yıldırım", "Yıldırım"], ["fırtına", "Fırtına"]];
const SEMA = {
  pts: { ad: "Yer adları", alan: [[2, "ad", "text"], [3, "yön", "sel", ["start", "end", "middle"]]] },
  seas: { ad: "Deniz / koy adları", alan: [[2, "ad", "text"], [3, "tip", "sel", ["", "b"]]] },
  ships: { ad: "Rotalar (hareket edenler)" },
  booms: { ad: "Patlamalar", alan: [[2, "an", "num"], [3, "boyut", "num"]] },
  shots: { ad: "Atışlar", alan: [[4, "t0", "num"], [5, "t1", "num"]] },
  vurgu: { ad: "Vurgular (kalp atışı)", alan: [[2, "km", "num"], [3, "t0", "num"], [4, "t1", "num"], [5, "taraf", "sel", ["", "o", "i"]], [6, "atış", "num"]] },
  ikon: { ad: "İkonlar", alan: [[2, "tür", "ikon"], [3, "taraf", "sel", ["", "o", "i"]], [4, "boyut", "num"], [5, "t0", "num"], [7, "etiket", "text"]] },
  bayrak: { ad: "Bayraklar", alan: [[2, "kod", "bayrak"], [3, "t0", "num"], [5, "boyut", "num"]] },
  simsek: { ad: "Yıldırım düşen yerler", alan: [[2, "an", "num"]] } };
const ETIKET = { "": "—", start: "sağda", end: "solda", middle: "ortada", b: "koy (italik)", o: "kızıl", i: "lacivert", big: "büyük gemi", small: "küçük gemi", sub: "denizaltı", dot: "kara" };
function secHTML(v, ops, ek = "") { return `<select ${ek}>${ops.map(o => `<option ${o === v ? "selected" : ""} value="${esc(o)}">${esc(ETIKET[o] ?? o)}</option>`).join("")}</select>`; }
function alanHTML(tip, v, ops, ek) { if (tip === "text") return `<input ${ek} value="${esc(v)}">`; if (tip === "num") return `<input ${ek} type="number" inputmode="decimal" step="0.05" value="${v ?? ""}">`;
  if (tip === "sel") return secHTML(v ?? "", ops, ek); if (tip === "ikon") return secHTML(v, VAR.ikonlar, ek); if (tip === "bayrak") return secHTML(v, VAR.bayraklar, ek); }
const oku = (el, tip) => tip === "num" ? (el.value === "" ? null : +el.value) : el.value;
function sagCiz() { if (SEKME !== "sahne") return; const el = $("#panel");
  if (CUR === -1) { const h = V.steps[0].hook || (V.steps[0].hook = { adim: 7, an: .6, ses: "" });
    el.innerHTML = `<h3>Hook · açılış kancası</h3><div class="ipucu">En çarpıcı an, sayı ya da soru. Reel bu anın ağır çekimiyle açılır (genelde S7'den). En çok ${HOOKB} kelime.</div>
      <label>Seslendirme <span id="hSay">${sayac(kelime(h.ses), HOOKB)}</span><textarea id="hSes" rows="2">${esc(h.ses)}</textarea></label><div class="okunus" id="hOk"></div>
      <div class="izgara2"><label>Hangi sahneden<select id="hAdim">${V.steps.map((_, i) => `<option value="${i + 1}" ${h.adim == i + 1 ? "selected" : ""}>S${i + 1}</option>`).join("")}</select></label>
      <label>Sahnenin anı (0–1)<input id="hAn" type="number" inputmode="decimal" step="0.05" min="0" max="1" value="${h.an}"></label></div>
      <button id="hGoster">Hook anını göster</button>
      <label>Hook İngilizce (isteğe bağlı)<textarea id="hEn" rows="2">${esc(h.ses_en || "")}</textarea></label>
      <h3>Kapanış sorusu</h3><div class="ipucu">Reel bu soruyla biter: son sahne donar, soru seslendirilir ve ekranın ortasında görünür.</div>
      <label>Soru<textarea id="qTr" rows="2">${esc(V.meta.soru || "")}</textarea></label>
      <label>Soru İngilizce (isteğe bağlı)<textarea id="qEn" rows="2">${esc(V.meta.soru_en || "")}</textarea></label>`;
    $("#hEn").oninput = e => { h.ses_en = e.target.value; sadeceKaydet(); }; $("#qTr").oninput = e => { V.meta.soru = e.target.value; sadeceKaydet(); }; $("#qEn").oninput = e => { V.meta.soru_en = e.target.value; sadeceKaydet(); };
    $("#hSes").oninput = e => { h.ses = e.target.value; okunusGoster(h.ses, "#hOk"); $("#hSay").innerHTML = sayac(kelime(h.ses), HOOKB); sadeceKaydet(); };
    $("#hAdim").onchange = e => { h.adim = +e.target.value; degisti(false); hookGoster(); }; $("#hAn").oninput = e => { h.an = +e.target.value; degisti(false); hookGoster(); };
    $("#hGoster").onclick = hookGoster; okunusGoster(h.ses, "#hOk"); return; }
  const s = S(), i = CUR, b = BUTCE[i] ?? 16, m = KAT[s.map];
  let html = `<h3>S${i + 1} · ${esc(VAR.vurus[i] || "Ek sahne")}</h3><div class="ipucu">${esc(IPUCU[i] || "")} Seslendirme en çok ${b} kelime.</div>
    <div class="izgara2"><label>Harita<select id="sHar">${HK.haritalar.map(h => `<option ${h === s.map ? "selected" : ""}>${esc(h)}</option>`).join("")}</select></label>
    <label>Tarih etiketi<input id="sTarih" value="${esc(s.date)}"></label></div>
    <div><h3 style="margin-bottom:6px">Hava ve ışık</h3><div class="satir" id="sHava">${HAVA_SEC.map(([k, ad]) => `<button data-h="${k}" class="${(s.hava || []).includes(k) ? "on" : ""}" style="min-height:32px;font-size:13px;border-radius:999px">${ad}</button>`).join("")}</div></div>
    <label>Seslendirme <span id="sSay">${sayac(kelime(s.ses), b)}</span><textarea id="sSes" rows="3">${esc(s.ses)}</textarea></label><div class="okunus" id="sOk"></div>
    <label>İngilizce seslendirme (isteğe bağlı)<textarea id="sEn" rows="2">${esc(s.ses_en || "")}</textarea></label>
    <label>Sayfa metni (web sayfasında görünür)<textarea id="sMetin" rows="3">${esc(s.text)}</textarea></label>
    <div class="izgara3"><label>Boylam<input id="cLo" type="number" inputmode="decimal" step="0.01" value="${s.cam.lo}"></label><label>Enlem<input id="cLa" type="number" inputmode="decimal" step="0.01" value="${s.cam.la}"></label><label>Genişlik (°)<input id="cW" type="number" inputmode="decimal" step="0.02" value="${s.cam.w}"></label></div>
    ${m && s.cam.w < (m.lo1 - m.lo0) * .1 ? `<div class="ipucu uyari">Kamera bu haritanın çözünürlüğüne göre çok yakın; görüntü bulanık olur. Genişliği artırın ya da bu bölge için daha yakın plan bir harita üretin (menü → Yeni harita üret).</div>` : ""}
    <div class="satir"><button id="oncekiKopya">Önceki sahnenin yer adlarını ve kamerasını al</button>${s.vcamFix ? `<button id="vOto">Dikey kamerayı otomatiğe al</button>` : ""}</div>`;
  for (const k of Object.keys(SEMA)) { const L = s[k] || []; if (!L.length) continue;
    html += `<div class="grup"><div class="gb">${SEMA[k].ad}<span class="sayac">${L.length}</span></div>`;
    L.forEach((o, j) => { html += `<div class="oge" data-k="${k}" data-j="${j}">`;
      if (k === "ships") html += `<label>ad<input data-f="n" value="${esc(o.n)}"></label><label>taraf${secHTML(o.s ?? "", ["o", "i", ""], "data-f='s'")}</label><label>işaret${secHTML(o.k || "big", ["big", "small", "sub", "dot"], "data-f='k'")}</label>
        <label>t0<input data-f="t0" type="number" inputmode="decimal" step="0.05" value="${(o.t || [0, 1])[0]}"></label><label>t1<input data-f="t1" type="number" inputmode="decimal" step="0.05" value="${(o.t || [0, 1])[1]}"></label>
        <label>batış<input data-f="sink" type="number" inputmode="decimal" step="0.05" value="${o.sink ?? ""}" placeholder="—"></label>
        <label>ikon${secHTML(o.ikon || "", [""].concat(VAR.ikonlar), "data-f='ikon'")}</label><label>bayrak${secHTML(o.bayrak || "", [""].concat(VAR.bayraklar), "data-f='bayrak'")}</label>
        <label>etiket${secHTML(o.lab ? o.lab[2] : "", ["", "start", "middle", "end"], "data-f='lab'")}</label><label>noktalar<input value="${(o.p || (o.L ? o.L[0][0] : [])).length}" disabled></label>`;
      else for (const [ix, ad, tip, ops] of SEMA[k].alan) html += `<label>${ad}${alanHTML(tip, o[ix], ops, `data-ix="${ix}" data-tip="${tip}"`)}</label>`;
      html += `<button class="sil" aria-label="Sil">Sil</button></div>`; });
    html += `</div>`; }
  html += `<details><summary>Ham veri (ileri düzey)</summary><textarea id="ham" rows="12" style="font:12px var(--mono)">${esc(JSON.stringify(s, null, 1))}</textarea><button id="hamUygula">Uygula</button></details>`;
  el.innerHTML = html;
  $("#sHar").onchange = e => { s.map = e.target.value; const m = KAT[s.map]; if (m) s.cam = { lo: +((m.lo0 + m.lo1) / 2).toFixed(4), la: +((m.la0 + m.la1) / 2).toFixed(4), w: +((m.lo1 - m.lo0) * .8).toFixed(3) }; delete s.vcamFix; degisti(); sagCiz(); };
  $("#sTarih").onchange = e => { s.date = e.target.value; degisti(); };
  $$("#sHava [data-h]").forEach(b => b.onclick = () => { const k = b.dataset.h, H = new Set(s.hava || []); H.has(k) ? H.delete(k) : H.add(k); s.hava = [...H]; if (!s.hava.length) delete s.hava; b.classList.toggle("on", H.has(k)); degisti(); });
  $("#sSes").oninput = e => { s.ses = e.target.value; okunusGoster(s.ses, "#sOk"); $("#sSay").innerHTML = sayac(kelime(s.ses), b); sadeceKaydet(); };
  $("#sMetin").oninput = e => { s.text = e.target.value; sadeceKaydet(); }; $("#sEn").oninput = e => { s.ses_en = e.target.value; sadeceKaydet(); };
  for (const [id, k] of [["cLo", "lo"], ["cLa", "la"], ["cW", "w"]]) $("#" + id).onchange = e => { s.cam[k] = +e.target.value; degisti(); };
  $("#oncekiKopya").onclick = () => { if (i < 1) return; const p = V.steps[i - 1]; s.pts = JSON.parse(JSON.stringify(p.pts || [])); s.seas = JSON.parse(JSON.stringify(p.seas || [])); s.cam = { ...p.cam }; s.map = p.map; degisti(); sagCiz(); bildir("Alındı"); };
  if ($("#vOto")) $("#vOto").onclick = () => { delete s.vcamFix; degisti(); sagCiz(); };
  el.querySelectorAll(".oge").forEach(row => { const k = row.dataset.k, j = +row.dataset.j, o = s[k][j];
    row.querySelector(".sil").onclick = () => { s[k].splice(j, 1); degisti(); sagCiz(); };
    row.querySelectorAll("[data-ix]").forEach(inp => inp.onchange = () => { o[+inp.dataset.ix] = oku(inp, inp.dataset.tip); degisti(); });
    row.querySelectorAll("[data-f]").forEach(inp => inp.onchange = () => { const fld = inp.dataset.f, v = inp.value;
      if (fld === "t0" || fld === "t1") { o.t = o.t || [0, 1]; o.t[fld === "t0" ? 0 : 1] = +v; } else if (fld === "sink") { if (v === "") delete o.sink; else o.sink = +v; }
      else if (fld === "lab") { if (!v) delete o.lab; else o.lab = v === "start" ? [10, -8, "start"] : v === "end" ? [-10, -8, "end"] : [0, -14, "middle"]; }
      else if (fld === "ikon" || fld === "bayrak") { if (v) o[fld] = v; else delete o[fld]; } else o[fld] = v;
      degisti(); }); });
  $("#hamUygula").onclick = () => { try { V.steps[i] = JSON.parse($("#ham").value); degisti(); sagCiz(); bildir("Uygulandı"); } catch (e) { bildir("JSON hatalı: " + e.message, 4); } };
  okunusGoster(s.ses, "#sOk"); }
function okunusGoster(metin, sel) { const S2 = { ...VAR.okunus, ...(V.meta.okunus || {}) }, low = (metin || "").toLocaleLowerCase("tr-TR");
  const bul = Object.keys(S2).filter(k => new RegExp(`(^|[^\\p{L}])${k.toLocaleLowerCase("tr-TR").replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?![\\p{L}])`, "u").test(low));
  const yabanci = [...new Set((metin || "").match(/\b[A-Z][\p{L}]*[qwxQWX][\p{L}]*\b|\b\p{L}*(?:[éèêàçœ]|ou|th|sh|ck|ee|oo)\p{L}*\b/gu) || [])].filter(w => !bul.some(k => w.toLocaleLowerCase("tr-TR").startsWith(k.toLocaleLowerCase("tr-TR"))));
  const e = $(sel); if (e) e.innerHTML = (bul.length ? "Okunuş: " + bul.map(k => `${esc(k)} → <b>${esc(S2[k])}</b>`).join(", ") : "") + (yabanci.length ? `<div class="uyari">Okunuşu olmayan olası yabancı ad: ${yabanci.map(esc).join(", ")} (Okunuş sekmesinden ekleyin)</div>` : ""); }

/* ---------- panel: hikâye ve okunuş ---------- */
function hikayeSekme() { const m = V.meta, ad = m.title, P = (m.paylasim = m.paylasim || {}), pk = (P[ad] = P[ad] || { kapak: "", aciklama: "", etiketler: [], yorum: "" });
  const sat = (id, lab, v, rows) => rows ? `<label>${lab}<textarea id="${id}" rows="${rows}">${esc(v)}</textarea></label>` : `<label>${lab}<input id="${id}" value="${esc(v)}"></label>`;
  $("#panel").innerHTML = `<h3>Sayfa</h3>${sat("mT", "Başlık (reelin bölüm adı da budur)", m.title)}${sat("mL", "Üst etiket", m.lab)}${sat("mLe", "Giriş paragrafı", m.lead, 3)}
    ${sat("mH", "Hazırlayan", m.hazirlayan)}${sat("mK", "Ana kaynak paragrafı", m.kaynak, 3)}${sat("mY", "Haritalar ve hareketler nasıl hazırlandı (her satır bir madde)", (m.yontem || []).join("\n"), 3)}
    ${sat("mD", "Doğrulanacak noktalar (her satır bir madde)", (m.dogrulanacak || []).join("\n"), 3)}${sat("mN", "Notlar (her satır bir not; metinde ${n(1)} ile çağrılır)", (V.notes || []).join("\n"), 3)}
    <div class="satir"><button id="lgOto">Lejantı rotalardan kur</button><button id="harEkle">Haritalar: ${esc(HK.haritalar.join(", "))}</button></div>
    <h3>Instagram paylaşımı</h3>${sat("pK", "Kapak yazısı (≤5 kelime)", pk.kapak)}${sat("pA", "Açıklama (≤120 kelime; sonda soru)", pk.aciklama, 4)}
    ${sat("pE", "Etiketler (boşlukla)", (pk.etiketler || []).join(" "))}${sat("pY", "Sabit yorum (kaynaklar)", pk.yorum, 2)}
    <button id="pKop">Paylaşım metnini kopyala</button>`;
  const bag = (id, fn) => $("#" + id).oninput = e => { fn(e.target.value); sadeceKaydet(); };
  $("#mT").onchange = e => { const eski = m.title; m.title = m.h1 = e.target.value; if (P[eski] && eski !== m.title) { P[m.title] = P[eski]; delete P[eski]; } vuruslar(); degisti(); $("#hikayeAd").textContent = m.title; };
  bag("mL", v => m.lab = v); bag("mLe", v => m.lead = v); bag("mH", v => m.hazirlayan = v); bag("mK", v => m.kaynak = v);
  bag("mY", v => m.yontem = v.split("\n").filter(Boolean)); bag("mD", v => m.dogrulanacak = v.split("\n").filter(Boolean)); bag("mN", v => V.notes = v.split("\n").filter(Boolean));
  bag("pK", v => pk.kapak = v); bag("pA", v => pk.aciklama = v); bag("pE", v => pk.etiketler = v.split(/\s+/).filter(Boolean)); bag("pY", v => pk.yorum = v);
  $("#pKop").onclick = e => kopyala(paylasimMetni(), e.target);
  $("#lgOto").onclick = () => { const set = new Map(); for (const s of V.steps) { for (const sh of s.ships || []) set.set((sh.ikon ? "dot" : sh.k || "big") + "|" + (sh.s ?? ""), 1); for (const sh of s.ships || []) if (sh.sink != null) set.set("x|", 1); if ((s.vurgu || []).length) set.set("yer|", 1); }
    const ad = { big: "gemi", small: "küçük gemi", sub: "denizaltı", dot: "kara birliği", x: "batış / kayıp", yer: "yer" }, tr = { o: "kızıl taraf", i: "lacivert taraf", "": "" };
    V.lg = [...set.keys()].map(k => { const [t, s] = k.split("|"); return [t, s, (ad[t] || t) + (tr[s] ? " · " + tr[s] : "")]; }); degisti(); bildir("Lejant kuruldu"); };
  $("#harEkle").onclick = haritaSec; }
function paylasimMetni() { const m = V.meta, pk = (m.paylasim || {})[m.title] || {}; return [`Kapak yazısı: ${pk.kapak || ""}`, "", pk.aciklama || "", "", (pk.etiketler || []).join(" "), "", "Sabit yorum (kaynaklar): " + (pk.yorum || "")].join("\n"); }
function okunusSekme() { const m = V.meta, o = (m.okunus = m.okunus || {});
  const rows = Object.entries(o).map(([k, v]) => `<tr><td><input value="${esc(k)}" data-k></td><td><input value="${esc(v)}" data-v></td><td><button data-dinle aria-label="Dinle">▶</button></td><td><button data-sil class="tehlike" aria-label="Sil">×</button></td></tr>`).join("");
  $("#panel").innerHTML = `<div class="ipucu">Ses yabancı adları buradaki okunuşla seslendirir; altyazıda özgün yazım kalır. Türkçe harflerle, kulağa geldiği gibi yazın: Irresistible → İrrezistıbıl, Bouvet → Buve. ▶ ile iPhone sesiyle dinleyebilirsiniz.</div>
    <h3>Bu hikâye</h3><table class="ok"><tr><td><b>Yazılış</b></td><td><b>Okunuş</b></td><td></td><td></td></tr>${rows}<tr><td><input id="okK" placeholder="River Clyde"></td><td><input id="okV" placeholder="Rivır Klayd"></td><td colspan="2"><button id="okE" class="ana">Ekle</button></td></tr></table>
    <button id="okKaydet">Bunları genel sözlüğe de ekle</button><h3>Genel sözlük (${Object.keys(VAR.okunus).length} ad)</h3><div class="ipucu" style="max-height:260px;overflow:auto">${Object.entries(VAR.okunus).map(([k, v]) => `${esc(k)} → ${esc(v)}`).join("<br>")}</div>`;
  $("#okE").onclick = () => { const k = $("#okK").value.trim(), v = $("#okV").value.trim(); if (k && v) { o[k] = v; sadeceKaydet(); okunusSekme(); } };
  $$("#panel tr").forEach(tr => { const ki = tr.querySelector("[data-k]"); if (!ki) return; const eski = ki.value, vi = tr.querySelector("[data-v]");
    const kay = () => { delete o[eski]; if (ki.value.trim()) o[ki.value.trim()] = vi.value.trim(); sadeceKaydet(); }; ki.onchange = kay; vi.onchange = kay;
    tr.querySelector("[data-dinle]").onclick = () => { const s = SESLI; SESLI = true; konus(vi.value); SESLI = s; };
    tr.querySelector("[data-sil]").onclick = () => { delete o[eski]; sadeceKaydet(); okunusSekme(); }; });
  $("#okKaydet").onclick = async () => { const n = await DEPO.okunusEkle(o); VAR.okunus = await DEPO.okunusSozluk(); bildir(`Genel sözlük: ${n} ad`); okunusSekme(); }; }
/* yazarken haritayı gizle, panel büyüsün */
$("#panel").addEventListener("focusin", e => { if (e.target.matches("textarea,input:not([type=range]):not([type=number])")) document.body.classList.add("yaziyor"); });
$("#panel").addEventListener("focusout", () => setTimeout(() => { if (!document.activeElement || !document.activeElement.matches("#panel textarea,#panel input")) { document.body.classList.remove("yaziyor"); boyutla(); } }, 50));

/* ---------- haritalar ---------- */
async function haritaKutulari(secili) { const L = await Promise.all(Object.entries(KAT).map(async ([k, m]) => `<div class="hk ${secili.includes(k) ? "sec" : ""}" data-h="${esc(k)}"><img src="${await DEPO.onizleUrl(k)}" alt=""><b>${esc(k)}</b><span>${esc(m.aciklama || "")}</span></div>`));
  return `<div class="haritalar">${L.join("")}</div>`; }
function kutuTikla() { $$("#dlgIc .hk").forEach(d => d.onclick = () => d.classList.toggle("sec")); }
async function haritaSec() { pencere("Hikâyenin haritaları", `${await haritaKutulari(HK.haritalar)}<p class="ipucu">İlk seçilen, yeni sahnelerin varsayılan haritasıdır. Kütüphanede olmayan bölge için “Yeni harita üret”.</p><div class="satir"><button class="ana" id="hTamam">Kaydet</button><button id="hUret">Yeni harita üret</button></div>`);
  kutuTikla(); $("#hTamam").onclick = () => { const s = $$("#dlgIc .hk.sec").map(d => d.dataset.h); if (!s.length) return bildir("En az bir harita seçin"); HK.haritalar = s; degisti(); kapat(); panelCiz(); }; $("#hUret").onclick = haritaUret; }
function haritaUret() { pencere("Yeni harita üret", `<div class="ipucu">Bölgenin haritası internetten (GMRT derinlik ve yükseklik verisi) bir kez üretilir ve telefondaki kütüphaneye eklenir. Yarım dakika ile birkaç dakika sürer.</div>
  <div class="izgara2"><label>Harita adı (küçük harf)<input id="nAd" placeholder="lepanto" autocapitalize="off"></label><label>Açıklama<input id="nAc" placeholder="İnebahtı Körfezi"></label></div>
  <label>Kapsayacağı yerler (virgülle)<input id="nYer" placeholder="İnebahtı, Patras, Kefalonya"></label>
  <label>ya da alan: boylam0, boylam1, enlem0, enlem1<input id="nAlan" placeholder="20.5, 22.6, 37.9, 38.7" inputmode="decimal"></label>
  <label>Genişlik (piksel)<select id="nGen"><option value="1200">1200 (hızlı)</option><option value="1600" selected>1600 (masaüstüyle aynı)</option></select></label>
  <button class="ana" id="nBas">Üret</button><pre class="log" id="nLog" hidden></pre>`);
  $("#nBas").onclick = async () => { const ad = $("#nAd").value.trim().toLocaleLowerCase("tr-TR").replace(/[^a-z0-9_]/g, "_"); if (!ad) return bildir("Harita adı gerekli");
    const L = $("#nLog"); L.hidden = false; const log = t => { L.textContent += t + "\n"; L.scrollTop = 1e9; }; $("#nBas").disabled = true;
    try { let al;
      if ($("#nAlan").value.trim()) al = $("#nAlan").value.split(/[,\s]+/).filter(Boolean).map(Number);
      else { log("Yerler aranıyor…"); const P = await DEPO.noktalar($("#nYer").value); if (!P.length) throw new Error("Yer bulunamadı");
        const los = P.map(p => p[1]), las = P.map(p => p[2]), w = Math.max(Math.max(...los) - Math.min(...los), .1), h = Math.max(Math.max(...las) - Math.min(...las), .1);
        al = [Math.min(...los) - w * .2, Math.max(...los) + w * .2, Math.min(...las) - h * .2, Math.max(...las) + h * .2]; }
      if (al.length !== 4 || al.some(isNaN)) throw new Error("Alan dört sayı olmalı");
      const r = await HARITA.uret(...al, +$("#nGen").value, log);
      await DEPO.haritaKaydet(ad, Object.assign(r.meta, { aciklama: $("#nAc").value, kaynak: "gmrt" }), r.png, r.onizle); KAT = await DEPO.kutuphane();
      log(`Hazır: ${ad} (${r.meta.w}×${r.meta.h}). Haritalar penceresinden seçebilirsiniz.`);
      if (HK && !HK.haritalar.includes(ad)) { HK.haritalar.push(ad); degisti(false); log("Bu hikâyenin haritalarına eklendi."); }
    } catch (e) { log("Hata: " + e.message); } $("#nBas").disabled = false; }; }

/* ---------- hikâyeler ---------- */
async function hikayeMenu() { const L = await DEPO.hikayeler();
  pencere("Hikâyeler", `<div class="liste">${L.map(a => `<button data-a="${esc(a)}" class="${a === AD ? "sec" : ""}"><span>${esc(a.replace(/_/g, " "))}</span><small>${a === AD ? "açık" : ""}</small></button>`).join("")}</div>
    <div class="satir"><button class="ana" id="yeniH">+ Yeni hikâye</button><button id="iceH">Dosyadan içe aktar</button></div>
    <p class="ipucu">Masaüstü stüdyodaki bir hikâyeyi taşımak için <b>hikayeler\\&lt;ad&gt;\\hikaye.json</b> dosyasını telefona gönderip “Dosyadan içe aktar” deyin. Telefondaki hikâyeyi masaüstüne götürmek için menü → “Hikâyeyi dışa aktar”.</p>`);
  $$("#dlgIc .liste button").forEach(b => b.onclick = async () => { kapat(); await yukle(b.dataset.a); });
  $("#yeniH").onclick = yeniHikaye; $("#iceH").onclick = () => $("#dosyaSec").click(); }
$("#hikayeBtn").onclick = hikayeMenu;
$("#dosyaSec").onchange = async e => { const fl = e.target.files[0]; e.target.value = ""; if (!fl) return;
  try { const r = await DEPO.iceAktar(await fl.text(), fl.name.replace(/\.json$/i, "").replace(/^hikaye$/i, "")); KAT = await DEPO.kutuphane(); kapat(); await yukle(r.ad);
    bildir(r.eksik.length ? `İçe aktarıldı; eksik harita: ${r.eksik.join(", ")}` : "İçe aktarıldı", 4); } catch (er) { bildir("İçe aktarılamadı: " + er.message, 5); } };
async function yeniHikaye() { pencere("Yeni hikâye", `<label>Hikâyenin adı<input id="yAd" placeholder="Nusret'in gecesi"></label><p class="ipucu">Haritaları seçin (birden çok olabilir; ilk seçilen başlangıç haritası):</p>${await haritaKutulari([])}<div class="satir"><button class="ana" id="yTamam">Oluştur</button><button id="yUret">Yeni harita üret</button></div>`);
  kutuTikla(); $("#yUret").onclick = haritaUret;
  $("#yTamam").onclick = async () => { const ad = $("#yAd").value.trim(), h = $$("#dlgIc .hk.sec").map(d => d.dataset.h); if (!ad || !h.length) return bildir("Ad ve en az bir harita gerekli");
    const a = await DEPO.yeniHikaye(ad, h); kapat(); await yukle(a); bildir("Hikâye oluşturuldu. Şimdi menüden “Kartı içe aktar”."); }; }

/* ---------- menü ---------- */
const MENU = [["kart", "Kartı içe aktar", "NotebookLM çıktısını sahnelere yerleştir"], ["kabin", "Seslendirme kabini", "Kendi sesinizle okuyun"], ["denetle", "Denetle", "Sahne sayısı, kelime bütçesi, rotalar"],
  ["dikey", "Dikey kontrol tablosu", "Her sahnenin reel kadrajı tek görselde"], ["kapak", "Kapak görseli", "9:16 taktik kapak, en sert andan"], ["sonvideo", "Son üretilen video", "Telefona kaydedilen son reel"], ["yer", "Yer ara", "Bir yeri bulup sahneye ekleyin"], ["haritalar", "Haritalar", "Hikâyenin haritalarını seçin"],
  ["uret", "Yeni harita üret", "Kütüphanede olmayan bölge için"], ["sayfa", "Sayfayı dışa aktar", "Tek dosyalık kaydırmalı web sayfası"], ["disa", "Hikâyeyi dışa aktar", "Yedek ya da masaüstüne taşımak için .json"],
  ["kilavuz", "Kılavuz", "İş akışı ve NotebookLM istemi"], ["sil", "Hikâyeyi sil", "Bu hikâyeyi telefondan kaldır"]];
$("#menuBtn").onclick = () => { pencere("Menü", `<div class="liste">${MENU.map(([k, a, b]) => `<button data-m="${k}" ${k === "sil" ? 'class="tehlike"' : ""}><span>${a}</span><small>${b}</small></button>`).join("")}</div><p class="ipucu" style="text-align:center">Sürüm ${SURUM}</p>`);
  $$("#dlgIc [data-m]").forEach(b => b.onclick = () => ({ kart: kartPencere, kabin, denetle, dikey: dikeyTablo, kapak: kapakPencere, sonvideo: sonVideo, yer: yerAra, haritalar: haritaSec, uret: haritaUret, sayfa: sayfaDisa, disa: hikayeDisa, kilavuz, sil: hikayeSil })[b.dataset.m]()); };
async function denetle() { pencere("Denetim", `<p class="ipucu">Denetleniyor…</p>`);
  const r = HARITA.denetle(V), d = await HARITA.deniz(V);
  $("#dlgIc").innerHTML = `<ul class="denetim">${r.O.map(o => `<li class="${o.b ? "b" : o.u ? "u" : ""}">${o.u ? "! " : ""}${esc(o.b || o.t)}${o.k ? `<br><small>${esc(o.k)}</small>` : ""}</li>`).join("")}</ul>
    <p><b>${r.sorun ? r.sorun + " uyarı" : "Kalıba uygun"}</b></p><h3>Gemi rotaları</h3><ul class="denetim">${d.S.length ? d.S.map(s => `<li class="u">${esc(s)}</li>`).join("") : "<li>Sorun yok: rotalar denizde.</li>"}</ul>`; }
async function dikeyTablo() { pencere("Dikey kontrol tablosu", `<p class="ipucu">Her sahnenin 9:16 reel kadrajı hazırlanıyor…</p>`);
  try { const b = await VIDEO.kontrolTablosu(HK, document.documentElement.dataset.theme), u = URL.createObjectURL(b);
    $("#dlgIc").innerHTML = `<img src="${u}" alt="Sahnelerin dikey kadrajları" style="width:100%;border-radius:8px"><button class="ana" id="dkPay">Görseli kaydet / paylaş</button>`;
    $("#dkPay").onclick = () => paylas(b, `${AD}_dikey.png`); } catch (e) { $("#dlgIc").innerHTML = `<p class="ipucu uyari">Hazırlanamadı: ${esc(e.message)}</p>`; } }
/* marka: logo (yuvarlak kırpılır), kanal ve marka yazısı telefonda saklanır; depoya girmez */
async function logoHazirla(blob) { if (!blob) { window.__MARKA_LOGO = null; return; }
  const im = await createImageBitmap(blob), k = Math.min(im.width, im.height), R = 256, cv = document.createElement("canvas"); cv.width = cv.height = R; const c = cv.getContext("2d");
  c.beginPath(); c.arc(R / 2, R / 2, R / 2, 0, 7); c.clip(); c.drawImage(im, (im.width - k) / 2 + k * .02, (im.height - k) / 2 + k * .02, k * .96, k * .96, 0, 0, R, R); window.__MARKA_LOGO = cv; }
/* hikâyenin kapak ayarlarıyla tek kapak üretir ve seçili kapak olarak kaydeder */
async function kapakOtomatik() { const m = V.meta, P = (m.paylasim = m.paylasim || {}), pk = (P[m.title] = P[m.title] || { kapak: "", aciklama: "", etiketler: [], yorum: "" });
  const o = Object.assign({}, KAPAK.VARSAYILAN, pk.kapakTasarim || {}), MK = VAR.marka || {}; if (!o.kanal && MK.kanal) o.kanal = MK.kanal; if (!o.marka && MK.marka) o.marka = MK.marka;
  if (!o.s1 && !o.s2 && pk.kapak) { const p = pk.kapak.split(/\s*[,;–—:|]\s*|\s+-\s+/).filter(Boolean); o.s1 = p[0] || ""; o.s2 = p.slice(1).join(" "); }
  if (!o.s1 && !o.s2) return null;
  const r = await KAPAK.uret(HK, o), k = { blob: r.blob, kare: r.kare, zaman: Date.now() }; await DEPO.ayarYaz("kapak:" + AD, k); return k; }
function kapakPencere() { const m = V.meta, P = (m.paylasim = m.paylasim || {}), pk = (P[m.title] = P[m.title] || { kapak: "", aciklama: "", etiketler: [], yorum: "" });
  const o = (pk.kapakTasarim = Object.assign({}, KAPAK.VARSAYILAN, pk.kapakTasarim || {}));
  const MK = VAR.marka || {}; if (!o.kanal && MK.kanal) o.kanal = MK.kanal; if (!o.marka && MK.marka) o.marka = MK.marka;
  /* yazı boşsa Instagram kapak yazısından: "26 mayın, 3 zırhlı" → iki satır */
  if (!o.s1 && !o.s2 && pk.kapak) { const p = pk.kapak.split(/\s*[,;–—:]\s*|\s+-\s+/).filter(Boolean); o.s1 = p[0] || ""; o.s2 = p.slice(1).join(" "); }
  const gir = (k, lab, ph) => `<label>${lab}<input data-k="${k}" value="${esc(o[k] || "")}" placeholder="${esc(ph || "")}"></label>`;
  const sec = (k, lab, L) => `<label>${lab}<select data-k="${k}">${L.map(([v, t]) => `<option value="${v}" ${o[k] === v ? "selected" : ""}>${t}</option>`).join("")}</select></label>`;
  pencere("Kapak görseli", `<div id="kpSecili"></div><p class="ipucu">Kapak, videonun en sert anından (patlama, batış ya da kilitlenme) ve aşağıdaki yazılardan oluşur. Başlığı kopyalamayın: en çok 3–4 kelime; 1. satır ölçek/neden, 2. satır sonuç/kayıp.</p>
    <div class="satir">${gir("s1", "1. satır", "26 MINES")}${sec("s1r", "Renk", [["beyaz", "Beyaz"], ["sari", "Taktik sarı"]])}</div>
    <div class="satir">${gir("s2", "2. satır", "BROKE CHURCHILL")}${sec("s2r", "Renk", [["kirmizi", "Kırmızı"], ["beyaz", "Beyaz"]])}</div>
    ${gir("alt", "Alt başlık (ince)", "DARDANELLES (1915) - TACTICAL BRIEFING")}
    <div class="satir">${gir("mavi", "Mavi taraf", "ALLIED FLEET")}${gir("kirmizi", "Kırmızı taraf", "OTTOMAN MINES")}</div>
    <div class="satir">${gir("kanal", "Kanal", "@kanaladı")}${gir("marka", "Marka yazısı", "MARKA")}</div><div class="satir"><button id="kpLogo">${window.__MARKA_LOGO ? "Logoyu değiştir" : "Logo yükle"}</button>${window.__MARKA_LOGO ? '<button id="kpLogoSil" class="tehlike">Logoyu kaldır</button>' : ""}</div><p class="ipucu">Logo videoda sağ üst köşede filigran olur ve 8 saniyede bir döner; kapakta imzanın yanında durur.</p>
    ${sec("kare", "İlk aday", [["oto", "Otomatik (S5 patlama → S4 kilitlenme)"], ...V.steps.map((_, i) => [String(i + 1), `S${i + 1}`])])}
    <div id="kpUyari"></div><button class="ana" id="kpUret">Kapağı üret</button><div id="kpSonuc"></div>`);
  const uyar = () => { const U = KAPAK.denetle(o, m.title); $("#kpUyari").innerHTML = U.map(u => `<p class="ipucu uyari">${esc(u)}</p>`).join(""); };
  $$("#dlgIc [data-k]").forEach(e => e.oninput = e.onchange = () => { o[e.dataset.k] = e.value; sadeceKaydet(); uyar();
    if (e.dataset.k === "kanal" || e.dataset.k === "marka") { VAR.marka = Object.assign({}, VAR.marka || {}, { [e.dataset.k]: e.value }); DEPO.ayarYaz("marka", VAR.marka); } }); uyar();
  $("#kpLogo").onclick = () => { const i = document.createElement("input"); i.type = "file"; i.accept = "image/*";
    i.onchange = async () => { const f = i.files[0]; if (!f) return; VAR.marka = Object.assign({}, VAR.marka || {}, { logo: f }); await DEPO.ayarYaz("marka", VAR.marka); await logoHazirla(f); bildir("Logo kaydedildi"); kapakPencere(); }; i.click(); };
  if ($("#kpLogoSil")) $("#kpLogoSil").onclick = async () => { if (VAR.marka) delete VAR.marka.logo; await DEPO.ayarYaz("marka", VAR.marka || {}); await logoHazirla(null); kapakPencere(); };
  const seciliGoster = async () => { const k = await DEPO.ayar("kapak:" + AD), d = $("#kpSecili"); if (!d) return;
    if (!k || !k.blob) { d.innerHTML = ""; return; }
    d.innerHTML = `<h3>Seçili kapak</h3><img src="${URL.createObjectURL(k.blob)}" alt="Seçili kapak" style="width:46%;border-radius:8px;display:block;margin:0 auto 8px"><p class="ipucu">Video üretilince ilk saniyeye konur. Kapak yoksa video üretilirken kendiliğinden hazırlanır.</p>
      <div class="satir"><button id="kpPay">Kapağı kaydet / paylaş</button><button id="kpKal" class="tehlike">Kapağı kaldır</button></div>`;
    $("#kpPay").onclick = () => paylas(k.blob, `${AD}_kapak.png`); $("#kpKal").onclick = async () => { await DEPO.ayarYaz("kapak:" + AD, null); seciliGoster(); }; };
  seciliGoster();
  $("#kpUret").onclick = async () => { const d = $("#kpSonuc"); d.innerHTML = `<p class="ipucu">Kapak hazırlanıyor…</p>`; $("#kpUret").disabled = true;
    try { await DEPO.ayarYaz("kapak:" + AD, null); const k = await kapakOtomatik(); d.innerHTML = k ? "" : `<p class="ipucu uyari">Önce 1. ve 2. satırı yazın.</p>`; await seciliGoster(); $("#dlgIc").scrollTop = 0; }
    catch (e) { d.innerHTML = `<p class="ipucu uyari">Hazırlanamadı: ${esc(e.message)}</p>`; }
    const b = $("#kpUret"); if (b) b.disabled = false; }; }
async function sayfaDisa() { const html = await DEPO.sayfaKur(HK, null), b = new Blob([html], { type: "text/html" });
  pencere("Sayfa dışa aktarıldı", `<p>Tek dosyalık web sayfası hazır (${(b.size / 1048576).toFixed(1)} MB). İnternette yayımlayabilir ya da bilgisayara gönderebilirsiniz.</p><div class="satir"><button class="ana" id="spPay">Dosyayı kaydet / paylaş</button><a id="spAc" href="${URL.createObjectURL(b)}" target="_blank"><button>Sayfayı aç</button></a></div>`);
  $("#spPay").onclick = () => paylas(b, `${AD}.html`); }
async function hikayeDisa() { const t = await DEPO.disaAktar(AD); await paylas(new Blob([t], { type: "application/json" }), `${AD}.json`); }
async function hikayeSil() { if (!await onayla(`“${V.meta.title}” ve kayıtları telefondan silinsin mi? Geri alınamaz.`, "Sil")) return; await DEPO.hikayeSil(AD); kapat(); const L = await DEPO.hikayeler(); if (L.length) await yukle(L[0]); else await ornekYukle(); bildir("Silindi"); }
function yerAra() { pencere("Yer ara", `<div class="satir" style="flex-wrap:nowrap"><input id="yaQ" placeholder="ör. Gelibolu, Çanakkale"><button class="ana" id="yaBtn">Ara</button></div><div id="yaSonuc"></div>`);
  const ara = async () => { const q = $("#yaQ").value.trim(); if (!q) return; $("#yaSonuc").innerHTML = `<p class="ipucu">Aranıyor…</p>`;
    try { const r = await DEPO.yer(q); if (!r) throw new Error("bulunamadı");
      $("#yaSonuc").innerHTML = `<p><b>${esc(q)}</b>: ${r[0]}, ${r[1]}<br><small>${esc(r[2])}</small></p><div class="satir"><button class="ana" id="yaEkle">Bu sahneye yer adı olarak ekle</button><button id="yaKam">Kamerayı buraya al</button></div>`;
      $("#yaEkle").onclick = () => { if (CUR < 0) CUR = 0; ekle("pts", [r[0], r[1], q, "start"]); kapat(); };
      $("#yaKam").onclick = () => { if (CUR < 0) CUR = 0; S().cam.lo = r[0]; S().cam.la = r[1]; degisti(); kapat(); panelCiz(); }; }
    catch (e) { $("#yaSonuc").innerHTML = `<p class="ipucu uyari">“${esc(q)}” bulunamadı. Adı farklı yazın (ör. “Gelibolu, Çanakkale”) ya da “Yer adı” aracıyla haritaya dokunun.</p>`; } };
  $("#yaBtn").onclick = ara; $("#yaQ").onkeydown = e => { if (e.key === "Enter") ara(); }; setTimeout(() => $("#yaQ").focus(), 80); }

/* ---------- kart içe aktarma ---------- */
const ISTEM = `Kaynaklardaki olayı Instagram/Shorts için 60 saniyelik, Save the Cat yapısında bir harita hikâyesine çevir. Aşağıdaki BİÇİM'i BİREBİR kullan: başına, sonuna açıklama, not, kod bloğu, kalın yazı ekleme; her satır "ANAHTAR:" ile başlasın.

DOĞRULUK
- Yalnızca kaynaktaki olgular: hava, duygu, diyalog, sayı, süre, çatışma uydurma. Sayıları kaynaktaki gibi ver; kesin değilse "yaklaşık" de. Kaynaklar çelişiyorsa temkinli olanı al ve DOĞRULANACAK'a yaz.
- Olayların sırasını ve aralarındaki zamanı koru. S1–S8 tarih sırasıyla ilerler; geriye dönüş yok (yalnızca HOOK ileriden bir an gösterir).
- Hareket ve olay alanına da yalnızca kaynakta geçeni yaz: kaynakta olmayan ışıldak, telsiz anonsu, patlama, rota durağı ekleme. Bir gemiyi kaynakta varmadığı bir yerden geçirme.
- Sonuç ve etki cümleleri ("savaşı uzattı", "istifa etti", "değiştirdi") ancak kaynakta aynen varsa; yoksa yazma ya da DOĞRULANACAK'a ekle.

ÜSLUP
- Soğukkanlı, kesik, olgu dili; şimdiki zaman, kısa ve yüklem odaklı cümleler. Duygusal sıfat (kahramanca, haince, muazzam, destansı vb.) yok; gerilimi eylem, sayı, mesafe ve zaman baskısı kurar.
- Soru cümlesi yalnızca SORU ve SORU_EN satırlarında olur; HOOK ve S1–S8'de soru, "acaba", "mi/mı" yok. "Fark edecek mi?" değil "İki devriyenin arasından fark edilmeden geçiyor."
- Sahne metinlerinde sayı ve tarihleri yazıyla yaz (on sekiz Mart, beş yüz yetmiş kişi).
- Kelime sınırı: HOOK 8 · S1 12 · S2 14 · S3 12 · S4 14 · S5 16 · S6 12 · S7 18 · S8 16 · SORU 12.

SAHNELER (olayın türü ne olursa olsun bu iskelet; kaynakta karşılığı yoksa uydurma, gerçek akışa uydur)
HOOK: S7'nin en çarpıcı olgusu · S1 açılış: ana güç ya da ana olay harekete geçer, mutlaka yer değiştiren bir unsur · S2 karşı hamle ya da hazırlık · S3 risk, engel ya da keşif · S4 dönüm anı, karşılaşma · S5 ilk temas ya da ilk sonuç · S6 kriz, kayıp, çıkmaz · S7 doruk ve sonuç, sayılarla · S8 kalıcı sonuç ve bugün · SORU: yorumlarda tartışma açacak "Ya öyle olmasaydı?" türü soru.

SATIR SONLARI (yalnızca S1–S8 Türkçe satırlarında, bu sırayla; boş alan da yazılır: | olay:  | hava: )
- yer: o sahnede haritada gösterilecek en çok 4 yer, virgülle; her yerin yanına koordinatını yaz: Kabatepe (40.20, 26.27), Morto Koyu (40.04, 26.19)
- tarih: ekranda etiket olur, seslendirilmez; RAKAMLA, en çok 4 kelime (18 Mart 1915 · 7/8 Mart 1915 gecesi · 18 Mart 1915, 13.54 · Bugün).
- hareket: Ad [taraf, tür] Başlangıç (enlem, boylam) → güzergâh noktaları (enlem, boylam) → Varış (enlem, boylam). Birden çoksa noktalı virgül. Birlikte, hat hâlinde giden gemiler TEK satırda filo olarak yazılır, ayrı ayrı değil: Fransız hattı: Suffren, Bouvet, Gaulois, Charlemagne [lacivert, büyük gemi, bayrak Fransız] Başlangıç (…) → Varış (…). Gemiler aynı rotada yan yana, aynı anda ilerler; sonraki sahnelerde her biri kendi adıyla anılır (batış Bouvet). Yerinde duran için tek nokta: Goliath [lacivert, büyük gemi] Morto Koyu (40.04, 26.19)
- KOORDİNAT KURALI: Başlangıç, güzergâh ve varış her harekette ZORUNLUDUR ve her noktanın yanında (enlem, boylam) ondalık noktayla yazılır (40.20, 26.27). Kaynakta koordinat varsa onu, yoksa o yerin bilinen gerçek koordinatını yaz; yer kesin bilinmiyorsa yaklaşık koordinat ver ve başına ~ koy: Triumph'un batış yeri (~40.21, 26.24).
  Başlangıç noktasını UYDURMA: kaynakta nereden çıktığı yazıyorsa onu yaz; yazmıyorsa aracın kaynakta geçen son bilinen konumunu yaz ve bunu DOĞRULANACAK'a ekle. Güzergâhta kaynakta geçen ara durakları (uğradığı liman, geçtiği boğaz/ada) sırasıyla yaz; kaynakta olmayan liman ya da durak ekleme.
  DENİZ GEÇİŞ NOKTASI: rota bir adalar arasından, dar bir boğazdan ya da bir yarımadanın çevresinden geçiyorsa, gemi karadan geçmesin diye arada açık denizde nokta ver ve adına “açığı / batısı / güneyi” koy (Sakız batısı (38.50, 25.70); Limni güneyi (39.50, 25.90)). Bunlar tarihî durak değil, yol tarifidir; uzak rotalarda her 150–200 km'de bir yeterlidir.
- olay: aşağıdaki biçimlerle, noktalı virgülle; kartta yazdığın sırayla oynar.
- hava: gece yapılan iş → gece; sabaha karşı → şafak; akşam → akşam; kaynakta geçiyorsa sis, yağmur, kar, rüzgâr, fırtına. Gündüz ve bilgi yoksa boş.
- Animasyon yalnızca bu alanlardan kurulur; her sahnede en az bir hareket ya da olay olsun (hareket yoksa vurgu, ikon ya da bayrak).
- HARİTA ANLATIYI TAŞIR: seslendirmede geçen her mekânsal unsur (mayın hattı, set, tabya, batarya, cephe, konvoy, döşenen mayın, dönüş yeri) o sahnenin hareket ya da olay alanında da yazılır. Haritada görünmeyen şeyi anlatma.
- S1 DÜZENİ KURAR: hikâyenin başındaki durağan düzeni (mevcut mayın hatları, tabyalar, kıyı bataryaları, gemilerin bekleme yerleri) kaynakta varsa S1'in olay alanına yaz; sonraki sahnelerde yeniden yazma, kendiliğinden durur.

YER ADLARI (yer, hareket, olay alanlarının hepsi)
- Yalnızca OpenStreetMap'te tek başına bulunan nokta adları: şehir, köy, burun, koy, liman, ada, kale, fener (Kilitbahir, Nara Burnu, Morto Koyu, Kumkale, Kabatepe, Gökçeada).
- "-açığı, -önleri, -yakınları, -civarı, -bölgesi, -kıyıları" ekleme; denizdeki olay için en yakın kıyı noktasını yaz, gemi kendiliğinden denize oturur.
- Deniz, boğaz, bölge adı yazma (Ege Denizi, Akdeniz, Çanakkale Boğazı, Gelibolu Yarımadası).
- Denizde olan şeyin (batış, patlama, mayın, dönüş yeri) koordinatı DENİZDEKİ noktadır: koyun ortası, kıyıdan biraz açık; aynı adlı köyün ya da kasabanın kara üstündeki koordinatı değil.
- Haritanın çok dışında kalan yer (Londra, Paris) için olay yazma; o bilgi yalnızca seslendirmede geçer.
- Haritanın dışından gelen ya da dışarı giden için de gerçek yeri koordinatıyla yaz (U-21 [kızıl, denizaltı] Cattaro (42.42, 18.77) → Gökçeada (40.16, 25.84)): araç haritanın o yöndeki kenarından girer.

ARAÇ KUTUSU (başka bir şey yazarsan haritada görünmez)
Taraf: kızıl (anlatılan taraf) · lacivert (karşı taraf) · sarı (kıyı mevzisi, batarya ya da üçüncü taraf); nötrse yazma; hikâye boyunca değişmez.
Tür: büyük gemi · küçük gemi · denizaltı · at · süvari · asker · ordu · tank · araba · tren · uçak · helikopter · paraşüt · füze · yelkenli · vapur · kara (nokta). Bayrak için: [kızıl, asker, bayrak Osmanlı]
Kıyı tabyası ya da bataryası ateş ediyorsa atıştan önce onu aynı sahnede ikon olarak koy (ikon kale [sarı, Mecidiye Tabyası] YER); atış yerine yakın bir gemi varsa ateşi o gemi açıyormuş gibi görünür, gerekirse o gemiyi “çekilir” ile kaldır.
Olaylar: atış A → B · bombardıman A → B (üç atış) · torpido A → B · patlama YER · büyük patlama YER · batış GEMİ · vurgu YER · işaret GEMİ (yanıp sönen lamba) · ışıldak GEMİ → HEDEF · anons GEMİ (telsiz/hoparlör) · bayrak ÜLKE YER · yıldırım YER · ikon TÜR [taraf, etiket] YER
Mayınlar (kalıcıdır; bir kez yazılan hat sonraki bütün sahnelerde durur, tekrar yazma):
  · mayın hattı A (enlem, boylam) → B (enlem, boylam) (12) — tek hat; uçlar iki ayrı nokta, parantezde mayın sayısı
  · mayın hatları N: A → B / C → D — birbirine paralel N hat; yalnızca İLK hattın iki ucunu ve SON hattın iki ucunu yaz, aradakiler eşit aralıkla çizilir. Boğazı enine kesen hatlar için uçlar karşılıklı iki kıyıdadır: mayın hatları 10: Kıyı-1 (enlem, boylam) → Karşı kıyı-1 (enlem, boylam) / Kıyı-2 (enlem, boylam) → Karşı kıyı-2 (enlem, boylam). Koordinatları kaynaktan ya da yerin gerçek konumundan al; kesin değilse ~ koy ve DOĞRULANACAK'a yaz
  · mayın döşer GEMİ A (enlem, boylam) → B (enlem, boylam) (26) — gemi A'dan B'ye giderken mayınlar arkasına tek tek düşer. Aynı sahnenin hareket alanında o geminin rotası A ve B'den GEÇMELİ: Nusret [kızıl, küçük gemi] Nara Burnu (40.19, 26.40) → A (…) → B (…) → Nara Burnu (40.19, 26.40)
İkonlar: kale · kule · fener · köprü · cami · kilise · saray · ev · köy · şehir · fabrika · yel değirmeni · rüzgâr türbini · ambar · silo · okul · hastane · banka · anıt · kapı · çan · dağ · orman · ağaç · ada · su · balık · çadır · çapa · havaalanı · radar · dürbün · hedef · kılıç · çatışma · kalkan · bomba · yangın · maden · petrol · ölüm · mezar · sağlık · kızılay · kızılhaç · anlaşma · belge · taç · nişan · bayrak · hoparlör · telsiz · uydu
Hava: gece · şafak · akşam · sis · yağmur · kar · rüzgâr · yıldırım · fırtına
Bayraklar: Türk · Osmanlı · İngiliz · Fransız · Alman · Rus · İtalyan · Yunan · Amerikan · Avusturya · Bulgar · Avustralya · Yeni Zelanda · Japon · İspanyol
Aktörler: hareket satırında adı geçen her araç sonraki sahnelerde son yerinde durur; yalnızca yer değiştirince yeniden yaz. İşi biten aracı olay alanında “çekilir AD” ile haritadan kaldır (çekilir tarama tekneleri, zırhlı); yoksa sonraki sahneleri kalabalıklaştırır. Olaylarda yer yerine aktör adını, her yerde aynı yazımla kullan (torpido U-21 → Triumph · batış Triumph). Bir aracın adı hikâye içinde değişse de (Goeben → Yavuz) haritada ilk adı kalır; yeni ad yalnızca seslendirmede geçer. Aynı nokta adı (Atış yeri, Koy girişi) kartın her yerinde aynı koordinatı gösterir; farklı yer için farklı ad ver. Her torpido ve her atış ayrı olaydır: üç torpido için üç kez “torpido A → B” yaz. Filo satırına yalnızca aynı türden gemileri koy (zırhlılar bir filo, muhripler ayrı filo). aktör olmayan yerleri koordinatıyla yaz (bombardıman Triumph → Kabatepe (40.20, 26.27)). Gemiden gemiye atışta arada kara varsa atan gemi denizden dolaşıp yaklaşır.
Saat: tarihe saat yazarsan (01.15) ve önceki sahneden farklıysa ekranda saat döner.
_EN satırları yalnızca çeviridir; alan ekleme.

BAŞLIK: (en çok 6 kelime)
BAŞLIK_EN: başlığın İngilizcesi (İngilizce videoda ekrandaki bölüm adı olur)
CTA: videonun son saniyelerinde ekranda çıkan çağrı, en çok 6 kelime, BÜYÜK HARF; dizinin sonraki bölümünü çağırsın (SIRADAKİ: KARADENİZ BASKINI · TAKİP ET)
CTA_EN: aynısı İngilizce (NEXT: THE BLACK SEA RAID · FOLLOW)
ÇEVİRİ: İngilizce videoda ekranda yazacak her Türkçe kelimenin karşılığı, noktalı virgülle: hareket satırlarındaki araç ve filo adları, yer adlarındaki ortak sözcükler, tarihteki sözcükler (Erenköy Koyu = Erenköy Bay; Mecidiye Tabyası = Mecidiye Battery; tarama tekneleri = minesweepers; zırhlı = battleship; İngiliz hattı = British line). Özel adlar (Kepez, Nusret, Bouvet) aynen kalır, yazma. Ay adları kendiliğinden çevrilir.
KAPAK: 1. satır | 2. satır | alt başlık — kapak görseli; BÜYÜK HARF, toplam en çok 4 kelime, başlığın aynısı olamaz; 1. satır ölçek/neden (26 MAYIN), 2. satır sonuç/kayıp (3 ZIRHLI BATTI); alt başlık yer ve yıl (ÇANAKKALE 1915)
KAPAK_EN: aynısı İngilizce (26 MINES | BROKE CHURCHILL | DARDANELLES (1915) - TACTICAL BRIEFING)
LEJANT_EN: lacivert taraf | kızıl taraf, kapak lejantı için (ALLIED FLEET | OTTOMAN MINES)
AÇIKLAMA: Instagram açıklaması, en çok 120 kelime; ilk cümle ikinci bir kanca, sonda yorum sorusu
AÇIKLAMA_EN:
ETİKETLER: 3–5 etiket, boşlukla (#Çanakkale #18Mart)
ETİKETLER_EN:
YORUM: sabit yorum: kaynaklar (yazar, yıl, eser) ve "harita sayfası profildeki bağlantıda"
YABANCI: yabancı özel adlar ve Türkçe okunuşu (Triumph = Trayamf; Bouvet = Buve)
DOĞRULANACAK: kontrol edilecek noktalar, noktalı virgülle (yoksa boş)
HOOK:
S1:  | yer:  | tarih:  | hareket:  | olay:  | hava:
S2:  | yer:  | tarih:  | hareket:  | olay:  | hava:
S3:  | yer:  | tarih:  | hareket:  | olay:  | hava:
S4:  | yer:  | tarih:  | hareket:  | olay:  | hava:
S5:  | yer:  | tarih:  | hareket:  | olay:  | hava:
S6:  | yer:  | tarih:  | hareket:  | olay:  | hava:
S7:  | yer:  | tarih:  | hareket:  | olay:  | hava:
S8:  | yer:  | tarih:  | hareket:  | olay:  | hava:
SORU:
HOOK_EN:
S1_EN:
S2_EN:
S3_EN:
S4_EN:
S5_EN:
S6_EN:
S7_EN:
S8_EN:
SORU_EN:`;
function kartCoz(t) { const o = { sahne: {}, en: {} };
  for (const ham of t.split(/\r?\n/)) { const sat = ham.replace(/^[\s*\-•#]+/, "").replace(/\*\*/g, "");
    const d0 = sat.match(/^DO[ĞG]RULANACAK\s*[:：]\s*(.*)$/i); if (d0) { o.dogrulanacak = d0[1].split(";").map(x => x.trim()).filter(x => x && !/^(yok|-|—)$/i.test(x)); continue; }
    const c0 = sat.match(/^(ÇEVİRİ|CEVIRI)\s*[:：]\s*(.*)$/i); if (c0) { o.ceviri = c0[2]; continue; }
    const ct = sat.match(/^CTA(_EN)?\s*[:：]\s*(.*)$/i); if (ct) { o[ct[1] ? "ctaEn" : "cta"] = ct[2].trim(); continue; }
    const b0 = sat.match(/^(BAŞLIK|BASLIK)_EN\s*[:：]\s*(.*)$/i); if (b0) { o.baslikEn = b0[2].trim(); continue; }
    const p0 = sat.match(/^(KAPAK|LEJANT|AÇIKLAMA|ACIKLAMA|ETİKETLER|ETIKETLER|YORUM)(_EN)?\s*[:：]\s*(.*)$/i);
    if (p0) { const k = p0[1].toLocaleUpperCase("tr-TR").replace("Ç", "C").replace("İ", "I"); (o.paylas = o.paylas || {})[k + (p0[2] ? "_EN" : "")] = p0[3].trim(); continue; }
    const m = sat.match(/^(BAŞLIK|BASLIK|YABANCI|HOOK|SORU|S\s*([1-9]\d?))(_EN)?\s*(?:\([^)]*\))?\s*[:：]\s*(.*)$/i); if (!m) continue;
    const anah = m[1].toUpperCase().replace(/\s/g, ""), en = !!m[3], [metin, ...ek] = m[4].split("|").map(x => x.trim());
    if (anah.startsWith("BA")) o.baslik = metin; else if (anah === "YABANCI") o.yabanci = m[4];
    else if (anah === "HOOK") en ? o.en.hook = metin : o.hook = metin; else if (anah === "SORU") en ? o.en.soru = metin : o.soru = metin;
    else { const i = +m[2] - 1; if (en) o.en[i] = metin; else { const s = { ses: metin }; for (const e of ek) { const k = e.match(/^(yer|tarih|rota|hareket|olay|hava)\s*:\s*(.*)$/i); if (k) s[k[1].toLocaleLowerCase("tr-TR")] = /^(yok|-+|—|–|boş|yok\.)$/i.test(k[2].trim()) ? "" : k[2].trim(); } o.sahne[i] = s; } } }
  return o; }
async function kartUygula(o, yerEkle, log) {
  if (o.baslik) { const eski = V.meta.title, P = V.meta.paylasim || {}; V.meta.title = V.meta.h1 = o.baslik; if (P[eski] && eski !== o.baslik) { P[o.baslik] = P[eski]; delete P[eski]; } }
  if (o.paylas) { const P = (V.meta.paylasim = V.meta.paylasim || {}), pk = (P[V.meta.title] = P[V.meta.title] || { kapak: "", aciklama: "", etiketler: [], yorum: "" }), Y = o.paylas, bos = x => !x || /^(yok|-|—)$/i.test(x);
    const kp = (Y.KAPAK_EN || Y.KAPAK || "").split("|").map(x => x.trim()); if (kp[0]) { const t = (pk.kapakTasarim = Object.assign({}, window.KAPAK ? KAPAK.VARSAYILAN : {}, pk.kapakTasarim || {})); t.s1 = kp[0]; t.s2 = kp[1] || ""; if (kp[2]) t.alt = kp[2]; }
    if (Y.KAPAK) pk.kapak = Y.KAPAK.split("|").slice(0, 2).join(" ").trim();
    const lj = (Y.LEJANT_EN || "").split("|").map(x => x.trim()); if (lj[0] && pk.kapakTasarim) { pk.kapakTasarim.mavi = lj[0]; if (lj[1]) pk.kapakTasarim.kirmizi = lj[1]; }
    if (!bos(Y.ACIKLAMA)) pk.aciklama = Y.ACIKLAMA; if (!bos(Y.ACIKLAMA_EN)) pk.aciklama_en = Y.ACIKLAMA_EN;
    if (!bos(Y.ETIKETLER)) pk.etiketler = Y.ETIKETLER.split(/\s+/).filter(Boolean); if (!bos(Y.ETIKETLER_EN)) pk.etiketler_en = Y.ETIKETLER_EN.split(/\s+/).filter(Boolean);
    if (!bos(Y.YORUM)) pk.yorum = Y.YORUM; }
  if (o.ceviri) { const C = (V.meta.ceviri = V.meta.ceviri || {}); for (const p of o.ceviri.split(";")) { const [k, v] = p.split("=").map(x => (x || "").trim()); if (k && v) C[k] = v; } }
  if (o.baslikEn) V.meta.title_en = o.baslikEn;
  if (o.cta) V.meta.cta = o.cta; if (o.ctaEn) V.meta.cta_en = o.ctaEn;
  if (o.yabanci) { V.meta.okunus = V.meta.okunus || {}; for (const p of o.yabanci.split(/[;,]/)) { const [k, v] = p.split("=").map(x => (x || "").trim()); if (k && v) V.meta.okunus[k] = v; } }
  { const sq = [["HOOK", o.hook], ...Object.entries(o.sahne).map(([i, s]) => [`S${+i + 1}`, s.ses])].filter(([, x]) => /\?/.test(x || "")).map(([k]) => k); if (sq.length) log(`uyarı: ${sq.join(", ")} soru cümlesi içeriyor (şablona göre soru yalnızca SORU satırında olmalı)`); }
  const kutu = await DEPO.kutuHesapla(HK.haritalar), AKTOR = new Map(), MAYIN = [];
  const n = Math.max(8, ...Object.keys(o.sahne).map(k => +k + 1)); while (V.steps.length < n) { const k = JSON.parse(JSON.stringify(V.steps.at(-1))); delete k.hook; Object.assign(k, { ses: "", text: "", date: "", ships: [], booms: [], shots: [] }); V.steps.push(k); }
  for (const [i, s] of Object.entries(o.sahne)) { const st = V.steps[+i]; st.ses = s.ses; if (!st.text) st.text = s.ses; if (s.tarih) st.date = s.tarih; if (o.en[i]) st.ses_en = o.en[i];
    if (yerEkle && s.yer) { log(`S${+i + 1}: ${s.yer}`);
      try { const r = await DEPO.sec(s.yer, kutu), P = r.noktalar;
        for (const [ad, lo, la] of P) if (!(st.pts || []).some(p => p[2] === ad)) (st.pts = st.pts || []).push([lo, la, ad, "start"]);
        const uy = r.haritalar.filter(h => HK.haritalar.includes(h)); if (uy.length) st.map = uy[0]; else if (r.haritalar.length) { st.map = r.haritalar[0]; }
        if (P.length) { const los = P.map(p => p[1]), las = P.map(p => p[2]), lo0 = Math.min(...los), lo1 = Math.max(...los), la0 = Math.min(...las), la1 = Math.max(...las);
          const mw = KAT[st.map] ? (KAT[st.map].lo1 - KAT[st.map].lo0) * .12 : .3; st.cam = { lo: +((lo0 + lo1) / 2).toFixed(4), la: +((la0 + la1) / 2).toFixed(4), w: +Math.max((lo1 - lo0) * 1.8, (la1 - la0) * 2.6, .3, mw).toFixed(3) }; }
        if (P.length < s.yer.split(/,(?![^()\[\]]*[)\]])/).filter(x => x.trim()).length) log("  bazı yerler bulunamadı");
      } catch (e) { log("  bulunamadı: " + e.message); } }
    if (s.hava !== undefined) { const H = s.hava.split(/[,;]/).map(x => x.trim().toLocaleLowerCase("tr-TR")).filter(x => x && !/^(yok|-|—|gündüz)$/.test(x)); if (H.length) st.hava = H; else delete st.hava; }
    if (yerEkle) {
      try { const E = await OTOMATIK.kur(st, s, { yerBul: async ad => { const r = await DEPO.yer(ad, kutu); return r ? [r[0], r[1]] : null; }, yerDis: async ad => { const r = await DEPO.yer(ad, null); return r ? [r[0], r[1]] : null; }, harita: HARITA.pikseller, haritalar: Object.keys(KAT), kat: KAT, bayraklar: VAR.bayraklar, log, aktorler: AKTOR, mayinlar: MAYIN });
        if (E.length) log(`  animasyon: ${E.join(", ")}`); } catch (e) { log("  animasyon kurulamadı: " + e.message); } }
    /* sahnenin haritası kütüphaneden kendiliğinden seçilir; hikâyede yoksa eklenir */
    if (st.map && KAT[st.map] && !HK.haritalar.includes(st.map)) { HK.haritalar.push(st.map); log(`  harita eklendi: ${st.map}`); }
    /* hiç hareket ya da olay yoksa ilk yere vurgu halkası: sahne hareketsiz kalmasın */
    if (!(st.ships || []).some(x => !x.fix) && !["booms", "shots", "vurgu", "ikon", "simsek", "bayrak", "mines", "torpido", "isaret", "anons", "isildak"].some(k => (st[k] || []).length) && (st.pts || []).length) {
      st.vurgu = [[st.pts[0][0], st.pts[0][1], 3, .08, .95, "", 4]]; log(`  S${+i + 1}: hareket yoktu, ${st.pts[0][2]} üzerine vurgu eklendi`); } }
  const h = V.steps[0].hook || (V.steps[0].hook = { adim: 7, an: .6, ses: "" });
  /* hook anı: hikâyenin en sert anı (batış > büyük patlama > torpido/atış), yoksa S7 */
  { let en = null; V.steps.forEach((st, i) => { const ad = (p, t) => { if (!en || p > en.p || (p === en.p && Math.abs(i - 6) < Math.abs(en.i - 6))) en = { p, i, t }; };
      for (const sh of st.ships || []) if (sh.sink != null) ad(3, sh.sink - .04); for (const b of st.booms || []) if (b[3] >= 2) ad(2, b[2]); for (const x of st.torpido || []) ad(1.5, x[5]); });
    if (en) { h.adim = en.i + 1; h.an = +Math.max(.05, Math.min(.95, en.t)).toFixed(2); log(`Hook: S${en.i + 1} sahnesinin en sert anından`); } }
  if (o.hook) h.ses = o.hook; if (o.en.hook) h.ses_en = o.en.hook;
  if (o.soru) V.meta.soru = o.soru; if (o.en.soru) V.meta.soru_en = o.en.soru;
  if (o.dogrulanacak && o.dogrulanacak.length) { V.meta.dogrulanacak = [...new Set([...(V.meta.dogrulanacak || []), ...o.dogrulanacak])]; log && log(`Doğrulanacak ${o.dogrulanacak.length} nokta “Hikâye” sekmesine eklendi.`); }
  vuruslar(); degisti(); ciz(); }
const GORSEL = ["pts", "seas", "ships", "booms", "shots", "vurgu", "ikon", "bayrak", "simsek", "mines", "hava", "vcamFix", "nus", "net", "blast", "all", "torpido", "isaret", "anons", "isildak"];
function sahneTemizle(st) { for (const k of GORSEL) delete st[k]; st.pts = []; st.seas = []; st.ships = []; st.text = ""; st.date = ""; st.ses = ""; delete st.ses_en; }
async function kartPencere() { pencere("Kartı içe aktar", `<p class="ipucu">NotebookLM'e (ya da başka bir yapay zekâya) aşağıdaki istemi kaynakla birlikte verin, çıktıyı buraya yapıştırın. Metinler, tarihler, okunuşlar, soru, rotalar, olaylar ve hava sahnelere kendiliğinden yerleşir.</p>
  <div class="satir"><button id="istemKop">İstemi kopyala</button></div><details><summary>İstemi göster</summary><pre class="log" id="istem"></pre></details>
  <label>Çıktı<textarea id="kartMetin" rows="10" placeholder="BAŞLIK: …&#10;HOOK: …&#10;S1: … | yer: … | tarih: …"></textarea></label>
  <label>Nereye<select id="kartKip"><option value="yeni">Yeni hikâye olarak (önerilen)</option><option value="ustune">Açık hikâyenin (“${esc(V.meta.title || AD)}”) üzerine yaz</option></select></label>
  <div id="kartHar"><p class="ipucu" style="margin:0">Haritalar (yerlerin bulunduğu bölge; birden çok seçilebilir):</p>${await haritaKutulari(HK.haritalar)}</div>
  <button class="ana" id="kartUy">Aktar</button><pre class="log" id="kartLog" hidden></pre>`);
  kutuTikla(); $("#istem").textContent = ISTEM; $("#istemKop").onclick = e => kopyala(ISTEM, e.target);
  $("#kartKip").onchange = e => { $("#kartHar").hidden = e.target.value !== "yeni"; };
  $("#kartUy").onclick = async () => { const o = kartCoz($("#kartMetin").value), ns = Object.keys(o.sahne).length; if (!ns && !o.hook) return bildir("Kart biçimi tanınmadı. Satırlar “S1: …” gibi başlamalı.", 4);
    const kip = $("#kartKip").value, H = $$("#dlgIc .hk.sec").map(d => d.dataset.h);
    if (kip === "yeni" && !H.length) return bildir("En az bir harita seçin", 3);
    if (kip === "ustune" && !await onayla(`“${V.meta.title || AD}” hikâyesinin bütün sahneleri silinip karttan yeniden kurulacak. Devam edilsin mi?`, "Üzerine yaz")) return;
    $("#kartUy").disabled = true; const L = $("#kartLog"); L.hidden = false; const log = t => { L.textContent += t + "\n"; L.scrollTop = 1e9; };
    if (kip === "yeni") { const ad = await DEPO.yeniHikaye(o.baslik || "Yeni hikâye", H); await yukle(ad); log(`Yeni hikâye: ${o.baslik || ad}`); }
    else { GECMIS.push(JSON.stringify(HK)); V.steps.forEach(sahneTemizle); delete V.meta.soru; delete V.meta.soru_en; V.meta.dogrulanacak = []; log("Eski sahne içeriği temizlendi."); }
    log(`${ns} sahne, hook ${o.hook ? "var" : "yok"}, soru ${o.soru ? "var" : "yok"}`); await kartUygula(o, true, log);
    log("Tamam. Video için üstteki “Video” düğmesine dokunun."); bildir("Kart aktarıldı"); }; }

/* ---------- seslendirme kabini ---------- */
function parcalar() { const L = [], st = V.steps, h = st[0].hook;
  if (h && h.ses) L.push({ ad: "hook_01", bas: "Hook", metin: h.ses });
  st.forEach((s, i) => { if (s.ses) L.push({ ad: `sahne_${String(i + 1).padStart(2, "0")}`, bas: `S${i + 1}`, metin: s.ses }); });
  if (V.meta.soru) L.push({ ad: `soru_${String(st.length).padStart(2, "0")}`, bas: "Soru", metin: V.meta.soru });
  return L; }
const MIME = ["audio/mp4", "audio/webm;codecs=opus", "audio/webm"].find(t => window.MediaRecorder && MediaRecorder.isTypeSupported(t)) || "";
let AKIS = null, OLCER = null;
async function mikrofon() { if (AKIS && AKIS.active) return AKIS; AKIS = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: true, autoGainControl: false, channelCount: 1 } });
  const ac = new (window.AudioContext || window.webkitAudioContext)(), an = ac.createAnalyser(); an.fftSize = 512; ac.createMediaStreamSource(AKIS).connect(an); const buf = new Uint8Array(an.fftSize);
  OLCER = () => { an.getByteTimeDomainData(buf); let m = 0; for (const v of buf) m = Math.max(m, Math.abs(v - 128)); return m / 128; }; return AKIS; }
function kaydedici(ad) { let at = false; const P = [], r = new MediaRecorder(AKIS, MIME ? { mimeType: MIME, audioBitsPerSecond: 128000 } : {});
  r.ondataavailable = e => e.data.size && P.push(e.data);
  const bitti = new Promise(ok => r.onstop = async () => { if (at) return ok(); await DEPO.kayitKaydet(AD, ad, new Blob(P, { type: r.mimeType || MIME || "audio/mp4" })); await DEPO.kayitSil(AD, ad + "#W"); ok(); });
  r.start(250); return { dur: () => { r.stop(); return bitti; }, at: () => { at = true; r.stop(); return bitti; } }; }
async function kabin() { const L = parcalar(); if (!L.length) return bildir("Önce sahnelerin seslendirme metinlerini yazın", 3); const K = await DEPO.kayitlar(AD);
  pencere("Seslendirme kabini", `<p class="ipucu">Kendi sesinizle okuyun. <b>Hepsini sırayla oku</b>: metin ekranda büyük görünür; her parçayı okuyunca <b>Sonraki</b>ye dokunun. Beğenmediğiniz parçayı aşağıdan tek başına yeniden okuyabilirsiniz. Sessiz bir odada telefonu ağzınızdan 15–20 cm uzakta tutun. Video üretirken “Kendi kaydım”ı seçin.</p>
    <div class="satir"><button class="ana" id="kHepsi">● Hepsini sırayla oku</button><button id="kEksik">● Yalnız eksikleri oku</button></div>
    <div class="ipucu">Bilgisayardaki stüdyoda “Benim sesim” ile üretilen dosyaları (hikayeler\&lt;ad&gt;\ses_klon klasöründeki hook_01.wav, sahne_01.wav… ve .json dosyaları) buraya aktarabilirsiniz; video üretirken “Kendi kaydım”ı seçin.
    <div class="satir" style="margin-top:6px"><button id="kIce">Ses dosyalarını içe aktar</button></div></div>
    <input type="file" id="kDosya" multiple accept="audio/*,.wav,.m4a,.mp3,.json,application/json" hidden>
    <div id="kListe">${L.map(p => `<div class="parca" data-ad="${p.ad}"><b>${p.bas}</b><div>${esc(p.metin)}<div class="durum ${K[p.ad] ? "var" : "yok"}">${K[p.ad] ? "kayıtlı" : "kayıt yok"}</div>
      <div class="satir" style="margin-top:6px"><button data-k>● Oku</button>${K[p.ad] ? `<button data-d>▶ Dinle</button>` : ""}</div></div></div>`).join("")}</div><audio id="kDinle" hidden playsinline></audio>`);
  $$("#kListe [data-d]").forEach(b => b.onclick = async () => { const bl = await DEPO.kayit(AD, b.closest(".parca").dataset.ad), a = $("#kDinle"); a.src = URL.createObjectURL(bl); a.play(); });
  $$("#kListe [data-k]").forEach(b => b.onclick = () => prompter([L.find(p => p.ad === b.closest(".parca").dataset.ad)]));
  $("#kIce").onclick = () => $("#kDosya").click();
  $("#kDosya").onchange = async e => { const F = [...e.target.files]; e.target.value = ""; let n = 0, w = 0, atla = [];
    for (const fl of F) { const m = fl.name.match(/^((?:hook|sahne|soru)_\d{2})\.(\w+)$/i); if (!m) { atla.push(fl.name); continue; } const parca = m[1].toLowerCase();
      if (m[2].toLowerCase() === "json") { try { await DEPO.kayitKaydet(AD, parca + "#W", JSON.parse(await fl.text())); w++; } catch (er) { atla.push(fl.name); } }
      else { await DEPO.kayitKaydet(AD, parca, fl); n++; } }
    bildir(`${n} ses dosyası aktarıldı${w ? `, ${w} kelime zamanı` : ""}${atla.length ? `; tanınmayan: ${atla.join(", ")}` : ""}`, 5); kabin(); };
  $("#kHepsi").onclick = () => prompter(L); $("#kEksik").onclick = () => { const E = L.filter(p => !K[p.ad]); E.length ? prompter(E) : bildir("Eksik parça yok"); }; }
async function prompter(L) { try { await mikrofon(); } catch (e) { return bildir("Mikrofona erişilemedi. Ayarlar → Safari → Mikrofon iznini verin.", 5); }
  kapat(); const el = document.createElement("div"); el.className = "prompter"; document.body.append(el);
  let k = 0, kay = null, t0 = 0, dur = false; const bekle = []; let kilit = null; try { kilit = await navigator.wakeLock.request("screen"); } catch (e) { }
  const ciz = () => { const p = L[k]; el.innerHTML = `<div class="pu"><span>${p.bas} · ${k + 1}/${L.length}</span><span class="kirmizi"><i></i><span id="pSure">0.0 sn</span></span></div>
    <div class="metin"><p>${esc(p.metin)}</p><div class="sira">${L[k + 1] ? "Sıradaki: " + esc(L[k + 1].bas + " — " + L[k + 1].metin) : "Son parça"}</div></div>
    <div class="seviye"><b id="pSev"></b></div>
    <div class="alt"><button class="ana" id="pSon">${L[k + 1] ? "Sonraki →" : "Bitir"}</button><button id="pTekrar">↺ Baştan oku</button><button id="pIptal">Kaydetmeden çık</button></div>`;
    $("#pSon").onclick = sonraki; $("#pTekrar").onclick = tekrar; $("#pIptal").onclick = () => bitir(true); };
  const basla = () => { kay = kaydedici(L[k].ad); t0 = performance.now(); };
  function sonraki() { bekle.push(kay.dur()); k++; if (k >= L.length) return bitir(false); ciz(); basla(); }
  function tekrar() { kay.at(); ciz(); basla(); }
  async function bitir(iptal) { if (dur) return; dur = true; if (iptal && kay) kay.at(); else if (kay && k < L.length) bekle.push(kay.dur()); await Promise.all(bekle); el.remove(); try { kilit && kilit.release(); } catch (e) { } kabin(); }
  const dong = () => { if (dur) return; const sv = $("#pSev"), sr = $("#pSure"); if (sv && OLCER) sv.style.width = Math.min(100, OLCER() * 180) + "%"; if (sr) sr.textContent = ((performance.now() - t0) / 1000).toFixed(1) + " sn"; requestAnimationFrame(dong); };
  ciz(); basla(); dong(); }

/* ---------- video ---------- */
let VIDEO_DURDUR = false;
async function videoPencere() {
  const yukluler = {}; for (const k of Object.keys(PIPER.SESLER)) yukluler[k] = await PIPER.yuklu(k);
  const ayar = (await DEPO.ayar("video")) || {};
  const sesOps = (dil) => Object.entries(PIPER.SESLER).filter(([, v]) => v.dil === dil).sort((a, b) => (b[1].url ? 1 : 0) - (a[1].url ? 1 : 0)).map(([k, v]) => `<option value="${k}">${esc(v.ad)}${yukluler[k] || v.url ? "" : " · indirilecek (60 MB)"}</option>`).join("");
  pencere("Video üret", `<label>Seslendirme<select id="vSes"><option value="tts">Telefon sesi (telefonda üretilen yapay ses)</option><option value="kendi">Kendi kaydım (seslendirme kabini)</option><option value="yok">Seslendirmesiz</option></select></label>
    <div id="vTtsAyar" class="izgara2"><label>Ses<select id="vKon"><optgroup label="Türkçe">${sesOps("tr")}</optgroup><optgroup label="İngilizce">${sesOps("en")}</optgroup></select><button id="vPaket" style="margin-top:6px">+ Ses paketi ekle (.onnx)</button></label>
    <label>Canlılık<select id="vTon"><option value="sakin">Sakin</option><option value="canli" selected>Canlı</option><option value="cok">Çok canlı</option></select></label></div>
    <div class="izgara2"><label>Seslendirme dili<select id="vDil"><option value="tr">Türkçe</option><option value="en">İngilizce (sahnelerdeki İngilizce metin)</option></select></label>
    <label>Altyazı dili<select id="vADil"><option value="">Sesle aynı (kelime kelime)</option><option value="tr">Türkçe</option><option value="en">İngilizce</option></select></label>
    <label>Altyazı<select id="vAlt"><option value="on">Açık</option><option value="off">Kapalı</option></select></label><label>Efektler<select id="vEf"><option value="kisik">Kısık</option><option value="on" selected>Normal</option><option value="guclu">Güçlü</option><option value="off">Kapalı</option></select></label>
    <label>Kodlama<select id="vYon"><option value="oto">Otomatik (hızlı)</option><option value="gercek">Gerçek zamanlı kayıt</option></select></label><label>Harita teması<select id="vTema"><option value="light">Açık</option><option value="dark">Koyu</option><option value="taktik">Taktik</option></select></label><label>Yalnız şu sahneler<input id="vAd" placeholder="hepsi · ör. 8 ya da 5-8" inputmode="text"></label></div>
    <p class="ipucu" id="vNot"></p>
    <button class="ana" id="vBas">Üret</button>
    <div id="vIs" hidden><div class="ilerleme"><b id="vBar"></b></div><div class="satir" style="justify-content:space-between"><span id="vYuzde" class="ipucu" style="background:none;padding:0"></span><button id="vDur" class="tehlike">Durdur</button></div><pre class="log" id="vLog"></pre></div>
    <div id="vRes"></div>`);
  for (const [id, k] of [["vYon", "yontem"], ["vSes", "ses"], ["vKon", "konusmaci"], ["vTon", "ton"], ["vDil", "dil"], ["vADil", "altyazi_dil"], ["vAlt", "altyazi"], ["vEf", "efekt"], ["vTema", "tema"]]) if (ayar[k] != null && $("#" + id).querySelector(`option[value="${ayar[k]}"]`)) $("#" + id).value = ayar[k];
  const not = () => { const s = $("#vSes").value; $("#vTtsAyar").hidden = s !== "tts";
    $("#vNot").innerHTML = s === "tts" ? "Ses telefonda üretilir; ilk kullanımda seçilen ses modeli bir kez indirilir (yaklaşık 60 MB, Wi-Fi önerilir), sonra internetsiz çalışır. iPhone'un kendi sesi (Siri sesleri) videoya kaydedilemediği için videoda bu sesler kullanılır; önizlemede 🔈 düğmesiyle iPhone sesini dinleyebilirsiniz."
      : s === "kendi" ? "Seslendirme kabininde okuduğunuz parçalar kullanılır; altyazı kaydınıza göre zamanlanır. Kaydı olmayan parça sessiz kalır."
      : "Ses yok: süreler metin uzunluğundan hesaplanır; efektler ve ambiyans kalır.";
    if ($("#vDil").value === "en" && s === "tts" && PIPER.SESLER[$("#vKon").value].dil !== "en") $("#vNot").innerHTML += "<br><b class='uyari'>İngilizce seslendirme için İngilizce bir ses seçin.</b>"; };
  $("#vSes").onchange = not; $("#vDil").onchange = not; $("#vKon").onchange = not; not();
  $("#vPaket").onclick = () => { const i = document.createElement("input"); i.type = "file"; i.multiple = true; i.accept = ".onnx,.json,application/json,application/octet-stream";
    i.onchange = async () => { const F = [...i.files], o = F.find(f => /\.onnx$/i.test(f.name)), j = F.find(f => /\.json$/i.test(f.name));
      if (!o || !j) return bildir("İki dosyayı birlikte seçin: tr_TR-benim-medium.onnx ve tr_TR-benim-medium.onnx.json", 5);
      const ad = await sor("Bu sesin adı", "Benim sesim"); if (ad === null) return;
      try { const k = await PIPER.yerelEkle(o, j, ad || "Benim sesim"); bildir("Ses paketi eklendi"); await videoPencere(); $("#vSes").value = "tts"; $("#vKon").value = k; $("#vKon").dispatchEvent(new Event("change")); }
      catch (e) { bildir("Eklenemedi: " + e.message, 5); } };
    i.click(); };
  $("#vBas").onclick = async () => {
    VIDEO.sesKilidiAc(); VIDEO.uyanikBaslat(); VIDEO.yontem($("#vYon").value);
    const a = { yontem: $("#vYon").value, ses: $("#vSes").value, konusmaci: $("#vKon").value, ton: $("#vTon").value, dil: $("#vDil").value, altyazi_dil: $("#vADil").value, altyazi: $("#vAlt").value, efekt: $("#vEf").value, adimlar: $("#vAd").value.trim(), tema: $("#vTema").value };
    DEPO.ayarYaz("video", a); VIDEO_DURDUR = false; $("#vBas").disabled = true; $("#vIs").hidden = false; $("#vRes").innerHTML = ""; $("#vLog").textContent = "";
    const log = (t, ust) => { const L = $("#vLog"); if (!L) return; if (ust && L.textContent.endsWith("\n") && L._son && t.startsWith(L._son)) { L.textContent = L.textContent.replace(/[^\n]*\n$/, t + "\n"); } else L.textContent += t + "\n"; L._son = ust ? t.slice(0, 18) : null; L.scrollTop = 1e9; };
    const ilerle = u => { const b = $("#vBar"); if (b) { b.style.width = (u * 100).toFixed(1) + "%"; $("#vYuzde").textContent = `Video: %${Math.round(u * 100)}`; } };
    $("#vDur").onclick = () => { VIDEO_DURDUR = true; };
    durdurOyna();
    window.__URETIM = 1;
    try { let k = await DEPO.ayar("kapak:" + AD);
      if (!k || !k.blob) { log("Kapak hazırlanıyor…"); k = await kapakOtomatik(); }
      VIDEO.kapak(k && k.blob ? await createImageBitmap(k.blob) : null); if (k && k.blob) log("Kapak videonun ilk saniyesine konuyor."); else log("Kapak yazısı yok; kapaksız üretiliyor (Menü → Kapak görseli)."); } catch (e) { VIDEO.kapak(null); log("Kapak hazırlanamadı: " + e.message); }
    try { const r = await VIDEO.uret(AD, HK, a, log, ilerle, () => VIDEO_DURDUR);
      /* biter bitmez telefona kaydedilir: ekran kapansa, uygulama kapansa da kaybolmaz */
      try { await DEPO.ayarYaz("sonVideo", { blob: r.blob, ad: `bolum_${DEPO.guvenli(V.meta.title || AD).toLocaleLowerCase("tr-TR")}.${r.uzanti}`, baslik: V.meta.title || AD, sure: r.sure, srt: r.srt, seslendirme: r.seslendirme, zaman: Date.now(), alindi: false }); log("Video telefona kaydedildi (Menü → Son üretilen video)."); } catch (e) { log("Telefona kaydedilemedi: " + e.message); }
      try { const ac = new (window.AudioContext || window.webkitAudioContext)(), o = ac.createOscillator(), g = ac.createGain(); o.frequency.value = 880; g.gain.setValueAtTime(.2, ac.currentTime); g.gain.exponentialRampToValueAtTime(.001, ac.currentTime + .6); o.connect(g); g.connect(ac.destination); o.start(); o.stop(ac.currentTime + .6); } catch (e) { }
      const ad = `bolum_${DEPO.guvenli(V.meta.title || AD).toLocaleLowerCase("tr-TR")}.${r.uzanti}`, u = URL.createObjectURL(r.blob);
      $("#vRes").innerHTML = `<video controls playsinline src="${u}"></video><p class="ipucu">${r.sure.toFixed(1)} sn · ${(r.blob.size / 1048576).toFixed(1)} MB</p>
        <button class="ana" id="vKay">Videoyu kaydet / paylaş</button><div class="satir"><button id="vSrt">Altyazı (.srt)</button><button id="vPay">Paylaşım metnini kopyala</button><button id="vSesM">Seslendirme metnini kopyala</button></div>
        <p class="ipucu">“Videoyu kaydet / paylaş” → “Videoyu Kaydet” ile Fotoğraflar'a kaydedin ya da doğrudan Instagram'ı seçin.</p>`;
      $("#vKay").onclick = async () => { await paylas(r.blob, ad, V.meta.title); sonVideoAlindi(); }; $("#vSrt").onclick = () => paylas(new Blob([r.srt], { type: "text/plain" }), ad.replace(/\.\w+$/, ".srt"));
      $("#vPay").onclick = e => kopyala(paylasimMetni(), e.target); $("#vSesM").onclick = e => kopyala(r.seslendirme, e.target);
      log("Hazır."); $("#vRes").scrollIntoView({ behavior: "smooth" });
    } catch (e) { log("Hata: " + (e.message || e)); if (/Durduruldu/.test(e.message)) bildir("Durduruldu"); }
    VIDEO.uyanikBitir(); window.__URETIM = 0; if (window.__GUNCEL_BEKLIYOR) bildir("Uygulamanın yeni sürümü hazır; videoyu kaydettikten sonra uygulamayı kapatıp açın.", 6);
    const b = $("#vBas"); if (b) b.disabled = false; };
}
$("#videoBtn").onclick = videoPencere;
async function sonVideoAlindi() { try { const o = await DEPO.ayar("sonVideo"); if (o) { o.alindi = true; await DEPO.ayarYaz("sonVideo", o); } } catch (e) { } }
async function sonVideo() { const o = await DEPO.ayar("sonVideo");
  if (!o || !o.blob) return pencere("Son üretilen video", `<p class="ipucu">Telefonda kayıtlı video yok.</p>`);
  const u = URL.createObjectURL(o.blob), ne = new Date(o.zaman).toLocaleString("tr-TR", { dateStyle: "short", timeStyle: "short" });
  pencere("Son üretilen video", `<video controls playsinline src="${u}"></video><p class="ipucu">${esc(o.baslik)} · ${ne} · ${o.sure.toFixed(1)} sn · ${(o.blob.size / 1048576).toFixed(1)} MB</p>
    <button class="ana" id="svKay">Videoyu kaydet / paylaş</button><div class="satir"><button id="svSrt">Altyazı (.srt)</button><button id="svSes">Seslendirme metnini kopyala</button></div>`);
  $("#svKay").onclick = async () => { await paylas(o.blob, o.ad, o.baslik); sonVideoAlindi(); };
  $("#svSrt").onclick = () => paylas(new Blob([o.srt || ""], { type: "text/plain" }), o.ad.replace(/\.\w+$/, ".srt")); $("#svSes").onclick = e => kopyala(o.seslendirme || "", e.target); }

/* ---------- kılavuz ---------- */
function kilavuz() { pencere("Kılavuz", `<h3>Bir reel, adım adım</h3><ol style="margin:0;padding-left:1.2em;display:grid;gap:6px">
  <li>Hikâyeyi 10 cümleye indirin (HOOK, S1–S8, SORU). NotebookLM için hazır istem: menü → Kartı içe aktar → İstemi kopyala.</li>
  <li>Hikâye adına dokunun → <b>Yeni hikâye</b>: ad verin, harita(ları) seçin.</li>
  <li>Menü → <b>Kartı içe aktar</b>: çıktıyı yapıştırın. Metinler, tarihler, okunuşlar ve soru sahnelere yerleşir; yer adları haritaya eklenir.</li>
  <li>Sahneleri tek tek tamamlayın. Araç şeridinden aracı seçip haritaya dokunun. Rota: noktalara sırayla dokunun, “Rotayı bitir”. Gez kipinde parmakla kaydırıp iki parmakla yakınlaştırın; kamera o sahne için kaydedilir.</li>
  <li><b>Dikey 9:16</b> düğmesiyle reel kadrajını görün; ▶ Sahne ve ▶ Reel ile oynatın, 🔈 ile iPhone sesiyle dinleyin. Hata yaparsanız ↶.</li>
  <li><b>Okunuş</b> sekmesinde yabancı adların okunuşunu yazın. Altyazıda özgün yazım kalır, ses okunuşu söyler.</li>
  <li>Menü → <b>Denetle</b>: sahne sayısı, kelime bütçesi, soru, karadan geçen rotalar.</li>
  <li><b>Video</b>: sesi seçip üretin; bitince “Videoyu kaydet / paylaş”.</li></ol>
  <h3>Hikâye kartı</h3><p class="ipucu">HOOK ≤8 · S1 ≤12 · S2 ≤14 · S3 ≤12 · S4 ≤14 · S5 ≤16 · S6 ≤12 · S7 ≤18 · S8 ≤16 · SORU ≤12 kelime. Şimdiki zaman, kısa cümleler, somut sayı. Gerilim için “...”.</p>
  <h3>Masaüstüyle birlikte</h3><p class="ipucu">Masaüstündeki <b>hikayeler\\&lt;ad&gt;\\hikaye.json</b> dosyası buraya “Dosyadan içe aktar” ile girer; buradan “Hikâyeyi dışa aktar” ile çıkan dosyayı masaüstünde ilgili klasöre <b>hikaye.json</b> adıyla koyabilirsiniz.</p>
  <h3>Kaynaklar</h3><p class="ipucu">Haritalar GEBCO 2024 ve GMRT (Ryan vd. 2009); ikonlar Material Design Icons (Apache 2.0); bayraklar flag-icons (MIT); yazı tipi Inter (SIL OFL); telefon sesi Piper (MIT) ve Thorsten/DFKI/Fahrettin/Fettah ses modelleri; ses efektleri programın kendisi tarafından üretilir.</p>`); }

/* ---------- başlangıç ---------- */
function ciz() { $("#hikayeAd").textContent = V.meta.title || AD; panelCiz(); yenile(); }
async function yukle(ad) { durdurOyna(); AD = ad; HK = await DEPO.hikaye(ad); if (!HK) return; V = HK.veri; V.meta.okunus = V.meta.okunus || {}; CUR = 0; GECMIS = [JSON.stringify(HK)]; GECICI = [];
  DEPO.ayarYaz("son", ad); sekmeAc("sahneler"); ciz(); $("#durum").textContent = ""; }
async function ornekYukle() { const hk = await (await fetch("ornek/Bogaz_gecilmez.json")).json(); await DEPO.hikayeKaydet("Bogaz_gecilmez", hk); await yukle("Bogaz_gecilmez"); }
(async () => {
  try {
    const m = await (await fetch("motor.html")).text();
    VAR.ikonlar = Object.keys(JSON.parse(m.match(/const ICONS=(\{.*?\}), FLAGS=/s)[1]));
    VAR.bayraklar = [...m.match(/FLAGS=(\{.*?\});/s)[1].matchAll(/"(\w+)":"data:image\/svg/g)].map(x => x[1]);
  } catch (e) { console.error(e); }
  VAR.okunus = await DEPO.okunusSozluk(); KAT = await DEPO.kutuphane();
  $("#ikonSec").innerHTML = VAR.ikonlar.map(k => `<option>${k}</option>`).join(""); $("#bayrakSec").innerHTML = VAR.bayraklar.map(k => `<option>${k}</option>`).join("");
  if (window.speechSynthesis) speechSynthesis.getVoices();
  const L = await DEPO.hikayeler(), son = await DEPO.ayar("son");
  if (!L.length) await ornekYukle(); else await yukle(L.includes(son) ? son : L[0]);
  aracSec("sec");
  /* bütün kütüphane haritaları arka planda bir kez indirilip saklanır (internetsiz de çalışsın) */
  setTimeout(() => { for (const h of Object.keys(KAT)) if (!KAT[h].yerel) fetch(`kut/${h}.png`).catch(() => { }); }, 5000);
  try { VAR.marka = (await DEPO.ayar("marka")) || {}; if (VAR.marka.logo) await logoHazirla(VAR.marka.logo); } catch (e) { }
  try { const o = await DEPO.ayar("sonVideo"); if (o && o.blob && !o.alindi) bildir("Kaydedilmemiş bir video var: Menü → Son üretilen video", 6); } catch (e) { }
  if ("serviceWorker" in navigator && location.protocol === "https:") {
    const vardi = !!navigator.serviceWorker.controller; let yenilendi = false;
    navigator.serviceWorker.addEventListener("controllerchange", () => { if (vardi && !yenilendi) { if (window.__URETIM) { window.__GUNCEL_BEKLIYOR = 1; return; } yenilendi = true; bildir("Uygulama güncellendi; yeniden yükleniyor…"); setTimeout(() => location.reload(), 800); } });
    navigator.serviceWorker.register("sw.js", { updateViaCache: "none" }).then(r => { r.update(); document.addEventListener("visibilitychange", () => { if (!document.hidden) r.update(); }); }).catch(() => { });
  }
  if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => { });
})();
