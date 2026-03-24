const { query, queryOne, run } = require('./_db');
const { verifyJWT, getAuthToken } = require('./_auth');

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PATCH,DELETE,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization,x-admin-token');
    if (req.method === 'OPTIONS') return res.status(200).end();

    const isAdmin = req.headers['x-admin-token'] === process.env.ADMIN_PASSWORD;
    const url = req.url.split('?')[0];

    // Auth helper
    function getUser() {
        const token = getAuthToken(req);
        if (!token) return null;
        return verifyJWT(token);
    }

    // Ensure ads table exists
    async function ensureTable() {
        await run(`CREATE TABLE IF NOT EXISTS ads (
            id SERIAL PRIMARY KEY,
            user_id INTEGER,
            user_email TEXT,
            product_name TEXT NOT NULL,
            description TEXT,
            link TEXT,
            image_url TEXT,
            price INTEGER DEFAULT 0,
            platform TEXT DEFAULT 'shopee',
            slot TEXT DEFAULT 'banner_sidebar',
            plan TEXT DEFAULT 'standard',
            status TEXT DEFAULT 'pending',
            rejection_reason TEXT,
            click_count INTEGER DEFAULT 0,
            impression_count INTEGER DEFAULT 0,
            ctr NUMERIC(6,4) DEFAULT 0,
            days_remaining INTEGER,
            expires_at TIMESTAMPTZ,
            created_at TIMESTAMPTZ DEFAULT NOW()
        )`);
    }

    // POST /api/ads — create ad
    if (req.method === 'POST' && url.endsWith('/ads')) {
        const user = getUser();
        if (!user) return res.status(401).json({ error: 'Chưa đăng nhập' });
        const { product_name, description, link, image_url, price, platform, slot } = req.body;
        if (!product_name?.trim()) return res.status(400).json({ error: 'Thiếu tên sản phẩm' });
        await ensureTable();
        await run(
            'INSERT INTO ads (user_id,user_email,product_name,description,link,image_url,price,platform,slot) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)',
            [user.id, user.email, product_name.trim().slice(0,200), (description||'').slice(0,1000),
             (link||'').slice(0,500), (image_url||'').slice(0,500), parseInt(price)||0,
             (platform||'shopee').slice(0,50), (slot||'banner_sidebar').slice(0,50)]
        );
        const ad = await queryOne('SELECT * FROM ads WHERE user_email=$1 ORDER BY id DESC LIMIT 1', [user.email]);
        // Notify admin via message
        await run('INSERT INTO messages (name,email,subject,message) VALUES ($1,$2,$3,$4)',
            [user.email, user.email, '[Quảng cáo mới] ' + product_name.trim().slice(0,100),
             `Người dùng ${user.email} vừa tạo quảng cáo:\nSản phẩm: ${product_name}\nLink: ${link||''}\nSlot: ${slot||''}\nAd ID: ${ad?.id}`]
        ).catch(() => {});
        return res.status(201).json(ad);
    }

    // GET /api/ads/my — user's ads
    if (req.method === 'GET' && url.endsWith('/ads/my')) {
        const user = getUser();
        if (!user) return res.status(401).json({ error: 'Chưa đăng nhập' });
        await ensureTable();
        const ads = await query('SELECT * FROM ads WHERE user_email=$1 ORDER BY id DESC', [user.email]);
        return res.json(ads);
    }

    // GET /api/ads/admin — admin list
    if (req.method === 'GET' && url.endsWith('/ads/admin') && isAdmin) {
        await ensureTable();
        const ads = await query('SELECT * FROM ads ORDER BY created_at DESC');
        return res.json(ads);
    }

    // GET /api/ads/:id/stats
    const statsMatch = url.match(/\/ads\/(\d+)\/stats$/);
    if (req.method === 'GET' && statsMatch) {
        const id = parseInt(statsMatch[1]);
        await ensureTable();
        const ad = await queryOne('SELECT click_count,impression_count,ctr FROM ads WHERE id=$1', [id]);
        if (!ad) return res.status(404).json({ error: 'Không tìm thấy' });
        return res.json(ad);
    }

    // POST /api/ads/:id/pay/:method
    const payMatch = url.match(/\/ads\/(\d+)\/pay\/(\w+)$/);
    if (req.method === 'POST' && payMatch) {
        const id = parseInt(payMatch[1]);
        const { plan } = req.body || {};
        await ensureTable();
        if (plan) await run('UPDATE ads SET plan=$1 WHERE id=$2', [plan, id]);
        return res.json({ ok: true });
    }

    // POST /api/ads/:id/ai-description
    const aiDescMatch = url.match(/\/ads\/(\d+)\/ai-description$/);
    if (req.method === 'POST' && aiDescMatch) {
        const id = parseInt(aiDescMatch[1]);
        await ensureTable();
        const ad = await queryOne('SELECT product_name FROM ads WHERE id=$1', [id]);
        if (!ad) return res.status(404).json({ error: 'Không tìm thấy' });
        return res.json({ description: `${ad.product_name} - Sản phẩm chất lượng cao, giá tốt, giao hàng nhanh. Mua ngay để nhận ưu đãi đặc biệt!` });
    }

    // POST /api/ads/ai-fill
    if (req.method === 'POST' && url.endsWith('/ads/ai-fill')) {
        const { product_name, platform } = req.body || {};
        if (!product_name) return res.status(400).json({ error: 'Thiếu tên sản phẩm' });
        return res.json({
            description: `${product_name} - Sản phẩm hot trên ${platform||'Shopee'}, chất lượng đảm bảo, giá cạnh tranh. Đặt hàng ngay!`,
            price_suggestion: 0,
            slot_suggestion: 'banner_sidebar'
        });
    }

    // ── PR POSTS ──────────────────────────────────────────
    async function ensurePrTable() {
        await run(`CREATE TABLE IF NOT EXISTS pr_posts (
            id SERIAL PRIMARY KEY,
            user_email TEXT,
            title TEXT NOT NULL,
            content TEXT,
            excerpt TEXT,
            image_url TEXT,
            link TEXT,
            contact TEXT,
            plan TEXT DEFAULT 'standard',
            status TEXT DEFAULT 'pending',
            created_at TIMESTAMPTZ DEFAULT NOW()
        )`);
    }

    // POST /api/pr-posts
    if (req.method === 'POST' && url.endsWith('/pr-posts')) {
        const user = getUser();
        if (!user) return res.status(401).json({ error: 'Chưa đăng nhập' });
        const { title, content, excerpt, image_url, link, contact, plan } = req.body;
        if (!title?.trim() || !content?.trim()) return res.status(400).json({ error: 'Thiếu tiêu đề hoặc nội dung' });
        await ensurePrTable();
        await run(
            'INSERT INTO pr_posts (user_email,title,content,excerpt,image_url,link,contact,plan) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)',
            [user.email, title.trim().slice(0,200), content.slice(0,10000), (excerpt||'').slice(0,500),
             (image_url||'').slice(0,500), (link||'').slice(0,500), (contact||'').slice(0,200), (plan||'standard')]
        );
        const post = await queryOne('SELECT * FROM pr_posts WHERE user_email=$1 ORDER BY id DESC LIMIT 1', [user.email]);
        await run('INSERT INTO messages (name,email,subject,message) VALUES ($1,$2,$3,$4)',
            [user.email, user.email, '[Bài PR mới] ' + title.trim().slice(0,100),
             `Người dùng ${user.email} vừa gửi bài PR:\nTiêu đề: ${title}\nGói: ${plan||'standard'}\nPost ID: ${post?.id}`]
        ).catch(() => {});
        return res.status(201).json(post);
    }

    // GET /api/pr-posts/my
    if (req.method === 'GET' && url.endsWith('/pr-posts/my')) {
        const user = getUser();
        if (!user) return res.status(401).json({ error: 'Chưa đăng nhập' });
        await ensurePrTable();
        const posts = await query('SELECT * FROM pr_posts WHERE user_email=$1 ORDER BY id DESC', [user.email]);
        return res.json(posts);
    }

    // POST /api/pr-posts/:id/pay
    const prPayMatch = url.match(/\/pr-posts\/(\d+)\/pay$/);
    if (req.method === 'POST' && prPayMatch) {
        return res.json({ ok: true });
    }

    // Admin PATCH/DELETE pr-posts
    const prIdMatch = url.match(/\/pr-posts\/(\d+)$/);
    if (prIdMatch) {
        const id = parseInt(prIdMatch[1]);
        if (req.method === 'PATCH' && isAdmin) {
            await ensurePrTable();
            await run('UPDATE pr_posts SET status=$1 WHERE id=$2', [req.body?.status, id]);
            return res.json({ ok: true });
        }
        if (req.method === 'DELETE' && isAdmin) {
            await ensurePrTable();
            await run('DELETE FROM pr_posts WHERE id=$1', [id]);
            return res.json({ ok: true });
        }
    }

    // Admin: PATCH /api/ads/:id — approve/reject
    const idMatch = url.match(/\/ads\/(\d+)$/);
    if (idMatch) {
        const id = parseInt(idMatch[1]);
        if (req.method === 'PATCH' && isAdmin) {
            const { status, rejection_reason } = req.body || {};
            await ensureTable();
            if (status === 'active') {
                const plan = (req.body.plan || 'standard');
                const days = plan === 'premium' ? 30 : plan === 'vip_boost' ? 7 : 7;
                await run("UPDATE ads SET status='active', expires_at=NOW()+($1 * INTERVAL '1 day'), days_remaining=$1 WHERE id=$2", [days, id]);
            } else if (status === 'rejected') {
                await run("UPDATE ads SET status='rejected', rejection_reason=$1 WHERE id=$2", [rejection_reason||'', id]);
            } else {
                await run('UPDATE ads SET status=$1 WHERE id=$2', [status, id]);
            }
            return res.json({ ok: true });
        }
        if (req.method === 'DELETE') {
            const user = getUser();
            await ensureTable();
            if (isAdmin) {
                await run('DELETE FROM ads WHERE id=$1', [id]);
            } else if (user) {
                await run("DELETE FROM ads WHERE id=$1 AND user_email=$2 AND status IN ('pending','rejected')", [id, user.email]);
            } else {
                return res.status(401).json({ error: 'Không có quyền' });
            }
            return res.json({ ok: true });
        }
    }

    res.status(404).json({ error: 'Not found' });
};
