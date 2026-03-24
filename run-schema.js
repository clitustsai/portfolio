const { Pool } = require('pg');
const fs = require('fs');

const pool = new Pool({
    connectionString: 'postgresql://postgres:tuuannkiet1402200022433483579@db.uavmzyibazhfudlzwynb.supabase.co:5432/postgres',
    ssl: { rejectUnauthorized: false }
});

const sql = fs.readFileSync('supabase-schema.sql', 'utf8');

pool.query(sql)
    .then(() => console.log('✅ Schema created successfully!'))
    .catch(e => console.log('❌ Error:', e.message))
    .finally(() => pool.end());
