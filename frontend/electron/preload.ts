import { contextBridge, ipcRenderer } from 'electron';

export type ElectronAPI = {
    platform: string;
    versions: {
        node: string;
        chrome: string;
        electron: string;
    };
    getAppVersion: () => Promise<string>;
    minimizeWindow: () => void;
    maximizeWindow: () => void;
    closeWindow: () => void;
    showNotification: (title: string, body?: string) => void;
    getTheme: () => Promise<{ shouldUseDarkColors: boolean; themeSource: string }>;
    onThemeUpdated: (callback: (payload: { shouldUseDarkColors: boolean; themeSource: string }) => void) => () => void;
    onWindowMaximized: (callback: (isMaximized: boolean) => void) => () => void;
};

const electronAPI: ElectronAPI = {
    platform: process.platform,
    versions: {
        node: process.versions.node,
        chrome: process.versions.chrome,
        electron: process.versions.electron,
    },
    getAppVersion: () => ipcRenderer.invoke('app:getVersion'),
    minimizeWindow: () => ipcRenderer.send('app:window:minimize'),
    maximizeWindow: () => ipcRenderer.send('app:window:maximize'),
    closeWindow: () => ipcRenderer.send('app:window:close'),
    showNotification: (title: string, body?: string) => {
        ipcRenderer.send('app:show-notification', { title, body });
    },
    getTheme: () => ipcRenderer.invoke('app:get-theme'),
    onThemeUpdated: (callback) => {
        const channel = 'app:theme-updated';
        ipcRenderer.on(channel, (_event, payload) => {
            callback(payload);
        });
        return () => {
            ipcRenderer.removeAllListeners(channel);
        };
    },
    onWindowMaximized: (callback) => {
        const channel = 'app:window:isMaximized';
        const handler = (_event: unknown, payload: boolean) => callback(payload);
        ipcRenderer.on(channel, handler);
        return () => {
            ipcRenderer.removeListener(channel, handler);
        };
    },
};

contextBridge.exposeInMainWorld('electron', electronAPI);
