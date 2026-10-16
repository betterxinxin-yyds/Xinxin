/* 自动判读（近似算法，按 Brooks 原则写，不是 Brooks 的答案）。只用第 i 根及之前的 K 线（因果，无后视镜）。
   输入：bars（昨日尾段 + 今日，按时间），today0 = 今日第 1 根在 bars 里的下标。输出：每根今日 K 线的 {ai, ctx, why}。 */
function autoRead(bars, today0) {
  const out = []; let ai = '不明确', aiWhy = '开盘，方向未定';
  let spike = null;   // 进行中的急速段：{dir, start(价格), ext(极值), lastNew(下标), end(下标)}
  let lastSpikeEnd = -1;
  const rng = (b) => b.h - b.l, body = (b) => Math.abs(b.c - b.o);
  const avg = (k) => { const s = bars.slice(Math.max(0, k - 20), k); return s.reduce((a, b) => a + rng(b), 0) / Math.max(1, s.length); };
  const strong = (b, A, dir) => { const r = rng(b) || 1e-9, cp = (b.c - b.l) / r;
    return body(b) / r >= 0.5 && r >= 0.8 * A && (dir > 0 ? b.c > b.o && cp >= 0.7 : b.c < b.o && cp <= 0.3); };
  for (let k = today0; k < bars.length; k++) {
    const b = bars[k], A = avg(k) || rng(b), n = k - today0 + 1, prev = bars.slice(Math.max(0, k - 10), k);
    const hi10 = Math.max(...prev.map((x) => x.h)), lo10 = Math.min(...prev.map((x) => x.l));
    const s1 = [1, -1].map((d) => strong(b, A, d)), s2 = [1, -1].map((d) => k > 0 && strong(bars[k - 1], A, d));
    // ---------- always-in ----------
    let why = null;
    for (const [i, d] of [[0, 1], [1, -1]]) {
      const lbl = d > 0 ? '多' : '空';
      const brk = d > 0 ? b.c > hi10 : b.c < lo10;
      const big = rng(b) >= 1.8 * A && body(b) / (rng(b) || 1) >= 0.6 && s1[i];
      if (ai !== lbl && s1[i] && s2[i] && (d > 0 ? b.c > bars[k - 1].h - 0.25 * rng(bars[k - 1]) : b.c < bars[k - 1].l + 0.25 * rng(bars[k - 1])))
        why = `连续两根强${d > 0 ? '阳' : '阴'}线`;
      else if (ai !== lbl && big && brk) why = `一根大${d > 0 ? '阳' : '阴'}线突破前 10 根${d > 0 ? '高点' : '低点'}`;
      if (why) { ai = lbl; aiWhy = why; break; }
    }
    if (!why && ai !== '不明确') {   // 反向两根收在均线另一侧、又没有强突破 → 不明确
      const d = ai === '多' ? 1 : -1, e0 = b.ema, e1 = bars[k - 1].ema;
      if ((d > 0 && b.c < e0 && bars[k - 1].c < e1) || (d < 0 && b.c > e0 && bars[k - 1].c > e1)) { ai = '不明确'; aiWhy = '连续两根收在均线另一侧'; why = aiWhy; }
    }
    // ---------- 背景 ----------
    let ctx, cwhy;
    const last3 = bars.slice(Math.max(0, k - 2), k + 1), last10 = bars.slice(Math.max(0, k - 9), k + 1);
    const nStrongUp = last3.filter((x) => strong(x, A, 1)).length, nStrongDn = last3.filter((x) => strong(x, A, -1)).length;
    const move3 = last3[last3.length - 1].c - last3[0].o;
    const span10 = Math.max(...last10.map((x) => x.h)) - Math.min(...last10.map((x) => x.l));
    const overlap = last10.reduce((a, x) => a + rng(x), 0) / (span10 || 1e-9);   // 越大越重叠
    const xs = last10.map((_, i) => i), ys = last10.map((x) => x.c), mx = (xs.length - 1) / 2, my = ys.reduce((a, v) => a + v, 0) / ys.length;
    const slope = xs.reduce((a, x, i) => a + (x - mx) * (ys[i] - my), 0) / (xs.reduce((a, x) => a + (x - mx) ** 2, 0) || 1);
    const side = last10.filter((x) => (slope > 0 ? x.c > x.ema : x.c < x.ema)).length / last10.length;
    // 急速段（spike）：启动 = 3 根内 2 根强趋势 K 走了 ≥1.8 倍振幅，或 1 根 ≥1.5 倍振幅的强趋势 K 突破前 10 根极值；
    // 持续 = 回撤不到急速段幅度的一半，且最多 2 根没有创新极值。
    const startUp = (nStrongUp >= 2 && move3 >= 1.8 * A) || (s1[0] && rng(b) >= 1.5 * A && b.c > hi10);
    const startDn = (nStrongDn >= 2 && -move3 >= 1.8 * A) || (s1[1] && rng(b) >= 1.5 * A && b.c < lo10);
    if (spike) { const d = spike.dir; const newExt = d > 0 ? b.h > spike.ext : b.l < spike.ext; if (newExt) { spike.ext = d > 0 ? b.h : b.l; spike.lastNew = k; }
      const retr = d > 0 ? (spike.ext - b.c) / (spike.ext - spike.start || 1e-9) : (b.c - spike.ext) / (spike.start - spike.ext || 1e-9);
      if (retr > 0.5 || k - spike.lastNew > 2 || (d > 0 && startDn) || (d < 0 && startUp)) { lastSpikeEnd = spike.lastNew; spike = null; } }
    if (!spike && (startUp || startDn)) { const d = startUp ? 1 : -1; spike = { dir: d, start: d > 0 ? Math.min(...last3.map((x) => x.l)) : Math.max(...last3.map((x) => x.h)), ext: d > 0 ? b.h : b.l, lastNew: k }; }
    const chanBars = bars.slice(Math.max(lastSpikeEnd + 1, k - 9), k + 1);
    const cx = chanBars.map((_, i) => i), cy = chanBars.map((x) => x.c), cmx = (cx.length - 1) / 2, cmy = cy.reduce((a, v) => a + v, 0) / (cy.length || 1);
    const cslope = cx.reduce((a, x, i) => a + (x - cmx) * (cy[i] - cmy), 0) / (cx.reduce((a, x) => a + (x - cmx) ** 2, 0) || 1);
    const cside = chanBars.filter((x) => (cslope > 0 ? x.c > x.ema : x.c < x.ema)).length / (chanBars.length || 1);
    if (n <= 2) { ctx = '不确定'; cwhy = '开盘头两根，信息太少'; }
    else if (spike) { ctx = '趋势'; cwhy = `急速段进行中（${spike.dir > 0 ? '向上' : '向下'}，回撤不到一半、仍在创新${spike.dir > 0 ? '高' : '低'}）`; }
    else if (chanBars.length >= 6 && Math.abs(cslope) * (chanBars.length - 1) >= 1.6 * A && cside >= 0.7 && overlap < 4.5) { ctx = '通道'; cwhy = `急速段之后最近 ${chanBars.length} 根有明显斜率（约 ${(Math.abs(cslope) * (chanBars.length - 1) / A).toFixed(1)} 倍振幅），${Math.round(cside * 100)}% 收在均线${cslope > 0 ? '上' : '下'}方`; }
    else { ctx = '区间'; cwhy = `最近 10 根重叠多（重叠度 ${overlap.toFixed(1)}），没有持续方向`; }
    out.push({ ai, ctx, aiWhy, ctxWhy: cwhy, aiChanged: !!why });
  }
  return out;
}
if (typeof module !== 'undefined') module.exports = { autoRead };

/* K 线类型自动标注（只看这一根和前一根，定义取自 Brooks 术语；在 2026 年 10 月报告的 46 处单根 K 线描述上一致 42 处，约 91%）。
   prev = 前一根（第 1 根用昨日最后一根），hist = 之前最多 20 根（算平均振幅），seq = 今日到这一根为止（算连续同向）。 */
function barTags(b, prev, hist, seq) {
  const r = (b.h - b.l) || 1e-9, body = Math.abs(b.c - b.o), cp = (b.c - b.l) / r;
  const A = hist.length ? hist.reduce((a, x) => a + (x.h - x.l), 0) / hist.length : r;
  const t = []; const up = b.c > b.o, dn = b.c < b.o;
  const strongUp = up && body / r >= 0.5 && r >= A && cp >= 0.7, strongDn = dn && body / r >= 0.5 && r >= A && cp <= 0.3;
  // “强趋势 K” 在 10 月验证只有 9/12（75%）与 Brooks 一致，未达 80%，不标注（strongUp/strongDn 只留作内部参考）
  if (!strongUp && !strongDn && body / r <= 0.3) t.push({ k: 'doji', s: '十', name: '十字 K（实体小）' });
  if (prev && b.h > prev.h && b.l < prev.l) t.push({ k: 'outside', s: '外', name: up ? '外包阳线' : dn ? '外包阴线' : '外包 K' });
  if (prev && b.h <= prev.h && b.l >= prev.l) t.push({ k: 'inside', s: '内', name: '内包 K' });
  if (prev && up && cp >= 0.6 && b.l < prev.l) t.push({ k: 'rev_bull', s: '反', name: '多头反转 K（先破前低、收在上部）' });
  if (prev && dn && cp <= 0.4 && b.h > prev.h) t.push({ k: 'rev_bear', s: '反', name: '空头反转 K（先破前高、收在下部）' });
  let k = 0; while (k < seq.length && (up ? seq[seq.length - 1 - k].c > seq[seq.length - 1 - k].o : dn && seq[seq.length - 1 - k].c < seq[seq.length - 1 - k].o)) k++;
  const desc = [up ? '阳线' : dn ? '阴线' : '平盘 K', cp >= 0.75 ? '收在高点附近' : cp <= 0.25 ? '收在低点附近' : '收在中部', `实体 ${Math.round(body / r * 100)}%`, `振幅 ${(r / A).toFixed(1)} 倍平均`];
  if (k >= 2) desc.push(`连续第 ${k} 根${up ? '阳' : '阴'}线`);
  return { tags: t, desc: desc.join(' · ') };
}
if (typeof module !== 'undefined') module.exports.barTags = barTags;

/* 微通道（定义取自《Trends》第 16 章：牛微通道 = 每根低点都不低于前一根低点，熊微通道 = 每根高点都不高于前一根高点；
   “a bar trades below the low of the prior bar, that is a breakout below the micro channel”）。
   补充一条：出现反向 K（牛微通道里收阴、熊微通道里收阳）也结束——这样数和 10 月报告里 Brooks 的数法一致（见 eval/microchannel-eval.md）。
   只用当时已出现的 K 线。返回每根 {bull:{start,k}, bear:{start,k}}，k = 这一根是该微通道的第几根（从 1 起），start = 起点下标。 */
function microChannels(bars) {
  const out = bars.map(() => ({}));
  for (const up of [true, false]) {
    let s = 0;
    for (let i = 0; i < bars.length; i++) {
      const a = bars[i - 1], b = bars[i];
      const ok = i > 0 && (up ? b.l >= a.l && b.c >= b.o : b.h <= a.h && b.c <= b.o);
      if (!ok) s = i;
      out[i][up ? 'bull' : 'bear'] = { start: s, k: i - s + 1 };
    }
  }
  return out;
}
/* 连续趋势 K：连续几根同为阳线（或阴线），平盘 K 打断。10 月报告里 3 处 “N consecutive bull/bear bars” 全部一致。 */
function trendRuns(bars) {
  let s = 0;
  return bars.map((b, i) => {
    const d = Math.sign(b.c - b.o), p = i ? Math.sign(bars[i - 1].c - bars[i - 1].o) : 0;
    if (!d || d !== p) s = i;
    return d ? { up: d > 0, start: s, k: i - s + 1 } : null;
  });
}
/* 截至第 n 根（只看已出现的 K 线）的微通道 / 连续段列表：[{up, a, b, k}]，a、b 为 Bar 编号（从 1 起） */
function segmentsUpTo(mc, runs, n, minMC = 3, minRun = 3) {
  const segMC = [], segRun = [];
  for (const dir of ['bull', 'bear']) for (let i = 0; i < n; i++) {
    const c = mc[i][dir], nx = i + 1 < n ? mc[i + 1][dir] : null;
    if (c.k >= minMC && (!nx || nx.start !== c.start)) segMC.push({ up: dir === 'bull', a: c.start + 1, b: i + 1, k: c.k });
  }
  for (let i = 0; i < n; i++) { const r = runs[i], nx = i + 1 < n ? runs[i + 1] : null;
    if (r && r.k >= minRun && (!nx || nx.start !== r.start)) segRun.push({ up: r.up, a: r.start + 1, b: i + 1, k: r.k }); }
  return { segMC, segRun };
}
if (typeof module !== 'undefined') Object.assign(module.exports, { microChannels, trendRuns, segmentsUpTo });

/* H1–H4 / L1–L4 K 线计数（《Trading Ranges》第 17 章，只用当时已出现的 K 线）。
   定义原句：“In a sideways or downward move in a bull trend or a trading range, the first bar whose high is above the high of the prior bar is a high 1 …
   If the market does not turn into a bull swing and instead continues sideways or down, label the next occurrence … as a high 2.”
   1) 计数：回调里出现过一根“高点没超过前一根高点”的 K 之后，第一根高点超过前一根高点（≥1 tick）的 K 记一次；数到 H4 为止（书：H4 失败后不要接着数）。
   2) 重新数：①越过这段回调起点的高点（回调结束，回到牛波段）；②自动判读的 always-in 转多（“turn into a bull swing”，用急速段近似）；
      ③always-in 转空（“Whenever there is a strong spike, many traders will start the count over again”），这时回调起点改为这段急跌开始处的高点；
      ④H4 失败：H4 之后有 K 线跌破 H4 信号 K 的低点（书：“If the high 4 fails … and the market falls below its low, it is likely that the market is no longer forming
        a pullback in a bull trend and instead is in a bear swing.” L4 对称：“a bar extends above the high of the low 4 signal bar”）。之后的计数标记 after4（背景已变，见说明）。
   3) H2 检查：H1 和 H2 之间有没有突破第一腿的下降趋势线（“There needs to be at least a tiny trend line break between the high 1 and the high 2 …”）。
      趋势线 = 从回调起点的高点出发、经过第一腿里使斜率最大的那个高点（第一腿的所有高点都在线下）；H1 那根及之后到 H2 之前，只要有一根高点高于线就算突破。
   L 计数完全对称（用低点）。ai = 每根的 always-in（G.auto），可省略。
   返回每根 {H, L, h, l}：H/L = 1–4 或 0；h/l = {n, sig, weak, brk, line:{a, pa, b, pb}}（sig = 信号 K 下标；weak = 逆着 always-in；brk/line 只在第 2 次有）。 */
function barCounts(bars, ai) {
  const out = bars.map(() => ({ H: 0, L: 0, h: null, l: null }));
  for (const up of [true, false]) {
    const v = (b) => (up ? b.h : -b.l), back = (x) => (up ? x : -x), withDir = up ? '多' : '空', against = up ? '空' : '多';
    const w = (b) => (up ? -b.l : b.h);   // 反方向的极值（H 计数看低点、L 计数看高点）
    let ext = null, s = 0, k = 0, armed = false, line = null, broke = false, legTop = 0, sig4 = -1, i4 = -1, after4 = false;
    bars.forEach((b, i) => {
      const x = v(b);
      if (i === 0) { ext = x; s = 0; legTop = 0; return; }
      const beyond = x > v(bars[i - 1]);
      if (beyond && armed && k < 4) {
        k += 1; const o = { n: k, sig: i - 1, weak: !!ai && ai[i - 1] === against, after4 };
        if (k === 4) { sig4 = i - 1; i4 = i; }
        if (k === 1) {   // 第一腿的趋势线
          let best = null; for (let j = s + 1; j < i; j++) { const sl = (v(bars[j]) - v(bars[s])) / (j - s); if (best === null || sl >= best.sl) best = { j, sl }; }
          line = best ? { a: s, b: best.j, sl: best.sl } : null; broke = false;
        }
        if (k === 2) { o.brk = broke; o.line = line ? { a: line.a, pa: back(v(bars[line.a])), b: i, pb: back(v(bars[line.a]) + line.sl * (i - line.a)) } : null; }
        out[i][up ? 'H' : 'L'] = k; out[i][up ? 'h' : 'l'] = o; legTop = i;
      }
      if (k === 1 && line && !broke && x > v(bars[line.a]) + line.sl * (i - line.a)) broke = true;
      armed = !beyond;
      if (x >= v(bars[legTop])) legTop = i;                       // 最近一次反弹的顶（急跌从这里开始）
      const flipWith = ai && ai[i] === withDir && ai[i - 1] !== withDir, flipAgainst = ai && ai[i] === against && ai[i - 1] !== against;
      if (x > ext || flipWith) { ext = x; s = i; legTop = i; k = 0; line = null; after4 = false; }
      else if (flipAgainst) { s = legTop; k = 0; line = null; armed = false; after4 = false; }
      else if (k === 4 && i > i4 && w(b) > w(bars[sig4])) {          // H4 / L4 失败 → 从 H4 之后的最高点重新数
        let m = i4; for (let j = i4; j <= i; j++) if (v(bars[j]) >= v(bars[m])) m = j;
        ext = v(bars[m]); s = m; legTop = m; k = 0; line = null; armed = !beyond; after4 = true; }
    });
  }
  return out;
}
if (typeof module !== 'undefined') module.exports.barCounts = barCounts;
