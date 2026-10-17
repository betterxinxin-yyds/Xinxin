(() => {
  'use strict';
  const $ = (s) => document.querySelector(s);
  const STORE = 'chart-quest-mobile-v1';
  let game = null, state = null;

  const readStore = () => { try { return JSON.parse(localStorage.getItem(STORE)) || { sessions: [], drafts: {} }; } catch { return { sessions: [], drafts: {} }; } };
  const writeStore = (value) => localStorage.setItem(STORE, JSON.stringify(value));
  const tick = (price) => Math.round(price / game.tick) * game.tick;
  const fmt = (price) => Number(price).toFixed(2);
  const download = (name, value) => { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([JSON.stringify(value, null, 2)], { type: 'application/json' })); a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1500); };
  const toast = (text) => { const el = $('#toast'); el.textContent = text; el.classList.add('show'); clearTimeout(toast.timer); toast.timer = setTimeout(() => el.classList.remove('show'), 1800); };
  const show = (id) => document.querySelectorAll('.view').forEach((el) => el.classList.toggle('hidden', el.id !== id));
  const saveDraft = () => { if (!state) return; const store = readStore(); store.drafts[state.date] = state; writeStore(store); };

  function newSession(date) { return { date, startedAt: new Date().toISOString(), n: Math.min(5, game.rth.length), logs: [], signals: [], orders: [], pos: null, trades: [], tradeSeq: 0, tool: null, toolDraft: null, current: { note: '' } }; }
  function normalizeDraft(draft, date) { const fresh = newSession(date); if (!draft) return fresh; return { ...fresh, ...draft, signals: draft.signals || [], orders: draft.orders || [], trades: draft.trades || [], logs: draft.logs || draft.decisions || [], current: { note: draft.current?.note || '' }, tool: null, toolDraft: null }; }

  function renderLobby() {
    show('lobby'); const store = readStore(); $('#sessionCount').textContent = store.sessions.length;
    const items = (window.GAME_INDEX || []).slice().reverse();
    $('#dayList').innerHTML = items.map((date, i) => { const session = store.sessions.filter((s) => s.date === date).at(-1), draft = store.drafts[date]; const status = session ? `已保存 · ${session.logs?.length || session.decisions?.length || 0} 根` : draft ? `进行到第 ${draft.n} 根 · 点此继续` : '新盲练 · 不含答案'; return `<button class="day-card" data-date="${date}"><span class="day-orb">${String(i + 1).padStart(2, '0')}</span><span class="day-main"><strong>${date}</strong><small>${status}</small></span><span class="day-arrow">›</span></button>`; }).join('');
    document.querySelectorAll('.day-card').forEach((el) => el.addEventListener('click', () => loadDay(el.dataset.date)));
  }
  function loadDay(date) { if (window.GAME_DAYS?.[date]) return begin(window.GAME_DAYS[date]); const script = document.createElement('script'); script.src = `data/${date}.js`; script.onload = () => begin(window.GAME_DAYS[date]); script.onerror = () => toast('这一段数据暂时无法载入'); document.head.appendChild(script); }
  function begin(data) { game = data; state = normalizeDraft(readStore().drafts[data.date], data.date); $('#dayTitle').textContent = `${data.date} · ES 5分钟`; $('#dayEyebrow').textContent = `BLIND PRACTICE · ${data.weekday || ''}`; show('practice'); renderPractice(); }

  function renderPractice() {
    const max = game.rth.length; state.n = Math.max(1, Math.min(state.n, max)); $('#barCount').textContent = `${state.n} / ${max}`; $('#candleBadge').textContent = `第 ${state.n} 根`;
    const chunks = 18, fraction = state.n / max; $('#levelDots').innerHTML = Array.from({ length: chunks }, (_, i) => `<i class="${i / chunks < fraction ? (i / chunks + 1 / chunks < fraction ? 'done' : 'current') : ''}"></i>`).join('');
    $('#note').value = state.current.note || ''; renderTradePanel(); drawChart(); saveDraft();
  }
  function renderTradePanel() {
    const signal = state.signals.includes(state.n), pending = state.orders[0], pos = state.pos;
    $('#signalBtn').classList.toggle('on', signal); $('#buyBtn').disabled = !!pos; $('#sellBtn').disabled = !!pos;
    let status = 'Buy / Sell 会按当前 K 线自动挂单；图上任意位置按住拖动可调整最近价位。';
    if (pending) status = `挂单：${pending.dir === 'long' ? 'Buy' : 'Sell'} Stop @ ${fmt(pending.entry)} · Stop ${fmt(pending.stop)}`;
    if (pos) status = '持仓中。可在下方设置目标、保本或平仓。'; $('#tradeStatus').textContent = status;
    const card = $('#positionCard'); let html = '';
    if (pending) html += `<b>Pending order</b><br>${pending.dir === 'long' ? 'Buy' : 'Sell'} @ ${fmt(pending.entry)} · Stop ${fmt(pending.stop)}`;
    if (pos) { const last = game.rth[state.n - 1].c, d = pos.dir === 'long' ? 1 : -1, open = (last - pos.entry) * d; html += `<b>${pos.dir === 'long' ? 'Long' : 'Short'} · ${pos.qty}/2</b><br>@ ${fmt(pos.entry)} · Stop ${fmt(pos.stop)}${pos.target ? ` · Target ${fmt(pos.target)}` : ''}<br>Open ${open >= 0 ? '+' : ''}${fmt(open)} pts · ${open >= 0 ? '+' : ''}${(open / pos.risk0).toFixed(2)}R`; }
    card.innerHTML = html; card.classList.toggle('show', !!html); document.querySelectorAll('[data-manage]').forEach((button) => { button.disabled = button.dataset.manage === 'cancel' ? !pending : !pos; });
    const extreme = $('#extremeStopBtn'); extreme.disabled = !pending; extreme.textContent = pending?.dir === 'long' ? '前低止损' : '前高止损';
  }

  function drawChart() {
    const canvas = $('#chart'), bounds = canvas.getBoundingClientRect(), dpr = devicePixelRatio || 1; canvas.width = Math.round(bounds.width * dpr); canvas.height = Math.round(bounds.height * dpr); const ctx = canvas.getContext('2d'); ctx.scale(dpr, dpr);
    const lookback = Math.min(42, state.n), start = Math.max(0, state.n - lookback), bars = game.rth.slice(start, state.n), W = bounds.width, H = bounds.height, top = 24, bottom = 23, left = 10, right = 56;
    const values = bars.flatMap((b) => [b.l, b.h]); if (state.orders[0]) values.push(state.orders[0].entry, state.orders[0].stop); if (state.pos) values.push(state.pos.entry, state.pos.stop, ...(state.pos.target ? [state.pos.target] : [])); const lo = Math.min(...values), hi = Math.max(...values), pad = Math.max((hi - lo) * .1, .5), low = lo - pad, high = hi + pad, slot = (W - left - right) / Math.max(bars.length, 1), y = (p) => top + (high - p) / (high - low) * (H - top - bottom); state.frame = { top, bottom, left, right, low, high, W, H, y };
    ctx.font = '10px ui-monospace, SFMono-Regular, Menlo, monospace'; ctx.textBaseline = 'middle'; for (let i = 0; i <= 5; i++) { const p = low + (high - low) * i / 5, yy = y(p); ctx.strokeStyle = 'rgba(190,214,255,.13)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(left, yy); ctx.lineTo(W - right, yy); ctx.stroke(); ctx.fillStyle = 'rgba(204,222,255,.75)'; ctx.fillText(p.toFixed(2), W - right + 7, yy); }
    const ema = [], k = 2 / 21; bars.forEach((b, i) => ema.push(i ? b.c * k + ema[i - 1] * (1 - k) : b.c)); ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.strokeStyle = 'rgba(211,231,255,.65)'; ctx.lineWidth = 1.4; ctx.beginPath(); ema.forEach((p, i) => i ? ctx.lineTo(left + (i + .5) * slot, y(p)) : ctx.moveTo(left + (i + .5) * slot, y(p))); ctx.stroke();
    bars.forEach((b, i) => { const x = left + (i + .5) * slot, rise = b.c >= b.o, color = rise ? '#57dfc3' : '#ff7b91'; ctx.strokeStyle = color; ctx.lineWidth = 1.25; ctx.beginPath(); ctx.moveTo(x, y(b.h)); ctx.lineTo(x, y(b.l)); ctx.stroke(); const a = y(Math.max(b.o, b.c)), z = y(Math.min(b.o, b.c)); ctx.fillStyle = color; ctx.fillRect(x - Math.max(2, slot * .28), a, Math.max(4, slot * .56), Math.max(2, z - a)); });
    const line = (price, color, label) => { if (price < low || price > high) return; const yy = y(price); ctx.save(); ctx.strokeStyle = color; ctx.lineWidth = 1.2; ctx.setLineDash([5, 4]); ctx.beginPath(); ctx.moveTo(left, yy); ctx.lineTo(W - right, yy); ctx.stroke(); ctx.restore(); ctx.fillStyle = color; ctx.font = 'bold 9px ui-monospace, monospace'; ctx.fillText(label, left + 5, yy - 6); };
    if (state.orders[0]) { line(state.orders[0].entry, '#ffcf70', 'ORDER'); line(state.orders[0].stop, '#ff7b91', 'STOP'); } if (state.pos) { line(state.pos.entry, '#72e8ff', 'ENTRY'); line(state.pos.stop, '#ff7b91', 'STOP'); if (state.pos.target) line(state.pos.target, '#57dfc3', 'TARGET'); }
    state.signals.forEach((barNo) => { if (barNo < start + 1 || barNo > state.n) return; const i = barNo - start - 1, b = bars[i], x = left + (i + .5) * slot, yy = y(b.h) - 10; ctx.fillStyle = '#ffcf70'; ctx.beginPath(); ctx.moveTo(x, yy - 5); ctx.lineTo(x + 5, yy); ctx.lineTo(x, yy + 5); ctx.lineTo(x - 5, yy); ctx.closePath(); ctx.fill(); });
    bars.forEach((bar, i) => { if (i === 0 || i === bars.length - 1 || i % 8 === 0) { ctx.fillStyle = 'rgba(180,202,243,.62)'; ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic'; ctx.fillText(bar.t || '', left + (i + .5) * slot, H - 5); } }); ctx.textAlign = 'left'; const currentX = left + (bars.length - .5) * slot, last = bars.at(-1); ctx.strokeStyle = 'rgba(255,207,112,.78)'; ctx.setLineDash([3, 4]); ctx.beginPath(); ctx.moveTo(currentX, top); ctx.lineTo(currentX, H - bottom); ctx.stroke(); ctx.setLineDash([]); ctx.fillStyle = last.c >= last.o ? '#57dfc3' : '#ff7b91'; ctx.fillRect(W - right + 2, y(last.c) - 8, right - 3, 16); ctx.fillStyle = '#14204a'; ctx.font = 'bold 10px ui-monospace, monospace'; ctx.textBaseline = 'middle'; ctx.fillText(last.c.toFixed(2), W - right + 6, y(last.c));
  }

  function placeDefaultOrder(dir) {
    if (state.pos) return toast('先管理或平掉当前持仓');
    const bar = game.rth[state.n - 1], t = game.tick;
    state.orders = [{ dir, entry: tick(dir === 'long' ? bar.h + t : bar.l - t), stop: tick(dir === 'long' ? bar.l - t : bar.h + t), type: 'stop', placedAt: state.n }];
    toast(`${dir === 'long' ? 'Buy' : 'Sell'} 挂单已按信号 K 设置`); renderPractice();
  }
  function setExtremeStop() {
    const order = state.orders[0]; if (!order) return;
    const previous = game.rth.slice(Math.max(0, state.n - 6), Math.max(0, state.n - 1)); if (!previous.length) return toast('需要至少一根前序 K 线');
    order.stop = tick(order.dir === 'long' ? Math.min(...previous.map((bar) => bar.l)) - game.tick : Math.max(...previous.map((bar) => bar.h)) + game.tick);
    toast(order.dir === 'long' ? '已改为前低止损' : '已改为前高止损'); renderPractice();
  }
  function dragPrice(event) {
    const f = state.frame, rect = $('#chart').getBoundingClientRect(), y = event.clientY - rect.top;
    return tick(f.high - (y - f.top) / (f.H - f.top - f.bottom) * (f.high - f.low));
  }
  function dragTarget() { const order = state.orders[0], pos = state.pos; if (order) return Math.abs(state.dragStart - order.entry) <= Math.abs(state.dragStart - order.stop) ? { object: order, field: 'entry', dir: order.dir } : { object: order, field: 'stop', dir: order.dir }; if (pos) { const prices = [{ field: 'stop', price: pos.stop }, ...(pos.target ? [{ field: 'target', price: pos.target }] : [])]; const nearest = prices.sort((a, b) => Math.abs(state.dragStart - a.price) - Math.abs(state.dragStart - b.price))[0]; return { object: pos, field: nearest.field, dir: pos.dir }; } return null; }
  function pointerDown(event) {
    if ((!state.orders[0] && !state.pos) || !state.frame) return;
    event.preventDefault(); const price = dragPrice(event); state.dragStart = price; const target = dragTarget(); if (!target) return;
    state.drag = { ...target, original: target.object[target.field] }; state.drag.object[state.drag.field] = price; $('#chart').setPointerCapture?.(event.pointerId); drawChart();
  }
  function pointerMove(event) { if (!state.drag) return; const price = dragPrice(event); state.drag.object[state.drag.field] = price; drawChart(); }
  function pointerUp(event) {
    if (!state.drag) return; const { object, field, original, dir } = state.drag;
    const isOrder = object === state.orders[0], valid = !isOrder || (dir === 'long' ? object.stop < object.entry : object.stop > object.entry);
    if (!valid) { object[field] = original; toast('止损必须在入场价另一侧'); } else if (isOrder) { object.type = 'stop'; }
    state.drag = null; $('#chart').releasePointerCapture?.(event.pointerId); renderPractice();
  }
  function fillPrice(order, bar) { if (order.type === 'stop') { if (order.dir === 'long' && bar.h >= order.entry) return Math.max(order.entry, bar.o); if (order.dir === 'short' && bar.l <= order.entry) return Math.min(order.entry, bar.o); } else { if (order.dir === 'long' && bar.l <= order.entry) return Math.min(order.entry, bar.o); if (order.dir === 'short' && bar.h >= order.entry) return Math.max(order.entry, bar.o); } return null; }
  function marketStep(bar) { if (state.pos) managePosition(bar); if (state.pos) return; const order = state.orders[0]; if (!order) return; const fill = fillPrice(order, bar); if (fill != null) { state.orders = []; state.pos = { id: ++state.tradeSeq, dir: order.dir, entry: fill, stop: order.stop, stop0: order.stop, target: null, qty: 2, qty0: 2, risk0: Math.abs(fill - order.stop), exits: [], fillBar: state.n }; managePosition(bar, true); } else if (order.placedAt < state.n) { state.orders = []; toast('挂单未成交，已自动撤销'); } }
  function managePosition(bar, sameBar = false) { const p = state.pos, d = p.dir === 'long' ? 1 : -1, stopHit = d > 0 ? bar.l <= p.stop : bar.h >= p.stop, targetHit = p.target != null && (d > 0 ? bar.h >= p.target : bar.l <= p.target); if (stopHit) return exitPosition(p.qty, sameBar ? p.stop : (d > 0 ? Math.min(p.stop, bar.o) : Math.max(p.stop, bar.o)), 'stop'); if (targetHit) exitPosition(p.qty, sameBar ? p.target : (d > 0 ? Math.max(p.target, bar.o) : Math.min(p.target, bar.o)), 'target'); }
  function exitPosition(qty, price, reason) { const p = state.pos; if (!p) return; p.exits.push({ bar: state.n, price, qty, reason }); p.qty -= qty; if (p.qty > 0) return; const d = p.dir === 'long' ? 1 : -1, points = p.exits.reduce((sum, exit) => sum + (exit.price - p.entry) * d * exit.qty, 0); p.R = +(points / p.qty0 / p.risk0).toFixed(2); p.usd = +(points * game.point_value).toFixed(2); p.exitBar = state.n; state.trades.push(p); state.pos = null; }
  function manage(action) { const p = state.pos; if (action === 'cancel') { state.orders = []; toast('挂单已撤销'); return renderPractice(); } if (!p) return; if (action === 't1' || action === 't2') { const d = p.dir === 'long' ? 1 : -1; p.target = tick(p.entry + d * Number(action.slice(-1)) * p.risk0); } if (action === 'be') p.stop = p.entry; if (action === 'half') exitPosition(1, game.rth[state.n - 1].c, 'manual half'); if (action === 'flat') exitPosition(p.qty, game.rth[state.n - 1].c, 'manual flat'); renderPractice(); }

  function next() { state.current.note = $('#note').value.trim(); state.logs.push({ bar: state.n, at: new Date().toISOString(), note: state.current.note, signal: state.signals.includes(state.n), pending: state.orders[0] ? { ...state.orders[0] } : null, position: state.pos ? { ...state.pos } : null }); if (state.n >= game.rth.length) return finish(); state.n += 1; state.current = { note: '' }; marketStep(game.rth[state.n - 1]); renderPractice(); }
  function back() { if (state.n <= 1) return; state.n -= 1; state.current = state.logs.pop() || { note: '' }; renderPractice(); }
  function finish() { state.completedAt = new Date().toISOString(); const store = readStore(); delete store.drafts[state.date]; store.sessions.push(state); writeStore(store); $('#finishText').textContent = `已记录 ${state.logs.length} 根 K 线、${state.signals.length} 个 Signal K 和 ${state.trades.length} 笔完成交易。`; show('finish'); state = null; }
  function exportProgress() { const store = readStore(); download('chart-quest-mobile-records.json', { app: 'Chart Quest Mobile', exportedAt: new Date().toISOString(), sessions: store.sessions, drafts: store.drafts }); toast('练习记录已导出'); }

  $('#homeBtn').addEventListener('click', renderLobby); $('#exportBtn').addEventListener('click', exportProgress); $('#quitBtn').addEventListener('click', () => { saveDraft(); toast('已保存到这台设备'); renderLobby(); }); $('#backBtn').addEventListener('click', back); $('#nextBtn').addEventListener('click', next); $('#finishExport').addEventListener('click', exportProgress); $('#finishHome').addEventListener('click', renderLobby); $('#signalBtn').addEventListener('click', () => { const i = state.signals.indexOf(state.n); i >= 0 ? state.signals.splice(i, 1) : state.signals.push(state.n); renderPractice(); }); $('#buyBtn').addEventListener('click', () => placeDefaultOrder('long')); $('#sellBtn').addEventListener('click', () => placeDefaultOrder('short')); $('#extremeStopBtn').addEventListener('click', setExtremeStop); document.querySelectorAll('[data-manage]').forEach((button) => button.addEventListener('click', () => manage(button.dataset.manage))); const chart = $('#chart'); chart.addEventListener('pointerdown', pointerDown); chart.addEventListener('pointermove', pointerMove); chart.addEventListener('pointerup', pointerUp); chart.addEventListener('pointercancel', pointerUp); window.addEventListener('resize', () => { if (!$('#practice').classList.contains('hidden')) drawChart(); }); renderLobby();
})();
