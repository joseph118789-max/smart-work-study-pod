import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';

const router = Router();

// List all active pods
router.get('/', async (req, res) => {
  try {
    const { locationId, status } = req.query;
    
    let query = `SELECT p.*, l.name as location_name, l.address as location_address 
                 FROM pods p JOIN locations l ON p.location_id = l.id WHERE p.is_active = true`;
    const params = [];
    
    if (locationId) {
      params.push(locationId);
      query += ` AND p.location_id = $${params.length}`;
    }
    if (status) {
      params.push(status);
      query += ` AND p.status = $${params.length}`;
    }
    
    query += ' ORDER BY p.name';
    
    const result = await req.db.query(query, params);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch pods' });
  }
});

// Get pod details
router.get('/:id', async (req, res) => {
  try {
    const result = await req.db.query(
      `SELECT p.*, l.name as location_name, l.address as location_address, l.latitude, l.longitude
       FROM pods p JOIN locations l ON p.location_id = l.id WHERE p.id = $1`,
      [req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Pod not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch pod' });
  }
});

// Unlock pod via QR token
router.post('/:id/unlock', async (req, res) => {
  try {
    const { token, pin } = req.body;
    if (!token && !pin) {
      return res.status(400).json({ error: 'Token or PIN required' });
    }

    // Verify token or PIN against active booking
    let query = `SELECT b.*, p.pod_code FROM bookings b 
                 JOIN pods p ON b.pod_id = p.id 
                 WHERE b.pod_id = $1 AND b.status IN ('confirmed', 'checked_in')
                 AND b.start_time <= NOW() AND b.end_time >= NOW()`;
    const params = [req.params.id];

    if (token) {
      params.push(token);
      query += ` AND b.unlock_qr_token = $${params.length}`;
    } else {
      params.push(pin);
      query += ` AND b.unlock_pin = $${params.length}`;
    }

    const result = await req.db.query(query, params);
    if (result.rows.length === 0) {
      return res.status(403).json({ error: 'Invalid or expired unlock credential' });
    }

    const booking = result.rows[0];

    // Publish unlock command to MQTT
    req.mqtt.publish(`pod/${req.params.id}/unlock`, JSON.stringify({
      bookingId: booking.id,
      method: token ? 'qr' : 'pin',
      timestamp: new Date().toISOString()
    }), { qos: 1 });

    // Log unlock attempt
    await req.db.query(
      `INSERT INTO audit_logs (booking_id, pod_id, action, details) VALUES ($1, $2, 'unlock_attempt', $3)`,
      [booking.id, req.params.id, JSON.stringify({ method: token ? 'qr' : 'pin' })]
    );

    res.json({ success: true, message: 'Unlock command sent' });
  } catch (err) {
    req.logger.error(err);
    res.status(500).json({ error: 'Unlock failed' });
  }
});

export default router;