const { verifyJWT, getAuthToken } = require('./_auth');
const { queryOne } = require('./_db');

const OPENAI_KEY = process.env.OPENAI_API_KEY;

async function callGPT(messages, max_tokens = 1500) {
    const r = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + OPENAI_KEY },
        body: JSON.stringify({ model: 'gpt-4o-mini', messages, max_tokens, temperature: 0.7 })
    });
    const d = await r.json();
    if (!r.ok) throw new Error(d.error?.message || 'OpenAI error');
    return d.choices[0].message.content;
}

async function checkAuth(req) {
    const token = getAuthToken(req);
    if (!token) return null;
    const payload = verifyJWT(token);
    if (!payload) return null;
    return await queryOne('SELECT id,email,role FROM users WHERE id=$1', [payload.id]);
}

async function checkUsage(userId, tool, limit) {
    // Usage tracking dùng localStorage ở client, server chỉ check VIP
    return true;
}

async function incUsage(userId, tool) {
    // Usage tracking ở client side
}

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
    if (req.method === 'OPTIONS') return res.status(200).end();

    if (!OPENAI_KEY) return res.status(500).json({ error: 'API key chưa được cấu hình' });

    const url = req.url.split('?')[0];
    const user = await checkAuth(req);
    if (!user) return res.status(401).json({ error: 'Chưa đăng nhập' });

    const isVip = user.role === 'vip';

    // ===== CODE REVIEW =====
    if (req.method === 'POST' && url.endsWith('/code-review')) {
        const { code, language } = req.body;
        if (!code?.trim()) return res.status(400).json({ error: 'Thiếu code' });

        if (!isVip) {
            const ok = await checkUsage(user.id, 'cr', 3);
            if (!ok) return res.status(429).json({ error: 'Hết lượt miễn phí hôm nay' });
        }

        const lang = language || 'auto';
        const prompt = `Bạn là senior code reviewer. Phân tích đoạn code ${lang} sau và trả về JSON với format:
{
  "score": <0-100>,
  "summary": "<tóm tắt ngắn>",
  "issues": [{"severity":"high|medium|low","line":"<số dòng hoặc rỗng>","issue":"<mô tả>","fix":"<gợi ý sửa>"}],
  "strengths": ["<điểm mạnh>"],
  "suggestions": ["<đề xuất>"]
}
Chỉ trả về JSON, không có text khác.

Code:
\`\`\`${lang}
${code.slice(0, 3000)}
\`\`\``;

        try {
            const result = await callGPT([{ role: 'user', content: prompt }], 1500);
            const json = JSON.parse(result.replace(/```json\n?|\n?```/g, '').trim());
            if (!isVip) await incUsage(user.id, 'cr');
            return res.json({ result: json, isVip });
        } catch(e) {
            return res.status(500).json({ error: 'Lỗi xử lý AI: ' + e.message });
        }
    }

    // ===== CV GENERATOR =====
    if (req.method === 'POST' && url.endsWith('/cv-generate')) {
        const { name, title, email, phone, summary, skills, experience, education, language } = req.body;
        if (!name?.trim()) return res.status(400).json({ error: 'Thiếu họ tên' });

        if (!isVip) {
            const ok = await checkUsage(user.id, 'cv', 3);
            if (!ok) return res.status(429).json({ error: 'Hết lượt miễn phí hôm nay' });
        }

        const lang = language === 'en' ? 'English' : 'Tiếng Việt';
        const prompt = `Tạo CV chuyên nghiệp bằng ${lang} dạng HTML đẹp cho:
Tên: ${name}
Chức danh: ${title || ''}
Email: ${email || ''}
SĐT: ${phone || ''}
Tóm tắt: ${summary || ''}
Kỹ năng: ${skills || ''}
Kinh nghiệm: ${experience || ''}
Học vấn: ${education || ''}

Trả về HTML hoàn chỉnh (chỉ phần body content, không có <html><head><body> tags), có inline CSS đẹp, chuyên nghiệp, sẵn sàng in. Dùng màu #667eea làm accent color.`;

        try {
            const html = await callGPT([{ role: 'user', content: prompt }], 2000);
            if (!isVip) await incUsage(user.id, 'cv');
            return res.json({ html: html.replace(/```html\n?|\n?```/g, '').trim(), isVip });
        } catch(e) {
            return res.status(500).json({ error: 'Lỗi xử lý AI: ' + e.message });
        }
    }

    // ===== IMAGE ANALYZE =====
    if (req.method === 'POST' && url.endsWith('/image-analyze')) {
        const { imageBase64, mode, lang, question } = req.body;
        if (!imageBase64) return res.status(400).json({ error: 'Thiếu ảnh' });

        if (!isVip) {
            const ok = await checkUsage(user.id, 'img', 5);
            if (!ok) return res.status(429).json({ error: 'Hết lượt miễn phí hôm nay' });
        }

        const modePrompts = {
            solve: 'Giải bài tập trong ảnh, trình bày từng bước chi tiết',
            describe: 'Mô tả chi tiết nội dung ảnh',
            text: 'Đọc và trích xuất toàn bộ văn bản trong ảnh (OCR)',
            code: 'Đọc và giải thích code trong ảnh',
            translate: 'Dịch toàn bộ văn bản trong ảnh sang Tiếng Việt',
            identify: 'Nhận diện và mô tả đối tượng trong ảnh',
            nutrition: 'Phân tích dinh dưỡng của món ăn trong ảnh',
            plant: 'Nhận diện loại cây/hoa trong ảnh',
            emotion: 'Phân tích cảm xúc của người trong ảnh',
            scene: 'Phân tích cảnh vật và bối cảnh trong ảnh',
        };

        const langStr = lang === 'en' ? 'in English' : 'bằng Tiếng Việt';
        const modeStr = modePrompts[mode] || 'Phân tích ảnh';
        const extra = question ? `\nCâu hỏi thêm: ${question}` : '';
        const userPrompt = `${modeStr} ${langStr}.${extra}`;

        try {
            const result = await callGPT([{
                role: 'user',
                content: [
                    { type: 'text', text: userPrompt },
                    { type: 'image_url', image_url: { url: imageBase64, detail: 'low' } }
                ]
            }], 1500);
            if (!isVip) await incUsage(user.id, 'img');
            return res.json({ result, isVip });
        } catch(e) {
            return res.status(500).json({ error: 'Lỗi xử lý AI: ' + e.message });
        }
    }

    return res.status(404).json({ error: 'Not found' });
};
