// src/controllers/mealController.js
const pool = require('../config/db');

/**
 * Get or create the meal_plan row for a given week_start,
 * then return all slots for that plan.
 * GET /api/meals?week_start=YYYY-MM-DD
 */
const getWeekPlan = async (req, res, next) => {
  try {
    const { week_start } = req.query;
    if (!week_start) return res.status(400).json({ error: 'week_start (YYYY-MM-DD) is required.' });

    // Upsert the meal_plan
    await pool.query(
      `INSERT IGNORE INTO meal_plans (user_id, week_start) VALUES (?, ?)`,
      [req.user.id, week_start]
    );
    const [plans] = await pool.query(
      'SELECT meal_plan_id FROM meal_plans WHERE user_id = ? AND week_start = ?',
      [req.user.id, week_start]
    );
    const planId = plans[0].meal_plan_id;

    // Fetch all slots with linked ingredient food_ids
    const [slots] = await pool.query(
      `SELECT ms.*, GROUP_CONCAT(msi.food_id) AS food_ids
       FROM meal_slots ms
       LEFT JOIN meal_slot_ingredients msi ON msi.slot_id = ms.slot_id
       WHERE ms.meal_plan_id = ?
       GROUP BY ms.slot_id
       ORDER BY ms.day_index, ms.meal_type`,
      [planId]
    );

    res.json({
      meal_plan_id: planId,
      week_start,
      slots: slots.map(s => ({
        ...s,
        food_ids: s.food_ids ? s.food_ids.split(',').map(Number) : [],
      })),
    });
  } catch (err) { next(err); }
};

/** POST /api/meals/slots — add a single meal slot */
const addSlot = async (req, res, next) => {
  try {
    const { week_start, day_index, meal_type, meal_name, food_ids = [] } = req.body;

    if (week_start === undefined || day_index === undefined || !meal_type || !meal_name?.trim()) {
      return res.status(400).json({ error: 'week_start, day_index, meal_type, and meal_name are required.' });
    }
    if (!['breakfast','lunch','dinner','snack'].includes(meal_type)) {
      return res.status(400).json({ error: 'meal_type must be breakfast, lunch, dinner, or snack.' });
    }

    // Upsert plan
    await pool.query(
      'INSERT IGNORE INTO meal_plans (user_id, week_start) VALUES (?, ?)',
      [req.user.id, week_start]
    );
    const [plans] = await pool.query(
      'SELECT meal_plan_id FROM meal_plans WHERE user_id = ? AND week_start = ?',
      [req.user.id, week_start]
    );
    const planId = plans[0].meal_plan_id;

    const [result] = await pool.query(
      'INSERT INTO meal_slots (meal_plan_id, day_index, meal_type, meal_name) VALUES (?, ?, ?, ?)',
      [planId, day_index, meal_type, meal_name.trim()]
    );
    const slotId = result.insertId;

    // Link ingredient food_ids
    if (food_ids.length > 0) {
      const ingredientRows = food_ids.map((fid) => [slotId, fid]);
      await pool.query('INSERT INTO meal_slot_ingredients (slot_id, food_id) VALUES ?', [ingredientRows]);

      // Reserve quantities in food_items (mark as reserved)
      for (const fid of food_ids) {
        await pool.query(
          `UPDATE food_items SET status = 'reserved'
           WHERE food_id = ? AND user_id = ? AND status = 'active'`,
          [fid, req.user.id]
        );
      }

      // Notify user: meal planning confirmation
      const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
      await pool.query(
        `INSERT INTO notifications (user_id, type, message, related_id)
         VALUES (?, 'meal_reminder', ?, ?)`,
        [req.user.id, `Meal planned: "${meal_name.trim()}" is set for ${dayNames[day_index]}. Ingredients have been reserved from your inventory.`, slotId]
      );
    }

    res.status(201).json({ slot_id: slotId, meal_plan_id: planId, day_index, meal_type, meal_name: meal_name.trim(), food_ids });
  } catch (err) { next(err); }
};

/** DELETE /api/meals/slots/:id */
const removeSlot = async (req, res, next) => {
  try {
    // Verify ownership through plan
    const [rows] = await pool.query(
      `SELECT ms.slot_id, ms.meal_plan_id
       FROM meal_slots ms
       JOIN meal_plans mp ON mp.meal_plan_id = ms.meal_plan_id
       WHERE ms.slot_id = ? AND mp.user_id = ?`,
      [req.params.id, req.user.id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Meal slot not found.' });

    // Restore reserved food items linked to this slot back to active
    const [ingredients] = await pool.query(
      'SELECT food_id FROM meal_slot_ingredients WHERE slot_id = ?', [req.params.id]
    );
    for (const { food_id } of ingredients) {
      // Only revert if no other slots still reference this food_id
      const [others] = await pool.query(
        `SELECT msi.id FROM meal_slot_ingredients msi
         JOIN meal_slots ms ON ms.slot_id = msi.slot_id
         JOIN meal_plans mp ON mp.meal_plan_id = ms.meal_plan_id
         WHERE msi.food_id = ? AND mp.user_id = ? AND msi.slot_id <> ?`,
        [food_id, req.user.id, req.params.id]
      );
      if (others.length === 0) {
        await pool.query(
          `UPDATE food_items SET status = 'active' WHERE food_id = ? AND status = 'reserved'`,
          [food_id]
        );
      }
    }

    await pool.query('DELETE FROM meal_slots WHERE slot_id = ?', [req.params.id]);
    res.json({ message: 'Meal slot removed.' });
  } catch (err) { next(err); }
};

/** GET /api/meals/suggestions?limit=5 — expiring items as meal ingredient ideas */
const getSuggestions = async (req, res, next) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 5, 20);
    const [rows] = await pool.query(
      `SELECT food_id, item_name, category, expiry_date, quantity, unit
       FROM food_items
       WHERE user_id = ? AND status = 'active'
       ORDER BY expiry_date ASC
       LIMIT ?`,
      [req.user.id, limit]
    );
    res.json(rows);
  } catch (err) { next(err); }
};

module.exports = { getWeekPlan, addSlot, removeSlot, getSuggestions };
