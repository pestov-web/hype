import { useTranslation } from 'react-i18next';
import styles from './LanguageSwitcher.module.scss';

export const LanguageSwitcher = () => {
    const { i18n, t } = useTranslation();

    const changeLanguage = (lang: string) => {
        i18n.changeLanguage(lang);
    };

    return (
        <div className={styles.languageSwitcher}>
            <label className={styles.label}>{t('settings.language')}</label>
            <div className={styles.buttons}>
                <button
                    className={`${styles.button} ${i18n.language === 'ru' ? styles.active : ''}`}
                    onClick={() => changeLanguage('ru')}
                >
                    🇷🇺 {t('settings.russian')}
                </button>
                <button
                    className={`${styles.button} ${i18n.language === 'en' ? styles.active : ''}`}
                    onClick={() => changeLanguage('en')}
                >
                    🇬🇧 {t('settings.english')}
                </button>
            </div>
        </div>
    );
};
