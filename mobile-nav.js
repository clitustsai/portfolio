// ========== MOBILE BOTTOM NAVIGATION ==========
(function () {
  'use strict';

  // Xác định trang hiện tại
  const path = location.pathname.split('/').pop() || 'index.html';
  const navItems = [
    { href: 'index.html',   icon: 'fas fa-home',        label: 'Trang Chủ', match: ['index.html', ''] },
    { href: 'blog.html',    icon: 'fas fa-blog',         label: 'Blog',      match: ['blog.html', 'blog-post.html'] },
    { href: 'tools.html',   icon: 'fas fa-robot',        label: 'AI Tools',  match: ['tools.html'] },
    { href: 'arcade.html',  icon: 'fas fa-gamepad',      label: 'Arcade',    match: ['arcade.html'] },
    { href: 'services.html',icon: 'fas fa-shopping-bag', label: 'Dịch Vụ',  match: ['services.html', 'payment.html'] },
  ];

  // Inject CSS link
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = 'mobile-ux.css';
  document.head.appendChild(link);

  // Build nav HTML
  const nav = document.createElement('nav');
  nav.id = 'mobile-bottom-nav';
  nav.setAttribute('aria-label', 'Mobile navigation');
  nav.innerHTML = `<div class="mbn-inner">${
    navItems.map(item => {
      const isActive = item.match.includes(path);
      return `<a href="${item.href}" class="mbn-item${isActive ? ' active' : ''}" aria-label="${item.label}">
        <i class="${item.icon}" aria-hidden="true"></i>
        <span>${item.label}</span>
      </a>`;
    }).join('')
  }</div>`;

  document.body.appendChild(nav);

  // ===== INJECT OVERRIDE CSS LAST (sau tất cả JS) để đảm bảo thắng =====
  // Chỉ áp dụng trên mobile
  if (window.innerWidth <= 768 || ('ontouchstart' in window)) {
    const applyOverride = () => {
      let el = document.getElementById('mbn-override');
      if (!el) { el = document.createElement('style'); el.id = 'mbn-override'; document.body.appendChild(el); }
      el.textContent = `
        /* === FLOATING BUTTONS — tách biệt, không đè nhau === */
        /* Bên PHẢI (từ dưới lên): Chat → Recommend → Back-to-top */
        #cw-fab        { bottom: 76px  !important; right: 14px !important; }
        #cw-box        { bottom: 140px !important; right: 8px  !important; height: calc(100vh - 160px) !important; }
        #rec-toggle    { bottom: 140px !important; right: 14px !important; }
        #rec-panel     { bottom: 200px !important; right: 14px !important; }
        #backToTop, .back-to-top { bottom: 210px !important; right: 14px !important; }

        /* Bên TRÁI (từ dưới lên): FOMO toast → Bell */
        #la-toast-wrap { bottom: 76px  !important; left: 12px  !important; }
        #pn-bell       { bottom: 148px !important; left: 12px  !important; }

        /* Banner push notification — đẩy lên trên bottom nav */
        #pn-banner     { bottom: 56px  !important; }

        /* Body padding cho bottom nav */
        body { padding-bottom: calc(56px + env(safe-area-inset-bottom, 0px)) !important; }
      `;
    };
    // Chạy ngay và sau khi load xong để đảm bảo thắng mọi JS inject CSS
    applyOverride();
    window.addEventListener('load', applyOverride);
    setTimeout(applyOverride, 500);
  }

  // Haptic feedback on tap (if supported)
  nav.querySelectorAll('.mbn-item').forEach(item => {
    item.addEventListener('click', () => {
      if (navigator.vibrate) navigator.vibrate(10);
    });
  });
})();
