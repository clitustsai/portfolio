// ========== COMMUNITY CHAT WIDGET v2 ==========
// VIP rooms, pin, sticker, donate, ads, reactions, reply
(function () {
'use strict';

const API = window.API_BASE || (location.hostname === 'localhost' ? 'http://localhost:3001/api' : '/api');
const ROOMS = [
  { id: 'general',    label: '💬 Chung',   vip: false },
  { id: 'tools',      label: '🤖 AI Tools', vip: false },
  { id: 'arcade',     label: '🎮 Arcade',   vip: false },
  { id: 'vip',        label: '👑 VIP',      vip: true  },
];
const EMOJIS = ['👍','❤️','😂','🔥','👏','😮'];
const STICKERS = ['🎉','🚀','💯','😎','🤖','👾','🦄','💎','🔥','⚡','🎮','🏆'];
const MAX_MSGS = 100;

let currentRoom = 'general';
let lastId = 0;
let pollTimer = null;
let isOpen = false;
let replyTo = null;
let unread = 0;
let allMessages = [];
let pinnedMessages = [];
let adData = null;
let showStickers = false;

// ===== CSS =====
const css = `
#cw-fab {
  position:fixed;bottom:20px;right:20px;z-index:9980;
  width:52px;height:52px;border-radius:50%;
  background:linear-gradient(135deg,#667eea,#764ba2);
  border:none;color:#fff;font-size:1.3rem;cursor:pointer;
  box-shadow:0 6px 24px rgba(102,126,234,.5);
  display:flex;align-items:center;justify-content:center;
  transition:transform .25s;animation:cwPulse 4s ease-in-out infinite;
}
#cw-fab:hover{transform:scale(1.1);}
#cw-fab.open{animation:none;background:linear-gradient(135deg,#f5576c,#c0392b);}
@keyframes cwPulse{0%,100%{box-shadow:0 6px 24px rgba(102,126,234,.5)}50%{box-shadow:0 6px 32px rgba(118,75,162,.75)}}
#cw-badge{position:absolute;top:-3px;right:-3px;background:#f5576c;color:#fff;border-radius:50%;
  width:20px;height:20px;font-size:.65rem;font-weight:900;
  display:none;align-items:center;justify-content:center;border:2px solid #fff;}
#cw-box{
  position:fixed;bottom:82px;right:20px;z-index:9979;
  width:370px;max-width:calc(100vw - 32px);
  height:540px;max-height:calc(100vh - 100px);
  background:#fff;border-radius:20px;
  box-shadow:0 24px 64px rgba(0,0,0,.18),0 0 0 1px rgba(102,126,234,.1);
  display:flex;flex-direction:column;overflow:hidden;
  transform:scale(.85) translateY(20px);opacity:0;pointer-events:none;visibility:hidden;
  transition:transform .3s cubic-bezier(0.4,0,0.2,1),opacity .3s,visibility .3s;
  transform-origin:bottom right;
}
html[data-theme="dark"] #cw-box{background:#1a1a2e;box-shadow:0 24px 64px rgba(0,0,0,.5),0 0 0 1px rgba(102,126,234,.2);}
#cw-box.open{transform:scale(1) translateY(0);opacity:1;pointer-events:all;visibility:visible;}
#cw-head{background:linear-gradient(135deg,#667eea,#764ba2);padding:.75rem 1rem;display:flex;align-items:center;gap:.6rem;flex-shrink:0;}
#cw-head-title{color:#fff;font-weight:800;font-size:.9rem;flex:1;}
#cw-online{color:rgba(255,255,255,.8);font-size:.72rem;}
#cw-close{background:rgba(255,255,255,.15);border:none;color:#fff;width:28px;height:28px;border-radius:50%;cursor:pointer;font-size:.85rem;display:flex;align-items:center;justify-content:center;transition:background .2s;flex-shrink:0;}
#cw-close:hover{background:rgba(255,255,255,.3);}
#cw-rooms{display:flex;border-bottom:1px solid rgba(0,0,0,.07);flex-shrink:0;overflow-x:auto;scrollbar-width:none;}
#cw-rooms::-webkit-scrollbar{display:none;}
.cw-room-btn{flex-shrink:0;padding:.45rem .75rem;border:none;background:none;font-size:.72rem;font-weight:700;color:#888;cursor:pointer;border-bottom:2px solid transparent;transition:all .2s;white-space:nowrap;position:relative;}
.cw-room-btn.active{color:#667eea;border-bottom-color:#667eea;}
.cw-room-btn:hover{color:#667eea;background:rgba(102,126,234,.05);}
.cw-room-btn .cw-vip-lock{font-size:.6rem;position:absolute;top:2px;right:2px;}
html[data-theme="dark"] .cw-room-btn{color:#aaa;}
html[data-theme="dark"] .cw-room-btn.active{color:#a78bfa;border-bottom-color:#a78bfa;}
#cw-pinned{background:rgba(245,158,11,.08);border-bottom:1px solid rgba(245,158,11,.2);padding:.4rem .75rem;flex-shrink:0;display:none;}
.cw-pin-item{font-size:.72rem;color:#92400e;display:flex;align-items:center;gap:.4rem;padding:.15rem 0;}
html[data-theme="dark"] .cw-pin-item{color:#fbbf24;}
.cw-pin-item i{color:#f59e0b;}
#cw-ad-bar{background:linear-gradient(90deg,rgba(102,126,234,.08),rgba(118,75,162,.08));border-bottom:1px solid rgba(102,126,234,.1);padding:.35rem .75rem;flex-shrink:0;display:none;align-items:center;gap:.5rem;}
#cw-ad-bar a{font-size:.72rem;color:#667eea;text-decoration:none;flex:1;font-weight:600;}
#cw-ad-bar a:hover{text-decoration:underline;}
#cw-ad-close{background:none;border:none;color:#bbb;cursor:pointer;font-size:.75rem;padding:0;}
#cw-msgs{flex:1;overflow-y:auto;padding:.75rem;display:flex;flex-direction:column;gap:.5rem;scroll-behavior:smooth;}
#cw-msgs::-webkit-scrollbar{width:4px;}
#cw-msgs::-webkit-scrollbar-thumb{background:rgba(102,126,234,.3);border-radius:4px;}
.cw-msg{display:flex;gap:.5rem;align-items:flex-start;}
.cw-msg.own{flex-direction:row-reverse;}
.cw-avatar{width:30px;height:30px;border-radius:50%;flex-shrink:0;background:linear-gradient(135deg,#667eea,#764ba2);display:flex;align-items:center;justify-content:center;color:#fff;font-size:.75rem;font-weight:800;overflow:hidden;}
.cw-avatar img{width:100%;height:100%;object-fit:cover;}
.cw-bubble-wrap{max-width:78%;display:flex;flex-direction:column;gap:.15rem;}
.cw-msg.own .cw-bubble-wrap{align-items:flex-end;}
.cw-meta{font-size:.65rem;color:#aaa;display:flex;align-items:center;gap:.35rem;flex-wrap:wrap;}
.cw-name{font-weight:700;color:#667eea;}
html[data-theme="dark"] .cw-name{color:#a78bfa;}
.cw-badge-vip{background:linear-gradient(135deg,#f59e0b,#d97706);color:#fff;font-size:.55rem;font-weight:900;padding:1px 5px;border-radius:50px;}
.cw-badge-admin{background:linear-gradient(135deg,#f5576c,#c0392b);color:#fff;font-size:.55rem;font-weight:900;padding:1px 5px;border-radius:50px;}
.cw-bubble{background:#f0f2ff;color:#1a1a2e;padding:.5rem .75rem;border-radius:14px 14px 14px 4px;font-size:.82rem;line-height:1.5;word-break:break-word;position:relative;cursor:pointer;transition:background .15s;}
.cw-bubble:hover{background:#e8ebff;}
.cw-msg.own .cw-bubble{background:linear-gradient(135deg,#667eea,#764ba2);color:#fff;border-radius:14px 14px 4px 14px;}
.cw-msg.own .cw-bubble:hover{filter:brightness(1.05);}
html[data-theme="dark"] .cw-bubble{background:#2a2a4a;color:#e8e8ff;}
html[data-theme="dark"] .cw-bubble:hover{background:#32325a;}
.cw-sticker-bubble{background:transparent!important;font-size:2.8rem;padding:.2rem;cursor:pointer;line-height:1;}
.cw-donate-bubble{background:linear-gradient(135deg,#f59e0b,#d97706)!important;color:#fff!important;border-radius:14px!important;padding:.5rem .85rem;display:flex;align-items:center;gap:.5rem;}
.cw-donate-bubble i{font-size:1rem;}
.cw-reply-preview{font-size:.68rem;color:#888;border-left:2px solid #667eea;padding:.2rem .5rem;margin-bottom:.25rem;border-radius:0 6px 6px 0;background:rgba(102,126,234,.07);}
.cw-reactions{display:flex;flex-wrap:wrap;gap:.2rem;margin-top:.2rem;}
.cw-react-btn{background:rgba(0,0,0,.06);border:none;border-radius:50px;padding:1px 6px;font-size:.72rem;cursor:pointer;transition:transform .15s;display:flex;align-items:center;gap:2px;}
.cw-react-btn:hover{transform:scale(1.15);background:rgba(102,126,234,.12);}
html[data-theme="dark"] .cw-react-btn{background:rgba(255,255,255,.08);}
.cw-ctx-menu{position:absolute;background:#fff;border-radius:12px;box-shadow:0 8px 24px rgba(0,0,0,.15);padding:.35rem;z-index:100;min-width:140px;display:none;}
html[data-theme="dark"] .cw-ctx-menu{background:#2a2a4a;}
.cw-ctx-menu.show{display:block;}
.cw-ctx-item{display:flex;align-items:center;gap:.5rem;padding:.4rem .65rem;border-radius:8px;font-size:.78rem;cursor:pointer;color:#333;border:none;background:none;width:100%;text-align:left;}
.cw-ctx-item:hover{background:rgba(102,126,234,.08);color:#667eea;}
html[data-theme="dark"] .cw-ctx-item{color:#e8e8ff;}
.cw-emoji-row{display:flex;gap:.25rem;padding:.3rem .5rem;border-bottom:1px solid rgba(0,0,0,.06);}
html[data-theme="dark"] .cw-emoji-row{border-color:rgba(255,255,255,.06);}
.cw-emoji-opt{background:none;border:none;font-size:1.1rem;cursor:pointer;padding:.15rem;border-radius:6px;transition:transform .15s;}
.cw-emoji-opt:hover{transform:scale(1.25);background:rgba(102,126,234,.1);}
#cw-reply-bar{padding:.4rem .75rem;background:rgba(102,126,234,.07);border-top:1px solid rgba(102,126,234,.1);font-size:.72rem;color:#667eea;display:none;align-items:center;justify-content:space-between;flex-shrink:0;}
#cw-reply-bar.show{display:flex;}
#cw-reply-cancel{background:none;border:none;color:#f5576c;cursor:pointer;font-size:.8rem;}
#cw-sticker-tray{padding:.5rem .75rem;border-top:1px solid rgba(0,0,0,.07);display:none;flex-wrap:wrap;gap:.4rem;flex-shrink:0;}
#cw-sticker-tray.show{display:flex;}
.cw-sticker-opt{background:none;border:none;font-size:1.6rem;cursor:pointer;padding:.2rem;border-radius:8px;transition:transform .2s;}
.cw-sticker-opt:hover{transform:scale(1.3);background:rgba(102,126,234,.08);}
#cw-input-area{padding:.6rem .75rem;border-top:1px solid rgba(0,0,0,.07);display:flex;gap:.4rem;align-items:flex-end;flex-shrink:0;}
html[data-theme="dark"] #cw-input-area{border-color:rgba(255,255,255,.07);}
#cw-input{flex:1;border:1.5px solid rgba(102,126,234,.2);border-radius:12px;padding:.45rem .7rem;font-size:.82rem;resize:none;outline:none;background:#f8f9ff;color:#1a1a2e;max-height:80px;min-height:36px;font-family:inherit;transition:border-color .2s;}
#cw-input:focus{border-color:#667eea;}
html[data-theme="dark"] #cw-input{background:#2a2a4a;color:#e8e8ff;border-color:rgba(102,126,234,.3);}
.cw-tool-btn{width:32px;height:32px;border-radius:50%;border:none;background:rgba(102,126,234,.1);color:#667eea;cursor:pointer;font-size:.85rem;display:flex;align-items:center;justify-content:center;transition:all .2s;flex-shrink:0;}
.cw-tool-btn:hover{background:rgba(102,126,234,.2);transform:scale(1.1);}
#cw-send{width:36px;height:36px;border-radius:50%;flex-shrink:0;background:linear-gradient(135deg,#667eea,#764ba2);border:none;color:#fff;cursor:pointer;font-size:.9rem;display:flex;align-items:center;justify-content:center;transition:transform .2s,opacity .2s;}
#cw-send:hover{transform:scale(1.1);}
#cw-send:disabled{opacity:.4;cursor:not-allowed;transform:none;}
#cw-guest-bar{padding:.5rem .75rem;background:rgba(245,87,108,.06);border-top:1px solid rgba(245,87,108,.1);font-size:.72rem;color:#888;display:flex;align-items:center;gap:.5rem;flex-shrink:0;}
#cw-guest-name{flex:1;border:1px solid rgba(0,0,0,.12);border-radius:8px;padding:.3rem .6rem;font-size:.75rem;outline:none;background:#fff;color:#1a1a2e;}
html[data-theme="dark"] #cw-guest-name{background:#2a2a4a;color:#e8e8ff;border-color:rgba(255,255,255,.1);}
#cw-vip-wall{flex:1;display:none;flex-direction:column;align-items:center;justify-content:center;gap:.75rem;padding:1.5rem;text-align:center;}
#cw-vip-wall.show{display:flex;}
#cw-vip-wall .vw-icon{font-size:2.5rem;}
#cw-vip-wall h3{font-size:1rem;font-weight:800;color:#1a1a2e;margin:0;}
html[data-theme="dark"] #cw-vip-wall h3{color:#e8e8ff;}
#cw-vip-wall p{font-size:.78rem;color:#888;margin:0;}
#cw-vip-wall a{background:linear-gradient(135deg,#f59e0b,#d97706);color:#fff;padding:.5rem 1.2rem;border-radius:50px;text-decoration:none;font-size:.82rem;font-weight:800;}
.cw-day-sep{text-align:center;font-size:.65rem;color:#bbb;margin:.25rem 0;display:flex;align-items:center;gap:.5rem;}
.cw-day-sep::before,.cw-day-sep::after{content:'';flex:1;height:1px;background:rgba(0,0,0,.07);}
html[data-theme="dark"] .cw-day-sep::before,html[data-theme="dark"] .cw-day-sep::after{background:rgba(255,255,255,.07);}
.cw-empty{font-size:.78rem;color:#bbb;text-align:center;padding:1rem;font-style:italic;}
@media(max-width:480px){
  #cw-box{width:calc(100vw - 16px);right:8px;bottom:140px;height:calc(100vh - 160px);}
  #cw-fab{bottom:76px;right:12px;}
}
`;
const styleEl = document.createElement('style');
styleEl.textContent = css;
document.head.appendChild(styleEl);

// ===== HTML =====
const html = `
<button id="cw-fab" aria-label="Chat cộng đồng">
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
    ${ROOMS.map(r => `<button class="cw-room-btn${r.id==='general'?' active':''}" data-room="${r.id}" data-vip="${r.vip}">${r.label}${r.vip?'<span class="cw-vip-lock">🔒</span>':''}</button>`).join('')}
  </div>
  <div id="cw-pinned"></div>
  <div id="cw-ad-bar"><i class="fas fa-bullhorn" style="color:#667eea;font-size:.75rem;flex-shrink:0"></i><a id="cw-ad-link" href="#" target="_blank" rel="noopener"></a><button id="cw-ad-close" aria-label="Đóng quảng cáo">✕</button></div>
  <div id="cw-msgs"></div>
  <div id="cw-vip-wall">
    <div class="vw-icon">👑</div>
    <h3>Phòng VIP</h3>
    <p>Chỉ dành cho thành viên VIP.<br>Nâng cấp để tham gia cộng đồng VIP!</p>
    <a href="/payment.html">Nâng cấp VIP — 99k/tháng</a>
  </div>
  <div id="cw-reply-bar"><span id="cw-reply-text">↩ Trả lời...</span><button id="cw-reply-cancel">✕</button></div>
  <div id="cw-sticker-tray">
    ${STICKERS.map(s => `<button class="cw-sticker-opt" data-sticker="${s}">${s}</button>`).join('')}
  </div>
  <div id="cw-guest-bar">
    <span>Tên:</span>
    <input id="cw-guest-name" placeholder="Nhập tên khách..." maxlength="30">
  </div>
  <div id="cw-input-area">
    <button class="cw-tool-btn" id="cw-sticker-btn" title="Sticker"><i class="fas fa-smile"></i></button>
    <button class="cw-tool-btn" id="cw-donate-btn" title="Donate 🎁"><i class="fas fa-gift"></i></button>
    <textarea id="cw-input" placeholder="Nhắn gì đó..." rows="1" maxlength="500"></textarea>
    <button id="cw-send" aria-label="Gửi"><i class="fas fa-paper-plane"></i></button>
  </div>
</div>`;

const wrapper = document.createElement('div');
wrapper.innerHTML = html;
document.body.appendChild(wrapper);

// ===== REFS =====
const fab       = document.getElementById('cw-fab');
const box       = document.getElementById('cw-box');
const badge     = document.getElementById('cw-badge');
const msgsEl    = document.getElementById('cw-msgs');
const inputEl   = document.getElementById('cw-input');
const sendBtn   = document.getElementById('cw-send');
const replyBar  = document.getElementById('cw-reply-bar');
const replyText = document.getElementById('cw-reply-text');
const replyCancel = document.getElementById('cw-reply-cancel');
const guestBar  = document.getElementById('cw-guest-bar');
const guestNameEl = document.getElementById('cw-guest-name');
const onlineEl  = document.getElementById('cw-online');
const pinnedEl  = document.getElementById('cw-pinned');
const adBar     = document.getElementById('cw-ad-bar');
const adLink    = document.getElementById('cw-ad-link');
const adClose   = document.getElementById('cw-ad-close');
const stickerTray = document.getElementById('cw-sticker-tray');
const stickerBtn  = document.getElementById('cw-sticker-btn');
const donateBtn   = document.getElementById('cw-donate-btn');
const vipWall     = document.getElementById('cw-vip-wall');

// ===== AUTH =====
function getToken() { return localStorage.getItem('user_token'); }
function getUser() { try { return JSON.parse(localStorage.getItem('user_data')); } catch { return null; } }
function isVipUser() { const u = getUser(); return u && (u.role === 'vip' || u.role === 'admin'); }
function isAdmin() { const u = getUser(); return u && u.role === 'admin'; }

function updateGuestBar() {
  guestBar.style.display = getUser() ? 'none' : 'flex';
  // Sticker/donate chỉ cho logged in
  stickerBtn.style.opacity = getUser() ? '1' : '.4';
  donateBtn.style.opacity = getUser() ? '1' : '.4';
}
updateGuestBar();

// ===== HELPERS =====
function esc(s) {
  return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
function timeAgo(d) {
  const diff = (Date.now() - new Date(d)) / 1000;
  if (diff < 60) return 'vừa xong';
  if (diff < 3600) return Math.floor(diff/60) + ' phút';
  if (diff < 86400) return Math.floor(diff/3600) + ' giờ';
  return new Date(d).toLocaleDateString('vi-VN');
}
function avatarHTML(msg) {
  if (msg.avatar) return `<img src="${esc(msg.avatar)}" alt="${esc(msg.username)}" loading="lazy">`;
  const colors = ['#667eea','#764ba2','#f5576c','#10b981','#f59e0b','#3b82f6'];
  const c = colors[(msg.username||'').charCodeAt(0) % colors.length];
  return `<span style="background:${c}">${(msg.username||'?').slice(0,2).toUpperCase()}</span>`;
}
function roleBadge(role) {
  if (role === 'admin') return `<span class="cw-badge-admin">ADMIN</span>`;
  if (role === 'vip')   return `<span class="cw-badge-vip">👑 VIP</span>`;
  return '';
}

// ===== RENDER =====
function renderBubble(msg) {
  if (msg.msg_type === 'sticker') {
    return `<div class="cw-bubble cw-sticker-bubble" data-id="${msg.id}">${esc(msg.sticker)}</div>`;
  }
  if (msg.msg_type === 'donate') {
    return `<div class="cw-bubble cw-donate-bubble" data-id="${msg.id}"><i class="fas fa-gift"></i> ${esc(msg.message)}</div>`;
  }
  return `<div class="cw-bubble" data-id="${msg.id}">${esc(msg.message)}</div>`;
}

function renderMsg(msg, isOwn) {
  const replyMsg = msg.reply_to ? allMessages.find(m => m.id === msg.reply_to) : null;
  const reactHTML = Object.entries(msg.reactions||{}).filter(([,c])=>c>0)
    .map(([e,c])=>`<button class="cw-react-btn" data-id="${msg.id}" data-emoji="${e}">${e} <span>${c}</span></button>`).join('');
  const adminActions = isAdmin()
    ? `<button class="cw-ctx-item" data-action="pin" data-id="${msg.id}"><i class="fas fa-thumbtack"></i> ${msg.pinned?'Bỏ ghim':'Ghim'}</button>
       <button class="cw-ctx-item" data-action="del" data-id="${msg.id}" style="color:#f5576c"><i class="fas fa-trash"></i> Xóa</button>`
    : '';
  return `
  <div class="cw-msg${isOwn?' own':''}" data-id="${msg.id}">
    <div class="cw-avatar">${avatarHTML(msg)}</div>
    <div class="cw-bubble-wrap">
      <div class="cw-meta">
        <span class="cw-name">${esc(msg.username)}</span>
        ${roleBadge(msg.role)}
        <span>${timeAgo(msg.created_at)}</span>
      </div>
      ${replyMsg?`<div class="cw-reply-preview">↩ <b>${esc(replyMsg.username)}</b>: ${esc(replyMsg.message.slice(0,60))}</div>`:''}
      ${renderBubble(msg)}
      ${reactHTML?`<div class="cw-reactions">${reactHTML}</div>`:''}
      <div class="cw-ctx-menu" id="ctx-${msg.id}">
        <div class="cw-emoji-row">${EMOJIS.map(e=>`<button class="cw-emoji-opt" data-emoji="${e}" data-id="${msg.id}">${e}</button>`).join('')}</div>
        <button class="cw-ctx-item" data-action="reply" data-id="${msg.id}"><i class="fas fa-reply"></i> Trả lời</button>
        ${adminActions}
      </div>
    </div>
  </div>`;
}

let lastDaySep = '';
function renderAll() {
  const user = getUser();
  lastDaySep = '';
  let html = '';
  allMessages.forEach(msg => {
    const day = new Date(msg.created_at).toLocaleDateString('vi-VN');
    if (day !== lastDaySep) { html += `<div class="cw-day-sep">${day}</div>`; lastDaySep = day; }
    html += renderMsg(msg, user && msg.user_id === user.id);
  });
  msgsEl.innerHTML = html || '<div class="cw-empty">Chưa có tin nhắn. Hãy là người đầu tiên! 👋</div>';
  bindEvents();
}

function appendMsg(msg) {
  const user = getUser();
  const day = new Date(msg.created_at).toLocaleDateString('vi-VN');
  if (day !== lastDaySep) {
    const sep = document.createElement('div');
    sep.className = 'cw-day-sep'; sep.textContent = day;
    msgsEl.appendChild(sep); lastDaySep = day;
  }
  const div = document.createElement('div');
  div.innerHTML = renderMsg(msg, user && msg.user_id === user.id);
  msgsEl.appendChild(div.firstElementChild);
  bindEvents();
}

function scrollBottom(force) {
  const nearBottom = msgsEl.scrollHeight - msgsEl.scrollTop - msgsEl.clientHeight < 120;
  if (force || nearBottom) msgsEl.scrollTop = msgsEl.scrollHeight;
}

// ===== PINNED =====
function renderPinned() {
  if (!pinnedMessages.length) { pinnedEl.style.display = 'none'; return; }
  pinnedEl.style.display = 'block';
  pinnedEl.innerHTML = pinnedMessages.map(m =>
    `<div class="cw-pin-item"><i class="fas fa-thumbtack"></i> <b>${esc(m.username)}:</b> ${esc(m.message.slice(0,80))}</div>`
  ).join('');
}

// ===== ADS =====
async function loadAd() {
  try {
    const r = await fetch(`${API}/chat/ads`);
    if (!r.ok) return;
    adData = await r.json();
    if (!adData) return;
    adLink.textContent = adData.text;
    adLink.href = adData.url || '#';
    adBar.style.display = 'flex';
  } catch(e) {}
}
adClose.onclick = () => { adBar.style.display = 'none'; };

// ===== CONTEXT MENU / EVENTS =====
let openCtx = null;
function closeCtx() {
  if (openCtx) { document.getElementById('ctx-' + openCtx)?.classList.remove('show'); openCtx = null; }
}

function bindEvents() {
  // Bubble click → context menu
  msgsEl.querySelectorAll('.cw-bubble').forEach(b => {
    b.onclick = function(e) {
      e.stopPropagation();
      const id = parseInt(this.dataset.id);
      if (openCtx === id) { closeCtx(); return; }
      closeCtx();
      openCtx = id;
      document.getElementById('ctx-' + id)?.classList.add('show');
    };
  });

  // Emoji react
  msgsEl.querySelectorAll('.cw-emoji-opt').forEach(btn => {
    btn.onclick = async function(e) {
      e.stopPropagation();
      await reactTo(parseInt(this.dataset.id), this.dataset.emoji);
      closeCtx();
    };
  });

  // Context actions
  msgsEl.querySelectorAll('.cw-ctx-item').forEach(btn => {
    btn.onclick = async function(e) {
      e.stopPropagation();
      const id = parseInt(this.dataset.id);
      const action = this.dataset.action;
      closeCtx();
      if (action === 'reply') { setReply(id); }
      else if (action === 'del') { await deleteMsg(id); }
      else if (action === 'pin') { await pinMsg(id, this.textContent.includes('Ghim')); }
    };
  });

  // Reaction buttons
  msgsEl.querySelectorAll('.cw-react-btn').forEach(btn => {
    btn.onclick = async function(e) {
      e.stopPropagation();
      await reactTo(parseInt(this.dataset.id), this.dataset.emoji);
    };
  });
}

document.addEventListener('click', e => {
  if (!e.target.closest('.cw-bubble') && !e.target.closest('.cw-ctx-menu')) closeCtx();
});

// ===== ACTIONS =====
async function reactTo(id, emoji) {
  try {
    const r = await fetch(`${API}/chat/messages/${id}/react`, {
      method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ emoji })
    });
    if (r.ok) {
      const { reactions } = await r.json();
      const msg = allMessages.find(m => m.id === id);
      if (msg) { msg.reactions = reactions; renderAll(); scrollBottom(false); }
    }
  } catch(e) {}
}

async function deleteMsg(id) {
  if (!confirm('Xóa tin nhắn này?')) return;
  const token = getToken();
  try {
    await fetch(`${API}/chat/messages/${id}`, {
      method: 'DELETE', headers: { 'x-admin-token': localStorage.getItem('admin_token') || '' }
    });
    allMessages = allMessages.filter(m => m.id !== id);
    renderAll();
  } catch(e) {}
}

async function pinMsg(id, doPin) {
  try {
    await fetch(`${API}/chat/messages/${id}/pin`, {
      method: 'POST',
      headers: { 'Content-Type':'application/json', 'x-admin-token': localStorage.getItem('admin_token') || '' },
      body: JSON.stringify({ pin: doPin })
    });
    await fetchMessages(true);
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

// ===== STICKER =====
stickerBtn.onclick = (e) => {
  e.stopPropagation();
  if (!getUser()) { alert('Đăng nhập để dùng sticker!'); return; }
  showStickers = !showStickers;
  stickerTray.classList.toggle('show', showStickers);
};
stickerTray.querySelectorAll('.cw-sticker-opt').forEach(btn => {
  btn.onclick = () => sendSticker(btn.dataset.sticker);
});
document.addEventListener('click', e => {
  if (!e.target.closest('#cw-sticker-tray') && !e.target.closest('#cw-sticker-btn')) {
    showStickers = false; stickerTray.classList.remove('show');
  }
});

// ===== DONATE =====
donateBtn.onclick = () => {
  if (!getUser()) { alert('Đăng nhập để donate!'); return; }
  const amounts = ['☕ Tặng 1 ly cà phê (10k)', '🍕 Tặng 1 ly trà sữa (30k)', '🎁 Ủng hộ 50k', '💎 Ủng hộ 100k'];
  const choice = prompt('Chọn mức donate:\n' + amounts.map((a,i)=>`${i+1}. ${a}`).join('\n') + '\n\nNhập số (1-4):');
  if (!choice) return;
  const idx = parseInt(choice) - 1;
  if (idx >= 0 && idx < amounts.length) {
    sendDonate(amounts[idx]);
  }
};

// ===== FETCH =====
async function fetchMessages(reset) {
  try {
    const since = reset ? 0 : lastId;
    const token = getToken();
    const headers = token ? { 'Authorization': 'Bearer ' + token } : {};
    const r = await fetch(`${API}/chat/messages?room=${currentRoom}&since=${since}`, { headers });

    if (r.status === 403) {
      // VIP wall
      msgsEl.style.display = 'none';
      vipWall.classList.add('show');
      return;
    }
    msgsEl.style.display = 'flex';
    vipWall.classList.remove('show');

    if (!r.ok) return;
    const data = await r.json();
    const msgs = data.messages || [];
    pinnedMessages = data.pinned || [];
    renderPinned();

    if (reset) {
      allMessages = msgs;
      lastId = msgs.length ? msgs[msgs.length-1].id : 0;
      renderAll();
      scrollBottom(true);
    } else {
      const newMsgs = msgs.filter(m => m.id > lastId);
      if (!newMsgs.length) return;
      lastId = newMsgs[newMsgs.length-1].id;
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

    // Online count
    const recent = allMessages.filter(m => (Date.now() - new Date(m.created_at)) < 5*60*1000);
    const uq = new Set(recent.map(m => m.user_id || m.username)).size;
    onlineEl.textContent = uq > 0 ? `${uq} online` : '';
  } catch(e) {}
}

// ===== SEND =====
async function sendMsg(type, extra) {
  const token = getToken();
  const guestName = guestNameEl.value.trim();
  const body = { room: currentRoom, reply_to: replyTo || undefined, guestName, msg_type: type, ...extra };
  sendBtn.disabled = true;
  try {
    const r = await fetch(`${API}/chat/messages`, {
      method: 'POST',
      headers: { 'Content-Type':'application/json', ...(token?{'Authorization':'Bearer '+token}:{}) },
      body: JSON.stringify(body)
    });
    if (r.ok) {
      const msg = await r.json();
      allMessages.push(msg);
      if (allMessages.length > MAX_MSGS) allMessages.shift();
      lastId = Math.max(lastId, msg.id);
      appendMsg(msg);
      scrollBottom(true);
      replyTo = null; replyBar.classList.remove('show');
    } else {
      const err = await r.json();
      if (err.upgradeUrl) { if (confirm(err.error + '\n\nNâng cấp VIP ngay?')) location.href = err.upgradeUrl; }
      else alert(err.error || 'Gửi thất bại');
    }
  } catch(e) { alert('Lỗi kết nối'); }
  sendBtn.disabled = false;
}

async function sendText() {
  const text = inputEl.value.trim();
  if (!text) return;
  await sendMsg('text', { message: text });
  inputEl.value = ''; inputEl.style.height = 'auto';
  inputEl.focus();
}

async function sendSticker(s) {
  showStickers = false; stickerTray.classList.remove('show');
  await sendMsg('sticker', { sticker: s, message: '' });
}

async function sendDonate(text) {
  await sendMsg('donate', { message: text });
}

// ===== INPUT EVENTS =====
inputEl.addEventListener('keydown', e => { if (e.key==='Enter'&&!e.shiftKey){e.preventDefault();sendText();} });
inputEl.addEventListener('input', function() { this.style.height='auto'; this.style.height=Math.min(this.scrollHeight,80)+'px'; });
sendBtn.onclick = sendText;

// ===== ROOM SWITCH =====
document.getElementById('cw-rooms').querySelectorAll('.cw-room-btn').forEach(btn => {
  btn.onclick = function() {
    document.querySelectorAll('.cw-room-btn').forEach(b => b.classList.remove('active'));
    this.classList.add('active');
    currentRoom = this.dataset.room;
    lastId = 0; allMessages = [];
    fetchMessages(true);
  };
});

// ===== OPEN/CLOSE =====
fab.onclick = () => {
  isOpen = !isOpen;
  box.classList.toggle('open', isOpen);
  fab.classList.toggle('open', isOpen);
  if (isOpen) {
    unread = 0; badge.style.display = 'none';
    updateGuestBar();
    if (!allMessages.length) fetchMessages(true);
    loadAd();
    inputEl.focus();
    startPolling();
  } else { stopPolling(); }
};
document.getElementById('cw-close').onclick = () => {
  isOpen = false; box.classList.remove('open'); fab.classList.remove('open'); stopPolling();
};

// ===== POLLING =====
function startPolling() { stopPolling(); pollTimer = setInterval(()=>fetchMessages(false), 3000); }
function stopPolling() { if (pollTimer){clearInterval(pollTimer);pollTimer=null;} }

document.addEventListener('visibilitychange', () => { if (!document.hidden && !isOpen) fetchMessages(false); });

// Init
setTimeout(() => fetchMessages(true), 1500);

})();
