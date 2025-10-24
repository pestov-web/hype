import { observer } from 'mobx-react-lite';
import { useState, useEffect, useCallback } from 'react';
import { Avatar } from '@shared/ui';
import { useVoiceStore, useAuthStore, useChannelsStore } from '@shared/lib/hooks/useStores';
import { usePTT, useVAD } from '@shared/lib';
import { rtcService } from '@shared/lib/services/rtcService';
import { rootStore } from '@app/stores';
import type { VoiceParticipant } from '@entities/voice';
import styles from './VoicePanel.module.scss';
import { IconButton } from '@shared/ui/IconButtons/IconButtons';

export const VoicePanel = observer(() => {
    const voiceStore = useVoiceStore();
    const authStore = useAuthStore();
    const channelsStore = useChannelsStore();

    // Get current voice mode from stores
    const voiceMode = voiceStore.voiceMode; // Observable, reactive!
    const pttKey = voiceStore.pttKey; // Observable, reactive!
    const vadSensitivity = voiceStore.vadSensitivity; // Observable, reactive!

    // PTT hook (only active when voiceMode is 'ptt')
    const { pttActive } = usePTT(voiceMode === 'ptt');

    // Memoized VAD callbacks to prevent hook re-initialization
    const handleVADSpeechStart = useCallback(() => {
        console.log('🎤 VAD: Speech START detected');
        rtcService.setVADSpeaking(true);
    }, []);

    const handleVADSpeechEnd = useCallback(() => {
        console.log('🎤 VAD: Speech END detected');
        rtcService.setVADSpeaking(false);
    }, []);

    // VAD hook (only active when voiceMode is 'vad')
    const { userSpeaking: vadActive } = useVAD({
        enabled: voiceMode === 'vad',
        sensitivity: vadSensitivity,
        onSpeechStart: handleVADSpeechStart,
        onSpeechEnd: handleVADSpeechEnd,
    });

    // Если нет активного голосового канала, не показываем панель
    if (!voiceStore.activeVoiceChannelId) {
        return null;
    }

    // Если пользователь не авторизован, не показываем панель
    if (!authStore.currentUser) {
        return null;
    }

    const activeChannel = channelsStore.channels.find((c) => c.id === voiceStore.activeVoiceChannelId);

    const handleLeaveChannel = () => {
        if (authStore.currentUser) {
            voiceStore.leaveVoiceChannel(
                authStore.currentUser.id,
                authStore.currentUser.displayName || authStore.currentUser.username,
                authStore.currentUser.avatarUrl || undefined
            );
        } else {
            voiceStore.leaveVoiceChannel();
        }
    };

    return (
        <div className={styles.voicePanel}>
            <div className={styles.voiceHeader}>
                <div className={styles.channelInfo}>
                    <span className={styles.voiceIcon}>🔊</span>
                    <span className={styles.channelName}>{activeChannel?.name || 'Voice Channel'}</span>
                </div>
                <IconButton icon='x' onClick={handleLeaveChannel} title='Leave Channel' />
            </div>

            {voiceStore.isConnecting && (
                <div className={styles.connecting}>
                    <span>Connecting...</span>
                </div>
            )}

            {voiceStore.error && (
                <div className={styles.error}>
                    <span>⚠️ {voiceStore.error}</span>
                </div>
            )}

            <div className={styles.participantsList}>
                {voiceStore.participantsList.map((participant) => (
                    <VoiceParticipantItem
                        key={participant.userId}
                        participant={participant}
                        isCurrentUser={participant.userId === authStore.currentUser!.id}
                    />
                ))}
            </div>

            {/* PTT Indicator */}
            {voiceMode === 'ptt' && (
                <div className={`${styles.pttIndicator} ${pttActive ? styles.active : ''}`}>
                    <span className={styles.pttIcon}>{pttActive ? '🎤' : '🔇'}</span>
                    <span className={styles.pttText}>{pttActive ? 'Speaking...' : `Hold ${pttKey} to speak`}</span>
                </div>
            )}

            {/* VAD Indicator */}
            {voiceMode === 'vad' && (
                <div className={`${styles.vadIndicator} ${vadActive ? styles.active : ''}`}>
                    <span className={styles.vadIcon}>{vadActive ? '🎤' : '🤖'}</span>
                    <span className={styles.vadText}>
                        {vadActive ? 'Speech Detected!' : 'Voice Activity Detection: ON'}
                    </span>
                </div>
            )}
        </div>
    );
});

interface VoiceParticipantProps {
    participant: VoiceParticipant;
    isCurrentUser: boolean;
}

const VoiceParticipantItem = observer(({ participant, isCurrentUser }: VoiceParticipantProps) => {
    const voiceStore = useVoiceStore();
    const { users: usersStore } = rootStore;
    const [volumeLevel, setVolumeLevel] = useState(0);

    // Get user data from UsersStore
    const user = usersStore.getUserById(participant.userId);
    const displayName = user?.displayName || user?.username || `User ${participant.userId.slice(0, 8)}`;

    // Update volume level periodically
    useEffect(() => {
        const interval = setInterval(() => {
            const level = isCurrentUser
                ? voiceStore.getLocalVolumeLevel()
                : voiceStore.getPeerVolumeLevel(participant.userId);
            setVolumeLevel(level);
        }, 100);

        return () => clearInterval(interval);
    }, [isCurrentUser, participant.userId, voiceStore]);

    return (
        <div className={`${styles.voiceParticipant} ${isCurrentUser ? styles.currentUser : ''}`}>
            <div className={styles.participantAvatar}>
                <Avatar
                    alt={displayName}
                    username={displayName}
                    src={user?.avatarUrl || undefined}
                    size='md'
                    status={user?.isOnline ? 'online' : 'offline'}
                />
                {participant.speaking && <div className={styles.speakingIndicator} />}
            </div>

            <div className={styles.participantInfo}>
                <div className={styles.participantName}>
                    {displayName} {isCurrentUser && '(You)'}
                </div>
                <div className={styles.participantStatus}>
                    {participant.muted && <span className={styles.statusIcon}>🔇</span>}
                    {participant.deafened && <span className={styles.statusIcon}>🔇</span>}
                </div>
            </div>

            {/* Volume indicator */}
            <div className={styles.volumeIndicator}>
                <div
                    className={styles.volumeBar}
                    style={{
                        width: `${volumeLevel}%`,
                        backgroundColor: volumeLevel > 70 ? '#43b581' : volumeLevel > 30 ? '#faa61a' : '#99aab5',
                    }}
                />
            </div>
        </div>
    );
});
