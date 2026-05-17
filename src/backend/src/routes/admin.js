import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth.js';

const router = Router();

// Dashboard stats
router.get('/stats', authenticate, requireRole('admin', 'support'), async (req, res) => {
  try {
    const [todayBookings, totalPods, activeUsers, recentBookings] = await Promise.all([
      req.db.query(`SELECT COUNT(*) FROM bookings WHERE DATE(start_time) = CURRENT_DATE AND status != 'cancelled'`),
      req.db.query(`SELECT COUNT(*) FROM pods WHERE is_active = true`),
      req.db.query(`SELECT COUNT(*) FROM users WHERE is_active = true`),
      req.db.query(`SELECT b.booking_code, b.start_time, b.end_time, b.status, u.full_name, p.name as pod_name
                    FROM bookings b JOIN users u ON b.user_id = u.id JOIN pods p ON b.pod_id = p.id
                    ORDER BY b.created_at DESC LIMIT 10`)
    ]);

    res.json({
      todayBookings: parseInt(todayBookings.rows[0].count),
      totalPods: parseInt(totalPods.rows[0].count),
      activeUsers: parseInt(activeUsers.rows[0].count),
      recentBookings: recentBookings.rows
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// List all bookings (admin)
router.get('/bookings', authenticate, requireRole('admin', 'support'), async (req, res) => {
  try {
    const { status, date, limit = 50, offset = 0 } = req.query;
    
    let query = `SELECT b.*, u.full_name, u.email, p.name as pod_name, l.name as location_name
                 FROM bookings b
                 JOIN users u ON b.user_id = u.id
                 JOIN pods p ON b.pod_id = p.id
                 JOIN locations l ON b.location_id = l.id
                 WHERE 1=1`;
    const params = [];

    if (status) {
      params.push(status);
      query += ` AND b.status = $${params.length}`;
    }
    if (date) {
      params.push(date);
      query += ` AND DATE(b.start_time) = $${params.length}`;
    }

    query += ` ORDER BY b.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const result = await req.db.query(query, params);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch bookings' });
  }
});

// Manage pods (admin)
router.post('/pods', authenticate, requireRole('admin'), async (req, res) => {
  try {
    const { locationId, podCode, name, description, podType, unlockMethods } = req.body;
    
    const result = await req.db.query(
      `INSERT INTO pods (location_id, pod_code, name, description, pod_type, unlock_methods)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [locationId, podCode, name, description, podType || 'standard', unlockMethods || ['qr']]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create pod' });
  }
});

// Remote lock/unlock
router.post('/pods/:id/control', authenticate, requireRole('admin', 'support'), async (req, res) => {
  try {
    const { action } = req.body; // 'lock' or 'unlock'
    if (!['lock', 'unlock'].includes(action)) {
      return res.status(400).json({ error: 'Action must be lock or unlock' });
    }

    req.mqtt.publish(`pod/${req.params.id}/${action}`, JSON.stringify({
      adminId: req.user.id,
      timestamp: new Date().toISOString()
    }), { qos: 1 });

    await req.db.query(
      `INSERT INTO audit_logs (pod_id, action, details) VALUES ($1, 'remote_${action}', $2)`,
      [req.params.id, JSON.stringify({ adminId: req.user.id })]
    );

    res.json({ success: true, message: `${action} command sent` });
  } catch (err) {
    res.status(500).json({ error: 'Control command failed' });
  }
});

export default router;