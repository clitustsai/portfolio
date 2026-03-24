const fs = require('fs');

fs.writeFileSync('api/_db.js', `const { Pool } = require('pg');
let pool;
function getPool() {
    if (!pool) pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false }, max: 10 });
    return pool;
}
async function query(sql, params = []) { const r = await getPool().query(sql, params); return r.rows; }
async function queryOne(sql, params = []) { return (await query(sql, params))[0] || null; }
async function run(sql, params = []) { await getPool().query(sql, params); }
module.exports = { query, queryOne, run };
`);

fs.writeFileSync('api/stats.js', `const { query, queryOne } = require('./_db');
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
`);

console.log('_db.js size:', fs.statSync('api/_db.js').size);
console.log('stats.js size:', fs.statSync('api/stats.js').size);
