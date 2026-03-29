const https = require('https');
const KEY = process.env.OPENROUTER_API_KEY;

function parseBody(req) {
    return new Promise((resolve) => {
        let data = '';
        req.on('data', chunk => data += chunk);
        req.on('end', () => {
            try { resolve(JSON.parse(data)); } catch(e) { resolve({}); }
        });
        req.on('error', () => resolve({}));
    });
}

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
    if (!KEY) return res.status(500).json({ error: 'No API key' });

    const body = req.body || await parseBody(req);
    const { messages, max_tokens } = body;
    if (!messages) return res.status(400).json({ error: 'Missing messages' });

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

        const r2 = https.request(options, (r) => {
            let data = '';
            r.on('data', c => data += c);
            r.on('end', () => {
                try {
                    const d = JSON.parse(data);
                    if (r.statusCode !== 200) {
                        res.status(500).json({ error: d.error?.message || 'AI error ' + r.statusCode });
                    } else {
                        res.json({ content: d.choices[0].message.content });
                    }
                } catch(e) {
                    res.status(500).json({ error: 'Parse error: ' + e.message + ' | raw: ' + data.slice(0,100) });
                }
                resolve();
            });
        });

        r2.on('error', (e) => { res.status(500).json({ error: e.message }); resolve(); });
        r2.write(payload);
        r2.end();
    });
};
