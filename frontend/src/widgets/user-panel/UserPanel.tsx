import { observer } from 'mobx-react-lite';
import { useNavigate } from 'react-router-dom';
import { Avatar } from '@shared/ui';
import { useAuthStore, useVoiceStore } from '@shared/lib/hooks/useStores';
import styles from './UserPanel.module.scss';

/**
 * UserPanel - нижняя панель с информацией о пользователе
 * Показывает:
 * - Аватар и username пользователя
 * - Кнопки мут микрофона и звука
 * - Кнопка настроек
 */
export const UserPanel = observer(() => {
    const navigate = useNavigate();
    const authStore = useAuthStore();
    const voiceStore = useVoiceStore();

    const currentUser = authStore.currentUser;

    if (!currentUser) return null;

    const handleMuteToggle = () => {
        voiceStore.toggleMute();
    };

    const handleDeafenToggle = () => {
        voiceStore.toggleDeafen();
    };

    const handleSettingsClick = () => {
        navigate('/settings');
    };

    const isMuted = voiceStore.localState.selfMuted;
    const isDeafened = voiceStore.localState.selfDeafened;

    return (
        <div className={styles.userPanel}>
            <div className={styles.userInfo}>
                <Avatar
                    src={currentUser.avatarUrl || undefined}
                    alt={currentUser.username}
                    status={currentUser.status.toLowerCase() as 'online' | 'offline' | 'idle' | 'dnd'}
                    size='md'
                />
                <div className={styles.userDetails}>
                    <div className={styles.username}>{currentUser.username}</div>
                    {currentUser.customStatus && <div className={styles.customStatus}>{currentUser.customStatus}</div>}
                </div>
            </div>

            <div className={styles.controls}>
                {/* Mute microphone */}
                <button
                    className={`${styles.controlButton} ${isMuted ? styles.active : ''}`}
                    onClick={handleMuteToggle}
                    title={isMuted ? 'Unmute' : 'Mute'}
                >
                    {isMuted ? (
                        <svg width='20' height='20' viewBox='0 0 24 24' fill='currentColor'>
                            <path d='M6.7 11H5C5 12.19 5.34 13.3 5.9 14.28L7.13 13.05C6.86 12.43 6.7 11.74 6.7 11Z' />
                            <path d='M9.01 11.085C9.015 11.1125 9.02 11.14 9.02 11.17L15 5.18V5C15 3.66 13.98 2.58 12.67 2.51C11.27 2.43 10.02 3.62 10.02 5V11C10.02 11.03 10.025 11.0575 10.03 11.085H9.01Z' />
                            <path d='M11.7237 16.0927L10.9632 16.8531L10.2028 17.6136C10.4531 17.6788 10.7144 17.72 11 17.72C13.21 17.72 15 15.93 15 13.72V13H16.7C16.7 16.01 14.47 18.5 11.6 18.95V21.72H9.4V18.95C8.1074 18.7172 6.93598 18.0291 6.07006 17Z' />
                            <path d='M21 4.27L19.73 3L3 19.73L4.27 21L8.46 16.82C9.69 17.96 11.24 18.72 12.99 18.72C13.64 18.72 14.25 18.63 14.84 18.47L21 12.27L19.73 11L15 15.72V9.41L21 3.41V4.27Z' />
                        </svg>
                    ) : (
                        <svg width='20' height='20' viewBox='0 0 24 24' fill='currentColor'>
                            <path d='M12 2C10.34 2 9 3.37 9 5.07V11.93C9 13.63 10.34 15 12 15C13.66 15 15 13.63 15 11.93V5.07C15 3.37 13.66 2 12 2Z' />
                            <path d='M17.91 11H17.2C17.2 13.83 14.93 16.17 12.13 16.17C9.33 16.17 7.06 13.83 7.06 11H6.35C6.35 14.21 8.8 16.86 11.85 17.15V20H13.05V17.15C16.1 16.86 18.55 14.21 18.55 11H17.91Z' />
                        </svg>
                    )}
                </button>

                {/* Deafen/unmute sound */}
                <button
                    className={`${styles.controlButton} ${isDeafened ? styles.active : ''}`}
                    onClick={handleDeafenToggle}
                    title={isDeafened ? 'Undeafen' : 'Deafen'}
                >
                    {isDeafened ? (
                        <svg width='20' height='20' viewBox='0 0 24 24' fill='currentColor'>
                            <path d='M6.16204 15.0065C6.10859 15.0022 6.05455 15 6 15H4V12C4 7.588 7.589 4 12 4C13.4809 4 14.8691 4.40439 16.0599 5.10859L17.5102 3.65835C15.9292 2.61064 14.0346 2 12 2C6.486 2 2 6.485 2 12V15C2 16.654 3.346 18 5 18H6C6.17645 18 6.34614 17.9758 6.50689 17.9311L6.16204 15.0065Z' />
                            <path d='M19.725 9.91686C19.9043 10.5813 20 11.2796 20 12V15C20 16.654 18.654 18 17 18H16C14.346 18 13 16.654 13 15V12C13 11.5729 13.0356 11.1538 13.1045 10.7467L11.1637 8.80585C11.0621 9.18704 11 9.58633 11 10V15C11 17.757 13.243 20 16 20H17C19.757 20 22 17.757 22 15V12C22 10.7575 21.7161 9.57956 21.2092 8.52109L19.725 9.91686Z' />
                            <path d='M3.70711 2.29289L2.29289 3.70711L20.2929 21.7071L21.7071 20.2929L3.70711 2.29289Z' />
                        </svg>
                    ) : (
                        <svg width='20' height='20' viewBox='0 0 24 24' fill='currentColor'>
                            <path d='M12 2C6.486 2 2 6.486 2 12V15C2 16.654 3.346 18 5 18H6C7.654 18 9 16.654 9 15V12C9 10.346 7.654 9 6 9H4.069C4.574 5.946 7.655 3 12 3C16.411 3 20 6.589 20 11V15C20 16.654 18.654 18 17 18H16C14.346 18 13 16.654 13 15V12C13 10.346 14.346 9 16 9H17.931C17.426 5.946 14.345 3 10 3H12Z' />
                        </svg>
                    )}
                </button>

                {/* Settings */}
                <button className={styles.controlButton} onClick={handleSettingsClick} title='User Settings'>
                    <svg width='20' height='20' viewBox='0 0 24 24' fill='currentColor'>
                        <path d='M19.14 12.94C19.18 12.64 19.2 12.33 19.2 12C19.2 11.68 19.18 11.36 19.13 11.06L21.16 9.48C21.34 9.34 21.39 9.07 21.28 8.87L19.36 5.55C19.24 5.33 18.99 5.26 18.77 5.33L16.38 6.29C15.88 5.91 15.35 5.59 14.76 5.35L14.4 2.81C14.36 2.57 14.16 2.4 13.92 2.4H10.08C9.84 2.4 9.65 2.57 9.61 2.81L9.25 5.35C8.66 5.59 8.12 5.92 7.63 6.29L5.24 5.33C5.02 5.25 4.77 5.33 4.65 5.55L2.74 8.87C2.62 9.08 2.66 9.34 2.86 9.48L4.89 11.06C4.84 11.36 4.8 11.69 4.8 12C4.8 12.31 4.82 12.64 4.87 12.94L2.84 14.52C2.66 14.66 2.61 14.93 2.72 15.13L4.64 18.45C4.76 18.67 5.01 18.74 5.23 18.67L7.62 17.71C8.12 18.09 8.65 18.41 9.24 18.65L9.6 21.19C9.65 21.43 9.84 21.6 10.08 21.6H13.92C14.16 21.6 14.36 21.43 14.39 21.19L14.75 18.65C15.34 18.41 15.88 18.09 16.37 17.71L18.76 18.67C18.98 18.75 19.23 18.67 19.35 18.45L21.27 15.13C21.39 14.91 21.34 14.66 21.15 14.52L19.14 12.94ZM12 15.6C10.02 15.6 8.4 13.98 8.4 12C8.4 10.02 10.02 8.4 12 8.4C13.98 8.4 15.6 10.02 15.6 12C15.6 13.98 13.98 15.6 12 15.6Z' />
                    </svg>
                </button>
            </div>
        </div>
    );
});
