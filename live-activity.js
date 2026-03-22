// ========== LIVE ACTIVITY — FOMO ENGINE ==========
// Hiển thị hoạt động realtime: người dùng online, mua VIP, dùng AI...
// Inject vào mọi trang — tự động ping + hiện toast FOMO
(function () {
'use strict';

const API = window.API_BASE || (location.hostname === 'localhost' ? 'http://localhost:3001/api' : '/api');
const PAGE = location.pathname.replace(/^\//, '') || 'index';

// Session ID duy nhất cho tab này
let sessionId = sessionStorage.getItem('_la_sid');
if (!sessionId) { sessionId = Math.random().toString(36).slice(2) + Date.now().toString(36); sessionStorage.setItem('_la_sid', sessionId); }

// ===== CSS =====
const css = `
#la-bar {
  position:fixed; top:0; left:0; right:0; z-index:9970;
  display:flex; align-items:center; justify-content:center; gap:1.5rem;
  padding:.45rem 1rem;
  background:linear-gradient(90deg,rgba(102,126,234,.95),rgba(118,75,162,.95));
  backdrop-filter:blur(12px);
  box-shadow:0 2px 16px rgba(102,126,234,.3);
  transform:translateY(-100%); transition:transform .4s cubic-bezier(0.4,0,0.2,1);
  font-size:.78rem; color:#fff; font-weight:600;
  pointer-events:none;
}
#la-bar.show { transform:translateY(0); pointer-events:all; }
.la-stat { display:flex; align-items:center; gap:.4rem; white-space:nowrap; }
.la-dot { width:7px; height:7px; border-radius:50%; background:#4ade80; animation:laPulse 1.5s ease-in-out infinite; flex-shrink:0; }
.la-dot.red { background:#f87171; }
.la-dot.yellow { background:#fbbf24; }
@keyframes laPulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.6;transform:scale(1.4)} }
#la-bar-close { background:rgba(255,255,255,.15); border:none; color:#fff; width:20px; height:20px; border-radius:50%; cursor:pointer; font-size:.65rem; display:flex; align-items:center; justify-content:center; margin-left:.5rem; flex-shrink:0; pointer-events:all; }
#la-bar-close:hover { background:rgba(255,255,255,.3); }

/* FOMO Toast */
#la-toast-wrap {
  position:fixed; bottom:80px; left:20px; z-index:9969;
  display:flex; flex-direction:column; gap:.5rem;
  pointer-events:none;
}
.la-toast {
  display:flex; align-items:center; gap:.65rem;
  background:#fff; border-radius:14px;
  padding:.6rem .9rem;
  box-shadow:0 8px 28px rgba(0,0,0,.14), 0 0 0 1px rgba(102,126,234,.08);
  font-size:.8rem; color:#1a1a2e; font-weight:600;
  max-width:280px; pointer-events:all;
  animation:laToastIn .4s cubic-bezier(0.4,0,0.2,1) forwards;
  border-left:3px solid #667eea;
}
html[data-theme="dark"] .la-toast { background:#1e1e3a; color:#e8e8ff; box-shadow:0 8px 28px rgba(0,0,0,.4); }
.la-toast.vip  { border-left-color:#f59e0b; }
.la-toast.ai   { border-left-color:#667eea; }
.la-toast.game { border-left-color:#10b981; }
.la-toast.join { border-left-color:#3b82f6; }
.la-toast.review { border-left-color:#f5576c; }
.la-toast-icon { font-size:1.3rem; flex-shrink:0; }
.la-toast-body { flex:1; min-width:0; }
.la-toast-msg  { line-height:1.35; }
.la-toast-time { font-size:.65rem; color:#aaa; font-weight:400; margin-top:.1rem; }
.la-toast.out  { animation:laToastOut .35s ease forwards; }
@keyframes laToastIn  { from{opacity:0;transform:translateX(-24px)} to{opacity:1;transform:translateX(0)} }
@keyframes laToastOut { from{opacity:1;transform:translateX(0)} to{opacity:0;transform:translateX(-24px)} }

/* Counter badge trên nav */
#la-online-badge {
  display:inline-flex; align-items:center; gap:.3rem;
  background:rgba(74,222,128,.15); color:#16a34a;
  border-radius:50px; padding:.15rem .55rem; font-size:.68rem; font-weight:700;
  border:1px solid rgba(74,222,128,.3);
}
html[data-theme="dark"] #la-online-badge { background:rgba(74,222,128,.1); color:#4ade80; }

@media(max-width:600px) {
  #la-bar { font-size:.7rem; gap:.75rem; padding:.4rem .75rem; }
  .la-toast { max-width:calc(100vw - 48px); }
  #la-toast-wrap { left:12px; bottom:72px; }
}
`;
const styleEl = document.createElement('style');
styleEl.textContent = css;
document.head.appendChild(styleEl);

// ===== TOP BAR =====
const bar = document.createElement('div');
bar.id = 'la-bar';
bar.innerHTML = `
  <div class="la-stat"><div class="la-dot"></div><span id="la-online-count">...</span> người đang online</div>
  <div class="la-stat"><div class="la-dot yellow"></div><span id="la-ai-count">...</span> lượt AI hôm nay</div>
  <div class="la-stat"><div class="la-dot red"></div><span id="la-vip-count">...</span> VIP mới hôm nay</div>
  <button id="la-bar-close" aria-label="Đóng">✕</button>
`;
document.body.appendChild(bar);

// ===== TOAST WRAP =====
const toastWrap = document.createElement('div');
toastWrap.id = 'la-toast-wrap';
document.body.appendChild(toastWrap);

// ===== CLOSE BAR =====
document.getElementById('la-bar-close').onclick = () => {
  bar.classList.remove('show');
  sessionStorage.setItem('_la_bar_closed', '1');
};

// ===== FOMO MESSAGES — fallback khi ít data thật =====
const FOMO_POOL = [
  { type:'vip',    icon:'💎', msgs:['Ai đó vừa nâng cấp VIP!','Thành viên mới vừa mua VIP 99k','1 người vừa trở thành VIP Member'] },
  { type:'ai',     icon:'🤖', msgs:['Ai đó vừa dùng AI Code Review','GPT-4 vừa review code cho 1 user','Ai đó vừa tạo CV bằng AI'] },
  { type:'game',   icon:'🎮', msgs:['Ai đó vừa đạt top 3 Snake!','1 người vừa kiếm 50 coin từ Arcade','Kỷ lục mới vừa được lập!'] },
  { type:'join',   icon:'👋', msgs:['Thành viên mới vừa đăng ký','1 người vừa tham gia cộng đồng','Ai đó vừa đăng nhập lần đầu'] },
  { type:'review', icon:'⭐', msgs:['Ai đó vừa để lại đánh giá 5⭐','Review mới vừa được gửi','1 người vừa đánh giá dịch vụ'] },
];

const TYPE_ICONS = { vip:'💎', ai:'🤖', game:'🎮', join:'👋', review:'⭐' };

let shownEvents = new Set();
let toastQueue = [];
let isShowingToast = false;

// ===== SHOW TOAST =====
function showToastFomo(type, msg, timeAgo) {
  const icon = TYPE_ICONS[type] || '🔔';
  const toast = document.createElement('div');
  toast.className = `la-toast ${type}`;
  toast.innerHTML = `
    <div class="la-toast-icon">${icon}</div>
    <div class="la-toast-body">
      <div class="la-toast-msg">${escHtml(msg)}</div>
      <div class="la-toast-time">${timeAgo || 'vừa xong'}</div>
    </div>`;
  toastWrap.appendChild(toast);

  // Auto remove sau 4.5s
  setTimeout(() => {
    toast.classList.add('out');
    setTimeout(() => toast.remove(), 400);
  }, 4500);
}

function escHtml(s) {
  return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

function timeAgoShort(ts) {
  const diff = (Date.now() - ts) / 1000;
  if (diff < 60) return 'vừa xong';
  if (diff < 3600) return Math.floor(diff/60) + ' phút trước';
  return Math.floor(diff/3600) + ' giờ trước';
}

// ===== QUEUE SYSTEM — không spam =====
function queueToast(type, msg, ts) {
  toastQueue.push({ type, msg, ts });
}

function processQueue() {
  if (!toastQueue.length) return;
  const item = toastQueue.shift();
  showToastFomo(item.type, item.msg, timeAgoShort(item.ts || Date.now()));
}

// Hiện toast mỗi 6 giây
setInterval(processQueue, 6000);

// ===== FETCH LIVE STATS =====
async function fetchStats() {
  try {
    const r = await fetch(`${API}/live/stats`);
    if (!r.ok) return;
    const d = await r.json();

    // Cập nhật top bar
    const onlineEl = document.getElementById('la-online-count');
    const aiEl = document.getElementById('la-ai-count');
    const vipEl = document.getElementById('la-vip-count');

    // Thêm chút noise để trông tự nhiên hơn (±2)
    const noise = () => Math.floor(Math.random() * 3);
    const online = Math.max(1, (d.activeCount || 0) + noise());
    if (onlineEl) onlineEl.textContent = online;
    if (aiEl) aiEl.textContent = (d.aiToday || 0) + noise();
    if (vipEl) vipEl.textContent = d.vipToday || 0;

    // Hiện bar nếu chưa đóng
    if (!sessionStorage.getItem('_la_bar_closed')) {
      bar.classList.add('show');
    }

    // Queue real events từ server
    if (d.recentEvents?.length) {
      d.recentEvents.forEach(ev => {
        const key = ev.type + ev.msg + ev.ts;
        if (!shownEvents.has(key)) {
          shownEvents.add(key);
          queueToast(ev.type, ev.msg, ev.ts);
        }
      });
    }
  } catch(e) {}
}

// ===== FOMO FALLBACK — khi ít event thật =====
function triggerFomoFallback() {
  // Chỉ chạy nếu queue trống
  if (toastQueue.length > 0) return;
  const pool = FOMO_POOL[Math.floor(Math.random() * FOMO_POOL.length)];
  const msg = pool.msgs[Math.floor(Math.random() * pool.msgs.length)];
  // Fake timestamp trong 10 phút gần đây
  const fakeTs = Date.now() - Math.floor(Math.random() * 10 * 60 * 1000);
  queueToast(pool.type, msg, fakeTs);
}

// ===== PING SERVER =====
async function ping() {
  try {
    await fetch(`${API}/live/ping`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId, page: PAGE })
    });
  } catch(e) {}
}

// ===== PUSH EVENT (gọi từ ngoài) =====
window.laEvent = async function(type, msg) {
  try {
    await fetch(`${API}/live/event`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, msg })
    });
  } catch(e) {}
};

// ===== INIT =====
// Ping ngay + mỗi 30s
ping();
setInterval(ping, 30000);

// Fetch stats ngay sau 1.5s + mỗi 20s
setTimeout(fetchStats, 1500);
setInterval(fetchStats, 20000);

// FOMO fallback mỗi 18s (nếu queue trống)
setTimeout(() => {
  triggerFomoFallback(); // lần đầu sau 8s
  setInterval(triggerFomoFallback, 18000);
}, 8000);

// Pause khi tab ẩn
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) { ping(); fetchStats(); }
});

})();
