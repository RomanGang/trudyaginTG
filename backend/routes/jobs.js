const express = require('express');
const Database = require('../models/database');

const router = express.Router();
const db = new Database();

// GET /api/jobs - List jobs with filters
router.get('/jobs', async (req, res) => {
  try {
    const { city, district, status = 'open', category, payment_min, payment_max, limit = 50, offset = 0 } = req.query;

    let sql = `
      SELECT j.*, u.name as employer_name, u.city as employer_city
      FROM jobs j
      LEFT JOIN users u ON j.employer_id = u.id
      WHERE 1=1
    `;
    const params = [];

    if (city) {
      sql += ' AND j.city = ?';
      params.push(city);
    }
    if (district) {
      sql += ' AND j.district = ?';
      params.push(district);
    }
    if (status) {
      sql += ' AND j.status = ?';
      params.push(status);
    }
    if (category) {
      sql += ' AND j.category = ?';
      params.push(category);
    }
    if (payment_min) {
      sql += ' AND j.payment >= ?';
      params.push(parseFloat(payment_min));
    }
    if (payment_max) {
      sql += ' AND j.payment <= ?';
      params.push(parseFloat(payment_max));
    }

    sql += ' ORDER BY j.created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    const jobs = await db.all(sql, params);
    res.json(jobs);
  } catch (error) {
    console.error('Get jobs error:', error);
    res.status(500).json({ error: 'Ошибка получения заказов' });
  }
});

// GET /api/jobs/:id
router.get('/jobs/:id', async (req, res) => {
  try {
    const job = await db.get(`
      SELECT j.*, u.name as employer_name, u.city as employer_city, u.phone as employer_phone
      FROM jobs j
      LEFT JOIN users u ON j.employer_id = u.id
      WHERE j.id = ?
    `, [req.params.id]);

    if (!job) {
      return res.status(404).json({ error: 'Заказ не найден' });
    }
    res.json(job);
  } catch (error) {
    console.error('Get job error:', error);
    res.status(500).json({ error: 'Ошибка' });
  }
});

// POST /api/jobs - Create job
router.post('/jobs', async (req, res) => {
  try {
    const { title, description, payment, payment_type, category, city, district, date, employer_id, requirements } = req.body;

    if (!title || !employer_id) {
      return res.status(400).json({ error: 'Название и работодатель обязательны' });
    }

    const result = await db.run(
      `INSERT INTO jobs (title, description, payment, payment_type, category, city, district, date, employer_id, requirements)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [title, description || '', payment || 0, payment_type || 'fixed', category || '', city || '', district || '', date || '', employer_id, requirements || '']
    );

    const job = await db.get('SELECT * FROM jobs WHERE id = ?', [result.lastID]);
    res.json({ success: true, job });
  } catch (error) {
    console.error('Create job error:', error);
    res.status(500).json({ error: 'Ошибка создания заказа' });
  }
});

// PUT /api/jobs/:id - Update job
router.put('/jobs/:id', async (req, res) => {
  try {
    const { title, description, payment, status, worker_id } = req.body;
    const jobId = req.params.id;

    await db.run(
      `UPDATE jobs SET 
        title = COALESCE(?, title),
        description = COALESCE(?, description),
        payment = COALESCE(?, payment),
        status = COALESCE(?, status),
        worker_id = COALESCE(?, worker_id)
       WHERE id = ?`,
      [title, description, payment, status, worker_id, jobId]
    );

    const job = await db.get('SELECT * FROM jobs WHERE id = ?', [jobId]);
    res.json({ success: true, job });
  } catch (error) {
    console.error('Update job error:', error);
    res.status(500).json({ error: 'Ошибка обновления' });
  }
});

// DELETE /api/jobs/:id
router.delete('/jobs/:id', async (req, res) => {
  try {
    await db.run('DELETE FROM jobs WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (error) {
    console.error('Delete job error:', error);
    res.status(500).json({ error: 'Ошибка удаления' });
  }
});

// GET /api/jobs/employer/:employerId - Jobs by employer
router.get('/jobs/employer/:employerId', async (req, res) => {
  try {
    const jobs = await db.all(
      'SELECT * FROM jobs WHERE employer_id = ? ORDER BY created_at DESC',
      [req.params.employerId]
    );
    res.json(jobs);
  } catch (error) {
    console.error('Get employer jobs error:', error);
    res.status(500).json({ error: 'Ошибка' });
  }
});

module.exports = router;
