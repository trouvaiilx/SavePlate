// src/controllers/foodController.js
const pool = require('../config/db');

/** GET /api/food  — with optional query filters */
const getAll = async (req, res, next) => {
  try {
    const { status, category, storage_location, expiry_within } = req.query;
    let sql = 'SELECT * FROM food_items WHERE user_id = ?';
    const params = [req.user.id];

    if (status)           { sql += ' AND status = ?';           params.push(status); }
    if (category)         { sql += ' AND category = ?';         params.push(category); }
    if (storage_location) { sql += ' AND storage_location = ?'; params.push(storage_location); }
    if (expiry_within)    {
      sql += ' AND expiry_date <= DATE_ADD(CURDATE(), INTERVAL ? DAY)';
      params.push(Number(expiry_within));
    }

    sql += ' ORDER BY expiry_date ASC';
    const [rows] = await pool.query(sql, params);
    res.json(rows);
  } catch (err) { next(err); }
};

/** GET /api/food/:id */
const getOne = async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM food_items WHERE food_id = ? AND user_id = ?',
      [req.params.id, req.user.id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Food item not found.' });
    res.json(rows[0]);
  } catch (err) { next(err); }
};

/** POST /api/food */
const create = async (req, res, next) => {
  try {
    const { item_name, quantity, unit, expiry_date, category, storage_location, remarks } = req.body;

    if (!item_name?.trim() || !quantity || !unit?.trim() || !expiry_date || !category?.trim()) {
      return res.status(400).json({ error: 'item_name, quantity, unit, expiry_date, and category are required.' });
    }

    const [result] = await pool.query(
      `INSERT INTO food_items
         (user_id, item_name, quantity, unit, expiry_date, category, storage_location, remarks)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        req.user.id,
        item_name.trim(),
        quantity,
        unit.trim(),
        String(expiry_date).split('T')[0],
        category.trim(),
        storage_location?.trim() || null,
        remarks?.trim() || null,
      ]
    );

    // Auto-create expiry notification if item expires within 3 days
    const daysLeft = Math.ceil(
      (new Date(expiry_date).setHours(0,0,0,0) - new Date().setHours(0,0,0,0)) / 86400000
    );
    if (daysLeft <= 3) {
      const msg = daysLeft <= 0
        ? `"${item_name.trim()}" has already expired. Consider listing it as a donation before it goes to waste.`
        : `"${item_name.trim()}" expires in ${daysLeft} day${daysLeft !== 1 ? 's' : ''}. Plan a meal or donate it to the community.`;
      await pool.query(
        'INSERT INTO notifications (user_id, type, message, related_id) VALUES (?, ?, ?, ?)',
        [req.user.id, 'expiry', msg, result.insertId]
      );
    }

    const [newItem] = await pool.query('SELECT * FROM food_items WHERE food_id = ?', [result.insertId]);
    res.status(201).json(newItem[0]);
  } catch (err) { next(err); }
};

/** PUT /api/food/:id */
const update = async (req, res, next) => {
  try {
    const [existing] = await pool.query(
      'SELECT food_id FROM food_items WHERE food_id = ? AND user_id = ?',
      [req.params.id, req.user.id]
    );
    if (existing.length === 0) return res.status(404).json({ error: 'Food item not found.' });

    const { item_name, quantity, unit, expiry_date, category, storage_location, remarks } = req.body;
    await pool.query(
      `UPDATE food_items SET
         item_name = ?, quantity = ?, unit = ?, expiry_date = ?,
         category = ?, storage_location = ?, remarks = ?
       WHERE food_id = ?`,
      [
        item_name, quantity, unit, String(expiry_date).split('T')[0], category,
        storage_location || null, remarks || null,
        req.params.id,
      ]
    );
    const [updated] = await pool.query('SELECT * FROM food_items WHERE food_id = ?', [req.params.id]);
    res.json(updated[0]);
  } catch (err) { next(err); }
};

/** PATCH /api/food/:id/status */
const updateStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    const allowed = ['active', 'used', 'donated', 'reserved'];
    if (!allowed.includes(status)) {
      return res.status(400).json({ error: `status must be one of: ${allowed.join(', ')}` });
    }

    const [existing] = await pool.query(
      'SELECT food_id, item_name FROM food_items WHERE food_id = ? AND user_id = ?',
      [req.params.id, req.user.id]
    );
    if (existing.length === 0) return res.status(404).json({ error: 'Food item not found.' });

    await pool.query('UPDATE food_items SET status = ? WHERE food_id = ?', [status, req.params.id]);
    res.json({ message: `Status updated to "${status}".` });
  } catch (err) { next(err); }
};

/** DELETE /api/food/:id */
const remove = async (req, res, next) => {
  try {
    const [existing] = await pool.query(
      'SELECT food_id FROM food_items WHERE food_id = ? AND user_id = ?',
      [req.params.id, req.user.id]
    );
    if (existing.length === 0) return res.status(404).json({ error: 'Food item not found.' });

    await pool.query('DELETE FROM food_items WHERE food_id = ?', [req.params.id]);
    res.json({ message: 'Food item deleted.' });
  } catch (err) { next(err); }
};

module.exports = { getAll, getOne, create, update, updateStatus, remove };
