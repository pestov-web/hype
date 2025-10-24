import { useState, useEffect } from 'react';
import { Button } from '../Button';
import styles from './DesktopSettings.module.scss';

export function DesktopSettings() {
    const [appVersion, setAppVersion] = useState<string>('');

    useEffect(() => {
        // Get app version from Electron API
        if (window.electron) {
            window.electron.getAppVersion().then(setAppVersion);
        }
    }, []);

    const handleMinimize = () => {
        if (window.electron) {
            window.electron.minimizeWindow();
        }
    };

    const handleMaximize = () => {
        if (window.electron) {
            window.electron.maximizeWindow();
        }
    };

    const handleClose = () => {
        if (window.electron) {
            window.electron.closeWindow();
        }
    };

    const handleShowNotification = () => {
        if (window.electron) {
            window.electron.showNotification('Test notification from Hype!');
        }
    };

    // Check if running in Electron
    const isElectron = typeof window !== 'undefined' && window.electron;

    if (!isElectron) {
        return (
            <div className={styles.desktopSettings}>
                <div className={styles.notElectron}>
                    <h3>Desktop Settings</h3>
                    <p>These settings are only available in the desktop application.</p>
                    <p>Download the desktop app to access window controls and notifications.</p>
                </div>
            </div>
        );
    }

    return (
        <div className={styles.desktopSettings}>
            <div className={styles.settingsHeader}>
                <h3>Desktop Settings</h3>
                <p className={styles.appVersion}>App Version: {appVersion || 'Loading...'}</p>
            </div>

            <div className={styles.settingsSection}>
                <h4>Window Controls</h4>
                <p>Test the desktop window controls:</p>
                <div className={styles.buttonGroup}>
                    <Button variant='secondary' onClick={handleMinimize}>
                        Minimize Window
                    </Button>
                    <Button variant='secondary' onClick={handleMaximize}>
                        Maximize/Restore
                    </Button>
                    <Button variant='danger' onClick={handleClose}>
                        Close Window
                    </Button>
                </div>
            </div>

            <div className={styles.settingsSection}>
                <h4>Notifications</h4>
                <p>Test desktop notifications:</p>
                <Button variant='primary' onClick={handleShowNotification}>
                    Show Test Notification
                </Button>
            </div>

            <div className={styles.infoSection}>
                <h4>About Desktop App</h4>
                <ul>
                    <li>• Native window management (minimize, maximize, close)</li>
                    <li>• System notifications for messages and calls</li>
                    <li>• Better performance and lower resource usage</li>
                    <li>• Tray icon support (coming soon)</li>
                    <li>• Auto-start on system boot (coming soon)</li>
                </ul>
            </div>
        </div>
    );
}
