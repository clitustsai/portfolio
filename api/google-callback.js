const { queryOne, run } = require('./_db');
const { signJWT } = require('./_auth');

module.exports = async (req, res) => {
    const { code, error: oauthError } = req.query;
    const appUrl = process.env.APP_URL || `https://${req.headers.host}`;
    
    if (oauthError) return res.redirect(`${appUrl}/?auth_error=${encodeURIComponent('Google error: ' + oauthError)}`);
    if (!code) return res.redirect(`${appUrl}/?auth_error=no_code`);
    
    try {
        const redirectUri = `${appUrl}/api/google-callback`;
        const params = new URLSearchParams({
            code,
            client_id: process.env.GOOGLE_CLIENT_ID,
            client_secret: process.env.GOOGLE_CLIENT_SECRET,
            redirect_uri: redirectUri,
            grant_type: 'authorization_code'
        });

        const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: params.toString()
        });
        const tokenData = await tokenRes.json();
        
        // Log chi tiết lỗi từ Google
        if (!tokenData.access_token) {
            const errDetail = tokenData.error_description || tokenData.error || JSON.stringify(tokenData);
            throw new Error('Google token error: ' + errDetail);
        }

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
        return res.redirect(`${appUrl}/?auth_token=${token}&auth_user=${encodeURIComponent(JSON.stringify({ id: user.id, username: user.username, email: user.email, avatar: user.avatar, role: user.role }))}`);
    } catch (err) {
        return res.redirect(`${appUrl}/?auth_error=${encodeURIComponent(err.message)}`);
    }
};

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
