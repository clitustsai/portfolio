// ============================================================
// FEATURES.JS — Modern UI Features Pack v1
// ============================================================
(function () {
'use strict';

// ── 1. COMMAND PALETTE (Ctrl+K / Cmd+K) ─────────────────────
function initCommandPalette() {
  const COMMANDS = [
    { icon:'🏠', label:'Trang chủ', desc:'Về trang chủ', action:()=>location.href='index.html' },
    { icon:'🤖', label:'AI Tools', desc:'Công cụ AI miễn phí', action:()=>location.href='tools.html' },
    { icon:'🎮', label:'Arcade & Coins', desc:'Chơi game kiếm xu', action:()=>location.href='arcade.html' },
    { icon:'📖', label:'Blog', desc:'Bài viết mới nhất', action:()=>location.href='blog.html' },
    { icon:'📢', label:'Ad Marketplace', desc:'Đặt quảng cáo', action:()=>location.href='ads.html' },
    { icon:'💳', label:'VIP & Dịch vụ', desc:'Nâng cấp tài khoản', action:()=>location.href='payment.html' },
    { icon:'🌙', label:'Chế độ tối', desc:'Bật/tắt dark mode', action:()=>document.getElementById('themeToggle')?.click() },
    { icon:'🔝', label:'Lên đầu trang', desc:'Cuộn lên trên', action:()=>window.scrollTo({top:0,behavior:'smooth'}) },
    { icon:'📊', label:'Dashboard', desc:'Xem thống kê cá nhân', action:()=>location.href='dashboard.html' },
    { icon:'🗺️', label:'Roadmap', desc:'Kế hoạch phát triển', action:()=>location.href='roadmap.html' },
    { icon:'💼', label:'Proposal', desc:'Đề xuất dự án', action:()=>location.href='proposal.html' },
    { icon:'🧾', label:'Invoice', desc:'Tạo hóa đơn', action:()=>location.href='invoice.html' },
  ];

  const overlay = document.createElement('div');
  overlay.id = 'cmd-overlay';
  overlay.innerHTML = `
    <div id="cmd-box">
      <div id="cmd-input-wrap">
        <i class="fas fa-search"></i>
        <input id="cmd-input" placeholder="Tìm kiếm trang, tính năng..." autocomplete="off" spellcheck="false">
        <kbd style="background:rgba(102,126,234,.1);color:#667eea;padding:.15rem .45rem;border-radius:6px;font-size:.7rem;font-family:monospace;flex-shrink:0">ESC</kbd>
      </div>
      <div id="cmd-results"></div>
      <div class="cmd-footer">
        <span><kbd>↑↓</kbd> Di chuyển</span>
        <span><kbd>Enter</kbd> Chọn</span>
        <span><kbd>Esc</kbd> Đóng</span>
      </div>
    </div>`;
  document.body.appendChild(overlay);

  let activeIdx = 0;
  let filtered = [...COMMANDS];

  function render(q) {
    filtered = q ? COMMANDS.filter(c => (c.label+c.desc).toLowerCase().includes(q.toLowerCase())) : [...COMMANDS];
    activeIdx = 0;
    const el = document.getElementById('cmd-results');
    if (!filtered.length) { el.innerHTML = '<div style="padding:1.5rem;text-align:center;color:#aaa;font-size:.85rem">Không tìm thấy kết quả</div>'; return; }
    el.innerHTML = filtered.map((c,i) => `
      <div class="cmd-item${i===0?' active':''}" data-idx="${i}">
        <div class="cmd-item-icon">${c.icon}</div>
        <div><div class="cmd-item-label">${c.label}</div><div class="cmd-item-desc">${c.desc}</div></div>
      </div>`).join('');
    el.querySelectorAll('.cmd-item').forEach((el,i) => {
      el.addEventListener('mouseenter', () => { activeIdx=i; highlight(); });
      el.addEventListener('click', () => { filtered[i]?.action(); close(); });
    });
  }

  function highlight() {
    document.querySelectorAll('.cmd-item').forEach((el,i) => el.classList.toggle('active', i===activeIdx));
    document.querySelectorAll('.cmd-item')[activeIdx]?.scrollIntoView({block:'nearest'});
  }

  function open() { overlay.classList.add('open'); document.getElementById('cmd-input').value=''; render(''); document.getElementById('cmd-input').focus(); }
  function close() { overlay.classList.remove('open'); }

  document.getElementById('cmd-input').addEventListener('input', e => render(e.target.value));
  document.getElementById('cmd-input').addEventListener('keydown', e => {
    if (e.key==='ArrowDown') { activeIdx=Math.min(activeIdx+1,filtered.length-1); highlight(); e.preventDefault(); }
    if (e.key==='ArrowUp') { activeIdx=Math.max(activeIdx-1,0); highlight(); e.preventDefault(); }
    if (e.key==='Enter') { filtered[activeIdx]?.action(); close(); }
    if (e.key==='Escape') close();
  });
  overlay.addEventListener('click', e => { if(e.target===overlay) close(); });
  document.addEventListener('keydown', e => {
    if ((e.ctrlKey||e.metaKey) && e.key==='k') { e.preventDefault(); overlay.classList.contains('open') ? close() : open(); }
  });

  // Show hint once
  if (!sessionStorage.getItem('cmd_hint')) {
    setTimeout(() => {
      const h = document.getElementById('shortcut-hint');
      if (h) { h.textContent = '💡 Nhấn Ctrl+K để mở Command Palette'; h.classList.add('show'); setTimeout(()=>h.classList.remove('show'),4000); }
      sessionStorage.setItem('cmd_hint','1');
    }, 8000);
  }
}

// ── 2. AMBIENT BACKGROUND ORBS ──────────────────────────────
function initAmbientBg() {
  const bg = document.createElement('div');
  bg.id = 'ambient-bg';
  const orbs = [
    { color:'rgba(102,126,234,0.4)', size:500, top:'10%', left:'5%', delay:'0s' },
    { color:'rgba(118,75,162,0.35)', size:400, top:'60%', right:'5%', delay:'3s' },
    { color:'rgba(240,147,251,0.25)', size:350, top:'30%', left:'60%', delay:'6s' },
  ];
  orbs.forEach(o => {
    const el = document.createElement('div');
    el.className = 'ambient-orb';
    el.style.cssText = `width:${o.size}px;height:${o.size}px;background:${o.color};${o.top?'top:'+o.top:''};${o.left?'left:'+o.left:''};${o.right?'right:'+o.right:''};animation-delay:${o.delay}`;
    bg.appendChild(el);
  });
  document.body.insertBefore(bg, document.body.firstChild);
}

// ── 3. SPOTLIGHT CURSOR (dark mode) ─────────────────────────
function initSpotlight() {
  const el = document.createElement('div');
  el.id = 'spotlight';
  document.body.appendChild(el);
  document.addEventListener('mousemove', e => {
    el.style.setProperty('--mx', e.clientX + 'px');
    el.style.setProperty('--my', e.clientY + 'px');
  }, { passive: true });
}

// ── 4. MUSIC VISUALIZER (syncs with music player) ───────────
function initMusicViz() {
  const viz = document.createElement('div');
  viz.id = 'music-viz';
  for (let i = 0; i < 7; i++) { const b = document.createElement('div'); b.className = 'viz-bar'; viz.appendChild(b); }
  document.body.appendChild(viz);

  // Watch for music playing state
  const obs = new MutationObserver(() => {
    const disc = document.getElementById('musicDisc');
    viz.classList.toggle('active', disc?.classList.contains('spinning') || false);
  });
  const disc = document.getElementById('musicDisc');
  if (disc) obs.observe(disc, { attributes: true, attributeFilter: ['class'] });
}

// ── 5. CONTEXT MENU ─────────────────────────────────────────
function initContextMenu() {
  const menu = document.createElement('div');
  menu.id = 'ctx-menu';
  menu.innerHTML = `
    <div class="ctx-item" id="ctx-copy"><i class="fas fa-copy"></i> Sao chép</div>
    <div class="ctx-item" id="ctx-share"><i class="fas fa-share-alt"></i> Chia sẻ trang</div>
    <div class="ctx-sep"></div>
    <div class="ctx-item" id="ctx-top"><i class="fas fa-arrow-up"></i> Lên đầu trang</div>
    <div class="ctx-item" id="ctx-theme"><i class="fas fa-moon"></i> Đổi theme</div>
    <div class="ctx-sep"></div>
    <div class="ctx-item" id="ctx-cmd"><i class="fas fa-terminal"></i> Command Palette <kbd style="margin-left:auto;background:rgba(102,126,234,.1);color:#667eea;padding:.1rem .35rem;border-radius:4px;font-size:.65rem">Ctrl+K</kbd></div>`;
  document.body.appendChild(menu);

  document.addEventListener('contextmenu', e => {
    // Chỉ hiện trên desktop
    if (window.innerWidth < 768) return;
    e.preventDefault();
    menu.style.left = Math.min(e.clientX, window.innerWidth - 200) + 'px';
    menu.style.top = Math.min(e.clientY, window.innerHeight - 200) + 'px';
    menu.classList.add('open');
  });
  document.addEventListener('click', () => menu.classList.remove('open'));
  document.addEventListener('keydown', e => { if(e.key==='Escape') menu.classList.remove('open'); });

  document.getElementById('ctx-copy').addEventListener('click', () => {
    const sel = window.getSelection()?.toString();
    if (sel) navigator.clipboard?.writeText(sel);
    else navigator.clipboard?.writeText(location.href);
  });
  document.getElementById('ctx-share').addEventListener('click', () => {
    if (navigator.share) navigator.share({ title: document.title, url: location.href });
    else navigator.clipboard?.writeText(location.href);
  });
  document.getElementById('ctx-top').addEventListener('click', () => window.scrollTo({top:0,behavior:'smooth'}));
  document.getElementById('ctx-theme').addEventListener('click', () => document.getElementById('themeToggle')?.click());
  document.getElementById('ctx-cmd').addEventListener('click', () => document.dispatchEvent(new KeyboardEvent('keydown',{key:'k',ctrlKey:true,bubbles:true})));
}

// ── 6. FLOATING REACTION BAR ────────────────────────────────
function initReactionBar() {
  const KEY = 'page_reactions_' + (location.pathname.split('/').pop() || 'index');
  const saved = JSON.parse(localStorage.getItem(KEY) || '{}');
  const reactions = [
    { emoji:'❤️', key:'love', label:'Yêu thích' },
    { emoji:'🔥', key:'fire', label:'Tuyệt vời' },
    { emoji:'👍', key:'like', label:'Hay đó' },
    { emoji:'😮', key:'wow', label:'Ấn tượng' },
  ];

  const bar = document.createElement('div');
  bar.id = 'reaction-bar';
  bar.innerHTML = reactions.map(r => `
    <button class="reaction-btn${saved[r.key]?' reacted':''}" data-key="${r.key}" data-tip="${r.label}" title="${r.label}">
      <span>${r.emoji}</span>
      <div class="reaction-count" id="rc-${r.key}" style="display:${(saved[r.key+'_count']||0)>0?'flex':'none'}">${saved[r.key+'_count']||0}</div>
    </button>`).join('');
  document.body.appendChild(bar);

  // Show after scroll 30%
  window.addEventListener('scroll', () => {
    const pct = window.scrollY / (document.documentElement.scrollHeight - window.innerHeight);
    bar.classList.toggle('show', pct > 0.3);
  }, { passive: true });

  bar.querySelectorAll('.reaction-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const key = btn.dataset.key;
      const reacted = btn.classList.toggle('reacted');
      saved[key] = reacted;
      saved[key+'_count'] = (saved[key+'_count']||0) + (reacted ? 1 : -1);
      localStorage.setItem(KEY, JSON.stringify(saved));
      const countEl = document.getElementById('rc-'+key);
      if (countEl) {
        countEl.textContent = saved[key+'_count'];
        countEl.style.display = saved[key+'_count'] > 0 ? 'flex' : 'none';
      }
      if (reacted) {
        // Confetti burst
        triggerConfetti(3);
        btn.style.transform = 'scale(1.4)';
        setTimeout(() => btn.style.transform = '', 300);
      }
    });
  });
}

// ── 7. CONFETTI ENGINE ──────────────────────────────────────
function triggerConfetti(seconds) {
  let canvas = document.getElementById('confetti-canvas');
  if (!canvas) { canvas = document.createElement('canvas'); canvas.id = 'confetti-canvas'; document.body.appendChild(canvas); }
  canvas.style.display = 'block';
  canvas.width = window.innerWidth; canvas.height = window.innerHeight;
  const ctx = canvas.getContext('2d');
  const colors = ['#667eea','#764ba2','#f093fb','#f5576c','#4ade80','#fbbf24','#60a5fa'];
  const pieces = Array.from({length:80}, () => ({
    x: Math.random()*canvas.width, y: -10,
    vx: (Math.random()-0.5)*4, vy: Math.random()*3+2,
    color: colors[Math.floor(Math.random()*colors.length)],
    size: Math.random()*8+4, rot: Math.random()*360, vr: (Math.random()-0.5)*8,
    shape: Math.random() > 0.5 ? 'rect' : 'circle'
  }));
  const end = Date.now() + seconds*1000;
  function draw() {
    ctx.clearRect(0,0,canvas.width,canvas.height);
    pieces.forEach(p => {
      p.x+=p.vx; p.y+=p.vy; p.rot+=p.vr; p.vy+=0.05;
      ctx.save(); ctx.translate(p.x,p.y); ctx.rotate(p.rot*Math.PI/180);
      ctx.fillStyle = p.color; ctx.globalAlpha = Math.max(0, 1-(p.y/canvas.height));
      if (p.shape==='rect') ctx.fillRect(-p.size/2,-p.size/4,p.size,p.size/2);
      else { ctx.beginPath(); ctx.arc(0,0,p.size/2,0,Math.PI*2); ctx.fill(); }
      ctx.restore();
    });
    if (Date.now() < end) requestAnimationFrame(draw);
    else { ctx.clearRect(0,0,canvas.width,canvas.height); canvas.style.display='none'; }
  }
  draw();
}
window.triggerConfetti = triggerConfetti;

// ── 8. COOKIE CONSENT ───────────────────────────────────────
function initCookieConsent() {
  if (localStorage.getItem('cookie_consent')) return;

  const banner = document.createElement('div');
  banner.id = 'cookie-banner';
  banner.innerHTML = `
    <div id="cookie-main">
      <div style="display:flex;align-items:center;gap:.6rem;margin-bottom:.6rem">
        <span style="font-size:1.4rem">🍪</span>
        <strong style="color:#fff;font-size:.92rem">Chúng tôi dùng Cookie</strong>
      </div>
      <p style="color:rgba(255,255,255,.7);font-size:.78rem;line-height:1.5;margin:0 0 .85rem">
        Website dùng cookie để cải thiện trải nghiệm, phân tích lưu lượng và cá nhân hóa nội dung.
        <a href="#" id="cookie-detail-toggle" style="color:#a5f3fc;text-decoration:underline;cursor:pointer">Tùy chỉnh</a>
      </p>
      <div id="cookie-toggles" style="display:none;margin-bottom:.85rem;display:none">
        <div class="ck-row">
          <div><div class="ck-label">Thiết yếu</div><div class="ck-desc">Bắt buộc để site hoạt động</div></div>
          <div class="ck-switch ck-on ck-disabled"><span></span></div>
        </div>
        <div class="ck-row">
          <div><div class="ck-label">Phân tích</div><div class="ck-desc">Giúp chúng tôi hiểu cách bạn dùng site</div></div>
          <div class="ck-switch ck-on" id="ck-analytics"><span></span></div>
        </div>
        <div class="ck-row">
          <div><div class="ck-label">Marketing</div><div class="ck-desc">Hiển thị quảng cáo phù hợp</div></div>
          <div class="ck-switch" id="ck-marketing"><span></span></div>
        </div>
      </div>
      <div style="display:flex;gap:.5rem;flex-wrap:wrap">
        <button class="cookie-btn cookie-decline" id="cookie-no">Từ chối</button>
        <button class="cookie-btn cookie-custom" id="cookie-save" style="display:none">Lưu tùy chọn</button>
        <button class="cookie-btn cookie-accept" id="cookie-yes">Chấp nhận tất cả</button>
      </div>
    </div>`;
  document.body.appendChild(banner);
  setTimeout(() => banner.classList.add('show'), 1500);

  // Toggle detail
  document.getElementById('cookie-detail-toggle').addEventListener('click', e => {
    e.preventDefault();
    const t = document.getElementById('cookie-toggles');
    const save = document.getElementById('cookie-save');
    const isHidden = t.style.display === 'none' || !t.style.display;
    t.style.display = isHidden ? 'block' : 'none';
    save.style.display = isHidden ? 'inline-flex' : 'none';
  });

  // Toggle switches
  ['ck-analytics','ck-marketing'].forEach(id => {
    document.getElementById(id)?.addEventListener('click', function() {
      this.classList.toggle('ck-on');
    });
  });

  function dismiss(val) {
    localStorage.setItem('cookie_consent', val);
    banner.classList.remove('show');
    setTimeout(() => banner.remove(), 500);
  }

  document.getElementById('cookie-yes').addEventListener('click', () => dismiss('accepted'));
  document.getElementById('cookie-no').addEventListener('click', () => dismiss('declined'));
  document.getElementById('cookie-save').addEventListener('click', () => {
    const prefs = {
      analytics: document.getElementById('ck-analytics')?.classList.contains('ck-on'),
      marketing: document.getElementById('ck-marketing')?.classList.contains('ck-on'),
    };
    localStorage.setItem('cookie_consent', 'custom');
    localStorage.setItem('cookie_prefs', JSON.stringify(prefs));
    dismiss('custom');
  });
}

// ── 9. BACK-TO-TOP WITH PROGRESS RING ───────────────────────
function initBackToTop() {
  // Remove existing back-to-top if any
  const existing = document.getElementById('backToTop');
  if (existing) existing.style.display = 'none';

  const btn = document.createElement('button');
  btn.id = 'btt-btn';
  btn.setAttribute('aria-label', 'Lên đầu trang');
  btn.innerHTML = `
    <svg id="btt-progress-ring" viewBox="0 0 50 50" style="position:absolute;inset:-3px;width:calc(100%+6px);height:calc(100%+6px)">
      <circle cx="25" cy="25" r="22" fill="none" stroke="rgba(255,255,255,.25)" stroke-width="2.5"/>
      <circle class="progress" cx="25" cy="25" r="22" fill="none" stroke="#fff" stroke-width="2.5" stroke-dasharray="138" stroke-dashoffset="138" stroke-linecap="round" transform="rotate(-90 25 25)"/>
    </svg>
    <i class="fas fa-arrow-up"></i>`;
  document.body.appendChild(btn);

  const circle = btn.querySelector('.progress');
  const circumference = 138;

  window.addEventListener('scroll', () => {
    const scrolled = window.scrollY;
    const total = document.documentElement.scrollHeight - window.innerHeight;
    const pct = total > 0 ? scrolled / total : 0;
    btn.classList.toggle('show', scrolled > 300);
    if (circle) circle.style.strokeDashoffset = circumference * (1 - pct);
  }, { passive: true });

  btn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
}

// ── 10. PAGE SECTION PROGRESS DOTS ──────────────────────────
function initPageProgress() {
  const sections = Array.from(document.querySelectorAll('section[id], .section[id], [data-section]'));
  if (sections.length < 3) return;

  const nav = document.createElement('div');
  nav.id = 'page-progress';
  sections.slice(0, 8).forEach((sec, i) => {
    const dot = document.createElement('div');
    dot.className = 'pp-dot';
    dot.setAttribute('data-label', sec.getAttribute('data-label') || sec.id || ('Mục '+(i+1)));
    dot.addEventListener('click', () => sec.scrollIntoView({ behavior: 'smooth' }));
    nav.appendChild(dot);
  });
  document.body.appendChild(nav);

  const dots = nav.querySelectorAll('.pp-dot');
  const obs = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const idx = sections.indexOf(entry.target);
        dots.forEach((d,i) => d.classList.toggle('active', i===idx));
      }
    });
  }, { threshold: 0.4 });

  sections.slice(0, 8).forEach(s => obs.observe(s));

  window.addEventListener('scroll', () => {
    nav.classList.toggle('show', window.scrollY > 200);
  }, { passive: true });
}

// ── 11. FLOATING SHARE BUTTON ────────────────────────────────
function initShareFab() {
  const fab = document.createElement('button');
  fab.id = 'share-fab';
  fab.setAttribute('aria-label', 'Chia sẻ');
  fab.innerHTML = '<i class="fas fa-share-alt"></i>';
  document.body.appendChild(fab);

  const opts = document.createElement('div');
  opts.className = 'share-options';
  opts.innerHTML = `
    <button class="share-opt" style="background:#1877f2" title="Facebook" onclick="window.open('https://www.facebook.com/sharer/sharer.php?u='+encodeURIComponent(location.href),'_blank')"><i class="fab fa-facebook-f"></i></button>
    <button class="share-opt" style="background:#0a66c2" title="LinkedIn" onclick="window.open('https://www.linkedin.com/sharing/share-offsite/?url='+encodeURIComponent(location.href),'_blank')"><i class="fab fa-linkedin-in"></i></button>
    <button class="share-opt" style="background:#25d366" title="WhatsApp" onclick="window.open('https://wa.me/?text='+encodeURIComponent(document.title+' '+location.href),'_blank')"><i class="fab fa-whatsapp"></i></button>
    <button class="share-opt" style="background:#667eea" title="Sao chép link" id="copy-link-btn"><i class="fas fa-link"></i></button>`;
  document.body.appendChild(opts);

  fab.addEventListener('click', e => { e.stopPropagation(); opts.classList.toggle('open'); });
  document.addEventListener('click', () => opts.classList.remove('open'));

  document.getElementById('copy-link-btn').addEventListener('click', () => {
    navigator.clipboard?.writeText(location.href);
    if (typeof _toast === 'function') _toast('🔗 Đã sao chép link!', 'success', 2000);
    opts.classList.remove('open');
  });
}

// ── 12. ANNOUNCEMENT BANNER ──────────────────────────────────
function initAnnounceBanner() {
  const KEY = 'announce_v3';
  if (sessionStorage.getItem(KEY)) return;
  const msgs = [
    '🎮 Arcade mới: Chơi game kiếm Coins — <a href="arcade.html">Chơi ngay</a>',
    '🤖 AI Tools miễn phí: Viết content, tóm tắt, dịch thuật — <a href="tools.html">Thử ngay</a>',
    '📢 Đặt quảng cáo Banner & Bài PR — <a href="ads.html">Xem gói</a>',
  ];
  const msg = msgs[Math.floor(Math.random()*msgs.length)];
  const bar = document.createElement('div');
  bar.id = 'announce-bar';
  bar.innerHTML = msg + '<button id="announce-close" aria-label="Đóng">×</button>';
  document.body.appendChild(bar);
  setTimeout(() => bar.classList.add('show'), 1500);
  document.getElementById('announce-close').addEventListener('click', () => {
    bar.classList.remove('show');
    sessionStorage.setItem(KEY, '1');
    setTimeout(() => bar.remove(), 400);
  });
  // Auto-hide after 8s
  setTimeout(() => {
    bar.classList.remove('show');
    sessionStorage.setItem(KEY, '1');
  }, 8000);
}

// ── 13. NOTIFICATION CENTER ──────────────────────────────────
function initNotifCenter() {
  const KEY = 'notif_data';
  const NOTIFS = [
    { icon:'🎮', title:'Arcade cập nhật game mới!', time:'2 phút trước', unread:true },
    { icon:'🤖', title:'AI Tools: thêm tính năng dịch thuật', time:'1 giờ trước', unread:true },
    { icon:'🔥', title:'Streak 3 ngày! Tiếp tục nhé', time:'Hôm nay', unread:false },
    { icon:'📢', title:'Bài PR của bạn đã được duyệt', time:'Hôm qua', unread:false },
  ];

  // Notif bell button in nav
  const navActions = document.querySelector('.nav-actions');
  if (!navActions) return;

  const bellWrap = document.createElement('div');
  bellWrap.style.cssText = 'position:relative;display:inline-flex';
  bellWrap.innerHTML = `
    <button id="notif-bell" style="background:none;border:none;cursor:pointer;color:inherit;font-size:1.1rem;padding:.3rem;position:relative" aria-label="Thông báo">
      <i class="fas fa-bell"></i>
      <div id="notif-badge" class="show" style="position:absolute;top:-2px;right:-2px;background:#f5576c;color:#fff;font-size:.55rem;font-weight:900;min-width:14px;height:14px;border-radius:7px;padding:0 2px;display:flex;align-items:center;justify-content:center;border:1.5px solid #fff">2</div>
    </button>`;
  navActions.insertBefore(bellWrap, navActions.firstChild);

  const center = document.createElement('div');
  center.id = 'notif-center';
  center.innerHTML = `
    <div id="notif-header">
      <span>🔔 Thông báo</span>
      <button id="notif-mark-all" style="background:none;border:none;cursor:pointer;color:#667eea;font-size:.75rem;font-weight:700">Đánh dấu đã đọc</button>
    </div>
    <div id="notif-list">
      ${NOTIFS.map(n => `
        <div class="notif-item${n.unread?' unread':''}">
          <div class="notif-icon">${n.icon}</div>
          <div class="notif-body">
            <div class="notif-title">${n.title}</div>
            <div class="notif-time">${n.time}</div>
          </div>
          ${n.unread ? '<div style="width:8px;height:8px;border-radius:50%;background:#667eea;flex-shrink:0;margin-top:.3rem"></div>' : ''}
        </div>`).join('')}
    </div>`;
  document.body.appendChild(center);

  document.getElementById('notif-bell').addEventListener('click', e => {
    e.stopPropagation();
    center.classList.toggle('open');
    document.getElementById('theme-panel')?.classList.remove('open');
  });
  document.getElementById('notif-mark-all').addEventListener('click', () => {
    center.querySelectorAll('.notif-item.unread').forEach(el => el.classList.remove('unread'));
    const badge = document.getElementById('notif-badge');
    if (badge) badge.style.display = 'none';
  });
  document.addEventListener('click', e => {
    if (!center.contains(e.target) && e.target.id !== 'notif-bell') center.classList.remove('open');
  });
}

// ── 14. KEYBOARD SHORTCUT HINT ───────────────────────────────
function initShortcutHint() {
  const hint = document.createElement('div');
  hint.id = 'shortcut-hint';
  document.body.appendChild(hint);
}

// ── 15. SMOOTH PAGE TRANSITIONS ──────────────────────────────
function initPageTransitions() {
  const style = document.createElement('style');
  style.textContent = `
    .page-transition-out { animation: pageOut .25s ease forwards !important; }
    @keyframes pageOut { to { opacity:0; transform:translateY(-8px); } }
  `;
  document.head.appendChild(style);

  document.addEventListener('click', e => {
    const a = e.target.closest('a[href]');
    if (!a) return;
    const href = a.getAttribute('href');
    if (!href || href.startsWith('#') || href.startsWith('http') || href.startsWith('mailto') || a.target === '_blank') return;
    e.preventDefault();
    document.body.classList.add('page-transition-out');
    setTimeout(() => location.href = href, 220);
  });
}

// ── 16. COPY CODE BUTTON (for blog/code blocks) ──────────────
function initCopyCode() {
  document.querySelectorAll('pre code, pre').forEach(block => {
    const pre = block.tagName === 'PRE' ? block : block.parentElement;
    if (pre.querySelector('.copy-code-btn')) return;
    pre.style.position = 'relative';
    const btn = document.createElement('button');
    btn.className = 'copy-code-btn';
    btn.textContent = '📋 Copy';
    btn.style.cssText = 'position:absolute;top:.5rem;right:.5rem;background:rgba(102,126,234,.2);border:1px solid rgba(102,126,234,.3);color:#667eea;border-radius:8px;padding:.25rem .65rem;font-size:.72rem;font-weight:700;cursor:pointer;transition:all .2s';
    btn.addEventListener('click', () => {
      navigator.clipboard?.writeText(pre.textContent.replace('📋 Copy','').trim());
      btn.textContent = '✅ Đã copy!';
      setTimeout(() => btn.textContent = '📋 Copy', 2000);
    });
    pre.appendChild(btn);
  });
}

// ── 17. READING TIME ESTIMATOR ───────────────────────────────
function initReadingTime() {
  const article = document.querySelector('article, .blog-content, .post-content, main');
  if (!article) return;
  const words = article.innerText.trim().split(/\s+/).length;
  const mins = Math.max(1, Math.round(words / 200));
  const existing = document.querySelector('.reading-time');
  if (!existing) {
    const el = document.createElement('div');
    el.className = 'reading-time';
    el.style.cssText = 'display:inline-flex;align-items:center;gap:.35rem;font-size:.78rem;color:#888;font-weight:600;margin:.5rem 0';
    el.innerHTML = `<i class="fas fa-clock" style="color:#667eea"></i> ${mins} phút đọc`;
    const h1 = article.querySelector('h1, h2');
    if (h1) h1.insertAdjacentElement('afterend', el);
  }
}

// ── 18. LAZY IMAGE BLUR-UP ───────────────────────────────────
function initLazyImages() {
  const style = document.createElement('style');
  style.textContent = `
    img[data-src] { filter:blur(8px); transition:filter .4s ease; }
    img[data-src].loaded { filter:none; }
  `;
  document.head.appendChild(style);

  const obs = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const img = entry.target;
      img.src = img.dataset.src;
      img.addEventListener('load', () => img.classList.add('loaded'), { once: true });
      obs.unobserve(img);
    });
  }, { rootMargin: '200px' });

  document.querySelectorAll('img[data-src]').forEach(img => obs.observe(img));
}

// ── 19. FOCUS MODE (hide distractions) ───────────────────────
function initFocusMode() {
  let active = false;
  const style = document.createElement('style');
  style.id = 'focus-mode-style';
  style.textContent = `
    body.focus-mode header, body.focus-mode footer,
    body.focus-mode #la-bar, body.focus-mode #explore-banner,
    body.focus-mode #reaction-bar, body.focus-mode #share-fab,
    body.focus-mode #page-progress, body.focus-mode #btt-btn,
    body.focus-mode .chat-toggle, body.focus-mode #fabGroup
    { opacity:0 !important; pointer-events:none !important; transition:opacity .3s; }
    body.focus-mode { cursor:none; }
  `;
  document.head.appendChild(style);

  // F key to toggle
  document.addEventListener('keydown', e => {
    const tag = document.activeElement?.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA') return;
    if (e.key === 'f' || e.key === 'F') {
      active = !active;
      document.body.classList.toggle('focus-mode', active);
      if (typeof _toast === 'function')
        _toast(active ? '🎯 Focus Mode bật — nhấn F để tắt' : '✅ Focus Mode tắt', 'info', 2500);
    }
  });
}

// ── 20. PRINT STYLE INJECTOR ─────────────────────────────────
function initPrintStyle() {
  const style = document.createElement('style');
  style.textContent = `
    @media print {
      header, footer, #la-bar, #explore-banner, #reaction-bar,
      #share-fab, #page-progress, #btt-btn, .chat-toggle,
      #fabGroup, #cookie-banner, #announce-bar, #cmd-overlay,
      #ctx-menu, #ambient-bg, #spotlight, #music-viz { display:none !important; }
      body { background:#fff !important; color:#000 !important; }
      a { color:#667eea !important; }
    }
  `;
  document.head.appendChild(style);
}

// ── INIT ALL ─────────────────────────────────────────────────
function init() {
  initAmbientBg();
  initSpotlight();
  initBackToTop();
  initPageProgress();
  initShareFab();
  initCookieConsent();
  initAnnounceBanner();
  initShortcutHint();
  initCommandPalette();
  initContextMenu();
  initReactionBar();
  initMusicViz();
  initPageTransitions();
  initCopyCode();
  initReadingTime();
  initLazyImages();
  initFocusMode();
  initPrintStyle();
  initNotifCenter();
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
else init();

})();
