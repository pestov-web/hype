# Pages Layer (FSD)

**Назначение**: Компоненты страниц (routes), которые собирают widgets и features для полноценных экранов приложения.

## Структура

```
pages/
├── home/            # Главная страница (3-column layout)
├── channel/         # Страница канала (текст/голос)
├── settings/        # Страница настроек пользователя
└── login/           # Страница входа/регистрации
```

## Страницы

### HomePage (`home/`)

**Маршрут**: `/`

**Назначение**: Главная страница приложения с 3-column layout

**Структура**:

```
┌────────────────┬──────────────┬─────────────┐
│ ChannelSidebar │   Content    │ MembersList │
│  (channels)    │ (welcome msg)│   (users)   │
└────────────────┴──────────────┴─────────────┘
```

**Компоненты**:

-   `ChannelSidebar` (@widgets) - список каналов слева
-   `MembersList` (@widgets) - список пользователей справа
-   Welcome message в центре

**MobX observables**:

-   `channelsStore.channels` - список каналов
-   `authStore.currentUser` - текущий пользователь
-   `usersStore.users` - список пользователей сервера

**Lifecycle**:

```typescript
useEffect(() => {
    channelsStore.loadChannels();
    usersStore.loadUsers();
}, []);
```

---

### ChannelPage (`channel/`)

**Маршрут**: `/channels/:channelId`

**Назначение**: Просмотр и взаимодействие с конкретным каналом (текстовым или голосовым)

**Типы каналов**:

1. **TEXT** - текстовый чат

    - MessageList (история сообщений)
    - MessageInput (поле ввода)
    - Real-time WebSocket updates

2. **VOICE** - голосовой канал
    - ScreenShareGrid (@widgets) - grid с screen sharing streams
    - VoiceAudioManager (в MainLayout) - воспроизведение аудио от участников
    - Список участников в ChannelSidebar

**MobX observables**:

-   `channelsStore.channels` - для получения информации о канале
-   `messagesStore.messagesByChannel` - сообщения для TEXT каналов
-   `voiceStore.participants` - участники для VOICE каналов
-   `voiceStore.isInVoiceChannel` - статус подключения к голосу

**Особенности**:

-   **WebSocket real-time**: Автоматическое обновление сообщений
-   **Auto-scroll**: Прокрутка к новому сообщению
-   **Loading states**: Скелетоны при загрузке

---

### SettingsPage (`settings/`)

**Маршрут**: `/settings`

**Назначение**: Настройки пользователя

**Секции** (Tabs):

1. **Voice & Video**

    - Выбор микрофона (dropdown с deviceId)
    - Тест микрофона (visualizer с уровнем)
    - Выбор режима голоса: VAD / PTT
    - PTT key binding (keyboard recorder)
    - VAD sensitivity (Low / Medium / High)
    - Тест камеры (preview)
    - Тест screen sharing (preview)

2. **Language** (планируется)

    - Русский / English

3. **Appearance** (планируется)
    - Темы, размер шрифта

**MobX observables**:

-   `voiceStore.voiceMode` - текущий режим голоса
-   `voiceStore.pttKey` - клавиша для PTT
-   `voiceStore.vadSensitivity` - чувствительность VAD

**Device Settings**:

```typescript
// Сохранение в localStorage
setAudioInputDevice(deviceId);
setVoiceMode('ptt');
setPTTKey('KeyV');
setVADSensitivity('medium');
```

**Важно**: Настройки сохраняются в localStorage и применяются при следующем подключении к голосовому каналу!

---

### LoginPage (`login/`)

**Маршрут**: `/login`

**Назначение**: Аутентификация пользователя

**Режимы**:

1. **Register** - регистрация нового пользователя

    - Email, Username, Password
    - Валидация форм

2. **Login** - вход существующего пользователя

    - Email, Password
    - Password visibility toggle

3. **Guest** - вход как гость
    - Только Username
    - Временный пользователь без пароля

**MobX actions**:

```typescript
// Регистрация
await authStore.register(email, username, password);

// Логин
await authStore.login(email, password);

// Гость
await authStore.loginAsGuest(username);
```

**После успеха**: Редирект на `/` (HomePage)

**Особенности**:

-   JWT токены сохраняются в localStorage
-   Protected routes проверяют `authStore.isAuthenticated`
-   Error handling с UI feedback

## Общие паттерны

### MobX Observer

```typescript
import { observer } from 'mobx-react-lite';

export const MyPage = observer(() => {
    const { myStore } = useStores();

    // Автоматическая реакция на изменения myStore
    return <div>{myStore.data}</div>;
});
```

### Data Loading

```typescript
useEffect(() => {
    // Load data on mount
    myStore.loadData();
}, []);

// Cleanup on unmount
useEffect(() => {
    return () => {
        myStore.cleanup();
    };
}, []);
```

### Navigation

```typescript
import { useNavigate } from 'react-router-dom';

const navigate = useNavigate();

// Programmatic navigation
navigate('/channels/123');
navigate('/settings');
```

## Стилизация

**SCSS Modules**: Каждая страница имеет свой `.module.scss` файл

```typescript
import styles from './HomePage.module.scss';

<div className={styles.container}>
    <div className={styles.content}>...</div>
</div>;
```

**Auto-import**: SCSS переменные и миксины доступны автоматически

```scss
.container {
    background: $bg-primary;
    padding: $spacing-lg;
    border-radius: $border-radius-md;
}
```

## Правила использования

### ✅ Что можно в pages/

1. Композиция widgets и features
2. Работа с роутингом (useParams, useNavigate)
3. Data fetching для страницы
4. SEO meta tags (title, description)
5. Layout специфичный для страницы

### ❌ Что НЕ должно быть в pages/

1. Переиспользуемые UI компоненты (→ widgets/ или shared/ui/)
2. Бизнес-логика (→ features/ или stores/)
3. Прямые API вызовы (→ services/)
4. Сложные вычисления (→ utils/)

## Зависимости

**Импортирует из**:

-   `@widgets` - виджеты для композиции
-   `@features` - бизнес-функции
-   `@entities` - типы данных
-   `@shared` - UI, хуки, утилиты

**Импортируется в**:

-   `@app/router` - для конфигурации маршрутов

## React Router 7 Integration

### Lazy Loading

```typescript
// app/router/index.tsx
const HomePage = lazy(() => import('@pages/home/HomePage'));
const ChannelPage = lazy(() => import('@pages/channel/ChannelPage'));

const router = createBrowserRouter([
    {
        path: '/',
        element: <MainLayout />,
        children: [
            { index: true, element: <HomePage /> },
            { path: 'channels/:channelId', element: <ChannelPage /> },
            { path: 'settings', element: <SettingsPage /> },
        ],
    },
    { path: '/login', element: <LoginPage /> },
]);
```

### Protected Routes

```typescript
const ProtectedRoute = ({ children }: Props) => {
    const authStore = useAuthStore();

    if (!authStore.isAuthenticated) {
        return <Navigate to='/login' replace />;
    }

    return <>{children}</>;
};
```

## Технологический стек

-   **React 19.1.1** - UI
-   **React Router 7.9.4** - Routing
-   **MobX 6.15.0** - State management
-   **SCSS Modules** - Styling
-   **i18next** - i18n (для всех user-facing строк)

## Performance Optimization

### Code Splitting

Каждая страница - отдельный chunk благодаря React Router lazy loading

### Memo & Callback

```typescript
const MemoizedComponent = memo(ExpensiveComponent);
const handleClick = useCallback(() => { ... }, [deps]);
```

### Virtual Scrolling (для больших списков)

Используйте `react-window` или `react-virtual` для MessageList с 1000+ сообщений

## Accessibility (a11y)

-   ✅ Semantic HTML (`<main>`, `<nav>`, `<section>`)
-   ✅ ARIA labels для интерактивных элементов
-   ✅ Keyboard navigation (Tab, Enter, Escape)
-   ✅ Focus management для модалов

## Тестирование (планируется)

```typescript
// HomePage.test.tsx
describe('HomePage', () => {
    it('should render channels sidebar', () => {
        render(<HomePage />);
        expect(screen.getByText('Text Channels')).toBeInTheDocument();
    });

    it('should navigate to channel on click', async () => {
        const { user } = setup(<HomePage />);
        await user.click(screen.getByText('general'));
        expect(window.location.pathname).toBe('/channels/1');
    });
});
```

## См. также

-   [React Router v7 Docs](https://reactrouter.com/)
-   [MobX Best Practices](https://mobx.js.org/best-practices.html)
-   [Feature-Sliced Design - Pages Layer](https://feature-sliced.design/docs/reference/layers#pages)
