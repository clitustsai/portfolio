# 🚀 Deploy lên Cloudflare Pages

## Phương án 1: Deploy qua Dashboard (Dễ nhất)

### Bước 1: Đăng nhập Cloudflare
1. Truy cập: https://dash.cloudflare.com
2. Đăng ký/Đăng nhập tài khoản

### Bước 2: Tạo Pages Project
1. Vào **Workers & Pages** → **Create application** → **Pages**
2. Chọn **Connect to Git**
3. Authorize GitHub → Chọn repo `clitustsai/portfolio`

### Bước 3: Cấu hình Build
```
Project name: clituspc-portfolio
Production branch: main
Build command: (để trống)
Build output directory: /
Root directory: /
```

### Bước 4: Deploy
- Click **Save and Deploy**
- Đợi 1-2 phút
- Xong! URL: `https://clituspc-portfolio.pages.dev`

---

## Phương án 2: Deploy qua CLI (Nhanh hơn)

### Cài đặt Wrangler
```bash
npm install -g wrangler
```

### Login Cloudflare
```bash
wrangler login
```

### Deploy
```bash
wrangler pages deploy . --project-name=clituspc-portfolio
```

---

## Cấu hình Custom Domain

### Sau khi deploy xong:
1. Vào **Pages** → **clituspc-portfolio** → **Custom domains**
2. Click **Set up a custom domain**
3. Nhập domain của bạn (VD: `clituspc.pp.ua`)
4. Cloudflare sẽ tự động cấu hình DNS

---

## Lưu ý quan trọng

### Backend API vẫn chạy trên Render
- Frontend: Cloudflare Pages (cực nhanh)
- Backend: Render (giữ nguyên)
- API calls tự động proxy qua `_redirects`

### Tự động deploy khi push Git
- Mỗi lần push lên `main` → Cloudflare tự động build & deploy
- Preview URL cho mỗi Pull Request

### Performance
- **Tốc độ**: 10x nhanh hơn Render
- **CDN**: 300+ locations toàn cầu
- **Uptime**: 99.99%
- **Bandwidth**: Unlimited

---

## Kiểm tra sau khi deploy

1. Mở `https://clituspc-portfolio.pages.dev`
2. Test các tính năng:
   - ✅ Trang chủ load nhanh
   - ✅ Blog hiển thị đúng
   - ✅ API calls hoạt động (qua proxy)
   - ✅ Auth/Login/Register
   - ✅ PWA offline mode

---

## Troubleshooting

### Lỗi API không hoạt động?
→ Kiểm tra file `_redirects` đã có chưa

### Lỗi 404 khi refresh trang?
→ Kiểm tra file `_redirects` có dòng `/* /index.html 200`

### CSS/JS không load?
→ Xóa cache trình duyệt (Ctrl+Shift+R)

---

## So sánh Render vs Cloudflare Pages

| Metric | Render | Cloudflare Pages |
|--------|--------|------------------|
| **Load time** | 2-3s | 0.3-0.5s |
| **Uptime** | 99% | 99.99% |
| **CDN** | ❌ | ✅ 300+ locations |
| **Bandwidth** | Limited | Unlimited |
| **Cold start** | 30s+ | 0s |
| **Cost** | Free tier limited | Free unlimited |

---

## Kết luận

✅ Deploy frontend lên Cloudflare Pages
✅ Giữ backend trên Render
✅ Tốc độ tăng 10x
✅ Không mất phí
