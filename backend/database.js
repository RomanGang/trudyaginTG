const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Use /tmp for Vercel (ephemeral filesystem) or local path for development
const dbPath = process.env.VERCEL ? '/tmp/trudyagin.db' : path.join(__dirname, '..', 'database', 'trudyagin.db');

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
  } else {
    console.log('Connected to SQLite database');
    initializeTables();
  }
});

function initializeTables() {
  // Users table
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      telegram_id INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      phone TEXT,
      role TEXT CHECK(role IN ('worker', 'employer')) NOT NULL,
      city TEXT,
      district TEXT,
      skills TEXT,
      rating REAL DEFAULT 0,
      job_publish_price REAL DEFAULT 0,
      premium_worker INTEGER DEFAULT 0,
      commission_percent REAL DEFAULT 0,
      referred_by INTEGER DEFAULT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (referred_by) REFERENCES users(telegram_id)
    )
  `);

  // Jobs table
  db.run(`
    CREATE TABLE IF NOT EXISTS jobs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      payment REAL NOT NULL,
      city TEXT NOT NULL,
      district TEXT NOT NULL,
      date TEXT NOT NULL,
      employer_id INTEGER NOT NULL,
      worker_id INTEGER,
      status TEXT CHECK(status IN ('open', 'in_progress', 'completed')) DEFAULT 'open',
      workers_required INTEGER DEFAULT 1,
      workers_joined INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (employer_id) REFERENCES users(telegram_id),
      FOREIGN KEY (worker_id) REFERENCES users(telegram_id)
    )
  `);

  // Job Workers table - tracks workers assigned to multi-worker jobs
  db.run(`
    CREATE TABLE IF NOT EXISTS job_workers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      job_id INTEGER NOT NULL,
      worker_id INTEGER NOT NULL,
      joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (job_id) REFERENCES jobs(id),
      FOREIGN KEY (worker_id) REFERENCES users(telegram_id),
      UNIQUE(job_id, worker_id)
    )
  `);

  // Responses table
  db.run(`
    CREATE TABLE IF NOT EXISTS responses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      job_id INTEGER NOT NULL,
      worker_id INTEGER NOT NULL,
      status TEXT DEFAULT 'pending',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (job_id) REFERENCES jobs(id),
      FOREIGN KEY (worker_id) REFERENCES users(telegram_id),
      UNIQUE(job_id, worker_id)
    )
  `);

  // Ratings table
  db.run(`
    CREATE TABLE IF NOT EXISTS ratings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      from_user INTEGER NOT NULL,
      to_user INTEGER NOT NULL,
      job_id INTEGER NOT NULL,
      rating INTEGER CHECK(rating >= 1 AND rating <= 5) NOT NULL,
      comment TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (from_user) REFERENCES users(telegram_id),
      FOREIGN KEY (to_user) REFERENCES users(telegram_id),
      FOREIGN KEY (job_id) REFERENCES jobs(id),
      UNIQUE(from_user, job_id)
    )
  `);

  // Add new columns to existing jobs table if they don't exist
  db.run(`ALTER TABLE jobs ADD COLUMN workers_required INTEGER DEFAULT 1`, (err) => {
    // Ignore error if column already exists
  });
  db.run(`ALTER TABLE jobs ADD COLUMN workers_joined INTEGER DEFAULT 0`, (err) => {
    // Ignore error if column already exists
  });
  db.run(`ALTER TABLE users ADD COLUMN referred_by INTEGER DEFAULT NULL`, (err) => {
    // Ignore error if column already exists
  });

  console.log('Database tables initialized');
}

module.exports = db;
