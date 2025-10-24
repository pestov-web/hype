# Backend Authentication Setup

## 📦 Установленные пакеты

### Основные

-   `@prisma/client` - Prisma ORM клиент
-   `prisma` - Prisma CLI (dev)
-   `bcrypt` - Хеширование паролей
-   `jsonwebtoken` - JWT токены
-   `arctic` - OAuth провайдеры (GitHub, Google, Discord)
-   `zod` - Валидация данных
-   `minio` - S3-совместимое хранилище файлов
-   `cookie-parser` - Парсинг cookies для OAuth

## 🗄️ База данных

### Запуск PostgreSQL + MinIO

```bash
# Запустить Docker Compose
docker compose up -d

# Проверить статус
docker compose ps
```

**Доступ:**

-   PostgreSQL: `localhost:5435` (user: user, password: password)
-   MinIO Console: `http://localhost:9001` (minioadmin / minioadmin)
-   MinIO API: `http://localhost:9000`

### Prisma миграции

```bash
cd backend

# Создать первую миграцию
pnpm prisma migrate dev --name init

# Применить миграции
pnpm prisma migrate deploy

# Открыть Prisma Studio (UI для просмотра данных)
pnpm prisma studio
```

## 🔐 Настройка OAuth провайдеров

### 1. GitHub OAuth

1. Перейдите на https://github.com/settings/developers
2. Нажмите **New OAuth App**
3. Заполните:
    - **Application name**: Hype (dev)
    - **Homepage URL**: `http://localhost:5173`
    - **Authorization callback URL**: `http://localhost:3001/auth/github/callback`
4. Скопируйте **Client ID** и **Client Secret**
5. Добавьте в `backend/.env`:
    ```
    GITHUB_CLIENT_ID="your_client_id_here"
    GITHUB_CLIENT_SECRET="your_client_secret_here"
    ```

### 2. Google OAuth (TODO)

1. Перейдите на https://console.cloud.google.com/apis/credentials
2. Создайте проект или выберите существующий
3. **Create Credentials** → **OAuth 2.0 Client ID**
4. Настройте OAuth consent screen
5. Заполните:
    - **Application type**: Web application
    - **Authorized redirect URIs**: `http://localhost:3001/auth/google/callback`
6. Скопируйте **Client ID** и **Client Secret**
7. Добавьте в `backend/.env`:
    ```
    GOOGLE_CLIENT_ID="your_client_id_here"
    GOOGLE_CLIENT_SECRET="your_client_secret_here"
    ```

**Примечание:** Google и Discord OAuth требуют PKCE flow, который будет реализован позже.

### 3. Discord OAuth (TODO)

1. Перейдите на https://discord.com/developers/applications
2. Нажмите **New Application**
3. В разделе **OAuth2**:
    - Добавьте redirect: `http://localhost:3001/auth/discord/callback`
    - Выберите scopes: `identify`, `email`
4. Скопируйте **Client ID** и **Client Secret**
5. Добавьте в `backend/.env`:
    ```
    DISCORD_CLIENT_ID="your_client_id_here"
    DISCORD_CLIENT_SECRET="your_client_secret_here"
    ```

## 🚀 API Endpoints

### Базовая авторизация

```typescript
// POST /auth/register - Регистрация
{
  "username": "testuser",
  "email": "test@example.com",
  "password": "password123"
}

// POST /auth/login - Вход
{
  "email": "test@example.com",
  "password": "password123"
}

// POST /auth/guest - Гостевой вход (без пароля)
{
  "username": "Guest123"
}

// POST /auth/refresh - Обновление токена
{
  "refreshToken": "your_refresh_token"
}

// GET /auth/me - Получить текущего пользователя (требует Bearer token)
// Headers: Authorization: Bearer <access_token>

// POST /auth/logout - Выход
// Headers: Authorization: Bearer <access_token>
```

### OAuth провайдеры

```
GET /auth/github          - Редирект на GitHub OAuth
GET /auth/github/callback - Callback от GitHub (автоматический)

GET /auth/google          - Редирект на Google OAuth (TODO)
GET /auth/google/callback - Callback от Google (TODO)

GET /auth/discord         - Редирект на Discord OAuth (TODO)
GET /auth/discord/callback - Callback от Discord (TODO)
```

После успешной OAuth авторизации пользователь будет перенаправлен на:

```
http://localhost:5173/auth/callback?access_token=...&refresh_token=...&is_new_user=true
```

Frontend должен обработать эти query параметры и сохранить токены.

## 🏗️ Структура backend

```
backend/
├── prisma/
│   └── schema.prisma          # Prisma схема (User, Server, Channel, Message, etc.)
├── src/
│   ├── config/
│   │   ├── database.ts        # Prisma client
│   │   ├── auth.ts            # JWT и OAuth конфигурация
│   │   └── minio.ts           # MinIO client
│   ├── middleware/
│   │   └── auth.ts            # JWT middleware (authenticateJWT)
│   ├── services/
│   │   └── authService.ts     # Логика авторизации
│   ├── routes/
│   │   ├── auth.ts            # /auth/* endpoints
│   │   ├── oauth.ts           # OAuth провайдеры
│   │   ├── users.ts           # /api/users/*
│   │   ├── channels.ts        # /api/channels/*
│   │   └── messages.ts        # /api/messages/*
│   └── index.ts               # Main server
└── .env                       # Environment variables
```

## 🔒 JWT Токены

**Access Token:**

-   Срок жизни: 15 минут
-   Используется для авторизации API запросов
-   Передается в header: `Authorization: Bearer <token>`

**Refresh Token:**

-   Срок жизни: 7 дней
-   Используется для получения нового access token
-   Хранится безопасно на клиенте (localStorage/secure cookie)

**Payload JWT:**

```typescript
{
  userId: string,
  username: string,
  email: string | null
}
```

## 📝 Следующие шаги

1. ✅ Создать Prisma схему
2. ✅ Настроить JWT авторизацию
3. ✅ Реализовать GitHub OAuth с Arctic
4. ✅ Добавить базовые auth endpoints (register, login, guest, refresh)
5. ⏳ Запустить миграции БД
6. ⏳ Интегрировать авторизацию с WebSocket
7. ⏳ Добавить PKCE flow для Google и Discord OAuth
8. ⏳ Реализовать загрузку файлов в MinIO
9. ⏳ Добавить защищенные endpoints для channels/messages
10. ⏳ Интегрировать авторизацию на frontend

## 🐰 RabbitMQ (опционально)

Оставлен закомментированным в `docker-compose.yml`.

**Когда понадобится:**

-   Отправка email уведомлений в фоне
-   Обработка изображений (сжатие аватаров)
-   Микросервисная архитектура
-   Event-driven паттерны между сервисами

**Для включения:**

```bash
# Раскомментируйте rabbitmq в docker-compose.yml
docker compose up -d rabbitmq

# RabbitMQ Management UI: http://localhost:15672 (guest/guest)
```

## 🛠️ Development

```bash
cd backend

# Запустить dev сервер
pnpm dev

# Проверить типы TypeScript
pnpm type-check

# Собрать production
pnpm build

# Запустить production
pnpm start
```

## 🔍 Полезные команды Prisma

```bash
# Создать миграцию
pnpm prisma migrate dev --name <migration_name>

# Применить миграции
pnpm prisma migrate deploy

# Сбросить БД (WARNING: удалит все данные!)
pnpm prisma migrate reset

# Открыть Prisma Studio
pnpm prisma studio

# Генерация Prisma Client
pnpm prisma generate

# Форматирование schema.prisma
pnpm prisma format
```

## 📚 Документация

-   [Prisma Docs](https://www.prisma.io/docs)
-   [Arctic (OAuth)](https://arctic.js.org/)
-   [jsonwebtoken](https://github.com/auth0/node-jsonwebtoken)
-   [MinIO Client](https://min.io/docs/minio/linux/developers/javascript/minio-javascript.html)
