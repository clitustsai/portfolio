// ========== MOBILE BOTTOM NAVIGATION ==========
(function () {
  'use strict';

  console.log('[mobile-nav.js] Script iniciado');

  // Hàm khởi tạo nav
  const initNav = () => {
    console.log('[mobile-nav.js] Tentando inicializar nav...');
    
    // Check if nav already exists
    if (document.getElementById('mobile-bottom-nav')) {
      console.log('[mobile-nav.js] Nav já existe, pulando');
      return;
    }

    // Verificar se body existe
    if (!document.body) {
      console.log('[mobile-nav.js] Body não existe ainda, adiando...');
      setTimeout(initNav, 50);
      return;
    }

    // Xác định trang hiện tại
    const path = location.pathname.split('/').pop() || 'index.html';
    const navItems = [
      { href: 'index.html',   icon: 'fas fa-home',        label: 'Trang Chủ', match: ['index.html', ''] },
      { href: 'blog.html',    icon: 'fas fa-blog',         label: 'Blog',      match: ['blog.html', 'blog-post.html'] },
      { href: 'tools.html',   icon: 'fas fa-robot',        label: 'AI Tools',  match: ['tools.html'] },
      { href: 'arcade.html',  icon: 'fas fa-gamepad',      label: 'Arcade',    match: ['arcade.html'] },
      { href: 'services.html',icon: 'fas fa-shopping-bag', label: 'Dịch Vụ',  match: ['services.html', 'payment.html'] },
    ];

    console.log('[mobile-nav.js] Current page:', path);

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

    try {
      document.body.appendChild(nav);
      console.log('[mobile-nav.js] ✅ Nav element successfully appended');
    } catch (e) {
      console.error('[mobile-nav.js] ❌ Error appending nav:', e);
      setTimeout(initNav, 100);
      return;
    }

    // Add padding for bottom nav trên mobile
    const isMobile = window.innerWidth <= 768 || ('ontouchstart' in window);
    console.log('[mobile-nav.js] Is mobile:', isMobile, '(width:', window.innerWidth, ')');
    
    if (isMobile) {
      const applyPadding = () => {
        let el = document.getElementById('mbn-override');
        if (!el) { 
          el = document.createElement('style'); 
          el.id = 'mbn-override'; 
          document.head.appendChild(el); 
        }
        el.textContent = `body { padding-bottom: calc(56px + env(safe-area-inset-bottom, 0px)) !important; }`;
        console.log('[mobile-nav.js] Padding applied to body');
      };
      applyPadding();
      window.addEventListener('load', applyPadding);
      window.addEventListener('resize', applyPadding);
    }

    // Haptic feedback on tap (if supported)
    nav.querySelectorAll('.mbn-item').forEach(item => {
      item.addEventListener('click', () => {
        if (navigator.vibrate) {
          navigator.vibrate(10);
          console.log('[mobile-nav.js] Haptic feedback triggered');
        }
      });
    });

    console.log('[mobile-nav.js] ✅ Mobile nav fully initialized');
    
    // Verificar visibilidade
    setTimeout(() => {
      const navEl = document.getElementById('mobile-bottom-nav');
      if (navEl) {
        const style = window.getComputedStyle(navEl);
        console.log('[mobile-nav.js] Nav computed display:', style.display);
        console.log('[mobile-nav.js] Nav computed visibility:', style.visibility);
      }
    }, 500);
  };

  // Estratégia de inicialização múltipla para garantir sucesso
  
  // 1. Tentar inicializar imediatamente
  console.log('[mobile-nav.js] Document.readyState:', document.readyState);
  initNav();

  // 2. Se falhar, tentar no DOMContentLoaded
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initNav);
  }

  // 3. Se falhar, tentar no load
  window.addEventListener('load', initNav);

  // 4. Tentar regularmente nos primeiros segundos
  let attempts = 0;
  const retryInterval = setInterval(() => {
    if (document.getElementById('mobile-bottom-nav')) {
      clearInterval(retryInterval);
    } else if (attempts < 10) {
      initNav();
      attempts++;
    } else {
      clearInterval(retryInterval);
      console.error('[mobile-nav.js] ❌ Failed to initialize nav after 10 attempts');
    }
  }, 200);
})();
