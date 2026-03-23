const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, 'portfolio.db');

let db;

async function getDb() {
    if (db) return db;
    const SQL = await initSqlJs();
    if (fs.existsSync(DB_PATH)) {
        const fileBuffer = fs.readFileSync(DB_PATH);
        db = new SQL.Database(fileBuffer);
    } else {
        db = new SQL.Database();
    }
    // Tạo bảng — dùng exec() để chạy multi-statement
    db.exec(`
        CREATE TABLE IF NOT EXISTS comments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT,
            text TEXT NOT NULL,
            rating INTEGER NOT NULL DEFAULT 5,
            likes INTEGER NOT NULL DEFAULT 0,
            created_at DATETIME DEFAULT (datetime('now'))
        );
        CREATE TABLE IF NOT EXISTS messages (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT,
            subject TEXT,
            message TEXT NOT NULL,
            read INTEGER NOT NULL DEFAULT 0,
            created_at DATETIME DEFAULT (datetime('now'))
        );
        CREATE TABLE IF NOT EXISTS project_stats (
            project_id INTEGER PRIMARY KEY,
            views INTEGER NOT NULL DEFAULT 0,
            likes INTEGER NOT NULL DEFAULT 0
        );
        CREATE TABLE IF NOT EXISTS site_stats (
            key TEXT PRIMARY KEY,
            value INTEGER NOT NULL DEFAULT 0
        );
        INSERT OR IGNORE INTO project_stats (project_id, views, likes) VALUES (1, 142, 38);
        INSERT OR IGNORE INTO project_stats (project_id, views, likes) VALUES (2, 97, 21);
        INSERT OR IGNORE INTO project_stats (project_id, views, likes) VALUES (3, 215, 54);
        INSERT OR IGNORE INTO site_stats (key, value) VALUES ('total_views', 1284);
        INSERT OR IGNORE INTO site_stats (key, value) VALUES ('total_likes', 113);
        CREATE TABLE IF NOT EXISTS push_subscriptions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            endpoint TEXT UNIQUE NOT NULL,
            p256dh TEXT,
            auth TEXT,
            created_at DATETIME DEFAULT (datetime('now'))
        );
        CREATE TABLE IF NOT EXISTS blog_posts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            slug TEXT UNIQUE NOT NULL,
            excerpt TEXT,
            content TEXT,
            cover TEXT,
            tags TEXT DEFAULT '[]',
            views INTEGER DEFAULT 0,
            likes INTEGER DEFAULT 0,
            read_time INTEGER DEFAULT 5,
            published INTEGER DEFAULT 1,
            created_at DATETIME DEFAULT (datetime('now')),
            updated_at DATETIME DEFAULT (datetime('now'))
        );
        CREATE TABLE IF NOT EXISTS blog_comments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            post_id INTEGER NOT NULL,
            name TEXT NOT NULL,
            text TEXT NOT NULL,
            created_at DATETIME DEFAULT (datetime('now'))
        );
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            avatar TEXT DEFAULT '',
            oauth_provider TEXT DEFAULT '',
            oauth_id TEXT DEFAULT '',
            role TEXT NOT NULL DEFAULT 'free',
            created_at DATETIME DEFAULT (datetime('now'))
        );
        CREATE TABLE IF NOT EXISTS user_sessions (
            token TEXT PRIMARY KEY,
            user_id INTEGER NOT NULL,
            expires_at DATETIME NOT NULL,
            created_at DATETIME DEFAULT (datetime('now'))
        );
        CREATE TABLE IF NOT EXISTS user_usage (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            tool TEXT NOT NULL,
            date TEXT NOT NULL,
            count INTEGER NOT NULL DEFAULT 0,
            UNIQUE(user_id, tool, date)
        );
        CREATE TABLE IF NOT EXISTS user_ai_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            tool TEXT NOT NULL,
            input TEXT DEFAULT '',
            created_at DATETIME DEFAULT (datetime('now'))
        );
        CREATE TABLE IF NOT EXISTS invoices (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            invoice_id TEXT UNIQUE NOT NULL,
            client_name TEXT NOT NULL,
            client_email TEXT NOT NULL,
            client_phone TEXT DEFAULT '',
            items_json TEXT DEFAULT '[]',
            total REAL DEFAULT 0,
            note TEXT DEFAULT '',
            created_at DATETIME DEFAULT (datetime('now'))
        );
        CREATE TABLE IF NOT EXISTS subscriptions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            email TEXT NOT NULL,
            name TEXT NOT NULL,
            plan TEXT NOT NULL DEFAULT 'vip',
            price INTEGER NOT NULL DEFAULT 99000,
            status TEXT NOT NULL DEFAULT 'pending',
            transfer_ref TEXT DEFAULT '',
            expires_at DATETIME,
            activated_at DATETIME,
            created_at DATETIME DEFAULT (datetime('now'))
        );
        CREATE TABLE IF NOT EXISTS user_coins (
            user_id INTEGER PRIMARY KEY,
            coins INTEGER NOT NULL DEFAULT 0,
            total_earned INTEGER NOT NULL DEFAULT 0,
            updated_at DATETIME DEFAULT (datetime('now'))
        );
        CREATE TABLE IF NOT EXISTS coin_transactions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            amount INTEGER NOT NULL,
            type TEXT NOT NULL,
            note TEXT DEFAULT '',
            created_at DATETIME DEFAULT (datetime('now'))
        );
        CREATE TABLE IF NOT EXISTS daily_rewards (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            streak INTEGER NOT NULL DEFAULT 1,
            coins_earned INTEGER NOT NULL DEFAULT 10,
            claimed_date TEXT NOT NULL,
            UNIQUE(user_id, claimed_date)
        );
        CREATE TABLE IF NOT EXISTS game_scores (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            game TEXT NOT NULL,
            score INTEGER NOT NULL DEFAULT 0,
            coins_earned INTEGER NOT NULL DEFAULT 0,
            played_at DATETIME DEFAULT (datetime('now'))
        );
        CREATE TABLE IF NOT EXISTS password_resets (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            token TEXT UNIQUE NOT NULL,
            expires_at DATETIME NOT NULL,
            used INTEGER DEFAULT 0,
            created_at DATETIME DEFAULT (datetime('now'))
        );
        CREATE TABLE IF NOT EXISTS spin_rewards (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            spun_date TEXT NOT NULL,
            coins_earned INTEGER NOT NULL DEFAULT 0,
            UNIQUE(user_id, spun_date)
        );
        CREATE TABLE IF NOT EXISTS referrals (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            referrer_id INTEGER NOT NULL,
            referred_id INTEGER NOT NULL,
            code TEXT NOT NULL,
            coins_given INTEGER NOT NULL DEFAULT 0,
            created_at DATETIME DEFAULT (datetime('now'))
        );
        CREATE TABLE IF NOT EXISTS phone_otps (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            phone TEXT NOT NULL,
            otp_hash TEXT NOT NULL,
            purpose TEXT NOT NULL DEFAULT 'login',
            expires_at DATETIME NOT NULL,
            used INTEGER DEFAULT 0,
            attempt_count INTEGER DEFAULT 0,
            created_at DATETIME DEFAULT (datetime('now'))
        );
        CREATE TABLE IF NOT EXISTS chat_messages (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            username TEXT NOT NULL,
            avatar TEXT DEFAULT '',
            role TEXT DEFAULT 'free',
            room TEXT NOT NULL DEFAULT 'general',
            message TEXT NOT NULL,
            msg_type TEXT DEFAULT 'text',
            reply_to INTEGER DEFAULT NULL,
            reactions TEXT DEFAULT '{}',
            pinned INTEGER DEFAULT 0,
            sticker TEXT DEFAULT '',
            created_at DATETIME DEFAULT (datetime('now'))
        );
        CREATE TABLE IF NOT EXISTS chat_ads (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            text TEXT NOT NULL,
            url TEXT DEFAULT '',
            active INTEGER DEFAULT 1,
            created_at DATETIME DEFAULT (datetime('now'))
        );
        INSERT OR IGNORE INTO chat_ads (id, text, url) VALUES (1, '👑 Nâng VIP 99k/tháng — Dùng không giới hạn AI Tools + Chat VIP riêng!', '/payment.html');
        CREATE TABLE IF NOT EXISTS ads (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
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
            boost_expires_at DATETIME DEFAULT NULL,
            display_days INTEGER NOT NULL DEFAULT 7,
            activated_at DATETIME DEFAULT NULL,
            expires_at DATETIME DEFAULT NULL,
            rejection_reason TEXT DEFAULT '',
            created_at DATETIME DEFAULT (datetime('now'))
        );
        CREATE TABLE IF NOT EXISTS ad_transactions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            ad_id INTEGER NOT NULL,
            user_id INTEGER NOT NULL,
            plan TEXT NOT NULL DEFAULT 'standard',
            amount INTEGER NOT NULL,
            currency TEXT NOT NULL DEFAULT 'VND',
            payment_method TEXT NOT NULL,
            payment_id TEXT DEFAULT '',
            status TEXT NOT NULL DEFAULT 'pending',
            created_at DATETIME DEFAULT (datetime('now'))
        );
        CREATE TABLE IF NOT EXISTS ad_clicks (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            ad_id INTEGER NOT NULL,
            referrer_page TEXT DEFAULT '',
            ip_hash TEXT DEFAULT '',
            created_at DATETIME DEFAULT (datetime('now'))
        );
        CREATE TABLE IF NOT EXISTS ad_impressions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            ad_id INTEGER NOT NULL,
            session_id TEXT DEFAULT '',
            created_at DATETIME DEFAULT (datetime('now'))
        );
        CREATE TABLE IF NOT EXISTS webhook_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            provider TEXT NOT NULL,
            event_type TEXT NOT NULL,
            payload TEXT NOT NULL,
            status TEXT NOT NULL DEFAULT 'received',
            created_at DATETIME DEFAULT (datetime('now'))
        );
    `);
    // Migrate: thêm cột mới nếu chưa có (cho DB cũ)
    try { db.exec(`ALTER TABLE users ADD COLUMN role TEXT NOT NULL DEFAULT 'free'`); } catch(e) {}
    try { db.exec(`ALTER TABLE users ADD COLUMN oauth_provider TEXT DEFAULT ''`); } catch(e) {}
    try { db.exec(`ALTER TABLE users ADD COLUMN oauth_id TEXT DEFAULT ''`); } catch(e) {}
    try { db.exec(`ALTER TABLE users ADD COLUMN avatar TEXT DEFAULT ''`); } catch(e) {}
    try { db.exec(`ALTER TABLE chat_messages ADD COLUMN msg_type TEXT DEFAULT 'text'`); } catch(e) {}
    try { db.exec(`ALTER TABLE chat_messages ADD COLUMN pinned INTEGER DEFAULT 0`); } catch(e) {}
    try { db.exec(`ALTER TABLE chat_messages ADD COLUMN sticker TEXT DEFAULT ''`); } catch(e) {}
    try { db.exec(`CREATE TABLE IF NOT EXISTS password_resets (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL, token TEXT UNIQUE NOT NULL, expires_at DATETIME NOT NULL, used INTEGER DEFAULT 0, created_at DATETIME DEFAULT (datetime('now')))`); } catch(e) {}
    try { db.exec(`ALTER TABLE users ADD COLUMN referral_code TEXT DEFAULT ''`); } catch(e) {}
    try { db.exec(`ALTER TABLE users ADD COLUMN phone TEXT DEFAULT ''`); } catch(e) {}
    try { db.exec(`CREATE TABLE IF NOT EXISTS spin_rewards (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL, spun_date TEXT NOT NULL, coins_earned INTEGER NOT NULL DEFAULT 0, UNIQUE(user_id, spun_date))`); } catch(e) {}
    try { db.exec(`CREATE TABLE IF NOT EXISTS referrals (id INTEGER PRIMARY KEY AUTOINCREMENT, referrer_id INTEGER NOT NULL, referred_id INTEGER NOT NULL, code TEXT NOT NULL, coins_given INTEGER NOT NULL DEFAULT 0, created_at DATETIME DEFAULT (datetime('now')))`); } catch(e) {}
    try { db.exec(`CREATE TABLE IF NOT EXISTS phone_otps (id INTEGER PRIMARY KEY AUTOINCREMENT, phone TEXT NOT NULL, otp_hash TEXT NOT NULL, purpose TEXT NOT NULL DEFAULT 'login', expires_at DATETIME NOT NULL, used INTEGER DEFAULT 0, attempt_count INTEGER DEFAULT 0, created_at DATETIME DEFAULT (datetime('now')))`); } catch(e) {}
    try { db.exec(`CREATE TABLE IF NOT EXISTS pr_posts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        excerpt TEXT DEFAULT '',
        image_url TEXT DEFAULT '',
        link TEXT DEFAULT '',
        contact TEXT DEFAULT '',
        plan TEXT NOT NULL DEFAULT 'standard',
        amount INTEGER NOT NULL DEFAULT 0,
        payment_method TEXT DEFAULT 'acb',
        status TEXT NOT NULL DEFAULT 'pending',
        rejection_reason TEXT DEFAULT '',
        display_days INTEGER NOT NULL DEFAULT 7,
        activated_at DATETIME DEFAULT NULL,
        expires_at DATETIME DEFAULT NULL,
        views INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT (datetime('now'))
    )`); } catch(e) {}

    save();
    return db;
}

function save() {
    if (!db) return;
    const data = db.export();
    fs.writeFileSync(DB_PATH, Buffer.from(data));
}

// Helper: chạy query và tự save
function run(sql, params = []) {
    db.run(sql, params);
    save();
}

function all(sql, params = []) {
    const stmt = db.prepare(sql);
    stmt.bind(params);
    const rows = [];
    while (stmt.step()) rows.push(stmt.getAsObject());
    stmt.free();
    return rows;
}

function get(sql, params = []) {
    return all(sql, params)[0] || null;
}

module.exports = { getDb, run, all, get, save };
