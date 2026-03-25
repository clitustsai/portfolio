const { queryOne, run } = require('./_db');
const { hashPassword, signJWT, verifyJWT, getAuthToken, genToken } = require('./_auth');
const bcrypt = require('bcrypt');
const BCRYPT_ROUNDS = 10;

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization,x-user-token');
    if (req.method === 'OPTIONS') return res.status(200).end();

    const url = req.url.split('?')[0];

    // POST /api/auth/register
    if (req.method === 'POST' && url.endsWith('/register')) {
        const { username, email, password } = req.body;
        if (!username?.trim() || !email?.trim() || !password?.trim())
            return res.status(400).json({ error: 'Vui lòng điền đầy đủ thông tin' });
        if (password.length < 6)
            return res.status(400).json({ error: 'Mật khẩu tối thiểu 6 ký tự' });
        const existing = await queryOne('SELECT id FROM users WHERE email=$1 OR username=$2', [email.trim(), username.trim()]);
        if (existing) return res.status(409).json({ error: 'Email hoặc tên đăng nhập đã tồn tại' });
        await run('INSERT INTO users (username, email, password_hash, role) VALUES ($1,$2,$3,$4)', [
            username.trim().slice(0, 50), email.trim().slice(0, 100), hashPassword(password), 'free'
        ]);
        const user = await queryOne('SELECT id,username,email,avatar,role,created_at FROM users ORDER BY id DESC LIMIT 1');
        const token = signJWT({ id: user.id, email: user.email, role: user.role });
        return res.status(201).json({ user, token });
    }

    // POST /api/auth/login
    if (req.method === 'POST' && url.endsWith('/login')) {
        const { email, password } = req.body;
        if (!email?.trim() || !password?.trim())
            return res.status(400).json({ error: 'Vui lòng nhập email và mật khẩu' });
        const user = await queryOne('SELECT * FROM users WHERE email=$1', [email.trim()]);
        if (!user) return res.status(401).json({ error: 'Email hoặc mật khẩu không đúng' });

        let passwordOk = false;
        const sha256Hash = hashPassword(password);
        if (user.password_hash && user.password_hash.length === 64 && /^[0-9a-f]+$/.test(user.password_hash)) {
            if (user.password_hash === sha256Hash) {
                passwordOk = true;
                const newHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
                await run('UPDATE users SET password_hash=$1 WHERE id=$2', [newHash, user.id]);
            }
        } else if (user.password_hash && user.password_hash.startsWith('$2')) {
            passwordOk = await bcrypt.compare(password, user.password_hash);
        } else {
            passwordOk = user.password_hash === sha256Hash;
        }

        if (!passwordOk) return res.status(401).json({ error: 'Email hoặc mật khẩu không đúng' });
        const token = signJWT({ id: user.id, email: user.email, role: user.role });
        return res.json({ user: { id: user.id, username: user.username, email: user.email, avatar: user.avatar, role: user.role, created_at: user.created_at }, token });
    }

    // GET /api/auth/me
    if (req.method === 'GET' && url.endsWith('/me')) {
        const token = getAuthToken(req);
        if (!token) return res.status(401).json({ error: 'Chưa đăng nhập' });
        const payload = verifyJWT(token);
        if (!payload) return res.status(401).json({ error: 'Phiên đăng nhập hết hạn' });
        const user = await queryOne('SELECT id,username,email,avatar,role,created_at FROM users WHERE id=$1', [payload.id]);
        if (!user) return res.status(404).json({ error: 'Không tìm thấy user' });
        return res.json(user);
    }

    // POST /api/auth/logout
    if (req.method === 'POST' && url.endsWith('/logout')) {
        return res.json({ ok: true });
    }

    // POST /api/auth/google-token — Google Identity Services token exchange
    if (req.method === 'POST' && url.endsWith('/google-token')) {
        const { accessToken, googleId, name, email, avatar } = req.body;
        if (!accessToken || !googleId) return res.status(400).json({ error: 'Thiếu thông tin Google' });
        try {
            // Verify token
            const verifyRes = await fetch(`https://www.googleapis.com/oauth2/v2/userinfo`, {
                headers: { Authorization: `Bearer ${accessToken}` }
            });
            const gData = await verifyRes.json();
            if (!gData.id || gData.id !== googleId) {
                return res.status(401).json({ error: 'Token Google không hợp lệ' });
            }
            const user = await upsertOAuthUser({
                provider: 'google', providerId: googleId,
                username: gData.name || name, email: gData.email || email, avatar: gData.picture || avatar || ''
            });
            const token = signJWT({ id: user.id, email: user.email, role: user.role || 'free' });
            return res.json({ user, token });
        } catch(err) {
            return res.status(500).json({ error: 'Lỗi xác thực Google: ' + err.message });
        }
    }

    // POST /api/auth/facebook-token — Facebook JS SDK token exchange
    if (req.method === 'POST' && url.endsWith('/facebook-token')) {
        const { accessToken, userId, name, email, avatar } = req.body;
        if (!accessToken || !userId) return res.status(400).json({ error: 'Thiếu thông tin Facebook' });
        try {
            // Verify token với Facebook Graph API
            const verifyRes = await fetch(`https://graph.facebook.com/me?access_token=${accessToken}&fields=id,name,email`);
            const fbData = await verifyRes.json();
            if (!fbData.id || fbData.id !== userId) {
                return res.status(401).json({ error: 'Token Facebook không hợp lệ' });
            }
            const finalEmail = fbData.email || email || `fb_${userId}@facebook.com`;
            const finalName = fbData.name || name || 'Facebook User';
            const user = await upsertOAuthUser({
                provider: 'facebook', providerId: userId,
                username: finalName, email: finalEmail, avatar: avatar || ''
            });
            const token = signJWT({ id: user.id, email: user.email, role: user.role || 'free' });
            return res.json({ user, token });
        } catch(err) {
            return res.status(500).json({ error: 'Lỗi xác thực Facebook: ' + err.message });
        }
    }

    // GET /api/auth/google  OR  /api/google-login
    if (req.method === 'GET' && (url.endsWith('/google') || url.endsWith('/google-login'))) {
        const clientId = process.env.GOOGLE_CLIENT_ID;
        if (!clientId) return res.status(503).json({ error: 'Google OAuth chưa cấu hình' });
        const host = req.headers.host || '';
        const proto = host.includes('localhost') ? 'http' : 'https';
        const appUrl = process.env.APP_URL || `${proto}://${host}`;
        const redirect = encodeURIComponent(`${appUrl}/api/google-callback`);
        const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${redirect}&response_type=code&scope=openid%20email%20profile&prompt=select_account`;
        return res.redirect(authUrl);
    }

    // GET /api/auth/google/callback  OR  /api/google-callback
    if (req.method === 'GET' && (url.endsWith('/google/callback') || url.endsWith('/google-callback'))) {
        const { code } = req.query;
        const host = req.headers.host || '';
        const proto = host.includes('localhost') ? 'http' : 'https';
        const appUrl = process.env.APP_URL || `${proto}://${host}`;
        if (!code) return res.redirect(`${appUrl}/?auth_error=no_code`);
        try {
            const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: new URLSearchParams({
                    code, client_id: process.env.GOOGLE_CLIENT_ID,
                    client_secret: process.env.GOOGLE_CLIENT_SECRET,
                    redirect_uri: `${appUrl}/api/google-callback`,
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
            return res.redirect(`${appUrl}/?auth_token=${token}&auth_user=${encodeURIComponent(JSON.stringify({ id: user.id, username: user.username, email: user.email, avatar: user.avatar, role: user.role }))}`);
        } catch (err) {
            const host2 = req.headers.host || '';
            const proto2 = host2.includes('localhost') ? 'http' : 'https';
            const appUrl2 = process.env.APP_URL || `${proto2}://${host2}`;
            return res.redirect(`${appUrl2}/?auth_error=${encodeURIComponent(err.message)}`);
        }
    }

    res.status(404).json({ error: 'Not found' });
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
