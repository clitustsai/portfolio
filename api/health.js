module.exports = async (req, res) => {
  const dbUrl = process.env.DATABASE_URL || 'NOT SET';
  const masked = dbUrl.replace(/:([^@]+)@/, ':***@');
  let dbStatus = 'not tested';
  try {
    const { query } = require('./_db');
    await query('SELECT 1');
    dbStatus = 'connected';
  } catch (e) {
    dbStatus = 'error: ' + e.message;
  }
  res.json({ status: 'ok', time: new Date().toISOString(), db: masked, dbStatus });
};
