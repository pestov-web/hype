# Copilot Instructions for Hype Project

## Project Overview

**Hype** is a Discord-like real-time communication platform with group voice/video calls using WebRTC.

## Project Architecture

This is a **full-stack monorepo** with the following structure:

-   **Frontend**: React 19 + TypeScript + Vite with **Feature-Sliced Design (FSD)** architecture in `frontend/`
-   **Backend**: Express.js (Node.js) with REST API and WebSocket server in `backend/`
-   **Routing**: React Router 7 with lazy loading for code splitting
-   **Real-time Features**: WebRTC for voice/video calls, WebSockets for messaging
-   **Package Management**: pnpm with workspace configuration
-   **State Management**: MobX 6.15.0 with mobx-react-lite 4.1.1 for reactive stores
-   **Styling**: SCSS with CSS Modules, Radix UI unstyled primitives, CVA for variants
-   **Path Aliases**: @app, @pages, @widgets, @features, @entities, @shared for clean imports

## Key Project Setup

### Development Environment

-   **Package Manager**: Use `pnpm` exclusively (not npm/yarn)
-   **Node Version**: Modern ES2022 target with ESNext modules
-   **TypeScript**: Strict configuration with project references architecture
-   **Build Tool**: Vite 7.x with React plugin, HMR, and path aliases
-   **Frontend Architecture**: Feature-Sliced Design (FSD) methodology
-   **Routing**: React Router 7.9.4 with createBrowserRouter and lazy loading
-   **State Management**: MobX 6.15.0 with observable stores (Auth, Channels, Messages, Voice)
-   **Styling**: SCSS 1.93.2 with CSS Modules, auto-imported variables and mixins
-   **UI Kit**: Radix UI unstyled primitives (Avatar, Slot, Dialog, DropdownMenu, Select, Tabs, Tooltip)
-   **Styling Utilities**: CVA 0.7.1, clsx 2.1.1, tailwind-merge 3.3.1 for dynamic classes
-   **Internationalization**: i18next 25.6.0 with react-i18next 16.1.4 for multi-language support (ru, en)
-   **Real-time Communication**: WebRTC APIs for voice/video, WebSockets for messaging
-   **Voice Activity Detection**: @ricky0123/vad-react 0.0.34 with Silero VAD model v5
-   **Backend Server**: Express.js 4.21.2 with TypeScript, tsx for development
-   **WebSocket**: ws 8.18.3 library for real-time communication

### Critical Files & Conventions

-   **TypeScript Config**: Uses project references pattern (`tsconfig.json` → `tsconfig.app.json` + `tsconfig.node.json`)
-   **ESLint**: Flat config format with React 19 patterns, React Hooks rules, and React Refresh
-   **Entry Point**: `src/main.tsx` with StrictMode enabled
-   **FSD Structure**: Organized by layers: `app/`, `pages/`, `widgets/`, `features/`, `entities/`, `shared/`
-   **Asset Imports**: Use Vite's asset handling (`/vite.svg` for public, `./assets/` for src)

## Development Workflows

### Essential Commands

```bash
# From root directory (uses pnpm workspace)
pnpm dev                    # Start frontend dev server (port 5173/5174)
pnpm --filter frontend dev  # Start frontend explicitly
pnpm --filter backend dev   # Start backend server (port 3001 + ws 8080)

# Build commands
pnpm --filter frontend build  # Build frontend
pnpm --filter backend build   # Build backend

# Linting
pnpm --filter frontend lint   # Lint frontend code
pnpm --filter backend lint    # Lint backend code
```

### Backend Development

```bash
cd backend

# Development server with hot reload (tsx watch)
pnpm dev

# Production build
pnpm build

# Start production server
pnpm start

# Type checking without building
pnpm type-check
```

### API Endpoints

**Base URL**: `http://localhost:3001`

```
GET  /health                    # Health check
GET  /api                       # API info

# Channels
GET  /api/channels              # List all channels
GET  /api/channels/:id          # Get specific channel
POST /api/channels              # Create channel
PUT  /api/channels/:id          # Update channel
DEL  /api/channels/:id          # Delete channel

# Users
GET  /api/users                 # List all users
GET  /api/users/:id             # Get specific user
POST /api/users                 # Create user
PUT  /api/users/:id/status      # Update user status

# Messages
GET  /api/messages?channelId=:id  # Get messages for channel
GET  /api/messages/:id            # Get specific message
POST /api/messages                # Send message
PUT  /api/messages/:id            # Edit message
DEL  /api/messages/:id            # Delete message
```

### WebSocket Events

**WebSocket URL**: `ws://localhost:8080`

```typescript
// Client → Server
{
  type: 'user_joined' | 'message' | 'voice_state' | 'typing',
  data: any,
  timestamp: Date
}

// Server → Client
{
  type: 'message' | 'user_joined' | 'user_left' | 'voice_state' | 'typing',
  data: any,
  timestamp: Date
}
```

### TypeScript Patterns

-   **Strict Mode**: All strict TypeScript options enabled including `noUnusedLocals`, `noUnusedParameters`
-   **Modern Features**: Uses `verbatimModuleSyntax`, `moduleDetection: "force"`
-   **React 19**: Uses latest React patterns with `react-jsx` transform

### ESLint Configuration

-   **Flat Config**: Uses ESLint 9.x flat config format in `eslint.config.js`
-   **React-Specific**: Configured for React Hooks latest, React Refresh (Vite), and TypeScript
-   **Build Ignores**: `dist/` directory globally ignored

### SCSS Variables (shared/styles/\_variables.scss)

**IMPORTANT: Always use these exact variable names in SCSS files!**

**Colors:**

```scss
// Primary colors
$primary: #5865f2;
$primary-hover: #4752c4;
$primary-active: #3c45a5;

// Secondary colors
$secondary: #4f545c;
$secondary-hover: #686d73;
$secondary-active: #5c6269;

// Status colors
$danger: #ed4245;
$danger-hover: #c03537;
$danger-active: #a12d2f;
$success: #3ba55d;
$warning: #faa81a;

// Background colors (use these for backgrounds!)
$bg-primary: #36393f; // Main background
$bg-secondary: #2f3136; // Secondary panels (sidebar)
$bg-tertiary: #202225; // Input fields, cards
$bg-modifier: #40444b; // Hover states
$bg-modifier-hover: #4f545c;
$bg-hover: rgba(79, 84, 92, 0.16);
$bg-active: rgba(79, 84, 92, 0.24);

// Text colors (use these for text!)
$text-primary: #ffffff; // Main text (white)
$text-secondary: #b9bbbe; // Secondary text (gray)
$text-tertiary: #8e9297; // Tertiary text
$text-normal: #dcddde; // Normal text
$text-muted: #72767d; // Muted text
$text-link: #00aff4;
$text-positive: #3ba55d;
$text-warning: #faa81a;
$text-danger: #ed4245;

// Header colors
$header-primary: #ffffff;
$header-secondary: #b9bbbe;

// Interactive colors
$interactive-normal: #b9bbbe;
$interactive-hover: #dcddde;
$interactive-active: #ffffff;
$interactive-muted: #4f545c;

// Status indicators
$status-online: #3ba55d;
$status-idle: #faa81a;
$status-dnd: #ed4245;
$status-offline: #747f8d;

// Border colors
$border-color: rgba(0, 0, 0, 0.2);
$border-hover: rgba(0, 0, 0, 0.3);
```

**Spacing:**

```scss
$spacing-xs: 4px;
$spacing-sm: 8px;
$spacing-md: 12px;
$spacing-lg: 16px;
$spacing-xl: 20px;
$spacing-xxl: 24px;
```

**Border Radius:**

```scss
$border-radius-sm: 4px;
$border-radius-md: 8px;
$border-radius-lg: 12px;
$border-radius-round: 50%;
```

**Transitions:**

```scss
$transition-fast: 0.1s ease;
$transition-normal: 0.2s ease;
$transition-slow: 0.3s ease;
```

**Typography:**

```scss
// Font sizes
$font-size-xs: 12px;
$font-size-sm: 14px;
$font-size-md: 16px;
$font-size-lg: 18px;
$font-size-xl: 20px;
$font-size-xxl: 24px;

// Font weights
$font-weight-normal: 400;
$font-weight-medium: 500;
$font-weight-semibold: 600;
$font-weight-bold: 700;
```

**Z-index:**

```scss
$z-dropdown: 1000;
$z-modal: 2000;
$z-tooltip: 3000;
```

**Common Mistakes to Avoid:**

-   ❌ DON'T use `$background-primary` → ✅ USE `$bg-primary`
-   ❌ DON'T use `$background-secondary` → ✅ USE `$bg-secondary`
-   ❌ DON'T use `$background-tertiary` → ✅ USE `$bg-tertiary`
-   ❌ DON'T use `$accent-primary` → ✅ USE `$primary`

## Project-Specific Patterns

### Feature-Sliced Design (FSD) Architecture

-   **app/**: Application-level configuration, providers, routing
-   **pages/**: Route components and page-specific logic
-   **widgets/**: Complex UI blocks combining multiple features
-   **features/**: Business logic features (voice chat, messaging, user management)
-   **entities/**: Business entities (User, Channel, Message, VoiceCall)
-   **shared/**: Reusable utilities, components, constants, API clients

### Current Implementation Status

**✅ Completed:**

-   Frontend FSD structure with all 6 layers
-   Path aliases configured (@app, @pages, @widgets, @features, @entities, @shared)
-   SCSS with CSS Modules configured, auto-imported variables and mixins (Vite config)
-   MobX stores (AuthStore, ChannelsStore, MessagesStore, VoiceStore, UsersStore, RootStore)
-   Radix UI primitives (Avatar, Slot) with CVA styling utilities
-   Shared UI components migrated to Radix UI + SCSS modules (Button, Avatar)
-   ChannelSidebar widget migrated to MobX observer + SCSS modules
-   HomePage and ChannelPage migrated to MobX observer pattern
-   Entity types (User, Channel, Message, Voice) with TypeScript interfaces
-   Backend Express server with REST API and WebSocket
-   API clients (HTTP + WebSocket) with type-safe responses
-   Service layer (channelService, userService, messageService, authService)
-   React Router 7 with lazy loading and navigation
-   **Authentication with JWT** - email/password registration and login with PostgreSQL + Prisma
-   **Pure SFU Architecture (mediasoup)** - production-ready SFU with mediasoup backend + mediasoup-client frontend
-   **Multi-user voice communication** - WebRTC SFU voice calls, scalable architecture (no P2P)
-   **VoiceAudioManager** - global audio playback manager at MainLayout level (persists across navigation)
-   **Backend WebSocket voice_state** - syncs participants between all users in voice channel
-   Audio volume indicators with Web Audio API
-   **Voice Activity Detection (VAD)** - automatic speech detection using @ricky0123/vad-react v0.0.34
-   **VAD Sensitivity Controls** - 3 configurable sensitivity levels (low/medium/high) with UI in SettingsPage
-   **Push-to-Talk (PTT)** - keyboard-based voice activation with customizable key binding (default: Space)
-   **Voice modes** - 2 modes: VAD (auto-detect speech, DEFAULT), PTT (press key to talk)
-   **Screen sharing** - getDisplayMedia API with SFU producers/consumers, appData kind='screen'
-   SettingsPage with Voice & Video section (microphone selection, test, voice mode selector, PTT key binding, VAD sensitivity)
-   Device settings persistence (localStorage helpers in shared/lib/utils/deviceSettings.ts)
-   Microphone and camera selection integrated with rtcService (uses saved deviceId)
-   **MembersList widget** - shows online/offline users in 3-column HomePage layout
-   **LoginPage** - register/login/guest with password visibility toggle and error handling
-   **Protected routes** - authentication check with token refresh
-   **PTT beep sounds** - audio feedback (high beep on activate, low beep on deactivate)
-   **Internationalization (i18n)** - i18next with Russian/English support, auto language detection
-   **UserProfilePanel widget** - fixed bottom-left panel with avatar, voice controls (mute/deafen/share screen), green speaking animation
-   **Speaking indicators** - green glow around avatar/member when user is speaking (VAD/PTT detection)
-   **MembersList speaking detection** - reactive green glow for speaking participants in voice channel
-   **VoicePanel removed** - all functionality consolidated into ChannelSidebar + UserProfilePanel

**📋 Planned - Short Term (1-2 months):**

-   Multi-region SFU deployment with Redis coordination
-   Output device (speakers/headphones) settings with setSinkId()
-   Video quality settings (720p, 1080p presets)
-   WebRTC video calls implementation with camera toggle
-   Real message persistence to PostgreSQL database

**📋 Planned - Long Term (3-12 months):**

-   Microservices architecture (auth, channels, voice, signaling services)
-   Multi-region SFU deployment (US, EU, Asia)
-   Cascade SFU for large channels (100+ participants)
-   CDN for game streaming (RTMP → HLS transcoding)
-   Database sharding by guild_id
-   Prometheus metrics + Grafana dashboards
-   File upload functionality
-   Push notifications system
-   Additional Radix UI components (Dialog, DropdownMenu, Select, Tabs, Tooltip)

**📚 Architecture Documentation:**

-   `VOICE_ARCHITECTURE.md` - Old P2P mesh architecture (**DEPRECATED**, reference only)
-   `PURE_SFU_APPROACH.md` - Why Pure SFU instead of Hybrid
-   `docs/PHASE_1_SFU_SETUP.md` - SFU implementation guide (**COMPLETED**)
-   `docs/SCALABILITY_ARCHITECTURE.md` - Complete scaling roadmap (100 → 100,000+ users)

### File Organization Examples

```
src/
├── app/
│   ├── providers/
│   │   └── AppProvider.tsx         # Global context provider
│   ├── router/
│   │   └── index.tsx                # React Router configuration
│   ├── App.tsx                      # Main app component
│   └── App.css
├── pages/
│   ├── home/
│   │   ├── HomePage.tsx             # Main landing page
│   │   ├── HomePage.css
│   │   └── index.ts
│   ├── channel/
│   │   ├── ChannelPage.tsx          # Channel with chat
│   │   ├── ChannelPage.css
│   │   └── index.ts
│   └── settings/
│       ├── SettingsPage.tsx         # User settings
│       ├── SettingsPage.css
│       └── index.ts
├── widgets/
│   ├── channel-sidebar/
│   │   ├── ChannelSidebar.tsx       # Discord-like sidebar
│   │   ├── ChannelSidebar.css
│   │   └── index.ts
│   └── voice-panel/
│       ├── VoicePanel.tsx           # Voice controls panel
│       ├── VoicePanel.css
│       └── index.ts
├── features/
│   # Planned: voice-chat, text-messaging, user-auth
├── entities/
│   ├── user/
│   │   └── model/types.ts           # User, UserPresence types
│   ├── channel/
│   │   └── model/types.ts           # Channel, VoiceChannel types
│   ├── message/
│   │   └── model/types.ts           # Message types
│   └── voice/
│       └── model/types.ts           # VoiceCall, VoiceParticipant types
└── shared/
    ├── ui/
    │   ├── Button/                  # Button component (3 variants)
    │   ├── Avatar/                  # Avatar with status indicator
    │   └── IconButton/              # Icon button component
    ├── api/
    │   ├── http.ts                  # ApiClient class
    │   ├── websocket.ts             # WebSocketClient class
    │   └── index.ts
    └── lib/
        └── services/
            ├── channelService.ts    # Channel CRUD operations
            ├── userService.ts       # User management
            └── messageService.ts    # Message operations
```

Backend structure:

```
backend/src/
├── index.ts                         # Main server (Express + WebSocket)
├── routes/
│   ├── index.ts                     # Route setup
│   ├── channels.ts                  # Channel endpoints
│   ├── users.ts                     # User endpoints
│   └── messages.ts                  # Message endpoints
├── websocket/
│   └── websocket.ts                 # WebSocketManager class
└── types/
    └── index.ts                     # Shared type definitions
```

### Discord-like Features Implementation

-   **Voice/Video Calls**: WebRTC SFU (mediasoup) architecture, media streams through server
-   **Real-time Messaging**: WebSocket connections, message synchronization
-   **Channel System**: Text and voice channels with permissions
-   **User Presence**: Online/offline status, activity indicators
-   **Voice Modes**: Voice Activity Detection (VAD, default), Push-to-Talk (PTT)

### Voice Communication Architecture

**Pure SFU Architecture (mediasoup)** - Production-ready scalable architecture:

-   All media goes through SFU server (no P2P connections)
-   mediasoup backend handles all WebRTC routing
-   mediasoup-client on frontend (Device, Transports, Producers, Consumers)
-   Backend: `/api/voice` endpoints for RTP capabilities, transport creation, produce/consume
-   Scales to 1000+ concurrent users per SFU instance
-   Multi-region deployment ready (with Redis coordination)

**Architecture Components:**

-   **Frontend**: `rtcService.ts` → `sfuService.ts` → mediasoup-client
-   **Backend**: `/routes/voice.ts` → `sfuService.ts` → mediasoup workers/routers
-   **WebSocket**: `new_producer` events notify participants of new streams
-   **Producers**: audio, video, screen (all go through SFU)
-   **Consumers**: receive streams from other participants via SFU
-   **Transports**: separate send/recv transports per participant

**Key Differences from P2P:**

-   ✅ Scalable to 100+ users (P2P limited to ~10)
-   ✅ Lower client bandwidth (1 upload stream vs N-1 in P2P)
-   ✅ Server-side mixing, recording, transcoding possible
-   ✅ No mesh complexity (N connections vs N\*(N-1)/2 in P2P)
-   ⚠️ Requires SFU server infrastructure (mediasoup workers)

**See `docs/PHASE_1_SFU_SETUP.md` for implementation details**

### Voice Mode System

**2 Voice Activation Modes:**

1. **VAD (Voice Activity Detection)** - Automatic speech detection (DEFAULT)

    - Uses @ricky0123/vad-react library (v0.0.34)
    - Silero VAD model v5 with ONNX Runtime WebAssembly
    - Automatically detects when user is speaking
    - Debounced to prevent UI flickering (200ms delay on speech end)
    - Callbacks: onSpeechStart, onSpeechEnd
    - Configuration: ortConfig with WASM backend, no JSEP
    - **3 Sensitivity Levels** (configurable in SettingsPage):
        - **Low** (0.5 threshold): Picks up quieter sounds, best for very quiet rooms
        - **Medium** (0.7 threshold): Balanced detection for normal speaking volume
        - **High** (0.85 threshold, default): Filters most background noise, best for noisy environments

2. **PTT (Push-to-Talk)** - Keyboard-activated transmission
    - Default key: Space (customizable in settings)
    - Listens to keydown/keyup events
    - Prevents repeated events (ignores key hold)
    - Audio feedback: high beep (800Hz) on activate, low beep (400Hz) on deactivate
    - Visual indicator when active
    - Saves key binding to localStorage

**Implementation Files:**

-   `usePTT.ts` - React hook for PTT keyboard handling
-   `useVAD.ts` - React hook wrapping @ricky0123/vad-react, accepts sensitivity parameter
-   `VoiceStore.ts` - voiceMode, pttKey, vadSensitivity observable properties, setVoiceMode(), setVADSensitivity() actions
-   `rtcService.ts` - activatePTT(), deactivatePTT(), setVADSpeaking(), setPTTEnabled()
-   `deviceSettings.ts` - getVoiceMode(), setVoiceMode(), getPTTKey(), setPTTKey(), getVADSensitivity(), setVADSensitivity()
-   `SettingsPage.tsx` - Voice mode selector, PTT key binding recorder, VAD sensitivity selector
-   `UserProfilePanel.tsx` - PTT/VAD hooks for global keyboard listening, uses reactive vadSensitivity from store

### Component Architecture

**Shared UI Components:**

-   `Button` - Radix Slot primitive, CVA variants (primary, secondary, danger, ghost, link), SCSS modules
-   `Avatar` - Radix Avatar primitive with status indicator (online/offline/idle/dnd), SCSS modules
-   `IconButton` - Icon-only button with ghost/filled variants

**Widgets:**

-   `ChannelSidebar` - MobX observer, Discord-like sidebar, shows participants in active voice channel with speaking indicators, SCSS modules
-   `UserProfilePanel` - MobX observer, fixed bottom-left panel (position: fixed), shows avatar with green speaking animation, voice controls (mute/deafen/share screen), reactive to voiceStore.localState
-   `MembersList` - MobX observer, displays online/offline users, green speaking glow for participants in voice channel, reactive to voiceStore.participants
-   `ScreenShareGrid` - MobX observer, displays screen sharing streams from participants
-   `VoiceAudioManager` - Audio playback manager in MainLayout, handles remote participant audio streams

**Pages:**

-   `HomePage` - MobX observer, uses channelsStore and authStore, loads channels on mount, SCSS modules
-   `ChannelPage` - MobX observer, shows ScreenShareGrid for voice channels, real-time WebSocket messages
-   `SettingsPage` - User settings with tabs, voice/video settings, SCSS modules

**MobX Stores (app/stores):**

-   `AuthStore` - currentUser, isAuthenticated, register(), login(), loginAsGuest(), restoreSession(), logout()
-   `ChannelsStore` - channels[], loadChannels(), textChannels, voiceChannels computed getters
-   `MessagesStore` - messagesByChannel Map, loadMessages(), addMessage(), clearMessages()
-   `VoiceStore` - activeChannelId, participants[], voiceMode, pttKey, vadSensitivity, joinVoiceChannel(), leaveVoiceChannel(), setVoiceMode(), setVADSensitivity(), startScreenShare(), stopScreenShare(), isScreenSharing
-   `UsersStore` - users[], loadUsers(), onlineUsers, offlineUsers computed properties
-   `RootStore` - combines all stores, provides single context

**Services (shared/lib/services):**

-   `channelService` - getChannels(), getChannel(id), createChannel(), updateChannel(), deleteChannel()
-   `userService` - getUsers(), getUser(id), createUser(), updateUserStatus()
-   `messageService` - getMessages(channelId), getMessage(id), createMessage(), updateMessage(), deleteMessage()
-   `authService` - register(), login(), loginAsGuest(), refreshTokens(), getCurrentUser(), logout()
-   `rtcService` - WebRTC SFU manager: joinVoiceChannel(), leaveVoiceChannel(), consumeParticipant(), activatePTT(), deactivatePTT(), setVADSpeaking(), startScreenShare(), stopScreenShare()
-   `sfuService` - mediasoup-client wrapper: initDevice(), createSendTransport(), createRecvTransport(), produceAudio(), produceVideo(), produceScreen(), consume(), closeProducer()

**API Clients (shared/api):**

-   `ApiClient` (HTTP) - Base client with get/post/put/delete methods, 10s timeout, JWT token support
-   `WebSocketClient` - WebSocket wrapper with connect/disconnect/send/on methods, auto-reconnect

**Shared Hooks (shared/lib/hooks):**

-   `usePTT(enabled)` - Push-to-Talk keyboard handler, returns { pttKey, pttActive }
-   `useVAD({ enabled, sensitivity, onSpeechStart, onSpeechEnd })` - Voice Activity Detection, accepts sensitivity parameter ('low'|'medium'|'high'), returns { userSpeaking, loading, errored }
-   `useStores()` - Access to RootStore with all MobX stores

### React 19 Specifics

-   **Latest Features**: Project uses React 19.1.1 with latest DOM APIs
-   **StrictMode**: Always wrapped in React.StrictMode
-   **Modern Hooks**: Use latest React Hooks patterns

### Build & Deployment

-   **Vite Config**: Minimal setup with React plugin only
-   **Output**: Builds to `dist/` (git-ignored)
-   **TypeScript**: Separate build info files in `node_modules/.tmp/`

## Development Guidelines

### When Working on Frontend

1. Always work in `frontend/` directory
2. Use `pnpm` commands (workspace is configured)
3. Follow React 19 patterns and hooks
4. Maintain strict TypeScript compliance
5. Test HMR during development with `pnpm dev`
6. Follow FSD layer imports: shared → entities → features → widgets → pages → app

### When Planning Backend

-   Start with Express.js + Node.js for rapid prototyping
-   Consider Go migration for performance-critical features later
-   WebSocket server for real-time messaging
-   WebRTC signaling server for voice/video coordination
-   Plan for horizontal scaling of voice servers

### Routing Patterns

**Routes Configuration:**

```typescript
// app/router/index.tsx
/ → HomePage (main page with 3-column layout: ChannelSidebar | Content | MembersList)
/channels/:channelId → ChannelPage (channel with chat)
/settings → SettingsPage (user settings with tabs)
/login → LoginPage (register/login/guest authentication)

// Protected routes require authentication (check AuthStore.isAuthenticated)
```

**Navigation:**

-   Use `useNavigate()` hook from react-router-dom
-   Use `useParams()` to get route parameters
-   Lazy loading for code splitting with dynamic imports
-   Navigate from sidebar by clicking channels
-   Settings button navigates to /settings
-   Protected routes redirect to /login if not authenticated

**Example:**

```typescript
const navigate = useNavigate();
navigate('/channels/channel-id'); // Programmatic navigation
```

### Common Patterns to Follow

-   **Imports**: Use `.tsx` extensions explicitly for components when using `verbatimModuleSyntax`
-   **Types**: Leverage strict TypeScript for all code
-   **Assets**: Use Vite's asset system for imports
-   **Components**: Export default from component files
-   **Routing**: Use `useNavigate()` for programmatic navigation
-   **API Calls**: Use service layer functions (channelService, userService, messageService, authService)
-   **WebSocket**: Single global `wsClient` instance from `shared/api`
-   **Styling**: Component-level CSS files with Discord color scheme, use SCSS modules for new components
-   **Authentication**: JWT tokens stored in localStorage, auto-refresh on 401 errors
-   **Internationalization**: Use `useTranslation()` hook for all user-facing strings, supports ru/en languages
-   **WebRTC**: Use rtcService for peer connections, VoiceAudioManager for audio playback

### Internationalization (i18n)

**Setup:**

-   i18next 25.6.0 + react-i18next 16.1.4 + i18next-browser-languagedetector 8.2.0
-   Automatic language detection (localStorage → browser → fallback to 'en')
-   Supported languages: Russian (ru), English (en)
-   Configuration: `src/shared/i18n/config.ts`
-   Translations: `src/shared/i18n/locales/{ru,en}.ts`

**Usage in components:**

```tsx
import { useTranslation } from '@shared/lib';

const MyComponent = () => {
    const { t, i18n } = useTranslation();

    return (
        <div>
            <h1>{t('home.welcome')}</h1>
            <button onClick={() => i18n.changeLanguage('ru')}>{t('settings.russian')}</button>
        </div>
    );
};
```

**Available translation keys:**

-   `common.*` - Loading, error, success, cancel, save, etc.
-   `auth.*` - Login, register, email, password, etc.
-   `channels.*` - Text channels, voice channels, create, delete, etc.
-   `messages.*` - Type message, send, edit, delete, etc.
-   `voice.*` - Mute, deafen, participants, speaking, etc.
-   `settings.*` - Title, voice & video, language, appearance, etc.
-   `users.*` - Online, offline, away, members, etc.
-   `home.*` - Welcome, select channel, no channels, etc.

**Language switcher component:**

```tsx
import { LanguageSwitcher } from '@shared/ui';

<LanguageSwitcher />; // Shows 🇷🇺 🇬🇧 buttons
```

**Best practices:**

-   ALWAYS use `t()` for user-facing strings, NEVER hardcode text
-   Keep translation keys consistent across locales
-   Use nested keys for organization (e.g., `settings.voiceVideo`)
-   Use interpolation for dynamic values: `t('users.onlineCount', { count: 5 })`
-   Test UI in both languages before committing

**Documentation:** See `docs/I18N_GUIDE.md` for detailed guide
