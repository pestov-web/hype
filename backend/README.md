# Backend Structure

**Назначение**: Express.js backend с REST API, WebSocket сервером и mediasoup SFU для WebRTC.

## Структура

```
backend/src/
├── config/              # Конфигурация (mediasoup workers)
├── data/                # In-memory хранилище (temporary)
├── generated/           # Prisma Client (автогенерация)
├── middleware/          # Express middleware (auth, error handling)
├── routes/              # REST API endpoints
├── services/            # Бизнес-логика (SFU, database)
├── types/               # TypeScript типы
├── websocket/           # WebSocket сервер
└── index.ts             # Точка входа
```

---

## Entry Point (`index.ts`)

**Назначение**: Запуск HTTP сервера, WebSocket сервера и mediasoup workers

**Порты**:

-   **3001** - Express REST API
-   **8080** - WebSocket server

**Lifecycle**:

```typescript
1. Инициализация mediasoup workers (sfuService.initialize())
2. Настройка Express middleware (CORS, JSON parser)
3. Подключение routes (/api/*)
4. Запуск HTTP сервера (port 3001)
5. Запуск WebSocket сервера (port 8080)
6. Graceful shutdown on SIGTERM/SIGINT
```

**Graceful Shutdown**:

```typescript
process.on('SIGTERM', async () => {
    await wsManager.shutdown();
    await sfuService.shutdown();
    server.close();
    process.exit(0);
});
```

---

## Routes (`routes/`)

**Назначение**: REST API endpoints для клиентов

### Структура

```
routes/
├── index.ts          # Route setup
├── channels.ts       # Channel CRUD
├── users.ts          # User management
├── messages.ts       # Message CRUD
├── auth.ts           # Registration/login
└── voice.ts          # WebRTC SFU signaling
```

### API Endpoints

#### Health Check

```
GET /health          # Health check
GET /api             # API info
```

#### Channels (`/api/channels`)

```
GET    /api/channels              # List all channels
GET    /api/channels/:id          # Get specific channel
POST   /api/channels              # Create channel
PUT    /api/channels/:id          # Update channel
DELETE /api/channels/:id          # Delete channel
```

**Request/Response**:

```typescript
// GET /api/channels
Response: Channel[]

// POST /api/channels
Request: { name: string, type: 'text' | 'voice' }
Response: Channel
```

#### Users (`/api/users`)

**Назначение**: Управление пользователями, получение списка, профилей и обновление статуса.

---

##### GET /api/users

**Описание**: Получить список всех пользователей из базы данных.

**Аутентификация**: Не требуется (публичный endpoint).

**Параметры**: Нет.

**Ответ**:

```typescript
{
  success: true,
  data: [
    {
      id: string,
      username: string,
      email: string | null,
      displayName: string | null,
      discriminator: string,  // First 4 chars of username
      status: 'online' | 'idle' | 'dnd' | 'offline',
      customStatus: string | null,
      avatarUrl: string | null,
      avatar: string | null,  // Same as avatarUrl
      createdAt: Date,
      updatedAt: Date
    },
    ...
  ]
}
```

**Коды ответа**:

-   `200 OK` - Успешно
-   `500 Internal Server Error` - Ошибка сервера

**Пример запроса**:

```bash
curl http://localhost:3001/api/users
```

---

##### GET /api/users/:id

**Описание**: Получить информацию о конкретном пользователе по ID.

**Аутентификация**: Не требуется.

**Параметры**:

-   `id` (path) - ID пользователя (CUID)

**Ответ**:

```typescript
{
  success: true,
  data: {
    id: string,
    username: string,
    email: string | null,
    displayName: string | null,
    discriminator: string,
    status: 'online' | 'idle' | 'dnd' | 'offline',
    customStatus: string | null,
    avatarUrl: string | null,
    avatar: string | null,
    createdAt: Date,
    updatedAt: Date
  }
}
```

**Коды ответа**:

-   `200 OK` - Пользователь найден
-   `404 Not Found` - Пользователь не найден
-   `500 Internal Server Error` - Ошибка сервера

**Пример запроса**:

```bash
curl http://localhost:3001/api/users/clxxx123456789
```

**Ответ при ошибке (404)**:

```json
{
    "success": false,
    "error": "User not found"
}
```

---

##### PUT /api/users/:id/status

**Описание**: Обновить статус пользователя (online/idle/dnd/offline).

**Аутентификация**: Не требуется (⚠️ TODO: добавить auth check).

**Параметры**:

-   `id` (path) - ID пользователя
-   `status` (body) - Новый статус: `'online'` | `'idle'` | `'dnd'` | `'offline'`

**Тело запроса**:

```json
{
    "status": "online"
}
```

**Валидация**:

-   `status` должен быть одним из: `'online'`, `'idle'`, `'dnd'`, `'offline'`

**Ответ**:

```typescript
{
  success: true,
  data: {
    id: string,
    username: string,
    email: string | null,
    displayName: string | null,
    discriminator: string,
    status: 'online' | 'idle' | 'dnd' | 'offline',
    customStatus: string | null,
    avatarUrl: string | null,
    avatar: string | null,
    createdAt: Date,
    updatedAt: Date
  }
}
```

**Коды ответа**:

-   `200 OK` - Статус обновлён
-   `400 Bad Request` - Невалидный статус
-   `500 Internal Server Error` - Ошибка обновления

**Пример запроса**:

```bash
curl -X PUT http://localhost:3001/api/users/clxxx123/status \
  -H "Content-Type: application/json" \
  -d '{"status": "idle"}'
```

**Ответ при ошибке (400)**:

```json
{
    "success": false,
    "error": "Invalid status"
}
```

---

##### PUT /api/users/:id

**Описание**: Обновить профиль пользователя (username, displayName, bio, avatarUrl).

**Аутентификация**: **Требуется** (JWT Bearer token). Пользователь может обновлять только свой профиль.

**Headers**:

```
Authorization: Bearer <access_token>
```

**Параметры**:

-   `id` (path) - ID пользователя (должен совпадать с ID из токена)

**Тело запроса** (все поля опциональны):

```json
{
    "username": "new_username",
    "displayName": "My Display Name",
    "bio": "My bio text",
    "avatarUrl": "https://example.com/avatar.png"
}
```

**Валидация (zod)**:

-   `username`: 3-32 символа, только латиница, цифры, дефис, подчёркивание (`/^[a-zA-Z0-9_-]+$/`)
-   `displayName`: 1-32 символа
-   `bio`: до 500 символов
-   `avatarUrl`: валидный URL или null

**Ответ**:

```typescript
{
  success: true,
  data: {
    id: string,
    username: string,
    email: string | null,
    displayName: string | null,
    discriminator: string,
    status: 'online' | 'idle' | 'dnd' | 'offline',
    customStatus: string | null,
    avatarUrl: string | null,
    avatar: string | null,
    bio: string | null,
    createdAt: Date,
    updatedAt: Date
  }
}
```

**Коды ответа**:

-   `200 OK` - Профиль обновлён
-   `400 Bad Request` - Валидация не прошла
-   `401 Unauthorized` - Токен отсутствует или невалиден
-   `403 Forbidden` - Попытка обновить чужой профиль
-   `409 Conflict` - Username уже занят
-   `500 Internal Server Error` - Ошибка обновления

**Пример запроса**:

```bash
curl -X PUT http://localhost:3001/api/users/clxxx123 \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{
    "username": "john_updated",
    "bio": "Full-stack developer",
    "avatarUrl": "https://i.imgur.com/abc123.png"
  }'
```

**Ответ при ошибке (403)**:

```json
{
    "success": false,
    "error": "Forbidden: You can only update your own profile"
}
```

**Ответ при ошибке (409)**:

```json
{
    "success": false,
    "error": "Username already taken"
}
```

**Ответ при ошибке валидации (400)**:

```json
{
    "success": false,
    "error": "Validation failed",
    "details": [
        {
            "code": "too_small",
            "minimum": 3,
            "path": ["username"],
            "message": "String must contain at least 3 character(s)"
        }
    ]
}
```

---

#### Servers (`/api/servers`)

**Назначение**: Управление серверами (Discord guilds). Сервер содержит каналы и участников.

**База данных**: PostgreSQL через Prisma ORM (модели `Server`, `Channel`, `ServerMember`).

**Seed данные**: Дефолтный сервер "Hype Community" создается через `pnpm db:seed`.

---

##### GET /api/servers

**Описание**: Получить список всех серверов.

**Аутентификация**: Опционально (в будущем будет фильтрация по участникам).

**Ответ**:

```typescript
{
  success: true,
  data: [
    {
      id: string,
      name: string,
      description: string | null,
      iconUrl: string | null,
      bannerUrl: string | null,
      ownerId: string,
      owner: {
        id: string,
        username: string,
        avatarUrl: string | null
      },
      _count: {
        members: number,
        channels: number
      },
      createdAt: Date,
      updatedAt: Date
    }
  ]
}
```

**Пример**:

```bash
curl http://localhost:3001/api/servers
```

**Ответ**:

```json
{
    "success": true,
    "data": [
        {
            "id": "default-server",
            "name": "Hype Community",
            "description": "Welcome to Hype! This is the default server for all users.",
            "iconUrl": null,
            "bannerUrl": null,
            "ownerId": "cmh3rq1bb0000v9uw475aho5z",
            "owner": {
                "id": "cmh3rq1bb0000v9uw475aho5z",
                "username": "system",
                "avatarUrl": null
            },
            "_count": {
                "members": 0,
                "channels": 4
            },
            "createdAt": "2025-10-23T10:30:00.000Z",
            "updatedAt": "2025-10-23T10:30:00.000Z"
        }
    ]
}
```

---

##### GET /api/servers/:serverId

**Описание**: Получить конкретный сервер по ID.

**Параметры**:

-   `serverId` (path) - ID сервера

**Ответ**:

```typescript
{
  success: true,
  data: {
    id: string,
    name: string,
    description: string | null,
    owner: {
      id: string,
      username: string,
      avatarUrl: string | null
    },
    _count: {
      members: number,
      channels: number
    },
    createdAt: Date,
    updatedAt: Date
  }
}
```

**Коды ответа**:

-   `200 OK` - Сервер найден
-   `404 Not Found` - Сервер не найден

**Пример**:

```bash
curl http://localhost:3001/api/servers/default-server
```

---

##### GET /api/servers/:serverId/channels

**Описание**: Получить список каналов сервера.

**Параметры**:

-   `serverId` (path) - ID сервера

**Ответ**:

```typescript
{
  success: true,
  data: [
    {
      id: string,
      name: string,
      type: 'TEXT' | 'VOICE' | 'ANNOUNCEMENT',
      topic: string | null,
      position: number,
      serverId: string,
      userLimit: number | null,  // только для VOICE
      bitrate: number | null,     // только для VOICE (kbps)
      server: {
        id: string,
        name: string
      },
      createdBy: {
        id: string,
        username: string
      },
      _count: {
        messages: number,      // только для TEXT
        voiceStates: number    // только для VOICE
      },
      createdAt: Date,
      updatedAt: Date
    }
  ]
}
```

**Коды ответа**:

-   `200 OK` - Список каналов
-   `404 Not Found` - Сервер не найден

**Пример**:

```bash
curl http://localhost:3001/api/servers/default-server/channels
```

**Ответ**:

```json
{
    "success": true,
    "data": [
        {
            "id": "text-general",
            "name": "general",
            "type": "TEXT",
            "topic": "General discussion",
            "position": 0,
            "serverId": "default-server",
            "userLimit": null,
            "bitrate": null,
            "_count": {
                "messages": 0,
                "voiceStates": 0
            }
        },
        {
            "id": "voice-general",
            "name": "General Voice",
            "type": "VOICE",
            "position": 2,
            "userLimit": null,
            "bitrate": 64,
            "_count": {
                "messages": 0,
                "voiceStates": 0
            }
        }
    ]
}
```

---

#### Messages (`/api/messages`)

**Назначение**: Управление сообщениями в текстовых каналах.

**База данных**: PostgreSQL через Prisma ORM (модели `Message`, `MessageReaction`, `Attachment`).

**Аутентификация**: Требуется для POST/PUT/DELETE (JWT Bearer token).

---

##### GET /api/messages?channelId=:id

**Описание**: Получить список сообщений для текстового канала с пагинацией.

**Аутентификация**: Опционально (в будущем будет проверка прав доступа к каналу).

**Query параметры**:

-   `channelId` (required) - ID текстового канала
-   `limit` (optional) - Количество сообщений (по умолчанию 50)
-   `offset` (optional) - Смещение для пагинации (по умолчанию 0)

**Ответ**:

```typescript
{
  success: true,
  data: [
    {
      id: string,
      content: string,
      edited: boolean,
      authorId: string,
      channelId: string,
      author: {
        id: string,
        username: string,
        displayName: string | null,
        avatarUrl: string | null,
        status: 'ONLINE' | 'IDLE' | 'DND' | 'OFFLINE'
      },
      reactions: [
        {
          id: string,
          emoji: string,
          user: {
            id: string,
            username: string
          }
        }
      ],
      attachments: [
        {
          id: string,
          filename: string,
          url: string,
          size: number,
          mimeType: string
        }
      ],
      createdAt: Date,
      updatedAt: Date
    }
  ],
  meta: {
    total: number,
    limit: number,
    offset: number
  }
}
```

**Коды ответа**:

-   `200 OK` - Список сообщений
-   `400 Bad Request` - channelId отсутствует или канал не текстовый
-   `404 Not Found` - Канал не найден

**Пример**:

```bash
curl "http://localhost:3001/api/messages?channelId=text-general&limit=20&offset=0"
```

---

##### GET /api/messages/:id

**Описание**: Получить конкретное сообщение по ID.

**Параметры**:

-   `id` (path) - ID сообщения

**Ответ**:

```typescript
{
  success: true,
  data: {
    id: string,
    content: string,
    edited: boolean,
    author: { ... },
    reactions: [ ... ],
    attachments: [ ... ],
    createdAt: Date,
    updatedAt: Date
  }
}
```

**Коды ответа**:

-   `200 OK` - Сообщение найдено
-   `404 Not Found` - Сообщение не найдено

**Пример**:

```bash
curl http://localhost:3001/api/messages/clxxx123
```

---

##### POST /api/messages

**Описание**: Отправить новое сообщение в текстовый канал.

**Аутентификация**: **Требуется** (JWT Bearer token).

**Headers**:

```
Authorization: Bearer <access_token>
```

**Тело запроса**:

```json
{
    "content": "Hello, world!",
    "channelId": "text-general"
}
```

**Валидация**:

-   `content`: 1-2000 символов, non-empty string
-   `channelId`: существующий текстовый канал

**Ответ**:

```typescript
{
  success: true,
  data: {
    id: string,
    content: string,
    edited: false,
    authorId: string,
    channelId: string,
    author: { ... },
    reactions: [],
    attachments: [],
    createdAt: Date,
    updatedAt: Date
  }
}
```

**Коды ответа**:

-   `201 Created` - Сообщение создано
-   `400 Bad Request` - Валидация не прошла или канал не текстовый
-   `401 Unauthorized` - Токен отсутствует или невалиден
-   `404 Not Found` - Канал не найден

**Пример**:

```bash
curl -X POST http://localhost:3001/api/messages \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{
    "content": "Hello from API!",
    "channelId": "text-general"
  }'
```

**Ответ при ошибке (400)**:

```json
{
    "success": false,
    "error": "content must not exceed 2000 characters"
}
```

---

##### PUT /api/messages/:id

**Описание**: Редактировать существующее сообщение (только автор).

**Аутентификация**: **Требуется** (JWT Bearer token).

**Headers**:

```
Authorization: Bearer <access_token>
```

**Параметры**:

-   `id` (path) - ID сообщения

**Тело запроса**:

```json
{
    "content": "Updated message content"
}
```

**Валидация**:

-   `content`: 1-2000 символов, non-empty string

**Ответ**:

```typescript
{
  success: true,
  data: {
    id: string,
    content: string,
    edited: true,  // автоматически устанавливается в true
    author: { ... },
    reactions: [ ... ],
    attachments: [ ... ],
    createdAt: Date,
    updatedAt: Date
  }
}
```

**Коды ответа**:

-   `200 OK` - Сообщение обновлено
-   `400 Bad Request` - Валидация не прошла
-   `401 Unauthorized` - Токен отсутствует или невалиден
-   `403 Forbidden` - Попытка редактировать чужое сообщение
-   `404 Not Found` - Сообщение не найдено

**Пример**:

```bash
curl -X PUT http://localhost:3001/api/messages/clxxx123 \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{"content": "Edited message"}'
```

**Ответ при ошибке (403)**:

```json
{
    "success": false,
    "error": "Forbidden: You can only edit your own messages"
}
```

---

##### DELETE /api/messages/:id

**Описание**: Удалить сообщение (только автор).

**Аутентификация**: **Требуется** (JWT Bearer token).

**Headers**:

```
Authorization: Bearer <access_token>
```

**Параметры**:

-   `id` (path) - ID сообщения

**Ответ**:

```typescript
{
  success: true,
  data: {
    id: string
  }
}
```

**Коды ответа**:

-   `200 OK` - Сообщение удалено
-   `401 Unauthorized` - Токен отсутствует или невалиден
-   `403 Forbidden` - Попытка удалить чужое сообщение
-   `404 Not Found` - Сообщение не найдено

**Пример**:

```bash
curl -X DELETE http://localhost:3001/api/messages/clxxx123 \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

**Ответ при ошибке (403)**:

```json
{
    "success": false,
    "error": "Forbidden: You can only delete your own messages"
}
```

---

#### Auth (`/auth`)

**Назначение**: Аутентификация пользователей, регистрация, логин, обновление токенов.

**⚠️ Важно**: Auth роуты используют префикс `/auth` (без `/api`).

---

##### POST /auth/register

**Описание**: Регистрация нового пользователя с email и паролем.

**Аутентификация**: Не требуется.

**Тело запроса**:

```json
{
    "username": "myusername",
    "email": "user@example.com",
    "password": "securepassword123"
}
```

**Валидация (zod)**:

-   `username`: 3-32 символа, только латиница, цифры, дефис, подчёркивание (`/^[a-zA-Z0-9_-]+$/`)
-   `email`: валидный email
-   `password`: 8-128 символов

**Ответ**:

```typescript
{
  success: true,
  data: {
    user: {
      id: string,
      username: string,
      displayName: string | null,
      email: string | null,
      avatarUrl: string | null,
      status: string,
      createdAt: Date
    },
    accessToken: string,   // JWT, expires in 15m
    refreshToken: string   // JWT, expires in 7d
  }
}
```

**Коды ответа**:

-   `201 Created` - Регистрация успешна
-   `400 Bad Request` - Валидация не прошла или username/email уже заняты
-   `500 Internal Server Error` - Ошибка сервера

**Пример запроса**:

```bash
curl -X POST http://localhost:3001/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "john_doe",
    "email": "john@example.com",
    "password": "mypassword123"
  }'
```

**Ответ при ошибке (400)**:

```json
{
    "success": false,
    "error": "Username already taken"
}
```

**Ответ при ошибке валидации (400)**:

```json
{
    "success": false,
    "error": "Validation failed",
    "details": [
        {
            "code": "too_small",
            "minimum": 3,
            "path": ["username"],
            "message": "String must contain at least 3 character(s)"
        }
    ]
}
```

---

##### POST /auth/login

**Описание**: Вход по email и паролю.

**Аутентификация**: Не требуется.

**Тело запроса**:

```json
{
    "email": "user@example.com",
    "password": "securepassword123"
}
```

**Валидация (zod)**:

-   `email`: валидный email
-   `password`: не пустой

**Ответ**:

```typescript
{
  success: true,
  data: {
    user: {
      id: string,
      username: string,
      displayName: string | null,
      email: string | null,
      avatarUrl: string | null,
      status: string,
      createdAt: Date
    },
    accessToken: string,
    refreshToken: string
  }
}
```

**Поведение**:

-   При успешном логине обновляет в БД: `status='ONLINE'`, `isOnline=true`, `lastSeenAt=now()`

**Коды ответа**:

-   `200 OK` - Логин успешен
-   `400 Bad Request` - Валидация не прошла
-   `401 Unauthorized` - Неверный email или пароль
-   `500 Internal Server Error` - Ошибка сервера

**Пример запроса**:

```bash
curl -X POST http://localhost:3001/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "password": "mypassword123"
  }'
```

**Ответ при ошибке (401)**:

```json
{
    "success": false,
    "error": "Invalid email or password"
}
```

---

##### POST /auth/guest

**Описание**: Гостевой вход (создание временного пользователя без пароля и email).

**Аутентификация**: Не требуется.

**Тело запроса**:

```json
{
    "username": "guest_user"
}
```

**Валидация (zod)**:

-   `username`: 3-32 символа, только латиница, цифры, дефис, подчёркивание

**Ответ**:

```typescript
{
  success: true,
  data: {
    user: {
      id: string,
      username: string,
      displayName: string | null,
      email: null,  // Всегда null для гостей
      avatarUrl: string | null,
      status: string,
      createdAt: Date
    },
    accessToken: string,
    refreshToken: string
  }
}
```

**Поведение**:

-   Создаёт пользователя с `isGuest=true`, без пароля и email
-   Статус устанавливается `ONLINE`, `isOnline=true`

**Коды ответа**:

-   `200 OK` - Гостевой вход успешен
-   `400 Bad Request` - Username уже занят или валидация не прошла
-   `500 Internal Server Error` - Ошибка сервера

**Пример запроса**:

```bash
curl -X POST http://localhost:3001/auth/guest \
  -H "Content-Type: application/json" \
  -d '{"username": "my_guest_123"}'
```

**Ответ при ошибке (400)**:

```json
{
    "success": false,
    "error": "Username already taken"
}
```

---

##### POST /auth/refresh

**Описание**: Обновление access token по refresh token.

**Аутентификация**: Не требуется (использует refresh token из body).

**Тело запроса**:

```json
{
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Ответ**:

```typescript
{
  success: true,
  data: {
    accessToken: string,   // Новый access token (15m)
    refreshToken: string   // Новый refresh token (7d)
  }
}
```

**Поведение**:

-   Проверяет валидность refresh token (JWT signature + expiry)
-   Проверяет существование пользователя в БД
-   Генерирует новую пару токенов

**Коды ответа**:

-   `200 OK` - Токены обновлены
-   `400 Bad Request` - Валидация не прошла
-   `401 Unauthorized` - Невалидный или просроченный refresh token
-   `500 Internal Server Error` - Ошибка сервера

**Пример запроса**:

```bash
curl -X POST http://localhost:3001/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{"refreshToken": "eyJhbGciOiJIUzI1NiIsInR..."}'
```

**Ответ при ошибке (401)**:

```json
{
    "success": false,
    "error": "Refresh token expired"
}
```

или

```json
{
    "success": false,
    "error": "Invalid refresh token"
}
```

---

##### GET /auth/me

**Описание**: Получить информацию о текущем аутентифицированном пользователе.

**Аутентификация**: **Требуется** (JWT Bearer token).

**Headers**:

```
Authorization: Bearer <access_token>
```

**Параметры**: Нет.

**Ответ**:

```typescript
{
  success: true,
  data: {
    user: {
      id: string,
      username: string,
      displayName: string | null,
      email: string | null,
      avatarUrl: string | null,
      status: string,
      createdAt: string,  // ISO 8601
    }
  }
}
```

**Коды ответа**:

-   `200 OK` - Успешно
-   `401 Unauthorized` - Токен отсутствует, невалиден или пользователь не найден
-   `404 Not Found` - Пользователь не найден в БД
-   `500 Internal Server Error` - Ошибка сервера

**Пример запроса**:

```bash
curl http://localhost:3001/auth/me \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

**Ответ при ошибке (401)**:

```json
{
    "success": false,
    "error": "Not authenticated"
}
```

---

##### POST /auth/logout

**Описание**: Выход из системы (в будущем — инвалидация токенов).

**Аутентификация**: **Требуется** (JWT Bearer token).

**Headers**:

```
Authorization: Bearer <access_token>
```

**Тело запроса**: Пусто.

**Ответ**:

```typescript
{
  success: true,
  message: "Logged out successfully"
}
```

**Поведение**:

-   ⚠️ **TODO**: В продакшене нужно добавить blacklist токенов (Redis) для инвалидации refresh token.
-   Сейчас просто возвращает success, токены остаются валидными до истечения срока действия.

**Коды ответа**:

-   `200 OK` - Logout успешен
-   `401 Unauthorized` - Токен невалиден
-   `500 Internal Server Error` - Ошибка сервера

**Пример запроса**:

```bash
curl -X POST http://localhost:3001/auth/logout \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

---

#### JWT Authentication Flow

**Access Token**:

-   Срок действия: **15 минут**
-   Использование: В заголовке `Authorization: Bearer <token>` для защищённых endpoints
-   Payload: `{ userId, username, email }`

**Refresh Token**:

-   Срок действия: **7 дней**
-   Использование: Только для `/auth/refresh` endpoint
-   Payload: `{ userId, username, email }`

**Secrets** (из environment variables):

-   `JWT_ACCESS_SECRET` - секрет для access tokens
-   `JWT_REFRESH_SECRET` - секрет для refresh tokens

**Типичный flow**:

1. Регистрация/логин → получить `accessToken` и `refreshToken`
2. Использовать `accessToken` для защищённых запросов
3. При ошибке 401 → вызвать `/auth/refresh` с `refreshToken` → получить новые токены
4. Если refresh token просрочен → редирект на логин

**Middleware `authenticateJWT`**:

-   Проверяет наличие заголовка `Authorization: Bearer <token>`
-   Валидирует JWT signature и expiry
-   Декодирует payload и заполняет `req.user`
-   При ошибке возвращает 401

---

#### Voice (`/api/voice`)

```
GET    /api/voice/rtp-capabilities    # Get RTP capabilities for mediasoup
POST   /api/voice/transport/send      # Create send transport
POST   /api/voice/transport/recv      # Create receive transport
POST   /api/voice/transport/connect   # Connect transport (DTLS params)
POST   /api/voice/produce             # Produce audio/video/screen
POST   /api/voice/consume             # Consume remote participant
DELETE /api/voice/produce/:id         # Close producer
```

**WebRTC Flow**:

```
1. Client: GET /rtp-capabilities → RtpCapabilities
2. Client: POST /transport/send → { id, iceParameters, dtlsParameters }
3. Client: POST /transport/connect (send DTLS params)
4. Client: POST /produce (audio track) → producerId
5. Client: POST /transport/recv → recv transport
6. Client: POST /transport/connect (recv DTLS params)
7. Client: POST /consume (for each remote participant) → consumerId
```

---

## Services (`services/`)

**Назначение**: Бизнес-логика, изолированная от HTTP/WebSocket слоя

### sfuService.ts (mediasoup SFU)

**Ответственность**: Управление mediasoup workers, routers, transports, producers, consumers

**Ключевые методы**:

```typescript
// Initialization
initialize(): Promise<void>              // Create mediasoup workers
shutdown(): Promise<void>                // Graceful shutdown

// Router management
getOrCreateRouter(channelId): Router     // One router per voice channel

// Transport management
createWebRtcTransport(channelId, type: 'send'|'recv'): Transport
connectTransport(channelId, userId, transportId, dtlsParameters): Promise<void>

// Producer management
createProducer(channelId, userId, transportId, rtpParameters, kind): Producer
closeProducer(channelId, userId, producerId): void

// Consumer management
createConsumer(channelId, userId, producerId, rtpCapabilities): Consumer
```

**Data Structures**:

```typescript
// In-memory state per channel
channelRouters: Map<channelId, Router>;
channelParticipants: Map<channelId, Map<userId, Participant>>;

interface Participant {
    userId: string;
    sendTransport?: Transport;
    recvTransport?: Transport;
    audioProducer?: Producer;
    videoProducer?: Producer;
    screenProducer?: Producer;
    consumers: Map<consumerId, Consumer>;
}
```

**Producer Lifecycle**:

```typescript
// On producer created
producer.on('transportclose', () => { ... });
producer.on('@close', () => {
  // Notify all participants via WebSocket
  wsManager.broadcastToChannel(channelId, {
    type: 'producer_closed',
    data: { userId, producerId, kind }
  });
});
```

### authService.ts (JWT Authentication)

**Ответственность**: Регистрация, вход, управление JWT токенами

**Методы**:

```typescript
register(email, username, password): Promise<AuthUser>
login(email, password): Promise<AuthUser>
loginAsGuest(username): Promise<AuthUser>
refreshTokens(refreshToken): Promise<{ accessToken, refreshToken }>
verifyAccessToken(token): Promise<User>
logout(userId): Promise<void>
```

**JWT Config**:

```typescript
ACCESS_TOKEN_SECRET: process.env.JWT_ACCESS_SECRET;
REFRESH_TOKEN_SECRET: process.env.JWT_REFRESH_SECRET;
ACCESS_TOKEN_EXPIRY: '15m';
REFRESH_TOKEN_EXPIRY: '7d';
```

**Password Hashing**:

```typescript
import bcrypt from 'bcryptjs';

const hashedPassword = await bcrypt.hash(password, 10);
const isMatch = await bcrypt.compare(password, user.password);
```

### Database Services (Prisma)

**channelService.ts**:

```typescript
getChannels(): Promise<Channel[]>
getChannel(id): Promise<Channel>
createChannel(data): Promise<Channel>
updateChannel(id, data): Promise<Channel>
deleteChannel(id): Promise<void>
```

**userService.ts**:

```typescript
getUsers(): Promise<User[]>
getUser(id): Promise<User>
createUser(data): Promise<User>
updateUserStatus(id, status): Promise<User>
```

**messageService.ts**:

```typescript
getMessages(channelId): Promise<Message[]>
createMessage(data): Promise<Message>
updateMessage(id, content): Promise<Message>
deleteMessage(id): Promise<void>
```

---

## WebSocket (`websocket/`)

**Назначение**: Real-time двусторонняя коммуникация с клиентами

### WebSocketManager (`websocket/websocket.ts`)

**Ответственность**: Управление WebSocket подключениями, комнаты, broadcasting

**Ключевые методы**:

```typescript
// Connection management
handleConnection(ws: WebSocket): void
handleDisconnect(userId: string): void

// Room management
joinChannel(userId, channelId): void
leaveChannel(userId, channelId): void

// Broadcasting
broadcast(message: WebSocketMessage): void
broadcastToChannel(channelId, message): void
sendToUser(userId, message): void
```

**WebSocket Events**:

```typescript
// Client → Server
{
  type: 'user_joined' | 'message' | 'voice_state' | 'typing',
  data: any,
  timestamp: Date
}

// Server → Client
{
  type: 'message' | 'user_joined' | 'user_left' | 'voice_state' |
        'speaking_state' | 'new_producer' | 'producer_closed',
  data: any,
  timestamp: Date
}
```

**Voice Events**:

```typescript
// voice_state - user joined/left voice channel
{
  type: 'voice_state',
  data: {
    userId: string,
    channelId: string,
    isMuted: boolean,
    isDeafened: boolean
  }
}

// new_producer - new media stream available
{
  type: 'new_producer',
  data: {
    userId: string,
    producerId: string,
    kind: 'audio' | 'video' | 'screen'
  }
}

// producer_closed - stream stopped
{
  type: 'producer_closed',
  data: {
    userId: string,
    producerId: string,
    kind: 'audio' | 'video' | 'screen'
  }
}

// speaking_state - user started/stopped speaking
{
  type: 'speaking_state',
  data: {
    userId: string,
    isSpeaking: boolean
  }
}
```

**Connection State**:

```typescript
// In-memory tracking
userConnections: Map<userId, WebSocket>;
channelMembers: Map<channelId, Set<userId>>;
```

---

## Middleware (`middleware/`)

### authMiddleware.ts

**Назначение**: Проверка JWT токенов для защищенных роутов

```typescript
export const authMiddleware = async (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
        const user = await authService.verifyAccessToken(token);
        req.user = user;
        next();
    } catch (error) {
        return res.status(401).json({ error: 'Invalid token' });
    }
};
```

**Использование**:

```typescript
router.get('/api/channels', authMiddleware, channelsController.getAll);
```

### errorHandler.ts

**Назначение**: Централизованная обработка ошибок

```typescript
export const errorHandler = (err, req, res, next) => {
    console.error(err.stack);

    if (err instanceof ValidationError) {
        return res.status(400).json({ error: err.message });
    }

    res.status(500).json({ error: 'Internal server error' });
};
```

---

## Data (`data/`)

**⚠️ TEMPORARY**: In-memory хранилище для быстрого прототипирования

**Файлы**:

```
data/
├── channels.ts      # Channel[]
├── users.ts         # User[]
└── messages.ts      # Message[]
```

**Пример**:

```typescript
// data/channels.ts
export const channels: Channel[] = [
    {
        id: '1',
        name: 'general',
        type: ChannelType.TEXT,
        createdAt: new Date(),
        updatedAt: new Date(),
    },
    // ...
];
```

**Миграция на PostgreSQL**:

-   ✅ Prisma схема готова (`prisma/schema.prisma`)
-   ✅ Миграции созданы
-   🔄 Сервисы используют Prisma Client
-   📋 Планируется полный переход с in-memory на PostgreSQL

---

## Config (`config/`)

### mediasoup.ts

**Назначение**: Конфигурация mediasoup workers и codecs

```typescript
export const mediasoupConfig = {
    numWorkers: os.cpus().length,
    worker: {
        rtcMinPort: 10000,
        rtcMaxPort: 10100,
        logLevel: 'warn',
        logTags: ['info', 'ice', 'dtls', 'rtp', 'srtp', 'rtcp'],
    },
    router: {
        mediaCodecs: [
            {
                kind: 'audio',
                mimeType: 'audio/opus',
                clockRate: 48000,
                channels: 2,
            },
            {
                kind: 'video',
                mimeType: 'video/VP8',
                clockRate: 90000,
            },
        ],
    },
    webRtcTransport: {
        listenIps: [{ ip: '0.0.0.0', announcedIp: null }],
        enableUdp: true,
        enableTcp: true,
        preferUdp: true,
    },
};
```

---

## Types (`types/`)

**Назначение**: Общие TypeScript типы для backend

```typescript
// types/index.ts
export interface WebSocketMessage {
    type: string;
    data: any;
    timestamp: Date;
}

export interface VoiceState {
    userId: string;
    channelId: string;
    isMuted: boolean;
    isDeafened: boolean;
    isSpeaking: boolean;
    isScreenSharing: boolean;
}

export interface AuthRequest extends Request {
    user?: User;
}
```

---

## Environment Variables

**Required**:

```env
# Database (PostgreSQL)
DATABASE_URL="postgresql://user:password@localhost:5432/hype"

# JWT Secrets
JWT_ACCESS_SECRET="your-secret-key-for-access-tokens"
JWT_REFRESH_SECRET="your-secret-key-for-refresh-tokens"

# Server
PORT=3001
WS_PORT=8080

# mediasoup (optional, defaults provided)
MEDIASOUP_MIN_PORT=10000
MEDIASOUP_MAX_PORT=10100
ANNOUNCED_IP=null  # null for local development, set to public IP for production
```

---

## Development

### Start Server

```bash
cd backend
pnpm dev           # tsx watch src/index.ts (hot reload)
```

### Build

```bash
pnpm build         # tsc → dist/
```

### Production

```bash
pnpm start         # node dist/index.js
```

### Database

```bash
# Prisma migrations
npx prisma migrate dev --name init
npx prisma generate

# Prisma Studio (GUI)
npx prisma studio
```

---

## Architecture Patterns

### Layered Architecture

```
Routes (HTTP) → Controllers → Services → Database/External APIs
                    ↓
WebSocket Manager → Services → Database
```

### Separation of Concerns

-   **Routes**: HTTP request/response handling
-   **WebSocket**: Real-time event handling
-   **Services**: Business logic (reusable from HTTP and WS)
-   **Data**: Persistence layer (Prisma ORM)

### Error Handling

```typescript
try {
    const result = await service.doSomething();
    res.json(result);
} catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Internal server error' });
}
```

---

## Scaling Strategy (Future)

### Phase 1: Vertical Scaling

-   Increase mediasoup workers (= CPU cores)
-   Optimize worker assignment per channel

### Phase 2: Horizontal Scaling (Multiple SFU instances)

-   **Redis** for WebSocket pub/sub coordination
-   **Load balancer** for HTTP API (round-robin)
-   **Sticky sessions** for WebSocket (user → same server)
-   **Worker coordination** (distribute channels across servers)

### Phase 3: Cascade SFU (Large channels 100+ users)

-   Master SFU receives all streams
-   Slave SFUs relay to subsets of users
-   Reduces bandwidth per SFU instance

**См. `docs/SCALABILITY_ARCHITECTURE.md` для подробностей**

---

## Security

### Authentication

-   ✅ JWT tokens (access + refresh)
-   ✅ bcrypt password hashing (10 rounds)
-   ✅ Protected routes with authMiddleware

### WebSocket Security (TODO)

-   📋 Token-based authentication for WS connections
-   📋 Rate limiting per user
-   📋 Message validation and sanitization

### CORS

```typescript
app.use(
    cors({
        origin: 'http://localhost:5173', // Frontend URL
        credentials: true,
    })
);
```

---

## Технологический стек

-   **Node.js 20+** - Runtime
-   **Express.js 4.21.2** - HTTP server
-   **ws 8.18.3** - WebSocket library
-   **mediasoup 3.x** - WebRTC SFU
-   **Prisma 6.x** - Database ORM
-   **PostgreSQL 16+** - Database
-   **TypeScript 5.x** - Type safety
-   **tsx 4.x** - Development hot reload
-   **bcryptjs** - Password hashing
-   **jsonwebtoken** - JWT tokens

---

## Performance Monitoring (TODO)

### Planned Metrics

-   WebRTC stats (bitrate, packet loss, jitter)
-   mediasoup worker load (CPU, memory)
-   WebSocket connections count
-   API response times
-   Database query performance

### Tools

-   **Prometheus** - Metrics collection
-   **Grafana** - Dashboards
-   **Pino** - Structured logging

---

## См. также

-   [mediasoup Documentation](https://mediasoup.org/documentation/v3/)
-   [Express.js Guide](https://expressjs.com/en/guide/routing.html)
-   [Prisma Documentation](https://www.prisma.io/docs)
-   [ws Library](https://github.com/websockets/ws)
-   `docs/PHASE_1_SFU_SETUP.md` - SFU implementation guide
-   `docs/SCALABILITY_ARCHITECTURE.md` - Scaling roadmap
