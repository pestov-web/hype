# i18n Quick Start

## ✅ What's Done

-   ✅ Installed i18next, react-i18next, language detector
-   ✅ Created Russian (ru) and English (en) translations
-   ✅ Configured automatic language detection (localStorage → browser → fallback)
-   ✅ Created LanguageSwitcher component (🇷🇺 🇬🇧)
-   ✅ Integrated in HomePage and SettingsPage

## 🚀 Usage

### 1. Import hook

```tsx
import { useTranslation } from '@shared/lib';
```

### 2. Use in component

```tsx
const { t } = useTranslation();

return <h1>{t('home.welcome')}</h1>;
```

### 3. Change language programmatically

```tsx
const { i18n } = useTranslation();

i18n.changeLanguage('ru'); // Russian
i18n.changeLanguage('en'); // English
```

## 📁 Files Structure

```
frontend/src/shared/i18n/
├── config.ts           # i18next setup
├── index.ts            # Exports
└── locales/
    ├── ru.ts           # Russian translations
    └── en.ts           # English translations
```

## 🎨 UI Components

### LanguageSwitcher

```tsx
import { LanguageSwitcher } from '@shared/ui';

<LanguageSwitcher />;
```

**Location in app:** Settings → Appearance tab

## 📚 Translation Keys

See `docs/I18N_GUIDE.md` for full list of available keys.

**Common keys:**

```typescript
t('common.loading');
t('auth.login');
t('settings.title');
t('voice.mute');
t('home.welcome');
```

## ➕ Adding New Translations

1. Add to `locales/ru.ts`:

    ```typescript
    mySection: {
        title: 'Заголовок',
    }
    ```

2. Add to `locales/en.ts`:

    ```typescript
    mySection: {
        title: 'Title',
    }
    ```

3. Use in component:
    ```tsx
    t('mySection.title');
    ```

## 🔍 Current Language

Stored in: `localStorage['hype_language']`

Access via:

```tsx
const { i18n } = useTranslation();
console.log(i18n.language); // "ru" or "en"
```

## 📖 Full Documentation

See: `docs/I18N_GUIDE.md`
