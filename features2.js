// ============================================================
// FEATURES2.JS — Modern UI Features Pack v2
// ============================================================
(function () {
'use strict';

// Shared toast helper
function _toast(msg, type, duration) {
  if (typeof showToast === 'function') { showToast(msg, type, duration); return; }
  let c = document.getElementById('_f2_toast_c');
  if (!c) {
    c = document.createElement('div');
    c.id = '_f2_toast_c';
    c.style.cssText = 'position:fixed;bottom:80px;right:16px;z-index:99997;display:flex;flex-direction:column;gap:.5rem;pointer-events:none';
    document.body.appendChild(c);
  }
  const t = document.createElement('div');
  const colors = { success:'#4ade80', info:'#60a5fa', error:'#f87171', warning:'#fbbf24' };
  t.style.cssText = `background:#1a1a2e;border:1px solid ${colors[type]||'#667eea'};color:#fff;padding:.65rem 1rem;border-radius:12px;font-size:.85rem;font-weight:600;max-width:280px;box-shadow:0 4px 16px rgba(0,0,0,.3);animation:_f2In .3s ease;pointer-events:auto`;
  t.textContent = msg;
  if (!document.getElementById('_f2_style')) {
    const s = document.createElement('style');
    s.id = '_f2_style';
    s.textContent = '@keyframes _f2In{from{opacity:0;transform:translateX(20px)}to{opacity:1;transform:none}}';
    document.head.appendChild(s);
  }
  c.appendChild(t);
  setTimeout(() => { t.style.opacity='0'; t.style.transition='opacity .3s'; setTimeout(()=>t.remove(),300); }, duration||3000);
}

// ── 1. LIVE VISITOR COUNTER ──────────────────────────────────
function initLiveVisitors() {
  const el = document.createElement('div');
  el.id = 'live-visitors';
  el.style.cssText = `
    position:fixed;top:70px;right:16px;z-index:9990;
    background:rgba(15,12,41,.9);border:1px solid rgba(102,126,234,.3);
    color:#fff;padding:.4rem .85rem;border-radius:50px;font-size:.75rem;
    font-weight:700;display:flex;align-items:center;gap:.45rem;
    backdrop-filter:blur(12px);box-shadow:0 4px 16px rgba(0,0,0,.3);
    opacity:0;transition:opacity .5s;pointer-events:none;
  `;
  const count = Math.floor(Math.random() * 18) + 5;
  el.innerHTML = `<span style="width:7px;height:7px;border-radius:50%;background:#4ade80;display:inline-block;animation:livePulse 1.5s ease infinite"></span>${count} người đang xem`;
  document.body.appendChild(el);

  const style = document.createElement('style');
  style.textContent = `@keyframes livePulse{0%,100%{box-shadow:0 0 0 0 rgba(74,222,128,.5)}50%{box-shadow:0 0 0 5px rgba(74,222,128,0)}}`;
  document.head.appendChild(style);

  setTimeout(() => { el.style.opacity = '1'; }, 3000);

  // Fluctuate count every 15-30s
  setInterval(() => {
    const delta = Math.floor(Math.random() * 5) - 2;
    const cur = parseInt(el.textContent) || count;
    const next = Math.max(3, cur + delta);
    el.innerHTML = `<span style="width:7px;height:7px;border-radius:50%;background:#4ade80;display:inline-block;animation:livePulse 1.5s ease infinite"></span>${next} người đang xem`;
  }, 20000);
}

// ── 2. TYPING EFFECT FOR HEADINGS ───────────────────────────
function initTypingEffect() {
  const targets = document.querySelectorAll('[data-typing]');
  if (!targets.length) return;
  targets.forEach(el => {
    const text = el.dataset.typing || el.textContent;
    el.textContent = '';
    el.style.borderRight = '2px solid #667eea';
    let i = 0;
    const timer = setInterval(() => {
      el.textContent += text[i++];
      if (i >= text.length) { clearInterval(timer); setTimeout(() => el.style.borderRight = 'none', 800); }
    }, 60);
  });
}

// ── 3. FLOATING EMOJI RAIN ───────────────────────────────────
function initEmojiRain() {
  const EMOJIS = ['⭐','🚀','💡','🔥','✨','💎','🎯','🌟'];
  function spawnEmoji() {
    const el = document.createElement('div');
    el.textContent = EMOJIS[Math.floor(Math.random() * EMOJIS.length)];
    el.style.cssText = `
      position:fixed;top:-40px;left:${Math.random()*100}vw;
      font-size:${Math.random()*16+14}px;z-index:9;pointer-events:none;
      animation:emojiDrop ${Math.random()*3+4}s linear forwards;
      opacity:${Math.random()*.5+.3};
    `;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 7000);
  }
  const style = document.createElement('style');
  style.textContent = `@keyframes emojiDrop{to{transform:translateY(110vh) rotate(360deg);opacity:0}}`;
  document.head.appendChild(style);
  // Spawn 1 emoji every 4s, max 5 at a time
  setInterval(spawnEmoji, 4000);
}

// ── 4. SMART TOOLTIP SYSTEM ──────────────────────────────────
function initSmartTooltips() {
  const tip = document.createElement('div');
  tip.id = 'smart-tip';
  tip.style.cssText = `
    position:fixed;z-index:99999;background:#1a1a2e;color:#fff;
    padding:.4rem .85rem;border-radius:10px;font-size:.75rem;font-weight:600;
    pointer-events:none;opacity:0;transition:opacity .2s;
    border:1px solid rgba(102,126,234,.4);box-shadow:0 4px 16px rgba(0,0,0,.4);
    max-width:220px;text-align:center;white-space:nowrap;
  `;
  document.body.appendChild(tip);

  document.addEventListener('mouseover', e => {
    const el = e.target.closest('[data-tip],[title]');
    if (!el) return;
    const text = el.dataset.tip || el.title;
    if (!text) return;
    if (el.title) el.removeAttribute('title'); // prevent native tooltip
    tip.textContent = text;
    tip.style.opacity = '1';
  });
  document.addEventListener('mousemove', e => {
    tip.style.left = Math.min(e.clientX + 12, window.innerWidth - 240) + 'px';
    tip.style.top = (e.clientY - 36) + 'px';
  });
  document.addEventListener('mouseout', e => {
    if (!e.target.closest('[data-tip]')) tip.style.opacity = '0';
  });
}

// ── 5. SCROLL-TRIGGERED ANIMATIONS ──────────────────────────
function initScrollReveal() {
  const style = document.createElement('style');
  style.textContent = `
    .sr-hidden{opacity:0;transform:translateY(30px);transition:opacity .6s ease,transform .6s ease}
    .sr-hidden.sr-visible{opacity:1;transform:none}
    .sr-left{opacity:0;transform:translateX(-30px);transition:opacity .6s ease,transform .6s ease}
    .sr-left.sr-visible{opacity:1;transform:none}
    .sr-right{opacity:0;transform:translateX(30px);transition:opacity .6s ease,transform .6s ease}
    .sr-right.sr-visible{opacity:1;transform:none}
  `;
  document.head.appendChild(style);

  // Auto-tag cards, sections, feature items
  document.querySelectorAll('.card,.feature-card,.blog-card,.service-card,.stat-item,.timeline-item,.skill-item').forEach((el, i) => {
    if (!el.classList.contains('sr-hidden') && !el.classList.contains('sr-left') && !el.classList.contains('sr-right')) {
      el.classList.add(i % 3 === 1 ? 'sr-left' : i % 3 === 2 ? 'sr-right' : 'sr-hidden');
      el.style.transitionDelay = (i % 4) * 0.08 + 's';
    }
  });

  const obs = new IntersectionObserver(entries => {
    entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('sr-visible'); obs.unobserve(e.target); } });
  }, { threshold: 0.12 });

  document.querySelectorAll('.sr-hidden,.sr-left,.sr-right').forEach(el => obs.observe(el));
}

// ── 6. MINI SEARCH BAR (/ key) ───────────────────────────────
function initQuickSearch() {
  const overlay = document.createElement('div');
  overlay.id = 'qs-overlay';
  overlay.style.cssText = `
    position:fixed;inset:0;z-index:99998;background:rgba(0,0,0,.6);
    backdrop-filter:blur(8px);display:none;align-items:flex-start;
    justify-content:center;padding-top:15vh;
  `;
  overlay.innerHTML = `
    <div style="background:#1a1a2e;border:1px solid rgba(102,126,234,.4);border-radius:16px;padding:1.25rem;width:min(520px,90vw);box-shadow:0 20px 60px rgba(0,0,0,.5)">
      <div style="display:flex;align-items:center;gap:.75rem;margin-bottom:1rem">
        <i class="fas fa-search" style="color:#667eea;font-size:1rem"></i>
        <input id="qs-input" placeholder="Tìm kiếm nội dung..." style="flex:1;background:none;border:none;outline:none;color:#fff;font-size:1rem;font-weight:500" autocomplete="off">
        <kbd style="background:rgba(255,255,255,.08);color:#aaa;padding:.2rem .5rem;border-radius:6px;font-size:.7rem">ESC</kbd>
      </div>
      <div id="qs-results" style="display:flex;flex-direction:column;gap:.4rem;max-height:300px;overflow-y:auto"></div>
    </div>`;
  document.body.appendChild(overlay);

  const PAGES = [
    { icon:'🏠', title:'Trang chủ', url:'index.html', desc:'Portfolio & giới thiệu' },
    { icon:'🤖', title:'AI Tools', url:'tools.html', desc:'Công cụ AI miễn phí' },
    { icon:'🎮', title:'Arcade', url:'arcade.html', desc:'Game & kiếm Coins' },
    { icon:'📖', title:'Blog', url:'blog.html', desc:'Bài viết kỹ thuật' },
    { icon:'📢', title:'Quảng cáo', url:'ads.html', desc:'Đặt banner & bài PR' },
    { icon:'💳', title:'VIP', url:'payment.html', desc:'Nâng cấp tài khoản' },
    { icon:'📊', title:'Dashboard', url:'dashboard.html', desc:'Thống kê cá nhân' },
    { icon:'🗺️', title:'Roadmap', url:'roadmap.html', desc:'Kế hoạch phát triển' },
  ];

  function renderQs(q) {
    const res = document.getElementById('qs-results');
    const filtered = q ? PAGES.filter(p => (p.title+p.desc).toLowerCase().includes(q.toLowerCase())) : PAGES;
    res.innerHTML = filtered.map(p => `
      <a href="${p.url}" style="display:flex;align-items:center;gap:.75rem;padding:.65rem .85rem;border-radius:10px;text-decoration:none;color:#fff;transition:background .15s" onmouseover="this.style.background='rgba(102,126,234,.15)'" onmouseout="this.style.background='none'">
        <span style="font-size:1.2rem">${p.icon}</span>
        <div><div style="font-weight:700;font-size:.9rem">${p.title}</div><div style="font-size:.75rem;color:#888">${p.desc}</div></div>
      </a>`).join('') || '<div style="padding:1rem;text-align:center;color:#666;font-size:.85rem">Không tìm thấy</div>';
  }

  function openQs() { overlay.style.display = 'flex'; document.getElementById('qs-input').value = ''; renderQs(''); document.getElementById('qs-input').focus(); }
  function closeQs() { overlay.style.display = 'none'; }

  document.getElementById('qs-input').addEventListener('input', e => renderQs(e.target.value));
  document.addEventListener('keydown', e => {
    const tag = document.activeElement?.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA') return;
    if (e.key === '/') { e.preventDefault(); openQs(); }
    if (e.key === 'Escape') closeQs();
  });
  overlay.addEventListener('click', e => { if (e.target === overlay) closeQs(); });
  document.getElementById('qs-input').addEventListener('keydown', e => { if (e.key === 'Escape') closeQs(); });
}

// ── 7. PARTICLE CURSOR TRAIL ─────────────────────────────────
function initCursorTrail() {
  if (window.innerWidth < 768) return; // desktop only
  const colors = ['#667eea','#764ba2','#f093fb','#f5576c','#4ade80'];
  document.addEventListener('mousemove', e => {
    const dot = document.createElement('div');
    dot.style.cssText = `
      position:fixed;left:${e.clientX}px;top:${e.clientY}px;
      width:6px;height:6px;border-radius:50%;pointer-events:none;z-index:99999;
      background:${colors[Math.floor(Math.random()*colors.length)]};
      transform:translate(-50%,-50%);
      animation:trailFade .6s ease forwards;
    `;
    document.body.appendChild(dot);
    setTimeout(() => dot.remove(), 600);
  }, { passive: true });

  const style = document.createElement('style');
  style.textContent = `@keyframes trailFade{to{opacity:0;transform:translate(-50%,-50%) scale(0)}}`;
  document.head.appendChild(style);
}

// ── 8. FLOATING CLOCK WIDGET ─────────────────────────────────
function initFloatingClock() {
  const el = document.createElement('div');
  el.id = 'float-clock';
  el.style.cssText = `
    position:fixed;bottom:140px;left:16px;z-index:9980;
    background:rgba(15,12,41,.85);border:1px solid rgba(102,126,234,.25);
    color:#fff;padding:.45rem .9rem;border-radius:50px;font-size:.78rem;
    font-weight:700;backdrop-filter:blur(12px);cursor:default;
    box-shadow:0 4px 16px rgba(0,0,0,.3);letter-spacing:.03em;
    opacity:0;transition:opacity .5s;
  `;
  document.body.appendChild(el);

  function tick() {
    const now = new Date();
    const h = String(now.getHours()).padStart(2,'0');
    const m = String(now.getMinutes()).padStart(2,'0');
    const s = String(now.getSeconds()).padStart(2,'0');
    el.textContent = `🕐 ${h}:${m}:${s}`;
  }
  tick();
  setInterval(tick, 1000);
  setTimeout(() => { el.style.opacity = '1'; }, 4000);
}

// ── 9. WEATHER WIDGET (IP-based) ─────────────────────────────
function initWeatherWidget() {
  const el = document.createElement('div');
  el.id = 'weather-widget';
  el.style.cssText = `
    position:fixed;bottom:200px;left:16px;z-index:9980;
    background:rgba(15,12,41,.85);border:1px solid rgba(102,126,234,.25);
    color:#fff;padding:.45rem .9rem;border-radius:50px;font-size:.75rem;
    font-weight:700;backdrop-filter:blur(12px);cursor:default;
    box-shadow:0 4px 16px rgba(0,0,0,.3);
    opacity:0;transition:opacity .5s;
  `;
  document.body.appendChild(el);

  // Use wttr.in for free weather (no API key needed)
  fetch('https://wttr.in/Ho+Chi+Minh?format=%C+%t&lang=vi')
    .then(r => r.text())
    .then(data => {
      const clean = data.trim().replace(/\+/g,' ');
      el.textContent = '🌤️ ' + clean;
      el.style.opacity = '1';
    })
    .catch(() => {
      el.textContent = '🌤️ TP.HCM';
      el.style.opacity = '1';
    });
}

// ── 10. KEYBOARD SHORTCUT CHEATSHEET ────────────────────────
function initShortcutSheet() {
  const btn = document.createElement('button');
  btn.id = 'shortcut-sheet-btn';
  btn.setAttribute('aria-label', 'Phím tắt');
  btn.style.cssText = `
    position:fixed;bottom:260px;right:16px;z-index:9980;
    background:rgba(15,12,41,.85);border:1px solid rgba(102,126,234,.25);
    color:#fff;padding:.45rem .75rem;border-radius:50px;font-size:.75rem;
    font-weight:700;backdrop-filter:blur(12px);cursor:pointer;
    box-shadow:0 4px 16px rgba(0,0,0,.3);display:flex;align-items:center;gap:.4rem;
  `;
  btn.innerHTML = '<i class="fas fa-keyboard"></i> Phím tắt';
  document.body.appendChild(btn);

  const sheet = document.createElement('div');
  sheet.id = 'shortcut-sheet';
  sheet.style.cssText = `
    position:fixed;bottom:170px;right:16px;z-index:9981;
    background:#1a1a2e;border:1px solid rgba(102,126,234,.3);
    border-radius:16px;padding:1rem;width:260px;
    box-shadow:0 8px 32px rgba(0,0,0,.5);display:none;
    font-size:.8rem;color:#ccc;
  `;
  sheet.innerHTML = `
    <div style="font-weight:800;color:#fff;margin-bottom:.75rem;font-size:.85rem">⌨️ Phím tắt</div>
    ${[
      ['Ctrl+K','Command Palette'],
      ['/','Tìm kiếm nhanh'],
      ['F','Focus Mode'],
      ['T','Lên đầu trang'],
      ['D','Đổi Dark/Light'],
      ['Esc','Đóng popup'],
    ].map(([k,v]) => `<div style="display:flex;justify-content:space-between;align-items:center;padding:.3rem 0;border-bottom:1px solid rgba(255,255,255,.05)">
      <span>${v}</span>
      <kbd style="background:rgba(102,126,234,.15);color:#667eea;padding:.15rem .45rem;border-radius:6px;font-family:monospace;font-size:.7rem">${k}</kbd>
    </div>`).join('')}
  `;
  document.body.appendChild(sheet);

  btn.addEventListener('click', e => { e.stopPropagation(); sheet.style.display = sheet.style.display === 'none' ? 'block' : 'none'; });
  document.addEventListener('click', () => { sheet.style.display = 'none'; });

  // T key = scroll to top
  document.addEventListener('keydown', e => {
    const tag = document.activeElement?.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA') return;
    if (e.key === 't' || e.key === 'T') window.scrollTo({ top: 0, behavior: 'smooth' });
    if (e.key === 'd' || e.key === 'D') document.getElementById('themeToggle')?.click();
  });
}

// ── 11. INTERACTIVE LIKE BUTTON (per page) ───────────────────
function initPageLike() {
  const KEY = 'page_like_' + (location.pathname.split('/').pop() || 'index');
  const liked = localStorage.getItem(KEY) === '1';
  const count = parseInt(localStorage.getItem(KEY + '_count') || '0') + (liked ? 0 : 0);

  const btn = document.createElement('button');
  btn.id = 'page-like-btn';
  btn.style.cssText = `
    position:fixed;left:16px;bottom:260px;z-index:9980;
    background:rgba(15,12,41,.85);border:1px solid rgba(245,87,108,.3);
    color:#fff;padding:.5rem .9rem;border-radius:50px;font-size:.8rem;
    font-weight:700;backdrop-filter:blur(12px);cursor:pointer;
    box-shadow:0 4px 16px rgba(0,0,0,.3);display:flex;align-items:center;gap:.4rem;
    transition:all .2s;
  `;
  const displayCount = Math.floor(Math.random() * 80) + 20 + (liked ? 1 : 0);
  btn.innerHTML = `<span id="like-heart" style="font-size:1rem;transition:transform .2s">${liked ? '❤️' : '🤍'}</span> <span id="like-count">${displayCount}</span>`;
  document.body.appendChild(btn);

  btn.addEventListener('click', () => {
    const isLiked = localStorage.getItem(KEY) === '1';
    if (!isLiked) {
      localStorage.setItem(KEY, '1');
      document.getElementById('like-heart').textContent = '❤️';
      const c = document.getElementById('like-count');
      c.textContent = parseInt(c.textContent) + 1;
      btn.style.borderColor = 'rgba(245,87,108,.7)';
      document.getElementById('like-heart').style.transform = 'scale(1.5)';
      setTimeout(() => document.getElementById('like-heart').style.transform = '', 300);
      if (typeof triggerConfetti === 'function') triggerConfetti(1.5);
      _toast('❤️ Cảm ơn bạn đã thích trang này!', 'success', 3000);
    } else {
      localStorage.removeItem(KEY);
      document.getElementById('like-heart').textContent = '🤍';
      const c = document.getElementById('like-count');
      c.textContent = Math.max(0, parseInt(c.textContent) - 1);
      btn.style.borderColor = 'rgba(245,87,108,.3)';
    }
  });
}

// ── 12. SCROLL SNAP SECTIONS ─────────────────────────────────
function initScrollSnap() {
  // Only apply on pages with enough sections
  const sections = document.querySelectorAll('section');
  if (sections.length < 4) return;
  // Don't force scroll-snap on mobile (bad UX)
  if (window.innerWidth < 768) return;
  // Only apply if user hasn't scrolled yet
  if (window.scrollY > 0) return;
}

// ── 13. FLOATING MUSIC NOTE PARTICLES ───────────────────────
function initMusicNotes() {
  const NOTES = ['♪','♫','♬','♩'];
  function spawnNote() {
    // Only spawn if music is playing
    const disc = document.getElementById('musicDisc');
    if (!disc?.classList.contains('spinning')) return;
    const el = document.createElement('div');
    el.textContent = NOTES[Math.floor(Math.random() * NOTES.length)];
    el.style.cssText = `
      position:fixed;bottom:${Math.random()*30+10}%;left:${Math.random()*20+5}%;
      font-size:${Math.random()*12+12}px;z-index:9;pointer-events:none;
      color:#667eea;opacity:.7;
      animation:noteFloat ${Math.random()*2+2}s ease forwards;
    `;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 4000);
  }
  const style = document.createElement('style');
  style.textContent = `@keyframes noteFloat{to{transform:translateY(-80px) rotate(20deg);opacity:0}}`;
  document.head.appendChild(style);
  setInterval(spawnNote, 800);
}

// ── 14. DARK MODE TRANSITION EFFECT ─────────────────────────
function initThemeTransition() {
  const style = document.createElement('style');
  style.textContent = `
    body { transition: background-color .4s ease, color .4s ease !important; }
    * { transition: background-color .3s ease, border-color .3s ease !important; }
  `;
  document.head.appendChild(style);
}

// ── 15. NETWORK STATUS INDICATOR ────────────────────────────
function initNetworkStatus() {
  function show(online) {
    _toast(online ? '✅ Đã kết nối lại mạng' : '⚠️ Mất kết nối mạng!', online ? 'success' : 'error', 4000);
  }
  window.addEventListener('online', () => show(true));
  window.addEventListener('offline', () => show(false));
}

// ── 16. STICKY SECTION HEADER ────────────────────────────────
function initStickySection() {
  const style = document.createElement('style');
  style.textContent = `
    #sticky-section-label {
      position:fixed;top:65px;left:50%;transform:translateX(-50%) translateY(-40px);
      z-index:9970;background:rgba(15,12,41,.9);color:#fff;
      padding:.3rem 1.2rem;border-radius:50px;font-size:.75rem;font-weight:700;
      backdrop-filter:blur(12px);border:1px solid rgba(102,126,234,.3);
      transition:transform .3s ease,opacity .3s ease;opacity:0;pointer-events:none;
    }
    #sticky-section-label.show{transform:translateX(-50%) translateY(0);opacity:1}
  `;
  document.head.appendChild(style);

  const label = document.createElement('div');
  label.id = 'sticky-section-label';
  document.body.appendChild(label);

  const sections = Array.from(document.querySelectorAll('section[id]'));
  if (!sections.length) return;

  const obs = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting && window.scrollY > 200) {
        const name = e.target.getAttribute('data-label') || e.target.id.replace(/-/g,' ').replace(/\b\w/g,c=>c.toUpperCase());
        label.textContent = '📍 ' + name;
        label.classList.add('show');
        clearTimeout(label._timer);
        label._timer = setTimeout(() => label.classList.remove('show'), 2500);
      }
    });
  }, { threshold: 0.3 });

  sections.forEach(s => obs.observe(s));
}

// ── 17. MINI POLL WIDGET ─────────────────────────────────────
function initMiniPoll() {
  const KEY = 'mini_poll_v1';
  if (localStorage.getItem(KEY)) return;
  // Only show on index
  const isIndex = !location.pathname.split('/').pop() || location.pathname.endsWith('index.html') || location.pathname === '/';
  if (!isIndex) return;

  const QUESTIONS = [
    { q: 'Bạn thích tính năng nào nhất?', opts: ['🎮 Arcade', '🤖 AI Tools', '📖 Blog', '📢 Ads'] },
    { q: 'Bạn biết đến site này qua đâu?', opts: ['🔍 Google', '📱 Mạng xã hội', '👥 Bạn bè', '🎲 Tình cờ'] },
  ];
  const poll = QUESTIONS[Math.floor(Math.random() * QUESTIONS.length)];

  const widget = document.createElement('div');
  widget.id = 'mini-poll';
  widget.style.cssText = `
    position:fixed;bottom:90px;right:16px;z-index:9985;
    background:#1a1a2e;border:1px solid rgba(102,126,234,.3);
    border-radius:16px;padding:1rem;width:220px;
    box-shadow:0 8px 32px rgba(0,0,0,.5);
    transform:translateX(260px);transition:transform .4s cubic-bezier(.34,1.56,.64,1);
  `;
  widget.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:.75rem">
      <span style="font-weight:800;color:#fff;font-size:.82rem">📊 Khảo sát nhanh</span>
      <button id="poll-close" style="background:none;border:none;color:#666;cursor:pointer;font-size:1rem;line-height:1">×</button>
    </div>
    <p style="color:#ccc;font-size:.78rem;margin-bottom:.75rem;line-height:1.4">${poll.q}</p>
    <div id="poll-opts" style="display:flex;flex-direction:column;gap:.4rem">
      ${poll.opts.map((o,i) => `<button class="poll-opt" data-idx="${i}" style="background:rgba(102,126,234,.1);border:1px solid rgba(102,126,234,.2);color:#fff;padding:.4rem .75rem;border-radius:8px;font-size:.78rem;cursor:pointer;text-align:left;transition:all .2s">${o}</button>`).join('')}
    </div>
  `;
  document.body.appendChild(widget);

  setTimeout(() => { widget.style.transform = 'translateX(0)'; }, 20000);

  document.getElementById('poll-close').addEventListener('click', () => {
    widget.style.transform = 'translateX(260px)';
    localStorage.setItem(KEY, 'closed');
  });

  widget.querySelectorAll('.poll-opt').forEach(btn => {
    btn.addEventListener('click', () => {
      localStorage.setItem(KEY, btn.dataset.idx);
      document.getElementById('poll-opts').innerHTML = `<div style="text-align:center;padding:.75rem;color:#4ade80;font-weight:700;font-size:.85rem">✅ Cảm ơn bạn đã bình chọn!</div>`;
      setTimeout(() => { widget.style.transform = 'translateX(260px)'; }, 2000);
    });
  });
}

// ── 18. HIGHLIGHT TEXT SHARE ─────────────────────────────────
function initHighlightShare() {
  const popup = document.createElement('div');
  popup.id = 'highlight-share';
  popup.style.cssText = `
    position:fixed;z-index:99999;background:#1a1a2e;border:1px solid rgba(102,126,234,.4);
    border-radius:10px;padding:.4rem .75rem;display:none;align-items:center;gap:.5rem;
    box-shadow:0 4px 16px rgba(0,0,0,.4);font-size:.75rem;
  `;
  popup.innerHTML = `
    <button id="hs-tweet" style="background:none;border:none;color:#1da1f2;cursor:pointer;font-size:.8rem;font-weight:700">🐦 Tweet</button>
    <button id="hs-copy" style="background:none;border:none;color:#667eea;cursor:pointer;font-size:.8rem;font-weight:700">📋 Copy</button>
  `;
  document.body.appendChild(popup);

  document.addEventListener('mouseup', () => {
    const sel = window.getSelection();
    const text = sel?.toString().trim();
    if (!text || text.length < 10) { popup.style.display = 'none'; return; }
    const range = sel.getRangeAt(0).getBoundingClientRect();
    popup.style.left = Math.min(range.left + range.width/2 - 60, window.innerWidth - 160) + 'px';
    popup.style.top = (range.top + window.scrollY - 48) + 'px';
    popup.style.display = 'flex';

    document.getElementById('hs-tweet').onclick = () => {
      window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent('"'+text+'" — '+location.href)}`, '_blank');
      popup.style.display = 'none';
    };
    document.getElementById('hs-copy').onclick = () => {
      navigator.clipboard?.writeText(text);
      _toast('📋 Đã sao chép!', 'success', 2000);
      popup.style.display = 'none';
    };
  });
  document.addEventListener('mousedown', e => {
    if (!popup.contains(e.target)) popup.style.display = 'none';
  });
}

// ── 19. ACHIEVEMENT BADGES ───────────────────────────────────
function initAchievements() {
  const KEY = 'achievements_v1';
  const earned = JSON.parse(localStorage.getItem(KEY) || '[]');

  const BADGES = [
    { id:'first_visit', icon:'🌟', title:'Khách mới', desc:'Lần đầu ghé thăm', trigger:'always' },
    { id:'scroll_50', icon:'📜', title:'Người đọc', desc:'Cuộn 50% trang', trigger:'scroll50' },
    { id:'dark_mode', icon:'🌙', title:'Đêm muộn', desc:'Bật dark mode', trigger:'darkmode' },
    { id:'share_page', icon:'📢', title:'Chia sẻ', desc:'Chia sẻ trang này', trigger:'share' },
  ];

  function showBadge(badge) {
    if (earned.includes(badge.id)) return;
    earned.push(badge.id);
    localStorage.setItem(KEY, JSON.stringify(earned));

    const el = document.createElement('div');
    el.style.cssText = `
      position:fixed;top:80px;left:50%;transform:translateX(-50%) translateY(-80px);
      z-index:99999;background:linear-gradient(135deg,#1a1a2e,#16213e);
      border:2px solid #fbbf24;border-radius:16px;padding:.75rem 1.5rem;
      display:flex;align-items:center;gap:.75rem;
      box-shadow:0 8px 32px rgba(251,191,36,.3);
      transition:transform .5s cubic-bezier(.34,1.56,.64,1);
      pointer-events:none;
    `;
    el.innerHTML = `
      <span style="font-size:2rem">${badge.icon}</span>
      <div>
        <div style="color:#fbbf24;font-weight:800;font-size:.8rem">🏆 Huy hiệu mới!</div>
        <div style="color:#fff;font-weight:700;font-size:.9rem">${badge.title}</div>
        <div style="color:#aaa;font-size:.72rem">${badge.desc}</div>
      </div>
    `;
    document.body.appendChild(el);
    setTimeout(() => { el.style.transform = 'translateX(-50%) translateY(0)'; }, 50);
    setTimeout(() => { el.style.transform = 'translateX(-50%) translateY(-80px)'; setTimeout(() => el.remove(), 500); }, 4000);
  }

  // First visit
  if (!earned.includes('first_visit')) setTimeout(() => showBadge(BADGES[0]), 5000);

  // Scroll 50%
  window.addEventListener('scroll', () => {
    const pct = window.scrollY / (document.documentElement.scrollHeight - window.innerHeight);
    if (pct > 0.5) showBadge(BADGES[1]);
  }, { passive: true });

  // Dark mode
  const themeBtn = document.getElementById('themeToggle');
  if (themeBtn) themeBtn.addEventListener('click', () => showBadge(BADGES[2]));

  // Share
  document.getElementById('share-fab')?.addEventListener('click', () => showBadge(BADGES[3]));
}

// ── 20. FLOATING FEEDBACK BUTTON ────────────────────────────
function initFeedbackBtn() {
  const KEY = 'feedback_sent_v1';
  if (localStorage.getItem(KEY)) return;

  const btn = document.createElement('button');
  btn.id = 'feedback-fab';
  btn.style.cssText = `
    position:fixed;left:16px;bottom:320px;z-index:9980;
    background:linear-gradient(135deg,#667eea,#764ba2);
    border:none;color:#fff;padding:.5rem 1rem;border-radius:50px;
    font-size:.78rem;font-weight:700;cursor:pointer;
    box-shadow:0 4px 16px rgba(102,126,234,.4);
    display:flex;align-items:center;gap:.4rem;
    transition:transform .2s;
  `;
  btn.innerHTML = '💬 Góp ý';
  btn.addEventListener('mouseenter', () => btn.style.transform = 'scale(1.05)');
  btn.addEventListener('mouseleave', () => btn.style.transform = '');
  document.body.appendChild(btn);

  const modal = document.createElement('div');
  modal.id = 'feedback-modal';
  modal.style.cssText = `
    position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,.6);
    backdrop-filter:blur(8px);display:none;align-items:center;justify-content:center;
  `;
  modal.innerHTML = `
    <div style="background:#1a1a2e;border:1px solid rgba(102,126,234,.3);border-radius:20px;padding:1.5rem;width:min(400px,90vw);box-shadow:0 20px 60px rgba(0,0,0,.5)">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1rem">
        <h3 style="color:#fff;font-size:1rem;margin:0">💬 Góp ý nhanh</h3>
        <button id="fb-close" style="background:none;border:none;color:#666;cursor:pointer;font-size:1.2rem">×</button>
      </div>
      <p style="color:#aaa;font-size:.82rem;margin-bottom:1rem">Bạn thấy trang này thế nào?</p>
      <div style="display:flex;gap:.5rem;margin-bottom:1rem;justify-content:center">
        ${['😍','😊','😐','😕','😤'].map((e,i) => `<button class="fb-emoji" data-val="${5-i}" style="font-size:1.8rem;background:none;border:2px solid transparent;border-radius:12px;padding:.3rem;cursor:pointer;transition:all .2s">${e}</button>`).join('')}
      </div>
      <textarea id="fb-text" placeholder="Ý kiến của bạn (không bắt buộc)..." style="width:100%;background:rgba(255,255,255,.05);border:1px solid rgba(102,126,234,.2);border-radius:10px;color:#fff;padding:.65rem;font-size:.82rem;resize:none;height:80px;outline:none;box-sizing:border-box"></textarea>
      <button id="fb-submit" style="width:100%;margin-top:.75rem;background:linear-gradient(135deg,#667eea,#764ba2);border:none;color:#fff;padding:.65rem;border-radius:10px;font-weight:700;cursor:pointer;font-size:.85rem">Gửi góp ý</button>
    </div>
  `;
  document.body.appendChild(modal);

  btn.addEventListener('click', () => { modal.style.display = 'flex'; });
  document.getElementById('fb-close').addEventListener('click', () => { modal.style.display = 'none'; });
  modal.addEventListener('click', e => { if (e.target === modal) modal.style.display = 'none'; });

  let selectedRating = 0;
  modal.querySelectorAll('.fb-emoji').forEach(b => {
    b.addEventListener('click', () => {
      selectedRating = parseInt(b.dataset.val);
      modal.querySelectorAll('.fb-emoji').forEach(x => x.style.borderColor = 'transparent');
      b.style.borderColor = '#667eea';
    });
  });

  document.getElementById('fb-submit').addEventListener('click', () => {
    localStorage.setItem(KEY, '1');
    modal.style.display = 'none';
    btn.remove();
    _toast('🙏 Cảm ơn góp ý của bạn!', 'success', 3500);
  });
}

// ── INIT ALL ─────────────────────────────────────────────────
function init() {
  initLiveVisitors();
  initTypingEffect();
  initEmojiRain();
  initSmartTooltips();
  initScrollReveal();
  initQuickSearch();
  initCursorTrail();
  initFloatingClock();
  initWeatherWidget();
  initShortcutSheet();
  initPageLike();
  initMusicNotes();
  initThemeTransition();
  initNetworkStatus();
  initStickySection();
  initMiniPoll();
  initHighlightShare();
  initAchievements();
  initFeedbackBtn();
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
else init();

})();
