// ==================== Configuration ====================
const API_BASE = window.location.origin;

// ==================== Location Data ====================
const cities = {
  Москва: ["Центр", "Север", "Юг", "Запад", "Восток", "Северо-Запад", "Северо-Восток", "Юго-Запад", "Юго-Восток"],
  "Санкт-Петербург": ["Центр", "Север", "Юг", "Василеостровский", "Петроградский", "Кронверкский", "Красногвардейский"],
  Казань: ["Центр", "Север", "Юг", "Запад", "Восток", "Ново-Савиновский"],
  Екатеринбург: ["Центр", "Север", "Юг", "Запад", "Восток", "Верх-Исетский", "Ленинский"]
};

// ==================== State ====================
let currentUser = null;
let currentPage = 'home';
let jobFilters = { city: '', district: '', min_payment: '' };
let myJobsTab = 'created';

// ==================== Telegram WebApp ====================
let tg;

if (window.Telegram && window.Telegram.WebApp) {
  tg = window.Telegram.WebApp;
  tg.expand();
  tg.ready();

  // Apply Telegram theme
  document.documentElement.style.setProperty('--primary', tg.themeParams.button_color || '#2481cc');
  document.documentElement.style.setProperty('--primary-dark', tg.themeParams.button_color ? adjustColor(tg.themeParams.button_color, -20) : '#1a6ab8');
  if (tg.themeParams.text_color) {
    document.documentElement.style.setProperty('--text-primary', tg.themeParams.text_color);
  }
  if (tg.themeParams.bg_color) {
    document.documentElement.style.setProperty('--background', tg.themeParams.bg_color);
  }
} else {
  // Mock Telegram WebApp for browser testing
  tg = {
    expand: () => {},
    ready: () => {},
    themeParams: {},
    initDataUnsafe: {
      user: {
        id: Date.now(),
        first_name: 'TestUser',
        username: 'test_user'
      }
    }
  };
}

function adjustColor(color, amount) {
  return color; // Simplified - would need hex manipulation in production
}

// Get user data from Telegram
const telegramUser = tg.initDataUnsafe?.user || {
  id: Date.now(), // Fallback for development
  first_name: 'User',
  username: 'user'
};

// ==================== API Functions ====================
async function apiCall(endpoint, method = 'GET', body = null) {
  const options = {
    method,
    headers: { 'Content-Type': 'application/json' }
  };
  
  if (body) {
    options.body = JSON.stringify(body);
  }
  
  try {
    const response = await fetch(`${API_BASE}/api${endpoint}`, options);
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || 'API Error');
    }
    
    return data;
  } catch (error) {
    console.error('API Error:', error);
    showToast(error.message, 'error');
    throw error;
  }
}

// ==================== Auth ====================
async function initAuth() {
  try {
    // Try to get user from backend
    const user = await apiCall(`/user/${telegramUser.id}`);
    currentUser = user;
    showLoggedInState();
    loadNotifications();
  } catch (e) {
    // User not registered - show registration
    showPage('register');
    document.getElementById('regName').value = telegramUser.first_name || '';
  }
}

async function registerUser(data) {
  const userData = {
    telegram_id: telegramUser.id,
    name: data.name,
    phone: data.phone || null,
    role: data.role,
    city: data.city,
    district: data.district,
    skills: data.skills || null
  };
  
  await apiCall('/user', 'POST', userData);
  currentUser = userData;
  
  showLoggedInState();
  showToast('Добро пожаловать в Trudyagin!', 'success');
  
  // Redirect based on role
  if (data.role === 'employer') {
    showPage('create-job');
  } else {
    showPage('jobs');
    loadJobs();
  }
}

async function updateProfile(data) {
  await apiCall(`/user/${telegramUser.id}`, 'PUT', data);
  currentUser = { ...currentUser, ...data };
  showToast('Профиль обновлён', 'success');
  updateProfileDisplay();
}

// ==================== Navigation ====================
function showPage(pageName, data = null) {
  // Hide current page
  document.querySelector('.page.active')?.classList.remove('active');
  document.querySelector('.nav-btn.active')?.classList.remove('active');
  
  // Show new page
  const page = document.getElementById(`page-${pageName}`);
  if (page) {
    page.classList.add('active');
    currentPage = pageName;
  }
  
  // Update nav
  const navBtn = document.querySelector(`.nav-btn[data-page="${pageName === 'create-job' || pageName === 'job-detail' || pageName === 'applicants' || pageName === 'notifications' || pageName === 'ratings' ? 'my-jobs' : pageName}"]`);
  if (navBtn) {
    navBtn.classList.add('active');
  }
  
  // Hide back button on main pages
  const backBtns = document.querySelectorAll('.page-header .back-btn');
  backBtns.forEach(btn => {
    const backPage = btn.dataset.back;
    btn.style.display = (pageName === backPage || (backPage === 'jobs' && pageName === 'job-detail')) ? 'flex' : 'none';
  });
  
  // Load page data
  switch (pageName) {
    case 'home':
      loadHomeStats();
      break;
    case 'jobs':
      loadJobs();
      break;
    case 'my-jobs':
      loadMyJobs();
      break;
    case 'profile':
      updateProfileDisplay();
      break;
    case 'notifications':
      loadNotificationsList();
      break;
    case 'ratings':
      loadRatings();
      break;
  }
  
  // Scroll to top
  document.querySelector('.pages-container').scrollTop = 0;
}

// ==================== Home ====================
function showLoggedInState() {
  document.getElementById('userInfo').style.display = 'flex';
  document.getElementById('statsSection').style.display = 'block';
  document.getElementById('displayName').textContent = currentUser.name;
  document.getElementById('displayRole').textContent = currentUser.role === 'worker' ? 'Исполнитель' : 'Заказчик';
  showPage('home');
}

async function loadHomeStats() {
  if (!currentUser) return;
  
  try {
    const jobs = await apiCall(`/my-jobs?user_id=${telegramUser.id}&role=${currentUser.role}`);
    document.getElementById('statJobsCount').textContent = jobs.length;
    document.getElementById('statRating').textContent = currentUser.rating ? currentUser.rating.toFixed(1) : '0.0';
  } catch (e) {
    console.error('Error loading stats:', e);
  }
}

// ==================== Jobs ====================
async function loadJobs() {
  const jobsList = document.getElementById('jobsList');
  jobsList.innerHTML = `
    <div class="loading">
      <div class="spinner"></div>
      <p>Загрузка заказов...</p>
    </div>
  `;
  
  try {
    const params = new URLSearchParams();
    if (jobFilters.city) params.append('city', jobFilters.city);
    if (jobFilters.district) params.append('district', jobFilters.district);
    if (jobFilters.min_payment) params.append('min_payment', jobFilters.min_payment);
    
    const jobs = await apiCall(`/jobs?${params.toString()}`);
    
    if (jobs.length === 0) {
      jobsList.innerHTML = `
        <div class="empty-state">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect>
            <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path>
          </svg>
          <p>Заказов пока нет</p>
        </div>
      `;
      return;
    }
    
    jobsList.innerHTML = jobs.map(job => createJobCard(job)).join('');
  } catch (e) {
    jobsList.innerHTML = `
      <div class="empty-state">
        <p>Ошибка загрузки</p>
      </div>
    `;
  }
}

function createJobCard(job) {
  const date = new Date(job.created_at).toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'short'
  });
  
  return `
    <div class="job-card" onclick="showJobDetail(${job.id})">
      <div class="job-card-header">
        <span class="job-card-title">${escapeHtml(job.title)}</span>
        <span class="job-card-payment">${formatPayment(job.payment)}</span>
      </div>
      <p class="job-card-description">${escapeHtml(job.description)}</p>
      <div class="job-card-meta">
        <span class="job-card-tag">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
            <circle cx="12" cy="10" r="3"></circle>
          </svg>
          ${getCityName(job.city)}
        </span>
        <span class="job-card-tag">${job.district}</span>
        <span class="job-card-tag">${formatDate(job.date)}</span>
      </div>
      <div class="job-card-footer">
        <span class="job-card-employer">${escapeHtml(job.employer_name || 'Заказчик')}</span>
        <span class="job-card-date">${date}</span>
      </div>
    </div>
  `;
}

async function showJobDetail(jobId) {
  showPage('job-detail');
  
  const detail = document.getElementById('jobDetail');
  detail.innerHTML = `
    <div class="loading">
      <div class="spinner"></div>
    </div>
  `;
  
  try {
    const job = await apiCall(`/jobs/${jobId}`);
    const hasResponded = await checkIfResponded(jobId);
    
    detail.innerHTML = `
      <div class="job-detail-header">
        <h2 class="job-detail-title">${escapeHtml(job.title)}</h2>
        <div class="job-detail-payment">${formatPayment(job.payment)}</div>
        <span class="job-status ${job.status}">${getStatusText(job.status)}</span>
      </div>
      
      <div class="job-detail-section">
        <h4>Описание</h4>
        <p class="job-detail-description">${escapeHtml(job.description)}</p>
      </div>
      
      <div class="job-detail-section">
        <h4>Место</h4>
        <div class="job-detail-meta">
          <span class="job-card-tag">${getCityName(job.city)}</span>
          <span class="job-card-tag">${job.district}</span>
        </div>
      </div>
      
      <div class="job-detail-section">
        <h4>Дата</h4>
        <p>${formatDate(job.date)}</p>
      </div>
      
      ${currentUser?.role === 'worker' && job.status === 'open' && !hasResponded ? `
        <div class="job-detail-actions">
          <button class="btn-primary" onclick="respondToJob(${job.id})">Откликнуться</button>
        </div>
      ` : ''}
      
      ${currentUser?.role === 'employer' && currentUser.telegram_id === job.employer_id && job.status === 'open' ? `
        <div class="job-detail-actions">
          <button class="btn-secondary" onclick="showApplicants(${job.id})">Отклики (${job.response_count || 0})</button>
        </div>
      ` : ''}
      
      ${job.status === 'in_progress' && job.worker_id === telegramUser.id ? `
        <div class="job-detail-actions">
          <button class="btn-primary btn-success" onclick="completeJob(${job.id})">Завершить</button>
        </div>
      ` : ''}
      
      ${job.status === 'in_progress' && (job.worker_id === telegramUser.id || job.employer_id === telegramUser.id) ? `
        <div class="job-detail-actions">
          <button class="btn-secondary" onclick="showRateModal(${job.id}, ${job.employer_id === telegramUser.id ? job.worker_id : job.employer_id})">Оценить</button>
        </div>
      ` : ''}
    `;
  } catch (e) {
    detail.innerHTML = '<p>Ошибка загрузки</p>';
  }
}

async function checkIfResponded(jobId) {
  try {
    const responses = await apiCall(`/responses/worker/${telegramUser.id}`);
    return responses.some(r => r.job_id === jobId);
  } catch {
    return false;
  }
}

async function respondToJob(jobId) {
  try {
    await apiCall('/respond', 'POST', { job_id: jobId, worker_id: telegramUser.id });
    showToast('Вы откликнулись на заказ!', 'success');
    showJobDetail(jobId);
  } catch (e) {
    // Already responded or error
  }
}

async function completeJob(jobId) {
  try {
    await apiCall(`/jobs/${jobId}/complete`, 'POST');
    showToast('Заказ завершён!', 'success');
    showJobDetail(jobId);
  } catch (e) {
    showToast('Ошибка', 'error');
  }
}

// ==================== Create Job ====================
async function createJob(data) {
  const jobData = {
    ...data,
    employer_id: telegramUser.id
  };
  
  await apiCall('/jobs', 'POST', jobData);
  showToast('Заказ создан!', 'success');
  showPage('my-jobs');
}

// ==================== My Jobs ====================
async function loadMyJobs() {
  if (!currentUser) return;
  
  const content = document.getElementById('myJobsContent');
  content.innerHTML = `
    <div class="loading">
      <div class="spinner"></div>
    </div>
  `;
  
  try {
    const jobs = await apiCall(`/my-jobs?user_id=${telegramUser.id}&role=${currentUser.role}`);
    
    if (jobs.length === 0) {
      content.innerHTML = `
        <div class="empty-state">
          <p>Заказов пока нет</p>
        </div>
      `;
      return;
    }
    
    content.innerHTML = jobs.map(job => createMyJobCard(job)).join('');
  } catch (e) {
    content.innerHTML = '<div class="empty-state"><p>Ошибка загрузки</p></div>';
  }
}

function createMyJobCard(job) {
  const date = new Date(job.created_at).toLocaleDateString('ru-RU');
  
  let actions = '';
  
  if (currentUser.role === 'employer') {
    actions = `
      <div class="my-job-card-actions">
        <button class="btn-secondary btn-small" onclick="showApplicants(${job.id})">Отклики (${job.response_count || 0})</button>
      </div>
    `;
  } else {
    const statusText = job.response_status === 'accepted' ? 'Принят' : 'Ожидает';
    const statusClass = job.response_status === 'accepted' ? 'text-success' : 'text-warning';
    actions = `
      <span class="${statusClass}" style="font-size: 13px;">${statusText}</span>
    `;
  }
  
  return `
    <div class="my-job-card" onclick="showJobDetail(${job.id})">
      <div class="my-job-card-header">
        <span class="my-job-card-title">${escapeHtml(job.title)}</span>
        <span class="my-job-card-payment">${formatPayment(job.payment)}</span>
      </div>
      <div class="my-job-card-meta">
        <span class="job-card-tag">${getCityName(job.city)}</span>
        <span class="job-card-tag">${job.district}</span>
        <span class="job-status ${job.status}">${getStatusText(job.status)}</span>
      </div>
      <div class="my-job-card-info">
        <span class="my-job-card-count">${date}</span>
        ${actions}
      </div>
    </div>
  `;
}

// ==================== Applicants ====================
async function showApplicants(jobId) {
  showPage('applicants');
  
  const list = document.getElementById('applicantsList');
  list.innerHTML = `
    <div class="loading">
      <div class="spinner"></div>
    </div>
  `;
  
  try {
    const applicants = await apiCall(`/responses/job/${jobId}`);
    
    if (applicants.length === 0) {
      list.innerHTML = `
        <div class="empty-state">
          <p>Пока нет откликов</p>
        </div>
      `;
      return;
    }
    
    list.innerHTML = applicants.map(worker => `
      <div class="applicant-card">
        <div class="applicant-header">
          <div class="applicant-avatar">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
              <circle cx="12" cy="7" r="4"></circle>
            </svg>
          </div>
          <div class="applicant-info">
            <div class="applicant-name">${escapeHtml(worker.worker_name)}</div>
            <div class="applicant-rating">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="#FFD700" stroke="#FFD700" stroke-width="2">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
              </svg>
              ${(worker.worker_rating || 0).toFixed(1)}
            </div>
          </div>
        </div>
        ${worker.skills ? `<p class="applicant-skills">${escapeHtml(worker.skills)}</p>` : ''}
        <div class="applicant-actions">
          <button class="btn-primary btn-small" onclick="assignWorker(${jobId}, ${worker.worker_id})">Выбрать</button>
        </div>
      </div>
    `).join('');
  } catch (e) {
    list.innerHTML = '<div class="empty-state"><p>Ошибка загрузки</p></div>';
  }
}

async function assignWorker(jobId, workerId) {
  try {
    await apiCall(`/jobs/${jobId}/assign`, 'POST', { worker_id: workerId });
    showToast('Исполнитель выбран!', 'success');
    showPage('my-jobs');
  } catch (e) {
    showToast('Ошибка', 'error');
  }
}

// ==================== Ratings ====================
async function loadRatings() {
  const list = document.getElementById('ratingsList');
  list.innerHTML = `
    <div class="loading">
      <div class="spinner"></div>
    </div>
  `;
  
  try {
    const ratings = await apiCall(`/ratings/${telegramUser.id}`);
    
    if (ratings.length === 0) {
      list.innerHTML = `
        <div class="empty-state">
          <p>Отзывов пока нет</p>
        </div>
      `;
      return;
    }
    
    list.innerHTML = ratings.map(r => `
      <div class="rating-card">
        <div class="rating-header">
          <span class="rating-user">${escapeHtml(r.from_user_name)}</span>
          <div class="rating-stars">
            ${renderStars(r.rating)}
          </div>
        </div>
        ${r.comment ? `<p class="rating-comment">${escapeHtml(r.comment)}</p>` : ''}
        <div class="rating-date">${new Date(r.created_at).toLocaleDateString('ru-RU')}</div>
      </div>
    `).join('');
  } catch (e) {
    list.innerHTML = '<div class="empty-state"><p>Ошибка загрузки</p></div>';
  }
}

function renderStars(rating) {
  let stars = '';
  for (let i = 1; i <= 5; i++) {
    stars += `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="${i <= rating ? '#FFD700' : 'none'}" stroke="#FFD700" stroke-width="2">
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
      </svg>
    `;
  }
  return stars;
}

function showRateModal(jobId, toUserId) {
  const modal = document.createElement('div');
  modal.className = 'modal-overlay active';
  modal.innerHTML = `
    <div class="modal">
      <h3 class="modal-title">Оценить исполнителя</h3>
      <div class="star-rating" id="starRating">
        ${[1,2,3,4,5].map(i => `
          <button type="button" data-rating="${i}">
            <svg viewBox="0 0 24 24" fill="none" stroke="#FFD700" stroke-width="2">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
            </svg>
          </button>
        `).join('')}
      </div>
      <div class="form-group">
        <textarea id="ratingComment" rows="3" placeholder="Комментарий (необязательно)"></textarea>
      </div>
      <div class="modal-actions">
        <button class="btn-secondary" onclick="this.closest('.modal-overlay').remove()">Отмена</button>
        <button class="btn-primary" onclick="submitRating(${jobId}, ${toUserId})">Отправить</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
  
  // Star rating interactivity
  const stars = modal.querySelectorAll('.star-rating button');
  let selectedRating = 0;
  stars.forEach(star => {
    star.addEventListener('click', () => {
      selectedRating = parseInt(star.dataset.rating);
      stars.forEach((s, i) => {
        s.classList.toggle('active', i < selectedRating);
      });
    });
  });
  
  modal.addEventListener('click', (e) => {
    if (e.target === modal) modal.remove();
  });
}

async function submitRating(jobId, toUserId) {
  const rating = document.querySelector('.star-rating .active')?.closest('button')?.dataset.rating;
  if (!rating) {
    showToast('Выберите оценку', 'error');
    return;
  }
  
  const comment = document.getElementById('ratingComment')?.value;
  
  try {
    await apiCall('/rate', 'POST', {
      from_user: telegramUser.id,
      to_user: toUserId,
      job_id: jobId,
      rating: parseInt(rating),
      comment: comment || null
    });
    showToast('Спасибо за отзыв!', 'success');
    document.querySelector('.modal-overlay.active')?.remove();
  } catch (e) {
    showToast('Ошибка', 'error');
  }
}

// ==================== Notifications ====================
let notificationCount = 0;

async function loadNotifications() {
  try {
    const notifications = await apiCall(`/notifications/${telegramUser.id}`);
    notificationCount = notifications.length;
    const badge = document.getElementById('notificationBadge');
    badge.textContent = notificationCount;
    badge.style.display = notificationCount > 0 ? 'flex' : 'none';
  } catch (e) {
    console.error('Error loading notifications:', e);
  }
}

async function loadNotificationsList() {
  const list = document.getElementById('notificationsList');
  
  try {
    const notifications = await apiCall(`/notifications/${telegramUser.id}`);
    
    if (notifications.length === 0) {
      list.innerHTML = `
        <div class="empty-state">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
            <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
          </svg>
          <p>Нет новых уведомлений</p>
        </div>
      `;
      return;
    }
    
    list.innerHTML = notifications.map(n => `
      <div class="notification-item" onclick="showJobDetail(${n.id})">
        <div class="notification-icon">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect>
            <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path>
          </svg>
        </div>
        <div class="notification-content">
          <div class="notification-title">Новый заказ</div>
          <div class="notification-text">${escapeHtml(n.title)} - ${getCityName(n.city)}</div>
          <div class="notification-time">${new Date(n.created_at).toLocaleString('ru-RU')}</div>
        </div>
      </div>
    `).join('');
    
    // Reset badge
    document.getElementById('notificationBadge').style.display = 'none';
  } catch (e) {
    list.innerHTML = '<div class="empty-state"><p>Ошибка загрузки</p></div>';
  }
}

// ==================== Profile ====================
function updateProfileDisplay() {
  if (!currentUser) return;
  
  document.getElementById('profileName').textContent = currentUser.name || '—';
  document.getElementById('profileRole').textContent = currentUser.role === 'worker' ? 'Исполнитель' : 'Заказчик';
  document.getElementById('profileRating').querySelector('span').textContent = currentUser.rating ? currentUser.rating.toFixed(1) : '0.0';
  
  // Fill form
  document.getElementById('profileNameInput').value = currentUser.name || '';
  document.getElementById('profilePhone').value = currentUser.phone || '';
  document.getElementById('profileSkills').value = currentUser.skills || '';
  
  // City & District
  const citySelect = document.getElementById('profileCity');
  const districtSelect = document.getElementById('profileDistrict');
  
  if (currentUser.city) {
    citySelect.value = currentUser.city;
    updateDistrictOptions(citySelect, districtSelect);
    if (currentUser.district) {
      districtSelect.value = currentUser.district;
    }
  }
  
  // Show/hide skills for employers
  document.getElementById('skillsGroup').style.display = currentUser.role === 'worker' ? 'flex' : 'none';
}

// ==================== Location Selectors ====================
function updateDistrictOptions(citySelect, districtSelect) {
  const city = citySelect.value;
  const districts = cities[city] || [];
  
  districtSelect.innerHTML = '<option value="">Район</option>';
  
  if (districts.length > 0) {
    districts.forEach(d => {
      const option = document.createElement('option');
      option.value = d;
      option.textContent = d;
      districtSelect.appendChild(option);
    });
    districtSelect.disabled = false;
  } else {
    districtSelect.disabled = true;
  }
}

// ==================== Filters ====================
function setupFilters() {
  const cityFilter = document.getElementById('cityFilter');
  const districtFilter = document.getElementById('districtFilter');
  
  cityFilter.addEventListener('change', () => {
    updateDistrictOptions(cityFilter, districtFilter);
    jobFilters.city = cityFilter.value;
    jobFilters.district = '';
  });
  
  districtFilter.addEventListener('change', () => {
    jobFilters.district = districtFilter.value;
  });
  
  document.getElementById('applyFilters').addEventListener('click', () => {
    jobFilters.min_payment = document.getElementById('paymentFilter').value;
    loadJobs();
  });
}

// ==================== Form Handlers ====================
function setupForms() {
  // Registration
  document.getElementById('registerForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = e.target;
    await registerUser({
      name: form.regName.value,
      role: form.role.value,
      city: form.regCity.value,
      district: form.regDistrict.value
    });
  });
  
  // City/District for registration
  const regCity = document.getElementById('regCity');
  const regDistrict = document.getElementById('regDistrict');
  regCity.addEventListener('change', () => updateDistrictOptions(regCity, regDistrict));
  
  // Create Job
  document.getElementById('createJobForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = e.target;
    
    // Set min date to today
    const today = new Date().toISOString().split('T')[0];
    form.jobDate.min = today;
    
    await createJob({
      title: form.jobTitle.value,
      description: form.jobDescription.value,
      payment: parseFloat(form.jobPayment.value),
      city: form.jobCity.value,
      district: form.jobDistrict.value,
      date: form.jobDate.value
    });
  });
  
  // City/District for create job
  const jobCity = document.getElementById('jobCity');
  const jobDistrict = document.getElementById('jobDistrict');
  jobCity.addEventListener('change', () => updateDistrictOptions(jobCity, jobDistrict));
  
  // Profile
  document.getElementById('profileForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = e.target;
    
    await updateProfile({
      name: form.profileNameInput.value,
      phone: form.profilePhone.value,
      city: form.profileCity.value,
      district: form.profileDistrict.value,
      skills: form.profileSkills.value
    });
  });
  
  // City/District for profile
  const profileCity = document.getElementById('profileCity');
  const profileDistrict = document.getElementById('profileDistrict');
  profileCity.addEventListener('change', () => updateDistrictOptions(profileCity, profileDistrict));
}

// ==================== Navigation ====================
function setupNavigation() {
  // Bottom nav
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const page = btn.dataset.page;
      if (page === 'home' || page === 'jobs' || page === 'my-jobs' || page === 'profile') {
        showPage(page);
      }
    });
  });
  
  // Back buttons
  document.querySelectorAll('.back-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const backPage = btn.dataset.back;
      showPage(backPage);
    });
  });
  
  // Quick actions
  document.getElementById('btnFindJobs').addEventListener('click', () => {
    showPage('jobs');
    loadJobs();
  });
  
  document.getElementById('btnCreateJob').addEventListener('click', () => {
    if (!currentUser || currentUser.role !== 'employer') {
      showToast('Создавать заказы могут только заказчики', 'error');
      return;
    }
    showPage('create-job');
  });
  
  // Notification button
  document.getElementById('notificationBtn').addEventListener('click', () => {
    showPage('notifications');
  });
  
  // View ratings
  document.getElementById('btnViewRatings').addEventListener('click', () => {
    showPage('ratings');
  });
  
  // Tabs in my-jobs
  document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      myJobsTab = tab.dataset.tab;
      loadMyJobs();
    });
  });
}

// ==================== Utilities ====================
function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function formatPayment(amount) {
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    maximumFractionDigits: 0
  }).format(amount);
}

function formatDate(dateStr) {
  const date = new Date(dateStr);
  return date.toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
}

function getCityName(city) {
  const names = {
    'Москва': 'Москва',
    'Moscow': 'Москва',
    'Санкт-Петербург': 'Санкт-Петербург',
    'Saint Petersburg': 'Санкт-Петербург',
    'Казань': 'Казань',
    'Kazan': 'Казань',
    'Екатеринбург': 'Екатеринбург',
    'Yekaterinburg': 'Екатеринбург'
  };
  return names[city] || city;
}

function getStatusText(status) {
  const texts = {
    'open': 'Открыт',
    'in_progress': 'В работе',
    'completed': 'Завершён'
  };
  return texts[status] || status;
}

function showToast(message, type = 'info') {
  const container = document.getElementById('toastContainer');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  container.appendChild(toast);
  
  setTimeout(() => {
    toast.remove();
  }, 3000);
}

// ==================== Initialize ====================
document.addEventListener('DOMContentLoaded', () => {
  setupNavigation();
  setupForms();
  setupFilters();
  initAuth();
  
  // Send viewport height to Telegram
  tg.ready();
});
