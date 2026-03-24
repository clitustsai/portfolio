module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') return res.status(200).end();

    const { message } = req.body;
    if (!message?.trim()) return res.status(400).json({ error: 'Thiếu nội dung.' });

    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) return res.json({ reply: getFallbackReply(message) });

    try {
        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`,
                'HTTP-Referer': process.env.APP_URL || 'https://portfolio-xi-gray-20.vercel.app',
                'X-Title': 'Clitus PC Portfolio'
            },
            body: JSON.stringify({
                model: 'openai/gpt-4.1-mini',
                messages: [
                    {
                        role: 'system',
                        content: `Bạn là AI Assistant trên portfolio của Clitus PC - Full Stack Developer tại TP.HCM, Việt Nam.
Thông tin:
- Chuyên môn: React, Vue.js, Node.js, Python, MongoDB, PostgreSQL, Firebase
- Kinh nghiệm: 10+ năm
- Email: infoclituspc@gmail.com | Phone: +84 906857331
Trả lời ngắn gọn, thân thiện, đúng ngôn ngữ người dùng. Tối đa 150 từ.`
                    },
                    { role: 'user', content: message.trim().slice(0, 500) }
                ],
                max_tokens: 800,
                temperature: 0.7
            })
        });
        const data = await response.json();
        const reply = data?.choices?.[0]?.message?.content || getFallbackReply(message);
        res.json({ reply });
    } catch (err) {
        res.json({ reply: getFallbackReply(message) });
    }
};

function getFallbackReply(msg) {
    const lower = msg.toLowerCase();
    if (lower.includes('xin chào') || lower.includes('hello') || lower.includes('hi')) return 'Xin chào! 👋 Tôi là AI Assistant của Clitus PC.';
    if (lower.includes('dự án') || lower.includes('project')) return 'Clitus đã xây dựng: E-Commerce (React/Node.js), Project Management (React Native), Data Dashboard (Vue.js/Python).';
    if (lower.includes('kỹ năng') || lower.includes('skill')) return 'Frontend 95%, Backend 90%, Database 85%, UI/UX 88%.';
    if (lower.includes('liên hệ') || lower.includes('contact')) return '📧 infoclituspc@gmail.com\n📞 +84 906857331';
    return 'Cảm ơn bạn! Tôi có thể giúp về kỹ năng, dự án, hoặc liên hệ với Clitus. 😊';
}
