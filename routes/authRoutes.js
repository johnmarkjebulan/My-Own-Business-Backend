const express = require('express');
const pool = require('../config/db');
const { createToken, hashPassword, verifyPassword } = require('../utils/security');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

function sanitizeText(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeEmail(value) {
  return sanitizeText(value).toLowerCase();
}

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value || '');
}

function isValidPhoneNumber(value) {
  return /^\+?[0-9\s-]{8,20}$/.test(value || '');
}

router.post('/register', async (req, res) => {
  const full_name = sanitizeText(req.body.full_name);
  const email = normalizeEmail(req.body.email);
  const phone = sanitizeText(req.body.phone);
  const password = typeof req.body.password === 'string' ? req.body.password : '';

  if (!full_name || !email || !phone || !password) {
    return res.status(400).json({ message: 'All fields are required.' });
  }

  if (full_name.length < 3) {
    return res.status(400).json({ message: 'Full name must be at least 3 characters.' });
  }

  if (!isValidEmail(email)) {
    return res.status(400).json({ message: 'Enter a valid email address.' });
  }

  if (!isValidPhoneNumber(phone)) {
    return res.status(400).json({ message: 'Enter a valid phone number.' });
  }

  if (password.length < 8) {
    return res.status(400).json({ message: 'Password must be at least 8 characters.' });
  }

  try {
    const [existing] = await pool.query('SELECT id FROM users WHERE email = ? LIMIT 1', [email]);

    if (existing.length) {
      return res.status(409).json({ message: 'An account with this email already exists.' });
    }

    const { salt, hash } = hashPassword(password);

    const [result] = await pool.query(
      `INSERT INTO users (full_name, email, password_hash, password_salt, phone, role)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [full_name, email, hash, salt, phone, 'customer'],
    );

    const user = {
      id: result.insertId,
      full_name,
      email,
      phone,
      role: 'customer',
    };

    return res.status(201).json({
      token: createToken(user),
      user,
    });
  } catch (error) {
    console.error('REGISTER ERROR:', error);
    return res.status(500).json({ message: 'Unable to register account.' });
  }
});

router.post('/login', async (req, res) => {
  const email = normalizeEmail(req.body.email);
  const password = typeof req.body.password === 'string' ? req.body.password : '';

  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required.' });
  }

  try {
    const [rows] = await pool.query(
      `SELECT id, full_name, email, phone, role, password_hash, password_salt
       FROM users
       WHERE email = ?
       LIMIT 1`,
      [email],
    );

    if (!rows.length) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    const user = rows[0];
    const valid = verifyPassword(password, user.password_salt, user.password_hash);

    if (!valid) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    const safeUser = {
      id: user.id,
      full_name: user.full_name,
      email: user.email,
      phone: user.phone,
      role: user.role,
    };

    return res.json({
      token: createToken(safeUser),
      user: safeUser,
    });
  } catch (error) {
    console.error('LOGIN ERROR:', error);
    return res.status(500).json({ message: 'Unable to login.' });
  }
});

router.get('/me', authenticateToken, async (req, res) => {
  return res.json({ user: req.user });
});

module.exports = router;
