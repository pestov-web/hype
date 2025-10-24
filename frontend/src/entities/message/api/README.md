# Message API

API клиент для работы с сообщениями в Hype. Комбинирует REST API для CRUD операций и WebSocket для real-time обновлений.

## Архитектура

### 🔄 REST API (HTTP)

Используется для:

-   ✅ Получение истории сообщений (GET)
-   ✅ Отправка нового сообщения (POST)
-   ✅ Редактирование своего сообщения (PUT)
-   ✅ Удаление своего сообщения (DELETE)

### ⚡ WebSocket (Real-time)

Используется для:

-   ✅ Мгновенное получение новых сообщений от других пользователей
-   ✅ Уведомления об изменении сообщений
-   ✅ Уведомления об удалении сообщений
-   ✅ Typing indicators (индикаторы набора текста)

## Установка

```typescript
import { messageApi } from '@entities/message';
```

---

## REST API Methods

### `getMessages(channelId, limit?, offset?)`

Получить историю сообщений канала с пагинацией.

**Аутентификация**: Не требуется

```typescript
const response = await messageApi.getMessages('text-general', 50, 0);

if (response.success) {
    const { data, meta } = response.data;
    console.log(`Loaded ${data.length} messages out of ${meta.total}`);

    data.forEach((msg) => {
        console.log(`${msg.author.username}: ${msg.content}`);
    });
}
```

**Параметры:**

-   `channelId` - ID текстового канала
-   `limit` - Количество сообщений (по умолчанию 50)
-   `offset` - Смещение для пагинации (по умолчанию 0)

---

### `sendMessage(payload)`

Отправить новое сообщение.

**Аутентификация**: ✅ **Требуется JWT токен**

**⚠️ Важно**: После успешной отправки сообщение будет автоматически доставлено всем участникам канала через WebSocket. Не нужно вручную добавлять его в UI!

```typescript
const response = await messageApi.sendMessage({
    content: 'Hello, world!',
    channelId: 'text-general',
});

if (response.success) {
    console.log('Message sent:', response.data.id);
    // Сообщение автоматически придёт через WebSocket событие 'message'
} else {
    if (response.error?.includes('2000 characters')) {
        console.error('Message too long!');
    } else {
        console.error('Error:', response.error);
    }
}
```

**Валидация:**

-   `content`: 1-2000 символов, non-empty string
-   `channelId`: существующий текстовый канал

**Коды ошибок:**

-   `400` - Валидация не прошла (контент пустой или слишком длинный)
-   `401` - Не авторизован
-   `404` - Канал не найден

---

### `editMessage(id, payload)`

Редактировать своё сообщение.

**Аутентификация**: ✅ **Требуется JWT токен**

**⚠️ Ownership**: Можно редактировать только свои сообщения!

```typescript
const response = await messageApi.editMessage('msg-123', {
    content: 'Updated message',
});

if (response.success) {
    console.log('Message edited:', response.data.edited); // true
    // Изменение автоматически придёт через WebSocket событие 'message_edited'
} else {
    if (response.error?.includes('Forbidden')) {
        console.error('You can only edit your own messages!');
    }
}
```

**Коды ошибок:**

-   `400` - Валидация не прошла
-   `401` - Не авторизован
-   `403` - Попытка редактировать чужое сообщение
-   `404` - Сообщение не найдено

---

### `deleteMessage(id)`

Удалить своё сообщение.

**Аутентификация**: ✅ **Требуется JWT токен**

**⚠️ Ownership**: Можно удалять только свои сообщения!

```typescript
const response = await messageApi.deleteMessage('msg-123');

if (response.success) {
    console.log('Message deleted:', response.data.id);
    // Удаление автоматически придёт через WebSocket событие 'message_deleted'
}
```

---

## Real-time WebSocket Methods

### `onNewMessage(callback)`

Подписаться на новые сообщения в реальном времени.

**⚠️ Важно**: Эта подписка получает ВСЕ сообщения со всех каналов! Фильтруйте по `channelId` в UI.

```typescript
// Subscribe
const unsubscribe = messageApi.onNewMessage((message) => {
    console.log('New message:', message.author.username, message.content);

    // Add to UI only if it's for current channel
    if (message.channelId === currentChannelId) {
        addMessageToUI(message);
    }
});

// Unsubscribe when component unmounts
useEffect(() => {
    return () => {
        unsubscribe();
    };
}, []);
```

---

### `onMessageEdited(callback)`

Подписаться на изменения сообщений.

```typescript
const unsubscribe = messageApi.onMessageEdited((message) => {
    console.log('Message edited:', message.id);

    // Update in UI
    updateMessageInUI(message.id, message);
});

// Don't forget to unsubscribe!
return () => unsubscribe();
```

---

### `onMessageDeleted(callback)`

Подписаться на удаление сообщений.

```typescript
const unsubscribe = messageApi.onMessageDeleted(({ messageId, channelId }) => {
    console.log('Message deleted:', messageId);

    // Remove from UI
    if (channelId === currentChannelId) {
        removeMessageFromUI(messageId);
    }
});

return () => unsubscribe();
```

---

### `sendTypingIndicator(channelId, userId)`

Отправить индикатор набора текста.

```typescript
// Call this when user starts typing
messageApi.sendTypingIndicator('text-general', currentUser.id);
```

**💡 Совет**: Используйте debounce (300-500ms), чтобы не спамить событиями при каждом нажатии клавиши!

---

### `onTyping(callback)`

Подписаться на индикаторы набора текста других пользователей.

```typescript
const unsubscribe = messageApi.onTyping(({ channelId, userId }) => {
    if (channelId === currentChannelId) {
        showTypingIndicator(userId);

        // Hide after 3 seconds
        setTimeout(() => hideTypingIndicator(userId), 3000);
    }
});

return () => unsubscribe();
```

---

## Использование в MobX Store

Пример интеграции с MessagesStore:

```typescript
import { makeAutoObservable } from 'mobx';
import { messageApi, type ApiMessage } from '@entities/message';

export class MessagesStore {
    messagesByChannel = new Map<string, ApiMessage[]>();
    isLoading = false;
    error: string | null = null;

    private unsubscribers: (() => void)[] = [];

    constructor() {
        makeAutoObservable(this);
        this.setupWebSocketListeners();
    }

    // Load message history
    async loadMessages(channelId: string, limit = 50) {
        this.isLoading = true;
        this.error = null;

        try {
            const response = await messageApi.getMessages(channelId, limit, 0);

            if (response.success) {
                this.messagesByChannel.set(channelId, response.data.data);
            } else {
                this.error = response.error || 'Failed to load messages';
            }
        } catch (error) {
            this.error = error instanceof Error ? error.message : 'Unknown error';
        } finally {
            this.isLoading = false;
        }
    }

    // Send new message (no need to add to UI manually!)
    async sendMessage(channelId: string, content: string) {
        const response = await messageApi.sendMessage({ content, channelId });

        if (!response.success) {
            this.error = response.error || 'Failed to send message';
            return { success: false, error: response.error };
        }

        return { success: true };
    }

    // Real-time listeners
    private setupWebSocketListeners() {
        // Listen for new messages
        const unsubNew = messageApi.onNewMessage((message) => {
            this.addMessage(message);
        });

        // Listen for edits
        const unsubEdit = messageApi.onMessageEdited((message) => {
            this.updateMessage(message);
        });

        // Listen for deletes
        const unsubDelete = messageApi.onMessageDeleted(({ messageId, channelId }) => {
            this.removeMessage(channelId, messageId);
        });

        this.unsubscribers = [unsubNew, unsubEdit, unsubDelete];
    }

    private addMessage(message: ApiMessage) {
        const messages = this.messagesByChannel.get(message.channelId) || [];
        messages.push(message);
        this.messagesByChannel.set(message.channelId, messages);
    }

    private updateMessage(message: ApiMessage) {
        const messages = this.messagesByChannel.get(message.channelId);
        if (!messages) return;

        const index = messages.findIndex((m) => m.id === message.id);
        if (index !== -1) {
            messages[index] = message;
        }
    }

    private removeMessage(channelId: string, messageId: string) {
        const messages = this.messagesByChannel.get(channelId);
        if (!messages) return;

        const filtered = messages.filter((m) => m.id !== messageId);
        this.messagesByChannel.set(channelId, filtered);
    }

    // Cleanup on destroy
    dispose() {
        this.unsubscribers.forEach((unsub) => unsub());
    }
}
```

---

## React Component Example

Пример использования в компоненте:

```typescript
import { useEffect } from 'react';
import { observer } from 'mobx-react-lite';
import { useStores } from '@app/stores';
import { messageApi } from '@entities/message';

const MessageList = observer(({ channelId }: { channelId: string }) => {
    const { messagesStore } = useStores();

    useEffect(() => {
        // Load history when channel changes
        messagesStore.loadMessages(channelId);
    }, [channelId, messagesStore]);

    const messages = messagesStore.messagesByChannel.get(channelId) || [];

    return (
        <div>
            {messages.map((msg) => (
                <div key={msg.id}>
                    <strong>{msg.author.username}</strong>: {msg.content}
                    {msg.edited && <span> (edited)</span>}
                </div>
            ))}
        </div>
    );
});

const MessageInput = observer(({ channelId }: { channelId: string }) => {
    const { messagesStore, authStore } = useStores();
    const [content, setContent] = useState('');

    const handleSend = async () => {
        if (!content.trim()) return;

        const result = await messagesStore.sendMessage(channelId, content);
        if (result.success) {
            setContent(''); // Clear input
        }
    };

    const handleTyping = useDebouncedCallback(() => {
        if (authStore.currentUser) {
            messageApi.sendTypingIndicator(channelId, authStore.currentUser.id);
        }
    }, 300);

    return (
        <input
            value={content}
            onChange={(e) => {
                setContent(e.target.value);
                handleTyping();
            }}
            onKeyPress={(e) => e.key === 'Enter' && handleSend()}
        />
    );
});
```

---

## Важные замечания

### 🔄 Автоматическая синхронизация

Когда вы отправляете сообщение через `sendMessage()`:

1. ✅ REST API создаёт сообщение в БД
2. ✅ Backend автоматически отправляет WebSocket событие всем участникам канала
3. ✅ Ваш `onNewMessage()` callback получает это событие
4. ✅ Сообщение появляется в UI у всех пользователей

**НЕ НУЖНО** вручную добавлять сообщение в UI после `sendMessage()`!

### ⚡ WebSocket подключение

WebSocket автоматически подключается при старте приложения через `wsClient.connect()`.

Убедитесь, что WebSocket подключен перед использованием:

```typescript
if (messageApi.isConnected) {
    console.log('WebSocket connected');
}
```

### 🧹 Cleanup подписок

**ВСЕГДА** отписывайтесь от событий при размонтировании компонента:

```typescript
useEffect(() => {
    const unsubscribe = messageApi.onNewMessage(handleMessage);

    return () => {
        unsubscribe(); // ← ОБЯЗАТЕЛЬНО!
    };
}, []);
```

---

## Backend API Reference

Полная документация backend API: `backend/README.md`

-   `GET /api/messages?channelId=:id` - История сообщений
-   `GET /api/messages/:id` - Конкретное сообщение
-   `POST /api/messages` - Отправить (требует auth)
-   `PUT /api/messages/:id` - Редактировать (требует auth + ownership)
-   `DELETE /api/messages/:id` - Удалить (требует auth + ownership)

WebSocket events:

-   `message` - Новое сообщение
-   `message_edited` - Сообщение изменено
-   `message_deleted` - Сообщение удалено
-   `typing` - Пользователь печатает
