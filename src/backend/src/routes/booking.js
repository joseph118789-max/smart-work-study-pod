import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { authenticate } from '../middleware/auth.js';

const router = Router();

// Get available slots for a pod
router.get('/slots', async (req, res) => {
  try {
    const { podId, date } = req.query;
    
    if (!podId || !date) {
      return res.status(400).json({ error: 'podId and date are required' });
    }

    // Get pod operating hours
    const podResult = await req.db.query(
      'SELECT operating_hours, max_booking_hours FROM pods WHERE id = $1 AND is_active = true',
      [podId]
    );

    if (podResult.rows.length === 0) {
      return res.status(404).json({ error: 'Pod not found' });
    }

    const { operating_hours, max_booking_hours } = podResult.rows[0];
    const startHour = parseInt(operating_hours.start.split(':')[0]);
    const endHour = parseInt(operating_hours.end.split(':')[0]);

    // Get existing bookings for the date
    const dayStart = new Date(date);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(date);
    dayEnd.setHours(23, 59, 59, 999);

    const bookingsResult = await req.db.query(
      `SELECT start_time, end_time FROM bookings 
       WHERE pod_id = $1 AND status IN ('confirmed', 'checked_in')
       AND start_time >= $2 AND start_time <= $3
       ORDER BY start_time`,
      [podId, dayStart, dayEnd]
    );

    // Generate available slots (1-hour blocks)
    const slots = [];
    for (let hour = startHour; hour < endHour; hour++) {
      const slotStart = new Date(date);
      slotStart.setHours(hour, 0, 0, 0);
      const slotEnd = new Date(date);
      slotEnd.setHours(hour + 1, 0, 0, 0);

      // Check if slot overlaps with any booking
      const isBooked = bookingsResult.rows.some(booking => {
        const bStart = new Date(booking.start_time);
        const bEnd = new Date(booking.end_time);
        return (slotStart < bEnd && slotEnd > bStart);
      });

      slots.push({
        start: slotStart.toISOString(),
        end: slotEnd.toISOString(),
        available: !isBooked
      });
    }

    res.json({ slots, maxBookingHours: max_booking_hours });
  } catch (err) {
    req.logger.error(err);
    res.status(500).json({ error: 'Failed to fetch slots' });
  }
});

// Create booking with double-booking prevention
router.post('/', authenticate, async (req, res) => {
  const client = await req.db.connect();
  
  try {
    const { podId, locationId, startTime, endTime, notes } = req.body;
    const userId = req.user.id;

    if (!podId || !locationId || !startTime || !endTime) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Validate times
    const start = new Date(startTime);
    const end = new Date(endTime);
    if (start >= end) {
      return res.status(400).json({ error: 'End time must be after start time' });
    }

    await client.query('BEGIN');

    // Check for double-booking using FOR UPDATE lock
    const conflictResult = await client.query(
      `SELECT id FROM bookings 
       WHERE pod_id = $1 
       AND status IN ('confirmed', 'checked_in')
       AND (start_time, end_time) OVERLAPS ($2::timestamp, $3::timestamp)
       FOR UPDATE`,
      [podId, startTime, endTime]
    );

    if (conflictResult.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: 'Time slot already booked' });
    }

    // Generate booking code and unlock PIN
    const bookingCode = `SWP-${Date.now().toString(36).toUpperCase()}`;
    const unlockPin = Math.floor(1000 + Math.random() * 9000).toString();
    const unlockQrToken = uuidv4();

    // Create booking
    const result = await client.query(
      `INSERT INTO bookings (user_id, pod_id, location_id, booking_code, start_time, end_time, unlock_pin, unlock_qr_token, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [userId, podId, locationId, bookingCode, startTime, endTime, unlockPin, unlockQrToken, notes]
    );

    const booking = result.rows[0];

    // Log the action
    await client.query(
      `INSERT INTO audit_logs (user_id, booking_id, action, details) VALUES ($1, $2, 'booking_created', $3)`,
      [userId, booking.id, JSON.stringify({ podId, startTime, endTime })]
    );

    await client.query('COMMIT');

    // Publish unlock token to MQTT for QR code
    req.mqtt.publish(`pod/${podId}/unlock/token`, JSON.stringify({
      bookingId: booking.id,
      token: unlockQrToken,
      pin: unlockPin,
      expiresAt: endTime
    }), { qos: 1 });

    res.status(201).json(booking);
  } catch (err) {
    await client.query('ROLLBACK');
    req.logger.error(err);
    res.status(500).json({ error: 'Booking failed' });
  } finally {
    client.release();
  }
});

// Get user's bookings
router.get('/my', authenticate, async (req, res) => {
  try {
    const result = await req.db.query(
      `SELECT b.*, p.name as pod_name, l.name as location_name, l.address as location_address
       FROM bookings b
       JOIN pods p ON b.pod_id = p.id
       JOIN locations l ON b.location_id = l.id
       WHERE b.user_id = $1
       ORDER BY b.start_time DESC
       LIMIT 50`,
      [req.user.id]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch bookings' });
  }
});

// Cancel booking
router.patch('/:id/cancel', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await req.db.query(
      `UPDATE bookings SET status = 'cancelled', updated_at = NOW()
       WHERE id = $1 AND user_id = $2 AND status = 'confirmed'
       RETURNING *`,
      [id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Booking not found or cannot be cancelled' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to cancel booking' });
  }
});

export default router;