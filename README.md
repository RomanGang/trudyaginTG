# Trudyagin — Telegram Mini App

Платформа для поиска и выполнения локальных заказов.

## 🚀 Запуск

```bash
cd backend
npm install
npm start
```

Приложение будет доступно по адресу: http://localhost:3000

## 📱 Развёртывание в Telegram

1. Создайте бота через @BotFather в Telegram
2. Получите токен бота
3. Используйте https://api.telegram.org/bot<TOKEN>/setwebhook для настройки вебхука
4. Или откройте как Mini App через меню бота

## 🗄️ База данных

SQLite база данных создаётся автоматически при первом запуске:
- `database/trudyagin.db`

## 📋 API Endpoints

### Пользователи
- `POST /api/user` — Создать/обновить пользователя
- `GET /api/user/:telegram_id` — Получить пользователя
- `PUT /api/user/:telegram_id` — Обновить профиль

### Заказы
- `GET /api/jobs` — Список заказов (фильтры: city, district, min_payment, status)
- `POST /api/jobs` — Создать заказ
- `GET /api/jobs/:id` — Получить заказ
- `POST /api/jobs/:id/assign` — Назначить исполнителя
- `POST /api/jobs/:id/complete` — Завершить заказ

### Отклики
- `POST /api/respond` — Откликнуться на заказ
- `GET /api/responses/job/:job_id` — Отклики на заказ
- `GET /api/responses/worker/:worker_id` — Отклики исполнителя
- `GET /api/my-jobs` — Мои заказы

### Рейтинги
- `POST /api/rate` — Оценить пользователя
- `GET /api/ratings/:user_id` — Отзывы о пользователе

### Уведомления
- `GET /api/notifications/:user_id` — Уведомления пользователя

## 🎨 Структура проекта

```
trudyagin/
├── frontend/
│   ├── index.html    # HTML разметка
│   ├── styles.css    # Стили (Telegram UI)
│   └── app.js       # Клиентская логика
├── backend/
│   ├── server.js    # Express сервер
│   ├── database.js  # SQLite подключение
│   └── package.json # Зависимости
└── database/
    └── trudyagin.db # SQLite база
```

## 🔧 Технологии

- **Frontend:** HTML, CSS, Vanilla JS, Telegram WebApp API
- **Backend:** Node.js, Express.js
- **Database:** SQLite

## 📱 Функции

- ✅ Регистрация через Telegram
- ✅ Создание заказов (работодатели)
- ✅ Поиск заказов с фильтрами
- ✅ Отклики на заказы
- ✅ Выбор исполнителя
- ✅ Система рейтингов
- ✅ Иерархическая система локаций (Город → Район)
- ✅ Уведомления
- ✅ Готово к монетизации (поля для комиссий)
