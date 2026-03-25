const { query, queryOne } = require('./_db');
module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    if (req.method === 'OPTIONS') return res.status(200).end();
    try {
        const projects = await query('SELECT * FROM project_stats');
        const tv = await queryOne("SELECT value FROM site_stats WHERE key='total_views'");
        const tl = await queryOne("SELECT value FROM site_stats WHERE key='total_likes'");
        const cc = await queryOne('SELECT COUNT(*) as count FROM comments');
        res.json({
            projects: projects.reduce((a, p) => { a[p.project_id] = { views: p.views, likes: p.likes }; return a; }, {}),
            totalViews: tv?.value || 0, totalLikes: tl?.value || 0, totalComments: parseInt(cc?.count) || 0
        });
    } catch (e) { res.status(500).json({ error: e.message }); }
};
