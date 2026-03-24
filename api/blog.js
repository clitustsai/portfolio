const { query, queryOne, run } = require('./_db');

function parsePost(p) {
    if (!p) return null;
    return { ...p, tags: Array.isArray(p.tags) ? p.tags : (p.tags || []), comments: [] };
}

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization,x-admin-token,x-user-token');
    if (req.method === 'OPTIONS') return res.status(200).end();

    const url = req.url.split('?')[0];
    const isAdmin = req.headers['x-admin-token'] === process.env.ADMIN_PASSWORD;

    // GET /api/blog/posts
    if (req.method === 'GET' && url.endsWith('/posts')) {
        const posts = await query('SELECT id,title,slug,excerpt,cover,tags,views,likes,read_time,created_at FROM blog_posts WHERE published=1 ORDER BY created_at DESC');
        return res.json(posts.map(parsePost));
    }

    // POST /api/blog/posts (admin)
    if (req.method === 'POST' && url.endsWith('/posts') && isAdmin) {
        const { title, slug, excerpt, content, cover, tags, read_time, published } = req.body;
        if (!title?.trim() || !slug?.trim()) return res.status(400).json({ error: 'Thiếu title/slug' });
        await run('INSERT INTO blog_posts (title,slug,excerpt,content,cover,tags,read_time,published) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)', [
            title.trim(), slug.trim().toLowerCase().replace(/\s+/g, '-'),
            (excerpt || '').trim(), (content || '').trim(),
            (cover || '').trim(), JSON.stringify(tags || []),
            parseInt(read_time) || 5, published === false ? 0 : 1
        ]);
        const post = await queryOne('SELECT * FROM blog_posts ORDER BY id DESC LIMIT 1');
        return res.status(201).json(parsePost(post));
    }

    // GET /api/blog/posts/:slug
    const slugMatch = url.match(/\/posts\/([^/]+)$/);
    if (req.method === 'GET' && slugMatch) {
        const slug = slugMatch[1];
        const p = await queryOne('SELECT * FROM blog_posts WHERE (slug=$1 OR id::text=$1) AND published=1', [slug]);
        if (!p) return res.status(404).json({ error: 'Not found' });
        await run('UPDATE blog_posts SET views=views+1 WHERE id=$1', [p.id]);
        const comments = await query('SELECT * FROM blog_comments WHERE post_id=$1 ORDER BY created_at DESC', [p.id]);
        const post = parsePost(p);
        post.comments = comments;
        return res.json(post);
    }

    // PUT /api/blog/posts/:id (admin)
    const idMatch = url.match(/\/posts\/(\d+)$/);
    if (req.method === 'PUT' && idMatch && isAdmin) {
        const { title, slug, excerpt, content, cover, tags, read_time, published } = req.body;
        await run('UPDATE blog_posts SET title=$1,slug=$2,excerpt=$3,content=$4,cover=$5,tags=$6,read_time=$7,published=$8,updated_at=NOW() WHERE id=$9', [
            title, slug, excerpt || '', content || '', cover || '',
            JSON.stringify(tags || []), parseInt(read_time) || 5,
            published === false ? 0 : 1, parseInt(idMatch[1])
        ]);
        return res.json({ ok: true });
    }

    // DELETE /api/blog/posts/:id (admin)
    if (req.method === 'DELETE' && idMatch && isAdmin) {
        const id = parseInt(idMatch[1]);
        await run('DELETE FROM blog_posts WHERE id=$1', [id]);
        await run('DELETE FROM blog_comments WHERE post_id=$1', [id]);
        return res.json({ ok: true });
    }

    // POST /api/blog/posts/:id/like
    const likeMatch = url.match(/\/posts\/(\d+)\/like$/);
    if (req.method === 'POST' && likeMatch) {
        const id = parseInt(likeMatch[1]);
        const { action } = req.body;
        if (action === 'unlike') await run('UPDATE blog_posts SET likes=GREATEST(0,likes-1) WHERE id=$1', [id]);
        else await run('UPDATE blog_posts SET likes=likes+1 WHERE id=$1', [id]);
        const row = await queryOne('SELECT likes FROM blog_posts WHERE id=$1', [id]);
        return res.json({ likes: row?.likes || 0 });
    }

    // POST /api/blog/posts/:id/comments
    const commentMatch = url.match(/\/posts\/(\d+)\/comments$/);
    if (req.method === 'POST' && commentMatch) {
        const { name, text } = req.body;
        if (!name?.trim() || !text?.trim()) return res.status(400).json({ error: 'Thiếu thông tin' });
        await run('INSERT INTO blog_comments (post_id,name,text) VALUES ($1,$2,$3)', [
            parseInt(commentMatch[1]), name.trim().slice(0, 100), text.trim().slice(0, 2000)
        ]);
        const c = await queryOne('SELECT * FROM blog_comments ORDER BY id DESC LIMIT 1');
        return res.status(201).json(c);
    }

    res.status(404).json({ error: 'Not found' });
};
