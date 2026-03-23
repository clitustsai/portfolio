// ========== BUG REPORT WIDGET ==========
(function() {
'use strict';

function initBugReport() {
    if (document.getElementById('_bugBtn')) return;

    // Nút float
    const btn = document.createElement('button');
    btn.id = '_bugBtn';
    btn.innerHTML = '❗';
    btn.title = 'Báo lỗi trang web';
    btn.setAttribute('aria-label', 'Báo lỗi');
    document.body.appendChild(btn);

    // CSS
    const style = document.createElement('style');
    style.textContent = `
    #_bugBtn {
    position:fixed; bottom:20px; left:18px; z-index:9955;
        width:44px; height:44px; border-radius:50%; border:none;
        background:linear-gradient(135deg,#f5576c,#f093fb);
        color:#fff; font-size:1.2rem; cursor:pointer;
        box-shadow:0 4px 16px rgba(245,87,108,0.45);
        transition:all 0.25s; display:flex; align-items:center; justify-content:center;
        animation:_bugPulse 3s infinite;
    }
    #_bugBtn:hover { transform:scale(1.15); box-shadow:0 6px 24px rgba(245,87,108,0.6); }
    @keyframes _bugPulse {
        0%,100%{box-shadow:0 4px 16px rgba(245,87,108,0.45)}
        50%{box-shadow:0 4px 24px rgba(245,87,108,0.8),0 0 0 6px rgba(245,87,108,0.15)}
    }
    #_bugModal {
        position:fixed; inset:0; z-index:99995;
        display:flex; align-items:center; justify-content:center; padding:1rem;
    }
    #_bugOverlay {
        position:absolute; inset:0;
        background:rgba(0,0,0,0.5); backdrop-filter:blur(4px);
    }
    #_bugBox {
        position:relative; z-index:1;
        background:#fff; border-radius:20px; width:100%; max-width:420px;
        box-shadow:0 24px 80px rgba(0,0,0,0.25);
        animation:_bugSlide 0.3s ease; overflow:hidden;
    }
    html[data-theme="dark"] #_bugBox { background:#1e1e3a; color:#e8e8ff; }
    @keyframes _bugSlide { from{opacity:0;transform:translateY(-16px)} to{opacity:1;transform:translateY(0)} }
    #_bugBox ._bh {
        background:linear-gradient(135deg,#f5576c,#f093fb);
        padding:1.25rem 1.5rem; display:flex; align-items:center; gap:0.75rem;
    }
    #_bugBox ._bh h3 { color:#fff; margin:0; font-size:1.05rem; font-weight:800; }
    #_bugBox ._bh p { color:rgba(255,255,255,0.85); margin:0; font-size:0.78rem; }
    #_bugBox ._bc { padding:1.25rem 1.5rem; }
    ._bug-field {
        margin-bottom:0.85rem;
    }
    ._bug-field label {
        display:block; font-size:0.75rem; font-weight:700; color:#667eea;
        text-transform:uppercase; letter-spacing:0.05em; margin-bottom:0.35rem;
    }
    ._bug-field select, ._bug-field textarea, ._bug-field input {
        width:100%; border:1.5px solid #e0e4ff; border-radius:10px;
        padding:0.65rem 0.85rem; font-size:0.88rem; background:#f8f9ff;
        color:#333; outline:none; transition:all 0.2s; box-sizing:border-box;
        font-family:inherit;
    }
    html[data-theme="dark"] ._bug-field select,
    html[data-theme="dark"] ._bug-field textarea,
    html[data-theme="dark"] ._bug-field input {
        background:#252545; border-color:#3a3a6a; color:#e0e0ff;
    }
    ._bug-field select:focus, ._bug-field textarea:focus, ._bug-field input:focus {
        border-color:#f5576c; box-shadow:0 0 0 3px rgba(245,87,108,0.12);
    }
    ._bug-field textarea { resize:vertical; min-height:80px; }
    ._bug-info {
        background:#f8f9ff; border-radius:10px; padding:0.65rem 0.85rem;
        font-size:0.75rem; color:#888; line-height:1.7; margin-bottom:0.85rem;
    }
    html[data-theme="dark"] ._bug-info { background:#252545; color:#9090b0; }
    ._bug-btns { display:flex; gap:0.6rem; }
    ._bug-submit {
        flex:1; padding:0.8rem; border:none; border-radius:12px;
        background:linear-gradient(135deg,#f5576c,#f093fb); color:#fff;
        font-size:0.92rem; font-weight:700; cursor:pointer; transition:all 0.2s;
    }
    ._bug-submit:hover { opacity:0.9; transform:translateY(-1px); }
    ._bug-submit:disabled { opacity:0.6; cursor:not-allowed; transform:none; }
    ._bug-cancel {
        padding:0.8rem 1.2rem; border:1.5px solid #e0e4ff; border-radius:12px;
        background:none; color:#999; font-size:0.88rem; font-weight:600;
        cursor:pointer; transition:all 0.2s;
    }
    ._bug-cancel:hover { border-color:#f5576c; color:#f5576c; }
    ._bug-success {
        text-align:center; padding:1.5rem;
    }
    ._bug-success .icon { font-size:3rem; margin-bottom:0.5rem; }
    ._bug-success h4 { color:#10b981; margin:0 0 0.4rem; font-size:1.1rem; }
    ._bug-success p { color:#888; font-size:0.85rem; margin:0; }
    ._bug-close-x {
        position:absolute; top:0.75rem; right:0.85rem;
        background:rgba(255,255,255,0.2); border:none; color:#fff;
        width:28px; height:28px; border-radius:50%; cursor:pointer;
        font-size:1rem; display:flex; align-items:center; justify-content:center;
        transition:all 0.2s;
    }
    ._bug-close-x:hover { background:rgba(255,255,255,0.35); }
    `;
    document.head.appendChild(style);

    btn.addEventListener('click', openBugModal);
}

function getDeviceInfo() {
    const ua = navigator.userAgent;
    let browser = 'Unknown';
    if (ua.includes('Edg/')) browser = 'Microsoft Edge';
    else if (ua.includes('Chrome/')) browser = 'Chrome';
    else if (ua.includes('Firefox/')) browser = 'Firefox';
    else if (ua.includes('Safari/')) browser = 'Safari';
    const isMobile = /Android|iPhone|iPad|iPod/i.test(ua);
    const device = isMobile ? '📱 Mobile' : '🖥️ Desktop';
    return { browser, device, ua: ua.slice(0, 120) };
}

function getUserInfo() {
    try {
        const u = JSON.parse(localStorage.getItem('user_info') || 'null');
        if (u) return { id: u.id, username: u.username, email: u.email };
    } catch {}
    return { id: null, username: 'Khách', email: '' };
}

function openBugModal() {
    if (document.getElementById('_bugModal')) return;
    const { browser, device } = getDeviceInfo();
    const user = getUserInfo();
    const page = window.location.pathname + window.location.search;
    const time = new Date().toLocaleString('vi-VN');

    const modal = document.createElement('div');
    modal.id = '_bugModal';
    modal.innerHTML = `
    <div id="_bugOverlay"></div>
    <div id="_bugBox">
        <div class="_bh">
            <div style="font-size:1.8rem">🐛</div>
            <div>
                <h3>Báo lỗi trang web</h3>
                <p>Mô tả lỗi bạn gặp phải để chúng tôi sửa nhanh nhất</p>
            </div>
            <button class="_bug-close-x" onclick="closeBugModal()">✕</button>
        </div>
        <div class="_bc">
            <div class="_bug-field">
                <label>Loại lỗi</label>
                <select id="_bugType">
                    <option value="ui">🎨 Giao diện bị lỗi / vỡ layout</option>
                    <option value="func">⚙️ Tính năng không hoạt động</option>
                    <option value="perf">🐌 Trang tải chậm / treo</option>
                    <option value="auth">🔐 Lỗi đăng nhập / tài khoản</option>
                    <option value="payment">💳 Lỗi thanh toán / VIP</option>
                    <option value="other">❓ Lỗi khác</option>
                </select>
            </div>
            <div class="_bug-field">
                <label>Mô tả lỗi *</label>
                <textarea id="_bugDesc" placeholder="Mô tả chi tiết lỗi bạn gặp phải... (VD: Bấm nút X thì không có phản hồi)" required></textarea>
            </div>
            <div class="_bug-info">
                <div>🌐 Trình duyệt: <strong>${browser}</strong></div>
                <div>${device} &nbsp;|&nbsp; 📄 Trang: <strong>${page}</strong></div>
                <div>🕒 Thời gian: <strong>${time}</strong></div>
                <div>🧑 User: <strong>${user.username}</strong>${user.id ? ' (ID: ' + user.id + ')' : ''}</div>
            </div>
            <div id="_bugErr" style="color:#f5576c;font-size:.82rem;margin-bottom:.6rem;display:none;"></div>
            <div class="_bug-btns">
                <button class="_bug-cancel" onclick="closeBugModal()">Hủy</button>
                <button class="_bug-submit" id="_bugSubmitBtn" onclick="submitBugReport()">
                    <i class="fas fa-paper-plane"></i> Gửi báo lỗi
                </button>
            </div>
        </div>
    </div>`;
    document.body.appendChild(modal);
    document.getElementById('_bugOverlay').addEventListener('click', closeBugModal);
    setTimeout(() => document.getElementById('_bugDesc').focus(), 100);
}

window.closeBugModal = function() {
    const m = document.getElementById('_bugModal');
    if (m) m.remove();
};

window.submitBugReport = async function() {
    const desc = (document.getElementById('_bugDesc').value || '').trim();
    const type = document.getElementById('_bugType').value;
    const errEl = document.getElementById('_bugErr');
    const btn = document.getElementById('_bugSubmitBtn');
    errEl.style.display = 'none';
    if (!desc) { errEl.textContent = '⚠️ Vui lòng mô tả lỗi'; errEl.style.display = 'block'; return; }

    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Đang gửi...';

    const { browser, device, ua } = getDeviceInfo();
    const user = getUserInfo();
    const payload = {
        type, desc,
        page: window.location.href,
        browser, device, ua,
        userId: user.id,
        username: user.username,
        userEmail: user.email,
        time: new Date().toISOString(),
        screenSize: `${window.screen.width}x${window.screen.height}`,
        lang: navigator.language
    };

    try {
        const apiBase = (typeof API_BASE !== 'undefined') ? API_BASE : '/api';
        const r = await fetch(`${apiBase}/bug-report`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const d = await r.json();
        if (!r.ok) throw new Error(d.error || 'Lỗi gửi báo cáo');

        // Hiện success
        const coinMsg = d.coinsAwarded
            ? `<div style="margin-top:.75rem;background:linear-gradient(135deg,rgba(245,158,11,.12),rgba(251,191,36,.08));border:1.5px solid rgba(245,158,11,.3);border-radius:12px;padding:.65rem 1rem;font-size:.88rem;color:#d97706;font-weight:700;">🎁 Tặng bạn <span style="font-size:1.1rem">+${d.coinsAwarded} coin</span> vì đã báo lỗi!</div>`
            : `<div style="margin-top:.75rem;font-size:.8rem;color:#aaa;">Đăng nhập để nhận coin khi báo lỗi 🎁</div>`;
        document.getElementById('_bugBox').innerHTML = `
            <div class="_bug-success">
                <div class="icon">✅</div>
                <h4>Đã gửi báo lỗi!</h4>
                <p>Cảm ơn bạn. Chúng tôi sẽ kiểm tra và sửa sớm nhất có thể.</p>
                ${coinMsg}
                <button onclick="closeBugModal()" style="margin-top:1rem;padding:.6rem 1.5rem;border:none;border-radius:50px;background:linear-gradient(135deg,#10b981,#059669);color:#fff;font-weight:700;cursor:pointer;">Đóng</button>
            </div>`;
    } catch(err) {
        errEl.textContent = '❌ ' + err.message;
        errEl.style.display = 'block';
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-paper-plane"></i> Gửi báo lỗi';
    }
};

// Khởi động sau khi DOM ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initBugReport);
} else {
    initBugReport();
}

})();
