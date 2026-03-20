require('dotenv').config();

const express = require('express');
const cors = require('cors');
const path = require('path');
const pool = require('./config/db');
const authRoutes = require('./routes/authRoutes');
const serviceRoutes = require('./routes/serviceRoutes');
const repairRoutes = require('./routes/repairRoutes');
const contactRoutes = require('./routes/contactRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(
  cors({
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    credentials: false,
  }),
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.get('/api/health', async (_req, res) => {
  try {
    await pool.query('SELECT 1');
    return res.json({ status: 'ok', database: 'connected' });
  } catch (error) {
    return res.status(500).json({ status: 'error', database: 'disconnected' });
  }
});

app.use('/api/auth', authRoutes);
app.use('/api/services', serviceRoutes);
app.use('/api/repairs', repairRoutes);
app.use('/api/contacts', contactRoutes);
app.use('/api/dashboard', dashboardRoutes);

app.use((error, _req, res, _next) => {
  console.error('SERVER ERROR:', error);

  if (error.message === 'Only image uploads are allowed.') {
    return res.status(400).json({ message: error.message });
  }

  if (error.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ message: 'File is too large. Maximum size is 5MB.' });
  }

  return res.status(500).json({ message: 'Something went wrong on the server.' });
});

app.listen(PORT, () => {
  console.log(`Kalikot Tech backend running on port ${PORT}`);
});
