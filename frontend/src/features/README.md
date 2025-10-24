# Features Layer (FSD)

**Назначение**: Бизнес-функции и пользовательские сценарии, которые комбинируют entities и shared для реализации конкретных возможностей приложения.

⚠️ **СТАТУС**: Папка пока пустая. Бизнес-логика находится в MobX stores (`app/stores/`) и сервисах (`shared/lib/services/`).

## Структура (планируется)

```
features/
├── auth/                    # Аутентификация
│   ├── ui/
│   │   ├── LoginForm/
│   │   ├── RegisterForm/
│   │   └── GuestLoginForm/
│   ├── model/
│   │   └── useAuth.ts       # Hook для работы с authStore
│   └── lib/
│       └── validation.ts    # Валидация форм
│
├── send-message/            # Отправка сообщения
│   ├── ui/
│   │   └── MessageInput/
│   ├── model/
│   │   └── useSendMessage.ts
│   └── lib/
│       └── messageUtils.ts
│
├── voice-controls/          # Управление голосом
│   ├── ui/
│   │   ├── MuteButton/
│   │   ├── DeafenButton/
│   │   └── ScreenShareButton/
│   ├── model/
│   │   └── useVoiceControls.ts
│   └── lib/
│       └── audioUtils.ts
│
├── channel-navigation/      # Навигация по каналам
│   ├── ui/
│   │   └── ChannelListItem/
│   ├── model/
│   │   └── useChannelNav.ts
│   └── index.ts
│
└── user-settings/           # Настройки пользователя
    ├── ui/
    │   ├── VoiceSettings/
    │   ├── DeviceSelector/
    │   └── PTTKeyRecorder/
    ├── model/
    │   └── useSettings.ts
    └── lib/
        └── deviceUtils.ts
```

---

## Философия Features

**Features** - это "глаголы" вашего приложения. Они описывают **ЧТО МОЖЕТ ДЕЛАТЬ** пользователь.

### Примеры features:

-   ✅ **auth** - войти в систему, выйти, зарегистрироваться
-   ✅ **send-message** - отправить сообщение в канал
-   ✅ **voice-controls** - включить/выключить микрофон
-   ✅ **channel-navigation** - перейти в другой канал
-   ✅ **user-settings** - изменить настройки голоса

### Признаки хорошей feature:

1. Понятное действие (глагол + существительное)
2. Самодостаточная (минимум зависимостей)
3. Переиспользуемая (можно использовать в разных местах)
4. Тестируемая (изолированная логика)

---

## Внутренняя структура feature

### Слайсы (slices)

Каждая feature - это **слайс** с собственной структурой:

```
feature-name/
├── ui/              # UI компоненты feature
├── model/           # Бизнес-логика (hooks, stores)
├── lib/             # Вспомогательные функции
├── api/             # API вызовы (опционально)
└── index.ts         # Public API feature
```

### Public API (index.ts)

```typescript
// features/auth/index.ts
export { LoginForm } from './ui/LoginForm';
export { RegisterForm } from './ui/RegisterForm';
export { useAuth } from './model/useAuth';
export { validateEmail, validatePassword } from './lib/validation';

// НЕ экспортируем внутренние детали!
```

### UI Layer

```typescript
// features/auth/ui/LoginForm/LoginForm.tsx
import { useAuth } from '../../model/useAuth';
import { Button } from '@shared/ui';

export const LoginForm = () => {
    const { login, isLoading } = useAuth();

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        await login(email, password);
    };

    return (
        <form onSubmit={handleSubmit}>
            <input type='email' />
            <input type='password' />
            <Button type='submit' disabled={isLoading}>
                {t('auth.login')}
            </Button>
        </form>
    );
};
```

### Model Layer

```typescript
// features/auth/model/useAuth.ts
import { useStores } from '@shared/lib';

export const useAuth = () => {
    const { auth } = useStores();

    const login = async (email: string, password: string) => {
        try {
            await auth.login(email, password);
            navigate('/');
        } catch (error) {
            console.error('Login failed:', error);
        }
    };

    return {
        login,
        logout: auth.logout,
        isLoading: auth.isLoading,
        user: auth.currentUser,
    };
};
```

---

## Примеры features (планируется)

### 1. Voice Controls Feature

```typescript
// features/voice-controls/model/useVoiceControls.ts
import { useStores } from '@shared/lib';
import { rtcService } from '@shared/lib/services';

export const useVoiceControls = () => {
    const { voice } = useStores();

    const toggleMute = () => {
        const newState = !voice.localState.isMuted;
        voice.setLocalState({ isMuted: newState });
        rtcService.setMuted(newState);
    };

    const toggleDeafen = () => {
        const newState = !voice.localState.isDeafened;
        voice.setLocalState({ isDeafened: newState });
        rtcService.setDeafened(newState);

        // Deafen автоматически mute
        if (newState) {
            voice.setLocalState({ isMuted: true });
            rtcService.setMuted(true);
        }
    };

    return {
        isMuted: voice.localState.isMuted,
        isDeafened: voice.localState.isDeafened,
        toggleMute,
        toggleDeafen,
    };
};
```

```typescript
// features/voice-controls/ui/MuteButton/MuteButton.tsx
import { observer } from 'mobx-react-lite';
import { useVoiceControls } from '../../model/useVoiceControls';
import { IconButton } from '@shared/ui';

export const MuteButton = observer(() => {
    const { isMuted, toggleMute } = useVoiceControls();

    return (
        <IconButton
            onClick={toggleMute}
            variant={isMuted ? 'danger' : 'secondary'}
            aria-label={isMuted ? 'Unmute' : 'Mute'}
        >
            {isMuted ? <MicOffIcon /> : <MicIcon />}
        </IconButton>
    );
});
```

### 2. Send Message Feature

```typescript
// features/send-message/model/useSendMessage.ts
import { useState } from 'react';
import { useStores } from '@shared/lib';
import { messageService } from '@shared/lib/services';

export const useSendMessage = (channelId: string) => {
    const { messages } = useStores();
    const [isLoading, setIsLoading] = useState(false);

    const sendMessage = async (content: string) => {
        if (!content.trim()) return;

        setIsLoading(true);
        try {
            const message = await messageService.createMessage({
                channelId,
                content,
            });
            messages.addMessage(message);
        } catch (error) {
            console.error('Failed to send message:', error);
            throw error;
        } finally {
            setIsLoading(false);
        }
    };

    return { sendMessage, isLoading };
};
```

### 3. Channel Navigation Feature

```typescript
// features/channel-navigation/model/useChannelNav.ts
import { useNavigate } from 'react-router-dom';
import { useStores } from '@shared/lib';

export const useChannelNav = () => {
    const navigate = useNavigate();
    const { channels, voice } = useStores();

    const navigateToChannel = (channelId: string) => {
        const channel = channels.channels.find((c) => c.id === channelId);
        if (!channel) return;

        // Leave voice if navigating away from voice channel
        if (voice.isInVoiceChannel && channel.type === 'text') {
            voice.leaveVoiceChannel();
        }

        navigate(`/channels/${channelId}`);
    };

    return { navigateToChannel };
};
```

---

## Текущее состояние (Temporary Architecture)

### Почему features/ пустая?

Текущая архитектура использует:

-   **MobX stores** (`app/stores/`) - для глобального состояния
-   **Services** (`shared/lib/services/`) - для API вызовов
-   **Hooks** (`shared/lib/hooks/`) - для переиспользуемой логики
-   **Widgets** (`widgets/`) - для композиции UI

Это работает для MVP, но по мере роста приложения рекомендуется мигрировать в FSD features.

### Миграция план:

1. **Phase 1**: Вынести UI компоненты из widgets в features

    - `voice-controls/` (MuteButton, DeafenButton, ScreenShareButton)
    - `send-message/` (MessageInput)
    - `user-settings/` (VoiceSettings, DeviceSelector)

2. **Phase 2**: Создать фасады для stores

    - `useAuth()` вместо прямого `authStore`
    - `useVoiceControls()` вместо `voiceStore`

3. **Phase 3**: Изолировать бизнес-логику
    - Валидация форм в `lib/validation.ts`
    - Утилиты работы с устройствами в `lib/deviceUtils.ts`

---

## Правила использования

### ✅ Что можно в features/

1. UI компоненты для конкретной функции
2. Бизнес-логика (hooks, валидация)
3. Изолированные API вызовы
4. Константы и утилиты feature

### ❌ Что НЕ должно быть в features/

1. Глобальное состояние (→ app/stores/)
2. Переиспользуемые UI компоненты (→ shared/ui/)
3. Entities типы (→ entities/)
4. Роутинг (→ pages/)
5. Композиция нескольких features (→ widgets/)

---

## Зависимости

### ✅ Можно импортировать:

-   `@shared/*` - UI, хуки, утилиты
-   `@entities/*` - типы данных

### ❌ Нельзя импортировать:

-   `@features/*` - другие features (циклические зависимости!)
-   `@widgets/*` - виджеты выше по иерархии
-   `@pages/*` - страницы выше по иерархии
-   `@app/*` - app слой (кроме stores через shared)

### Public API паттерн:

```typescript
// ✅ DO: Import from feature public API
import { LoginForm, useAuth } from '@features/auth';

// ❌ DON'T: Import internal modules
import { LoginForm } from '@features/auth/ui/LoginForm/LoginForm';
```

---

## Cross-Feature Communication

### ❌ Плохо: Direct import

```typescript
// features/send-message/model/useSendMessage.ts
import { useAuth } from '@features/auth'; // ❌ Циклическая зависимость!
```

### ✅ Хорошо: Через shared store

```typescript
// features/send-message/model/useSendMessage.ts
import { useStores } from '@shared/lib';

const { auth } = useStores();
const authorId = auth.currentUser?.id;
```

### ✅ Хорошо: Через props

```typescript
// features/send-message/ui/MessageInput.tsx
export const MessageInput = ({ authorId }: Props) => {
    // Author передается извне, feature не знает об auth
};
```

---

## Testing Strategy

### Unit Tests (для model/)

```typescript
// features/voice-controls/model/useVoiceControls.test.ts
import { renderHook, act } from '@testing-library/react';
import { useVoiceControls } from './useVoiceControls';

describe('useVoiceControls', () => {
    it('should toggle mute state', () => {
        const { result } = renderHook(() => useVoiceControls());

        act(() => {
            result.current.toggleMute();
        });

        expect(result.current.isMuted).toBe(true);
    });
});
```

### Integration Tests (для UI)

```typescript
// features/auth/ui/LoginForm/LoginForm.test.tsx
import { render, screen, userEvent } from '@testing-library/react';
import { LoginForm } from './LoginForm';

describe('LoginForm', () => {
    it('should submit login form', async () => {
        const user = userEvent.setup();
        render(<LoginForm />);

        await user.type(screen.getByLabelText('Email'), 'test@example.com');
        await user.type(screen.getByLabelText('Password'), 'password123');
        await user.click(screen.getByRole('button', { name: 'Login' }));

        expect(mockLogin).toHaveBeenCalled();
    });
});
```

---

## Performance Optimization

### Code Splitting

```typescript
// Lazy load features
const VoiceControls = lazy(() => import('@features/voice-controls').then((m) => ({ default: m.VoiceControls })));
```

### Memoization

```typescript
// features/send-message/model/useSendMessage.ts
import { useCallback } from 'react';

export const useSendMessage = (channelId: string) => {
    const sendMessage = useCallback(
        async (content: string) => {
            // ...logic
        },
        [channelId]
    );

    return { sendMessage };
};
```

---

## Технологический стек (будущий)

-   **React 19.1.1** - UI framework
-   **MobX 6.15.0** - State management (via stores)
-   **React Hook Form** (планируется) - Form handling
-   **Zod** (планируется) - Validation
-   **i18next 25.6.0** - Internationalization

---

## См. также

-   [Feature-Sliced Design - Features Layer](https://feature-sliced.design/docs/reference/layers#features)
-   [FSD - Public API](https://feature-sliced.design/docs/reference/public-api)
-   [FSD - Cross-imports](https://feature-sliced.design/docs/reference/isolation/cross-imports)
-   [React Hook Form](https://react-hook-form.com/)
-   [Zod Documentation](https://zod.dev/)
