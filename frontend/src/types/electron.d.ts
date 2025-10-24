/**
 * TypeScript типы для Electron API в renderer процессе
 *
 * Добавляет типизацию для window.electron, чтобы TypeScript
 * понимал доступные методы Electron API
 */

import type { ElectronAPI } from '../../electron/preload';

declare global {
    interface Window {
        electron: ElectronAPI;
    }
}

export {};
