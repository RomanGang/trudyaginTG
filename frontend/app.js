// ==================== Configuration ====================
const API_BASE = window.location.origin;

// ==================== Location Data ====================
// Real cities and districts for Russia
const cities = {
  Москва: [
    "Центр", "Север", "Юг", "Запад", "Восток", 
    "Северо-Запад", "Северо-Восток", "Юго-Запад", "Юго-Восток",
    "ЗАО", "САО", "СВАО", "ВАО", "ЮВАО", "ЮЗАО", "СЗАО", "ТиНАО"
  ],
  "Санкт-Петербург": [
    "Центр", "Север", "Юг", "Василеостровский", "Петроградский", 
    "Кронверкский", "Красногвардейский", "Невский", "Фрунзенский",
    "Калининский", "Кировский", "Красносельский", "Приморский", "Выборгский"
  ],
  Екатеринбург: [
    "Центр", "Север", "Юг", "Запад", "Восток", 
    "Верх-Исетский", "Ленинский", "Октябрьский", "Железнодорожный",
    "Кировский", "Чкаловский", "Сибирский", "Пионерский"
  ],
  Казань: [
    "Центр", "Север", "Юг", "Запад", "Восток", 
    "Ново-Савиновский", "Авиастроительный", "Вахитовский",
    "Кировский", "Московский", "Ново-Пестрошинский"
  ],
  "Верхняя Пышма": [
    "Центр", "Север", "Юг", "Запад", "Восток",
    "Успенский", "Клязьма", "Шахтовская", "Октябрьский", "Первомайский"
  ],
  "Ростов-на-Дону": [
    "Центр", "Север", "Юг", "Запад", "Восток",
    "Ленина", "Пролетарский", "Октябрьский", "Первомайский", "Ворошиловский"
  ]
};

// ==================== Job Categories ====================
const jobCategories = [
  "Разнорабочие", "Грузчики", "Сварщики", "Маляры", "Клининг",
  "Сборщики", "Электрики", "Сантехники", "Плиточники", "Штукатуры",
  "Столяры", "Кровельщики", "Фасадчики", "Механизаторы", "Охранники",
  "Курьеры", "Водители", "Комплектовщики", "Подсобные рабочие", "Другое"
];

// ==================== Work Schedule Types ====================
const workSchedules = ["Ежедневная", "Еженедельная", "Разовая"];

// ==================== Payment Types ====================
const paymentTypes = ["Почасовая", "За смену", "Договорная"];

// ==================== State ====================
let currentUser = null;
let currentPage = 'home';
let jobFilters = { city: '', district: '', min_payment: '', category: '', schedule: '', payment_type: '' };
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

// Check for referral parameter in URL
const urlParams = new URLSearchParams(window.location.search);
const referralParam = urlParams.get('ref');
if (referralParam && referralParam !== 'undefined') {
  // Store referral for later use when user registers
  sessionStorage.setItem('pending_referral', referralParam);
}

// Get pending referral from session storage
function getPendingReferral() {
  const ref = sessionStorage.getItem('pending_referral');
  sessionStorage.removeItem('pending_referral');
  return ref;
}

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
  // Get referral parameter if available
  const referredBy = getPendingReferral();
  
  const userData = {
    telegram_id: telegramUser.id,
    name: data.name,
    phone: data.phone || null,
    role: data.role,
    city: data.city,
    district: data.district,
    skills: data.skills || null,
    referred_by: referredBy || null
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
    if (jobFilters.category) params.append('category', jobFilters.category);
    if (jobFilters.schedule) params.append('schedule', jobFilters.schedule);
    if (jobFilters.payment_type) params.append('payment_type', jobFilters.payment_type);
    
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
  
  const workersRequired = job.workers_required || 1;
  const workersJoined = job.workers_joined || 0;
  const isMultiWorker = workersRequired > 1;
  const workersText = isMultiWorker 
    ? `${workersJoined} из ${workersRequired} работников` 
    : '';
  
  // Format payment with type
  let paymentDisplay = formatPayment(job.payment);
  if (job.payment_type) {
    paymentDisplay = `${formatPayment(job.payment)} ${job.payment_type !== 'Договорная' ? '/ ' + job.payment_type : ''}`;
  }
  
  return `
    <div class="job-card" onclick="showJobDetail(${job.id})">
      <div class="job-card-header">
        <span class="job-card-title">${escapeHtml(job.title)}</span>
        <span class="job-card-payment">${paymentDisplay}</span>
      </div>
      <p class="job-card-description">${escapeHtml(job.description)}</p>
      <div class="job-card-meta">
        ${job.category ? `<span class="job-card-tag category-tag">${job.category}</span>` : ''}
        <span class="job-card-tag">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
            <circle cx="12" cy="10" r="3"></circle>
          </svg>
          ${getCityName(job.city)}
        </span>
        ${job.district ? `<span class="job-card-tag">${job.district}</span>` : ''}
        <span class="job-card-tag">${formatDate(job.date)}</span>
        ${job.schedule ? `<span class="job-card-tag">${job.schedule}</span>` : ''}
        ${isMultiWorker ? `<span class="job-card-tag workers-tag">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
            <circle cx="9" cy="7" r="4"></circle>
            <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
            <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
          </svg>
          ${workersText}
        </span>` : ''}
      </div>
      <div class="job-card-footer">
        <span class="job-card-employer">${escapeHtml(job.employer_name || 'Заказчик')}</span>
        <div class="job-card-actions">
          ${currentUser?.role === 'worker' && job.status === 'open' ? `
            <button class="btn-small btn-primary" onclick="event.stopPropagation(); takeJob(${job.id})">Взять</button>
          ` : ''}
          <button class="btn-small btn-secondary" onclick="event.stopPropagation(); shareJob(${job.id})">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="18" cy="5" r="3"></circle>
              <circle cx="6" cy="12" r="3"></circle>
              <circle cx="18" cy="19" r="3"></circle>
              <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line>
              <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line>
            </svg>
          </button>
        </div>
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
    const workersRequired = job.workers_required || 1;
    const workersJoined = job.workers_joined || 0;
    const isMultiWorker = workersRequired > 1;
    
    // Get workers if multi-worker job
    let workersList = '';
    if (isMultiWorker) {
      try {
        const workers = await apiCall(`/jobs/${jobId}/workers`);
        workersList = workers.map(w => `<div class="worker-item">👤 ${escapeHtml(w.worker_name || 'Работник')}</div>`).join('');
      } catch (e) {
        workersList = '';
      }
    }
    
    detail.innerHTML = `
      <div class="job-detail-header">
        <h2 class="job-detail-title">${escapeHtml(job.title)}</h2>
        <div class="job-detail-payment">${formatPayment(job.payment)}</div>
        <span class="job-status ${job.status}">${getStatusText(job.status)}</span>
      </div>
      
      ${isMultiWorker ? `
        <div class="job-detail-section workers-section">
          <h4>Работники</h4>
          <div class="workers-progress">
            <div class="workers-count">${workersJoined} из ${workersRequired} присоединилось</div>
            <div class="progress-bar">
              <div class="progress-fill" style="width: ${(workersJoined / workersRequired) * 100}%"></div>
            </div>
          </div>
          ${workersList ? `<div class="workers-list">${workersList}</div>` : ''}
        </div>
      ` : ''}
      
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
          ${isMultiWorker ? `<button class="btn-secondary" onclick="takeJob(${job.id})">Взять заказ</button>` : ''}
        </div>
      ` : ''}
      
      ${currentUser?.role === 'worker' && job.status === 'open' && hasResponded && isMultiWorker ? `
        <div class="job-detail-actions">
          <button class="btn-secondary" onclick="takeJob(${job.id})">Присоединиться</button>
        </div>
      ` : ''}
      
      ${currentUser?.role === 'employer' && currentUser.telegram_id === job.employer_id && job.status === 'open' ? `
        <div class="job-detail-actions">
          <button class="btn-secondary" onclick="showApplicants(${job.id})">Отклики (${job.response_count || 0})</button>
        </div>
      ` : ''}
      
      ${job.status === 'in_progress' && job.employer_id === telegramUser.id ? `
        <div class="job-detail-actions">
          <button class="btn-primary btn-success" onclick="completeJob(${job.id})">Завершить</button>
        </div>
      ` : ''}
      
      ${job.status === 'completed' ? `
        ${isMultiWorker && workersList ? `<div class="job-detail-actions"><button class="btn-secondary" onclick="showRateModalMulti(${job.id}, ${job.employer_id})">Оценить всех</button></div>` : ''}
        ${!isMultiWorker && (job.worker_id === telegramUser.id || job.employer_id === telegramUser.id) ? `
          <div class="job-detail-actions">
            <button class="btn-secondary" onclick="showRateModal(${job.id}, ${job.employer_id === telegramUser.id ? job.worker_id : job.employer_id})">Оценить</button>
          </div>
        ` : ''}
      ` : ''}
      
      <div class="job-detail-actions">
        <button class="btn-secondary" onclick="shareJob(${job.id})">Поделиться</button>
      </div>
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

async function takeJob(jobId) {
  if (!currentUser || currentUser.role !== 'worker') {
    showToast('Только работники могут брать заказы', 'error');
    return;
  }
  
  try {
    const result = await apiCall(`/jobs/${jobId}/take`, 'POST', { worker_id: telegramUser.id });
    if (result.success) {
      showToast(result.message || 'Вы присоединились к заказу!', 'success');
      loadJobs(); // Refresh job list
    }
  } catch (e) {
    showToast(e.message || 'Не удалось взять заказ', 'error');
  }
}

async function leaveJob(jobId) {
  try {
    const result = await apiCall(`/jobs/${jobId}/leave`, 'POST', { worker_id: telegramUser.id });
    if (result.success) {
      showToast('Вы покинули заказ', 'success');
      loadJobs(); // Refresh job list
    }
  } catch (e) {
    showToast(e.message || 'Не удалось покинуть заказ', 'error');
  }
}

function shareJob(jobId) {
  const jobLink = `${window.location.origin}/#/job/${jobId}?ref=${telegramUser?.id || ''}`;
  const shareText = `Новый заказ доступен в Trudyagin!`;
  
  if (tg && tg.shareUrl) {
    // Use Telegram share
    tg.shareUrl(jobLink, shareText);
  } else {
    // Fallback: use Web Share API or copy to clipboard
    const shareUrl = `https://t.me/share/url?url=${encodeURIComponent(jobLink)}&text=${encodeURIComponent(shareText)}`;
    
    if (navigator.share) {
      navigator.share({
        title: 'Trudyagin - Заказ',
        text: shareText,
        url: shareUrl
      }).catch(() => {
        // User cancelled or error
      });
    } else {
      // Copy to clipboard fallback
      navigator.clipboard.writeText(shareUrl).then(() => {
        showToast('Ссылка скопирована!', 'success');
      }).catch(() => {
        // Open in new tab as fallback
        window.open(shareUrl, '_blank');
      });
    }
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

async function showRateModalMulti(jobId, employerId) {
  try {
    const workers = await apiCall(`/jobs/${jobId}/workers`);
    if (!workers || workers.length === 0) {
      showToast('Нет работников для оценки', 'error');
      return;
    }
    
    const modal = document.createElement('div');
    modal.className = 'modal-overlay active';
    
    let workersHtml = workers.map(w => `
      <div class="rate-worker-item" data-worker-id="${w.worker_id}">
        <div class="rate-worker-name">👤 ${escapeHtml(w.worker_name || 'Работник')}</div>
        <div class="star-rating small" data-worker="${w.worker_id}">
          ${[1,2,3,4,5].map(i => `
            <button type="button" data-rating="${i}">
              <svg viewBox="0 0 24 24" fill="none" stroke="#FFD700" stroke-width="2">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
              </svg>
            </button>
          `).join('')}
        </div>
      </div>
    `).join('');
    
    modal.innerHTML = `
      <div class="modal">
        <h3 class="modal-title">Оценить работников</h3>
        <div class="rate-workers-list">
          ${workersHtml}
        </div>
        <div class="form-group">
          <textarea id="ratingCommentMulti" rows="3" placeholder="Комментарий (необязательно)"></textarea>
        </div>
        <div class="modal-actions">
          <button class="btn-secondary" onclick="this.closest('.modal-overlay').remove()">Отмена</button>
          <button class="btn-primary" onclick="submitRatingMulti(${jobId}, ${employerId})">Отправить</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
    
    // Add star rating interactivity for each worker
    workers.forEach(w => {
      const ratingDiv = modal.querySelector(`.star-rating[data-worker="${w.worker_id}"]`);
      if (ratingDiv) {
        const stars = ratingDiv.querySelectorAll('button');
        stars.forEach(star => {
          star.addEventListener('click', () => {
            const rating = parseInt(star.dataset.rating);
            ratingDiv.dataset.selected = rating;
            stars.forEach((s, i) => {
              s.classList.toggle('active', i < rating);
            });
          });
        });
      }
    });
    
    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.remove();
    });
  } catch (e) {
    showToast('Ошибка загрузки работников', 'error');
  }
}

async function submitRatingMulti(jobId, employerId) {
  const workerItems = document.querySelectorAll('.rate-worker-item');
  const comment = document.getElementById('ratingCommentMulti')?.value || '';
  let submitted = 0;
  
  for (const item of workerItems) {
    const workerId = parseInt(item.dataset.workerId);
    const ratingDiv = item.querySelector('.star-rating');
    const rating = parseInt(ratingDiv?.dataset.selected) || 0;
    
    if (rating > 0) {
      try {
        await apiCall('/rate', 'POST', {
          from_user: employerId,
          to_user: workerId,
          job_id: jobId,
          rating: rating,
          comment: comment
        });
        submitted++;
      } catch (e) {
        // Continue with other workers
      }
    }
  }
  
  if (submitted > 0) {
    showToast(`Оценено ${submitted} работников!`, 'success');
    document.querySelector('.modal-overlay')?.remove();
    showJobDetail(jobId);
  } else {
    showToast('Выберите оценку', 'error');
  }
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
  const categoryFilter = document.getElementById('categoryFilter');
  const scheduleFilter = document.getElementById('scheduleFilter');
  const paymentTypeFilter = document.getElementById('paymentTypeFilter');
  
  cityFilter.addEventListener('change', () => {
    updateDistrictOptions(cityFilter, districtFilter);
    jobFilters.city = cityFilter.value;
    jobFilters.district = '';
  });
  
  districtFilter.addEventListener('change', () => {
    jobFilters.district = districtFilter.value;
  });

  categoryFilter.addEventListener('change', () => {
    jobFilters.category = categoryFilter.value;
  });

  scheduleFilter.addEventListener('change', () => {
    jobFilters.schedule = scheduleFilter.value;
  });

  paymentTypeFilter.addEventListener('change', () => {
    jobFilters.payment_type = paymentTypeFilter.value;
  });
  
  document.getElementById('applyFilters').addEventListener('click', () => {
    jobFilters.min_payment = document.getElementById('paymentFilter').value;
    loadJobs();
  });
}

// ==================== Form Handlers ====================
function setupForms() {
  // Create Job Form
  document.getElementById('createJobForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = e.target;
    
    const today = new Date().toISOString().split('T')[0];
    form.jobDate.min = today;
    
    await createJob({
      title: form.jobTitle.value,
      description: form.jobDescription.value,
      payment: parseFloat(form.jobPayment.value),
      city: form.jobCity.value,
      district: form.jobDistrict.value,
      date: form.jobDate.value,
      workers_required: parseInt(form.jobWorkersRequired.value) || 1,
      category: form.jobCategory.value,
      schedule: form.jobSchedule.value,
      payment_type: form.jobPaymentType.value
    });
  });
  
  // City/District for create job
  const jobCity = document.getElementById('jobCity');
  const jobDistrict = document.getElementById('jobDistrict');
  if (jobCity && jobDistrict) {
    jobCity.addEventListener('change', () => updateDistrictOptions(jobCity, jobDistrict));
  }

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
  // Check if user is already logged in
  const savedUser = localStorage.getItem('trudyagin_user');
  
  if (savedUser) {
    // User already registered, skip entrance
    document.getElementById('entranceOverlay').style.display = 'none';
    document.getElementById('registrationScreen').style.display = 'none';
  }
  
  // Run entrance animation
  setTimeout(() => {
    const overlay = document.getElementById('entranceOverlay');
    overlay.style.transition = 'opacity 0.3s';
    overlay.style.opacity = '0';
    setTimeout(() => {
      overlay.style.display = 'none';
      setupRegistration();
    }, 300);
  }, 1500);
  
  setupNavigation();
  setupForms();
  setupFilters();
  initAuth();
  tg.ready();
});

// ==================== Registration ====================
function setupRegistration() {
  const regScreen = document.getElementById('registrationScreen');
  regScreen.style.display = 'block';
  
  let selectedRole = null;
  const roleBtns = document.querySelectorAll('.role-btn');
  
  roleBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      roleBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      selectedRole = btn.dataset.role;
      
      document.getElementById('roleBox').style.display = 'none';
      document.getElementById('regForm').classList.add('show');
    });
  });
  
  // City change handler
  const regCity = document.getElementById('regCity');
  const regDistrict = document.getElementById('regDistrict');
  regCity.addEventListener('change', () => updateDistrictOptions(regCity, regDistrict));
  
  // Form submit
  document.getElementById('regForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    if (!selectedRole) {
      showToast('Выберите роль', 'error');
      return;
    }
    
    const name = document.getElementById('regName').value;
    const city = document.getElementById('regCity').value;
    const district = document.getElementById('regDistrict').value;
    
    await registerUser({
      name: name,
      role: selectedRole,
      city: city,
      district: district
    });
    
    regScreen.style.display = 'none';
  });
}
