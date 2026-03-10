"use client";

import { useState, useEffect } from "react";

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
  employer: { name: string; rating: number };
}

const CITIES: Record<string, string[]> = {
  Москва: ["Центральный", "Северный", "Южный", "Западный", "Восточный"],
  "Санкт-Петербург": ["Центральный", "Невский"],
  Казань: ["Вахитовский", "Кировский"],
  Екатеринбург: ["Центральный", "Верх-Исетский"],
};

const CATEGORIES = ["Грузчики", "Разнорабочие", "Клининг", "Сборщики", "Водители", "Курьеры", "Строительство", "Ремонт", "Другое"];

function BottomNav({ currentPage, onNavigate }: { currentPage: string; onNavigate: (page: string) => void }) {
  const items = [
    { id: "home", icon: "🏠", label: "Главная" },
    { id: "jobs", icon: "💼", label: "Заказы" },
    { id: "create-job", icon: "➕", label: "Создать" },
    { id: "my-jobs", icon: "📋", label: "Мои" },
    { id: "profile", icon: "👤", label: "Профиль" },
  ];
  return (
    <div className="bottom-nav">
      {items.map((item) => (
        <div key={item.id} className={`bottom-nav-item ${currentPage === item.id ? "active" : ""}`} onClick={() => onNavigate(item.id)}>
          <span style={{ fontSize: 20 }}>{item.icon}</span>
          <span>{item.label}</span>
        </div>
      ))}
    </div>
  );
}

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [page, setPage] = useState<string>("home");
  const [error, setError] = useState("");

  useEffect(() => {
    const saved = sessionStorage.getItem("trudyagin_user");
    if (saved) {
      try {
        setUser(JSON.parse(saved));
      } catch (e) {}
    }
  }, []);

  const handleLogin = (userData: User) => {
    setUser(userData);
    sessionStorage.setItem("trudyagin_user", JSON.stringify(userData));
    setPage("home");
  };

  const handleLogout = () => {
    setUser(null);
    sessionStorage.removeItem("trudyagin_user");
  };

  // Auth Page
  if (!user) {
    return <AuthPage onLogin={handleLogin} setError={setError} error={error} />;
  }

  return (
    <>
      {page === "home" && <HomePage user={user} />}
      {page === "jobs" && <JobsPage user={user} />}
      {page === "create-job" && <CreateJobPage user={user} onCreated={() => setPage("my-jobs")} />}
      {page === "my-jobs" && <MyJobsPage user={user} />}
      {page === "profile" && <ProfilePage user={user} onLogout={handleLogout} />}
      <BottomNav currentPage={page} onNavigate={setPage} />
    </>
  );
}

function AuthPage({ onLogin, setError, error }: { onLogin: (u: User) => void; setError: (e: string) => void; error: string }) {
  const [isRegister, setIsRegister] = useState(false);
  const [step, setStep] = useState<"phone" | "code" | "form">("phone");
  const [role, setRole] = useState<"worker" | "employer" | null>(null);
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [city, setCity] = useState("");
  const [loading, setLoading] = useState(false);

  const sendCode = async () => {
    if (!phone) return setError("Введите номер телефона");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/send-code", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ phone }) });
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

  const verifyCode = async () => {
    if (!code || !phone || !password) return setError("Заполните все поля");
    if (isRegister) {
      setStep("form");
    } else {
      setLoading(true);
      try {
        const res = await fetch("/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ phone, password }) });
        const data = await res.json();
        if (data.success) onLogin(data.user);
        else setError(data.message || "Ошибка");
      } catch (e) {
        setError("Ошибка");
      }
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    if (!name || !password || password !== confirmPassword || !city || !role) return setError("Заполните все поля корректно");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, phone, code, password, role, city }) });
      const data = await res.json();
      if (data.success) onLogin(data.user);
      else setError(data.message || "Ошибка");
    } catch (e) {
      setError("Ошибка");
    }
    setLoading(false);
  };

  return (
    <div className="page-container" style={{ paddingTop: 40 }}>
      {error && <div style={{ position: 'fixed', top: 20, left: '50%', transform: 'translateX(-50%)', background: '#dc2626', color: 'white', padding: '12px 24px', borderRadius: 8, zIndex: 1000 }}>{error}</div>}
      <div style={{ textAlign: "center", marginBottom: 32 }}>
        <div style={{ fontSize: 48, marginBottom: 8 }}>Т</div>
        <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 8 }}>Трудягин</h1>
        <p style={{ color: "#666" }}>Находите работу рядом</p>
      </div>
      <div className="card">
        <h2 style={{ marginBottom: 16 }}>{isRegister ? "Регистрация" : "Вход"}</h2>
        {step === "phone" && <>
          <input type="tel" className="input" placeholder="+7 999 123-45-67" value={phone} onChange={(e) => setPhone(e.target.value)} style={{ marginBottom: 12 }} />
          <button className="btn btn-primary" style={{ width: "100%" }} onClick={sendCode} disabled={loading}>{loading ? "..." : "Получить код"}</button>
        </>}
        {step === "code" && <>
          <input type="text" className="input" placeholder="Код из SMS" value={code} onChange={(e) => setCode(e.target.value)} style={{ marginBottom: 12 }} />
          <input type="password" className="input" placeholder="Пароль" value={password} onChange={(e) => setPassword(e.target.value)} style={{ marginBottom: 12 }} />
          <button className="btn btn-primary" style={{ width: "100%" }} onClick={verifyCode} disabled={loading}>{loading ? "..." : "Продолжить"}</button>
        </>}
        {step === "form" && <>
          <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
            <div style={{ flex: 1, textAlign: "center", cursor: "pointer", border: role === "worker" ? "2px solid #2563EB" : "2px solid #e5e5e5", borderRadius: 8, padding: 12 }} onClick={() => setRole("worker")}><div style={{ fontSize: 32 }}>👷</div><div>Исполнитель</div></div>
            <div style={{ flex: 1, textAlign: "center", cursor: "pointer", border: role === "employer" ? "2px solid #2563EB" : "2px solid #e5e5e5", borderRadius: 8, padding: 12 }} onClick={() => setRole("employer")}><div style={{ fontSize: 32 }}>🏢</div><div>Работодатель</div></div>
          </div>
          <input type="text" className="input" placeholder="Ваше имя" value={name} onChange={(e) => setName(e.target.value)} style={{ marginBottom: 12 }} />
          <input type="password" className="input" placeholder="Пароль" value={password} onChange={(e) => setPassword(e.target.value)} style={{ marginBottom: 12 }} />
          <input type="password" className="input" placeholder="Повторите пароль" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} style={{ marginBottom: 12 }} />
          <select className="input" value={city} onChange={(e) => setCity(e.target.value)} style={{ marginBottom: 12 }}><option value="">Выберите город</option>{Object.keys(CITIES).map(c => <option key={c} value={c}>{c}</option>)}</select>
          <button className="btn btn-primary" style={{ width: "100%" }} onClick={handleRegister} disabled={loading}>{loading ? "..." : "Зарегистрироваться"}</button>
        </>}
        <p style={{ marginTop: 16, textAlign: "center", color: "#666" }}>{isRegister ? "Уже есть аккаунт? " : "Нет аккаунта? "}<span style={{ color: "#2563EB", cursor: "pointer" }} onClick={() => { setIsRegister(!isRegister); setStep("phone"); }}>{isRegister ? "Войти" : "Зарегистрироваться"}</span></p>
      </div>
    </div>
  );
}

function HomePage({ user }: { user: User }) {
  const [stats, setStats] = useState({ jobs: 0, workers: 0, done: 0 });
  useEffect(() => { fetch("/api/stats").then(r => r.json()).then(setStats).catch(() => {}); }, []);
  return (
    <div className="page-container">
      <div style={{ textAlign: "center", marginBottom: 24 }}><h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 8 }}>Трудягин</h1><p style={{ color: "#666" }}>Разовые и ежедневные задания</p></div>
      <div style={{ display: "flex", gap: 8, marginBottom: 24 }}><button className="btn btn-primary" style={{ flex: 1 }} onClick={() => window.location.hash = "jobs"}>Найти работу</button>{user.role === "employer" && <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => window.location.hash = "create-job"}>Создать заказ</button>}</div>
      <div style={{ display: "flex", justifyContent: "space-around", marginBottom: 24 }}>
        <div style={{ textAlign: "center" }}><div style={{ fontSize: 24, fontWeight: 700, color: "#2563EB" }}>{stats.jobs}</div><div style={{ fontSize: 12, color: "#666" }}>Активных</div></div>
        <div style={{ textAlign: "center" }}><div style={{ fontSize: 24, fontWeight: 700, color: "#2563EB" }}>{stats.workers}</div><div style={{ fontSize: 12, color: "#666" }}>Исполнителей</div></div>
      </div>
    </div>
  );
}

function JobsPage({ user }: { user: User }) {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [cityFilter, setCityFilter] = useState("");
  const [loading, setLoading] = useState(true);
  useEffect(() => { fetch("/api/jobs").then(r => r.json()).then(d => setJobs(d.jobs || [])).finally(() => setLoading(false)); }, []);
  return (
    <div className="page-container">
      <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 16 }}>Заказы</h2>
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}><select className="input" value={cityFilter} onChange={(e) => setCityFilter(e.target.value)} style={{ flex: 1 }}><option value="">Все города</option>{Object.keys(CITIES).map(c => <option key={c} value={c}>{c}</option>)}</select></div>
      {loading ? <div>Загрузка...</div> : jobs.length === 0 ? <div className="card" style={{ textAlign: "center", color: "#666" }}>Заказов пока нет</div> : jobs.map(job => (
        <div key={job.id} className="job-card">
          <div className="job-card-header"><div className="job-card-title">{job.title}</div><div className="job-card-price">{job.payment.toLocaleString()} ₽</div></div>
          <div style={{ color: "#666", fontSize: 14, marginBottom: 8 }}>{job.description}</div>
          <div className="job-card-meta"><span>📍 {job.city}</span><span>📅 {new Date(job.date).toLocaleDateString("ru-RU")}</span><span>👷 {job.category}</span></div>
          {user.role === "worker" && <button className="btn btn-primary" style={{ width: "100%", marginTop: 12 }} onClick={async () => { await fetch("/api/responses", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ jobId: job.id, workerId: user.id }) }); alert("Отклик отправлен!"); }}>Откликнуться</button>}
        </div>
      ))}
    </div>
  );
}

function CreateJobPage({ user, onCreated }: { user: User; onCreated: () => void }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [payment, setPayment] = useState("");
  const [category, setCategory] = useState("");
  const [city, setCity] = useState(user.city);
  const [date, setDate] = useState("");
  const [loading, setLoading] = useState(false);
  const handleSubmit = async () => {
    if (!title || !description || !payment || !category || !city || !date) return alert("Заполните все поля");
    setLoading(true);
    const res = await fetch("/api/jobs", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title, description, payment: Number(payment), category, city, date, employerId: user.id }) });
    const data = await res.json();
    if (data.success) { alert("Заказ создан!"); onCreated(); }
    setLoading(false);
  };
  return (
    <div className="page-container">
      <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 16 }}>Создать заказ</h2>
      <div className="card">
        <input type="text" className="input" placeholder="Название" value={title} onChange={(e) => setTitle(e.target.value)} style={{ marginBottom: 12 }} />
        <textarea className="input" placeholder="Описание" value={description} onChange={(e) => setDescription(e.target.value)} rows={3} style={{ marginBottom: 12 }} />
        <input type="number" className="input" placeholder="Оплата (₽)" value={payment} onChange={(e) => setPayment(e.target.value)} style={{ marginBottom: 12 }} />
        <select className="input" value={category} onChange={(e) => setCategory(e.target.value)} style={{ marginBottom: 12 }}><option value="">Категория</option>{CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}</select>
        <select className="input" value={city} onChange={(e) => setCity(e.target.value)} style={{ marginBottom: 12 }}><option value="">Город</option>{Object.keys(CITIES).map(c => <option key={c} value={c}>{c}</option>)}</select>
        <input type="date" className="input" value={date} onChange={(e) => setDate(e.target.value)} style={{ marginBottom: 12 }} />
        <button className="btn btn-primary" style={{ width: "100%" }} onClick={handleSubmit} disabled={loading}>{loading ? "..." : "Опубликовать"}</button>
      </div>
    </div>
  );
}

function MyJobsPage({ user }: { user: User }) {
  const [jobs, setJobs] = useState<Job[]>([]);
  useEffect(() => { fetch(`/api/my-jobs?userId=${user.id}&role=${user.role}`).then(r => r.json()).then(d => setJobs(d.jobs || [])).catch(() => {}); }, [user]);
  return (
    <div className="page-container">
      <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 16 }}>Мои заказы</h2>
      {jobs.length === 0 ? <div className="card" style={{ textAlign: "center", color: "#666" }}>Пока нет заказов</div> : jobs.map(job => (
        <div key={job.id} className="job-card">
          <div className="job-card-header"><div className="job-card-title">{job.title}</div><div className="job-card-price">{job.payment.toLocaleString()} ₽</div></div>
          <span className={`badge badge-${job.status === "open" ? "open" : "progress"}`}>{job.status === "open" ? "Открыт" : "В работе"}</span>
        </div>
      ))}
    </div>
  );
}

function ProfilePage({ user, onLogout }: { user: User; onLogout: () => void }) {
  return (
    <div className="page-container">
      <div className="card" style={{ textAlign: "center" }}>
        <div style={{ fontSize: 48, marginBottom: 8 }}>👤</div>
        <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 4 }}>{user.name}</h2>
        <p style={{ color: "#666", marginBottom: 8 }}>{user.role === "worker" ? "Исполнитель" : "Работодатель"}</p>
        <p style={{ color: "#666", fontSize: 14 }}>📍 {user.city}</p>
        <div style={{ marginTop: 16, display: "flex", justifyContent: "center", gap: 24 }}>
          <div><div style={{ fontSize: 24, fontWeight: 700, color: "#2563EB" }}>⭐ {user.rating.toFixed(1)}</div><div style={{ fontSize: 12, color: "#666" }}>Рейтинг</div></div>
          <div><div style={{ fontSize: 24, fontWeight: 700, color: "#2563EB" }}>{user.jobsDone}</div><div style={{ fontSize: 12, color: "#666" }}>Заданий</div></div>
        </div>
        <button className="btn btn-secondary" style={{ width: "100%", marginTop: 16 }} onClick={onLogout}>Выйти</button>
      </div>
    </div>
  );
}
