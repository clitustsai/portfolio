const { query, queryOne, run } = require('./_db');
const { verifyJWT, getAuthToken } = require('./_auth');

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,DELETE,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization,x-admin-token,x-user-token');
    if (req.method === 'OPTIONS') return res.status(200).end();

    const isAdmin = req.headers['x-admin-token'] === process.env.ADMIN_PASSWORD;

    if (req.method === 'GET') {
        const sort = req.query.sort || 'newest';
        let order = 'created_at DESC';
        if (sort === 'oldest') order = 'created_at ASC';
        else if (sort === 'rating') order = 'rating DESC, created_at DESC';
        const comments = await query(`SELECT * FROM comments ORDER BY ${order}`);
        return res.json(comments);
    }

    if (req.method === 'POST') {
        const { name, email, text, rating } = req.body;
        if (!name?.trim() || !text?.trim() || !rating) return res.status(400).json({ error: 'Thiếu thông tin.' });
        if (rating < 1 || rating > 5) return res.status(400).json({ error: 'Rating 1-5.' });
        await run('INSERT INTO comments (name, email, text, rating) VALUES ($1,$2,$3,$4)', [
            name.trim().slice(0, 100), (email || '').trim().slice(0, 200),
            text.trim().slice(0, 2000), parseInt(rating)
        ]);
        const comment = await queryOne('SELECT * FROM comments ORDER BY id DESC LIMIT 1');
        return res.status(201).json(comment);
    }

    if (req.method === 'DELETE' && isAdmin) {
        await run('DELETE FROM comments');
        return res.json({ ok: true });
    }

    res.status(405).json({ error: 'Method not allowed' });
};
