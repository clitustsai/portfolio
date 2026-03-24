const { queryOne } = require('./_db');

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') return res.status(200).end();

    const url = req.url.split('?')[0];

    if (url.endsWith('/ping')) {
        return res.json({ ok: true, ts: Date.now() });
    }

    if (url.endsWith('/stats')) {
        try {
            const views = await queryOne("SELECT value FROM site_stats WHERE key='total_views'");
            const likes = await queryOne("SELECT value FROM site_stats WHERE key='total_likes'");
            return res.json({
                online: 1,
                views: views?.value || 0,
                likes: likes?.value || 0
            });
        } catch {
            return res.json({ online: 1, views: 0, likes: 0 });
        }
    }

    res.status(404).json({ error: 'Not found' });
};
