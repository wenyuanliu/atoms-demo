// ============ Atoms Demo 核心逻辑 ============
const LS_KEY = 'atoms_demo_apps_v1';
const KEY_LS = 'atoms_demo_api_key';

const state = {
  apps: [],          // [{id, title, prompt, html, versions: [{prompt, html, ts}], createdAt}]
  currentId: null,
  race: false,
  streaming: false,
  raceHtml: null,   // {a: html, b: html}
};

// ---------- 工具 ----------
const $ = s => document.querySelector(s);
const uid = () => Math.random().toString(36).slice(2, 10);
const getKey = () => localStorage.getItem(KEY_LS) || '';
const currentApp = () => state.apps.find(a => a.id === state.currentId);

function save() {
  localStorage.setItem(LS_KEY, JSON.stringify(state.apps));
}
function load() {
  try { state.apps = JSON.parse(localStorage.getItem(LS_KEY) || '[]'); } catch(e){ state.apps = []; }
}

// ---------- Prompt 工程 ----------
const SYS_PROMPT = `你是一个前端应用生成引擎。用户会用中文描述他想要的网页应用，你需要直接输出一个【完整可运行的单文件 HTML】。

严格要求：
1. 只输出一个完整的 .html 文件内容，从 <!DOCTYPE html> 开始，到 </html> 结束。
2. 不要用 \`\`\`html 代码块包裹，不要任何解释性文字。
3. 内联所有 CSS（<style>）和 JS（<script>），可以用 CDN 引入 Tailwind / 字体 / 图标。
4. UI 要现代、精致、有设计感：合理留白、配色和谐、有 hover / 过渡动效。
5. 所有交互在浏览器本地完成（localStorage / 内存状态），不依赖后端。
6. 代码必须能直接在 iframe 里跑起来，不要用伪代码或 TODO。
7. 如果用户提供了现有代码，你必须在原有基础上做【最小针对性修改】——保留原有功能、布局、交互逻辑完全不变，只改用户要求改的部分。绝对不要重写整个应用，不要重新设计 UI，不要改变数据结构，不要新增用户没要求的功能。`;

function buildUserPrompt(prompt, prevHtml) {
  if (prevHtml) {
    return `【重要】下面是用户正在使用的现有应用代码。用户提了一个修改需求，你必须在现有代码基础上做最小改动，不要重写整个应用。

修改需求："""${prompt}"""

修改要求：
- 保留原有所有功能、布局、交互逻辑完全不变
- 只做用户要求的修改，不要画蛇添足加新功能
- 不要重新设计 UI，不要改变配色方案（除非用户明确要求改色）
- 输出修改后的完整单文件 HTML

现有应用代码：
\`\`\`html
${prevHtml}
\`\`\`

只输出完整 HTML 代码，不要解释。`;
  }
  return `请生成一个这样的网页应用："""${prompt}"""

要求：单文件 HTML，内联 CSS/JS，现代精致 UI，所有功能本地可用。直接输出完整代码。`;
}

// ---------- Mock 生成器（无 Key 兜底） ----------
const MOCK_TEMPLATES = [
  {
    match: /待办|看板|todo|任务|项目/,
    title: '项目看板',
    html: `<DOCTYPE html><html><head><meta charset="utf-8"><style>
*{box-sizing:border-box;margin:0;padding:0}body{font-family:-apple-system,sans-serif;background:#f1f5f9;padding:24px;color:#1e293b}
h1{margin-bottom:16px} .board{display:grid;grid-template-columns:repeat(3,1fr);gap:16px}
.col{background:#fff;border-radius:12px;padding:12px;min-height:400px;box-shadow:0 1px 3px rgba(0,0,0,.06)}
.col h2{font-size:14px;text-transform:uppercase;color:#64748b;margin-bottom:12px;display:flex;justify-content:space-between}
.card{background:#f8fafc;border-left:3px solid #6366f1;padding:10px 12px;border-radius:6px;margin-bottom:8px;cursor:grab;font-size:14px}
.card.pri{border-left-color:#ef4444}.card.wip{border-left-color:#f59e0b}.card.done{border-left-color:#10b981;opacity:.6;text-decoration:line-through}
.add{width:100%;padding:8px;border:1px dashed #cbd5e1;background:transparent;border-radius:6px;cursor:pointer;color:#64748b}
</style></head><body><h1>📋 项目看板</h1><div class="board">
<div class="col"><h2>待办 <span>3</span></h2><div class="card pri">设计首页 UI</div><div class="card">写 PRD 文档</div><div class="card">和客户对齐需求</div><button class="add">+ 添加卡片</button></div>
<div class="col"><h2>进行中 <span>2</span></h2><div class="card wip">搭建前端骨架</div><div class="card wip">对接登录接口</div><button class="add">+ 添加卡片</button></div>
<div class="col"><h2>已完成 <span>2</span></h2><div class="card done">技术选型评审</div><div class="card done">初始化仓库</div><button class="add">+ 添加卡片</button></div>
</div></body></html>`
  },
  {
    match: /记账|账本|bookkeep|财务|开销/,
    title: '个人记账本',
    html: `<DOCTYPE html><html><head><meta charset="utf-8"><style>
*{box-sizing:border-box;margin:0;padding:0}body{font-family:-apple-system,sans-serif;background:#f8fafc;padding:24px;color:#1e293b;max-width:720px;margin:0 auto}
h1{margin-bottom:16px}.sum{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:20px}
.stat{background:#fff;padding:16px;border-radius:12px;box-shadow:0 1px 3px rgba(0,0,0,.06)}
.stat .num{font-size:22px;font-weight:700}.stat small{color:#64748b}
form{background:#fff;padding:16px;border-radius:12px;margin-bottom:16px;display:flex;gap:8px;flex-wrap:wrap}
input,select{padding:8px;border:1px solid #e2e8f0;border-radius:6px;font-size:14px}
button{padding:8px 16px;background:#6366f1;color:#fff;border:none;border-radius:6px;cursor:pointer}
.list{background:#fff;border-radius:12px;overflow:hidden}.row{display:flex;justify-content:space-between;padding:12px 16px;border-bottom:1px solid #f1f5f9;font-size:14px}
.cat{display:inline-block;padding:2px 8px;border-radius:4px;font-size:12px;background:#e0e7ff;color:#4338ca;margin-right:8px}
</style></head><body><h1>💰 个人记账本</h1>
<div class="sum"><div class="stat"><small>本月支出</small><div class="num" id="total">¥0</div></div><div class="stat"><small>笔数</small><div class="num" id="count">0</div></div><div class="stat"><small>日均</small><div class="num">¥0</div></div></div>
<form onsubmit="addItem(event)"><input id="amount" type="number" placeholder="金额" required><input id="note" placeholder="备注"><select id="cat"><option>餐饮</option><option>交通</option><option>购物</option><option>住房</option><option>其他</option></select><button>记一笔</button></form>
<div class="list" id="list"></div>
<script>
let items=JSON.parse(localStorage.getItem('bk')||'[]');
function render(){document.getElementById('list').innerHTML=items.map((i,idx)=>'<div class="row"><span><span class="cat">'+i.cat+'</span>'+i.note+'</span><span>¥'+i.amount+'</span></div>').join('');
document.getElementById('total').textContent='¥'+items.reduce((s,i)=>s+Number(i.amount),0);
document.getElementById('count').textContent=items.length;}
function addItem(e){e.preventDefault();const a=+document.getElementById('amount').value,n=document.getElementById('note').value,c=document.getElementById('cat').value;items.unshift({amount:a,note:n,cat:c});localStorage.setItem('bk',JSON.stringify(items));e.target.reset();render();}
render();<\/script></body></html>`
  },
  {
    match: /房贷|贷款|计算器|calculator|利息|月供/,
    title: '房贷计算器',
    html: `<DOCTYPE html><html><head><meta charset="utf-8"><style>
*{box-sizing:border-box;margin:0;padding:0}body{font-family:-apple-system,sans-serif;background:linear-gradient(135deg,#667eea,#764ba2);min-height:100vh;display:flex;align-items:center;justify-content:center;padding:20px}
.card{background:#fff;border-radius:16px;padding:32px;max-width:480px;width:100%;box-shadow:0 20px 60px rgba(0,0,0,.3)}
h1{font-size:22px;margin-bottom:20px}label{display:block;font-size:13px;color:#64748b;margin:12px 0 4px}
input{width:100%;padding:10px;border:1px solid #e2e8f0;border-radius:8px;font-size:15px}
.result{margin-top:20px;background:#f0f9ff;padding:16px;border-radius:10px}.result .big{font-size:28px;font-weight:700;color:#0369a1}
.row{display:flex;justify-content:space-between;font-size:14px;padding:4px 0;color:#475569}
</style></head><body><div class="card"><h1>🏠 房贷月供计算器</h1>
<label>贷款总额（万）</label><input id="p" type="number" value="100">
<label>年利率（%）</label><input id="r" type="number" value="4.2" step="0.01">
<label>贷款年限</label><input id="y" type="number" value="30">
<div class="result"><div class="row"><span>月供（等额本息）</span><span class="big" id="m">¥-</span></div><div class="row"><span>总利息</span><span id="ti">-</span></div><div class="row"><span>还款总额</span><span id="tp">-</span></div></div>
</div><script>
function calc(){const P=+document.getElementById('p').value*10000;const r=+document.getElementById('r').value/100/12;const n=+document.getElementById('y').value*12;
const m=P*r*Math.pow(1+r,n)/(Math.pow(1+r,n)-1);const tp=m*n;
document.getElementById('m').textContent='¥'+m.toFixed(0);document.getElementById('ti').textContent='¥'+(tp-P).toFixed(0);document.getElementById('tp').textContent='¥'+tp.toFixed(0);}
['p','r','y'].forEach(id=>document.getElementById(id).addEventListener('input',calc));calc();<\/script></body></html>`
  },
  {
    match: /蛇|snake|游戏|game|贪吃/,
    title: '贪吃蛇',
    html: `<DOCTYPE html><html><head><meta charset="utf-8"><style>
body{margin:0;background:#0f172a;display:flex;flex-direction:column;align-items:center;justify-content:center;height:100vh;color:#fff;font-family:monospace}
canvas{background:#1e293b;border-radius:8px}.bar{margin:12px 0;font-size:18px}
</style></head><body><div class="bar">得分: <span id="s">0</span></div><canvas id="c" width="400" height="400"></canvas><div class="bar">方向键控制 · 空格暂停</div>
<script>
const cv=document.getElementById('c'),ctx=cv.getContext('2d');let s=[{x:10,y:10}],d={x:1,y:0},food=rand(),score=0,pause=false,t;
function rand(){return{x:Math.floor(Math.random()*20),y:Math.floor(Math.random()*20)}}
document.onkeydown=e=>{if(e.key==' '){pause=!pause;return}
if(e.key=='ArrowUp'&&d.y!=1)d={x:0,y:-1};if(e.key=='ArrowDown'&&d.y!=-1)d={x:0,y:1};
if(e.key=='ArrowLeft'&&d.x!=1)d={x:-1,y:0};if(e.key=='ArrowRight'&&d.x!=-1)d={x:1,y:0};};
function loop(){if(pause)return;const h={x:s[0].x+d.x,y:s[0].y+d.y};
if(h.x<0||h.x>=20||h.y<0||h.y>=20||s.some(p=>p.x==h.x&&p.y==h.y)){alert('Game Over! 得分 '+score);location.reload();return}
s.unshift(h);if(h.x==food.x&&h.y==food.y){score++;document.getElementById('s').textContent=score;food=rand()}else s.pop();
ctx.fillStyle='#1e293b';ctx.fillRect(0,0,400,400);ctx.fillStyle='#22c55e';s.forEach(p=>ctx.fillRect(p.x*20,p.y*20,19,19));
ctx.fillStyle='#ef4444';ctx.fillRect(food.x*20,food.y*20,19,19);}
t=setInterval(loop,120);<\/script></body></html>`
  }
];

function mockGenerate(prompt) {
  // 简单延迟模拟流式
  const tpl = MOCK_TEMPLATES.find(t => t.match.test(prompt));
  const html = tpl ? tpl.html : defaultMockHtml(prompt);
  return { title: tpl ? tpl.title : '我的应用', html };
}
function defaultMockHtml(prompt) {
  return `<DOCTYPE html><html><head><meta charset="utf-8"><style>
body{font-family:-apple-system,sans-serif;min-height:100vh;display:flex;align-items:center;justify-content:center;background:linear-gradient(135deg,#667eea,#764ba2);color:#fff;margin:0}
.box{text-align:center;padding:40px}.box h1{font-size:36px;margin-bottom:12px}.box p{opacity:.9}
.badge{display:inline-block;padding:4px 12px;border:1px solid rgba(255,255,255,.4);border-radius:20px;font-size:12px;margin-top:20px}
</style></head><body><div class="box"><h1>✨ 你的应用</h1><p>"${prompt.replace(/</g,'&lt;')}"</p><div class="badge">Mock 模式 · 配置 API Key 后可生成完整应用</div></div></body></html>`;
}

// ---------- DeepSeek 调用（流式） ----------
async function callModel(prompt, prevHtml, onToken) {
  const key = getKey();
  if (!key) {
    // Mock：逐字吐
    const { html } = mockGenerate(prompt);
    for (let i = 0; i < html.length; i += 8) {
      onToken(html.slice(0, i));
      await new Promise(r => setTimeout(r, 5));
    }
    return html;
  }
  const resp = await fetch('https://api.deepseek.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + key },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages: [
        { role: 'system', content: SYS_PROMPT },
        { role: 'user', content: buildUserPrompt(prompt, prevHtml) }
      ],
      stream: true,
      temperature: 0.7,
    })
  });
  if (!resp.ok) {
    const err = await resp.text();
    throw new Error('API 错误 ' + resp.status + ': ' + err.slice(0, 200));
  }
  const reader = resp.body.getReader();
  const decoder = new TextDecoder();
  let buf = '', full = '';
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    const lines = buf.split('\n');
    buf = lines.pop();
    for (const line of lines) {
      const t = line.trim();
      if (!t.startsWith('data:')) continue;
      const data = t.slice(5).trim();
      if (data === '[DONE]') continue;
      try {
        const j = JSON.parse(data);
        const delta = j.choices?.[0]?.delta?.content || '';
        if (delta) { full += delta; onToken(full); }
      } catch(e){}
    }
  }
  return sanitizeHtml(full);
}

function sanitizeHtml(text) {
  // 去掉可能的 markdown 包裹
  let t = text.trim();
  t = t.replace(/^```(?:html)?\s*/i, '').replace(/```\s*$/, '');
  if (!t.toLowerCase().includes('<!doctype')) {
    // 兜底包一层
    t = `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body>${t}</body></html>`;
  }
  return t;
}

// ---------- 渲染 ----------
function renderHistory() {
  const list = $('#history-list');
  list.innerHTML = state.apps.length === 0
    ? '<div class="text-xs text-slate-400 px-2 py-4">还没有应用，从首页输入一个吧</div>'
    : state.apps.slice().reverse().map(a => `
      <div data-id="${a.id}" class="hist-item group px-3 py-2 rounded-lg cursor-pointer text-sm relative ${a.id===state.currentId?'bg-teal-50 text-teal-700':'hover:bg-slate-100'}">
        <div class="truncate font-medium pr-5">${escapeHtml(a.title)}</div>
        <div class="text-xs text-slate-400 truncate">${escapeHtml(a.prompt)}</div>
        <button class="del-btn absolute top-1.5 right-1.5 opacity-0 group-hover:opacity-100 w-5 h-5 rounded text-slate-400 hover:text-red-500 hover:bg-red-50 text-xs leading-none" title="删除">×</button>
      </div>`).join('');
  list.querySelectorAll('.hist-item').forEach(el => {
    el.onclick = () => selectApp(el.dataset.id);
  });
  list.querySelectorAll('.del-btn').forEach(btn => {
    btn.onclick = (e) => {
      e.stopPropagation();
      const id = btn.closest('.hist-item').dataset.id;
      if (!confirm('删除这个应用？')) return;
      state.apps = state.apps.filter(a => a.id !== id);
      if (state.currentId === id) {
        state.currentId = null;
        $('#workspace').classList.add('hidden');
        $('#workspace').classList.remove('flex');
        $('#hero').classList.remove('hidden');
      }
      save();
      renderHistory();
    };
  });
}
function escapeHtml(s){return (s||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}

function renderHeroRecent() {
  const wrap = $('#hero-recent');
  const list = $('#hero-recent-list');
  if (!state.apps.length) { wrap.classList.add('hidden'); return; }
  wrap.classList.remove('hidden');
  list.innerHTML = state.apps.slice(-5).reverse().map(a => `
    <button data-id="${a.id}" class="recent-btn px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm hover:border-teal-400 hover:text-teal-700 transition max-w-[200px]">
      <div class="truncate font-medium">${escapeHtml(a.title)}</div>
    </button>`).join('');
  list.querySelectorAll('.recent-btn').forEach(b => {
    b.onclick = () => {
      // 直接进入工作区切到这个 app
      state.currentId = b.dataset.id;
      const app = currentApp();
      $('#hero').classList.add('hidden');
      $('#workspace').classList.remove('hidden');
      $('#workspace').classList.add('flex');
      $('#current-title').textContent = app.title;
      $('#preview-empty').style.display = 'none';
      $('#preview').srcdoc = app.html;
      renderHistory();
      renderChat();
    };
  });
}

function selectApp(id) {
  state.currentId = id;
  const app = currentApp();
  $('#current-title').textContent = app.title;
  $('#preview-empty').style.display = 'none';
  $('#preview').srcdoc = app.html;
  renderHistory();
  renderChat();
}

function renderChat() {
  const app = currentApp();
  if (!app) { $('#chat-stream').innerHTML = ''; return; }
  const versions = app.versions || [];
  if (state.viewVersionIdx === undefined || state.viewVersionIdx >= versions.length) {
    state.viewVersionIdx = versions.length - 1;
  }
  $('#chat-stream').innerHTML = versions.map((v, i) => `
    <div class="fade-in version-item cursor-pointer rounded-lg transition ${i===state.viewVersionIdx?'bg-teal-50 ring-1 ring-teal-200':'hover:bg-slate-50'}" data-idx="${i}">
      <div class="text-xs text-slate-400 mb-1 px-3 pt-2">版本 ${i+1} · ${new Date(v.ts).toLocaleTimeString()} ${i===versions.length-1?'· 最新':''}</div>
      <div class="px-3 pb-2 text-sm">${escapeHtml(v.prompt)}</div>
    </div>`).join('');
  $('#chat-stream').scrollTop = $('#chat-stream').scrollHeight;
  // 点版本切预览
  $('#chat-stream').querySelectorAll('.version-item').forEach(el => {
    el.onclick = () => {
      const idx = +el.dataset.idx;
      state.viewVersionIdx = idx;
      $('#preview').srcdoc = versions[idx].html;
      renderChat();
    };
  });
}

function showGeneratingMessage(prompt) {
  const stream = $('#chat-stream');
  const div = document.createElement('div');
  div.id = 'gen-status';
  div.className = 'fade-in';
  div.innerHTML = `
    <div class="text-xs text-slate-400 mb-1">正在生成</div>
    <div class="bg-teal-50 border border-teal-100 rounded-xl p-3 shadow-sm text-sm">
      <div class="text-slate-700 mb-2">${escapeHtml(prompt)}</div>
      <div class="flex items-center gap-2 text-xs text-teal-700">
        <div class="w-3 h-3 border-2 border-teal-500 border-t-transparent rounded-full animate-spin"></div>
        <span id="gen-status-text">正在理解需求…</span>
      </div>
    </div>`;
  stream.appendChild(div);
  stream.scrollTop = stream.scrollHeight;
}
function updateGeneratingMessage(len) {
  const el = $('#gen-status-text');
  if (!el) return;
  if (len < 200) el.textContent = '正在理解需求…';
  else if (len < 1500) el.textContent = '正在生成页面结构…';
  else el.textContent = `正在完善样式与交互…（${len} 字符）`;
  $('#chat-stream').scrollTop = $('#chat-stream').scrollHeight;
}

// ---------- 生成流程 ----------
async function generate(prompt, prevHtml, forceRace) {
  if (state.streaming) return;
  state.streaming = true;
  $('#hero-generate').disabled = true;
  $('#iter-send').disabled = true;

  // 首次创建走赛马（若开关开着）；后续迭代默认单路，除非手动 forceRace
  const isNew = !currentApp();
  const useRace = forceRace === true || (isNew && state.race);
  try {
    if (!currentApp()) {
      // 新建
      const app = {
        id: uid(), title: prompt.slice(0, 20), prompt, html: '', versions: [],
        createdAt: Date.now()
      };
      state.apps.push(app);
      state.currentId = app.id;
      $('#hero').classList.add('hidden');
      $('#workspace').classList.remove('hidden');
      $('#workspace').classList.add('flex');
    }
    const app = currentApp();
    renderHistory();
    $('#preview-empty').style.display = 'none';

    // 在中间对话区插一条"正在生成"的状态消息
    showGeneratingMessage(prompt);

    if (useRace) {
      // 赛马：并行两个
      $('#race-preview').classList.remove('hidden');
      $('#preview').classList.add('hidden');
      const [a, b] = await Promise.all([
        callModel(prompt, prevHtml, ()=>{}),
        callModel(prompt, prevHtml, ()=>{}),
      ]);
      $('#race-a').srcdoc = a;
      $('#race-b').srcdoc = b;
      $('#pick-modal').classList.remove('hidden');
      state.raceHtml = { a, b };
      state.racePrompt = prompt;   // 暂存原始 prompt，选完后写进版本历史
      state.racePrevHtml = prevHtml;
      // 等用户选
      state.streaming = false;
      return;
    }

    // 单路：流式渲染（预览区显示加载动画，完成后一次性渲染，避免 iframe 闪烁）
    $('#race-preview').classList.add('hidden');
    $('#preview').classList.remove('hidden');
    $('#generating').classList.remove('hidden');
    const html = await callModel(prompt, prevHtml, (partial) => {
      $('#gen-progress').textContent = partial.length + ' 字符';
      updateGeneratingMessage(partial.length);
    });
    $('#generating').classList.add('hidden');
    commitVersion(app, prompt, html);
  } catch (e) {
    $('#generating').classList.add('hidden');
    alert('生成失败：' + e.message);
  } finally {
    state.streaming = false;
    $('#hero-generate').disabled = false;
    $('#iter-send').disabled = false;
  }
}

function commitVersion(app, prompt, html) {
  app.html = html;
  app.versions.push({ prompt, html, ts: Date.now() });
  state.viewVersionIdx = app.versions.length - 1;
  if (app.versions.length === 1) app.title = prompt.slice(0, 20);
  save();
  $('#current-title').textContent = app.title;
  $('#preview').srcdoc = html;
  renderHistory();
  renderChat();
}

// ---------- 事件绑定 ----------
function bind() {
  // Hero 生成
  $('#hero-generate').onclick = () => {
    const v = $('#hero-input').value.trim();
    if (!v) return;
    generate(v, null);
  };
  $('#hero-input').addEventListener('keydown', e => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) $('#hero-generate').click();
  });
  document.querySelectorAll('.chip').forEach(c => {
    c.onclick = () => { $('#hero-input').value = c.textContent; $('#hero-generate').click(); };
  });

  // 迭代
  $('#iter-send').onclick = () => {
    const v = $('#iter-input').value.trim();
    if (!v || !currentApp()) return;
    $('#iter-input').value = '';
    // 基于用户当前选中的那个版本改，不是最新那个
    const app = currentApp();
    const baseHtml = (app.versions[state.viewVersionIdx] || {}).html || app.html;
    generate(v, baseHtml);
  };
  $('#iter-input').addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); $('#iter-send').click(); }
  });

  // 预览控制
  $('#preview-refresh').onclick = () => { if (currentApp()) $('#preview').srcdoc = currentApp().html; };
  $('#btn-race-again').onclick = () => {
    const app = currentApp();
    if (!app || state.streaming) return;
    const lastPrompt = app.versions.length ? app.versions[app.versions.length - 1].prompt : app.prompt;
    // 用当前最新 html 作为基础，重新跑两个对比版
    generate(lastPrompt, app.html, true);
  };
  $('#preview-newtab').onclick = () => {
    if (!currentApp()) return;
    const w = window.open('', '_blank');
    w.document.write(currentApp().html);
    w.document.close();
  };
  $('#btn-export').onclick = () => {
    if (!currentApp()) return;
    const blob = new Blob([currentApp().html], { type: 'text/html' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = currentApp().title + '.html';
    a.click();
  };

  // 返回首页
  $('#back-home').onclick = () => {
    $('#workspace').classList.add('hidden');
    $('#workspace').classList.remove('flex');
    $('#hero').classList.remove('hidden');
    state.currentId = null;
    renderHistory();
    renderHeroRecent();
  };

  // 设置
  $('#btn-settings').onclick = () => {
    $('#api-key').value = getKey();
    $('#settings-modal').classList.remove('hidden');
  };
  $('#settings-cancel').onclick = () => $('#settings-modal').classList.add('hidden');
  $('#settings-save').onclick = () => {
    localStorage.setItem(KEY_LS, $('#api-key').value.trim());
    $('#settings-modal').classList.add('hidden');
  };

  // 赛马选择
  $('#pick-a').onclick = () => pickRace('a');
  $('#pick-b').onclick = () => pickRace('b');
}
function pickRace(which) {
  const app = currentApp();
  const html = state.raceHtml[which];
  const prompt = state.racePrompt || ('赛马版本 ' + which.toUpperCase());
  $('#pick-modal').classList.add('hidden');
  $('#race-preview').classList.add('hidden');
  $('#preview').classList.remove('hidden');
  commitVersion(app, prompt, html);
}

// ---------- 启动 ----------
load();
bind();
renderHistory();
renderHeroRecent();
