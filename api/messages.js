const { query, queryOne, run } = require('./_db');

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PATCH,DELETE,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type,x-admin-token');
    if (req.method === 'OPTIONS') return res.status(200).end();

    const isAdmin = req.headers['x-admin-token'] === process.env.ADMIN_PASSWORD;
    const url = req.url.split('?')[0];

    if (req.method === 'POST' && url.endsWith('/messages')) {
        const { name, email, subject, message } = req.body;
        if (!name?.trim() || !message?.trim()) return res.status(400).json({ error: 'Thiếu thông tin.' });
        await run('INSERT INTO messages (name,email,subject,message) VALUES ($1,$2,$3,$4)', [
            name.trim().slice(0, 100), (email || '').trim().slice(0, 200),
            (subject || '').trim().slice(0, 300), message.trim().slice(0, 5000)
        ]);
        return res.status(201).json({ ok: true });
    }

    if (req.method === 'GET' && isAdmin) {
        const msgs = await query('SELECT * FROM messages ORDER BY created_at DESC');
        return res.json(msgs);
    }

    const idMatch = url.match(/\/messages\/(\d+)/);
    if (idMatch) {
        const id = parseInt(idMatch[1]);
        if (req.method === 'PATCH' && isAdmin) {
            await run('UPDATE messages SET read=1 WHERE id=$1', [id]);
            return res.json({ ok: true });
        }
        if (req.method === 'DELETE' && isAdmin) {
            await run('DELETE FROM messages WHERE id=$1', [id]);
            return res.json({ ok: true });
        }
    }

    if (req.method === 'DELETE' && isAdmin) {
        await run('DELETE FROM messages');
        return res.json({ ok: true });
    }

    res.status(405).json({ error: 'Method not allowed' });
};
