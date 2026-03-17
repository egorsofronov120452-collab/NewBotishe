/**
 * PM2 конфигурация для VK бота
 *
 * Установка PM2:
 * npm install -g pm2
 *
 * Запуск:
 * pm2 start ecosystem.config.cjs
 *
 * Другие команды:
 * pm2 logs vk-bot          - логи в реальном времени
 * pm2 logs vk-bot --lines 200 - последние 200 строк
 * pm2 restart vk-bot       - перезапуск
 * pm2 stop vk-bot          - остановка
 * pm2 delete vk-bot        - удаление
 * pm2 save                 - сохранить список процессов
 * pm2 startup              - автозапуск при перезагрузке сервера
 * pm2 describe vk-bot      - подробная информация о процессе
 */

module.exports = {
  apps: [
    {
      name: 'vk-bot',
      script: './scripts/long-polling.cjs',

      // Явно указываем интерпретатор
      interpreter: 'node',

      // Автоматический рестарт при сбоях
      autorestart: true,

      // Максимум 10 рестартов за 1 минуту
      max_restarts: 10,
      min_uptime: '10s',

      // Не смотреть изменения файлов
      watch: false,

      // Логи — объединить stdout+stderr в один файл тоже
      error_file: './logs/vk-bot-error.log',
      out_file: './logs/vk-bot-out.log',
      merge_logs: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',

      // Не обрезать логи при рестарте
      log_type: 'raw',

      // Окружение
      env: {
        NODE_ENV: 'production',
        // Явно передаём путь к .env для dotenv
        DOTENV_CONFIG_PATH: '.env',
      },

      // Таймаут для graceful shutdown
      kill_timeout: 5000,

      // Подождать перед рестартом после краша
      restart_delay: 2000,
    },
  ],
};

