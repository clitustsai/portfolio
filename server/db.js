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
    // Tạo bảng
    db.run(`
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
    `);
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
