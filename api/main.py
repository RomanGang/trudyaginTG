import os
import json
import hashlib
import random
from datetime import datetime
from flask import Flask, request, jsonify, send_from_directory

app = Flask(__name__, static_folder='frontend')

# Use /tmp for Vercel (ephemeral but works within function)
DATA_FILE = '/tmp/trudyagin_data.json'
VERCEL_CACHE = '/tmp/vercel_cache.json'

def hash_password(password):
    """Hash password using SHA256"""
    return hashlib.sha256(password.encode()).hexdigest()

def generate_sms_code():
    """Generate 4-digit SMS code"""
    return str(random.randint(1000, 9999))

# In-memory cache for SMS codes and pending registrations
sms_codes = {}  # phone -> code
pending_users = {}  # temp_id -> user data

def load_data():
    """Load data from file or cache"""
    # Try cache first (for Vercel)
    if os.path.exists(VERCEL_CACHE):
        try:
            with open(VERCEL_CACHE, 'r') as f:
                return json.load(f)
        except:
            pass
    
    # Try main file
    if os.path.exists(DATA_FILE):
        try:
            with open(DATA_FILE, 'r') as f:
                return json.load(f)
        except:
            pass
    
    return {
        'users': {},
        'jobs': {},
        'responses': {},
        'ratings': {}
    }

def save_data(data):
    """Save data to file"""
    try:
        with open(VERCEL_CACHE, 'w') as f:
            json.dump(data, f)
    except:
        pass

# Initialize data
data = load_data()
next_ids = {'user': 1, 'job': 1, 'response': 1, 'rating': 1}

# ==================== API ROUTES ====================

@app.route('/api/health')
def health():
    return jsonify({'status': 'ok', 'timestamp': datetime.now().isoformat()})

@app.route('/api/register', methods=['POST'])
def register():
    global data, next_ids
    req_data = request.json
    
    phone = req_data.get('phone', '').strip()
    code = req_data.get('code', '')
    name = req_data.get('name', '')
    password = req_data.get('password', '')
    role = req_data.get('role', 'worker')
    city = req_data.get('city', '')
    district = req_data.get('district', '')
    
    if not phone or not code:
        return jsonify({'error': 'Введите номер телефона и код'}), 400
    
    # Verify SMS code
    expected_code = sms_codes.get(phone)
    if not expected_code or expected_code != code:
        return jsonify({'error': 'Неверный код из SMS'}), 400
    
    if not name:
        return jsonify({'error': 'Введите ваше имя'}), 400
    
    if not password:
        return jsonify({'error': 'Введите пароль'}), 400
    
    # Check if phone already registered
    for uid, user in data['users'].items():
        if user.get('phone') == phone:
            # Clear used code
            if phone in sms_codes:
                del sms_codes[phone]
            return jsonify({'error': 'Этот номер телефона уже зарегистрирован'}), 400
    
    # Create new user
    user_id = str(next_ids['user'])
    next_ids['user'] += 1
    
    user = {
        'id': user_id,
        'phone': phone,
        'password': hash_password(password),
        'name': name,
        'role': role,
        'city': city,
        'district': district,
        'rating': 0,
        'jobs_done': 0,
        'created_at': datetime.now().isoformat()
    }
    
    data['users'][user_id] = user
    save_data(data)
    
    # Clear used code
    if phone in sms_codes:
        del sms_codes[phone]
    
    # Return user without password
    user_data = {k: v for k, v in user.items() if k != 'password'}
    return jsonify({'success': True, 'user': user_data})

@app.route('/api/send-code', methods=['POST'])
def send_code():
    """Send SMS verification code via Telegram"""
    req_data = request.json
    phone = req_data.get('phone', '').strip()
    telegram_id = req_data.get('telegram_id')  # User's Telegram ID
    
    if not phone:
        return jsonify({'error': 'Введите номер телефона'}), 400
    
    # Generate code
    code = generate_sms_code()
    sms_codes[phone] = code
    
    # Send via Telegram Bot
    bot_token = '8048217702:AAEOxzXkU51gQ9ykHcQu_Z6Y43VZyXSyq8A'
    try:
        import requests
        
        # If we have Telegram ID, send directly to user
        if telegram_id:
            requests.post(
                f'https://api.telegram.org/bot{bot_token}/sendMessage',
                json={
                    'chat_id': str(telegram_id),
                    'text': f'🔐 Код подтверждения Трудягин: {code}'
                },
                timeout=5
            )
            return jsonify({'success': True, 'message': 'Код отправлен в Telegram'})
        
        # Otherwise try to find user by phone (if linked)
        # For now, return debug code as fallback
    except Exception as e:
        print(f"Telegram send error: {e}")
    
    # Return code for development/testing
    return jsonify({'success': True, 'message': 'Код отправлен', 'debug_code': code})

@app.route('/api/login', methods=['POST'])
def login():
    global data
    req_data = request.json
    
    phone = req_data.get('phone', '').strip()
    password = req_data.get('password', '')
    
    if not phone or not password:
        return jsonify({'error': 'Введите номер телефона и пароль'}), 400
    
    # Find user by phone
    for uid, user in data['users'].items():
        if user.get('phone') == phone:
            if user.get('password') == hash_password(password):
                # Return user without password
                user_data = {k: v for k, v in user.items() if k != 'password'}
                return jsonify({'success': True, 'user': user_data})
            else:
                return jsonify({'error': 'Неверный пароль'}), 401
    
    return jsonify({'error': 'Пользователь с таким номером не найден'}), 404

@app.route('/api/update-profile', methods=['POST'])
def update_profile():
    global data
    req_data = request.json
    
    user_id = str(req_data.get('id'))
    user = data['users'].get(user_id)
    
    if not user:
        return jsonify({'error': 'Пользователь не найден'}), 404
    
    # Update allowed fields
    if 'name' in req_data:
        user['name'] = req_data['name']
    if 'city' in req_data:
        user['city'] = req_data['city']
    if 'district' in req_data:
        user['district'] = req_data['district']
    
    data['users'][user_id] = user
    save_data(data)
    
    user_data = {k: v for k, v in user.items() if k != 'password'}
    return jsonify({'success': True, 'user': user_data})

@app.route('/api/user/<telegram_id>')
def get_user(telegram_id):
    for user in data['users'].values():
        if user.get('telegram_id') == telegram_id:
            return jsonify(user)
    return jsonify({'error': 'User not found'}), 404

@app.route('/api/jobs')
def get_jobs():
    city = request.args.get('city')
    category = request.args.get('category')
    search = request.args.get('search')
    job_type = request.args.get('type')
    
    jobs = [j for j in data['jobs'].values() if j.get('status') != 'completed']
    
    if city:
        jobs = [j for j in jobs if j.get('city') == city]
    if category:
        jobs = [j for j in jobs if j.get('category') == category]
    if search:
        search = search.lower()
        jobs = [j for j in jobs if search in j.get('title', '').lower() or search in j.get('description', '').lower()]
    if job_type == 'hour':
        jobs = [j for j in jobs if j.get('payment_type') == 'hour']
    elif job_type == 'shift':
        jobs = [j for j in jobs if j.get('payment_type') == 'shift']
    
    jobs.sort(key=lambda x: x.get('created_at', ''), reverse=True)
    return jsonify(jobs[:50])

@app.route('/api/jobs/<int:job_id>')
def get_job(job_id):
    job = data['jobs'].get(str(job_id))
    if not job:
        return jsonify({'error': 'Job not found'}), 404
    return jsonify(job)

@app.route('/api/jobs', methods=['POST'])
def create_job():
    global data, next_ids
    req_data = request.json
    
    title = req_data.get('title', '')
    description = req_data.get('description', '')
    payment = req_data.get('payment', 0)
    employer_id = req_data.get('employer_id')
    
    if not title or not description or not payment or not employer_id:
        return jsonify({'error': 'Missing required fields'}), 400
    
    job_id = str(next_ids['job'])
    next_ids['job'] += 1
    
    job = {
        'id': job_id,
        'title': title,
        'description': description,
        'payment': payment,
        'payment_type': req_data.get('payment_type', 'fixed'),
        'category': req_data.get('category', ''),
        'city': req_data.get('city', ''),
        'district': req_data.get('district', ''),
        'date': req_data.get('date', ''),
        'employer_id': employer_id,
        'employer_name': req_data.get('employer_name', ''),
        'status': 'open',
        'requirements': json.dumps(req_data.get('requirements', {})),
        'selected_worker_id': None,
        'created_at': datetime.now().isoformat()
    }
    
    data['jobs'][job_id] = job
    save_data(data)
    
    return jsonify({'success': True, 'job': job})

@app.route('/api/jobs/<int:job_id>', methods=['PUT'])
def update_job(job_id):
    global data
    req_data = request.json
    job = data['jobs'].get(str(job_id))
    
    if not job:
        return jsonify({'error': 'Job not found'}), 404
    
    if 'status' in req_data:
        job['status'] = req_data['status']
    if 'selected_worker_id' in req_data:
        job['selected_worker_id'] = req_data['selected_worker_id']
    
    data['jobs'][str(job_id)] = job
    save_data(data)
    
    return jsonify({'success': True})

@app.route('/api/my-jobs/employer/<int:employer_id>')
def get_employer_jobs(employer_id):
    jobs = [j for j in data['jobs'].values() if str(j.get('employer_id')) == str(employer_id)]
    
    for job in jobs:
        job['responses_count'] = len([r for r in data['responses'].values() if str(r.get('job_id')) == str(job['id'])])
    
    jobs.sort(key=lambda x: x.get('created_at', ''), reverse=True)
    return jsonify(jobs)

@app.route('/api/my-jobs/worker/<int:worker_id>')
def get_worker_jobs(worker_id):
    responses = [r for r in data['responses'].values() if str(r.get('worker_id')) == str(worker_id)]
    
    jobs = []
    for r in responses:
        job = data['jobs'].get(str(r.get('job_id')))
        if job:
            job_with_response = {**job, 'response_status': r.get('status')}
            jobs.append(job_with_response)
    
    return jsonify(jobs)

@app.route('/api/respond', methods=['POST'])
def respond():
    global data, next_ids
    req_data = request.json
    
    job_id = str(req_data.get('job_id'))
    worker_id = str(req_data.get('worker_id'))
    worker_name = req_data.get('worker_name', '')
    
    if not job_id or not worker_id:
        return jsonify({'error': 'Missing required fields'}), 400
    
    for r in data['responses'].values():
        if str(r.get('job_id')) == job_id and str(r.get('worker_id')) == worker_id:
            return jsonify({'error': 'Already responded to this job'}), 400
    
    response_id = str(next_ids['response'])
    next_ids['response'] += 1
    
    response = {
        'id': response_id,
        'job_id': job_id,
        'worker_id': worker_id,
        'worker_name': worker_name,
        'status': 'pending',
        'created_at': datetime.now().isoformat()
    }
    
    data['responses'][response_id] = response
    save_data(data)
    
    return jsonify({'success': True})

@app.route('/api/responses/job/<int:job_id>')
def get_responses(job_id):
    responses = [r for r in data['responses'].values() if str(r.get('job_id')) == str(job_id)]
    
    for r in responses:
        worker = data['users'].get(str(r.get('worker_id')))
        if worker:
            r['name'] = worker.get('name', '')
            r['city'] = worker.get('city', '')
            r['district'] = worker.get('district', '')
            r['rating'] = worker.get('rating', 0)
            r['jobs_done'] = worker.get('jobs_done', 0)
    
    return jsonify(responses)

@app.route('/api/select-worker', methods=['POST'])
def select_worker():
    global data
    req_data = request.json
    
    job_id = str(req_data.get('job_id'))
    worker_id = str(req_data.get('worker_id'))
    
    if not job_id or not worker_id:
        return jsonify({'error': 'Missing required fields'}), 400
    
    job = data['jobs'].get(job_id)
    if not job:
        return jsonify({'error': 'Job not found'}), 400
    
    job['status'] = 'in_progress'
    job['selected_worker_id'] = worker_id
    
    for r in data['responses'].values():
        if str(r.get('job_id')) == job_id:
            if str(r.get('worker_id')) == worker_id:
                r['status'] = 'accepted'
            else:
                r['status'] = 'rejected'
    
    save_data(data)
    return jsonify({'success': True, 'job': job})

@app.route('/api/rate', methods=['POST'])
def rate():
    global data, next_ids
    req_data = request.json
    
    from_user = str(req_data.get('from_user'))
    to_user = str(req_data.get('to_user'))
    job_id = str(req_data.get('job_id'))
    rating = req_data.get('rating', 5)
    comment = req_data.get('comment', '')
    
    if not from_user or not to_user or not rating:
        return jsonify({'error': 'Missing required fields'}), 400
    
    rating_id = str(next_ids['rating'])
    next_ids['rating'] += 1
    
    rating_obj = {
        'id': rating_id,
        'from_user': from_user,
        'to_user': to_user,
        'job_id': job_id,
        'rating': rating,
        'comment': comment,
        'created_at': datetime.now().isoformat()
    }
    
    data['ratings'][rating_id] = rating_obj
    
    user = data['users'].get(to_user)
    if user:
        ratings = [r.get('rating') for r in data['ratings'].values() if str(r.get('to_user')) == to_user]
        user['rating'] = sum(ratings) / len(ratings) if ratings else rating
        user['jobs_done'] = user.get('jobs_done', 0) + 1
    
    job = data['jobs'].get(job_id)
    if job:
        job['status'] = 'completed'
    
    save_data(data)
    return jsonify({'success': True})

@app.route('/api/reviews/<int:user_id>')
def get_reviews(user_id):
    reviews = [r for r in data['ratings'].values() if str(r.get('to_user')) == str(user_id)]
    
    for r in reviews:
        user = data['users'].get(str(r.get('from_user')))
        if user:
            r['from_name'] = user.get('name', '')
    
    return jsonify(reviews)

@app.route('/api/users/<int:user_id>')
def get_user_by_id(user_id):
    user = data['users'].get(str(user_id))
    if not user:
        return jsonify({'error': 'User not found'}), 404
    
    return jsonify({
        'id': user.get('id'),
        'telegram_id': user.get('telegram_id'),
        'name': user.get('name'),
        'role': user.get('role'),
        'city': user.get('city'),
        'district': user.get('district'),
        'rating': user.get('rating'),
        'jobs_done': user.get('jobs_done'),
        'created_at': user.get('created_at')
    })

@app.route('/api/stats')
def stats():
    jobs = len([j for j in data['jobs'].values() if j.get('status') == 'open'])
    workers = len([u for u in data['users'].values() if u.get('role') == 'worker'])
    done = len([j for j in data['jobs'].values() if j.get('status') == 'completed'])
    
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
