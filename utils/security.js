const crypto = require('crypto');
const jwt = require('jsonwebtoken');

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
  return { salt, hash };
}

function verifyPassword(password, salt, hash) {
  const verifyHash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
  return verifyHash === hash;
}

function createToken(user) {
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET is missing in environment variables.');
  }

  return jwt.sign(
    {
      id: user.id,
      full_name: user.full_name,
      email: user.email,
      phone: user.phone,
      role: user.role,
    },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
}

module.exports = {
  createToken,
  hashPassword,
  verifyPassword,
};