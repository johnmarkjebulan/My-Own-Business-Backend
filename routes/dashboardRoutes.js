const express = require('express');
const pool = require('../config/db');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

const router = express.Router();

router.get('/stats', authenticateToken, requireAdmin, async (_req, res) => {
  try {
    const [[repairStats]] = await pool.query(
      `SELECT
        COUNT(*) AS totalRepairs,
        SUM(CASE WHEN status IN ('received', 'diagnosing', 'awaiting_approval') THEN 1 ELSE 0 END) AS pendingRepairs,
        SUM(CASE WHEN status IN ('repair_in_progress', 'quality_check') THEN 1 ELSE 0 END) AS activeRepairs,
        SUM(CASE WHEN status = 'ready_for_pickup' THEN 1 ELSE 0 END) AS readyForPickup,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) AS completedRepairs,
        SUM(CASE WHEN DATE(created_at) = CURDATE() THEN 1 ELSE 0 END) AS bookingsToday,
        AVG(CASE WHEN estimate_amount IS NOT NULL THEN estimate_amount END) AS averageEstimate,
        SUM(CASE WHEN pickup_option IN ('delivery', 'messenger') THEN 1 ELSE 0 END) AS deliveryRequests,
        SUM(CASE WHEN urgency IN ('priority', 'rush') THEN 1 ELSE 0 END) AS priorityRequests
      FROM repair_requests`,
    );

    const [[serviceStats]] = await pool.query('SELECT COUNT(*) AS serviceCount FROM services WHERE active = 1');
    const [topServices] = await pool.query(
      `SELECT service_type, COUNT(*) AS total
       FROM repair_requests
       GROUP BY service_type
       ORDER BY total DESC, service_type ASC
       LIMIT 5`,
    );

    const [statusBreakdown] = await pool.query(
      `SELECT status, COUNT(*) AS total
       FROM repair_requests
       GROUP BY status
       ORDER BY total DESC`,
    );

    const [pickupBreakdown] = await pool.query(
      `SELECT pickup_option, COUNT(*) AS total
       FROM repair_requests
       GROUP BY pickup_option
       ORDER BY total DESC`,
    );

    const [dailyBookings] = await pool.query(
      `SELECT DATE(created_at) AS booking_date, COUNT(*) AS total
       FROM repair_requests
       WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 6 DAY)
       GROUP BY DATE(created_at)
       ORDER BY booking_date ASC`,
    );

    return res.json({
      stats: {
        ...repairStats,
        ...serviceStats,
      },
      topServices,
      statusBreakdown,
      pickupBreakdown,
      dailyBookings,
    });
  } catch (error) {
    return res.status(500).json({ message: 'Unable to load dashboard statistics.' });
  }
});

module.exports = router;
