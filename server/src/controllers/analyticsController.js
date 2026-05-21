// src/controllers/analyticsController.js
const pool = require('../config/db');

/**
 * GET /api/analytics?range=7|30|all
 * Returns aggregated food-saving statistics for the authenticated user.
 */
const getStats = async (req, res, next) => {
  try {
    const range = req.query.range || '30';
    let dateFilter = '';
    if (range === '7')  dateFilter = 'AND updated_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)';
    if (range === '30') dateFilter = 'AND updated_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)';

    // 1. Status counts
    const [statusRows] = await pool.query(
      `SELECT status, COUNT(*) AS count
       FROM food_items
       WHERE user_id = ? ${dateFilter}
       GROUP BY status`,
      [req.user.id]
    );
    const statusMap = {};
    statusRows.forEach(r => { statusMap[r.status] = r.count; });

    // 2. Category breakdown for used + donated
    const [categoryRows] = await pool.query(
      `SELECT category,
              SUM(status = 'used')   AS saved,
              SUM(status = 'donated') AS donated
       FROM food_items
       WHERE user_id = ?
         AND status IN ('used','donated')
         ${dateFilter}
       GROUP BY category
       ORDER BY (saved + donated) DESC`,
      [req.user.id]
    );

    // 3. Items expiring within 3 days (always current, ignore date filter)
    const [expiringRows] = await pool.query(
      `SELECT COUNT(*) AS count FROM food_items
       WHERE user_id = ? AND status = 'active'
         AND expiry_date <= DATE_ADD(CURDATE(), INTERVAL 3 DAY)`,
      [req.user.id]
    );

    // 4. Total tracked in period
    const [totalRow] = await pool.query(
      `SELECT COUNT(*) AS count FROM food_items WHERE user_id = ? ${dateFilter}`,
      [req.user.id]
    );

    const totalTracked  = totalRow[0].count;
    const totalSaved    = (statusMap['used']   || 0);
    const totalDonated  = (statusMap['donated']|| 0);
    const totalActive   = (statusMap['active'] || 0) + (statusMap['reserved'] || 0);
    const totalAtRisk   = expiringRows[0].count;
    const wasteRate     = totalTracked > 0
      ? Math.round(((totalSaved + totalDonated) / totalTracked) * 100)
      : 0;
    const co2Saved      = parseFloat(((totalSaved + totalDonated) * 0.4).toFixed(1));

    res.json({
      range,
      summary: {
        total_tracked: totalTracked,
        total_saved:   totalSaved,
        total_donated: totalDonated,
        total_active:  totalActive,
        at_risk:       totalAtRisk,
        waste_rate_pct: wasteRate,
        co2_saved_kg:   co2Saved,
      },
      by_category: categoryRows.map(r => ({
        category: r.category,
        saved:    Number(r.saved),
        donated:  Number(r.donated),
      })),
      status_distribution: [
        { name: 'Used / Saved', value: totalSaved },
        { name: 'Donated',      value: totalDonated },
        { name: 'Active',       value: totalActive },
        { name: 'At risk',      value: totalAtRisk },
      ].filter(d => d.value > 0),
    });
  } catch (err) { next(err); }
};

module.exports = { getStats };
