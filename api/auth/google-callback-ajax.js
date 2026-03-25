const { queryOne, run } = require('../_db');
const { signJWT } = require('../_auth');

async function upsertOAuthUser({ provider, providerId, username, email, avatar }) {
    let user = await queryOne('SELECT * FROM users WHERE oauth_provider=$1 AND oauth_id=$2', [provider, providerId]);
    if (!user) {
        user = await queryOne('SELECT * FROM users WHERE email=$1', [email]);
        if (user) {
            await run('UPDATE users SET oauth_provider=$1, oauth_id=$2, avatar=$3 WHERE id=$4', [provider, providerId, avatar, user.id]);
        } else {
            let finalUsername = username.slice(0, 50);
            const dup = await queryOne('SELECT id FROM users WHERE username=$1', [finalUsername]);
            if (dup) finalUsername = `${finalUsername}_${providerId.slice(-4)}`;
            await run('INSERT INTO users (username, email, password_hash, oauth_provider, oauth_id, avatar, role) VALUES ($1,$2,$3,$4,$5,$6,$7)',
                [finalUsername, email.slice(0, 100), '', provider, providerId, avatar, 'free']);
            user = await queryOne('SELECT * FROM users ORDER BY id DESC LIMIT 1');
        }
    } else {
        await run('UPDATE users SET avatar=$1 WHERE id=$2', [avatar, user.id]);
    }
    return queryOne('SELECT id,username,email,avatar,role,created_at FROM users WHERE id=$1', [user.id]);
}

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const { code } = req.body || {};
    if (!code) return res.status(400).json({ error: 'No code' });

    try {
        const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                code,
                client_id: process.env.GOOGLE_CLIENT_ID,
                client_secret: process.env.GOOGLE_CLIENT_SECRET,
                redirect_uri: 'https://portfolio-xi-gray-20.vercel.app/oauth-callback.html',
                grant_type: 'authorization_code'
            })
        });
        const tokenData = await tokenRes.json();
        if (!tokenData.access_token) throw new Error(tokenData.error_description || 'No access token');

        const userRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
            headers: { Authorization: `Bearer ${tokenData.access_token}` }
        });
        const profile = await userRes.json();

        const user = await upsertOAuthUser({
            provider: 'google', providerId: profile.id,
            username: profile.name || profile.email.split('@')[0],
            email: profile.email, avatar: profile.picture || ''
        });
        const token = signJWT({ id: user.id, email: user.email, role: user.role || 'free' });
        return res.json({ user, token });
    } catch(err) {
        return res.status(500).json({ error: err.message });
    }
};
