const express = require('express');
const pool = require('../config/db');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const upload = require('../middleware/upload');
const { generateTicketNumber } = require('../utils/ticket');

const router = express.Router();

const ALLOWED_STATUSES = [
  'received',
  'diagnosing',
  'awaiting_approval',
  'repair_in_progress',
  'quality_check',
  'ready_for_pickup',
  'completed',
];

function parseImagePaths(value) {
  if (!value) return [];

  try {
    return JSON.parse(value);
  } catch (error) {
    return [];
  }
}

function sanitizeText(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function sanitizeOptionalText(value) {
  const cleaned = sanitizeText(value);
  return cleaned || null;
}

function isValidPhoneNumber(value) {
  return /^\+?[0-9\s-]{8,20}$/.test(value || '');
}

router.post('/', authenticateToken, upload.array('deviceImages', 3), async (req, res) => {
  const serviceType = sanitizeText(req.body.serviceType);
  const deviceBrand = sanitizeText(req.body.deviceBrand);
  const deviceModel = sanitizeText(req.body.deviceModel);
  const issueTitle = sanitizeText(req.body.issueTitle);
  const issueDescription = sanitizeText(req.body.issueDescription);
  const urgency = sanitizeText(req.body.urgency) || 'standard';
  const preferredDate = sanitizeOptionalText(req.body.preferredDate);
  const preferredTime = sanitizeOptionalText(req.body.preferredTime);
  const budget = sanitizeOptionalText(req.body.budget);
  const pickupOption = sanitizeText(req.body.pickupOption) || 'store_pickup';
  const contactNumber = sanitizeText(req.body.contactNumber);
  const pickupAddress = sanitizeOptionalText(req.body.pickupAddress);
  const cityMunicipality = sanitizeOptionalText(req.body.cityMunicipality);
  const landmark = sanitizeOptionalText(req.body.landmark);

  if (!serviceType || !deviceBrand || !deviceModel || !issueTitle || !issueDescription || !contactNumber) {
    return res.status(400).json({ message: 'Required booking fields are missing.' });
  }

  if (issueTitle.length < 5) {
    return res.status(400).json({ message: 'Issue title must be at least 5 characters.' });
  }

  if (issueDescription.length < 15) {
    return res.status(400).json({ message: 'Issue description must be at least 15 characters.' });
  }

  if (!isValidPhoneNumber(contactNumber)) {
    return res.status(400).json({ message: 'Enter a valid contact number.' });
  }

  if (['delivery', 'messenger'].includes(pickupOption) && !pickupAddress) {
    return res.status(400).json({ message: 'Pickup or delivery address is required for messenger or delivery requests.' });
  }

  const ticketNumber = generateTicketNumber();
  const imagePaths = (req.files || []).map((file) => `/uploads/${file.filename}`);

  try {
    const [result] = await pool.query(
      `INSERT INTO repair_requests (
        ticket_number,
        user_id,
        customer_name,
        customer_email,
        contact_number,
        device_brand,
        device_model,
        service_type,
        issue_title,
        issue_description,
        urgency,
        preferred_date,
        budget,
        preferred_time,
        pickup_option,
        pickup_address,
        city_municipality,
        landmark,
        status,
        image_paths
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'received', ?)`,
      [
        ticketNumber,
        req.user.id,
        req.user.full_name,
        req.user.email,
        contactNumber,
        deviceBrand,
        deviceModel,
        serviceType,
        issueTitle,
        issueDescription,
        urgency,
        preferredDate,
        budget,
        preferredTime,
        pickupOption,
        pickupAddress,
        cityMunicipality,
        landmark,
        JSON.stringify(imagePaths),
      ],
    );

    await pool.query(
      'INSERT INTO repair_status_logs (repair_request_id, status, note, created_by) VALUES (?, ?, ?, ?)',
      [result.insertId, 'received', 'Repair request submitted by customer.', req.user.id],
    );

    return res.status(201).json({
      message: 'Repair request submitted successfully.',
      repair: {
        id: result.insertId,
        ticket_number: ticketNumber,
        image_paths: imagePaths,
      },
    });
  } catch (error) {
    console.error('CREATE REPAIR ERROR:', error);
    return res.status(500).json({ message: 'Unable to create repair request.' });
  }
});

router.get('/my', authenticateToken, async (req, res) => {
  try {
    const [repairs] = await pool.query(
      'SELECT * FROM repair_requests WHERE user_id = ? ORDER BY created_at DESC',
      [req.user.id],
    );

    const formattedRepairs = repairs.map((repair) => ({
      ...repair,
      image_paths: parseImagePaths(repair.image_paths),
    }));

    return res.json({ repairs: formattedRepairs });
  } catch (error) {
    console.error('FETCH MY REPAIRS ERROR:', error);
    return res.status(500).json({ message: 'Unable to fetch repair history.' });
  }
});

router.get('/track/:ticketNumber', async (req, res) => {
  const ticketNumber = sanitizeText(req.params.ticketNumber).toUpperCase();

  if (!/^SFX-[A-Z0-9-]{6,20}$/.test(ticketNumber)) {
    return res.status(400).json({ message: 'Enter a valid ticket number format.' });
  }

  try {
    const [repairs] = await pool.query(
      'SELECT * FROM repair_requests WHERE ticket_number = ? LIMIT 1',
      [ticketNumber],
    );

    if (!repairs.length) {
      return res.status(404).json({ message: 'Ticket not found.' });
    }

    const request = {
      ...repairs[0],
      image_paths: parseImagePaths(repairs[0].image_paths),
    };

    const [logs] = await pool.query(
      'SELECT id, status, note, created_at FROM repair_status_logs WHERE repair_request_id = ? ORDER BY created_at DESC',
      [request.id],
    );

    return res.json({ request, logs });
  } catch (error) {
    console.error('TRACK TICKET ERROR:', error);
    return res.status(500).json({ message: 'Unable to track ticket.' });
  }
});

router.get('/admin/all', authenticateToken, requireAdmin, async (_req, res) => {
  try {
    const [repairs] = await pool.query('SELECT * FROM repair_requests ORDER BY created_at DESC');

    const formattedRepairs = repairs.map((repair) => ({
      ...repair,
      image_paths: parseImagePaths(repair.image_paths),
    }));

    return res.json({ repairs: formattedRepairs });
  } catch (error) {
    console.error('FETCH ADMIN REPAIRS ERROR:', error);
    return res.status(500).json({ message: 'Unable to fetch repair queue.' });
  }
});

router.put('/:id/status', authenticateToken, requireAdmin, async (req, res) => {
  const status = sanitizeText(req.body.status);
  const note = sanitizeOptionalText(req.body.note);
  const estimateAmount = sanitizeOptionalText(req.body.estimateAmount);

  if (!status) {
    return res.status(400).json({ message: 'Status is required.' });
  }

  if (!ALLOWED_STATUSES.includes(status)) {
    return res.status(400).json({ message: 'Invalid repair status selected.' });
  }

  if (status === 'awaiting_approval' && !estimateAmount) {
    return res.status(400).json({ message: 'Estimate amount is required before sending for approval.' });
  }

  try {
    const [repairs] = await pool.query(
      'SELECT id, customer_name, ticket_number FROM repair_requests WHERE id = ? LIMIT 1',
      [req.params.id],
    );

    if (!repairs.length) {
      return res.status(404).json({ message: 'Repair request not found.' });
    }

    await pool.query(
      'UPDATE repair_requests SET status = ?, estimate_amount = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [status, estimateAmount, req.params.id],
    );

    const autoNote = status === 'awaiting_approval'
      ? `Repair estimate is ready for customer approval. Estimated cost: PHP ${estimateAmount}.`
      : note;

    await pool.query(
      'INSERT INTO repair_status_logs (repair_request_id, status, note, created_by) VALUES (?, ?, ?, ?)',
      [req.params.id, status, autoNote || null, req.user.id],
    );

    return res.json({ message: 'Repair status updated successfully.' });
  } catch (error) {
    console.error('UPDATE REPAIR STATUS ERROR:', error);
    return res.status(500).json({ message: 'Unable to update repair status.' });
  }
});

router.post('/:id/approval', authenticateToken, async (req, res) => {
  const action = sanitizeText(req.body.action);
  const note = sanitizeOptionalText(req.body.note);

  if (!['approve', 'reject'].includes(action)) {
    return res.status(400).json({ message: 'Invalid approval action.' });
  }

  try {
    const [repairs] = await pool.query(
      'SELECT id, user_id, status, estimate_amount FROM repair_requests WHERE id = ? LIMIT 1',
      [req.params.id],
    );

    if (!repairs.length) {
      return res.status(404).json({ message: 'Repair request not found.' });
    }

    const repair = repairs[0];

    if (repair.user_id !== req.user.id) {
      return res.status(403).json({ message: 'You can only manage your own repair requests.' });
    }

    if (repair.status !== 'awaiting_approval') {
      return res.status(400).json({ message: 'This repair request is not awaiting approval.' });
    }

    const nextStatus = action === 'approve' ? 'repair_in_progress' : 'diagnosing';
    const logNote = action === 'approve'
      ? `Customer approved the estimate${repair.estimate_amount ? ` of PHP ${repair.estimate_amount}` : ''}.${note ? ` ${note}` : ''}`
      : `Customer requested a revised estimate.${note ? ` ${note}` : ''}`;

    await pool.query(
      'UPDATE repair_requests SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [nextStatus, repair.id],
    );

    await pool.query(
      'INSERT INTO repair_status_logs (repair_request_id, status, note, created_by) VALUES (?, ?, ?, ?)',
      [repair.id, nextStatus, logNote, req.user.id],
    );

    return res.json({ message: action === 'approve' ? 'Estimate approved successfully.' : 'Revision request sent successfully.' });
  } catch (error) {
    console.error('REPAIR APPROVAL ERROR:', error);
    return res.status(500).json({ message: 'Unable to process the estimate decision.' });
  }
});

module.exports = router;
