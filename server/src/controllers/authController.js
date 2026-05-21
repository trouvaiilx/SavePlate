// src/controllers/authController.js
const bcrypt = require('bcrypt');
const jwt    = require('jsonwebtoken');
const crypto = require('crypto');
const pool   = require('../config/db');
const { sendVerificationEmail } = require('../config/email');

const SALT_ROUNDS = 12;
const CODE_TTL_MINUTES = 10;

/** Generate a cryptographically random 6-digit string. */
const generateCode = () =>
  String(crypto.randomInt(100000, 999999)).padStart(6, '0');

/** POST /api/auth/register */
const register = async (req, res, next) => {
  try {
    const { full_name, email, password, household_size } = req.body;

    if (!full_name?.trim() || !email?.trim() || !password) {
      return res.status(400).json({ error: 'Full name, email, and password are required.' });
    }
    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters.' });
    }

    // Duplicate email check
    const [existing] = await pool.query(
      'SELECT user_id, is_verified FROM users WHERE email = ?', [email.toLowerCase().trim()]
    );
    
    let userId;
    const password_hash = await bcrypt.hash(password, SALT_ROUNDS);

    if (existing.length > 0) {
      if (existing[0].is_verified) {
        return res.status(409).json({ error: 'An account with this email already exists.' });
      }
      // Account exists but not verified. Let's update it and resend code!
      userId = existing[0].user_id;
      await pool.query(
        'UPDATE users SET full_name = ?, password_hash = ?, household_size = ? WHERE user_id = ?',
        [full_name.trim(), password_hash, household_size || null, userId]
      );
      // Invalidate old codes
      await pool.query('UPDATE verification_codes SET is_used = 1 WHERE user_id = ? AND is_used = 0', [userId]);
    } else {
      // Create new user
      const [result] = await pool.query(
        `INSERT INTO users (full_name, email, password_hash, household_size)
         VALUES (?, ?, ?, ?)`,
        [full_name.trim(), email.toLowerCase().trim(), password_hash, household_size || null]
      );
      userId = result.insertId;
    }

    // Create verification code
    const code = generateCode();
    await pool.query(
      'INSERT INTO verification_codes (user_id, code, expires_at) VALUES (?, ?, DATE_ADD(NOW(), INTERVAL ? MINUTE))',
      [userId, code, CODE_TTL_MINUTES]
    );

    // If this fails, the DB changes are already committed, but the user remains unverified.
    // They can re-register or use resend-code to try again.
    await sendVerificationEmail(email, full_name.trim(), code);

    res.status(201).json({
      message: `Account created. A 6-digit verification code has been sent to ${email}.`,
    });
  } catch (err) { next(err); }
};

/** POST /api/auth/verify-email */
const verifyEmail = async (req, res, next) => {
  try {
    const { email, code } = req.body;
    if (!email || !code) {
      return res.status(400).json({ error: 'Email and code are required.' });
    }

    const [users] = await pool.query(
      'SELECT user_id, is_verified FROM users WHERE email = ?',
      [email.toLowerCase().trim()]
    );
    if (users.length === 0) {
      return res.status(404).json({ error: 'Account not found.' });
    }
    const { user_id, is_verified } = users[0];
    if (is_verified) {
      return res.status(400).json({ error: 'This account is already verified.' });
    }

    const [codes] = await pool.query(
      `SELECT code_id FROM verification_codes
       WHERE user_id = ? AND code = ? AND is_used = 0 AND expires_at > NOW()
       ORDER BY created_at DESC LIMIT 1`,
      [user_id, code]
    );
    if (codes.length === 0) {
      return res.status(400).json({ error: 'Invalid or expired verification code.' });
    }

    // Activate account and invalidate code
    await pool.query('UPDATE users SET is_verified = 1 WHERE user_id = ?', [user_id]);
    await pool.query('UPDATE verification_codes SET is_used = 1 WHERE code_id = ?', [codes[0].code_id]);

    // Seed welcome notification
    await pool.query(
      `INSERT INTO notifications (user_id, type, message)
       VALUES (?, 'account_security', 'Your account was successfully verified. Welcome to SavePlate!')`,
      [user_id]
    );

    res.json({ message: 'Email verified successfully. You can now log in.' });
  } catch (err) { next(err); }
};

/** POST /api/auth/resend-code */
const resendCode = async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email is required.' });

    const [users] = await pool.query(
      'SELECT user_id, full_name, is_verified FROM users WHERE email = ?',
      [email.toLowerCase().trim()]
    );
    if (users.length === 0) return res.status(404).json({ error: 'Account not found.' });
    const { user_id, full_name, is_verified } = users[0];
    if (is_verified) return res.status(400).json({ error: 'Account is already verified.' });

    // Invalidate old codes
    await pool.query(
      'UPDATE verification_codes SET is_used = 1 WHERE user_id = ? AND is_used = 0',
      [user_id]
    );

    const code = generateCode();
    await pool.query(
      'INSERT INTO verification_codes (user_id, code, expires_at) VALUES (?, ?, DATE_ADD(NOW(), INTERVAL ? MINUTE))',
      [user_id, code, CODE_TTL_MINUTES]
    );
    await sendVerificationEmail(email, full_name, code);

    res.json({ message: 'A new verification code has been sent.' });
  } catch (err) { next(err); }
};

/** POST /api/auth/login */
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const [users] = await pool.query(
      `SELECT user_id, full_name, email, password_hash, is_verified,
              is_2fa_enabled, food_visibility
       FROM users WHERE email = ?`,
      [email.toLowerCase().trim()]
    );
    if (users.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }
    const user = users[0];

    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) return res.status(401).json({ error: 'Invalid email or password.' });

    if (!user.is_verified) {
      return res.status(403).json({
        error: 'Email not verified. Please check your inbox for the verification code.',
        requiresVerification: true,
      });
    }

    if (user.is_2fa_enabled) {
      // Invalidate old codes
      await pool.query('UPDATE verification_codes SET is_used = 1 WHERE user_id = ? AND is_used = 0', [user.user_id]);
      
      const code = generateCode();
      await pool.query(
        'INSERT INTO verification_codes (user_id, code, expires_at) VALUES (?, ?, DATE_ADD(NOW(), INTERVAL ? MINUTE))',
        [user.user_id, code, CODE_TTL_MINUTES]
      );
      await sendVerificationEmail(user.email, user.full_name, code, true);

      return res.json({
        message: 'A 2FA code has been sent to your email.',
        requires2FA: true,
        email: user.email
      });
    }

    const token = jwt.sign(
      { id: user.user_id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    res.json({
      token,
      user: {
        id:              user.user_id,
        full_name:       user.full_name,
        email:           user.email,
        is_2fa_enabled:  Boolean(user.is_2fa_enabled),
        food_visibility: user.food_visibility,
      },
    });
  } catch (err) { next(err); }
};

/** POST /api/auth/verify-2fa */
const verify2FA = async (req, res, next) => {
  try {
    const { email, code } = req.body;
    if (!email || !code) return res.status(400).json({ error: 'Email and code are required.' });

    const [users] = await pool.query(
      `SELECT user_id, full_name, email, is_2fa_enabled, food_visibility
       FROM users WHERE email = ?`,
      [email.toLowerCase().trim()]
    );
    if (users.length === 0) return res.status(404).json({ error: 'Account not found.' });
    const user = users[0];

    const [codes] = await pool.query(
      `SELECT code_id FROM verification_codes
       WHERE user_id = ? AND code = ? AND is_used = 0 AND expires_at > NOW()
       ORDER BY created_at DESC LIMIT 1`,
      [user.user_id, code]
    );
    if (codes.length === 0) return res.status(400).json({ error: 'Invalid or expired 2FA code.' });

    await pool.query('UPDATE verification_codes SET is_used = 1 WHERE code_id = ?', [codes[0].code_id]);

    const token = jwt.sign(
      { id: user.user_id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    res.json({
      token,
      user: {
        id:              user.user_id,
        full_name:       user.full_name,
        email:           user.email,
        is_2fa_enabled:  Boolean(user.is_2fa_enabled),
        food_visibility: user.food_visibility,
      },
    });
  } catch (err) { next(err); }
};

/** GET /api/auth/me */
const me = async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      `SELECT user_id, full_name, email, household_size,
              is_2fa_enabled, food_visibility, created_at
       FROM users WHERE user_id = ?`,
      [req.user.id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'User not found.' });
    const u = rows[0];
    res.json({
      id:              u.user_id,
      full_name:       u.full_name,
      email:           u.email,
      household_size:  u.household_size,
      is_2fa_enabled:  Boolean(u.is_2fa_enabled),
      food_visibility: u.food_visibility,
      created_at:      u.created_at,
    });
  } catch (err) { next(err); }
};

/** PATCH /api/auth/settings */
const updateSettings = async (req, res, next) => {
  try {
    const { is_2fa_enabled, food_visibility, full_name, household_size } = req.body;
    const updates = {};
    if (typeof is_2fa_enabled === 'boolean') updates.is_2fa_enabled = is_2fa_enabled ? 1 : 0;
    if (food_visibility === 'public' || food_visibility === 'private') updates.food_visibility = food_visibility;
    if (full_name !== undefined) {
      const name = full_name?.trim();
      if (name) updates.full_name = name;
    }
    if (household_size !== undefined) {
      updates.household_size = household_size === '' || household_size === null ? null : parseInt(household_size);
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'Nothing to update.' });
    }

    const setClause = Object.keys(updates).map(k => `${k} = ?`).join(', ');
    await pool.query(
      `UPDATE users SET ${setClause} WHERE user_id = ?`,
      [...Object.values(updates), req.user.id]
    );
    res.json({ message: 'Settings updated.' });
  } catch (err) { next(err); }
};

module.exports = { register, verifyEmail, resendCode, login, verify2FA, me, updateSettings };
