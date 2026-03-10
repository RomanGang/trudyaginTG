const sqlite3 = require('sqlite3').verbose();
const path = require('path');

class Database {
  constructor(dbPath = './trudyagin.db') {
    this.db = new sqlite3.Database(dbPath);
    this.init();
  }

  init() {
    // Users table
    this.db.run(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        telegram_id TEXT UNIQUE,
        name TEXT,
        phone TEXT UNIQUE,
        password TEXT,
        role TEXT CHECK(role IN ('worker', 'employer')),
        city TEXT,
        district TEXT,
        skills TEXT,
        rating REAL DEFAULT 0,
        jobs_done INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Jobs table
    this.db.run(`
      CREATE TABLE IF NOT EXISTS jobs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        description TEXT,
        payment REAL,
        payment_type TEXT CHECK(payment_type IN ('fixed', 'hourly', 'shift')),
        category TEXT,
        city TEXT,
        district TEXT,
        date TEXT,
        employer_id INTEGER,
        worker_id INTEGER,
        status TEXT CHECK(status IN ('open', 'in_progress', 'completed', 'cancelled')) DEFAULT 'open',
        requirements TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (employer_id) REFERENCES users(id),
        FOREIGN KEY (worker_id) REFERENCES users(id)
      )
    `);

    // Responses table
    this.db.run(`
      CREATE TABLE IF NOT EXISTS responses (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        job_id INTEGER,
        worker_id INTEGER,
        status TEXT DEFAULT 'pending',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (job_id) REFERENCES jobs(id),
        FOREIGN KEY (worker_id) REFERENCES users(id)
      )
    `);

    // Ratings table
    this.db.run(`
      CREATE TABLE IF NOT EXISTS ratings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        from_user INTEGER,
        to_user INTEGER,
        job_id INTEGER,
        rating INTEGER CHECK(rating >= 1 AND rating <= 5),
        comment TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (from_user) REFERENCES users(id),
        FOREIGN KEY (to_user) REFERENCES users(id),
        FOREIGN KEY (job_id) REFERENCES jobs(id)
      )
    `);

    // Create indexes
    this.db.run(`CREATE INDEX IF NOT EXISTS idx_jobs_city ON jobs(city)`);
    this.db.run(`CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status)`);
    this.db.run(`CREATE INDEX IF NOT EXISTS idx_jobs_employer ON jobs(employer_id)`);
    this.db.run(`CREATE INDEX IF NOT EXISTS idx_responses_job ON responses(job_id)`);
    this.db.run(`CREATE INDEX IF NOT EXISTS idx_ratings_user ON ratings(to_user)`);

    // Messages table for chat
    this.db.run(`
      CREATE TABLE IF NOT EXISTS messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        job_id INTEGER,
        sender_id INTEGER,
        receiver_id INTEGER,
        text TEXT NOT NULL,
        is_read INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (job_id) REFERENCES jobs(id),
        FOREIGN KEY (sender_id) REFERENCES users(id),
        FOREIGN KEY (receiver_id) REFERENCES users(id)
      )
    `);
    this.db.run(`CREATE INDEX IF NOT EXISTS idx_messages_job ON messages(job_id)`);
    this.db.run(`CREATE INDEX IF NOT EXISTS idx_messages_receiver ON messages(receiver_id)`);
  }

  // Helper methods for async/await
  run(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.run(sql, params, function(err) {
        if (err) reject(err);
        else resolve({ lastID: this.lastID, changes: this.changes });
      });
    });
  }

  get(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.get(sql, params, (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  }

  all(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.all(sql, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }

  close() {
    this.db.close();
  }
}

module.exports = Database;
