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
  position:fixed;bottom:90px;left:20px;z-index:9970;
  max-width:300px;pointer-events:none;
}
.fc-item {
  background:#fff;border-radius:16px;padding:.85rem 1rem;
  box-shadow:0 8px 32px rgba(0,0,0,.15);border:1px solid rgba(102,126,234,.12);
  display:flex;align-items:center;gap:.75rem;
  animation:fcSlideIn .4s cubic-bezier(.34,1.56,.64,1);
  margin-bottom:.5rem;
}
html[data-theme="dark"] .fc-item{background:#1a1a2e;border-color:rgba(102,126,234,.2);}
@keyframes fcSlideIn{from{opacity:0;transform:translateX(-30px) scale(.9)}to{opacity:1;transform:translateX(0) scale(1)}}
@keyframes fcSlideOut{from{opacity:1;transform:translateX(0)}to{opacity:0;transform:translateX(-30px)}}
.fc-avatar{width:38px;height:38px;border-radius:50%;background:linear-gradient(135deg,#667eea,#764ba2);display:flex;align-items:center;justify-content:center;font-size:1.2rem;flex-shrink:0;}
.fc-body{flex:1;min-width:0;}
.fc-name{font-size:.8rem;font-weight:800;color:#1a1a2e;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
html[data-theme="dark"] .fc-name{color:#e8e8ff;}
.fc-svc{font-size:.72rem;color:#667eea;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.fc-meta{font-size:.68rem;color:#aaa;margin-top:.1rem;}
.fc-check{color:#10b981;font-size:.9rem;flex-shrink:0;}
@media(max-width:480px){#fc-toast{left:12px;max-width:calc(100vw - 24px);bottom:140px;}}
`;

const style = document.createElement('style');
style.textContent = css;
document.head.appendChild(style);

const container = document.createElement('div');
container.id = 'fc-toast';
document.body.appendChild(container);

let idx = 0;
function showNext() {
  const c = COMPLETIONS[idx % COMPLETIONS.length];
  idx++;

  const item = document.createElement('div');
  item.className = 'fc-item';
  item.innerHTML = `
    <div class="fc-avatar">${c.avatar}</div>
    <div class="fc-body">
      <div class="fc-name">${c.name} <span style="font-weight:400;color:#aaa;font-size:.68rem;">· ${c.city}</span></div>
      <div class="fc-svc">✅ Đã hoàn thành: ${c.service}</div>
      <div class="fc-meta">⏱ ${c.time}</div>
    </div>
    <i class="fas fa-check-circle fc-check"></i>
  `;
  container.appendChild(item);

  // Auto remove after 4s
  setTimeout(() => {
    item.style.animation = 'fcSlideOut .35s ease forwards';
    setTimeout(() => item.remove(), 350);
  }, 4000);
}

// Start after 3s, then every 8-15s
setTimeout(() => {
  showNext();
  setInterval(showNext, 10000 + Math.random() * 5000);
}, 3000);
})();
