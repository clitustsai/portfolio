const { query, queryOne, run } = require('./_db');
const { verifyJWT, getAuthToken } = require('./_auth');

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,DELETE,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization,x-admin-token,x-user-token');
    if (req.method === 'OPTIONS') return res.status(200).end();

    const url = req.url.split('?')[0];

    if (req.method === 'GET' && url.endsWith('/messages')) {
        const room = req.query.room || 'general';
        const limit = Math.min(parseInt(req.query.limit) || 50, 100);
        const msgs = await query('SELECT * FROM chat_messages WHERE room=$1 ORDER BY created_at DESC LIMIT $2', [room, limit]);
        return res.json(msgs.reverse());
    }

    if (req.method === 'POST' && url.endsWith('/messages')) {
        const token = getAuthToken(req);
        if (!token) return res.status(401).json({ error: 'Chưa đăng nhập' });
        const payload = verifyJWT(token);
        if (!payload) return res.status(401).json({ error: 'Phiên hết hạn' });
        const user = await queryOne('SELECT id,username,avatar,role FROM users WHERE id=$1', [payload.id]);
        if (!user) return res.status(401).json({ error: 'User không tồn tại' });

        const { message, room, msg_type, reply_to, sticker } = req.body;
        if (!message?.trim() && !sticker) return res.status(400).json({ error: 'Thiếu nội dung' });

        await run('INSERT INTO chat_messages (user_id,username,avatar,role,room,message,msg_type,reply_to,sticker) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)', [
            user.id, user.username, user.avatar || '', user.role,
            room || 'general', (message || '').trim().slice(0, 1000),
            msg_type || 'text', reply_to || null, sticker || ''
        ]);
        const msg = await queryOne('SELECT * FROM chat_messages ORDER BY id DESC LIMIT 1');
        return res.status(201).json(msg);
    }

    res.status(405).json({ error: 'Method not allowed' });
};
