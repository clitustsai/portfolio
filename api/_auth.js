const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const JWT_SECRET = process.env.JWT_SECRET || 'clituspc_jwt_secret_2026';
function hashPassword(pw) { return crypto.createHash('sha256').update(pw + 'clituspc_salt_2026').digest('hex'); }
function signJWT(payload) { return jwt.sign(payload, JWT_SECRET, { expiresIn: '30d' }); }
function verifyJWT(token) { try { return jwt.verify(token, JWT_SECRET); } catch { return null; } }
function getAuthToken(req) { const a = req.headers['authorization']; if (a?.startsWith('Bearer ')) return a.slice(7); return req.headers['x-user-token'] || null; }
function genToken() { return crypto.randomBytes(16).toString('hex'); }
module.exports = { hashPassword, signJWT, verifyJWT, getAuthToken, genToken };
