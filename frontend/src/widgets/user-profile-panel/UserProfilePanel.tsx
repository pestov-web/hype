import { observer } from 'mobx-react-lite';
import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore, useVoiceStore } from '@shared/lib/hooks/useStores';
import { usePTT, useTranslation, useVAD } from '@shared/lib';
import { rtcService } from '@shared/lib/services/rtcService';
import { Avatar } from '@shared/ui';
import styles from './UserProfilePanel.module.scss';
import IconButton from '@shared/ui/IconButtons';

export const UserProfilePanel = observer(() => {
    const navigate = useNavigate();
    const authStore = useAuthStore();
    const voiceStore = useVoiceStore();

    /**
     * Объект локализации
     */
    const { t } = useTranslation();

    const currentUser = authStore.currentUser;
    if (!currentUser) return null;

    // Get current voice mode from stores
    const voiceMode = voiceStore.voiceMode; // Observable, reactive!
    const vadSensitivity = voiceStore.vadSensitivity; // Observable, reactive!
    const isMuted = voiceStore.localState.selfMuted;
    const isDeafened = voiceStore.localState.selfDeafened;
    const isSpeaking = voiceStore.localState.speaking;
    const isInVoiceChannel = voiceStore.isInVoiceChannel;

    // PTT hook (only active when voiceMode is 'ptt' AND in voice channel)
    // Hook is needed for keyboard event listening side effects
    const pttEnabled = voiceMode === 'ptt' && isInVoiceChannel;
    usePTT(pttEnabled);

    // Memoized VAD callbacks to prevent hook re-initialization
    const handleVADSpeechStart = useCallback(() => {
        console.log('VAD: Speech START detected');
        rtcService.setVADSpeaking(true);
    }, []);

    const handleVADSpeechEnd = useCallback(() => {
        console.log('VAD: Speech END detected');
        rtcService.setVADSpeaking(false);
    }, []);

    // VAD hook (only active when voiceMode is 'vad' AND in voice channel)
    // Hook is needed for voice activity detection side effects
    const vadEnabled = voiceMode === 'vad' && isInVoiceChannel;

    console.log('🎤 VAD hook state:', {
        voiceMode,
        isInVoiceChannel,
        vadEnabled,
        vadSensitivity,
    });

    useVAD({
        enabled: vadEnabled,
        sensitivity: vadSensitivity,
        onSpeechStart: handleVADSpeechStart,
        onSpeechEnd: handleVADSpeechEnd,
    });

    const handleMuteToggle = () => {
        if (voiceStore.activeVoiceChannelId) {
            voiceStore.toggleMute();
        }
    };

    const handleDeafenToggle = () => {
        if (voiceStore.activeVoiceChannelId) {
            voiceStore.toggleDeafen();
        }
    };

    const handleSettingsClick = () => {
        navigate('/settings');
    };

    const handleScreenShare = async () => {
        try {
            if (voiceStore.isScreenSharing) {
                await voiceStore.stopScreenShare();
            } else {
                await voiceStore.startScreenShare();
            }
        } catch (error) {
            console.error('❌ Failed to toggle screen share:', error);
        }
    };

    // Debug log
    console.log('🎤 UserProfilePanel render:', {
        isSpeaking,
        voiceMode,
        isInVoiceChannel,
        pttEnabled,
        vadEnabled,
        'localState.speaking': voiceStore.localState.speaking,
    });

    return (
        <div className={styles.userProfilePanel}>
            {/* User Info */}
            <div className={styles.userInfo}>
                <div className={styles.avatarWrapper}>
                    <Avatar
                        username={currentUser.username}
                        src={currentUser.avatarUrl || undefined}
                        status={currentUser.isOnline ? 'online' : 'offline'}
                        size='md'
                    />
                    {isSpeaking && <div className={styles.speakingIndicator} />}
                </div>
                <div className={styles.userDetails}>
                    <span className={styles.username}>{currentUser.username}</span>
                    <span className={styles.status}>
                        {currentUser.isOnline ? t('users.online') : t('users.offline')}
                    </span>
                </div>

                {/* Settings Button */}
                <IconButton icon='settings' onClick={handleSettingsClick} title={t('settings.title')}></IconButton>
            </div>

            {/* Voice Controls (показываются только когда в голосовом канале) */}
            {isInVoiceChannel && (
                <div className={styles.voiceControls}>
                    <IconButton
                        icon={isMuted ? 'micOff' : 'mic'}
                        onClick={handleMuteToggle}
                        title={isMuted ? t('voice.unmute') : t('voice.mute')}
                        muted={isMuted}
                    />

                    <IconButton
                        icon={isDeafened ? 'headphoneOff' : 'headphones'}
                        onClick={handleDeafenToggle}
                        title={isDeafened ? t('voice.undeafen') : t('voice.deafen')}
                        muted={isDeafened}
                    />

                    <IconButton
                        icon='cast'
                        onClick={handleScreenShare}
                        title={voiceStore.isScreenSharing ? t('voice.stopSharing') : t('voice.shareScreen')}
                        active={voiceStore.isScreenSharing}
                    />
                </div>
            )}
        </div>
    );
});
