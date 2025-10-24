import * as ContextMenu from '@radix-ui/react-context-menu';
import { useState, useEffect } from 'react';
import { Slider } from '@shared/ui';
import { getUserAudioSettings, setUserVolume, toggleUserMuted } from '@shared/lib';
import { useTranslation } from 'react-i18next';
import styles from './UserContextMenu.module.scss';

interface UserContextMenuProps {
    userId: string;
    userName: string;
    children: React.ReactNode;
}

export function UserContextMenu({ userId, userName, children }: UserContextMenuProps) {
    const { t } = useTranslation();
    const [settings, setSettings] = useState(() => getUserAudioSettings(userId));
    const [volume, setVolume] = useState(settings.volume * 100);

    // Обновляем настройки при монтировании
    useEffect(() => {
        const currentSettings = getUserAudioSettings(userId);
        setSettings(currentSettings);
        setVolume(currentSettings.volume * 100);
    }, [userId]);

    const handleVolumeChange = (newValue: number) => {
        setVolume(newValue);
        const normalizedVolume = newValue / 100;
        setUserVolume(userId, normalizedVolume);
        setSettings((prev) => ({ ...prev, volume: normalizedVolume }));
    };

    const handleToggleMute = () => {
        const newMuted = toggleUserMuted(userId);
        setSettings((prev) => ({ ...prev, muted: newMuted }));
    };

    return (
        <ContextMenu.Root>
            <ContextMenu.Trigger asChild>{children}</ContextMenu.Trigger>

            <ContextMenu.Portal>
                <ContextMenu.Content className={styles.content}>
                    <div className={styles.header}>{userName}</div>

                    <ContextMenu.Separator className={styles.separator} />

                    <ContextMenu.Item className={styles.item} onSelect={handleToggleMute}>
                        <span className={styles.icon}>{settings.muted ? '🔇' : '🔊'}</span>
                        <span>{settings.muted ? t('voice.unmute') : t('voice.mute')}</span>
                    </ContextMenu.Item>

                    <ContextMenu.Separator className={styles.separator} />

                    <div className={styles.volumeControl}>
                        <label className={styles.label}>
                            <span className={styles.icon}>🔊</span>
                            <span>
                                {t('voice.volume')}: {Math.round(volume)}%
                            </span>
                        </label>
                        <Slider value={volume} onChange={handleVolumeChange} min={0} max={100} step={1} />
                    </div>
                </ContextMenu.Content>
            </ContextMenu.Portal>
        </ContextMenu.Root>
    );
}
