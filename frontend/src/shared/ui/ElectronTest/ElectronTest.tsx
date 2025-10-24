import { useState } from 'react';

/**
 * Компонент для тестирования Electron API
 *
 * Показывает доступность Electron API и позволяет протестировать
 * базовые функции управления окном и уведомлениями
 */
export const ElectronTest = () => {
    const [version, setVersion] = useState<string>('');
    const isElectron = typeof window !== 'undefined' && window.electron;

    const handleGetVersion = async () => {
        if (window.electron) {
            const ver = await window.electron.getAppVersion();
            setVersion(ver);
        }
    };

    const handleNotification = () => {
        if (window.electron) {
            window.electron.showNotification('Тест уведомления', 'Electron API работает! 🎉');
        }
    };

    if (!isElectron) {
        return (
            <div style={{ padding: '20px', background: '#2f3136', borderRadius: '8px', margin: '20px' }}>
                <h3 style={{ color: '#ffffff' }}>🌐 Web режим</h3>
                <p style={{ color: '#b9bbbe' }}>Приложение запущено в браузере. Electron API недоступен.</p>
            </div>
        );
    }

    return (
        <div style={{ padding: '20px', background: '#2f3136', borderRadius: '8px', margin: '20px' }}>
            <h3 style={{ color: '#ffffff' }}>⚡ Electron режим</h3>
            <p style={{ color: '#b9bbbe' }}>Приложение запущено в Electron!</p>

            <div style={{ marginTop: '20px', display: 'flex', gap: '10px', flexDirection: 'column' }}>
                <button
                    onClick={handleGetVersion}
                    style={{
                        padding: '10px 20px',
                        background: '#5865f2',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                    }}
                >
                    Получить версию приложения
                </button>

                {version && <p style={{ color: '#3ba55d' }}>Версия: {version}</p>}

                <button
                    onClick={handleNotification}
                    style={{
                        padding: '10px 20px',
                        background: '#3ba55d',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                    }}
                >
                    Показать уведомление
                </button>

                <button
                    onClick={() => window.electron.minimizeWindow()}
                    style={{
                        padding: '10px 20px',
                        background: '#faa81a',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                    }}
                >
                    Свернуть окно
                </button>

                <button
                    onClick={() => window.electron.maximizeWindow()}
                    style={{
                        padding: '10px 20px',
                        background: '#4f545c',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                    }}
                >
                    Развернуть/Восстановить окно
                </button>
            </div>
        </div>
    );
};
