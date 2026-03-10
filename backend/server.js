require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const helmet = require('helmet');
const morgan = require('morgan');

// Import middleware
const { apiLimiter, authLimiter, createJobLimiter } = require('./middleware/rateLimiter');

// Import routes
const usersRouter = require('./routes/users');
const jobsRouter = require('./routes/jobs');
const responsesRouter = require('./routes/responses');
const ratingsRouter = require('./routes/ratings');
const messagesRouter = require('./routes/messages');

const app = express();
const PORT = process.env.PORT || 3000;

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://telegram.org"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "https://api.telegram.org"],
      frameSrc: ["'none'"]
    }
  }
}));

// Request logging
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('combined'));
}

// CORS - allow specific origins
const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',')
  : [
      'https://trudyagin-tg-ej6c.vercel.app',
      'http://localhost:3000',
      'http://localhost:5173'
    ];

app.use(cors({
  origin: function(origin, callback) {
    if (!origin) return callback(null, true);
    if (ALLOWED_ORIGINS.indexOf(origin) === -1) {
      return callback(new Error('Not allowed by CORS'), false);
    }
    return callback(null, true);
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

app.use(express.json());

// Apply rate limiting to all API routes
app.use('/api', apiLimiter);

// API Routes - MUST come before static files
app.use('/api', usersRouter);
app.use('/api', jobsRouter);
app.use('/api', responsesRouter);
app.use('/api', ratingsRouter);
app.use('/api', messagesRouter);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Serve static files from frontend directory
app.use(express.static(path.join(__dirname, '../frontend')));

// Stats endpoint
app.get('/api/stats', async (req, res) => {
  const Database = require('./models/database');
  const db = new Database();
  
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
    res.json({ jobs: 0, workers: 0, done: 0 });
  }
});

// SPA fallback
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Error:', err.message);
  res.status(500).json({ error: 'Внутренняя ошибка сервера' });
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📱 API: http://localhost:${PORT}/api`);
});

module.exports = app;
