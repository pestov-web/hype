# i18n Integration Guide

## Overview

Hype project now supports internationalization (i18n) using **i18next** and **react-i18next**. This allows the application to support multiple languages.

## Supported Languages

-   🇷🇺 **Russian** (ru) - Default
-   🇬🇧 **English** (en)

## Files Structure

```
frontend/src/shared/i18n/
├── config.ts              # i18next configuration
├── index.ts               # Re-exports useTranslation hook
└── locales/
    ├── ru.ts              # Russian translations
    └── en.ts              # English translations
```

## Installation

Dependencies already installed:

```json
{
    "i18next": "^25.6.0",
    "react-i18next": "^16.1.4",
    "i18next-browser-languagedetector": "^8.2.0"
}
```

## Usage

### 1. Import the hook

```tsx
import { useTranslation } from '@shared/lib';
```

### 2. Use in component

```tsx
export const MyComponent = () => {
    const { t } = useTranslation();

    return (
        <div>
            <h1>{t('home.welcome')}</h1>
            <p>{t('home.selectChannel')}</p>
        </div>
    );
};
```

### 3. With interpolation

```tsx
const { t } = useTranslation();

// In locales file: "onlineCount": "Online — {{count}}"
<p>{t('users.onlineCount', { count: 42 })}</p>;
// Output: "В сети — 42" (ru) or "Online — 42" (en)
```

## Language Switcher Component

Located at `@shared/ui/LanguageSwitcher`

```tsx
import { LanguageSwitcher } from '@shared/ui';

// Use in any component
<LanguageSwitcher />;
```

**Features:**

-   Visual flag indicators (🇷🇺 🇬🇧)
-   Active language highlighted
-   Saves preference to localStorage (`hype_language`)

## Translation Keys

### Common

```typescript
t('common.loading'); // "Загрузка..." / "Loading..."
t('common.error'); // "Ошибка" / "Error"
t('common.save'); // "Сохранить" / "Save"
t('common.cancel'); // "Отмена" / "Cancel"
```

### Auth

```typescript
t('auth.login'); // "Вход" / "Login"
t('auth.register'); // "Регистрация" / "Register"
t('auth.email'); // "Email" / "Email"
t('auth.password'); // "Пароль" / "Password"
```

### Channels

```typescript
t('channels.textChannels'); // "Текстовые каналы" / "Text Channels"
t('channels.voiceChannels'); // "Голосовые каналы" / "Voice Channels"
```

### Voice

```typescript
t('voice.mute'); // "Выключить микрофон" / "Mute"
t('voice.deafen'); // "Выключить звук" / "Deafen"
t('voice.participants'); // "Участники" / "Participants"
```

### Settings

```typescript
t('settings.title'); // "Настройки" / "Settings"
t('settings.voiceVideo'); // "Голос и видео" / "Voice & Video"
t('settings.language'); // "Язык" / "Language"
```

## Adding New Translations

### 1. Add to Russian locale (`locales/ru.ts`)

```typescript
export const ru = {
    translation: {
        myFeature: {
            title: 'Заголовок функции',
            description: 'Описание функции',
        },
    },
};
```

### 2. Add to English locale (`locales/en.ts`)

```typescript
export const en = {
    translation: {
        myFeature: {
            title: 'Feature Title',
            description: 'Feature description',
        },
    },
};
```

### 3. Use in component

```tsx
const { t } = useTranslation();

<h2>{t('myFeature.title')}</h2>
<p>{t('myFeature.description')}</p>
```

## Language Detection

i18next automatically detects user language from:

1. **localStorage** (`hype_language` key) - highest priority
2. **Browser language** (`navigator.language`)
3. **HTML tag** (`<html lang="...">`)
4. **Fallback**: English (en)

## Programmatic Language Change

```tsx
import { useTranslation } from '@shared/lib';

const { i18n } = useTranslation();

// Change language
i18n.changeLanguage('ru'); // Switch to Russian
i18n.changeLanguage('en'); // Switch to English

// Get current language
const currentLang = i18n.language; // "ru" or "en"
```

## Examples

### HomePage

```tsx
import { useTranslation } from '@shared/lib';

export const HomePage = observer(() => {
    const { t } = useTranslation();

    return (
        <div>
            <h1>{t('home.welcome')}</h1>
            <p>{t('home.selectChannel')}</p>
        </div>
    );
});
```

### SettingsPage

Already integrated with:

-   Sidebar navigation labels
-   Section headings
-   LanguageSwitcher in Appearance tab

## Best Practices

1. **Use nested keys** for better organization:

    ```typescript
    t('settings.voiceVideo')  ✅
    t('settingsVoiceVideo')   ❌
    ```

2. **Keep keys consistent** across locales (same structure)

3. **Use interpolation** for dynamic values:

    ```typescript
    t('users.onlineCount', { count: users.length });
    ```

4. **Avoid inline strings** in JSX - always use translation keys

5. **Test both languages** when adding new features

## Integration Points

✅ **Already integrated:**

-   HomePage (loading, error, welcome messages)
-   SettingsPage (sidebar, headings, language switcher)
-   LanguageSwitcher component

📋 **TODO (optional):**

-   ChannelSidebar labels
-   VoicePanel buttons
-   LoginPage form labels
-   MessageInput placeholder
-   Error messages

## Debugging

Enable debug mode in `shared/i18n/config.ts`:

```typescript
i18n.init({
    debug: true, // ← Set to true
    // ...
});
```

This will log:

-   Missing translation keys
-   Language detection steps
-   Resource loading

## Production Build

i18n adds ~50KB to bundle (minified + gzipped):

-   i18next: ~20KB
-   react-i18next: ~15KB
-   language-detector: ~5KB
-   Locale files: ~10KB

**Performance:** Negligible impact on runtime (~1-2ms initialization).

## Further Reading

-   [i18next documentation](https://www.i18next.com/)
-   [react-i18next documentation](https://react.i18next.com/)
-   [Language detector plugin](https://github.com/i18next/i18next-browser-languageDetector)
