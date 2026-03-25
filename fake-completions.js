// Fake Completions — Social Proof Widget
(function() {
'use strict';

const COMPLETIONS = [
  { name: 'Nguyễn Minh T.', avatar: '👨‍💻', service: 'Website Bán Hàng', time: '2 phút trước', city: 'TP.HCM' },
  { name: 'Trần Thị H.', avatar: '👩‍🎓', service: 'Gói VIP Học Sinh', time: '5 phút trước', city: 'Hà Nội' },
  { name: 'Lê Văn P.', avatar: '👨‍🏫', service: 'Landing Page', time: '12 phút trước', city: 'Đà Nẵng' },
  { name: 'Phạm Thu N.', avatar: '👩‍💼', service: 'Web App / SaaS', time: '18 phút trước', city: 'Cần Thơ' },
  { name: 'Hoàng Đức M.', avatar: '👨‍🔬', service: 'Portfolio Template Pro', time: '25 phút trước', city: 'Hải Phòng' },
  { name: 'Vũ Thị L.', avatar: '👩‍🎨', service: 'Gói VIP', time: '31 phút trước', city: 'TP.HCM' },
  { name: 'Đặng Quốc A.', avatar: '👨‍💻', service: 'E-Commerce Starter', time: '45 phút trước', city: 'Bình Dương' },
  { name: 'Bùi Thị K.', avatar: '👩‍🏫', service: 'Bán Khóa Học', time: '1 giờ trước', city: 'Hà Nội' },
  { name: 'Ngô Văn S.', avatar: '👨‍🎓', service: 'Web Giải Bài Tập', time: '1.5 giờ trước', city: 'Đồng Nai' },
  { name: 'Đinh Thị M.', avatar: '👩‍💻', service: 'Dashboard Analytics', time: '2 giờ trước', city: 'TP.HCM' },
  { name: 'Trương Văn B.', avatar: '👨‍🏢', service: 'Bán Tool AI', time: '2.5 giờ trước', city: 'Long An' },
  { name: 'Lý Thị T.', avatar: '👩‍🔬', service: 'Mobile App Template', time: '3 giờ trước', city: 'Vũng Tàu' },
];

const css = `
#fc-toast {
  position:fixed;
  bottom:160px;
  left:16px;
  z-index:99990;
  max-width:290px;
  pointer-events:none;
}
.fc-item {
  background:#fff;
  border-radius:14px;
  padding:.75rem .9rem;
  box-shadow:0 8px 28px rgba(0,0,0,.18);
  border:1px solid rgba(102,126,234,.15);
  display:flex;align-items:center;gap:.65rem;
  animation:fcSlideIn .4s cubic-bezier(.34,1.56,.64,1) both;
  margin-bottom:.5rem;
}
html[data-theme="dark"] .fc-item{background:#1e1e3a;border-color:rgba(102,126,234,.25);box-shadow:0 8px 28px rgba(0,0,0,.4);}
@keyframes fcSlideIn{from{opacity:0;transform:translateX(-24px) scale(.92)}to{opacity:1;transform:translateX(0) scale(1)}}
@keyframes fcSlideOut{from{opacity:1;transform:translateX(0) scale(1)}to{opacity:0;transform:translateX(-24px) scale(.92)}}
.fc-avatar{width:36px;height:36px;border-radius:50%;background:linear-gradient(135deg,#667eea,#764ba2);display:flex;align-items:center;justify-content:center;font-size:1.15rem;flex-shrink:0;}
.fc-body{flex:1;min-width:0;}
.fc-name{font-size:.78rem;font-weight:800;color:#1a1a2e;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
html[data-theme="dark"] .fc-name{color:#e8e8ff;}
.fc-svc{font-size:.7rem;color:#667eea;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.fc-meta{font-size:.65rem;color:#aaa;margin-top:.1rem;}
.fc-check{color:#10b981;font-size:1rem;flex-shrink:0;font-style:normal;}
@media(max-width:480px){
  #fc-toast{left:10px;max-width:calc(100vw - 20px);bottom:150px;}
}
`;

const style = document.createElement('style');
style.textContent = css;
document.head.appendChild(style);

const container = document.createElement('div');
container.id = 'fc-toast';
document.body.appendChild(container);

let idx = Math.floor(Math.random() * COMPLETIONS.length);

function showNext() {
  const c = COMPLETIONS[idx % COMPLETIONS.length];
  idx++;

  const item = document.createElement('div');
  item.className = 'fc-item';
  item.innerHTML = `
    <div class="fc-avatar">${c.avatar}</div>
    <div class="fc-body">
      <div class="fc-name">${c.name} <span style="font-weight:400;color:#aaa;font-size:.65rem;">· ${c.city}</span></div>
      <div class="fc-svc">✅ Đã hoàn thành: ${c.service}</div>
      <div class="fc-meta">⏱ ${c.time}</div>
    </div>
    <span class="fc-check">✔</span>
  `;
  container.appendChild(item);

  setTimeout(() => {
    item.style.animation = 'fcSlideOut .35s ease forwards';
    setTimeout(() => { if (item.parentNode) item.remove(); }, 380);
  }, 4500);
}

function start() {
  showNext();
  // Random interval 8-14s
  function loop() {
    const delay = 8000 + Math.random() * 6000;
    setTimeout(() => { showNext(); loop(); }, delay);
  }
  loop();
}

// Start after page fully loaded + 2s delay
if (document.readyState === 'complete') {
  setTimeout(start, 2000);
} else {
  window.addEventListener('load', () => setTimeout(start, 2000));
}
})();
