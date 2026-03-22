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
                method: 'POST', headers: { 'Authorization': `Bearer ${token}` }
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
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
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
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
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
            <button class="auth-tab" id="tabPhone" onclick="switchAuthTab('phone')">📱 SĐT</button>
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
            <p class="auth-switch" style="margin-bottom:.4rem">Chưa có tài khoản? <a onclick="switchAuthTab('register')">Đăng ký ngay</a></p>
            <p class="auth-switch" style="margin-top:0"><a onclick="switchAuthTab('forgot')" style="color:#999;font-size:.78rem">Quên mật khẩu?</a></p>
        </form>

        <!-- Register form -->
        <form id="registerForm" class="auth-form" style="display:none" onsubmit="handleRegister(event)">            <div class="auth-logo">✨</div>
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

        <!-- Forgot password form -->
        <form id="forgotForm" class="auth-form" style="display:none" onsubmit="handleForgotPassword(event)">
            <div class="auth-logo">📧</div>
            <h3>Quên mật khẩu?</h3>
            <p class="auth-sub">Nhập email — chúng tôi gửi link đặt lại ngay</p>
            <div class="auth-field">
                <i class="fas fa-envelope"></i>
                <input type="email" id="forgotEmail" placeholder="Email của bạn" required autocomplete="email">
            </div>
            <p class="auth-error" id="forgotError"></p>
            <div id="forgotSuccess" style="display:none;background:#f0fdf4;border:1.5px solid #86efac;border-radius:12px;padding:.85rem 1rem;font-size:.85rem;color:#166534;text-align:center;margin-bottom:.75rem;"></div>
            <button type="submit" class="auth-submit-btn" id="forgotBtn" style="background:linear-gradient(135deg,#10b981,#059669);">
                <i class="fas fa-paper-plane"></i> Gửi link đặt lại
            </button>
            <p class="auth-switch"><a onclick="switchAuthTab('login')">← Quay lại đăng nhập</a></p>
        </form>

        <!-- Phone OTP form -->
        <form id="phoneForm" class="auth-form" style="display:none" onsubmit="handlePhoneSendOTP(event)">
            <div class="auth-logo">📱</div>
            <h3 id="phoneFormTitle">Đăng nhập bằng SĐT</h3>
            <p class="auth-sub" id="phoneFormSub">Nhập số điện thoại để nhận mã OTP</p>

            <!-- Step 1: nhập SĐT -->
            <div id="phoneStep1">
                <div class="auth-field">
                    <i class="fas fa-phone"></i>
                    <input type="tel" id="phoneInput" placeholder="Số điện thoại (VD: 0901234567)" required autocomplete="tel">
                </div>
                <div id="phoneUsernameWrap" style="display:none">
                    <div class="auth-field">
                        <i class="fas fa-user"></i>
                        <input type="text" id="phoneUsername" placeholder="Tên hiển thị *" minlength="2" maxlength="50">
                    </div>
                </div>
                <p class="auth-error" id="phoneError"></p>
                <button type="submit" class="auth-submit-btn" id="phoneSendBtn" style="background:linear-gradient(135deg,#10b981,#059669);">
                    <i class="fas fa-paper-plane"></i> Gửi OTP
                </button>
            </div>

            <!-- Step 2: nhập OTP -->
            <div id="phoneStep2" style="display:none">
                <p style="text-align:center;font-size:.85rem;color:#666;margin-bottom:1rem;">
                    Đã gửi OTP đến <strong id="phoneSentTo"></strong>
                </p>
                <div class="auth-field">
                    <i class="fas fa-key"></i>
                    <input type="text" id="otpInput" placeholder="Nhập mã OTP 6 số" maxlength="6" pattern="[0-9]{6}" inputmode="numeric" autocomplete="one-time-code">
                </div>
                <p style="text-align:center;font-size:.8rem;color:#999;margin-bottom:.75rem;">
                    Hết hạn sau: <span id="otpCountdown" style="color:#f59e0b;font-weight:700;">5:00</span>
                </p>
                <p class="auth-error" id="otpError"></p>
                <button type="button" class="auth-submit-btn" id="otpVerifyBtn" onclick="handleOTPVerify()" style="background:linear-gradient(135deg,#667eea,#764ba2);">
                    <i class="fas fa-check-circle"></i> Xác nhận OTP
                </button>
                <p style="text-align:center;margin-top:.75rem;">
                    <a id="otpResendBtn" onclick="handlePhoneResend()" style="color:#667eea;cursor:pointer;font-size:.82rem;font-weight:600;text-decoration:underline;">Gửi lại OTP</a>
                    <span id="otpResendCountdown" style="color:#999;font-size:.82rem;"></span>
                </p>
                <p style="text-align:center;margin-top:.5rem;">
                    <a onclick="resetPhoneForm()" style="color:#999;cursor:pointer;font-size:.78rem;">← Đổi số điện thoại</a>
                </p>
            </div>

            <div class="auth-divider" style="margin-top:1rem"><span>hoặc chọn</span></div>
            <div style="display:flex;gap:.5rem;justify-content:center;flex-wrap:wrap;margin-top:.5rem">
                <a onclick="setPhoneMode('login')" id="phoneModeLogin" style="cursor:pointer;font-size:.8rem;padding:.3rem .8rem;border-radius:50px;border:1.5px solid #667eea;color:#667eea;font-weight:700;">Đăng nhập</a>
                <a onclick="setPhoneMode('register')" id="phoneModeRegister" style="cursor:pointer;font-size:.8rem;padding:.3rem .8rem;border-radius:50px;border:1.5px solid #e0e4ff;color:#999;font-weight:600;">Đăng ký</a>
                <a onclick="setPhoneMode('reset')" id="phoneModeReset" style="cursor:pointer;font-size:.8rem;padding:.3rem .8rem;border-radius:50px;border:1.5px solid #e0e4ff;color:#999;font-weight:600;">Quên MK</a>
            </div>
        </form>

        <!-- Phone Reset Password Step 3 -->
        <form id="phoneResetForm" class="auth-form" style="display:none" onsubmit="handlePhoneResetPassword(event)">
            <div class="auth-logo">🔐</div>
            <h3>Tạo mật khẩu mới</h3>
            <p class="auth-sub">Nhập mật khẩu mới cho tài khoản</p>
            <div class="auth-field">
                <i class="fas fa-lock"></i>
                <input type="password" id="phoneNewPassword" placeholder="Mật khẩu mới (tối thiểu 6 ký tự)" required minlength="6">
            </div>
            <div class="auth-field">
                <i class="fas fa-lock"></i>
                <input type="password" id="phoneConfirmPassword" placeholder="Xác nhận mật khẩu" required minlength="6">
            </div>
            <p class="auth-error" id="phoneResetError"></p>
            <button type="submit" class="auth-submit-btn" id="phoneResetBtn" style="background:linear-gradient(135deg,#10b981,#059669);">
                <i class="fas fa-save"></i> Đặt mật khẩu mới
            </button>
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
    document.getElementById('loginForm').style.display    = tab === 'login'    ? 'block' : 'none';
    document.getElementById('registerForm').style.display = tab === 'register' ? 'block' : 'none';
    document.getElementById('forgotForm').style.display   = tab === 'forgot'   ? 'block' : 'none';
    document.getElementById('phoneForm').style.display    = tab === 'phone'    ? 'block' : 'none';
    if (document.getElementById('phoneResetForm'))
        document.getElementById('phoneResetForm').style.display = 'none';
    document.getElementById('tabLogin').classList.toggle('active',    tab === 'login');
    document.getElementById('tabRegister').classList.toggle('active', tab === 'register');
    document.getElementById('tabPhone').classList.toggle('active',    tab === 'phone');
    document.getElementById('loginError').textContent    = '';
    document.getElementById('registerError').textContent = '';
    if (document.getElementById('forgotError')) document.getElementById('forgotError').textContent = '';
    if (tab === 'phone') { resetPhoneForm(); setPhoneMode('login'); }
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
        if (typeof onToolsAuthSuccess === 'function') onToolsAuthSuccess(user);
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
        if (typeof onToolsAuthSuccess === 'function') onToolsAuthSuccess(user);
        if (typeof showToast === 'function') showToast(`🎉 Đăng ký thành công! Chào ${user.username}!`, 'success', 4000);
        if (typeof laEvent === 'function') laEvent('join', 'Thành viên mới vừa tham gia cộng đồng!');
    } catch(err) {
        errEl.textContent = err.message;
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-user-plus"></i> Đăng Ký';
    }
}

async function handleForgotPassword(e) {
    e.preventDefault();
    const btn = document.getElementById('forgotBtn');
    const errEl = document.getElementById('forgotError');
    const successEl = document.getElementById('forgotSuccess');
    errEl.textContent = ''; successEl.style.display = 'none';
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Đang gửi...';
    try {
        const email = document.getElementById('forgotEmail').value.trim();
        const r = await fetch(`${API_BASE}/auth/forgot-password`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email })
        });
        const d = await r.json();
        if (!r.ok) throw new Error(d.error || 'Lỗi gửi email');
        successEl.innerHTML = '✅ Đã gửi! Kiểm tra hộp thư <strong>' + email + '</strong><br><span style="font-size:.78rem;color:#666">Link có hiệu lực 15 phút. Kiểm tra cả thư mục Spam.</span>';
        successEl.style.display = 'block';
        btn.style.display = 'none';
    } catch(err) {
        errEl.textContent = err.message;
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-paper-plane"></i> Gửi link đặt lại';
    }
}

async function handleLogout() {    await apiLogout();
    updateNavAuth();
    updateCommentForms();
    if (typeof showToast === 'function') showToast('👋 Đã đăng xuất', 'info', 2000);
}

// ========== NAV AUTH BUTTON — VIP DROPDOWN ==========
function _buildAvatar(user, size) {
    size = size || 32;
    if (user.avatar) {
        return '<img src="' + user.avatar + '" style="width:' + size + 'px;height:' + size + 'px;border-radius:50%;object-fit:cover;border:2px solid rgba(255,255,255,0.4);" onerror="this.style.display=\'none\';this.nextSibling.style.display=\'flex\'">' +
               '<span style="display:none;width:' + size + 'px;height:' + size + 'px;border-radius:50%;background:rgba(255,255,255,0.25);align-items:center;justify-content:center;font-size:' + Math.round(size*0.45) + 'px;font-weight:800;">' + user.username[0].toUpperCase() + '</span>';
    }
    return '<span style="width:' + size + 'px;height:' + size + 'px;border-radius:50%;background:rgba(255,255,255,0.25);display:flex;align-items:center;justify-content:center;font-size:' + Math.round(size*0.45) + 'px;font-weight:800;">' + user.username[0].toUpperCase() + '</span>';
}

function updateNavAuth() {
    const user = getUser();
    document.querySelectorAll('.nav-auth-slot').forEach(slot => {
        if (user) {
            const vipBadge = window._navVipStatus ? '<span style="background:linear-gradient(135deg,#f59e0b,#d97706);color:#fff;font-size:0.6rem;font-weight:800;padding:1px 6px;border-radius:50px;margin-left:2px;">VIP</span>' : '';
            slot.innerHTML =
                '<div class="nav-user-wrap" style="position:relative;">' +
                  '<button class="nav-user-btn" id="navUserBtn" onclick="toggleUserDropdown(event)">' +
                    _buildAvatar(user, 28) +
                    '<span style="max-width:80px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">' + user.username + '</span>' +
                    vipBadge +
                    '<i class="fas fa-chevron-down" style="font-size:0.65rem;opacity:0.7;transition:transform 0.2s;" id="navChevron"></i>' +
                  '</button>' +
                  '<div class="nav-user-dropdown" id="navUserDropdown">' +
                    '<div class="nud-header">' +
                      '<div class="nud-avatar-wrap" onclick="openProfileModal()" title="Đổi ảnh đại diện">' +
                        _buildAvatar(user, 52) +
                        '<div class="nud-avatar-edit"><i class="fas fa-camera"></i></div>' +
                      '</div>' +
                      '<div class="nud-info">' +
                        '<div class="nud-name">' + user.username + '</div>' +
                        '<div class="nud-email">' + (user.email || '') + '</div>' +
                        (window._navVipStatus ? '<div class="nud-vip-badge">👑 VIP Member</div>' : '<div class="nud-free-badge">🆓 Free Plan</div>') +
                      '</div>' +
                    '</div>' +
                    '<div class="nud-divider"></div>' +
                    '<button class="nud-item" onclick="openProfileModal()"><i class="fas fa-user-edit"></i> Chỉnh sửa hồ sơ</button>' +
                    '<a class="nud-item" href="dashboard.html"><i class="fas fa-tachometer-alt"></i> Dashboard</a>' +
                    '<a class="nud-item" href="arcade.html"><i class="fas fa-gamepad"></i> Arcade 🎮 <span id="navCoinBadge" style="margin-left:auto;background:rgba(245,158,11,.15);color:#fbbf24;font-size:.65rem;font-weight:800;padding:1px 7px;border-radius:50px;">🪙 ...</span></a>' +
                    '<a class="nud-item" href="tools.html"><i class="fas fa-robot"></i> AI Tools</a>' +
                    '<a class="nud-item" href="payment.html"><i class="fas fa-crown"></i> ' + (window._navVipStatus ? 'Quản lý VIP' : 'Nâng cấp VIP') + '</a>' +
                    '<div class="nud-divider"></div>' +
                    '<button class="nud-item nud-logout" onclick="handleLogout()"><i class="fas fa-sign-out-alt"></i> Đăng xuất</button>' +
                  '</div>' +
                '</div>';
            // Check VIP status async
            _checkNavVip(user.email);
            _loadNavCoins();
        } else {
            slot.innerHTML =
                '<button class="nav-login-btn" onclick="openAuthModal(\'login\')">' +
                  '<i class="fas fa-user"></i> Đăng nhập' +
                '</button>';
        }
    });
    _injectNavDropdownCSS();
}

async function _checkNavVip(email) {
    try {
        const r = await fetch(API_BASE + '/subscription/check?email=' + encodeURIComponent(email));
        const d = await r.json();
        window._navVipStatus = d.hasSubscription;
        if (d.hasSubscription) updateNavAuth(); // re-render with VIP badge
    } catch(e) {}
}

async function _loadNavCoins() {
    try {
        const token = getToken();
        if (!token) return;
        const r = await fetch(API_BASE + '/coins/balance', { headers: { 'Authorization': 'Bearer ' + token } });
        const d = await r.json();
        const badge = document.getElementById('navCoinBadge');
        if (badge) badge.textContent = '🪙 ' + (d.coins || 0);
    } catch(e) {}
}

function toggleUserDropdown(e) {
    e.stopPropagation();
    const dd = document.getElementById('navUserDropdown');
    const chevron = document.getElementById('navChevron');
    if (!dd) return;
    const isOpen = dd.classList.toggle('open');
    if (chevron) chevron.style.transform = isOpen ? 'rotate(180deg)' : '';
    if (isOpen) {
        setTimeout(() => document.addEventListener('click', _closeDropdownOutside, { once: true }), 0);
    }
}
function _closeDropdownOutside(e) {
    const dd = document.getElementById('navUserDropdown');
    const btn = document.getElementById('navUserBtn');
    if (dd && !dd.contains(e.target) && e.target !== btn) {
        dd.classList.remove('open');
        const chevron = document.getElementById('navChevron');
        if (chevron) chevron.style.transform = '';
    }
}

function _injectNavDropdownCSS() {
    if (document.getElementById('_navDropCSS')) return;
    const s = document.createElement('style');
    s.id = '_navDropCSS';
    s.textContent = `
    .nav-user-btn {
        display:flex;align-items:center;gap:0.45rem;
        background:linear-gradient(135deg,#667eea,#764ba2);
        color:#fff;border:none;border-radius:50px;padding:0.35rem 0.85rem 0.35rem 0.4rem;
        cursor:pointer;font-size:0.82rem;font-weight:700;transition:all 0.25s;
        white-space:nowrap;flex-shrink:0;
        box-shadow:0 4px 14px rgba(102,126,234,0.35);
    }
    .nav-user-btn:hover { transform:translateY(-2px); box-shadow:0 6px 20px rgba(102,126,234,0.5); }
    .nav-login-btn {
        background:none;border:1.5px solid #667eea;color:#667eea;
        border-radius:50px;padding:0.38rem 0.9rem;cursor:pointer;
        font-size:0.82rem;font-weight:700;transition:all 0.2s;flex-shrink:0;white-space:nowrap;
    }
    .nav-login-btn:hover { background:#667eea;color:#fff;transform:translateY(-2px); }
    .nav-user-wrap { position:relative; }
    .nav-user-dropdown {
        position:absolute;top:calc(100% + 10px);right:0;
        background:#fff;border-radius:18px;min-width:240px;
        box-shadow:0 20px 60px rgba(0,0,0,0.18),0 0 0 1px rgba(102,126,234,0.1);
        padding:0.5rem;z-index:9999;
        opacity:0;transform:translateY(-8px) scale(0.97);pointer-events:none;
        transition:all 0.22s cubic-bezier(0.4,0,0.2,1);
    }
    html[data-theme="dark"] .nav-user-dropdown { background:#1e1e3a;box-shadow:0 20px 60px rgba(0,0,0,0.5),0 0 0 1px rgba(102,126,234,0.2); }
    .nav-user-dropdown.open { opacity:1;transform:translateY(0) scale(1);pointer-events:all; }
    .nud-header { display:flex;align-items:center;gap:0.85rem;padding:0.85rem 0.75rem 0.75rem; }
    .nud-avatar-wrap { position:relative;cursor:pointer;flex-shrink:0; }
    .nud-avatar-edit {
        position:absolute;bottom:-2px;right:-2px;
        width:20px;height:20px;border-radius:50%;
        background:linear-gradient(135deg,#667eea,#764ba2);
        display:flex;align-items:center;justify-content:center;
        color:#fff;font-size:0.6rem;border:2px solid #fff;
        transition:transform 0.2s;
    }
    .nud-avatar-wrap:hover .nud-avatar-edit { transform:scale(1.2); }
    html[data-theme="dark"] .nud-avatar-edit { border-color:#1e1e3a; }
    .nud-info { flex:1;min-width:0; }
    .nud-name { font-size:0.92rem;font-weight:800;color:#1a1a2e;white-space:nowrap;overflow:hidden;text-overflow:ellipsis; }
    html[data-theme="dark"] .nud-name { color:#e8e8ff; }
    .nud-email { font-size:0.72rem;color:#999;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-top:1px; }
    .nud-vip-badge { display:inline-block;margin-top:4px;background:linear-gradient(135deg,#f59e0b,#d97706);color:#fff;font-size:0.65rem;font-weight:800;padding:2px 8px;border-radius:50px; }
    .nud-free-badge { display:inline-block;margin-top:4px;background:#f0f0ff;color:#667eea;font-size:0.65rem;font-weight:700;padding:2px 8px;border-radius:50px; }
    html[data-theme="dark"] .nud-free-badge { background:#252545; }
    .nud-divider { height:1px;background:#f0f0f8;margin:0.3rem 0; }
    html[data-theme="dark"] .nud-divider { background:#2a2a4a; }
    .nud-item {
        display:flex;align-items:center;gap:0.65rem;width:100%;padding:0.65rem 0.85rem;
        border:none;background:none;border-radius:12px;cursor:pointer;
        font-size:0.88rem;font-weight:600;color:#444;text-decoration:none;
        transition:all 0.18s;text-align:left;
    }
    html[data-theme="dark"] .nud-item { color:#c0c0e0; }
    .nud-item:hover { background:linear-gradient(135deg,rgba(102,126,234,0.1),rgba(118,75,162,0.08));color:#667eea;transform:translateX(3px); }
    html[data-theme="dark"] .nud-item:hover { background:rgba(102,126,234,0.15); }
    .nud-item i { width:16px;text-align:center;color:#667eea;font-size:0.85rem; }
    .nud-logout { color:#f5576c !important; }
    .nud-logout i { color:#f5576c !important; }
    .nud-logout:hover { background:rgba(245,87,108,0.08) !important;color:#f5576c !important; }

    /* Comment locked state */
    .comment-locked {
        text-align:center;padding:2rem 1rem;
        background:linear-gradient(135deg,rgba(102,126,234,0.06),rgba(118,75,162,0.06));
        border-radius:16px;border:1.5px dashed rgba(102,126,234,0.25);margin-bottom:1.5rem;
    }
    .comment-locked i { font-size:2rem;color:#667eea;display:block;margin-bottom:0.75rem; }
    .comment-locked p { color:#666;font-size:0.9rem;margin:0 0 1rem; }
    html[data-theme="dark"] .comment-locked p { color:#9090b0; }
    .comment-locked-btns { display:flex;gap:0.75rem;justify-content:center;flex-wrap:wrap; }
    .btn-login-comment {
        background:linear-gradient(135deg,#667eea,#764ba2);color:#fff;
        border:none;border-radius:50px;padding:0.6rem 1.5rem;
        cursor:pointer;font-size:0.88rem;font-weight:700;transition:all 0.2s;
    }
    .btn-login-comment:hover { opacity:0.88;transform:translateY(-2px); }
    .btn-register-comment {
        background:none;border:1.5px solid #667eea;color:#667eea;
        border-radius:50px;padding:0.6rem 1.5rem;
        cursor:pointer;font-size:0.88rem;font-weight:700;transition:all 0.2s;
    }
    .btn-register-comment:hover { background:#667eea;color:#fff; }
    `;
    document.head.appendChild(s);
}

// ========== PROFILE MODAL ==========
function openProfileModal() {
    // Close dropdown
    const dd = document.getElementById('navUserDropdown');
    if (dd) dd.classList.remove('open');

    if (document.getElementById('profileModal')) {
        document.getElementById('profileModal').style.display = 'flex';
        return;
    }
    const user = getUser();
    if (!user) return;

    const modal = document.createElement('div');
    modal.id = 'profileModal';
    modal.style.cssText = 'position:fixed;inset:0;z-index:99999;display:flex;align-items:center;justify-content:center;padding:1rem;background:rgba(0,0,0,0.55);backdrop-filter:blur(6px);';

    const avatarPreview = user.avatar
        ? '<img id="pmAvatarImg" src="' + user.avatar + '" style="width:80px;height:80px;border-radius:50%;object-fit:cover;border:3px solid #667eea;" onerror="this.style.display=\'none\';document.getElementById(\'pmAvatarInitial\').style.display=\'flex\'">' +
          '<div id="pmAvatarInitial" style="display:none;width:80px;height:80px;border-radius:50%;background:linear-gradient(135deg,#667eea,#764ba2);align-items:center;justify-content:center;font-size:2rem;font-weight:900;color:#fff;">' + user.username[0].toUpperCase() + '</div>'
        : '<div id="pmAvatarInitial" style="display:flex;width:80px;height:80px;border-radius:50%;background:linear-gradient(135deg,#667eea,#764ba2);align-items:center;justify-content:center;font-size:2rem;font-weight:900;color:#fff;">' + user.username[0].toUpperCase() + '</div>' +
          '<img id="pmAvatarImg" src="" style="display:none;width:80px;height:80px;border-radius:50%;object-fit:cover;border:3px solid #667eea;">';

    modal.innerHTML =
        '<div style="background:#fff;border-radius:24px;width:100%;max-width:380px;box-shadow:0 24px 80px rgba(0,0,0,0.25);overflow:hidden;animation:authSlideIn 0.3s ease;">' +
          '<div style="background:linear-gradient(135deg,#667eea,#764ba2);padding:1.75rem 2rem;text-align:center;position:relative;">' +
            '<button onclick="closeProfileModal()" style="position:absolute;top:0.85rem;right:0.85rem;background:rgba(255,255,255,0.15);border:none;color:#fff;width:30px;height:30px;border-radius:50%;cursor:pointer;font-size:1rem;">✕</button>' +
            '<div style="position:relative;display:inline-block;cursor:pointer;" onclick="triggerAvatarInput()">' +
              '<div id="pmAvatarWrap" style="display:flex;align-items:center;justify-content:center;">' + avatarPreview + '</div>' +
              '<div style="position:absolute;bottom:0;right:0;width:24px;height:24px;border-radius:50%;background:#fff;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 8px rgba(0,0,0,0.2);">' +
                '<i class="fas fa-camera" style="font-size:0.65rem;color:#667eea;"></i>' +
              '</div>' +
            '</div>' +
            '<input type="file" id="pmAvatarFile" accept="image/*" style="display:none;" onchange="handleAvatarFile(event)">' +
            '<div style="color:#fff;font-size:0.75rem;margin-top:0.5rem;opacity:0.8;">Nhấn để đổi ảnh</div>' +
          '</div>' +
          '<div style="padding:1.5rem 1.75rem;">' +
            '<div style="margin-bottom:1rem;">' +
              '<label style="display:block;font-size:0.78rem;font-weight:700;color:#667eea;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:0.4rem;">Biệt danh</label>' +
              '<div style="display:flex;align-items:center;gap:0.6rem;border:1.5px solid #e0e4ff;border-radius:12px;padding:0.7rem 1rem;background:#f8f9ff;transition:all 0.2s;" onfocusin="this.style.borderColor=\'#667eea\';this.style.boxShadow=\'0 0 0 3px rgba(102,126,234,0.12)\'" onfocusout="this.style.borderColor=\'#e0e4ff\';this.style.boxShadow=\'none\'">' +
                '<i class="fas fa-user-tag" style="color:#667eea;font-size:0.85rem;"></i>' +
                '<input id="pmNickname" type="text" value="' + user.username + '" maxlength="50" style="border:none;background:none;outline:none;flex:1;font-size:0.95rem;color:#333;" placeholder="Nhập biệt danh...">' +
              '</div>' +
            '</div>' +
            '<div style="margin-bottom:1.25rem;">' +
              '<label style="display:block;font-size:0.78rem;font-weight:700;color:#667eea;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:0.4rem;">URL ảnh đại diện</label>' +
              '<div style="display:flex;align-items:center;gap:0.6rem;border:1.5px solid #e0e4ff;border-radius:12px;padding:0.7rem 1rem;background:#f8f9ff;transition:all 0.2s;" onfocusin="this.style.borderColor=\'#667eea\';this.style.boxShadow=\'0 0 0 3px rgba(102,126,234,0.12)\'" onfocusout="this.style.borderColor=\'#e0e4ff\';this.style.boxShadow=\'none\'">' +
                '<i class="fas fa-image" style="color:#667eea;font-size:0.85rem;"></i>' +
                '<input id="pmAvatarUrl" type="url" value="' + (user.avatar || '') + '" style="border:none;background:none;outline:none;flex:1;font-size:0.88rem;color:#333;" placeholder="https://..." oninput="previewAvatarUrl(this.value)">' +
              '</div>' +
            '</div>' +
            '<div id="pmErr" style="display:none;color:#f5576c;font-size:0.82rem;text-align:center;margin-bottom:0.75rem;background:#fff5f5;border-radius:8px;padding:0.5rem;"></div>' +
            '<button id="pmSaveBtn" onclick="saveProfile()" style="width:100%;padding:0.9rem;border:none;border-radius:12px;background:linear-gradient(135deg,#667eea,#764ba2);color:#fff;font-size:1rem;font-weight:700;cursor:pointer;transition:all 0.2s;box-shadow:0 4px 14px rgba(102,126,234,0.35);display:flex;align-items:center;justify-content:center;gap:0.5rem;">' +
              '<i class="fas fa-save"></i> Lưu thay đổi' +
            '</button>' +
          '</div>' +
        '</div>';

    document.body.appendChild(modal);
    modal.addEventListener('click', function(e) { if (e.target === modal) closeProfileModal(); });
}

function closeProfileModal() {
    const m = document.getElementById('profileModal');
    if (m) m.remove();
}

function triggerAvatarInput() {
    const f = document.getElementById('pmAvatarFile');
    if (f) f.click();
}

function handleAvatarFile(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(ev) {
        previewAvatarUrl(ev.target.result);
        const urlInput = document.getElementById('pmAvatarUrl');
        if (urlInput) urlInput.value = ev.target.result;
    };
    reader.readAsDataURL(file);
}

function previewAvatarUrl(url) {
    const img = document.getElementById('pmAvatarImg');
    const initial = document.getElementById('pmAvatarInitial');
    if (!img) return;
    if (url) {
        img.src = url;
        img.style.display = 'block';
        if (initial) initial.style.display = 'none';
    } else {
        img.style.display = 'none';
        if (initial) initial.style.display = 'flex';
    }
}

async function saveProfile() {
    const nickname = (document.getElementById('pmNickname').value || '').trim();
    const avatar = (document.getElementById('pmAvatarUrl').value || '').trim();
    const errEl = document.getElementById('pmErr');
    const btn = document.getElementById('pmSaveBtn');
    errEl.style.display = 'none';
    if (!nickname) { errEl.textContent = '⚠️ Biệt danh không được để trống'; errEl.style.display = 'block'; return; }
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Đang lưu...';
    try {
        const token = getToken();
        const r = await fetch(API_BASE + '/auth/profile', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ nickname, avatar })
        });
        const d = await r.json();
        if (!r.ok) throw new Error(d.error || 'Lỗi cập nhật');
        saveSession(d.user, token);
        closeProfileModal();
        updateNavAuth();
        if (typeof showToast === 'function') showToast('✓ Đã cập nhật hồ sơ!', 'success', 3000);
    } catch(e) {
        errEl.textContent = '❌ ' + e.message; errEl.style.display = 'block';
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-save"></i> Lưu thay đổi';
    }
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

// ========== PHONE OTP AUTH ==========
let _phoneMode = 'login'; // 'login' | 'register' | 'reset'
let _phoneOtpTimer = null;
let _phoneResendTimer = null;
let _phoneResetToken = null;

function setPhoneMode(mode) {
    _phoneMode = mode;
    const titles = { login: 'Đăng nhập bằng SĐT', register: 'Đăng ký bằng SĐT', reset: 'Quên mật khẩu qua SĐT' };
    const subs = { login: 'Nhập số điện thoại để nhận mã OTP', register: 'Nhập SĐT và tên hiển thị', reset: 'Nhập SĐT để đặt lại mật khẩu' };
    const el = (id) => document.getElementById(id);
    if (el('phoneFormTitle')) el('phoneFormTitle').textContent = titles[mode];
    if (el('phoneFormSub')) el('phoneFormSub').textContent = subs[mode];
    if (el('phoneUsernameWrap')) el('phoneUsernameWrap').style.display = mode === 'register' ? 'block' : 'none';
    if (el('phoneUsername')) el('phoneUsername').required = mode === 'register';
    // Highlight active mode button
    ['login','register','reset'].forEach(m => {
        const btn = el('phoneMode' + m.charAt(0).toUpperCase() + m.slice(1));
        if (btn) {
            btn.style.borderColor = m === mode ? '#667eea' : '#e0e4ff';
            btn.style.color = m === mode ? '#667eea' : '#999';
            btn.style.fontWeight = m === mode ? '700' : '600';
        }
    });
}

function resetPhoneForm() {
    clearInterval(_phoneOtpTimer);
    clearInterval(_phoneResendTimer);
    const el = (id) => document.getElementById(id);
    if (el('phoneStep1')) el('phoneStep1').style.display = 'block';
    if (el('phoneStep2')) el('phoneStep2').style.display = 'none';
    if (el('phoneInput')) el('phoneInput').value = '';
    if (el('otpInput')) el('otpInput').value = '';
    if (el('phoneError')) el('phoneError').textContent = '';
    if (el('otpError')) el('otpError').textContent = '';
    if (el('phoneSendBtn')) { el('phoneSendBtn').disabled = false; el('phoneSendBtn').innerHTML = '<i class="fas fa-paper-plane"></i> Gửi OTP'; }
}

function startOtpCountdown(seconds) {
    clearInterval(_phoneOtpTimer);
    const el = document.getElementById('otpCountdown');
    if (!el) return;
    let remaining = seconds;
    el.textContent = `${Math.floor(remaining/60)}:${String(remaining%60).padStart(2,'0')}`;
    _phoneOtpTimer = setInterval(() => {
        remaining--;
        if (remaining <= 0) {
            clearInterval(_phoneOtpTimer);
            el.textContent = 'Hết hạn';
            el.style.color = '#f5576c';
        } else {
            el.textContent = `${Math.floor(remaining/60)}:${String(remaining%60).padStart(2,'0')}`;
        }
    }, 1000);
}

function startResendCountdown(seconds) {
    clearInterval(_phoneResendTimer);
    const resendBtn = document.getElementById('otpResendBtn');
    const resendCd = document.getElementById('otpResendCountdown');
    if (resendBtn) resendBtn.style.display = 'none';
    let remaining = seconds;
    if (resendCd) resendCd.textContent = ` (${remaining}s)`;
    _phoneResendTimer = setInterval(() => {
        remaining--;
        if (remaining <= 0) {
            clearInterval(_phoneResendTimer);
            if (resendBtn) resendBtn.style.display = 'inline';
            if (resendCd) resendCd.textContent = '';
        } else {
            if (resendCd) resendCd.textContent = ` (${remaining}s)`;
        }
    }, 1000);
}

async function handlePhoneSendOTP(e) {
    e.preventDefault();
    const phone = (document.getElementById('phoneInput').value || '').trim();
    const errEl = document.getElementById('phoneError');
    const btn = document.getElementById('phoneSendBtn');
    errEl.textContent = '';
    if (!phone) { errEl.textContent = 'Vui lòng nhập số điện thoại'; return; }

    if (_phoneMode === 'register') {
        const username = (document.getElementById('phoneUsername').value || '').trim();
        if (!username) { errEl.textContent = 'Vui lòng nhập tên hiển thị'; return; }
    }

    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Đang gửi...';
    try {
        const r = await fetch(`${API_BASE}/auth/phone/send-otp`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ phone, purpose: _phoneMode })
        });
        const d = await r.json();
        if (!r.ok) throw new Error(d.error || 'Lỗi gửi OTP');

        // Chuyển sang step 2
        document.getElementById('phoneStep1').style.display = 'none';
        document.getElementById('phoneStep2').style.display = 'block';
        const sentTo = document.getElementById('phoneSentTo');
        if (sentTo) sentTo.textContent = phone;
        startOtpCountdown(5 * 60);
        startResendCountdown(60);
        document.getElementById('otpInput').focus();
    } catch(err) {
        errEl.textContent = err.message;
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-paper-plane"></i> Gửi OTP';
    }
}

async function handlePhoneResend() {
    const phone = (document.getElementById('phoneInput').value || '').trim();
    const errEl = document.getElementById('otpError');
    errEl.textContent = '';
    try {
        const r = await fetch(`${API_BASE}/auth/phone/send-otp`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ phone, purpose: _phoneMode })
        });
        const d = await r.json();
        if (!r.ok) throw new Error(d.error || 'Lỗi gửi OTP');
        startOtpCountdown(5 * 60);
        startResendCountdown(60);
        if (typeof showToast === 'function') showToast('📱 Đã gửi lại OTP!', 'success', 3000);
    } catch(err) {
        errEl.textContent = err.message;
    }
}

async function handleOTPVerify() {
    const otp = (document.getElementById('otpInput').value || '').trim();
    const phone = (document.getElementById('phoneInput').value || '').trim();
    const errEl = document.getElementById('otpError');
    const btn = document.getElementById('otpVerifyBtn');
    errEl.textContent = '';
    if (!otp || otp.length !== 6) { errEl.textContent = 'Vui lòng nhập đủ 6 số OTP'; return; }

    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Đang xác nhận...';
    try {
        let endpoint, body;
        if (_phoneMode === 'login') {
            endpoint = '/auth/phone/verify-login';
            body = { phone, otp };
        } else if (_phoneMode === 'register') {
            const username = (document.getElementById('phoneUsername').value || '').trim();
            endpoint = '/auth/phone/verify-register';
            body = { phone, otp, username };
        } else if (_phoneMode === 'reset') {
            endpoint = '/auth/phone/verify-reset';
            body = { phone, otp };
        }

        const r = await fetch(`${API_BASE}${endpoint}`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });
        const d = await r.json();
        if (!r.ok) throw new Error(d.error || 'Lỗi xác nhận OTP');

        clearInterval(_phoneOtpTimer);
        clearInterval(_phoneResendTimer);

        if (_phoneMode === 'reset') {
            // Chuyển sang form đặt mật khẩu mới
            _phoneResetToken = d.resetToken;
            document.getElementById('phoneForm').style.display = 'none';
            document.getElementById('phoneResetForm').style.display = 'block';
        } else {
            // login hoặc register thành công
            saveSession(d.user, d.token);
            closeAuthModal();
            updateNavAuth();
            updateCommentForms();
            if (typeof onToolsAuthSuccess === 'function') onToolsAuthSuccess(d.user);
            const msg = _phoneMode === 'register'
                ? `🎉 Đăng ký thành công! Chào ${d.user.username}!`
                : `👋 Chào mừng trở lại, ${d.user.username}!`;
            if (typeof showToast === 'function') showToast(msg, 'success', 3000);
            if (_phoneMode === 'register' && typeof laEvent === 'function')
                laEvent('join', 'Thành viên mới vừa tham gia cộng đồng!');
        }
    } catch(err) {
        errEl.textContent = err.message;
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-check-circle"></i> Xác nhận OTP';
    }
}

async function handlePhoneResetPassword(e) {
    e.preventDefault();
    const password = document.getElementById('phoneNewPassword').value;
    const confirm = document.getElementById('phoneConfirmPassword').value;
    const errEl = document.getElementById('phoneResetError');
    const btn = document.getElementById('phoneResetBtn');
    errEl.textContent = '';
    if (password !== confirm) { errEl.textContent = 'Mật khẩu xác nhận không khớp'; return; }
    if (password.length < 6) { errEl.textContent = 'Mật khẩu tối thiểu 6 ký tự'; return; }

    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Đang lưu...';
    try {
        const r = await fetch(`${API_BASE}/auth/phone/reset-password`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ resetToken: _phoneResetToken, password })
        });
        const d = await r.json();
        if (!r.ok) throw new Error(d.error || 'Lỗi đặt mật khẩu');
        saveSession(d.user, d.token);
        closeAuthModal();
        updateNavAuth();
        updateCommentForms();
        if (typeof showToast === 'function') showToast('✅ Đặt mật khẩu mới thành công!', 'success', 3000);
    } catch(err) {
        errEl.textContent = err.message;
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-save"></i> Đặt mật khẩu mới';
    }
}

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
