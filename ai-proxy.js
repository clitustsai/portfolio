// Vercel serverless function - NOT in api/ folder
const KEY = process.env.OPENROUTER_API_KEY;

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).end();
    if (!KEY) return res.status(500).json({ error: 'No key' });

    const { messages, max_tokens } = req.body || {};
    if (!messages) return res.status(400).json({ error: 'Missing messages' });

    try {
        const r = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + KEY,
                'HTTP-Referer': 'https://portfolio-xi-gray-20.vercel.app',
                'X-Title': 'Clitus PC'
            },
            body: JSON.stringify({ model: 'openai/gpt-4o-mini', messages, max_tokens: max_tokens || 1500 })
        });
        const d = await r.json();
        if (!r.ok) return res.status(500).json({ error: d.error?.message || 'AI error' });
        return res.json({ content: d.choices[0].message.content });
    } catch(e) {
        return res.status(500).json({ error: e.message });
    }
};
