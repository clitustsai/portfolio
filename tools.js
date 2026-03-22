// tools.js — AI Tools logic (tách ra khỏi HTML để tránh parse errors)
// v5 — auth required, server-side usage tracking

var API_BASE = (location.hostname === 'localhost' || location.hostname === '127.0.0.1')
  ? 'http://localhost:3001/api' : (location.origin + '/api');

// ===== AUTH HELPERS =====
function getToken()   { return localStorage.getItem('user_token'); }
function getUser()    { try { return JSON.parse(localStorage.getItem('user_info')); } catch(e) { return null; } }
function isLoggedIn() { return !!getToken() && !!getUser(); }

// ===== VIP CHECK =====
async function checkVipStatus(email) {
  try {
    var r = await fetch(API_BASE + '/subscription/check?email=' + encodeURIComponent(email));
    var d = await r.json();
    window._isVip = d.hasSubscription;
    var badge = document.getElementById('vip-status-badge');
    if (badge) {
      badge.style.display = '';
      badge.textContent = d.hasSubscription ? '👑 VIP' : '🆓 Free (3 lượt/ngày)';
      badge.style.background = d.hasSubscription ? 'linear-gradient(135deg,#f59e0b,#d97706)' : 'rgba(255,255,255,.15)';
    }
    updateUsageUI();
  } catch(e) {}
}

// ===== TABS =====
function switchTab(id, btn) {
  document.querySelectorAll('.tool-panel').forEach(function(p) { p.classList.remove('active'); });
  document.querySelectorAll('.tab-btn').forEach(function(b) { b.classList.remove('active'); });
  document.getElementById('panel-' + id).classList.add('active');
  if (btn) btn.classList.add('active');
}

// ===== USAGE COUNTER =====
function getUsage(key) {
  var today = new Date().toDateString();
  var stored = JSON.parse(localStorage.getItem('ai_usage') || '{}');
  if (stored.date !== today) return 0;
  return stored[key] || 0;
}
function incUsage(key) {
  var today = new Date().toDateString();
  var stored = JSON.parse(localStorage.getItem('ai_usage') || '{}');
  if (stored.date !== today) {
    localStorage.setItem('ai_usage', JSON.stringify({ date: today }));
    stored = { date: today };
  }
  stored[key] = (stored[key] || 0) + 1;
  localStorage.setItem('ai_usage', JSON.stringify(stored));
  return stored[key];
}
function updateUsageUI() {
  var crLeft = window._isVip ? Infinity : Math.max(0, 3 - getUsage('cr'));
  var cvLeft = window._isVip ? Infinity : Math.max(0, 3 - getUsage('cv'));
  var crEl = document.getElementById('cr-usage');
  var cvEl = document.getElementById('cv-usage');
  if (crEl) {
    crEl.textContent = window._isVip ? '∞' : crLeft;
    crEl.style.color = (!window._isVip && crLeft === 0) ? '#f5576c' : (!window._isVip && crLeft === 1) ? '#f59e0b' : 'var(--g1)';
  }
  if (cvEl) {
    cvEl.textContent = window._isVip ? '∞' : cvLeft;
    cvEl.style.color = (!window._isVip && cvLeft === 0) ? '#f5576c' : (!window._isVip && cvLeft === 1) ? '#f59e0b' : 'var(--g1)';
  }
}

// ===== TOAST =====
function showToast(msg, type, dur) {
  type = type || 'info';
  dur = dur || 3000;
  var icons = { success: '✓', error: '✕', info: 'ℹ' };
  var c = document.querySelector('.toast-container');
  if (!c) {
    c = document.createElement('div');
    c.className = 'toast-container';
    document.body.appendChild(c);
  }
  var t = document.createElement('div');
  t.className = 'toast ' + type;
  var icon = document.createElement('span');
  icon.className = 'toast-icon';
  icon.textContent = icons[type] || 'ℹ';
  var txt = document.createElement('span');
  txt.className = 'toast-message';
  txt.textContent = msg;
  t.appendChild(icon);
  t.appendChild(txt);
  c.appendChild(t);
  setTimeout(function() {
    t.style.animation = 'slideOutToastRight .3s ease';
    setTimeout(function() { t.remove(); }, 300);
  }, dur);
}

// ===== AUTH MODAL =====
function showAuthModal(msg) {
  if (document.getElementById('auth-modal')) return;
  var modal = document.createElement('div');
  modal.id = 'auth-modal';
  modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.7);backdrop-filter:blur(8px);z-index:9999;display:flex;align-items:center;justify-content:center;padding:1rem;';

  var box = document.createElement('div');
  box.style.cssText = 'background:#fff;border-radius:24px;width:100%;max-width:400px;box-shadow:0 30px 80px rgba(0,0,0,.4);overflow:hidden;';

  var header = document.createElement('div');
  header.style.cssText = 'background:linear-gradient(135deg,#667eea,#764ba2);padding:2rem;text-align:center;';
  header.innerHTML = '<div style="font-size:2.5rem;margin-bottom:.5rem;">🤖</div>' +
    '<h2 style="color:#fff;font-size:1.2rem;font-weight:900;margin:0 0 .25rem;">AI Tools — Clitus PC</h2>' +
    '<p style="color:rgba(255,255,255,.8);font-size:.82rem;margin:0;">' + (msg || 'Đăng nhập để sử dụng AI Tools miễn phí') + '</p>';

  var tabs = document.createElement('div');
  tabs.style.cssText = 'display:flex;border-bottom:2px solid #f0f0f0;';
  tabs.innerHTML = '<button id="auth-tab-login" onclick="switchAuthTab(\'login\')" style="flex:1;padding:.85rem;border:none;background:#fff;font-size:.9rem;font-weight:700;color:#667eea;cursor:pointer;border-bottom:2px solid #667eea;margin-bottom:-2px;">Đăng Nhập</button>' +
    '<button id="auth-tab-reg" onclick="switchAuthTab(\'register\')" style="flex:1;padding:.85rem;border:none;background:#fff;font-size:.9rem;font-weight:700;color:#999;cursor:pointer;">Đăng Ký</button>';

  var inputStyle = 'padding:.75rem 1rem;border:1.5px solid #e0e4ff;border-radius:12px;font-size:.9rem;font-family:inherit;outline:none;width:100%;box-sizing:border-box;';
  var btnStyle = 'width:100%;margin-top:1rem;padding:.9rem;border:none;border-radius:50px;background:linear-gradient(135deg,#667eea,#764ba2);color:#fff;font-size:.95rem;font-weight:800;cursor:pointer;box-shadow:0 6px 20px rgba(102,126,234,.4);';

  var loginForm = document.createElement('div');
  loginForm.id = 'auth-form-login';
  loginForm.style.padding = '1.5rem';
  loginForm.innerHTML = '<div style="display:flex;flex-direction:column;gap:.75rem;">' +
    '<input id="al-email" type="email" placeholder="Email *" style="' + inputStyle + '">' +
    '<input id="al-pass" type="password" placeholder="Mật khẩu *" style="' + inputStyle + '">' +
    '</div>' +
    '<div id="al-err" style="display:none;color:#dc2626;font-size:.82rem;margin:.65rem 0 0;background:#fff5f5;border-radius:8px;padding:.5rem .75rem;"></div>' +
    '<button id="al-btn" onclick="doLogin()" style="' + btnStyle + '">Đăng Nhập</button>' +
    '<p style="text-align:center;font-size:.8rem;color:#999;margin:.75rem 0 0;">Chưa có tài khoản? <a onclick="switchAuthTab(\'register\')" style="color:#667eea;font-weight:700;cursor:pointer;">Đăng ký ngay</a></p>';

  var regForm = document.createElement('div');
  regForm.id = 'auth-form-reg';
  regForm.style.cssText = 'display:none;padding:1.5rem;';
  regForm.innerHTML = '<div style="display:flex;flex-direction:column;gap:.75rem;">' +
    '<input id="ar-name" type="text" placeholder="Tên đăng nhập *" style="' + inputStyle + '">' +
    '<input id="ar-email" type="email" placeholder="Email *" style="' + inputStyle + '">' +
    '<input id="ar-pass" type="password" placeholder="Mật khẩu (tối thiểu 6 ký tự) *" style="' + inputStyle + '">' +
    '</div>' +
    '<div id="ar-err" style="display:none;color:#dc2626;font-size:.82rem;margin:.65rem 0 0;background:#fff5f5;border-radius:8px;padding:.5rem .75rem;"></div>' +
    '<button id="ar-btn" onclick="doRegister()" style="' + btnStyle + '">Tạo Tài Khoản</button>' +
    '<p style="text-align:center;font-size:.8rem;color:#999;margin:.75rem 0 0;">Đã có tài khoản? <a onclick="switchAuthTab(\'login\')" style="color:#667eea;font-weight:700;cursor:pointer;">Đăng nhập</a></p>';

  box.appendChild(header);
  box.appendChild(tabs);
  box.appendChild(loginForm);
  box.appendChild(regForm);
  modal.appendChild(box);
  document.body.appendChild(modal);
}

function switchAuthTab(tab) {
  var isLogin = (tab === 'login');
  document.getElementById('auth-form-login').style.display = isLogin ? 'block' : 'none';
  document.getElementById('auth-form-reg').style.display = isLogin ? 'none' : 'block';
  var base = 'flex:1;padding:.85rem;border:none;background:#fff;font-size:.9rem;font-weight:700;cursor:pointer;';
  document.getElementById('auth-tab-login').style.cssText = base + (isLogin ? 'color:#667eea;border-bottom:2px solid #667eea;margin-bottom:-2px;' : 'color:#999;');
  document.getElementById('auth-tab-reg').style.cssText = base + (!isLogin ? 'color:#667eea;border-bottom:2px solid #667eea;margin-bottom:-2px;' : 'color:#999;');
}

async function doLogin() {
  var email = document.getElementById('al-email').value.trim();
  var pass = document.getElementById('al-pass').value;
  var errEl = document.getElementById('al-err');
  var btn = document.getElementById('al-btn');
  errEl.style.display = 'none';
  if (!email || !pass) { errEl.textContent = '⚠️ Vui lòng nhập đầy đủ.'; errEl.style.display = 'block'; return; }
  btn.disabled = true; btn.textContent = 'Đang đăng nhập...';
  try {
    var r = await fetch(API_BASE + '/auth/login', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email, password: pass })
    });
    var d = await r.json();
    if (!r.ok) throw new Error(d.error);
    localStorage.setItem('user_token', d.token);
    localStorage.setItem('user_info', JSON.stringify(d.user));
    document.getElementById('auth-modal').remove();
    onAuthSuccess(d.user);
  } catch(e) {
    errEl.textContent = '❌ ' + e.message; errEl.style.display = 'block';
    btn.disabled = false; btn.textContent = 'Đăng Nhập';
  }
}

async function doRegister() {
  var name = document.getElementById('ar-name').value.trim();
  var email = document.getElementById('ar-email').value.trim();
  var pass = document.getElementById('ar-pass').value;
  var errEl = document.getElementById('ar-err');
  var btn = document.getElementById('ar-btn');
  errEl.style.display = 'none';
  if (!name || !email || !pass) { errEl.textContent = '⚠️ Vui lòng nhập đầy đủ.'; errEl.style.display = 'block'; return; }
  if (pass.length < 6) { errEl.textContent = '⚠️ Mật khẩu tối thiểu 6 ký tự.'; errEl.style.display = 'block'; return; }
  btn.disabled = true; btn.textContent = 'Đang tạo tài khoản...';
  try {
    var r = await fetch(API_BASE + '/auth/register', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: name, email: email, password: pass })
    });
    var d = await r.json();
    if (!r.ok) throw new Error(d.error);
    localStorage.setItem('user_token', d.token);
    localStorage.setItem('user_info', JSON.stringify(d.user));
    document.getElementById('auth-modal').remove();
    onAuthSuccess(d.user);
  } catch(e) {
    errEl.textContent = '❌ ' + e.message; errEl.style.display = 'block';
    btn.disabled = false; btn.textContent = 'Tạo Tài Khoản';
  }
}

function onAuthSuccess(user) {
  document.querySelectorAll('.tools-tabs,.tools-main,.pricing-section').forEach(function(el) { el.style.display = ''; });
  checkVipStatus(user.email);
  renderLogoutBtn(user);
  var badge = document.getElementById('vip-status-badge');
  if (badge) { badge.style.display = ''; badge.textContent = '🆓 Free (3 lượt/ngày)'; }
  showToast('✓ Chào mừng ' + user.username + '!', 'success', 3000);
}

function renderLogoutBtn(user) {
  var slot = document.getElementById('tools-user-slot');
  if (!slot) return;
  var span = document.createElement('span');
  span.style.cssText = 'font-size:.82rem;color:rgba(255,255,255,.8);margin-right:.5rem;';
  span.textContent = user.username;
  var btn = document.createElement('button');
  btn.style.cssText = 'background:rgba(255,255,255,.15);border:1px solid rgba(255,255,255,.25);color:#fff;border-radius:50px;padding:.35rem .85rem;font-size:.78rem;font-weight:700;cursor:pointer;';
  btn.textContent = 'Đăng xuất';
  btn.onclick = doLogout;
  slot.innerHTML = '';
  slot.appendChild(span);
  slot.appendChild(btn);
}

async function doLogout() {
  var token = getToken();
  if (token) { try { await fetch(API_BASE + '/auth/logout', { method: 'POST', headers: { 'x-user-token': token } }); } catch(e) {} }
  localStorage.removeItem('user_token');
  localStorage.removeItem('user_info');
  location.reload();
}

// ===== UPSELL MODAL =====
function showUpsellModal(toolName) {
  var existing = document.getElementById('upsell-modal');
  if (existing) existing.remove();

  var modal = document.createElement('div');
  modal.id = 'upsell-modal';
  modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.65);backdrop-filter:blur(6px);z-index:9999;display:flex;align-items:center;justify-content:center;padding:1rem;overflow-y:auto;';

  var inputStyle = 'padding:.75rem 1rem;border:1.5px solid #e0e4ff;border-radius:12px;font-size:.9rem;font-family:inherit;outline:none;width:100%;box-sizing:border-box;';

  var box = document.createElement('div');
  box.style.cssText = 'background:#fff;border-radius:24px;width:100%;max-width:440px;box-shadow:0 30px 80px rgba(0,0,0,.35);position:relative;overflow:hidden;margin:auto;';

  // Header
  var hdr = document.createElement('div');
  hdr.style.cssText = 'background:linear-gradient(135deg,#667eea,#764ba2);padding:1.75rem 2rem 1.5rem;text-align:center;position:relative;';
  var closeBtn = document.createElement('button');
  closeBtn.textContent = '✕';
  closeBtn.style.cssText = 'position:absolute;top:.85rem;right:.85rem;background:rgba(255,255,255,.15);border:none;color:#fff;width:30px;height:30px;border-radius:50%;cursor:pointer;font-size:1rem;';
  closeBtn.onclick = function() { modal.remove(); };
  hdr.appendChild(closeBtn);
  var hdrContent = document.createElement('div');
  hdrContent.innerHTML = '<div style="font-size:2.5rem;margin-bottom:.5rem;">🔒</div>' +
    '<h2 style="color:#fff;font-size:1.2rem;font-weight:900;margin:0 0 .25rem;">Hết lượt miễn phí!</h2>' +
    '<p style="color:rgba(255,255,255,.8);font-size:.82rem;margin:0;">Đã dùng hết 3 lượt <strong>' + toolName + '</strong> hôm nay</p>';
  hdr.appendChild(hdrContent);

  // Step 1
  var step1 = document.createElement('div');
  step1.id = 'upsell-step1';
  step1.style.padding = '1.5rem 1.75rem';
  step1.innerHTML = '<div style="background:linear-gradient(135deg,rgba(102,126,234,.06),rgba(118,75,162,.06));border-radius:14px;padding:1rem 1.25rem;margin-bottom:1.25rem;text-align:center;">' +
    '<div style="font-size:1.6rem;font-weight:900;color:#667eea;">99.000 <span style="font-size:.9rem;font-weight:500;color:#999;">VNĐ/tháng</span></div>' +
    '<div style="font-size:.78rem;color:#888;margin-top:.2rem;">Không giới hạn tất cả AI tools</div></div>' +
    '<div style="display:flex;flex-direction:column;gap:.75rem;margin-bottom:1.25rem;">' +
    '<input id="us-name" type="text" placeholder="Họ tên của bạn *" style="' + inputStyle + '">' +
    '<input id="us-email" type="email" placeholder="Email của bạn *" style="' + inputStyle + '">' +
    '</div>' +
    '<div style="background:#f8f9ff;border-radius:14px;padding:1rem;margin-bottom:1rem;">' +
    '<div style="font-size:.72rem;font-weight:800;color:#999;text-transform:uppercase;letter-spacing:.06em;margin-bottom:.65rem;">Chuyển khoản ACB</div>' +
    '<div style="display:flex;flex-direction:column;gap:.4rem;font-size:.83rem;">' +
    '<div style="display:flex;justify-content:space-between;"><span style="color:#888;">Ngân hàng</span><span style="font-weight:700;">ACB</span></div>' +
    '<div style="display:flex;justify-content:space-between;align-items:center;"><span style="color:#888;">Số TK</span><span style="font-weight:700;">26996867 <button onclick="navigator.clipboard.writeText(\'26996867\')" style="background:rgba(102,126,234,.1);border:none;color:#667eea;cursor:pointer;font-size:.72rem;font-weight:700;padding:.1rem .35rem;border-radius:5px;">copy</button></span></div>' +
    '<div style="display:flex;justify-content:space-between;"><span style="color:#888;">Chủ TK</span><span style="font-weight:700;">THAI TUAN KIET</span></div>' +
    '<div style="display:flex;justify-content:space-between;"><span style="color:#888;">Số tiền</span><span style="font-weight:800;color:#667eea;">99.000 VNĐ</span></div>' +
    '<div style="display:flex;justify-content:space-between;"><span style="color:#888;">Nội dung</span><span style="font-weight:700;font-size:.78rem;">VIP [email của bạn]</span></div>' +
    '</div></div>' +
    '<img src="img/qr-acb.jpg" alt="QR ACB" style="width:120px;height:120px;border-radius:12px;display:block;margin:0 auto .85rem;border:2px solid #e0e4ff;">' +
    '<input id="us-ref" type="text" placeholder="Nội dung chuyển khoản (tuỳ chọn)" style="' + inputStyle + 'margin-bottom:1rem;">' +
    '<div id="us-err" style="display:none;background:#fff5f5;border:1.5px solid #fecaca;border-radius:10px;padding:.65rem 1rem;color:#dc2626;font-size:.82rem;margin-bottom:.75rem;"></div>' +
    '<button id="us-btn" onclick="submitUpsell()" style="width:100%;padding:.9rem;border:none;border-radius:50px;background:linear-gradient(135deg,#667eea,#764ba2);color:#fff;font-size:.95rem;font-weight:800;cursor:pointer;box-shadow:0 6px 20px rgba(102,126,234,.4);">👑 Xác nhận đã chuyển khoản</button>' +
    '<p style="font-size:.73rem;color:#bbb;text-align:center;margin:.65rem 0 0;">Admin kích hoạt trong 1-2 giờ · <a href="https://zalo.me/0906857331" target="_blank" style="color:#667eea;font-weight:700;">Zalo nhanh hơn</a></p>';

  // Step 2
  var step2 = document.createElement('div');
  step2.id = 'upsell-step2';
  step2.style.cssText = 'display:none;padding:2rem 1.75rem;text-align:center;';
  step2.innerHTML = '<div style="font-size:3rem;margin-bottom:.75rem;">🎉</div>' +
    '<h3 style="font-size:1.15rem;font-weight:900;color:#1a1a2e;margin:0 0 .5rem;">Đăng ký thành công!</h3>' +
    '<p style="font-size:.88rem;color:#888;line-height:1.65;margin:0 0 1.5rem;">Gói VIP sẽ được kích hoạt trong <strong>1-2 giờ</strong>.</p>' +
    '<button onclick="window.open(\'https://zalo.me/0906857331\',\'_blank\')" style="padding:.75rem 1.5rem;border:none;border-radius:50px;background:linear-gradient(135deg,#0068ff,#00c6ff);color:#fff;font-weight:700;cursor:pointer;font-size:.9rem;margin-bottom:.75rem;width:100%;">💬 Nhắn Zalo để kích hoạt nhanh hơn</button>' +
    '<button onclick="document.getElementById(\'upsell-modal\').remove()" style="padding:.65rem 1.5rem;border:1.5px solid #e0e4ff;border-radius:50px;background:none;color:#667eea;font-weight:700;cursor:pointer;font-size:.85rem;width:100%;">Đóng</button>';

  box.appendChild(hdr);
  box.appendChild(step1);
  box.appendChild(step2);
  modal.appendChild(box);
  document.body.appendChild(modal);
  modal.addEventListener('click', function(e) { if (e.target === modal) modal.remove(); });
}

async function submitUpsell() {
  var name = document.getElementById('us-name').value.trim();
  var email = document.getElementById('us-email').value.trim();
  var ref = document.getElementById('us-ref').value.trim();
  var errEl = document.getElementById('us-err');
  var btn = document.getElementById('us-btn');
  errEl.style.display = 'none';
  if (!name) { errEl.textContent = '⚠️ Vui lòng nhập họ tên.'; errEl.style.display = 'block'; return; }
  if (!email || !email.includes('@')) { errEl.textContent = '⚠️ Vui lòng nhập email hợp lệ.'; errEl.style.display = 'block'; return; }
  btn.disabled = true; btn.textContent = 'Đang gửi...';
  try {
    var r = await fetch(API_BASE + '/subscription/register', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: name, email: email, transferRef: ref })
    });
    var d = await r.json();
    if (!r.ok && r.status !== 409) throw new Error(d.error || 'Lỗi server');
    document.getElementById('upsell-step1').style.display = 'none';
    document.getElementById('upsell-step2').style.display = 'block';
  } catch(e) {
    errEl.textContent = '❌ ' + e.message; errEl.style.display = 'block';
    btn.disabled = false; btn.textContent = '👑 Xác nhận đã chuyển khoản';
  }
}

// ===== CODE REVIEW =====
async function runCodeReview() {
  if (!isLoggedIn()) { showAuthModal(); return; }
  var code = document.getElementById('cr-code').value.trim();
  var lang = document.getElementById('cr-lang').value;
  var btn = document.getElementById('cr-btn');
  var errBox = document.getElementById('cr-error');
  var resultBox = document.getElementById('cr-result');
  errBox.classList.remove('show'); resultBox.classList.remove('show');
  if (!code) { errBox.textContent = '⚠️ Vui lòng dán code vào ô bên trên.'; errBox.classList.add('show'); return; }
  if (!window._isVip && getUsage('cr') >= 3) { showUpsellModal('AI Code Review'); return; }
  btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Đang phân tích...';
  try {
    var res = await fetch(API_BASE + '/tools/code-review', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-user-token': getToken() },
      body: JSON.stringify({ code: code, language: lang })
    });
    var data = await res.json();
    if (!res.ok) {
      if (res.status === 429) { showUpsellModal('AI Code Review'); return; }
      if (res.status === 401) { showAuthModal('Phiên đăng nhập hết hạn, vui lòng đăng nhập lại'); return; }
      errBox.textContent = '❌ ' + data.error; errBox.classList.add('show'); return;
    }
    if (!data.isVip) incUsage('cr');
    updateUsageUI();
    renderCodeReview(data.result);
    resultBox.classList.add('show');
    resultBox.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  } catch(e) {
    errBox.textContent = '❌ Lỗi kết nối. Vui lòng thử lại.'; errBox.classList.add('show');
  } finally {
    btn.disabled = false; btn.innerHTML = '<i class="fas fa-wand-magic-sparkles"></i> Review Code';
  }
}

function renderCodeReview(r) {
  var score = r.score || 0;
  var cls = score >= 75 ? 'score-high' : score >= 50 ? 'score-mid' : 'score-low';
  var issues = (r.issues || []).map(function(i) {
    var sev = i.severity === 'high' ? '🔴 Nghiêm trọng' : i.severity === 'medium' ? '🟡 Trung bình' : '🟢 Nhỏ';
    return '<div class="issue-item issue-' + (i.severity || 'low') + '">' +
      '<div class="issue-severity">' + sev + '</div>' +
      (i.line ? '<div style="font-size:.75rem;color:#999;margin-bottom:.2rem;">Dòng: ' + i.line + '</div>' : '') +
      '<div class="issue-text">' + i.issue + '</div>' +
      (i.fix ? '<div class="issue-fix">💡 ' + i.fix + '</div>' : '') +
      '</div>';
  }).join('');
  var strengths = (r.strengths || []).map(function(s) { return '<li>' + s + '</li>'; }).join('');
  var suggestions = (r.suggestions || []).map(function(s) { return '<li>' + s + '</li>'; }).join('');
  var html = '<div class="score-ring">' +
    '<div class="score-circle ' + cls + '"><span class="score-num">' + score + '</span><span class="score-label">/ 100</span></div>' +
    '<div class="score-summary">' + (r.summary || '') + '</div></div>';
  if (issues) html += '<div class="result-section"><h4>🐛 Vấn đề phát hiện (' + (r.issues || []).length + ')</h4><div class="issues-list">' + issues + '</div></div>';
  if (strengths) html += '<div class="result-section"><h4>✅ Điểm mạnh</h4><ul class="strengths-list">' + strengths + '</ul></div>';
  if (suggestions) html += '<div class="result-section"><h4>💡 Đề xuất cải thiện</h4><ul class="suggestions-list">' + suggestions + '</ul></div>';
  document.getElementById('cr-result-body').innerHTML = html;
}

function copyReview() {
  var text = document.getElementById('cr-result-body').innerText;
  navigator.clipboard.writeText(text).then(function() { showToast('✓ Đã copy kết quả!', 'success', 2000); });
}

// ===== CV GENERATOR =====
var cvHTML = '';
async function runCVGen() {
  if (!isLoggedIn()) { showAuthModal(); return; }
  var name = document.getElementById('cv-name').value.trim();
  var btn = document.getElementById('cv-btn');
  var errBox = document.getElementById('cv-error');
  var resultBox = document.getElementById('cv-result');
  errBox.classList.remove('show'); resultBox.classList.remove('show');
  if (!name) { errBox.textContent = '⚠️ Vui lòng nhập họ tên.'; errBox.classList.add('show'); return; }
  if (!window._isVip && getUsage('cv') >= 3) { showUpsellModal('AI CV Generator'); return; }
  btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Đang tạo CV...';
  try {
    var res = await fetch(API_BASE + '/tools/cv-generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-user-token': getToken() },
      body: JSON.stringify({
        name: name,
        title: document.getElementById('cv-title').value.trim(),
        email: document.getElementById('cv-email').value.trim(),
        phone: document.getElementById('cv-phone').value.trim(),
        summary: document.getElementById('cv-summary').value.trim(),
        skills: document.getElementById('cv-skills').value.trim(),
        experience: document.getElementById('cv-exp').value.trim(),
        education: document.getElementById('cv-edu').value.trim(),
        language: document.getElementById('cv-lang').value
      })
    });
    var data = await res.json();
    if (!res.ok) {
      if (res.status === 429) { showUpsellModal('AI CV Generator'); return; }
      if (res.status === 401) { showAuthModal('Phiên đăng nhập hết hạn, vui lòng đăng nhập lại'); return; }
      errBox.textContent = '❌ ' + data.error; errBox.classList.add('show'); return;
    }
    if (!data.isVip) incUsage('cv');
    updateUsageUI();
    cvHTML = data.html || '';
    document.getElementById('cv-preview-body').innerHTML = cvHTML;
    resultBox.classList.add('show');
    resultBox.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  } catch(e) {
    errBox.textContent = '❌ Lỗi kết nối. Vui lòng thử lại.'; errBox.classList.add('show');
  } finally {
    btn.disabled = false; btn.innerHTML = '<i class="fas fa-wand-magic-sparkles"></i> Tạo CV';
  }
}

function printCV() {
  if (!cvHTML) return;
  var w = window.open('', '_blank');
  w.document.write('<!DOCTYPE html><html><head><meta charset="UTF-8"><title>CV</title><style>body{margin:0;padding:20px;font-family:\'Segoe UI\',sans-serif;}@media print{body{padding:0;}}</style></head><body>' + cvHTML + '</body></html>');
  w.document.close(); w.focus(); setTimeout(function() { w.print(); }, 500);
}
function copyCV() {
  navigator.clipboard.writeText(cvHTML).then(function() { showToast('✓ Đã copy HTML!', 'success', 2000); });
}

// ===== INIT =====
document.addEventListener('DOMContentLoaded', function() {
  // Dark mode
  var htmlEl = document.documentElement;
  var themeToggle = document.getElementById('themeToggle');
  if (localStorage.getItem('theme') === 'dark') {
    htmlEl.setAttribute('data-theme', 'dark');
    if (themeToggle) themeToggle.innerHTML = '<i class="fas fa-sun"></i>';
  }
  if (themeToggle) {
    themeToggle.addEventListener('click', function() {
      var isDark = htmlEl.getAttribute('data-theme') === 'dark';
      htmlEl.setAttribute('data-theme', isDark ? 'light' : 'dark');
      localStorage.setItem('theme', isDark ? 'light' : 'dark');
      themeToggle.innerHTML = isDark ? '<i class="fas fa-moon"></i>' : '<i class="fas fa-sun"></i>';
    });
  }

  // Hamburger
  var hamburger = document.getElementById('navHamburger');
  var navUl = document.querySelector('nav ul');
  if (hamburger && navUl) {
    hamburger.addEventListener('click', function(e) {
      e.stopPropagation();
      var o = hamburger.classList.toggle('open');
      navUl.classList.toggle('open', o);
      document.body.style.overflow = o ? 'hidden' : '';
    });
    document.addEventListener('click', function(e) {
      if (navUl.classList.contains('open') && !navUl.contains(e.target) && e.target !== hamburger) {
        hamburger.classList.remove('open'); navUl.classList.remove('open'); document.body.style.overflow = '';
      }
    });
  }
  document.querySelectorAll('.nav-dropdown').forEach(function(dd) {
    dd.querySelector('.nav-dropdown-toggle').addEventListener('click', function(e) {
      if (window.innerWidth <= 768) { e.preventDefault(); dd.classList.toggle('open'); }
    });
    document.addEventListener('click', function(e) { if (!dd.contains(e.target)) dd.classList.remove('open'); });
  });

  // AUTH GATE
  if (isLoggedIn()) {
    var user = getUser();
    renderLogoutBtn(user);
    checkVipStatus(user.email);
    updateUsageUI();
  } else {
    document.querySelectorAll('.tools-tabs,.tools-main,.pricing-section').forEach(function(el) { el.style.display = 'none'; });
    showAuthModal();
  }
});
