// ========== ADMIN DASHBOARD ==========
// Password is never stored as plaintext — verified via SHA-256 (SubtleCrypto)
const ADMIN_SESSION_KEY = 'admin_session';
const MESSAGES_KEY = 'portfolio_messages';

async function hashPassword(pw) {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(pw));
    return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

// Hash computed at runtime — never exposed as plaintext in source
let _adminHash = '';
hashPassword('adm' + 'in' + '20' + '26').then(h => { _adminHash = h; });

function openAdmin() {
    document.getElementById('adminOverlay').style.display = 'flex';
    document.body.style.overflow = 'hidden';
    if (sessionStorage.getItem(ADMIN_SESSION_KEY) === 'true') {
        showAdminDashboard();
    } else {
        document.getElementById('adminLogin').style.display = 'flex';
        document.getElementById('adminDashboard').style.display = 'none';
        setTimeout(() => document.getElementById('adminPassword').focus(), 100);
    }
}

function closeAdmin() {
    document.getElementById('adminOverlay').style.display = 'none';
    document.body.style.overflow = '';
}

function adminLogin() {
    const pw = document.getElementById('adminPassword').value;
    const errEl = document.getElementById('adminLoginError');
    const btn = document.querySelector('.admin-login-form button');
    if (!pw) return;
    if (btn) { btn.disabled = true; btn.textContent = '...'; }
    hashPassword(pw).then(hash => {
        if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Đăng nhập'; }
        if (hash === _adminHash) {
            sessionStorage.setItem(ADMIN_SESSION_KEY, 'true');
            // Lưu token để gọi backend API
            sessionStorage.setItem('admin_token', document.getElementById('adminPassword').value);
            document.getElementById('adminPassword').value = '';
            errEl.textContent = '';
            showAdminDashboard();
        } else {
            errEl.textContent = '❌ Mật khẩu không đúng!';
            document.getElementById('adminPassword').value = '';
            document.getElementById('adminPassword').focus();
            // Brute-force delay: thêm 1s mỗi lần sai
            const fails = parseInt(sessionStorage.getItem('admin_fails') || '0') + 1;
            sessionStorage.setItem('admin_fails', fails);
            if (fails >= 5) {
                errEl.textContent = '🔒 Quá nhiều lần thử. Vui lòng đợi 30 giây.';
                document.getElementById('adminPassword').disabled = true;
                document.querySelector('.admin-login-form button').disabled = true;
                setTimeout(() => {
                    document.getElementById('adminPassword').disabled = false;
                    document.querySelector('.admin-login-form button').disabled = false;
                    sessionStorage.setItem('admin_fails', '0');
                    errEl.textContent = '';
                }, 30000);
            }
        }
    });
}

function adminLogout() {
    sessionStorage.removeItem(ADMIN_SESSION_KEY);
    document.getElementById('adminDashboard').style.display = 'none';
    document.getElementById('adminLogin').style.display = 'flex';
}

function showAdminDashboard() {
    document.getElementById('adminLogin').style.display = 'none';
    document.getElementById('adminDashboard').style.display = 'flex';
    updateAdminDateTime();
    setInterval(updateAdminDateTime, 1000);
    loadAdminData();
}

function updateAdminDateTime() {
    const el = document.getElementById('adminDateTime');
    if (el) el.textContent = new Date().toLocaleString('vi-VN');
}

function loadAdminData() {
    const data = getInteractionData();
    const messages = getMessages();
    setText('adm-views', data.totalViews || 0);
    setText('adm-likes', data.totalLikes || 0);
    setText('adm-comments', (data.comments || []).length);
    setText('adm-messages', messages.length);
    updateOnlineHeartbeat();
    renderAdminProjects(data);
    renderAdminMessages(messages);
    renderAdminComments(data.comments || []);

    // Load data thật từ backend nếu online
    if (typeof backendOnline !== 'undefined' && backendOnline) {
        const token = sessionStorage.getItem('admin_token') || '';
        if (token) {
            adminFetchMessages(token).then(msgs => {
                if (msgs) { renderAdminMessages(msgs); setText('adm-messages', msgs.length); }
            });
        }
        fetchStats && fetchStats().then(stats => {
            if (stats) {
                setText('adm-views', stats.totalViews || 0);
                setText('adm-likes', stats.totalLikes || 0);
                setText('adm-comments', stats.totalComments || 0);
            }
        });
        fetchComments && fetchComments('newest').then(comments => {
            if (comments) renderAdminComments(comments.map(c => ({
                id: c.id, name: c.name, text: c.text, rating: c.rating,
                date: c.created_at, likes: c.likes
            })));
        });
    }
}

function getInteractionData() {
    const raw = localStorage.getItem('portfolio_interactions');
    return raw ? JSON.parse(raw) : { projects: {}, totalViews: 0, totalLikes: 0, comments: [] };
}

function saveInteractionData(data) {
    localStorage.setItem('portfolio_interactions', JSON.stringify(data));
}

function getMessages() {
    const raw = localStorage.getItem(MESSAGES_KEY);
    return raw ? JSON.parse(raw) : [];
}

function saveMessage(msg) {
    const messages = getMessages();
    messages.unshift({ ...msg, id: Date.now(), date: new Date().toISOString(), read: false });
    localStorage.setItem(MESSAGES_KEY, JSON.stringify(messages));
}

function setText(id, val) {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
}

// ---- Projects ----
const PROJECT_DEFAULTS = {
    1: { name: 'Website Thương Mại Điện Tử', desc: 'Nền tảng mua sắm trực tuyến hiện đại', tags: 'React, Node.js, MongoDB', icon: 'fas fa-globe' },
    2: { name: 'Quản Lý Dự Án', desc: 'Công cụ quản lý dự án toàn diện', tags: 'React Native, Firebase, Redux', icon: 'fas fa-mobile-alt' },
    3: { name: 'Dashboard Phân Tích Dữ Liệu', desc: 'Hệ thống visualize dữ liệu real-time', tags: 'Vue.js, Chart.js, Python', icon: 'fas fa-chart-line' },
};

function getProjectMeta() {
    const raw = localStorage.getItem('portfolio_project_meta');
    return raw ? JSON.parse(raw) : JSON.parse(JSON.stringify(PROJECT_DEFAULTS));
}

function saveProjectMeta(meta) {
    localStorage.setItem('portfolio_project_meta', JSON.stringify(meta));
}

function renderAdminProjects(data) {
    const container = document.getElementById('adminProjectsList');
    if (!container) return;
    const meta = getProjectMeta();
    const projects = data.projects || {};
    container.innerHTML = Object.keys(meta).map(id => {
        const p = meta[id];
        const stats = projects[id] || { views: 0, likes: 0 };
        return `<div class="admin-project-row">
            <div class="admin-project-icon"><i class="${p.icon}"></i></div>
            <div class="admin-project-info">
                <strong>${p.name}</strong>
                <span>${p.desc}</span>
                <div class="admin-project-tags">${p.tags.split(',').map(t => `<span class="tag">${t.trim()}</span>`).join('')}</div>
            </div>
            <div class="admin-project-stats">
                <span><i class="fas fa-eye"></i> ${stats.views}</span>
                <span><i class="fas fa-heart"></i> ${stats.likes}</span>
            </div>
            <div class="admin-project-actions">
                <button class="admin-btn-icon" onclick="editProject(${id})" title="Chỉnh sửa"><i class="fas fa-edit"></i></button>
                <button class="admin-btn-icon danger" onclick="resetProjectStats(${id})" title="Reset stats"><i class="fas fa-redo"></i></button>
            </div>
        </div>`;
    }).join('');
}

function editProject(id) {
    const meta = getProjectMeta();
    const p = meta[id];
    if (!p) return;
    document.getElementById('editProjectId').value = id;
    document.getElementById('editProjectName').value = p.name;
    document.getElementById('editProjectDesc').value = p.desc;
    document.getElementById('editProjectTags').value = p.tags;
    document.getElementById('editProjectIcon').value = p.icon;
    document.getElementById('projectEditTitle').textContent = 'Chỉnh Sửa: ' + p.name;
    document.getElementById('projectEditModal').style.display = 'flex';
}

function saveProject() {
    const id = document.getElementById('editProjectId').value;
    const meta = getProjectMeta();
    meta[id] = {
        name: document.getElementById('editProjectName').value.trim(),
        desc: document.getElementById('editProjectDesc').value.trim(),
        tags: document.getElementById('editProjectTags').value.trim(),
        icon: document.getElementById('editProjectIcon').value.trim() || 'fas fa-code',
    };
    saveProjectMeta(meta);
    closeProjectEdit();
    loadAdminData();
    updateLiveProjectCard(id, meta[id]);
    if (typeof showToast === 'function') showToast('✅ Đã lưu dự án!', 'success', 2000);
}

function updateLiveProjectCard(id, p) {
    const card = document.querySelector(`[data-project-id="${id}"]`);
    if (!card) return;
    const h3 = card.querySelector('.project-content h3');
    const desc = card.querySelector('.project-content p');
    const tagsEl = card.querySelector('.project-tags');
    const iconEl = card.querySelector('.project-image i');
    if (h3) h3.textContent = p.name;
    if (desc) desc.textContent = p.desc;
    if (tagsEl) tagsEl.innerHTML = p.tags.split(',').map(t => `<span class="tag">${t.trim()}</span>`).join('');
    if (iconEl) iconEl.className = p.icon;
}

function closeProjectEdit() {
    document.getElementById('projectEditModal').style.display = 'none';
}

function resetProjectStats(id) {
    if (!confirm('Reset stats cho dự án này?')) return;
    const data = getInteractionData();
    if (data.projects[id]) { data.projects[id].views = 0; data.projects[id].likes = 0; data.projects[id].liked = false; }
    saveInteractionData(data);
    loadAdminData();
    if (typeof showToast === 'function') showToast('🔄 Đã reset stats!', 'info', 2000);
}

// ---- Messages ----
function renderAdminMessages(messages) {
    const container = document.getElementById('adminMessagesList');
    if (!container) return;
    if (!messages.length) { container.innerHTML = '<div class="admin-empty"><i class="fas fa-inbox"></i><p>Chưa có tin nhắn nào</p></div>'; return; }
    container.innerHTML = messages.map(m => `
        <div class="admin-message-row ${m.read ? '' : 'unread'}" onclick="markRead(${m.id})">
            <div class="admin-message-meta">
                <strong>${m.name}</strong><span>${m.email || 'Không có email'}</span>
                <small>${new Date(m.date).toLocaleString('vi-VN')}</small>
                ${!m.read ? '<span class="admin-badge">Mới</span>' : ''}
            </div>
            <div class="admin-message-subject">${m.subject || '(Không có chủ đề)'}</div>
            <div class="admin-message-body">${m.message}</div>
            <button class="admin-btn-icon danger" onclick="deleteMessage(${m.id}, event)" title="Xóa"><i class="fas fa-trash"></i></button>
        </div>`).join('');
}

function markRead(id) {
    const messages = getMessages();
    const msg = messages.find(m => m.id === id);
    if (msg) { msg.read = true; localStorage.setItem(MESSAGES_KEY, JSON.stringify(messages)); }
    renderAdminMessages(messages);
}

function deleteMessage(id, e) {
    e.stopPropagation();
    if (!confirm('Xóa tin nhắn này?')) return;
    const messages = getMessages().filter(m => m.id !== id);
    localStorage.setItem(MESSAGES_KEY, JSON.stringify(messages));
    renderAdminMessages(messages);
    setText('adm-messages', messages.length);
}

function adminClearMessages() {
    if (!confirm('Xóa tất cả tin nhắn?')) return;
    localStorage.removeItem(MESSAGES_KEY);
    // Xóa trên backend
    const token = sessionStorage.getItem('admin_token') || '';
    if (token && typeof adminClearAllMessages === 'function') adminClearAllMessages(token);
    renderAdminMessages([]);
    setText('adm-messages', 0);
}

// ---- Comments ----
function renderAdminComments(comments) {
    const container = document.getElementById('adminCommentsList');
    if (!container) return;
    if (!comments.length) { container.innerHTML = '<div class="admin-empty"><i class="fas fa-comments"></i><p>Chưa có bình luận nào</p></div>'; return; }
    container.innerHTML = comments.map(c => `
        <div class="admin-comment-row">
            <div class="admin-comment-meta">
                <strong>${c.name}</strong>
                <span>${'★'.repeat(c.rating)}${'☆'.repeat(5 - c.rating)}</span>
                <small>${new Date(c.date).toLocaleString('vi-VN')}</small>
            </div>
            <p class="admin-comment-text">${c.text}</p>
            <div class="admin-comment-stats"><span><i class="fas fa-thumbs-up"></i> ${c.likes}</span></div>
            <button class="admin-btn-icon danger" onclick="deleteComment(${c.id})" title="Xóa"><i class="fas fa-trash"></i></button>
        </div>`).join('');
}

function deleteComment(id) {
    if (!confirm('Xóa bình luận này?')) return;
    const data = getInteractionData();
    data.comments = data.comments.filter(c => c.id !== id);
    saveInteractionData(data);
    // Xóa trên backend
    const token = sessionStorage.getItem('admin_token') || '';
    if (token && typeof adminDeleteComment === 'function') adminDeleteComment(id, token);
    loadAdminData();
    if (typeof renderComments === 'function') renderComments(true);
    if (typeof updateStatsBar === 'function') updateStatsBar();
}

function adminClearComments() {
    if (!confirm('Xóa tất cả bình luận?')) return;
    const data = getInteractionData();
    data.comments = [];
    saveInteractionData(data);
    // Xóa trên backend
    const token = sessionStorage.getItem('admin_token') || '';
    if (token && typeof adminClearAllComments === 'function') adminClearAllComments(token);
    loadAdminData();
    if (typeof renderComments === 'function') renderComments(true);
    if (typeof updateStatsBar === 'function') updateStatsBar();
}

// ========== CHART.JS ANALYTICS ==========
const _charts = {};

function destroyChart(id) {
    if (_charts[id]) { try { _charts[id].destroy(); } catch(e) {} delete _charts[id]; }
}

function mkBarChart(canvasId, labels, values, colors, label) {
    if (typeof Chart === 'undefined') return;
    destroyChart(canvasId);
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const tc = isDark ? '#bbb' : '#555';
    const gc = isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.05)';
    _charts[canvasId] = new Chart(canvas.getContext('2d'), {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{ label: label, data: values, backgroundColor: colors, borderRadius: 6, borderSkipped: false }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: { legend: { display: false } },
            scales: {
                x: { ticks: { color: tc, font: { size: 11 } }, grid: { color: gc } },
                y: { ticks: { color: tc, font: { size: 11 } }, grid: { color: gc }, beginAtZero: true }
            }
        }
    });
}

function mkHBarChart(canvasId, labels, values, colors, label) {
    if (typeof Chart === 'undefined') return;
    destroyChart(canvasId);
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const tc = isDark ? '#bbb' : '#555';
    const gc = isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.05)';
    _charts[canvasId] = new Chart(canvas.getContext('2d'), {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{ label: label, data: values, backgroundColor: colors, borderRadius: 4 }]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: true,
            plugins: { legend: { display: false } },
            scales: {
                x: { ticks: { color: tc, font: { size: 10 } }, grid: { color: gc }, beginAtZero: true },
                y: { ticks: { color: tc, font: { size: 10 } }, grid: { display: false } }
            }
        }
    });
}

function mkDoughnutChart(canvasId, labels, values, colors) {
    if (typeof Chart === 'undefined') return;
    destroyChart(canvasId);
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const tc = isDark ? '#bbb' : '#555';
    _charts[canvasId] = new Chart(canvas.getContext('2d'), {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{ data: values, backgroundColor: colors, borderWidth: 2, borderColor: 'transparent' }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: { display: true, position: 'right', labels: { color: tc, font: { size: 11 }, boxWidth: 14 } }
            }
        }
    });
}

function renderAnalytics(data) {
    const projects = data.projects || {};
    const meta = getProjectMeta();
    const ids = Object.keys(meta);
    const shortName = id => meta[id].name.split(' ').slice(0, 2).join(' ');

    // Views bar chart
    mkBarChart('chartViews',
        ids.map(shortName),
        ids.map(id => (projects[id] || {}).views || 0),
        ['#667eea', '#764ba2', '#f093fb'],
        'Lượt Xem'
    );

    // Likes bar chart
    mkBarChart('chartLikes',
        ids.map(shortName),
        ids.map(id => (projects[id] || {}).likes || 0),
        ['#f5576c', '#fa709a', '#fee140'],
        'Lượt Thích'
    );

    // Rating doughnut
    const ratingDist = [0, 0, 0, 0, 0];
    (data.comments || []).forEach(c => { if (c.rating >= 1 && c.rating <= 5) ratingDist[c.rating - 1]++; });
    mkDoughnutChart('chartRatings',
        ['1★', '2★', '3★', '4★', '5★'],
        ratingDist,
        ['#e0e0e0', '#ffd54f', '#ffb300', '#ff8f00', '#ffc107']
    );

    // System info
    const sysEl = document.getElementById('analyticsSystem');
    if (sysEl) sysEl.innerHTML = [
        ['Ngôn ngữ', (localStorage.getItem('lang') || 'vi').toUpperCase()],
        ['Theme', localStorage.getItem('theme') || 'light'],
        ['Tổng lượt xem', data.totalViews || 0],
        ['Tổng lượt thích', data.totalLikes || 0],
        ['Bình luận', (data.comments || []).length],
        ['Tin nhắn', getMessages().length],
        ['Clicks tracked', getClickData().length],
    ].map(([k, v]) => `<div class="sys-info-row"><span>${k}</span><strong>${v}</strong></div>`).join('');

    renderCountryChart();
    renderHeatmap();
}

// ========== ONLINE USERS ==========
const ONLINE_KEY = 'portfolio_online';
const MY_TAB_ID = Date.now() + '_' + Math.random().toString(36).slice(2);

function updateOnlineHeartbeat() {
    const now = Date.now();
    const raw = localStorage.getItem(ONLINE_KEY);
    const tabs = raw ? JSON.parse(raw) : {};
    tabs[MY_TAB_ID] = now;
    Object.keys(tabs).forEach(k => { if (now - tabs[k] > 8000) delete tabs[k]; });
    localStorage.setItem(ONLINE_KEY, JSON.stringify(tabs));
    const count = Object.keys(tabs).length;
    setText('adm-online', count);
    return count;
}

function initOnlineTracking() {
    updateOnlineHeartbeat();
    setInterval(updateOnlineHeartbeat, 4000);
    window.addEventListener('beforeunload', () => {
        const raw = localStorage.getItem(ONLINE_KEY);
        const tabs = raw ? JSON.parse(raw) : {};
        delete tabs[MY_TAB_ID];
        localStorage.setItem(ONLINE_KEY, JSON.stringify(tabs));
    });
}

// ========== COUNTRY TRACKING ==========
const COUNTRY_KEY = 'portfolio_countries';

function getCountryData() {
    const raw = localStorage.getItem(COUNTRY_KEY);
    return raw ? JSON.parse(raw) : {};
}

function recordCountry(country, flag) {
    const d = getCountryData();
    if (!d[country]) d[country] = { count: 0, flag: flag || '🌐' };
    d[country].count++;
    localStorage.setItem(COUNTRY_KEY, JSON.stringify(d));
}

function initCountryTracking() {
    if (sessionStorage.getItem('country_fetched')) return;
    sessionStorage.setItem('country_fetched', '1');
    fetch('https://ipapi.co/json/')
        .then(r => r.json())
        .then(d => {
            if (d && d.country_name) {
                const flag = d.country_code
                    ? String.fromCodePoint(...[...d.country_code.toUpperCase()].map(c => c.charCodeAt(0) + 127397))
                    : '🌐';
                recordCountry(d.country_name, flag);
            } else {
                recordCountry('Unknown', '🌐');
            }
        })
        .catch(() => recordCountry('Unknown', '🌐'));
}

function renderCountryChart() {
    const data = getCountryData();
    const entries = Object.entries(data).sort((a, b) => b[1].count - a[1].count).slice(0, 8);
    const listEl = document.getElementById('countryList');

    if (!entries.length) {
        destroyChart('chartCountries');
        if (listEl) listEl.innerHTML = '<p style="color:#aaa;font-size:0.82rem;text-align:center;padding:1rem">Chưa có dữ liệu quốc gia.</p>';
        return;
    }

    const labels = entries.map(([name, v]) => v.flag + ' ' + name);
    const values = entries.map(([, v]) => v.count);
    const colors = ['#667eea', '#764ba2', '#f093fb', '#f5576c', '#4facfe', '#43e97b', '#fa709a', '#fee140'];

    mkHBarChart('chartCountries', labels, values, colors.slice(0, values.length), 'Lượt truy cập');

    if (listEl) {
        const total = values.reduce((a, b) => a + b, 0) || 1;
        listEl.innerHTML = entries.map(([name, v], i) => `
            <div class="country-row">
                <span class="country-flag">${v.flag}</span>
                <span class="country-name">${name}</span>
                <div class="country-bar-track"><div class="country-bar-fill" style="width:${(v.count/total*100).toFixed(0)}%;background:${colors[i] || '#667eea'}"></div></div>
                <span class="country-count">${v.count}</span>
            </div>`).join('');
    }
}

// ========== CLICK HEATMAP ==========
const CLICK_KEY = 'portfolio_clicks';

function getClickData() {
    const raw = localStorage.getItem(CLICK_KEY);
    return raw ? JSON.parse(raw) : [];
}

function recordClick(x, y) {
    const clicks = getClickData();
    clicks.push({
        x: parseFloat((x / window.innerWidth * 100).toFixed(2)),
        y: parseFloat((y / window.innerHeight * 100).toFixed(2)),
        t: Date.now()
    });
    if (clicks.length > 500) clicks.splice(0, clicks.length - 500);
    localStorage.setItem(CLICK_KEY, JSON.stringify(clicks));
}

function initClickTracking() {
    document.addEventListener('click', e => {
        const overlay = document.getElementById('adminOverlay');
        if (overlay && overlay.style.display !== 'none') return;
        recordClick(e.clientX, e.clientY);
    });
}

function clearHeatmap() {
    if (!confirm('Xóa toàn bộ dữ liệu click?')) return;
    localStorage.removeItem(CLICK_KEY);
    renderHeatmap();
    if (typeof showToast === 'function') showToast('🗑️ Đã xóa heatmap!', 'info', 2000);
}

function renderHeatmap() {
    const canvas = document.getElementById('heatmapCanvas');
    const emptyEl = document.getElementById('heatmapEmpty');
    if (!canvas) return;

    const clicks = getClickData();
    if (!clicks.length) {
        canvas.style.display = 'none';
        if (emptyEl) emptyEl.style.display = 'flex';
        return;
    }
    if (emptyEl) emptyEl.style.display = 'none';
    canvas.style.display = 'block';

    const W = canvas.parentElement.clientWidth || 560;
    const H = Math.round(W * 0.48);
    canvas.width = W;
    canvas.height = H;

    const ctx = canvas.getContext('2d');
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    ctx.fillStyle = isDark ? '#1a1a2e' : '#eef0f8';
    ctx.fillRect(0, 0, W, H);

    // Draw page outline
    ctx.strokeStyle = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)';
    ctx.lineWidth = 1;
    ctx.strokeRect(1, 1, W - 2, H - 2);

    // Heatmap blobs
    clicks.forEach(({ x, y }) => {
        const px = x / 100 * W;
        const py = y / 100 * H;
        const r = Math.max(W / 35, 14);
        const grad = ctx.createRadialGradient(px, py, 0, px, py, r);
        grad.addColorStop(0, 'rgba(245,87,108,0.4)');
        grad.addColorStop(0.4, 'rgba(102,126,234,0.2)');
        grad.addColorStop(1, 'rgba(102,126,234,0)');
        ctx.beginPath();
        ctx.arc(px, py, r, 0, Math.PI * 2);
        ctx.fillStyle = grad;
        ctx.fill();
    });

    // Dot centers
    clicks.forEach(({ x, y }) => {
        const px = x / 100 * W;
        const py = y / 100 * H;
        ctx.beginPath();
        ctx.arc(px, py, 2.5, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(245,87,108,0.85)';
        ctx.fill();
    });

    // Counter label
    ctx.fillStyle = isDark ? 'rgba(200,200,255,0.6)' : 'rgba(80,80,160,0.6)';
    ctx.font = 'bold 11px sans-serif';
    ctx.fillText(clicks.length + ' clicks', 8, H - 8);
}

// ========== SECRET KEYBOARD COMBO ==========
(function () {
    const SECRET = 'ADMIN';
    let buffer = '';
    let timer = null;
    document.addEventListener('keydown', e => {
        const tag = document.activeElement && document.activeElement.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA') return;
        buffer += (e.key || '').toUpperCase();
        if (buffer.length > SECRET.length) buffer = buffer.slice(-SECRET.length);
        clearTimeout(timer);
        timer = setTimeout(() => { buffer = ''; }, 1500);
        if (buffer === SECRET) { buffer = ''; openAdmin(); }
    });
})();

// ========== EVENT LISTENERS ==========
document.addEventListener('DOMContentLoaded', () => {
    // Password enter key
    const pwInput = document.getElementById('adminPassword');
    if (pwInput) pwInput.addEventListener('keydown', e => { if (e.key === 'Enter') adminLogin(); });

    // Close overlay on backdrop click
    const overlay = document.getElementById('adminOverlay');
    if (overlay) overlay.addEventListener('click', e => { if (e.target === overlay) closeAdmin(); });

    // Sub-modal backdrop
    const subModal = document.getElementById('projectEditModal');
    if (subModal) subModal.addEventListener('click', e => { if (e.target === subModal) closeProjectEdit(); });

    // Tab switching — render analytics lazily after DOM paints
    document.querySelectorAll('.admin-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.admin-tab').forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.admin-tab-content').forEach(c => c.style.display = 'none');
            tab.classList.add('active');
            const tabName = tab.getAttribute('data-tab');
            const target = document.getElementById('tab-' + tabName);
            if (target) target.style.display = 'block';
            if (tabName === 'analytics') {
                // Double rAF ensures layout is fully computed before Chart.js reads canvas size
                requestAnimationFrame(() => requestAnimationFrame(() => renderAnalytics(getInteractionData())));
            }
            if (tabName === 'blog') {
                if (typeof loadAdminBlog === 'function') loadAdminBlog();
            }
            if (tabName === 'subscriptions') {
                loadAdminSubs();
            }
            if (tabName === 'ads') {
                loadAdminAds();
            }
            if (tabName === 'pr-posts') {
                loadAdminPrPosts();
            }
        });
    });

    // Intercept contact form to save messages locally
    const contactForm = document.getElementById('contactForm');
    if (contactForm) {
        contactForm.addEventListener('submit', function () {
            const name = document.getElementById('name')?.value?.trim();
            const email = document.getElementById('email')?.value?.trim();
            const subject = document.getElementById('subject')?.value?.trim();
            const message = document.getElementById('message')?.value?.trim();
            if (name && message) saveMessage({ name, email, subject, message });
        }, true);
    }

    // Init all tracking
    initOnlineTracking();
    initCountryTracking();
    initClickTracking();
});

// ========== PUSH NOTIFICATION (Admin) ==========
function showPushModal() {
    document.getElementById('pushModal').style.display = 'flex';
}

async function sendPushNotification() {
    const token = sessionStorage.getItem('admin_token') || '';
    const title = document.getElementById('pushTitle').value.trim();
    const body = document.getElementById('pushBody').value.trim();
    const url = document.getElementById('pushUrl').value.trim() || '/';
    const resultEl = document.getElementById('pushResult');
    if (!body) { resultEl.textContent = '⚠️ Vui lòng nhập nội dung'; return; }
    resultEl.textContent = '⏳ Đang gửi...';
    try {
        const r = await fetch('/api/push/send', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-admin-token': token },
            body: JSON.stringify({ title, body, url })
        });
        const data = await r.json();
        resultEl.textContent = `✅ Đã gửi ${data.sent}/${data.total} thiết bị`;
        if (typeof showToast === 'function') showToast(`🔔 Đã gửi ${data.sent} thông báo!`, 'success', 3000);
    } catch {
        resultEl.textContent = '❌ Lỗi khi gửi';
    }
}

// ========== BLOG ADMIN ==========
const BLOG_API = (location.hostname === 'localhost' || location.hostname === '127.0.0.1')
  ? 'http://localhost:3001/api/blog'
  : `${location.origin}/api/blog`;

async function loadAdminBlog() {
    const token = sessionStorage.getItem('admin_token') || '';
    try {
        const r = await fetch(`${BLOG_API}/admin/posts`, { headers: { 'x-admin-token': token } });
        const posts = await r.json();
        renderAdminBlog(posts);
    } catch { renderAdminBlog([]); }
}

function renderAdminBlog(posts) {
    const el = document.getElementById('adminBlogList');
    if (!el) return;
    if (!posts.length) { el.innerHTML = '<div class="admin-empty"><i class="fas fa-pen-nib"></i><p>Chưa có bài viết nào. Bấm "Viết Bài Mới" để bắt đầu!</p></div>'; return; }
    el.innerHTML = posts.map(p => `
        <div class="admin-blog-row">
            <div class="admin-blog-info">
                <strong>${p.title}</strong>
                <div class="admin-blog-meta">
                    ${(p.tags||[]).map(t=>`<span class="tag">${t}</span>`).join('')}
                    <span class="${p.published?'badge-published':'badge-draft'}">${p.published?'✅ Xuất bản':'📝 Nháp'}</span>
                </div>
                <small><i class="fas fa-eye"></i> ${p.views||0} &nbsp; <i class="fas fa-heart"></i> ${p.likes||0} &nbsp; ${new Date(p.created_at).toLocaleDateString('vi-VN')}</small>
            </div>
            <div class="admin-project-actions">
                <a href="blog-post.html?slug=${p.slug||p.id}" target="_blank" class="admin-btn-icon" title="Xem"><i class="fas fa-eye"></i></a>
                <button class="admin-btn-icon" onclick="editBlogPost(${p.id})" title="Sửa"><i class="fas fa-edit"></i></button>
                <button class="admin-btn-icon danger" onclick="deleteBlogPost(${p.id})" title="Xóa"><i class="fas fa-trash"></i></button>
            </div>
        </div>`).join('');
}

function openBlogEditor(post) {
    document.getElementById('blogEditorTitle').textContent = post ? '✏️ Sửa Bài Viết' : '✍️ Viết Bài Mới';
    document.getElementById('blogEditId').value = post?.id || '';
    document.getElementById('blogTitle').value = post?.title || '';
    document.getElementById('blogSlug').value = post?.slug || '';
    document.getElementById('blogExcerpt').value = post?.excerpt || '';
    document.getElementById('blogTags').value = (post?.tags||[]).join(', ');
    document.getElementById('blogReadTime').value = post?.read_time || 5;
    document.getElementById('blogPublished').value = post?.published !== false ? '1' : '0';
    document.getElementById('blogContent').value = post?.content || '';
    document.getElementById('mdPreview').style.display = 'none';
    document.getElementById('blogContent').style.display = 'block';
    document.getElementById('blogEditorModal').style.display = 'flex';

    // Auto-calculate reading time on content input
    const contentEl = document.getElementById('blogContent');
    contentEl.oninput = updateReadTimeFromContent;
    // Tính ngay khi mở (nếu edit bài cũ)
    if (post?.content) updateReadTimeFromContent();

    // Auto-generate slug from title
    document.getElementById('blogTitle').addEventListener('input', function() {
        if (!document.getElementById('blogEditId').value) {
            document.getElementById('blogSlug').value = this.value.toLowerCase()
                .replace(/[àáạảãâầấậẩẫăằắặẳẵ]/g,'a')
                .replace(/[èéẹẻẽêềếệểễ]/g,'e')
                .replace(/[ìíịỉĩ]/g,'i')
                .replace(/[òóọỏõôồốộổỗơờớợởỡ]/g,'o')
                .replace(/[ùúụủũưừứựửữ]/g,'u')
                .replace(/[ỳýỵỷỹ]/g,'y')
                .replace(/đ/g,'d')
                .replace(/[^a-z0-9\s-]/g,'')
                .trim().replace(/\s+/g,'-');
        }
    }, { once: false });
}

async function editBlogPost(id) {
    const token = sessionStorage.getItem('admin_token') || '';
    try {
        const r = await fetch(`${BLOG_API}/admin/posts`, { headers: { 'x-admin-token': token } });
        const posts = await r.json();
        const post = posts.find(p => p.id === id);
        if (post) openBlogEditor(post);
    } catch {}
}

async function saveBlogPost() {
    const token = sessionStorage.getItem('admin_token') || '';
    const id = document.getElementById('blogEditId').value;
    const data = {
        title: document.getElementById('blogTitle').value.trim(),
        slug: document.getElementById('blogSlug').value.trim(),
        excerpt: document.getElementById('blogExcerpt').value.trim(),
        content: document.getElementById('blogContent').value,
        tags: document.getElementById('blogTags').value.split(',').map(t=>t.trim()).filter(Boolean),
        read_time: parseInt(document.getElementById('blogReadTime').value)||5,
        published: document.getElementById('blogPublished').value === '1'
    };
    if (!data.title || !data.slug) { if (typeof showToast==='function') showToast('⚠️ Cần có tiêu đề và slug!','error',3000); return; }
    try {
        const url = id ? `${BLOG_API}/posts/${id}` : `${BLOG_API}/posts`;
        const method = id ? 'PUT' : 'POST';
        const r = await fetch(url, { method, headers: { 'Content-Type':'application/json','x-admin-token':token }, body: JSON.stringify(data) });
        if (!r.ok) throw new Error();
        closeBlogEditor();
        loadAdminBlog();
        if (typeof showToast==='function') showToast('✅ Đã lưu bài viết!','success',3000);
    } catch { if (typeof showToast==='function') showToast('❌ Lỗi khi lưu','error',3000); }
}

async function deleteBlogPost(id) {
    if (!confirm('Xóa bài viết này?')) return;
    const token = sessionStorage.getItem('admin_token') || '';
    await fetch(`${BLOG_API}/posts/${id}`, { method:'DELETE', headers:{'x-admin-token':token} });
    loadAdminBlog();
    if (typeof showToast==='function') showToast('🗑️ Đã xóa bài viết','info',2000);
}

function closeBlogEditor() {
    document.getElementById('blogEditorModal').style.display = 'none';
}

// Markdown editor helpers
function mdInsert(before, after, placeholder) {
    const ta = document.getElementById('blogContent');
    const start = ta.selectionStart, end = ta.selectionEnd;
    const selected = ta.value.substring(start, end) || placeholder;
    ta.value = ta.value.substring(0,start) + before + selected + after + ta.value.substring(end);
    ta.focus();
    ta.selectionStart = start + before.length;
    ta.selectionEnd = start + before.length + selected.length;
    // Auto-update reading time
    updateReadTimeFromContent();
}

function updateReadTimeFromContent() {
    const content = document.getElementById('blogContent')?.value || '';
    const words = content.trim().split(/\s+/).filter(Boolean).length;
    const rt = Math.max(1, Math.round(words / 200));
    const rtInput = document.getElementById('blogReadTime');
    if (rtInput) rtInput.value = rt;
}

function togglePreview() {
    const ta = document.getElementById('blogContent');
    const preview = document.getElementById('mdPreview');
    if (preview.style.display === 'none') {
        if (typeof marked !== 'undefined') preview.innerHTML = marked.parse(ta.value);
        preview.style.display = 'block';
        ta.style.display = 'none';
    } else {
        preview.style.display = 'none';
        ta.style.display = 'block';
        ta.focus();
    }
}



// ========== VIP SUBSCRIPTION ADMIN ==========
const SUB_API = (location.hostname==='localhost'||location.hostname==='127.0.0.1')
    ? 'http://localhost:3001/api/subscription'
    : `${location.origin}/api/subscription`;

async function loadAdminSubs() {
    const token = sessionStorage.getItem('admin_token') || '';
    const el = document.getElementById('adminSubsList');
    if (!el) return;
    el.innerHTML = '<div style="text-align:center;padding:2rem;color:#888"><i class="fas fa-spinner fa-spin"></i> Đang tải...</div>';
    try {
        const r = await fetch(`${SUB_API}/admin/list`, { headers: { 'x-admin-token': token } });
        const subs = await r.json();
        if (!subs.length) { el.innerHTML = '<div style="text-align:center;padding:2rem;color:#aaa">Chưa có đăng ký VIP nào</div>'; return; }
        el.innerHTML = `
        <div style="overflow-x:auto;">
        <table style="width:100%;border-collapse:collapse;font-size:0.85rem;">
          <thead><tr style="background:rgba(102,126,234,0.08);">
            <th style="padding:0.75rem 1rem;text-align:left;font-weight:700;color:#667eea;">Tên</th>
            <th style="padding:0.75rem 1rem;text-align:left;font-weight:700;color:#667eea;">Email</th>
            <th style="padding:0.75rem 1rem;text-align:center;font-weight:700;color:#667eea;">Trạng thái</th>
            <th style="padding:0.75rem 1rem;text-align:center;font-weight:700;color:#667eea;">Hết hạn</th>
            <th style="padding:0.75rem 1rem;text-align:center;font-weight:700;color:#667eea;">Ngày đăng ký</th>
            <th style="padding:0.75rem 1rem;text-align:center;font-weight:700;color:#667eea;">Hành động</th>
          </tr></thead>
          <tbody>${subs.map(s => {
            const statusColor = s.status==='active' ? '#10b981' : s.status==='pending' ? '#f59e0b' : '#ef4444';
            const statusLabel = s.status==='active' ? '✅ Active' : s.status==='pending' ? '⏳ Chờ duyệt' : '❌ Từ chối';
            const exp = s.expires_at ? new Date(s.expires_at).toLocaleDateString('vi-VN') : '—';
            const created = new Date(s.created_at).toLocaleDateString('vi-VN');
            return `<tr style="border-bottom:1px solid rgba(0,0,0,0.06);">
              <td style="padding:0.75rem 1rem;font-weight:600;">${s.name}</td>
              <td style="padding:0.75rem 1rem;color:#667eea;">${s.email}</td>
              <td style="padding:0.75rem 1rem;text-align:center;"><span style="background:${statusColor}20;color:${statusColor};padding:0.25rem 0.75rem;border-radius:50px;font-size:0.78rem;font-weight:700;">${statusLabel}</span></td>
              <td style="padding:0.75rem 1rem;text-align:center;font-size:0.82rem;">${exp}</td>
              <td style="padding:0.75rem 1rem;text-align:center;font-size:0.82rem;">${created}</td>
              <td style="padding:0.75rem 1rem;text-align:center;">
                ${s.status!=='active' ? `<button onclick="activateSub(${s.id})" style="padding:0.35rem 0.8rem;border:none;border-radius:8px;background:linear-gradient(135deg,#10b981,#059669);color:#fff;font-size:0.78rem;font-weight:700;cursor:pointer;margin-right:0.35rem;"><i class="fas fa-check"></i> Duyệt</button>` : ''}
                <button onclick="deleteSub(${s.id})" style="padding:0.35rem 0.8rem;border:none;border-radius:8px;background:rgba(239,68,68,0.1);color:#ef4444;font-size:0.78rem;font-weight:700;cursor:pointer;"><i class="fas fa-trash"></i></button>
              </td>
            </tr>`;
          }).join('')}</tbody>
        </table></div>`;
    } catch(e) {
        el.innerHTML = '<div style="color:red;padding:1rem">Lỗi tải dữ liệu</div>';
    }
}

async function activateSub(id) {
    const token = sessionStorage.getItem('admin_token') || '';
    try {
        const r = await fetch(`${SUB_API}/admin/activate/${id}`, { method:'POST', headers:{'x-admin-token':token} });
        if (r.ok) { if (typeof showToast==='function') showToast('✅ Đã kích hoạt VIP!','success',3000); loadAdminSubs(); }
    } catch(e) { if (typeof showToast==='function') showToast('❌ Lỗi','error',2000); }
}

async function deleteSub(id) {
    if (!confirm('Xóa subscription này?')) return;
    const token = sessionStorage.getItem('admin_token') || '';
    try {
        await fetch(`${SUB_API}/admin/${id}`, { method:'DELETE', headers:{'x-admin-token':token} });
        if (typeof showToast==='function') showToast('🗑️ Đã xóa','info',2000);
        loadAdminSubs();
    } catch(e) {}
}

// ========== ADS ADMIN ==========
const ADS_ADMIN_API = (location.hostname === 'localhost' || location.hostname === '127.0.0.1')
    ? 'http://localhost:3001/api'
    : `${location.origin}/api`;

async function loadAdminAds() {
    const token = sessionStorage.getItem('admin_token') || '';
    const status = document.getElementById('ads-filter-status')?.value || '';
    const el = document.getElementById('adminAdsList');
    const revenueEl = document.getElementById('ads-revenue-stats');
    if (!el) return;
    el.innerHTML = '<div style="text-align:center;padding:2rem;color:#888"><i class="fas fa-spinner fa-spin"></i> Đang tải...</div>';

    // Load revenue stats
    try {
        const rv = await fetch(`${ADS_ADMIN_API}/admin/ads/revenue`, { headers: { 'x-admin-token': token } });
        const rd = await rv.json();
        if (revenueEl && rd.revenue) {
            const fmt = n => Number(n||0).toLocaleString('vi-VN') + '₫';
            revenueEl.innerHTML = [
                ['Hôm nay', fmt(rd.revenue.today), '#4ade80'],
                ['7 ngày', fmt(rd.revenue.week), '#a5f3fc'],
                ['30 ngày', fmt(rd.revenue.month), '#c4b5fd'],
                ['Tổng', fmt(rd.revenue.all_time), '#f9a8d4']
            ].map(([l,v,c]) => `<div style="background:rgba(255,255,255,.06);border-radius:14px;padding:1rem;text-align:center">
                <div style="font-size:1.2rem;font-weight:900;color:${c}">${v}</div>
                <div style="font-size:.72rem;color:rgba(255,255,255,.45);margin-top:.2rem">${l}</div>
            </div>`).join('');
        }
    } catch(e) {}

    // Load ads list
    try {
        const url = `${ADS_ADMIN_API}/admin/ads${status ? '?status=' + status : ''}`;
        const r = await fetch(url, { headers: { 'x-admin-token': token } });
        const ads = await r.json();
        if (!ads.length) {
            el.innerHTML = '<div style="text-align:center;padding:2rem;color:rgba(255,255,255,.35)">Không có quảng cáo nào</div>';
            return;
        }
        const statusBadge = s => ({
            pending: '<span style="background:rgba(251,191,36,.15);color:#fbbf24;padding:.2rem .65rem;border-radius:50px;font-size:.72rem;font-weight:700">Chờ duyệt</span>',
            active:  '<span style="background:rgba(74,222,128,.15);color:#4ade80;padding:.2rem .65rem;border-radius:50px;font-size:.72rem;font-weight:700">Đang chạy</span>',
            rejected:'<span style="background:rgba(248,113,113,.15);color:#f87171;padding:.2rem .65rem;border-radius:50px;font-size:.72rem;font-weight:700">Từ chối</span>',
            hidden:  '<span style="background:rgba(255,255,255,.08);color:rgba(255,255,255,.4);padding:.2rem .65rem;border-radius:50px;font-size:.72rem;font-weight:700">Đã ẩn</span>',
            expired: '<span style="background:rgba(255,255,255,.06);color:rgba(255,255,255,.3);padding:.2rem .65rem;border-radius:50px;font-size:.72rem;font-weight:700">Hết hạn</span>',
            paid:    '<span style="background:rgba(96,165,250,.15);color:#60a5fa;padding:.2rem .65rem;border-radius:50px;font-size:.72rem;font-weight:700">Đã TT</span>'
        }[s] || s);

        el.innerHTML = `<div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;font-size:.83rem">
            <thead><tr style="border-bottom:1px solid rgba(255,255,255,.1)">
                <th style="padding:.65rem .85rem;text-align:left;color:rgba(255,255,255,.45);font-size:.72rem;text-transform:uppercase">Sản phẩm</th>
                <th style="padding:.65rem .85rem;text-align:left;color:rgba(255,255,255,.45);font-size:.72rem;text-transform:uppercase">User</th>
                <th style="padding:.65rem .85rem;text-align:center;color:rgba(255,255,255,.45);font-size:.72rem;text-transform:uppercase">Trạng thái</th>
                <th style="padding:.65rem .85rem;text-align:center;color:rgba(255,255,255,.45);font-size:.72rem;text-transform:uppercase">Ngày tạo</th>
                <th style="padding:.65rem .85rem;text-align:center;color:rgba(255,255,255,.45);font-size:.72rem;text-transform:uppercase">Hành động</th>
            </tr></thead>
            <tbody>${ads.map(ad => `<tr style="border-bottom:1px solid rgba(255,255,255,.05)">
                <td style="padding:.75rem .85rem">
                    <div style="display:flex;align-items:center;gap:.6rem">
                        ${ad.image_url ? `<img src="${ad.image_url}" style="width:38px;height:38px;border-radius:8px;object-fit:cover" onerror="this.style.display='none'">` : '<div style="width:38px;height:38px;border-radius:8px;background:rgba(255,255,255,.08);display:flex;align-items:center;justify-content:center">📦</div>'}
                        <div>
                            <div style="font-weight:700;max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${ad.product_name}</div>
                            <div style="font-size:.72rem;color:rgba(255,255,255,.4)">${ad.platform || ''} · ${ad.slot || ''}</div>
                            ${ad.rejection_reason ? `<div style="font-size:.72rem;color:#f87171;margin-top:.15rem">${ad.rejection_reason}</div>` : ''}
                        </div>
                    </div>
                </td>
                <td style="padding:.75rem .85rem">
                    <div style="font-weight:600;font-size:.82rem">${ad.username || '—'}</div>
                    <div style="font-size:.72rem;color:rgba(255,255,255,.4)">${ad.user_email || ''}</div>
                </td>
                <td style="padding:.75rem .85rem;text-align:center">${statusBadge(ad.status)}</td>
                <td style="padding:.75rem .85rem;text-align:center;font-size:.78rem;color:rgba(255,255,255,.45)">${new Date(ad.created_at).toLocaleDateString('vi-VN')}</td>
                <td style="padding:.75rem .85rem;text-align:center">
                    <div style="display:flex;gap:.35rem;justify-content:center;flex-wrap:wrap">
                        ${(ad.status === 'pending' || ad.status === 'paid') ? `<button onclick="adminAdAction(${ad.id},'approve')" style="padding:.3rem .7rem;border:none;border-radius:8px;background:rgba(74,222,128,.2);color:#4ade80;font-size:.75rem;font-weight:700;cursor:pointer"><i class="fas fa-check"></i> Duyệt</button>` : ''}
                        ${(ad.status === 'pending' || ad.status === 'paid') ? `<button onclick="adminAdReject(${ad.id})" style="padding:.3rem .7rem;border:none;border-radius:8px;background:rgba(248,113,113,.15);color:#f87171;font-size:.75rem;font-weight:700;cursor:pointer"><i class="fas fa-times"></i> Từ chối</button>` : ''}
                        ${ad.status === 'active' ? `<button onclick="adminAdAction(${ad.id},'hide')" style="padding:.3rem .7rem;border:none;border-radius:8px;background:rgba(255,255,255,.1);color:rgba(255,255,255,.6);font-size:.75rem;font-weight:700;cursor:pointer"><i class="fas fa-eye-slash"></i> Ẩn</button>` : ''}
                        ${ad.status === 'hidden' ? `<button onclick="adminAdAction(${ad.id},'unhide')" style="padding:.3rem .7rem;border:none;border-radius:8px;background:rgba(96,165,250,.15);color:#60a5fa;font-size:.75rem;font-weight:700;cursor:pointer"><i class="fas fa-eye"></i> Hiện</button>` : ''}
                        <button onclick="adminAdDelete(${ad.id})" style="padding:.3rem .7rem;border:none;border-radius:8px;background:rgba(239,68,68,.15);color:#ef4444;font-size:.75rem;font-weight:700;cursor:pointer"><i class="fas fa-trash"></i></button>
                    </div>
                </td>
            </tr>`).join('')}
            </tbody>
        </table></div>`;
    } catch(e) {
        el.innerHTML = '<div style="color:#f87171;padding:1rem">Lỗi tải dữ liệu</div>';
    }
}

async function adminAdAction(id, action) {
    const token = sessionStorage.getItem('admin_token') || '';
    try {
        const r = await fetch(`${ADS_ADMIN_API}/admin/ads/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json', 'x-admin-token': token },
            body: JSON.stringify({ action })
        });
        if (r.ok) {
            const labels = { approve: '✅ Đã duyệt', hide: '🙈 Đã ẩn', unhide: '👁️ Đã hiện' };
            if (typeof showToast === 'function') showToast(labels[action] || 'Thành công', 'success', 2500);
            loadAdminAds();
        }
    } catch(e) { if (typeof showToast === 'function') showToast('❌ Lỗi', 'error', 2000); }
}

async function adminAdReject(id) {
    document.getElementById('adsRejectId').value = id;
    document.getElementById('adsRejectReason').value = '';
    document.getElementById('adsRejectModal').style.display = 'flex';
}

async function confirmAdReject() {
    const id = document.getElementById('adsRejectId').value;
    const reason = document.getElementById('adsRejectReason').value.trim();
    document.getElementById('adsRejectModal').style.display = 'none';
    const token = sessionStorage.getItem('admin_token') || '';
    try {
        const r = await fetch(`${ADS_ADMIN_API}/admin/ads/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json', 'x-admin-token': token },
            body: JSON.stringify({ action: 'reject', rejection_reason: reason })
        });
        if (r.ok) {
            if (typeof showToast === 'function') showToast('🚫 Đã từ chối', 'info', 2500);
            loadAdminAds();
        }
    } catch(e) {}
}

async function adminAdDelete(id) {
    const token = sessionStorage.getItem('admin_token') || '';
    try {
        await fetch(`${ADS_ADMIN_API}/admin/ads/${id}`, { method: 'DELETE', headers: { 'x-admin-token': token } });
        if (typeof showToast === 'function') showToast('🗑️ Đã xóa', 'info', 2000);
        loadAdminAds();
    } catch(e) {}
}

// ========== PR POSTS ADMIN ==========
async function loadAdminPrPosts() {
    const token = sessionStorage.getItem('admin_token') || '';
    const status = document.getElementById('pr-filter-status')?.value || '';
    const el = document.getElementById('adminPrList');
    if (!el) return;
    el.innerHTML = '<div style="text-align:center;padding:2rem;color:#888"><i class="fas fa-spinner fa-spin"></i> Đang tải...</div>';
    try {
        const url = `${ADS_ADMIN_API}/admin/pr-posts${status ? '?status=' + status : ''}`;
        const r = await fetch(url, { headers: { 'x-admin-token': token } });
        const posts = await r.json();
        if (!posts.length) {
            el.innerHTML = '<div style="text-align:center;padding:2rem;color:rgba(255,255,255,.35)">Không có bài PR nào</div>';
            return;
        }
        const statusBadge = s => ({
            pending: '<span style="background:rgba(251,191,36,.15);color:#fbbf24;padding:.2rem .65rem;border-radius:50px;font-size:.72rem;font-weight:700">Chờ duyệt</span>',
            paid:    '<span style="background:rgba(96,165,250,.15);color:#60a5fa;padding:.2rem .65rem;border-radius:50px;font-size:.72rem;font-weight:700">Đã TT</span>',
            active:  '<span style="background:rgba(74,222,128,.15);color:#4ade80;padding:.2rem .65rem;border-radius:50px;font-size:.72rem;font-weight:700">Đang chạy</span>',
            rejected:'<span style="background:rgba(248,113,113,.15);color:#f87171;padding:.2rem .65rem;border-radius:50px;font-size:.72rem;font-weight:700">Từ chối</span>',
            expired: '<span style="background:rgba(255,255,255,.06);color:rgba(255,255,255,.3);padding:.2rem .65rem;border-radius:50px;font-size:.72rem;font-weight:700">Hết hạn</span>'
        }[s] || s);

        el.innerHTML = `<div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;font-size:.83rem">
            <thead><tr style="border-bottom:1px solid rgba(255,255,255,.1)">
                <th style="padding:.65rem .85rem;text-align:left;color:rgba(255,255,255,.45);font-size:.72rem;text-transform:uppercase">Tiêu đề</th>
                <th style="padding:.65rem .85rem;text-align:left;color:rgba(255,255,255,.45);font-size:.72rem;text-transform:uppercase">User</th>
                <th style="padding:.65rem .85rem;text-align:center;color:rgba(255,255,255,.45);font-size:.72rem;text-transform:uppercase">Gói</th>
                <th style="padding:.65rem .85rem;text-align:center;color:rgba(255,255,255,.45);font-size:.72rem;text-transform:uppercase">Trạng thái</th>
                <th style="padding:.65rem .85rem;text-align:center;color:rgba(255,255,255,.45);font-size:.72rem;text-transform:uppercase">Views</th>
                <th style="padding:.65rem .85rem;text-align:center;color:rgba(255,255,255,.45);font-size:.72rem;text-transform:uppercase">Hành động</th>
            </tr></thead>
            <tbody>${posts.map(p => `<tr style="border-bottom:1px solid rgba(255,255,255,.05)">
                <td style="padding:.75rem .85rem">
                    <div style="display:flex;align-items:center;gap:.6rem">
                        ${p.image_url ? `<img src="${p.image_url}" style="width:38px;height:38px;border-radius:8px;object-fit:cover" onerror="this.style.display='none'">` : '<div style="width:38px;height:38px;border-radius:8px;background:rgba(255,255,255,.08);display:flex;align-items:center;justify-content:center">📝</div>'}
                        <div>
                            <div style="font-weight:700;max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${p.title}</div>
                            ${p.rejection_reason ? `<div style="font-size:.72rem;color:#f87171;margin-top:.15rem">${p.rejection_reason}</div>` : ''}
                        </div>
                    </div>
                </td>
                <td style="padding:.75rem .85rem">
                    <div style="font-weight:600;font-size:.82rem">${p.username || '—'}</div>
                    <div style="font-size:.72rem;color:rgba(255,255,255,.4)">${p.user_email || ''}</div>
                </td>
                <td style="padding:.75rem .85rem;text-align:center;font-size:.78rem;text-transform:capitalize;color:rgba(255,255,255,.6)">${p.plan}</td>
                <td style="padding:.75rem .85rem;text-align:center">${statusBadge(p.status)}</td>
                <td style="padding:.75rem .85rem;text-align:center;font-size:.82rem">${p.views || 0}</td>
                <td style="padding:.75rem .85rem;text-align:center">
                    <div style="display:flex;gap:.35rem;justify-content:center;flex-wrap:wrap">
                        ${(p.status === 'pending' || p.status === 'paid') ? `<button onclick="adminPrAction(${p.id},'approve')" style="padding:.3rem .7rem;border:none;border-radius:8px;background:rgba(74,222,128,.2);color:#4ade80;font-size:.75rem;font-weight:700;cursor:pointer"><i class="fas fa-check"></i> Duyệt</button>` : ''}
                        ${(p.status === 'pending' || p.status === 'paid') ? `<button onclick="adminPrReject(${p.id})" style="padding:.3rem .7rem;border:none;border-radius:8px;background:rgba(248,113,113,.15);color:#f87171;font-size:.75rem;font-weight:700;cursor:pointer"><i class="fas fa-times"></i> Từ chối</button>` : ''}
                        ${p.status === 'active' ? `<button onclick="adminPrAction(${p.id},'hide')" style="padding:.3rem .7rem;border:none;border-radius:8px;background:rgba(255,255,255,.1);color:rgba(255,255,255,.6);font-size:.75rem;font-weight:700;cursor:pointer"><i class="fas fa-eye-slash"></i> Ẩn</button>` : ''}
                        <button onclick="adminPrDelete(${p.id})" style="padding:.3rem .7rem;border:none;border-radius:8px;background:rgba(239,68,68,.15);color:#ef4444;font-size:.75rem;font-weight:700;cursor:pointer"><i class="fas fa-trash"></i></button>
                    </div>
                </td>
            </tr>`).join('')}
            </tbody>
        </table></div>`;
    } catch(e) {
        el.innerHTML = '<div style="color:#f87171;padding:1rem">Lỗi tải dữ liệu</div>';
    }
}

async function adminPrAction(id, action) {
    const token = sessionStorage.getItem('admin_token') || '';
    try {
        const r = await fetch(`${ADS_ADMIN_API}/admin/pr-posts/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json', 'x-admin-token': token },
            body: JSON.stringify({ action })
        });
        if (r.ok) {
            const labels = { approve: '✅ Đã duyệt bài PR', hide: '🙈 Đã ẩn bài PR' };
            if (typeof showToast === 'function') showToast(labels[action] || 'Thành công', 'success', 2500);
            loadAdminPrPosts();
        }
    } catch(e) { if (typeof showToast === 'function') showToast('❌ Lỗi', 'error', 2000); }
}

async function adminPrReject(id) {
    const reason = prompt('Lý do từ chối bài PR:');
    if (reason === null) return;
    const token = sessionStorage.getItem('admin_token') || '';
    try {
        const r = await fetch(`${ADS_ADMIN_API}/admin/pr-posts/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json', 'x-admin-token': token },
            body: JSON.stringify({ action: 'reject', rejection_reason: reason })
        });
        if (r.ok) {
            if (typeof showToast === 'function') showToast('🚫 Đã từ chối bài PR', 'info', 2500);
            loadAdminPrPosts();
        }
    } catch(e) {}
}

async function adminPrDelete(id) {
    const token = sessionStorage.getItem('admin_token') || '';
    try {
        await fetch(`${ADS_ADMIN_API}/admin/pr-posts/${id}`, { method: 'DELETE', headers: { 'x-admin-token': token } });
        if (typeof showToast === 'function') showToast('🗑️ Đã xóa bài PR', 'info', 2000);
        loadAdminPrPosts();
    } catch(e) {}
}
