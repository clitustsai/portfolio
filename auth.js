// ========== AUTH CLIENT ==========
const AUTH_TOKEN_KEY = 'user_token';
const AUTH_USER_KEY  = 'user_info';

function getToken()    { return localStorage.getItem(AUTH_TOKEN_KEY); }
function getUser()     { try { return JSON.parse(localStorage.getItem(AUTH_USER_KEY)); } catch { return null; } }
function isLoggedIn()  { return !!getToken() && !!getUser(); }

function saveSession(user, token) {
    localStorage.setItem(AUTH_TOKEN_KEY, token);
    localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
}
function clearSession() {
    localStorage.removeItem(AUTH_TOKEN_KEY);
    localStorage.removeItem(AUTH_USER_KEY);
}

async function apiRegister(username, email, password) {
    const r = await fetch(`${API_BASE}/auth/register`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, email, password })
    });
    const d = await r.json();
    if (!r.ok) throw new Error(d.error || 'Lỗi đăng ký');
    saveSession(d.user, d.token);
    return d.user;
}

async function apiLogin(email, password) {
    const r = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
    });
    const d = await r.json();
    if (!r.ok) throw new Error(d.error || 'Lỗi đăng nhập');
    saveSession(d.user, d.token);
    return d.user;
}

async function apiLogout() {
    const token = getToken();
    if (token) {
        try {
            await fetch(`${API_BASE}/auth/logout`, {
                method: 'POST', headers: { 'x-user-token': token }
            });
        } catch {}
    }
    clearSession();
}

async function postCommentAuth(data) {
    const token = getToken();
    if (!token) throw new Error('Chưa đăng nhập');
    const r = await fetch(`${API_BASE}/comments/auth`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-token': token },
        body: JSON.stringify(data)
    });
    const d = await r.json();
    if (!r.ok) throw new Error(d.error || 'Lỗi gửi bình luận');
    return d;
}

async function postBlogCommentAuth(postId, text) {
    const token = getToken();
    if (!token) throw new Error('Chưa đăng nhập');
    const r = await fetch(`${API_BASE}/blog/posts/${postId}/comments/auth`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-token': token },
        body: JSON.stringify({ text })
    });
    const d = await r.json();
    if (!r.ok) throw new Error(d.error || 'Lỗi gửi bình luận');
    return d;
}

// ========== AUTH MODAL UI ==========
function initAuthModal() {
    if (document.getElementById('authModal')) return;

    const modal = document.createElement('div');
    modal.id = 'authModal';
    modal.innerHTML = `
    <div class="auth-overlay" id="authOverlay" onclick="closeAuthModal()"></div>
    <div class="auth-box">
        <button class="auth-close-btn" onclick="closeAuthModal()">×</button>
        <div class="auth-tabs">
            <button class="auth-tab active" id="tabLogin" onclick="switchAuthTab('login')">Đăng Nhập</button>
            <button class="auth-tab" id="tabRegister" onclick="switchAuthTab('register')">Đăng Ký</button>
        </div>

        <!-- Login form -->
        <form id="loginForm" class="auth-form" onsubmit="handleLogin(event)">
            <div class="auth-logo">🔐</div>
            <h3>Chào mừng trở lại!</h3>
            <p class="auth-sub">Đăng nhập để bình luận và tương tác</p>

            <!-- OAuth buttons -->
            <div class="oauth-btns">
                <button type="button" class="oauth-btn oauth-google" onclick="loginWithGoogle()">
                    <svg width="18" height="18" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
                    Tiếp tục với Google
                </button>
                <button type="button" class="oauth-btn oauth-facebook" onclick="loginWithFacebook()">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="#1877F2"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                    Tiếp tục với Facebook
                </button>
            </div>

            <div class="auth-divider"><span>hoặc</span></div>

            <div class="auth-field">
                <i class="fas fa-envelope"></i>
                <input type="email" id="loginEmail" placeholder="Email của bạn" required autocomplete="email">
            </div>
            <div class="auth-field">
                <i class="fas fa-lock"></i>
                <input type="password" id="loginPassword" placeholder="Mật khẩu" required autocomplete="current-password">
            </div>
            <p class="auth-error" id="loginError"></p>
            <button type="submit" class="auth-submit-btn" id="loginBtn">
                <i class="fas fa-sign-in-alt"></i> Đăng Nhập
            </button>
            <p class="auth-switch">Chưa có tài khoản? <a onclick="switchAuthTab('register')">Đăng ký ngay</a></p>
        </form>

        <!-- Register form -->
        <form id="registerForm" class="auth-form" style="display:none" onsubmit="handleRegister(event)">
            <div class="auth-logo">✨</div>
            <h3>Tạo tài khoản mới</h3>
            <p class="auth-sub">Tham gia cộng đồng để bình luận</p>

            <!-- OAuth buttons -->
            <div class="oauth-btns">
                <button type="button" class="oauth-btn oauth-google" onclick="loginWithGoogle()">
                    <svg width="18" height="18" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
                    Đăng ký với Google
                </button>
                <button type="button" class="oauth-btn oauth-facebook" onclick="loginWithFacebook()">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="#1877F2"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                    Đăng ký với Facebook
                </button>
            </div>

            <div class="auth-divider"><span>hoặc</span></div>

            <div class="auth-field">
                <i class="fas fa-user"></i>
                <input type="text" id="regUsername" placeholder="Tên hiển thị *" required minlength="2" maxlength="50">
            </div>
            <div class="auth-field">
                <i class="fas fa-envelope"></i>
                <input type="email" id="regEmail" placeholder="Email *" required autocomplete="email">
            </div>
            <div class="auth-field">
                <i class="fas fa-lock"></i>
                <input type="password" id="regPassword" placeholder="Mật khẩu (tối thiểu 6 ký tự) *" required minlength="6" autocomplete="new-password">
            </div>
            <p class="auth-error" id="registerError"></p>
            <button type="submit" class="auth-submit-btn" id="registerBtn">
                <i class="fas fa-user-plus"></i> Đăng Ký
            </button>
            <p class="auth-switch">Đã có tài khoản? <a onclick="switchAuthTab('login')">Đăng nhập</a></p>
        </form>
    </div>`;

    // CSS
    const style = document.createElement('style');
    style.textContent = `
    #authModal { position:fixed; inset:0; z-index:99998; display:flex; align-items:center; justify-content:center; padding:1rem; }
    .auth-overlay { position:absolute; inset:0; background:rgba(0,0,0,0.55); backdrop-filter:blur(4px); }
    .auth-box {
        position:relative; z-index:1; background:#fff; border-radius:24px;
        padding:2.5rem 2rem; width:100%; max-width:400px;
        box-shadow:0 24px 80px rgba(0,0,0,0.25); animation:authSlideIn 0.3s ease;
    }
    html[data-theme="dark"] .auth-box { background:#1e1e3a; color:#e8e8ff; }
    @keyframes authSlideIn { from{opacity:0;transform:translateY(-20px)} to{opacity:1;transform:translateY(0)} }
    .auth-close-btn {
        position:absolute; top:1rem; right:1rem; background:none; border:none;
        font-size:1.5rem; cursor:pointer; color:#999; line-height:1; padding:0.2rem 0.5rem;
        border-radius:50%; transition:all 0.2s;
    }
    .auth-close-btn:hover { background:#f0f0f0; color:#333; }
    html[data-theme="dark"] .auth-close-btn:hover { background:#2a2a4a; color:#fff; }
    .auth-tabs { display:flex; gap:0; margin-bottom:1.75rem; background:#f5f5ff; border-radius:12px; padding:4px; }
    html[data-theme="dark"] .auth-tabs { background:#252545; }
    .auth-tab {
        flex:1; padding:0.6rem; border:none; background:none; border-radius:10px;
        cursor:pointer; font-size:0.9rem; font-weight:600; color:#888; transition:all 0.2s;
    }
    .auth-tab.active { background:#fff; color:#667eea; box-shadow:0 2px 8px rgba(0,0,0,0.1); }
    html[data-theme="dark"] .auth-tab.active { background:#1e1e3a; color:#818cf8; }
    .auth-logo { font-size:2.5rem; text-align:center; margin-bottom:0.5rem; }
    .auth-form h3 { text-align:center; font-size:1.2rem; margin:0 0 0.3rem; color:#1a1a2e; }
    html[data-theme="dark"] .auth-form h3 { color:#e8e8ff; }
    .auth-sub { text-align:center; color:#999; font-size:0.82rem; margin:0 0 1.5rem; }
    .auth-field {
        display:flex; align-items:center; gap:0.75rem;
        border:1.5px solid #e0e4ff; border-radius:12px; padding:0.75rem 1rem;
        margin-bottom:0.85rem; background:#f8f9ff; transition:all 0.2s;
    }
    html[data-theme="dark"] .auth-field { background:#252545; border-color:#3a3a6a; }
    .auth-field:focus-within { border-color:#667eea; background:#fff; box-shadow:0 0 0 3px rgba(102,126,234,0.12); }
    html[data-theme="dark"] .auth-field:focus-within { background:#1e1e3a; }
    .auth-field i { color:#667eea; font-size:0.9rem; width:16px; flex-shrink:0; }
    .auth-field input { border:none; background:none; outline:none; flex:1; font-size:0.95rem; color:#333; }
    html[data-theme="dark"] .auth-field input { color:#e0e0ff; }
    .auth-field input::placeholder { color:#bbb; }
    .auth-error { color:#f5576c; font-size:0.82rem; text-align:center; min-height:1.2em; margin:0 0 0.75rem; }
    .auth-submit-btn {
        width:100%; padding:0.9rem; border:none; border-radius:12px;
        background:linear-gradient(135deg,#667eea,#764ba2); color:#fff;
        font-size:1rem; font-weight:700; cursor:pointer; transition:all 0.2s;
        display:flex; align-items:center; justify-content:center; gap:0.5rem;
        box-shadow:0 4px 14px rgba(102,126,234,0.35);
    }
    .auth-submit-btn:hover { opacity:0.9; transform:translateY(-2px); }
    .auth-submit-btn:disabled { opacity:0.6; cursor:not-allowed; transform:none; }
    .auth-switch { text-align:center; font-size:0.82rem; color:#999; margin:1rem 0 0; }
    .auth-switch a { color:#667eea; cursor:pointer; font-weight:600; text-decoration:underline; }

    /* OAuth buttons */
    .oauth-btns { display:flex; flex-direction:column; gap:0.6rem; margin-bottom:0.5rem; }
    .oauth-btn {
        display:flex; align-items:center; justify-content:center; gap:0.65rem;
        width:100%; padding:0.75rem 1rem; border-radius:12px; border:1.5px solid #e0e4ff;
        background:#fff; cursor:pointer; font-size:0.9rem; font-weight:600;
        color:#333; transition:all 0.2s; box-shadow:0 1px 4px rgba(0,0,0,0.06);
    }
    html[data-theme="dark"] .oauth-btn { background:#252545; border-color:#3a3a6a; color:#e0e0ff; }
    .oauth-btn:hover { transform:translateY(-2px); box-shadow:0 4px 14px rgba(0,0,0,0.1); }
    .oauth-google:hover { border-color:#4285F4; background:#f0f4ff; }
    html[data-theme="dark"] .oauth-google:hover { background:#1a2040; }
    .oauth-facebook:hover { border-color:#1877F2; background:#f0f4ff; }
    html[data-theme="dark"] .oauth-facebook:hover { background:#1a2040; }
    .auth-divider {
        display:flex; align-items:center; gap:0.75rem;
        margin:0.75rem 0; color:#bbb; font-size:0.78rem;
    }
    .auth-divider::before, .auth-divider::after {
        content:''; flex:1; height:1px; background:#e8eaf6;
    }
    html[data-theme="dark"] .auth-divider::before,
    html[data-theme="dark"] .auth-divider::after { background:#2a2a4a; }

    /* Nav user avatar */
    .nav-user-btn {
        display:flex; align-items:center; gap:0.5rem;
        background:linear-gradient(135deg,#667eea,#764ba2);
        color:#fff; border:none; border-radius:50px; padding:0.4rem 0.9rem;
        cursor:pointer; font-size:0.82rem; font-weight:700; transition:all 0.2s;
        white-space:nowrap; flex-shrink:0;
    }
    .nav-user-btn:hover { opacity:0.88; transform:scale(1.04); }
    .nav-user-avatar {
        width:26px; height:26px; border-radius:50%;
        background:rgba(255,255,255,0.3); display:flex; align-items:center;
        justify-content:center; font-size:0.75rem; font-weight:800;
    }
    .nav-login-btn {
        background:none; border:1.5px solid #667eea; color:#667eea;
        border-radius:50px; padding:0.38rem 0.9rem; cursor:pointer;
        font-size:0.82rem; font-weight:700; transition:all 0.2s; flex-shrink:0;
        white-space:nowrap;
    }
    .nav-login-btn:hover { background:#667eea; color:#fff; }

    /* Comment locked state */
    .comment-locked {
        text-align:center; padding:2rem 1rem;
        background:linear-gradient(135deg,rgba(102,126,234,0.06),rgba(118,75,162,0.06));
        border-radius:16px; border:1.5px dashed rgba(102,126,234,0.25);
        margin-bottom:1.5rem;
    }
    .comment-locked i { font-size:2rem; color:#667eea; display:block; margin-bottom:0.75rem; }
    .comment-locked p { color:#666; font-size:0.9rem; margin:0 0 1rem; }
    html[data-theme="dark"] .comment-locked p { color:#9090b0; }
    .comment-locked-btns { display:flex; gap:0.75rem; justify-content:center; flex-wrap:wrap; }
    .btn-login-comment {
        background:linear-gradient(135deg,#667eea,#764ba2); color:#fff;
        border:none; border-radius:50px; padding:0.6rem 1.5rem;
        cursor:pointer; font-size:0.88rem; font-weight:700; transition:all 0.2s;
    }
    .btn-login-comment:hover { opacity:0.88; transform:translateY(-2px); }
    .btn-register-comment {
        background:none; border:1.5px solid #667eea; color:#667eea;
        border-radius:50px; padding:0.6rem 1.5rem;
        cursor:pointer; font-size:0.88rem; font-weight:700; transition:all 0.2s;
    }
    .btn-register-comment:hover { background:#667eea; color:#fff; }
    `;
    document.head.appendChild(style);
    document.body.appendChild(modal);
}

function openAuthModal(tab) {
    initAuthModal();
    document.getElementById('authModal').style.display = 'flex';
    switchAuthTab(tab || 'login');
    document.body.style.overflow = 'hidden';
}

function closeAuthModal() {
    const m = document.getElementById('authModal');
    if (m) m.style.display = 'none';
    document.body.style.overflow = '';
}

function switchAuthTab(tab) {
    document.getElementById('loginForm').style.display  = tab === 'login'    ? 'block' : 'none';
    document.getElementById('registerForm').style.display = tab === 'register' ? 'block' : 'none';
    document.getElementById('tabLogin').classList.toggle('active',    tab === 'login');
    document.getElementById('tabRegister').classList.toggle('active', tab === 'register');
    document.getElementById('loginError').textContent = '';
    document.getElementById('registerError').textContent = '';
}

async function handleLogin(e) {
    e.preventDefault();
    const btn = document.getElementById('loginBtn');
    const errEl = document.getElementById('loginError');
    errEl.textContent = '';
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Đang đăng nhập...';
    try {
        const user = await apiLogin(
            document.getElementById('loginEmail').value.trim(),
            document.getElementById('loginPassword').value
        );
        closeAuthModal();
        updateNavAuth();
        updateCommentForms();
        if (typeof showToast === 'function') showToast(`👋 Chào ${user.username}!`, 'success', 3000);
    } catch(err) {
        errEl.textContent = err.message;
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Đăng Nhập';
    }
}

async function handleRegister(e) {
    e.preventDefault();
    const btn = document.getElementById('registerBtn');
    const errEl = document.getElementById('registerError');
    errEl.textContent = '';
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Đang đăng ký...';
    try {
        const user = await apiRegister(
            document.getElementById('regUsername').value.trim(),
            document.getElementById('regEmail').value.trim(),
            document.getElementById('regPassword').value
        );
        closeAuthModal();
        updateNavAuth();
        updateCommentForms();
        if (typeof showToast === 'function') showToast(`🎉 Đăng ký thành công! Chào ${user.username}!`, 'success', 4000);
    } catch(err) {
        errEl.textContent = err.message;
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-user-plus"></i> Đăng Ký';
    }
}

async function handleLogout() {
    await apiLogout();
    updateNavAuth();
    updateCommentForms();
    if (typeof showToast === 'function') showToast('👋 Đã đăng xuất', 'info', 2000);
}

// ========== NAV AUTH BUTTON ==========
function updateNavAuth() {
    const user = getUser();
    // Tìm tất cả nav auth containers
    document.querySelectorAll('.nav-auth-slot').forEach(slot => {
        if (user) {
            slot.innerHTML = `
                <button class="nav-user-btn" onclick="handleLogout()">
                    <div class="nav-user-avatar">${user.username[0].toUpperCase()}</div>
                    ${user.username}
                    <i class="fas fa-sign-out-alt" style="font-size:0.75rem;opacity:0.8"></i>
                </button>`;
        } else {
            slot.innerHTML = `<button class="nav-login-btn" onclick="openAuthModal('login')"><i class="fas fa-user"></i> Đăng nhập</button>`;
        }
    });
}

// ========== COMMENT FORM GUARD ==========
function updateCommentForms() {
    const user = getUser();
    // Portfolio feedback form (index.html)
    const feedbackWrapper = document.querySelector('.feedback-form-wrapper');
    if (feedbackWrapper) {
        const locked = feedbackWrapper.querySelector('.comment-locked');
        const form   = feedbackWrapper.querySelector('#feedbackForm');
        if (user) {
            if (locked) locked.remove();
            if (form) {
                form.style.display = 'block';
                // Pre-fill name
                const nameInput = document.getElementById('feedbackName');
                if (nameInput && !nameInput.value) nameInput.value = user.username;
            }
        } else {
            if (form) form.style.display = 'none';
            if (!locked) {
                const div = document.createElement('div');
                div.className = 'comment-locked';
                div.innerHTML = `
                    <i class="fas fa-lock"></i>
                    <p>Bạn cần đăng nhập để gửi bình luận</p>
                    <div class="comment-locked-btns">
                        <button class="btn-login-comment" onclick="openAuthModal('login')">Đăng Nhập</button>
                        <button class="btn-register-comment" onclick="openAuthModal('register')">Đăng Ký</button>
                    </div>`;
                feedbackWrapper.insertBefore(div, form);
            }
        }
    }

    // Blog post comment form
    const postCommentForm = document.getElementById('postCommentForm');
    if (postCommentForm) {
        const wrapper = postCommentForm.parentElement;
        const locked  = wrapper.querySelector('.comment-locked');
        if (user) {
            if (locked) locked.remove();
            postCommentForm.style.display = 'flex';
        } else {
            postCommentForm.style.display = 'none';
            if (!locked) {
                const div = document.createElement('div');
                div.className = 'comment-locked';
                div.innerHTML = `
                    <i class="fas fa-lock"></i>
                    <p>Đăng nhập để bình luận bài viết này</p>
                    <div class="comment-locked-btns">
                        <button class="btn-login-comment" onclick="openAuthModal('login')">Đăng Nhập</button>
                        <button class="btn-register-comment" onclick="openAuthModal('register')">Đăng Ký</button>
                    </div>`;
                wrapper.insertBefore(div, postCommentForm);
            }
        }
    }
}

// Khởi động auth state khi load trang
document.addEventListener('DOMContentLoaded', () => {
    updateNavAuth();
    updateCommentForms();
    handleOAuthCallback();
});

// ========== OAUTH ==========
function loginWithGoogle() {
    window.location.href = `${API_BASE}/auth/google`;
}

function loginWithFacebook() {
    window.location.href = `${API_BASE}/auth/facebook`;
}

// Xử lý redirect sau OAuth (nhận token từ URL params)
function handleOAuthCallback() {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('auth_token');
    const userStr = params.get('auth_user');
    const error = params.get('auth_error');

    if (error) {
        // Xóa params khỏi URL
        const clean = window.location.pathname;
        window.history.replaceState({}, '', clean);
        setTimeout(() => {
            if (typeof showToast === 'function') showToast('❌ Đăng nhập thất bại: ' + decodeURIComponent(error), 'error', 5000);
        }, 500);
        return;
    }

    if (token && userStr) {
        try {
            const user = JSON.parse(decodeURIComponent(userStr));
            saveSession(user, token);
            // Xóa params khỏi URL
            const clean = window.location.pathname;
            window.history.replaceState({}, '', clean);
            updateNavAuth();
            updateCommentForms();
            setTimeout(() => {
                if (typeof showToast === 'function') showToast(`🎉 Chào mừng ${user.username}!`, 'success', 3000);
            }, 500);
        } catch(e) {
            console.error('OAuth callback parse error:', e);
        }
    }
}
