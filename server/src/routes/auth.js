// src/routes/auth.js
const express = require('express');
const rateLimit = require('express-rate-limit');
const { authenticate } = require('../middleware/auth');
const {
  register, verifyEmail, resendCode, login, verify2FA, me, updateSettings,
} = require('../controllers/authController');

const router = express.Router();

// Stricter rate limit for auth endpoints (15 requests / 15 min per IP)
const authLimiter = rateLimit({
  windowMs: 15 * 60_000,
  max: 15,
  message: { error: 'Too many requests. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

router.post('/register',     authLimiter, register);
router.post('/verify-email', authLimiter, verifyEmail);
router.post('/resend-code',  authLimiter, resendCode);
router.post('/login',        authLimiter, login);
router.post('/verify-2fa',   authLimiter, verify2FA);
router.get ('/me',           authenticate, me);
router.patch('/settings',    authenticate, updateSettings);

module.exports = router;
