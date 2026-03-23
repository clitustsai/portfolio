# Requirements Document

## Introduction

Ad Marketplace là hệ thống cho thuê đặt link quảng cáo tích hợp vào portfolio website hiện có (Node.js/Express + SQLite + vanilla JS, deploy trên Render). Hệ thống cho phép người dùng (người thuê quảng cáo) đăng ký, đăng sản phẩm Shopee / TikTok Shop / affiliate, thanh toán để hiển thị quảng cáo, và theo dõi hiệu quả qua dashboard. Admin duyệt quảng cáo, quản lý doanh thu. AI hỗ trợ viết mô tả sản phẩm và gợi ý boost. Hệ thống tracking đếm click và lượt xem theo thời gian thực.

---

## Glossary

- **Ad_System**: Toàn bộ hệ thống Ad Marketplace
- **Advertiser**: Người dùng đã đăng ký và thuê quảng cáo
- **Ad**: Một mục quảng cáo gồm tên sản phẩm, link (Shopee / TikTok Shop / affiliate), ảnh, giá, và trạng thái
- **Ad_Slot**: Vị trí hiển thị quảng cáo (Top VIP, Ghim bài viết, Banner Header, Banner Sidebar, Banner giữa bài)
- **Admin**: Quản trị viên có quyền duyệt, ẩn, xóa quảng cáo và xem doanh thu
- **AI_Writer**: Module AI dùng OpenRouter API để viết mô tả sản phẩm và gợi ý boost
- **Payment_Gateway**: Cổng thanh toán hỗ trợ Stripe và PayPal
- **Tracker**: Module đếm click và lượt xem quảng cáo
- **Dashboard**: Giao diện thống kê dành cho Advertiser
- **Admin_Panel**: Giao diện quản trị dành cho Admin
- **Boost**: Tính năng trả thêm phí để đẩy quảng cáo lên vị trí Top VIP
- **Click_Event**: Sự kiện ghi nhận khi người dùng nhấn vào link quảng cáo
- **Impression_Event**: Sự kiện ghi nhận khi quảng cáo xuất hiện trong viewport của người dùng

---

## Requirements

### Requirement 1: Đăng ký và đăng nhập Advertiser

**User Story:** As an Advertiser, I want to register and log in to an account, so that I can manage my ads and payment history.

#### Acceptance Criteria

1. THE Ad_System SHALL reuse the existing `/api/auth/register` and `/api/auth/login` endpoints for Advertiser authentication.
2. WHEN an Advertiser registers successfully, THE Ad_System SHALL assign the role `advertiser` to the new account.
3. WHEN an Advertiser submits login credentials, THE Ad_System SHALL return a JWT token valid for 30 days.
4. IF an Advertiser submits an email that already exists, THEN THE Ad_System SHALL return HTTP 409 with a Vietnamese error message.
5. WHILE an Advertiser is authenticated, THE Ad_System SHALL include the JWT in all subsequent API requests via the `Authorization: Bearer` header.

---

### Requirement 2: Đăng quảng cáo sản phẩm

**User Story:** As an Advertiser, I want to submit a product ad with name, link, image, and price, so that my product can be displayed on the website.

#### Acceptance Criteria

1. WHEN an authenticated Advertiser submits an ad form, THE Ad_System SHALL accept the fields: `product_name` (max 200 chars), `link` (Shopee / TikTok Shop / affiliate URL), `image_url`, `price` (VND, integer ≥ 0), `description` (max 1000 chars), `platform` (enum: `shopee` | `tiktok` | `affiliate`).
2. IF the `link` field does not match a valid URL pattern, THEN THE Ad_System SHALL return HTTP 400 with the message "Link không hợp lệ".
3. WHEN an ad is submitted successfully, THE Ad_System SHALL set the ad status to `pending` and return HTTP 201.
4. THE Ad_System SHALL limit each Advertiser to a maximum of 20 active ads at any time.
5. IF an Advertiser already has 20 active ads, THEN THE Ad_System SHALL return HTTP 429 with the message "Đã đạt giới hạn 20 quảng cáo đang hoạt động".

---

### Requirement 3: AI viết mô tả sản phẩm

**User Story:** As an Advertiser, I want AI to generate a product description from the product name and link, so that I don't have to write it manually.

#### Acceptance Criteria

1. WHEN an Advertiser requests AI description generation with a `product_name` and `platform`, THE AI_Writer SHALL call the OpenRouter API and return a Vietnamese product description of 50–150 words.
2. IF the OpenRouter API is unavailable, THEN THE AI_Writer SHALL return a template-based fallback description within 2 seconds.
3. THE Ad_System SHALL limit AI description generation to 10 requests per Advertiser per day.
4. IF an Advertiser exceeds 10 AI requests per day, THEN THE Ad_System SHALL return HTTP 429 with the message "Đã dùng hết 10 lượt AI hôm nay".
5. WHEN AI generates a description, THE AI_Writer SHALL return the text in the response body so the Advertiser can edit before saving.

---

### Requirement 4: Thanh toán để hiển thị quảng cáo

**User Story:** As an Advertiser, I want to pay via Stripe or PayPal to activate my ad, so that it appears on the website.

#### Acceptance Criteria

1. WHEN an Advertiser initiates payment for an ad, THE Payment_Gateway SHALL support two methods: Stripe Checkout and PayPal Orders API.
2. WHEN a Stripe payment succeeds (webhook `checkout.session.completed`), THE Ad_System SHALL set the ad status to `paid` and record the transaction with amount, currency, and timestamp.
3. WHEN a PayPal payment is captured successfully, THE Ad_System SHALL set the ad status to `paid` and record the transaction.
4. IF a payment fails or is cancelled, THEN THE Ad_System SHALL keep the ad status as `pending` and return an appropriate error message.
5. THE Ad_System SHALL support the following pricing tiers: Standard (hiển thị 7 ngày, 50,000 VND), Premium (hiển thị 30 ngày + Sidebar, 150,000 VND), VIP Boost (Top VIP 7 ngày, 300,000 VND).
6. WHEN an ad's display period expires, THE Ad_System SHALL automatically set the ad status to `expired`.

---

### Requirement 5: Duyệt quảng cáo (Admin)

**User Story:** As an Admin, I want to review and approve or reject submitted ads, so that spam and fraudulent content is prevented.

#### Acceptance Criteria

1. WHEN an ad status is `paid`, THE Admin_Panel SHALL display the ad in the approval queue.
2. WHEN an Admin approves an ad, THE Ad_System SHALL set the ad status to `active` and begin the display period countdown.
3. WHEN an Admin rejects an ad, THE Ad_System SHALL set the ad status to `rejected` and store a rejection reason (max 500 chars).
4. THE Admin_Panel SHALL allow Admin to edit `product_name`, `description`, and `image_url` of any ad.
5. THE Admin_Panel SHALL allow Admin to hide an active ad by setting status to `hidden` without deleting it.
6. THE Admin_Panel SHALL allow Admin to permanently delete any ad.
7. THE Ad_System SHALL use the existing `requireAdmin` middleware (header `x-admin-token`) for all Admin endpoints.

---

### Requirement 6: Hệ thống hiển thị quảng cáo

**User Story:** As a website visitor, I want to see relevant product ads in designated slots, so that I can discover products on Shopee and TikTok Shop.

#### Acceptance Criteria

1. THE Ad_System SHALL support five Ad_Slot types: `top_vip` (đầu trang, nổi bật), `pinned_post` (ghim trong bài blog), `banner_header`, `banner_sidebar`, `banner_mid_article`.
2. WHEN the frontend requests ads for a slot, THE Ad_System SHALL return only ads with status `active` and a non-expired display period, ordered by `boost_score DESC, activated_at ASC`.
3. THE Ad_System SHALL return a maximum of 5 ads per slot per request.
4. WHEN an ad has `slot = top_vip`, THE Ad_System SHALL render it with a highlighted card style (border, badge "VIP").
5. WHEN an ad has `slot = banner_header` or `banner_sidebar` or `banner_mid_article`, THE Ad_System SHALL render it as an image banner with the product link.
6. THE Ad_System SHALL inject ad slots into `index.html`, `blog.html`, and `blog-post.html` pages.

---

### Requirement 7: Auto Boost

**User Story:** As an Advertiser, I want to pay extra to boost my ad to the top position automatically, so that my product gets more visibility without manual intervention.

#### Acceptance Criteria

1. WHEN an Advertiser purchases a VIP Boost tier, THE Ad_System SHALL set `boost_score = 100` for that ad.
2. WHEN an ad's boost period expires (7 days), THE Ad_System SHALL reset `boost_score = 0` automatically via a scheduled job running every hour.
3. WHILE `boost_score > 0`, THE Ad_System SHALL display the ad in the `top_vip` slot above non-boosted ads.
4. THE AI_Writer SHALL analyze all active ads and return a ranked list of up to 5 ads with the highest estimated click potential, based on `platform`, `price`, and historical `click_count`.

---

### Requirement 8: Tracking click và lượt xem

**User Story:** As an Advertiser, I want to track how many clicks and impressions my ads receive, so that I can evaluate ad performance.

#### Acceptance Criteria

1. WHEN a visitor clicks an ad link, THE Tracker SHALL record a Click_Event with `ad_id`, `timestamp`, and `referrer_page` before redirecting to the product link.
2. WHEN an ad enters the visitor's viewport (Intersection Observer, threshold 50%), THE Tracker SHALL record an Impression_Event with `ad_id` and `timestamp`.
3. THE Tracker SHALL deduplicate Impression_Events from the same browser session within a 30-minute window to avoid inflated counts.
4. THE Ad_System SHALL expose `GET /api/ads/:id/stats` returning `{ click_count, impression_count, ctr }` where `ctr = click_count / impression_count` (rounded to 4 decimal places), accessible only to the owning Advertiser or Admin.
5. IF `impression_count = 0`, THEN THE Ad_System SHALL return `ctr = 0` instead of dividing by zero.

---

### Requirement 9: Dashboard Advertiser

**User Story:** As an Advertiser, I want a dashboard showing my ad performance and payment history, so that I can make informed decisions about my campaigns.

#### Acceptance Criteria

1. WHEN an authenticated Advertiser accesses the dashboard, THE Dashboard SHALL display: total ads, active ads, total clicks, total impressions, and total spend (VND).
2. THE Dashboard SHALL display a list of the Advertiser's ads with columns: product name, status, slot, click count, impression count, CTR, display period remaining (days).
3. WHEN an Advertiser selects an ad, THE Dashboard SHALL show a time-series chart of daily clicks and impressions for the last 30 days.
4. THE Dashboard SHALL display payment history with columns: date, plan, amount (VND), payment method, status.
5. WHEN an ad status is `rejected`, THE Dashboard SHALL display the rejection reason provided by Admin.

---

### Requirement 10: Quản lý doanh thu (Admin)

**User Story:** As an Admin, I want to view revenue reports and payment records, so that I can track income from the ad marketplace.

#### Acceptance Criteria

1. THE Admin_Panel SHALL display total revenue (VND) grouped by: today, this week, this month, all time.
2. THE Admin_Panel SHALL display a paginated list of all transactions with columns: Advertiser email, plan, amount, payment method, payment date, ad ID.
3. THE Admin_Panel SHALL display the count of ads by status: `pending`, `paid`, `active`, `expired`, `rejected`, `hidden`.
4. WHEN an Admin filters transactions by date range, THE Admin_Panel SHALL return only transactions within the specified range.
5. THE Admin_Panel SHALL display the top 10 Advertisers by total spend in descending order.

---

### Requirement 11: Bảo mật và chống lạm dụng

**User Story:** As an Admin, I want the system to enforce rate limits and input validation, so that the platform is protected from abuse and injection attacks.

#### Acceptance Criteria

1. THE Ad_System SHALL apply a rate limit of 30 requests per minute per IP on all `/api/ads/*` endpoints.
2. THE Ad_System SHALL sanitize all text inputs (product_name, description) by stripping HTML tags before storing in the database.
3. IF a `link` field contains a non-HTTP/HTTPS scheme (e.g., `javascript:`, `data:`), THEN THE Ad_System SHALL reject the request with HTTP 400.
4. THE Ad_System SHALL validate that `image_url` is either a valid HTTPS URL or an empty string before storing.
5. THE Ad_System SHALL store all payment webhook events in a `webhook_logs` table for audit purposes, including raw payload and processing status.
