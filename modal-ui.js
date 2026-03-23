/* ========== MODAL UI SYSTEM ==========
   3 modal đẹp dùng chung: login, spin-result, deal
   Inject CSS từ modal-ui.css (phải load trước)
   ========================================= */

// ─── HELPERS ───────────────────────────────────────────────────────────────
function _mCreate(id, html) {
  let el = document.getElementById(id);
  if (el) return el;
  el = document.createElement('div');
  el.id = id;
  el.innerHTML = html;
  document.body.appendChild(el);
  return el;
}

function _mOpen(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.classList.add('open');
  document.body.style.overflow = 'hidden';
  // Close on overlay click
  el.addEventListener('click', function handler(e) {
    if (e.target === el) { _mClose(id); el.removeEventListener('click', handler); }
  });
  // Close on Escape
  function onKey(e) { if (e.key === 'Escape') { _mClose(id); document.removeEventListener('keydown', onKey); } }
  document.addEventListener('keydown', onKey);
}

function _mClose(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.classList.remove('open');
  document.body.style.overflow = '';
}

// ─── 1. LOGIN MODAL ─────────────────────────────────────────────────────────
// Nếu auth.js đã có openAuthModal thì dùng luôn, không override
// Chỉ upgrade CSS của auth-box sang m-box style

function _upgradeAuthCSS() {
  if (document.getElementById('_muiAuthStyle')) return;
  const s = document.createElement('style');
  s.id = '_muiAuthStyle';
  s.textContent = `
  #authModal { z-index: 99998; }
  .auth-overlay {
    position: absolute; inset: 0;
    background: rgba(8,8,24,.72);
    backdrop-filter: blur(12px) saturate(1.4);
    -webkit-backdrop-filter: blur(12px) saturate(1.4);
  }
  .auth-box {
    position: relative; z-index: 1;
    background: #fff; border-radius: 28px;
    padding: 0; width: 100%; max-width: 420px;
    box-shadow: 0 32px 80px rgba(0,0,0,.55), 0 0 0 1px rgba(255,255,255,.07);
    animation: muiSlideIn .32s cubic-bezier(.34,1.56,.64,1);
    overflow: hidden;
  }
  html[data-theme="dark"] .auth-box { background: #1a1a2e; }
  @keyframes muiSlideIn {
    from { opacity: 0; transform: translateY(24px) scale(.97); }
    to   { opacity: 1; transform: translateY(0) scale(1); }
  }
  /* Header band */
  .auth-box::before {
    content: '';
    display: block;
    height: 6px;
    background: linear-gradient(90deg, #667eea, #764ba2, #f093fb);
  }
  .auth-box > .auth-close-btn {
    position: absolute; top: 1.1rem; right: 1.1rem;
    width: 32px; height: 32px; border-radius: 50%;
    background: rgba(102,126,234,.1); border: none;
    color: #667eea; font-size: 1.1rem; cursor: pointer;
    display: flex; align-items: center; justify-content: center;
    transition: background .2s, transform .2s; z-index: 3;
  }
  .auth-box > .auth-close-btn:hover { background: rgba(102,126,234,.2); transform: rotate(90deg); }
  .auth-tabs {
    display: flex; gap: 0; margin: 1.5rem 1.75rem 0;
    background: #f0f0fa; border-radius: 12px; padding: 4px;
  }
  html[data-theme="dark"] .auth-tabs { background: #252545; }
  .auth-tab {
    flex: 1; padding: .55rem; border: none; background: none;
    border-radius: 10px; cursor: pointer; font-size: .88rem;
    font-weight: 700; color: #999; transition: all .2s;
  }
  .auth-tab.active {
    background: #fff; color: #667eea;
    box-shadow: 0 2px 8px rgba(0,0,0,.1);
  }
  html[data-theme="dark"] .auth-tab.active { background: #1e1e3a; color: #818cf8; }
  .auth-form { padding: 1.25rem 1.75rem 1.75rem; }
  .auth-logo { font-size: 2.2rem; text-align: center; margin-bottom: .35rem; }
  .auth-form h3 { text-align: center; font-size: 1.15rem; font-weight: 900; margin: 0 0 .25rem; color: #1a1a2e; }
  html[data-theme="dark"] .auth-form h3 { color: #e8e8ff; }
  .auth-sub { text-align: center; color: #999; font-size: .8rem; margin: 0 0 1.25rem; }
  .auth-field {
    display: flex; align-items: center; gap: .7rem;
    border: 1.5px solid #e0e4ff; border-radius: 14px;
    padding: .72rem 1rem; margin-bottom: .8rem;
    background: #f8f9ff; transition: all .2s;
  }
  html[data-theme="dark"] .auth-field { background: #252545; border-color: #3a3a6a; }
  .auth-field:focus-within {
    border-color: #667eea; background: #fff;
    box-shadow: 0 0 0 3px rgba(102,126,234,.14);
  }
  html[data-theme="dark"] .auth-field:focus-within { background: #1e1e3a; }
  .auth-field i { color: #667eea; font-size: .88rem; width: 16px; flex-shrink: 0; }
  .auth-field input { border: none; background: none; outline: none; flex: 1; font-size: .93rem; color: #333; }
  html[data-theme="dark"] .auth-field input { color: #e0e0ff; }
  .auth-field input::placeholder { color: #bbb; }
  .auth-submit-btn {
    width: 100%; padding: .88rem; border: none; border-radius: 14px;
    background: linear-gradient(135deg, #667eea, #764ba2); color: #fff;
    font-size: .97rem; font-weight: 800; cursor: pointer;
    display: flex; align-items: center; justify-content: center; gap: .5rem;
    box-shadow: 0 6px 20px rgba(102,126,234,.38);
    transition: all .22s;
  }
  .auth-submit-btn:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 10px 28px rgba(102,126,234,.48); }
  .auth-submit-btn:disabled { opacity: .55; cursor: not-allowed; }
  .auth-error { color: #f5576c; font-size: .8rem; text-align: center; min-height: 1.2em; margin: 0 0 .65rem; }
  .auth-switch { text-align: center; font-size: .8rem; color: #999; margin: .9rem 0 0; }
  .auth-switch a { color: #667eea; cursor: pointer; font-weight: 700; text-decoration: none; }
  .auth-switch a:hover { text-decoration: underline; }
  .oauth-btns { display: flex; flex-direction: column; gap: .55rem; margin-bottom: .5rem; }
  .oauth-btn {
    display: flex; align-items: center; justify-content: center; gap: .65rem;
    width: 100%; padding: .7rem 1rem; border-radius: 12px;
    border: 1.5px solid #e0e4ff; background: #fff;
    cursor: pointer; font-size: .88rem; font-weight: 700;
    color: #333; transition: all .2s; box-shadow: 0 1px 4px rgba(0,0,0,.06);
  }
  html[data-theme="dark"] .oauth-btn { background: #252545; border-color: #3a3a6a; color: #e0e0ff; }
  .oauth-btn:hover { transform: translateY(-2px); box-shadow: 0 4px 14px rgba(0,0,0,.1); }
  .oauth-google:hover { border-color: #4285F4; }
  .oauth-facebook:hover { border-color: #1877F2; }
  .auth-divider {
    display: flex; align-items: center; gap: .65rem;
    margin: .85rem 0; color: #bbb; font-size: .75rem;
  }
  .auth-divider::before, .auth-divider::after { content: ''; flex: 1; height: 1px; background: #e8eaf6; }
  html[data-theme="dark"] .auth-divider::before,
  html[data-theme="dark"] .auth-divider::after { background: #2a2a4a; }
  `;
  document.head.appendChild(s);
}

// Gọi upgrade khi DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', _upgradeAuthCSS);
} else {
  _upgradeAuthCSS();
}

// ─── 2. SPIN RESULT MODAL ────────────────────────────────────────────────────
// Hiện sau khi quay xong — thay thế text inline

function showSpinResultModal(coins, totalCoins) {
  const id = 'muiSpinResult';
  _mCreate(id, `
    <div class="m-overlay" id="${id}">
      <div class="m-box" style="max-width:360px">
        <div class="m-header" style="background:linear-gradient(135deg,#1a1a2e,#16213e);padding-bottom:1.5rem">
          <button class="m-close" onclick="_mClose('${id}')">✕</button>
          <div class="m-header-icon" id="muiSpinIcon">🎡</div>
          <h2 class="m-header-title" id="muiSpinTitle">Đang quay...</h2>
          <p class="m-header-sub" id="muiSpinSub">Chúc may mắn!</p>
        </div>
        <div class="m-body" style="text-align:center;padding:1.75rem">
          <div id="muiSpinCoins" style="font-size:3rem;font-weight:900;background:linear-gradient(135deg,#fbbf24,#f093fb);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;line-height:1.1;margin-bottom:.35rem"></div>
          <div id="muiSpinTotal" style="font-size:.82rem;color:#999;margin-bottom:1.25rem"></div>
          <button class="m-btn m-btn-primary" onclick="_mClose('${id}')">
            <i class="fas fa-check"></i> Tuyệt vời!
          </button>
        </div>
      </div>
    </div>`);

  document.getElementById('muiSpinIcon').textContent = coins >= 50 ? '🏆' : coins >= 20 ? '🎉' : '🎡';
  document.getElementById('muiSpinTitle').textContent = coins >= 50 ? 'Jackpot!' : 'Chúc mừng!';
  document.getElementById('muiSpinSub').textContent = 'Vòng quay may mắn';
  document.getElementById('muiSpinCoins').textContent = `+${coins} 🪙`;
  document.getElementById('muiSpinTotal').textContent = `Tổng coin: ${totalCoins} 🪙`;
  _mOpen(id);
}

// ─── 3. DEAL MODAL ───────────────────────────────────────────────────────────

/**
 * showDealModal(options)
 * options: {
 *   icon, title, sub, badge ('hot'|'new'|'vip'|'free'),
 *   originalPrice, salePrice, currency,
 *   features: ['...'],
 *   ctaText, ctaUrl, ctaAction,
 *   countdownSeconds,   // optional countdown timer
 *   onClose
 * }
 */
function showDealModal(opts = {}) {
  const id = 'muiDealModal';
  const existing = document.getElementById(id);
  if (existing) existing.remove();

  const {
    icon = '🔥', title = 'Deal đặc biệt!', sub = 'Ưu đãi có hạn',
    badge = 'hot', originalPrice, salePrice, currency = '₫',
    features = [], ctaText = 'Nhận ngay', ctaUrl = '#', ctaAction,
    countdownSeconds, onClose
  } = opts;

  const badgeLabels = { hot: '🔥 Hot Deal', new: '✨ Mới', vip: '👑 VIP', free: 'Miễn phí' };
  const gradients = {
    hot: 'linear-gradient(135deg,#f5576c,#f093fb)',
    new: 'linear-gradient(135deg,#43e97b,#38f9d7)',
    vip: 'linear-gradient(135deg,#f59e0b,#d97706)',
    free: 'linear-gradient(135deg,#667eea,#764ba2)',
  };
  const grad = gradients[badge] || gradients.free;

  const priceHtml = salePrice != null ? `
    <div style="display:flex;align-items:baseline;justify-content:center;gap:.6rem;margin:.75rem 0">
      ${originalPrice != null ? `<span style="font-size:1rem;color:#bbb;text-decoration:line-through">${Number(originalPrice).toLocaleString('vi-VN')}${currency}</span>` : ''}
      <span style="font-size:2rem;font-weight:900;background:${grad};-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text">${Number(salePrice).toLocaleString('vi-VN')}${currency}</span>
    </div>` : '';

  const featuresHtml = features.length ? `
    <ul style="list-style:none;padding:0;margin:0 0 1.25rem;display:flex;flex-direction:column;gap:.5rem">
      ${features.map(f => `<li style="display:flex;align-items:center;gap:.6rem;font-size:.88rem;color:#444">
        <span style="width:20px;height:20px;border-radius:50%;background:rgba(102,126,234,.12);display:flex;align-items:center;justify-content:center;flex-shrink:0;font-size:.7rem;color:#667eea"><i class="fas fa-check"></i></span>
        ${f}
      </li>`).join('')}
    </ul>` : '';

  const countdownHtml = countdownSeconds ? `
    <div class="m-countdown" id="muiDealCountdown">
      <div class="m-countdown-block"><div class="m-countdown-num" id="muiDealH">00</div><div class="m-countdown-label">giờ</div></div>
      <div class="m-countdown-block"><div class="m-countdown-num" id="muiDealM">00</div><div class="m-countdown-label">phút</div></div>
      <div class="m-countdown-block"><div class="m-countdown-num" id="muiDealS">00</div><div class="m-countdown-label">giây</div></div>
    </div>` : '';

  const el = _mCreate(id, `
    <div class="m-overlay" id="${id}">
      <div class="m-box">
        <div class="m-header" style="background:${grad}">
          <button class="m-close" id="muiDealClose">✕</button>
          <div class="m-header-icon">${icon}</div>
          <span class="m-deal-badge m-deal-badge-${badge}" style="margin-bottom:.3rem">${badgeLabels[badge]||badge}</span>
          <h2 class="m-header-title">${title}</h2>
          <p class="m-header-sub">${sub}</p>
        </div>
        <div class="m-body">
          ${priceHtml}
          ${countdownHtml}
          ${featuresHtml}
          <button class="m-btn m-btn-primary" id="muiDealCta" ${ctaUrl !== '#' ? `onclick="window.location.href='${ctaUrl}'"` : ''}>
            ${ctaText}
          </button>
          <button class="m-btn m-btn-outline" id="muiDealSkip" style="margin-top:.6rem;font-size:.85rem;padding:.65rem">
            Để sau
          </button>
        </div>
      </div>
    </div>`);

  // CTA action
  if (ctaAction) {
    document.getElementById('muiDealCta').addEventListener('click', function(e) {
      e.preventDefault(); ctaAction(); _mClose(id);
    });
  }

  // Close handlers
  document.getElementById('muiDealClose').addEventListener('click', () => { _mClose(id); onClose && onClose(); });
  document.getElementById('muiDealSkip').addEventListener('click', () => { _mClose(id); onClose && onClose(); });

  _mOpen(id);

  // Countdown timer
  if (countdownSeconds) {
    let remaining = countdownSeconds;
    const tick = () => {
      if (remaining <= 0) { clearInterval(timer); return; }
      const h = Math.floor(remaining / 3600);
      const m = Math.floor((remaining % 3600) / 60);
      const s = remaining % 60;
      const pad = n => String(n).padStart(2, '0');
      const hEl = document.getElementById('muiDealH');
      const mEl = document.getElementById('muiDealM');
      const sEl = document.getElementById('muiDealS');
      if (hEl) hEl.textContent = pad(h);
      if (mEl) mEl.textContent = pad(m);
      if (sEl) sEl.textContent = pad(s);
      remaining--;
    };
    tick();
    const timer = setInterval(tick, 1000);
  }
}

// ─── Dark mode fix for deal features ────────────────────────────────────────
(function() {
  const s = document.createElement('style');
  s.textContent = `
  html[data-theme="dark"] #muiDealModal .m-body li { color: #c0c0e0 !important; }
  html[data-theme="dark"] #muiDealModal .m-body li span { background: rgba(102,126,234,.2) !important; }
  html[data-theme="dark"] .m-btn-outline { border-color: rgba(102,126,234,.5); color: #818cf8; }
  html[data-theme="dark"] .m-btn-outline:hover { background: rgba(102,126,234,.2); color: #a5b4fc; }
  `;
  document.head.appendChild(s);
})();
