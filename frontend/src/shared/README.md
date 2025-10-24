# Shared Layer (FSD)

**Назначение**: Переиспользуемый код, который не зависит от бизнес-логики приложения. Используется всеми вышележащими слоями.

## Структура

```
shared/
├── api/              # API клиенты (HTTP, WebSocket)
├── config/           # Конфигурационные константы
├── i18n/             # Интернационализация (ru/en переводы)
├── lib/              # Утилиты, хуки, сервисы
│   ├── hooks/        # React хуки (useStores, usePTT, useVAD)
│   ├── services/     # Бизнес-сервисы (rtcService, sfuService, authService)
│   └── utils/        # Утилиты (deviceSettings, localStorage helpers)
├── styles/           # SCSS переменные и миксины
└── ui/               # UI компоненты (Button, Avatar, IconButton)
```

## API (`api/`)

### HTTP Client (`api/http.ts`)

```typescript
// ApiClient с методами get/post/put/delete
const response = await apiClient.get<User>('/users/123');
const data = await apiClient.post<Channel>('/channels', { name: 'General' });
```

**Особенности**:

-   Timeout: 10 секунд
-   Автоматическая добавка JWT токена из localStorage
-   Обработка ошибок и автоматический refresh токенов (401)
-   Base URL: `http://localhost:3001/api`

### WebSocket Client (`api/websocket.ts`)

```typescript
// WebSocketClient с event emitter паттерном
wsClient.on('message', (data) => console.log(data));
wsClient.send('voice_state', { channelId, userId });
```

**Типы событий**:

-   `message` - текстовые сообщения
-   `voice_state` - изменение состояния голоса
-   `speaking_state` - состояние говорения (VAD/PTT)
-   `new_producer` - новый SFU producer
-   `producer_closed` - закрытие SFU producer
-   `user_joined`, `user_left` - присоединение/отключение

## Config (`config/`)

Глобальные константы приложения:

-   API endpoints
-   WebSocket URL
-   Конфигурация VAD
-   SFU настройки

## i18n (`i18n/`)

### Поддерживаемые языки

-   🇷🇺 Русский (ru)
-   🇬🇧 Английский (en)

### Использование

```typescript
import { useTranslation } from '@shared/lib';

const Component = () => {
    const { t, i18n } = useTranslation();

    return (
        <div>
            <h1>{t('home.welcome')}</h1>
            <button onClick={() => i18n.changeLanguage('ru')}>{t('settings.russian')}</button>
        </div>
    );
};
```

### Ключи переводов

-   `common.*` - Общие (loading, error, save, cancel)
-   `auth.*` - Аутентификация
-   `channels.*` - Каналы
-   `messages.*` - Сообщения
-   `voice.*` - Голосовая связь
-   `settings.*` - Настройки
-   `users.*` - Пользователи

**Библиотека**: i18next 25.6.0 + react-i18next 16.1.4

## Lib (`lib/`)

### Hooks (`lib/hooks/`)

#### `useStores()`

Доступ к MobX stores через React context

```typescript
const { authStore, voiceStore, channelsStore } = useStores();
```

#### `usePTT(enabled: boolean)`

Push-to-Talk - слушает нажатия клавиш

```typescript
usePTT(voiceMode === 'ptt'); // Активен только в PTT режиме
```

-   Слушает keydown/keyup на document
-   Вызывает `rtcService.activatePTT()` / `deactivatePTT()`
-   Играет звуковые сигналы (beep)

#### `useVAD({ enabled, sensitivity, callbacks })`

Voice Activity Detection - автоопределение речи

```typescript
useVAD({
    enabled: voiceMode === 'vad',
    sensitivity: 'high', // 'low' | 'medium' | 'high'
    onSpeechStart: () => rtcService.setVADSpeaking(true),
    onSpeechEnd: () => rtcService.setVADSpeaking(false),
});
```

-   Использует @ricky0123/vad-react (Silero VAD v5)
-   ONNX Runtime WebAssembly
-   Debounced callbacks (200ms задержка на onSpeechEnd)

### Services (`lib/services/`)

#### `rtcService.ts` - WebRTC SFU Manager

**Основные методы**:

```typescript
// Подключение к голосовому каналу
await rtcService.joinVoiceChannel(channelId, userId, otherUserIds);

// Отключение
await rtcService.leaveVoiceChannel();

// Screen sharing
await rtcService.startScreenShare();
rtcService.stopScreenShare();

// PTT управление
rtcService.activatePTT();
rtcService.deactivatePTT();

// VAD управление
rtcService.setVADSpeaking(true);
```

**Архитектура**: Pure SFU (mediasoup) - все медиа через сервер, нет P2P

#### `sfuService.ts` - mediasoup-client Wrapper

**Основные методы**:

```typescript
// Инициализация
await sfuService.initDevice(channelId);

// Создание транспортов
await sfuService.createSendTransport(userId);
await sfuService.createRecvTransport(userId);

// Продюсирование медиа
const producerId = await sfuService.produceAudio(audioTrack);
const producerId = await sfuService.produceVideo(videoTrack);
const producerId = await sfuService.produceScreen(screenTrack);

// Консюм медиа
const track = await sfuService.consume(producerId, userId);

// Закрытие producer
sfuService.closeProducer(producerId);
```

**Библиотека**: mediasoup-client 3.x

#### `authService.ts` - Аутентификация

```typescript
// Регистрация
await authService.register(email, username, password);

// Логин
const tokens = await authService.login(email, password);

// Гостевой вход
const { user, tokens } = await authService.loginAsGuest(username);

// Обновление токенов
const newTokens = await authService.refreshTokens(refreshToken);

// Логаут
await authService.logout();
```

**JWT токены**: access (15min) + refresh (7days) в localStorage

#### `channelService.ts`, `userService.ts`, `messageService.ts`

CRUD операции для каналов, пользователей, сообщений

### Utils (`lib/utils/`)

#### `deviceSettings.ts`

Работа с localStorage для настроек устройств

```typescript
// Voice mode
getVoiceMode(): 'vad' | 'ptt'
setVoiceMode(mode: 'vad' | 'ptt')

// PTT key
getPTTKey(): string
setPTTKey(key: string)

// VAD sensitivity
getVADSensitivity(): 'low' | 'medium' | 'high'
setVADSensitivity(sensitivity)

// Audio input device
getAudioInputDevice(): string | null
setAudioInputDevice(deviceId: string)
```

## Styles (`styles/`)

### `_variables.scss`

**SCSS переменные** (автоматически импортируются в каждый .scss файл)

**Цвета**:

```scss
// Primary
$primary: #5865f2;
$primary-hover: #4752c4;

// Background
$bg-primary: #36393f;
$bg-secondary: #2f3136;
$bg-tertiary: #202225;

// Text
$text-primary: #ffffff;
$text-secondary: #b9bbbe;

// Status
$status-online: #3ba55d;
$status-idle: #faa81a;
$status-dnd: #ed4245;
$status-offline: #747f8d;
```

**Spacing**:

```scss
$spacing-xs: 4px;
$spacing-sm: 8px;
$spacing-md: 12px;
$spacing-lg: 16px;
```

**Border radius**:

```scss
$border-radius-sm: 4px;
$border-radius-md: 8px;
$border-radius-lg: 12px;
```

### `_mixins.scss`

SCSS миксины для часто используемых паттернов

## UI (`ui/`)

### Компоненты

#### `Button`

Radix Slot primitive с CVA variants

```typescript
<Button variant="primary">Click me</Button>
<Button variant="secondary" size="small">Small</Button>
<Button variant="danger">Delete</Button>
```

**Variants**: primary, secondary, danger, ghost, link
**Sizes**: small, medium, large

#### `Avatar`

Radix Avatar primitive с индикатором статуса

```typescript
<Avatar username='User' src='https://...' status='online' size='md' />
```

**Statuses**: online, offline, idle, dnd
**Sizes**: sm, md, lg

#### `IconButton`

Кнопка только с иконкой

```typescript
<IconButton icon='🔇' onClick={handleMute} title='Mute' />
```

#### `LanguageSwitcher`

Переключатель языков 🇷🇺 🇬🇧

```typescript
<LanguageSwitcher />
```

**Стилизация**: SCSS Modules + CVA (class-variance-authority) + clsx + tailwind-merge

## Правила использования

### ✅ Что можно в shared/

1. UI компоненты без бизнес-логики
2. Утилиты общего назначения
3. API клиенты
4. Типы и константы
5. Хуки не зависящие от бизнес-логики

### ❌ Что НЕ должно быть в shared/

1. Бизнес-логика приложения (→ features/)
2. Специфичные для страниц компоненты (→ widgets/)
3. Прямой импорт из entities/ (можно типы, не логику)
4. Зависимости от app/ или pages/

## Зависимости

**Импортирует**:

-   Только внешние библиотеки и другие shared/ модули

**Импортируется в**:

-   Все слои FSD (app, pages, widgets, features, entities)

## Технологический стек

-   **Radix UI** - Unstyled UI primitives (Avatar, Slot)
-   **CVA** - Class Variance Authority для variants
-   **i18next** - Интернационализация
-   **mediasoup-client** - WebRTC SFU клиент
-   **@ricky0123/vad-react** - Voice Activity Detection
-   **Axios** - HTTP клиент (под капотом ApiClient)

## Миграция с CSS на SCSS

✅ **Готово**: Button, Avatar
🔄 **В процессе**: IconButton, LanguageSwitcher

При создании новых компонентов **ВСЕГДА используйте SCSS модули**, не CSS!

## См. также

-   [Radix UI Documentation](https://radix-ui.com/)
-   [CVA Documentation](https://cva.style/)
-   [i18next Documentation](https://www.i18next.com/)
-   [mediasoup-client API](https://mediasoup.org/documentation/v3/mediasoup-client/api/)
