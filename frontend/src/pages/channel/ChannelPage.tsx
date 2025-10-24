import { observer } from 'mobx-react-lite';
import { useParams } from 'react-router-dom';
import { useEffect, useMemo } from 'react';
import { ChannelSidebar } from '@widgets/channel-sidebar';
import { Chat } from '@widgets/chat';
import { ScreenShareGrid } from '@widgets/screen-share-grid';
import { useChannelsStore, useVoiceStore } from '@shared/lib/hooks/useStores';
import styles from './ChannelPage.module.scss';

export const ChannelPage = observer(() => {
    const { channelId } = useParams<{ channelId: string }>();
    const channelsStore = useChannelsStore();
    const voiceStore = useVoiceStore();

    useEffect(() => {
        if (channelId) {
            channelsStore.setActiveChannel(channelId);
        }

        return () => {
            channelsStore.setActiveChannel(null);
        };
    }, [channelId, channelsStore]);

    const channel = useMemo(() => {
        return channelsStore.channels.find((ch) => ch.id === channelId);
    }, [channelsStore.channels, channelId]);

    // Debug logging
    console.log('📄 ChannelPage render:', {
        channelId,
        channelType: channel?.type,
        isInVoiceChannel: voiceStore.isInVoiceChannel,
        activeVoiceChannelId: voiceStore.activeVoiceChannelId,
        shouldShowScreenGrid: voiceStore.isInVoiceChannel && voiceStore.activeVoiceChannelId === channelId,
        comparison: `${voiceStore.activeVoiceChannelId} === ${channelId} ? ${
            voiceStore.activeVoiceChannelId === channelId
        }`,
    });

    if (!channelId) {
        return (
            <div className={styles.pageContainer}>
                <ChannelSidebar />
                <div className={styles.emptyState}>
                    <p>Select a channel to start chatting</p>
                </div>
            </div>
        );
    }

    if (!channel) {
        return (
            <div className={styles.pageContainer}>
                <ChannelSidebar />
                <div className={styles.emptyState}>
                    <p>Channel not found</p>
                </div>
            </div>
        );
    }

    // Show chat only for TEXT channels
    if (channel.type === 'TEXT') {
        return (
            <div className={styles.pageContainer}>
                <ChannelSidebar />
                <Chat channelId={channel.id} channelName={channel.name} />
            </div>
        );
    }

    // VOICE channel - show screen sharing grid or voice info
    const isInThisVoiceChannel = voiceStore.isInVoiceChannel && voiceStore.activeVoiceChannelId === channel.id;

    return (
        <div className={styles.pageContainer}>
            <ChannelSidebar />

            {/* Show screen sharing grid if user is in this voice channel */}
            {isInThisVoiceChannel ? (
                <ScreenShareGrid />
            ) : (
                <div className={styles.voiceChannel}>
                    <div className={styles.voiceInfo}>
                        <svg
                            className={styles.voiceIcon}
                            viewBox='0 0 24 24'
                            fill='none'
                            stroke='currentColor'
                            strokeWidth='2'
                        >
                            <path d='M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z' />
                            <path d='M19 10v2a7 7 0 0 1-14 0v-2' />
                            <line x1='12' y1='19' x2='12' y2='23' />
                            <line x1='8' y1='23' x2='16' y2='23' />
                        </svg>
                        <h2>{channel.name}</h2>
                        <p>Voice channel - Click on the channel in the sidebar to join</p>
                    </div>
                </div>
            )}
        </div>
    );
});
