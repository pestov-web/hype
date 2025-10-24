import { useEffect, useRef } from 'react';
import { observer } from 'mobx-react-lite';
import { useVoiceStore } from '@shared/lib/hooks/useStores';

/**
 * Component that manages audio playback for remote peers
 * Creates hidden <audio> elements for each peer connection
 *
 * This component is placed at MainLayout level to persist across page navigations
 */
export const VoiceAudioManager = observer(() => {
    const voiceStore = useVoiceStore();
    const audioRefsRef = useRef<Map<string, HTMLAudioElement>>(new Map());
    const containerRef = useRef<HTMLDivElement | null>(null);

    // Log when component mounts/unmounts
    useEffect(() => {
        console.log('🎵 VoiceAudioManager mounted');
        return () => {
            console.log('🎵 VoiceAudioManager unmounting');
        };
    }, []);

    useEffect(() => {
        const container = document.createElement('div');
        container.id = 'voice-audio-container';
        container.style.position = 'fixed';
        container.style.inset = '0';
        container.style.width = '0';
        container.style.height = '0';
        container.style.pointerEvents = 'none';
        container.style.opacity = '0';
        container.setAttribute('aria-hidden', 'true');
        document.body.appendChild(container);
        containerRef.current = container;

        return () => {
            container.remove();
            containerRef.current = null;
        };
    }, []);

    useEffect(() => {
        const audioRefs = audioRefsRef.current;
        const participants = voiceStore.participantsList;

        console.log(
            '🎵 Participants changed:',
            participants.map((p) => p.userId)
        );

        // Create audio elements for new participants
        participants.forEach((participant) => {
            if (participant.userId === voiceStore.currentUserId) {
                // Skip local user (don't play own audio)
                console.log('🎵 Skipping local user:', participant.userId);
                return;
            }

            if (!audioRefs.has(participant.userId)) {
                const audioElement = document.createElement('audio');
                audioElement.autoplay = true;
                audioElement.volume = 1.0;
                audioElement.setAttribute('playsinline', 'true');
                audioElement.preload = 'auto';
                audioElement.setAttribute('data-user-id', participant.userId);
                audioElement.setAttribute('aria-hidden', 'true');
                audioElement.style.display = 'none';
                if (containerRef.current) {
                    containerRef.current.appendChild(audioElement);
                }
                audioRefs.set(participant.userId, audioElement);
                console.log(`🔊 Created audio element for user ${participant.userId}`);
            }
        });

        // Remove audio elements for disconnected participants
        const currentUserIds = new Set(participants.map((p) => p.userId));
        for (const [userId, audioElement] of audioRefs.entries()) {
            if (!currentUserIds.has(userId)) {
                audioElement.pause();
                audioElement.srcObject = null;
                audioElement.remove();
                audioRefs.delete(userId);
                console.log(`🔇 Removed audio element for user ${userId}`);
            }
        }
    }, [voiceStore.participantsList, voiceStore.currentUserId]);

    useEffect(() => {
        const audioRefs = audioRefsRef.current;

        // Update audio streams when they change
        const updateAudioStreams = () => {
            const peerStreams = voiceStore.getPeerStreams();

            // if (peerStreams.size > 0) {
            //     console.log('🎵 Updating audio streams, peers:', Array.from(peerStreams.keys()));
            // }

            peerStreams.forEach((stream: MediaStream, userId: string) => {
                const audioElement = audioRefs.get(userId);
                if (audioElement) {
                    if (audioElement.srcObject !== stream) {
                        console.log(`🔊 Setting audio stream for user ${userId}`, {
                            tracks: stream.getAudioTracks().length,
                            active: stream.active,
                        });
                        audioElement.srcObject = stream;
                        audioElement.play().catch((error) => {
                            console.error(`❌ Failed to play audio for user ${userId}:`, error);
                        });
                    }
                } else {
                    console.warn(`⚠️ No audio element for user ${userId}`);
                }
            });
        };

        // Update immediately
        updateAudioStreams();

        // Update periodically (in case streams are added after participants)
        const interval = setInterval(updateAudioStreams, 500);

        return () => clearInterval(interval);
    }, [voiceStore]);

    // Cleanup on unmount
    useEffect(() => {
        const audioRefs = audioRefsRef.current;
        return () => {
            console.log('🎵 Cleaning up audio elements');
            for (const audioElement of audioRefs.values()) {
                audioElement.pause();
                audioElement.srcObject = null;
                audioElement.remove();
            }
            audioRefs.clear();
        };
    }, []);

    // This component doesn't render anything visible
    return null;
});
