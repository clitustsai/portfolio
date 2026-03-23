// ========== RETENTION ENGINE ==========
// Các tính năng giữ chân người dùng ở lại web lâu hơn

(function () {
  'use strict';

  // Fallback toast nếu trang không có showToast
  function _toast(msg, type, duration) {
    if (typeof showToast === 'function') { showToast(msg, type, duration); return; }
    let c = document.getElementById('_ret_toast_c');
    if (!c) {
      c = document.createElement('div');
      c.id = '_ret_toast_c';
      c.style.cssText = 'position:fixed;bottom:80px;right:16px;z-index:99997;display:flex;flex-direction:column;gap:.5rem;pointer-events:none';
      document.body.appendChild(c);
    }
    const t = document.createElement('div');
    const colors = { success:'#4ade80', info:'#60a5fa', error:'#f87171', warning:'#fbbf24' };
    t.style.cssText = `background:#1a1a2e;border:1px solid ${colors[type]||'#667eea'};color:#fff;padding:.65rem 1rem;border-radius:12px;font-size:.85rem;font-weight:600;max-width:280px;box-shadow:0 4px 16px rgba(0,0,0,.3);animation:_toastIn .3s ease;pointer-events:auto`;
    t.textContent = msg;
    if (!document.getElementById('_ret_toast_style')) {
      const s = document.createElement('style');
      s.id = '_ret_toast_style';
      s.textContent = '@keyframes _toastIn{from{opacity:0;transform:translateX(20px)}to{opacity:1;transform:none}}';
      document.head.appendChild(s);
    }
    c.appendChild(t);
    setTimeout(() => { t.style.opacity='0'; t.style.transition='opacity .3s'; setTimeout(()=>t.remove(),300); }, duration||3000);
  }

  // ── 1. SCROLL PROGRESS BAR ──────────────────────────────
  function initScrollProgress() {
    const bar = document.createElement('div');
    bar.id = 'scroll-progress-bar';
    bar.style.cssText = `
      position:fixed;top:0;left:0;height:3px;width:0%;z-index:99999;
      background:linear-gradient(90deg,#667eea,#f093fb,#f5576c);
      transition:width .1s linear;pointer-events:none;
      box-shadow:0 0 8px rgba(102,126,234,.6);
    `;
    document.body.appendChild(bar);
    window.addEventListener('scroll', () => {
      const scrolled = document.documentElement.scrollTop;
      const total = document.documentElement.scrollHeight - window.innerHeight;
      bar.style.width = total > 0 ? (scrolled / total * 100) + '%' : '0%';
    }, { passive: true });
  }

  // ── 2. DAILY STREAK / CHECK-IN ──────────────────────────
  function initDailyStreak() {
    const KEY = 'clitus_streak';
    const data = JSON.parse(localStorage.getItem(KEY) || '{"streak":0,"last":"","total":0}');
    const today = new Date().toISOString().slice(0, 10);
    if (data.last === today) return; // đã check-in hôm nay

    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    data.streak = data.last === yesterday ? data.streak + 1 : 1;
    data.last = today;
    data.total = (data.total || 0) + 1;
    localStorage.setItem(KEY, JSON.stringify(data));

    // Hiện toast streak sau 3 giây
    setTimeout(() => {
      const emoji = data.streak >= 7 ? '🔥' : data.streak >= 3 ? '⚡' : '✨';
      const msg = data.streak > 1
        ? `${emoji} Streak ${data.streak} ngày liên tiếp! Bạn thật tuyệt!`
        : '👋 Chào mừng trở lại! Hôm nay có gì mới nhé.';
      _toast(msg, 'success', 4000);
    }, 3000);
  }

  // ── 3. EXIT-INTENT POPUP ────────────────────────────────
  function initExitIntent() {
    if (sessionStorage.getItem('exit_shown')) return;
    let triggered = false;

    const overlay = document.createElement('div');
    overlay.id = 'exit-intent-overlay';
    overlay.innerHTML = `
      <div id="exit-intent-box">
        <button id="exit-close" aria-label="Đóng">×</button>
        <div style="font-size:2.5rem;margin-bottom:.75rem">👋</div>
        <h3>Khoan đã!</h3>
        <p>Bạn chưa khám phá hết những thứ hay ho ở đây đâu nhé.</p>
        <div id="exit-links">
          <a href="arcade.html">🎮 Chơi Arcade & Kiếm Coins</a>
          <a href="tools.html">🤖 Thử AI Tools miễn phí</a>
          <a href="blog.html">📖 Đọc Blog mới nhất</a>
          <a href="ads.html">📢 Đăng quảng cáo</a>
        </div>
        <button id="exit-stay">Ở lại khám phá thêm</button>
      </div>`;
    document.body.appendChild(overlay);

    function show() {
      if (triggered) return;
      triggered = true;
      sessionStorage.setItem('exit_shown', '1');
      overlay.classList.add('open');
    }
    function hide() { overlay.classList.remove('open'); }

    // Desktop: mouse ra khỏi viewport trên
    document.addEventListener('mouseleave', e => { if (e.clientY < 10) show(); });
    // Mobile: back button / visibility change
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') sessionStorage.setItem('exit_shown', '1');
    });

    overlay.addEventListener('click', e => { if (e.target === overlay) hide(); });
    document.getElementById('exit-close').addEventListener('click', hide);
    document.getElementById('exit-stay').addEventListener('click', hide);
  }

  // ── 4. TIME-ON-SITE MILESTONE TOASTS ────────────────────
  function initTimeMilestones() {
    const milestones = [
      { sec: 60,  msg: '⏱️ Bạn đã ở đây 1 phút — cảm ơn bạn!', type: 'info' },
      { sec: 180, msg: '🌟 3 phút rồi! Thử khám phá AI Tools nhé?', type: 'success' },
      { sec: 300, msg: '🔥 5 phút! Bạn là fan cứng rồi đó 😄', type: 'success' },
    ];
    let idx = 0;
    const timer = setInterval(() => {
      if (idx >= milestones.length) { clearInterval(timer); return; }
      const m = milestones[idx++];
      _toast(m.msg, m.type, 5000);
    }, milestones[idx]?.sec * 1000 || 60000);

    // Dùng setTimeout riêng cho từng milestone
    clearInterval(timer);
    milestones.forEach(m => {
      setTimeout(() => {
        _toast(m.msg, m.type, 5000);
      }, m.sec * 1000);
    });
  }

  // ── 5. READING PROGRESS + "CUỘN XUỐNG" HINT ────────────
  function initScrollHint() {
    if (sessionStorage.getItem('scroll_hint_shown')) return;
    const hint = document.createElement('div');
    hint.id = 'scroll-hint';
    hint.innerHTML = `<span>Cuộn xuống để khám phá</span><i class="fas fa-chevron-down"></i>`;
    hint.style.cssText = `
      position:fixed;bottom:90px;left:50%;transform:translateX(-50%);
      background:rgba(102,126,234,.9);color:#fff;padding:.5rem 1.2rem;
      border-radius:50px;font-size:.82rem;font-weight:700;z-index:9990;
      display:flex;align-items:center;gap:.5rem;cursor:pointer;
      animation:bounceHint 1.5s ease infinite;backdrop-filter:blur(8px);
      box-shadow:0 4px 16px rgba(102,126,234,.4);
    `;
    document.body.appendChild(hint);

    const style = document.createElement('style');
    style.textContent = `@keyframes bounceHint{0%,100%{transform:translateX(-50%) translateY(0)}50%{transform:translateX(-50%) translateY(-8px)}}`;
    document.head.appendChild(style);

    function removeHint() {
      hint.style.opacity = '0';
      hint.style.transition = 'opacity .4s';
      setTimeout(() => hint.remove(), 400);
      sessionStorage.setItem('scroll_hint_shown', '1');
    }
    hint.addEventListener('click', () => { window.scrollBy({ top: 400, behavior: 'smooth' }); removeHint(); });
    window.addEventListener('scroll', () => { if (window.scrollY > 100) removeHint(); }, { once: true, passive: true });
    setTimeout(removeHint, 6000);
  }

  // ── 6. "QUAY LẠI" NOTIFICATION SAU KHI RỜI TAB ─────────
  function initTabTitleFlash() {
    const original = document.title;
    let flashTimer = null;
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        let on = true;
        flashTimer = setInterval(() => {
          document.title = on ? '👋 Quay lại nhé! — Clitus PC' : original;
          on = !on;
        }, 1500);
      } else {
        clearInterval(flashTimer);
        document.title = original;
      }
    });
  }

  // ── 7. STICKY "KHÁM PHÁ THÊM" MINI BANNER ───────────────
  function initExploreBanner() {
    if (sessionStorage.getItem('explore_banner_closed')) return;
    const pages = [
      { href: 'arcade.html', icon: '🎮', label: 'Arcade & Coins' },
      { href: 'tools.html',  icon: '🤖', label: 'AI Tools' },
      { href: 'blog.html',   icon: '📖', label: 'Blog' },
      { href: 'ads.html',    icon: '📢', label: 'Đặt Ads' },
    ];
    // Lọc bỏ trang hiện tại
    const cur = location.pathname.split('/').pop() || 'index.html';
    const filtered = pages.filter(p => p.href !== cur);

    const banner = document.createElement('div');
    banner.id = 'explore-banner';
    banner.innerHTML = `
      <span style="font-size:.75rem;color:rgba(255,255,255,.5);margin-right:.5rem;white-space:nowrap">Khám phá:</span>
      ${filtered.map(p => `<a href="${p.href}" style="display:inline-flex;align-items:center;gap:.3rem;padding:.3rem .75rem;background:rgba(255,255,255,.1);border-radius:50px;color:#fff;text-decoration:none;font-size:.78rem;font-weight:600;white-space:nowrap;transition:background .2s" onmouseover="this.style.background='rgba(255,255,255,.2)'" onmouseout="this.style.background='rgba(255,255,255,.1)'">${p.icon} ${p.label}</a>`).join('')}
      <button id="explore-close" style="background:none;border:none;color:rgba(255,255,255,.4);font-size:1.1rem;cursor:pointer;padding:0 .25rem;line-height:1;margin-left:.25rem">×</button>
    `;
    banner.style.cssText = `
      position:fixed;bottom:0;left:0;right:0;z-index:9980;
      background:linear-gradient(135deg,rgba(15,12,41,.95),rgba(48,43,99,.95));
      backdrop-filter:blur(12px);border-top:1px solid rgba(255,255,255,.1);
      padding:.55rem 1rem;display:flex;align-items:center;gap:.5rem;
      flex-wrap:wrap;justify-content:center;
      transform:translateY(100%);transition:transform .4s cubic-bezier(.34,1.56,.64,1);
    `;
    document.body.appendChild(banner);

    // Hiện sau 15 giây hoặc khi scroll 60%
    function showBanner() {
      banner.style.transform = 'translateY(0)';
    }
    setTimeout(showBanner, 15000);
    window.addEventListener('scroll', () => {
      const pct = window.scrollY / (document.documentElement.scrollHeight - window.innerHeight);
      if (pct > 0.6) showBanner();
    }, { passive: true });

    document.getElementById('explore-close').addEventListener('click', () => {
      banner.style.transform = 'translateY(100%)';
      sessionStorage.setItem('explore_banner_closed', '1');
    });
  }

  // ── 8. IDLE DETECTION — nhắc sau 2 phút không tương tác ─
  function initIdleNudge() {
    const IDLE_MS = 2 * 60 * 1000;
    let idleTimer;
    let nudgeShown = false;
    const reset = () => {
      clearTimeout(idleTimer);
      idleTimer = setTimeout(() => {
        if (nudgeShown) return;
        nudgeShown = true;
        _toast('💡 Thử khám phá AI Tools hoặc chơi Arcade nhé!', 'info', 6000);
      }, IDLE_MS);
    };
    ['mousemove', 'keydown', 'scroll', 'touchstart', 'click'].forEach(ev =>
      document.addEventListener(ev, reset, { passive: true })
    );
    reset();
  }

  // ── INIT ALL ─────────────────────────────────────────────
  function init() {
    initScrollProgress();
    initDailyStreak();
    initTabTitleFlash();
    initTimeMilestones();
    initIdleNudge();

    // Chỉ chạy trên index.html
    const isIndex = !location.pathname.split('/').pop() || location.pathname.endsWith('index.html') || location.pathname === '/';
    if (isIndex) {
      initExitIntent();
      initScrollHint();
      initExploreBanner();
    } else {
      initExploreBanner();
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
