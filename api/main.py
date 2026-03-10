import os
import sqlite3
import json
from flask import Flask, request, jsonify, send_from_directory

app = Flask(__name__, static_folder='frontend')

# Database path
DB_PATH = os.path.join(os.path.dirname(__file__), 'trudyagin.db')

def init_db():
    """Initialize database tables"""
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    
    c.execute('''
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
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    c.execute('''
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
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    c.execute('''
        CREATE TABLE IF NOT EXISTS responses (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            job_id INTEGER,
            worker_id INTEGER,
            worker_name TEXT,
            status TEXT DEFAULT 'pending',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    c.execute('''
        CREATE TABLE IF NOT EXISTS ratings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            from_user INTEGER,
            to_user INTEGER,
            job_id INTEGER,
            rating INTEGER,
            comment TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    conn.commit()
    conn.close()

# Initialize DB on startup
init_db()

def dict_from_row(row, columns):
    return dict(zip(columns, row))

# ==================== API ROUTES ====================

@app.route('/api/health')
def health():
    return jsonify({'status': 'ok', 'timestamp': '2026-03-09'})

@app.route('/api/register', methods=['POST'])
def register():
    data = request.json
    telegram_id = data.get('telegram_id')
    name = data.get('name')
    role = data.get('role')
    city = data.get('city', '')
    district = data.get('district', '')
    phone = data.get('phone', '')
    
    if not telegram_id or not name or not role:
        return jsonify({'error': 'Missing required fields'}), 400
    
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    
    c.execute('''
        INSERT OR REPLACE INTO users (telegram_id, name, phone, role, city, district)
        VALUES (?, ?, ?, ?, ?, ?)
    ''', (telegram_id, name, phone, role, city, district))
    
    c.execute('SELECT * FROM users WHERE telegram_id = ?', (telegram_id,))
    columns = [col[0] for col in c.description]
    user = dict_from_row(c.fetchone(), columns)
    
    conn.commit()
    conn.close()
    
    return jsonify({'success': True, 'user': user})

@app.route('/api/user/<telegram_id>')
def get_user(telegram_id):
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute('SELECT * FROM users WHERE telegram_id = ?', (telegram_id,))
    columns = [col[0] for col in c.description]
    row = c.fetchone()
    conn.close()
    
    if not row:
        return jsonify({'error': 'User not found'}), 404
    
    return jsonify(dict_from_row(row, columns))

@app.route('/api/jobs')
def get_jobs():
    city = request.args.get('city')
    category = request.args.get('category')
    search = request.args.get('search')
    job_type = request.args.get('type')
    
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    
    sql = 'SELECT * FROM jobs WHERE status != "completed"'
    params = []
    
    if city:
        sql += ' AND city = ?'
        params.append(city)
    if category:
        sql += ' AND category = ?'
        params.append(category)
    if search:
        sql += ' AND (title LIKE ? OR description LIKE ?)'
        params.extend([f'%{search}%', f'%{search}%'])
    if job_type == 'hour':
        sql += ' AND payment_type = "hour"'
    elif job_type == 'shift':
        sql += ' AND payment_type = "shift"'
    
    sql += ' ORDER BY created_at DESC LIMIT 50'
    
    c.execute(sql, params)
    columns = [col[0] for col in c.description]
    jobs = [dict_from_row(row, columns) for row in c.fetchall()]
    conn.close()
    
    return jsonify(jobs)

@app.route('/api/jobs/<int:job_id>')
def get_job(job_id):
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute('SELECT * FROM jobs WHERE id = ?', (job_id,))
    columns = [col[0] for col in c.description]
    row = c.fetchone()
    conn.close()
    
    if not row:
        return jsonify({'error': 'Job not found'}), 404
    
    return jsonify(dict_from_row(row, columns))

@app.route('/api/jobs', methods=['POST'])
def create_job():
    data = request.json
    
    title = data.get('title')
    description = data.get('description')
    payment = data.get('payment')
    employer_id = data.get('employer_id')
    
    if not title or not description or not payment or not employer_id:
        return jsonify({'error': 'Missing required fields'}), 400
    
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    
    c.execute('''
        INSERT INTO jobs (title, description, payment, payment_type, category, city, district, date, employer_id, employer_name, requirements)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ''', (
        title, description, payment,
        data.get('payment_type', 'fixed'),
        data.get('category', ''),
        data.get('city', ''),
        data.get('district', ''),
        data.get('date', ''),
        employer_id,
        data.get('employer_name', ''),
        json.dumps(data.get('requirements', {}))
    ))
    
    job_id = c.lastrowid
    c.execute('SELECT * FROM jobs WHERE id = ?', (job_id,))
    columns = [col[0] for col in c.description]
    job = dict_from_row(c.fetchone(), columns)
    
    conn.commit()
    conn.close()
    
    return jsonify({'success': True, 'job': job})

@app.route('/api/jobs/<int:job_id>', methods=['PUT'])
def update_job(job_id):
    data = request.json
    status = data.get('status')
    selected_worker_id = data.get('selected_worker_id')
    
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    
    updates = []
    params = []
    
    if status:
        updates.append('status = ?')
        params.append(status)
    if selected_worker_id:
        updates.append('selected_worker_id = ?')
        params.append(selected_worker_id)
    
    if updates:
        params.append(job_id)
        c.execute(f'UPDATE jobs SET {", ".join(updates)} WHERE id = ?', params)
        conn.commit()
    
    conn.close()
    return jsonify({'success': True})

@app.route('/api/my-jobs/employer/<int:employer_id>')
def get_employer_jobs(employer_id):
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    
    c.execute('''
        SELECT j.*, 
            (SELECT COUNT(*) FROM responses WHERE job_id = j.id) as responses_count
        FROM jobs j 
        WHERE j.employer_id = ? 
        ORDER BY j.created_at DESC
    ''', (employer_id,))
    
    columns = [col[0] for col in c.description]
    jobs = [dict_from_row(row, columns) for row in c.fetchall()]
    conn.close()
    
    return jsonify(jobs)

@app.route('/api/my-jobs/worker/<int:worker_id>')
def get_worker_jobs(worker_id):
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    
    c.execute('''
        SELECT r.*, j.title, j.description, j.payment, j.city, j.status as job_status, j.selected_worker_id, j.employer_name
        FROM responses r
        JOIN jobs j ON r.job_id = j.id
        WHERE r.worker_id = ?
        ORDER BY r.created_at DESC
    ''', (worker_id,))
    
    columns = [col[0] for col in c.description]
    jobs = [dict_from_row(row, columns) for row in c.fetchall()]
    conn.close()
    
    return jsonify(jobs)

@app.route('/api/respond', methods=['POST'])
def respond():
    data = request.json
    job_id = data.get('job_id')
    worker_id = data.get('worker_id')
    worker_name = data.get('worker_name', '')
    
    if not job_id or not worker_id:
        return jsonify({'error': 'Missing required fields'}), 400
    
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    
    c.execute('SELECT * FROM responses WHERE job_id = ? AND worker_id = ?', (job_id, worker_id))
    if c.fetchone():
        conn.close()
        return jsonify({'error': 'Already responded to this job'}), 400
    
    c.execute('INSERT INTO responses (job_id, worker_id, worker_name) VALUES (?, ?, ?)',
              (job_id, worker_id, worker_name))
    
    conn.commit()
    conn.close()
    
    return jsonify({'success': True})

@app.route('/api/responses/job/<int:job_id>')
def get_responses(job_id):
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    
    c.execute('''
        SELECT r.*, u.name, u.city, u.district, u.rating, u.jobs_done
        FROM responses r
        JOIN users u ON r.worker_id = u.id
        WHERE r.job_id = ?
        ORDER BY r.created_at DESC
    ''', (job_id,))
    
    columns = [col[0] for col in c.description]
    responses = [dict_from_row(row, columns) for row in c.fetchall()]
    conn.close()
    
    return jsonify(responses)

@app.route('/api/select-worker', methods=['POST'])
def select_worker():
    data = request.json
    job_id = data.get('job_id')
    worker_id = data.get('worker_id')
    
    if not job_id or not worker_id:
        return jsonify({'error': 'Missing required fields'}), 400
    
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    
    c.execute('UPDATE jobs SET status = "in_progress", selected_worker_id = ? WHERE id = ?', (worker_id, job_id))
    c.execute('UPDATE responses SET status = "accepted" WHERE job_id = ? AND worker_id = ?', (job_id, worker_id))
    c.execute('UPDATE responses SET status = "rejected" WHERE job_id = ? AND worker_id != ?', (job_id, worker_id))
    
    c.execute('SELECT * FROM jobs WHERE id = ?', (job_id,))
    columns = [col[0] for col in c.description]
    job = dict_from_row(c.fetchone(), columns)
    
    conn.commit()
    conn.close()
    
    return jsonify({'success': True, 'job': job})

@app.route('/api/rate', methods=['POST'])
def rate():
    data = request.json
    from_user = data.get('from_user')
    to_user = data.get('to_user')
    job_id = data.get('job_id')
    rating = data.get('rating')
    comment = data.get('comment', '')
    
    if not from_user or not to_user or not rating:
        return jsonify({'error': 'Missing required fields'}), 400
    
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    
    c.execute('INSERT INTO ratings (from_user, to_user, job_id, rating, comment) VALUES (?, ?, ?, ?, ?)',
              (from_user, to_user, job_id, rating, comment))
    
    c.execute('SELECT AVG(rating) as avg FROM ratings WHERE to_user = ?', (to_user,))
    avg = c.fetchone()[0] or rating
    
    c.execute('UPDATE users SET rating = ?, jobs_done = jobs_done + 1 WHERE id = ?', (avg, to_user))
    c.execute('UPDATE jobs SET status = "completed" WHERE id = ?', (job_id,))
    
    conn.commit()
    conn.close()
    
    return jsonify({'success': True})

@app.route('/api/reviews/<int:user_id>')
def get_reviews(user_id):
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    
    c.execute('''
        SELECT r.*, u.name as from_name
        FROM ratings r
        JOIN users u ON r.from_user = u.id
        WHERE r.to_user = ?
        ORDER BY r.created_at DESC
        LIMIT 20
    ''', (user_id,))
    
    columns = [col[0] for col in c.description]
    reviews = [dict_from_row(row, columns) for row in c.fetchall()]
    conn.close()
    
    return jsonify(reviews)

@app.route('/api/users/<int:user_id>')
def get_user_by_id(user_id):
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    
    c.execute('''SELECT id, telegram_id, name, role, city, district, rating, jobs_done, created_at 
                 FROM users WHERE id = ?''', (user_id,))
    columns = [col[0] for col in c.description]
    row = c.fetchone()
    conn.close()
    
    if not row:
        return jsonify({'error': 'User not found'}), 404
    
    return jsonify(dict_from_row(row, columns))

@app.route('/api/stats')
def stats():
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    
    c.execute('SELECT COUNT(*) FROM jobs WHERE status = "open"')
    jobs = c.fetchone()[0] or 0
    
    c.execute('SELECT COUNT(*) FROM users WHERE role = "worker"')
    workers = c.fetchone()[0] or 0
    
    c.execute('SELECT COUNT(*) FROM jobs WHERE status = "completed"')
    done = c.fetchone()[0] or 0
    
    conn.close()
    
    return jsonify({'jobs': jobs, 'workers': workers, 'done': done})

# Serve static files
@app.route('/')
def index():
    return send_from_directory('frontend', 'index.html')

@app.route('/<path:path>')
def serve_static(path):
    try:
        return send_from_directory('frontend', path)
    except:
        return send_from_directory('frontend', 'index.html')

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 3000))
    app.run(host='0.0.0.0', port=port)
