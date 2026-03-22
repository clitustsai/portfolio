require('dotenv').config();
const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const path = require('path');
const webpush = require('web-push');
const { getDb, run, all, get } = require('./db');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({ origin: '*' }));
app.use(express.json());
// Serve frontend static files from project root
const frontendPath = path.join(__dirname, '..');
// Cache headers for static assets
app.use(express.static(frontendPath, {
    setHeaders: (res, filePath) => {
        if (filePath.match(/\.(css|js|woff2?|ttf|eot|svg|png|jpg|jpeg|gif|ico|webp)$/)) {
            res.setHeader('Cache-Control', 'public, max-age=86400'); // 1 day
        }
    }
}));
console.log('Serving static files from:', frontendPath);

// Setup VAPID
if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
    webpush.setVapidDetails(
        process.env.VAPID_EMAIL || 'mailto:admin@example.com',
        process.env.VAPID_PUBLIC_KEY,
        process.env.VAPID_PRIVATE_KEY
    );
}

const limiter = rateLimit({ windowMs: 60 * 1000, max: 60, message: { error: 'Quá nhiều request.' } });
app.use('/api/', limiter);
const chatLimiter = rateLimit({ windowMs: 60 * 1000, max: 15, message: { error: 'Giới hạn 15 tin/phút.' } });

// ========== STATS ==========
app.get('/api/stats', (req, res) => {
    const projects = all('SELECT * FROM project_stats');
    const totalViews = get("SELECT value FROM site_stats WHERE key='total_views'");
    const totalLikes = get("SELECT value FROM site_stats WHERE key='total_likes'");
    const commentCount = get('SELECT COUNT(*) as count FROM comments');
    res.json({
        projects: projects.reduce((acc, p) => { acc[p.project_id] = { views: p.views, likes: p.likes }; return acc; }, {}),
        totalViews: totalViews?.value || 0,
        totalLikes: totalLikes?.value || 0,
        totalComments: commentCount?.count || 0
    });
});

// ========== PROJECT VIEWS ==========
app.post('/api/projects/:id/view', (req, res) => {
    const id = parseInt(req.params.id);
    run('UPDATE project_stats SET views = views + 1 WHERE project_id = ?', [id]);
    run("UPDATE site_stats SET value = value + 1 WHERE key = 'total_views'");
    const row = get('SELECT views FROM project_stats WHERE project_id = ?', [id]);
    res.json({ views: row?.views || 0 });
});

// ========== PROJECT LIKES ==========
app.post('/api/projects/:id/like', (req, res) => {
    const id = parseInt(req.params.id);
    const { action } = req.body;
    if (action === 'unlike') {
        run('UPDATE project_stats SET likes = MAX(0, likes - 1) WHERE project_id = ?', [id]);
        run("UPDATE site_stats SET value = MAX(0, value - 1) WHERE key = 'total_likes'");
    } else {
        run('UPDATE project_stats SET likes = likes + 1 WHERE project_id = ?', [id]);
        run("UPDATE site_stats SET value = value + 1 WHERE key = 'total_likes'");
    }
    const row = get('SELECT likes FROM project_stats WHERE project_id = ?', [id]);
    res.json({ likes: row?.likes || 0 });
});

// ========== COMMENTS ==========
app.get('/api/comments', (req, res) => {
    const sort = req.query.sort || 'newest';
    let order = 'created_at DESC';
    if (sort === 'oldest') order = 'created_at ASC';
    else if (sort === 'rating') order = 'rating DESC, created_at DESC';
    const comments = all(`SELECT * FROM comments ORDER BY ${order}`);
    res.json(comments);
});

app.post('/api/comments', (req, res) => {
    const { name, email, text, rating } = req.body;
    if (!name?.trim() || !text?.trim() || !rating) return res.status(400).json({ error: 'Thiếu thông tin.' });
    if (rating < 1 || rating > 5) return res.status(400).json({ error: 'Rating 1-5.' });
    run('INSERT INTO comments (name, email, text, rating) VALUES (?, ?, ?, ?)', [
        name.trim().slice(0, 100),
        (email || '').trim().slice(0, 200),
        text.trim().slice(0, 2000),
        parseInt(rating)
    ]);
    const comment = get('SELECT * FROM comments ORDER BY id DESC LIMIT 1');
    res.status(201).json(comment);
});

app.post('/api/comments/:id/like', (req, res) => {
    const id = parseInt(req.params.id);
    run('UPDATE comments SET likes = likes + 1 WHERE id = ?', [id]);
    const row = get('SELECT likes FROM comments WHERE id = ?', [id]);
    res.json({ likes: row?.likes || 0 });
});

app.delete('/api/comments/:id', requireAdmin, (req, res) => {
    run('DELETE FROM comments WHERE id = ?', [parseInt(req.params.id)]);
    res.json({ ok: true });
});

app.delete('/api/comments', requireAdmin, (req, res) => {
    run('DELETE FROM comments');
    res.json({ ok: true });
});

// ========== MESSAGES ==========
app.post('/api/messages', (req, res) => {
    const { name, email, subject, message } = req.body;
    if (!name?.trim() || !message?.trim()) return res.status(400).json({ error: 'Thiếu thông tin.' });
    run('INSERT INTO messages (name, email, subject, message) VALUES (?, ?, ?, ?)', [
        name.trim().slice(0, 100),
        (email || '').trim().slice(0, 200),
        (subject || '').trim().slice(0, 300),
        message.trim().slice(0, 5000)
    ]);
    res.status(201).json({ ok: true });
});

app.get('/api/messages', requireAdmin, (req, res) => {
    res.json(all('SELECT * FROM messages ORDER BY created_at DESC'));
});

app.patch('/api/messages/:id/read', requireAdmin, (req, res) => {
    run('UPDATE messages SET read = 1 WHERE id = ?', [parseInt(req.params.id)]);
    res.json({ ok: true });
});

app.delete('/api/messages/:id', requireAdmin, (req, res) => {
    run('DELETE FROM messages WHERE id = ?', [parseInt(req.params.id)]);
    res.json({ ok: true });
});

app.delete('/api/messages', requireAdmin, (req, res) => {
    run('DELETE FROM messages');
    res.json({ ok: true });
});

// ========== AI CHAT (OpenRouter - Gemini) ==========
app.post('/api/chat', chatLimiter, async (req, res) => {
    const { message } = req.body;
    if (!message?.trim()) return res.status(400).json({ error: 'Thiếu nội dung.' });

    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) return res.json({ reply: getFallbackReply(message) });

    try {
        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`,
                'HTTP-Referer': 'http://localhost:3001',
                'X-Title': 'Clitus PC Portfolio'
            },
            body: JSON.stringify({
                model: 'openai/gpt-4.1-mini',
                messages: [
                    {
                        role: 'system',
                        content: `Bạn là AI Assistant trên portfolio của Clitus PC - Full Stack Developer tại TP.HCM, Việt Nam.
Thông tin:
- Chuyên môn: React, Vue.js, Node.js, Python, MongoDB, PostgreSQL, Firebase
- Kinh nghiệm: 10+ năm
- Email: infoclituspc@gmail.com | Phone: +84 906857331
- Dự án: E-Commerce (React/Node/MongoDB), Project Management (React Native/Firebase), Data Dashboard (Vue/Python)
- Giải thưởng: Hackathon Đồng Nai 2024, AI Agent SDLC 2025, Best Innovation 2024, Top 10 Global Dev 2025
Trả lời ngắn gọn, thân thiện, đúng ngôn ngữ người dùng (Việt/Anh). Tối đa 150 từ.`
                    },
                    { role: 'user', content: message.trim().slice(0, 500) }
                ],
                max_tokens: 800,
                temperature: 0.7
            })
        });
        const data = await response.json();
        console.log('OpenRouter status:', response.status);
        if (data.error) console.log('OpenRouter error:', JSON.stringify(data.error));
        const reply = data?.choices?.[0]?.message?.content || getFallbackReply(message);
        res.json({ reply });
    } catch (err) {
        console.error('OpenRouter error:', err.message);
        res.json({ reply: getFallbackReply(message) });
    }
});

function getFallbackReply(msg) {
    const lower = msg.toLowerCase();
    if (lower.includes('xin chào') || lower.includes('hello') || lower.includes('hi')) return 'Xin chào! 👋 Tôi là AI Assistant của Clitus PC. Tôi có thể giúp bạn tìm hiểu về kỹ năng, dự án, hoặc liên hệ với Clitus.';
    if (lower.includes('dự án') || lower.includes('project')) return 'Clitus đã xây dựng: E-Commerce (React/Node.js), Project Management (React Native), Data Dashboard (Vue.js/Python).';
    if (lower.includes('kỹ năng') || lower.includes('skill')) return 'Frontend 95%, Backend 90%, Database 85%, UI/UX 88%.';
    if (lower.includes('liên hệ') || lower.includes('contact')) return '📧 infoclituspc@gmail.com\n📞 +84 906857331';
    return 'Cảm ơn bạn! Tôi có thể giúp về kỹ năng, dự án, hoặc liên hệ với Clitus. 😊';
}

function requireAdmin(req, res, next) {
    const token = req.headers['x-admin-token'];
    if (!token || token !== process.env.ADMIN_PASSWORD) return res.status(401).json({ error: 'Unauthorized' });
    next();
}

// ========== BLOG ==========
function parsePost(p) {
    if (!p) return null;
    return { ...p, tags: JSON.parse(p.tags || '[]'), comments: [] };
}

app.get('/api/blog/posts', (req, res) => {
    const posts = all('SELECT id,title,slug,excerpt,cover,tags,views,likes,read_time,created_at FROM blog_posts WHERE published=1 ORDER BY created_at DESC');
    res.json(posts.map(parsePost));
});

app.get('/api/blog/posts/:slug', (req, res) => {
    const p = get('SELECT * FROM blog_posts WHERE (slug=? OR id=?) AND published=1', [req.params.slug, req.params.slug]);
    if (!p) return res.status(404).json({ error: 'Not found' });
    // Track view
    run('UPDATE blog_posts SET views=views+1 WHERE id=?', [p.id]);
    const comments = all('SELECT * FROM blog_comments WHERE post_id=? ORDER BY created_at DESC', [p.id]);
    const post = parsePost(p);
    post.comments = comments;
    res.json(post);
});

app.post('/api/blog/posts/:id/like', (req, res) => {
    const id = parseInt(req.params.id);
    const { action } = req.body;
    if (action === 'unlike') run('UPDATE blog_posts SET likes=MAX(0,likes-1) WHERE id=?', [id]);
    else run('UPDATE blog_posts SET likes=likes+1 WHERE id=?', [id]);
    const row = get('SELECT likes FROM blog_posts WHERE id=?', [id]);
    res.json({ likes: row?.likes || 0 });
});

app.post('/api/blog/posts/:id/comments', (req, res) => {
    const { name, text } = req.body;
    if (!name?.trim() || !text?.trim()) return res.status(400).json({ error: 'Thiếu thông tin' });
    run('INSERT INTO blog_comments (post_id, name, text) VALUES (?,?,?)', [
        parseInt(req.params.id), name.trim().slice(0,100), text.trim().slice(0,2000)
    ]);
    const c = get('SELECT * FROM blog_comments ORDER BY id DESC LIMIT 1');
    res.status(201).json(c);
});

// Admin: CRUD blog posts
app.get('/api/blog/admin/posts', requireAdmin, (req, res) => {
    res.json(all('SELECT * FROM blog_posts ORDER BY created_at DESC').map(parsePost));
});

app.post('/api/blog/posts', requireAdmin, (req, res) => {
    const { title, slug, excerpt, content, cover, tags, read_time, published } = req.body;
    if (!title?.trim() || !slug?.trim()) return res.status(400).json({ error: 'Thiếu title/slug' });
    run('INSERT INTO blog_posts (title,slug,excerpt,content,cover,tags,read_time,published) VALUES (?,?,?,?,?,?,?,?)', [
        title.trim(), slug.trim().toLowerCase().replace(/\s+/g,'-'),
        (excerpt||'').trim(), (content||'').trim(),
        (cover||'').trim(), JSON.stringify(tags||[]),
        parseInt(read_time)||5, published===false?0:1
    ]);
    const post = get('SELECT * FROM blog_posts ORDER BY id DESC LIMIT 1');
    res.status(201).json(parsePost(post));
});

app.put('/api/blog/posts/:id', requireAdmin, (req, res) => {
    const { title, slug, excerpt, content, cover, tags, read_time, published } = req.body;
    run('UPDATE blog_posts SET title=?,slug=?,excerpt=?,content=?,cover=?,tags=?,read_time=?,published=?,updated_at=datetime("now") WHERE id=?', [
        title, slug, excerpt||'', content||'', cover||'',
        JSON.stringify(tags||[]), parseInt(read_time)||5,
        published===false?0:1, parseInt(req.params.id)
    ]);
    res.json({ ok: true });
});

app.delete('/api/blog/posts/:id', requireAdmin, (req, res) => {
    const id = parseInt(req.params.id);
    run('DELETE FROM blog_posts WHERE id=?', [id]);
    run('DELETE FROM blog_comments WHERE post_id=?', [id]);
    res.json({ ok: true });
});

app.delete('/api/blog/comments/:id', requireAdmin, (req, res) => {
    run('DELETE FROM blog_comments WHERE id=?', [parseInt(req.params.id)]);
    res.json({ ok: true });
});

// ========== PUSH NOTIFICATIONS ==========
app.get('/api/push/vapid-public-key', (req, res) => {
    res.json({ publicKey: process.env.VAPID_PUBLIC_KEY || '' });
});

app.post('/api/push/subscribe', (req, res) => {
    const sub = req.body;
    if (!sub?.endpoint) return res.status(400).json({ error: 'Invalid subscription' });
    const existing = get('SELECT id FROM push_subscriptions WHERE endpoint = ?', [sub.endpoint]);
    if (!existing) {
        run('INSERT INTO push_subscriptions (endpoint, p256dh, auth) VALUES (?, ?, ?)', [
            sub.endpoint, sub.keys?.p256dh || '', sub.keys?.auth || ''
        ]);
    }
    res.status(201).json({ ok: true });
});

app.post('/api/push/send', requireAdmin, async (req, res) => {
    const { title, body, url } = req.body;
    const subs = all('SELECT * FROM push_subscriptions');
    const payload = JSON.stringify({ title: title || 'Clitus PC', body: body || 'Có thông báo mới!', icon: '/img/icon-192.png', url: url || '/' });
    const results = await Promise.allSettled(
        subs.map(s => webpush.sendNotification(
            { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, payload
        ).catch(err => { if (err.statusCode === 410) run('DELETE FROM push_subscriptions WHERE endpoint = ?', [s.endpoint]); throw err; }))
    );
    res.json({ sent: results.filter(r => r.status === 'fulfilled').length, total: subs.length });
});

app.get('/api/health', (req, res) => res.json({ status: 'ok', time: new Date().toISOString() }));

// ========== USER AUTH ==========
const crypto = require('crypto');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'clituspc_jwt_secret_2026';
const JWT_EXPIRES = '30d';

function hashPassword(pw) {
    return crypto.createHash('sha256').update(pw + 'clituspc_salt_2026').digest('hex');
}
function signJWT(payload) {
    return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES });
}
function verifyJWT(token) {
    try { return jwt.verify(token, JWT_SECRET); } catch { return null; }
}
function getAuthToken(req) {
    const auth = req.headers['authorization'];
    if (auth && auth.startsWith('Bearer ')) return auth.slice(7);
    // backward compat
    return req.headers['x-user-token'] || null;
}
function requireUser(req, res, next) {
    const token = getAuthToken(req);
    if (!token) return res.status(401).json({ error: 'Chưa đăng nhập' });
    const payload = verifyJWT(token);
    if (!payload) return res.status(401).json({ error: 'Phiên đăng nhập hết hạn' });
    const user = get('SELECT id,username,email,avatar,role FROM users WHERE id=?', [payload.id]);
    if (!user) return res.status(401).json({ error: 'Tài khoản không tồn tại' });
    req.userId = user.id;
    req.userRole = user.role;
    req.userEmail = user.email;
    next();
}
function requireVip(req, res, next) {
    if (req.userRole !== 'vip' && req.userRole !== 'admin') {
        return res.status(403).json({ error: 'Tính năng này chỉ dành cho VIP', upgradeUrl: '/payment.html' });
    }
    next();
}

app.post('/api/auth/register', (req, res) => {
    const { username, email, password } = req.body;
    if (!username?.trim() || !email?.trim() || !password?.trim())
        return res.status(400).json({ error: 'Vui lòng điền đầy đủ thông tin' });
    if (password.length < 6)
        return res.status(400).json({ error: 'Mật khẩu tối thiểu 6 ký tự' });
    const existing = get('SELECT id FROM users WHERE email=? OR username=?', [email.trim(), username.trim()]);
    if (existing) return res.status(409).json({ error: 'Email hoặc tên đăng nhập đã tồn tại' });
    run('INSERT INTO users (username, email, password_hash, role) VALUES (?,?,?,?)', [
        username.trim().slice(0,50), email.trim().slice(0,100), hashPassword(password), 'free'
    ]);
    const user = get('SELECT id,username,email,avatar,role,created_at FROM users ORDER BY id DESC LIMIT 1');
    const token = signJWT({ id: user.id, email: user.email, role: user.role });
    res.status(201).json({ user, token });
});

app.post('/api/auth/login', (req, res) => {
    const { email, password } = req.body;
    if (!email?.trim() || !password?.trim())
        return res.status(400).json({ error: 'Vui lòng nhập email và mật khẩu' });
    const user = get('SELECT * FROM users WHERE email=?', [email.trim()]);
    if (!user || user.password_hash !== hashPassword(password))
        return res.status(401).json({ error: 'Email hoặc mật khẩu không đúng' });
    const token = signJWT({ id: user.id, email: user.email, role: user.role });
    res.json({ user: { id:user.id, username:user.username, email:user.email, avatar:user.avatar, role:user.role, created_at:user.created_at }, token });
});

app.get('/api/auth/me', requireUser, (req, res) => {
    const user = get('SELECT id,username,email,avatar,role,created_at FROM users WHERE id=?', [req.userId]);
    if (!user) return res.status(404).json({ error: 'Không tìm thấy user' });
    res.json(user);
});

app.post('/api/auth/logout', (req, res) => {
    // JWT stateless — client xóa token
    res.json({ ok: true });
});

// ========== USER DASHBOARD ==========
app.get('/api/user/dashboard', requireUser, (req, res) => {
    const user = get('SELECT id,username,email,avatar,role,created_at FROM users WHERE id=?', [req.userId]);
    if (!user) return res.status(404).json({ error: 'Không tìm thấy user' });

    // Subscription
    const sub = get("SELECT * FROM subscriptions WHERE email=? AND status='active' AND expires_at > datetime('now') ORDER BY id DESC LIMIT 1", [user.email]);
    const isVip = !!sub || user.role === 'vip' || user.role === 'admin';

    // Usage hôm nay
    const today = new Date().toISOString().slice(0, 10);
    const usageRows = all('SELECT tool, count FROM user_usage WHERE user_id=? AND date=?', [req.userId, today]);
    const usage = {};
    usageRows.forEach(r => { usage[r.tool] = r.count; });

    // Tổng usage
    const totalRow = get('SELECT SUM(count) as total FROM user_usage WHERE user_id=?', [req.userId]);
    const totalUsage = totalRow?.total || 0;

    // AI history (20 gần nhất)
    const history = all('SELECT * FROM user_ai_history WHERE user_id=? ORDER BY id DESC LIMIT 20', [req.userId]);

    // Days left
    let daysLeft = null;
    if (sub?.expires_at) {
        daysLeft = Math.max(0, Math.ceil((new Date(sub.expires_at) - Date.now()) / 86400000));
    }

    // Coins
    const coinRow = get('SELECT coins, total_earned FROM user_coins WHERE user_id=?', [req.userId]);
    const coins = coinRow?.coins || 0;
    const totalEarned = coinRow?.total_earned || 0;

    // Daily reward status
    const today = new Date().toISOString().slice(0,10);
    const dailyClaimed = !!get('SELECT id FROM daily_rewards WHERE user_id=? AND claimed_date=?', [req.userId, today]);

    res.json({ user, isVip, subscription: sub || null, daysLeft, usage, totalUsage, history, coins, totalEarned, dailyClaimed });
});

// ========== USER USAGE ==========
app.get('/api/user/usage', requireUser, (req, res) => {
    const today = new Date().toISOString().slice(0, 10);
    const rows = all('SELECT tool, count FROM user_usage WHERE user_id=? AND date=?', [req.userId, today]);
    const usage = {};
    rows.forEach(r => { usage[r.tool] = r.count; });
    res.json({ usage, date: today });
});

// ========== AI HISTORY ==========
app.post('/api/user/ai-history', requireUser, (req, res) => {
    const { tool, input } = req.body;
    if (!tool) return res.status(400).json({ error: 'Thiếu tool' });
    run('INSERT INTO user_ai_history (user_id, tool, input) VALUES (?,?,?)', [
        req.userId, tool.slice(0,20), (input||'').slice(0,200)
    ]);
    // Giữ tối đa 100 records per user
    const oldest = all('SELECT id FROM user_ai_history WHERE user_id=? ORDER BY id DESC LIMIT -1 OFFSET 100', [req.userId]);
    if (oldest.length) {
        oldest.forEach(r => run('DELETE FROM user_ai_history WHERE id=?', [r.id]));
    }
    res.json({ ok: true });
});

app.delete('/api/user/ai-history', requireUser, (req, res) => {
    run('DELETE FROM user_ai_history WHERE user_id=?', [req.userId]);
    res.json({ ok: true });
});

// ========== SUBSCRIPTION UPGRADE/CANCEL ==========
app.post('/api/subscription/cancel', requireUser, (req, res) => {
    run("UPDATE subscriptions SET status='cancelled' WHERE email=? AND status='active'", [req.userEmail]);
    // Downgrade role nếu không còn sub active
    const activeSub = get("SELECT id FROM subscriptions WHERE email=? AND status='active' AND expires_at > datetime('now')", [req.userEmail]);
    if (!activeSub) run("UPDATE users SET role='free' WHERE id=?", [req.userId]);
    res.json({ ok: true, message: 'Đã hủy gói VIP' });
});

// ========== OAUTH — GOOGLE ==========
app.get('/api/auth/google', (req, res) => {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    if (!clientId) return res.status(503).json({ error: 'Google OAuth chưa được cấu hình' });
    const appUrl = process.env.APP_URL || `${req.protocol}://${req.get('host')}`;
    const redirect = encodeURIComponent(`${appUrl}/api/auth/google/callback`);
    const state = genToken().slice(0, 16);
    const url = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${redirect}&response_type=code&scope=openid%20email%20profile&state=${state}&prompt=select_account`;
    res.redirect(url);
});

app.get('/api/auth/google/callback', async (req, res) => {
    const { code } = req.query;
    const appUrl = process.env.APP_URL || `${req.protocol}://${req.get('host')}`;
    if (!code) return res.redirect(`${appUrl}/?auth_error=no_code`);
    try {
        // Exchange code for token
        const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                code, client_id: process.env.GOOGLE_CLIENT_ID,
                client_secret: process.env.GOOGLE_CLIENT_SECRET,
                redirect_uri: `${appUrl}/api/auth/google/callback`,
                grant_type: 'authorization_code'
            })
        });
        const tokenData = await tokenRes.json();
        if (!tokenData.access_token) throw new Error('No access token');

        // Get user info
        const userRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
            headers: { Authorization: `Bearer ${tokenData.access_token}` }
        });
        const profile = await userRes.json();

        const user = upsertOAuthUser({
            provider: 'google', providerId: profile.id,
            username: profile.name || profile.email.split('@')[0],
            email: profile.email, avatar: profile.picture || ''
        });
        const token = signJWT({ id: user.id, email: user.email, role: user.role || 'free' });
        res.redirect(`${appUrl}/?auth_token=${token}&auth_user=${encodeURIComponent(JSON.stringify({ id:user.id, username:user.username, email:user.email, avatar:user.avatar, role:user.role }))}`);
    } catch (err) {
        console.error('Google OAuth error:', err.message);
        res.redirect(`${appUrl}/?auth_error=${encodeURIComponent(err.message)}`);
    }
});

// ========== OAUTH — FACEBOOK ==========
app.get('/api/auth/facebook', (req, res) => {
    const appId = process.env.FACEBOOK_APP_ID;
    if (!appId) return res.status(503).json({ error: 'Facebook OAuth chưa được cấu hình' });
    const appUrl = process.env.APP_URL || `${req.protocol}://${req.get('host')}`;
    const redirect = encodeURIComponent(`${appUrl}/api/auth/facebook/callback`);
    const state = genToken().slice(0, 16);
    const url = `https://www.facebook.com/v19.0/dialog/oauth?client_id=${appId}&redirect_uri=${redirect}&state=${state}&scope=email,public_profile`;
    res.redirect(url);
});

app.get('/api/auth/facebook/callback', async (req, res) => {
    const { code } = req.query;
    const appUrl = process.env.APP_URL || `${req.protocol}://${req.get('host')}`;
    if (!code) return res.redirect(`${appUrl}/?auth_error=no_code`);
    try {
        const redirectUri = encodeURIComponent(`${appUrl}/api/auth/facebook/callback`);
        // Exchange code for token
        const tokenRes = await fetch(`https://graph.facebook.com/v19.0/oauth/access_token?client_id=${process.env.FACEBOOK_APP_ID}&redirect_uri=${redirectUri}&client_secret=${process.env.FACEBOOK_APP_SECRET}&code=${code}`);
        const tokenData = await tokenRes.json();
        if (!tokenData.access_token) throw new Error('No access token');

        // Get user info
        const userRes = await fetch(`https://graph.facebook.com/me?fields=id,name,email,picture.width(200)&access_token=${tokenData.access_token}`);
        const profile = await userRes.json();

        const user = upsertOAuthUser({
            provider: 'facebook', providerId: profile.id,
            username: profile.name || `fb_${profile.id}`,
            email: profile.email || `fb_${profile.id}@facebook.com`,
            avatar: profile.picture?.data?.url || ''
        });
        const token = signJWT({ id: user.id, email: user.email, role: user.role || 'free' });
        res.redirect(`${appUrl}/?auth_token=${token}&auth_user=${encodeURIComponent(JSON.stringify({ id:user.id, username:user.username, email:user.email, avatar:user.avatar, role:user.role }))}`);
    } catch (err) {
        console.error('Facebook OAuth error:', err.message);
        res.redirect(`${appUrl}/?auth_error=${encodeURIComponent(err.message)}`);
    }
});

function upsertOAuthUser({ provider, providerId, username, email, avatar }) {
    let user = get('SELECT * FROM users WHERE oauth_provider=? AND oauth_id=?', [provider, providerId]);
    if (!user) {
        user = get('SELECT * FROM users WHERE email=?', [email]);
        if (user) {
            run('UPDATE users SET oauth_provider=?, oauth_id=?, avatar=? WHERE id=?', [provider, providerId, avatar, user.id]);
        } else {
            let finalUsername = username.slice(0, 50);
            const dup = get('SELECT id FROM users WHERE username=?', [finalUsername]);
            if (dup) finalUsername = `${finalUsername}_${providerId.slice(-4)}`;
            run('INSERT INTO users (username, email, password_hash, oauth_provider, oauth_id, avatar, role) VALUES (?,?,?,?,?,?,?)',
                [finalUsername, email.slice(0,100), '', provider, providerId, avatar, 'free']);
            user = get('SELECT * FROM users ORDER BY id DESC LIMIT 1');
        }
    } else {
        run('UPDATE users SET avatar=? WHERE id=?', [avatar, user.id]);
    }
    return get('SELECT id,username,email,avatar,role,created_at FROM users WHERE id=?', [user.id]);
}

// Override comment endpoints để yêu cầu đăng nhập
app.post('/api/comments/auth', requireUser, (req, res) => {
    const { text, rating } = req.body;
    if (!text?.trim() || !rating) return res.status(400).json({ error: 'Thiếu thông tin.' });
    if (rating < 1 || rating > 5) return res.status(400).json({ error: 'Rating 1-5.' });
    const user = get('SELECT username,email FROM users WHERE id=?', [req.userId]);
    run('INSERT INTO comments (name, email, text, rating) VALUES (?, ?, ?, ?)', [
        user.username, user.email || '',
        text.trim().slice(0, 2000), parseInt(rating)
    ]);
    const comment = get('SELECT * FROM comments ORDER BY id DESC LIMIT 1');
    res.status(201).json(comment);
});

app.post('/api/blog/posts/:id/comments/auth', requireUser, (req, res) => {
    const { text } = req.body;
    if (!text?.trim()) return res.status(400).json({ error: 'Thiếu nội dung' });
    const user = get('SELECT username FROM users WHERE id=?', [req.userId]);
    run('INSERT INTO blog_comments (post_id, name, text) VALUES (?,?,?)', [
        parseInt(req.params.id), user.username, text.trim().slice(0,2000)
    ]);
    const c = get('SELECT * FROM blog_comments ORDER BY id DESC LIMIT 1');
    res.status(201).json(c);
});

// ========== INVOICE ==========
const { Resend } = require('resend');

function getResend() {
    return new Resend(process.env.RESEND_API_KEY);
}

function genInvoiceId() {
    const d = new Date();
    return `INV-${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}-${Math.floor(Math.random()*9000+1000)}`;
}

function buildInvoiceHTML(inv) {
    const rows = inv.items.map(it => `
        <tr>
          <td style="padding:12px 16px;border-bottom:1px solid #f0f0f0;">${it.name}</td>
          <td style="padding:12px 16px;border-bottom:1px solid #f0f0f0;text-align:center;">${it.qty||1}</td>
          <td style="padding:12px 16px;border-bottom:1px solid #f0f0f0;text-align:right;">${Number(it.price).toLocaleString('vi-VN')} VNĐ</td>
          <td style="padding:12px 16px;border-bottom:1px solid #f0f0f0;text-align:right;font-weight:700;">${Number((it.qty||1)*it.price).toLocaleString('vi-VN')} VNĐ</td>
        </tr>`).join('');
    const total = inv.items.reduce((s,i)=>s+(i.qty||1)*i.price,0);
    return `<!DOCTYPE html><html><head><meta charset="UTF-8"></head><body style="margin:0;padding:0;background:#f4f6ff;font-family:'Segoe UI',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6ff;padding:40px 20px;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:20px;overflow:hidden;box-shadow:0 8px 40px rgba(0,0,0,0.1);">
  <!-- Header -->
  <tr><td style="background:linear-gradient(135deg,#667eea,#764ba2);padding:40px;text-align:center;">
    <div style="font-size:28px;font-weight:900;color:#fff;letter-spacing:-0.5px;">Clitus PC</div>
    <div style="color:rgba(255,255,255,0.75);font-size:13px;margin-top:4px;">Full Stack Developer · TP.HCM</div>
    <div style="background:rgba(255,255,255,0.15);border-radius:50px;display:inline-block;padding:6px 20px;margin-top:16px;color:#fff;font-size:13px;font-weight:700;">HÓA ĐƠN THANH TOÁN</div>
  </td></tr>
  <!-- Invoice Info -->
  <tr><td style="padding:32px 40px 0;">
    <table width="100%"><tr>
      <td><div style="font-size:12px;color:#999;text-transform:uppercase;letter-spacing:0.08em;">Số hóa đơn</div><div style="font-size:16px;font-weight:800;color:#667eea;margin-top:4px;">${inv.invoiceId}</div></td>
      <td align="right"><div style="font-size:12px;color:#999;text-transform:uppercase;letter-spacing:0.08em;">Ngày phát hành</div><div style="font-size:14px;font-weight:700;color:#1a1a2e;margin-top:4px;">${new Date().toLocaleDateString('vi-VN')}</div></td>
    </tr></table>
  </td></tr>
  <!-- Client Info -->
  <tr><td style="padding:24px 40px 0;">
    <table width="100%"><tr>
      <td style="background:#f8f9ff;border-radius:12px;padding:20px;" width="48%">
        <div style="font-size:11px;color:#999;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:8px;">Từ</div>
        <div style="font-weight:800;color:#1a1a2e;">Clitus PC</div>
        <div style="font-size:13px;color:#666;margin-top:4px;">infoclituspc@gmail.com</div>
        <div style="font-size:13px;color:#666;">+84 906857331</div>
        <div style="font-size:13px;color:#666;">TP.HCM, Việt Nam</div>
      </td>
      <td width="4%"></td>
      <td style="background:#f8f9ff;border-radius:12px;padding:20px;" width="48%">
        <div style="font-size:11px;color:#999;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:8px;">Gửi đến</div>
        <div style="font-weight:800;color:#1a1a2e;">${inv.clientName}</div>
        <div style="font-size:13px;color:#666;margin-top:4px;">${inv.clientEmail}</div>
        ${inv.clientPhone ? `<div style="font-size:13px;color:#666;">${inv.clientPhone}</div>` : ''}
      </td>
    </tr></table>
  </td></tr>
  <!-- Items Table -->
  <tr><td style="padding:24px 40px 0;">
    <table width="100%" style="border-collapse:collapse;">
      <thead><tr style="background:#f8f9ff;">
        <th style="padding:12px 16px;text-align:left;font-size:11px;color:#999;text-transform:uppercase;letter-spacing:0.08em;">Dịch vụ / Sản phẩm</th>
        <th style="padding:12px 16px;text-align:center;font-size:11px;color:#999;text-transform:uppercase;letter-spacing:0.08em;">SL</th>
        <th style="padding:12px 16px;text-align:right;font-size:11px;color:#999;text-transform:uppercase;letter-spacing:0.08em;">Đơn giá</th>
        <th style="padding:12px 16px;text-align:right;font-size:11px;color:#999;text-transform:uppercase;letter-spacing:0.08em;">Thành tiền</th>
      </tr></thead>
      <tbody>${rows}</tbody>
    </table>
  </td></tr>
  <!-- Total -->
  <tr><td style="padding:16px 40px 0;">
    <table width="100%"><tr>
      <td></td>
      <td width="260" style="background:linear-gradient(135deg,rgba(102,126,234,0.08),rgba(118,75,162,0.08));border-radius:12px;padding:20px;">
        <div style="display:flex;justify-content:space-between;font-size:13px;color:#666;margin-bottom:8px;"><span>Tạm tính</span><span>${Number(total).toLocaleString('vi-VN')} VNĐ</span></div>
        <div style="display:flex;justify-content:space-between;font-size:13px;color:#666;margin-bottom:12px;padding-bottom:12px;border-bottom:1px solid rgba(102,126,234,0.2);"><span>Thuế (0%)</span><span>0 VNĐ</span></div>
        <div style="display:flex;justify-content:space-between;font-size:18px;font-weight:900;color:#667eea;"><span>Tổng cộng</span><span>${Number(total).toLocaleString('vi-VN')} VNĐ</span></div>
      </td>
    </tr></table>
  </td></tr>
  <!-- Status -->
  <tr><td style="padding:24px 40px 0;text-align:center;">
    <div style="display:inline-flex;align-items:center;gap:8px;background:#d1fae5;border-radius:50px;padding:10px 24px;">
      <span style="color:#059669;font-size:16px;">✓</span>
      <span style="color:#059669;font-weight:800;font-size:14px;">ĐÃ THANH TOÁN</span>
    </div>
    ${inv.note ? `<div style="margin-top:16px;font-size:13px;color:#666;background:#f8f9ff;border-radius:10px;padding:12px 20px;">${inv.note}</div>` : ''}
  </td></tr>
  <!-- Footer -->
  <tr><td style="padding:32px 40px;text-align:center;border-top:1px solid #f0f0f0;margin-top:24px;">
    <div style="font-size:12px;color:#999;">Cảm ơn bạn đã tin tưởng sử dụng dịch vụ của Clitus PC 🙏</div>
    <div style="font-size:12px;color:#bbb;margin-top:8px;">portfolio-utbu.onrender.com · infoclituspc@gmail.com</div>
  </td></tr>
</table>
</td></tr></table>
</body></html>`;
}

app.post('/api/invoice/create', async (req, res) => {
    const { clientName, clientEmail, clientPhone, items, note } = req.body;
    if (!clientName?.trim() || !clientEmail?.trim() || !items?.length)
        return res.status(400).json({ error: 'Thiếu thông tin hóa đơn' });

    const invoiceId = genInvoiceId();
    const inv = { invoiceId, clientName, clientEmail, clientPhone, items, note };
    const html = buildInvoiceHTML(inv);

    // Lưu vào DB
    const total = items.reduce((s,i)=>s+(i.qty||1)*i.price, 0);
    run('INSERT INTO invoices (invoice_id, client_name, client_email, client_phone, items_json, total, note) VALUES (?,?,?,?,?,?,?)', [
        invoiceId, clientName.trim(), clientEmail.trim(), clientPhone||'',
        JSON.stringify(items), total, note||''
    ]);

    // Gửi email nếu có cấu hình
    let emailSent = false;
    if (process.env.RESEND_API_KEY) {
        try {
            const resend = getResend();
            await resend.emails.send({
                from: 'Clitus PC <onboarding@resend.dev>',
                to: [clientEmail.trim()],
                cc: [process.env.RESEND_FROM_EMAIL || 'infoclituspc@gmail.com'],
                subject: `🧾 Hóa đơn ${invoiceId} - Clitus PC`,
                html
            });
            emailSent = true;
        } catch(e) {
            console.error('Resend error:', e.message);
        }
    }

    const invoice = get('SELECT * FROM invoices WHERE invoice_id=?', [invoiceId]);
    res.status(201).json({ ok: true, invoiceId, emailSent, invoice });
});

app.get('/api/invoice/:id', (req, res) => {
    const inv = get('SELECT * FROM invoices WHERE invoice_id=?', [req.params.id]);
    if (!inv) return res.status(404).json({ error: 'Không tìm thấy hóa đơn' });
    res.json({ ...inv, items: JSON.parse(inv.items_json||'[]') });
});

app.get('/api/invoice/admin/list', requireAdmin, (req, res) => {
    res.json(all('SELECT * FROM invoices ORDER BY created_at DESC'));
});

// ========== SUBSCRIPTION ==========

// Đăng ký gói VIP — user tự submit, chờ admin duyệt
app.post('/api/subscription/register', (req, res) => {
    const { name, email, transferRef } = req.body;
    if (!name?.trim() || !email?.trim()) return res.status(400).json({ error: 'Thiếu thông tin' });
    // Kiểm tra đã có sub active chưa
    const existing = get("SELECT * FROM subscriptions WHERE email=? AND status='active' AND expires_at > datetime('now')", [email.trim()]);
    if (existing) return res.status(409).json({ error: 'Email này đã có gói VIP đang hoạt động', subscription: existing });
    run('INSERT INTO subscriptions (email, name, plan, price, status, transfer_ref) VALUES (?,?,?,?,?,?)', [
        email.trim().slice(0,100), name.trim().slice(0,100), 'vip', 99000, 'pending', (transferRef||'').trim().slice(0,100)
    ]);
    const sub = get('SELECT * FROM subscriptions ORDER BY id DESC LIMIT 1');
    res.status(201).json({ ok: true, message: 'Đăng ký thành công! Vui lòng chờ admin xác nhận (thường trong 1-2 giờ).', subscription: sub });
});

// Kiểm tra trạng thái sub theo email
app.get('/api/subscription/check', (req, res) => {
    const { email } = req.query;
    if (!email) return res.status(400).json({ error: 'Thiếu email' });
    const sub = get("SELECT id,email,name,plan,status,expires_at,activated_at,created_at FROM subscriptions WHERE email=? ORDER BY id DESC LIMIT 1", [email.trim()]);
    if (!sub) return res.json({ hasSubscription: false });
    const isActive = sub.status === 'active' && sub.expires_at && new Date(sub.expires_at) > new Date();
    res.json({ hasSubscription: isActive, subscription: sub });
});

// Admin: lấy danh sách subscriptions
app.get('/api/subscription/admin/list', requireAdmin, (req, res) => {
    res.json(all('SELECT * FROM subscriptions ORDER BY created_at DESC'));
});

// Admin: duyệt subscription (kích hoạt 30 ngày)
app.post('/api/subscription/admin/activate/:id', requireAdmin, (req, res) => {
    const id = parseInt(req.params.id);
    const sub = get('SELECT * FROM subscriptions WHERE id=?', [id]);
    if (!sub) return res.status(404).json({ error: 'Không tìm thấy' });
    run("UPDATE subscriptions SET status='active', activated_at=datetime('now'), expires_at=datetime('now','+30 days') WHERE id=?", [id]);
    // Cập nhật role user thành vip
    run("UPDATE users SET role='vip' WHERE email=?", [sub.email]);
    const updated = get('SELECT * FROM subscriptions WHERE id=?', [id]);
    // Gửi email thông báo nếu có Resend
    if (process.env.RESEND_API_KEY) {
        try {
            const resend = getResend();
            resend.emails.send({
                from: 'Clitus PC <onboarding@resend.dev>',
                to: [sub.email],
                subject: '🎉 Gói VIP của bạn đã được kích hoạt!',
                html: `<div style="font-family:sans-serif;max-width:500px;margin:0 auto;padding:40px 20px;background:#f4f6ff;">
                  <div style="background:linear-gradient(135deg,#667eea,#764ba2);border-radius:20px;padding:40px;text-align:center;color:#fff;">
                    <div style="font-size:3rem;margin-bottom:1rem;">👑</div>
                    <h1 style="margin:0 0 0.5rem;font-size:1.5rem;">Chào mừng VIP Member!</h1>
                    <p style="opacity:0.85;margin:0;">Gói VIP của bạn đã được kích hoạt thành công</p>
                  </div>
                  <div style="background:#fff;border-radius:16px;padding:24px;margin-top:16px;">
                    <p>Xin chào <strong>${sub.name}</strong>,</p>
                    <p>Gói VIP <strong>99.000 VNĐ/tháng</strong> của bạn đã được kích hoạt. Bạn có thể:</p>
                    <ul style="line-height:2;">
                      <li>✅ Xem toàn bộ source code các dự án</li>
                      <li>✅ Tải source code không giới hạn</li>
                      <li>✅ Truy cập nội dung VIP độc quyền</li>
                    </ul>
                    <p style="color:#667eea;font-weight:700;">Hiệu lực: 30 ngày kể từ hôm nay</p>
                    <a href="https://portfolio-utbu.onrender.com/payment.html" style="display:inline-block;background:linear-gradient(135deg,#667eea,#764ba2);color:#fff;padding:12px 28px;border-radius:50px;text-decoration:none;font-weight:700;margin-top:8px;">Truy cập ngay →</a>
                  </div>
                </div>`
            });
        } catch(e) { console.error('Email error:', e.message); }
    }
    res.json({ ok: true, subscription: updated });
});

// Admin: từ chối subscription
app.post('/api/subscription/admin/reject/:id', requireAdmin, (req, res) => {
    const id = parseInt(req.params.id);
    run("UPDATE subscriptions SET status='rejected' WHERE id=?", [id]);
    res.json({ ok: true });
});

// Admin: xóa subscription
app.delete('/api/subscription/admin/:id', requireAdmin, (req, res) => {
    run('DELETE FROM subscriptions WHERE id=?', [parseInt(req.params.id)]);
    res.json({ ok: true });
});

// Admin: set role user
app.post('/api/admin/users/:id/role', requireAdmin, (req, res) => {
    const { role } = req.body;
    if (!['free','vip','admin'].includes(role)) return res.status(400).json({ error: 'Role không hợp lệ' });
    run('UPDATE users SET role=? WHERE id=?', [role, parseInt(req.params.id)]);
    res.json({ ok: true });
});

// Admin: list users
app.get('/api/admin/users', requireAdmin, (req, res) => {
    res.json(all('SELECT id,username,email,avatar,role,created_at FROM users ORDER BY id DESC'));
});

// ========== AI TOOLS — Code Review & CV Generator ==========
const aiToolsLimiter = rateLimit({ windowMs: 24 * 60 * 60 * 1000, max: 3, keyGenerator: (req) => req.ip + '_tools', message: { error: 'Hết lượt miễn phí hôm nay (3 lần). Nâng cấp VIP để dùng không giới hạn.' } });

async function callOpenRouter(messages, maxTokens = 1500) {
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) throw new Error('API key chưa cấu hình');
    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}`, 'HTTP-Referer': 'https://portfolio-utbu.onrender.com', 'X-Title': 'Clitus PC Tools' },
        body: JSON.stringify({ model: 'openai/gpt-4.1-mini', messages, max_tokens: maxTokens, temperature: 0.7 })
    });
    const data = await res.json();
    if (data.error) throw new Error(data.error.message || 'AI error');
    return data?.choices?.[0]?.message?.content || '';
}

function checkVIP(userId) {
    const user = get('SELECT role,email FROM users WHERE id=?', [userId]);
    if (!user) return false;
    if (user.role === 'vip' || user.role === 'admin') return true;
    const sub = get("SELECT id FROM subscriptions WHERE email=? AND status='active' AND expires_at > datetime('now')", [user.email]);
    return !!sub;
}

function getToolUsage(userId, tool) {
    const today = new Date().toISOString().slice(0, 10);
    const row = get('SELECT count FROM user_usage WHERE user_id=? AND tool=? AND date=?', [userId, tool, today]);
    return row?.count || 0;
}

function incToolUsage(userId, tool) {
    const today = new Date().toISOString().slice(0, 10);
    const existing = get('SELECT id FROM user_usage WHERE user_id=? AND tool=? AND date=?', [userId, tool, today]);
    if (existing) run('UPDATE user_usage SET count=count+1 WHERE user_id=? AND tool=? AND date=?', [userId, tool, today]);
    else run('INSERT INTO user_usage (user_id, tool, date, count) VALUES (?,?,?,1)', [userId, tool, today]);
}

function saveAiHistory(userId, tool, input) {
    run('INSERT INTO user_ai_history (user_id, tool, input) VALUES (?,?,?)', [userId, tool, (input||'').slice(0,200)]);
}

// AI Code Review
app.post('/api/tools/code-review', async (req, res) => {
    const { code, language } = req.body;
    if (!code?.trim()) return res.status(400).json({ error: 'Thiếu code' });

    const token = getAuthToken(req);
    if (!token) return res.status(401).json({ error: 'Vui lòng đăng nhập để sử dụng AI Tools' });
    const payload = verifyJWT(token);
    if (!payload) return res.status(401).json({ error: 'Phiên đăng nhập hết hạn, vui lòng đăng nhập lại' });

    const isVip = checkVIP(payload.id);
    if (!isVip) {
        const count = getToolUsage(payload.id, 'cr');
        if (count >= 3) return res.status(429).json({ error: 'Hết lượt miễn phí hôm nay (3 lần). Nâng cấp VIP để dùng không giới hạn.', upgradeUrl: '/payment.html' });
    }
    try {
        const result = await callOpenRouter([
            { role: 'system', content: `Bạn là senior code reviewer chuyên nghiệp. Phân tích code và trả về JSON với format:\n{"score":85,"summary":"...","issues":[{"severity":"high|medium|low","line":"...","issue":"...","fix":"..."}],"strengths":["..."],"suggestions":["..."]}` },
            { role: 'user', content: `Language: ${language || 'auto-detect'}\n\nCode:\n\`\`\`\n${code.slice(0, 3000)}\n\`\`\`` }
        ], 1500);
        if (!isVip) incToolUsage(payload.id, 'cr');
        saveAiHistory(payload.id, 'cr', code.slice(0, 80));
        const jsonMatch = result.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            res.json({ ok: true, result: JSON.parse(jsonMatch[0]), isVip });
        } else {
            res.json({ ok: true, result: { score: 0, summary: result, issues: [], strengths: [], suggestions: [] }, isVip });
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// AI CV Generator
app.post('/api/tools/cv-generate', async (req, res) => {
    const { name, title, email: userEmail, phone, summary, skills, experience, education, language } = req.body;
    if (!name?.trim()) return res.status(400).json({ error: 'Thiếu tên' });

    const token = getAuthToken(req);
    if (!token) return res.status(401).json({ error: 'Vui lòng đăng nhập để sử dụng AI Tools' });
    const payload = verifyJWT(token);
    if (!payload) return res.status(401).json({ error: 'Phiên đăng nhập hết hạn, vui lòng đăng nhập lại' });

    const isVip = checkVIP(payload.id);
    if (!isVip) {
        const count = getToolUsage(payload.id, 'cv');
        if (count >= 3) return res.status(429).json({ error: 'Hết lượt miễn phí hôm nay (3 lần). Nâng cấp VIP để dùng không giới hạn.', upgradeUrl: '/payment.html' });
    }
    try {
        const lang = language === 'en' ? 'English' : 'Vietnamese';
        const result = await callOpenRouter([
            { role: 'system', content: `Bạn là chuyên gia viết CV chuyên nghiệp. Tạo CV hoàn chỉnh bằng ${lang} dựa trên thông tin được cung cấp. Trả về HTML đẹp, sẵn sàng in, với inline CSS. Dùng màu #667eea cho accent. Không dùng external CSS.` },
            { role: 'user', content: `Tên: ${name}\nChức danh: ${title || ''}\nEmail: ${userEmail || ''}\nPhone: ${phone || ''}\nTóm tắt: ${summary || ''}\nKỹ năng: ${skills || ''}\nKinh nghiệm: ${experience || ''}\nHọc vấn: ${education || ''}` }
        ], 2000);
        if (!isVip) incToolUsage(payload.id, 'cv');
        saveAiHistory(payload.id, 'cv', name);
        res.json({ ok: true, html: result, isVip });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ========== AI TOOLS — Homework / Fix Code / Video Script ==========

// AI Giải Bài Tập (không cần đăng nhập, rate limit 3/ngày theo IP)
app.post('/api/tools/homework', async (req, res) => {
    const { question, subject } = req.body;
    if (!question?.trim()) return res.status(400).json({ error: 'Thiếu câu hỏi' });
    const subjectMap = { math:'Toán học', physics:'Vật lý', chemistry:'Hóa học', literature:'Ngữ văn', english:'Tiếng Anh', biology:'Sinh học', history:'Lịch sử' };
    const subjectName = subjectMap[subject] || subject || 'Tổng hợp';
    try {
        const answer = await callOpenRouter([
            { role: 'system', content: `Bạn là gia sư giỏi môn ${subjectName} cấp THCS và THPT tại Việt Nam. Giải bài tập chi tiết, từng bước rõ ràng, dễ hiểu. Dùng tiếng Việt. Nếu là Toán/Lý/Hóa thì trình bày công thức và các bước giải. Nếu là Văn thì phân tích sâu sắc.` },
            { role: 'user', content: question.trim().slice(0, 2000) }
        ], 1500);
        res.json({ ok: true, answer });
    } catch(err) {
        res.status(500).json({ error: err.message });
    }
});

// AI Fix Code (không cần đăng nhập)
app.post('/api/tools/fix-code', async (req, res) => {
    const { code, error: errMsg, language } = req.body;
    if (!code?.trim()) return res.status(400).json({ error: 'Thiếu code' });
    try {
        const result = await callOpenRouter([
            { role: 'system', content: `Bạn là senior developer chuyên fix bug. Phân tích code ${language || ''}, tìm lỗi và đưa ra:\n1. Giải thích lỗi\n2. Code đã sửa (đầy đủ)\n3. Giải thích cách sửa\nDùng tiếng Việt, trình bày rõ ràng.` },
            { role: 'user', content: `Code:\n\`\`\`${language || ''}\n${code.trim().slice(0, 3000)}\n\`\`\`${errMsg ? '\n\nThông báo lỗi: ' + errMsg : ''}` }
        ], 1500);
        res.json({ ok: true, result });
    } catch(err) {
        res.status(500).json({ error: err.message });
    }
});

// AI Video Script (không cần đăng nhập)
app.post('/api/tools/video-script', async (req, res) => {
    const { topic, type } = req.body;
    if (!topic?.trim()) return res.status(400).json({ error: 'Thiếu chủ đề' });
    const typeMap = { youtube:'YouTube Video', tiktok:'TikTok/Reels ngắn', intro:'Intro/Outro', ads:'Video Quảng Cáo', tutorial:'Tutorial hướng dẫn', vlog:'Vlog cá nhân' };
    const typeName = typeMap[type] || type || 'YouTube';
    try {
        const script = await callOpenRouter([
            { role: 'system', content: `Bạn là chuyên gia sản xuất nội dung video ${typeName}. Tạo kịch bản chi tiết gồm: Hook mở đầu, nội dung chính (từng cảnh/phân đoạn), CTA kết thúc. Thêm gợi ý hình ảnh/âm thanh cho từng đoạn. Dùng tiếng Việt, phong cách phù hợp với ${typeName}.` },
            { role: 'user', content: topic.trim().slice(0, 1000) }
        ], 1500);
        res.json({ ok: true, script });
    } catch(err) {
        res.status(500).json({ error: err.message });
    }
});

// ========== USER PROFILE UPDATE ==========
app.put('/api/auth/profile', requireUser, (req, res) => {
    const { nickname, avatar } = req.body;
    const updates = [];
    const params = [];
    if (nickname !== undefined) {
        const n = nickname.trim().slice(0, 50);
        if (!n) return res.status(400).json({ error: 'Biệt danh không được để trống' });
        updates.push('username=?'); params.push(n);
    }
    if (avatar !== undefined) {
        updates.push('avatar=?'); params.push(avatar.trim().slice(0, 500));
    }
    if (!updates.length) return res.status(400).json({ error: 'Không có gì để cập nhật' });
    params.push(req.userId);
    run(`UPDATE users SET ${updates.join(',')} WHERE id=?`, params);
    const user = get('SELECT id,username,email,avatar,role,created_at FROM users WHERE id=?', [req.userId]);
    res.json({ ok: true, user });
});

// ========== COIN SYSTEM ==========

function getCoins(userId) {
    const row = get('SELECT coins FROM user_coins WHERE user_id=?', [userId]);
    return row?.coins || 0;
}
function addCoins(userId, amount, type, note) {
    const existing = get('SELECT user_id FROM user_coins WHERE user_id=?', [userId]);
    if (existing) {
        run('UPDATE user_coins SET coins=coins+?, total_earned=total_earned+?, updated_at=datetime("now") WHERE user_id=?',
            [amount, Math.max(0,amount), userId]);
    } else {
        run('INSERT INTO user_coins (user_id, coins, total_earned) VALUES (?,?,?)',
            [userId, Math.max(0,amount), Math.max(0,amount)]);
    }
    run('INSERT INTO coin_transactions (user_id, amount, type, note) VALUES (?,?,?,?)',
        [userId, amount, type, note||'']);
}
function spendCoins(userId, amount, note) {
    const coins = getCoins(userId);
    if (coins < amount) return false;
    run('UPDATE user_coins SET coins=coins-?, updated_at=datetime("now") WHERE user_id=?', [amount, userId]);
    run('INSERT INTO coin_transactions (user_id, amount, type, note) VALUES (?,?,?,?)',
        [userId, -amount, 'spend', note||'']);
    return true;
}

// GET coins balance
app.get('/api/coins/balance', requireUser, (req, res) => {
    const row = get('SELECT coins, total_earned FROM user_coins WHERE user_id=?', [req.userId]);
    res.json({ coins: row?.coins || 0, totalEarned: row?.total_earned || 0 });
});

// GET coin transactions
app.get('/api/coins/history', requireUser, (req, res) => {
    const rows = all('SELECT * FROM coin_transactions WHERE user_id=? ORDER BY id DESC LIMIT 30', [req.userId]);
    res.json(rows);
});

// POST spend coins for AI tool
app.post('/api/coins/spend', requireUser, (req, res) => {
    const { amount, tool } = req.body;
    const cost = parseInt(amount) || 10;
    const ok = spendCoins(req.userId, cost, `AI Tool: ${tool||'unknown'}`);
    if (!ok) return res.status(400).json({ error: 'Không đủ coin', coins: getCoins(req.userId) });
    res.json({ ok: true, coins: getCoins(req.userId) });
});

// ========== DAILY REWARD ==========
const STREAK_REWARDS = [10, 15, 20, 25, 30, 40, 50]; // ngày 1-7+

app.get('/api/daily-reward/status', requireUser, (req, res) => {
    const today = new Date().toISOString().slice(0,10);
    const claimed = get('SELECT * FROM daily_rewards WHERE user_id=? AND claimed_date=?', [req.userId, today]);
    // Tính streak
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0,10);
    const lastReward = get('SELECT * FROM daily_rewards WHERE user_id=? ORDER BY id DESC LIMIT 1', [req.userId]);
    let streak = 1;
    if (lastReward) {
        if (lastReward.claimed_date === yesterday) streak = (lastReward.streak || 1) + 1;
        else if (lastReward.claimed_date === today) streak = lastReward.streak;
        else streak = 1; // reset streak
    }
    const coinsToEarn = STREAK_REWARDS[Math.min(streak-1, STREAK_REWARDS.length-1)];
    res.json({ claimed: !!claimed, streak, coinsToEarn, coins: getCoins(req.userId) });
});

app.post('/api/daily-reward/claim', requireUser, (req, res) => {
    const today = new Date().toISOString().slice(0,10);
    const already = get('SELECT id FROM daily_rewards WHERE user_id=? AND claimed_date=?', [req.userId, today]);
    if (already) return res.status(409).json({ error: 'Đã nhận thưởng hôm nay rồi!' });

    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0,10);
    const lastReward = get('SELECT * FROM daily_rewards WHERE user_id=? ORDER BY id DESC LIMIT 1', [req.userId]);
    let streak = 1;
    if (lastReward && lastReward.claimed_date === yesterday) streak = (lastReward.streak || 1) + 1;

    const coins = STREAK_REWARDS[Math.min(streak-1, STREAK_REWARDS.length-1)];
    run('INSERT INTO daily_rewards (user_id, streak, coins_earned, claimed_date) VALUES (?,?,?,?)',
        [req.userId, streak, coins, today]);
    addCoins(req.userId, coins, 'daily_reward', `Điểm danh ngày ${streak}`);
    res.json({ ok: true, streak, coinsEarned: coins, coins: getCoins(req.userId) });
});

// ========== GAME SCORES ==========
const GAME_COIN_RATES = { snake: 0.05, clicker: 0.02 }; // coins per point
const GAME_MAX_COINS = { snake: 50, clicker: 30 }; // max coins per session

app.post('/api/game/score', requireUser, (req, res) => {
    const { game, score } = req.body;
    if (!game || !score) return res.status(400).json({ error: 'Thiếu thông tin' });
    const rate = GAME_COIN_RATES[game] || 0.01;
    const maxCoins = GAME_MAX_COINS[game] || 20;
    const coinsEarned = Math.min(maxCoins, Math.floor(score * rate));

    run('INSERT INTO game_scores (user_id, game, score, coins_earned) VALUES (?,?,?,?)',
        [req.userId, game, score, coinsEarned]);
    if (coinsEarned > 0) addCoins(req.userId, coinsEarned, 'game', `${game} score ${score}`);

    // Leaderboard top 10
    const leaderboard = all(`SELECT u.username, gs.score, gs.played_at
        FROM game_scores gs JOIN users u ON u.id=gs.user_id
        WHERE gs.game=? ORDER BY gs.score DESC LIMIT 10`, [game]);

    res.json({ ok: true, coinsEarned, coins: getCoins(req.userId), leaderboard });
});

app.get('/api/game/leaderboard/:game', (req, res) => {
    const rows = all(`SELECT u.username, MAX(gs.score) as score, u.avatar
        FROM game_scores gs JOIN users u ON u.id=gs.user_id
        WHERE gs.game=? GROUP BY gs.user_id ORDER BY score DESC LIMIT 10`, [req.params.game]);
    res.json(rows);
});

// Serve index.html cho tất cả các route không phải API
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'index.html'));
});

// Khởi động: init DB trước rồi mới listen
getDb().then(() => {
    app.listen(PORT, () => {
        console.log(`✅ Backend chạy tại http://localhost:${PORT}`);
        console.log(`🤖 AI Chat: ${process.env.OPENROUTER_API_KEY ? 'OpenRouter đã kết nối' : 'Fallback mode'}`);

        // ===== KEEP-ALIVE: tự ping mỗi 10 phút để Render không sleep =====
        const RENDER_URL = process.env.RENDER_EXTERNAL_URL || `http://localhost:${PORT}`;
        if (process.env.NODE_ENV !== 'development') {
            setInterval(async () => {
                try {
                    const https = require('https');
                    const http = require('http');
                    const url = new URL(RENDER_URL + '/api/health');
                    const client = url.protocol === 'https:' ? https : http;
                    client.get(url.toString(), (res) => {
                        console.log(`🏓 Keep-alive ping: ${res.statusCode}`);
                    }).on('error', () => {});
                } catch(e) {}
            }, 10 * 60 * 1000); // 10 phút
        }
    });
}).catch(err => {
    console.error('❌ Lỗi khởi động DB:', err);
    process.exit(1);
});
