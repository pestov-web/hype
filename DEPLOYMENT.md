# Hype Production Deployment Guide

## 🚀 Деплой на VPS (MSK-KVM-SSD-6)

**Сервер:** 5 CPU cores, 4 GB RAM, 80 GB SSD, 200 Mbit/s
**Регион:** Moscow (MSK)
**OS:** Ubuntu 22.04 LTS (рекомендуется)

---

## 📋 Предварительные требования

1. **Доменное имя** (опционально, но рекомендуется)

    - Купить домен (например, на reg.ru, Cloudflare)
    - Настроить A-записи на IP вашего VPS:
        ```
        A    @       123.45.67.89   (для hype.example.com)
        A    www     123.45.67.89   (для www.hype.example.com)
        ```

2. **SSH доступ к серверу**
    ```bash
    ssh root@YOUR_SERVER_IP
    ```

---

## 🛠️ Шаг 1: Настройка сервера

### 1.1 Обновление системы

```bash
apt update && apt upgrade -y
```

### 1.2 Установка Node.js 20.x

```bash
# Установка Node.js через NodeSource
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

# Проверка версии
node -v  # должно быть v20.x.x
npm -v   # должно быть v10.x.x
```

### 1.3 Установка pnpm

```bash
npm install -g pnpm
pnpm -v  # должно быть v9.x.x
```

### 1.4 Установка PM2 (Process Manager)

```bash
npm install -g pm2
pm2 startup  # Автозапуск при перезагрузке
```

### 1.5 Установка Nginx

```bash
apt install -y nginx
systemctl enable nginx
systemctl start nginx
```

### 1.6 Установка Certbot (для SSL)

```bash
apt install -y certbot python3-certbot-nginx
```

### 1.7 Установка Git

```bash
apt install -y git
```

---

## 📦 Шаг 2: Клонирование проекта

```bash
# Создать пользователя для приложения (безопаснее чем root)
adduser hype
usermod -aG sudo hype
su - hype

# Клонировать репозиторий
cd ~
git clone https://github.com/pestov-web/hype.git
cd hype

# Или загрузить через SCP с локальной машины
# scp -r C:\Users\mwk\develop\hype hype@YOUR_SERVER_IP:~/
```

---

## 🔧 Шаг 3: Настройка Backend

### 3.1 Установка зависимостей

```bash
cd ~/hype/backend
pnpm install
```

### 3.2 Создание .env файла

```bash
nano .env
```

**Содержимое `.env`:**

```env
# Server Configuration
NODE_ENV=production
PORT=3001
WS_PORT=8080

# PostgreSQL Database
DATABASE_URL="postgresql://hype_user:STRONG_PASSWORD@localhost:5432/hype_db"

# JWT Authentication
JWT_SECRET="your-super-secret-jwt-key-change-this-in-production"
JWT_REFRESH_SECRET="your-super-secret-refresh-key-change-this-too"

# SFU Configuration
SFU_ANNOUNCED_IP="YOUR_SERVER_PUBLIC_IP"  # Замените на публичный IP
RTC_MIN_PORT=40000
RTC_MAX_PORT=49999
SFU_LOG_LEVEL=warn

# CORS Origin (frontend URL)
CORS_ORIGIN="https://yourdomain.com"  # Или http://YOUR_SERVER_IP:5173 для теста
```

### 3.3 Сборка Backend

```bash
pnpm build
```

### 3.4 Скачивание mediasoup worker (если нужно)

```bash
# mediasoup worker должен быть включен в build
# Если нет, скачайте вручную:
cd backend
node scripts/download-mediasoup-worker.js
```

---

## 🎨 Шаг 4: Настройка Frontend

### 4.1 Установка зависимостей

```bash
cd ~/hype/frontend
pnpm install
```

### 4.2 Создание .env.production

```bash
nano .env.production
```

**Содержимое `.env.production`:**

```env
VITE_API_URL=https://yourdomain.com/api
VITE_WS_URL=wss://yourdomain.com/ws
```

**Для тестирования без домена:**

```env
VITE_API_URL=http://YOUR_SERVER_IP:3001/api
VITE_WS_URL=ws://YOUR_SERVER_IP:8080
```

### 4.3 Сборка Frontend

```bash
pnpm build
```

Статические файлы будут в `frontend/dist/`

---

## 🗄️ Шаг 5: Настройка PostgreSQL

### 5.1 Установка PostgreSQL

```bash
sudo apt install -y postgresql postgresql-contrib
sudo systemctl enable postgresql
sudo systemctl start postgresql
```

### 5.2 Создание базы данных

```bash
sudo -u postgres psql
```

**В PostgreSQL консоли:**

```sql
CREATE DATABASE hype_db;
CREATE USER hype_user WITH ENCRYPTED PASSWORD 'STRONG_PASSWORD';
GRANT ALL PRIVILEGES ON DATABASE hype_db TO hype_user;
\q
```

### 5.3 Миграция Prisma

```bash
cd ~/hype/backend
pnpm prisma migrate deploy
pnpm prisma generate
```

---

## 🔥 Шаг 6: Настройка Firewall

```bash
# Разрешить SSH, HTTP, HTTPS
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Backend API
sudo ufw allow 3001/tcp

# WebSocket
sudo ufw allow 8080/tcp

# mediasoup RTC ports (UDP и TCP)
sudo ufw allow 40000:49999/udp
sudo ufw allow 40000:49999/tcp

# Включить firewall
sudo ufw enable
sudo ufw status
```

---

## 🌐 Шаг 7: Настройка Nginx

### 7.1 Создать конфиг Nginx

```bash
sudo nano /etc/nginx/sites-available/hype
```

**Конфигурация без SSL (для первого запуска):**

```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;  # Замените на ваш домен

    # Frontend (статические файлы)
    location / {
        root /home/hype/hype/frontend/dist;
        try_files $uri $uri/ /index.html;

        # Кэширование статики
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }

    # Backend API
    location /api {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # WebSocket
    location /ws {
        proxy_pass http://localhost:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_read_timeout 86400;
    }
}
```

### 7.2 Активировать конфиг

```bash
sudo ln -s /etc/nginx/sites-available/hype /etc/nginx/sites-enabled/
sudo nginx -t  # Проверка синтаксиса
sudo systemctl reload nginx
```

---

## 🔒 Шаг 8: Получение SSL сертификата (Let's Encrypt)

```bash
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

Certbot автоматически обновит конфигурацию Nginx для HTTPS.

**Автообновление сертификата:**

```bash
sudo certbot renew --dry-run  # Тест
sudo systemctl enable certbot.timer  # Автообновление
```

---

## 🚀 Шаг 9: Запуск приложения через PM2

### 9.1 Создать ecosystem.config.js

```bash
cd ~/hype
nano ecosystem.config.js
```

**Содержимое `ecosystem.config.js`:**

```javascript
module.exports = {
    apps: [
        {
            name: 'hype-backend',
            cwd: './backend',
            script: 'dist/index.js',
            instances: 1,
            exec_mode: 'fork',
            env: {
                NODE_ENV: 'production',
                PORT: 3001,
                WS_PORT: 8080,
            },
            error_file: './logs/backend-error.log',
            out_file: './logs/backend-out.log',
            log_date_format: 'YYYY-MM-DD HH:mm:ss',
        },
    ],
};
```

### 9.2 Запустить PM2

```bash
cd ~/hype
mkdir -p backend/logs

pm2 start ecosystem.config.js
pm2 save  # Сохранить конфигурацию
pm2 startup  # Автозапуск при перезагрузке
```

### 9.3 Мониторинг PM2

```bash
pm2 status       # Статус процессов
pm2 logs         # Логи в реальном времени
pm2 monit        # Интерактивный мониторинг
pm2 restart all  # Перезапуск
pm2 stop all     # Остановка
```

---

## 📊 Шаг 10: Мониторинг и логи

### 10.1 Логи Nginx

```bash
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

### 10.2 Логи приложения

```bash
pm2 logs hype-backend
tail -f ~/hype/backend/logs/backend-out.log
tail -f ~/hype/backend/logs/backend-error.log
```

### 10.3 Мониторинг ресурсов

```bash
htop             # CPU, RAM
iftop -i eth0    # Network bandwidth
pm2 monit        # PM2 dashboard
```

---

## 🔄 Шаг 11: Обновление приложения

### 11.1 Скрипт для обновления

```bash
nano ~/update-hype.sh
```

**Содержимое `update-hype.sh`:**

```bash
#!/bin/bash
cd ~/hype

echo "🔄 Pulling latest changes..."
git pull

echo "📦 Installing backend dependencies..."
cd backend
pnpm install
pnpm build

echo "📦 Installing frontend dependencies..."
cd ../frontend
pnpm install
pnpm build

echo "🗄️ Running database migrations..."
cd ../backend
pnpm prisma migrate deploy

echo "🚀 Restarting application..."
pm2 restart hype-backend

echo "✅ Update completed!"
pm2 status
```

```bash
chmod +x ~/update-hype.sh
```

### 11.2 Запуск обновления

```bash
~/update-hype.sh
```

---

## 🧪 Шаг 12: Тестирование

1. **Проверить Backend API:**

    ```bash
    curl http://YOUR_SERVER_IP:3001/health
    # Должен вернуть: {"status":"ok","timestamp":"...","workers":4}
    ```

2. **Проверить Frontend:**

    ```
    Открыть в браузере: http://YOUR_SERVER_IP
    Или: https://yourdomain.com
    ```

3. **Проверить WebSocket:**

    ```javascript
    // В браузерной консоли
    const ws = new WebSocket('ws://YOUR_SERVER_IP:8080');
    ws.onopen = () => console.log('WebSocket connected!');
    ws.onerror = (e) => console.error('WebSocket error:', e);
    ```

4. **Проверить голосовые звонки:**
    - Зайти с 2-х браузеров
    - Подключиться к голосовому каналу
    - Проверить VAD/PTT режимы

---

## ⚠️ Важные заметки

1. **Безопасность:**

    - ❌ Не используйте `root` для запуска приложения
    - ✅ Создайте отдельного пользователя (`hype`)
    - ✅ Используйте сильные пароли для БД и JWT
    - ✅ Всегда используйте HTTPS в продакшене

2. **Производительность:**

    - 4 GB RAM достаточно для 50-100 пользователей
    - mediasoup использует 4 воркера (по числу ядер)
    - Если нужно больше - увеличьте количество ядер

3. **Резервное копирование:**

    ```bash
    # Бэкап базы данных (каждый день в 3:00)
    crontab -e
    # Добавить:
    0 3 * * * pg_dump hype_db > ~/backups/hype_db_$(date +\%Y\%m\%d).sql
    ```

4. **Мониторинг метрик:**
    - Установить Prometheus + Grafana (опционально)
    - Настроить алерты на высокую нагрузку
    - Мониторить mediasoup health endpoint

---

## 🎯 Следующие шаги

1. ✅ Базовый деплой работает
2. 🔄 Добавить CI/CD (GitHub Actions)
3. 📊 Настроить мониторинг (Grafana)
4. 🌍 Multi-region deployment (EU, US, Asia)
5. 📱 Создать PWA версию
6. 🖥️ Создать Electron desktop app

---

## 🆘 Troubleshooting

### Проблема: Backend не запускается

```bash
pm2 logs hype-backend  # Смотрим логи
# Возможные причины:
# - Неправильный DATABASE_URL
# - mediasoup worker не найден
# - Порт 3001 занят
```

### Проблема: WebSocket не подключается

```bash
sudo ufw status  # Проверить firewall
sudo netstat -tulpn | grep 8080  # Проверить что порт слушается
# Nginx WebSocket конфигурация должна включать:
# proxy_set_header Upgrade $http_upgrade;
# proxy_set_header Connection "upgrade";
```

### Проблема: mediasoup не работает

```bash
# Проверить UDP порты
sudo ufw allow 40000:49999/udp
# Проверить что SFU_ANNOUNCED_IP указывает на публичный IP
# Проверить логи mediasoup
pm2 logs hype-backend | grep mediasoup
```

---

## 📞 Поддержка

Если возникли проблемы:

1. Проверьте логи: `pm2 logs`
2. Проверьте Nginx: `sudo nginx -t`
3. Проверьте firewall: `sudo ufw status`
4. Проверьте health endpoint: `curl http://localhost:3001/health`

**Готово к деплою!** 🚀
