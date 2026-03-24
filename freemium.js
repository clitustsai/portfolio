/**
 * FREEMIUM SYSTEM — ClitusPC
 * 20 lượt free, sau đó yêu cầu VIP 299k/tháng
 * Dùng localStorage để đếm lượt (reset mỗi ngày cho free tier)
 * User VIP (role=vip/premium) được bỏ qua giới hạn
 */
(function() {
  'use strict';

  const FREE_LIMIT = 20;
  const STORAGE_KEY = 'freemium_usage';
  const VIP_ROLES = ['vip', 'premium', 'admin'];

  // ── Lấy usage data ──
  function getUsage() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return { count: 0, date: today() };
      const data = JSON.parse(raw);
      // Reset mỗi ngày
      if (data.date !== today()) return { count: 0, date: today() };
      return data;
    } catch(e) { return { count: 0, date: today() }; }
  }

  function today() {
    return new Date().toISOString().slice(0, 10);
  }

  function saveUsage(data) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }

  // ── Kiểm tra user có VIP không ──
  function isVIP() {
    try {
      const token = localStorage.getItem('auth_token') || localStorage.getItem('token');
      if (!token) return false;
      // Decode JWT payload (không verify, chỉ đọc role)
      const payload = JSON.parse(atob(token.split('.')[1]));
      return VIP_ROLES.includes(payload.role);
    } catch(e) {
      // Thử từ user object
      try {
        const user = JSON.parse(localStorage.getItem('auth_user') || localStorage.getItem('user') || 'null');
        return user && VIP_ROLES.includes(user.role);
      } catch(e2) { return false; }
    }
  }

  // ── Lấy số lượt còn lại ──
  function getRemainingUses() {
    if (isVIP()) return Infinity;
    const usage = getUsage();
    return Math.max(0, FREE_LIMIT - usage.count);
  }

  // ── Tăng counter, trả về true nếu được phép dùng ──
  function consumeUse() {
    if (isVIP()) return true;
    const usage = getUsage();
    if (usage.count >= FREE_LIMIT) {
      showPaywall();
      return false;
    }
    usage.count++;
    saveUsage(usage);
    updateBadge();
    // Cảnh báo khi còn ít lượt
    if (usage.count === FREE_LIMIT - 3) {
      showWarningToast(3);
    } else if (usage.count === FREE_LIMIT - 1) {
      showWarningToast(1);
    }
    return true;
  }

  // ── Kiểm tra trước khi dùng (không tăng counter) ──
  function checkLimit() {
    if (isVIP()) return true;
    const usage = getUsage();
    if (usage.count >= FREE_LIMIT) {
      showPaywall();
      return false;
    }
    return true;
  }

  // ── Badge hiển thị lượt còn lại ──
  function updateBadge() {
    const badge = document.getElementById('freemium-badge');
    if (!badge) return;
    if (isVIP()) {
      badge.innerHTML = '<i class="fas fa-crown"></i> VIP';
      badge.className = 'freemium-badge vip';
      return;
    }
    const remaining = getRemainingUses();
    badge.innerHTML = `<i class="fas fa-bolt"></i> ${remaining} lượt free`;
    badge.className = 'freemium-badge' + (remaining <= 3 ? ' low' : '');
  }

  // ── Inject badge vào trang ──
  function injectBadge() {
    if (document.getElementById('freemium-badge')) return;
    const badge = document.createElement('div');
    badge.id = 'freemium-badge';
    badge.style.cssText = `
      position:fixed; top:70px; right:12px; z-index:9990;
      padding:.35rem .85rem; border-radius:50px; font-size:.75rem; font-weight:800;
      cursor:pointer; transition:all .2s; user-select:none;
      box-shadow:0 4px 14px rgba(102,126,234,.3);
    `;
    badge.addEventListener('click', () => {
      if (!isVIP()) showPaywall();
    });
    document.body.appendChild(badge);

    // CSS
    const style = document.createElement('style');
    style.textContent = `
      .freemium-badge {
        background: linear-gradient(135deg,#667eea,#764ba2);
        color: #fff !important;
      }
      .freemium-badge.low {
        background: linear-gradient(135deg,#f59e0b,#ef4444) !important;
        animation: badgePulse2 1.5s ease-in-out infinite;
      }
      .freemium-badge.vip {
        background: linear-gradient(135deg,#f59e0b,#f093fb) !important;
      }
      @keyframes badgePulse2 {
        0%,100%{transform:scale(1);} 50%{transform:scale(1.08);}
      }

      /* PAYWALL MODAL */
      #freemium-paywall {
        position:fixed; inset:0; z-index:99999;
        display:flex; align-items:center; justify-content:center;
        padding:1rem;
      }
      #freemium-paywall .pw-backdrop {
        position:absolute; inset:0;
        background:rgba(0,0,0,0.7);
        backdrop-filter:blur(8px);
      }
      #freemium-paywall .pw-box {
        position:relative; z-index:1;
        background:#fff; border-radius:28px;
        padding:2.5rem 2rem; max-width:420px; width:100%;
        text-align:center;
        box-shadow:0 32px 80px rgba(0,0,0,0.35);
        animation:pwSlideIn .35s cubic-bezier(.23,1,.32,1);
      }
      html[data-theme="dark"] #freemium-paywall .pw-box {
        background:#12122a;
        border:1px solid rgba(102,126,234,.2);
      }
      @keyframes pwSlideIn {
        from{opacity:0;transform:translateY(30px) scale(.95);}
        to{opacity:1;transform:translateY(0) scale(1);}
      }
      .pw-icon { font-size:3.5rem; margin-bottom:.75rem; }
      .pw-title {
        font-size:1.5rem; font-weight:900; margin-bottom:.5rem;
        background:linear-gradient(135deg,#667eea,#f093fb,#764ba2);
        -webkit-background-clip:text; background-clip:text;
        -webkit-text-fill-color:transparent;
      }
      .pw-sub { color:#6b7280; font-size:.9rem; margin-bottom:1.5rem; line-height:1.6; }
      html[data-theme="dark"] .pw-sub { color:#9090b0; }
      .pw-price {
        background:linear-gradient(135deg,rgba(102,126,234,.1),rgba(118,75,162,.1));
        border:2px solid rgba(102,126,234,.2); border-radius:16px;
        padding:1rem; margin-bottom:1.5rem;
      }
      .pw-price .amount {
        font-size:2rem; font-weight:900; color:#667eea;
        display:block; line-height:1;
      }
      .pw-price .period { font-size:.8rem; color:#9090b0; }
      .pw-features {
        list-style:none; padding:0; margin:0 0 1.5rem;
        text-align:left; display:flex; flex-direction:column; gap:.5rem;
      }
      .pw-features li {
        display:flex; align-items:center; gap:.6rem;
        font-size:.88rem; color:#374151;
      }
      html[data-theme="dark"] .pw-features li { color:#c0c0e0; }
      .pw-features li::before {
        content:'✓'; color:#667eea; font-weight:900; flex-shrink:0;
      }
      .pw-btn-primary {
        width:100%; padding:1rem; border:none; border-radius:14px;
        background:linear-gradient(135deg,#667eea,#764ba2);
        color:#fff; font-size:1rem; font-weight:800; cursor:pointer;
        box-shadow:0 8px 24px rgba(102,126,234,.45);
        transition:all .2s; margin-bottom:.75rem;
      }
      .pw-btn-primary:hover { transform:translateY(-2px); box-shadow:0 12px 32px rgba(102,126,234,.55); }
      .pw-btn-secondary {
        background:none; border:none; color:#9090b0;
        font-size:.82rem; cursor:pointer; padding:.4rem;
        transition:color .2s;
      }
      .pw-btn-secondary:hover { color:#667eea; }
      .pw-close {
        position:absolute; top:1rem; right:1rem;
        background:none; border:none; font-size:1.4rem;
        cursor:pointer; color:#9090b0; transition:color .2s;
      }
      .pw-close:hover { color:#ef4444; }
    `;
    document.head.appendChild(style);
    updateBadge();
  }

  // ── Hiện Paywall Modal ──
  function showPaywall() {
    if (document.getElementById('freemium-paywall')) return;
    const modal = document.createElement('div');
    modal.id = 'freemium-paywall';
    modal.innerHTML = `
      <div class="pw-backdrop" onclick="window.freemium.closePaywall()"></div>
      <div class="pw-box">
        <button class="pw-close" onclick="window.freemium.closePaywall()">×</button>
        <div class="pw-icon">🎓</div>
        <div class="pw-title">Hết lượt miễn phí!</div>
        <p class="pw-sub">Bạn đã dùng hết <strong>20 lượt free</strong> hôm nay.<br>Nâng cấp VIP Học Sinh để dùng không giới hạn.</p>
        <div class="pw-price">
          <span class="amount">299.000 ₫</span>
          <span class="period">/ tháng · Gói VIP Học Sinh</span>
        </div>
        <ul class="pw-features">
          <li>Không giới hạn lượt dùng AI & Máy tính</li>
          <li>Dịch thuật không giới hạn</li>
          <li>AI Code Review & CV Generator</li>
          <li>Roadmap & Proposal Generator</li>
          <li>Ưu tiên hỗ trợ 24/7</li>
        </ul>
        <button class="pw-btn-primary" onclick="window.freemium.goVIP()">
          <i class="fas fa-crown"></i> Đăng Ký VIP Ngay — 299k/tháng
        </button>
        <button class="pw-btn-secondary" onclick="window.freemium.closePaywall()">
          Để sau (hết lượt hôm nay)
        </button>
      </div>
    `;
    document.body.appendChild(modal);
  }

  function closePaywall() {
    const modal = document.getElementById('freemium-paywall');
    if (modal) modal.remove();
  }

  function goVIP() {
    closePaywall();
    window.location.href = 'payment.html?plan=student';
  }

  // ── Warning toast ──
  function showWarningToast(remaining) {
    const msg = remaining === 1
      ? '⚠️ Còn 1 lượt free cuối cùng hôm nay!'
      : `⚠️ Còn ${remaining} lượt free hôm nay`;
    const t = document.createElement('div');
    t.style.cssText = `
      position:fixed; bottom:80px; left:50%; transform:translateX(-50%);
      background:linear-gradient(135deg,#f59e0b,#ef4444);
      color:#fff; padding:.65rem 1.5rem; border-radius:50px;
      font-size:.85rem; font-weight:800; z-index:9998;
      box-shadow:0 4px 20px rgba(239,68,68,.4);
      animation:pwSlideIn .3s ease; white-space:nowrap;
    `;
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 3500);
  }

  // ── Public API ──
  window.freemium = {
    consume: consumeUse,
    check: checkLimit,
    isVIP,
    getRemaining: getRemainingUses,
    showPaywall,
    closePaywall,
    goVIP,
    updateBadge,
  };

  // ── Auto init khi DOM ready ──
  function init() {
    injectBadge();
    // Nếu đã hết lượt và không phải VIP, hiện paywall ngay khi vào trang
    if (!isVIP() && getRemainingUses() === 0) {
      setTimeout(showPaywall, 800);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
