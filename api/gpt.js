const https = require('https');
const KEY = process.env.OPENROUTER_API_KEY;

// Parse raw body
function getRawBody(req) {
    return new Promise((resolve, reject) => {
        const chunks = [];
        req.on('data', chunk => chunks.push(chunk));
        req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
        req.on('error', reject);
    });
}

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
    if (!KEY) return res.status(500).json({ error: 'No key' });

    // Parse body - Vercel may or may not pre-parse
    let messages, max_tokens;
    try {
        let body = req.body;
        if (!body || typeof body === 'string') {
            const raw = typeof body === 'string' ? body : await getRawBody(req);
            body = JSON.parse(raw);
        }
        messages = body.messages;
        max_tokens = body.max_tokens || 1500;
    } catch(e) {
        return res.status(400).json({ error: 'Body parse failed: ' + e.message });
    }

    if (!messages || !messages.length) {
        return res.status(400).json({ error: 'messages required' });
    }

    const payload = JSON.stringify({
        model: 'openai/gpt-4o-mini',
        messages: messages,
        max_tokens: max_tokens
    });

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
            r.on('data', c => { data += c; });
            r.on('end', () => {
                try {
                    const d = JSON.parse(data);
                    if (r.statusCode !== 200) {
                        res.status(500).json({ error: (d.error && d.error.message) || 'AI error ' + r.statusCode });
                    } else {
                        res.json({ content: d.choices[0].message.content });
                    }
                } catch(e) {
                    res.status(500).json({ error: 'Parse: ' + e.message, raw: data.slice(0, 300) });
                }
                resolve();
            });
        });

        r2.on('error', (e) => {
            res.status(500).json({ error: 'HTTPS error: ' + e.message });
            resolve();
        });

        r2.write(payload);
        r2.end();
    });
};
