/**
 * Настройки аудио для конкретного пользователя
 */
export interface UserAudioSettings {
    volume: number; // 0.0 - 1.0
    muted: boolean;
}

const STORAGE_KEY = 'hype_user_audio_settings';

/**
 * Получить все настройки аудио пользователей
 */
function getAllSettings(): Record<string, UserAudioSettings> {
    try {
        const data = localStorage.getItem(STORAGE_KEY);
        return data ? JSON.parse(data) : {};
    } catch (error) {
        console.error('Failed to load user audio settings:', error);
        return {};
    }
}

/**
 * Сохранить все настройки
 */
function saveAllSettings(settings: Record<string, UserAudioSettings>): void {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch (error) {
        console.error('Failed to save user audio settings:', error);
    }
}

/**
 * Получить настройки аудио для конкретного пользователя
 */
export function getUserAudioSettings(userId: string): UserAudioSettings {
    const allSettings = getAllSettings();
    return (
        allSettings[userId] || {
            volume: 1.0,
            muted: false,
        }
    );
}

/**
 * Установить громкость для пользователя
 */
export function setUserVolume(userId: string, volume: number): void {
    const allSettings = getAllSettings();
    const userSettings = allSettings[userId] || { volume: 1.0, muted: false };

    allSettings[userId] = {
        ...userSettings,
        volume: Math.max(0, Math.min(1, volume)), // Clamp 0-1
    };

    saveAllSettings(allSettings);
}

/**
 * Установить mute для пользователя
 */
export function setUserMuted(userId: string, muted: boolean): void {
    const allSettings = getAllSettings();
    const userSettings = allSettings[userId] || { volume: 1.0, muted: false };

    allSettings[userId] = {
        ...userSettings,
        muted,
    };

    saveAllSettings(allSettings);
}

/**
 * Переключить mute для пользователя
 */
export function toggleUserMuted(userId: string): boolean {
    const settings = getUserAudioSettings(userId);
    const newMuted = !settings.muted;
    setUserMuted(userId, newMuted);
    return newMuted;
}

/**
 * Сбросить настройки для пользователя
 */
export function resetUserAudioSettings(userId: string): void {
    const allSettings = getAllSettings();
    delete allSettings[userId];
    saveAllSettings(allSettings);
}
