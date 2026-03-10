"use client";

import { useState, useEffect, useCallback } from "react";

// Telegram WebApp types
declare global {
  interface Window {
    Telegram?: {
      WebApp: {
        ready: () => void;
        expand: () => void;
        close: () => void;
        sendData: (data: string) => void;
        onEvent: (event: string, callback: () => void) => void;
        initDataUnsafe?: {
          user?: {
            id: number;
            first_name: string;
            last_name?: string;
            username?: string;
          };
        };
        themeParams: {
          bg_color: string;
          text_color: string;
          hint_color: string;
          button_color: string;
          button_text_color: string;
        };
      };
    };
  }
}

interface User {
  id: string;
  name: string;
  phone: string;
  role: "worker" | "employer";
  city: string;
  district?: string;
  rating: number;
  jobsDone: number;
}

interface Job {
  id: string;
  title: string;
  description: string;
  payment: number;
  category: string;
  city: string;
  district?: string;
  date: string;
  status: string;
  employer?: { name: string; rating: number };
}

const CITIES: Record<string, string[]> = {
  Москва: ["Центральный", "Северный", "Южный", "Западный", "Восточный"],
  "Санкт-Петербург": ["Центральный", "Невский"],
  Казань: ["Вахитовский", "Кировский"],
  Екатеринбург: ["Верх-Исетский", "Ленинский", "Октябрьский"],
};

const CATEGORIES = ["Грузчики", "Разнорабочие", "Клининг", "Сборщики", "Водители", "Курьеры", "Строительство", "Ремонт", "Другое"];

const API_BASE = "/api";

function showError(msg: string) {
  const el = document.getElementById("error-toast");
  if (el) {
    el.textContent = msg;
    el.style.display = "block";
    setTimeout(() => el.style.display = "none", 3000);
  }
}

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [page, setPage] = useState("home");
  const [loading, setLoading] = useState(false);

  // Load user from session
  useEffect(() => {
    const saved = sessionStorage.getItem("trudyagin_user");
    if (saved) {
      try {
        setUser(JSON.parse(saved));
      } catch (e) {
        sessionStorage.removeItem("trudyagin_user");
      }
    }
  }, []);

  // Save user to session
  const saveUser = useCallback((u: User) => {
    setUser(u);
    sessionStorage.setItem("trudyagin_user", JSON.stringify(u));
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    sessionStorage.removeItem("trudyagin_user");
    setPage("home");
  }, []);

  // Get Telegram user info
  const getTelegramUser = useCallback(() => {
    if (window.Telegram?.WebApp?.initDataUnsafe?.user) {
      const tUser = window.Telegram.WebApp.initDataUnsafe.user;
      return {
        id: String(tUser.id),
        name: tUser.first_name + (tUser.last_name ? " " + tUser.last_name : ""),
        username: tUser.username || "",
      };
    }
    return null;
  }, []);

  // Initialize Telegram
  useEffect(() => {
    if (window.Telegram?.WebApp) {
      window.Telegram.WebApp.ready();
      window.Telegram.WebApp.expand();
    }
  }, []);

  // Navigate
  const navigate = useCallback((newPage: string) => {
    setPage(newPage);
  }, []);

  if (!user) {
    return <AuthPage onLogin={saveUser} />;
  }

  return (
    <div className="app-container">
      <Header user={user} onLogout={logout} />
      
      <main className="main-content">
        {page === "home" && <HomePage user={user} onNavigate={navigate} />}
        {page === "jobs" && <JobsPage user={user} />}
        {page === "create-job" && <CreateJobPage user={user} onNavigate={navigate} />}
        {page === "my-jobs" && <MyJobsPage user={user} />}
        {page === "profile" && <ProfilePage user={user} onLogout={logout} />}
      </main>

      <BottomNav currentPage={page} onNavigate={navigate} />
      <div id="error-toast" className="error-toast" style={{ display: "none" }}></div>
    </div>
  );
}

function Header({ user, onLogout }: { user: User; onLogout: () => void }) {
  const tgUser = typeof window !== "undefined" && window.Telegram?.WebApp?.initDataUnsafe?.user;
  
  return (
    <header className="header">
      <div className="header-left">
        <span className="logo">Т</span>
        <span className="header-title">Трудягин</span>
      </div>
      <button className="header-btn" onClick={onLogout}>Выйти</button>
    </header>
  );
}

function BottomNav({ currentPage, onNavigate }: { currentPage: string; onNavigate: (p: string) => void }) {
  const items = [
    { id: "home", icon: "🏠", label: "Главная" },
    { id: "jobs", icon: "💼", label: "Заказы" },
    { id: "create-job", icon: "➕", label: "Создать" },
    { id: "my-jobs", icon: "📋", label: "Мои" },
    { id: "profile", icon: "👤", label: "Профиль" },
  ];

  // Hide create-job for workers
  const filteredItems = items;

  return (
    <nav className="bottom-nav">
      {filteredItems.map((item) => (
        <button
          key={item.id}
          className={`nav-item ${currentPage === item.id ? "active" : ""}`}
          onClick={() => onNavigate(item.id)}
        >
          <span className="nav-icon">{item.icon}</span>
          <span className="nav-label">{item.label}</span>
        </button>
      ))}
    </nav>
  );
}

function AuthPage({ onLogin }: { onLogin: (u: User) => void }) {
  const [step, setStep] = useState<"phone" | "code">("phone");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const tgUser = typeof window !== "undefined" ? window.Telegram?.WebApp?.initDataUnsafe?.user : null;

  const sendCode = async () => {
    if (!phone) return setError("Введите номер телефона");
    setError("");
    setLoading(true);

    try {
      const res = await fetch(`${API_BASE}/auth/send-code`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      });
      const data = await res.json();
      
      if (data.success) {
        setStep("code");
        if (data.debug_code) setCode(data.debug_code);
      } else {
        setError(data.message || "Ошибка");
      }
    } catch (e) {
      setError("Ошибка соединения");
    }
    setLoading(false);
  };

  const login = async () => {
    if (!phone || !password) return setError("Введите телефон и пароль");
    setError("");
    setLoading(true);

    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, password }),
      });
      const data = await res.json();
      
      if (data.success) {
        onLogin(data.user);
      } else {
        setError(data.message || "Ошибка входа");
      }
    } catch (e) {
      setError("Ошибка соединения");
    }
    setLoading(false);
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">Т</div>
        <h1>Трудягин</h1>
        <p className="auth-subtitle">Находите работу рядом</p>

        {error && <div className="error-message">{error}</div>}

        {step === "phone" && (
          <>
            <input
              type="tel"
              className="input"
              placeholder="+7 999 123-45-67"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
            <input
              type="password"
              className="input"
              placeholder="Придумайте пароль"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <button className="btn btn-primary" onClick={sendCode} disabled={loading}>
              {loading ? "Отправка..." : "Продолжить"}
            </button>
            <p className="auth-link">
              Нет аккаунта? <a href="#" onClick={(e) => { e.preventDefault(); sendCode(); }}>Зарегистрироваться</a>
            </p>
          </>
        )}

        {step === "code" && (
          <>
            <input
              type="text"
              className="input"
              placeholder="Код из SMS"
              value={code}
              onChange={(e) => setCode(e.target.value)}
            />
            <button className="btn btn-primary" onClick={login} disabled={loading}>
              {loading ? "Вход..." : "Войти"}
            </button>
            <button className="btn btn-link" onClick={() => setStep("phone")}>
              Назад
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function HomePage({ user, onNavigate }: { user: User; onNavigate: (p: string) => void }) {
  const [stats, setStats] = useState({ jobs: 0, workers: 0, done: 0 });

  useEffect(() => {
    fetch(`${API_BASE}/stats`)
      .then((r) => r.json())
      .then(setStats)
      .catch(() => {});
  }, []);

  return (
    <div className="page">
      <h2>Добро пожаловать, {user.name}!</h2>
      
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-value">{stats.jobs}</div>
          <div className="stat-label">Активных заказов</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats.workers}</div>
          <div className="stat-label">Исполнителей</div>
        </div>
      </div>

      <div className="action-buttons">
        {user.role === "worker" ? (
          <button className="btn btn-primary btn-large" onClick={() => onNavigate("jobs")}>
            Найти работу
          </button>
        ) : (
          <button className="btn btn-primary btn-large" onClick={() => onNavigate("create-job")}>
            Создать заказ
          </button>
        )}
      </div>

      <div className="quick-links">
        <button className="quick-link" onClick={() => onNavigate("jobs")}>
          💼 Все заказы
        </button>
        <button className="quick-link" onClick={() => onNavigate("my-jobs")}>
          📋 Мои заказы
        </button>
      </div>
    </div>
  );
}

function JobsPage({ user }: { user: User }) {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [cityFilter, setCityFilter] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API_BASE}/jobs${cityFilter ? `?city=${encodeURIComponent(cityFilter)}` : ""}`)
      .then((r) => r.json())
      .then((d) => setJobs(d.jobs || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [cityFilter]);

  const respondToJob = async (jobId: string) => {
    try {
      const res = await fetch(`${API_BASE}/responses`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId, workerId: user.id }),
      });
      const data = await res.json();
      if (data.success) {
        alert("Отклик отправлен!");
      } else {
        alert(data.message || "Ошибка");
      }
    } catch (e) {
      alert("Ошибка соединения");
    }
  };

  return (
    <div className="page">
      <h2>Заказы</h2>

      <select
        className="input"
        value={cityFilter}
        onChange={(e) => setCityFilter(e.target.value)}
      >
        <option value="">Все города</option>
        {Object.keys(CITIES).map((c) => (
          <option key={c} value={c}>{c}</option>
        ))}
      </select>

      {loading ? (
        <div className="loading">Загрузка...</div>
      ) : jobs.length === 0 ? (
        <div className="empty-state">Заказов пока нет</div>
      ) : (
        <div className="jobs-list">
          {jobs.map((job) => (
            <div key={job.id} className="job-card">
              <div className="job-header">
                <h3>{job.title}</h3>
                <span className="job-price">{job.payment.toLocaleString()} ₽</span>
              </div>
              <p className="job-description">{job.description}</p>
              <div className="job-meta">
                <span>📍 {job.city}</span>
                <span>📅 {new Date(job.date).toLocaleDateString("ru-RU")}</span>
                <span>👷 {job.category}</span>
              </div>
              {user.role === "worker" && (
                <button className="btn btn-primary" onClick={() => respondToJob(job.id)}>
                  Откликнуться
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function CreateJobPage({ user, onNavigate }: { user: User; onNavigate: (p: string) => void }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [payment, setPayment] = useState("");
  const [category, setCategory] = useState("");
  const [city, setCity] = useState(user.city);
  const [date, setDate] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!title || !description || !payment || !category || !city || !date) {
      showError("Заполните все поля");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/jobs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description,
          payment: Number(payment),
          category,
          city,
          date,
          employerId: user.id,
        }),
      });
      const data = await res.json();
      
      if (data.success) {
        alert("Заказ создан!");
        onNavigate("my-jobs");
      } else {
        showError(data.message || "Ошибка");
      }
    } catch (e) {
      showError("Ошибка соединения");
    }
    setLoading(false);
  };

  return (
    <div className="page">
      <h2>Создать заказ</h2>
      
      <div className="form">
        <input
          type="text"
          className="input"
          placeholder="Название"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <textarea
          className="input"
          placeholder="Описание"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
        />
        <input
          type="number"
          className="input"
          placeholder="Оплата (₽)"
          value={payment}
          onChange={(e) => setPayment(e.target.value)}
        />
        <select
          className="input"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        >
          <option value="">Категория</option>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <select
          className="input"
          value={city}
          onChange={(e) => setCity(e.target.value)}
        >
          <option value="">Город</option>
          {Object.keys(CITIES).map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <input
          type="date"
          className="input"
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
        <button className="btn btn-primary btn-large" onClick={handleSubmit} disabled={loading}>
          {loading ? "Создание..." : "Опубликовать"}
        </button>
      </div>
    </div>
  );
}

function MyJobsPage({ user }: { user: User }) {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API_BASE}/my-jobs?userId=${user.id}&role=${user.role}`)
      .then((r) => r.json())
      .then((d) => setJobs(d.jobs || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user]);

  return (
    <div className="page">
      <h2>Мои заказы</h2>
      
      {loading ? (
        <div className="loading">Загрузка...</div>
      ) : jobs.length === 0 ? (
        <div className="empty-state">Заказов пока нет</div>
      ) : (
        <div className="jobs-list">
          {jobs.map((job) => (
            <div key={job.id} className="job-card">
              <div className="job-header">
                <h3>{job.title}</h3>
                <span className="job-price">{job.payment.toLocaleString()} ₽</span>
              </div>
              <span className={`status-badge ${job.status}`}>
                {job.status === "open" ? "Открыт" : job.status === "in_progress" ? "В работе" : "Завершён"}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ProfilePage({ user, onLogout }: { user: User; onLogout: () => void }) {
  return (
    <div className="page">
      <div className="profile-card">
        <div className="profile-avatar">👤</div>
        <h2>{user.name}</h2>
        <p className="profile-role">
          {user.role === "worker" ? "Исполнитель" : "Работодатель"}
        </p>
        <p className="profile-location">📍 {user.city}</p>
        
        <div className="profile-stats">
          <div className="profile-stat">
            <div className="stat-value">⭐ {user.rating.toFixed(1)}</div>
            <div className="stat-label">Рейтинг</div>
          </div>
          <div className="profile-stat">
            <div className="stat-value">{user.jobsDone}</div>
            <div className="stat-label">Заданий</div>
          </div>
        </div>

        <button className="btn btn-secondary" onClick={onLogout}>
          Выйти
        </button>
      </div>
    </div>
  );
}
