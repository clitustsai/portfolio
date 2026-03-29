const { signJWT } = require('./_auth');
const { queryOne, run } = require('./_db');

async function upsertOAuthUser({ provider, providerId, username, email, avatar }) {
    let user = await queryOne('SELECT * FROM users WHERE email=$1', [email]);
    if (!user) {
        await run('INSERT INTO users (username,email,password_hash,role,avatar,created_at) VALUES ($1,$2,$3,$4,$5,NOW())',
            [username, email, 'oauth_' + provider, 'free', avatar]);
        user = await queryOne('SELECT * FROM users WHERE email=$1', [email]);
    } else if (!user.avatar && avatar) {
        await run('UPDATE users SET avatar=$1 WHERE id=$2', [avatar, user.id]);
        user.avatar = avatar;
    }
    return user;
}

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    const appUrl = process.env.APP_URL || `https://${req.headers.host}`;

    // POST — called from oauth-callback.html with code
    if (req.method === 'POST') {
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
                    redirect_uri: `${appUrl}/oauth-callback.html`,
                    grant_type: 'authorization_code'
                })
            });
            const tokenData = await tokenRes.json();
            if (!tokenData.access_token) throw new Error(tokenData.error_description || 'No access token');
            const userRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
                headers: { Authorization: `Bearer ${tokenData.access_token}` }
            });
            const profile = await userRes.json();
            const user = await upsertOAuthUser({ provider: 'google', providerId: profile.id, username: profile.name || profile.email.split('@')[0], email: profile.email, avatar: profile.picture || '' });
            const token = signJWT({ id: user.id, email: user.email, role: user.role || 'free' });
            return res.json({ token, user: { id: user.id, username: user.username, email: user.email, avatar: user.avatar, role: user.role } });
        } catch (err) {
            return res.status(500).json({ error: err.message });
        }
    }

    // GET — direct redirect from Google (fallback)
    const { code } = req.query;
    if (!code) return res.redirect(`${appUrl}/?auth_error=no_code`);
    try {
        const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                code,
                client_id: process.env.GOOGLE_CLIENT_ID,
                client_secret: process.env.GOOGLE_CLIENT_SECRET,
                redirect_uri: `${appUrl}/api/google-callback`,
                grant_type: 'authorization_code'
            })
        });
        const tokenData = await tokenRes.json();
        if (!tokenData.access_token) throw new Error('No access token');
        const userRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
            headers: { Authorization: `Bearer ${tokenData.access_token}` }
        });
        const profile = await userRes.json();
        const user = await upsertOAuthUser({ provider: 'google', providerId: profile.id, username: profile.name || profile.email.split('@')[0], email: profile.email, avatar: profile.picture || '' });
        const token = signJWT({ id: user.id, email: user.email, role: user.role || 'free' });
        return res.redirect(`${appUrl}/?auth_token=${token}&auth_user=${encodeURIComponent(JSON.stringify({ id: user.id, username: user.username, email: user.email, avatar: user.avatar, role: user.role }))}`);
    } catch (err) {
        return res.redirect(`${appUrl}/?auth_error=${encodeURIComponent(err.message)}`);
    }
};
