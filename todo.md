# Backend — users: summary, issues and next steps

Ниже кратко описано текущее поведение бэкенда в части работы с пользователями, найденные риски и конкретные рекомендации для исправлений.

## Краткое описание потоков

-   Регистрация: `POST /auth/register` → валидация (zod) → `authService.registerUser()` → Prisma `user.create()` (username, email, passwordHash, status=ONLINE, isOnline=true) → генерация JWT (access 15m / refresh 7d) → ответ с user + токенами.
-   Логин: `POST /auth/login` → `authService.loginUser()` → проверка пароля (bcrypt) → обновление статуса в БД (`status='ONLINE'`, `isOnline=true`, `lastSeenAt=now()`) → генерация токенов.
-   Гость: `POST /auth/guest` → `authService.loginAsGuest()` → создаёт `User` с `isGuest=true`, без пароля/email, помечает онлайн.
-   Refresh token: `POST /auth/refresh` → `authService.refreshTokens()` декодирует refresh-token, проверяет пользователя в БД, генерирует новую пару токенов.
-   /auth/me: защищённый endpoint, использует `authenticateJWT` middleware и возвращает профиль пользователя из Prisma.
-   Users API: `GET /api/users`, `GET /api/users/:id`, `PUT /api/users/:id/status` — читают/обновляют запись пользователя через Prisma.
-   WebSocket presence:
    -   `WebSocketManager` создаёт `ConnectedClient` при подключении; identity привязывается при `user_joined` или автоматически из `voice_state`.
    -   `voice_state` обновляет in-memory `voiceStates` и `voiceParticipants` и рассылает `voice_state` `user_joined`/`user_left`.
    -   На disconnect вызывается `sfuService.cleanup(channelId, userId)`, удаляется участник и рассылается `user_left`.

## Как данные хранятся

-   Основная модель — `User` в Prisma: `username` (unique), `email` (unique, nullable — для гостей), `passwordHash` (nullable), `isGuest`, `githubId/googleId/discordId`, `status` (enum ONLINE/IDLE/DND/OFFLINE), `isOnline`, `lastSeenAt`.
-   WebSocket presence (активность/участники голосовых каналов) хранится в памяти в `WebSocketManager` (`clients`, `channels`, `voiceStates`, `voiceParticipants`).

## Замеченные риски и проблемы (high→low)

1. WebSocket аутентификация: сейчас клиент может заявить любую identity через `user_joined` или `voice_state`. Можно подделать userId.
2. Logout / token revocation: `POST /auth/logout` пока не инвалидирует refresh-токены — риск сохранения доступа до истечения токена.
3. Unique race on registration: `registerUser` делает предварительную проверку, но параллельные запросы могут вызвать `Prisma P2002` — надо ловить и корректно обрабатывать.
4. Несинхронизированная presence: `isOnline` в БД и in-memory WS состояние могут расходиться после рестарта сервера.
5. Ошибки и логирование: сервисы бросают generic `Error` — желательно иметь кастомные ошибки и централизованный мэппинг HTTP кодов.
6. Масштабирование WebSocket: текущая in-memory карта не масштабируется между инстансами; для горизонтального масштабирования нужен Redis pub/sub / централизованный presence.

## Конкретные рекомендации (быстрые выигрыши)

A) (high) Добавить аутентификацию WS: требовать accessToken при `connection` (в query или в первом `auth` сообщении), валидировать JWT и связывать client → userId. Блокировать попытки заявить чужой userId.

B) (medium) Реализовать revocation/rotation refresh-tokens: хранить refresh-token (или его хеш) в Redis/DB и при logout помечать revoked. Использовать rotation при refresh.

C) (medium) Обработать `Prisma.PrismaClientKnownRequestError` (код `P2002`) в `registerUser` и возвращать 409 Conflict с пояснением.

D) (medium) При WS connect/disconnect обновлять `user.isOnline` и `lastSeenAt` в базе (или хранить presence в Redis с TTL), чтобы не было «залипания» статуса после рестартов.

E) (low) Централизовать error handling: кастомные ошибки (ValidationError, AuthError, DbConflictError) + middleware для consistent JSON-ответов и логов.

F) (low) Для масштабирования: вынести channels/clients presence в Redis pub/sub и координировать broadcasts между инстансами.

## Предложенные быстрые правки (что я могу сделать сразу)

1. Добавить проверку JWT на WebSocket подключении и присвоение `client.user` — небольшая правка `backend/src/websocket/websocket.ts`.
2. Поймать `P2002` в `authService.registerUser` и вернуть 409.
3. На disconnect вызывать `prisma.user.update({ where: { id }, data: { isOnline: false, lastSeenAt: new Date() } })` (в `handleDisconnect`) чтобы держать DB в sync.

Если хотите — укажите, какую правку выполнить первой (1 / 2 / 3), и я внесу изменения, запущу базовую проверку и верну патч/PR.

---

_Создано автоматически — краткая заметка по текущему состоянию backend._
