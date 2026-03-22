// tools.js — AI Tools logic (tách ra khỏi HTML để tránh parse errors)
// v6 — dùng auth.js cho auth, không duplicate

// ===== AUTH SUCCESS CALLBACK (được gọi từ auth.js sau login/register) =====
function onToolsAuthSuccess(user) {
  document.querySelectorAll('.tools-tabs,.tools-main,.pricing-section').forEach(function(el) { el.style.display = ''; });
  checkVipStatus(user.email);
  updateUsageUI();
}

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
  var imgLeft = window._isVip ? Infinity : Math.max(0, 5 - getUsage('img'));
  var crEl = document.getElementById('cr-usage');
  var cvEl = document.getElementById('cv-usage');
  var imgEl = document.getElementById('img-usage');
  if (crEl) {
    crEl.textContent = window._isVip ? '∞' : crLeft;
    crEl.style.color = (!window._isVip && crLeft === 0) ? '#f5576c' : (!window._isVip && crLeft === 1) ? '#f59e0b' : 'var(--g1)';
  }
  if (cvEl) {
    cvEl.textContent = window._isVip ? '∞' : cvLeft;
    cvEl.style.color = (!window._isVip && cvLeft === 0) ? '#f5576c' : (!window._isVip && cvLeft === 1) ? '#f59e0b' : 'var(--g1)';
  }
  if (imgEl) {
    imgEl.textContent = window._isVip ? '∞' : imgLeft;
    imgEl.style.color = (!window._isVip && imgLeft === 0) ? '#f5576c' : (!window._isVip && imgLeft === 1) ? '#f59e0b' : 'var(--g1)';
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
    '<img src="img/qr-acb.webp" alt="QR ACB" style="width:120px;height:120px;border-radius:12px;display:block;margin:0 auto .85rem;border:2px solid #e0e4ff;">' +
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
  if (!isLoggedIn()) { openAuthModal('login'); return; }
  var code = document.getElementById('cr-code').value.trim();
  var lang = document.getElementById('cr-lang').value;
  var btn = document.getElementById('cr-btn');
  var errBox = document.getElementById('cr-error');
  var resultBox = document.getElementById('cr-result');
  errBox.classList.remove('show'); resultBox.classList.remove('show');
  if (!code) { errBox.textContent = '⚠️ Vui lòng dán code vào ô bên trên.'; errBox.classList.add('show'); return; }
  if (!window._isVip && getUsage('cr') >= 3) {
    // Check coin extras
    const extras = JSON.parse(localStorage.getItem('coin_extras') || '{}');
    if (extras.cr > 0) {
      extras.cr--;
      localStorage.setItem('coin_extras', JSON.stringify(extras));
      // continue (don't return)
    } else {
      showUpsellModal('AI Code Review'); return;
    }
  }
  btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Đang phân tích...';
  try {
    var res = await fetch(API_BASE + '/tools/code-review', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + getToken() },
      body: JSON.stringify({ code: code, language: lang })
    });
    var data = await res.json();
    if (!res.ok) {
      if (res.status === 429) { showUpsellModal('AI Code Review'); return; }
      if (res.status === 401) { openAuthModal('login'); return; }
      errBox.textContent = '❌ ' + data.error; errBox.classList.add('show'); return;
    }
    if (!data.isVip) incUsage('cr');
    updateUsageUI();
    if (typeof laEvent === 'function') laEvent('ai', 'Ai đó vừa dùng AI Code Review');
    try { fetch(API_BASE + '/user/ai-history', { method:'POST', headers:{'Content-Type':'application/json','Authorization':'Bearer '+getToken()}, body:JSON.stringify({tool:'cr',input:code.slice(0,80)}) }); } catch(e){}
    // Save history localStorage (fallback)
    try { const hist=JSON.parse(localStorage.getItem('ai_history')||'[]'); hist.push({tool:'cr',input:code.slice(0,80),time:Date.now()}); if(hist.length>50)hist.splice(0,hist.length-50); localStorage.setItem('ai_history',JSON.stringify(hist)); } catch(e){}
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
  if (!isLoggedIn()) { openAuthModal('login'); return; }
  var name = document.getElementById('cv-name').value.trim();
  var btn = document.getElementById('cv-btn');
  var errBox = document.getElementById('cv-error');
  var resultBox = document.getElementById('cv-result');
  errBox.classList.remove('show'); resultBox.classList.remove('show');
  if (!name) { errBox.textContent = '⚠️ Vui lòng nhập họ tên.'; errBox.classList.add('show'); return; }
  if (!window._isVip && getUsage('cv') >= 3) {
    const extras = JSON.parse(localStorage.getItem('coin_extras') || '{}');
    if (extras.cv > 0) {
      extras.cv--;
      localStorage.setItem('coin_extras', JSON.stringify(extras));
    } else {
      showUpsellModal('AI CV Generator'); return;
    }
  }
  btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Đang tạo CV...';
  try {
    var res = await fetch(API_BASE + '/tools/cv-generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + getToken() },
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
      if (res.status === 401) { openAuthModal('login'); return; }
      errBox.textContent = '❌ ' + data.error; errBox.classList.add('show'); return;
    }
    if (!data.isVip) incUsage('cv');
    updateUsageUI();
    if (typeof laEvent === 'function') laEvent('ai', 'Ai đó vừa tạo CV bằng AI');
    try { fetch(API_BASE + '/user/ai-history', { method:'POST', headers:{'Content-Type':'application/json','Authorization':'Bearer '+getToken()}, body:JSON.stringify({tool:'cv',input:name}) }); } catch(e){}
    // Save history localStorage (fallback)
    try { const hist=JSON.parse(localStorage.getItem('ai_history')||'[]'); hist.push({tool:'cv',input:name,time:Date.now()}); if(hist.length>50)hist.splice(0,hist.length-50); localStorage.setItem('ai_history',JSON.stringify(hist)); } catch(e){}
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
  // AUTH GATE — nav.js xử lý theme/hamburger/dropdown
  // auth.js xử lý updateNavAuth()
  if (isLoggedIn()) {
    var user = getUser();
    checkVipStatus(user.email);
    updateUsageUI();
    // Load coin balance
    _loadToolsCoins();
  } else {
    document.querySelectorAll('.tools-tabs,.tools-main,.pricing-section').forEach(function(el) { el.style.display = 'none'; });
    openAuthModal('login');
  }
});

async function _loadToolsCoins() {
  try {
    var token = getToken();
    var r = await fetch(API_BASE + '/coins/balance', { headers: { 'Authorization': 'Bearer ' + token } });
    var d = await r.json();
    var bar = document.getElementById('toolsCoinBar');
    var cnt = document.getElementById('toolsCoinCount');
    if (bar) bar.style.display = 'inline-flex';
    if (cnt) cnt.textContent = d.coins || 0;
  } catch(e) {}
}

// ===== AI IMAGE ANALYZER =====
let _imgBase64 = null;

const IMG_MODE_LABELS = {
  solve:     '🧮 Giải Bài Tập',
  describe:  '🔍 Phân Tích Ảnh',
  text:      '📝 Đọc Chữ (OCR)',
  code:      '💻 Đọc Code',
  translate: '🌐 Dịch Văn Bản',
  identify:  '🏷️ Nhận Diện',
  nutrition: '🍱 Phân Tích Dinh Dưỡng',
  plant:     '🌿 Nhận Diện Cây',
  emotion:   '😊 Phân Tích Cảm Xúc',
  scene:     '🌆 Phân Tích Cảnh Vật',
};

function setImgMode(mode, el) {
  document.getElementById('img-mode').value = mode;
  document.querySelectorAll('.img-mode-chip').forEach(c => c.classList.remove('active'));
  if (el) el.classList.add('active');
  const label = IMG_MODE_LABELS[mode] || 'Phân Tích Ảnh';
  const btnLabel = document.getElementById('img-btn-label');
  if (btnLabel) btnLabel.textContent = label;
}

function clearImgPreview() {
  _imgBase64 = null;
  document.getElementById('img-preview-wrap').style.display = 'none';
  document.getElementById('img-btn').disabled = true;
  const zone = document.getElementById('img-drop-zone');
  zone.style.borderColor = '';
  document.getElementById('img-drop-label').textContent = 'Kéo thả ảnh vào đây';
  document.getElementById('img-drop-icon').textContent = '🖼️';
}

function handleImgFile(file) {
  if (!file) return;
  if (file.size > 5 * 1024 * 1024) { alert('Ảnh quá lớn! Tối đa 5MB.'); return; }
  const reader = new FileReader();
  reader.onload = function(e) {
    _imgBase64 = e.target.result;
    document.getElementById('img-preview').src = _imgBase64;
    document.getElementById('img-preview-wrap').style.display = 'block';
    document.getElementById('img-file-info').textContent = file.name + ' · ' + (file.size/1024).toFixed(0) + ' KB';
    document.getElementById('img-btn').disabled = false;
    const zone = document.getElementById('img-drop-zone');
    zone.style.borderColor = '#667eea';
    const lbl = document.getElementById('img-drop-label');
    const ico = document.getElementById('img-drop-icon');
    if (lbl) lbl.textContent = 'Click để đổi ảnh khác';
    if (ico) ico.textContent = '✅';
  };
  reader.readAsDataURL(file);
}

// Drag & drop
document.addEventListener('DOMContentLoaded', function() {
  const zone = document.getElementById('img-drop-zone');
  if (!zone) return;
  zone.addEventListener('dragover', function(e) { e.preventDefault(); zone.classList.add('dragover'); });
  zone.addEventListener('dragleave', function() { zone.classList.remove('dragover'); });
  zone.addEventListener('drop', function(e) {
    e.preventDefault(); zone.classList.remove('dragover');
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) handleImgFile(file);
  });
});

async function runImageAI() {
  if (!isLoggedIn()) { openAuthModal('login'); return; }
  if (!_imgBase64) {
    const errBox = document.getElementById('img-error');
    errBox.textContent = '⚠️ Vui lòng chọn ảnh trước.'; errBox.classList.add('show'); return;
  }
  if (!window._isVip && getUsage('img') >= 5) {
    const extras = JSON.parse(localStorage.getItem('coin_extras') || '{}');
    if (extras.img > 0) { extras.img--; localStorage.setItem('coin_extras', JSON.stringify(extras)); }
    else { showUpsellModal('AI Image Analyzer'); return; }
  }
  const btn = document.getElementById('img-btn');
  const errBox = document.getElementById('img-error');
  const resultBox = document.getElementById('img-result');
  errBox.classList.remove('show'); resultBox.classList.remove('show');
  const mode = document.getElementById('img-mode').value || 'solve';
  const btnLabel = IMG_MODE_LABELS[mode] || 'Phân Tích Ảnh';
  btn.disabled = true;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Đang xử lý...';
  try {
    const lang = document.getElementById('img-lang').value;
    const question = document.getElementById('img-question').value.trim();
    const res = await fetch(API_BASE + '/tools/image-analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + getToken() },
      body: JSON.stringify({ imageBase64: _imgBase64, mode, lang, question })
    });
    const data = await res.json();
    if (!res.ok) {
      if (res.status === 429) { showUpsellModal('AI Image Analyzer'); return; }
      if (res.status === 401) { openAuthModal('login'); return; }
      errBox.textContent = '❌ ' + data.error; errBox.classList.add('show'); return;
    }
    if (!data.isVip) incUsage('img');
    updateUsageUI();
    if (typeof laEvent === 'function') laEvent('ai', 'Ai đó vừa dùng AI phân tích ảnh');
    const body = document.getElementById('img-result-body');
    body.innerHTML = formatImgResult(data.result);
    resultBox.classList.add('show');
    resultBox.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    try { fetch(API_BASE + '/user/ai-history', { method:'POST', headers:{'Content-Type':'application/json','Authorization':'Bearer '+getToken()}, body:JSON.stringify({tool:'img',input:'[image:'+mode+']'}) }); } catch(e){}
  } catch(e) {
    errBox.textContent = '❌ Lỗi kết nối. Vui lòng thử lại.'; errBox.classList.add('show');
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<i class="fas fa-wand-magic-sparkles"></i> <span id="img-btn-label">' + btnLabel + '</span>';
  }
}

function formatImgResult(text) {
  // Escape HTML rồi format markdown-lite
  const esc = text.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  return esc
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/^(#{1,3})\s+(.+)$/gm, (_, h, t) => `<strong style="font-size:${h.length===1?'1.05rem':'1rem'};color:#667eea">${t}</strong>`)
    .replace(/^(\d+)\.\s+/gm, '<span style="color:#667eea;font-weight:700">$1.</span> ')
    .replace(/^[-•]\s+/gm, '<span style="color:#f5576c">▸</span> ')
    .replace(/\n/g, '<br>');
}

function copyImgResult() {
  const text = document.getElementById('img-result-body').innerText;
  navigator.clipboard.writeText(text).then(function() { showToast('✓ Đã copy kết quả!', 'success', 2000); });
}

function shareImgResult() {
  const text = document.getElementById('img-result-body').innerText;
  if (navigator.share) {
    navigator.share({ title: 'Kết quả AI Image', text: text.slice(0, 500) });
  } else {
    navigator.clipboard.writeText(text).then(() => showToast('✓ Đã copy để chia sẻ!', 'success', 2000));
  }
}

// ===== SMART NOTIFICATIONS =====
function initSmartNotifications() {
  if (!isLoggedIn()) return;
  // Chạy sau 4 giây để không làm phiền ngay khi load
  setTimeout(_checkAndNotify, 4000);
}

async function _checkAndNotify() {
  try {
    const token = getToken();
    const r = await fetch(API_BASE + '/user/dashboard', { headers: { 'Authorization': 'Bearer ' + token } });
    if (!r.ok) return;
    const d = await r.json();

    const msgs = [];

    // 1. Daily reward chưa nhận
    if (!d.dailyClaimed) {
      msgs.push({ icon:'🎁', title:'Daily Reward chờ bạn!', body:'Nhận coin miễn phí hôm nay — streak càng cao thưởng càng nhiều', cta:'Nhận ngay', url:'arcade.html', color:'#f59e0b', priority:1 });
    }

    // 2. Còn ít lượt free
    const crUsed = d.usage?.cr || 0;
    const cvUsed = d.usage?.cv || 0;
    const imgUsed = d.usage?.img || 0;
    if (!d.isVip) {
      if (crUsed === 2) msgs.push({ icon:'⚠️', title:'Còn 1 lượt Code Review!', body:'Bạn đã dùng 2/3 lượt miễn phí hôm nay. Nâng VIP để dùng không giới hạn.', cta:'Nâng VIP', url:'payment.html', color:'#f5576c', priority:2 });
      if (crUsed >= 3 && cvUsed >= 3) msgs.push({ icon:'🔒', title:'Hết lượt miễn phí hôm nay', body:'Nâng cấp VIP 99k/tháng để dùng không giới hạn tất cả AI tools.', cta:'Xem VIP', url:'payment.html', color:'#667eea', priority:3 });
    }

    // 3. Coin thấp
    if (d.coins < 20 && d.coins >= 0) {
      msgs.push({ icon:'🪙', title:'Coin sắp hết!', body:`Bạn còn ${d.coins} coin. Chơi game để kiếm thêm coin mở AI tools.`, cta:'Chơi game', url:'arcade.html', color:'#fbbf24', priority:4 });
    }

    // 4. VIP sắp hết hạn
    if (d.isVip && d.daysLeft !== null && d.daysLeft <= 3) {
      msgs.push({ icon:'👑', title:`VIP còn ${d.daysLeft} ngày!`, body:'Gia hạn ngay để không bị gián đoạn. Ưu đãi đặc biệt cho khách hàng cũ.', cta:'Gia hạn', url:'payment.html', color:'#f59e0b', priority:0 });
    }

    if (!msgs.length) return;
    // Hiện notification ưu tiên cao nhất
    msgs.sort((a,b) => a.priority - b.priority);
    _showSmartNotif(msgs[0]);
  } catch(e) {}
}

function _showSmartNotif(n) {
  if (document.getElementById('smart-notif')) return; // đã có rồi
  const el = document.createElement('div');
  el.id = 'smart-notif';
  el.style.cssText = `position:fixed;bottom:24px;right:24px;z-index:99997;max-width:320px;width:calc(100vw - 48px);
    background:#fff;border-radius:20px;box-shadow:0 20px 60px rgba(0,0,0,.2);
    border-left:4px solid ${n.color};padding:1rem 1.25rem;
    animation:notifSlideIn .4s cubic-bezier(0.4,0,0.2,1);`;
  el.innerHTML = `
    <style>@keyframes notifSlideIn{from{opacity:0;transform:translateX(60px)}to{opacity:1;transform:translateX(0)}}</style>
    <div style="display:flex;align-items:flex-start;gap:.75rem;">
      <div style="font-size:1.8rem;flex-shrink:0;line-height:1;">${n.icon}</div>
      <div style="flex:1;min-width:0;">
        <div style="font-weight:800;font-size:.9rem;color:#1a1a2e;margin-bottom:.2rem;">${n.title}</div>
        <div style="font-size:.78rem;color:#666;line-height:1.5;margin-bottom:.65rem;">${n.body}</div>
        <div style="display:flex;gap:.5rem;align-items:center;">
          <a href="${n.url}" style="background:${n.color};color:#fff;border-radius:50px;padding:.35rem .9rem;font-size:.78rem;font-weight:800;text-decoration:none;transition:opacity .2s;" onmouseover="this.style.opacity='.85'" onmouseout="this.style.opacity='1'">${n.cta} →</a>
          <button onclick="document.getElementById('smart-notif').remove()" style="background:none;border:none;color:#bbb;cursor:pointer;font-size:.8rem;padding:.2rem .5rem;border-radius:50px;transition:all .2s;" onmouseover="this.style.background='#f5f5f5'" onmouseout="this.style.background='none'">✕ Bỏ qua</button>
        </div>
      </div>
    </div>`;
  document.body.appendChild(el);
  // Tự đóng sau 8 giây
  setTimeout(() => { if (el.parentNode) { el.style.animation = 'notifSlideIn .3s reverse'; setTimeout(() => el.remove(), 300); } }, 8000);
}

// Gọi smart notifications khi load
document.addEventListener('DOMContentLoaded', function() {
  setTimeout(initSmartNotifications, 100);
});
