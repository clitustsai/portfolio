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
    extensions: ['html'],
    setHeaders: (res, filePath) => {
        if (filePath.match(/\.(css|js|woff2?|ttf|eot|svg|png|jpg|jpeg|gif|ico|webp)$/)) {
            res.setHeader('Cache-Control', 'public, max-age=86400'); // 1 day
        }
        if (filePath.endsWith('.html')) {
            res.setHeader('Cache-Control', 'no-cache');
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

app.post('/api/blog/posts', requireAdmin, async (req, res) => {
    const { title, slug, excerpt, content, cover, tags, read_time, published } = req.body;
    if (!title?.trim() || !slug?.trim()) return res.status(400).json({ error: 'Thiếu title/slug' });
    run('INSERT INTO blog_posts (title,slug,excerpt,content,cover,tags,read_time,published) VALUES (?,?,?,?,?,?,?,?)', [
        title.trim(), slug.trim().toLowerCase().replace(/\s+/g,'-'),
        (excerpt||'').trim(), (content||'').trim(),
        (cover||'').trim(), JSON.stringify(tags||[]),
        parseInt(read_time)||5, published===false?0:1
    ]);
    const post = get('SELECT * FROM blog_posts ORDER BY id DESC LIMIT 1');

    // Auto-send push notification khi bài được publish
    if (published !== false && process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
        const subs = all('SELECT * FROM push_subscriptions');
        if (subs.length > 0) {
            const appUrl = process.env.APP_URL || 'https://portfolio-utbu.onrender.com';
            const payload = JSON.stringify({
                title: '📝 Bài viết mới!',
                body: title.trim().slice(0, 80),
                icon: '/img/icon-192.png',
                url: `${appUrl}/blog-post.html?slug=${post.slug}`
            });
            Promise.allSettled(subs.map(s =>
                webpush.sendNotification(
                    { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, payload
                ).catch(err => {
                    if (err.statusCode === 410) run('DELETE FROM push_subscriptions WHERE endpoint=?', [s.endpoint]);
                })
            )).then(results => {
                const sent = results.filter(r => r.status === 'fulfilled').length;
                console.log(`📬 Push sent to ${sent}/${subs.length} subscribers`);
            });
        }
    }

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

// ========== LIVE ACTIVITY ==========
// In-memory store — reset khi server restart (OK cho Render free tier)
const liveStore = {
    heartbeats: new Map(), // sessionId -> { page, ts }
    recentEvents: [],      // [{type, msg, ts}] — max 20
};

// Ping từ client mỗi 30s
app.post('/api/live/ping', (req, res) => {
    const { sessionId, page } = req.body;
    if (!sessionId) return res.status(400).json({ error: 'missing sessionId' });
    liveStore.heartbeats.set(sessionId, { page: page || '/', ts: Date.now() });
    res.json({ ok: true });
});

// Push event (mua VIP, dùng AI, v.v.) — gọi từ client sau action
app.post('/api/live/event', (req, res) => {
    const { type, msg } = req.body;
    if (!type || !msg) return res.status(400).json({ error: 'missing fields' });
    const allowed = ['vip','ai','game','join','review'];
    if (!allowed.includes(type)) return res.status(400).json({ error: 'invalid type' });
    liveStore.recentEvents.unshift({ type, msg: msg.slice(0, 80), ts: Date.now() });
    if (liveStore.recentEvents.length > 20) liveStore.recentEvents.pop();
    res.json({ ok: true });
});

// GET live stats
app.get('/api/live/stats', (req, res) => {
    const now = Date.now();
    const cutoff = now - 90 * 1000; // 90 giây = "đang online"

    // Dọn heartbeat cũ
    for (const [id, v] of liveStore.heartbeats) {
        if (v.ts < cutoff) liveStore.heartbeats.delete(id);
    }

    const sessions = [...liveStore.heartbeats.values()];
    const activeCount = sessions.length;

    // Đếm theo page
    const byPage = {};
    sessions.forEach(s => { byPage[s.page] = (byPage[s.page] || 0) + 1; });

    // Recent events (5 phút gần nhất)
    const recentEvents = liveStore.recentEvents.filter(e => e.ts > now - 5 * 60 * 1000).slice(0, 8);

    // VIP count hôm nay từ DB
    const today = new Date().toISOString().slice(0, 10);
    const vipToday = get("SELECT COUNT(*) as c FROM subscriptions WHERE status='active' AND DATE(activated_at)=?", [today]);

    // AI usage hôm nay
    const aiToday = get("SELECT SUM(count) as c FROM user_usage WHERE date=?", [today]);

    res.json({
        activeCount,
        byPage,
        recentEvents,
        vipToday: vipToday?.c || 0,
        aiToday: aiToday?.c || 0,
    });
});

// ========== USER AUTH ==========
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');

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
function genToken() {
    return crypto.randomBytes(16).toString('hex');
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

    // Referral bonus
    const refCode = (req.body.ref || req.query.ref || '').trim().toUpperCase();
    if (refCode) {
        const referrer = get('SELECT id FROM users WHERE referral_code=?', [refCode]);
        if (referrer && referrer.id !== user.id) {
            const REFERRAL_BONUS = 50;
            addCoins(user.id, REFERRAL_BONUS, 'referral_bonus', `Đăng ký qua ref ${refCode}`);
            addCoins(referrer.id, REFERRAL_BONUS, 'referral_reward', `Mời ${user.username} đăng ký`);
            run('INSERT INTO referrals (referrer_id, referred_id, code, coins_given) VALUES (?,?,?,?)',
                [referrer.id, user.id, refCode, REFERRAL_BONUS]);
        }
    }

    res.status(201).json({ user, token });
});

app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body;
    if (!email?.trim() || !password?.trim())
        return res.status(400).json({ error: 'Vui lòng nhập email và mật khẩu' });
    const user = get('SELECT * FROM users WHERE email=?', [email.trim()]);
    if (!user) return res.status(401).json({ error: 'Email hoặc mật khẩu không đúng' });

    // Migrate: nếu hash là SHA256 (64 hex chars) → verify SHA256 rồi migrate sang bcrypt
    let passwordOk = false;
    const sha256Hash = hashPassword(password);
    if (user.password_hash && user.password_hash.length === 64 && /^[0-9a-f]+$/.test(user.password_hash)) {
        // SHA256 hash cũ
        if (user.password_hash === sha256Hash) {
            passwordOk = true;
            // Migrate sang bcrypt
            const newHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
            run('UPDATE users SET password_hash=? WHERE id=?', [newHash, user.id]);
        }
    } else if (user.password_hash && user.password_hash.startsWith('$2')) {
        // bcrypt hash
        passwordOk = await bcrypt.compare(password, user.password_hash);
    } else {
        // Fallback SHA256
        passwordOk = user.password_hash === sha256Hash;
    }

    if (!passwordOk) return res.status(401).json({ error: 'Email hoặc mật khẩu không đúng' });
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

// ========== PASSWORD RESET ==========
const resetLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 3, message: { error: 'Quá nhiều yêu cầu. Thử lại sau 15 phút.' } });

app.post('/api/auth/forgot-password', resetLimiter, async (req, res) => {
    const { email } = req.body;
    if (!email?.trim()) return res.status(400).json({ error: 'Vui lòng nhập email' });

    const user = get('SELECT id, username, email FROM users WHERE email=?', [email.trim().toLowerCase()]);
    // Luôn trả 200 để tránh email enumeration
    if (!user) return res.json({ ok: true, message: 'Nếu email tồn tại, bạn sẽ nhận được link reset.' });

    // Xóa token cũ chưa dùng
    run('DELETE FROM password_resets WHERE user_id=? AND used=0', [user.id]);

    // Tạo token ngẫu nhiên
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString(); // 15 phút
    run('INSERT INTO password_resets (user_id, token, expires_at) VALUES (?,?,?)', [user.id, token, expiresAt]);

    const appUrl = process.env.APP_URL || 'https://portfolio-utbu.onrender.com';
    const resetUrl = `${appUrl}/reset-password.html?token=${token}`;

    // Gửi email qua Resend
    try {
        const { Resend } = require('resend');
        const resend = new Resend(process.env.RESEND_API_KEY);
        await resend.emails.send({
            from: 'Clitus PC <onboarding@resend.dev>',
            to: user.email,
            subject: '🔐 Đặt lại mật khẩu — Clitus PC',
            html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f5f5ff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <div style="max-width:480px;margin:40px auto;background:#fff;border-radius:20px;overflow:hidden;box-shadow:0 8px 32px rgba(102,126,234,.15);">
    <div style="background:linear-gradient(135deg,#667eea,#764ba2);padding:2rem;text-align:center;">
      <div style="font-size:2.5rem;margin-bottom:.5rem;">🔐</div>
      <h1 style="color:#fff;margin:0;font-size:1.4rem;font-weight:800;">Đặt lại mật khẩu</h1>
    </div>
    <div style="padding:2rem;">
      <p style="color:#444;font-size:.95rem;margin:0 0 1rem;">Xin chào <strong>${user.username}</strong>,</p>
      <p style="color:#666;font-size:.88rem;line-height:1.6;margin:0 0 1.5rem;">
        Chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản của bạn.<br>
        Nhấn nút bên dưới để tạo mật khẩu mới. Link có hiệu lực trong <strong>15 phút</strong>.
      </p>
      <div style="text-align:center;margin:1.5rem 0;">
        <a href="${resetUrl}" style="display:inline-block;background:linear-gradient(135deg,#667eea,#764ba2);color:#fff;text-decoration:none;padding:.85rem 2rem;border-radius:12px;font-weight:800;font-size:.95rem;box-shadow:0 4px 14px rgba(102,126,234,.4);">
          Đặt lại mật khẩu →
        </a>
      </div>
      <p style="color:#999;font-size:.78rem;text-align:center;margin:1rem 0 0;">
        Nếu bạn không yêu cầu, hãy bỏ qua email này.<br>
        Link sẽ hết hạn lúc ${new Date(expiresAt).toLocaleTimeString('vi-VN')}.
      </p>
      <hr style="border:none;border-top:1px solid #f0f0f8;margin:1.5rem 0;">
      <p style="color:#bbb;font-size:.72rem;text-align:center;margin:0;">
        © Clitus PC Portfolio · <a href="${appUrl}" style="color:#667eea;">portfolio-utbu.onrender.com</a>
      </p>
    </div>
  </div>
</body>
</html>`
        });
    } catch(err) {
        console.error('Reset email error:', err.message);
        // Vẫn trả ok để không lộ lỗi
    }

    res.json({ ok: true, message: 'Nếu email tồn tại, bạn sẽ nhận được link reset.' });
});

// Verify token (GET — kiểm tra trước khi hiện form)
app.get('/api/auth/reset-password/verify', (req, res) => {
    const { token } = req.query;
    if (!token) return res.status(400).json({ error: 'Thiếu token' });
    const row = get("SELECT * FROM password_resets WHERE token=? AND used=0 AND expires_at > datetime('now')", [token]);
    if (!row) return res.status(400).json({ error: 'Link không hợp lệ hoặc đã hết hạn' });
    res.json({ ok: true, valid: true });
});

// Reset password (POST)
app.post('/api/auth/reset-password', (req, res) => {
    const { token, password } = req.body;
    if (!token || !password) return res.status(400).json({ error: 'Thiếu thông tin' });
    if (password.length < 6) return res.status(400).json({ error: 'Mật khẩu tối thiểu 6 ký tự' });

    const row = get("SELECT * FROM password_resets WHERE token=? AND used=0 AND expires_at > datetime('now')", [token]);
    if (!row) return res.status(400).json({ error: 'Link không hợp lệ hoặc đã hết hạn' });

    // Cập nhật password
    run('UPDATE users SET password_hash=? WHERE id=?', [hashPassword(password), row.user_id]);
    // Đánh dấu token đã dùng
    run('UPDATE password_resets SET used=1 WHERE id=?', [row.id]);

    const user = get('SELECT id,username,email,avatar,role FROM users WHERE id=?', [row.user_id]);
    const jwtToken = signJWT({ id: user.id, email: user.email, role: user.role });
    res.json({ ok: true, message: 'Đặt lại mật khẩu thành công!', user, token: jwtToken });
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

    // Daily reward status (now spin wheel)
    const dailyClaimed = !!get('SELECT id FROM spin_rewards WHERE user_id=? AND spun_date=?', [req.userId, today]);

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

// ========== AI IMAGE ANALYZE ==========
app.post('/api/tools/image-analyze', async (req, res) => {
    const { imageBase64, mode, lang, question } = req.body;
    if (!imageBase64) return res.status(400).json({ error: 'Thiếu ảnh' });

    const token = getAuthToken(req);
    if (!token) return res.status(401).json({ error: 'Vui lòng đăng nhập' });
    const payload = verifyJWT(token);
    if (!payload) return res.status(401).json({ error: 'Phiên đăng nhập hết hạn' });

    const isVip = checkVIP(payload.id);
    if (!isVip) {
        const count = getToolUsage(payload.id, 'img');
        if (count >= 5) return res.status(429).json({ error: 'Hết lượt miễn phí hôm nay (5 lần). Nâng cấp VIP để dùng không giới hạn.', upgradeUrl: '/payment.html' });
    }

    const modePrompts = {
        describe:  'Mô tả chi tiết nội dung ảnh này: màu sắc, đối tượng, bối cảnh, cảm xúc, chi tiết đáng chú ý.',
        identify:  'Nhận diện và liệt kê tất cả đối tượng, vật thể, con người, động vật trong ảnh. Ước tính số lượng nếu có nhiều.',
        text:      'Đọc và trích xuất toàn bộ văn bản, chữ viết có trong ảnh. Giữ nguyên định dạng nếu có thể.',
        emotion:   'Phân tích cảm xúc, tâm trạng trong ảnh: biểu cảm khuôn mặt, ngôn ngữ cơ thể, không khí tổng thể.',
        scene:     'Phân tích cảnh vật: địa điểm, thời gian trong ngày, thời tiết, phong cách kiến trúc, môi trường.',
        code:      'Đọc và trích xuất toàn bộ code, công thức, sơ đồ kỹ thuật trong ảnh. Giữ nguyên cú pháp.',
        solve:     `Đây là ảnh chụp bài tập / bài toán. Hãy:\n1. Đọc và ghi lại đề bài đầy đủ\n2. Phân tích dạng bài\n3. Giải từng bước chi tiết, rõ ràng (đánh số bước)\n4. Ghi rõ kết quả cuối cùng\n5. Giải thích ngắn gọn để học sinh hiểu\nNếu có nhiều câu, giải từng câu riêng biệt.`,
        translate: 'Đọc toàn bộ văn bản trong ảnh và dịch sang ngôn ngữ được yêu cầu. Giữ nguyên cấu trúc, định dạng.',
        nutrition: 'Nhận diện món ăn / thực phẩm trong ảnh. Ước tính: tên món, thành phần chính, calories, giá trị dinh dưỡng cơ bản.',
        plant:     'Nhận diện loài cây / hoa / thực vật trong ảnh. Cho biết: tên khoa học, tên thường gọi, đặc điểm nhận dạng, công dụng.',
    };

    const langNote = lang === 'en' ? 'Respond in English.' : 'Trả lời bằng tiếng Việt.';
    const modeInstruction = modePrompts[mode] || modePrompts.describe;
    const userPrompt = question ? `${modeInstruction}\n\nCâu hỏi thêm: ${question}` : modeInstruction;

    try {
        const apiKey = process.env.OPENROUTER_API_KEY;
        if (!apiKey) return res.status(503).json({ error: 'API chưa cấu hình' });

        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`,
                'HTTP-Referer': 'https://portfolio-utbu.onrender.com',
                'X-Title': 'Clitus PC Image AI'
            },
            body: JSON.stringify({
                model: 'openai/gpt-4o-mini',
                messages: [
                    { role: 'system', content: `Bạn là AI chuyên phân tích hình ảnh. ${langNote}` },
                    { role: 'user', content: [
                        { type: 'text', text: userPrompt },
                        { type: 'image_url', image_url: { url: imageBase64, detail: 'auto' } }
                    ]}
                ],
                max_tokens: mode === 'solve' ? 2000 : 1000
            })
        });
        const data = await response.json();
        if (data.error) throw new Error(data.error.message || 'AI error');
        const result = data?.choices?.[0]?.message?.content || 'Không thể phân tích ảnh này.';

        if (!isVip) incToolUsage(payload.id, 'img');
        saveAiHistory(payload.id, 'img', '[image]');
        res.json({ ok: true, result, isVip });
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

// ========== COMMUNITY CHAT ==========
const chatPostLimiter = rateLimit({ windowMs: 10 * 1000, max: 3, message: { error: 'Gửi quá nhanh, chờ chút!' } });

const VIP_ROOMS = ['vip', 'vip-lounge'];

function parseChatMsg(r) {
    return { ...r, reactions: JSON.parse(r.reactions || '{}') };
}

// GET messages — VIP room guard
app.get('/api/chat/messages', (req, res) => {
    const room = (req.query.room || 'general').slice(0, 30);
    const since = parseInt(req.query.since) || 0;

    // VIP room: phải đăng nhập + có role vip/admin
    if (VIP_ROOMS.includes(room)) {
        const token = getAuthToken(req);
        if (!token) return res.status(403).json({ error: 'VIP only', upgradeUrl: '/payment.html' });
        const payload = verifyJWT(token);
        if (!payload) return res.status(403).json({ error: 'VIP only', upgradeUrl: '/payment.html' });
        const user = get('SELECT role FROM users WHERE id=?', [payload.id]);
        if (!user || (user.role !== 'vip' && user.role !== 'admin')) {
            return res.status(403).json({ error: 'VIP only', upgradeUrl: '/payment.html' });
        }
    }

    // Pinned messages (luôn trả về, không filter by since)
    const pinned = all('SELECT * FROM chat_messages WHERE room=? AND pinned=1 ORDER BY id DESC LIMIT 3', [room]);

    const rows = all(
        'SELECT * FROM chat_messages WHERE room=? AND id>? AND pinned=0 ORDER BY id ASC LIMIT 60',
        [room, since]
    );
    res.json({ messages: rows.map(parseChatMsg), pinned: pinned.map(parseChatMsg) });
});

// POST message
app.post('/api/chat/messages', chatPostLimiter, (req, res) => {
    const { message, room, reply_to, msg_type, sticker } = req.body;
    const roomName = (room || 'general').slice(0, 30);

    const token = getAuthToken(req);
    let userId = null, username = 'Khách', avatar = '', role = 'guest';

    if (token) {
        const payload = verifyJWT(token);
        if (payload) {
            const user = get('SELECT id,username,avatar,role FROM users WHERE id=?', [payload.id]);
            if (user) { userId = user.id; username = user.username; avatar = user.avatar || ''; role = user.role; }
        }
    }

    // VIP room guard
    if (VIP_ROOMS.includes(roomName)) {
        if (!userId || (role !== 'vip' && role !== 'admin')) {
            return res.status(403).json({ error: 'VIP only', upgradeUrl: '/payment.html' });
        }
    }

    // Sticker: chỉ user đăng nhập
    const type = msg_type || 'text';
    if (type === 'sticker' && !userId) return res.status(401).json({ error: 'Đăng nhập để gửi sticker' });
    if (type === 'donate' && !userId) return res.status(401).json({ error: 'Đăng nhập để donate' });

    // Validate
    if (type === 'text' || type === 'donate') {
        if (!message?.trim()) return res.status(400).json({ error: 'Tin nhắn trống' });
        if (message.trim().length > 500) return res.status(400).json({ error: 'Tối đa 500 ký tự' });
    }
    if (type === 'sticker' && !sticker) return res.status(400).json({ error: 'Thiếu sticker' });

    // Guest name
    if (!userId && req.body.guestName?.trim()) {
        username = req.body.guestName.trim().slice(0, 30) + ' (khách)';
    }

    const msgText = type === 'sticker' ? '' : (message || '').trim().slice(0, 500);
    run('INSERT INTO chat_messages (user_id, username, avatar, role, room, message, msg_type, reply_to, sticker) VALUES (?,?,?,?,?,?,?,?,?)',
        [userId, username, avatar, role, roomName, msgText, type, reply_to || null, sticker || '']);

    const msg = get('SELECT * FROM chat_messages ORDER BY id DESC LIMIT 1');
    res.status(201).json(parseChatMsg(msg));
});

// React
app.post('/api/chat/messages/:id/react', (req, res) => {
    const id = parseInt(req.params.id);
    const { emoji } = req.body;
    const allowed = ['👍','❤️','😂','🔥','👏','😮'];
    if (!allowed.includes(emoji)) return res.status(400).json({ error: 'Emoji không hợp lệ' });
    const msg = get('SELECT reactions FROM chat_messages WHERE id=?', [id]);
    if (!msg) return res.status(404).json({ error: 'Không tìm thấy' });
    const reactions = JSON.parse(msg.reactions || '{}');
    reactions[emoji] = (reactions[emoji] || 0) + 1;
    run('UPDATE chat_messages SET reactions=? WHERE id=?', [JSON.stringify(reactions), id]);
    res.json({ reactions });
});

// Pin / Unpin — admin only
app.post('/api/chat/messages/:id/pin', requireAdmin, (req, res) => {
    const id = parseInt(req.params.id);
    const { pin } = req.body; // true/false
    run('UPDATE chat_messages SET pinned=? WHERE id=?', [pin ? 1 : 0, id]);
    res.json({ ok: true, pinned: !!pin });
});

// Delete — admin only
app.delete('/api/chat/messages/:id', requireAdmin, (req, res) => {
    run('DELETE FROM chat_messages WHERE id=?', [parseInt(req.params.id)]);
    res.json({ ok: true });
});

// GET ads
app.get('/api/chat/ads', (req, res) => {
    const ads = all('SELECT * FROM chat_ads WHERE active=1 ORDER BY RANDOM() LIMIT 1');
    res.json(ads[0] || null);
});

// CRUD ads — admin
app.post('/api/chat/ads', requireAdmin, (req, res) => {
    const { text, url } = req.body;
    if (!text?.trim()) return res.status(400).json({ error: 'Thiếu text' });
    run('INSERT INTO chat_ads (text, url) VALUES (?,?)', [text.trim().slice(0,200), (url||'').trim()]);
    res.status(201).json(get('SELECT * FROM chat_ads ORDER BY id DESC LIMIT 1'));
});
app.patch('/api/chat/ads/:id', requireAdmin, (req, res) => {
    const { active } = req.body;
    run('UPDATE chat_ads SET active=? WHERE id=?', [active ? 1 : 0, parseInt(req.params.id)]);
    res.json({ ok: true });
});
app.delete('/api/chat/ads/:id', requireAdmin, (req, res) => {
    run('DELETE FROM chat_ads WHERE id=?', [parseInt(req.params.id)]);
    res.json({ ok: true });
});

// ========== SPIN WHEEL ==========
const SPIN_PRIZES = [10, 20, 5, 50, 15, 30, 5, 100]; // 8 ô

app.get('/api/spin/status', requireUser, (req, res) => {
    const today = new Date().toISOString().slice(0, 10);
    const spun = get('SELECT * FROM spin_rewards WHERE user_id=? AND spun_date=?', [req.userId, today]);
    res.json({ spun: !!spun, coinsEarned: spun?.coins_earned || 0, coins: getCoins(req.userId) });
});

app.post('/api/spin/spin', requireUser, (req, res) => {
    const today = new Date().toISOString().slice(0, 10);
    const already = get('SELECT id FROM spin_rewards WHERE user_id=? AND spun_date=?', [req.userId, today]);
    if (already) return res.status(409).json({ error: 'Đã quay hôm nay rồi! Quay lại vào ngày mai.' });
    // Random prize — 100 coin có xác suất thấp hơn (index 7)
    const weights = [20, 18, 25, 5, 18, 10, 25, 2]; // tổng 123
    const total = weights.reduce((a, b) => a + b, 0);
    let rand = Math.floor(Math.random() * total);
    let prizeIndex = 0;
    for (let i = 0; i < weights.length; i++) {
        rand -= weights[i];
        if (rand < 0) { prizeIndex = i; break; }
    }
    const coins = SPIN_PRIZES[prizeIndex];
    run('INSERT INTO spin_rewards (user_id, spun_date, coins_earned) VALUES (?,?,?)', [req.userId, today, coins]);
    addCoins(req.userId, coins, 'spin', `Spin wheel ngày ${today}`);
    res.json({ ok: true, prizeIndex, coins, totalCoins: getCoins(req.userId) });
});

// ========== REFERRAL ==========
function genReferralCode() {
    return Math.random().toString(36).slice(2, 10).toUpperCase();
}

app.get('/api/referral/code', requireUser, (req, res) => {
    let user = get('SELECT id, username, referral_code FROM users WHERE id=?', [req.userId]);
    if (!user.referral_code) {
        let code;
        do { code = genReferralCode(); } while (get('SELECT id FROM users WHERE referral_code=?', [code]));
        run('UPDATE users SET referral_code=? WHERE id=?', [code, req.userId]);
        user.referral_code = code;
    }
    const appUrl = process.env.APP_URL || 'https://portfolio-utbu.onrender.com';
    res.json({ code: user.referral_code, link: `${appUrl}/?ref=${user.referral_code}` });
});

app.get('/api/referral/stats', requireUser, (req, res) => {
    const refs = all('SELECT r.*, u.username as referred_name FROM referrals r JOIN users u ON u.id=r.referred_id WHERE r.referrer_id=? ORDER BY r.id DESC', [req.userId]);
    const totalCoins = refs.reduce((s, r) => s + (r.coins_given || 0), 0);
    res.json({ count: refs.length, totalCoins, referrals: refs });
});

// ========== BUG REPORT ==========
app.post('/api/bug-report', async (req, res) => {
    const { type, desc, page, browser, device, ua, userId, username, userEmail, time, screenSize, lang } = req.body;
    if (!desc?.trim()) return res.status(400).json({ error: 'Thiếu mô tả lỗi' });

    const typeLabels = { ui:'🎨 Giao diện', func:'⚙️ Tính năng', perf:'🐌 Hiệu năng', auth:'🔐 Đăng nhập', payment:'💳 Thanh toán', other:'❓ Khác' };
    const typeLabel = typeLabels[type] || type || 'Khác';
    const reportTime = time ? new Date(time).toLocaleString('vi-VN') : new Date().toLocaleString('vi-VN');

    console.log(`\n🐛 BUG REPORT [${typeLabel}]\n👤 ${username || 'Khách'} | 🌐 ${browser} | ${device}\n📄 ${page}\n📝 ${desc}\n🕒 ${reportTime}\n`);

    // Tặng 10 coin nếu user đã đăng nhập
    let coinsAwarded = 0;
    if (userId) {
        addCoins(parseInt(userId), 10, 'bug_report', 'Báo lỗi trang web');
        coinsAwarded = 10;
    }

    // Gửi email nếu có Resend
    if (process.env.RESEND_API_KEY) {
        try {
            const { Resend } = require('resend');
            const resend = new Resend(process.env.RESEND_API_KEY);
            const adminEmail = process.env.ADMIN_EMAIL || 'infoclituspc@gmail.com';
            await resend.emails.send({
                from: 'Clitus PC Bug Report <onboarding@resend.dev>',
                to: [adminEmail],
                subject: `🐛 Bug Report: ${typeLabel} — ${(desc).slice(0,60)}`,
                html: `<!DOCTYPE html><html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f5f5ff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
<div style="max-width:520px;margin:32px auto;background:#fff;border-radius:20px;overflow:hidden;box-shadow:0 8px 32px rgba(245,87,108,.15);">
  <div style="background:linear-gradient(135deg,#f5576c,#f093fb);padding:1.75rem 2rem;">
    <div style="font-size:2rem;margin-bottom:.4rem;">🐛</div>
    <h2 style="color:#fff;margin:0;font-size:1.2rem;font-weight:800;">Bug Report nhận được</h2>
    <p style="color:rgba(255,255,255,0.85);margin:.3rem 0 0;font-size:.85rem;">${reportTime}</p>
  </div>
  <div style="padding:1.5rem 2rem;">
    <table style="width:100%;border-collapse:collapse;font-size:.88rem;">
      <tr><td style="padding:.5rem 0;color:#999;width:120px;">Loại lỗi</td><td style="padding:.5rem 0;font-weight:700;color:#f5576c;">${typeLabel}</td></tr>
      <tr><td style="padding:.5rem 0;color:#999;">Trang</td><td style="padding:.5rem 0;color:#667eea;word-break:break-all;">${page || '-'}</td></tr>
      <tr><td style="padding:.5rem 0;color:#999;">User</td><td style="padding:.5rem 0;font-weight:600;">${username || 'Khách'}${userId ? ' (ID: '+userId+')' : ''}${userEmail ? ' — '+userEmail : ''}</td></tr>
      <tr><td style="padding:.5rem 0;color:#999;">Trình duyệt</td><td style="padding:.5rem 0;">${browser || '-'}</td></tr>
      <tr><td style="padding:.5rem 0;color:#999;">Thiết bị</td><td style="padding:.5rem 0;">${device || '-'}</td></tr>
      <tr><td style="padding:.5rem 0;color:#999;">Màn hình</td><td style="padding:.5rem 0;">${screenSize || '-'} | ${lang || '-'}</td></tr>
    </table>
    <div style="margin-top:1rem;background:#fff5f5;border-left:4px solid #f5576c;border-radius:0 10px 10px 0;padding:1rem 1.25rem;">
      <div style="font-size:.75rem;color:#f5576c;font-weight:700;text-transform:uppercase;letter-spacing:.05em;margin-bottom:.4rem;">Mô tả lỗi</div>
      <div style="color:#333;font-size:.92rem;line-height:1.6;">${desc.replace(/\n/g,'<br>')}</div>
    </div>
    ${ua ? `<div style="margin-top:.75rem;font-size:.7rem;color:#ccc;word-break:break-all;">UA: ${ua}</div>` : ''}
  </div>
</div>
</body></html>`
            });
        } catch(e) {
            console.error('Bug report email error:', e.message);
        }
    }

    res.json({ ok: true, coinsAwarded });
});

// ========== PHONE OTP AUTH ==========
const BCRYPT_ROUNDS = 10;
const OTP_EXPIRY_MINUTES = 5;
const OTP_MAX_ATTEMPTS = 5;

// Rate limit riêng cho OTP
const otpSendLimiter = rateLimit({
    windowMs: 10 * 60 * 1000, // 10 phút
    max: 3,
    keyGenerator: (req) => (req.body.phone || '') + '_' + req.ip,
    message: { error: 'Gửi OTP quá nhiều lần. Thử lại sau 10 phút.' }
});
const otpIpLimiter = rateLimit({
    windowMs: 10 * 60 * 1000,
    max: 10,
    message: { error: 'Quá nhiều yêu cầu OTP từ IP này. Thử lại sau 10 phút.' }
});

function validateVNPhone(phone) {
    // Chuẩn hóa: 0xxxxxxxxx hoặc +84xxxxxxxxx
    const cleaned = phone.replace(/\s+/g, '');
    const match = cleaned.match(/^(?:\+84|84|0)(3[2-9]|5[6-9]|7[06-9]|8[0-9]|9[0-9])\d{7}$/);
    if (!match) return null;
    // Chuẩn hóa về dạng 0xxxxxxxxx
    return cleaned.replace(/^(?:\+84|84)/, '0');
}

function generateOTP() {
    return String(Math.floor(100000 + Math.random() * 900000));
}

async function sendOTP(phone, otp, purpose) {
    // DEV MODE: log ra console, pluggable để swap sang Twilio/ESMS
    console.log(`\n📱 [OTP ${purpose.toUpperCase()}] Phone: ${phone} | OTP: ${otp} | Expires: ${OTP_EXPIRY_MINUTES} phút\n`);
    // TODO: swap sang Twilio/ESMS:
    // await twilioClient.messages.create({ to: phone, from: TWILIO_FROM, body: `Mã OTP: ${otp}` });
    return true;
}

async function createOTP(phone, purpose) {
    const otp = generateOTP();
    const hash = await bcrypt.hash(otp, BCRYPT_ROUNDS);
    const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000).toISOString();
    // Xóa OTP cũ chưa dùng của phone+purpose
    run('DELETE FROM phone_otps WHERE phone=? AND purpose=? AND used=0', [phone, purpose]);
    run('INSERT INTO phone_otps (phone, otp_hash, purpose, expires_at) VALUES (?,?,?,?)',
        [phone, hash, purpose, expiresAt]);
    return otp;
}

async function verifyOTP(phone, otp, purpose) {
    const row = get(
        "SELECT * FROM phone_otps WHERE phone=? AND purpose=? AND used=0 AND expires_at > datetime('now') ORDER BY id DESC LIMIT 1",
        [phone, purpose]
    );
    if (!row) return { ok: false, error: 'Mã OTP không hợp lệ hoặc đã hết hạn' };
    if (row.attempt_count >= OTP_MAX_ATTEMPTS) {
        run('UPDATE phone_otps SET used=1 WHERE id=?', [row.id]);
        return { ok: false, error: 'Nhập sai quá nhiều lần. Vui lòng gửi lại OTP.' };
    }
    const match = await bcrypt.compare(otp, row.otp_hash);
    if (!match) {
        run('UPDATE phone_otps SET attempt_count=attempt_count+1 WHERE id=?', [row.id]);
        const remaining = OTP_MAX_ATTEMPTS - row.attempt_count - 1;
        return { ok: false, error: `Mã OTP không đúng. Còn ${remaining} lần thử.` };
    }
    run('UPDATE phone_otps SET used=1 WHERE id=?', [row.id]);
    return { ok: true };
}

// POST /api/auth/phone/send-otp
app.post('/api/auth/phone/send-otp', otpIpLimiter, otpSendLimiter, async (req, res) => {
    const { phone: rawPhone, purpose } = req.body;
    const validPurposes = ['register', 'login', 'reset'];
    if (!rawPhone || !validPurposes.includes(purpose))
        return res.status(400).json({ error: 'Thiếu thông tin hoặc mục đích không hợp lệ' });

    const phone = validateVNPhone(rawPhone);
    if (!phone) return res.status(400).json({ error: 'Số điện thoại không hợp lệ (VD: 0901234567)' });

    // Kiểm tra logic theo purpose
    const existingUser = get('SELECT id FROM users WHERE phone=?', [phone]);
    if (purpose === 'register' && existingUser)
        return res.status(409).json({ error: 'Số điện thoại này đã được đăng ký' });
    if ((purpose === 'login' || purpose === 'reset') && !existingUser)
        return res.status(404).json({ error: 'Số điện thoại chưa được đăng ký' });

    try {
        const otp = await createOTP(phone, purpose);
        await sendOTP(phone, otp, purpose);
        res.json({ ok: true, message: `Đã gửi OTP đến ${phone}. Có hiệu lực ${OTP_EXPIRY_MINUTES} phút.` });
    } catch(err) {
        console.error('OTP error:', err.message);
        res.status(500).json({ error: 'Lỗi gửi OTP, thử lại sau' });
    }
});

// POST /api/auth/phone/verify-register
app.post('/api/auth/phone/verify-register', async (req, res) => {
    const { phone: rawPhone, otp, username } = req.body;
    if (!rawPhone || !otp || !username?.trim())
        return res.status(400).json({ error: 'Thiếu thông tin' });

    const phone = validateVNPhone(rawPhone);
    if (!phone) return res.status(400).json({ error: 'Số điện thoại không hợp lệ' });

    const result = await verifyOTP(phone, otp, 'register');
    if (!result.ok) return res.status(400).json({ error: result.error });

    // Kiểm tra username trùng
    const dupUser = get('SELECT id FROM users WHERE username=?', [username.trim()]);
    if (dupUser) return res.status(409).json({ error: 'Tên đăng nhập đã tồn tại' });

    // Tạo user mới (không có email, không có password)
    const fakeEmail = `phone_${phone}@clituspc.local`;
    run('INSERT INTO users (username, email, password_hash, phone, role) VALUES (?,?,?,?,?)',
        [username.trim().slice(0,50), fakeEmail, '', phone, 'free']);
    const user = get('SELECT id,username,email,avatar,role,created_at FROM users ORDER BY id DESC LIMIT 1');
    const token = signJWT({ id: user.id, email: user.email, role: user.role });

    // Referral bonus
    const refCode = (req.body.ref || '').trim().toUpperCase();
    if (refCode) {
        const referrer = get('SELECT id FROM users WHERE referral_code=?', [refCode]);
        if (referrer && referrer.id !== user.id) {
            addCoins(user.id, 50, 'referral_bonus', `Đăng ký qua ref ${refCode}`);
            addCoins(referrer.id, 50, 'referral_reward', `Mời ${user.username} đăng ký`);
            run('INSERT INTO referrals (referrer_id, referred_id, code, coins_given) VALUES (?,?,?,?)',
                [referrer.id, user.id, refCode, 50]);
        }
    }

    res.status(201).json({ user, token });
});

// POST /api/auth/phone/verify-login
app.post('/api/auth/phone/verify-login', async (req, res) => {
    const { phone: rawPhone, otp } = req.body;
    if (!rawPhone || !otp) return res.status(400).json({ error: 'Thiếu thông tin' });

    const phone = validateVNPhone(rawPhone);
    if (!phone) return res.status(400).json({ error: 'Số điện thoại không hợp lệ' });

    const result = await verifyOTP(phone, otp, 'login');
    if (!result.ok) return res.status(400).json({ error: result.error });

    const user = get('SELECT id,username,email,avatar,role,created_at FROM users WHERE phone=?', [phone]);
    if (!user) return res.status(404).json({ error: 'Tài khoản không tồn tại' });

    const token = signJWT({ id: user.id, email: user.email, role: user.role });
    res.json({ user, token });
});

// POST /api/auth/phone/verify-reset — xác thực OTP để reset password
app.post('/api/auth/phone/verify-reset', async (req, res) => {
    const { phone: rawPhone, otp } = req.body;
    if (!rawPhone || !otp) return res.status(400).json({ error: 'Thiếu thông tin' });

    const phone = validateVNPhone(rawPhone);
    if (!phone) return res.status(400).json({ error: 'Số điện thoại không hợp lệ' });

    const result = await verifyOTP(phone, otp, 'reset');
    if (!result.ok) return res.status(400).json({ error: result.error });

    // Tạo temp token để dùng cho bước đặt mật khẩu mới
    const tempToken = crypto.randomBytes(24).toString('hex');
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
    const user = get('SELECT id FROM users WHERE phone=?', [phone]);
    run('INSERT INTO password_resets (user_id, token, expires_at) VALUES (?,?,?)',
        [user.id, tempToken, expiresAt]);

    res.json({ ok: true, resetToken: tempToken });
});

// POST /api/auth/phone/reset-password — đặt mật khẩu mới
app.post('/api/auth/phone/reset-password', async (req, res) => {
    const { resetToken, password } = req.body;
    if (!resetToken || !password) return res.status(400).json({ error: 'Thiếu thông tin' });
    if (password.length < 6) return res.status(400).json({ error: 'Mật khẩu tối thiểu 6 ký tự' });

    const row = get("SELECT * FROM password_resets WHERE token=? AND used=0 AND expires_at > datetime('now')", [resetToken]);
    if (!row) return res.status(400).json({ error: 'Token không hợp lệ hoặc đã hết hạn' });

    run('UPDATE users SET password_hash=? WHERE id=?', [hashPassword(password), row.user_id]);
    run('UPDATE password_resets SET used=1 WHERE id=?', [row.id]);

    const user = get('SELECT id,username,email,avatar,role FROM users WHERE id=?', [row.user_id]);
    const token = signJWT({ id: user.id, email: user.email, role: user.role });
    res.json({ ok: true, message: 'Đặt lại mật khẩu thành công!', user, token });
});

// Migrate login: nếu password_hash là SHA256 (64 hex) → tự động migrate sang bcrypt

// ========== AD MARKETPLACE ==========
const adLimiter = rateLimit({ windowMs: 60 * 1000, max: 30, message: { error: 'Quá nhiều request.' } });
const crypto2 = require('crypto');

const VALID_PLATFORMS = ['shopee', 'tiktok', 'affiliate'];
const VALID_SLOTS = ['top_vip', 'pinned_post', 'banner_header', 'banner_sidebar', 'banner_mid_article'];
const PLAN_CONFIG = {
    standard:  { amount: 50000,  display_days: 7,  boost_score: 0 },
    premium:   { amount: 150000, display_days: 30, boost_score: 0 },
    vip_boost: { amount: 300000, display_days: 7,  boost_score: 100 }
};

function stripHtml(str) {
    return (str || '').replace(/<[^>]*>/g, '').trim();
}

function isValidUrl(str) {
    try {
        const u = new URL(str);
        return u.protocol === 'http:' || u.protocol === 'https:';
    } catch { return false; }
}

// POST /api/ads — tạo ad mới
app.post('/api/ads', adLimiter, requireUser, (req, res) => {
    const { product_name, link, image_url, price, description, platform, slot } = req.body;
    if (!product_name?.trim()) return res.status(400).json({ error: 'Thiếu tên sản phẩm' });
    if (!link?.trim() || !isValidUrl(link)) return res.status(400).json({ error: 'Link không hợp lệ (phải là http/https)' });
    if (image_url && image_url.trim() && !image_url.trim().startsWith('https://')) return res.status(400).json({ error: 'image_url phải là HTTPS' });
    if (price !== undefined && (isNaN(parseInt(price)) || parseInt(price) < 0)) return res.status(400).json({ error: 'Giá không hợp lệ' });
    if (platform && !VALID_PLATFORMS.includes(platform)) return res.status(400).json({ error: 'Platform không hợp lệ' });
    if (slot && !VALID_SLOTS.includes(slot)) return res.status(400).json({ error: 'Slot không hợp lệ' });

    const activeCount = get('SELECT COUNT(*) as c FROM ads WHERE user_id=? AND status NOT IN (?,?,?)', [req.userId, 'expired', 'rejected', 'hidden']);
    if ((activeCount?.c || 0) >= 20) return res.status(429).json({ error: 'Đã đạt giới hạn 20 quảng cáo' });

    const cleanName = stripHtml(product_name).slice(0, 200);
    const cleanDesc = stripHtml(description || '').slice(0, 1000);

    run('INSERT INTO ads (user_id, product_name, link, image_url, price, description, platform, slot, status) VALUES (?,?,?,?,?,?,?,?,?)', [
        req.userId, cleanName, link.trim(), (image_url || '').trim(),
        parseInt(price) || 0, cleanDesc,
        platform || 'shopee', slot || 'banner_sidebar', 'pending'
    ]);
    const ad = get('SELECT * FROM ads ORDER BY id DESC LIMIT 1');
    res.status(201).json(ad);
});

// GET /api/ads/my — danh sách ads của user
app.get('/api/ads/my', adLimiter, requireUser, (req, res) => {
    const ads = all('SELECT * FROM ads WHERE user_id=? ORDER BY created_at DESC', [req.userId]);
    const result = ads.map(ad => {
        const clicks = get('SELECT COUNT(*) as c FROM ad_clicks WHERE ad_id=?', [ad.id]);
        const imps = get('SELECT COUNT(*) as c FROM ad_impressions WHERE ad_id=?', [ad.id]);
        const clickCount = clicks?.c || 0;
        const impCount = imps?.c || 0;
        const ctr = impCount > 0 ? parseFloat((clickCount / impCount).toFixed(4)) : 0;
        let daysRemaining = null;
        if (ad.expires_at) {
            daysRemaining = Math.max(0, Math.ceil((new Date(ad.expires_at) - Date.now()) / 86400000));
        }
        return { ...ad, click_count: clickCount, impression_count: impCount, ctr, days_remaining: daysRemaining };
    });
    res.json(result);
});

// GET /api/ads/slots/:slot — public, lấy ads active theo slot
app.get('/api/ads/slots/:slot', (req, res) => {
    const { slot } = req.params;
    if (!VALID_SLOTS.includes(slot)) return res.status(400).json({ error: 'Slot không hợp lệ' });
    const ads = all(
        "SELECT id,product_name,link,image_url,price,description,platform,slot,boost_score FROM ads WHERE status='active' AND slot=? AND (expires_at IS NULL OR expires_at > datetime('now')) ORDER BY boost_score DESC, activated_at ASC LIMIT 5",
        [slot]
    );
    res.json(ads);
});

// GET /api/ads/:id/stats — stats cho owner hoặc admin
app.get('/api/ads/:id/stats', adLimiter, requireUser, (req, res) => {
    const id = parseInt(req.params.id);
    const ad = get('SELECT * FROM ads WHERE id=?', [id]);
    if (!ad) return res.status(404).json({ error: 'Không tìm thấy quảng cáo' });
    const isAdmin = req.headers['x-admin-token'] === process.env.ADMIN_PASSWORD;
    if (ad.user_id !== req.userId && !isAdmin) return res.status(403).json({ error: 'Không có quyền' });
    const clicks = get('SELECT COUNT(*) as c FROM ad_clicks WHERE ad_id=?', [id]);
    const imps = get('SELECT COUNT(*) as c FROM ad_impressions WHERE ad_id=?', [id]);
    const clickCount = clicks?.c || 0;
    const impCount = imps?.c || 0;
    const ctr = impCount > 0 ? parseFloat((clickCount / impCount).toFixed(4)) : 0;
    res.json({ click_count: clickCount, impression_count: impCount, ctr });
});

// POST /api/ads/:id/ai-description — AI viết mô tả
// POST /api/ads/ai-fill — AI điền toàn bộ form từ tên sản phẩm (không cần tạo ad trước)
app.post('/api/ads/ai-fill', adLimiter, requireUser, async (req, res) => {
    const { product_name, platform } = req.body;
    if (!product_name?.trim()) return res.status(400).json({ error: 'Thiếu tên sản phẩm' });

    const today = new Date().toISOString().slice(0, 10);
    const usage = get('SELECT count FROM user_usage WHERE user_id=? AND tool=? AND date=?', [req.userId, 'ad_ai_fill', today]);
    if ((usage?.count || 0) >= 5) return res.status(429).json({ error: 'Đã dùng hết 5 lượt AI điền form hôm nay' });

    const platformMap = { shopee: 'Shopee', tiktok: 'TikTok Shop', affiliate: 'Affiliate' };
    const platformName = platformMap[platform] || 'Shopee';

    const fallback = {
        description: `${product_name.trim()} — sản phẩm chất lượng cao trên ${platformName}. Mua ngay để nhận ưu đãi tốt nhất!`,
        price_suggestion: 150000,
        slot_suggestion: 'banner_sidebar'
    };

    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) return res.json(fallback);

    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 8000);
        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            signal: controller.signal,
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}`, 'HTTP-Referer': 'https://portfolio-utbu.onrender.com', 'X-Title': 'Ad Marketplace' },
            body: JSON.stringify({
                model: 'mistralai/mistral-7b-instruct',
                messages: [
                    { role: 'system', content: `Bạn là copywriter chuyên viết quảng cáo sản phẩm tiếng Việt. Trả về JSON hợp lệ với các field sau:
- description: mô tả sản phẩm hấp dẫn 60-120 từ
- price_suggestion: giá sản phẩm ước tính (số nguyên VND, không có dấu phẩy)
- slot_suggestion: một trong [banner_sidebar, banner_header, banner_mid_article, top_vip, pinned_post]
Chỉ trả về JSON, không giải thích thêm.` },
                    { role: 'user', content: `Sản phẩm: "${product_name.trim()}" trên ${platformName}` }
                ],
                max_tokens: 400, temperature: 0.75
            })
        });
        clearTimeout(timeout);
        const data = await response.json();
        const raw = data?.choices?.[0]?.message?.content || '';
        // Parse JSON từ response
        const jsonMatch = raw.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            if (usage) run('UPDATE user_usage SET count=count+1 WHERE user_id=? AND tool=? AND date=?', [req.userId, 'ad_ai_fill', today]);
            else run('INSERT INTO user_usage (user_id, tool, date, count) VALUES (?,?,?,1)', [req.userId, 'ad_ai_fill', today]);
            return res.json({
                description: parsed.description || fallback.description,
                price_suggestion: parseInt(parsed.price_suggestion) || fallback.price_suggestion,
                slot_suggestion: parsed.slot_suggestion || fallback.slot_suggestion
            });
        }
        res.json(fallback);
    } catch (err) {
        res.json(fallback);
    }
});

app.post('/api/ads/:id/ai-description', adLimiter, requireUser, async (req, res) => {
    const id = parseInt(req.params.id);
    const ad = get('SELECT * FROM ads WHERE id=? AND user_id=?', [id, req.userId]);
    if (!ad) return res.status(404).json({ error: 'Không tìm thấy quảng cáo' });

    const today = new Date().toISOString().slice(0, 10);
    const usage = get('SELECT count FROM user_usage WHERE user_id=? AND tool=? AND date=?', [req.userId, 'ad_ai_description', today]);
    if ((usage?.count || 0) >= 10) return res.status(429).json({ error: 'Đã dùng hết 10 lượt AI hôm nay' });

    const platformMap = { shopee: 'Shopee', tiktok: 'TikTok Shop', affiliate: 'Affiliate' };
    const platformName = platformMap[ad.platform] || ad.platform;

    const fallback = `${ad.product_name} — sản phẩm chất lượng cao trên ${platformName}. Mua ngay để nhận ưu đãi tốt nhất!`;

    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 2000);
        const apiKey = process.env.OPENROUTER_API_KEY;
        if (!apiKey) return res.json({ description: fallback });

        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            signal: controller.signal,
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}`, 'HTTP-Referer': 'https://portfolio-utbu.onrender.com', 'X-Title': 'Ad Marketplace' },
            body: JSON.stringify({
                model: 'mistralai/mistral-7b-instruct',
                messages: [
                    { role: 'system', content: 'Bạn là copywriter chuyên viết mô tả sản phẩm quảng cáo tiếng Việt. Viết ngắn gọn, hấp dẫn, 50-150 từ.' },
                    { role: 'user', content: `Viết mô tả quảng cáo cho sản phẩm "${ad.product_name}" bán trên ${platformName}.` }
                ],
                max_tokens: 300, temperature: 0.8
            })
        });
        clearTimeout(timeout);
        const data = await response.json();
        const description = data?.choices?.[0]?.message?.content || fallback;

        // Tăng usage
        if (usage) run('UPDATE user_usage SET count=count+1 WHERE user_id=? AND tool=? AND date=?', [req.userId, 'ad_ai_description', today]);
        else run('INSERT INTO user_usage (user_id, tool, date, count) VALUES (?,?,?,1)', [req.userId, 'ad_ai_description', today]);

        res.json({ description });
    } catch (err) {
        res.json({ description: fallback });
    }
});

// ========== AD PAYMENT ==========
// POST /api/ads/:id/pay/stripe
app.post('/api/ads/:id/pay/stripe', adLimiter, requireUser, async (req, res) => {
    const id = parseInt(req.params.id);
    const ad = get('SELECT * FROM ads WHERE id=? AND user_id=?', [id, req.userId]);
    if (!ad) return res.status(404).json({ error: 'Không tìm thấy quảng cáo' });
    const { plan } = req.body;
    const planCfg = PLAN_CONFIG[plan];
    if (!planCfg) return res.status(400).json({ error: 'Plan không hợp lệ' });

    const stripeKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeKey) return res.status(503).json({ error: 'Stripe chưa được cấu hình' });

    try {
        const stripe = require('stripe')(stripeKey);
        const appUrl = process.env.APP_URL || 'https://portfolio-utbu.onrender.com';
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: [{ price_data: { currency: 'vnd', product_data: { name: `Quảng cáo: ${ad.product_name} (${plan})` }, unit_amount: planCfg.amount }, quantity: 1 }],
            mode: 'payment',
            success_url: `${appUrl}/ads.html?payment=success&ad_id=${id}`,
            cancel_url: `${appUrl}/ads.html?payment=cancel`,
            metadata: { ad_id: String(id), plan, user_id: String(req.userId) }
        });
        run('INSERT INTO ad_transactions (ad_id, user_id, plan, amount, payment_method, payment_id, status) VALUES (?,?,?,?,?,?,?)',
            [id, req.userId, plan, planCfg.amount, 'stripe', session.id, 'pending']);
        res.json({ url: session.url });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/ads/:id/pay/paypal
app.post('/api/ads/:id/pay/paypal', adLimiter, requireUser, async (req, res) => {
    const id = parseInt(req.params.id);
    const ad = get('SELECT * FROM ads WHERE id=? AND user_id=?', [id, req.userId]);
    if (!ad) return res.status(404).json({ error: 'Không tìm thấy quảng cáo' });
    const { plan } = req.body;
    const planCfg = PLAN_CONFIG[plan];
    if (!planCfg) return res.status(400).json({ error: 'Plan không hợp lệ' });

    const clientId = process.env.PAYPAL_CLIENT_ID;
    const clientSecret = process.env.PAYPAL_CLIENT_SECRET;
    if (!clientId || !clientSecret) return res.status(503).json({ error: 'PayPal chưa được cấu hình' });

    try {
        const appUrl = process.env.APP_URL || 'https://portfolio-utbu.onrender.com';
        const base = process.env.PAYPAL_BASE_URL || 'https://api-m.sandbox.paypal.com';

        // Get access token
        const authRes = await fetch(`${base}/v1/oauth2/token`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Authorization': `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}` },
            body: 'grant_type=client_credentials'
        });
        const authData = await authRes.json();
        const accessToken = authData.access_token;

        // Create order (amount in USD approx, or use VND if supported)
        const amountUsd = (planCfg.amount / 25000).toFixed(2);
        const orderRes = await fetch(`${base}/v2/checkout/orders`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${accessToken}` },
            body: JSON.stringify({
                intent: 'CAPTURE',
                purchase_units: [{ amount: { currency_code: 'USD', value: amountUsd }, description: `Ad: ${ad.product_name} (${plan})`, custom_id: `${id}_${req.userId}_${plan}` }],
                application_context: { return_url: `${appUrl}/ads.html?payment=success&ad_id=${id}`, cancel_url: `${appUrl}/ads.html?payment=cancel` }
            })
        });
        const orderData = await orderRes.json();
        const approvalUrl = orderData.links?.find(l => l.rel === 'approve')?.href;
        if (!approvalUrl) throw new Error('Không lấy được approval URL');

        run('INSERT INTO ad_transactions (ad_id, user_id, plan, amount, payment_method, payment_id, status) VALUES (?,?,?,?,?,?,?)',
            [id, req.userId, plan, planCfg.amount, 'paypal', orderData.id, 'pending']);
        res.json({ approvalUrl });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/ads/:id/pay/manual — ACB/ZaloPay chuyển khoản thủ công
app.post('/api/ads/:id/pay/manual', adLimiter, requireUser, (req, res) => {
    const id = parseInt(req.params.id);
    const ad = get('SELECT * FROM ads WHERE id=? AND user_id=?', [id, req.userId]);
    if (!ad) return res.status(404).json({ error: 'Không tìm thấy quảng cáo' });
    const { plan = 'standard', method = 'acb' } = req.body;
    const planCfgs = { standard: 50000, premium: 150000, vip_boost: 300000 };
    const amount = planCfgs[plan] || 50000;
    // Lưu transaction pending — admin xác nhận thủ công
    run('INSERT OR IGNORE INTO ad_transactions (ad_id, user_id, plan, amount, payment_method, payment_id, status) VALUES (?,?,?,?,?,?,?)',
        [id, req.userId, plan, amount, method, `MANUAL_${id}_${Date.now()}`, 'pending']);
    // Đổi status ad → paid để admin biết user đã chuyển khoản
    run("UPDATE ads SET status='paid', plan=? WHERE id=? AND status='pending'", [plan, id]);
    res.json({ ok: true, message: 'Đã ghi nhận. Admin sẽ xác nhận sau khi nhận thanh toán.' });
});

// POST /api/webhooks/stripe
app.post('/api/webhooks/stripe', express.raw({ type: 'application/json' }), (req, res) => {
    const sig = req.headers['stripe-signature'];
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    let event;
    try {
        const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
        event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
    } catch (err) {
        run('INSERT INTO webhook_logs (provider, event_type, payload, status) VALUES (?,?,?,?)',
            ['stripe', 'signature_error', JSON.stringify({ error: err.message }), 'failed']);
        return res.status(400).json({ error: err.message });
    }
    run('INSERT INTO webhook_logs (provider, event_type, payload, status) VALUES (?,?,?,?)',
        ['stripe', event.type, JSON.stringify(event), 'received']);

    if (event.type === 'checkout.session.completed') {
        const session = event.data.object;
        const adId = parseInt(session.metadata?.ad_id);
        const plan = session.metadata?.plan;
        const planCfg = PLAN_CONFIG[plan];
        if (adId && planCfg) {
            run("UPDATE ad_transactions SET status='paid' WHERE payment_id=?", [session.id]);
            run("UPDATE ads SET status='paid', display_days=?, boost_score=? WHERE id=?",
                [planCfg.display_days, planCfg.boost_score, adId]);
            run("UPDATE webhook_logs SET status='processed' WHERE provider='stripe' AND event_type='checkout.session.completed' AND payload LIKE ?",
                [`%${session.id}%`]);
        }
    }
    res.json({ received: true });
});

// POST /api/webhooks/paypal
app.post('/api/webhooks/paypal', (req, res) => {
    const event = req.body;
    run('INSERT INTO webhook_logs (provider, event_type, payload, status) VALUES (?,?,?,?)',
        ['paypal', event.event_type || 'unknown', JSON.stringify(event), 'received']);

    if (event.event_type === 'PAYMENT.CAPTURE.COMPLETED') {
        const customId = event.resource?.custom_id || '';
        const parts = customId.split('_');
        const adId = parseInt(parts[0]);
        const plan = parts[2];
        const planCfg = PLAN_CONFIG[plan];
        const orderId = event.resource?.supplementary_data?.related_ids?.order_id || '';
        if (adId && planCfg) {
            run("UPDATE ad_transactions SET status='paid' WHERE payment_id=?", [orderId]);
            run("UPDATE ads SET status='paid', display_days=?, boost_score=? WHERE id=?",
                [planCfg.display_days, planCfg.boost_score, adId]);
            run("UPDATE webhook_logs SET status='processed' WHERE provider='paypal' AND event_type='PAYMENT.CAPTURE.COMPLETED' ORDER BY id DESC LIMIT 1");
        }
    }
    res.json({ received: true });
});

// ========== PR POSTS ==========
const PR_PLAN_CONFIG = {
    standard:  { amount: 100000, display_days: 7  },
    premium:   { amount: 250000, display_days: 30 },
    featured:  { amount: 500000, display_days: 14 }
};

// POST /api/pr-posts — tạo bài PR mới
app.post('/api/pr-posts', adLimiter, requireUser, (req, res) => {
    const { title, content, excerpt, image_url, link, contact, plan, payment_method } = req.body;
    if (!title?.trim()) return res.status(400).json({ error: 'Thiếu tiêu đề' });
    if (!content?.trim()) return res.status(400).json({ error: 'Thiếu nội dung' });
    const planCfg = PR_PLAN_CONFIG[plan || 'standard'];
    if (!planCfg) return res.status(400).json({ error: 'Plan không hợp lệ' });
    if (image_url && !image_url.trim().startsWith('https://')) return res.status(400).json({ error: 'image_url phải là HTTPS' });
    if (link && !isValidUrl(link)) return res.status(400).json({ error: 'Link không hợp lệ' });

    run('INSERT INTO pr_posts (user_id, title, content, excerpt, image_url, link, contact, plan, amount, payment_method, status) VALUES (?,?,?,?,?,?,?,?,?,?,?)', [
        req.userId,
        stripHtml(title).slice(0, 200),
        content.trim().slice(0, 10000),
        stripHtml(excerpt || '').slice(0, 500),
        (image_url || '').trim(),
        (link || '').trim(),
        stripHtml(contact || '').slice(0, 200),
        plan || 'standard',
        planCfg.amount,
        payment_method || 'acb',
        'pending'
    ]);
    const post = get('SELECT * FROM pr_posts ORDER BY id DESC LIMIT 1');
    res.status(201).json(post);
});

// POST /api/pr-posts/:id/pay — ghi nhận thanh toán thủ công
app.post('/api/pr-posts/:id/pay', adLimiter, requireUser, (req, res) => {
    const id = parseInt(req.params.id);
    const post = get('SELECT * FROM pr_posts WHERE id=? AND user_id=?', [id, req.userId]);
    if (!post) return res.status(404).json({ error: 'Không tìm thấy bài PR' });
    if (post.status !== 'pending') return res.status(400).json({ error: 'Bài PR không ở trạng thái chờ thanh toán' });
    const { method = 'acb' } = req.body;
    run("UPDATE pr_posts SET status='paid', payment_method=? WHERE id=?", [method, id]);
    res.json({ ok: true, message: 'Đã ghi nhận. Admin sẽ duyệt sau khi xác nhận thanh toán.' });
});

// GET /api/pr-posts/my — bài PR của user
app.get('/api/pr-posts/my', adLimiter, requireUser, (req, res) => {
    res.json(all('SELECT * FROM pr_posts WHERE user_id=? ORDER BY created_at DESC', [req.userId]));
});

// GET /api/pr-posts/public — bài PR đang active (public)
app.get('/api/pr-posts/public', (req, res) => {
    res.json(all("SELECT id,title,excerpt,image_url,link,plan,views,activated_at,expires_at FROM pr_posts WHERE status='active' AND (expires_at IS NULL OR expires_at > datetime('now')) ORDER BY plan DESC, activated_at ASC LIMIT 20"));
});

// GET /api/pr-posts/:id — xem chi tiết bài PR
app.get('/api/pr-posts/:id', (req, res) => {
    const id = parseInt(req.params.id);
    const post = get("SELECT * FROM pr_posts WHERE id=? AND status='active'", [id]);
    if (!post) return res.status(404).json({ error: 'Không tìm thấy' });
    run('UPDATE pr_posts SET views=views+1 WHERE id=?', [id]);
    res.json(post);
});

// ========== PR ADMIN ==========
app.get('/api/admin/pr-posts', requireAdmin, (req, res) => {
    const { status } = req.query;
    let sql = 'SELECT pr_posts.*, users.username, users.email as user_email FROM pr_posts LEFT JOIN users ON pr_posts.user_id=users.id';
    const params = [];
    if (status) { sql += ' WHERE pr_posts.status=?'; params.push(status); }
    sql += ' ORDER BY pr_posts.created_at DESC';
    res.json(all(sql, params));
});

app.patch('/api/admin/pr-posts/:id', requireAdmin, (req, res) => {
    const id = parseInt(req.params.id);
    const post = get('SELECT * FROM pr_posts WHERE id=?', [id]);
    if (!post) return res.status(404).json({ error: 'Không tìm thấy' });
    const { action, rejection_reason } = req.body;
    if (action === 'approve') {
        const planCfg = PR_PLAN_CONFIG[post.plan] || PR_PLAN_CONFIG.standard;
        run("UPDATE pr_posts SET status='active', display_days=?, activated_at=datetime('now'), expires_at=datetime('now','+'||?||' days') WHERE id=?",
            [planCfg.display_days, planCfg.display_days, id]);
    } else if (action === 'reject') {
        run("UPDATE pr_posts SET status='rejected', rejection_reason=? WHERE id=?", [(rejection_reason || '').slice(0, 500), id]);
    } else {
        return res.status(400).json({ error: 'Action không hợp lệ' });
    }
    res.json({ ok: true });
});

app.delete('/api/admin/pr-posts/:id', requireAdmin, (req, res) => {
    run('DELETE FROM pr_posts WHERE id=?', [parseInt(req.params.id)]);
    res.json({ ok: true });
});

// ========== AD ADMIN ==========
// GET /api/admin/ads
app.get('/api/admin/ads', requireAdmin, (req, res) => {
    const { status } = req.query;
    let sql = 'SELECT ads.*, users.username, users.email as user_email FROM ads LEFT JOIN users ON ads.user_id=users.id';
    const params = [];
    if (status) { sql += ' WHERE ads.status=?'; params.push(status); }
    sql += ' ORDER BY ads.created_at DESC';
    res.json(all(sql, params));
});

// PATCH /api/admin/ads/:id
app.patch('/api/admin/ads/:id', requireAdmin, (req, res) => {
    const id = parseInt(req.params.id);
    const ad = get('SELECT * FROM ads WHERE id=?', [id]);
    if (!ad) return res.status(404).json({ error: 'Không tìm thấy' });
    const { action, rejection_reason, product_name, description, image_url } = req.body;

    if (action === 'approve') {
        // Lấy plan từ transaction gần nhất nếu có
        const tx = get("SELECT plan FROM ad_transactions WHERE ad_id=? ORDER BY id DESC LIMIT 1", [id]);
        const plan = tx?.plan || 'standard';
        const planCfgs = { standard: { display_days: 7, boost_score: 1 }, premium: { display_days: 30, boost_score: 3 }, vip_boost: { display_days: 7, boost_score: 10 } };
        const planCfg = planCfgs[plan] || planCfgs.standard;
        run("UPDATE ads SET status='active', plan=?, display_days=?, boost_score=?, activated_at=datetime('now'), expires_at=datetime('now','+'||?||' days') WHERE id=?",
            [plan, planCfg.display_days, planCfg.boost_score, planCfg.display_days, id]);
        // Đánh dấu transaction là paid
        run("UPDATE ad_transactions SET status='paid' WHERE ad_id=? AND status='pending'", [id]);
    } else if (action === 'reject') {
        run("UPDATE ads SET status='rejected', rejection_reason=? WHERE id=?", [(rejection_reason || '').slice(0, 500), id]);
    } else if (action === 'hide') {
        run("UPDATE ads SET status='hidden' WHERE id=?", [id]);
    } else if (action === 'unhide') {
        run("UPDATE ads SET status='active' WHERE id=?", [id]);
    } else if (action === 'edit') {
        if (product_name) run('UPDATE ads SET product_name=? WHERE id=?', [stripHtml(product_name).slice(0, 200), id]);
        if (description !== undefined) run('UPDATE ads SET description=? WHERE id=?', [stripHtml(description).slice(0, 1000), id]);
        if (image_url !== undefined) run('UPDATE ads SET image_url=? WHERE id=?', [(image_url || '').trim(), id]);
    } else {
        return res.status(400).json({ error: 'Action không hợp lệ' });
    }
    res.json({ ok: true, ad: get('SELECT * FROM ads WHERE id=?', [id]) });
});

// DELETE /api/admin/ads/:id
app.delete('/api/admin/ads/:id', requireAdmin, (req, res) => {
    const id = parseInt(req.params.id);
    run('DELETE FROM ads WHERE id=?', [id]);
    res.json({ ok: true });
});

// GET /api/admin/ads/revenue
app.get('/api/admin/ads/revenue', requireAdmin, (req, res) => {
    const { from, to, page = 1, limit = 20 } = req.query;
    const today = new Date().toISOString().slice(0, 10);
    const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);
    const monthAgo = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);

    const totalAll = get("SELECT SUM(amount) as t FROM ad_transactions WHERE status='paid'");
    const totalToday = get("SELECT SUM(amount) as t FROM ad_transactions WHERE status='paid' AND DATE(created_at)=?", [today]);
    const totalWeek = get("SELECT SUM(amount) as t FROM ad_transactions WHERE status='paid' AND DATE(created_at)>=?", [weekAgo]);
    const totalMonth = get("SELECT SUM(amount) as t FROM ad_transactions WHERE status='paid' AND DATE(created_at)>=?", [monthAgo]);

    let txSql = "SELECT ad_transactions.*, ads.product_name, users.username FROM ad_transactions LEFT JOIN ads ON ad_transactions.ad_id=ads.id LEFT JOIN users ON ad_transactions.user_id=users.id WHERE ad_transactions.status='paid'";
    const txParams = [];
    if (from) { txSql += ' AND DATE(ad_transactions.created_at)>=?'; txParams.push(from); }
    if (to) { txSql += ' AND DATE(ad_transactions.created_at)<=?'; txParams.push(to); }
    txSql += ' ORDER BY ad_transactions.created_at DESC LIMIT ? OFFSET ?';
    txParams.push(parseInt(limit), (parseInt(page) - 1) * parseInt(limit));

    const transactions = all(txSql, txParams);
    const adsByStatus = all("SELECT status, COUNT(*) as count FROM ads GROUP BY status");
    const topAdvertisers = all("SELECT users.username, users.email, SUM(ad_transactions.amount) as total_spend FROM ad_transactions LEFT JOIN users ON ad_transactions.user_id=users.id WHERE ad_transactions.status='paid' GROUP BY ad_transactions.user_id ORDER BY total_spend DESC LIMIT 10");

    res.json({
        revenue: { today: totalToday?.t || 0, week: totalWeek?.t || 0, month: totalMonth?.t || 0, all_time: totalAll?.t || 0 },
        transactions, adsByStatus, topAdvertisers
    });
});

// DELETE /api/ads/:id — owner xóa ad của mình (chỉ khi pending hoặc rejected)
app.delete('/api/ads/:id', adLimiter, requireUser, (req, res) => {
    const id = parseInt(req.params.id);
    const ad = get('SELECT * FROM ads WHERE id=? AND user_id=?', [id, req.userId]);
    if (!ad) return res.status(404).json({ error: 'Không tìm thấy quảng cáo' });
    if (!['pending', 'rejected'].includes(ad.status)) {
        return res.status(400).json({ error: 'Chỉ có thể xóa quảng cáo đang chờ duyệt hoặc bị từ chối' });
    }
    run('DELETE FROM ads WHERE id=?', [id]);
    res.json({ ok: true });
});

// ========== AD TRACKER + SCHEDULER ==========
// POST /api/ads/track/click/:id
app.post('/api/ads/track/click/:id', (req, res) => {
    const id = parseInt(req.params.id);
    const referrer = (req.body?.referrer_page || req.headers['referer'] || '').slice(0, 500);
    const ip = req.headers['x-forwarded-for']?.split(',')[0] || req.socket?.remoteAddress || '';
    const ipHash = crypto2.createHash('sha256').update(ip).digest('hex');
    run('INSERT INTO ad_clicks (ad_id, referrer_page, ip_hash) VALUES (?,?,?)', [id, referrer, ipHash]);
    res.json({ ok: true });
});

// POST /api/ads/track/impression/:id
app.post('/api/ads/track/impression/:id', (req, res) => {
    const id = parseInt(req.params.id);
    const sessionId = (req.body?.session_id || '').slice(0, 64);
    if (!sessionId) return res.json({ ok: true, skipped: true });

    // Dedup 30 phút
    const cutoff = new Date(Date.now() - 30 * 60 * 1000).toISOString();
    const existing = get("SELECT id FROM ad_impressions WHERE ad_id=? AND session_id=? AND created_at > ?", [id, sessionId, cutoff]);
    if (existing) return res.json({ ok: true, skipped: true });

    run('INSERT INTO ad_impressions (ad_id, session_id) VALUES (?,?)', [id, sessionId]);
    res.json({ ok: true });
});

// ========== PR POSTS ==========
const PR_PLAN_CONFIG = {
    standard: { price: 100000, days: 7 },
    premium:  { price: 250000, days: 30 },
    featured: { price: 500000, days: 14 }
};

// POST /api/pr-posts — tạo bài PR mới
app.post('/api/pr-posts', adLimiter, requireUser, (req, res) => {
    const { title, content, excerpt, image_url, link, contact, plan } = req.body;
    if (!title || !content) return res.status(400).json({ error: 'Thiếu tiêu đề hoặc nội dung' });
    const planCfg = PR_PLAN_CONFIG[plan] || PR_PLAN_CONFIG.standard;
    const r = run(
        `INSERT INTO pr_posts (user_id, title, content, excerpt, image_url, link, contact, plan, amount, status)
         VALUES (?,?,?,?,?,?,?,?,?,'pending')`,
        [req.userId, title.slice(0,200), content.slice(0,10000), (excerpt||'').slice(0,500),
         (image_url||'').slice(0,500), (link||'').slice(0,500), (contact||'').slice(0,200),
         plan || 'standard', planCfg.price]
    );
    res.json({ id: r.lastInsertRowid, plan: plan || 'standard', amount: planCfg.price });
});

// POST /api/pr-posts/:id/pay — ghi nhận thanh toán
app.post('/api/pr-posts/:id/pay', adLimiter, requireUser, (req, res) => {
    const id = parseInt(req.params.id);
    const { method, plan } = req.body;
    const post = get('SELECT * FROM pr_posts WHERE id=? AND user_id=?', [id, req.userId]);
    if (!post) return res.status(404).json({ error: 'Không tìm thấy bài PR' });
    const planCfg = PR_PLAN_CONFIG[plan || post.plan] || PR_PLAN_CONFIG.standard;
    run("UPDATE pr_posts SET status='paid', plan=?, amount=?, payment_method=? WHERE id=?",
        [plan || post.plan, planCfg.price, method || 'manual', id]);
    res.json({ ok: true });
});

// GET /api/pr-posts/my — bài PR của user
app.get('/api/pr-posts/my', requireUser, (req, res) => {
    const posts = all(
        `SELECT pr_posts.*, users.username FROM pr_posts
         LEFT JOIN users ON pr_posts.user_id=users.id
         WHERE pr_posts.user_id=? ORDER BY pr_posts.created_at DESC`,
        [req.userId]
    );
    res.json(posts);
});

// GET /api/pr-posts/public — bài PR đang active (public)
app.get('/api/pr-posts/public', (req, res) => {
    const posts = all(
        `SELECT id, title, excerpt, image_url, link, contact, plan, views, activated_at, expires_at
         FROM pr_posts WHERE status='active' ORDER BY
         CASE plan WHEN 'featured' THEN 0 WHEN 'premium' THEN 1 ELSE 2 END, activated_at DESC`
    );
    res.json(posts);
});

// GET /api/pr-posts/:id — chi tiết bài PR
app.get('/api/pr-posts/:id', (req, res) => {
    const id = parseInt(req.params.id);
    const post = get('SELECT * FROM pr_posts WHERE id=? AND status=?', [id, 'active']);
    if (!post) return res.status(404).json({ error: 'Không tìm thấy' });
    run('UPDATE pr_posts SET views=views+1 WHERE id=?', [id]);
    res.json(post);
});

// ── PR Admin routes ──
// GET /api/admin/pr-posts
app.get('/api/admin/pr-posts', requireAdmin, (req, res) => {
    const { status } = req.query;
    let sql = `SELECT pr_posts.*, users.username, users.email as user_email
               FROM pr_posts LEFT JOIN users ON pr_posts.user_id=users.id`;
    const params = [];
    if (status) { sql += ' WHERE pr_posts.status=?'; params.push(status); }
    sql += ' ORDER BY pr_posts.created_at DESC';
    res.json(all(sql, params));
});

// PATCH /api/admin/pr-posts/:id
app.patch('/api/admin/pr-posts/:id', requireAdmin, (req, res) => {
    const id = parseInt(req.params.id);
    const { action, rejection_reason } = req.body;
    const post = get('SELECT * FROM pr_posts WHERE id=?', [id]);
    if (!post) return res.status(404).json({ error: 'Không tìm thấy' });
    if (action === 'approve') {
        const planCfg = PR_PLAN_CONFIG[post.plan] || PR_PLAN_CONFIG.standard;
        const now = new Date().toISOString();
        const exp = new Date(Date.now() + planCfg.days * 86400000).toISOString();
        run("UPDATE pr_posts SET status='active', activated_at=?, expires_at=? WHERE id=?", [now, exp, id]);
    } else if (action === 'reject') {
        run("UPDATE pr_posts SET status='rejected', rejection_reason=? WHERE id=?", [rejection_reason || '', id]);
    } else if (action === 'hide') {
        run("UPDATE pr_posts SET status='hidden' WHERE id=?", [id]);
    }
    res.json({ ok: true });
});

// DELETE /api/admin/pr-posts/:id
app.delete('/api/admin/pr-posts/:id', requireAdmin, (req, res) => {
    run('DELETE FROM pr_posts WHERE id=?', [parseInt(req.params.id)]);
    res.json({ ok: true });
});

// Serve index.html chỉ cho các route không phải file tĩnh và không phải API
app.get('*', (req, res) => {
    const reqPath = req.path;
    // Nếu có extension (html, css, js, png...) thì 404 thay vì redirect
    if (reqPath.includes('.')) {
        return res.status(404).send('Not found');
    }
    res.sendFile(path.join(__dirname, '..', 'index.html'));
});

// Khởi động: init DB trước rồi mới listen
getDb().then(() => {
    // ===== AD SCHEDULER: chạy mỗi giờ =====
    setInterval(() => {
        try {
            run("UPDATE ads SET status='expired' WHERE status='active' AND expires_at IS NOT NULL AND expires_at < datetime('now')");
            run("UPDATE ads SET boost_score=0 WHERE boost_score > 0 AND boost_expires_at IS NOT NULL AND boost_expires_at < datetime('now')");
        } catch(e) { console.error('Ad scheduler error:', e.message); }
    }, 3600 * 1000);
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
