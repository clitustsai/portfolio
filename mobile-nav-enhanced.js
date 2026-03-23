// ========== MOBILE BOTTOM NAVIGATION v2 - Enhanced ==========
(function () {
  'use strict';

  // Detect mobile/touch device
  const isMobile = () => {
    return window.innerWidth <= 768 || 
           ('ontouchstart' in window) || 
           navigator.maxTouchPoints > 0 ||
           navigator.msMaxTouchPoints > 0;
  };

  // Current page detection
  const path = location.pathname.split('/').pop() || 'index.html';
  
  const navItems = [
    { 
      href: 'index.html',   
      icon: 'fas fa-home',        
      label: 'Trang Chủ', 
      match: ['index.html', ''],
      title: 'Về trang chủ'
    },
    { 
      href: 'blog.html',    
      icon: 'fas fa-blog',         
      label: 'Blog',      
      match: ['blog.html', 'blog-post.html'],
      title: 'Đọc blog lập trình'
    },
    { 
      href: 'tools.html',   
      icon: 'fas fa-robot',        
      label: 'AI Tools',  
      match: ['tools.html'],
      title: 'Dùng công cụ AI'
    },
    { 
      href: 'arcade.html',  
      icon: 'fas fa-gamepad',      
      label: 'Arcade',    
      match: ['arcade.html'],
      title: 'Chơi game'
    },
    { 
      href: 'services.html',
      icon: 'fas fa-shopping-bag', 
      label: 'Dịch Vụ',  
      match: ['services.html', 'payment.html'],
      title: 'Xem dịch vụ'
    },
  ];

  // Only initialize on mobile
  if (!isMobile()) return;

  // Inject mobile CSS styles
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = 'mobile-ux.css';
  link.media = '(max-width: 768px)';
  document.head.appendChild(link);

  // Build bottom navigation
  const nav = document.createElement('nav');
  nav.id = 'mobile-bottom-nav';
  nav.setAttribute('aria-label', 'Điều hướng di động');
  nav.setAttribute('role', 'navigation');
  
  nav.innerHTML = `<div class="mbn-inner" role="menubar">${
    navItems.map(item => {
      const isActive = item.match.includes(path);
      return `<a href="${item.href}" 
              class="mbn-item${isActive ? ' active' : ''}" 
              aria-label="${item.label}" 
              title="${item.title}"
              role="menuitem"
              data-page="${item.href}">
        <i class="${item.icon}" aria-hidden="true"></i>
        <span class="mbn-label">${item.label}</span>
      </a>`;
    }).join('')
  }</div>`;

  document.body.appendChild(nav);

  // Apply safe area padding
  const applyMobilePadding = () => {
    let styleEl = document.getElementById('mbn-padding-style');
    if (!styleEl) {
      styleEl = document.createElement('style');
      styleEl.id = 'mbn-padding-style';
      document.head.appendChild(styleEl);
    }
    
    const bottomNavHeight = 56;
    const safeAreaBottom = 'env(safe-area-inset-bottom, 0px)';
    
    styleEl.textContent = `
      body {
        padding-bottom: calc(${bottomNavHeight}px + ${safeAreaBottom}) !important;
      }
      
      @media (orientation: landscape) and (max-height: 600px) {
        body { padding-bottom: calc(48px + ${safeAreaBottom}) !important; }
        #mobile-bottom-nav { height: 48px; }
        .mbn-item { font-size: 0.55rem; }
      }
    `;
  };
  
  applyMobilePadding();
  window.addEventListener('load', applyMobilePadding);
  window.addEventListener('orientationchange', applyMobilePadding);
  window.addEventListener('resize', applyMobilePadding);

  // Touch interactions with haptic feedback
  const items = nav.querySelectorAll('.mbn-item');
  
  items.forEach(item => {
    // Haptic feedback on tap
    item.addEventListener('click', (e) => {
      // Vibrate if supported (10ms short vibration)
      if (navigator.vibrate) {
        navigator.vibrate(10);
      }
      
      // Add visual feedback
      item.style.transform = 'scale(0.95)';
      setTimeout(() => {
        item.style.transform = '';
      }, 100);
    });
    
    // Touch feedback
    item.addEventListener('touchstart', () => {
      item.style.opacity = '0.7';
    }, { passive: true });
    
    item.addEventListener('touchend', () => {
      item.style.opacity = '';
    }, { passive: true });
    
    // Prevent default hover on touch devices
    if ('ontouchstart' in window) {
      item.addEventListener('mouseenter', (e) => {
        e.preventDefault();
      });
    }
  });

  // Keyboard accessibility
  items.forEach((item, index) => {
    item.addEventListener('keydown', (e) => {
      let nextIndex;
      
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        nextIndex = (index + 1) % items.length;
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        nextIndex = (index - 1 + items.length) % items.length;
      } else if (e.key === 'Home') {
        nextIndex = 0;
      } else if (e.key === 'End') {
        nextIndex = items.length - 1;
      }
      
      if (nextIndex !== undefined) {
        e.preventDefault();
        items[nextIndex].focus();
      }
    });
  });

  // Smooth scroll behavior for better UX
  document.documentElement.style.scrollBehavior = 'smooth';

  // Handle visibility change (pause scrolling when tab is hidden)
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      document.documentElement.style.scrollBehavior = 'auto';
    } else {
      document.documentElement.style.scrollBehavior = 'smooth';
    }
  });

  // Prevent double tap zoom - use passive listener to avoid blocking
  document.addEventListener('touchstart', () => {}, { passive: true });
})();
