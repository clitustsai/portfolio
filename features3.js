// ============================================================
// FEATURES3.JS — Cutting-Edge UI Pack v3 (2025)
// ============================================================
(function () {
'use strict';

function _toast(msg, type, dur) {
  if (typeof showToast === 'function') { showToast(msg, type, dur); return; }
  let c = document.getElementById('_f3_tc');
  if (!c) { c = document.createElement('div'); c.id = '_f3_tc'; c.style.cssText = 'position:fixed;bottom:80px;right:16px;z-index:99997;display:flex;flex-direction:column;gap:.5rem;pointer-events:none'; document.body.appendChild(c); }
  const colors = { success:'#4ade80', info:'#60a5fa', error:'#f87171', warning:'#fbbf24' };
  const t = document.createElement('div');
  t.style.cssText = `background:#1a1a2e;border:1px solid ${colors[type]||'#667eea'};color:#fff;padding:.65rem 1rem;border-radius:12px;font-size:.85rem;font-weight:600;max-width:280px;box-shadow:0 4px 16px rgba(0,0,0,.3);animation:_f3in .3s ease`;
  t.textContent = msg;
  if (!document.getElementById('_f3s')) { const s = document.createElement('style'); s.id = '_f3s'; s.textContent = '@keyframes _f3in{from{opacity:0;transform:translateX(20px)}to{opacity:1;transform:none}}'; document.head.appendChild(s); }
  c.appendChild(t);
  setTimeout(() => { t.style.opacity = '0'; t.style.transition = 'opacity .3s'; setTimeout(() => t.remove(), 300); }, dur || 3000);
}

// ── 1. VIEW TRANSITIONS API (native browser morphing) ────────
function initViewTransitions() {
  if (!document.startViewTransition) return;
  document.addEventListener('click', e => {
    const a = e.target.closest('a[href]');
    if (!a) return;
    const href = a.getAttribute('href');
    if (!href || href.startsWith('#') || href.startsWith('http') || href.startsWith('mailto') || a.target === '_blank') return;
    e.preventDefault();
    document.startViewTransition(() => { location.href = href; });
  });
  const style = document.createElement('style');
  style.textContent = `
    ::view-transition-old(root) { animation: vtOut .3s ease both; }
    ::view-transition-new(root) { animation: vtIn .3s ease both; }
    @keyframes vtOut { to { opacity:0; transform:scale(.97) translateY(-8px); } }
    @keyframes vtIn  { from { opacity:0; transform:scale(1.02) translateY(8px); } }
  `;
  document.head.appendChild(style);
}

// ── 2. CSS HOUDINI PAINT WORKLET — animated gradient border ──
function initHoudiniGlow() {
  // Fallback: CSS animated gradient border on cards
  const style = document.createElement('style');
  style.textContent = `
    @property --angle { syntax:'<angle>'; initial-value:0deg; inherits:false; }
    .houdini-card {
      position:relative;
      border-radius:16px;
    }
    .houdini-card::before {
      content:'';
      position:absolute;
      inset:-2px;
      border-radius:inherit;
      background:conic-gradient(from var(--angle), #667eea, #f093fb, #f5576c, #4ade80, #667eea);
      animation:houdiniSpin 4s linear infinite;
      z-index:-1;
      opacity:0;
      transition:opacity .3s;
    }
    .houdini-card:hover::before { opacity:1; }
    @keyframes houdiniSpin { to { --angle:360deg; } }
  `;
  document.head.appendChild(style);
  // Apply to feature cards
  document.querySelectorAll('.card, .feature-card, .blog-card, .service-card, .stat-card').forEach(el => {
    el.classList.add('houdini-card');
  });
}

// ── 3. SCROLL-DRIVEN ANIMATIONS (CSS Scroll Timeline) ────────
function initScrollDriven() {
  const style = document.createElement('style');
  style.textContent = `
    @supports (animation-timeline: scroll()) {
      .sd-fade {
        animation: sdFadeIn linear both;
        animation-timeline: view();
        animation-range: entry 0% entry 30%;
      }
      @keyframes sdFadeIn {
        from { opacity:0; transform:translateY(40px) scale(.95); }
        to   { opacity:1; transform:none; }
      }
      .sd-slide-left {
        animation: sdSlideLeft linear both;
        animation-timeline: view();
        animation-range: entry 0% entry 35%;
      }
      @keyframes sdSlideLeft {
        from { opacity:0; transform:translateX(-50px); }
        to   { opacity:1; transform:none; }
      }
    }
  `;
  document.head.appendChild(style);
  document.querySelectorAll('section > *, .hero-content, .about-content, .skills-grid > *').forEach((el, i) => {
    el.classList.add(i % 2 === 0 ? 'sd-fade' : 'sd-slide-left');
  });
}

// ── 4. POPOVER API — native browser popover ──────────────────
function initNativePopovers() {
  if (!HTMLElement.prototype.hasOwnProperty('popover')) return;
  // Add popover to skill tags / tech badges
  document.querySelectorAll('[data-popover]').forEach(el => {
    const id = 'pop_' + Math.random().toString(36).slice(2);
    const pop = document.createElement('div');
    pop.id = id;
    pop.setAttribute('popover', '');
    pop.style.cssText = `
      background:#1a1a2e;color:#fff;border:1px solid rgba(102,126,234,.4);
      border-radius:12px;padding:.75rem 1rem;font-size:.8rem;max-width:220px;
      box-shadow:0 8px 32px rgba(0,0,0,.4);
    `;
    pop.textContent = el.dataset.popover;
    document.body.appendChild(pop);
    el.setAttribute('popovertarget', id);
    el.style.cursor = 'pointer';
  });
}

// ── 5. CONTAINER QUERIES — responsive components ─────────────
function initContainerQueries() {
  const style = document.createElement('style');
  style.textContent = `
    @supports (container-type: inline-size) {
      .cq-wrap { container-type: inline-size; }
      @container (max-width: 400px) {
        .cq-wrap .card, .cq-wrap .blog-card { padding:.75rem !important; }
        .cq-wrap .card h3, .cq-wrap .blog-card h3 { font-size:.9rem !important; }
      }
    }
  `;
  document.head.appendChild(style);
  document.querySelectorAll('.cards-grid, .blog-grid, .services-grid').forEach(el => el.classList.add('cq-wrap'));
}

// ── 6. WEB SPEECH API — voice search ─────────────────────────
function initVoiceSearch() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) return;

  const btn = document.createElement('button');
  btn.id = 'voice-btn';
  btn.setAttribute('aria-label', 'Tìm kiếm bằng giọng nói');
  btn.style.cssText = `
    position:fixed;bottom:210px;right:16px;z-index:9980;
    width:44px;height:44px;border-radius:50%;
    background:linear-gradient(135deg,#667eea,#764ba2);
    border:none;color:#fff;font-size:1rem;cursor:pointer;
    box-shadow:0 4px 16px rgba(102,126,234,.4);
    display:flex;align-items:center;justify-content:center;
    transition:all .2s;
  `;
  btn.innerHTML = '<i class="fas fa-microphone"></i>';
  document.body.appendChild(btn);

  const rec = new SpeechRecognition();
  rec.lang = 'vi-VN';
  rec.interimResults = false;

  let listening = false;
  btn.addEventListener('click', () => {
    if (listening) { rec.stop(); return; }
    rec.start();
    listening = true;
    btn.style.background = 'linear-gradient(135deg,#f5576c,#f093fb)';
    btn.style.animation = 'voicePulse 1s ease infinite';
    _toast('🎤 Đang nghe... Hãy nói điều bạn muốn tìm', 'info', 3000);
  });

  rec.onresult = e => {
    const text = e.results[0][0].transcript;
    // Open quick search with result
    const qs = document.getElementById('qs-input');
    if (qs) {
      const overlay = document.getElementById('qs-overlay');
      if (overlay) overlay.style.display = 'flex';
      qs.value = text;
      qs.dispatchEvent(new Event('input'));
      qs.focus();
    } else {
      _toast('🎤 Bạn nói: "' + text + '"', 'success', 4000);
    }
  };
  rec.onend = () => {
    listening = false;
    btn.style.background = 'linear-gradient(135deg,#667eea,#764ba2)';
    btn.style.animation = '';
  };
  rec.onerror = () => {
    listening = false;
    btn.style.background = 'linear-gradient(135deg,#667eea,#764ba2)';
    btn.style.animation = '';
  };

  const style = document.createElement('style');
  style.textContent = `@keyframes voicePulse{0%,100%{box-shadow:0 0 0 0 rgba(245,87,108,.5)}50%{box-shadow:0 0 0 12px rgba(245,87,108,0)}}`;
  document.head.appendChild(style);
}

// ── 7. INTERSECTION OBSERVER — number counter animation ──────
function initCounterAnimation() {
  const counters = document.querySelectorAll('[data-count], .stat-number, .counter');
  if (!counters.length) return;

  const obs = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const el = entry.target;
      const target = parseInt(el.dataset.count || el.textContent.replace(/\D/g, '')) || 0;
      if (!target) return;
      const suffix = el.textContent.replace(/[\d,]/g, '').trim();
      let current = 0;
      const step = Math.ceil(target / 60);
      const timer = setInterval(() => {
        current = Math.min(current + step, target);
        el.textContent = current.toLocaleString('vi-VN') + (suffix || '');
        if (current >= target) clearInterval(timer);
      }, 16);
      obs.unobserve(el);
    });
  }, { threshold: 0.5 });

  counters.forEach(el => obs.observe(el));
}

// ── 8. PICTURE-IN-PICTURE for video elements ─────────────────
function initPiP() {
  document.querySelectorAll('video').forEach(video => {
    if (video.dataset.pipDone) return;
    video.dataset.pipDone = '1';
    const btn = document.createElement('button');
    btn.textContent = '⧉ PiP';
    btn.style.cssText = 'position:absolute;top:8px;right:8px;background:rgba(0,0,0,.6);color:#fff;border:none;border-radius:6px;padding:.25rem .6rem;font-size:.72rem;cursor:pointer;z-index:10';
    const wrap = video.parentElement;
    if (wrap) { wrap.style.position = 'relative'; wrap.appendChild(btn); }
    btn.addEventListener('click', () => {
      if (document.pictureInPictureElement) document.exitPictureInPicture();
      else video.requestPictureInPicture?.();
    });
  });
}

// ── 9. CLIPBOARD API — smart paste detection ─────────────────
function initSmartPaste() {
  document.addEventListener('paste', e => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (const item of items) {
      if (item.type.startsWith('image/')) {
        e.preventDefault();
        _toast('🖼️ Phát hiện ảnh trong clipboard — tính năng upload ảnh sắp ra mắt!', 'info', 4000);
        break;
      }
    }
  });
}

// ── 10. WEB SHARE TARGET + NAVIGATOR.SHARE ───────────────────
function initShareTarget() {
  // Already handled in features.js share fab, but add native share on mobile
  if (!navigator.share) return;
  const btn = document.createElement('button');
  btn.id = 'native-share-btn';
  btn.style.cssText = `
    position:fixed;bottom:255px;right:16px;z-index:9980;
    width:44px;height:44px;border-radius:50%;
    background:rgba(15,12,41,.85);border:1px solid rgba(102,126,234,.3);
    color:#fff;font-size:1rem;cursor:pointer;
    box-shadow:0 4px 16px rgba(0,0,0,.3);
    display:flex;align-items:center;justify-content:center;
    backdrop-filter:blur(12px);
  `;
  btn.innerHTML = '<i class="fas fa-share-nodes"></i>';
  btn.setAttribute('aria-label', 'Chia sẻ trang này');
  document.body.appendChild(btn);
  btn.addEventListener('click', () => {
    navigator.share({ title: document.title, url: location.href, text: document.querySelector('meta[name="description"]')?.content || '' })
      .catch(() => {});
  });
}

// ── 11. IDLE DETECTION API ────────────────────────────────────
async function initIdleDetection() {
  if (!('IdleDetector' in window)) return;
  try {
    const perm = await IdleDetector.requestPermission();
    if (perm !== 'granted') return;
    const detector = new IdleDetector();
    detector.addEventListener('change', () => {
      if (detector.userState === 'idle') {
        _toast('☕ Bạn đang rảnh? Thử chơi Arcade kiếm Coins nhé!', 'info', 5000);
      }
    });
    await detector.start({ threshold: 120000 }); // 2 phút
  } catch {}
}

// ── 12. BADGING API — app icon badge ─────────────────────────
function initBadging() {
  if (!navigator.setAppBadge) return;
  // Show unread notification count on app icon
  const unread = parseInt(document.getElementById('notif-badge')?.textContent || '0');
  if (unread > 0) navigator.setAppBadge(unread).catch(() => {});
  // Clear on focus
  window.addEventListener('focus', () => navigator.clearAppBadge?.().catch(() => {}));
}

// ── 13. SCREEN WAKE LOCK — giữ màn hình sáng khi đọc ────────
function initWakeLock() {
  if (!('wakeLock' in navigator)) return;
  let lock = null;
  const btn = document.createElement('button');
  btn.id = 'wakelock-btn';
  btn.style.cssText = `
    position:fixed;bottom:300px;right:16px;z-index:9980;
    width:44px;height:44px;border-radius:50%;
    background:rgba(15,12,41,.85);border:1px solid rgba(102,126,234,.3);
    color:#fff;font-size:.9rem;cursor:pointer;
    box-shadow:0 4px 16px rgba(0,0,0,.3);
    display:flex;align-items:center;justify-content:center;
    backdrop-filter:blur(12px);transition:all .2s;
  `;
  btn.innerHTML = '☀️';
  btn.setAttribute('title', 'Giữ màn hình sáng khi đọc');
  document.body.appendChild(btn);

  btn.addEventListener('click', async () => {
    if (lock) {
      lock.release();
      lock = null;
      btn.style.borderColor = 'rgba(102,126,234,.3)';
      _toast('😴 Màn hình sẽ tắt bình thường', 'info', 2500);
    } else {
      try {
        lock = await navigator.wakeLock.request('screen');
        btn.style.borderColor = '#fbbf24';
        _toast('☀️ Màn hình sẽ không tắt khi đọc', 'success', 2500);
        lock.addEventListener('release', () => { lock = null; btn.style.borderColor = 'rgba(102,126,234,.3)'; });
      } catch {}
    }
  });
}

// ── 14. COMPRESSION STREAMS — gzip text trước khi lưu ───────
// (Dùng cho localStorage compression)
async function compressToStorage(key, data) {
  try {
    const str = JSON.stringify(data);
    if (!window.CompressionStream) { localStorage.setItem(key, str); return; }
    const stream = new CompressionStream('gzip');
    const writer = stream.writable.getWriter();
    writer.write(new TextEncoder().encode(str));
    writer.close();
    const compressed = await new Response(stream.readable).arrayBuffer();
    const b64 = btoa(String.fromCharCode(...new Uint8Array(compressed)));
    localStorage.setItem(key + '_gz', b64);
  } catch { localStorage.setItem(key, JSON.stringify(data)); }
}
window._compressToStorage = compressToStorage;

// ── 15. SPECULATION RULES API — prefetch next pages ──────────
function initSpeculationRules() {
  if (!HTMLScriptElement.supports?.('speculationrules')) return;
  const script = document.createElement('script');
  script.type = 'speculationrules';
  script.textContent = JSON.stringify({
    prefetch: [{ source: 'list', urls: ['arcade.html', 'tools.html', 'blog.html', 'ads.html'] }],
    prerender: [{ source: 'document', where: { href_matches: '/*.html' }, eagerness: 'moderate' }]
  });
  document.head.appendChild(script);
}

// ── 16. DOCUMENT PICTURE-IN-PICTURE (floating window) ────────
function initDocPiP() {
  if (!window.documentPictureInPicture) return;
  const btn = document.createElement('button');
  btn.id = 'doc-pip-btn';
  btn.style.cssText = `
    position:fixed;bottom:345px;right:16px;z-index:9980;
    width:44px;height:44px;border-radius:50%;
    background:rgba(15,12,41,.85);border:1px solid rgba(102,126,234,.3);
    color:#fff;font-size:.85rem;cursor:pointer;
    box-shadow:0 4px 16px rgba(0,0,0,.3);
    display:flex;align-items:center;justify-content:center;
    backdrop-filter:blur(12px);
  `;
  btn.innerHTML = '⧉';
  btn.setAttribute('title', 'Mở cửa sổ nổi (Picture-in-Picture)');
  document.body.appendChild(btn);

  btn.addEventListener('click', async () => {
    try {
      const pipWin = await window.documentPictureInPicture.requestWindow({ width: 360, height: 480 });
      const clone = document.querySelector('.hero, main, .about')?.cloneNode(true);
      if (clone) {
        pipWin.document.body.style.cssText = 'background:#1a1a2e;color:#fff;font-family:sans-serif;padding:1rem;overflow:auto';
        pipWin.document.body.appendChild(clone);
      }
    } catch {}
  });
}

// ── 17. EYEDROPPER API — color picker từ màn hình ────────────
function initEyeDropper() {
  if (!window.EyeDropper) return;
  const btn = document.createElement('button');
  btn.id = 'eyedropper-btn';
  btn.style.cssText = `
    position:fixed;bottom:390px;right:16px;z-index:9980;
    width:44px;height:44px;border-radius:50%;
    background:rgba(15,12,41,.85);border:1px solid rgba(102,126,234,.3);
    color:#fff;font-size:.9rem;cursor:pointer;
    box-shadow:0 4px 16px rgba(0,0,0,.3);
    display:flex;align-items:center;justify-content:center;
    backdrop-filter:blur(12px);
  `;
  btn.innerHTML = '🎨';
  btn.setAttribute('title', 'Lấy màu từ màn hình');
  document.body.appendChild(btn);

  btn.addEventListener('click', async () => {
    try {
      const dropper = new EyeDropper();
      const { sRGBHex } = await dropper.open();
      navigator.clipboard?.writeText(sRGBHex);
      btn.style.background = sRGBHex;
      _toast(`🎨 Màu: ${sRGBHex} — đã copy!`, 'success', 3000);
      setTimeout(() => { btn.style.background = 'rgba(15,12,41,.85)'; }, 3000);
    } catch {}
  });
}

// ── 18. CONTENT VISIBILITY — lazy render off-screen ──────────
function initContentVisibility() {
  const style = document.createElement('style');
  style.textContent = `
    @supports (content-visibility: auto) {
      section:not(:first-child), .lazy-section {
        content-visibility: auto;
        contain-intrinsic-size: 0 500px;
      }
    }
  `;
  document.head.appendChild(style);
}

// ── 19. PERIODIC BACKGROUND SYNC ─────────────────────────────
async function initPeriodicSync() {
  if (!('periodicSync' in (await navigator.serviceWorker?.ready || {}))) return;
  try {
    const reg = await navigator.serviceWorker.ready;
    const perm = await navigator.permissions.query({ name: 'periodic-background-sync' });
    if (perm.state === 'granted') {
      await reg.periodicSync.register('refresh-content', { minInterval: 24 * 60 * 60 * 1000 });
    }
  } catch {}
}

// ── 20. VIRTUAL SCROLLER — smooth infinite list ──────────────
function initVirtualScroll() {
  // Apply to any list with 20+ items
  document.querySelectorAll('ul, ol').forEach(list => {
    const items = list.querySelectorAll('li');
    if (items.length < 20) return;
    list.style.cssText += 'max-height:400px;overflow-y:auto;scroll-behavior:smooth;';
    // Add scroll snap
    list.style.scrollSnapType = 'y mandatory';
    items.forEach(li => { li.style.scrollSnapAlign = 'start'; });
  });
}

// ── 21. TEMPORAL API POLYFILL — smart date display ───────────
function initSmartDates() {
  document.querySelectorAll('time[datetime], [data-date]').forEach(el => {
    const raw = el.getAttribute('datetime') || el.dataset.date;
    if (!raw) return;
    try {
      const date = new Date(raw);
      const now = new Date();
      const diff = now - date;
      const mins = Math.floor(diff / 60000);
      const hours = Math.floor(diff / 3600000);
      const days = Math.floor(diff / 86400000);
      let label;
      if (mins < 1) label = 'Vừa xong';
      else if (mins < 60) label = `${mins} phút trước`;
      else if (hours < 24) label = `${hours} giờ trước`;
      else if (days < 7) label = `${days} ngày trước`;
      else label = date.toLocaleDateString('vi-VN');
      el.textContent = label;
      el.setAttribute('title', date.toLocaleString('vi-VN'));
    } catch {}
  });
}

// ── 22. PRIORITY HINTS — resource loading priority ───────────
function initPriorityHints() {
  // Boost LCP image
  const heroImg = document.querySelector('.hero img, .hero-bg, img[loading="eager"]');
  if (heroImg) heroImg.setAttribute('fetchpriority', 'high');
  // Lower priority for below-fold images
  document.querySelectorAll('img:not([fetchpriority])').forEach((img, i) => {
    if (i > 3) img.setAttribute('fetchpriority', 'low');
  });
}

// ── 23. SMOOTH SCROLL WITH MOMENTUM ─────────────────────────
function initMomentumScroll() {
  const style = document.createElement('style');
  style.textContent = `
    html { scroll-behavior: smooth; }
    @media (prefers-reduced-motion: no-preference) {
      html { scroll-behavior: smooth; }
      * { scroll-margin-top: 80px; }
    }
  `;
  document.head.appendChild(style);
}

// ── 24. PREFERS-CONTRAST SUPPORT ────────────────────────────
function initContrastMode() {
  const mq = window.matchMedia('(prefers-contrast: more)');
  function apply(matches) {
    if (matches) {
      document.documentElement.style.setProperty('--text-opacity', '1');
      document.body.classList.add('high-contrast');
    } else {
      document.body.classList.remove('high-contrast');
    }
  }
  apply(mq.matches);
  mq.addEventListener('change', e => apply(e.matches));
  const style = document.createElement('style');
  style.textContent = `
    body.high-contrast { filter: contrast(1.2); }
    body.high-contrast * { text-shadow: none !important; }
  `;
  document.head.appendChild(style);
}

// ── 25. RESIZE OBSERVER — adaptive layout ────────────────────
function initResizeObserver() {
  const nav = document.querySelector('nav, header');
  if (!nav) return;
  const ro = new ResizeObserver(entries => {
    for (const entry of entries) {
      const h = entry.contentRect.height;
      document.documentElement.style.setProperty('--nav-height', h + 'px');
    }
  });
  ro.observe(nav);
  // Also observe body width for breakpoint detection
  const bodyRo = new ResizeObserver(entries => {
    const w = entries[0]?.contentRect.width || window.innerWidth;
    document.documentElement.dataset.bp = w < 480 ? 'xs' : w < 768 ? 'sm' : w < 1024 ? 'md' : 'lg';
  });
  bodyRo.observe(document.body);
}

// ── INIT ALL ─────────────────────────────────────────────────
function initFabGroup() {
  // Tạo FAB group chứa các nút phụ (voice, share, wakelock, pip, eyedropper)
  // Sau khi các nút được tạo bởi các hàm init, gom chúng vào group
  setTimeout(() => {
    const btnIds = ['voice-btn', 'native-share-btn', 'wakelock-btn', 'doc-pip-btn', 'eyedropper-btn'];
    const existing = btnIds.map(id => document.getElementById(id)).filter(Boolean);
    if (!existing.length) return;

    // Tạo toggle button
    const toggle = document.createElement('button');
    toggle.id = 'fab-group-toggle';
    toggle.setAttribute('aria-label', 'Công cụ');
    toggle.style.cssText = `
      position:fixed;bottom:192px;right:16px;z-index:9982;
      width:44px;height:44px;border-radius:50%;
      background:linear-gradient(135deg,#667eea,#764ba2);
      border:none;color:#fff;font-size:1.1rem;cursor:pointer;
      box-shadow:0 4px 16px rgba(102,126,234,.4);
      display:flex;align-items:center;justify-content:center;
      transition:transform .3s;
    `;
    toggle.innerHTML = '<i class="fas fa-plus"></i>';
    document.body.appendChild(toggle);

    // Đặt lại vị trí các nút trong group (ẩn mặc định, hiện khi expand)
    existing.forEach((btn, i) => {
      btn.style.cssText += `
        position:fixed !important;
        right:16px !important;
        bottom:${192 + (i + 1) * 52}px !important;
        width:44px !important;height:44px !important;
        border-radius:50% !important;
        display:flex !important;
        align-items:center !important;
        justify-content:center !important;
        opacity:0 !important;
        pointer-events:none !important;
        transform:scale(0) translateY(10px) !important;
        transition:all .25s cubic-bezier(.34,1.56,.64,1) !important;
        transition-delay:${i * 0.04}s !important;
        z-index:9981 !important;
      `;
    });

    let open = false;
    toggle.addEventListener('click', () => {
      open = !open;
      toggle.style.transform = open ? 'rotate(45deg)' : '';
      existing.forEach(btn => {
        btn.style.opacity = open ? '1' : '0';
        btn.style.pointerEvents = open ? 'auto' : 'none';
        btn.style.transform = open ? 'scale(1) translateY(0)' : 'scale(0) translateY(10px)';
      });
    });

    // Đóng khi click ngoài
    document.addEventListener('click', e => {
      if (open && !toggle.contains(e.target) && !existing.some(b => b.contains(e.target))) {
        open = false;
        toggle.style.transform = '';
        existing.forEach(btn => {
          btn.style.opacity = '0';
          btn.style.pointerEvents = 'none';
          btn.style.transform = 'scale(0) translateY(10px)';
        });
      }
    });
  }, 500);
}

function init() {
  initViewTransitions();
  initHoudiniGlow();
  initScrollDriven();
  initNativePopovers();
  initContainerQueries();
  initVoiceSearch();
  initCounterAnimation();
  initPiP();
  initSmartPaste();
  initShareTarget();
  initIdleDetection();
  initBadging();
  initWakeLock();
  initSpeculationRules();
  initDocPiP();
  initEyeDropper();
  initContentVisibility();
  initPeriodicSync();
  initVirtualScroll();
  initSmartDates();
  initPriorityHints();
  initMomentumScroll();
  initContrastMode();
  initResizeObserver();
  initFabGroup();
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
else init();

})();
