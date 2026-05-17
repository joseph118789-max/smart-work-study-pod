import { Router } from 'express';

const router = Router();

// List all active locations
router.get('/', async (req, res) => {
  try {
    const result = await req.db.query(
      `SELECT l.*, 
              COUNT(p.id) FILTER (WHERE p.is_active = true) as pod_count
       FROM locations l
       LEFT JOIN pods p ON p.location_id = l.id
       WHERE l.is_active = true
       GROUP BY l.id
       ORDER BY l.name`
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch locations' });
  }
});

// Get location with pods
router.get('/:id', async (req, res) => {
  try {
    const locationResult = await req.db.query(
      'SELECT * FROM locations WHERE id = $1 AND is_active = true',
      [req.params.id]
    );
    if (locationResult.rows.length === 0) {
      return res.status(404).json({ error: 'Location not found' });
    }

    const podsResult = await req.db.query(
      `SELECT id, name, pod_code, pod_type, status, unlock_methods 
       FROM pods WHERE location_id = $1 AND is_active = true
       ORDER BY name`,
      [req.params.id]
    );

    res.json({
      ...locationResult.rows[0],
      pods: podsResult.rows
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch location' });
  }
});

export default router;