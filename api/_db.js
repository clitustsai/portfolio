const { Pool } = require('pg');
let pool;
function getPool() {
    if (!pool) pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false }, max: 10 });
    return pool;
}
async function query(sql, params = []) { const r = await getPool().query(sql, params); return r.rows; }
async function queryOne(sql, params = []) { return (await query(sql, params))[0] || null; }
async function run(sql, params = []) { await getPool().query(sql, params); }
module.exports = { query, queryOne, run };
