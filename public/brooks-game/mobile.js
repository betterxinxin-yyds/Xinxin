(() => {
  'use strict';
  const $ = (s) => document.querySelector(s);
  const STORE = 'chart-quest-mobile-v1';
  let game = null;
  let state = null;

  const readStore = () => { try { return JSON.parse(localStorage.getItem(STORE)) || { sessions: [], drafts: {} }; } catch { return { sessions: [], drafts: {} }; } };
  const writeStore = (value) => localStorage.setItem(STORE, JSON.stringify(value));
  const download = (name, value) => { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([JSON.stringify(value, null, 2)], { type:'application/json' })); a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1500); };
  const toast = (text) => { const el = $('#toast'); el.textContent = text; el.classList.add('show'); clearTimeout(toast.timer); toast.timer = setTimeout(() => el.classList.remove('show'), 1800); };
  const show = (id) => document.querySelectorAll('.view').forEach((el) => el.classList.toggle('hidden', el.id !== id));
  const saveDraft = () => { if (!state) return; const store = readStore(); store.drafts[state.date] = state; writeStore(store); };

  function renderLobby() {
    show('lobby');
    const store = readStore(); $('#sessionCount').textContent = store.sessions.length;
    const items = (window.GAME_INDEX || []).slice().reverse();
    $('#dayList').innerHTML = items.map((date, i) => {
      const session = store.sessions.filter((s) => s.date === date).at(-1); const draft = store.drafts[date];
      const status = session ? `已保存 · ${session.decisions.length} 次判断` : draft ? `进行到第 ${draft.n} 根 · 点此继续` : '新盲练 · 不含答案';
      return `<button class="day-card" data-date="${date}"><span class="day-orb">${String(i + 1).padStart(2, '0')}</span><span class="day-main"><strong>${date}</strong><small>${status}</small></span><span class="day-arrow">›</span></button>`;
    }).join('');
    document.querySelectorAll('.day-card').forEach((el) => el.addEventListener('click', () => loadDay(el.dataset.date)));
  }

  function loadDay(date) {
    if (window.GAME_DAYS?.[date]) return begin(window.GAME_DAYS[date]);
    const script = document.createElement('script'); script.src = `data/${date}.js`; script.onload = () => begin(window.GAME_DAYS[date]); script.onerror = () => toast('这一段数据暂时无法载入'); document.head.appendChild(script);
  }

  function begin(data) {
    game = data;
    const draft = readStore().drafts[data.date];
    state = draft || { date:data.date, startedAt:new Date().toISOString(), n:Math.min(5, data.rth.length), decisions:[], current:{ tags:[],note:'' } };
    $('#dayTitle').textContent = `${data.date} · ES 5分钟`;
    $('#dayEyebrow').textContent = `BLIND PRACTICE · ${data.weekday || ''}`;
    show('practice'); renderPractice();
  }

  function renderPractice() {
    const max = game.rth.length;
    state.n = Math.max(1, Math.min(state.n, max));
    $('#barCount').textContent = `${state.n} / ${max}`; $('#candleBadge').textContent = `第 ${state.n} 根`;
    const chunks = 18; const fraction = state.n / max; $('#levelDots').innerHTML = Array.from({length:chunks}, (_,i) => `<i class="${i / chunks < fraction ? (i / chunks + 1 / chunks < fraction ? 'done' : 'current') : ''}"></i>`).join('');
    document.querySelectorAll('[data-action]').forEach((button) => button.classList.toggle('selected', state.current.tags?.includes(button.dataset.action)));
    $('#note').value = state.current.note || ''; drawChart(); saveDraft();
  }

  function drawChart() {
    const canvas = $('#chart'); const bounds = canvas.getBoundingClientRect(); const dpr = devicePixelRatio || 1; canvas.width = Math.round(bounds.width * dpr); canvas.height = Math.round(bounds.height * dpr); const ctx = canvas.getContext('2d'); ctx.scale(dpr,dpr);
    const lookback = Math.min(42, state.n); const bars = game.rth.slice(Math.max(0, state.n - lookback), state.n); const W = bounds.width, H = bounds.height; const top=24,bottom=23,left=10,right=56; const lo=Math.min(...bars.map((b)=>b.l)), hi=Math.max(...bars.map((b)=>b.h)), pad=Math.max((hi-lo)*.1,.5); const low=lo-pad, high=hi+pad; const slot=(W-left-right)/Math.max(bars.length,1); const y=(p)=>top+(high-p)/(high-low)*(H-top-bottom);
    ctx.font='10px ui-monospace, SFMono-Regular, Menlo, monospace'; ctx.textBaseline='middle';
    for(let i=0;i<=5;i++){ const p=low+(high-low)*i/5, yy=y(p); ctx.strokeStyle='rgba(190,214,255,.13)';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(left,yy);ctx.lineTo(W-right,yy);ctx.stroke();ctx.fillStyle='rgba(204,222,255,.75)';ctx.fillText(p.toFixed(2),W-right+7,yy); }
    const ema=[]; const k=2/21; bars.forEach((b,i)=>ema.push(i ? b.c*k+ema[i-1]*(1-k) : b.c));
    ctx.lineCap='round'; ctx.lineJoin='round'; ctx.strokeStyle='rgba(211,231,255,.65)'; ctx.lineWidth=1.4; ctx.beginPath(); ema.forEach((p,i)=>i?ctx.lineTo(left+(i+.5)*slot,y(p)):ctx.moveTo(left+(i+.5)*slot,y(p)));ctx.stroke();
    bars.forEach((b,i)=>{ const x=left+(i+.5)*slot; const rise=b.c>=b.o; const color=rise?'#57dfc3':'#ff7b91'; ctx.strokeStyle=color;ctx.lineWidth=1.25;ctx.beginPath();ctx.moveTo(x,y(b.h));ctx.lineTo(x,y(b.l));ctx.stroke();const a=y(Math.max(b.o,b.c)), z=y(Math.min(b.o,b.c));ctx.fillStyle=color;ctx.fillRect(x-Math.max(2,slot*.28),a,Math.max(4,slot*.56),Math.max(2,z-a)); });
    bars.forEach((bar,i)=>{ if(i===0||i===bars.length-1||i%8===0){ctx.fillStyle='rgba(180,202,243,.62)';ctx.textAlign='center';ctx.textBaseline='alphabetic';ctx.fillText(bar.t||'',left+(i+.5)*slot,H-5);}});ctx.textAlign='left';
    const currentX=left+(bars.length-.5)*slot; ctx.strokeStyle='rgba(255,207,112,.78)';ctx.setLineDash([3,4]);ctx.beginPath();ctx.moveTo(currentX,top);ctx.lineTo(currentX,H-bottom);ctx.stroke();ctx.setLineDash([]);const last=bars.at(-1);ctx.fillStyle=last.c>=last.o?'#57dfc3':'#ff7b91';ctx.fillRect(W-right+2,y(last.c)-8,right-3,16);ctx.fillStyle='#14204a';ctx.font='bold 10px ui-monospace, monospace';ctx.textBaseline='middle';ctx.fillText(last.c.toFixed(2),W-right+6,y(last.c));
  }

  function choose(button) { const tag=button.dataset.action; const tags=state.current.tags || []; state.current.tags=tags.includes(tag)?tags.filter((item)=>item!==tag):[...tags,tag]; renderPractice(); if (navigator.vibrate) navigator.vibrate(8); }
  function next() {
    state.current.note = $('#note').value.trim();
    state.decisions.push({ bar:state.n, at:new Date().toISOString(), ...state.current });
    if (state.n >= game.rth.length) return finish();
    state.n += 1; state.current = { tags:[],note:'' }; renderPractice();
  }
  function back() { if (state.n <= 1) return; state.n -= 1; state.current = state.decisions.pop() || { tags:[],note:'' }; renderPractice(); }
  function finish() {
    state.completedAt = new Date().toISOString(); const store=readStore(); delete store.drafts[state.date]; store.sessions.push(state); writeStore(store); $('#finishText').textContent = `已记录 ${state.decisions.length} 次判断与随手笔记。把它带回本地完整版，对照答案继续复盘。`; show('finish'); state=null;
  }
  function exportProgress() { const store=readStore(); download('chart-quest-mobile-records.json',{ app:'Chart Quest Mobile', exportedAt:new Date().toISOString(), sessions:store.sessions, drafts:store.drafts }); toast('练习记录已导出'); }

  $('#homeBtn').addEventListener('click', renderLobby); $('#exportBtn').addEventListener('click', exportProgress); $('#quitBtn').addEventListener('click', () => { saveDraft(); toast('已保存到这台设备'); renderLobby(); }); $('#backBtn').addEventListener('click', back); $('#nextBtn').addEventListener('click', next); $('#finishExport').addEventListener('click', exportProgress); $('#finishHome').addEventListener('click', renderLobby);
  document.addEventListener('click', (event) => { const button=event.target.closest('[data-action]'); if (button) choose(button); }); window.addEventListener('resize', () => { if (!$('#practice').classList.contains('hidden')) drawChart(); });
  renderLobby();
})();
