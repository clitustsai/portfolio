module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    if (req.method === 'OPTIONS') return res.status(200).end();
    const clientId = process.env.GOOGLE_CLIENT_ID;
    if (!clientId) return res.status(503).json({ error: 'Google OAuth chưa cấu hình' });
    const appUrl = process.env.APP_URL || `https://${req.headers.host}`;
    const redirect = encodeURIComponent(`${appUrl}/api/google-callback`);
    const url = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${redirect}&response_type=code&scope=openid%20email%20profile&prompt=select_account`;
    return res.redirect(url);
};
