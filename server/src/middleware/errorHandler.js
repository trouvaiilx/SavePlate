// src/middleware/errorHandler.js — global error handler
const errorHandler = (err, req, res, _next) => {
  console.error(`[${new Date().toISOString()}] ${req.method} ${req.path}`, err.message);
  const status = err.statusCode || err.status || 500;
  const message = process.env.NODE_ENV === 'production' && status === 500
    ? 'Internal server error.'
    : err.message || 'Internal server error.';
  res.status(status).json({ error: message });
};

module.exports = { errorHandler };
