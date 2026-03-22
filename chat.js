// ========== COMMUNITY CHAT WIDGET ==========
// Floating chat chung — inject vào mọi trang
// v1 — polling 3s, emoji reactions, reply, rooms

(function () {
'use strict';

const API = window.API_BASE || (location.hostname === 'localhost' ? 'http://localhost:3001/api' : '/api');
const ROOMS = [
  { id: 'general', label: '💬 Chung' },
  { id: 'tools',   label: '🤖 AI Tools' },
  { id: 'arcade',  label: '🎮 Arcade' },
  { id: 'vip',     label: '👑 VIP' },
];
const EMOJIS = ['👍','❤️','😂','🔥','👏','😮'];
const MAX_MSGS = 80;

let currentRoom = 'general';
let lastId = 0;
let pollTimer = null;
let isOpen = false;
let replyTo = null;
let unread = 0;
let allMessages = [];

// ===== CSS =====
const css = `
#cw-fab {
  position:fixed; bottom:20px; right:20px; z-index:9980;
  width:52px; height:52px; border-radius:50%;
  background:linear-gradient(135deg,#667eea,#764ba2);
  border:none; color:#fff; font-size:1.3rem; cursor:pointer;
  box-shadow:0 6px 24px rgba(102,126,234,.5);
  display:flex; align-items:center; justify-content:center;
  transition:transform .25s; animation:cwPulse 4s ease-in-out infinite;
}
#cw-fab:hover { transform:scale(1.1); }
#cw-fab.open { animation:none; background:linear-gradient(135deg,#f5576c,#c0392b); }
@keyframes cwPulse {
  0%,100%{box-shadow:0 6px 24px rgba(102,126,234,.5)}
  50%{box-shadow:0 6px 32px rgba(118,75,162,.75)}
}
#cw-badge {
  position:absolute; top:-3px; right:-3px;
  background:#f5576c; color:#fff; border-radius:50%;
  width:20px; height:20px; font-size:.65rem; font-weight:900;
  display:flex; align-items:center; justify-content:center;
  border:2px solid #fff; display:none;
}
#cw-box {
  position:fixed; bottom:82px; right:20px; z-index:9979;
  width:360px; max-width:calc(100vw - 32px);
  height:520px; max-height:calc(100vh - 100px);
  background:#fff; border-radius:20px;
  box-shadow:0 24px 64px rgba(0,0,0,.18), 0 0 0 1px rgba(102,126,234,.1);
  display:flex; flex-direction:column; overflow:hidden;
  transform:scale(.85) translateY(20px); opacity:0; pointer-events:none;
  transition:transform .3s cubic-bezier(0.4,0,0.2,1), opacity .3s;
  transform-origin:bottom right;
}
html[data-theme="dark"] #cw-box { background:#1a1a2e; box-shadow:0 24px 64px rgba(0,0,0,.5),0 0 0 1px rgba(102,126,234,.2); }
#cw-box.open { transform:scale(1) translateY(0); opacity:1; pointer-events:all; }
#cw-head {
  background:linear-gradient(135deg,#667eea,#764ba2);
  padding:.75rem 1rem; display:flex; align-items:center; gap:.6rem; flex-shrink:0;
}
#cw-head-title { color:#fff; font-weight:800; font-size:.9rem; flex:1; }
#cw-online { color:rgba(255,255,255,.8); font-size:.72rem; }
#cw-close { background:rgba(255,255,255,.15); border:none; color:#fff;
  width:28px; height:28px; border-radius:50%; cursor:pointer; font-size:.85rem;
  display:flex; align-items:center; justify-content:center; transition:background .2s; flex-shrink:0; }
#cw-close:hover { background:rgba(255,255,255,.3); }
#cw-rooms {
  display:flex; gap:0; border-bottom:1px solid rgba(0,0,0,.07); flex-shrink:0;
  overflow-x:auto; scrollbar-width:none;
}
#cw-rooms::-webkit-scrollbar { display:none; }
.cw-room-btn {
  flex-shrink:0; padding:.45rem .75rem; border:none; background:none;
  font-size:.72rem; font-weight:700; color:#888; cursor:pointer;
  border-bottom:2px solid transparent; transition:all .2s; white-space:nowrap;
}
.cw-room-btn.active { color:#667eea; border-bottom-color:#667eea; }
.cw-room-btn:hover { color:#667eea; background:rgba(102,126,234,.05); }
html[data-theme="dark"] .cw-room-btn { color:#aaa; }
html[data-theme="dark"] .cw-room-btn.active { color:#a78bfa; border-bottom-color:#a78bfa; }
#cw-msgs {
  flex:1; overflow-y:auto; padding:.75rem; display:flex; flex-direction:column; gap:.5rem;
  scroll-behavior:smooth;
}
#cw-msgs::-webkit-scrollbar { width:4px; }
#cw-msgs::-webkit-scrollbar-thumb { background:rgba(102,126,234,.3); border-radius:4px; }
.cw-msg { display:flex; gap:.5rem; align-items:flex-start; }
.cw-msg.own { flex-direction:row-reverse; }
.cw-avatar {
  width:30px; height:30px; border-radius:50%; flex-shrink:0;
  background:linear-gradient(135deg,#667eea,#764ba2);
  display:flex; align-items:center; justify-content:center;
  color:#fff; font-size:.75rem; font-weight:800; overflow:hidden;
}
.cw-avatar img { width:100%; height:100%; object-fit:cover; }
.cw-bubble-wrap { max-width:75%; display:flex; flex-direction:column; gap:.15rem; }
.cw-msg.own .cw-bubble-wrap { align-items:flex-end; }
.cw-meta { font-size:.65rem; color:#aaa; display:flex; align-items:center; gap:.35rem; }
.cw-name { font-weight:700; color:#667eea; }
html[data-theme="dark"] .cw-name { color:#a78bfa; }
.cw-vip-badge { background:linear-gradient(135deg,#f59e0b,#d97706); color:#fff;
  font-size:.55rem; font-weight:900; padding:1px 5px; border-radius:50px; }
.cw-bubble {
  background:#f0f2ff; color:#1a1a2e; padding:.5rem .75rem;
  border-radius:14px 14px 14px 4px; font-size:.82rem; line-height:1.5;
  word-break:break-word; position:relative; cursor:pointer;
}
.cw-msg.own .cw-bubble {
  background:linear-gradient(135deg,#667eea,#764ba2); color:#fff;
  border-radius:14px 14px 4px 14px;
}
html[data-theme="dark"] .cw-bubble { background:#2a2a4a; color:#e8e8ff; }
.cw-reply-preview {
  font-size:.68rem; color:#888; border-left:2px solid #667eea;
  padding:.2rem .5rem; margin-bottom:.25rem; border-radius:0 6px 6px 0;
  background:rgba(102,126,234,.07);
}
.cw-reactions {
  display:flex; flex-wrap:wrap; gap:.2rem; margin-top:.2rem;
}
.cw-react-btn {
  background:rgba(0,0,0,.06); border:none; border-radius:50px;
  padding:1px 6px; font-size:.72rem; cursor:pointer; transition:transform .15s;
  display:flex; align-items:center; gap:2px;
}
.cw-react-btn:hover { transform:scale(1.15); background:rgba(102,126,234,.12); }
html[data-theme="dark"] .cw-react-btn { background:rgba(255,255,255,.08); }
.cw-emoji-picker {
  position:absolute; bottom:calc(100% + 4px); left:0;
  background:#fff; border-radius:12px; padding:.35rem .5rem;
  box-shadow:0 8px 24px rgba(0,0,0,.15); display:flex; gap:.3rem; z-index:10;
}
html[data-theme="dark"] .cw-emoji-picker { background:#2a2a4a; }
.cw-emoji-opt { background:none; border:none; font-size:1.1rem; cursor:pointer;
  padding:.15rem; border-radius:6px; transition:transform .15s; }
.cw-emoji-opt:hover { transform:scale(1.25); background:rgba(102,126,234,.1); }
#cw-reply-bar {
  padding:.4rem .75rem; background:rgba(102,126,234,.07);
  border-top:1px solid rgba(102,126,234,.1); font-size:.72rem; color:#667eea;
  display:none; align-items:center; justify-content:space-between; flex-shrink:0;
}
#cw-reply-bar.show { display:flex; }
#cw-reply-cancel { background:none; border:none; color:#f5576c; cursor:pointer; font-size:.8rem; }
#cw-input-area {
  padding:.6rem .75rem; border-top:1px solid rgba(0,0,0,.07); display:flex;
  gap:.5rem; align-items:flex-end; flex-shrink:0;
}
html[data-theme="dark"] #cw-input-area { border-color:rgba(255,255,255,.07); }
#cw-input {
  flex:1; border:1.5px solid rgba(102,126,234,.2); border-radius:12px;
  padding:.45rem .7rem; font-size:.82rem; resize:none; outline:none;
  background:#f8f9ff; color:#1a1a2e; max-height:80px; min-height:36px;
  font-family:inherit; transition:border-color .2s;
}
#cw-input:focus { border-color:#667eea; }
html[data-theme="dark"] #cw-input { background:#2a2a4a; color:#e8e8ff; border-color:rgba(102,126,234,.3); }
#cw-send {
  width:36px; height:36px; border-radius:50%; flex-shrink:0;
  background:linear-gradient(135deg,#667eea,#764ba2);
  border:none; color:#fff; cursor:pointer; font-size:.9rem;
  display:flex; align-items:center; justify-content:center;
  transition:transform .2s, opacity .2s;
}
#cw-send:hover { transform:scale(1.1); }
#cw-send:disabled { opacity:.4; cursor:not-allowed; transform:none; }
#cw-guest-bar {
  padding:.5rem .75rem; background:rgba(245,87,108,.06);
  border-top:1px solid rgba(245,87,108,.1); font-size:.72rem;
  color:#888; display:flex; align-items:center; gap:.5rem; flex-shrink:0;
}
#cw-guest-name {
  flex:1; border:1px solid rgba(0,0,0,.12); border-radius:8px;
  padding:.3rem .6rem; font-size:.75rem; outline:none; background:#fff;
  color:#1a1a2e;
}
html[data-theme="dark"] #cw-guest-name { background:#2a2a4a; color:#e8e8ff; border-color:rgba(255,255,255,.1); }
.cw-day-sep {
  text-align:center; font-size:.65rem; color:#bbb; margin:.25rem 0;
  display:flex; align-items:center; gap:.5rem;
}
.cw-day-sep::before,.cw-day-sep::after { content:''; flex:1; height:1px; background:rgba(0,0,0,.07); }
html[data-theme="dark"] .cw-day-sep::before,html[data-theme="dark"] .cw-day-sep::after { background:rgba(255,255,255,.07); }
.cw-typing { font-size:.72rem; color:#aaa; padding:.2rem .5rem; font-style:italic; }
@media(max-width:480px){
  #cw-box { width:calc(100vw - 16px); right:8px; bottom:72px; height:calc(100vh - 90px); }
  #cw-fab { bottom:12px; right:12px; }
}
`;

const styleEl = document.createElement('style');
styleEl.textContent = css;
document.head.appendChild(styleEl);

// ===== HTML =====
const html = `
<button id="cw-fab" aria-label="Mở chat cộng đồng">
  <i class="fas fa-comments"></i>
  <div id="cw-badge"></div>
</button>
<div id="cw-box" role="dialog" aria-label="Chat cộng đồng">
  <div id="cw-head">
    <i class="fas fa-comments" style="color:#fff;font-size:1rem"></i>
    <div id="cw-head-title">Chat Cộng Đồng</div>
    <span id="cw-online"></span>
    <button id="cw-close" aria-label="Đóng">✕</button>
  </div>
  <div id="cw-rooms">
    ${ROOMS.map(r => `<button class="cw-room-btn${r.id==='general'?' active':''}" data-room="${r.id}">${r.label}</button>`).join('')}
  </div>
  <div id="cw-msgs"></div>
  <div id="cw-reply-bar"><span id="cw-reply-text">↩ Trả lời...</span><button id="cw-reply-cancel">✕</button></div>
  <div id="cw-guest-bar" id="cw-guest-area">
    <span>Tên:</span>
    <input id="cw-guest-name" placeholder="Nhập tên khách..." maxlength="30">
  </div>
  <div id="cw-input-area">
    <textarea id="cw-input" placeholder="Nhắn gì đó..." rows="1" maxlength="500"></textarea>
    <button id="cw-send" aria-label="Gửi"><i class="fas fa-paper-plane"></i></button>
  </div>
</div>`;

const wrapper = document.createElement('div');
wrapper.innerHTML = html;
document.body.appendChild(wrapper);

// ===== REFS =====
const fab = document.getElementById('cw-fab');
const box = document.getElementById('cw-box');
const badge = document.getElementById('cw-badge');
const msgsEl = document.getElementById('cw-msgs');
const inputEl = document.getElementById('cw-input');
const sendBtn = document.getElementById('cw-send');
const replyBar = document.getElementById('cw-reply-bar');
const replyText = document.getElementById('cw-reply-text');
const replyCancel = document.getElementById('cw-reply-cancel');
const guestBar = document.getElementById('cw-guest-bar');
const guestNameEl = document.getElementById('cw-guest-name');
const onlineEl = document.getElementById('cw-online');

// ===== AUTH =====
function getToken() { return localStorage.getItem('user_token'); }
function getUser() {
  try { return JSON.parse(localStorage.getItem('user_data')); } catch { return null; }
}

// Ẩn guest bar nếu đã đăng nhập
function updateGuestBar() {
  guestBar.style.display = getUser() ? 'none' : 'flex';
}
updateGuestBar();

// ===== RENDER MESSAGES =====
function timeAgo(dateStr) {
  const d = new Date(dateStr);
  const diff = (Date.now() - d.getTime()) / 1000;
  if (diff < 60) return 'vừa xong';
  if (diff < 3600) return Math.floor(diff/60) + ' phút';
  if (diff < 86400) return Math.floor(diff/3600) + ' giờ';
  return d.toLocaleDateString('vi-VN');
}

function avatarHTML(msg) {
  if (msg.avatar) return `<img src="${msg.avatar}" alt="${msg.username}" loading="lazy">`;
  const initials = (msg.username||'?').slice(0,2).toUpperCase();
  const colors = ['#667eea','#764ba2','#f5576c','#10b981','#f59e0b','#3b82f6'];
  const color = colors[(msg.username||'').charCodeAt(0) % colors.length];
  return `<span style="background:${color}">${initials}</span>`;
}

function renderMsg(msg, isOwn) {
  const replyMsg = msg.reply_to ? allMessages.find(m => m.id === msg.reply_to) : null;
  const reactionsHTML = Object.entries(msg.reactions||{})
    .filter(([,c]) => c > 0)
    .map(([e,c]) => `<button class="cw-react-btn" data-id="${msg.id}" data-emoji="${e}">${e} <span>${c}</span></button>`)
    .join('');

  return `
  <div class="cw-msg${isOwn?' own':''}" data-id="${msg.id}">
    <div class="cw-avatar">${avatarHTML(msg)}</div>
    <div class="cw-bubble-wrap">
      <div class="cw-meta">
        <span class="cw-name">${escHtml(msg.username)}</span>
        ${msg.role==='vip'||msg.role==='admin' ? `<span class="cw-vip-badge">${msg.role==='admin'?'ADMIN':'VIP'}</span>` : ''}
        <span>${timeAgo(msg.created_at)}</span>
      </div>
      ${replyMsg ? `<div class="cw-reply-preview">↩ ${escHtml(replyMsg.username)}: ${escHtml(replyMsg.message.slice(0,60))}</div>` : ''}
      <div class="cw-bubble" data-id="${msg.id}">${escHtml(msg.message)}</div>
      ${reactionsHTML ? `<div class="cw-reactions">${reactionsHTML}</div>` : ''}
    </div>
  </div>`;
}

function escHtml(s) {
  return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

let lastDaySep = '';
function renderAll() {
  const user = getUser();
  lastDaySep = '';
  let html = '';
  allMessages.forEach(msg => {
    const day = new Date(msg.created_at).toLocaleDateString('vi-VN');
    if (day !== lastDaySep) {
      html += `<div class="cw-day-sep">${day}</div>`;
      lastDaySep = day;
    }
    html += renderMsg(msg, user && msg.user_id === user.id);
  });
  msgsEl.innerHTML = html || '<div class="cw-typing">Chưa có tin nhắn. Hãy là người đầu tiên! 👋</div>';
  bindBubbleClicks();
  bindReactBtns();
}

function appendMsg(msg) {
  const user = getUser();
  const day = new Date(msg.created_at).toLocaleDateString('vi-VN');
  if (day !== lastDaySep) {
    const sep = document.createElement('div');
    sep.className = 'cw-day-sep';
    sep.textContent = day;
    msgsEl.appendChild(sep);
    lastDaySep = day;
  }
  const div = document.createElement('div');
  div.innerHTML = renderMsg(msg, user && msg.user_id === user.id);
  msgsEl.appendChild(div.firstElementChild);
  bindBubbleClicks();
  bindReactBtns();
}

function scrollBottom(force) {
  const el = msgsEl;
  const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
  if (force || nearBottom) el.scrollTop = el.scrollHeight;
}

// ===== EMOJI PICKER =====
let pickerOpen = null;
function closeAllPickers() {
  document.querySelectorAll('.cw-emoji-picker').forEach(p => p.remove());
  pickerOpen = null;
}

function bindBubbleClicks() {
  msgsEl.querySelectorAll('.cw-bubble').forEach(b => {
    b.onclick = function(e) {
      e.stopPropagation();
      const id = parseInt(this.dataset.id);
      closeAllPickers();
      if (pickerOpen === id) { pickerOpen = null; return; }
      pickerOpen = id;
      const picker = document.createElement('div');
      picker.className = 'cw-emoji-picker';
      picker.innerHTML = EMOJIS.map(em => `<button class="cw-emoji-opt" data-emoji="${em}" data-id="${id}">${em}</button>`).join('');
      this.style.position = 'relative';
      this.appendChild(picker);
      picker.querySelectorAll('.cw-emoji-opt').forEach(btn => {
        btn.onclick = async function(ev) {
          ev.stopPropagation();
          await reactTo(parseInt(this.dataset.id), this.dataset.emoji);
          closeAllPickers();
        };
      });
      // Reply on long-press / right-click
      this.oncontextmenu = function(ev) {
        ev.preventDefault();
        setReply(id);
        closeAllPickers();
      };
    };
  });
}

function bindReactBtns() {
  msgsEl.querySelectorAll('.cw-react-btn').forEach(btn => {
    btn.onclick = async function(e) {
      e.stopPropagation();
      await reactTo(parseInt(this.dataset.id), this.dataset.emoji);
    };
  });
}

async function reactTo(id, emoji) {
  try {
    const r = await fetch(`${API}/chat/messages/${id}/react`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ emoji })
    });
    if (r.ok) {
      const { reactions } = await r.json();
      const msg = allMessages.find(m => m.id === id);
      if (msg) { msg.reactions = reactions; renderAll(); scrollBottom(false); }
    }
  } catch(e) {}
}

// ===== REPLY =====
function setReply(id) {
  const msg = allMessages.find(m => m.id === id);
  if (!msg) return;
  replyTo = id;
  replyText.textContent = `↩ ${msg.username}: ${msg.message.slice(0,50)}`;
  replyBar.classList.add('show');
  inputEl.focus();
}
replyCancel.onclick = () => { replyTo = null; replyBar.classList.remove('show'); };

// ===== FETCH MESSAGES =====
async function fetchMessages(reset) {
  try {
    const since = reset ? 0 : lastId;
    const r = await fetch(`${API}/chat/messages?room=${currentRoom}&since=${since}`);
    if (!r.ok) return;
    const msgs = await r.json();
    if (!msgs.length) return;

    if (reset) {
      allMessages = msgs;
      lastId = msgs[msgs.length - 1].id;
      renderAll();
      scrollBottom(true);
    } else {
      const newMsgs = msgs.filter(m => m.id > lastId);
      if (!newMsgs.length) return;
      lastId = newMsgs[newMsgs.length - 1].id;
      newMsgs.forEach(m => {
        allMessages.push(m);
        if (allMessages.length > MAX_MSGS) allMessages.shift();
        appendMsg(m);
      });
      if (!isOpen) {
        unread += newMsgs.length;
        badge.textContent = unread > 9 ? '9+' : unread;
        badge.style.display = 'flex';
      }
      scrollBottom(false);
    }

    // Online count (rough: messages in last 5 min)
    const recent = allMessages.filter(m => (Date.now() - new Date(m.created_at)) < 5*60*1000);
    const uniqueUsers = new Set(recent.map(m => m.user_id || m.username)).size;
    onlineEl.textContent = uniqueUsers > 0 ? `${uniqueUsers} online` : '';
  } catch(e) {}
}

// ===== SEND =====
async function sendMessage() {
  const text = inputEl.value.trim();
  if (!text) return;
  sendBtn.disabled = true;

  const token = getToken();
  const guestName = guestNameEl.value.trim();

  try {
    const r = await fetch(`${API}/chat/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      },
      body: JSON.stringify({ message: text, room: currentRoom, reply_to: replyTo || undefined, guestName })
    });
    if (r.ok) {
      const msg = await r.json();
      allMessages.push(msg);
      if (allMessages.length > MAX_MSGS) allMessages.shift();
      lastId = Math.max(lastId, msg.id);
      appendMsg(msg);
      scrollBottom(true);
      inputEl.value = '';
      inputEl.style.height = 'auto';
      replyTo = null;
      replyBar.classList.remove('show');
    } else {
      const err = await r.json();
      alert(err.error || 'Gửi thất bại');
    }
  } catch(e) { alert('Lỗi kết nối'); }
  sendBtn.disabled = false;
  inputEl.focus();
}

// ===== EVENTS =====
fab.onclick = () => {
  isOpen = !isOpen;
  box.classList.toggle('open', isOpen);
  fab.classList.toggle('open', isOpen);
  if (isOpen) {
    unread = 0;
    badge.style.display = 'none';
    updateGuestBar();
    if (!allMessages.length) fetchMessages(true);
    inputEl.focus();
    startPolling();
  } else {
    stopPolling();
  }
};

document.getElementById('cw-close').onclick = () => {
  isOpen = false;
  box.classList.remove('open');
  fab.classList.remove('open');
  stopPolling();
};

// Room switch
document.getElementById('cw-rooms').querySelectorAll('.cw-room-btn').forEach(btn => {
  btn.onclick = function() {
    document.querySelectorAll('.cw-room-btn').forEach(b => b.classList.remove('active'));
    this.classList.add('active');
    currentRoom = this.dataset.room;
    lastId = 0;
    allMessages = [];
    fetchMessages(true);
  };
});

// Send on Enter (Shift+Enter = newline)
inputEl.addEventListener('keydown', e => {
  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
});
inputEl.addEventListener('input', function() {
  this.style.height = 'auto';
  this.style.height = Math.min(this.scrollHeight, 80) + 'px';
});
sendBtn.onclick = sendMessage;

// Close picker on outside click
document.addEventListener('click', e => {
  if (!e.target.closest('.cw-bubble') && !e.target.closest('.cw-emoji-picker')) closeAllPickers();
});

// ===== POLLING =====
function startPolling() {
  stopPolling();
  pollTimer = setInterval(() => fetchMessages(false), 3000);
}
function stopPolling() {
  if (pollTimer) { clearInterval(pollTimer); pollTimer = null; }
}

// Passive poll khi tab visible (mỗi 10s dù đóng)
document.addEventListener('visibilitychange', () => {
  if (!document.hidden && !isOpen) fetchMessages(false);
});

// Init: fetch 1 lần để có unread count
setTimeout(() => fetchMessages(true), 1500);

})();
