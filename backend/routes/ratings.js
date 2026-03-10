const express = require('express');
const Database = require('../models/database');

const router = express.Router();
const db = new Database();

// POST /api/rate - Rate a user
router.post('/rate', async (req, res) => {
  try {
    const { from_user, to_user, job_id, rating, comment } = req.body;

    if (!from_user || !to_user || !rating) {
      return res.status(400).json({ error: 'Оцените пользователя' });
    }

    if (rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'Рейтинг от 1 до 5' });
    }

    // Check if already rated
    const existing = await db.get(
      'SELECT id FROM ratings WHERE from_user = ? AND to_user = ? AND job_id = ?',
      [from_user, to_user, job_id]
    );

    if (existing) {
      return res.status(400).json({ error: 'Вы уже оценили этого пользователя' });
    }

    // Create rating
    await db.run(
      'INSERT INTO ratings (from_user, to_user, job_id, rating, comment) VALUES (?, ?, ?, ?, ?)',
      [from_user, to_user, job_id, rating, comment || '']
    );

    // Update user average rating
    const avg = await db.get(
      'SELECT AVG(rating) as avg FROM ratings WHERE to_user = ?',
      [to_user]
    );

    await db.run(
      'UPDATE users SET rating = ? WHERE id = ?',
      [avg.avg || rating, to_user]
    );

    // If job completed, update jobs_done count
    if (job_id) {
      await db.run(
        "UPDATE jobs SET status = 'completed' WHERE id = ?",
        [job_id]
      );

      await db.run(
        'UPDATE users SET jobs_done = jobs_done + 1 WHERE id = ?',
        [to_user]
      );
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Rate error:', error);
    res.status(500).json({ error: 'Ошибка оценки' });
  }
});

// GET /api/ratings/user/:userId - Get ratings for user
router.get('/ratings/user/:userId', async (req, res) => {
  try {
    const ratings = await db.all(`
      SELECT r.*, u.name as from_user_name, j.title as job_title
      FROM ratings r
      LEFT JOIN users u ON r.from_user = u.id
      LEFT JOIN jobs j ON r.job_id = j.id
      WHERE r.to_user = ?
      ORDER BY r.created_at DESC
      LIMIT 20
    `, [req.params.userId]);

    const stats = await db.get(
      'SELECT AVG(rating) as avg, COUNT(*) as count FROM ratings WHERE to_user = ?',
      [req.params.userId]
    );

    res.json({ ratings, stats: { avg: stats.avg || 0, count: stats.count || 0 } });
  } catch (error) {
    console.error('Get ratings error:', error);
    res.status(500).json({ error: 'Ошибка получения рейтингов' });
  }
});

module.exports = router;
