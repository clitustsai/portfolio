-- ============================================
-- SUPABASE SCHEMA — Portfolio Backend
-- Chạy file này trong Supabase SQL Editor
-- ============================================

-- Comments
CREATE TABLE IF NOT EXISTS comments (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT DEFAULT '',
    text TEXT NOT NULL,
    rating INTEGER NOT NULL DEFAULT 5,
    likes INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Messages (contact form)
CREATE TABLE IF NOT EXISTS messages (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT DEFAULT '',
    subject TEXT DEFAULT '',
    message TEXT NOT NULL,
    read INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Project stats
CREATE TABLE IF NOT EXISTS project_stats (
    project_id INTEGER PRIMARY KEY,
    views INTEGER NOT NULL DEFAULT 0,
    likes INTEGER NOT NULL DEFAULT 0
);
INSERT INTO project_stats (project_id, views, likes) VALUES (1, 142, 38),(2, 97, 21),(3, 215, 54) ON CONFLICT DO NOTHING;

-- Site stats
CREATE TABLE IF NOT EXISTS site_stats (
    key TEXT PRIMARY KEY,
    value INTEGER NOT NULL DEFAULT 0
);
INSERT INTO site_stats (key, value) VALUES ('total_views', 1284),('total_likes', 113) ON CONFLICT DO NOTHING;

-- Push subscriptions
CREATE TABLE IF NOT EXISTS push_subscriptions (
    id SERIAL PRIMARY KEY,
    endpoint TEXT UNIQUE NOT NULL,
    p256dh TEXT DEFAULT '',
    auth TEXT DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Blog posts
CREATE TABLE IF NOT EXISTS blog_posts (
    id SERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    excerpt TEXT DEFAULT '',
    content TEXT DEFAULT '',
    cover TEXT DEFAULT '',
    tags JSONB DEFAULT '[]',
    views INTEGER DEFAULT 0,
    likes INTEGER DEFAULT 0,
    read_time INTEGER DEFAULT 5,
    published INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Blog comments
CREATE TABLE IF NOT EXISTS blog_comments (
    id SERIAL PRIMARY KEY,
    post_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    text TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Users
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL DEFAULT '',
    avatar TEXT DEFAULT '',
    oauth_provider TEXT DEFAULT '',
    oauth_id TEXT DEFAULT '',
    role TEXT NOT NULL DEFAULT 'free',
    referral_code TEXT DEFAULT '',
    phone TEXT DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- User sessions
CREATE TABLE IF NOT EXISTS user_sessions (
    token TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- User usage
CREATE TABLE IF NOT EXISTS user_usage (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    tool TEXT NOT NULL,
    date TEXT NOT NULL,
    count INTEGER NOT NULL DEFAULT 0,
    UNIQUE(user_id, tool, date)
);

-- User AI history
CREATE TABLE IF NOT EXISTS user_ai_history (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    tool TEXT NOT NULL,
    input TEXT DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Invoices
CREATE TABLE IF NOT EXISTS invoices (
    id SERIAL PRIMARY KEY,
    invoice_id TEXT UNIQUE NOT NULL,
    client_name TEXT NOT NULL,
    client_email TEXT NOT NULL,
    client_phone TEXT DEFAULT '',
    items_json JSONB DEFAULT '[]',
    total REAL DEFAULT 0,
    note TEXT DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Subscriptions
CREATE TABLE IF NOT EXISTS subscriptions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER,
    email TEXT NOT NULL,
    name TEXT NOT NULL,
    plan TEXT NOT NULL DEFAULT 'vip',
    price INTEGER NOT NULL DEFAULT 99000,
    status TEXT NOT NULL DEFAULT 'pending',
    transfer_ref TEXT DEFAULT '',
    expires_at TIMESTAMPTZ,
    activated_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- User coins
CREATE TABLE IF NOT EXISTS user_coins (
    user_id INTEGER PRIMARY KEY,
    coins INTEGER NOT NULL DEFAULT 0,
    total_earned INTEGER NOT NULL DEFAULT 0,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Coin transactions
CREATE TABLE IF NOT EXISTS coin_transactions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    amount INTEGER NOT NULL,
    type TEXT NOT NULL,
    note TEXT DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Daily rewards
CREATE TABLE IF NOT EXISTS daily_rewards (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    streak INTEGER NOT NULL DEFAULT 1,
    coins_earned INTEGER NOT NULL DEFAULT 0,
    claimed_date TEXT NOT NULL,
    UNIQUE(user_id, claimed_date)
);

-- Game scores
CREATE TABLE IF NOT EXISTS game_scores (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    game TEXT NOT NULL,
    score INTEGER NOT NULL DEFAULT 0,
    coins_earned INTEGER NOT NULL DEFAULT 0,
    played_at TIMESTAMPTZ DEFAULT NOW()
);

-- Password resets
CREATE TABLE IF NOT EXISTS password_resets (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    token TEXT UNIQUE NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    used INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Spin rewards
CREATE TABLE IF NOT EXISTS spin_rewards (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    spun_date TEXT NOT NULL,
    coins_earned INTEGER NOT NULL DEFAULT 0,
    UNIQUE(user_id, spun_date)
);

-- Referrals
CREATE TABLE IF NOT EXISTS referrals (
    id SERIAL PRIMARY KEY,
    referrer_id INTEGER NOT NULL,
    referred_id INTEGER NOT NULL,
    code TEXT NOT NULL,
    coins_given INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Phone OTPs
CREATE TABLE IF NOT EXISTS phone_otps (
    id SERIAL PRIMARY KEY,
    phone TEXT NOT NULL,
    otp_hash TEXT NOT NULL,
    purpose TEXT NOT NULL DEFAULT 'login',
    expires_at TIMESTAMPTZ NOT NULL,
    used INTEGER DEFAULT 0,
    attempt_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Chat messages
CREATE TABLE IF NOT EXISTS chat_messages (
    id SERIAL PRIMARY KEY,
    user_id INTEGER,
    username TEXT NOT NULL,
    avatar TEXT DEFAULT '',
    role TEXT DEFAULT 'free',
    room TEXT NOT NULL DEFAULT 'general',
    message TEXT NOT NULL,
    msg_type TEXT DEFAULT 'text',
    reply_to INTEGER DEFAULT NULL,
    reactions JSONB DEFAULT '{}',
    pinned INTEGER DEFAULT 0,
    sticker TEXT DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Chat ads
CREATE TABLE IF NOT EXISTS chat_ads (
    id SERIAL PRIMARY KEY,
    text TEXT NOT NULL,
    url TEXT DEFAULT '',
    active INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
INSERT INTO chat_ads (id, text, url) VALUES (1, '👑 Nâng VIP 99k/tháng — Dùng không giới hạn AI Tools + Chat VIP riêng!', '/payment.html') ON CONFLICT DO NOTHING;

-- Ads
CREATE TABLE IF NOT EXISTS ads (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    product_name TEXT NOT NULL,
    link TEXT NOT NULL,
    image_url TEXT DEFAULT '',
    price INTEGER NOT NULL DEFAULT 0,
    description TEXT DEFAULT '',
    platform TEXT NOT NULL DEFAULT 'shopee',
    slot TEXT NOT NULL DEFAULT 'banner_sidebar',
    status TEXT NOT NULL DEFAULT 'pending',
    boost_score INTEGER NOT NULL DEFAULT 0,
    boost_expires_at TIMESTAMPTZ DEFAULT NULL,
    display_days INTEGER NOT NULL DEFAULT 7,
    activated_at TIMESTAMPTZ DEFAULT NULL,
    expires_at TIMESTAMPTZ DEFAULT NULL,
    rejection_reason TEXT DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ad transactions
CREATE TABLE IF NOT EXISTS ad_transactions (
    id SERIAL PRIMARY KEY,
    ad_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    plan TEXT NOT NULL DEFAULT 'standard',
    amount INTEGER NOT NULL,
    currency TEXT NOT NULL DEFAULT 'VND',
    payment_method TEXT NOT NULL,
    payment_id TEXT DEFAULT '',
    status TEXT NOT NULL DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ad clicks
CREATE TABLE IF NOT EXISTS ad_clicks (
    id SERIAL PRIMARY KEY,
    ad_id INTEGER NOT NULL,
    referrer_page TEXT DEFAULT '',
    ip_hash TEXT DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ad impressions
CREATE TABLE IF NOT EXISTS ad_impressions (
    id SERIAL PRIMARY KEY,
    ad_id INTEGER NOT NULL,
    session_id TEXT DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Webhook logs
CREATE TABLE IF NOT EXISTS webhook_logs (
    id SERIAL PRIMARY KEY,
    provider TEXT NOT NULL,
    event_type TEXT NOT NULL,
    payload TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'received',
    created_at TIMESTAMPTZ DEFAULT NOW()
);
