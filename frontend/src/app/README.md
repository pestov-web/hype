# App Layer (FSD)

**Назначение**: Конфигурация и инициализация приложения на самом верхнем уровне.

## Структура

```
app/
├── layouts/          # Макеты страниц (MainLayout с UserProfilePanel)
├── providers/        # React context providers (AppProvider)
├── router/           # React Router конфигурация
├── stores/           # MobX stores (RootStore, AuthStore, VoiceStore, etc.)
├── App.tsx           # Корневой компонент приложения
└── App.css           # Глобальные стили приложения
```

## Ключевые компоненты

### MainLayout (`layouts/MainLayout.tsx`)

-   **Назначение**: Общий макет для всех страниц
-   **Содержит**:
    -   `UserProfilePanel` (fixed bottom-left, position: fixed)
    -   `VoiceAudioManager` (глобальный менеджер аудио для голосовых каналов)
    -   `Outlet` для вложенных маршрутов
-   **Особенности**: Персистентен между навигацией, UserProfilePanel виден на всех страницах

### AppProvider (`providers/AppProvider.tsx`)

-   **Назначение**: Обёртка для глобальных context providers
-   **Включает**:
    -   MobX RootStore context
    -   React Router
    -   Любые другие глобальные providers

### Router (`router/`)

-   **Назначение**: Конфигурация маршрутизации React Router 7
-   **Маршруты**:
    -   `/` - HomePage (3-column layout: ChannelSidebar | Content | MembersList)
    -   `/channels/:channelId` - ChannelPage (текст + голосовой канал)
    -   `/settings` - SettingsPage (настройки пользователя)
    -   `/login` - LoginPage (регистрация/вход)
-   **Защищённые маршруты**: Проверка `AuthStore.isAuthenticated`, редирект на `/login`
-   **Lazy loading**: Code splitting для оптимизации размера бандла

### Stores (`stores/`)

-   **RootStore**: Объединяет все stores, предоставляет единый контекст
-   **AuthStore**: Аутентификация (currentUser, login, logout, register)
-   **ChannelsStore**: Управление каналами (channels[], textChannels, voiceChannels)
-   **MessagesStore**: Сообщения по каналам (messagesByChannel Map)
-   **VoiceStore**: Голосовая связь (activeChannelId, participants, voiceMode, PTT/VAD)
-   **UsersStore**: Пользователи сервера (users[], onlineUsers, offlineUsers)

**Архитектура**: MobX 6.15.0 с makeAutoObservable, mobx-react-lite для observer компонентов

## Правила использования

### ✅ Что можно делать в app/

1. Создавать глобальные providers
2. Настраивать маршрутизацию
3. Инициализировать stores
4. Создавать layout компоненты
5. Подключать глобальные стили

### ❌ Что НЕ должно быть в app/

1. Бизнес-логика (→ features/)
2. UI компоненты (→ widgets/ или shared/ui/)
3. API вызовы (→ shared/api/)
4. Типы данных (→ entities/)

## Зависимости

**Импортирует из**:

-   `@pages` - страницы для роутинга
-   `@widgets` - виджеты для layouts
-   `@shared` - утилиты, хуки, API

**Импортируется в**:

-   `main.tsx` (entry point)

## Важные паттерны

### MobX Stores

```typescript
// Создание observable store
class MyStore {
    count = 0;

    constructor() {
        makeAutoObservable(this);
    }

    increment() {
        this.count++;
    }
}

// Использование в компоненте
const Component = observer(() => {
    const { myStore } = useStores();
    return <div>{myStore.count}</div>;
});
```

### Protected Routes

```typescript
// В router/index.tsx
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
    const authStore = useAuthStore();

    if (!authStore.isAuthenticated) {
        return <Navigate to='/login' replace />;
    }

    return <>{children}</>;
};
```

### Layout с Outlet

```typescript
// MainLayout.tsx
export const MainLayout = () => {
    return (
        <div className={styles.layout}>
            <Outlet /> {/* Вложенные маршруты */}
            <UserProfilePanel /> {/* Персистентная панель */}
            <VoiceAudioManager /> {/* Глобальный аудио менеджер */}
        </div>
    );
};
```

## Технологический стек

-   **React 19.1.1** - UI библиотека
-   **React Router 7.9.4** - Маршрутизация с lazy loading
-   **MobX 6.15.0** - Управление состоянием
-   **mobx-react-lite 4.1.1** - React интеграция для MobX
-   **TypeScript** - Строгая типизация

## См. также

-   [Feature-Sliced Design](https://feature-sliced.design/)
-   [MobX Documentation](https://mobx.js.org/)
-   [React Router v7 Docs](https://reactrouter.com/)
