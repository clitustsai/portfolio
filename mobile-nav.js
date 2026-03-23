// ========== MOBILE BOTTOM NAVIGATION ==========
(function () {
  'use strict';

  const initNav = () => {
    if (document.getElementById('mobile-bottom-nav')) return;
    if (!document.body) { setTimeout(initNav, 50); return; }

    const path = location.pathname.split('/').pop() || 'index.html';
    const navItems = [
      { href: 'index.html',    icon: 'fas fa-home',        label: 'Trang Chủ', match: ['index.html', ''] },
      { href: 'blog.html',     icon: 'fas fa-blog',         label: 'Blog',      match: ['blog.html', 'blog-post.html'] },
      { href: 'tools.html',    icon: 'fas fa-robot',        label: 'AI Tools',  match: ['tools.html'] },
      { href: 'arcade.html',   icon: 'fas fa-gamepad',      label: 'Arcade',    match: ['arcade.html'] },
      { href: 'services.html', icon: 'fas fa-shopping-bag', label: 'Dịch Vụ',  match: ['services.html', 'payment.html'] },
    ];

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

    try {
      document.body.appendChild(nav);
    } catch (e) {
      setTimeout(initNav, 100);
      return;
    }

    // Click handlers
    nav.querySelectorAll('.mbn-item').forEach(item => {
      item.addEventListener('click', (e) => {
        // Nếu đang ở trang này → scroll lên top
        if (item.classList.contains('active')) {
          e.preventDefault();
          window.scrollTo({ top: 0, behavior: 'smooth' });
          return;
        }
        // Haptic feedback
        if (navigator.vibrate) navigator.vibrate(10);
        // Update active state
        nav.querySelectorAll('.mbn-item').forEach(el => el.classList.remove('active'));
        item.classList.add('active');
      });
    });
  };

  // Khởi tạo
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initNav);
  } else {
    initNav();
  }
  window.addEventListener('load', initNav);

  // Retry nếu chưa có
  let attempts = 0;
  const retryInterval = setInterval(() => {
    if (document.getElementById('mobile-bottom-nav')) {
      clearInterval(retryInterval);
    } else if (attempts < 10) {
      initNav();
      attempts++;
    } else {
      clearInterval(retryInterval);
    }
  }, 200);
})();
