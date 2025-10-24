/**
 * Проверяет, запущено ли приложение в Electron
 */
export const isElectron = (): boolean => {
    return typeof window !== 'undefined' && window.electron !== undefined;
};

/**
 * Получает информацию о платформе Electron
 */
export const getElectronPlatform = (): string | null => {
    return isElectron() ? window.electron!.platform : null;
};

/**
 * Получает версии Electron компонентов
 */
export const getElectronVersions = () => {
    return isElectron() ? window.electron!.versions : null;
};
