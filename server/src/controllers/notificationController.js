// src/controllers/notificationController.js
const pool = require('../config/db');

/** GET /api/notifications */
const getAll = async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      `SELECT * FROM notifications
       WHERE user_id = ?
       ORDER BY created_at DESC
       LIMIT 100`,
      [req.user.id]
    );
    res.json(rows);
  } catch (err) { next(err); }
};

/** PATCH /api/notifications/:id/read */
const markRead = async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      'SELECT notification_id FROM notifications WHERE notification_id = ? AND user_id = ?',
      [req.params.id, req.user.id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Notification not found.' });

    await pool.query(
      'UPDATE notifications SET is_read = 1 WHERE notification_id = ?', [req.params.id]
    );
    res.json({ message: 'Marked as read.' });
  } catch (err) { next(err); }
};

/** PATCH /api/notifications/read-all */
const markAllRead = async (req, res, next) => {
  try {
    await pool.query(
      'UPDATE notifications SET is_read = 1 WHERE user_id = ? AND is_read = 0',
      [req.user.id]
    );
    res.json({ message: 'All notifications marked as read.' });
  } catch (err) { next(err); }
};

module.exports = { getAll, markRead, markAllRead };
