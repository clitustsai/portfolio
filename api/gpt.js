const https = require('https');
const KEY = process.env.OPENROUTER_API_KEY;

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
    if (!KEY) return res.status(500).json({ error: 'No API key configured' });

    const { messages, max_tokens } = req.body || {};
    if (!messages || !Array.isArray(messages)) return res.status(400).json({ error: 'Missing messages' });

    const payload = JSON.stringify({
        model: 'openai/gpt-4o-mini',
        messages,
        max_tokens: max_tokens || 1500
    });

    return new Promise((resolve) => {
        const options = {
            hostname: 'openrouter.ai',
            path: '/api/v1/chat/completions',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + KEY,
                'HTTP-Referer': 'https://portfolio-xi-gray-20.vercel.app',
                'X-Title': 'Clitus PC',
                'Content-Length': Buffer.byteLength(payload)
            }
        };

        const req2 = https.request(options, (r) => {
            let data = '';
            r.on('data', chunk => data += chunk);
            r.on('end', () => {
                try {
                    const d = JSON.parse(data);
                    if (r.statusCode !== 200) {
                        res.status(500).json({ error: d.error?.message || 'AI error' });
                    } else {
                        res.json({ content: d.choices[0].message.content });
                    }
                } catch(e) {
                    res.status(500).json({ error: 'Parse error: ' + e.message });
                }
                resolve();
            });
        });

        req2.on('error', (e) => {
            res.status(500).json({ error: e.message });
            resolve();
        });

        req2.write(payload);
        req2.end();
    });
};
