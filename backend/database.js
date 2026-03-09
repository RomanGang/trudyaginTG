const path = require('path');

// Check what database to use based on environment
const usePostgres = process.env.DATABASE_URL && process.env.DATABASE_URL.startsWith('postgres');

let db;
let dbModule;

if (usePostgres) {
  // PostgreSQL for Railway
  const { Pool } = require('pg');
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });
  
  dbModule = {
    // Wrapper for PostgreSQL to match SQLite API
    get: (sql, params) => pool.query(sql, params).then(r => r.rows[0]),
    run: (sql, params) => pool.query(sql, params),
    all: (sql, params) => pool.query(sql, params).then(r => r.rows),
    close: () => pool.end()
  };
  
  console.log('Using PostgreSQL database');
  
  // Initialize PostgreSQL tables
  (async () => {
    try {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS users (
          telegram_id BIGINT PRIMARY KEY,
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
          referred_by BIGINT DEFAULT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        
        CREATE TABLE IF NOT EXISTS jobs (
          id SERIAL PRIMARY KEY,
          title TEXT NOT NULL,
          description TEXT NOT NULL,
          payment REAL NOT NULL,
          city TEXT NOT NULL,
          district TEXT,
          date TEXT NOT NULL,
          employer_id BIGINT NOT NULL,
          worker_id BIGINT,
          status TEXT CHECK(status IN ('open', 'in_progress', 'completed')) DEFAULT 'open',
          workers_required INTEGER DEFAULT 1,
          workers_joined INTEGER DEFAULT 0,
          category TEXT,
          schedule TEXT,
          payment_type TEXT,
          job_publish_price REAL DEFAULT 0,
          premium_worker INTEGER DEFAULT 0,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        
        CREATE TABLE IF NOT EXISTS responses (
          id SERIAL PRIMARY KEY,
          job_id INTEGER NOT NULL,
          worker_id BIGINT NOT NULL,
          status TEXT DEFAULT 'pending',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (job_id) REFERENCES jobs(id),
          FOREIGN KEY (worker_id) REFERENCES users(telegram_id)
        );
        
        CREATE TABLE IF NOT EXISTS ratings (
          id SERIAL PRIMARY KEY,
          from_user BIGINT NOT NULL,
          to_user BIGINT NOT NULL,
          job_id INTEGER NOT NULL,
          rating INTEGER CHECK(rating >= 1 AND rating <= 5),
          comment TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (from_user) REFERENCES users(telegram_id),
          FOREIGN KEY (to_user) REFERENCES users(telegram_id),
          FOREIGN KEY (job_id) REFERENCES jobs(id)
        );
        
        CREATE TABLE IF NOT EXISTS job_workers (
          id SERIAL PRIMARY KEY,
          job_id INTEGER NOT NULL,
          worker_id BIGINT NOT NULL,
          status TEXT DEFAULT 'joined',
          joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (job_id) REFERENCES jobs(id),
          FOREIGN KEY (worker_id) REFERENCES users(telegram_id)
        );
        
        CREATE TABLE IF NOT EXISTS favorites (
          id SERIAL PRIMARY KEY,
          user_id BIGINT NOT NULL,
          job_id INTEGER NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(telegram_id),
          FOREIGN KEY (job_id) REFERENCES jobs(id),
          UNIQUE(user_id, job_id)
        );
        
        CREATE TABLE IF NOT EXISTS teams (
          id SERIAL PRIMARY KEY,
          name TEXT NOT NULL,
          owner_id BIGINT NOT NULL,
          description TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (owner_id) REFERENCES users(telegram_id)
        );
        
        CREATE TABLE IF NOT EXISTS team_members (
          id SERIAL PRIMARY KEY,
          team_id INTEGER NOT NULL,
          user_id BIGINT NOT NULL,
          role TEXT DEFAULT 'member',
          joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (team_id) REFERENCES teams(id),
          FOREIGN KEY (user_id) REFERENCES users(telegram_id),
          UNIQUE(team_id, user_id)
        );
        
        CREATE TABLE IF NOT EXISTS notifications (
          id SERIAL PRIMARY KEY,
          user_id BIGINT NOT NULL,
          type TEXT NOT NULL,
          title TEXT NOT NULL,
          message TEXT,
          data TEXT,
          is_read INTEGER DEFAULT 0,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(telegram_id)
        );
        
        CREATE TABLE IF NOT EXISTS wallet (
          id SERIAL PRIMARY KEY,
          user_id BIGINT UNIQUE NOT NULL,
          balance REAL DEFAULT 0,
          total_earned REAL DEFAULT 0,
          total_spent REAL DEFAULT 0,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(telegram_id)
        );
      `);
      console.log('PostgreSQL tables initialized');
    } catch (err) {
      console.error('Error initializing tables:', err.message);
    }
  })();
  
} else {
  // SQLite for local development / Railway
  const sqlite3 = require('sqlite3').verbose();
  
  // Use /tmp for Railway/Vercel (ephemeral filesystem) or local path for development
  const isEphemeral = process.env.RAILWAY_ENVIRONMENT || process.env.VERCEL;
  const dbPath = isEphemeral ? '/tmp/trudyagin.db' : path.join(__dirname, '..', 'database', 'trudyagin.db');
  
  db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
      console.error('Error opening database:', err.message);
    } else {
      console.log('Connected to SQLite database');
      initializeTables();
    }
  });
  
  function initializeTables() {
    db.run(`CREATE TABLE IF NOT EXISTS users (
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
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS jobs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      payment REAL NOT NULL,
      city TEXT NOT NULL,
      district TEXT,
      date TEXT NOT NULL,
      employer_id INTEGER NOT NULL,
      worker_id INTEGER,
      status TEXT CHECK(status IN ('open', 'in_progress', 'completed')) DEFAULT 'open',
      workers_required INTEGER DEFAULT 1,
      workers_joined INTEGER DEFAULT 0,
      category TEXT,
      schedule TEXT,
      payment_type TEXT,
      job_publish_price REAL DEFAULT 0,
      premium_worker INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS responses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      job_id INTEGER NOT NULL,
      worker_id INTEGER NOT NULL,
      status TEXT DEFAULT 'pending',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS ratings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      from_user INTEGER NOT NULL,
      to_user INTEGER NOT NULL,
      job_id INTEGER NOT NULL,
      rating INTEGER CHECK(rating >= 1 AND rating <= 5),
      comment TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS job_workers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      job_id INTEGER NOT NULL,
      worker_id INTEGER NOT NULL,
      status TEXT DEFAULT 'joined',
      joined_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS favorites (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      job_id INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, job_id)
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS teams (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      owner_id INTEGER NOT NULL,
      description TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS team_members (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      team_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      role TEXT DEFAULT 'member',
      joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(team_id, user_id)
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      message TEXT,
      data TEXT,
      is_read INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS wallet (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER UNIQUE NOT NULL,
      balance REAL DEFAULT 0,
      total_earned REAL DEFAULT 0,
      total_spent REAL DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    console.log('SQLite tables initialized');
  }

  const { Database } = require('sqlite3');
  
  Database.prototype.getPromise = function(sql, params) {
    return new Promise((resolve, reject) => {
      this.get(sql, params, (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  };
  
  Database.prototype.runPromise = function(sql, params) {
    return new Promise((resolve, reject) => {
      this.run(sql, params, function(err) {
        if (err) reject(err);
        else resolve({ lastID: this.lastID, changes: this.changes });
      });
    });
  };
  
  Database.prototype.allPromise = function(sql, params) {
    return new Promise((resolve, reject) => {
      this.all(sql, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  };

  dbModule = {
    get: (sql, params) => db.getPromise(sql, params),
    run: (sql, params) => db.runPromise(sql, params),
    all: (sql, params) => db.allPromise(sql, params),
    close: () => db.close()
  };
}

module.exports = dbModule;
