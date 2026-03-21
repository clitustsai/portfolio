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
// Serve frontend static files
app.use(express.static(path.join(__dirname, '..')));

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
                max_tokens: 300,
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

// Khởi động: init DB trước rồi mới listen
getDb().then(() => {
    app.listen(PORT, () => {
        console.log(`✅ Backend chạy tại http://localhost:${PORT}`);
        console.log(`🤖 AI Chat: ${process.env.OPENROUTER_API_KEY ? 'OpenRouter đã kết nối' : 'Fallback mode'}`);
    });
}).catch(err => {
    console.error('❌ Lỗi khởi động DB:', err);
    process.exit(1);
});
