const express = require('express');
const Database = require('../models/database');

const router = express.Router();
const db = new Database();

// POST /api/respond - Worker responds to job
router.post('/respond', async (req, res) => {
  try {
    const { job_id, worker_id } = req.body;

    if (!job_id || !worker_id) {
      return res.status(400).json({ error: 'ID заказа и исполнителя обязательны' });
    }

    // Check if already responded
    const existing = await db.get(
      'SELECT id FROM responses WHERE job_id = ? AND worker_id = ?',
      [job_id, worker_id]
    );

    if (existing) {
      return res.status(400).json({ error: 'Вы уже откликнулись на этот заказ' });
    }

    const result = await db.run(
      'INSERT INTO responses (job_id, worker_id) VALUES (?, ?)',
      [job_id, worker_id]
    );

    res.json({ success: true, response_id: result.lastID });
  } catch (error) {
    console.error('Respond error:', error);
    res.status(500).json({ error: 'Ошибка отклика' });
  }
});

// GET /api/responses/job/:jobId - Get responses for a job
router.get('/responses/job/:jobId', async (req, res) => {
  try {
    const responses = await db.all(`
      SELECT r.*, u.name as worker_name, u.city as worker_city, u.rating as worker_rating
      FROM responses r
      LEFT JOIN users u ON r.worker_id = u.id
      WHERE r.job_id = ?
      ORDER BY r.created_at DESC
    `, [req.params.jobId]);

    res.json(responses);
  } catch (error) {
    console.error('Get responses error:', error);
    res.status(500).json({ error: 'Ошибка получения откликов' });
  }
});

// GET /api/responses/worker/:workerId - Get worker's responses
router.get('/responses/worker/:workerId', async (req, res) => {
  try {
    const responses = await db.all(`
      SELECT r.*, j.title as job_title, j.status as job_status, j.payment
      FROM responses r
      LEFT JOIN jobs j ON r.job_id = j.id
      WHERE r.worker_id = ?
      ORDER BY r.created_at DESC
    `, [req.params.workerId]);

    res.json(responses);
  } catch (error) {
    console.error('Get worker responses error:', error);
    res.status(500).json({ error: 'Ошибка' });
  }
});

// PUT /api/responses/:id - Update response status (accept/reject)
router.put('/responses/:id', async (req, res) => {
  try {
    const { status, worker_id } = req.body;
    const responseId = req.params.id;

    // Update response status
    await db.run(
      'UPDATE responses SET status = ? WHERE id = ?',
      [status, responseId]
    );

    // If accepted, update job and reject other responses
    if (status === 'accepted' && worker_id) {
      const response = await db.get('SELECT job_id FROM responses WHERE id = ?', [responseId]);
      
      if (response) {
        // Assign worker to job
        await db.run(
          'UPDATE jobs SET worker_id = ?, status = ? WHERE id = ?',
          [worker_id, 'in_progress', response.job_id]
        );

        // Reject other responses
        await db.run(
          'UPDATE responses SET status = ? WHERE job_id = ? AND id != ?',
          ['rejected', response.job_id, responseId]
        );
      }
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Update response error:', error);
    res.status(500).json({ error: 'Ошибка' });
  }
});

module.exports = router;
