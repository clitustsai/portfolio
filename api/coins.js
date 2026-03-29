const { queryOne, run } = require('./_db');
const { verifyJWT, getAuthToken } = require('./_auth');

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
    if (req.method === 'OPTIONS') return res.status(200).end();

    const token = getAuthToken(req);
    if (!token) return res.status(401).json({ error: 'Chưa đăng nhập' });
    const payload = verifyJWT(token);
    if (!payload) return res.status(401).json({ error: 'Phiên hết hạn' });

    const url = req.url.split('?')[0];

    // GET /api/coins/balance
    if (req.method === 'GET' && url.endsWith('/balance')) {
        try {
            const row = await queryOne('SELECT coins, total_earned FROM user_coins WHERE user_id=$1', [payload.id]);
            return res.json({ coins: row?.coins || 0, total_earned: row?.total_earned || 0 });
        } catch(e) {
            return res.json({ coins: 0, total_earned: 0 });
        }
    }

    // POST /api/coins/earn
    if (req.method === 'POST' && url.endsWith('/earn')) {
        const { amount, source } = req.body;
        if (!amount || amount <= 0) return res.status(400).json({ error: 'Số coin không hợp lệ' });
        try {
            await run(`INSERT INTO user_coins (user_id, coins, total_earned) VALUES ($1, $2, $2)
                ON CONFLICT (user_id) DO UPDATE SET coins = user_coins.coins + $2, total_earned = user_coins.total_earned + $2, updated_at = NOW()`,
                [payload.id, amount]);
            const row = await queryOne('SELECT coins FROM user_coins WHERE user_id=$1', [payload.id]);
            return res.json({ ok: true, coins: row?.coins || 0 });
        } catch(e) {
            return res.status(500).json({ error: e.message });
        }
    }

    // POST /api/coins/spend
    if (req.method === 'POST' && url.endsWith('/spend')) {
        const { amount } = req.body;
        if (!amount || amount <= 0) return res.status(400).json({ error: 'Số coin không hợp lệ' });
        try {
            const row = await queryOne('SELECT coins FROM user_coins WHERE user_id=$1', [payload.id]);
            if (!row || row.coins < amount) return res.status(400).json({ error: 'Không đủ coin' });
            await run('UPDATE user_coins SET coins = coins - $1, updated_at = NOW() WHERE user_id = $2', [amount, payload.id]);
            const updated = await queryOne('SELECT coins FROM user_coins WHERE user_id=$1', [payload.id]);
            return res.json({ ok: true, coins: updated?.coins || 0 });
        } catch(e) {
            return res.status(500).json({ error: e.message });
        }
    }

    return res.status(404).json({ error: 'Not found' });
};
