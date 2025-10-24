import { app, BrowserWindow, ipcMain, nativeTheme, Notification, protocol } from 'electron';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL'];
const isDev = !!VITE_DEV_SERVER_URL;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let mainWindow: BrowserWindow | null = null;

function createMainWindow() {
    // В dev: __dirname это просто electron/
    // В prod: __dirname это app.asar/dist-electron/main/
    const preloadPath = isDev ? path.join(__dirname, 'preload.js') : path.join(__dirname, '../preload/preload.js');

    mainWindow = new BrowserWindow({
        width: 1280,
        height: 800,
        minWidth: 960,
        minHeight: 640,
        title: 'Hype',
        backgroundColor: nativeTheme.shouldUseDarkColors ? '#202225' : '#ffffff',
        webPreferences: {
            preload: preloadPath,
            contextIsolation: true,
            nodeIntegration: false,
            sandbox: false,
            webSecurity: false, // Отключаем для доступа к файлам
        },
    });

    // Настраиваем CSP для production
    if (!isDev) {
        mainWindow.webContents.session.webRequest.onHeadersReceived((details, callback) => {
            callback({
                responseHeaders: {
                    ...details.responseHeaders,
                    'Content-Security-Policy': [
                        "default-src 'self' 'unsafe-inline' 'unsafe-eval' app: file: data: blob: https://rtc.pestov-web.ru wss://ws.pestov-web.ru",
                    ],
                },
            });
        });
    }

    if (isDev && VITE_DEV_SERVER_URL) {
        mainWindow.loadURL(VITE_DEV_SERVER_URL);
        mainWindow.webContents.openDevTools({ mode: 'detach' });
    } else {
        // Production: ASAR отключен, файлы в app/dist/
        const appPath = app.getAppPath();
        const indexHtml = path.join(appPath, 'dist', 'index.html');

        console.log('=== Electron Production Debug ===');
        console.log('__dirname:', __dirname);
        console.log('app.getAppPath():', appPath);
        console.log('Loading index.html from:', indexHtml);

        mainWindow.loadFile(indexHtml).catch((err) => {
            console.error('Failed to load index.html:', err);
        });

        // Открываем DevTools в production для отладки
        mainWindow.webContents.openDevTools({ mode: 'detach' });
    }

    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}

if (!app.requestSingleInstanceLock()) {
    app.quit();
    process.exit(0);
}

app.on('second-instance', () => {
    if (mainWindow) {
        if (mainWindow.isMinimized()) {
            mainWindow.restore();
        }
        mainWindow.focus();
    }
});

app.whenReady().then(() => {
    // Перехватываем file:// протокол для правильной загрузки файлов (ASAR отключен)
    protocol.interceptFileProtocol('file', (request, callback) => {
        let url = request.url.replace('file:///', '');

        // Windows path fix
        if (process.platform === 'win32') {
            url = url.replace(/^([a-z]):/i, '$1:');
        }

        const appPath = app.getAppPath();

        console.log('🔧 File protocol intercepted:', request.url);

        // Если путь содержит /assets/ - это запрос к статическим ресурсам
        // Перенаправляем на dist/
        if (url.includes('/dist/assets/')) {
            const assetPath = url.split('/dist/assets/')[1];
            const filePath = path.join(appPath, 'dist', 'assets', assetPath);
            console.log('  → Asset resolved to:', filePath);
            callback({ path: filePath });
            return;
        }

        // Если путь содержит /onnxruntime-web/ - исправляем путь
        if (url.includes('/dist/assets/onnxruntime-web/')) {
            const modulePath = url.split('/dist/assets/onnxruntime-web/')[1];
            const filePath = path.join(appPath, 'dist', 'onnxruntime-web', modulePath);
            console.log('  → ONNX Runtime resolved to:', filePath);
            callback({ path: filePath });
            return;
        }

        // Для всех остальных файлов
        callback({ path: path.normalize(url) });
    });

    createMainWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createMainWindow();
        }
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

ipcMain.handle('app:getVersion', () => app.getVersion());
ipcMain.on('app:window:minimize', () => {
    mainWindow?.minimize();
});
ipcMain.on('app:window:maximize', () => {
    if (!mainWindow) {
        return;
    }

    if (mainWindow.isMaximized()) {
        mainWindow.unmaximize();
    } else {
        mainWindow.maximize();
    }

    mainWindow.webContents.send('app:window:isMaximized', mainWindow.isMaximized());
});
ipcMain.on('app:window:close', () => {
    mainWindow?.close();
});
ipcMain.on('app:show-notification', (_event, payload: { title: string; body?: string }) => {
    if (!payload || !payload.title) {
        return;
    }

    const notification = new Notification({
        title: payload.title,
        body: payload.body ?? '',
    });

    notification.show();
});
ipcMain.handle('app:get-theme', () => ({
    shouldUseDarkColors: nativeTheme.shouldUseDarkColors,
    themeSource: nativeTheme.themeSource,
}));
nativeTheme.on('updated', () => {
    mainWindow?.webContents.send('app:theme-updated', {
        shouldUseDarkColors: nativeTheme.shouldUseDarkColors,
        themeSource: nativeTheme.themeSource,
    });
});
