// src/middleware/auth.js — JWT authentication middleware
const jwt = require('jsonwebtoken');
const pool = require('../config/db');

/**
 * Verifies the Bearer token in the Authorization header.
 * Attaches req.user = { id, email, full_name } on success.
 */
const authenticate = async (req, res, next) => {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided.' });
  }

  const token = header.slice(7);
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    // Confirm the user still exists in the database
    const [rows] = await pool.query(
      'SELECT user_id, email, full_name, is_verified FROM users WHERE user_id = ?',
      [payload.id]
    );
    if (rows.length === 0) {
      return res.status(401).json({ error: 'User not found.' });
    }
    const user = rows[0];
    if (!user.is_verified) {
      return res.status(403).json({ error: 'Email not verified.' });
    }
    req.user = { id: user.user_id, email: user.email, full_name: user.full_name };
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired.' });
    }
    return res.status(401).json({ error: 'Invalid token.' });
  }
};

module.exports = { authenticate };
