/* Brooks 读图训练 v3 —— 单页、离线、无外部依赖。数据：data/<日期>.js（build.py 生成）。
   盘中：一键判断（always-in / 背景 / 信号 K）+ 下单 + Brooks 提问；收盘后：复盘工作室（讲解回放、亲手描、总结）；跨天：错题本 + 快速练习。 */
(() => {
'use strict';

// ================================================================ 工具
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const tickR = (p) => Math.round(p * 4) / 4;
const fmt = (p) => (p == null || isNaN(p)) ? '—' : tickR(p).toFixed(2);
const r2 = (x) => Math.round(x * 100) / 100;
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const STORE = 'brooks-game2-v1';
const TAIL = 12;
const C = { bull: '#26a69a', bear: '#ef5350', edge: '#2b2f36', ema: '#f08c2e', grid: '#eef0f3', muted: '#8a9099',
  long: '#0b7d6e', short: '#c62828', brooks: '#2f6fe4', mine: '#7b5cd6', mm: '#d98a00', r: '#a7b3c6',
  aiLong: '#26a69a', aiShort: '#ef5350', aiFlat: '#c3c8cf', ctx: { 趋势: '#2f6fe4', 通道: '#8fb2f0', 区间: '#f2c14e', 不确定: '#c3c8cf' } };
const LABELS = ['H1', 'H2', 'H3', 'H4', 'L1', 'L2', 'L3', 'L4', 'DT', 'DB', '微双顶', '微双底', 'HL', 'LH', '楔形', '三推', 'spike',
  '通道', '高潮', 'MTR', '两K反转', '外包', 'ii', '突破', '失败突破', '突破回调', '末旗', '牛旗', '熊旗', '趋势线突破', '区间'];
const QUICK = ['H1', 'H2', 'L1', 'L2', 'DT', 'DB', 'HL', 'LH', '楔形', '三推', '高潮', 'spike', 'MTR', '末旗', '失败突破', '突破回调', '两K反转', 'ii', '外包', '区间'];
const SETUPS = ['', 'H1', 'H2', 'L1', 'L2', '楔形 / 三推', '双底', '双顶', 'MTR', '突破回调', '失败突破', '末旗', '高潮反转', '两 K 反转', '突破追入', '区间低买高卖', '其他'];
const GRADES = ['看到并做了', '看到但没做', '没看到', '看反了'];

function hash(s) { let h = 2166136261; for (const c of s) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; }
function shuffled(n, seed) { const idx = [...Array(n).keys()]; let s = hash(seed) || 1;
  for (let i = n - 1; i > 0; i--) { s = (Math.imul(s, 1103515245) + 12345) >>> 0; const j = s % (i + 1); [idx[i], idx[j]] = [idx[j], idx[i]]; } return idx; }
function decodeKey(b64) { const bin = atob(b64); const bytes = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i) ^ 0x5A; return JSON.parse(new TextDecoder('utf-8').decode(bytes)); }
function emaSeries(closes, n = 20) { const k = 2 / (n + 1); let e = null; return closes.map((c) => (e = e == null ? c : c * k + e * (1 - k))); }
function loadStore() { try { const s = JSON.parse(localStorage.getItem(STORE)) || {}; return { sessions: [], feedback: [], wrong: [], ...s }; } catch (e) { return { sessions: [], feedback: [], wrong: [] }; } }
function saveStore(st) { try { localStorage.setItem(STORE, JSON.stringify(st)); } catch (e) { /* 无痕模式 */ } }
const ASK_KEY = 'brooks-game2-askon';
// H1/H2 计数：所有关卡都开
const HL_KEY = 'brooks-game2-hl';
const hlAvail = () => !!G;
function loadHLPref() { try { return localStorage.getItem(HL_KEY) === '1' ? 1 : 0; } catch (e) { return 0; } }
function saveHLPref(v) { try { localStorage.setItem(HL_KEY, v ? '1' : '0'); } catch (e) { /* 无痕模式 */ } }
function askOn() { const el = document.getElementById('tgAsk'); return !el || el.checked; }
function loadAskPref() { try { const v = localStorage.getItem(ASK_KEY); if (v !== null) $('#tgAsk').checked = v === '1'; } catch (e) { /* 无痕模式 */ } }
function saveAskPref() { try { localStorage.setItem(ASK_KEY, askOn() ? '1' : '0'); } catch (e) { /* 无痕模式 */ } }
function download(name, obj) { const blob = new Blob([JSON.stringify(obj, null, 1)], { type: 'application/json' }); const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000); }
function show(id) { $$('.screen').forEach((s) => s.classList.add('hidden')); $(id).classList.remove('hidden'); window.scrollTo(0, 0); }
const today = () => new Date().toISOString().slice(0, 10);
const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x.toISOString().slice(0, 10); };

// ================================================================ 状态
let G = null, K = null, S = null, autoTimer = null;
const days = {};   // 已加载的关卡数据（练习时用）

function newSession(mode) {
  return { date: G.date, mode, startedAt: new Date().toISOString(), n: 0, ai: {}, curAI: null, ctx: {}, curCtx: null, signals: [],
    orders: [], canceled: [], pos: null, trades: [], tradeSeq: 0, labels: [], hlines: [], mms: [], undo: [],
    answers: {}, skipped: {}, hist: [], rewinds: 0, preI: 0, autoOn: true, aiSrc: {}, ctxSrc: {}, blocked: null, tool: null, toolPts: [], labelCode: null, mouse: null, drag: null,
    guides: { tail: 1, yhl: 1, yc: 1, gx: 1, open: 1, ema: 1, round: 1, or: 0, btype: 1, mc: 1, run: 1 }, log: [], finished: false, review: null };
}
function logEv(ev, data = {}) { S.log.push({ bar: S.n, ev, ...data, at: Date.now() }); }

// ================================================================ 关卡
function loadDay(date, cb) {
  if (window.GAME_DAYS && window.GAME_DAYS[date]) return cb(window.GAME_DAYS[date]);
  const sc = document.createElement('script'); sc.src = `data/${date}.js`;
  sc.onload = () => cb(window.GAME_DAYS[date]); sc.onerror = () => alert('读不到 data/' + date + '.js，请先运行 build.py');
  document.head.appendChild(sc);
}
function prepDay(g) {
  if (g._prepped) return g;
  const yd = g.yesterday.bars, td = g.rth;
  const all = emaSeries([...g.warm_closes, ...yd.map((b) => b.c), ...td.map((b) => b.c)]); const off = g.warm_closes.length;
  yd.forEach((b, i) => b.ema = all[off + i]); td.forEach((b, i) => b.ema = all[off + yd.length + i]);
  const de = emaSeries(g.daily.map((b) => b.c)); g.daily.forEach((b, i) => b.ema = de[i]);
  g.yH = Math.max(...yd.map((b) => b.h)); g.yL = Math.min(...yd.map((b) => b.l)); g.yC = yd[yd.length - 1].c;
  if (g.globex.length) { g.gH = Math.max(...g.globex.map((b) => b.h)); g.gL = Math.min(...g.globex.map((b) => b.l)); g.gLast = g.globex[g.globex.length - 1].c; }
  g.tail = yd.slice(-TAIL); g.K = { premarket_questions: [], checkpoints: [], arrows: [], phases: [] }; g.auto = autoRead([...yd.slice(-20), ...td], Math.min(20, yd.length));
  const allB = [...yd, ...td]; g.tags = td.map((b, i) => barTags(b, allB[yd.length + i - 1], allB.slice(Math.max(0, yd.length + i - 20), yd.length + i), td.slice(0, i + 1)));
  g.mc = microChannels(td); g.runs = trendRuns(td); g.hl = barCounts(td, g.auto.map((a) => a.ai));   // 微通道、连续趋势 K（autoread.js，只用已出现的 K 线）
  g.gap = td[0].o - g.yC; g._prepped = true; return g;
}
function renderHome() {
  stopAuto(); show('#scrHome'); $('#levelInfo').textContent = '';
  const st = loadStore(); const list = window.GAME_INDEX || [];
  $('#levelList').innerHTML = list.map((d, i) => {
    const played = st.sessions.filter((s) => s.date === d); const best = played.length ? Math.max(...played.map((s) => s.score?.total || 0)) : null;
    return `<div class="level" data-d="${d}"><div class="d">关卡 ${i + 1}</div><div class="muted small">${d}</div>
      <div class="meta">${played.length ? `<span class="tag">已玩 ${played.length} 次</span><span class="tag">最高 ${best}</span>` : '<span class="tag blind">盲测</span>'}</div></div>`;
  }).join('') || '<p>还没有关卡。运行 <code>python3 09-game/build.py 日期</code> 生成。</p>';
  $$('.level').forEach((el) => el.onclick = () => startLevel(el.dataset.d));
}
function startLevel(date) {
  loadDay(date, (g) => { G = prepDay(g); K = G.K; days[date] = G;
    const mode = loadStore().sessions.some((s) => s.date === date) ? '复习' : '盲测';
    S = newSession(mode); $('#levelInfo').textContent = `· ${date}（星期${G.weekday}）· ${mode}`; renderPre(); });
}
const barAt = (i) => (i >= 1 ? G.rth[i - 1] : G.tail[G.tail.length - 1 + i]);

// ================================================================ 画图基础
function setupCanvas(cv) { const dpr = window.devicePixelRatio || 1; const r = cv.getBoundingClientRect();
  cv.width = Math.max(1, Math.round(r.width * dpr)); cv.height = Math.max(1, Math.round(r.height * dpr));
  const ctx = cv.getContext('2d'); ctx.setTransform(dpr, 0, 0, dpr, 0, 0); return { ctx, W: r.width, H: r.height }; }
function niceStep(range) { const raw = range / 8; const p = Math.pow(10, Math.floor(Math.log10(raw))); for (const m of [1, 2, 2.5, 5, 10]) if (raw <= m * p) return m * p; return 10 * p; }
function makeFrame(W, H, slots, lo, hi, pad = { l: 8, r: 64, t: 14, b: 22 }, off = 0) {
  const cw = W - pad.l - pad.r, ch = H - pad.t - pad.b, slot = cw / slots;
  return { pad, slot, lo, hi, W, H, off, x: (i) => pad.l + (off + i - 0.5) * slot, y: (p) => pad.t + (hi - p) / (hi - lo) * ch,
    p: (y) => hi - (y - pad.t) / ch * (hi - lo), i: (x) => Math.round((x - pad.l) / slot + 0.5 - off), inPlot: (x, y) => x >= pad.l && x <= W - pad.r && y >= pad.t && y <= H - pad.b };
}
function drawGrid(ctx, F) { const step = niceStep(F.hi - F.lo); ctx.font = '11px -apple-system, sans-serif'; ctx.textBaseline = 'middle'; ctx.textAlign = 'left';
  for (let p = Math.ceil(F.lo / step) * step; p <= F.hi; p += step) { const y = F.y(p); ctx.strokeStyle = C.grid; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(F.pad.l, y); ctx.lineTo(F.W - F.pad.r, y); ctx.stroke();
    ctx.fillStyle = C.muted; ctx.fillText(fmt(p), F.W - F.pad.r + 6, y); } }
function drawCandle(ctx, F, b, i, alpha = 1) { const w = Math.max(1, F.slot * 0.62), x = F.x(i), col = b.c >= b.o ? C.bull : C.bear;   // TradingView 默认配色：实体与影线同色
  ctx.globalAlpha = alpha; ctx.strokeStyle = col; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(Math.round(x) + 0.5, F.y(b.h)); ctx.lineTo(Math.round(x) + 0.5, F.y(b.l)); ctx.stroke();
  const top = F.y(Math.max(b.o, b.c)), bot = F.y(Math.min(b.o, b.c)); ctx.fillStyle = col; ctx.fillRect(x - w / 2, top, w, Math.max(1, bot - top)); ctx.globalAlpha = 1; }
function drawLine(ctx, F, pts, color, width = 1.6) { ctx.strokeStyle = color; ctx.lineWidth = width; ctx.beginPath(); pts.forEach(([i, p], k) => k ? ctx.lineTo(F.x(i), F.y(p)) : ctx.moveTo(F.x(i), F.y(p))); ctx.stroke(); }
let usedLabels = [], edgeCount = { top: 0, bot: 0 };
function hLine(ctx, F, p, color, label, dash = [5, 4], x0 = null, edge = false, width = 1) {
  if (p < F.lo || p > F.hi) { if (edge && label) { const ref = S && S.n ? G.rth[Math.min(S.n, G.rth.length) - 1].c : G.yC; const up = p > F.hi; const k = up ? edgeCount.top++ : edgeCount.bot++;
      const y = up ? F.pad.t + 2 + k * 14 : F.H - F.pad.b - 14 - k * 14; ctx.font = '11px -apple-system, sans-serif'; ctx.fillStyle = color; ctx.textBaseline = 'top'; ctx.textAlign = 'right';
      ctx.fillText(`${up ? '↑' : '↓'} ${label}（${p - ref >= 0 ? '+' : ''}${fmt(p - ref)}）`, F.W - F.pad.r - 4, y); ctx.textAlign = 'left'; } return; }
  const y = F.y(p); ctx.save(); ctx.setLineDash(dash); ctx.strokeStyle = color; ctx.lineWidth = width; ctx.beginPath(); ctx.moveTo(x0 ?? F.pad.l, y); ctx.lineTo(F.W - F.pad.r, y); ctx.stroke(); ctx.restore();
  if (label) { ctx.font = '11px -apple-system, sans-serif'; ctx.fillStyle = color; ctx.textBaseline = 'bottom'; ctx.textAlign = 'right';
    const w = ctx.measureText(label).width; let xr = F.W - F.pad.r - 4; const hit = usedLabels.filter((u) => Math.abs(u.y - y) < 12); if (hit.length) xr = Math.min(...hit.map((u) => u.x - u.w - 10));
    usedLabels.push({ y, x: xr, w }); ctx.fillText(label, xr, y - 1); ctx.textAlign = 'left'; } }
function barNumbers(ctx, F, n, every = 2) { ctx.font = '10px -apple-system, sans-serif'; ctx.fillStyle = C.muted; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
  for (let i = 1; i <= n; i++) if (i === 1 || i % every === 0) ctx.fillText(String(i), F.x(i), F.H - F.pad.b + 5); ctx.textAlign = 'left'; }
function tri(ctx, x, y, up, color, s = 7) { ctx.beginPath(); if (up) { ctx.moveTo(x, y); ctx.lineTo(x - s, y + s * 1.5); ctx.lineTo(x + s, y + s * 1.5); } else { ctx.moveTo(x, y); ctx.lineTo(x - s, y - s * 1.5); ctx.lineTo(x + s, y - s * 1.5); }
  ctx.closePath(); ctx.fillStyle = color; ctx.fill(); ctx.strokeStyle = '#fff'; ctx.lineWidth = 1; ctx.stroke(); }
function cross(ctx, x, y, color) { ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x - 4, y - 4); ctx.lineTo(x + 4, y + 4); ctx.moveTo(x + 4, y - 4); ctx.lineTo(x - 4, y + 4); ctx.stroke(); }
function ring(ctx, x, y, color, r = 7) { ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.stroke(); }

// ================================================================ 开盘前
/* 1 小时 K 线（含夜盘，按整点合成）：之前 4 天由 build.py 合成；今天的夜盘全部 + 日盘到第 n 根为止（只用已出现的 K 线） */
function hourBars(n) {
  const out = (G.h1_prev || []).map((b) => ({ ...b }));
  const add = (r, rth) => { const k = r.d + ' ' + r.t.slice(0, 2), L = out[out.length - 1];
    if (L && L.k === k) { L.h = Math.max(L.h, r.h); L.l = Math.min(L.l, r.l); L.c = r.c; L.rth = L.rth || rth; L.last = r.t; }
    else out.push({ k, o: r.o, h: r.h, l: r.l, c: r.c, rth, today: true, last: r.t }); };
  G.globex.forEach((r) => add(r, false)); G.rth.slice(0, n).forEach((r) => add(r, true));
  const L = out[out.length - 1]; if (L && L.last && L.last.slice(3) !== '55') L.partial = true;
  const e = emaSeries(out.map((b) => b.c)); out.forEach((b, i) => b.ema = e[i]); return out; }
function drawHourChart(cv, n, show) {
  const { ctx, W, H } = setupCanvas(cv); const all = hourBars(n), d = all.slice(-show);
  const lo0 = Math.min(...d.map((b) => b.l)), hi0 = Math.max(...d.map((b) => b.h)), pd = (hi0 - lo0) * 0.06;
  const F = makeFrame(W, H, show, lo0 - pd, hi0 + pd, { l: 4, r: 48, t: 8, b: 16 }); drawGrid(ctx, F);
  ctx.font = '9px -apple-system, sans-serif'; ctx.fillStyle = C.muted; ctx.textAlign = 'left'; ctx.textBaseline = 'top';
  d.forEach((b, i) => { if (b.k.endsWith(' 15') || (b.k.endsWith(' 06') && b.today)) { const x = F.x(i + 1) - F.slot / 2; ctx.save(); ctx.strokeStyle = b.k.endsWith(' 15') ? '#c3c8cf' : 'rgba(47,111,228,.45)'; ctx.setLineDash([3, 3]);
      ctx.beginPath(); ctx.moveTo(x, F.pad.t); ctx.lineTo(x, F.H - F.pad.b); ctx.stroke(); ctx.restore();
      ctx.fillText(b.k.endsWith(' 15') ? b.k.slice(5, 10) + ' 夜盘' : '今天开盘', x + 2, F.H - F.pad.b + 3); } });
  d.forEach((b, i) => { const hh = +b.k.slice(11, 13); if ((hh === 3 || hh === 9) && F.slot * 6 > 30) { ctx.fillStyle = '#b0b5bd'; ctx.fillText(hh + '时', F.x(i + 1) - F.slot / 2 + 2, F.H - F.pad.b + 3); ctx.fillStyle = C.muted; } });
  d.forEach((b, i) => drawCandle(ctx, F, b, i + 1, b.partial ? 0.55 : b.rth ? 1 : 0.75));
  drawLine(ctx, F, d.map((b, i) => [i + 1, b.ema]), C.ema, 1.2);
  const L = d[d.length - 1]; if (L) { const y = F.y(L.c); ctx.fillStyle = '#17191c'; ctx.fillRect(F.W - F.pad.r + 1, y - 7, F.pad.r - 2, 14); ctx.fillStyle = '#fff'; ctx.font = '10px -apple-system, sans-serif'; ctx.textBaseline = 'middle'; ctx.fillText(fmt(L.c), F.W - F.pad.r + 4, y); }
  return F; }
function renderPre() {
  show('#scrPre'); $('#dailyN').textContent = G.daily.length; $('#ydDate').textContent = G.yesterday.date;
  requestAnimationFrame(() => {
    let { ctx, W, H } = setupCanvas($('#cvDaily')); const d = G.daily; let lo = Math.min(...d.map((b) => b.l)), hi = Math.max(...d.map((b) => b.h)); const pd = (hi - lo) * 0.06;
    let F = makeFrame(W, H, d.length, lo - pd, hi + pd); drawGrid(ctx, F); d.forEach((b, i) => drawCandle(ctx, F, b, i + 1)); drawLine(ctx, F, d.map((b, i) => [i + 1, b.ema]), C.ema);
    ctx.font = '10px -apple-system, sans-serif'; ctx.fillStyle = C.muted; ctx.textAlign = 'center'; ctx.textBaseline = 'top'; d.forEach((b, i) => { if (i % 5 === 0 || i === d.length - 1) ctx.fillText(b.d.slice(5), F.x(i + 1), H - F.pad.b + 5); });
    ({ ctx, W, H } = setupCanvas($('#cvYday'))); const y = G.yesterday.bars; lo = Math.min(...y.map((b) => b.l)); hi = Math.max(...y.map((b) => b.h)); const p2 = (hi - lo) * 0.06;
    F = makeFrame(W, H, 81, lo - p2, hi + p2); drawGrid(ctx, F); y.forEach((b, i) => drawCandle(ctx, F, b, i + 1)); drawLine(ctx, F, y.map((b, i) => [i + 1, b.ema]), C.ema); barNumbers(ctx, F, y.length, 6);
    const gx = G.globex; if (gx.length) { ({ ctx, W, H } = setupCanvas($('#cvGlobex'))); lo = Math.min(...gx.map((b) => b.l)); hi = Math.max(...gx.map((b) => b.h)); const p3 = (hi - lo) * 0.06;
      F = makeFrame(W, H, gx.length, lo - p3, hi + p3); drawGrid(ctx, F); gx.forEach((b, i) => drawCandle(ctx, F, b, i + 1)); hLine(ctx, F, G.yC, '#a5abb4', '昨收 ' + fmt(G.yC), [5, 4]);
      ctx.font = '10px -apple-system, sans-serif'; ctx.fillStyle = C.muted; ctx.textAlign = 'center'; ctx.textBaseline = 'top'; gx.forEach((b, i) => { if (i > 3 && b.t.endsWith(':00') && +b.t.slice(0, 2) % 3 === 0) ctx.fillText(b.t, F.x(i + 1), H - F.pad.b + 5); }); ctx.textAlign = 'left'; }
    $('#globexN').textContent = gx.length; drawHourChart($('#cvH1pre'), 0, 72);
  });
  const gap = G.globex.length ? G.gLast - G.yC : null;
  $('#preFacts').innerHTML = `<div>昨日高<b>${fmt(G.yH)}</b></div><div>昨日低<b>${fmt(G.yL)}</b></div><div>昨收<b>${fmt(G.yC)}</b></div>` +
    (G.globex.length ? `<div>开盘前最后<b>${fmt(G.gLast)}</b></div><div>夜盘高<b>${fmt(G.gH)}</b></div><div>夜盘低<b>${fmt(G.gL)}</b></div><div style="grid-column:1/-1">较昨收 <b style="display:inline">${gap >= 0 ? '+' : ''}${fmt(gap)}</b></div>` : '<div>无夜盘数据</div>');
  askPre(0);
}
function askPre(i) { const qs = K.premarket_questions; S.preI = i;
  if (!askOn() && i < qs.length) { qs.slice(i).forEach((q) => { if (!S.answers[q.id]) S.skipped[q.id] = true; });
    $('#preQ').innerHTML = `<p class="small muted">Brooks 提问已关闭（右上角开关），开盘前问题跳过，不计分。</p><button class="btn primary lg" id="btnOpen">开盘 ▶</button>`; $('#btnOpen').onclick = startPlay; return; }
  if (i >= qs.length) { $('#preQ').innerHTML = `<p class="small muted">准备完成。此练习端不显示答案或提示。</p><button class="btn primary lg" id="btnOpen">开盘 ▶</button>`; $('#btnOpen').onclick = startPlay; return; }
  renderQuestion($('#preQ'), qs[i], () => askPre(i + 1)); }

// ================================================================ Brooks 原话
function refQuotes(refs, k = K) {
  const out = [];
  for (const r of refs || []) {
    if (/^D\d+$/.test(r)) { const b = k.daily_bullets[+r.slice(1) - 1]; if (b) out.push({ ...b, src: '日线一节' }); }
    else if (/^I\d+$/.test(r)) { const b = k.intraday_bullets.find((x) => x.id === r); if (b) out.push({ ...b, src: '5 分钟图一节' }); }
    else if (/^L\d+$/.test(r)) { const l = k.labels.find((x) => x.id === r); if (l) out.push({ en: l.en, zh: `${l.zh}（Bar ${l.bars.join('–')}）`, src: '收盘图标注' }); }
    else if (r === 'DT') out.push({ en: k.day_type.en, zh: k.day_type.zh, src: '收盘图标题 / 日型' });
  }
  return out;
}
const quoteHtml = (qs, k = K) => qs.map((q) => `<div class="quote"><div class="en">“${esc(q.en)}”</div><div class="zh">${esc(q.zh)}</div><div class="src">— Brooks 报告 ${k.date}，${q.src}</div></div>`).join('');
function renderQuestion(box, q, onDone) {
  const order = shuffled(q.options.length, q.id + K.date);
  box.innerHTML = `<div class="who">${q.kind === 'structure' ? '结构判断' : q.kind === 'daytype' ? '日型判断' : 'BROOKS 在这里有评论'}${q.after_bar ? ` · Bar ${q.after_bar} 收盘后` : ''}</div>
    <p style="font-size:15px;line-height:1.5;margin:8px 0">${esc(q.q)}</p>${order.map((k) => `<button class="opt" data-k="${k}">${esc(q.options[k])}</button>`).join('')}<div class="fb"></div>`;
  $$('.opt', box).forEach((b) => b.onclick = () => {
    const k = +b.dataset.k, ok = k === q.answer;
    S.answers[q.id] = { choice: k, correct: ok, atBar: S.n, q: q.q, chosen: q.options[k], right: q.options[q.answer], kind: q.kind || 'quiz' }; logEv('answer', { id: q.id, ok });
    $$('.opt', box).forEach((x) => { x.disabled = true; const kk = +x.dataset.k; if (kk === q.answer) x.classList.add('correct'); else if (kk === k) x.classList.add('wrong'); });
    $('.fb', box).innerHTML = `<div class="verdict ${ok ? 'ok' : 'no'}">${ok ? '答对了' : '没答对'}</div>${quoteHtml(refQuotes(q.refs))}<button class="btn primary" data-next style="margin-top:6px">继续</button>`;
    $('[data-next]', box).onclick = onDone;
  });
}
function openModal(html) { $('#modalCard').innerHTML = html; $('#modal').classList.remove('hidden'); }
function closeModal() { $('#modal').classList.add('hidden'); }
const modalOpen = () => !$('#modal').classList.contains('hidden');

// ================================================================ 主图（盘中 & 复盘共用）
function chartFrame(W, H, upto, tail) {
  const bars = [...(tail ? G.tail : []), ...G.rth.slice(0, upto)]; const ps = bars.flatMap((b) => [b.h, b.l]); ps.push(G.yC); if (upto === 0 && G.gLast) ps.push(G.gLast);
  let lo = Math.min(...ps), hi = Math.max(...ps); if (hi - lo < 20) { const m = (hi + lo) / 2; lo = m - 10; hi = m + 10; }
  const pd = (hi - lo) * 0.1, off = tail ? TAIL : 0; return makeFrame(W, H, 81 + off, lo - pd, hi + pd, { l: 8, r: 72, t: 16, b: 22 }, off);
}
function drawChart(cv, o) {
  const { ctx, W, H } = setupCanvas(cv); const F = chartFrame(W, H, o.upto, o.tail); usedLabels = []; edgeCount = { top: 0, bot: 0 };
  const n = o.upto, bars = G.rth.slice(0, n), g = S.guides, L = o.layers || {};
  if (o.highlight) { const [a, b] = o.highlight; ctx.fillStyle = 'rgba(47,111,228,.09)'; ctx.fillRect(F.x(a) - F.slot / 2, F.pad.t, F.x(b) - F.x(a) + F.slot, F.H - F.pad.t - F.pad.b); }
  drawGrid(ctx, F);
  if (g.round) { const st = 25; for (let p = Math.ceil(F.lo / st) * st; p <= F.hi; p += st) hLine(ctx, F, p, p % 100 === 0 ? '#a5abb4' : '#dde1e6', p % 50 === 0 ? String(p) : '', [2, 4]); }
  if (o.mode === 'play' || L.levels) {
    if (g.yhl) { hLine(ctx, F, G.yH, '#7d848f', '昨高 ' + fmt(G.yH), [5, 4], null, true); hLine(ctx, F, G.yL, '#7d848f', '昨低 ' + fmt(G.yL), [5, 4], null, true); }
    if (g.yc) hLine(ctx, F, G.yC, '#a5abb4', '昨收 ' + fmt(G.yC), [5, 4], null, true);
    if (g.gx && G.globex.length) { hLine(ctx, F, G.gH, '#b8862b', '夜盘高 ' + fmt(G.gH), [1, 3], null, true); hLine(ctx, F, G.gL, '#b8862b', '夜盘低 ' + fmt(G.gL), [1, 3], null, true); }
    if (g.open && n >= 1) hLine(ctx, F, bars[0].o, C.brooks, '今开 ' + fmt(bars[0].o), [6, 3], null, true);
    if (g.or && n >= 6) { const s6 = bars.slice(0, 6); hLine(ctx, F, Math.max(...s6.map((b) => b.h)), C.mine, '开盘区间高', [3, 3]); hLine(ctx, F, Math.min(...s6.map((b) => b.l)), C.mine, '开盘区间低', [3, 3]); }
  }
  if (o.mode === 'play' || L.lines) { S.hlines.forEach((h) => hLine(ctx, F, h.p, C.mine, fmt(h.p), [6, 3], null, true)); S.mms.forEach((m) => drawMM(ctx, F, m)); }
  if (o.tail) { G.tail.forEach((b, k) => drawCandle(ctx, F, b, k - G.tail.length + 1, 0.35)); const xs = F.x(0.5);
    ctx.save(); ctx.strokeStyle = '#c3c8cf'; ctx.setLineDash([3, 3]); ctx.beginPath(); ctx.moveTo(xs, F.pad.t); ctx.lineTo(xs, F.H - F.pad.b); ctx.stroke(); ctx.restore();
    ctx.font = '10px -apple-system, sans-serif'; ctx.fillStyle = C.muted; ctx.textBaseline = 'top'; ctx.fillText('昨日', F.x(-G.tail.length + 1), F.H - F.pad.b + 5); }
  bars.forEach((b, i) => drawCandle(ctx, F, b, i + 1));
  if (g.btype && G.tags) { ctx.font = '10px -apple-system, sans-serif'; ctx.textAlign = 'center';
    bars.forEach((b, i) => { const tg = G.tags[i].tags.filter((t) => t.k !== 'doji' || o.mode === 'review'); if (!tg.length) return; const txt = tg.map((t) => t.s).join('');
      const up = b.c >= b.o; ctx.fillStyle = tg.some((t) => t.k.startsWith('rev')) ? '#7b5cd6' : '#8a9099'; ctx.textBaseline = up ? 'top' : 'bottom';
      ctx.fillText(txt, F.x(i + 1), up ? F.y(b.l) + 2 : F.y(b.h) - 2); }); ctx.textAlign = 'left'; }
  S.autoBoxes = [];
  if ((g.mc || g.run) && G.mc) { const { segMC, segRun } = segmentsUpTo(G.mc, G.runs, n); ctx.font = '10px -apple-system, sans-serif';
    if (g.mc) segMC.forEach((m) => { const pts = []; for (let i = m.a; i <= m.b; i++) { const b = bars[i - 1]; pts.push([i, m.up ? b.l : b.h]); }
      ctx.save(); ctx.globalAlpha = m.k >= 5 ? 0.85 : 0.5; drawLine(ctx, F, pts, m.up ? C.bull : C.bear, m.k >= 5 ? 2.2 : 1.2); ctx.restore();
      if (m.k < 5) return;   // 3–4 根只画细线；5 根以上（书：5–10 根也可直接叫通道）才写字
      const e = bars[m.b - 1], t = `微通道 ${m.k}`, x = F.x(m.b) + F.slot * 0.55, y = m.up ? F.y(e.l) + 3 : F.y(e.h) - 3;
      const w = ctx.measureText(t).width; ctx.fillStyle = 'rgba(255,255,255,.8)'; ctx.fillRect(x - 1, m.up ? y : y - 12, w + 2, 12);
      ctx.fillStyle = m.up ? C.bull : C.bear; ctx.textAlign = 'left'; ctx.textBaseline = m.up ? 'top' : 'bottom'; ctx.fillText(t, x, y); S.autoBoxes.push({ x, y: m.up ? y : y - 12, w, h: 12, code: '微通道', extra: `：Bar ${m.a}–${m.b}，${m.k} 根${m.up ? '牛' : '熊'}微通道` }); });
    if (g.run) segRun.forEach((r) => { const e = bars[r.b - 1], t = `${r.k}连${r.up ? '阳' : '阴'}`, x = F.x(r.b), y = r.up ? F.y(e.h) - 3 : F.y(e.l) + 3;
      const w = ctx.measureText(t).width; ctx.fillStyle = 'rgba(255,255,255,.8)'; ctx.fillRect(x - w / 2 - 1, r.up ? y - 12 : y, w + 2, 12);
      ctx.fillStyle = '#5b6470'; ctx.textAlign = 'center'; ctx.textBaseline = r.up ? 'bottom' : 'top'; ctx.fillText(t, x, y); S.autoBoxes.push({ x: x - w / 2, y: r.up ? y - 12 : y, w, h: 12, code: '连续趋势K', extra: `：Bar ${r.a}–${r.b}，连续 ${r.k} 根${r.up ? '阳' : '阴'}线` }); });
    ctx.textAlign = 'left'; }
  if (g.hl && hlAvail() && G.hl) { ctx.textAlign = 'center';
    bars.forEach((b, i) => { for (const up of [true, false]) { const o = G.hl[i][up ? 'h' : 'l']; if (!o) continue;
      const t = (up ? 'H' : 'L') + o.n + (o.n === 2 && !o.brk ? '?' : ''), x = F.x(i + 1), y = up ? F.y(b.l) + 13 : F.y(b.h) - 13;
      ctx.font = 'bold 10px -apple-system, sans-serif'; ctx.globalAlpha = o.weak ? 0.45 : 1; ctx.fillStyle = o.n === 2 && !o.brk ? '#8a9099' : up ? '#2f6fe4' : '#c2255c';
      ctx.textBaseline = up ? 'top' : 'bottom'; ctx.fillText(t, x, y); ctx.globalAlpha = 1; const w = ctx.measureText(t).width;
      S.autoBoxes.push({ x: x - w / 2, y: up ? y : y - 11, w, h: 11, code: (up ? 'H' : 'L') + o.n, extra: hlText(i, up, o), line: o.line, up }); } });
    ctx.textAlign = 'left'; }
  if (o.mode === 'play' && S.hlShow) drawHLLine(ctx, F, S.hlShow);
  if (g.ema) { const pts = [...(o.tail ? G.tail.map((b, k) => [k - G.tail.length + 1, b.ema]) : [[0.5, G.yesterday.bars[G.yesterday.bars.length - 1].ema]]), ...bars.map((b, i) => [i + 1, b.ema])];
    drawLine(ctx, F, pts, C.ema, 1.5); if (o.mode === 'play') { const last = pts[pts.length - 1]; ctx.font = '11px -apple-system, sans-serif'; ctx.fillStyle = C.ema; ctx.textBaseline = 'middle'; ctx.fillText(`EMA ${fmt(last[1])}`, F.x(last[0]) + 9, F.y(last[1])); } }
  barNumbers(ctx, F, n, 2);
  if (o.mode === 'play') drawOrders(ctx, F);
  if (o.mode === 'play' || L.trades) [...S.trades, ...(S.pos ? [S.pos] : [])].forEach((t) => { const c = t.dir === '多' ? C.long : C.short; tri(ctx, F.x(t.fillBar), F.y(t.entry), t.dir === '多', c, 7); (t.exits || []).forEach((x) => cross(ctx, F.x(x.bar), F.y(x.price), c)); });
  if (o.mode === 'play' || L.signals) S.signals.forEach((s) => { const b = G.rth[s.bar - 1]; if (!b) return; const up = s.dir === '多'; ctx.fillStyle = up ? C.long : C.short; ctx.font = 'bold 13px -apple-system, sans-serif'; ctx.textAlign = 'center';
    ctx.textBaseline = up ? 'top' : 'bottom'; ctx.fillText(up ? '▲' : '▼', F.x(s.bar), up ? F.y(b.l) + 3 : F.y(b.h) - 3); ctx.textAlign = 'left'; });
  if (o.mode === 'play' || L.labels) S.labels.forEach((l) => drawLabel(ctx, F, l, hlCheck(l) ?? C.mine));
  if (L.brooks) K.arrows.forEach((a) => { const b = G.rth[a.bar - 1]; if (!b) return; const up = a.dir === '多'; tri(ctx, F.x(a.bar), up ? F.y(b.l) + 24 : F.y(b.h) - 24, !up, C.brooks, 6); });
  if (o.marks) o.marks.forEach((m) => { if (m.type === 'ring') ring(ctx, F.x(m.i), F.y(m.p), m.color); if (m.type === 'line') hLine(ctx, F, m.p, m.color, m.label, [4, 3]); if (m.type === 'mm') drawMM(ctx, F, m.mm, m.temp); });
  if (o.cross != null && o.cross >= 1) { ctx.save(); ctx.strokeStyle = 'rgba(47,111,228,.6)'; ctx.setLineDash([3, 3]); ctx.beginPath(); ctx.moveTo(F.x(o.cross), F.pad.t); ctx.lineTo(F.x(o.cross), F.H - F.pad.b); ctx.stroke(); ctx.restore();
    const t = `Bar ${o.cross}`; ctx.font = '10px -apple-system, sans-serif'; const w = ctx.measureText(t).width + 8; ctx.fillStyle = C.brooks; ctx.fillRect(F.x(o.cross) - w / 2, F.H - F.pad.b + 2, w, 15);
    ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'top'; ctx.fillText(t, F.x(o.cross), F.H - F.pad.b + 4); ctx.textAlign = 'left'; }
  if (o.mode === 'play') { drawPreview(ctx, F); drawCrosshair(ctx, F); }
  return F;
}
function drawMain() { if (!S || $('#scrPlay').classList.contains('hidden')) return; S.dragTargets = []; if ($('#cvH1')) drawHourChart($('#cvH1'), S.n, 36);
  S.F = drawChart($('#cvMain'), { mode: 'play', upto: S.n, tail: !!S.guides.tail }); S.FW = { W: S.F.W, H: S.F.H }; drawStrips($('#cvStrips'), S.F.off, S.n, false); }
function drawStrips(cv, off, upto, withBrooks) {
  const { ctx, W, H } = setupCanvas(cv); const rows = withBrooks ? 4 : 2, rh = (H - 2) / rows; const F = makeFrame(W, H, 81 + off, 0, 1, { l: 8, r: 72, t: 0, b: 0 }, off);
  ctx.font = '10px -apple-system, sans-serif'; ctx.textBaseline = 'middle'; ctx.fillStyle = C.muted; const names = ['always-in', '背景', '自动背景', 'Brooks'];
  for (let r = 0; r < rows; r++) ctx.fillText(names[r], W - 66, 1 + rh * r + rh / 2);
  for (let i = 1; i <= upto; i++) {
    const a = S.ai[i]; ctx.fillStyle = a === '多' ? C.aiLong : a === '空' ? C.aiShort : a === '不明确' ? C.aiFlat : '#f1f3f5'; ctx.fillRect(F.x(i) - F.slot / 2 + 0.5, 1, F.slot - 1, rh - 1);
    const c = S.ctx[i]; ctx.fillStyle = c ? C.ctx[c] : '#f1f3f5'; ctx.fillRect(F.x(i) - F.slot / 2 + 0.5, 1 + rh, F.slot - 1, rh - 1);
    if (S.ctxSrc[i] === 'me' || S.aiSrc[i] === 'me') { ctx.fillStyle = '#7b5cd6'; ctx.fillRect(F.x(i) - 1.5, 1 + rh * 2 - 4, 3, 3); }
    if (withBrooks) { const au = G.auto[i - 1]; ctx.fillStyle = C.ctx[au.ctx]; ctx.fillRect(F.x(i) - F.slot / 2 + 0.5, 1 + rh * 2, F.slot - 1, rh - 1);
      const ph = (K.phases || []).find((p) => i >= p.from && i <= p.to); ctx.fillStyle = ph ? C.ctx[ph.ok[0]] : '#f7f8fa'; ctx.fillRect(F.x(i) - F.slot / 2 + 0.5, 1 + rh * 3, F.slot - 1, rh - 1); }
  }
}
function rLines(ctx, F, dir, entry, stop, x0) { const d = dir === '多' ? 1 : -1, risk = Math.abs(entry - stop);
  hLine(ctx, F, entry + d * risk, C.r, '1R ' + fmt(entry + d * risk), [2, 3], x0); hLine(ctx, F, entry + d * 2 * risk, C.r, '2R ' + fmt(entry + d * 2 * risk), [2, 3], x0); }
function drawOrders(ctx, F) {
  S.orders.forEach((o) => { const c = o.dir === '多' ? C.long : C.short, x0 = F.x(o.placedAt);
    hLine(ctx, F, o.price, c, `${o.dir === '多' ? '买' : '卖'}${o.type}单 ${fmt(o.price)}`, [8, 4], x0, false, 1.6); hLine(ctx, F, o.stop, C.short, `止损 ${fmt(o.stop)}`, [4, 3], x0); rLines(ctx, F, o.dir, o.price, o.stop, x0);
    S.dragTargets.push({ y: F.y(o.price), set: (p) => { o.price = p; o.type = orderType(o.dir, p); } }, { y: F.y(o.stop), set: (p) => { o.stop = p; } }); });
  if (S.pos) { const p = S.pos, x0 = F.x(p.fillBar); hLine(ctx, F, p.entry, '#2b2f36', `持仓 ${p.dir} ${p.qty} 手 @${fmt(p.entry)}`, [], x0, true, 1.5);
    hLine(ctx, F, p.stop, C.short, '止损 ' + fmt(p.stop), [4, 3], x0, true, 1.6); rLines(ctx, F, p.dir, p.entry, p.stop0, x0);
    if (p.target != null) hLine(ctx, F, p.target, C.long, '目标 ' + fmt(p.target), [4, 3], x0, true, 1.6);
    S.dragTargets.push({ y: F.y(p.stop), set: (v) => { p.stop = v; } }); if (p.target != null) S.dragTargets.push({ y: F.y(p.target), set: (v) => { p.target = v; } }); }
}
function drawPreview(ctx, F) { if ((S.tool !== 'buy' && S.tool !== 'sell') || !S.mouse) return;
  const dir = S.tool === 'buy' ? '多' : '空', c = dir === '多' ? C.long : C.short, p = snapOrder(S.mouse.x, S.mouse.y).p;
  if (!S.toolPts.length) hLine(ctx, F, p, c, `入场 ${fmt(p)}（${orderType(dir, p)}单）`, [8, 4], null, false, 1.6);
  else { const e = S.toolPts[0].p; hLine(ctx, F, e, c, `入场 ${fmt(e)}`, [8, 4], null, false, 1.6); hLine(ctx, F, p, C.short, `止损 ${fmt(p)}　风险 ${fmt(Math.abs(e - p))} 点`, [4, 3]); if ((dir === '多') === (p < e)) rLines(ctx, F, dir, e, p, null); } }
function drawCrosshair(ctx, F) { const m = S.mouse; if (!m || !F.inPlot(m.x, m.y)) return;
  ctx.save(); ctx.strokeStyle = '#a5abb4'; ctx.setLineDash([3, 3]); ctx.lineWidth = 0.8; ctx.beginPath(); ctx.moveTo(F.pad.l, m.y); ctx.lineTo(F.W - F.pad.r, m.y); ctx.moveTo(m.x, F.pad.t); ctx.lineTo(m.x, F.H - F.pad.b); ctx.stroke(); ctx.restore();
  ctx.fillStyle = '#17191c'; ctx.fillRect(F.W - F.pad.r + 1, m.y - 9, F.pad.r - 2, 18); ctx.fillStyle = '#fff'; ctx.font = '11px -apple-system, sans-serif'; ctx.textBaseline = 'middle'; ctx.textAlign = 'left'; ctx.fillText(fmt(F.p(m.y)), F.W - F.pad.r + 5, m.y);
  const i = F.i(m.x); if (i >= 1 && i <= 81) { const t = `Bar ${i}`; ctx.font = '10px -apple-system, sans-serif'; const w = ctx.measureText(t).width + 8; ctx.fillStyle = '#17191c'; ctx.fillRect(F.x(i) - w / 2, F.H - F.pad.b + 2, w, 15);
    ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'top'; ctx.fillText(t, F.x(i), F.H - F.pad.b + 4); ctx.textAlign = 'left'; } }
function drawMM(ctx, F, m, temp = false) { if (!m.a || !m.b) return; const leg = m.b.p - m.a.p, tgt = m.b.p + leg, ty = F.y(Math.max(F.lo, Math.min(F.hi, tgt)));
  ctx.save(); ctx.strokeStyle = C.mm; ctx.lineWidth = 1.5; ctx.setLineDash(temp ? [3, 3] : []); ctx.beginPath(); ctx.moveTo(F.x(m.a.i), F.y(m.a.p)); ctx.lineTo(F.x(m.b.i), F.y(m.b.p)); ctx.stroke();
  ctx.setLineDash([2, 3]); ctx.beginPath(); ctx.moveTo(F.x(m.b.i), F.y(m.b.p)); ctx.lineTo(F.x(m.b.i), ty); ctx.stroke();
  if (tgt >= F.lo && tgt <= F.hi) { ctx.beginPath(); ctx.moveTo(F.x(m.b.i) - 10, ty); ctx.lineTo(F.x(Math.min(81, m.b.i + 14)), ty); ctx.stroke(); }
  ctx.restore(); ctx.font = '11px -apple-system, sans-serif'; ctx.fillStyle = C.mm; ctx.textBaseline = 'bottom';
  ctx.fillText(`腿 ${leg >= 0 ? '+' : ''}${fmt(leg)}`, F.x((m.a.i + m.b.i) / 2) + 4, F.y((m.a.p + m.b.p) / 2)); ctx.fillText(`等距目标 ${fmt(tgt)}${tgt > F.hi ? ' ↑' : tgt < F.lo ? ' ↓' : ''}`, F.x(m.b.i) + 4, ty - 2); }
/* H/L 计数的说明文字（悬停时显示；原句来自《Trading Ranges》第 17 章） */
const HLQ = {
  brk: 'There needs to be at least a tiny trend line break between the high 1 and the high 2 to indicate that the trend traders are still active.',
  nobrk: 'Without this, do not yet look to buy, since the high 1 and high 2 are more likely just part of a channel down that is forming a complex first leg down.',
  weakH: 'buying a high 1 in a bear trend is a low-probability trade.',
  fail4H: 'If the high 4 fails to resume the trend and the market falls below its low, it is likely that the market is no longer forming a pullback in a bull trend and instead is in a bear swing. Wait for more price action to unfold before placing a trade.',
  fail4L: 'If the low 4 fails (a bar extends above the high of the low 4 signal bar after the low 4 short triggered), the price action indicates that the bears have lost control and either the market will become two-sided, with bulls and bears alternating control, or the bulls will gain control.',
  weakL: 'the move up was so strong that this may have been a bull trend; therefore, shorting a low 2 was a low-probability trade.' };
function hlText(i, up, o) { const H = up ? 'H' : 'L', hi = up ? '高点超过' : '低点低于';
  let t = `：Bar ${i + 1} 的${hi} Bar ${i} 的${up ? '高点' : '低点'}，这段${up ? '回调' : '反弹'}里第 ${o.n} 次。信号 K = Bar ${o.sig + 1}，入场在它${up ? '高点上方' : '低点下方'} 1 tick。`;
  if (o.n === 2) t += o.brk ? `\n✓ ${H}1 和 ${H}2 之间突破过第一腿的${up ? '下降' : '上升'}趋势线（从 Bar ${o.line ? o.line.a + 1 : '?'} 起，图上虚线）。书：“${HLQ.brk}”${up ? '' : '（书里以 H1/H2 为例，L 对称。）'}`
    : `\n? ${H}1 和 ${H}2 之间没有突破第一腿的${up ? '下降' : '上升'}趋势线（图上虚线）。书：“${HLQ.brk}” “${HLQ.nobrk}”（没有突破就先别${up ? '买' : '卖'}：这时的 ${H}1、${H}2 更可能只是一段${up ? '下行' : '上行'}通道里的一部分，整段还只是一个复杂的第一腿。）${up ? '' : '书里是以 H1/H2 为例写的，L 对称。'}`;
  if (o.after4) t += up ? `\n△ 这是 H4 失败之后重新开始的计数。书：“${HLQ.fail4H}”（H4 没能恢复趋势、又跌破它的低点，市场很可能已不是牛趋势里的回调，而是一段熊波段。等更多价格行为再交易。）`
    : `\n△ 这是 L4 失败之后重新开始的计数。书：“${HLQ.fail4L}”（L4 失败说明空头失去控制：要么变成多空轮流的双向市场，要么多头掌控。）`;
  if (o.weak) t += up ? `\n△ 自动判读这时 always-in 是空。书：“${HLQ.weakH}”（熊趋势里买 H1 是低胜率交易。）` : `\n△ 自动判读这时 always-in 是多。书：“${HLQ.weakL}”（涨得这么强，可能已是牛趋势，卖 L2 是低胜率交易。）`;
  return t; }
function drawHLLine(ctx, F, ln) { if (!ln) return; ctx.save(); ctx.strokeStyle = '#7b5cd6'; ctx.lineWidth = 1.5; ctx.setLineDash([5, 3]);
  ctx.beginPath(); ctx.moveTo(F.x(ln.a + 1), F.y(ln.pa)); ctx.lineTo(F.x(ln.b + 1), F.y(ln.pb)); ctx.stroke(); ctx.restore(); }
/* 计数打开时，对照我自己标的 H1–L4：和自动计数同一根、同一个数 → 绿，否则红；没打开 → null（原色） */
function hlCheck(l) { if (!S.guides.hl || !hlAvail() || !/^[HL][1-4]$/.test(l.code) || !G.hl[l.i - 1]) return null;
  return G.hl[l.i - 1][l.code[0]] === +l.code[1] ? '#1a9b5c' : '#d6336c'; }
function drawLabel(ctx, F, l, color) { const b = barAt(l.i); if (!b) return; ctx.font = '12px -apple-system, sans-serif'; const w = ctx.measureText(l.code).width + 10; const x = F.x(l.i) - w / 2;
  const y = l.above ? F.y(b.h) - 21 - (l.stack || 0) * 19 : F.y(b.l) + 6 + (l.stack || 0) * 19;
  ctx.fillStyle = '#f1edfb'; ctx.strokeStyle = color; ctx.lineWidth = 1; ctx.beginPath(); if (ctx.roundRect) ctx.roundRect(x, y, w, 17, 5); else ctx.rect(x, y, w, 17); ctx.fill(); ctx.stroke();
  ctx.fillStyle = color; ctx.textBaseline = 'middle'; ctx.fillText(l.code, x + 5, y + 9); l._box = { x, y, w, h: 17 }; }

// ================================================================ 逐根
function startPlay() { show('#scrPlay'); $('#askBox').innerHTML = '<div class="empty">手机练习端不提供答案或提示。完成后请导出记录，在本地完整版本中复盘。</div>'; buildPalette(); buildGuides(); setSeg('#segAI', S.curAI); setSeg('#segCtx', S.curCtx); switchTab('trade'); renderSide(); drawMain(); logEv('open'); }
function next() {
  if (modalOpen() || S.finished) return; if (S.blocked) { switchTab('ask'); flash($('#askBox')); return; }
  if (S.n >= G.rth.length) return finishDay();
  (S.hist = S.hist || []).push(snapBar()); if (S.hist.length > 120) S.hist.shift();
  S.n += 1; if (S.autoOn) { const a = G.auto[S.n - 1]; S.curAI = a.ai; S.curCtx = a.ctx; S.aiSrc[S.n] = 'auto'; S.ctxSrc[S.n] = 'auto'; setSeg('#segAI', S.curAI); setSeg('#segCtx', S.curCtx); }
  S.ai[S.n] = S.curAI; S.ctx[S.n] = S.curCtx; const b = G.rth[S.n - 1]; matchOrders(b); logEv('bar', { ai: S.curAI, ctx: S.curCtx });
  drawMain(); renderSide();
  S.hlShow = null; hlQuizCheck();
  const cp = K.checkpoints.find((c) => c.after_bar === S.n && !S.answers[c.id] && !S.skipped[c.id]);
  if (cp) { if (askOn()) { stopAuto(); askCheckpoint(cp); return; } S.skipped[cp.id] = true; logEv('skip_q', { id: cp.id }); }
  if (S.n >= G.rth.length) { stopAuto(); finishDay(); }
}
/* 后退一根：恢复到上一根收盘时的状态（判读、信号、挂单、持仓、交易）。
   Brooks 提问已答的不撤销、不再问；画的线和标注保留，只去掉画在未来 K 线上的。后退次数记入成绩。 */
const SNAP_KEYS = ['n', 'ai', 'curAI', 'ctx', 'curCtx', 'aiSrc', 'ctxSrc', 'signals', 'orders', 'canceled', 'pos', 'trades', 'tradeSeq'];
function snapBar() { const o = {}; SNAP_KEYS.forEach((k) => o[k] = S[k]); return JSON.stringify(o); }
function back() {
  if (modalOpen() || S.finished) return; if (S.blocked) { switchTab('ask'); flash($('#askBox')); return; }
  if (!S.hist?.length || S.n <= 1) { flash($('#btnBack')); return; }
  stopAuto(); const o = JSON.parse(S.hist.pop()); SNAP_KEYS.forEach((k) => S[k] = o[k]); S.rewinds = (S.rewinds || 0) + 1;
  S.labels = S.labels.filter((l) => l.i <= S.n); S.mms = S.mms.filter((m) => m.a.i <= S.n && m.b.i <= S.n);
  setSeg('#segAI', S.curAI); setSeg('#segCtx', S.curCtx); logEv('back', { to: S.n }); drawMain(); renderSide(); }
/* 规则练习（计数关着时）：出现第 2 次计数（H2/L2）就问两步：①这是第几次 ②H1 和 H2 之间有没有突破趋势线。不计入 Brooks 提问的分数。 */
function hlQuizCheck() { const box = $('#hlQuiz'); if (!box) return; box.classList.add('hidden');
  if (!hlAvail() || S.guides.hl || !S.n || S.n >= G.rth.length) return; /* 最后一根直接收盘，不问 */ const i = S.n - 1, c = G.hl[i]; S.hlq = S.hlq || [];
  for (const up of [true, false]) { const o = c[up ? 'h' : 'l']; if (!o || o.n !== 2 || S.hlq.some((q) => q.bar === S.n && q.up === up)) continue;
    stopAuto(); const H = up ? 'H' : 'L', rec = { bar: S.n, up }; S.hlq.push(rec); box.classList.remove('hidden');
    box.innerHTML = `<b>规则练习</b> · Bar ${S.n} 的${up ? '高点超过了前一根高点' : '低点低于前一根低点'}。这是这段${up ? '回调' : '反弹'}里的第几次？
      <span class="row">${[1, 2, 3, 4].map((k) => `<button class="btn sm" data-k="${k}">${H}${k}</button>`).join('')}</span>`;
    $$('#hlQuiz [data-k]').forEach((bt) => bt.onclick = () => { rec.count = +bt.dataset.k === 2;
      box.innerHTML = `<b>规则练习</b> · ${rec.count ? '✓ 对' : '✗ 不对'}，这是 <b>${H}2</b>（${H}1 之后又走了一腿，再次${up ? '越过前一根高点' : '跌破前一根低点'}）。<br>
        ${H}1 和 ${H}2 之间，有没有突破第一腿的${up ? '下降' : '上升'}趋势线（从${up ? '回调起点的高点' : '反弹起点的低点'}画、贴着第一腿的${up ? '高点' : '低点'}）？
        <span class="row"><button class="btn sm" data-b="1">有突破</button><button class="btn sm" data-b="0">没有突破</button></span>`;
      $$('#hlQuiz [data-b]').forEach((b2) => b2.onclick = () => { rec.brk = (+b2.dataset.b === 1) === o.brk; S.hlShow = o.line; logEv('hlq', rec);
        const ok = S.hlq.filter((q) => q.count && q.brk).length, tot = S.hlq.filter((q) => q.brk !== undefined).length;
        box.innerHTML = `<b>规则练习</b> · ${rec.brk ? '✓ 对' : '✗ 不对'}：${o.brk ? '有突破（紫色虚线就是那条趋势线，H1 之后有 K 线越过了它）' : '没有突破（紫色虚线就是那条趋势线，H1 之后没有 K 线越过它）'}。
          <div class="small" style="margin-top:4px"><i>书：</i>“${HLQ.brk}”${o.brk ? '' : ` “${HLQ.nobrk}”`}<br>${o.brk ? '（至少要有一次小的趋势线突破，说明顺势交易者还在。）' : '（没有突破就先别' + (up ? '买' : '卖') + '：这时的 ' + H + '1、' + H + '2 更可能只是一段' + (up ? '下行' : '上行') + '通道，整段还只是一个复杂的第一腿。）'}
          ${o.weak ? `<br>△ 另外，自动判读这时 always-in 是${up ? '空' : '多'}：“${up ? HLQ.weakH : HLQ.weakL}”` : ''}</div>
          <div class="muted small">本局两步都答对：${ok}/${tot}　<button class="btn sm" id="hlqClose">收起</button></div>`;
        $('#hlqClose').onclick = () => box.classList.add('hidden'); drawMain(); }); });
    return; } }
function askCheckpoint(cp) { S.blocked = cp.id; $('#btnNext').disabled = true; $('#askDot').classList.remove('hidden'); switchTab('ask'); const box = $('#askBox'); box.classList.add('q-card');
  renderQuestion(box, cp, () => { box.classList.remove('q-card'); box.innerHTML = '<div class="empty">答完了。继续下一根吧。</div>'; S.blocked = null; $('#btnNext').disabled = false; $('#askDot').classList.add('hidden'); switchTab('trade');
    if (S.n >= G.rth.length) finishDay(); }); }
function flash(el) { el.animate([{ boxShadow: '0 0 0 4px rgba(217,138,0,.6)' }, { boxShadow: '0 0 0 0 rgba(217,138,0,0)' }], { duration: 700 }); }
function switchTab(t) { $$('#sideTabs button').forEach((b) => b.classList.toggle('on', b.dataset.tab === t)); $$('.side .pane').forEach((p) => p.classList.toggle('hidden', p.dataset.pane !== t)); }
function setSeg(sel, v) { $$(sel + ' button').forEach((b) => b.classList.toggle('on', b.dataset.v === v)); }
function setAI(v) { S.curAI = v; if (S.n) { S.ai[S.n] = v; S.aiSrc[S.n] = 'me'; } logEv('ai', { v }); setSeg('#segAI', v); drawMain(); renderSide(); }
function setCtx(v) { S.curCtx = v; if (S.n) { S.ctx[S.n] = v; S.ctxSrc[S.n] = 'me'; } logEv('ctx', { v }); setSeg('#segCtx', v); drawMain(); }
function markSignal(dir) { if (!S.n) return; const i = S.signals.findIndex((s) => s.bar === S.n);
  if (i >= 0 && S.signals[i].dir === dir) S.signals.splice(i, 1); else { if (i >= 0) S.signals.splice(i, 1); S.signals.push({ bar: S.n, dir }); }
  logEv('signal', { dir }); drawMain(); renderSide(); }
function orderType(dir, price) { const c = S.n ? G.rth[S.n - 1].c : G.yC; return dir === '多' ? (price > c ? '止损' : '限价') : (price < c ? '止损' : '限价'); }
function fillPrice(o, b) { if (o.type === '止损') { if (o.dir === '多' && b.h >= o.price) return Math.max(o.price, b.o); if (o.dir === '空' && b.l <= o.price) return Math.min(o.price, b.o); }
  if (o.type === '限价') { if (o.dir === '多' && b.l <= o.price) return Math.min(o.price, b.o); if (o.dir === '空' && b.h >= o.price) return Math.max(o.price, b.o); } return null; }
function matchOrders(b) { const n = S.n; if (S.pos) managePos(b, false);
  for (const o of [...S.orders]) { if (S.pos) break; const px = fillPrice(o, b);
    if (px != null) { S.orders = S.orders.filter((x) => x !== o); const note = px !== o.price ? `跳过挂单价，以开盘价 ${fmt(px)} 成交（挂单 ${fmt(o.price)}）` : '';
      S.pos = { id: ++S.tradeSeq, dir: o.dir, setup: '', orderType: o.type, orderPrice: o.price, orderBar: o.placedAt, fillBar: n, entry: px, stop: o.stop, stop0: o.stop, target: null, qty: 2, qty0: 2,
        risk0: Math.abs(px - o.stop), exits: [], aiAtEntry: S.curAI, ctxAtEntry: S.curCtx, mfe: 0, mae: 0, note }; logEv('fill', { id: S.pos.id, price: px }); managePos(b, true); }
    else if (o.autoCancel && o.placedAt < n) { S.orders = S.orders.filter((x) => x !== o); S.canceled.push({ ...o, canceledAt: n, reason: '下一根没成交，自动撤' }); logEv('autocancel', { dir: o.dir, price: o.price }); } } }
function managePos(b, entryBar) { const p = S.pos, d = p.dir === '多' ? 1 : -1;
  p.mfe = Math.max(p.mfe, d > 0 ? b.h - p.entry : p.entry - b.l); p.mae = Math.max(p.mae, d > 0 ? p.entry - b.l : b.h - p.entry);
  const stopHit = d > 0 ? b.l <= p.stop : b.h >= p.stop, tgtHit = p.target != null && (d > 0 ? b.h >= p.target : b.l <= p.target);
  if (stopHit) { exitPos(p.qty, entryBar ? p.stop : (d > 0 ? Math.min(p.stop, b.o) : Math.max(p.stop, b.o)), tgtHit ? '止损（同一根也碰到目标，保守按止损计）' : (Math.abs(p.stop - p.entry) < 1e-9 ? '保本止损' : '止损')); return; }
  if (tgtHit) exitPos(p.qty, entryBar ? p.target : (d > 0 ? Math.max(p.target, b.o) : Math.min(p.target, b.o)), '目标'); }
function exitPos(qty, price, reason) { const p = S.pos; p.exits.push({ bar: S.n, price, qty, reason }); p.qty -= qty; logEv('exit', { id: p.id, price, qty, reason }); if (p.qty <= 0) { closeTrade(p); S.pos = null; } }
function closeTrade(p) { const d = p.dir === '多' ? 1 : -1; const pts = p.exits.reduce((s, x) => s + (x.price - p.entry) * d * x.qty, 0);
  p.usd = r2(pts * G.point_value); p.R = r2(p.risk0 ? (pts / p.qty0) / p.risk0 : 0); p.exitBar = p.exits[p.exits.length - 1].bar; S.trades.push(p); }

function renderAuto() {
  const el = $('#autoWhy'); const n = S.n; $('#tgAuto').classList.toggle('on', S.autoOn);
  if (!S.autoOn) { el.innerHTML = '<span class="muted">自动判读已关闭（练习模式）：方向和背景由你自己判断，收盘后在复盘里对照。</span>'; return; }
  if (!n) { el.innerHTML = '<span class="muted">开盘后，软件会按 Brooks 的原则每根自动判读；你不同意就点按钮改，改动只算这一根。</span>'; return; }
  const a = G.auto[n - 1], ov = (S.aiSrc[n] === 'me' && S.ai[n] !== a.ai) || (S.ctxSrc[n] === 'me' && S.ctx[n] !== a.ctx);
  el.innerHTML = `<b>自动判读</b>：always-in <b>${a.ai}</b>（${esc(a.aiWhy)}）· 背景 <b>${a.ctx}</b>（${esc(a.ctxWhy)}）${ov ? ' · <span style="color:var(--mine);font-weight:600">你已改判</span>' : ''}`;
}
function renderSide() {
  renderAuto(); const n = S.n; $('#barInfo').textContent = n ? `Bar ${n} / ${G.rth.length} · ${G.rth[n - 1].t} PT` : '开盘前'; $('#progBar').style.width = (n / G.rth.length * 100) + '%';
  const p = S.pos; let html = '';
  S.orders.forEach((o) => { html += `<div class="pos">挂单 · ${o.dir === '多' ? '买' : '卖'}${o.type} <b>${fmt(o.price)}</b> · 止损 ${fmt(o.stop)} · 风险 ${fmt(Math.abs(o.price - o.stop))} 点</div>`; });
  if (p) { const last = G.rth[n - 1].c, d = p.dir === '多' ? 1 : -1, open = (last - p.entry) * d;
    html += `<div class="pos"><b>持仓</b> ${p.dir} ${p.qty}/${p.qty0} 手 @ <b>${fmt(p.entry)}</b><br>止损 ${fmt(p.stop)} · 目标 ${p.target == null ? '无' : fmt(p.target)}<br>
      浮动 <span class="${open >= 0 ? 'win' : 'loss'}">${open >= 0 ? '+' : ''}${fmt(open)} 点 · ${r2(open / (p.risk0 || 1))}R</span>${p.note ? `<br><span class="muted small">${esc(p.note)}</span>` : ''}</div>`; }
  $('#posBox').innerHTML = html || '<div class="empty" style="padding:4px 0">没有挂单或持仓</div>';
  ['#btnT1', '#btnT2', '#btnT0', '#btnBE', '#btnHalf', '#btnFlat'].forEach((id) => $(id).disabled = !p); $('#btnCancel').disabled = !S.orders.length;
  ['#btnBuy', '#btnSell', '#btnSigBuy', '#btnSigSell'].forEach((id) => $(id).disabled = !!p || !n);
  $('#btnBuy').classList.toggle('on', S.tool === 'buy'); $('#btnSell').classList.toggle('on', S.tool === 'sell');
  const answered = Object.values(S.answers), ok = answered.filter((a) => a.correct).length, closed = S.trades, totR = r2(closed.reduce((s, t) => s + t.R, 0));
  $('#kpis').innerHTML = `<div class="kpi"><div class="v">${ok}/${answered.length}</div><div class="l">问答答对</div></div><div class="kpi"><div class="v">${closed.length}</div><div class="l">交易笔数</div></div>
    <div class="kpi"><div class="v ${totR >= 0 ? 'win' : 'loss'}">${totR >= 0 ? '+' : ''}${totR}R</div><div class="l">合计</div></div>`;
  const all = [...(p ? [p] : []), ...closed.slice().reverse()];
  $('#tradeList').innerHTML = all.map((t) => `<div class="it">#${t.id} ${t.dir} · B${t.fillBar} @${fmt(t.entry)}${t.exitBar ? ` → B${t.exitBar} <span class="${t.R >= 0 ? 'win' : 'loss'}">${t.R >= 0 ? '+' : ''}${t.R}R</span>` : ' <span class="muted">持仓中</span>'}
    <select data-tid="${t.id}">${SETUPS.map((s) => `<option ${s === t.setup ? 'selected' : ''} value="${s}">${s || 'setup？'}</option>`).join('')}</select></div>`).join('') || '<div class="empty">还没有交易</div>';
  $$('#tradeList select').forEach((s) => s.onchange = () => { const t = all.find((x) => x.id === +s.dataset.tid); if (t) { t.setup = s.value; logEv('tag', { id: t.id, setup: s.value }); } });
  $('#sigList').innerHTML = S.signals.slice().sort((a, b) => b.bar - a.bar).map((s) => `<div class="it"><span class="${s.dir === '多' ? 'win' : 'loss'}">${s.dir === '多' ? '▲ 多头' : '▼ 空头'}</span> 信号 K · Bar ${s.bar}</div>`).join('') || '<div class="empty">还没有标信号 K</div>';
  const sig = S.signals.find((s) => s.bar === n); $('#btnSigL').classList.toggle('on', sig?.dir === '多'); $('#btnSigS').classList.toggle('on', sig?.dir === '空');
}
function startOrder(dir) { if (!S.n || S.pos) return; const t = dir === '多' ? 'buy' : 'sell'; setTool(S.tool === t ? null : t); }
function placeOrder(dir, price, stop, how) { if ((dir === '多' && stop >= price) || (dir === '空' && stop <= price)) { modeHint('止损要在入场价另一侧，请重新点止损价'); return false; }
  const o = { dir, type: orderType(dir, price), price: tickR(price), stop: tickR(stop), placedAt: S.n, autoCancel: $('#tgAutoCancel').checked }; S.orders = [o]; logEv('order', { dir, otype: o.type, price: o.price, stop: o.stop, how }); return true; }
function sigOrder(dir) { if (!S.n || S.pos) return; const b = G.rth[S.n - 1], t = G.tick; placeOrder(dir, dir === '多' ? b.h + t : b.l - t, dir === '多' ? b.l - t : b.h + t, 'signal'); setTool(null); }
function setTarget(m) { const p = S.pos; if (!p) return; const d = p.dir === '多' ? 1 : -1; p.target = m ? tickR(p.entry + d * m * p.risk0) : null; logEv('target', { id: p.id, target: p.target }); drawMain(); renderSide(); }
function exitNow(part) { const p = S.pos; if (!p) return; exitPos(part ? Math.max(1, Math.floor(p.qty / 2)) : p.qty, G.rth[S.n - 1].c, part ? '手动平一半（收盘价）' : '手动全平（收盘价）'); drawMain(); renderSide(); }

// ---------------- 工具与鼠标
function setTool(t) { S.tool = t; S.toolPts = []; $('#palette').classList.toggle('hidden', t !== 'label');
  $$('#rail [data-tool]').forEach((b) => { const bt = b.dataset.tool; b.classList.toggle('on', bt ? bt === t : !['label', 'hline', 'mm'].includes(t)); });
  modeHint({ buy: '买：点入场价', sell: '卖：点入场价', mm: '测量：按住鼠标从一段腿的起点拖到终点', hline: '点一下放水平线（Esc 结束）', label: '选一个标签，再点 K 线（Esc 结束）' }[t] || ''); renderSide(); drawMain(); }
function modeHint(t, el = '#modeHint') { const h = $(el); h.textContent = t; h.classList.toggle('hidden', !t); }
function buildPalette() { $('#palette').innerHTML = LABELS.map((c) => `<button class="btn sm" data-code="${c}" title="${esc(tipText(c))}">${c}</button>`).join('');
  $$('#palette .btn').forEach((b) => b.onclick = () => { S.labelCode = b.dataset.code; $$('#palette .btn').forEach((x) => x.classList.toggle('on', x === b)); }); }
function buildGuides() { if (hlAvail() && S.guides.hl === undefined) S.guides.hl = loadHLPref();
  const names = { ...(hlAvail() ? { hl: 'H1/H2 计数' } : {}), btype: 'K 线类型', mc: '微通道', run: '连续趋势 K', tail: '昨日尾段', yhl: '昨高低', yc: '昨收', gx: '夜盘高低', open: '今开', ema: '20 EMA', round: '整数关口', or: '开盘区间' };
  $('#guides').innerHTML = '<span class="jlabel">辅助线</span>' + Object.entries(names).map(([k, v]) => `<span class="chip ${S.guides[k] ? 'on' : ''}" data-g="${k}">${v}</span>`).join('');
  $$('#guides .chip').forEach((c) => c.onclick = () => toggleGuide(c.dataset.g));
  const hc = $('#guides [data-g="hl"]'); if (hc) hc.title = '按书的定义自动数 H1–H4（买方计数）/ L1–L4（卖方计数）。关掉时可以用标注工具自己标 H1、L2…，再打开对照：对的标注变绿、错的变红（K 键）'; }
function toggleGuide(k) { S.guides[k] = S.guides[k] ? 0 : 1; if (k === 'hl') { saveHLPref(S.guides.hl); logEv('hl', { on: S.guides.hl }); }
  $$(`#guides [data-g="${k}"]`).forEach((c) => c.classList.toggle('on', !!S.guides[k])); drawMain(); if (!$('#scrReview').classList.contains('hidden')) drawReview(); }
function tipText(code) { const g = G.glossary[code]; return g ? `${g.name}：${g.def}` : code; }
function snapPoint(F, x, y, upto) { const i = Math.min(Math.max(1, F.i(x)), Math.max(1, upto)); const b = G.rth[i - 1]; let p = F.p(y), ext = null;
  if (b) { if (Math.abs(F.y(b.h) - y) < 7) { p = b.h; ext = 'h'; } else if (Math.abs(F.y(b.l) - y) < 7) { p = b.l; ext = 'l'; } } return { i, p: tickR(p), ext }; }
function snapOrder(x, y) { const s = snapPoint(S.F, x, y, S.n); if (s.ext === 'h') s.p += G.tick; if (s.ext === 'l') s.p -= G.tick; return s; }
function addLabel(code, i, above) { const stack = S.labels.filter((l) => l.i === i && l.above === above).length; S.labels.push({ code, i, above, stack, atBar: S.n }); S.undo.push('label'); logEv('label', { code, i }); drawMain(); }
function labelAt(x, y) { return S.labels.find((l) => l._box && x >= l._box.x && x <= l._box.x + l._box.w && y >= l._box.y && y <= l._box.y + l._box.h); }
function undo() { const t = S.undo.pop(); if (t === 'label') S.labels.pop(); if (t === 'hline') S.hlines.pop(); if (t === 'mm') S.mms.pop(); drawMain(); }
const posIn = (ev, el) => { const r = el.getBoundingClientRect(); return { x: ev.clientX - r.left, y: ev.clientY - r.top }; };
function onDown(ev) { if (ev.button !== 0) return; hideCtx(); const { x, y } = posIn(ev, $('#cvMain'));
  if (S.tool === 'mm') { const a = snapPoint(S.F, x, y, S.n); S.drag = { kind: 'mm', a, b: a }; return; }
  if (!S.tool) { const t = (S.dragTargets || []).find((d) => Math.abs(d.y - y) < 6); if (t) { S.drag = { kind: 'line', t }; ev.preventDefault(); } } }
function onMove(ev) { const { x, y } = posIn(ev, $('#cvMain')); S.mouse = { x, y }; const F = S.F; if (!F) return;
  if (S.drag?.kind === 'mm') S.drag.b = snapPoint(F, x, y, S.n); if (S.drag?.kind === 'line') { S.drag.t.set(tickR(F.p(y))); renderSide(); }
  $('#cvMain').style.cursor = S.drag?.kind === 'line' || (!S.tool && (S.dragTargets || []).some((d) => Math.abs(d.y - y) < 6)) ? 'ns-resize' : 'crosshair';
  const i = F.i(x), b = barAt(i), hb = $('#hoverBox');
  if (b && i <= S.n) { hb.classList.remove('hidden'); const tg = i >= 1 ? G.tags[i - 1] : null;
    hb.innerHTML = `${i >= 1 ? 'Bar ' + i : '昨日'} · ${b.t} PT · 开 ${fmt(b.o)} 高 ${fmt(b.h)} 低 ${fmt(b.l)} 收 ${fmt(b.c)} · EMA ${fmt(b.ema)}` +
      (tg && S.guides.btype ? `<br><b>${tg.tags.map((t) => t.name).join('、') || '普通 K 线'}</b> · ${esc(tg.desc)}${i === 1 ? ` · ${G.gap > 0 ? '跳空高开' : G.gap < 0 ? '跳空低开' : '平开'} ${fmt(Math.abs(G.gap))} 点` : ''}` : '') + mcHover(i); } else hb.classList.add('hidden');
  drawMain(); if (S.drag?.kind === 'mm') { const ctx = $('#cvMain').getContext('2d'); drawMM(ctx, F, { a: S.drag.a, b: S.drag.b }, true); }
  const tip = $('#tipBox'); tip.classList.add('hidden'); if ($('#tgTips').checked && !S.drag) { const hit = labelAt(x, y) || autoAt(x, y); if (hit) { showTip(tip, hit.code, x, y, F.W, hit.extra ? esc(hit.extra).replace(/\n/g, '<br>') : ''); if (hit.line) drawHLLine($('#cvMain').getContext('2d'), F, hit.line); } } }
function autoAt(x, y) { return [...(S.autoBoxes || [])].reverse().find((l) => x >= l.x - 2 && x <= l.x + l.w + 2 && y >= l.y - 2 && y <= l.y + l.h + 2); }
/* 悬停：这一根在不在微通道 / 连续段里（截至当前已出现的 K 线） */
function mcHover(i) { if (i < 1 || !G.mc) return ''; const out = [];
  if (S.guides.mc) for (const d of ['bull', 'bear']) { const c = G.mc[i - 1][d]; let e = i - 1; while (e + 1 < S.n && G.mc[e + 1][d].start === c.start) e++;
    const len = e - c.start + 1; if (len >= 3) out.push(`${d === 'bull' ? '牛' : '熊'}微通道 Bar ${c.start + 1}–${e + 1}（${len} 根，这是第 ${c.k} 根；每根${d === 'bull' ? '低点不低于前一根低点' : '高点不高于前一根高点'}）`); }
  if (S.guides.run) { const r = G.runs[i - 1]; if (r) { let e = i - 1; while (e + 1 < S.n && G.runs[e + 1] && G.runs[e + 1].start === r.start) e++; const len = e - r.start + 1;
    if (len >= 3) out.push(`连续 ${len} 根${r.up ? '阳' : '阴'}线 Bar ${r.start + 1}–${e + 1}`); } }
  if (S.guides.hl && hlAvail()) { const c = G.hl[i - 1];
    if (c.h) out.push(`<b style="color:#2f6fe4">H${c.h.n}${c.h.n === 2 && !c.h.brk ? '?' : ''}</b>（高点超过前一根高点；信号 K = Bar ${c.h.sig + 1}）`);
    if (c.l) out.push(`<b style="color:#c2255c">L${c.l.n}${c.l.n === 2 && !c.l.brk ? '?' : ''}</b>（低点低于前一根低点；信号 K = Bar ${c.l.sig + 1}）`); }
  return out.length ? '<br>' + out.join(' · ') : ''; }
function onUp() { if (S.drag?.kind === 'mm') { const { a, b } = S.drag; if (a.i !== b.i || a.p !== b.p) { S.mms.push({ a, b }); S.undo.push('mm'); logEv('mm', { a, b }); } S.justDragged = true; }
  if (S.drag?.kind === 'line') { logEv('drag'); S.justDragged = true; } S.drag = null; drawMain(); renderSide(); }
function onClick(ev) { if (S.justDragged) { S.justDragged = false; return; } const { x, y } = posIn(ev, $('#cvMain')); const F = S.F;
  if (S.tool === 'buy' || S.tool === 'sell') { const dir = S.tool === 'buy' ? '多' : '空', p = snapOrder(x, y).p;
    if (!S.toolPts.length) { S.toolPts.push({ p }); modeHint(`${dir === '多' ? '买' : '卖'}：入场 ${fmt(p)}（${orderType(dir, p)}单），再点止损价`); } else if (placeOrder(dir, S.toolPts[0].p, p, 'click')) setTool(null);
    drawMain(); return; }
  if (S.tool === 'hline') { const p = snapPoint(F, x, y, S.n).p; S.hlines.push({ p }); S.undo.push('hline'); logEv('hline', { p }); drawMain(); return; }
  if (S.tool === 'label') { if (!S.labelCode) { modeHint('先在图下方选一个标签'); return; } const i = Math.min(Math.max(1, F.i(x)), S.n); const b = G.rth[i - 1]; if (b) addLabel(S.labelCode, i, y < F.y((b.h + b.l) / 2)); } }
function onContext(ev) { ev.preventDefault(); if (!S.n) return; const { x, y } = posIn(ev, $('#cvMain')); const F = S.F, m = $('#ctxMenu'), hit = labelAt(x, y);
  const i = Math.min(Math.max(1, F.i(x)), S.n), b = G.rth[i - 1], above = y < F.y((b.h + b.l) / 2);
  m.innerHTML = (hit ? `<button class="btn sm danger" data-del="1" style="grid-column:1/-1">删除标注 ${esc(hit.code)}</button>` : '') + `<div class="t">Bar ${i} ${above ? '上方' : '下方'}标注</div>` +
    QUICK.map((c) => `<button class="btn sm" data-c="${c}" title="${esc(tipText(c))}">${c}</button>`).join('') + `<button class="btn sm" data-more="1">更多…</button>`;
  m.style.left = Math.min(x, F.W - 350) + 'px'; m.style.top = Math.min(y, F.H - 210) + 'px'; m.classList.remove('hidden');
  $$('[data-c]', m).forEach((btn) => btn.onclick = () => { addLabel(btn.dataset.c, i, above); hideCtx(); });
  const del = $('[data-del]', m); if (del) del.onclick = () => { S.labels = S.labels.filter((l) => l !== hit); hideCtx(); drawMain(); }; $('[data-more]', m).onclick = () => { hideCtx(); setTool('label'); }; }
function hideCtx() { $('#ctxMenu').classList.add('hidden'); }
function showTip(tip, code, x, y, W, extra = '') { const g = G.glossary[code]; if (!g) return;
  tip.innerHTML = `<b>${esc(g.name)}</b>${extra}<div>${esc(g.def)}</div>${g.brooks ? `<div style="margin-top:4px"><i>Brooks：</i>${esc(g.brooks)}</div>` : ''}${g.trade && g.trade !== '—' ? `<div style="margin-top:4px"><i>怎么做：</i>${esc(g.trade)}</div>` : ''}<div class="src">出处：知识卡片 ${esc(g.src)}</div>${alTip(code)}`;
  tip.style.left = Math.max(4, Math.min(x + 14, W - 390)) + 'px'; tip.style.top = (y + 14) + 'px'; tip.classList.remove('hidden'); }
function stopAuto() { if (autoTimer) { clearInterval(autoTimer); autoTimer = null; $('#btnAuto').classList.remove('on'); $('#btnAuto').textContent = '自动'; } }
function toggleAuto() { if (autoTimer) return stopAuto(); autoTimer = setInterval(() => { if (!modalOpen() && !S.blocked) next(); }, +$('#selSpeed').value); $('#btnAuto').classList.add('on'); $('#btnAuto').textContent = '暂停'; }

// ================================================================ 收盘：盘中打分
function finishDay() {
  if (S.finished) return;
  if (S.pos) exitPos(S.pos.qty, G.rth[G.rth.length - 1].c, '收盘平仓');
  S.orders = []; S.finished = true; S.endedAt = new Date().toISOString(); S.tool = null; stopAuto();
  const st = loadStore(); st.sessions.push({ date: S.date, mode: '手机盲练', startedAt: S.startedAt, endedAt: S.endedAt, trades: S.trades, signals: S.signals, ai: S.ai, ctx: S.ctx, labels: S.labels, hlines: S.hlines, mms: S.mms, log: S.log, totalR: r2(S.trades.reduce((sum, trade) => sum + trade.R, 0)), rewinds: S.rewinds || 0, score: { total: 0, max: 0, parts: [] }, quiz: {}, skippedQ: 0, entriesCaught: 0, signalsSeen: 0, arrows: 0, falseSignals: 0, phasePct: 0, reviewScore: null, hlq: [] }); saveStore(st);
  openModal(`<h3>本局已保存</h3><p class="small muted">你的判断、交易、标注和反馈已保存在这台手机。请导出记录，并在本地完整版本中导入后与答案复盘。</p><div class="row"><button class="btn primary" id="practiceExport">导出本局记录</button><button class="btn" id="practiceHome">返回关卡</button></div>`);
  $('#practiceExport').onclick = () => download(`brooks-practice-${S.date}-${S.startedAt.slice(0, 16).replace(/[:T]/g, '')}.json`, loadStore());
  $('#practiceHome').onclick = () => { closeModal(); renderHome(); };
}
function phaseAgreement() { let tot = 0, ok = 0; (K.phases || []).forEach((p) => { for (let i = p.from; i <= p.to; i++) { tot++; if (p.ok.includes(S.ctx[i])) ok++; } }); return { tot, ok, pct: tot ? ok / tot : 0 }; }
function overrideStats() {
  let tot = 0, autoOk = 0, n = 0, better = 0, worse = 0;
  (K.phases || []).forEach((p) => { for (let i = p.from; i <= p.to; i++) { tot++; const a = G.auto[i - 1].ctx, u = S.ctx[i], aOk = p.ok.includes(a), uOk = p.ok.includes(u);
    if (aOk) autoOk++; if (S.ctxSrc[i] === 'me' && u !== a) { n++; if (uOk && !aOk) better++; if (!uOk && aOk) worse++; } } });
  return { tot, autoOk, n, better, worse };
}
function signalMatch() {
  const res = K.arrows.map((a) => { const sig = S.signals.find((s) => s.dir === a.dir && Math.abs(s.bar - a.signal) <= 1); const tr = S.trades.find((t) => t.dir === a.dir && Math.abs(t.fillBar - a.bar) <= 1);
    return { a, seen: !!(sig || tr), how: sig ? `标了信号 K（Bar ${sig.bar}）` : tr ? `直接下单成交（Bar ${tr.fillBar}）` : '' }; });
  const extra = S.signals.filter((s) => !K.arrows.some((a) => a.dir === s.dir && Math.abs(s.bar - a.signal) <= 2)); return { res, extra };
}
function scorePlay() {
  const parts = []; let total = 0, max = 0; const add = (name, got, mx, detail) => { parts.push({ name, got, mx, detail }); total += got; max += mx; };
  const qpart = (name, qs, pts) => { const live = qs.filter((q) => !S.skipped[q.id] || S.answers[q.id]), ok = live.filter((q) => S.answers[q.id]?.correct).length, sk = qs.length - live.length;
    add(name, ok * pts, live.length * pts, live.length ? `${ok}/${live.length} 答对${sk ? `（关闭提问，跳过 ${sk} 题）` : ''}` : '提问已关闭，不计分'); };
  qpart('开盘前判断', K.premarket_questions, 10);
  qpart('Brooks 提问', K.checkpoints.filter((c) => !c.kind), 10);
  qpart('结构判断', K.checkpoints.filter((c) => c.kind === 'structure'), 10);
  qpart('日型', K.checkpoints.filter((c) => c.kind === 'daytype'), 30);
  const ph = phaseAgreement(), ov = overrideStats();
  if (S.autoOn) add('背景判断', 0, 0, `自动判读模式不计分：自动与 Brooks 阶段一致 ${ov.autoOk}/${ov.tot}；你改判 ${ov.n} 根（改对 ${ov.better}、改错 ${ov.worse}）`);
  else add('背景判断', Math.round(ph.pct * 40), 40, `${ph.ok}/${ph.tot} 根与 Brooks 的阶段一致（自动判读是 ${ov.autoOk}/${ov.tot}）`);
  const sm = signalMatch(), seen = sm.res.filter((r) => r.seen).length; add('信号识别', seen * 10 - sm.extra.length * 2, K.arrows.length * 10, `${seen}/${K.arrows.length} 个 Brooks 入场看到了；多标 ${sm.extra.length} 个（每个 −2）`);
  const used = new Set(), er = []; let eg = 0;
  K.arrows.forEach((a) => { const cand = S.trades.filter((t) => t.dir === a.dir && !used.has(t.id) && Math.abs(t.fillBar - a.bar) <= 3).sort((x, y) => Math.abs(x.fillBar - a.bar) - Math.abs(y.fillBar - a.bar));
    if (cand.length) { const t = cand[0]; used.add(t.id); const lag = t.fillBar - a.bar; if (Math.abs(lag) <= 1) { eg += 20; er.push({ a, res: `抓到（#${t.id}，Bar ${t.fillBar}）`, cls: 'win' }); } else { eg += 10; er.push({ a, res: `${lag > 0 ? '晚了' : '早了'} ${Math.abs(lag)} 根（#${t.id}）`, cls: '' }); } }
    else { const pend = S.canceled.find((o) => o.dir === a.dir && o.placedAt >= a.bar - 2 && o.placedAt <= a.bar); if (pend) { eg += 5; er.push({ a, res: `挂了单没成交（Bar ${pend.placedAt}）`, cls: '' }); } else er.push({ a, res: '没有交易', cls: 'loss' }); } });
  const falseT = S.trades.filter((t) => !used.has(t.id)); add('入场成交', eg, K.arrows.length * 20, `${er.filter((x) => x.cls === 'win').length}/${K.arrows.length} 抓到`); add('虚假信号', falseT.length ? -5 * falseT.length : 0, 0, `${falseT.length} 笔成交在 Brooks 图上没有对应箭头（每笔 −5）`);
  const dg = S.trades.filter((t) => !((t.dir === '多' && t.aiAtEntry === '空') || (t.dir === '空' && t.aiAtEntry === '多'))).length; add('交易纪律', dg * 2, S.trades.length * 2, `${dg}/${S.trades.length} 笔没有逆着自己的 always-in`);
  return { parts, total, max, entries: er, falseT, signals: sm, phase: ph, R: r2(S.trades.reduce((s, t) => s + t.R, 0)) };
}
function summaryOf() { const s = S.score; return { date: S.date, mode: S.mode, startedAt: S.startedAt, endedAt: S.endedAt, score: { total: s.total, max: s.max, parts: s.parts.map(({ name, got, mx }) => ({ name, got, mx })) },
  trades: S.trades.map((t) => ({ id: t.id, dir: t.dir, setup: t.setup, fillBar: t.fillBar, exitBar: t.exitBar, entry: t.entry, stop0: t.stop0, R: t.R, usd: t.usd, mfe: r2(t.mfe), mae: r2(t.mae), aiAtEntry: t.aiAtEntry, ctxAtEntry: t.ctxAtEntry })),
  quiz: S.answers, skippedQ: Object.keys(S.skipped).length, entriesCaught: s.entries.filter((x) => x.cls === 'win').length, signalsSeen: s.signals.res.filter((r) => r.seen).length, arrows: K.arrows.length, falseSignals: s.falseT.length,
  phasePct: Math.round(s.phase.pct * 100), totalR: s.R, rewinds: S.rewinds || 0, hlq: S.hlq || [], review: null }; }
function updateStoredSession(patch) { const st = loadStore(); const x = st.sessions.find((s) => s.startedAt === S.startedAt); if (x) Object.assign(x, patch); saveStore(st); }

// ---------------- 错题本
function playWrongs() {
  const out = [];
  [...K.premarket_questions, ...K.checkpoints].forEach((q) => { const a = S.answers[q.id]; if (a && !a.correct) out.push({ key: `${K.date}:${q.id}`, date: K.date, kind: 'quiz', bar: q.after_bar || 0, title: q.q, qid: q.id }); });
  signalMatch().res.forEach((r) => { if (!r.seen) out.push({ key: `${K.date}:A${r.a.bar}`, date: K.date, kind: 'arrow', bar: r.a.bar, title: `Brooks 在 Bar ${r.a.bar} ${r.a.dir === '多' ? '买入' : '卖出'}（${r.a.near}）`, dir: r.a.dir, signal: r.a.signal }); });
  return out;
}
function addWrong(st, items) { items.forEach((it) => { if (!st.wrong.some((w) => w.key === it.key)) st.wrong.push({ ...it, box: 1, due: today(), added: today() }); }); }

// ================================================================ Ask Al 问答卡（07-playbook/cards/a01–a04，由 askal_build.py 打包进 data/askal.js）
const AA = () => window.ASKAL || { cards: {}, byTag: {} };
const AL_REL = { 一致: '与书一致', 补充: '书外补充', 新: '书里没有', 不同: '与书不同' };
const SAY_TAGS = [[/micro double top/i, '微双顶'], [/micro double bottom/i, '微双底'], [/double top/i, 'DT'], [/double bottom/i, 'DB'], [/wedge/i, '楔形'], [/three push|3 push/i, '三推'],
  [/climax|climactic|buy vacuum|sell vacuum/i, '高潮'], [/channel/i, '通道'], [/spike|surprise/i, 'spike'], [/measured move|measuring gap/i, 'MM'], [/always in/i, 'always-in'],
  [/major trend reversal|\bMTR\b/, 'MTR'], [/trend ?line/i, '趋势线'], [/higher low/i, 'HL'], [/lower high/i, 'LH'], [/bull flag/i, '牛旗'], [/bear flag/i, '熊旗'], [/final flag/i, '末旗'],
  [/failed breakout|breakout fail|failure/i, '失败突破'], [/breakout pullback/i, '突破回调'], [/breakout|broke (above|below)/i, '突破'], [/trading range day/i, '区间日'], [/trading range|tight trading range|barb ?wire/i, '区间'],
  [/trend day|trend from the open/i, '趋势日'], [/small pullback/i, '小回调趋势'], [/second (entry|signal|leg)/i, '第二次入场'], [/\bH2\b|high 2/i, 'H2'], [/\bL2\b|low 2/i, 'L2'],
  [/opening reversal/i, '开盘反转'], [/\bgap(ped)? (up|down)\b|\bgap\b/i, '跳空'], [/outside (up |down )?bar/i, '外包'], [/\bii\b|inside bar/i, 'ii'], [/moving average gap bar|20 gap bar/i, '均线缺口K'],
  [/signal bar|reversal bar/i, '信号K'], [/limit order/i, '限价单'], [/scalp/i, '剥头皮'], [/swing/i, '波段'], [/last hour|close of the day|end of the day/i, '尾盘']];
function tagsFromText(t) { const out = []; SAY_TAGS.forEach(([re, tag]) => { if (re.test(t || '') && !out.includes(tag)) out.push(tag); }); return out; }
function stepTags(st) { if (st.type === 'label') return st.cat || []; if (st.type === 'arrow') return ['信号K', '第二次入场']; return tagsFromText(st.en); }
function alIds(tags, n = 40) { const A = AA(), out = [], lists = tags.map((t) => A.byTag[t] || []);
  for (let i = 0; out.length < n && lists.some((l) => i < l.length); i++) lists.forEach((l) => { if (i < l.length && !out.includes(l[i]) && out.length < n) out.push(l[i]); }); return out; }
const nl2br = (t) => esc(t).replace(/\n/g, '<br>');
function alCardHtml(id, open = false, noTitle = false) { const c = AA().cards[id]; if (!c) return '';
  const first = (c.pts || '').split('\n')[0];
  return `<div class="al-card">${noTitle ? '' : `<div class="al-t"><span class="al-id">${id}</span>${esc(c.t)}${c.relk ? ` <span class="al-rel r-${c.relk}">${AL_REL[c.relk]}</span>` : ''}</div>`}
    <div class="quote"><div class="en">“${esc(c.en)}”</div><div class="zh">${esc(c.zh)}</div></div>
    ${open ? '' : `<div class="small">${esc(first)}</div>`}
    <details ${open ? 'open' : ''}><summary class="small">看全文</summary><div class="al-full small">
      ${c.q && c.q !== '—（讲解）' ? `<div><b>学员问：</b>${esc(c.q)}</div>` : ''}<div><b>要点：</b>${nl2br(c.pts)}</div>
      ${c.tr && c.tr !== '—' ? `<div><b>交易方法：</b>${esc(c.tr)}</div>` : ''}${c.err && c.err !== '—' ? `<div><b>常见错误：</b>${esc(c.err)}</div>` : ''}
      <div><b>和书的关系：</b>${esc(c.rel)}</div></div></details>
    <div class="src">${esc(c.date || '')} · Ask Al：${esc(c.post || c.src || '')} · 标签 ${esc((c.tags || []).join('、'))}</div></div>`; }
function alBlock(tags, openKey = null) { const ids = alIds(tags); if (!ids.length) return '';
  const open = openKey === null || S?.review?.alOpen;
  return `<details class="al-block" ${open ? 'open' : ''} ${openKey ? 'data-remember="1"' : ''} data-ids="${ids.join(',')}" data-i="0"><summary><span class="al-h">Al 在问答里说过</span><span class="small muted">${esc(tags.join('、'))} · ${ids.length} 条</span></summary>
    <div class="al-nav"><button class="btn sm" data-al-prev>← 上一条</button><span class="small muted" data-al-pos>1 / ${ids.length}</span><button class="btn sm" data-al-next>换一条 →</button></div><div class="al-body">${alCardHtml(ids[0])}</div></details>`; }
function bindAl(root) { $$('.al-block', root).forEach((b) => { const ids = b.dataset.ids.split(','); const go = (d) => { const i = (+b.dataset.i + d + ids.length) % ids.length; b.dataset.i = i; $('.al-body', b).innerHTML = alCardHtml(ids[i]); $('[data-al-pos]', b).textContent = `${i + 1} / ${ids.length}`; };
  if (ids.length < 2) $('.al-nav', b).classList.add('hidden'); $('[data-al-next]', b).onclick = () => go(1); $('[data-al-prev]', b).onclick = () => go(-1);
  if (b.dataset.remember) b.addEventListener('toggle', () => { if (S?.review) S.review.alOpen = b.open; }); }); }
function alTip(code) { const id = alIds([code], 1)[0], c = id && AA().cards[id]; return c ? `<div class="al-tip"><i>Al 问答（${id}）：</i>“${esc(c.en)}”<br>${esc(c.zh)}</div>` : ''; }
function refTags(refs, k = K) { const t = []; (refs || []).forEach((r) => { const l = k.labels.find((x) => x.id === r); if (l) (l.cat || []).forEach((c) => t.includes(c) || t.push(c));
  const b = k.intraday_bullets.find((x) => x.id === r); if (b) tagsFromText(b.en).forEach((c) => t.includes(c) || t.push(c)); }); return t; }
// 统计页：Al 问答卡库
let alSel = { tag: null, rel: null, q: '', n: 30 };
function renderAlLib() { const A = AA(), box = $('#alLib'); if (!box) return; const ids = Object.keys(A.cards);
  if (!ids.length) { box.innerHTML = '<div class="empty">没有找到 data/askal.js：请运行 python3 09-game2/build.py 2026-10-01。</div>'; return; }
  const tags = Object.entries(A.byTag).sort((a, b) => b[1].length - a[1].length);
  const q = alSel.q.trim().toLowerCase();
  const hit = ids.filter((id) => { const c = A.cards[id]; return (!alSel.tag || (c.tags || []).includes(alSel.tag)) && (!alSel.rel || c.relk === alSel.rel) && (!q || [id, c.t, c.pts, c.en, c.zh, c.q, c.tr].join(' ').toLowerCase().includes(q)); });
  box.innerHTML = `<p class="small muted" style="margin-top:0">Al Brooks 在交易室回答学员提问的原话（2015–2021，105 篇，${ids.length} 张卡）。按主题读的完整指南：<code>PA/07-playbook/ask-al-guide.md</code>。</p>
    <input id="alSearch" class="al-search" placeholder="搜索：止损、加仓、wedge、scalp…" value="${esc(alSel.q)}">
    <div class="al-chips"><span class="jlabel">和书的关系</span>${Object.entries(AL_REL).map(([k, v]) => `<span class="chip ${alSel.rel === k ? 'on' : ''}" data-rel="${k}">${v}</span>`).join('')}</div>
    <div class="al-chips"><span class="jlabel">主题</span>${tags.map(([t, l]) => `<span class="chip ${alSel.tag === t ? 'on' : ''}" data-tag="${esc(t)}">${esc(t)} <span class="muted">${l.length}</span></span>`).join('')}</div>
    <div class="small muted" style="margin:6px 0">${hit.length} 张${alSel.tag || alSel.rel || q ? ' · <a href="#" id="alClear">清除筛选</a>' : ''}</div>
    <div class="al-list">${hit.slice(0, alSel.n).map((id) => `<details class="al-item" data-id="${id}"><summary><span class="al-id">${id}</span>${esc(A.cards[id].t)}${A.cards[id].relk && A.cards[id].relk !== '一致' ? ` <span class="al-rel r-${A.cards[id].relk}">${AL_REL[A.cards[id].relk]}</span>` : ''}</summary></details>`).join('')}</div>
    ${hit.length > alSel.n ? `<button class="btn sm" id="alMore">再显示 30 张（还有 ${hit.length - alSel.n}）</button>` : ''}`;
  $('#alSearch').oninput = (e) => { alSel.q = e.target.value; alSel.n = 30; const pos = e.target.selectionStart; renderAlLib(); const el = $('#alSearch'); el.focus(); el.setSelectionRange(pos, pos); };
  $$('[data-tag]', box).forEach((c) => c.onclick = () => { alSel.tag = alSel.tag === c.dataset.tag ? null : c.dataset.tag; alSel.n = 30; renderAlLib(); });
  $$('[data-rel]', box).forEach((c) => c.onclick = () => { alSel.rel = alSel.rel === c.dataset.rel ? null : c.dataset.rel; alSel.n = 30; renderAlLib(); });
  const clr = $('#alClear'); if (clr) clr.onclick = (e) => { e.preventDefault(); alSel = { tag: null, rel: null, q: '', n: 30 }; renderAlLib(); };
  const more = $('#alMore'); if (more) more.onclick = () => { alSel.n += 30; renderAlLib(); };
  $$('.al-item', box).forEach((d) => d.addEventListener('toggle', () => { if (d.open && !d.dataset.done) { d.dataset.done = 1; d.insertAdjacentHTML('beforeend', alCardHtml(d.dataset.id, true, true)); } })); }

// ================================================================ 复盘工作室
function buildSteps() {
  const steps = [];
  K.intraday_bullets.forEach((b) => { const bars = b.bars.filter((x) => typeof x === 'number'); if (!bars.length) return; steps.push({ id: 'S' + b.id, type: 'say', a: Math.min(...bars), b: Math.max(...bars), en: b.en, zh: b.zh, refs: [b.id] }); });
  K.labels.forEach((l) => steps.push({ id: 'S' + l.id, type: 'label', a: l.bars[0], b: l.bars[l.bars.length - 1], en: l.en, zh: l.zh, cat: l.cat, refs: [l.id] }));
  K.arrows.forEach((a) => steps.push({ id: 'SA' + a.bar, type: 'arrow', a: a.signal, b: a.bar, dir: a.dir, en: `${a.dir === '多' ? 'Buy' : 'Sell'} arrow at bar ${a.bar}`, zh: `Brooks 在 Bar ${a.bar} ${a.dir === '多' ? '买入' : '卖出'}（信号 K = Bar ${a.signal}；图上相邻：${a.near}）`, arrow: a }));
  return steps.sort((x, y) => x.b - y.b || x.a - y.a);
}
function startReview() {
  show('#scrReview'); $('#levelInfo').textContent = `· ${G.date} · 复盘工作室`;
  S.review = S.review || { steps: buildSteps(), idx: 0, grades: {}, filter: '全部', tab: 'walk', traces: {}, cur: null, pts: [], layers: { trades: 1, signals: 1, labels: 0, lines: 0, brooks: 1, levels: 0 }, sync: null };
  const names = { trades: '我的交易', signals: '我的信号 K', labels: '我的标注', lines: '我的线 / 测量', brooks: 'Brooks 入场箭头（蓝）', levels: '昨日 / 夜盘价位' };
  $('#layers').innerHTML = '<span class="jlabel">我的图 · 图层</span>' + Object.entries(names).map(([k, v]) => `<span class="chip ${S.review.layers[k] ? 'on' : ''}" data-l="${k}">${v}</span>`).join('');
  $$('#layers .chip').forEach((c) => c.onclick = () => { S.review.layers[c.dataset.l] ^= 1; c.classList.toggle('on'); drawReview(); });
  $$('#studyNav button').forEach((b) => b.onclick = () => { S.review.tab = b.dataset.s; S.review.cur = null; S.review.pts = []; renderStudy(); });
  renderStudy();
}
function curStep() { const R = S.review; const list = filteredSteps(); return list[Math.min(R.idx, list.length - 1)]; }
function filteredSteps() { const R = S.review, f = R.filter; return R.steps.filter((s) => f === '全部' || (f === '入场' && s.type === 'arrow') || (f === '标注' && s.type === 'label') || (f === '原话' && s.type === 'say') || (f === '待复习' && ['没看到', '看反了'].includes(R.grades[s.id]?.g))); }
function drawReview() {
  if (!S.review) return; const R = S.review, L = R.layers; const st = R.tab === 'walk' ? curStep() : null; let hl = st ? [st.a, st.b] : null; const marks = [];
  const t = R.cur && K.traces.find((x) => x.id === R.cur);
  if (R.tab === 'trace') { R.pts.forEach((p) => marks.push({ type: 'ring', i: p.i, p: p.p, color: C.mine })); if (R.mmTemp) marks.push({ type: 'mm', mm: R.mmTemp, temp: true });
    if (t && R.traces[t.id]?.done) { traceAnswerMarks(t).forEach((m) => marks.push(m)); hl = traceRange(t); } }
  const F = drawChart($('#cvReview'), { mode: 'review', upto: G.rth.length, tail: false, layers: L, highlight: hl, cross: R.sync, marks }); R.F = F;
  drawStrips($('#cvStrips2'), 0, G.rth.length, true);
}
function meAt(a, b) {
  const rng = (x) => x >= a - 1 && x <= b + 1; const seq = (obj) => { const out = []; for (let i = Math.max(1, a); i <= b; i++) { const v = obj[i] || '未选'; if (!out.length || out[out.length - 1].v !== v) out.push({ v, i }); } return out.map((x) => `${x.v}（B${x.i}）`).join(' → '); };
  const sig = S.signals.filter((s) => rng(s.bar)).map((s) => `${s.dir === '多' ? '▲' : '▼'} B${s.bar}`);
  const trs = S.trades.filter((t) => rng(t.fillBar)).map((t) => `#${t.id} ${t.dir} B${t.fillBar} ${t.R >= 0 ? '+' : ''}${t.R}R`);
  const ords = S.log.filter((e) => e.ev === 'order' && rng(e.bar)).map((e) => `B${e.bar} 挂${e.dir === '多' ? '买' : '卖'}${e.otype}单 ${fmt(e.price)}`);
  const ans = [...K.checkpoints].filter((c) => c.after_bar >= a && c.after_bar <= b + 1 && S.answers[c.id]).map((c) => `Bar ${c.after_bar} 提问：${S.answers[c.id].correct ? '✓ 答对' : '✗ 答错'}`);
  const lbs = S.labels.filter((l) => rng(l.i)).map((l) => `${l.code}（B${l.i}）`);
  const autoAI = {}, autoCtx = {}; for (let i = Math.max(1, a); i <= b; i++) { autoAI[i] = G.auto[i - 1].ai; autoCtx[i] = G.auto[i - 1].ctx; }
  return `<div><b>always-in：</b>${seq(S.ai)}</div><div><b>背景：</b>${seq(S.ctx)}</div><div class="muted"><b>自动判读：</b>${seq(autoAI)}；${seq(autoCtx)}</div><div><b>信号 K：</b>${sig.join('，') || '没标'}</div><div><b>挂单：</b>${ords.join('，') || '没有'}</div>
    <div><b>成交：</b>${trs.join('，') || '没有'}</div>${ans.length ? `<div><b>答题：</b>${ans.join('，')}</div>` : ''}${lbs.length ? `<div><b>我的标注：</b>${lbs.join('，')}</div>` : ''}`;
}
function renderStudy() {
  const R = S.review; $$('#studyNav button').forEach((b) => b.classList.toggle('on', b.dataset.s === R.tab)); const box = $('#studyBox');
  if (R.tab === 'walk') renderWalk(box); else if (R.tab === 'trace') renderTrace(box); else renderSummary(box); drawReview();
}
function renderWalk(box) {
  const R = S.review, list = filteredSteps(); if (!list.length) { box.innerHTML = filtersHtml() + '<div class="empty">这个筛选下没有条目。</div>'; bindFilters(); return; }
  R.idx = Math.min(R.idx, list.length - 1); const st = list[R.idx], gr = R.grades[st.id] || {};
  const badge = st.type === 'say' ? '<span class="badge say">原话</span>' : st.type === 'label' ? '<span class="badge label">收盘图标注</span>' : `<span class="badge arrow-${st.dir}">${st.dir === '多' ? '买入箭头' : '卖出箭头'}</span>`;
  const gl = st.type === 'label' && st.cat && G.glossary[st.cat[0]] ? G.glossary[st.cat[0]] : null;
  box.innerHTML = filtersHtml() + `<div class="minimap">${list.map((s, i) => { const g = R.grades[s.id]?.g; const cls = g ? 'g' + (GRADES.indexOf(g) + 1) : ''; return `<span class="${cls} ${i === R.idx ? 'cur' : ''}" data-i="${i}" title="Bar ${s.a}–${s.b}"></span>`; }).join('')}</div>
    <div class="step-head">${badge}<span class="small muted">${R.idx + 1} / ${list.length} · Bar ${st.a === st.b ? st.a : st.a + '–' + st.b}</span></div>
    <div class="quote"><div class="en">“${esc(st.en)}”</div><div class="zh">${esc(st.zh)}</div></div>
    ${gl ? `<details class="small" style="margin:6px 0"><summary>${esc(gl.name)} 是什么（知识卡片）</summary><div style="margin-top:4px">${esc(gl.def)}</div>${gl.brooks ? `<div style="margin-top:4px"><i>Brooks：</i>${esc(gl.brooks)}</div>` : ''}<div class="muted">出处：${esc(gl.src)}</div></details>` : ''}
    ${alBlock(stepTags(st), 'walk')}
    ${st.type === 'arrow' ? arrowOutcome(st.arrow) : ''}
    <div class="me"><div class="small muted" style="margin-bottom:2px">我当时（Bar ${st.a}–${st.b} 前后）</div>${meAt(st.a, st.b)}</div>
    <div class="grade">${GRADES.map((g) => `<button data-g="${g}" class="${gr.g === g ? 'on' : ''}">${g}</button>`).join('')}</div>
    <input class="note" id="gNote" placeholder="一句话：当时为什么没看到 / 看反？（可选）" value="${esc(gr.note || '')}">
    <div class="stepbar"><button class="btn" id="stPrev">← 上一条</button><span class="small muted">${Object.keys(R.grades).length} 条已自评</span><button class="btn primary" id="stNext">下一条 →</button></div>`;
  bindFilters(); bindAl(box);
  $$('.minimap span', box).forEach((s) => s.onclick = () => { R.idx = +s.dataset.i; renderStudy(); });
  $$('.grade button', box).forEach((b) => b.onclick = () => { R.grades[st.id] = { ...(R.grades[st.id] || {}), g: b.dataset.g, bars: [st.a, st.b] }; saveReview(); if (['没看到', '看反了'].includes(b.dataset.g)) { const s2 = loadStore();
    addWrong(s2, [{ key: `${K.date}:${st.id}`, date: K.date, kind: st.type, bar: st.b, a: st.a, title: st.zh, en: st.en, dir: st.dir, signal: st.arrow?.signal, refs: st.refs }]); saveStore(s2); }
    if (R.idx < list.length - 1) R.idx++; renderStudy(); });
  $('#gNote').onchange = (e) => { R.grades[st.id] = { ...(R.grades[st.id] || {}), note: e.target.value }; saveReview(); };
  $('#stPrev').onclick = () => { if (R.idx > 0) { R.idx--; renderStudy(); } }; $('#stNext').onclick = () => { if (R.idx < list.length - 1) { R.idx++; renderStudy(); } else { R.tab = 'trace'; renderStudy(); } };
}
function filtersHtml() { const R = S.review; return `<div class="filters">${['全部', '入场', '标注', '原话', '待复习'].map((f) => `<span class="chip ${R.filter === f ? 'on' : ''}" data-f="${f}">${f}</span>`).join('')}</div>`; }
function bindFilters() { $$('#studyBox [data-f]').forEach((c) => c.onclick = () => { S.review.filter = c.dataset.f; S.review.idx = 0; renderStudy(); }); }
function simulate(dir, entryBar, entry, stop) {   // 从入场 K 起看先到止损、1R 还是 2R（同一根都碰到按止损，保守）
  const d = dir === '多' ? 1 : -1, risk = Math.abs(entry - stop); let hit1 = null;
  for (let i = entryBar; i <= G.rth.length; i++) { const b = G.rth[i - 1];
    const sl = d > 0 ? b.l <= stop : b.h >= stop, t1 = d > 0 ? b.h >= entry + risk : b.l <= entry - risk, t2 = d > 0 ? b.h >= entry + 2 * risk : b.l <= entry - 2 * risk;
    if (sl) return hit1 ? { res: `先到 1R（Bar ${hit1}），Bar ${i} 回到止损`, r: 1 } : { res: `Bar ${i} 打到止损（−1R）`, r: -1 };
    if (t2) return { res: `Bar ${i} 到 2R（+2R）${hit1 && hit1 < i ? `，Bar ${hit1} 先到 1R` : ''}`, r: 2 };
    if (t1 && !hit1) hit1 = i; }
  return { res: hit1 ? `到过 1R（Bar ${hit1}），收盘前没到 2R` : '收盘前既没到 1R 也没止损', r: hit1 ? 1 : 0 };
}
function arrowOutcome(a) { const sb = G.rth[a.signal - 1]; const d = a.dir === '多'; const entry = d ? sb.h + G.tick : sb.l - G.tick, stop = d ? sb.l - G.tick : sb.h + G.tick; const o = simulate(a.dir, a.bar, entry, stop);
  return `<div class="me" style="background:var(--brooks-bg)"><b>按 Brooks 的标准做法：</b>信号 K（Bar ${a.signal}）${d ? '高点上方' : '低点下方'} 1 tick ${d ? '买' : '卖'} ${fmt(entry)}，止损 ${fmt(stop)}（风险 ${fmt(Math.abs(entry - stop))} 点）。<br>结果：${o.res}</div>`; }
function saveReview() { const R = S.review; updateStoredSession({ review: { grades: R.grades, traces: R.traces } }); }

// ---------------- 亲手描
function traceRange(t) { if (t.kind === 'entry') { const a = K.arrows.find((x) => x.bar === t.arrow); return [a.signal, a.bar]; } if (t.kind === 'mm') { const l = K.labels.find((x) => x.id === 'L2'); return l ? [l.bars[0] - 1, l.bars[1]] : null; } return [Math.min(...t.ans), Math.max(...t.ans)]; }
function traceAnswerMarks(t) { const out = [];
  if (t.kind === 'bars') t.ans.forEach((i) => { const b = G.rth[i - 1]; out.push({ type: 'ring', i, p: (t.q.includes('高点') ? b.h : t.q.includes('低') || t.q.includes('最低') ? b.l : (b.h + b.l) / 2), color: C.brooks }); });
  if (t.kind === 'mm') out.push({ type: 'line', p: t.ans_price, color: C.brooks, label: `Brooks MM ${fmt(t.ans_price)}` });
  if (t.kind === 'entry') { const a = K.arrows.find((x) => x.bar === t.arrow), sb = G.rth[a.signal - 1]; out.push({ type: 'ring', i: a.signal, p: a.dir === '多' ? sb.h : sb.l, color: C.brooks }); out.push({ type: 'line', p: a.dir === '多' ? sb.l - G.tick : sb.h + G.tick, color: C.brooks, label: '信号 K 外 1 tick 止损' }); }
  return out; }
function renderTrace(box) {
  const R = S.review; const done = Object.values(R.traces).filter((x) => x.done).length, okn = Object.values(R.traces).filter((x) => x.ok).length;
  box.innerHTML = `<p class="small muted" style="margin-top:0">点“开始”，在下面我的图上操作；做完立刻判对错，Brooks 的答案会画在两张图上。第一次尝试计分。已完成 ${done}/${K.traces.length}，对 ${okn}。</p>` +
    K.traces.map((t) => { const s = R.traces[t.id]; return `<div class="task ${R.cur === t.id ? 'cur' : ''}"><span class="st ${s?.done ? (s.ok ? 'win' : 'loss') : ''}">${s?.done ? (s.ok ? '✓' : '✗') : ''}</span><div style="margin-bottom:6px">${esc(t.q)}</div>
      ${R.cur === t.id ? `<div class="small" id="trHint" style="color:var(--mine)">${traceHint(t)}</div>` : ''}${s?.done ? `<div class="small">${esc(s.msg)}</div>${quoteHtml(refQuotes(t.ref))}` : ''}
      <div class="row" style="margin-top:6px"><button class="btn sm ${R.cur === t.id ? 'on' : ''}" data-t="${t.id}">${s?.done ? '再做一次' : R.cur === t.id ? '进行中…' : '开始'}</button></div></div>`; }).join('');
  $$('[data-t]', box).forEach((b) => b.onclick = () => { R.cur = b.dataset.t; R.pts = []; R.mmTemp = null; const s = R.traces[R.cur]; if (s?.done) s.done = false; renderStudy(); $('#cvReview').scrollIntoView({ block: 'nearest' }); });
}
function traceHint(t) { const R = S.review; if (t.kind === 'bars') return `在我的图上点 ${t.n} 根 K 线（已点 ${R.pts.length}）`; if (t.kind === 'mm') return '在我的图上按住鼠标，从腿的起点拖到终点'; return R.pts.length ? '再点你的止损价' : '先点信号 K（点在那根 K 线上）'; }
function finishTrace(t, ok, msg) { const R = S.review; const prev = R.traces[t.id]; R.traces[t.id] = { done: true, ok, msg, first: prev?.first ?? ok }; R.cur = null; R.pts = []; R.mmTemp = null; saveReview(); renderStudy(); }
function reviewClick(x, y) {
  const R = S.review; if (R.tab !== 'trace' || !R.cur) return; const t = K.traces.find((z) => z.id === R.cur); const F = R.F; const sp = snapPoint(F, x, y, G.rth.length);
  if (t.kind === 'bars') { R.pts.push(sp); if (R.pts.length >= t.n) { const clicked = R.pts.map((p) => p.i); const ok = t.ans.every((a) => clicked.some((c) => Math.abs(c - a) <= t.tol));
      finishTrace(t, ok, `你点了 Bar ${clicked.join('、')}；Brooks：Bar ${t.ans.join('、')}${ok ? '' : `（允许误差 ±${t.tol} 根）`}`); } else { renderStudy(); } return; }
  if (t.kind === 'entry') { const a = K.arrows.find((z) => z.bar === t.arrow), sb = G.rth[a.signal - 1];
    if (!R.pts.length) { R.pts.push(sp); renderStudy(); return; }
    const sigOk = R.pts[0].i === a.signal, d = a.dir === '多'; const stop = sp.ext === 'l' ? sp.p - G.tick : sp.ext === 'h' ? sp.p + G.tick : sp.p, ext = d ? sb.l : sb.h; const dist = d ? ext - stop : stop - ext;
    const stopOk = dist > 0 && dist <= 2; const entry = d ? sb.h + G.tick : sb.l - G.tick; const o = (d ? stop < entry : stop > entry) ? simulate(a.dir, a.bar, entry, stop) : { res: '止损在入场价错误一侧' };
    finishTrace(t, sigOk && stopOk, `信号 K：你点了 Bar ${R.pts[0].i}，${sigOk ? '对' : `应为 Bar ${a.signal}（入场 K 的前一根）`}。止损：你放在 ${fmt(stop)}，` +
      (dist <= 0 ? `在信号 K ${d ? '低点' : '高点'}（${fmt(ext)}）里面，太近了` : dist <= 2 ? `在信号 K ${d ? '低点下方' : '高点上方'} ${fmt(dist)} 点，对` : `离信号 K ${d ? '低点' : '高点'} ${fmt(dist)} 点，比 Brooks 的标准做法宽`) +
      `。按 ${fmt(entry)} 入场、你的止损：${o.res}`); }
}
function reviewDown(x, y) { const R = S.review; if (R.tab !== 'trace' || !R.cur) return false; const t = K.traces.find((z) => z.id === R.cur); if (t.kind !== 'mm') return false;
  const a = snapPoint(R.F, x, y, G.rth.length); R.mmTemp = { a, b: a }; R.mmDrag = true; return true; }
function reviewUp() { const R = S.review; if (!R.mmDrag) return; R.mmDrag = false; const m = R.mmTemp; if (!m || (m.a.i === m.b.i && m.a.p === m.b.p)) return; const t = K.traces.find((z) => z.id === R.cur);
  const tgt = m.b.p + (m.b.p - m.a.p); const ok = Math.abs(tgt - t.ans_price) <= t.tol; S.mms.push({ a: m.a, b: m.b });
  finishTrace(t, ok, `你量的腿：${fmt(m.a.p)} → ${fmt(m.b.p)}（${fmt(m.b.p - m.a.p)} 点），等距目标 ${fmt(tgt)}；Brooks 图上 ${fmt(t.ans_price)}，相差 ${fmt(Math.abs(tgt - t.ans_price))} 点${ok ? '' : `（允许 ±${t.tol}）`}`); }

// ---------------- 总结
function renderSummary(box) {
  const R = S.review, s = S.score; const trOk = Object.values(R.traces).filter((x) => x.first).length, trDone = Object.values(R.traces).filter((x) => x.done).length;
  const gcount = (g) => Object.values(R.grades).filter((x) => x.g === g).length;
  const gaps = []; s.entries.filter((e) => e.cls === 'loss').slice(0, 2).forEach((e) => gaps.push({ t: `没抓到 Bar ${e.a.bar} 的${e.a.dir === '多' ? '买' : '卖'}点（${e.a.near}）`, q: [] }));
  [...K.premarket_questions, ...K.checkpoints].filter((q) => S.answers[q.id] && !S.answers[q.id].correct).slice(0, 2).forEach((q) => gaps.push({ t: `${q.after_bar ? 'Bar ' + q.after_bar + '：' : '开盘前：'}${q.q}`, q: refQuotes(q.refs).slice(0, 1) }));
  R.steps.filter((x) => ['没看到', '看反了'].includes(R.grades[x.id]?.g)).slice(0, 2).forEach((x) => gaps.push({ t: `${R.grades[x.id].g}：${x.zh}`, q: [] }));
  const reviewScore = trOk * 10, reviewMax = K.traces.length * 10;
  const alT = []; const addT = (...t) => t.forEach((x) => alT.includes(x) || alT.push(x));
  if (s.entries.some((e) => e.cls === 'loss')) addT('信号K', '第二次入场'); if (s.falseT.length) addT('交易者方程');
  if (S.trades.some((t) => t.R < 0)) addT('止损', '交易管理'); if (!S.autoOn && s.phase.pct < 0.6) addT('always-in', '区间日'); if (!alT.length) addT('学习路径');
  updateStoredSession({ reviewScore, review: { grades: R.grades, traces: R.traces } });
  box.innerHTML = `<div class="row" style="align-items:baseline;gap:14px"><div><div class="small muted">盘中</div><div class="score-big">${s.total}<span class="small muted"> / ${s.max}</span></div></div>
      <div><div class="small muted">复盘（描图首次答对）</div><div class="score-big">${reviewScore}<span class="small muted"> / ${reviewMax}</span></div></div></div>
    <div class="small muted" style="margin:6px 0 10px">日型（Brooks）：${esc(K.day_type.en)} — ${esc(K.day_type.zh)}</div>
    <table><tr><th>项目</th><th>得分</th><th>说明</th></tr>${s.parts.map((p) => `<tr><td>${p.name}</td><td class="mono">${p.got}${p.mx ? ' / ' + p.mx : ''}</td><td class="small">${esc(p.detail)}</td></tr>`).join('')}
      <tr><td>交易结果（不计分）</td><td class="${s.R >= 0 ? 'win' : 'loss'}">${s.R >= 0 ? '+' : ''}${s.R}R</td><td class="small">${S.trades.length} 笔</td></tr>
      <tr><td>描图</td><td class="mono">${trOk} / ${K.traces.length}</td><td class="small">已做 ${trDone} 题</td></tr>
      <tr><td>讲解自评</td><td colspan="2" class="small">看到并做了 ${gcount('看到并做了')} · 看到没做 ${gcount('看到但没做')} · 没看到 ${gcount('没看到')} · 看反了 ${gcount('看反了')}</td></tr></table>
    <h3 style="margin-top:14px">今天最大的差距</h3>${gaps.map((g) => `<div class="gap-item">${esc(g.t)}${quoteHtml(g.q)}</div>`).join('') || '<div class="empty">没有明显差距</div>'}
    <h3 style="margin-top:14px">今天推荐读的 Al 问答</h3><p class="small muted" style="margin:0 0 4px">按今天的差距挑的主题。更多在“统计与错题本 → Al 问答卡”。</p>${alBlock(alT.slice(0, 3))}
    <div class="row" style="margin-top:12px"><button class="btn primary" id="btnExport">导出本局记录（给 Claude 分析）</button><button class="btn" id="btnReplay">再玩一次</button><button class="btn" id="btnToStats">错题本</button></div>
    <p class="small muted">导出的文件放进 <code>PA/09-game/progress/</code>。错题（答错的提问、没看到的入场、自评“没看到 / 看反了”）已加入错题本。</p>`;
  bindAl(box);
  $('#btnExport').onclick = () => download(`game-${S.date}-${S.startedAt.slice(0, 16).replace(/[:T]/g, '')}.json`, exportSession());
  $('#btnReplay').onclick = () => startLevel(S.date); $('#btnToStats').onclick = renderStats;
}
function exportSession() { return { version: 3, date: S.date, mode: S.mode, startedAt: S.startedAt, endedAt: S.endedAt, score: S.score && { total: S.score.total, max: S.score.max, parts: S.score.parts },
  answers: S.answers, skippedQ: Object.keys(S.skipped), ai: S.ai, ctx: S.ctx, aiSrc: S.aiSrc, ctxSrc: S.ctxSrc, autoOn: S.autoOn, signals: S.signals, trades: S.trades, canceledOrders: S.canceled, labels: S.labels.map(({ code, i, above, atBar }) => ({ code, i, above, atBar })),
  hlines: S.hlines, mms: S.mms, review: S.review && { grades: S.review.grades, traces: S.review.traces }, log: S.log, feedback: loadStore().feedback }; }

// ================================================================ 统计 + 错题本 + 快速练习
function renderStats() {
  stopAuto(); show('#scrStats'); $('#levelInfo').textContent = '· 统计与错题本'; const st = loadStore(), ss = st.sessions;
  if (!ss.length) $('#statsBox').innerHTML = '<div class="empty">还没有完成的关卡。</div>';
  else { const rows = ss.map((s) => `<tr><td>${s.date}</td><td>${s.mode}${s.rewinds ? `<br><span class="muted small">后退 ${s.rewinds} 次</span>` : ''}</td><td class="mono">${s.score.total}/${s.score.max}</td><td class="mono">${s.reviewScore ?? '—'}</td><td>${s.signalsSeen ?? '—'}/${s.arrows}</td><td>${s.entriesCaught}/${s.arrows}</td><td>${s.falseSignals}</td><td>${s.phasePct ?? '—'}%</td><td class="${s.totalR >= 0 ? 'win' : 'loss'}">${s.totalR}</td></tr>`).join('');
    const by = {}; ss.flatMap((s) => s.trades).forEach((t) => { const k = t.setup || '（未标）'; (by[k] = by[k] || []).push(t); });
    const setupRows = Object.entries(by).map(([k, ts]) => { const w = ts.filter((t) => t.R > 0).length, avg = r2(ts.reduce((a, t) => a + t.R, 0) / ts.length); return `<tr><td>${esc(k)}</td><td>${ts.length}</td><td>${Math.round(w / ts.length * 100)}%</td><td class="${avg >= 0 ? 'win' : 'loss'}">${avg}</td></tr>`; }).join('');
    const qk = {}; ss.flatMap((s) => Object.values(s.quiz || {})).forEach((a) => { const k = a.kind || 'quiz'; qk[k] = qk[k] || [0, 0]; qk[k][1]++; if (a.correct) qk[k][0]++; }); const kname = { quiz: 'Brooks 提问', structure: '结构判断', daytype: '日型' };
    $('#statsBox').innerHTML = `<table><tr><th>日期</th><th>模式</th><th>盘中</th><th>复盘</th><th>信号看到</th><th>入场抓到</th><th>虚假</th><th>背景一致</th><th>R</th></tr>${rows}</table>
      <h3 style="margin-top:14px">按 setup（全部关卡）</h3><table><tr><th>setup</th><th>笔数</th><th>胜率</th><th>平均 R</th></tr>${setupRows || '<tr><td colspan=4 class="muted">没有交易</td></tr>'}</table>
      <h3 style="margin-top:14px">问答正确率</h3><table>${Object.entries(qk).map(([k, [a, b]]) => `<tr><td>${kname[k] || k}</td><td>${a}/${b}（${Math.round(a / b * 100)}%）</td></tr>`).join('')}</table>`; }
  renderWrong(st); renderAlLib();
}
function renderWrong(st = loadStore()) {
  const due = st.wrong.filter((w) => w.due <= today()); $('#drillBox').classList.add('hidden');
  $('#wrongBox').innerHTML = `<p class="small muted" style="margin-top:0">共 ${st.wrong.length} 题，今天到期 ${due.length} 题。答对一次间隔拉长（1 → 3 → 7 → 14 天），答错回到明天。</p>
    <div class="row" style="margin-bottom:8px"><button class="btn primary" id="btnDrill" ${due.length ? '' : 'disabled'}>开始练习（${due.length}）</button></div>
    <div class="list" id="wrongList">${st.wrong.slice().sort((a, b) => a.due.localeCompare(b.due)).map((w) => `<div class="it"><span class="tag">${{ quiz: '提问', arrow: '入场', label: '标注', say: '原话' }[w.kind] || w.kind}</span> ${w.date} · Bar ${w.bar}：${esc(w.title)} <span class="muted small">· 第 ${w.box} 盒 · ${w.due <= today() ? '今天到期' : w.due + ' 到期'}</span></div>`).join('') || '<div class="empty">错题本是空的</div>'}</div>`;
  if (due.length) $('#btnDrill').onclick = () => drill(due[0]);
}
function drill(item) {
  loadDay(item.date, (g) => { const D = prepDay(g); days[item.date] = D; const k = D.K; $('#drillBox').classList.remove('hidden'); $('#wrongList').classList.add('hidden'); const upto = item.kind === 'quiz' ? item.bar : item.kind === 'arrow' ? (item.signal || item.bar - 1) : item.bar; const hlA = ['label', 'say'].includes(item.kind) ? item.a : null; $('#cvDrill').classList.toggle('hidden', upto < 1);
    const draw = (n, hlFrom) => { const { ctx, W, H } = setupCanvas($('#cvDrill')); const from = Math.max(1, n - 40), bars = D.rth.slice(from - 1, n); const lo = Math.min(...bars.map((b) => b.l)), hi = Math.max(...bars.map((b) => b.h)), pd = (hi - lo) * 0.1;
      const F = makeFrame(W, H, 52, lo - pd, hi + pd); drawGrid(ctx, F); if (hlFrom) { ctx.fillStyle = 'rgba(47,111,228,.09)'; ctx.fillRect(F.x(hlFrom - from + 1) - F.slot / 2, 0, F.W, F.H - F.pad.b); }
      bars.forEach((b, i) => drawCandle(ctx, F, b, i + 1)); drawLine(ctx, F, bars.map((b, i) => [i + 1, b.ema]), C.ema, 1.4);
      ctx.font = '10px sans-serif'; ctx.fillStyle = C.muted; ctx.textAlign = 'center'; ctx.textBaseline = 'top'; bars.forEach((b, i) => { const bn = from + i; if (bn % 2 === 0) ctx.fillText(bn, F.x(i + 1), F.H - F.pad.b + 5); }); ctx.textAlign = 'left'; };
    if (upto >= 1) requestAnimationFrame(() => draw(upto, hlA));
    let q; if (item.kind === 'quiz') q = [...k.premarket_questions, ...k.checkpoints].find((x) => x.id === item.qid);
    if (item.kind === 'arrow' || (item.kind === 'label' && item.dir)) q = { id: item.key, q: `截到 Bar ${upto}。接下来 Brooks 怎么做？`, options: ['做多', '做空', '等待'], answer: item.dir === '多' ? 0 : 1, refs: item.refs || [] };
    if (item.kind === 'say') { const others = k.intraday_bullets.filter((x) => x.zh !== item.title).map((x) => x.zh); const opts = [item.title, ...shuffled(others.length, item.key).slice(0, 2).map((i) => others[i])];
      q = { id: item.key, q: `Bar ${item.a}–${item.bar} 这一段（蓝色高亮），Brooks 在报告里怎么说？`, options: opts, answer: 0, refs: item.refs || [] }; }
    if (item.kind === 'label' && !item.dir) { const others = k.labels.filter((l) => l.zh !== item.title).map((l) => l.zh); const opts = [item.title, ...shuffled(others.length, item.key).slice(0, 2).map((i) => others[i])];
      q = { id: item.key, q: `Bar ${item.a}–${item.bar} 这一段（蓝色高亮），Brooks 在收盘图上标的是什么？`, options: opts, answer: 0, refs: item.refs || [] }; }
    const box = $('#drillQ'); const order = shuffled(q.options.length, q.id + 'd');
    box.innerHTML = `<p style="font-size:15px">${esc(q.q)}</p>${order.map((i) => `<button class="opt" data-k="${i}">${esc(q.options[i])}</button>`).join('')}<div class="fb"></div>`;
    $$('.opt', box).forEach((b) => b.onclick = () => { const ok = +b.dataset.k === q.answer; $$('.opt', box).forEach((x) => { x.disabled = true; if (+x.dataset.k === q.answer) x.classList.add('correct'); else if (x === b) x.classList.add('wrong'); });
      if (upto >= 1) draw(Math.min(D.rth.length, item.bar + 10), hlA || upto + 1); const st = loadStore(); const w = st.wrong.find((z) => z.key === item.key);
      if (w) { if (ok) { w.box = Math.min(4, w.box + 1); w.due = addDays(today(), [1, 3, 7, 14][w.box - 1]); } else { w.box = 1; w.due = addDays(today(), 1); } saveStore(st); }
      $('.fb', box).innerHTML = `<div class="verdict ${ok ? 'ok' : 'no'}">${ok ? '答对了' : '没答对'}</div>${quoteHtml(refQuotes(q.refs, k), k)}${item.en ? `<div class="quote"><div class="en">“${esc(item.en)}”</div><div class="zh">${esc(item.title)}</div></div>` : ''}${alBlock(item.kind === 'arrow' ? ['信号K', '第二次入场'] : item.kind === 'say' ? tagsFromText(item.en) : refTags(q.refs, k))}<button class="btn primary" id="drNext">下一题</button>`; bindAl(box);
      $('#drNext').onclick = () => renderWrong(); });
  });
}

// ================================================================ 绑定
function bind() {
  $('#btnHome').onclick = renderHome;
  $('#btnExportProgress').onclick = () => download('brooks-practice-progress.json', loadStore());
  $('#btnHelp').onclick = () => { openModal(`<h3>操作说明</h3><div class="small" style="line-height:1.85">
    <b>盘中（一键判断）</b><br>· 下一根：空格 / →。自动播放：A。Brooks 提问出现在右侧“Brooks 提问”标签页，答完才能继续；不想答可以用右上角“Brooks 提问”开关关掉（跳过的题不计分）。<br>
    · always-in：1 多 / 2 空 / 3 不明确。背景：Q 趋势 / W 通道 / E 区间 / R 不确定。图下方两条色带记录你每根的判断。<br>
    · 信号 K：↑ / ↓ 把最后一根标为多头 / 空头信号 K（不下单也行，用来练“看出来”）。<br>
    · 下单：B / S 后在图上点入场价、再点止损价；Shift+B / Shift+S 一键在信号 K 外挂单。线都能拖动。H 平一半，X 全平，C 撤单。<br>
    · 左侧工具：V 指针，P 标注（也可以右键 K 线），L 水平线，M 测量（拖动），Z 撤销，Esc 退出。<br>
    <b>收盘后（复盘工作室）</b><br>· ① 讲解回放：逐条看 Brooks 的原话、标注和入场箭头，两张图同步高亮；对照“我当时”，一键自评。<br>
    · ② 亲手描：点出双顶、楔形最后一推、量等距目标、给 Brooks 的入场找信号 K 和止损，立刻判对错。<br>· ③ 总结：分数、今天最大的差距、导出。<br>
    <b>错题本</b>：答错的、没看到的自动收录，按间隔重复练习。<br>
    <b>Al 问答</b>：复盘讲解、总结、错题本和悬停注释里会显示 Al Brooks 在 Ask Al 问答里的相关原话（英文 + 中文）；“统计与错题本”页下方可以按主题浏览和搜索全部 391 张卡。</div><button class="btn primary" id="mClose" style="margin-top:8px">关闭</button>`); $('#mClose').onclick = closeModal; };
  $('#btnFeedback').onclick = () => { openModal(`<h3>反馈</h3><p class="small muted">想改什么随手记下，会跟着“导出”一起保存。</p><textarea id="fbText" rows="6" style="width:100%;font:inherit;padding:8px;border-radius:8px;border:1px solid var(--line2)"></textarea>
    <div class="row" style="margin-top:8px"><button class="btn primary" id="fbOk">保存</button><button class="btn" id="fbNo">取消</button></div>`);
    $('#fbNo').onclick = closeModal; $('#fbOk').onclick = () => { const t = $('#fbText').value.trim(); if (t) { const st = loadStore(); st.feedback.push({ at: new Date().toISOString(), date: G?.date, bar: S?.n, text: t }); saveStore(st); } closeModal(); }; };
  $('#btnNext').onclick = next; $('#btnBack').onclick = back; $('#btnAuto').onclick = toggleAuto;
  $$('#segAI button').forEach((b) => b.onclick = () => setAI(b.dataset.v)); $$('#segCtx button').forEach((b) => b.onclick = () => setCtx(b.dataset.v));
  $$('.switch input').forEach((el) => el.addEventListener('change', () => el.blur()));   // 点完开关，快捷键（空格 / →）照常可用
  $('#tgAuto').onclick = () => { S.autoOn = !S.autoOn; logEv('auto', { on: S.autoOn }); renderAuto(); };
  $('#btnSigL').onclick = () => markSignal('多'); $('#btnSigS').onclick = () => markSignal('空');
  $$('#sideTabs button').forEach((b) => b.onclick = () => switchTab(b.dataset.tab));
  $$('#rail [data-tool]').forEach((b) => b.onclick = () => setTool(b.dataset.tool && S.tool !== b.dataset.tool ? b.dataset.tool : null)); $('#rail [data-act="undo"]').onclick = undo;
  $('#btnBuy').onclick = () => startOrder('多'); $('#btnSell').onclick = () => startOrder('空'); $('#btnSigBuy').onclick = () => sigOrder('多'); $('#btnSigSell').onclick = () => sigOrder('空');
  $('#btnT1').onclick = () => setTarget(1); $('#btnT2').onclick = () => setTarget(2); $('#btnT0').onclick = () => setTarget(0);
  $('#btnBE').onclick = () => { if (S.pos) { S.pos.stop = S.pos.entry; logEv('move_stop', { id: S.pos.id, stop: S.pos.entry }); drawMain(); renderSide(); } };
  $('#btnHalf').onclick = () => exitNow(true); $('#btnFlat').onclick = () => exitNow(false);
  $('#btnCancel').onclick = () => { S.orders.forEach((o) => S.canceled.push({ ...o, canceledAt: S.n, reason: '手动撤单' })); S.orders = []; logEv('cancel'); drawMain(); renderSide(); };
  const cv = $('#cvMain'); cv.addEventListener('mousedown', onDown); cv.addEventListener('mousemove', onMove); cv.addEventListener('click', onClick); cv.addEventListener('contextmenu', onContext);
  cv.addEventListener('mouseleave', () => { if (!S) return; S.mouse = null; $('#hoverBox').classList.add('hidden'); $('#tipBox').classList.add('hidden'); drawMain(); });
  window.addEventListener('mouseup', () => { if (S && S.drag) onUp(); if (S && S.review && S.review.mmDrag) reviewUp(); });
  // 复盘：双图联动
  const rv = $('#cvReview');
  rv.addEventListener('mousemove', (ev) => { const R = S?.review; if (!R?.F) return; const { x, y } = posIn(ev, rv); const i = R.F.i(x); R.sync = i >= 1 && i <= G.rth.length ? i : null;
    if (R.mmDrag) R.mmTemp.b = snapPoint(R.F, x, y, G.rth.length); drawReview();
    const tip = $('#tipBox2'); tip.classList.add('hidden'); if ($('#tgTips').checked) { const hit = labelAt(x, y) || autoAt(x, y); if (hit) showTip(tip, hit.code, x, y, R.F.W, hit.extra ? esc(hit.extra) : ''); } });
  rv.addEventListener('mouseleave', () => { if (S?.review) { S.review.sync = null; drawReview(); } });
  rv.addEventListener('mousedown', (ev) => { const { x, y } = posIn(ev, rv); if (S?.review && reviewDown(x, y)) ev.preventDefault(); });
  rv.addEventListener('click', (ev) => { const R = S?.review; if (!R || R.mmJust) { if (R) R.mmJust = false; return; } const t = R.cur && K.traces.find((z) => z.id === R.cur); if (t?.kind === 'mm') return; const { x, y } = posIn(ev, rv); reviewClick(x, y); });
  $('#btnExportAll').onclick = () => download('brooks-game-progress.json', loadStore());
  $('#fileImport').onchange = (e) => { const f = e.target.files[0]; if (!f) return; f.text().then((t) => { try { saveStore(JSON.parse(t)); renderStats(); } catch (x) { alert('文件格式不对'); } }); };
  $('#btnReset').onclick = () => { if (confirm('确定清空全部进度和错题本？（建议先导出）')) { saveStore({ sessions: [], feedback: [], wrong: [] }); renderStats(); } };
  document.addEventListener('keydown', (e) => {
    if (['INPUT', 'SELECT', 'TEXTAREA'].includes(document.activeElement.tagName) || modalOpen()) return;
    if ($('#scrPlay').classList.contains('hidden')) { if (!$('#scrReview').classList.contains('hidden') && S?.review?.tab === 'walk') { if (e.key === 'ArrowRight') $('#stNext')?.click(); if (e.key === 'ArrowLeft') $('#stPrev')?.click(); } return; }
    const k = e.key.toLowerCase();
    if (k === ' ' || k === 'arrowright') { e.preventDefault(); next(); } else if (k === 'arrowleft') { e.preventDefault(); back(); } else if (k === 'arrowup') { e.preventDefault(); markSignal('多'); } else if (k === 'arrowdown') { e.preventDefault(); markSignal('空'); }
    else if (k === 'a') toggleAuto(); else if (k === '1') setAI('多'); else if (k === '2') setAI('空'); else if (k === '3') setAI('不明确');
    else if (k === 'q') setCtx('趋势'); else if (k === 'w') setCtx('通道'); else if (k === 'e') setCtx('区间'); else if (k === 'r') setCtx('不确定');
    else if (k === 'b') { if (e.shiftKey) sigOrder('多'); else startOrder('多'); } else if (k === 's') { if (e.shiftKey) sigOrder('空'); else startOrder('空'); }
    else if (k === 'v') setTool(null); else if (k === 'm') setTool(S.tool === 'mm' ? null : 'mm'); else if (k === 'p') setTool(S.tool === 'label' ? null : 'label'); else if (k === 'l') setTool(S.tool === 'hline' ? null : 'hline');
    else if (k === 'k' && hlAvail()) toggleGuide('hl'); else if (k === 'z') undo(); else if (k === 'h') exitNow(true); else if (k === 'x') exitNow(false); else if (k === 'c') $('#btnCancel').click(); else if (k === 'escape') { hideCtx(); setTool(null); }
  });
  document.addEventListener('click', (e) => { if (!e.target.closest('#ctxMenu') && e.target.id !== 'cvMain') hideCtx(); });
  window.addEventListener('resize', () => { if (!S) return; if (!$('#scrPlay').classList.contains('hidden')) drawMain(); if (!$('#scrReview').classList.contains('hidden')) drawReview(); });
}
bind(); renderHome();
// ================================================================ 关键 K 线决策题库（data/puzzles.js，由 puzzles_build.py 从答案库生成）
const PZ_KEY = 'brooks-game2-puzzles';
const PZ_TYPE = { arrow: '入场方向', quiz: 'Brooks 提问', structure: '结构判断', daytype: '日型' };
const PZ_BASE = { arrow: 1150, quiz: 1250, structure: 1300, daytype: 1350 };   // 题目初始难度（之后按答题结果调整）
let PZ = null;
function pzInit() { if (PZ) return; let st = null; try { st = JSON.parse(localStorage.getItem(PZ_KEY)); } catch (e) { /* 无痕模式 */ }
  PZ = { list: window.PUZZLES_ENC ? decodeKey(window.PUZZLES_ENC) : [], st: st || { rating: 1200, items: {}, hist: [] }, sess: { n: 0, ok: 0 } }; }
function pzSave() { try { localStorage.setItem(PZ_KEY, JSON.stringify(PZ.st)); } catch (e) { /* 无痕模式 */ } }
function pzItemR(p) { const it = PZ.st.items[p.id]; return it ? it.r : PZ_BASE[p.type]; }
function pzPool() { const th = $('#pzTheme').value, ty = $('#pzType').value, src = $('#pzSrc').value, done = new Set(loadStore().sessions.map((s) => s.date));
  return PZ.list.filter((p) => (!th || p.tags.includes(th)) && (!ty || p.type === ty) && (src === 'all' || done.has(p.d))); }
function pzPick() { const pool = pzPool(); if (!pool.length) return null; const n = PZ.st.hist.length, R = PZ.st.rating, rnd = (a) => a[Math.floor(Math.random() * a.length)];
  const due = pool.filter((p) => { const it = PZ.st.items[p.id]; return it && it.wrong && n - it.lastI >= 5 && p.id !== PZ.cur?.id; });   // 答错过、隔了 5 题以上 → 先复习
  if (due.length && Math.random() < 0.5) return rnd(due);
  const fresh = pool.filter((p) => !PZ.st.items[p.id]), cand = fresh.length ? fresh : pool.filter((p) => p.id !== PZ.cur?.id);
  const near = cand.filter((p) => Math.abs(pzItemR(p) - R) <= 150);
  return rnd(near.length ? near : cand.slice().sort((a, b) => Math.abs(pzItemR(a) - R) - Math.abs(pzItemR(b) - R)).slice(0, 20)); }
function renderPuzzle() { pzInit(); try { stopAuto(); } catch (e) { /* 没在玩 */ } show('#scrPuzzle'); $('#levelInfo').textContent = '· 决策题库';
  if (!$('#pzTheme').options.length) { const tags = {}; PZ.list.forEach((p) => p.tags.forEach((t) => tags[t] = (tags[t] || 0) + 1));
    $('#pzTheme').innerHTML = '<option value="">全部主题</option>' + Object.entries(tags).sort((a, b) => b[1] - a[1]).map(([t, n]) => `<option value="${esc(t)}">${esc(t)}（${n}）</option>`).join('');
    $('#pzType').innerHTML = '<option value="">全部题型</option>' + Object.entries(PZ_TYPE).map(([k, v]) => `<option value="${k}">${v}</option>`).join('');
    ['#pzTheme', '#pzType', '#pzSrc'].forEach((s) => $(s).onchange = () => pzNext()); $('#pzSkip').onclick = () => pzNext(); }
  pzStats(); pzNext(); }
function pzNext() { clearInterval(PZ.timer); const p = pzPick();
  if (!p) { PZ.cur = null; $('#pzBox').innerHTML = `<div class="empty">这个范围里没有题目。${$('#pzSrc').value === 'done' ? '“只出已玩过的关卡”要先在关卡里玩完至少一天。' : ''}</div>`; return; }
  PZ.cur = p; $('#pzBox').innerHTML = '<div class="empty">载入中…</div>';
  loadDay(p.d, (g) => { prepDay(g); PZ.g = g; drawPuzzleChart(p, 0); pzAsk(p); }); }
function drawPuzzleChart(p, extra) {
  const g = PZ.g, cv = $('#cvPuzzle'), { ctx, W, H } = setupCanvas(cv), tail = g.yesterday.bars.slice(-TAIL), n = p.n, m = Math.min(g.rth.length, n + extra);
  const bars = g.rth.slice(0, m), all = [...tail, ...bars], slots = TAIL + Math.max(n + 14, 40);
  const lo0 = Math.min(...all.map((b) => b.l)), hi0 = Math.max(...all.map((b) => b.h)), pd = (hi0 - lo0) * 0.06;
  const F = makeFrame(W, H, slots, lo0 - pd, hi0 + pd); drawGrid(ctx, F);
  if (p.sig) { const x = F.x(TAIL + p.sig); ctx.fillStyle = 'rgba(47,111,228,.10)'; ctx.fillRect(x - F.slot / 2, F.pad.t, F.slot, F.H - F.pad.t - F.pad.b); }
  tail.forEach((b, i) => drawCandle(ctx, F, b, i + 1, 0.35));
  bars.forEach((b, i) => drawCandle(ctx, F, b, TAIL + i + 1, i < n ? 1 : 0.45));
  drawLine(ctx, F, all.map((b, i) => [i + 1, b.ema]), C.ema, 1.4);
  const xs = F.x(TAIL + 0.5); ctx.save(); ctx.strokeStyle = '#c3c8cf'; ctx.setLineDash([3, 3]); ctx.beginPath(); ctx.moveTo(xs, F.pad.t); ctx.lineTo(xs, F.H - F.pad.b); ctx.stroke();
  if (extra) { const xq = F.x(TAIL + n + 0.5); ctx.strokeStyle = C.brooks; ctx.beginPath(); ctx.moveTo(xq, F.pad.t); ctx.lineTo(xq, F.H - F.pad.b); ctx.stroke();
    ctx.setLineDash([]); ctx.font = '11px -apple-system, sans-serif'; ctx.fillStyle = C.brooks; ctx.textBaseline = 'top'; ctx.fillText('答题时在这里 → 之后的走势', xq + 4, F.pad.t + 2); }
  ctx.restore(); ctx.font = '10px -apple-system, sans-serif'; ctx.fillStyle = C.muted; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
  for (let i = 1; i <= m; i++) if (i === 1 || i % 6 === 0) ctx.fillText(String(i), F.x(TAIL + i), F.H - F.pad.b + 5);
  ctx.textAlign = 'left'; ctx.fillText('昨日', F.x(1), F.H - F.pad.b + 5); }
function pzAsk(p) { const order = shuffled(p.opts.length, p.id), timed = $('#pzTimed').checked;
  $('#pzBox').innerHTML = `<div class="who">${PZ_TYPE[p.type]} · ${p.d.slice(5)} · Bar ${p.n} 收盘后 · 难度 ${Math.round(pzItemR(p))}</div>
    <p style="font-size:15px;line-height:1.5;margin:8px 0">${esc(p.q)}</p>${order.map((k) => `<button class="opt" data-k="${k}">${esc(p.opts[k])}</button>`).join('')}<div class="fb"></div>`;
  $$('#pzBox .opt').forEach((b) => b.onclick = () => pzAnswer(p, +b.dataset.k));
  const bar = $('#pzTimerBar'); bar.style.width = '100%'; PZ.t0 = Date.now();
  if (timed) PZ.timer = setInterval(() => { const left = 1 - (Date.now() - PZ.t0) / 30000; bar.style.width = Math.max(0, left * 100) + '%'; if (left <= 0) pzAnswer(p, -1); }, 200); else bar.style.width = '0%'; }
function pzAnswer(p, k) { if (PZ.answered === p.id) return; PZ.answered = p.id; clearInterval(PZ.timer);
  const ok = k === p.ans, R = PZ.st.rating, Ri = pzItemR(p), E = 1 / (1 + Math.pow(10, (Ri - R) / 400)), s = ok ? 1 : 0;
  const dR = Math.round(32 * (s - E)); PZ.st.rating = R + dR; const it = PZ.st.items[p.id] || { r: Ri, seen: 0, ok: 0 };
  it.r = Ri - 24 * (s - E); it.seen++; if (ok) it.ok++; it.wrong = !ok; it.lastI = PZ.st.hist.length; PZ.st.items[p.id] = it;
  PZ.st.hist.push({ id: p.id, ok, ms: Date.now() - PZ.t0, at: Date.now(), timeout: k === -1 }); PZ.sess.n++; if (ok) PZ.sess.ok++; pzSave();
  $$('#pzBox .opt').forEach((x) => { x.disabled = true; const kk = +x.dataset.k; if (kk === p.ans) x.classList.add('correct'); else if (kk === k) x.classList.add('wrong'); });
  const ex = (p.exp || []).map((e) => `<div class="quote"><span class="muted small">${esc(e.src)}：</span>“${esc(e.en)}”${e.zh ? `<br>${esc(e.zh)}` : ''}</div>`).join('');
  $('.fb', $('#pzBox')).innerHTML = `<div class="verdict ${ok ? 'ok' : 'no'}">${k === -1 ? '超时' : ok ? '答对了' : '没答对'}　<span class="muted small">等级分 ${dR >= 0 ? '+' : ''}${dR} → ${PZ.st.rating}</span></div>
    ${p.near ? `<div class="small" style="margin:4px 0">收盘图上这个入场附近：<b>${esc(p.near)}</b></div>` : ''}${ex || '<div class="muted small">这一题在报告里没有对应的原句，依据是 Brooks 收盘图上的箭头。</div>'}
    <div class="row" style="margin-top:8px"><button class="btn primary" id="pzNextBtn">下一题（空格）</button></div>`;
  $('#pzNextBtn').onclick = () => { PZ.answered = null; pzNext(); };
  drawPuzzleChart(p, 12); pzStats(); }
function pzStats() { const by = {}, items = Object.fromEntries(PZ.list.map((p) => [p.id, p])), H = PZ.st.hist;
  H.forEach((h) => { const p = items[h.id]; if (!p) return; (p.tags.length ? p.tags : ['（无主题）']).forEach((t) => { by[t] = by[t] || [0, 0]; by[t][1]++; if (h.ok) by[t][0]++; }); });
  const rows = Object.entries(by).filter(([, v]) => v[1] >= 1).sort((a, b) => a[1][0] / a[1][1] - b[1][0] / b[1][1]);
  $('#pzRating').textContent = PZ.st.rating; $('#pzSess').textContent = `${PZ.sess.ok}/${PZ.sess.n}`; $('#pzTotal').textContent = `${H.filter((h) => h.ok).length}/${H.length}`;
  $('#pzStats').innerHTML = rows.length ? `<table><tr><th>主题</th><th>答对</th><th>正确率</th></tr>${rows.map(([t, [o, n]]) => `<tr><td>${esc(t)}</td><td>${o}/${n}</td><td class="${o / n >= 0.7 ? 'win' : 'loss'}">${Math.round(o / n * 100)}%</td></tr>`).join('')}</table><div class="muted small">从低到高排，最上面的就是最该练的主题（在上方“主题”里选它专练）。</div>` : '<div class="empty">还没有答题记录。</div>'; }
const puzzleButton = $('#btnPuzzle'); if (puzzleButton) puzzleButton.onclick = renderPuzzle;
document.addEventListener('keydown', (e) => { if ($('#scrPuzzle').classList.contains('hidden') || modalOpen() || ['INPUT', 'SELECT', 'TEXTAREA'].includes(document.activeElement.tagName)) return;
  if (e.key === ' ' && $('#pzNextBtn')) { e.preventDefault(); $('#pzNextBtn').click(); }
  else if (/^[1-4]$/.test(e.key)) { const b = $$('#pzBox .opt')[+e.key - 1]; if (b && !b.disabled) b.click(); } });
window.addEventListener('resize', () => { if (PZ && PZ.cur && !$('#scrPuzzle').classList.contains('hidden')) drawPuzzleChart(PZ.cur, PZ.answered ? 12 : 0); });

window.__game = { get S() { return S; }, get K() { return K; }, get G() { return G; }, next, startReview, filteredSteps, renderStudy };
})();
