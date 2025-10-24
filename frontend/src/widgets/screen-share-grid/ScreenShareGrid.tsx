import { observer } from 'mobx-react-lite';
import { useEffect, useRef, useState } from 'react';
import { useVoiceStore } from '@shared/lib/hooks/useStores';
import { rtcService } from '@shared/lib/services/rtcService';
import styles from './ScreenShareGrid.module.scss';

export const ScreenShareGrid = observer(() => {
    const voiceStore = useVoiceStore();
    const videoRef = useRef<HTMLVideoElement>(null);
    const [remoteScreens, setRemoteScreens] = useState<Array<{ userId: string; stream: MediaStream }>>([]);

    // Update remote screens from rtcService
    useEffect(() => {
        const updateScreens = () => {
            const screens = Array.from(rtcService.getScreenStreams().entries()).map(([userId, stream]) => ({
                userId,
                stream,
            }));

            console.log(`📺 [ScreenShareGrid] Updating screens:`, {
                count: screens.length,
                userIds: screens.map((s) => s.userId),
                localSharing: voiceStore.isScreenSharing,
            });

            setRemoteScreens(screens);
        };

        // Initial load
        updateScreens();

        // Poll for updates (temporary - ideally we'd use an event)
        const interval = setInterval(updateScreens, 1000);

        return () => clearInterval(interval);
    }, [voiceStore.isScreenSharing]);

    // Setup local screen share video
    useEffect(() => {
        if (!voiceStore.isScreenSharing || !videoRef.current) return;

        const videoElement = videoRef.current;
        const screenStream = rtcService.getScreenStream();

        if (screenStream && videoElement) {
            videoElement.srcObject = screenStream;
            console.log('📺 Local screen stream attached to video element');
        }

        return () => {
            if (videoElement) {
                videoElement.srcObject = null;
            }
        };
    }, [voiceStore.isScreenSharing]);

    if (!voiceStore.isScreenSharing && remoteScreens.length === 0) {
        return (
            <div className={styles.emptyState}>
                <div className={styles.emptyIcon}>📺</div>
                <h3>No screen sharing</h3>
                <p>Click the screen share button in the voice panel to start sharing</p>
            </div>
        );
    }

    const totalSharing = (voiceStore.isScreenSharing ? 1 : 0) + remoteScreens.length;

    return (
        <div className={styles.screenShareGrid}>
            <div className={styles.gridHeader}>
                <h3>Screen Sharing</h3>
                <span className={styles.participantCount}>{totalSharing} sharing</span>
            </div>

            <div className={styles.screensContainer}>
                {/* Local screen share */}
                {voiceStore.isScreenSharing && (
                    <div className={styles.screenCard}>
                        <video ref={videoRef} className={styles.screenVideo} autoPlay playsInline muted />
                        <div className={styles.screenLabel}>
                            <span className={styles.screenIcon}>📺</span>
                            <span className={styles.screenUser}>Your screen</span>
                        </div>
                    </div>
                )}

                {/* Remote screen shares */}
                {remoteScreens.map(({ userId, stream }) => {
                    // Get participant info for display name
                    const participant = voiceStore.participants.get(userId);
                    const displayName = participant?.username || `User ${userId}`;

                    return <RemoteScreen key={userId} displayName={displayName} stream={stream} />;
                })}
            </div>
        </div>
    );
});

interface RemoteScreenProps {
    displayName: string;
    stream: MediaStream;
}

const RemoteScreen = observer(({ displayName, stream }: RemoteScreenProps) => {
    const videoRef = useRef<HTMLVideoElement>(null);

    useEffect(() => {
        if (!videoRef.current || !stream) return;

        const videoElement = videoRef.current;

        // Attach stream to video element
        videoElement.srcObject = stream;

        return () => {
            videoElement.srcObject = null;
        };
    }, [stream]);

    return (
        <div className={styles.screenCard}>
            <video ref={videoRef} className={styles.screenVideo} autoPlay playsInline />
            <div className={styles.screenLabel}>
                <span className={styles.screenIcon}>📺</span>
                <span className={styles.screenUser}>{displayName}'s screen</span>
            </div>
        </div>
    );
});
