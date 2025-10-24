# Entities Layer (FSD)

**Назначение**: Бизнес-сущности приложения - типы данных, интерфейсы и модели предметной области.

## Структура

```
entities/
├── user/           # Пользователь
├── channel/        # Канал (текстовый/голосовой)
├── message/        # Сообщение
└── voice/          # Голосовая связь
```

## Философия Entities

**Entities** - это "существительные" вашего приложения. Они описывают **ЧТО** существует в системе, но НЕ **КАК** с ними работать.

-   ✅ Типы данных (interfaces, types)
-   ✅ Enums для статусов
-   ✅ Валидаторы (опционально)
-   ❌ Бизнес-логика (→ features/)
-   ❌ API вызовы (→ services/)
-   ❌ UI компоненты (→ shared/ui/)

---

## User Entity (`user/`)

**Файл**: `model/types.ts`

### Интерфейсы

```typescript
export enum UserStatus {
    ONLINE = 'online',
    OFFLINE = 'offline',
    IDLE = 'idle',
    DND = 'dnd',
}

export interface User {
    id: string;
    username: string;
    email?: string;
    avatar?: string;
    status: UserStatus;
    createdAt: Date;
    updatedAt: Date;
}

export interface UserPresence {
    userId: string;
    status: UserStatus;
    lastSeen: Date;
    customStatus?: string;
}

export interface AuthUser extends User {
    email: string; // Required for authenticated users
    accessToken: string;
    refreshToken: string;
}
```

### Использование

```typescript
import { User, UserStatus } from '@entities/user';

const currentUser: User = {
    id: '123',
    username: 'John',
    status: UserStatus.ONLINE,
    createdAt: new Date(),
    updatedAt: new Date(),
};

// Type-safe status check
if (currentUser.status === UserStatus.ONLINE) {
    console.log('User is online');
}
```

---

## Channel Entity (`channel/`)

**Файл**: `model/types.ts`

### Интерфейсы

```typescript
export enum ChannelType {
    TEXT = 'text',
    VOICE = 'voice',
}

export interface Channel {
    id: string;
    name: string;
    type: ChannelType;
    description?: string;
    createdAt: Date;
    updatedAt: Date;
}

export interface TextChannel extends Channel {
    type: ChannelType.TEXT;
    lastMessageId?: string;
    lastMessageAt?: Date;
}

export interface VoiceChannel extends Channel {
    type: ChannelType.VOICE;
    participantIds: string[]; // User IDs в канале
    bitrate: number; // Audio quality
    userLimit?: number; // Max participants (null = unlimited)
}
```

### Type Guards

```typescript
export function isTextChannel(channel: Channel): channel is TextChannel {
    return channel.type === ChannelType.TEXT;
}

export function isVoiceChannel(channel: Channel): channel is VoiceChannel {
    return channel.type === ChannelType.VOICE;
}
```

### Использование

```typescript
import { Channel, isVoiceChannel } from '@entities/channel';

const channel: Channel = fetchedChannel;

if (isVoiceChannel(channel)) {
    // TypeScript knows channel is VoiceChannel here
    console.log(`Participants: ${channel.participantIds.length}`);
    console.log(`Bitrate: ${channel.bitrate}`);
}
```

---

## Message Entity (`message/`)

**Файл**: `model/types.ts`

### Интерфейсы

```typescript
export enum MessageType {
    TEXT = 'text',
    SYSTEM = 'system',
    FILE = 'file',
}

export interface Message {
    id: string;
    channelId: string;
    authorId: string;
    content: string;
    type: MessageType;
    createdAt: Date;
    updatedAt: Date;
    editedAt?: Date;
}

export interface TextMessage extends Message {
    type: MessageType.TEXT;
    mentions?: string[]; // User IDs
    attachments?: Attachment[];
}

export interface SystemMessage extends Message {
    type: MessageType.SYSTEM;
    systemType: 'user_joined' | 'user_left' | 'channel_created';
    metadata?: Record<string, any>;
}

export interface Attachment {
    id: string;
    filename: string;
    url: string;
    size: number;
    mimeType: string;
}
```

### Использование

```typescript
import { Message, MessageType } from '@entities/message';

const message: Message = {
    id: '1',
    channelId: 'general',
    authorId: '123',
    content: 'Hello world!',
    type: MessageType.TEXT,
    createdAt: new Date(),
    updatedAt: new Date(),
};

// Type-safe message rendering
if (message.type === MessageType.SYSTEM) {
    // Render system message differently
}
```

---

## Voice Entity (`voice/`)

**Файл**: `model/types.ts`

### Интерфейсы

```typescript
export interface VoiceState {
    userId: string;
    channelId: string;
    isMuted: boolean;
    isDeafened: boolean;
    isSpeaking: boolean;
    isScreenSharing: boolean;
    joinedAt: Date;
}

export interface VoiceParticipant {
    userId: string;
    isMuted: boolean;
    isDeafened: boolean;
    isSpeaking: boolean;
    isScreenSharing: boolean;
    joinedAt: Date;
    stream?: MediaStream; // WebRTC stream (опционально)
}

export interface LocalVoiceState {
    isMuted: boolean;
    isDeafened: boolean;
    isScreenSharing: boolean;
}

export enum VoiceMode {
    VAD = 'vad', // Voice Activity Detection
    PTT = 'ptt', // Push-to-Talk
}

export type VADSensitivity = 'low' | 'medium' | 'high';
```

### WebRTC Types

```typescript
export interface RTCProducer {
    id: string;
    kind: 'audio' | 'video' | 'screen';
    producerId: string;
    track: MediaStreamTrack;
}

export interface RTCConsumer {
    id: string;
    kind: 'audio' | 'video' | 'screen';
    consumerId: string;
    producerId: string;
    userId: string;
    track: MediaStreamTrack;
}

export interface SFUTransport {
    id: string;
    type: 'send' | 'recv';
    transport: any; // mediasoup-client Transport
}
```

### Использование

```typescript
import { VoiceParticipant, VoiceMode } from '@entities/voice';

const participant: VoiceParticipant = {
    userId: '123',
    isMuted: false,
    isDeafened: false,
    isSpeaking: true,
    isScreenSharing: false,
    joinedAt: new Date(),
};

// Display speaking indicator
if (participant.isSpeaking && !participant.isMuted) {
    renderSpeakingAnimation();
}
```

---

## Общие паттерны

### Type Guards (для дискриминированных union types)

```typescript
// Определение типа во время выполнения
export function isTextMessage(msg: Message): msg is TextMessage {
    return msg.type === MessageType.TEXT;
}

export function isSystemMessage(msg: Message): msg is SystemMessage {
    return msg.type === MessageType.SYSTEM;
}

// Использование
if (isTextMessage(message)) {
    console.log(message.mentions); // TypeScript знает о поле mentions
}
```

### Enum vs Union Types

**Enum** (рекомендуется для статусов):

```typescript
export enum ChannelType {
    TEXT = 'text',
    VOICE = 'voice',
}
```

**Union Type** (для простых значений):

```typescript
export type VoiceMode = 'vad' | 'ptt';
export type VADSensitivity = 'low' | 'medium' | 'high';
```

### Extends для специализации

```typescript
// Базовый тип
export interface Channel {
    id: string;
    name: string;
    type: ChannelType;
}

// Специализированные типы
export interface VoiceChannel extends Channel {
    type: ChannelType.VOICE;
    participantIds: string[];
}
```

---

## Валидация (планируется)

### Zod Schema (будущая интеграция)

```typescript
import { z } from 'zod';

export const UserSchema = z.object({
    id: z.string().uuid(),
    username: z.string().min(3).max(32),
    email: z.string().email().optional(),
    status: z.nativeEnum(UserStatus),
    createdAt: z.date(),
    updatedAt: z.date(),
});

export type User = z.infer<typeof UserSchema>;
```

### Runtime валидация

```typescript
// Валидация данных с сервера
export function validateUser(data: unknown): User {
    return UserSchema.parse(data);
}
```

---

## Правила использования

### ✅ Что можно в entities/

1. TypeScript interfaces и types
2. Enums для статусов
3. Type guards для runtime проверок
4. Константы, связанные с сущностью
5. Валидационные схемы (Zod, Yup)

### ❌ Что НЕ должно быть в entities/

1. Бизнес-логика (→ features/ или stores/)
2. API вызовы (→ services/)
3. UI компоненты (→ shared/ui/ или widgets/)
4. React hooks (→ shared/lib/hooks/)
5. Утилиты общего назначения (→ shared/lib/utils/)

---

## Зависимости

**Импортирует из**:

-   Ничего (entities - самый низкоуровневый слой типов)

**Импортируется в**:

-   `@shared/lib/services` - для типизации API ответов
-   `@shared/lib/stores` - для типизации MobX stores
-   `@features` - для типизации бизнес-логики
-   `@widgets` - для типизации props
-   `@pages` - для типизации данных страниц
-   `@app` - для типизации глобального состояния

---

## Best Practices

### 1. Именование

```typescript
// ✅ DO: Singular nouns
User, Channel, Message;

// ❌ DON'T: Plural or verbs
Users, Channels, SendMessage;
```

### 2. Optional vs Required

```typescript
// ✅ DO: Явно указывайте optional поля
export interface User {
    id: string; // Required
    username: string; // Required
    avatar?: string; // Optional
}

// ❌ DON'T: Все поля required по умолчанию
export interface User {
    id: string;
    username: string;
    avatar: string; // Может быть undefined!
}
```

### 3. Date vs string

```typescript
// ✅ DO: Date objects для внутреннего использования
export interface Message {
    createdAt: Date;
}

// ⚠️ API response types (DTO)
export interface MessageDTO {
    createdAt: string; // ISO 8601 string from API
}

// Conversion helper
export function dtoToMessage(dto: MessageDTO): Message {
    return {
        ...dto,
        createdAt: new Date(dto.createdAt),
    };
}
```

### 4. Nullable vs Optional

```typescript
// Optional - может отсутствовать
export interface User {
    bio?: string; // undefined если не установлено
}

// Nullable - может быть null
export interface User {
    bio: string | null; // null если явно очищено
}
```

---

## TypeScript Utility Types

### Partial (все поля optional)

```typescript
type UserUpdate = Partial<User>;

const update: UserUpdate = {
    username: 'NewName', // Только поля для обновления
};
```

### Pick (выбрать поля)

```typescript
type UserPreview = Pick<User, 'id' | 'username' | 'avatar'>;
```

### Omit (исключить поля)

```typescript
type UserWithoutTokens = Omit<AuthUser, 'accessToken' | 'refreshToken'>;
```

### Required (все поля обязательны)

```typescript
type UserRequired = Required<User>;
// avatar больше не optional
```

---

## Migration Path

### 1. Текущее состояние

Все entities определены как TypeScript interfaces в `model/types.ts`

### 2. Планируется

-   **Zod schemas** для runtime валидации
-   **DTO types** для API responses
-   **Domain models** с методами (если понадобится OOP)

### 3. Будущее

```typescript
// entities/user/model/User.ts
export class User {
    constructor(public id: string, public username: string, public status: UserStatus) {}

    // Domain methods
    isOnline(): boolean {
        return this.status === UserStatus.ONLINE;
    }

    canSendMessage(): boolean {
        return this.isOnline() && !this.isBanned;
    }
}
```

---

## Технологический стек

-   **TypeScript 5.x** - Type system
-   **Zod** (планируется) - Runtime validation
-   **date-fns** (планируется) - Date utilities

---

## См. также

-   [Feature-Sliced Design - Entities](https://feature-sliced.design/docs/reference/layers#entities)
-   [TypeScript Handbook - Interfaces](https://www.typescriptlang.org/docs/handbook/interfaces.html)
-   [TypeScript Handbook - Enums](https://www.typescriptlang.org/docs/handbook/enums.html)
-   [Zod Documentation](https://zod.dev/)
