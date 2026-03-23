// ========== PUSH NOTIFICATION MODULE ==========
// Subscribe blog notifications, manage permission UI
(function () {
'use strict';

const API = window.API_BASE || (location.hostname === 'localhost' ? 'http://localhost:3001/api' : '/api');

// ===== CSS =====
const css = `
#pn-banner {
  position:fixed; bottom:0; left:0; right:0; z-index:9940;
  background:#fff; border-top:1px solid rgba(102,126,234,.15);
  box-shadow:0 -8px 32px rgba(0,0,0,.1);
  padding:.85rem 1.25rem; display:flex; align-items:center; gap:.85rem;
  transform:translateY(100%); transition:transform .4s cubic-bezier(0.4,0,0.2,1);
}
html[data-theme="dark"] #pn-banner { background:#1a1a2e; border-color:rgba(102,126,234,.2); }
#pn-banner.show { transform:translateY(0); }
#pn-banner-icon { font-size:1.8rem; flex-shrink:0; }
#pn-banner-body { flex:1; min-width:0; }
#pn-banner-title { font-size:.88rem; font-weight:800; color:#1a1a2e; margin-bottom:.15rem; }
html[data-theme="dark"] #pn-banner-title { color:#e8e8ff; }
#pn-banner-sub { font-size:.75rem; color:#888; }
#pn-banner-btns { display:flex; gap:.5rem; flex-shrink:0; }
.pn-btn-yes { background:linear-gradient(135deg,#667eea,#764ba2); color:#fff; border:none;
  border-radius:10px; padding:.5rem 1rem; font-size:.82rem; font-weight:700; cursor:pointer;
  transition:all .2s; white-space:nowrap; }
.pn-btn-yes:hover { opacity:.9; transform:translateY(-1px); }
.pn-btn-no { background:none; border:1.5px solid rgba(0,0,0,.1); color:#888;
  border-radius:10px; padding:.5rem .75rem; font-size:.82rem; cursor:pointer;
  transition:all .2s; white-space:nowrap; }
.pn-btn-no:hover { border-color:#f5576c; color:#f5576c; }
html[data-theme="dark"] .pn-btn-no { border-color:rgba(255,255,255,.1); }

/* Floating bell button */
#pn-bell {
  position:fixed; bottom:80px; left:20px; z-index:9959;
  width:44px; height:44px; border-radius:50%;
  background:#fff; border:1.5px solid rgba(102,126,234,.2);
  color:#667eea; font-size:1rem; cursor:pointer;
  box-shadow:0 4px 16px rgba(0,0,0,.1);
  display:flex; align-items:center; justify-content:center;
  transition:all .25s; display:none;
}
html[data-theme="dark"] #pn-bell { background:#1a1a2e; border-color:rgba(102,126,234,.3); }
#pn-bell:hover { transform:scale(1.1); box-shadow:0 6px 20px rgba(102,126,234,.3); }
#pn-bell.subscribed { background:linear-gradient(135deg,#667eea,#764ba2); color:#fff; border-color:transparent; }
#pn-bell-dot { position:absolute; top:-2px; right:-2px; width:10px; height:10px;
  background:#10b981; border-radius:50%; border:2px solid #fff; display:none; }
#pn-bell.subscribed #pn-bell-dot { display:block; }

/* Toast notification preview */
.pn-toast-preview {
  position:fixed; top:70px; right:16px; z-index:9961;
  background:#fff; border-radius:16px; padding:.85rem 1rem;
  box-shadow:0 8px 32px rgba(0,0,0,.15), 0 0 0 1px rgba(102,126,234,.1);
  max-width:300px; display:flex; gap:.65rem; align-items:flex-start;
  animation:pnSlideIn .4s ease forwards;
}
html[data-theme="dark"] .pn-toast-preview { background:#1e1e3a; }
.pn-toast-preview .pt-icon { font-size:1.5rem; flex-shrink:0; }
.pn-toast-preview .pt-body { flex:1; min-width:0; }
.pn-toast-preview .pt-title { font-size:.82rem; font-weight:800; color:#1a1a2e; margin-bottom:.2rem; }
html[data-theme="dark"] .pn-toast-preview .pt-title { color:#e8e8ff; }
.pn-toast-preview .pt-msg { font-size:.75rem; color:#888; line-height:1.4; }
.pn-toast-preview .pt-close { background:none; border:none; color:#bbb; cursor:pointer; font-size:.8rem; flex-shrink:0; }
@keyframes pnSlideIn { from{opacity:0;transform:translateX(20px)} to{opacity:1;transform:translateX(0)} }

@media(max-width:480px) {
  #pn-banner { flex-wrap:wrap; }
  #pn-banner-btns { width:100%; justify-content:flex-end; }
  #pn-bell { bottom:148px; left:12px; }
}
`;
const styleEl = document.createElement('style');
styleEl.textContent = css;
document.head.appendChild(styleEl);

// ===== DOM =====
const banner = document.createElement('div');
banner.id = 'pn-banner';
banner.innerHTML = `
  <div id="pn-banner-icon">🔔</div>
  <div id="pn-banner-body">
    <div id="pn-banner-title">Nhận thông báo bài viết mới?</div>
    <div id="pn-banner-sub">Không bỏ lỡ bài viết mới nhất từ Clitus PC</div>
  </div>
  <div id="pn-banner-btns">
    <button class="pn-btn-yes" id="pnYes"><i class="fas fa-bell"></i> Bật thông báo</button>
    <button class="pn-btn-no" id="pnNo">Để sau</button>
  </div>`;
document.body.appendChild(banner);

const bell = document.createElement('button');
bell.id = 'pn-bell';
bell.setAttribute('aria-label', 'Quản lý thông báo');
bell.innerHTML = `<i class="fas fa-bell"></i><div id="pn-bell-dot"></div>`;
document.body.appendChild(bell);

// ===== STATE =====
const STORAGE_KEY = '_pn_dismissed';
const SUBSCRIBED_KEY = '_pn_subscribed';

function isSubscribed() { return localStorage.getItem(SUBSCRIBED_KEY) === '1'; }
function isDismissed() {
  const d = localStorage.getItem(STORAGE_KEY);
  if (!d) return false;
  // Hỏi lại sau 7 ngày
  return (Date.now() - parseInt(d)) < 7 * 24 * 60 * 60 * 1000;
}

// ===== VAPID =====
async function getVapidKey() {
  try {
    const r = await fetch(`${API}/push/vapid-public-key`);
    const d = await r.json();
    return d.publicKey || null;
  } catch { return null; }
}

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map(c => c.charCodeAt(0)));
}

// ===== SUBSCRIBE =====
async function subscribe() {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    alert('Trình duyệt của bạn không hỗ trợ push notification.');
    return false;
  }

  try {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      showToastPreview('❌', 'Đã từ chối', 'Bạn có thể bật lại trong cài đặt trình duyệt.');
      return false;
    }

    const vapidKey = await getVapidKey();
    if (!vapidKey) { console.warn('No VAPID key'); return false; }

    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidKey)
    });

    await fetch(`${API}/push/subscribe`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(sub)
    });

    localStorage.setItem(SUBSCRIBED_KEY, '1');
    bell.classList.add('subscribed');
    bell.title = 'Đang nhận thông báo — Click để tắt';
    showToastPreview('🔔', 'Đã bật thông báo!', 'Bạn sẽ nhận thông báo khi có bài viết mới.');
    return true;
  } catch(err) {
    console.error('Subscribe error:', err);
    return false;
  }
}

async function unsubscribe() {
  try {
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    if (sub) await sub.unsubscribe();
    localStorage.removeItem(SUBSCRIBED_KEY);
    bell.classList.remove('subscribed');
    bell.title = 'Bật thông báo';
    showToastPreview('🔕', 'Đã tắt thông báo', 'Bạn sẽ không nhận thông báo nữa.');
  } catch(err) { console.error('Unsubscribe error:', err); }
}

// ===== TOAST PREVIEW =====
function showToastPreview(icon, title, msg) {
  const el = document.createElement('div');
  el.className = 'pn-toast-preview';
  el.innerHTML = `
    <div class="pt-icon">${icon}</div>
    <div class="pt-body">
      <div class="pt-title">${title}</div>
      <div class="pt-msg">${msg}</div>
    </div>
    <button class="pt-close" onclick="this.closest('.pn-toast-preview').remove()">✕</button>`;
  document.body.appendChild(el);
  setTimeout(() => { el.style.opacity='0'; el.style.transform='translateX(20px)'; el.style.transition='all .3s'; setTimeout(()=>el.remove(),300); }, 4000);
}

// ===== EVENTS =====
document.getElementById('pnYes').onclick = async () => {
  banner.classList.remove('show');
  const ok = await subscribe();
  if (!ok) localStorage.setItem(STORAGE_KEY, Date.now().toString());
};

document.getElementById('pnNo').onclick = () => {
  banner.classList.remove('show');
  localStorage.setItem(STORAGE_KEY, Date.now().toString());
};

bell.onclick = async () => {
  if (isSubscribed()) {
    if (confirm('Tắt thông báo blog?')) await unsubscribe();
  } else {
    await subscribe();
  }
};

// ===== INIT =====
async function init() {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;

  // Hiện bell button
  bell.style.display = 'flex';

  // Sync trạng thái subscribe thực tế
  try {
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    if (sub) {
      localStorage.setItem(SUBSCRIBED_KEY, '1');
      bell.classList.add('subscribed');
    } else {
      localStorage.removeItem(SUBSCRIBED_KEY);
    }
  } catch(e) {}

  // Hiện banner nếu chưa subscribe và chưa dismiss
  if (!isSubscribed() && !isDismissed() && Notification.permission !== 'denied') {
    setTimeout(() => banner.classList.add('show'), 3000);
  }
}

// Chỉ chạy sau khi SW ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  setTimeout(init, 1000);
}

// Export để admin dùng
window.pnSubscribe = subscribe;
window.pnUnsubscribe = unsubscribe;
window.pnShowToast = showToastPreview;

})();
