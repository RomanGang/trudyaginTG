const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');

// Bot token from BotFather
const TOKEN = '8048217702:AAEOxzXkU51gQ9ykHcQu_Z6Y43VZyXSyq8A';

// Create bot
const bot = new TelegramBot(TOKEN, { polling: true });

// API URL (change this to your production API)
const API_URL = 'https://tall-badgers-hope.loca.lt/api';

// Start command
bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  bot.sendMessage(chatId, 
    '👋 Добро пожаловать в Трудягин!\n\n' +
    'Я помогу вам:\n' +
    '• Найти работу или работников\n' +
    '• Выбрать исполнителя для заказа\n\n' +
    'Откройте приложение: https://trudyagin-tg-ej5c.vercel.app/',
    { parse_mode: 'HTML' }
  );
});

// Help command
bot.onText(/\/help/, (msg) => {
  const chatId = msg.chat.id;
  bot.sendMessage(chatId,
    '📖 <b>Справка</b>\n\n' +
    '/start - Запустить бота\n' +
    '/help - Показать справку\n\n' +
    'Для выбора исполнителя используйте команды из приложения',
    { parse_mode: 'HTML' }
  );
});

// Handle choose commands like /choose_123_456
bot.onText(/\/choose_(\d+)_(\d+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const jobId = match[1];
  const workerId = match[2];
  
  try {
    const response = await axios.post(`${API_URL}/select-worker`, {
      job_id: parseInt(jobId),
      worker_id: parseInt(workerId)
    });
    
    if (response.data.success) {
      bot.sendMessage(chatId, 
        '✅ <b>Исполнитель выбран!</b>\n\n' +
        'Вы можете связаться с ним через приложение',
        { parse_mode: 'HTML' }
      );
    }
  } catch (error) {
    console.error('Error selecting worker:', error.message);
    bot.sendMessage(chatId, '❌ Не удалось выбрать исполнителя');
  }
});

// Handle callback queries
bot.on('callback_query', (callbackQuery) => {
  const msg = callbackQuery.message;
  const data = callbackQuery.data;
  
  if (data.startsWith('choose_')) {
    const parts = data.split('_');
    const jobId = parts[1];
    const workerId = parts[2];
    
    bot.answerCallbackQuery(callbackQuery.id, {
      text: '✅ Исполнитель выбран!'
    });
  }
});

console.log('Telegram bot started...');
