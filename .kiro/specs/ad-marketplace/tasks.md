# Implementation Plan: Ad Marketplace

## Overview

Triển khai hệ thống Ad Marketplace theo từng lớp: DB schema → Backend API → Frontend → Inject slots. Mỗi task build trên task trước, kết thúc bằng wiring toàn bộ hệ thống.

## Tasks

- [x] 1. Database schema — thêm 5 bảng vào `server/db.js`
  - Thêm vào `db.exec()` trong `getDb()`: bảng `ads`, `ad_transactions`, `ad_clicks`, `ad_impressions`, `webhook_logs` theo đúng schema trong design
  - Đảm bảo dùng `CREATE TABLE IF NOT EXISTS` để không phá DB cũ
  - _Requirements: 2.1, 4.2, 4.3, 8.1, 8.2, 11.5_

- [x] 2. Backend Ad API — CRUD + AI description + stats
  - [x] 2.1 Implement `POST /api/ads` — tạo ad mới
    - Validate `product_name` (max 200), `link` (URL hợp lệ, chỉ http/https), `image_url` (HTTPS hoặc rỗng), `price` (integer ≥ 0), `description` (max 1000), `platform` enum, `slot` enum
    - Strip HTML khỏi `product_name` và `description` trước khi lưu
    - Kiểm tra giới hạn 20 active ads, trả 429 nếu vượt
    - Set `status = 'pending'`, trả HTTP 201
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 11.2, 11.3, 11.4_

  - [x] 2.2 Implement `GET /api/ads/my` — danh sách ads của user
    - Trả về tất cả ads của `req.user.id`, kèm `click_count`, `impression_count`, `ctr`, `days_remaining`
    - _Requirements: 9.2_

  - [x] 2.3 Implement `GET /api/ads/slots/:slot` — public, lấy ads active theo slot
    - Chỉ trả ads `status='active'` và `expires_at > now`, tối đa 5 ads
    - Order by `boost_score DESC, activated_at ASC`
    - _Requirements: 6.2, 6.3_

  - [x] 2.4 Implement `GET /api/ads/:id/stats` — stats cho owner hoặc admin
    - Trả `{ click_count, impression_count, ctr }`, ctr = click/impression (4 decimal), ctr=0 nếu impression=0
    - _Requirements: 8.4, 8.5_

  - [x] 2.5 Implement `POST /api/ads/:id/ai-description` — AI viết mô tả
    - Kiểm tra rate limit 10 lượt/user/ngày qua bảng `user_usage` (tool = `ad_ai_description`)
    - Gọi OpenRouter API, prompt tiếng Việt 50–150 từ cho `product_name` + `platform`
    - Fallback template tĩnh nếu OpenRouter timeout sau 2 giây
    - Trả text để Advertiser edit trước khi save
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

  - [ ]* 2.6 Viết unit tests cho validation logic của `POST /api/ads`
    - Test link không hợp lệ → 400, link javascript: → 400, image_url không HTTPS → 400
    - Test vượt 20 ads → 429
    - _Requirements: 2.2, 2.4, 11.3, 11.4_

- [x] 3. Backend Payment — Stripe + PayPal + Webhooks
  - [x] 3.1 Implement `POST /api/ads/:id/pay/stripe` — tạo Stripe Checkout session
    - Tạo session với amount theo plan (standard=50000, premium=150000, vip_boost=300000)
    - Lưu `ad_transactions` với `status='pending'`, `payment_method='stripe'`
    - Trả `{ url }` để redirect
    - _Requirements: 4.1, 4.5_

  - [x] 3.2 Implement `POST /api/ads/:id/pay/paypal` — tạo PayPal order
    - Tạo order qua PayPal Orders API
    - Lưu `ad_transactions` với `status='pending'`, `payment_method='paypal'`
    - Trả `{ approvalUrl }` để redirect
    - _Requirements: 4.1, 4.5_

  - [x] 3.3 Implement `POST /api/webhooks/stripe` — xử lý `checkout.session.completed`
    - Verify Stripe signature từ `STRIPE_WEBHOOK_SECRET`
    - Log raw payload vào `webhook_logs`
    - Update `ad_transactions.status='paid'`, `ads.status='paid'`
    - Set `display_days` và `boost_score` theo plan
    - _Requirements: 4.2, 4.6, 11.5_

  - [x] 3.4 Implement `POST /api/webhooks/paypal` — xử lý `PAYMENT.CAPTURE.COMPLETED`
    - Verify PayPal webhook signature
    - Log raw payload vào `webhook_logs`
    - Update `ad_transactions.status='paid'`, `ads.status='paid'`
    - _Requirements: 4.3, 11.5_

- [x] 4. Backend Admin API
  - [x] 4.1 Implement `GET /api/admin/ads` — list tất cả ads, filter theo status
    - Dùng `requireAdmin` middleware
    - Hỗ trợ query param `?status=` để filter
    - _Requirements: 5.1, 5.7_

  - [x] 4.2 Implement `PATCH /api/admin/ads/:id` — approve / reject / hide / edit
    - Approve: set `status='active'`, `activated_at=now`, `expires_at=now + display_days`
    - Reject: set `status='rejected'`, lưu `rejection_reason` (max 500 chars)
    - Hide/unhide: toggle `status` giữa `hidden` và `active`
    - Edit: cho phép sửa `product_name`, `description`, `image_url`
    - _Requirements: 5.2, 5.3, 5.4, 5.5_

  - [x] 4.3 Implement `DELETE /api/admin/ads/:id` — xóa vĩnh viễn
    - _Requirements: 5.6_

  - [x] 4.4 Implement `GET /api/admin/ads/revenue` — revenue stats + top advertisers
    - Tổng doanh thu theo: today, this week, this month, all time
    - Danh sách transactions phân trang (query `?page=&limit=`)
    - Filter theo date range (`?from=&to=`)
    - Đếm ads theo status
    - Top 10 advertisers theo total spend
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5_

- [x] 5. Backend Tracker + Scheduler
  - [x] 5.1 Implement `POST /api/ads/track/click/:id` — ghi click event
    - Lưu `ad_clicks` với `ad_id`, `referrer_page`, `ip_hash` (SHA-256 của IP)
    - _Requirements: 8.1_

  - [x] 5.2 Implement `POST /api/ads/track/impression/:id` — ghi impression event
    - Nhận `session_id` từ body
    - Dedup: bỏ qua nếu đã có impression cùng `ad_id` + `session_id` trong 30 phút
    - _Requirements: 8.2, 8.3_

  - [x] 5.3 Implement Scheduler — `setInterval` mỗi 3600 giây
    - Job 1: `UPDATE ads SET status='expired' WHERE status='active' AND expires_at < datetime('now')`
    - Job 2: `UPDATE ads SET boost_score=0 WHERE boost_score > 0 AND boost_expires_at < datetime('now')`
    - Khởi động scheduler sau khi `getDb()` resolve
    - _Requirements: 4.6, 7.2_

- [ ] 6. Checkpoint — Backend hoàn chỉnh
  - Ensure all tests pass, ask the user if questions arise.

- [x] 7. Frontend `ads.html` — Advertiser Dashboard
  - [x] 7.1 Tạo file `ads.html` với layout dashboard
    - Header + nav (reuse nav.js)
    - Form đăng ad: product_name, link, image_url, price, description, platform (select), plan (select với giá)
    - Nút "AI viết mô tả" → gọi `/api/ads/:id/ai-description` (hoặc trước khi tạo ad, gọi với product_name + platform)
    - _Requirements: 9.1_

  - [x] 7.2 Bảng danh sách ads trong `ads.html`
    - Cột: product name, status badge, slot, clicks, impressions, CTR, ngày còn lại, nút Pay
    - Khi status = `rejected`: hiển thị rejection reason
    - _Requirements: 9.2, 9.5_

  - [x] 7.3 Bảng lịch sử thanh toán trong `ads.html`
    - Cột: date, plan, amount (VND), payment method, status
    - _Requirements: 9.4_

  - [x] 7.4 Chart daily clicks/impressions trong `ads.html`
    - Khi click vào một ad → hiển thị chart 30 ngày bằng canvas thuần hoặc Chart.js
    - _Requirements: 9.3_

- [x] 8. Frontend `ads.js` — Ad Display Engine
  - [x] 8.1 Implement hàm `loadAdSlot(slot, containerId)`
    - Gọi `GET /api/ads/slots/:slot`
    - Render HTML ad cards vào container DOM
    - Phân biệt render: `top_vip` → card nổi bật, `banner_*` → image banner
    - _Requirements: 6.1, 6.4, 6.5_

  - [x] 8.2 Implement Intersection Observer cho impression tracking
    - Khi ad vào viewport ≥ 50% → gọi `POST /api/ads/track/impression/:id` với `session_id`
    - `session_id` là random token lưu trong `sessionStorage`, tạo một lần per tab
    - _Requirements: 8.2, 8.3_

  - [x] 8.3 Implement click handler
    - Intercept click trên ad link → gọi `POST /api/ads/track/click/:id` với `referrer_page`
    - Sau khi track xong (hoặc timeout 500ms) → redirect đến product link
    - _Requirements: 8.1_

- [x] 9. Frontend `ads.css` — Styles
  - Tạo `ads.css` với: `.ad-card`, `.ad-card.vip` (border vàng, badge "VIP"), `.ad-banner`, `.ad-slot-top-vip`
  - Responsive cho mobile
  - _Requirements: 6.4, 6.5_

- [x] 10. Inject ad slots vào các trang
  - [x] 10.1 Inject vào `index.html`: `banner_header` và `banner_sidebar`
    - Thêm `<div id="ad-banner-header">` và `<div id="ad-banner-sidebar">`
    - Load `ads.js` và gọi `loadAdSlot('banner_header', 'ad-banner-header')` v.v.
    - _Requirements: 6.6_

  - [x] 10.2 Inject vào `blog.html`: `banner_sidebar` và `banner_mid_article`
    - _Requirements: 6.6_

  - [x] 10.3 Inject vào `blog-post.html`: `top_vip`, `pinned_post`, `banner_mid_article`
    - _Requirements: 6.6_

- [x] 11. Final checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks đánh dấu `*` là optional, có thể skip để ra MVP nhanh hơn
- Mỗi task reference requirements cụ thể để traceability
- Scheduler khởi động trong `server/index.js` sau khi DB ready
- Rate limit 30 req/min/IP cho `/api/ads/*` (Requirement 11.1) — thêm limiter riêng trong index.js
- `ip_hash` dùng `crypto.createHash('sha256')` từ Node built-in, không lưu IP thô (Requirement 11.2)
