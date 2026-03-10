const express = require('express');
const Database = require('../models/database');

const router = express.Router();
const db = new Database();

// POST /api/messages - Send a message
router.post('/messages', async (req, res) => {
  try {
    const { job_id, sender_id, receiver_id, text } = req.body;

    if (!sender_id || !receiver_id || !text) {
      return res.status(400).json({ error: 'Отправитель, получатель и текст обязательны' });
    }

    if (!text.trim()) {
      return res.status(400).json({ error: 'Текст не может быть пустым' });
    }

    const result = await db.run(
      'INSERT INTO messages (job_id, sender_id, receiver_id, text) VALUES (?, ?, ?, ?)',
      [job_id || null, sender_id, receiver_id, text.trim()]
    );

    const message = await db.get('SELECT * FROM messages WHERE id = ?', [result.lastID]);

    res.json({ success: true, message });
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({ error: 'Ошибка отправки сообщения' });
  }
});

// GET /api/messages/job/:jobId - Get messages for a job
router.get('/messages/job/:jobId', async (req, res) => {
  try {
    const messages = await db.all(`
      SELECT m.*, 
             s.name as sender_name, 
             r.name as receiver_name
      FROM messages m
      LEFT JOIN users s ON m.sender_id = s.id
      LEFT JOIN users r ON m.receiver_id = r.id
      WHERE m.job_id = ?
      ORDER BY m.created_at ASC
    `, [req.params.jobId]);

    res.json(messages);
  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json({ error: 'Ошибка получения сообщений' });
  }
});

// GET /api/messages/user/:userId - Get all conversations for user
router.get('/messages/user/:userId', async (req, res) => {
  try {
    // Get last message from each conversation
    const conversations = await db.all(`
      SELECT 
        m.job_id,
        j.title as job_title,
        CASE 
          WHEN m.sender_id = ? THEN m.receiver_id 
          ELSE m.sender_id 
        END as partner_id,
        u.name as partner_name,
        u.rating as partner_rating,
        (SELECT text FROM messages WHERE job_id = m.job_id ORDER BY created_at DESC LIMIT 1) as last_message,
        (SELECT created_at FROM messages WHERE job_id = m.job_id ORDER BY created_at DESC LIMIT 1) as last_time,
        (SELECT COUNT(*) FROM messages WHERE job_id = m.job_id AND receiver_id = ? AND is_read = 0) as unread_count
      FROM messages m
      LEFT JOIN jobs j ON m.job_id = j.id
      LEFT JOIN users u ON u.id = CASE 
          WHEN m.sender_id = ? THEN m.receiver_id 
          ELSE m.sender_id 
        END
      WHERE m.sender_id = ? OR m.receiver_id = ?
      GROUP BY m.job_id
      ORDER BY last_time DESC
    `, [req.params.userId, req.params.userId, req.params.userId, req.params.userId, req.params.userId]);

    res.json(conversations);
  } catch (error) {
    console.error('Get conversations error:', error);
    res.status(500).json({ error: 'Ошибка получения чатов' });
  }
});

// PUT /api/messages/read/:jobId - Mark messages as read
router.put('/messages/read/:jobId', async (req, res) => {
  try {
    const { user_id } = req.body;

    await db.run(
      'UPDATE messages SET is_read = 1 WHERE job_id = ? AND receiver_id = ?',
      [req.params.jobId, user_id]
    );

    res.json({ success: true });
  } catch (error) {
    console.error('Mark read error:', error);
    res.status(500).json({ error: 'Ошибка' });
  }
});

// GET /api/messages/unread/:userId - Get unread count
router.get('/messages/unread/:userId', async (req, res) => {
  try {
    const result = await db.get(
      'SELECT COUNT(*) as count FROM messages WHERE receiver_id = ? AND is_read = 0',
      [req.params.userId]
    );

    res.json({ unread: result?.count || 0 });
  } catch (error) {
    console.error('Get unread error:', error);
    res.status(500).json({ error: 'Ошибка' });
  }
});

module.exports = router;
