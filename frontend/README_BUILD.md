# 🚀 Сборка проекта

Проект поддерживает два режима: **веб-приложение** (по умолчанию) и **Electron десктоп-приложение**.

## 🌐 Веб-приложение (по умолчанию)

### Разработка

```bash
pnpm dev
```

Открывается на http://localhost:5173

### Продакшн сборка

```bash
pnpm build
```

Результат в `dist/`

### Предпросмотр

```bash
pnpm preview
```

---

## 🖥️ Electron приложение

### Разработка

```bash
pnpm dev:electron
```

Открывается окно Electron с HMR

### Продакшн сборка

```bash
pnpm build:electron
```

Результат в `dist-vad-fix/`:

-   Windows: `.exe` установщик
-   macOS: `.dmg` образ
-   Linux: `.AppImage` / `.deb`

---

## 📦 Как это работает

**Переменная `ENABLE_ELECTRON`:**

-   НЕ установлена → веб-версия (Vite только с React)
-   `ENABLE_ELECTRON=true` → Electron (Vite + React + Electron плагины)

**Скрипты используют `cross-env` для кроссплатформенности:**

```json
{
    "dev": "vite", // WEB
    "dev:electron": "cross-env ENABLE_ELECTRON=true vite", // ELECTRON
    "build": "tsc -b && vite build", // WEB
    "build:electron": "cross-env ENABLE_ELECTRON=true tsc -b && vite build && electron-builder" // ELECTRON
}
```

**`vite.config.ts` проверяет переменную:**

```typescript
const ENABLE_ELECTRON = process.env.ENABLE_ELECTRON === 'true';

if (ENABLE_ELECTRON) {
  plugins.push(electron([...]), renderer());
}
```

---

## 🔍 Определение режима в коде

```typescript
import { isElectron, getElectronPlatform, getElectronVersions } from '@shared/lib';

if (isElectron()) {
    console.log('Running in Electron');
    console.log('Platform:', getElectronPlatform()); // 'win32' | 'darwin' | 'linux'
} else {
    console.log('Running in browser');
}
```

---

## ✅ Проверка

-   ✅ `pnpm dev` - работает веб без Electron
-   ✅ `pnpm build` - собирает веб без Electron
-   ⏳ `pnpm dev:electron` - запускает Electron (требует настроенный main.ts)
-   ⏳ `pnpm build:electron` - собирает установщики Electron

---

**Совет:** Для повседневной разработки используйте `pnpm dev` (быстрее). Electron нужен только для тестирования десктопных функций.
