import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import { ru } from './locales/ru';
import { en } from './locales/en';

// Configure i18next
i18n
    // Detect user language
    .use(LanguageDetector)
    // Pass the i18n instance to react-i18next
    .use(initReactI18next)
    // Initialize i18next
    .init({
        resources: {
            ru,
            en,
        },
        fallbackLng: 'en',
        debug: false, // Set to true for debugging
        interpolation: {
            escapeValue: false, // React already escapes values
        },
        detection: {
            // Order of language detection
            order: ['localStorage', 'navigator', 'htmlTag'],
            // Cache user language
            caches: ['localStorage'],
            lookupLocalStorage: 'hype_language',
        },
    });

export default i18n;
