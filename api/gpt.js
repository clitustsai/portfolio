const https = require('https');
const KEY = process.env.OPENROUTER_API_KEY;

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
    if (!KEY) return res.status(500).json({ error: 'No API key: ' + Object.keys(process.env).join(',') });

    let messages, max_tokens;
    try {
        const b = req.body;
        messages = b.messages;
        max_tokens = b.max_tokens || 1500;
    } catch(e) {
        return res.status(400).json({ error: 'Bad body: ' + e.message });
    }

    if (!messages) return res.status(400).json({ error: 'Missing messages in body' });

    const payload = JSON.stringify({ model: 'openai/gpt-4o-mini', messages, max_tokens });

    return new Promise((resolve) => {
        const opts = {
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
        const r2 = https.request(opts, (r) => {
            let data = '';
            r.on('data', c => data += c);
            r.on('end', () => {
                try {
                    const d = JSON.parse(data);
                    if (r.statusCode !== 200) {
                        res.status(500).json({ error: (d.error && d.error.message) || ('AI error ' + r.statusCode) });
                    } else {
                        res.json({ content: d.choices[0].message.content });
                    }
                } catch(e) {
                    res.status(500).json({ error: 'Parse: ' + e.message, raw: data.slice(0, 200) });
                }
                resolve();
            });
        });
        r2.on('error', (e) => { res.status(500).json({ error: 'Request: ' + e.message }); resolve(); });
        r2.write(payload);
        r2.end();
    });
};
