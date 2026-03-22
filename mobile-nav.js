// ========== MOBILE BOTTOM NAVIGATION ==========
(function () {
  'use strict';

  // Chỉ inject trên mobile
  if (window.innerWidth > 768 && !('ontouchstart' in window)) return;

  // Xác định trang hiện tại
  const path = location.pathname.split('/').pop() || 'index.html';
  const navItems = [
    { href: 'index.html',   icon: 'fas fa-home',        label: 'Trang Chủ', match: ['index.html', ''] },
    { href: 'blog.html',    icon: 'fas fa-blog',         label: 'Blog',      match: ['blog.html', 'blog-post.html'] },
    { href: 'tools.html',   icon: 'fas fa-robot',        label: 'AI Tools',  match: ['tools.html'] },
    { href: 'arcade.html',  icon: 'fas fa-gamepad',      label: 'Arcade',    match: ['arcade.html'] },
    { href: 'services.html',icon: 'fas fa-shopping-bag', label: 'Dịch Vụ',  match: ['services.html', 'payment.html'] },
  ];

  // Inject CSS
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

  // Haptic feedback on tap (if supported)
  nav.querySelectorAll('.mbn-item').forEach(item => {
    item.addEventListener('click', () => {
      if (navigator.vibrate) navigator.vibrate(10);
    });
  });
})();
