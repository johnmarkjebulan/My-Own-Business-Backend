const express = require('express');
const pool = require('../config/db');

const router = express.Router();

router.post('/', async (req, res) => {
  const { name, email, phone, subject, message } = req.body;

  if (!name || !email || !phone || !subject || !message) {
    return res.status(400).json({ message: 'All contact fields are required.' });
  }

  try {
    await pool.query(
      'INSERT INTO contact_messages (name, email, phone, subject, message) VALUES (?, ?, ?, ?, ?)',
      [name, email, phone, subject, message],
    );

    return res.status(201).json({ message: 'Your message has been sent successfully.' });
  } catch (error) {
    return res.status(500).json({ message: 'Unable to send contact message.' });
  }
});

module.exports = router;
