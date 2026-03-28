const { query, queryOne, run } = require('./_db');
const { verifyJWT, getAuthToken } = require('./_auth');

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,DELETE,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization,x-admin-token,x-user-token');
    if (req.method === 'OPTIONS') return res.status(200).end();

    const isAdmin = req.headers['x-admin-token'] === process.env.ADMIN_PASSWORD;
    const url = req.url.split('?')[0];

    // POST /api/subscription/register
    if (req.method === 'POST' && url.endsWith('/register')) {
        try {
            const { name, email, transferRef } = req.body;
            if (!name?.trim() || !email?.trim()) return res.status(400).json({ error: 'Thiếu thông tin' });
            const existing = await queryOne("SELECT * FROM subscriptions WHERE email=$1 AND status='active' AND expires_at > NOW()", [email.trim()]);
            if (existing) return res.status(409).json({ error: 'Email này đã có gói VIP đang hoạt động', subscription: existing });
            const planType = (req.body.plan === 'student') ? 'student' : 'vip';
            const planPrice = planType === 'student' ? 299000 : 2500000;
            const extraRef = planType === 'student'
                ? `VIPHS ${(req.body.studentId || '').trim().slice(0, 50)}`
                : (transferRef || '').trim().slice(0, 100);
            await run('INSERT INTO subscriptions (email,name,plan,price,status,transfer_ref) VALUES ($1,$2,$3,$4,$5,$6)', [
                email.trim().slice(0, 100), name.trim().slice(0, 100), planType, planPrice, 'pending', extraRef
            ]);
            const sub = await queryOne('SELECT * FROM subscriptions ORDER BY id DESC LIMIT 1');
            return res.status(201).json({ ok: true, message: 'Đăng ký thành công! Vui lòng chờ admin xác nhận.', subscription: sub });
        } catch(e) {
            console.error('subscription register error:', e);
            return res.status(500).json({ error: 'Lỗi server: ' + e.message });
        }
    }

    // GET /api/subscription/check
    if (req.method === 'GET' && url.endsWith('/check')) {
        const { email } = req.query;
        if (!email) return res.status(400).json({ error: 'Thiếu email' });
        const sub = await queryOne("SELECT id,email,name,plan,status,expires_at,activated_at,created_at FROM subscriptions WHERE email=$1 ORDER BY id DESC LIMIT 1", [email.trim()]);
        if (!sub) return res.json({ hasSubscription: false });
        const isActive = sub.status === 'active' && sub.expires_at && new Date(sub.expires_at) > new Date();
        return res.json({ hasSubscription: isActive, subscription: sub });
    }

    // Admin routes
    if (url.endsWith('/admin/list') && isAdmin) {
        const subs = await query('SELECT * FROM subscriptions ORDER BY created_at DESC');
        return res.json(subs);
    }

    const activateMatch = url.match(/\/admin\/activate\/(\d+)$/);
    if (req.method === 'POST' && activateMatch && isAdmin) {
        const id = parseInt(activateMatch[1]);
        const sub = await queryOne('SELECT * FROM subscriptions WHERE id=$1', [id]);
        if (!sub) return res.status(404).json({ error: 'Không tìm thấy' });
        await run("UPDATE subscriptions SET status='active', activated_at=NOW(), expires_at=NOW() + INTERVAL '30 days' WHERE id=$1", [id]);
        await run("UPDATE users SET role='vip' WHERE email=$1", [sub.email]);
        const updated = await queryOne('SELECT * FROM subscriptions WHERE id=$1', [id]);
        return res.json({ ok: true, subscription: updated });
    }

    const rejectMatch = url.match(/\/admin\/reject\/(\d+)$/);
    if (req.method === 'POST' && rejectMatch && isAdmin) {
        await run("UPDATE subscriptions SET status='rejected' WHERE id=$1", [parseInt(rejectMatch[1])]);
        return res.json({ ok: true });
    }

    const deleteMatch = url.match(/\/admin\/(\d+)$/);
    if (req.method === 'DELETE' && deleteMatch && isAdmin) {
        await run('DELETE FROM subscriptions WHERE id=$1', [parseInt(deleteMatch[1])]);
        return res.json({ ok: true });
    }

    // POST /api/subscription/cancel (user)
    if (req.method === 'POST' && url.endsWith('/cancel')) {
        const token = getAuthToken(req);
        if (!token) return res.status(401).json({ error: 'Chưa đăng nhập' });
        const payload = verifyJWT(token);
        if (!payload) return res.status(401).json({ error: 'Phiên hết hạn' });
        await run("UPDATE subscriptions SET status='cancelled' WHERE email=$1 AND status='active'", [payload.email]);
        const activeSub = await queryOne("SELECT id FROM subscriptions WHERE email=$1 AND status='active' AND expires_at > NOW()", [payload.email]);
        if (!activeSub) await run("UPDATE users SET role='free' WHERE id=$1", [payload.id]);
        return res.json({ ok: true, message: 'Đã hủy gói VIP' });
    }

    res.status(404).json({ error: 'Not found' });
};
