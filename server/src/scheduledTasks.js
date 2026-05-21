// src/scheduledTasks.js — Daily background tasks for expiry alerts & meal reminders
const pool = require('./config/db');

const INTERVAL_MS = 60 * 60 * 1000; // run every hour (dedup prevents duplicates)

// ─── 1. Expiry Scanner ──────────────────────────────────────────────────────
// Finds active food items expiring within 3 days and creates notifications.
// Skips items that already have a recent expiry notification (within 24h).
async function runExpiryScanner() {
  try {
    // Items expiring within 3 days (including already expired) that are still active
    const [items] = await pool.query(`
      SELECT f.food_id, f.user_id, f.item_name,
             DATEDIFF(f.expiry_date, CURDATE()) AS days_left
      FROM food_items f
      WHERE f.status = 'active'
        AND f.expiry_date <= DATE_ADD(CURDATE(), INTERVAL 3 DAY)
    `);

    let created = 0;
    for (const item of items) {
      // Check if we already sent an expiry notification for this item in the last 24h
      const [[{ recent }]] = await pool.query(
        `SELECT COUNT(*) AS recent FROM notifications
         WHERE user_id = ? AND type = 'expiry' AND related_id = ?
           AND created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)`,
        [item.user_id, item.food_id]
      );
      if (recent > 0) continue;

      let msg;
      if (item.days_left < 0) {
        msg = `"${item.item_name}" has expired (${Math.abs(item.days_left)} day${Math.abs(item.days_left) !== 1 ? 's' : ''} ago). Consider donating it before it goes to waste.`;
      } else if (item.days_left === 0) {
        msg = `"${item.item_name}" expires today! Use it now or list it as a donation for the community.`;
      } else {
        msg = `"${item.item_name}" expires in ${item.days_left} day${item.days_left !== 1 ? 's' : ''}. Plan a meal or donate it to avoid waste.`;
      }

      await pool.query(
        `INSERT INTO notifications (user_id, type, message, related_id)
         VALUES (?, 'expiry', ?, ?)`,
        [item.user_id, msg, item.food_id]
      );
      created++;
    }

    if (created > 0) {
      console.log(`  [scheduler] Expiry scanner: ${created} notification(s) created`);
    }
  } catch (err) {
    console.error('  [scheduler] Expiry scanner error:', err.message);
  }
}

// ─── 2. Meal Reminder ───────────────────────────────────────────────────────
// Finds meal slots planned for today and creates reminder notifications.
// Skips slots that already have a reminder for today.
async function runMealReminders() {
  try {
    // Calculate today's day_index (0=Mon ... 6=Sun) and week_start
    const now = new Date();
    const jsDay = now.getDay(); // 0=Sun
    const dayIndex = (jsDay + 6) % 7; // convert to 0=Mon ... 6=Sun
    const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

    // Calculate this week's Monday
    const monday = new Date(now);
    monday.setDate(now.getDate() - dayIndex);
    const weekStart = monday.toISOString().split('T')[0]; // YYYY-MM-DD

    // Find all meal slots for today across all users
    const [slots] = await pool.query(`
      SELECT ms.slot_id, ms.meal_name, ms.meal_type, ms.day_index,
             mp.user_id, mp.week_start
      FROM meal_slots ms
      JOIN meal_plans mp ON mp.meal_plan_id = ms.meal_plan_id
      WHERE mp.week_start = ? AND ms.day_index = ?
    `, [weekStart, dayIndex]);

    let created = 0;
    for (const slot of slots) {
      // Check if we already sent a meal_reminder for this slot today
      const [[{ recent }]] = await pool.query(
        `SELECT COUNT(*) AS recent FROM notifications
         WHERE user_id = ? AND type = 'meal_reminder' AND related_id = ?
           AND DATE(created_at) = CURDATE()`,
        [slot.user_id, slot.slot_id]
      );
      if (recent > 0) continue;

      const mealLabel = slot.meal_type.charAt(0).toUpperCase() + slot.meal_type.slice(1);
      const msg = `Today's ${mealLabel}: "${slot.meal_name}" is planned for ${dayNames[dayIndex]}. Time to prepare!`;

      await pool.query(
        `INSERT INTO notifications (user_id, type, message, related_id)
         VALUES (?, 'meal_reminder', ?, ?)`,
        [slot.user_id, msg, slot.slot_id]
      );
      created++;
    }

    if (created > 0) {
      console.log(`  [scheduler] Meal reminders: ${created} notification(s) created`);
    }
  } catch (err) {
    console.error('  [scheduler] Meal reminder error:', err.message);
  }
}

// ─── Combined runner ─────────────────────────────────────────────────────────
async function runAllTasks() {
  await runExpiryScanner();
  await runMealReminders();
}

/**
 * Start the background scheduler.
 * Runs all tasks once immediately on startup, then repeats every INTERVAL_MS.
 */
function startScheduler() {
  console.log('  [scheduler] Starting background tasks (interval: 1h)\n');

  // Run once after a short delay to let the DB connection pool warm up
  setTimeout(() => {
    runAllTasks();
  }, 5000);

  // Then repeat on interval
  setInterval(runAllTasks, INTERVAL_MS);
}

module.exports = { startScheduler };
