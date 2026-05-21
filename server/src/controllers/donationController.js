// src/controllers/donationController.js
const pool = require('../config/db');

/** GET /api/donations — community listings (public, available) */
const getCommunity = async (req, res, next) => {
  try {
    const { category } = req.query;
    const userId = req.user.id;

    // Only show donations from users whose food_visibility is 'public'
    let sql = `
      SELECT d.*, f.item_name AS food_name, f.category AS food_category, f.expiry_date, f.quantity, f.unit,
             u.full_name AS donor_name
      FROM donations d
      JOIN food_items f ON f.food_id = d.food_id
      JOIN users u      ON u.user_id = d.donor_id
      WHERE d.status = 'available'
        AND u.food_visibility = 'public'
    `;
    const params = [];
    if (category) { sql += ' AND f.category = ?'; params.push(category); }
    sql += ' ORDER BY d.created_at DESC';

    const [rows] = await pool.query(sql, params);

    // Count the requesting user's own hidden donations (if their visibility is private)
    const [[{ hidden_count }]] = await pool.query(
      `SELECT COUNT(*) AS hidden_count
       FROM donations d
       JOIN users u ON u.user_id = d.donor_id
       WHERE d.donor_id = ? AND d.status = 'available' AND u.food_visibility = 'private'`,
      [userId]
    );

    res.json({ donations: rows, myHiddenCount: hidden_count });
  } catch (err) { next(err); }
};

/** GET /api/donations/mine — the requesting user's own donations */
const getMine = async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      `SELECT d.*, f.item_name AS food_name, f.category AS food_category, f.expiry_date, f.quantity, f.unit
       FROM donations d
       JOIN food_items f ON f.food_id = d.food_id
       WHERE d.donor_id = ?
       ORDER BY d.created_at DESC`,
      [req.user.id]
    );
    res.json(rows);
  } catch (err) { next(err); }
};

/** POST /api/donations — convert a food item to a donation listing */
const create = async (req, res, next) => {
  try {
    const { food_id, pickup_location, availability } = req.body;
    if (!food_id || !pickup_location?.trim()) {
      return res.status(400).json({ error: 'food_id and pickup_location are required.' });
    }

    // Verify ownership
    const [items] = await pool.query(
      'SELECT food_id, status FROM food_items WHERE food_id = ? AND user_id = ?',
      [food_id, req.user.id]
    );
    if (items.length === 0) return res.status(404).json({ error: 'Food item not found.' });
    if (items[0].status === 'donated') return res.status(409).json({ error: 'Item is already listed for donation.' });

    // Get item name for notification
    const [foodRows] = await pool.query('SELECT item_name FROM food_items WHERE food_id = ?', [food_id]);
    const itemName = foodRows[0]?.item_name || 'your item';

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      await conn.query('UPDATE food_items SET status = ? WHERE food_id = ?', ['donated', food_id]);
      const [result] = await conn.query(
        `INSERT INTO donations (food_id, donor_id, pickup_location, availability)
         VALUES (?, ?, ?, ?)`,
        [food_id, req.user.id, pickup_location.trim(), availability?.trim() || null]
      );

      // Notify donor: confirmation of posted donation
      await conn.query(
        `INSERT INTO notifications (user_id, type, message, related_id)
         VALUES (?, 'donation_update', ?, ?)`,
        [req.user.id, `Your donation of "${itemName}" has been listed for community pickup at ${pickup_location.trim()}.`, result.insertId]
      );

      await conn.commit();
      const [created] = await conn.query('SELECT * FROM donations WHERE donation_id = ?', [result.insertId]);
      res.status(201).json(created[0]);
    } catch (e) {
      await conn.rollback();
      throw e;
    } finally {
      conn.release();
    }
  } catch (err) { next(err); }
};

/** PATCH /api/donations/:id/claim — claim a community donation */
const claim = async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM donations WHERE donation_id = ?', [req.params.id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Donation not found.' });
    const donation = rows[0];
    if (donation.status !== 'available') return res.status(409).json({ error: 'This donation is no longer available.' });
    if (donation.donor_id === req.user.id) return res.status(400).json({ error: 'You cannot claim your own donation.' });

    await pool.query(
      `UPDATE donations SET status = 'claimed', recipient_id = ? WHERE donation_id = ?`,
      [req.user.id, req.params.id]
    );

    // Notify donor that their listing was claimed
    const [foodRows] = await pool.query('SELECT item_name FROM food_items WHERE food_id = ?', [donation.food_id]);
    const [recipientRows] = await pool.query('SELECT full_name FROM users WHERE user_id = ?', [req.user.id]);
    const itemName = foodRows[0]?.item_name || 'your item';
    const recipientName = recipientRows[0]?.full_name || 'Someone';
    await pool.query(
      `INSERT INTO notifications (user_id, type, message, related_id)
       VALUES (?, 'donation_update', ?, ?)`,
      [donation.donor_id, `${recipientName} has claimed your donation of "${itemName}". Please arrange pickup at ${donation.pickup_location}.`, donation.donation_id]
    );
    // Notify recipient with pickup arrangement details
    const availabilityInfo = donation.availability ? ` Availability: ${donation.availability}.` : '';
    await pool.query(
      `INSERT INTO notifications (user_id, type, message, related_id)
       VALUES (?, 'donation_update', ?, ?)`,
      [req.user.id, `You have claimed "${itemName}". Pickup location: ${donation.pickup_location}.${availabilityInfo}`, donation.donation_id]
    );

    res.json({ message: 'Donation claimed successfully.' });
  } catch (err) { next(err); }
};

/** PATCH /api/donations/:id/cancel */
const cancel = async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM donations WHERE donation_id = ? AND donor_id = ?',
      [req.params.id, req.user.id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Donation not found.' });
    if (rows[0].status === 'completed') return res.status(409).json({ error: 'Cannot cancel a completed donation.' });

    await pool.query(
      `UPDATE donations SET status = 'cancelled' WHERE donation_id = ?`, [req.params.id]
    );
    // Revert food item to active
    await pool.query(
      'UPDATE food_items SET status = ? WHERE food_id = ?', ['active', rows[0].food_id]
    );
    res.json({ message: 'Donation cancelled.' });
  } catch (err) { next(err); }
};

module.exports = { getCommunity, getMine, create, claim, cancel };
