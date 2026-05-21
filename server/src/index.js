// src/index.js — SavePlate Express API entry point
require('dotenv').config();
const express     = require('express');
const cors        = require('cors');
const rateLimit   = require('express-rate-limit');

const { errorHandler } = require('./middleware/errorHandler');
const authRoutes         = require('./routes/auth');
const foodRoutes         = require('./routes/food');
const donationRoutes     = require('./routes/donations');
const notificationRoutes = require('./routes/notifications');
const mealRoutes         = require('./routes/meals');
const analyticsRoutes    = require('./routes/analytics');
const { startScheduler } = require('./scheduledTasks');

const app  = express();
const PORT = process.env.PORT || 5000;

// ─── Global middleware ────────────────────────────────────────────────────────
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json());

// General rate limiter (300 requests / 15 min per IP — accounts for SPA page navigation)
app.use(rateLimit({
  windowMs: 15 * 60_000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Please slow down.' },
}));

// ─── Routes ───────────────────────────────────────────────────────────────────
app.use('/api/auth',          authRoutes);
app.use('/api/food',          foodRoutes);
app.use('/api/donations',     donationRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/meals',         mealRoutes);
app.use('/api/analytics',     analyticsRoutes);

// Health check
app.get('/api/health', (_req, res) =>
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
);

// 404 handler
app.use((_req, res) => res.status(404).json({ error: 'Route not found.' }));

// Global error handler (must be last)
app.use(errorHandler);

// ─── Start ────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n  SavePlate API running at http://localhost:${PORT}/api`);
  console.log(`  Environment : ${process.env.NODE_ENV || 'development'}`);
  console.log(`  DB          : ${process.env.DB_NAME}@${process.env.DB_HOST}`);

  // Start background tasks (expiry alerts, meal reminders)
  startScheduler();
});
