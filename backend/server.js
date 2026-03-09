const express = require('express');
const cors = require('cors');
const path = require('path');
const db = require('./database');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Serve static files only when NOT on Vercel
if (!process.env.VERCEL) {
  app.use(express.static(path.join(__dirname, '..', 'frontend')));
}

// API routes
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Initialize database
db.get('SELECT 1', [], (err) => {
  if (err) {
    console.error('Database not initialized:', err.message);
  } else {
    console.log('Database ready');
  }
});

// ==================== USER ENDPOINTS ====================

// Create or update user
app.post('/api/user', (req, res) => {
  const { telegram_id, name, phone, role, city, district, skills, referred_by } = req.body;

  if (!telegram_id || !name || !role) {
    return res.status(400).json({ error: 'telegram_id, name, and role are required' });
  }

  const sql = `
    INSERT INTO users (telegram_id, name, phone, role, city, district, skills, referred_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(telegram_id) DO UPDATE SET
      name = excluded.name,
      phone = COALESCE(excluded.phone, users.phone),
      role = excluded.role,
      city = COALESCE(excluded.city, users.city),
      district = COALESCE(excluded.district, users.district),
      skills = COALESCE(excluded.skills, users.skills),
      referred_by = COALESCE(users.referred_by, excluded.referred_by)
  `;

  db.run(sql, [telegram_id, name, phone || null, role, city || null, district || null, skills || null, referred_by || null], function(err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json({ success: true, user_id: telegram_id });
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

// Update user profile
app.put('/api/user/:telegram_id', (req, res) => {
  const { telegram_id } = req.params;
  const { name, phone, city, district, skills } = req.body;

  const sql = `
    UPDATE users 
    SET name = COALESCE(?, name),
        phone = COALESCE(?, phone),
        city = COALESCE(?, city),
        district = COALESCE(?, district),
        skills = COALESCE(?, skills)
    WHERE telegram_id = ?
  `;

  db.run(sql, [name, phone, city, district, skills, telegram_id], function(err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json({ success: true });
  });
});

// ==================== JOB ENDPOINTS ====================

// City name mapping (Russian <-> English)
const cityMap = {
  'Москва': 'Москва',
  'Moscow': 'Москва',
  'Санкт-Петербург': 'Санкт-Петербург',
  'Saint Petersburg': 'Санкт-Петербург',
  'Казань': 'Казань',
  'Kazan': 'Казань',
  'Екатеринбург': 'Екатеринбург',
  'Yekaterinburg': 'Екатеринburg'
};

// Get normalized city name
function getNormalizedCity(city) {
  return cityMap[city] || city;
}

// Get all jobs (with filters)
app.get('/api/jobs', (req, res) => {
  const { city, district, min_payment, status = 'open', category, schedule, payment_type } = req.query;

  let sql = 'SELECT j.*, u.name as employer_name FROM jobs j LEFT JOIN users u ON j.employer_id = u.telegram_id WHERE j.status = ?';
  const params = [status];

  if (city) {
    // Accept both Russian and English city names
    const normalizedCity = getNormalizedCity(city);
    sql += ' AND (j.city = ? OR j.city = ?)';
    params.push(city, normalizedCity);
  }

  if (district) {
    sql += ' AND j.district = ?';
    params.push(district);
  }

  if (min_payment) {
    sql += ' AND j.payment >= ?';
    params.push(parseFloat(min_payment));
  }

  if (category) {
    sql += ' AND j.category = ?';
    params.push(category);
  }

  if (schedule) {
    sql += ' AND j.schedule = ?';
    params.push(schedule);
  }

  if (payment_type) {
    sql += ' AND j.payment_type = ?';
    params.push(payment_type);
  }

  sql += ' ORDER BY j.created_at DESC';

  db.all(sql, params, (err, jobs) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(jobs);
  });
});

// Get jobs for notifications (by city name in Russian)
app.get('/api/notifications/:user_id', (req, res) => {
  const { user_id } = req.params;
  
  const notifications = [];
  
  // Get jobs created by employers in user's city (supports Russian city names)
  db.get('SELECT city FROM users WHERE telegram_id = ?', [user_id], (err, user) => {
    if (!err && user && user.city) {
      db.all(`
        SELECT j.id, j.title, j.city, j.created_at, 'new_job' as type
        FROM jobs j
        WHERE j.city = ? AND j.created_at > datetime('now', '-1 hour')
        ORDER BY j.created_at DESC
        LIMIT 10
      `, [user.city], (err, jobs) => {
        if (!err && jobs) {
          notifications.push(...jobs);
        }
        res.json(notifications);
      });
    } else {
      res.json(notifications);
    }
  });
});

// Create job
app.post('/api/jobs', (req, res) => {
  const { title, description, payment, city, district, date, employer_id, workers_required, category, schedule, payment_type } = req.body;

  if (!title || !description || !payment || !city || !date || !employer_id) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  const workersRequired = workers_required || 1;

  const sql = `
    INSERT INTO jobs (title, description, payment, city, district, date, employer_id, status, workers_required, workers_joined, category, schedule, payment_type)
    VALUES (?, ?, ?, ?, ?, ?, ?, 'open', ?, 0, ?, ?, ?)
  `;

  db.run(sql, [title, description, payment, city, district || null, date, employer_id, workersRequired, category || null, schedule || null, payment_type || null], function(err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json({ success: true, job_id: this.lastID });
  });
});

// Get job by ID (public)
app.get('/api/jobs/:id', (req, res) => {
  const { id } = req.params;

  const sql = 'SELECT j.*, u.name as employer_name FROM jobs j LEFT JOIN users u ON j.employer_id = u.telegram_id WHERE j.id = ?';
  
  db.get(sql, [id], (err, job) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }
    res.json(job);
  });
});

// Get workers for a job
app.get('/api/jobs/:id/workers', (req, res) => {
  const { id } = req.params;

  const sql = `
    SELECT jw.*, u.name as worker_name
    FROM job_workers jw
    LEFT JOIN users u ON jw.worker_id = u.telegram_id
    WHERE jw.job_id = ?
  `;
  
  db.all(sql, [id], (err, workers) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(workers);
  });
});

// ==================== RESPONSE ENDPOINTS ====================

// Respond to job (for single-worker jobs - legacy)
app.post('/api/respond', (req, res) => {
  const { job_id, worker_id } = req.body;

  if (!job_id || !worker_id) {
    return res.status(400).json({ error: 'job_id and worker_id are required' });
  }

  // Check if job exists and is open
  db.get('SELECT * FROM jobs WHERE id = ? AND status = ?', [job_id, 'open'], (err, job) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (!job) {
      return res.status(404).json({ error: 'Job not found or not open' });
    }

    // Check if worker already responded
    db.get('SELECT * FROM responses WHERE job_id = ? AND worker_id = ?', [job_id, worker_id], (err, existing) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      if (existing) {
        return res.status(400).json({ error: 'Already responded to this job' });
      }

      // Add response
      db.run('INSERT INTO responses (job_id, worker_id) VALUES (?, ?)', [job_id, worker_id], function(err) {
        if (err) {
          return res.status(500).json({ error: err.message });
        }
        res.json({ success: true, response_id: this.lastID });
      });
    });
  });
});

// Take Job - for multi-worker jobs
app.post('/api/jobs/:id/take', (req, res) => {
  const { id } = req.params;
  const { worker_id } = req.body;

  if (!worker_id) {
    return res.status(400).json({ error: 'worker_id is required' });
  }

  // Get job
  db.get('SELECT * FROM jobs WHERE id = ?', [id], (err, job) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }
    if (job.status !== 'open') {
      return res.status(400).json({ error: 'Job is not open' });
    }

    const workersRequired = job.workers_required || 1;
    const workersJoined = job.workers_joined || 0;

    // Check if worker already joined
    db.get('SELECT * FROM job_workers WHERE job_id = ? AND worker_id = ?', [id, worker_id], (err, existing) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      if (existing) {
        return res.status(400).json({ error: 'You have already joined this job' });
      }

      // Check if more workers needed
      if (workersJoined >= workersRequired) {
        return res.status(400).json({ error: 'Job already has enough workers' });
      }

      // Add worker to job_workers table
      db.run('INSERT INTO job_workers (job_id, worker_id) VALUES (?, ?)', [id, worker_id], function(err) {
        if (err) {
          return res.status(500).json({ error: err.message });
        }

        const newWorkersJoined = workersJoined + 1;
        let newStatus = 'open';
        
        // If enough workers joined, change status to in_progress
        if (newWorkersJoined >= workersRequired) {
          newStatus = 'in_progress';
        }

        // Update job
        db.run('UPDATE jobs SET workers_joined = ?, status = ? WHERE id = ?', 
          [newWorkersJoined, newStatus, id], function(err) {
          if (err) {
            return res.status(500).json({ error: err.message });
          }
          res.json({ 
            success: true, 
            workers_joined: newWorkersJoined,
            workers_required: workersRequired,
            status: newStatus,
            message: newStatus === 'in_progress' ? 'Job is now in progress!' : 'You have joined the job!'
          });
        });
      });
    });
  });
});

// Leave Job - worker can leave before job starts
app.post('/api/jobs/:id/leave', (req, res) => {
  const { id } = req.params;
  const { worker_id } = req.body;

  if (!worker_id) {
    return res.status(400).json({ error: 'worker_id is required' });
  }

  // Get job
  db.get('SELECT * FROM jobs WHERE id = ?', [id], (err, job) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }
    if (job.status !== 'open') {
      return res.status(400).json({ error: 'Cannot leave job that has started' });
    }

    // Check if worker is in job_workers
    db.get('SELECT * FROM job_workers WHERE job_id = ? AND worker_id = ?', [id, worker_id], (err, existing) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      if (!existing) {
        return res.status(400).json({ error: 'You are not assigned to this job' });
      }

      // Remove worker from job_workers
      db.run('DELETE FROM job_workers WHERE job_id = ? AND worker_id = ?', [id, worker_id], function(err) {
        if (err) {
          return res.status(500).json({ error: err.message });
        }

        const newWorkersJoined = (job.workers_joined || 1) - 1;

        // Update job
        db.run('UPDATE jobs SET workers_joined = ? WHERE id = ?', 
          [newWorkersJoined, id], function(err) {
          if (err) {
            return res.status(500).json({ error: err.message });
          }
          res.json({ 
            success: true, 
            workers_joined: newWorkersJoined,
            workers_required: job.workers_required || 1
          });
        });
      });
    });
  });
});

// Get responses for a job (for employer)
app.get('/api/responses/job/:job_id', (req, res) => {
  const { job_id } = req.params;

  const sql = `
    SELECT r.*, u.name as worker_name, u.rating as worker_rating, u.skills, u.city as worker_city
    FROM responses r
    JOIN users u ON r.worker_id = u.telegram_id
    WHERE r.job_id = ?
    ORDER BY r.created_at DESC
  `;

  db.all(sql, [job_id], (err, responses) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(responses);
  });
});

// Get worker's responses
app.get('/api/responses/worker/:worker_id', (req, res) => {
  const { worker_id } = req.params;

  const sql = `
    SELECT r.*, j.title, j.description, j.payment, j.city, j.district, j.date, j.status as job_status,
           u.name as employer_name
    FROM responses r
    JOIN jobs j ON r.job_id = j.id
    JOIN users u ON j.employer_id = u.telegram_id
    WHERE r.worker_id = ?
    ORDER BY r.created_at DESC
  `;

  db.all(sql, [worker_id], (err, responses) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(responses);
  });
});

// ==================== MY JOBS ENDPOINTS ====================

// Get jobs for user (employer gets created jobs, worker gets responded/accepted jobs)
app.get('/api/my-jobs', (req, res) => {
  const { user_id, role } = req.query;

  if (!user_id || !role) {
    return res.status(400).json({ error: 'user_id and role are required' });
  }

  let sql;
  if (role === 'employer') {
    // Get jobs created by employer
    sql = `
      SELECT j.*, 
             (SELECT COUNT(*) FROM responses WHERE job_id = j.id) as response_count
      FROM jobs j
      WHERE j.employer_id = ?
      ORDER BY j.created_at DESC
    `;
  } else {
    // Get jobs worker has responded to or is working on
    sql = `
      SELECT j.*, r.status as response_status,
             u.name as employer_name
      FROM jobs j
      JOIN responses r ON j.id = r.job_id
      JOIN users u ON j.employer_id = u.telegram_id
      WHERE r.worker_id = ?
      ORDER BY j.created_at DESC
    `;
  }

  db.all(sql, [user_id], (err, jobs) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(jobs);
  });
});

// Assign worker to job
app.post('/api/jobs/:id/assign', (req, res) => {
  const { id } = req.params;
  const { worker_id } = req.body;

  if (!worker_id) {
    return res.status(400).json({ error: 'worker_id is required' });
  }

  db.run('UPDATE jobs SET worker_id = ?, status = ? WHERE id = ?', [worker_id, 'in_progress', id], function(err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    
    // Update response status
    db.run('UPDATE responses SET status = ? WHERE job_id = ? AND worker_id = ?', ['accepted', id, worker_id], (err) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.json({ success: true });
    });
  });
});

// Complete job
app.post('/api/jobs/:id/complete', (req, res) => {
  const { id } = req.params;

  // Get job to check if it's multi-worker
  db.get('SELECT * FROM jobs WHERE id = ?', [id], (err, job) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    db.run('UPDATE jobs SET status = ? WHERE id = ?', ['completed', id], function(err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.json({ success: true });
    });
  });
});

// ==================== RATING ENDPOINTS ====================

// Rate user after job completion
app.post('/api/rate', (req, res) => {
  const { from_user, to_user, job_id, rating, comment } = req.body;

  if (!from_user || !to_user || !job_id || !rating) {
    return res.status(400).json({ error: 'from_user, to_user, job_id, and rating are required' });
  }

  if (rating < 1 || rating > 5) {
    return res.status(400).json({ error: 'Rating must be between 1 and 5' });
  }

  const sql = `
    INSERT INTO ratings (from_user, to_user, job_id, rating, comment)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(from_user, job_id) DO UPDATE SET
      rating = excluded.rating,
      comment = excluded.comment
  `;

  db.run(sql, [from_user, to_user, job_id, rating, comment || null], function(err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    // Update user's average rating
    db.run(`
      UPDATE users 
      SET rating = (SELECT AVG(rating) FROM ratings WHERE to_user = ?)
      WHERE telegram_id = ?
    `, [to_user, to_user], (err) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.json({ success: true });
    });
  });
});

// Get ratings for user
app.get('/api/ratings/:user_id', (req, res) => {
  const { user_id } = req.params;

  const sql = `
    SELECT r.*, u.name as from_user_name
    FROM ratings r
    JOIN users u ON r.from_user = u.telegram_id
    WHERE r.to_user = ?
    ORDER BY r.created_at DESC
  `;

  db.all(sql, [user_id], (err, ratings) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(ratings);
  });
});

// ==================== NOTIFICATION ENDPOINTS ====================

// Get notifications (simplified - in production, use a notifications table)
app.get('/api/notifications/:user_id', (req, res) => {
  const { user_id } = req.params;
  
  // For MVP, we'll fetch recent activities that affect the user
  const notifications = [];
  
  // Get jobs created by employers in worker's city
  db.get('SELECT city FROM users WHERE telegram_id = ?', [user_id], (err, user) => {
    if (!err && user && user.city) {
      db.all(`
        SELECT j.id, j.title, j.city, j.created_at, 'new_job' as type
        FROM jobs j
        WHERE j.city = ? AND j.created_at > datetime('now', '-1 hour')
        ORDER BY j.created_at DESC
        LIMIT 10
      `, [user.city], (err, jobs) => {
        if (!err && jobs) {
          notifications.push(...jobs);
        }
        res.json(notifications);
      });
    } else {
      res.json(notifications);
    }
  });
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Trudyagin server running on port ${PORT}`);
});

// For Vercel serverless
module.exports = app;
