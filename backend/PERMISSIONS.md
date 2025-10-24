# Hype - Бизнес-логика и правила

## 👤 Типы пользователей

### 1. Гость (Guest User)

**Характеристики:**

-   ✅ Только `username` (без email/password)
-   ✅ `isGuest = true`
-   ✅ Может входить в голосовые каналы
-   ✅ Может писать сообщения в текстовые каналы
-   ❌ **НЕ может** создавать серверы
-   ❌ **НЕ может** создавать каналы

**Создание гостя:**

```typescript
POST /auth/guest
{
  "username": "GuestNick"
}
```

**Prisma:**

```typescript
{
  username: "GuestNick",
  displayName: "GuestNick",
  isGuest: true,
  email: null,
  passwordHash: null
}
```

---

### 2. Авторизованный пользователь (Authenticated User)

**Характеристики:**

-   ✅ `username` + `email` + `password` (или OAuth)
-   ✅ `isGuest = false`
-   ✅ Может создавать серверы (становится владельцем)
-   ✅ Может вступать в существующие серверы как участник
-   ✅ Может входить в голосовые каналы
-   ✅ Может писать сообщения

**Методы авторизации:**

1. Email/Password (`POST /auth/register` или `/auth/login`)
2. OAuth (GitHub, Google, Discord)

---

## 🏰 Серверы (Servers)

### Создание сервера

**Правило:** Только авторизованные пользователи (`isGuest = false`)

```typescript
// Backend проверка
if (user.isGuest) {
    throw new Error('Guest users cannot create servers');
}

const server = await prisma.server.create({
    data: {
        name: 'My Server',
        ownerId: user.id, // Пользователь становится владельцем
    },
});
```

### Роли на сервере

-   **Owner** (ownerId) - создатель сервера
    -   Полные права
    -   Может создавать/удалять каналы
    -   Может управлять участниками
-   **Member** (ServerMember) - участник сервера
    -   Может пользоваться каналами
    -   Не может создавать каналы
    -   Не может удалять сервер

---

## 📢 Каналы (Channels)

### Создание канала

**Правило:** Только владелец сервера (`server.ownerId === user.id`)

```typescript
// Backend проверка
const server = await prisma.server.findUnique({
    where: { id: serverId },
});

if (server.ownerId !== user.id) {
    throw new Error('Only server owner can create channels');
}

const channel = await prisma.channel.create({
    data: {
        name: 'general',
        type: 'TEXT',
        serverId: server.id,
        createdById: user.id, // Сохраняем кто создал
    },
});
```

### Типы каналов

1. **TEXT** - текстовые сообщения
2. **VOICE** - голосовые чаты (WebRTC)
3. **ANNOUNCEMENT** - только для объявлений (опционально)

### Использование каналов

**Правило:** Любой участник сервера может:

-   ✅ Читать/писать в текстовых каналах
-   ✅ Входить в голосовые каналы
-   ✅ Отправлять файлы (attachments)

Гости также могут использовать каналы, но не могут создавать серверы.

---

## 🎙️ Голосовые каналы

### Вход в голосовой канал

**Правило:** Любой пользователь (даже гость) может войти

```typescript
// Гость может войти
const voiceState = await prisma.voiceState.create({
    data: {
        userId: guestUser.id, // isGuest = true
        channelId: voiceChannel.id,
        serverId: voiceChannel.serverId,
        muted: false,
        deafened: false,
    },
});
```

### Voice State

-   `muted` - микрофон выключен
-   `deafened` - звук выключен (автоматически muted)
-   `streaming` - трансляция экрана
-   `video` - камера включена

---

## 🔒 Матрица прав доступа

| Действие                       | Гость | Участник | Владелец сервера |
| ------------------------------ | ----- | -------- | ---------------- |
| Создать сервер                 | ❌    | ✅       | ✅               |
| Вступить в сервер (по инвайту) | ✅    | ✅       | -                |
| Создать канал                  | ❌    | ❌       | ✅               |
| Удалить канал                  | ❌    | ❌       | ✅               |
| Войти в голосовой канал        | ✅    | ✅       | ✅               |
| Писать сообщения               | ✅    | ✅       | ✅               |
| Загружать файлы                | ✅    | ✅       | ✅               |
| Управлять участниками          | ❌    | ❌       | ✅               |

---

## 🛡️ Backend Middleware для проверки прав

### 1. Проверка типа пользователя

```typescript
// middleware/permissions.ts
export function requireAuthenticatedUser(req: AuthRequest, res: Response, next: NextFunction) {
    if (!req.user) {
        return res.status(401).json({ error: 'Not authenticated' });
    }

    if (req.user.isGuest) {
        return res.status(403).json({ error: 'Guest users cannot perform this action' });
    }

    next();
}
```

### 2. Проверка владельца сервера

```typescript
export async function requireServerOwner(req: AuthRequest, res: Response, next: NextFunction) {
    const { serverId } = req.params;

    const server = await prisma.server.findUnique({
        where: { id: serverId },
    });

    if (!server || server.ownerId !== req.user!.id) {
        return res.status(403).json({ error: 'Only server owner can perform this action' });
    }

    next();
}
```

### 3. Использование middleware

```typescript
// routes/servers.ts
router.post(
    '/servers',
    authenticateJWT, // Проверка JWT
    requireAuthenticatedUser, // Проверка что не гость
    createServer // Handler
);

router.post(
    '/servers/:serverId/channels',
    authenticateJWT,
    requireServerOwner, // Проверка владельца
    createChannel
);

router.get(
    '/servers/:serverId/channels',
    authenticateJWT, // Любой авторизованный (даже гость)
    listChannels
);
```

---

## 📋 Prisma Queries примеры

### Создать сервер

```typescript
const server = await prisma.server.create({
    data: {
        name: 'My Server',
        ownerId: user.id,
        members: {
            create: {
                userId: user.id, // Владелец автоматически становится участником
                joinedAt: new Date(),
            },
        },
    },
    include: {
        owner: true,
        members: true,
    },
});
```

### Создать канал

```typescript
// Проверяем что user - владелец сервера
const channel = await prisma.channel.create({
    data: {
        name: 'general',
        type: 'TEXT',
        serverId: serverId,
        createdById: user.id, // Сохраняем создателя
        position: 0,
    },
});
```

### Вступить в сервер (по инвайту)

```typescript
const member = await prisma.serverMember.create({
    data: {
        userId: user.id, // Может быть гость!
        serverId: serverId,
        joinedAt: new Date(),
    },
});
```

### Войти в голосовой канал

```typescript
const voiceState = await prisma.voiceState.upsert({
    where: {
        userId_channelId: {
            userId: user.id,
            channelId: channelId,
        },
    },
    update: {
        muted: false,
        deafened: false,
        updatedAt: new Date(),
    },
    create: {
        userId: user.id,
        channelId: channelId,
        serverId: channel.serverId,
    },
});
```

### Получить все серверы пользователя

```typescript
const servers = await prisma.server.findMany({
    where: {
        OR: [
            { ownerId: user.id }, // Владелец
            { members: { some: { userId: user.id } } }, // Участник
        ],
    },
    include: {
        owner: true,
        channels: {
            orderBy: { position: 'asc' },
        },
        members: {
            include: { user: true },
        },
    },
});
```

---

## 🎯 Frontend логика

### Показывать кнопку "Создать сервер" только для авторизованных

```typescript
// HomePage.tsx
const { authStore } = useStores();

{
    !authStore.currentUser?.isGuest && <Button onClick={handleCreateServer}>Создать сервер</Button>;
}
```

### Показывать кнопку "Создать канал" только для владельца

```typescript
// ServerPage.tsx
const isOwner = server.ownerId === authStore.currentUser?.id;

{
    isOwner && <Button onClick={handleCreateChannel}>Создать канал</Button>;
}
```

### Гости видят UI но не могут создавать

```typescript
// GuestBanner.tsx
{
    authStore.currentUser?.isGuest && (
        <Banner variant='info'>Вы вошли как гость. Зарегистрируйтесь, чтобы создавать серверы.</Banner>
    );
}
```

---

## 🚀 API Endpoints с правами

```typescript
// ✅ Доступно всем (даже гостям)
GET  /api/servers/:id              - Получить информацию о сервере
GET  /api/servers/:id/channels     - Список каналов
GET  /api/channels/:id/messages    - Сообщения канала
POST /api/channels/:id/messages    - Отправить сообщение

// 🔐 Только авторизованные (не гости)
POST /api/servers                  - Создать сервер

// 👑 Только владелец сервера
POST /api/servers/:id/channels     - Создать канал
PUT  /api/servers/:id/channels/:channelId  - Изменить канал
DEL  /api/servers/:id/channels/:channelId  - Удалить канал
PUT  /api/servers/:id              - Изменить сервер
DEL  /api/servers/:id              - Удалить сервер
POST /api/servers/:id/invites      - Создать инвайт
```

---

## 📊 Итоговая схема Prisma

**Основные изменения:**

1. ✅ Добавлено `isGuest: Boolean` в User
2. ✅ Добавлено `createdById` в Channel (для отслеживания создателя)
3. ✅ Убрана сложная self-relation для friends (упрощение)
4. ✅ `email` и `passwordHash` опциональны (для гостей)

**Индексы для производительности:**

-   `@@index([isGuest])` - быстрая фильтрация гостей
-   `@@index([createdById])` - быстрый поиск каналов по создателю
-   `@@index([serverId])` - быстрый поиск каналов сервера
