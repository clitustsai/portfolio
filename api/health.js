module.exports = (req, res) => {
  const dbUrl = process.env.DATABASE_URL || 'NOT SET';
  // Mask password for safety
  const masked = dbUrl.replace(/:([^@]+)@/, ':***@');
  res.json({ status: 'ok', time: new Date().toISOString(), db: masked });
};
