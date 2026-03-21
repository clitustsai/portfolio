# Backend - Portfolio Clitus PC

## Cài đặt

```bash
cd server
npm install
```

## Cấu hình

```bash
cp .env.example .env
```

Mở file `.env` và điền:
- `GEMINI_API_KEY`: Lấy miễn phí tại https://aistudio.google.com/app/apikey
- `ADMIN_PASSWORD`: Mật khẩu admin (phải khớp với mật khẩu trong admin.js)

## Chạy

```bash
# Development
npm run dev

# Production
npm start
```

Server chạy tại: http://localhost:3001

## API Endpoints

| Method | URL | Mô tả |
|--------|-----|-------|
| GET | /api/stats | Lấy thống kê tổng |
| POST | /api/projects/:id/view | Tăng lượt xem |
| POST | /api/projects/:id/like | Like/unlike dự án |
| GET | /api/comments | Lấy danh sách bình luận |
| POST | /api/comments | Đăng bình luận mới |
| POST | /api/comments/:id/like | Like bình luận |
| POST | /api/messages | Gửi tin nhắn liên hệ |
| POST | /api/chat | Chat với AI (Gemini) |
| GET | /api/health | Kiểm tra server |

## Lưu ý

- Database SQLite lưu tại `server/portfolio.db`
- Nếu không có Gemini API key, chat vẫn hoạt động với keyword fallback
- Frontend tự động fallback về localStorage nếu backend offline
