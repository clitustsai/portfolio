// ========== API CLIENT - Kết nối backend thật ==========
// Tự động dùng cùng origin khi deploy, fallback localhost khi dev
const API_BASE = (location.hostname === 'localhost' || location.hostname === '127.0.0.1')
  ? 'http://localhost:3001/api'
  : `${location.origin}/api`;

// Kiểm tra backend có online không
let backendOnline = false;
async function checkBackend() {
  try {
    const r = await fetch(`${API_BASE}/health`, { signal: AbortSignal.timeout(5000) });
    backendOnline = r.ok;
  } catch {
    // Retry 1 lần sau 3 giây (Render đang wake up)
    await new Promise(res => setTimeout(res, 3000));
    try {
      const r2 = await fetch(`${API_BASE}/health`, { signal: AbortSignal.timeout(8000) });
      backendOnline = r2.ok;
    } catch {
      backendOnline = false;
    }
  }
  return backendOnline;
}

// ========== STATS ==========
async function fetchStats() {
  if (!backendOnline) return null;
  try {
    const r = await fetch(`${API_BASE}/stats`);
    return r.ok ? await r.json() : null;
  } catch { return null; }
}

// ========== PROJECT VIEWS ==========
async function apiTrackView(projectId) {
  if (!backendOnline) return null;
  try {
    const r = await fetch(`${API_BASE}/projects/${projectId}/view`, { method: 'POST' });
    return r.ok ? await r.json() : null;
  } catch { return null; }
}

// ========== PROJECT LIKES ==========
async function apiToggleLike(projectId, action) {
  if (!backendOnline) return null;
  try {
    const r = await fetch(`${API_BASE}/projects/${projectId}/like`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action })
    });
    return r.ok ? await r.json() : null;
  } catch { return null; }
}

// ========== COMMENTS ==========
async function fetchComments(sort = 'newest') {
  if (!backendOnline) return null;
  try {
    const r = await fetch(`${API_BASE}/comments?sort=${sort}`);
    return r.ok ? await r.json() : null;
  } catch { return null; }
}

async function postComment(data) {
  if (!backendOnline) return null;
  try {
    const r = await fetch(`${API_BASE}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!r.ok) { const e = await r.json(); throw new Error(e.error || 'Lỗi server'); }
    return await r.json();
  } catch (e) { throw e; }
}

async function apiLikeComment(commentId) {
  if (!backendOnline) return null;
  try {
    const r = await fetch(`${API_BASE}/comments/${commentId}/like`, { method: 'POST' });
    return r.ok ? await r.json() : null;
  } catch { return null; }
}

// ========== MESSAGES ==========
async function postMessage(data) {
  if (!backendOnline) return null;
  try {
    const r = await fetch(`${API_BASE}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return r.ok;
  } catch { return null; }
}

// ========== AI CHAT ==========
async function sendChatMessage(message) {
  try {
    const r = await fetch(`${API_BASE}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message })
    });
    if (!r.ok) throw new Error('Server error');
    const data = await r.json();
    return data.reply;
  } catch {
    return null; // fallback về keyword matching
  }
}

// ========== ADMIN API ==========
async function adminFetchMessages(token) {
  try {
    const r = await fetch(`${API_BASE}/messages`, { headers: { 'x-admin-token': token } });
    return r.ok ? await r.json() : null;
  } catch { return null; }
}

async function adminMarkRead(id, token) {
  try {
    await fetch(`${API_BASE}/messages/${id}/read`, { method: 'PATCH', headers: { 'x-admin-token': token } });
  } catch {}
}

async function adminDeleteMessage(id, token) {
  try {
    await fetch(`${API_BASE}/messages/${id}`, { method: 'DELETE', headers: { 'x-admin-token': token } });
  } catch {}
}

async function adminClearAllMessages(token) {
  try {
    await fetch(`${API_BASE}/messages`, { method: 'DELETE', headers: { 'x-admin-token': token } });
  } catch {}
}

async function adminDeleteComment(id, token) {
  try {
    await fetch(`${API_BASE}/comments/${id}`, { method: 'DELETE', headers: { 'x-admin-token': token } });
  } catch {}
}

async function adminClearAllComments(token) {
  try {
    await fetch(`${API_BASE}/comments`, { method: 'DELETE', headers: { 'x-admin-token': token } });
  } catch {}
}

// Khởi động: check backend
checkBackend().then(online => {
  if (online) {
    console.log('✅ Backend online - dùng data thật từ server');
  } else {
    console.warn('⚠️ Backend offline - dùng localStorage làm fallback');
  }
});
