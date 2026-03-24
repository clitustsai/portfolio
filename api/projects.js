const { queryOne, run } = require('./_db');

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') return res.status(200).end();

    const url = req.url.split('?')[0];

    const viewMatch = url.match(/\/projects\/(\d+)\/view$/);
    if (req.method === 'POST' && viewMatch) {
        const id = parseInt(viewMatch[1]);
        await run('UPDATE project_stats SET views=views+1 WHERE project_id=$1', [id]);
        await run("UPDATE site_stats SET value=value+1 WHERE key='total_views'");
        const row = await queryOne('SELECT views FROM project_stats WHERE project_id=$1', [id]);
        return res.json({ views: row?.views || 0 });
    }

    const likeMatch = url.match(/\/projects\/(\d+)\/like$/);
    if (req.method === 'POST' && likeMatch) {
        const id = parseInt(likeMatch[1]);
        const { action } = req.body;
        if (action === 'unlike') {
            await run('UPDATE project_stats SET likes=GREATEST(0,likes-1) WHERE project_id=$1', [id]);
            await run("UPDATE site_stats SET value=GREATEST(0,value-1) WHERE key='total_likes'");
        } else {
            await run('UPDATE project_stats SET likes=likes+1 WHERE project_id=$1', [id]);
            await run("UPDATE site_stats SET value=value+1 WHERE key='total_likes'");
        }
        const row = await queryOne('SELECT likes FROM project_stats WHERE project_id=$1', [id]);
        return res.json({ likes: row?.likes || 0 });
    }

    res.status(404).json({ error: 'Not found' });
};
