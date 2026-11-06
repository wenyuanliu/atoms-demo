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
.overlay{position:absolute;inset:0;background:rgba(15,23,42,.92);display:none;flex-direction:column;align-items:center;justify-content:center;z-index:10}
.overlay h1{font-size:36px;color:#ef4444;margin:0 0 8px}.overlay p{font-size:18px;margin:0 0 20px}
.overlay button{padding:10px 28px;background:#22c55e;color:#0f172a;border:none;border-radius:999px;font-size:15px;font-weight:700;cursor:pointer}
</style></head><body><div class="bar">得分: <span id="s">0</span></div><canvas id="c" width="400" height="400"></canvas><div class="bar">方向键控制 · 空格暂停</div>
<div class="overlay" id="ov"><h1>GAME OVER</h1><p>得分：<span id="fs">0</span></p><button onclick="resetGame()">重新开始</button></div>
<script>
const cv=document.getElementById('c'),ctx=cv.getContext('2d');let s,d,food,score,pause,t;
function rand(){return{x:Math.floor(Math.random()*20),y:Math.floor(Math.random()*20)}}
function resetGame(){clearInterval(t);s=[{x:10,y:10}];d={x:1,y:0};food=rand();score=0;pause=false;document.getElementById('s').textContent=0;document.getElementById('ov').style.display='none';t=setInterval(loop,200);}
document.onkeydown=e=>{if(e.key==' '){pause=!pause;return}
if(e.key=='ArrowUp'&&d.y!=1)d={x:0,y:-1};if(e.key=='ArrowDown'&&d.y!=-1)d={x:0,y:1};
if(e.key=='ArrowLeft'&&d.x!=1)d={x:-1,y:0};if(e.key=='ArrowRight'&&d.x!=-1)d={x:1,y:0};};
function loop(){if(pause)return;const h={x:s[0].x+d.x,y:s[0].y+d.y};
if(h.x<0||h.x>=20||h.y<0||h.y>=20||s.some(p=>p.x==h.x&&p.y==h.y)){clearInterval(t);document.getElementById('fs').textContent=score;document.getElementById('ov').style.display='flex';return}
s.unshift(h);if(h.x==food.x&&h.y==food.y){score++;document.getElementById('s').textContent=score;food=rand()}else s.pop();
ctx.fillStyle='#1e293b';ctx.fillRect(0,0,400,400);ctx.fillStyle='#22c55e';s.forEach(p=>ctx.fillRect(p.x*20,p.y*20,19,19));
ctx.fillStyle='#ef4444';ctx.fillRect(food.x*20,food.y*20,19,19);}
resetGame();<\/script></body></html>`
  },
  {
    match: /咖啡|落地页|landing|菜单|预约|咖啡店/,
    title: '咖啡店落地页',
    html: `<DOCTYPE html><html><head><meta charset="utf-8"><style>
*{box-sizing:border-box;margin:0;padding:0}body{font-family:-apple-system,sans-serif;color:#3f2305}
.hero{background:linear-gradient(135deg,#3f2305,#6b3410);color:#fff;padding:80px 24px;text-align:center}
.hero h1{font-size:42px;margin-bottom:12px}.hero p{opacity:.85}
.menu{max-width:800px;margin:40px auto;padding:0 24px}
.menu h2{font-size:24px;margin-bottom:20px}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:16px}
.item{background:#fff;border-radius:12px;padding:20px;box-shadow:0 2px 10px rgba(0,0,0,.06);cursor:pointer;transition:transform .15s,box-shadow .15s}
.item:hover{transform:translateY(-3px);box-shadow:0 6px 20px rgba(0,0,0,.12)}
.item .name{font-weight:600;margin-bottom:4px}.item .price{color:#92400e;font-weight:700}
.item .add{font-size:12px;color:#0d9488;margin-top:8px;display:none}
.item:hover .add{display:inline}
.info{max-width:800px;margin:0 auto 40px;padding:0 24px;display:grid;grid-template-columns:1fr 1fr;gap:16px}
.info .card{background:#fef3c7;border-radius:12px;padding:20px}
.info h3{font-size:15px;margin-bottom:8px}
.info p{font-size:13px;color:#78350f;line-height:1.7}
.cta{text-align:center;padding:60px 24px;background:#fef3c7}
.cta button{padding:14px 32px;background:#3f2305;color:#fff;border:none;border-radius:999px;font-size:16px;cursor:pointer}
.cart{position:fixed;bottom:20px;right:20px;background:#0d9488;color:#fff;border-radius:999px;padding:12px 20px;box-shadow:0 4px 16px rgba(0,0,0,.2);cursor:pointer;font-size:14px}
</style></head><body>
<div class="hero"><h1>☕ 山间咖啡</h1><p>手冲 · 慢生活 · 从一杯开始</p></div>
<div class="menu"><h2>今日菜单</h2><div class="grid">
<div class="item" onclick="addCart('美式',28)"><div class="name">美式</div><div class="price">¥28</div><div class="add">+ 加入</div></div>
<div class="item" onclick="addCart('拿铁',32)"><div class="name">拿铁</div><div class="price">¥32</div><div class="add">+ 加入</div></div>
<div class="item" onclick="addCart('燕麦拿铁',36)"><div class="name">燕麦拿铁</div><div class="price">¥36</div><div class="add">+ 加入</div></div>
<div class="item" onclick="addCart('手冲耶加雪菲',48)"><div class="name">手冲耶加雪菲</div><div class="price">¥48</div><div class="add">+ 加入</div></div>
<div class="item" onclick="addCart('提拉米苏',38)"><div class="name">提拉米苏</div><div class="price">¥38</div><div class="add">+ 加入</div></div>
<div class="item" onclick="addCart('可颂',22)"><div class="name">可颂</div><div class="price">¥22</div><div class="add">+ 加入</div></div>
</div></div>
<div class="info">
<div class="card"><h3>🕐 营业时间</h3><p>周一至周五 8:00 - 20:00<br>周六周日 9:00 - 22:00<br>节假日不打烊</p></div>
<div class="card"><h3>📍 地址</h3><p>深圳南山区华侨城创意园<br>香山村 12 栋 101<br>近地铁侨城东站 B 口</p></div>
</div>
<div class="cta"><h2 style="margin-bottom:16px">周末约个咖啡？</h2><button onclick="alert('预约成功！我们会提前为你准备好座位')">立即预约</button></div>
<div class="cart" id="cart" onclick="alert('购物车：\\n'+(window.__cart||[]).map(i=>i.name+' ¥'+i.price).join('\\n')||'还是空的')">🛒 购物车（0）</div>
<script>
window.__cart=[];
function addCart(name,price){window.__cart.push({name,price});document.getElementById('cart').textContent='🛒 购物车（'+window.__cart.length+'）';}
<\/script></body></html>`
  }
];

function mockGenerate(prompt, variant) {
  // 简单延迟模拟流式
  const tpl = MOCK_TEMPLATES.find(t => t.match.test(prompt));
  let html = tpl ? tpl.html : defaultMockHtml(prompt);
  // 赛马 B 版本：注入深色主题覆盖样式，和 A 拉开差异
  if (variant === 'b') {
    html = html.replace('</head>', `<style>
      body{background:#0f172a !important;color:#e2e8f0 !important}
      .card,.item,.stat,.list,.col,.box,.menu .grid .item{background:#1e293b !important;color:#e2e8f0 !important}
      h1,h2,h3,.name,.big{color:#f1f5f9 !important}
      .price,.num,.row{color:#94a3b8 !important}
      .cat,.badge{background:#334155 !important;color:#e2e8f0 !important}
      input,select{background:#0f172a !important;color:#e2e8f0 !important;border-color:#334155 !important}
      .q,.steps{background:#1e293b !important;border-left-color:#818cf8 !important}
      .hero{background:linear-gradient(135deg,#1e1b4b,#312e81) !important}
    </style></head>`);
  }
  return { title: tpl ? tpl.title + (variant === 'b' ? '（深色版）' : '') : '演示模式', html };
}
function defaultMockHtml(prompt) {
  return `<DOCTYPE html><html><head><meta charset="utf-8"><style>
*{box-sizing:border-box;margin:0;padding:0}body{font-family:-apple-system,sans-serif;background:#f0fdfa;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px;color:#134e4a}
.box{max-width:520px;width:100%;background:#fff;border-radius:20px;padding:40px;box-shadow:0 10px 40px rgba(13,148,136,.1)}
.icon{font-size:48px;margin-bottom:16px}
h1{font-size:22px;margin-bottom:12px}
p{color:#475569;line-height:1.7;margin-bottom:12px;font-size:14px}
.q{background:#f0fdfa;border-left:3px solid #0d9488;padding:12px 16px;border-radius:8px;margin:16px 0;font-size:14px}
.steps{background:#f8fafc;border-radius:10px;padding:16px;margin-top:20px;font-size:13px;color:#475569}
.steps b{color:#0d9488}
.badge{display:inline-block;padding:4px 12px;background:#ccfbf1;color:#0d9488;border-radius:999px;font-size:12px;margin-bottom:16px}
</style></head><body><div class="box"><div class="icon">⚡</div><div class="badge">演示模式</div><h1>这是一个演示占位页</h1><div class="q">你的需求："${prompt.replace(/</g,'&lt;')}"</div><p>当前未配置 AI API Key，所以这里展示的是一个示例占位页。</p><p>配上 Key 后，你输入的任何需求都会被 AI 真的生成成可运行的网页应用。</p><div class="steps">配置方法：点右上角 <b>⚙ 设置</b> → 填入 DeepSeek API Key（<a href="https://platform.deepseek.com" target="_blank">platform.deepseek.com</a> 免费注册）→ 回到这里重新输入需求即可。</div></div></body></html>`;
}

// ---------- DeepSeek 调用（流式） ----------
async function callModel(prompt, prevHtml, onToken, variant) {
  const key = getKey();
  if (!key) {
    // Mock：逐字吐
    const { html } = mockGenerate(prompt, variant);
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
        callModel(prompt, prevHtml, ()=>{}, 'a'),
        callModel(prompt, prevHtml, ()=>{}, 'b'),
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
    const blob = new Blob([currentApp().html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
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
