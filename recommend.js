// ========== SMART RECOMMEND ENGINE ==========
// Inject vào mọi trang — hiện gợi ý thông minh dựa trên context
// v1 — page-aware, role-aware, behavior-aware

(function() {
'use strict';

const API_BASE = window.API_BASE || (location.hostname === 'localhost' ? 'http://localhost:3001/api' : '/api');
const PAGE = location.pathname.replace(/^\//, '').replace('.html', '') || 'index';

// Không chạy trên trang admin
if (PAGE === 'admin') return;

// Chỉ skip nếu user đã bấm "Không hiện lại trang này" (localStorage, không phải sessionStorage)
const sessionKey = 'rec_dismissed_' + PAGE;
if (localStorage.getItem(sessionKey)) return;

// ===== CSS =====
const style = document.createElement('style');
style.textContent = `
#rec-panel {
  position:fixed; bottom:200px; right:20px; z-index:9990;
  width:300px; max-width:calc(100vw - 40px);
  background:#fff; border-radius:20px;
  box-shadow:0 20px 60px rgba(0,0,0,.18), 0 0 0 1px rgba(102,126,234,.1);
  overflow:hidden; transform:translateX(340px); transition:transform .4s cubic-bezier(0.4,0,0.2,1);
  pointer-events:none; visibility:hidden;
}
#rec-panel.open { pointer-events:auto; visibility:visible; }
html[data-theme="dark"] #rec-panel { background:#1e1e3a; box-shadow:0 20px 60px rgba(0,0,0,.5),0 0 0 1px rgba(102,126,234,.2); }
#rec-panel.open { transform:translateX(0); }
#rec-header {
  background:linear-gradient(135deg,#667eea,#764ba2);
  padding:.75rem 1rem; display:flex; align-items:center; justify-content:space-between;
}
#rec-header span { color:#fff; font-size:.82rem; font-weight:800; display:flex; align-items:center; gap:.4rem; }
#rec-close { background:rgba(255,255,255,.15); border:none; color:#fff; width:26px; height:26px;
  border-radius:50%; cursor:pointer; font-size:.9rem; display:flex; align-items:center; justify-content:center;
  transition:background .2s; }
#rec-close:hover { background:rgba(255,255,255,.3); }
#rec-list { padding:.6rem; display:flex; flex-direction:column; gap:.4rem; max-height:380px; overflow-y:auto; overflow-x:hidden; box-sizing:border-box; }
.rec-item {
  display:flex; align-items:flex-start; gap:.65rem;
  padding:.7rem .85rem; border-radius:14px; cursor:pointer;
  transition:all .2s; text-decoration:none; border:1.5px solid transparent;
  box-sizing:border-box; width:100%; overflow:hidden;
}
.rec-item:hover { background:rgba(102,126,234,.07); border-color:rgba(102,126,234,.15); transform:translateX(3px); }
.rec-item-icon { font-size:1.4rem; flex-shrink:0; line-height:1; width:32px; height:32px; display:flex; align-items:center; justify-content:center; margin-top:.1rem; }
.rec-item-body { flex:1; min-width:0; overflow:hidden; }
.rec-item-title { font-size:.84rem; font-weight:800; color:#1a1a2e; margin-bottom:.15rem; line-height:1.3; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
html[data-theme="dark"] .rec-item-title { color:#e8e8ff; }
.rec-item-desc { font-size:.72rem; color:#888; line-height:1.4; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.rec-item-badge { display:inline-block; margin-top:.25rem; font-size:.62rem; font-weight:800;
  padding:1px 7px; border-radius:50px; white-space:nowrap; }
.rec-badge-hot { background:rgba(245,87,108,.12); color:#f5576c; }
.rec-badge-new { background:rgba(16,185,129,.12); color:#10b981; }
.rec-badge-free { background:rgba(102,126,234,.12); color:#667eea; }
.rec-badge-vip { background:linear-gradient(135deg,#f59e0b,#d97706); color:#fff; }
#rec-footer { padding:.6rem 1rem; border-top:1px solid rgba(0,0,0,.06); text-align:center; }
html[data-theme="dark"] #rec-footer { border-color:rgba(255,255,255,.06); }
#rec-footer button { background:none; border:none; color:#bbb; font-size:.72rem; cursor:pointer; transition:color .2s; }
#rec-footer button:hover { color:#667eea; }
/* Toggle button */
#rec-toggle {
  position:fixed; bottom:140px; right:20px; z-index:9991;
  width:48px; height:48px; border-radius:50%;
  background:linear-gradient(135deg,#667eea,#764ba2);
  border:none; color:#fff; font-size:1.2rem; cursor:pointer;
  box-shadow:0 6px 20px rgba(102,126,234,.45);
  display:flex; align-items:center; justify-content:center;
  transition:all .3s; animation:recPulse 3s ease-in-out infinite;
}
#rec-toggle:hover { transform:scale(1.1); }
#rec-toggle.panel-open { opacity:0; pointer-events:none; }
@keyframes recPulse {
  0%,100% { box-shadow:0 6px 20px rgba(102,126,234,.45); }
  50% { box-shadow:0 6px 30px rgba(118,75,162,.7); }
}
#rec-badge-count {
  position:absolute; top:-4px; right:-4px;
  background:#f5576c; color:#fff; border-radius:50%;
  width:18px; height:18px; font-size:.65rem; font-weight:900;
  display:flex; align-items:center; justify-content:center;
  border:2px solid #fff;
}
@media(max-width:768px) {
  #rec-panel {
    width:calc(100vw - 32px) !important;
    right:16px !important;
    left:16px !important;
    bottom:188px !important;
    max-height:60vh !important;
  }
  #rec-list {
    max-height:calc(60vh - 110px) !important;
    overflow-y:auto !important;
  }
  #rec-toggle {
    right:12px !important;
    bottom:128px !important;
  }
}
`;
document.head.appendChild(style);

// ===== BUILD RECOMMENDATIONS =====
async function buildRecs() {
  const recs = [];
  const token = localStorage.getItem('user_token');
  let userData = null;

  if (token) {
    try {
      const r = await fetch(API_BASE + '/user/dashboard', { headers: { 'Authorization': 'Bearer ' + token } });
      if (r.ok) userData = await r.json();
    } catch(e) {}
  }

  const isVip = userData?.isVip || false;
  const coins = userData?.coins || 0;
  const dailyClaimed = userData?.dailyClaimed || false;
  const crUsed = userData?.usage?.cr || 0;
  const cvUsed = userData?.usage?.cv || 0;
  const role = userData?.user?.role || 'guest';

  // ===== PAGE-SPECIFIC RECS =====

  if (PAGE === 'index' || PAGE === '') {
    if (!token) {
      recs.push({ icon:'🔐', title:'Đăng nhập để mở đầy đủ', desc:'Bình luận, kiếm coin, dùng AI Tools miễn phí', badge:'free', url:'#', action: () => { if(typeof openAuthModal==='function') openAuthModal('login'); } });
    }
    recs.push({ icon:'🤖', title:'Thử AI Code Review', desc:'Review code của bạn bằng GPT-4 — miễn phí 3 lượt/ngày', badge:'free', url:'tools.html' });
    recs.push({ icon:'🎮', title:'Arcade & Kiếm Coin', desc:'Chơi Snake, Clicker để kiếm coin mở AI Tools', badge:'new', url:'arcade.html' });
    if (!isVip) recs.push({ icon:'👑', title:'VIP 99k/tháng', desc:'Không giới hạn AI tools + nội dung độc quyền', badge:'hot', url:'payment.html' });
  }

  if (PAGE === 'tools') {
    if (!dailyClaimed && token) {
      recs.push({ icon:'🎁', title:'Nhận Daily Reward ngay!', desc:'Bạn chưa nhận coin hôm nay — vào Arcade để nhận', badge:'hot', url:'arcade.html' });
    }
    if (crUsed >= 2 && !isVip) {
      recs.push({ icon:'⚡', title:`Còn ${3-crUsed} lượt Code Review`, desc:'Nâng VIP để dùng không giới hạn mọi lúc', badge:'vip', url:'payment.html' });
    }
    recs.push({ icon:'📄', title:'Tạo CV chuyên nghiệp', desc:'AI tạo CV đẹp sẵn sàng in trong 10 giây', badge:'free', url:'#', action: () => { if(typeof switchTab==='function') switchTab('cv-gen', document.querySelectorAll('.tab-btn')[1]); } });
    recs.push({ icon:'🖼️', title:'AI phân tích ảnh', desc:'Upload ảnh → AI mô tả, nhận diện, đọc chữ', badge:'new', url:'#', action: () => { if(typeof switchTab==='function') switchTab('img-ai', document.querySelectorAll('.tab-btn')[2]); } });
    if (coins < 30) recs.push({ icon:'🪙', title:'Kiếm thêm coin', desc:`Bạn có ${coins} coin. Chơi game để kiếm thêm`, badge:'free', url:'arcade.html' });
  }

  if (PAGE === 'arcade') {
    if (!dailyClaimed && token) {
      recs.push({ icon:'🎁', title:'Nhận Daily Reward!', desc:'Cuộn xuống để nhận coin miễn phí hôm nay', badge:'hot', url:'#', action: () => { document.getElementById('btnClaim')?.scrollIntoView({behavior:'smooth'}); } });
    }
    recs.push({ icon:'🐍', title:'Chơi Snake kiếm 50 coin', desc:'Điểm càng cao coin càng nhiều — max 50 coin/ván', badge:'new', url:'#', action: () => { if(typeof openGame==='function') openGame('snake'); } });
    recs.push({ icon:'💥', title:'Coin Clicker — nhanh tay', desc:'Click thật nhanh trong 15 giây, combo x3 nhân điểm', badge:'free', url:'#', action: () => { if(typeof openGame==='function') openGame('clicker'); } });
    if (coins >= 10) recs.push({ icon:'🔧', title:'Dùng coin mở AI Tools', desc:`Bạn có ${coins} coin — đủ mua 1 lượt AI (10 coin)`, badge:'free', url:'tools.html' });
  }

  if (PAGE === 'dashboard') {
    recs.push({ icon:'🤖', title:'Dùng AI Tools ngay', desc:'Code Review, CV Generator, Image AI miễn phí', badge:'free', url:'tools.html' });
    if (!dailyClaimed && token) {
      recs.push({ icon:'🎁', title:'Chưa nhận coin hôm nay!', desc:'Vào Arcade nhận daily reward — streak tăng thưởng nhiều hơn', badge:'hot', url:'arcade.html' });
    }
    if (!isVip) recs.push({ icon:'👑', title:'Nâng cấp VIP', desc:'Dùng không giới hạn + hỗ trợ 1-1 qua Zalo', badge:'vip', url:'payment.html' });
    recs.push({ icon:'📝', title:'Viết blog chia sẻ', desc:'Đọc blog kỹ thuật từ Clitus PC', badge:'new', url:'blog.html' });
  }

  if (PAGE === 'blog' || PAGE === 'blog-post') {
    recs.push({ icon:'🤖', title:'AI Tools miễn phí', desc:'Review code, tạo CV, phân tích ảnh bằng AI', badge:'free', url:'tools.html' });
    recs.push({ icon:'🎮', title:'Arcade & Coin', desc:'Chơi game kiếm coin, dùng coin mở AI', badge:'new', url:'arcade.html' });
    if (!isVip) recs.push({ icon:'👑', title:'VIP — Nội dung độc quyền', desc:'Truy cập source code + hỗ trợ 1-1', badge:'vip', url:'payment.html' });
  }

  if (PAGE === 'payment') {
    recs.push({ icon:'💬', title:'Hỏi trực tiếp qua Zalo', desc:'Tư vấn miễn phí trước khi mua VIP', badge:'free', url:'https://zalo.me/0906857331', external:true });
    recs.push({ icon:'🎮', title:'Kiếm coin thay thế', desc:'Chơi game kiếm coin, mua lượt AI không cần VIP', badge:'new', url:'arcade.html' });
    recs.push({ icon:'🤖', title:'Thử miễn phí trước', desc:'3 lượt AI miễn phí mỗi ngày — không cần thẻ', badge:'free', url:'tools.html' });
  }

  if (PAGE === 'services') {
    recs.push({ icon:'💼', title:'Tạo Proposal tự động', desc:'AI tạo đề xuất dự án chuyên nghiệp trong 30 giây', badge:'new', url:'proposal.html' });
    recs.push({ icon:'🧾', title:'Tạo Invoice & gửi email', desc:'Hóa đơn đẹp, gửi email tự động cho khách hàng', badge:'free', url:'invoice.html' });
    recs.push({ icon:'🤖', title:'AI Tools miễn phí', desc:'Code Review, CV, Image AI — 3 lượt/ngày free', badge:'free', url:'tools.html' });
  }

  // Fallback nếu không có rec nào
  if (!recs.length) {
    recs.push({ icon:'🤖', title:'AI Tools miễn phí', desc:'Code Review, CV Generator, Image AI', badge:'free', url:'tools.html' });
    recs.push({ icon:'🎮', title:'Arcade & Coin', desc:'Chơi game kiếm coin mở AI Tools', badge:'new', url:'arcade.html' });
  }

  return recs.slice(0, 5); // Tối đa 5 gợi ý
}

// ===== RENDER UI =====
async function render() {
  const recs = await buildRecs();
  if (!recs.length) return;

  const badgeLabels = { hot:'🔥 Hot', new:'✨ Mới', free:'Miễn phí', vip:'👑 VIP' };

  // Toggle button
  const toggle = document.createElement('button');
  toggle.id = 'rec-toggle';
  toggle.setAttribute('aria-label', 'Gợi ý cho bạn');
  toggle.innerHTML = `<i class="fas fa-lightbulb"></i><div id="rec-badge-count">${recs.length}</div>`;
  document.body.appendChild(toggle);

  // Panel
  const panel = document.createElement('div');
  panel.id = 'rec-panel';
  panel.setAttribute('role', 'complementary');
  panel.setAttribute('aria-label', 'Gợi ý thông minh');
  panel.innerHTML = `
    <div id="rec-header">
      <span><i class="fas fa-lightbulb"></i> Gợi ý cho bạn</span>
      <button id="rec-close" aria-label="Đóng">✕</button>
    </div>
    <div id="rec-list">
      ${recs.map(r => `
        <a class="rec-item" href="${r.url}" ${r.external ? 'target="_blank" rel="noopener"' : ''} data-action="${r.action ? 'fn' : ''}">
          <div class="rec-item-icon">${r.icon}</div>
          <div class="rec-item-body">
            <div class="rec-item-title">${r.title}</div>
            <div class="rec-item-desc">${r.desc}</div>
            ${r.badge ? `<span class="rec-item-badge rec-badge-${r.badge}">${badgeLabels[r.badge]||r.badge}</span>` : ''}
          </div>
        </a>`).join('')}
    </div>
    <div id="rec-footer">
      <button onclick="document.getElementById('rec-panel').classList.remove('open');document.getElementById('rec-toggle').classList.remove('panel-open');localStorage.setItem('${sessionKey}','1')">
        Không hiện lại trang này
      </button>
    </div>`;
  document.body.appendChild(panel);

  // Bind actions
  panel.querySelectorAll('.rec-item').forEach((el, i) => {
    if (recs[i]?.action) {
      el.addEventListener('click', function(e) {
        e.preventDefault();
        recs[i].action();
        closePanel();
      });
    }
  });

  // Toggle open/close
  toggle.addEventListener('click', openPanel);
  document.getElementById('rec-close').addEventListener('click', closePanel);

  // Auto-open chỉ trên desktop, mobile user tự bấm toggle
  if (window.innerWidth > 768 && !('ontouchstart' in window)) {
    setTimeout(openPanel, 8000);
  }
}

function openPanel() {
  const panel = document.getElementById('rec-panel');
  const toggle = document.getElementById('rec-toggle');
  if (panel) panel.classList.add('open');
  if (toggle) toggle.classList.add('panel-open');
  // Dùng cả click và touchstart để đóng khi bấm ngoài
  setTimeout(() => {
    document.addEventListener('click', outsideClick);
    document.addEventListener('touchstart', outsideClick, { passive: true });
  }, 100);
}

function closePanel() {
  const panel = document.getElementById('rec-panel');
  const toggle = document.getElementById('rec-toggle');
  if (panel) panel.classList.remove('open');
  if (toggle) toggle.classList.remove('panel-open');
  document.removeEventListener('click', outsideClick);
  document.removeEventListener('touchstart', outsideClick);
}

function outsideClick(e) {
  const panel = document.getElementById('rec-panel');
  const toggle = document.getElementById('rec-toggle');
  const target = e.target || (e.touches && e.touches[0]?.target);
  if (panel && target && !panel.contains(target) && target !== toggle && !toggle?.contains(target)) {
    closePanel();
  }
}

// Chạy sau khi DOM + auth load xong
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => setTimeout(render, 800));
} else {
  setTimeout(render, 800);
}

})();
