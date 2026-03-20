const express = require('express');
const pool = require('../config/db');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

const router = express.Router();

router.get('/', async (_req, res) => {
  try {
    const [services] = await pool.query(
      'SELECT id, title, slug, short_description, full_description, price_range, turnaround_time, icon, featured FROM services WHERE active = 1 ORDER BY featured DESC, created_at DESC',
    );

    return res.json({ services });
  } catch (error) {
    return res.status(500).json({ message: 'Unable to fetch services.' });
  }
});

router.get('/all', authenticateToken, requireAdmin, async (_req, res) => {
  try {
    const [services] = await pool.query(
      'SELECT id, title, slug, short_description, full_description, price_range, turnaround_time, icon, featured, active, created_at FROM services ORDER BY created_at DESC',
    );

    return res.json({ services });
  } catch (error) {
    return res.status(500).json({ message: 'Unable to fetch admin services.' });
  }
});

router.post('/', authenticateToken, requireAdmin, async (req, res) => {
  const {
    title,
    slug,
    shortDescription,
    fullDescription,
    priceRange,
    turnaroundTime,
    icon,
    featured,
  } = req.body;

  if (!title || !slug || !shortDescription || !fullDescription || !priceRange || !turnaroundTime) {
    return res.status(400).json({ message: 'All service fields are required.' });
  }

  try {
    const [result] = await pool.query(
      'INSERT INTO services (title, slug, short_description, full_description, price_range, turnaround_time, icon, featured, active) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)',
      [title, slug, shortDescription, fullDescription, priceRange, turnaroundTime, icon || 'wrench', featured ? 1 : 0],
    );

    return res.status(201).json({ message: 'Service created successfully.', id: result.insertId });
  } catch (error) {
    return res.status(500).json({ message: 'Unable to create service.' });
  }
});

router.put('/:id', authenticateToken, requireAdmin, async (req, res) => {
  const {
    title,
    slug,
    shortDescription,
    fullDescription,
    priceRange,
    turnaroundTime,
    icon,
    featured,
    active,
  } = req.body;

  try {
    await pool.query(
      'UPDATE services SET title = ?, slug = ?, short_description = ?, full_description = ?, price_range = ?, turnaround_time = ?, icon = ?, featured = ?, active = ? WHERE id = ?',
      [title, slug, shortDescription, fullDescription, priceRange, turnaroundTime, icon, featured ? 1 : 0, active ? 1 : 0, req.params.id],
    );

    return res.json({ message: 'Service updated successfully.' });
  } catch (error) {
    return res.status(500).json({ message: 'Unable to update service.' });
  }
});

router.delete('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    await pool.query('DELETE FROM services WHERE id = ?', [req.params.id]);
    return res.json({ message: 'Service deleted successfully.' });
  } catch (error) {
    return res.status(500).json({ message: 'Unable to delete service.' });
  }
});

module.exports = router;
