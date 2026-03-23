// ========== MOBILE BOTTOM NAVIGATION - ENHANCED VERSION ==========
(function () {
  'use strict';

  function initNav() {
    // Prevent duplicate nav
    if (document.getElementById('mobile-bottom-nav')) {
      console.log('[mobile-nav] Nav already exists');
      return;
    }

    // Wait for body to be ready
    if (!document.body) {
      console.log('[mobile-nav] Body not ready, retrying...');
      setTimeout(initNav, 50);
      return;
    }

    console.log('[mobile-nav] Initializing...', document.readyState);

    const path = location.pathname.split('/').pop() || 'index.html';
    const items = [
      { href: 'index.html',   icon: 'fas fa-home',        label: 'Trang Chủ', match: ['index.html', ''] },
      { href: 'blog.html',    icon: 'fas fa-blog',        label: 'Blog',      match: ['blog.html', 'blog-post.html'] },
      { href: 'tools.html',   icon: 'fas fa-robot',       label: 'AI Tools',  match: ['tools.html'] },
      { href: 'arcade.html',  icon: 'fas fa-gamepad',     label: 'Arcade',    match: ['arcade.html'] },
      { href: 'services.html',icon: 'fas fa-shopping-bag',label: 'Dịch Vụ',   match: ['services.html', 'payment.html'] },
    ];

    // Create nav element with aggressive inline styles
    const nav = document.createElement('nav');
    nav.id = 'mobile-bottom-nav';
    nav.setAttribute('aria-label', 'Mobile navigation');
    
    // Maximum force display settings
    nav.style.cssText = `
      display: block !important;
      visibility: visible !important;
      opacity: 1 !important;
      position: fixed !important;
      bottom: 0 !important;
      left: 0 !important;
      right: 0 !important;
      width: 100% !important;
      height: 56px !important;
      z-index: 999999 !important;
      background: rgba(255,255,255,0.95) !important;
      backdrop-filter: blur(20px) !important;
      border-top: 1px solid rgba(102,126,234,0.12) !important;
      box-shadow: 0 -4px 24px rgba(0,0,0,0.08) !important;
      pointer-events: auto !important;
      touch-action: manipulation !important;
      margin: 0 !important;
      padding: 0 !important;
    `;

    // Build nav HTML
    nav.innerHTML = `<div class="mbn-inner" style="display:flex !important; justify-content:space-around !important; align-items:center !important; width:100% !important; height:100% !important; margin:0 !important; padding:0 !important;">
      ${items.map(item => {
        const isActive = item.match.includes(path);
        return `<a href="${item.href}" class="mbn-item${isActive ? ' active' : ''}" aria-label="${item.label}" style="display:flex !important; flex-direction:column !important; align-items:center !important; justify-content:center !important; flex:auto !important; color:inherit !important; text-decoration:none !important; padding:4px !important; transition:all 0.2s !important;"><i class="${item.icon}" style="font-size:20px !important; margin-bottom:4px !important;"></i><span style="font-size:11px !important; white-space:nowrap !important;">${item.label}</span></a>`;
      }).join('')}
    </div>`;

    // Append to body
    try {
      document.body.appendChild(nav);
      console.log('[mobile-nav] ✅ Nav appended successfully');
    } catch (e) {
      console.error('[mobile-nav] ❌ Error appending nav:', e);
      setTimeout(initNav, 100);
      return;
    }

    // Force visibility check
    setTimeout(() => {
      const navEl = document.getElementById('mobile-bottom-nav');
      if (navEl) {
        const computed = window.getComputedStyle(navEl);
        console.log('[mobile-nav] Computed display:', computed.display);
        console.log('[mobile-nav] Computed z-index:', computed.zIndex);
        console.log('[mobile-nav] Computed visibility:', computed.visibility);
        console.log('[mobile-nav] Element position:', { bottom: computed.bottom, position: computed.position });
      }
    }, 100);

    // Add click handlers to hide panels
    nav.querySelectorAll('.mbn-item').forEach((item, idx) => {
      item.style.pointerEvents = 'auto';
      item.style.cursor = 'pointer';
      
      item.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        
        // Hide all suggestion/recommendation panels
        const panels = document.querySelectorAll('#rec-panel, [id*="goi"], [id*="suggest"], .pn-toast-preview, [id*="tooltip"]');
        panels.forEach(p => {
          p.style.display = 'none !important';
          p.style.visibility = 'hidden !important';
          p.style.opacity = '0 !important';
        });
        
        // Update active state
        nav.querySelectorAll('.mbn-item').forEach(el => {
          el.classList.remove('active');
          el.style.color = '';
        });
        item.classList.add('active');
        
        // Haptic feedback
        if (navigator.vibrate) {
          navigator.vibrate([10, 5, 10]);
        }
        
        console.log('[mobile-nav] Clicked:', item.textContent.trim());
      });
    });

    // Add override CSS to ensure body padding and nav visibility
    if (!document.getElementById('mbn-override-css')) {
      const style = document.createElement('style');
      style.id = 'mbn-override-css';
      style.textContent = `
        body { 
          padding-bottom: 56px !important; 
        }
        #mobile-bottom-nav {
          display: block !important;
          visibility: visible !important;
          opacity: 1 !important;
          z-index: 999999 !important;
        }
        #mobile-bottom-nav .mbn-item {
          pointer-events: auto !important;
          cursor: pointer !important;
        }
        @media (max-width:768px) {
          body { 
            padding-bottom: 56px !important; 
          }
          #mobile-bottom-nav {
            display: block !important;
            visibility: visible !important;
            opacity: 1 !important;
          }
        }
      `;
      document.head.appendChild(style);
      console.log('[mobile-nav] ✅ Override CSS added');
    }

    console.log('[mobile-nav] ✅ Init complete');
  }

  // Multiple initialization strategies
  console.log('[mobile-nav] Script loaded, readyState:', document.readyState);
  
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initNav);
  } else {
    initNav();
  }
  
  window.addEventListener('load', initNav);
  
  // Retry mechanism
  let retries = 0;
  const retryInterval = setInterval(() => {
    if (document.getElementById('mobile-bottom-nav') && window.getComputedStyle(document.getElementById('mobile-bottom-nav')).display !== 'none') {
      console.log('[mobile-nav] ✅ Nav is visible, clearing retry');
      clearInterval(retryInterval);
    } else if (retries < 5) {
      console.log('[mobile-nav] Retry', retries + 1);
      initNav();
      retries++;
    } else {
      clearInterval(retryInterval);
      console.error('[mobile-nav] ❌ Failed after retries');
    }
  }, 200);
})();