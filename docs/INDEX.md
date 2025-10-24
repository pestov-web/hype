# Documentation Index

**Полный справочник по проекту Hype** - Discord-like платформа реального времени с голосовыми каналами

---

## 📚 Навигация по документации

### Начало работы

-   **[README.md](../README.md)** - Быстрый старт, установка, основные команды
-   **[DEPLOYMENT.md](../DEPLOYMENT.md)** - Production deployment на VPS
-   **[CHANGELOG_VAD.md](../CHANGELOG_VAD.md)** - История изменений

---

## 🏗️ Архитектура

### Frontend (Feature-Sliced Design)

-   **[frontend/src/app/README.md](../frontend/src/app/README.md)** - App слой (layouts, providers, router, MobX stores)
-   **[frontend/src/pages/README.md](../frontend/src/pages/README.md)** - Pages слой (HomePage, ChannelPage, SettingsPage, LoginPage)
-   **[frontend/src/widgets/README.md](../frontend/src/widgets/README.md)** - Widgets слой (ChannelSidebar, UserProfilePanel, MembersList)
-   **[frontend/src/features/README.md](../frontend/src/features/README.md)** - Features слой (планируется, миграция)
-   **[frontend/src/entities/README.md](../frontend/src/entities/README.md)** - Entities слой (User, Channel, Message, Voice типы)
-   **[frontend/src/shared/README.md](../frontend/src/shared/README.md)** - Shared слой (API, i18n, hooks, services, UI components)

### Backend

-   **[backend/README.md](../backend/README.md)** - Backend архитектура (Express, WebSocket, mediasoup SFU, Prisma)

---

## 🎙️ Voice & Video

### WebRTC Architecture

-   **[PURE_SFU_APPROACH.md](../PURE_SFU_APPROACH.md)** ⭐ - Почему Pure SFU вместо Hybrid (НАЧНИ С ЭТОГО!)
-   **[docs/PHASE_1_SFU_SETUP.md](../docs/PHASE_1_SFU_SETUP.md)** - Пошаговая реализация SFU (2 недели)
-   **[docs/SCALABILITY_ARCHITECTURE.md](../docs/SCALABILITY_ARCHITECTURE.md)** - План масштабирования до 100,000+ пользователей
-   **[VOICE_ARCHITECTURE.md](../VOICE_ARCHITECTURE.md)** - OLD P2P архитектура (DEPRECATED, только для справки)

### Voice Activity Detection (VAD)

-   **[docs/VAD_INTEGRATION.md](../docs/VAD_INTEGRATION.md)** - VAD с @ricky0123/vad-react, технические детали
-   **[docs/VAD_MIGRATION.md](../docs/VAD_MIGRATION.md)** - Миграция с custom VAD на библиотеку
-   **[docs/VAD_TESTING.md](../docs/VAD_TESTING.md)** - Тестирование и troubleshooting

---

## 🌍 Internationalization (i18n)

-   **[docs/I18N_GUIDE.md](../docs/I18N_GUIDE.md)** - i18next конфигурация, использование, переводы (ru/en)

---

## 🛠️ Development Guides

### Code Style & Patterns

-   **[.github/copilot-instructions.md](../.github/copilot-instructions.md)** - Главные инструкции для Copilot (conventions, architecture, tech stack)

### Layer-specific Guides

Каждая папка FSD имеет свой README с:

-   Назначением слоя
-   Структурой файлов
-   Правилами использования (что можно, что нельзя)
-   Code examples
-   Tech stack

---

## 📂 Структура проекта (с ссылками на документацию)

```
hype/
├── README.md                              # Быстрый старт, основная информация
├── DEPLOYMENT.md                          # Production deployment guide
├── PURE_SFU_APPROACH.md                   # ⭐ Архитектурное решение SFU
├── VOICE_ARCHITECTURE.md                  # Старая P2P архитектура (deprecated)
├── .github/
│   └── copilot-instructions.md            # Главные conventions для Copilot
├── docs/
│   ├── PHASE_1_SFU_SETUP.md              # SFU реализация за 2 недели
│   ├── SCALABILITY_ARCHITECTURE.md        # План масштабирования
│   ├── VAD_INTEGRATION.md                 # VAD техническая документация
│   ├── VAD_MIGRATION.md                   # Миграция на @ricky0123/vad-react
│   ├── VAD_TESTING.md                     # Тестирование VAD
│   ├── I18N_GUIDE.md                      # i18next usage guide
│   └── INDEX.md                           # 👈 ВЫ ЗДЕСЬ (навигация)
├── frontend/
│   └── src/
│       ├── app/
│       │   └── README.md                  # App layer: stores, router, layouts
│       ├── pages/
│       │   └── README.md                  # Pages: HomePage, ChannelPage, Settings
│       ├── widgets/
│       │   └── README.md                  # Widgets: Sidebar, ProfilePanel, MembersList
│       ├── features/
│       │   └── README.md                  # Features: планируется (migration plan)
│       ├── entities/
│       │   └── README.md                  # Entities: User, Channel, Message types
│       └── shared/
│           └── README.md                  # Shared: API, i18n, services, UI
└── backend/
    └── README.md                          # Backend: Express, WebSocket, SFU, Prisma
```

---

## 🚀 Быстрые ссылки по задачам

### "Хочу начать разработку"

1. [README.md](../README.md) - установка и запуск
2. [.github/copilot-instructions.md](../.github/copilot-instructions.md) - code conventions
3. [frontend/src/shared/README.md](../frontend/src/shared/README.md) - API клиенты и сервисы
4. [frontend/src/app/README.md](../frontend/src/app/README.md) - MobX stores

### "Хочу понять архитектуру голоса"

1. [PURE_SFU_APPROACH.md](../PURE_SFU_APPROACH.md) ⭐ - **НАЧНИ ОТСЮДА!**
2. [docs/PHASE_1_SFU_SETUP.md](../docs/PHASE_1_SFU_SETUP.md) - implementation guide
3. [backend/README.md](../backend/README.md) - mediasoup SFU backend
4. [frontend/src/shared/README.md](../frontend/src/shared/README.md) - rtcService, sfuService

### "Хочу добавить новую фичу"

1. [frontend/src/features/README.md](../frontend/src/features/README.md) - Features layer guide
2. [frontend/src/shared/README.md](../frontend/src/shared/README.md) - Shared UI components
3. [.github/copilot-instructions.md](../.github/copilot-instructions.md) - FSD conventions

### "Хочу работать с UI"

1. [frontend/src/shared/README.md](../frontend/src/shared/README.md) - UI components catalog
2. [frontend/src/widgets/README.md](../frontend/src/widgets/README.md) - Complex widgets
3. [.github/copilot-instructions.md](../.github/copilot-instructions.md) - SCSS variables

### "Хочу настроить VAD"

1. [docs/VAD_INTEGRATION.md](../docs/VAD_INTEGRATION.md) - Technical details
2. [docs/VAD_TESTING.md](../docs/VAD_TESTING.md) - Testing guide
3. [frontend/src/shared/README.md](../frontend/src/shared/README.md) - useVAD hook

### "Хочу добавить i18n перевод"

1. [docs/I18N_GUIDE.md](../docs/I18N_GUIDE.md) - i18next usage guide
2. [frontend/src/shared/README.md](../frontend/src/shared/README.md) - i18n configuration
3. `frontend/src/shared/i18n/locales/` - translation files

### "Хочу деплоить в production"

1. [DEPLOYMENT.md](../DEPLOYMENT.md) - Production deployment
2. [docs/SCALABILITY_ARCHITECTURE.md](../docs/SCALABILITY_ARCHITECTURE.md) - Scaling plan

---

## 📖 Как читать документацию

### Для новых разработчиков

**Порядок изучения**:

1. [README.md](../README.md) - Общее понимание проекта
2. [.github/copilot-instructions.md](../.github/copilot-instructions.md) - Conventions & tech stack
3. **Frontend FSD архитектура** (по порядку):
    - [shared/README.md](../frontend/src/shared/README.md) - Базовые блоки
    - [entities/README.md](../frontend/src/entities/README.md) - Типы данных
    - [features/README.md](../frontend/src/features/README.md) - Бизнес-функции
    - [widgets/README.md](../frontend/src/widgets/README.md) - Сложные UI блоки
    - [pages/README.md](../frontend/src/pages/README.md) - Страницы
    - [app/README.md](../frontend/src/app/README.md) - Глобальная инфраструктура
4. [backend/README.md](../backend/README.md) - Backend API
5. [PURE_SFU_APPROACH.md](../PURE_SFU_APPROACH.md) - Архитектура голоса

### Для архитекторов

**Фокус на**:

1. [PURE_SFU_APPROACH.md](../PURE_SFU_APPROACH.md) - Архитектурное решение
2. [docs/SCALABILITY_ARCHITECTURE.md](../docs/SCALABILITY_ARCHITECTURE.md) - Scaling roadmap
3. [docs/PHASE_1_SFU_SETUP.md](../docs/PHASE_1_SFU_SETUP.md) - Implementation plan
4. [backend/README.md](../backend/README.md) - Backend architecture

### Для DevOps

**Фокус на**:

1. [DEPLOYMENT.md](../DEPLOYMENT.md) - Production setup
2. [docs/SCALABILITY_ARCHITECTURE.md](../docs/SCALABILITY_ARCHITECTURE.md) - Infrastructure requirements
3. [backend/README.md](../backend/README.md) - Environment variables, ports

---

## 🆕 Последние обновления

### Январь 2025

-   ✅ Создана comprehensive документация для всех FSD слоев
-   ✅ Документирована backend архитектура
-   ✅ Pure SFU реализация (mediasoup)
-   ✅ Authentication (JWT + PostgreSQL)
-   ✅ Voice modes (VAD + PTT)
-   ✅ Internationalization (ru/en)
-   ✅ Speaking indicators в UI

### Планы на Февраль 2025

-   📋 Multi-region SFU deployment (US, EU, Asia)
-   📋 Output device settings (speakers)
-   📋 Video quality presets (720p, 1080p)
-   📋 Cascade SFU для больших каналов (100+ участников)

---

## ❓ FAQ

### Q: Где найти примеры кода?

**A**: Каждый layer README содержит code examples. Начни с [shared/README.md](../frontend/src/shared/README.md)

### Q: Как работает голосовая связь?

**A**: [PURE_SFU_APPROACH.md](../PURE_SFU_APPROACH.md) → [docs/PHASE_1_SFU_SETUP.md](../docs/PHASE_1_SFU_SETUP.md)

### Q: Какие SCSS переменные доступны?

**A**: [.github/copilot-instructions.md](../.github/copilot-instructions.md) → секция "SCSS Variables"

### Q: Как добавить новую страницу?

**A**: [frontend/src/pages/README.md](../frontend/src/pages/README.md) → "Правила использования"

### Q: Где MobX stores?

**A**: [frontend/src/app/README.md](../frontend/src/app/README.md) → секция "MobX Stores"

### Q: Как масштабировать до 100,000+ пользователей?

**A**: [docs/SCALABILITY_ARCHITECTURE.md](../docs/SCALABILITY_ARCHITECTURE.md)

---

## 🤝 Contribution Guidelines

При создании новой функции:

1. Следуй FSD архитектуре (см. [features/README.md](../frontend/src/features/README.md))
2. Добавь i18n переводы (см. [docs/I18N_GUIDE.md](../docs/I18N_GUIDE.md))
3. Обнови соответствующий README
4. Добавь примеры кода в документацию
5. Обнови [CHANGELOG_VAD.md](../CHANGELOG_VAD.md) если нужно

---

## 📧 Контакты

-   **GitHub**: [pestov-web](https://github.com/pestov-web)
-   **Issues**: [github.com/pestov-web/hype/issues](https://github.com/pestov-web/hype/issues)

---

**Последнее обновление**: Январь 2025  
**Версия документации**: 1.0.0
