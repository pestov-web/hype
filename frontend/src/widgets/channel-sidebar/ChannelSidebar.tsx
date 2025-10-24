import { observer } from 'mobx-react-lite';
import { useNavigate } from 'react-router-dom';
import { Avatar } from '@shared/ui';
import { useChannelsStore, useAuthStore, useVoiceStore } from '@shared/lib/hooks/useStores';
import styles from './ChannelSidebar.module.scss';
import IconButton from '@shared/ui/IconButtons';
import { useTranslation } from '@shared/i18n';
import { MicOff, HeadphoneOff } from 'lucide-react';

export const ChannelSidebar = observer(() => {
    const navigate = useNavigate();

    /**
     * Объект локализации
     */
    const { t } = useTranslation();

    const channelsStore = useChannelsStore();
    const authStore = useAuthStore();
    const voiceStore = useVoiceStore();

    const textChannels = channelsStore.textChannels;
    const voiceChannels = channelsStore.voiceChannels;
    const currentUser = authStore.currentUser;
    const { activeVoiceChannelId, participantsList } = voiceStore;

    const handleChannelSelect = (channelId: string) => {
        navigate(`/channels/${channelId}`);
    };

    const handleVoiceChannelJoin = (channelId: string) => {
        if (currentUser) {
            voiceStore.joinVoiceChannel(
                channelId,
                currentUser.id,
                currentUser.displayName || currentUser.username,
                currentUser.avatarUrl || undefined
            );
            // Navigate to voice channel page to show ScreenShareGrid
            navigate(`/channels/${channelId}`);
        }
    };

    const handleDisconnect = () => {
        if (currentUser) {
            voiceStore.leaveVoiceChannel(
                currentUser.id,
                currentUser.displayName || currentUser.username,
                currentUser.avatarUrl || undefined
            );
        } else {
            voiceStore.leaveVoiceChannel();
        }
    };

    if (!currentUser) {
        return null;
    }

    const canCreateChannels = !currentUser.isGuest;

    return (
        <div className={styles.channelSidebar}>
            <div className={styles.serverHeader}>
                <h2>Hype Server</h2>
                {canCreateChannels && (
                    <button className={styles.settingsButton} title='Server Settings'>
                        <svg width='16' height='16' viewBox='0 0 16 16' fill='currentColor'>
                            <path d='M14 7h-1.05c-.15-.55-.38-1.05-.7-1.5l.74-.74a1 1 0 0 0 0-1.41l-.71-.71a1 1 0 0 0-1.41 0l-.74.74c-.45-.32-.95-.55-1.5-.7V2a1 1 0 0 0-1-1H7a1 1 0 0 0-1 1v1.05c-.55.15-1.05.38-1.5.7l-.74-.74a1 1 0 0 0-1.41 0l-.71.71a1 1 0 0 0 0 1.41l.74.74c-.32.45-.55.95-.7 1.5H2a1 1 0 0 0-1 1v1a1 1 0 0 0 1 1h1.05c.15.55.38 1.05.7 1.5l-.74.74a1 1 0 0 0 0 1.41l.71.71a1 1 0 0 0 1.41 0l.74-.74c.45.32.95.55 1.5.7V14a1 1 0 0 0 1 1h1a1 1 0 0 0 1-1v-1.05c.55-.15 1.05-.38 1.5-.7l.74.74a1 1 0 0 0 1.41 0l.71-.71a1 1 0 0 0 0-1.41l-.74-.74c.32-.45.55-.95.7-1.5H14a1 1 0 0 0 1-1V8a1 1 0 0 0-1-1zM8 11a3 3 0 1 1 0-6 3 3 0 0 1 0 6z' />
                        </svg>
                    </button>
                )}
            </div>

            <div className={styles.channelsContainer}>
                {/* Текстовые каналы */}
                <div className={styles.channelCategory}>
                    <div className={styles.categoryHeader}>
                        <svg
                            width='16'
                            height='16'
                            viewBox='0 0 16 16'
                            fill='currentColor'
                            className={styles.categoryIcon}
                        >
                            <path d='M5 8h1v1H5V8zm3 0h1v1H8V8zm3 0h1v1h-1V8z' />
                            <path d='M14 1H2a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h10l1.5 2 1.5-2h1a1 1 0 0 0 1-1V2a1 1 0 0 0-1-1zm-1 10H3V3h10v8z' />
                        </svg>
                        <span className={styles.categoryName}>{t('channels.textChannels')}</span>
                        {canCreateChannels && (
                            <button className={styles.addChannelButton} title={t('channels.createChannel')}>
                                +
                            </button>
                        )}
                    </div>

                    <div className={styles.channelsList}>
                        {textChannels.map((channel) => (
                            <div
                                key={channel.id}
                                className={`${styles.channelItem} ${styles.textChannel}`}
                                onClick={() => handleChannelSelect(channel.id)}
                            >
                                <span className={styles.channelIcon}>#</span>
                                <span className={styles.channelName}>{channel.name}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Голосовые каналы */}
                <div className={styles.channelCategory}>
                    <div className={styles.categoryHeader}>
                        <svg
                            width='16'
                            height='16'
                            viewBox='0 0 16 16'
                            fill='currentColor'
                            className={styles.categoryIcon}
                        >
                            <path d='M8 11a3 3 0 0 0 3-3V4a3 3 0 0 0-6 0v4a3 3 0 0 0 3 3z' />
                            <path d='M13 8c0 2.76-2.24 5-5 5s-5-2.24-5-5H1c0 3.53 2.61 6.43 6 6.92V17h2v-2.08c3.39-.49 6-3.39 6-6.92h-2z' />
                        </svg>
                        <span className={styles.categoryName}>{t('channels.voiceChannels')}</span>
                        {canCreateChannels && (
                            <button className={styles.addChannelButton} title={t('channels.createChannel')}>
                                +
                            </button>
                        )}
                    </div>

                    <div className={styles.channelsList}>
                        {voiceChannels.map((channel) => {
                            const isActiveChannel = activeVoiceChannelId === channel.id;
                            const channelParticipants = isActiveChannel ? participantsList : [];

                            return (
                                <div key={channel.id}>
                                    <div
                                        className={`${styles.channelItem} ${styles.voiceChannel} ${
                                            isActiveChannel ? styles.active : ''
                                        }`}
                                        onClick={() => !isActiveChannel && handleVoiceChannelJoin(channel.id)}
                                    >
                                        <span className={styles.channelIcon}>
                                            <svg width='16' height='16' viewBox='0 0 16 16' fill='currentColor'>
                                                <path d='M8 11a3 3 0 0 0 3-3V4a3 3 0 0 0-6 0v4a3 3 0 0 0 3 3z' />
                                                <path d='M13 8c0 2.76-2.24 5-5 5s-5-2.24-5-5H1c0 3.53 2.61 6.43 6 6.92V17h2v-2.08c3.39-.49 6-3.39 6-6.92h-2z' />
                                            </svg>
                                        </span>
                                        <span className={styles.channelName}>{channel.name}</span>
                                        {isActiveChannel && <IconButton icon='x' onClick={handleDisconnect} />}
                                    </div>

                                    {/* Список участников активного голосового канала */}
                                    {isActiveChannel && channelParticipants.length > 0 && (
                                        <div className={styles.voiceParticipants}>
                                            {channelParticipants.map((participant) => {
                                                const isSpeaking = participant.speaking || false;
                                                return (
                                                    <div key={participant.userId} className={styles.participant}>
                                                        <div className={styles.avatarWrapper}>
                                                            <Avatar
                                                                username={participant.username}
                                                                status='online'
                                                                size='sm'
                                                            />
                                                            {isSpeaking && <div className={styles.speakingIndicator} />}
                                                        </div>
                                                        <div className={styles.participantInfo}>
                                                            <span className={styles.participantName}>
                                                                {participant.username}
                                                            </span>
                                                            <div className={styles.participantIcons}>
                                                                {participant.muted && (
                                                                    <MicOff color='#ed4245' size={16} />
                                                                )}
                                                                {participant.deafened && (
                                                                    <HeadphoneOff color='#ed4245' size={16} />
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
});
