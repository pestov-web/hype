# Widgets Layer (FSD)

**Назначение**: Сложные самодостаточные UI-блоки, которые комбинируют несколько features и entities для реализации конкретной части интерфейса.

## Структура

```
widgets/
├── channel-sidebar/        # Discord-like боковая панель с каналами
├── user-profile-panel/     # Панель профиля с голосовыми контролами
├── members-list/           # Список участников сервера
├── screen-share-grid/      # Grid для отображения screen sharing
└── voice-panel/            # DEPRECATED: VoiceAudioManager перенесен в MainLayout
```

---

## ChannelSidebar (`channel-sidebar/`)

**Назначение**: Левая боковая панель со списком каналов и участниками голосового канала

**MobX Observables**:

```typescript
const { channels } = useStores();
const { voice } = useStores();

// Reactive data
channels.textChannels; // computed getter
channels.voiceChannels; // computed getter
voice.activeChannelId; // ID активного канала
voice.participants; // Массив участников в голосе
```

**Структура**:

```
┌─────────────────────┐
│   Server Name       │
├─────────────────────┤
│ TEXT CHANNELS       │
│  # general          │
│  # random           │
├─────────────────────┤
│ VOICE CHANNELS      │
│  🔊 Voice 1         │
│    👤 User1 🟢      │ ← Speaking indicator
│    👤 User2         │
│  🔊 Voice 2         │
├─────────────────────┤
│  ⚙️ Settings        │
└─────────────────────┘
```

**Особенности**:

-   **Active channel highlight**: Подсветка активного канала
-   **Speaking indicators**: Зеленое свечение вокруг аватара говорящего участника
-   **Voice participant list**: Список участников под активным voice каналом
-   **Settings button**: Навигация на `/settings`

**Speaking Detection**:

```typescript
// Green glow for speaking users
const isSpeaking = voice.participants.find((p) => p.userId === user.id && p.isSpeaking);

<Avatar user={user} className={cn(styles.avatar, isSpeaking && styles.speaking)} />;
```

**SCSS Variables**:

```scss
.sidebar {
    background: $bg-secondary;
    width: 240px;
    height: 100vh;
}

.channelItem {
    &:hover {
        background: $bg-modifier-hover;
    }
    &.active {
        background: $bg-modifier;
    }
}

.speaking {
    box-shadow: 0 0 8px 2px rgba($status-online, 0.7);
    animation: pulse 2s infinite;
}
```

---

## UserProfilePanel (`user-profile-panel/`)

**Назначение**: Фиксированная панель профиля пользователя внизу слева с голосовыми контролами

**Позиционирование**: `position: fixed; bottom: 0; left: 0;` (над ChannelSidebar)

**MobX Observables**:

```typescript
const { auth, voice } = useStores();

auth.currentUser; // Текущий пользователь
voice.localState; // { isMuted, isDeafened, isScreenSharing }
voice.voiceMode; // 'vad' | 'ptt'
voice.pttKey; // Клавиша PTT (e.g., 'Space')
voice.vadSensitivity; // 'low' | 'medium' | 'high'
```

**Структура**:

```
┌─────────────────────────────────┐
│ [🟢] Username#1234              │
│      Status message             │
│ [🎤] [🎧] [🖥️]                  │
└─────────────────────────────────┘
  Mute  Deaf  Share
```

**Функционал**:

1. **Avatar с анимацией speaking**

    - Зеленое свечение при активации VAD/PTT
    - Пульсация во время говорения

2. **Voice Controls**:

    - **Mute** - отключить микрофон
    - **Deafen** - отключить звук (автоматом mute)
    - **Share Screen** - включить/выключить screen sharing

3. **Voice Mode Detection**:
    - **VAD Mode**: Автоматическая активация на основе речи
    - **PTT Mode**: Активация при нажатии клавиши

**Hooks**:

```typescript
// Global keyboard listeners (side effects only!)
usePTT(voice.voiceMode === 'ptt'); // Слушает pttKey
useVAD({
    enabled: voice.voiceMode === 'vad',
    sensitivity: voice.vadSensitivity,
    onSpeechStart: () => rtcService.setVADSpeaking(true),
    onSpeechEnd: () => rtcService.setVADSpeaking(false),
});
```

**Speaking Animation**:

```scss
.avatarContainer {
    &.speaking {
        .avatar {
            box-shadow: 0 0 12px 4px rgba($status-online, 0.8);
            animation: pulse 1.5s ease-in-out infinite;
        }
    }
}

@keyframes pulse {
    0%,
    100% {
        box-shadow: 0 0 12px 4px rgba($status-online, 0.8);
    }
    50% {
        box-shadow: 0 0 20px 6px rgba($status-online, 1);
    }
}
```

**PTT Beep Sounds**:

```typescript
// Audio feedback при PTT
const playBeep = (frequency: number) => {
    const audioContext = new AudioContext();
    const oscillator = audioContext.createOscillator();
    oscillator.frequency.value = frequency;
    // High beep (800Hz) on activate
    // Low beep (400Hz) on deactivate
};
```

---

## MembersList (`members-list/`)

**Назначение**: Правая боковая панель со списком всех участников сервера (online/offline)

**MobX Observables**:

```typescript
const { users, voice } = useStores();

users.onlineUsers; // computed getter
users.offlineUsers; // computed getter
voice.participants; // Для определения кто в голосе
```

**Структура**:

```
┌─────────────────────┐
│ ONLINE — 5          │
│  🟢 User1 🎙️       │ ← In voice + speaking
│  🟢 User2           │
│  🟢 User3           │
├─────────────────────┤
│ OFFLINE — 3         │
│  ⚫ User4           │
│  ⚫ User5           │
└─────────────────────┘
```

**Speaking Detection**:

```typescript
// Green glow around members in voice channel
const isInVoice = voice.participants.some((p) => p.userId === user.id);
const isSpeaking = voice.participants.find((p) => p.userId === user.id && p.isSpeaking);

<Avatar user={user} className={cn(styles.avatar, isSpeaking && styles.speaking, isInVoice && styles.inVoice)} />;
```

**SCSS Variables**:

```scss
.memberItem {
    padding: $spacing-sm;
    border-radius: $border-radius-sm;
    transition: $transition-fast;

    &:hover {
        background: $bg-hover;
    }
}

.speaking {
    box-shadow: 0 0 8px 2px rgba($status-online, 0.7);
}

.inVoice {
    opacity: 1;
    .username {
        color: $text-primary;
    }
}
```

**Status Indicators**:

-   🟢 **Online** - `$status-online`
-   🟡 **Idle** - `$status-idle`
-   🔴 **DND** - `$status-dnd`
-   ⚫ **Offline** - `$status-offline`

---

## ScreenShareGrid (`screen-share-grid/`)

**Назначение**: Grid layout для отображения screen sharing streams от участников

**MobX Observables**:

```typescript
const { voice } = useStores();
voice.participants; // Участники с appData.kind === 'screen'
```

**Используется в**: ChannelPage для VOICE каналов

**Layout**:

```
┌──────────┬──────────┐
│ Screen 1 │ Screen 2 │
├──────────┼──────────┤
│ Screen 3 │ Screen 4 │
└──────────┴──────────┘
```

**Implementation**:

```typescript
const screenStreams = useMemo(() => {
    return rtcService.remoteScreenStreams;
}, [rtcService.remoteScreenStreams]);

return (
    <div className={styles.grid}>
        {screenStreams.map(({ userId, stream }) => (
            <div key={userId} className={styles.screenItem}>
                <video
                    autoPlay
                    playsInline
                    ref={(el) => {
                        if (el) el.srcObject = stream;
                    }}
                />
                <div className={styles.username}>{getUserName(userId)}</div>
            </div>
        ))}
    </div>
);
```

**Grid CSS**:

```scss
.grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
    gap: $spacing-lg;
    padding: $spacing-lg;
}

.screenItem {
    position: relative;
    aspect-ratio: 16 / 9;
    background: $bg-tertiary;
    border-radius: $border-radius-md;
    overflow: hidden;

    video {
        width: 100%;
        height: 100%;
        object-fit: contain;
    }
}
```

---

## VoiceAudioManager (`voice-panel/`)

**⚠️ ВАЖНО**: Компонент перенесен в `MainLayout` (app/layouts), но папка `voice-panel/` сохранена для истории

**Назначение**: Глобальный менеджер аудио-плейбека для удаленных участников голосового канала

**Позиция в дереве**: Живет на уровне `MainLayout`, персистентен при навигации между страницами

**MobX Reactivity**:

```typescript
const { voice } = useStores();

// Reactive updates на изменения participants
useEffect(() => {
    const participants = voice.participants;

    // Update audio elements for remote streams
    participants.forEach((participant) => {
        const stream = rtcService.remoteParticipants.get(participant.userId);
        if (stream) {
            // Create <audio> element with autoplay
        }
    });
}, [voice.participants, voice.streamUpdateTrigger]);
```

**Rendering**:

```tsx
// Hidden audio elements (display: none)
return (
    <div style={{ display: 'none' }}>
        {remoteStreams.map(({ userId, stream }) => (
            <audio
                key={userId}
                autoPlay
                ref={(el) => {
                    if (el) el.srcObject = stream;
                }}
            />
        ))}
    </div>
);
```

**Важно**: Компонент НЕ отображается визуально, только управляет `<audio>` элементами!

---

## Общие паттерны

### MobX Observer

```typescript
import { observer } from 'mobx-react-lite';

export const MyWidget = observer(() => {
    const { myStore } = useStores();

    return <div>{myStore.data}</div>;
});
```

### Responsive Design

```scss
.widget {
    @media (max-width: 768px) {
        width: 100%;
        padding: $spacing-sm;
    }
}
```

### i18n

```typescript
import { useTranslation } from '@shared/lib';

const { t } = useTranslation();

<h2>{t('channels.textChannels')}</h2>
<button>{t('voice.mute')}</button>
```

## Правила использования

### ✅ Что можно в widgets/

1. Композиция нескольких features/entities
2. Сложная бизнес-логика UI
3. Глобальные side effects (keyboard listeners, audio)
4. Интеграция с MobX stores
5. WebSocket event listeners

### ❌ Что НЕ должно быть в widgets/

1. Простые UI компоненты (→ shared/ui/)
2. Прямые API вызовы (→ services/)
3. Роутинг логика (→ pages/)
4. Переиспользуемые хуки (→ shared/lib/hooks/)

## Зависимости

**Импортирует из**:

-   `@features` - бизнес-функции
-   `@entities` - типы данных
-   `@shared` - UI компоненты, хуки, утилиты

**Импортируется в**:

-   `@pages` - для композиции страниц
-   `@app/layouts` - для глобальных виджетов (MainLayout)

## WebSocket Integration

```typescript
// Подписка на события в useEffect
useEffect(() => {
    wsClient.on('voice_state', handleVoiceState);
    wsClient.on('speaking_state', handleSpeaking);
    wsClient.on('new_producer', handleNewProducer);
    wsClient.on('producer_closed', handleProducerClosed);

    return () => {
        wsClient.off('voice_state', handleVoiceState);
        wsClient.off('speaking_state', handleSpeaking);
        wsClient.off('new_producer', handleNewProducer);
        wsClient.off('producer_closed', handleProducerClosed);
    };
}, []);
```

## Performance

### Memoization

```typescript
const filteredUsers = useMemo(() => {
    return users.filter((u) => u.status === 'online');
}, [users]);
```

### Debouncing

```typescript
const debouncedUpdate = useMemo(() => debounce((value) => store.update(value), 300), []);
```

### Virtual Scrolling

Для списков с 100+ элементами используйте `react-window`:

```typescript
import { FixedSizeList } from 'react-window';

<FixedSizeList height={600} itemCount={users.length} itemSize={50}>
    {({ index, style }) => <div style={style}>{users[index].name}</div>}
</FixedSizeList>;
```

## Технологический стек

-   **React 19.1.1** - UI framework
-   **MobX 6.15.0** - State management
-   **SCSS Modules** - Component styling
-   **Radix UI** - Unstyled primitives (Avatar, Tooltip)
-   **i18next 25.6.0** - Internationalization
-   **@ricky0123/vad-react 0.0.34** - Voice Activity Detection
-   **mediasoup-client** - WebRTC SFU client

## Accessibility

-   ✅ Keyboard navigation (Tab, Enter, Escape)
-   ✅ ARIA labels для кнопок без текста
-   ✅ Focus indicators для интерактивных элементов
-   ✅ Screen reader support

## См. также

-   [Feature-Sliced Design - Widgets Layer](https://feature-sliced.design/docs/reference/layers#widgets)
-   [MobX React Integration](https://mobx.js.org/react-integration.html)
-   [Radix UI Primitives](https://www.radix-ui.com/primitives)
