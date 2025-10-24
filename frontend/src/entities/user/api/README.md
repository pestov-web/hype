# User API

API клиент для работы с пользователями в Hype приложении.

## Установка

```typescript
import { userApi, type UpdateUserProfilePayload, type UpdateUserStatusPayload } from '@entities/user';
```

## Методы

### `getUsers()`

Получить список всех пользователей.

**Аутентификация**: Не требуется

```typescript
const response = await userApi.getUsers();

if (response.success) {
    const users = response.data; // User[]
    console.log('Users:', users);
} else {
    console.error('Error:', response.error);
}
```

---

### `getUserById(id: string)`

Получить информацию о конкретном пользователе.

**Аутентификация**: Не требуется

```typescript
const response = await userApi.getUserById('clxxx123456789');

if (response.success) {
    const user = response.data; // User
    console.log('User:', user.username, user.status);
} else {
    console.error('Error:', response.error);
}
```

---

### `updateUserStatus(id: string, payload: UpdateUserStatusPayload)`

Обновить статус пользователя (ONLINE/IDLE/DND/OFFLINE).

**Аутентификация**: Не требуется (⚠️ TODO: добавить проверку в будущем)

```typescript
const response = await userApi.updateUserStatus('clxxx123', {
    status: 'IDLE',
});

if (response.success) {
    const updatedUser = response.data;
    console.log('Status updated:', updatedUser.status);
} else {
    console.error('Error:', response.error);
}
```

**Доступные статусы:**

-   `'ONLINE'` - Пользователь онлайн
-   `'IDLE'` - Неактивен (Away)
-   `'DND'` - Не беспокоить (Do Not Disturb)
-   `'OFFLINE'` - Оффлайн

---

### `updateUserProfile(id: string, payload: UpdateUserProfilePayload)`

Обновить профиль пользователя (username, displayName, bio, avatarUrl).

**Аутентификация**: ✅ **Требуется JWT токен**

**Важно**: Пользователь может редактировать только свой профиль!

```typescript
const response = await userApi.updateUserProfile('clxxx123', {
    username: 'new_username',
    displayName: 'John Doe',
    bio: 'Full-stack developer',
    avatarUrl: 'https://i.imgur.com/avatar.png',
});

if (response.success) {
    const updatedUser = response.data;
    console.log('Profile updated:', updatedUser.username);
} else {
    if (response.error?.includes('Forbidden')) {
        console.error('You can only edit your own profile!');
    } else if (response.error?.includes('already taken')) {
        console.error('Username is already taken');
    } else {
        console.error('Error:', response.error);
    }
}
```

**Валидация:**

-   `username`: 3-32 символа, только латиница, цифры, дефис, подчёркивание
-   `displayName`: 1-32 символа
-   `bio`: до 500 символов
-   `avatarUrl`: валидный URL или null

**Коды ошибок:**

-   `400` - Валидация не прошла
-   `401` - Не авторизован (токен отсутствует/невалиден)
-   `403` - Попытка редактировать чужой профиль
-   `409` - Username уже занят

---

## Использование в MobX Store

Пример интеграции с UsersStore:

```typescript
import { makeAutoObservable } from 'mobx';
import { userApi, type User } from '@entities/user';

export class UsersStore {
    users: User[] = [];
    isLoading = false;
    error: string | null = null;

    constructor() {
        makeAutoObservable(this);
    }

    async loadUsers() {
        this.isLoading = true;
        this.error = null;

        try {
            const response = await userApi.getUsers();

            if (response.success) {
                this.users = response.data;
            } else {
                this.error = response.error || 'Failed to load users';
            }
        } catch (error) {
            this.error = error instanceof Error ? error.message : 'Unknown error';
        } finally {
            this.isLoading = false;
        }
    }

    async updateMyProfile(userId: string, data: UpdateUserProfilePayload) {
        this.isLoading = true;
        this.error = null;

        try {
            const response = await userApi.updateUserProfile(userId, data);

            if (response.success) {
                // Update user in local list
                const index = this.users.findIndex((u) => u.id === userId);
                if (index !== -1) {
                    this.users[index] = response.data;
                }
                return { success: true };
            } else {
                this.error = response.error || 'Failed to update profile';
                return { success: false, error: response.error };
            }
        } catch (error) {
            const errorMsg = error instanceof Error ? error.message : 'Unknown error';
            this.error = errorMsg;
            return { success: false, error: errorMsg };
        } finally {
            this.isLoading = false;
        }
    }
}
```

---

## Автоматическая JWT аутентификация

API клиент автоматически добавляет JWT токен из localStorage в заголовок `Authorization: Bearer <token>` для всех запросов.

Токен управляется через `AuthStore` и `tokenStorage` утилиты:

```typescript
import { setTokens, clearTokens, getAccessToken } from '@shared/lib/utils/tokenStorage';

// После успешного логина
setTokens(accessToken, refreshToken);

// Токен автоматически используется в userApi.updateUserProfile()

// При логауте
clearTokens();
```

---

## Backend API Reference

Полная документация backend API доступна в `backend/README.md`:

-   `GET /api/users` - Список пользователей
-   `GET /api/users/:id` - Конкретный пользователь
-   `PUT /api/users/:id/status` - Обновить статус
-   `PUT /api/users/:id` - Обновить профиль (требует auth)
