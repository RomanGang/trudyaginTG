const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Database
const db = new sqlite3.Database('./trudyagin.db');

// Enable CORS for all origins
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// Initialize database tables
db.serialize(() => {
  // Users table
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      telegram_id TEXT UNIQUE,
      name TEXT,
      phone TEXT,
      role TEXT,
      city TEXT,
      district TEXT,
      rating REAL DEFAULT 0,
      jobs_done INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Jobs table
  db.run(`
    CREATE TABLE IF NOT EXISTS jobs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT,
      description TEXT,
      payment INTEGER,
      payment_type TEXT DEFAULT 'fixed',
      category TEXT,
      city TEXT,
      district TEXT,
      date TEXT,
      employer_id INTEGER,
      employer_name TEXT,
      status TEXT DEFAULT 'open',
      requirements TEXT,
      selected_worker_id INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Responses table
  db.run(`
    CREATE TABLE IF NOT EXISTS responses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      job_id INTEGER,
      worker_id INTEGER,
      worker_name TEXT,
      status TEXT DEFAULT 'pending',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Ratings table
  db.run(`
    CREATE TABLE IF NOT EXISTS ratings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      from_user INTEGER,
      to_user INTEGER,
      job_id INTEGER,
      rating INTEGER,
      comment TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  console.log('Database tables initialized');
});

// ==================== API ROUTES ====================

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Register user
app.post('/api/register', (req, res) => {
  const { telegram_id, name, phone, role, city, district } = req.body;
  
  if (!telegram_id || !name || !role) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const sql = `
    INSERT OR REPLACE INTO users (telegram_id, name, phone, role, city, district)
    VALUES (?, ?, ?, ?, ?, ?)
  `;
  
  db.run(sql, [telegram_id, name, phone || '', role, city || '', district || ''], function(err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    
    db.get('SELECT * FROM users WHERE telegram_id = ?', [telegram_id], (err, user) => {
      res.json({ success: true, user });
    });
  });
});

// Get user by telegram_id
app.get('/api/user/:telegram_id', (req, res) => {
  const { telegram_id } = req.params;
  
  db.get('SELECT * FROM users WHERE telegram_id = ?', [telegram_id], (err, user) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(user);
  });
});

// Get all jobs (with filters)
app.get('/api/jobs', (req, res) => {
  const { city, category, type, search, date_filter } = req.query;
  
  let sql = 'SELECT * FROM jobs WHERE status != "completed"';
  const params = [];
  
  if (city) {
    sql += ' AND city = ?';
    params.push(city);
  }
  
  if (category) {
    sql += ' AND category = ?';
    params.push(category);
  }
  
  if (search) {
    sql += ' AND (title LIKE ? OR description LIKE ?)';
    params.push(`%${search}%`, `%${search}%`);
  }
  
  if (type === 'hour') {
    sql += ' AND payment_type = "hour"';
  } else if (type === 'shift') {
    sql += ' AND payment_type = "shift"';
  }
  
  sql += ' ORDER BY created_at DESC LIMIT 50';
  
  db.all(sql, params, (err, jobs) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(jobs);
  });
});

// Get single job
app.get('/api/jobs/:id', (req, res) => {
  const { id } = req.params;
  
  db.get('SELECT * FROM jobs WHERE id = ?', [id], (err, job) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }
    res.json(job);
  });
});

// Create job
app.post('/api/jobs', (req, res) => {
  const { 
    title, description, payment, payment_type, category, 
    city, district, date, employer_id, employer_name, requirements 
  } = req.body;
  
  if (!title || !description || !payment || !employer_id) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  
  const sql = `
    INSERT INTO jobs (title, description, payment, payment_type, category, city, district, date, employer_id, employer_name, requirements)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;
  
  db.run(sql, [
    title, description, payment, payment_type || 'fixed', 
    category, city, district, date, employer_id, employer_name, 
    JSON.stringify(requirements || {})
  ], function(err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    
    db.get('SELECT * FROM jobs WHERE id = ?', [this.lastID], (err, job) => {
      res.json({ success: true, job });
    });
  });
});

// Update job (select worker)
app.put('/api/jobs/:id', (req, res) => {
  const { id } = req.params;
  const { status, selected_worker_id } = req.body;
  
  let sql = 'UPDATE jobs SET ';
  const params = [];
  
  if (status) {
    sql += 'status = ?';
    params.push(status);
  }
  
  if (selected_worker_id) {
    if (params.length > 0) sql += ', ';
    sql += 'selected_worker_id = ?';
    params.push(selected_worker_id);
  }
  
  sql += ' WHERE id = ?';
  params.push(id);
  
  db.run(sql, params, function(err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json({ success: true });
  });
});

// Get employer's jobs
app.get('/api/my-jobs/employer/:employer_id', (req, res) => {
  const { employer_id } = req.params;
  
  db.all(`
    SELECT j.*, 
      (SELECT COUNT(*) FROM responses WHERE job_id = j.id) as responses_count
    FROM jobs j 
    WHERE j.employer_id = ? 
    ORDER BY j.created_at DESC
  `, [employer_id], (err, jobs) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(jobs);
  });
});

// Get worker's jobs (responded)
app.get('/api/my-jobs/worker/:worker_id', (req, res) => {
  const { worker_id } = req.params;
  
  db.all(`
    SELECT r.*, j.title, j.description, j.payment, j.city, j.status as job_status, j.selected_worker_id, j.employer_name
    FROM responses r
    JOIN jobs j ON r.job_id = j.id
    WHERE r.worker_id = ?
    ORDER BY r.created_at DESC
  `, [worker_id], (err, jobs) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(jobs);
  });
});

// Respond to job
app.post('/api/respond', (req, res) => {
  const { job_id, worker_id, worker_name } = req.body;
  
  if (!job_id || !worker_id) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  
  // Check if already responded
  db.get('SELECT * FROM responses WHERE job_id = ? AND worker_id = ?', [job_id, worker_id], (err, existing) => {
    if (existing) {
      return res.status(400).json({ error: 'Already responded to this job' });
    }
    
    const sql = 'INSERT INTO responses (job_id, worker_id, worker_name) VALUES (?, ?, ?)';
    
    db.run(sql, [job_id, worker_id, worker_name || ''], function(err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.json({ success: true });
    });
  });
});

// Get responses for a job (for employer)
app.get('/api/responses/job/:job_id', (req, res) => {
  const { job_id } = req.params;
  
  db.all(`
    SELECT r.*, u.name, u.city, u.district, u.rating, u.jobs_done
    FROM responses r
    JOIN users u ON r.worker_id = u.id
    WHERE r.job_id = ?
    ORDER BY r.created_at DESC
  `, [job_id], (err, responses) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(responses);
  });
});

// Select worker for job
app.post('/api/select-worker', (req, res) => {
  const { job_id, worker_id } = req.body;
  
  if (!job_id || !worker_id) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  
  // Update job
  db.run('UPDATE jobs SET status = "in_progress", selected_worker_id = ? WHERE id = ?', [worker_id, job_id], function(err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    
    // Update response status
    db.run('UPDATE responses SET status = "accepted" WHERE job_id = ? AND worker_id = ?', [job_id, worker_id], function(err2) {
      db.run('UPDATE responses SET status = "rejected" WHERE job_id = ? AND worker_id != ?', [job_id, worker_id], function(err3) {
        db.get('SELECT * FROM jobs WHERE id = ?', [job_id], (err, job) => {
          res.json({ success: true, job });
        });
      });
    });
  });
});

// Rate user
app.post('/api/rate', (req, res) => {
  const { from_user, to_user, job_id, rating, comment } = req.body;
  
  if (!from_user || !to_user || !rating) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  
  const sql = 'INSERT INTO ratings (from_user, to_user, job_id, rating, comment) VALUES (?, ?, ?, ?, ?)';
  
  db.run(sql, [from_user, to_user, job_id, rating, comment || ''], function(err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    
    // Update user rating and jobs_done
    db.get('SELECT AVG(rating) as avg FROM ratings WHERE to_user = ?', [to_user], (err, result) => {
      db.run('UPDATE users SET rating = ?, jobs_done = jobs_done + 1 WHERE id = ?', [result.avg || rating, to_user], function(err2) {
        // Mark job as completed
        db.run('UPDATE jobs SET status = "completed" WHERE id = ?', [job_id], function(err3) {
          res.json({ success: true });
        });
      });
    });
  });
});

// Get user reviews
app.get('/api/reviews/:user_id', (req, res) => {
  const { user_id } = req.params;
  
  db.all(`
    SELECT r.*, u.name as from_name
    FROM ratings r
    JOIN users u ON r.from_user = u.id
    WHERE r.to_user = ?
    ORDER BY r.created_at DESC
    LIMIT 20
  `, [user_id], (err, reviews) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(reviews);
  });
});

// Get user by ID
app.get('/api/users/:id', (req, res) => {
  const { id } = req.params;
  
  db.get('SELECT id, telegram_id, name, role, city, district, rating, jobs_done, created_at FROM users WHERE id = ?', [id], (err, user) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(user);
  });
});

// Stats
app.get('/api/stats', (req, res) => {
  db.get('SELECT COUNT(*) as jobs FROM jobs WHERE status = "open"', (err, jobs) => {
    db.get('SELECT COUNT(*) as users FROM users WHERE role = "worker"', (err2, workers) => {
      db.get('SELECT COUNT(*) as done FROM jobs WHERE status = "completed"', (err3, done) => {
        res.json({
          jobs: jobs.jobs || 0,
          workers: workers.users || 0,
          done: done.done || 0
        });
      });
    });
  });
});

// Serve static files in production
app.use(express.static(path.join(__dirname, '..', 'frontend')));

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'frontend', 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Trudyagin server running on port ${PORT}`);
});

module.exports = app;
