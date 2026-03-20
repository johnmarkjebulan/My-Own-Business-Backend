const jwt = require('jsonwebtoken');
const pool = require('../config/db');

async function authenticateToken(req, res, next) {
  const header = req.headers.authorization;

  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Authentication required.' });
  }

  const token = header.split(' ')[1];

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const [rows] = await pool.query(
      'SELECT id, full_name, email, phone, role, created_at FROM users WHERE id = ? LIMIT 1',
      [payload.id],
    );

    if (!rows.length) {
      return res.status(401).json({ message: 'User not found.' });
    }

    req.user = rows[0];
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Invalid or expired token.' });
  }
}

function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Admin access required.' });
  }

  next();
}

module.exports = {
  authenticateToken,
  requireAdmin,
};
