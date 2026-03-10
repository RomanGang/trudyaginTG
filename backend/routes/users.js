const express = require('express');
const bcrypt = require('bcrypt');
const Database = require('../models/database');

const router = express.Router();
const db = new Database();

// Validation helpers
const validatePhone = (phone) => {
  if (!phone) return { valid: false, error: 'Номер телефона обязателен' };
  const pattern = /^\+?7?\d{10,15}$/;
  if (!pattern.test(phone.replace(/[\s\-()]/g, ''))) {
    return { valid: false, error: 'Неверный формат номера' };
  }
  return { valid: true };
};

const validatePassword = (password) => {
  if (!password || password.length < 4) {
    return { valid: false, error: 'Пароль минимум 4 символа' };
  }
  return { valid: true };
};

const validateName = (name) => {
  if (!name || name.trim().length < 2) {
    return { valid: false, error: 'Имя минимум 2 символа' };
  }
  return { valid: true };
};

// POST /api/register
router.post('/register', async (req, res) => {
  try {
    const { phone, code, name, password, role, city, district } = req.body;

    // Validate inputs
    let result = validatePhone(phone);
    if (!result.valid) return res.status(400).json({ error: result.error });

    result = validatePassword(password);
    if (!result.valid) return res.status(400).json({ error: result.error });

    result = validateName(name);
    if (!result.valid) return res.status(400).json({ error: result.error });

    if (!['worker', 'employer'].includes(role)) {
      return res.status(400).json({ error: 'Неверная роль' });
    }

    // Check if user exists
    const existing = await db.get('SELECT id FROM users WHERE phone = ?', [phone]);
    if (existing) {
      return res.status(400).json({ error: 'Номер уже зарегистрирован' });
    }

    // Hash password
    const hash = await bcrypt.hash(password, 10);

    // Create user
    const result_db = await db.run(
      'INSERT INTO users (phone, password, name, role, city, district) VALUES (?, ?, ?, ?, ?, ?)',
      [phone, hash, name.trim(), role, city || '', district || '']
    );

    const user = await db.get('SELECT id, phone, name, role, city, district, rating, jobs_done, created_at FROM users WHERE id = ?', [result_db.lastID]);

    res.json({ success: true, user });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ error: 'Ошибка регистрации' });
  }
});

// POST /api/login
router.post('/login', async (req, res) => {
  try {
    const { phone, password } = req.body;

    if (!phone || !password) {
      return res.status(400).json({ error: 'Введите телефон и пароль' });
    }

    const user = await db.get('SELECT * FROM users WHERE phone = ?', [phone]);
    if (!user) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return res.status(401).json({ error: 'Неверный пароль' });
    }

    // Return without password
    const { password: _, ...userData } = user;
    res.json({ success: true, user: userData });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Ошибка входа' });
  }
});

// GET /api/users/:id
router.get('/users/:id', async (req, res) => {
  try {
    const user = await db.get(
      'SELECT id, name, phone, role, city, district, skills, rating, jobs_done, created_at FROM users WHERE id = ?',
      [req.params.id]
    );
    if (!user) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }
    res.json(user);
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Ошибка' });
  }
});

// PUT /api/users/:id
router.put('/users/:id', async (req, res) => {
  try {
    const { name, city, district, skills } = req.body;
    const userId = req.params.id;

    await db.run(
      'UPDATE users SET name = COALESCE(?, name), city = COALESCE(?, city), district = COALESCE(?, district), skills = COALESCE(?, skills) WHERE id = ?',
      [name, city, district, skills, userId]
    );

    const user = await db.get(
      'SELECT id, name, phone, role, city, district, skills, rating, jobs_done FROM users WHERE id = ?',
      [userId]
    );

    res.json({ success: true, user });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ error: 'Ошибка обновления' });
  }
});

// GET /api/stats
router.get('/stats', async (req, res) => {
  try {
    const jobs = await db.get("SELECT COUNT(*) as count FROM jobs WHERE status = 'open'");
    const workers = await db.get("SELECT COUNT(*) as count FROM users WHERE role = 'worker'");
    const done = await db.get("SELECT COUNT(*) as count FROM jobs WHERE status = 'completed'");

    res.json({
      jobs: jobs?.count || 0,
      workers: workers?.count || 0,
      done: done?.count || 0
    });
  } catch (error) {
    console.error('Stats error:', error);
    res.json({ jobs: 0, workers: 0, done: 0 });
  }
});

module.exports = router;
