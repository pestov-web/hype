/**
 * RTC Service - Pure SFU Architecture (mediasoup)
 */

import { wsClient } from '@shared/api/websocket';
import { sfuService } from './sfuService';
import { getAudioInputDevice } from '../utils/deviceSettings';
import { rootStore } from '@app/stores';

export interface RemoteParticipant {
    userId: string;
    stream: MediaStream;
    audioAnalyser?: AnalyserNode;
    volumeLevel?: number;
}

export class RTCService {
    private localStream: MediaStream | null = null;
    private remoteParticipants: Map<string, RemoteParticipant> = new Map();
    private remoteScreenStreams: Map<string, MediaStream> = new Map(); // userId -> screen MediaStream
    private currentChannelId: string | null = null;
    private currentUserId: string | null = null;

    // Audio analysis
    private audioContext: AudioContext | null = null;
    private localAudioAnalyser: AnalyserNode | null = null;
    private localVolumeLevel = 0;
    private volumeMonitoringInterval: number | null = null;

    // Voice Activity Detection (VAD) - managed by React hook
    private vadEnabled = false;
    private isVoiceActive = false; // Start with voice inactive (microphone off)
    private userMuted = false; // Track if user manually muted

    // Push-to-Talk (PTT)
    private pttEnabled = false;
    private pttActive = false; // Is PTT key currently held down
    private pttKey = 'Space'; // Default PTT key

    // Producer IDs
    private audioProducerId: string | null = null;
    private videoProducerId: string | null = null;
    private screenProducerId: string | null = null;

    // Screen sharing
    private screenStream: MediaStream | null = null;
    private isScreenSharing = false;

    constructor() {
        this.setupWebSocketListeners();
    }

    /**
     * Update microphone enabled state based on voice activity or PTT
     */
    private updateMicrophoneState() {
        if (!this.localStream || this.userMuted) return;

        const audioTrack = this.localStream.getAudioTracks()[0];
        if (!audioTrack) return;

        // Determine if microphone should be enabled
        // Default: disabled (no voice mode active)
        let shouldEnable = false;

        if (this.pttEnabled) {
            // PTT mode: enable only when PTT key is held
            shouldEnable = this.pttActive;
        } else if (this.vadEnabled) {
            // VAD mode: enable only when voice is active
            shouldEnable = this.isVoiceActive;
        }
        // If neither PTT nor VAD is enabled, microphone stays disabled

        if (audioTrack.enabled !== shouldEnable) {
            audioTrack.enabled = shouldEnable;
            console.log('🎙️ [SFU] Microphone state changed', {
                pttEnabled: this.pttEnabled,
                vadEnabled: this.vadEnabled,
                pttActive: this.pttActive,
                isVoiceActive: this.isVoiceActive,
                shouldEnable,
            });

            // Pause/resume audio producer in SFU
            if (this.audioProducerId) {
                if (shouldEnable) {
                    sfuService.resumeAudioProducer();
                } else {
                    sfuService.pauseAudioProducer();
                }
            }
        }

        // Update VoiceStore speaking state for UI indicators
        rootStore.voice.setSpeaking(shouldEnable);

        // Broadcast speaking state to other users via WebSocket
        if (this.currentChannelId && this.currentUserId) {
            wsClient.send('speaking_state', {
                channelId: this.currentChannelId,
                userId: this.currentUserId,
                speaking: shouldEnable,
            });
        }
    }

    /**
     * Setup WebSocket listeners for SFU events
     */
    private setupWebSocketListeners() {
        // New participant joined - consume their streams
        wsClient.on('user_joined_voice', async (data: unknown) => {
            const payload = data as { userId: string; channelId: string };
            if (payload.channelId === this.currentChannelId && payload.userId !== this.currentUserId) {
                console.log('👤 [SFU] User joined voice:', payload.userId);
                await this.consumeParticipant(payload.userId);
            }
        });

        // Participant left - remove their streams
        wsClient.on('user_left_voice', (data: unknown) => {
            const payload = data as { userId: string; channelId: string };
            if (payload.channelId === this.currentChannelId) {
                console.log('👋 [SFU] User left voice:', payload.userId);
                this.removeParticipant(payload.userId);
            }
        });

        // New producer available - consume it
        wsClient.on('new_producer', async (data: unknown) => {
            console.log('📥 [SFU] Received new_producer event:', data);
            const payload = data as {
                producerId: string;
                userId: string;
                kind: 'audio' | 'video' | 'screen';
                channelId: string;
            };

            // Only consume if this is for our current channel and not our own producer
            if (payload.channelId !== this.currentChannelId) {
                console.log(
                    `⏭️ [SFU] Ignoring producer from different channel (received: ${payload.channelId}, current: ${this.currentChannelId})`
                );
                return;
            }

            if (payload.userId === this.currentUserId) {
                console.log(`⏭️ [SFU] Ignoring own producer (userId: ${payload.userId})`);
                return;
            }

            console.log('🎬 [SFU] New producer available:', payload);

            // Consume all streams from this participant
            try {
                await this.consumeParticipant(payload.userId);
            } catch (error) {
                console.error(`❌ [SFU] Failed to consume producer ${payload.producerId}:`, error);
            }
        });

        // Producer closed - remove from UI
        wsClient.on('producer_closed', (data: unknown) => {
            console.log('🔴 [SFU] Received producer_closed event:', data);
            const payload = data as {
                producerId: string;
                userId: string;
                kind: 'audio' | 'video' | 'screen';
                channelId: string;
            };

            // Only process if this is for our current channel
            if (payload.channelId !== this.currentChannelId) {
                console.log(
                    `⏭️ [SFU] Ignoring producer_closed from different channel (received: ${payload.channelId}, current: ${this.currentChannelId})`
                );
                return;
            }

            console.log(`🗑️ [SFU] Removing ${payload.kind} stream from user ${payload.userId}`);

            // Handle screen sharing closure
            if (payload.kind === 'screen') {
                const screenStream = this.remoteScreenStreams.get(payload.userId);
                if (screenStream) {
                    // Stop all tracks
                    screenStream.getTracks().forEach((track) => track.stop());
                    this.remoteScreenStreams.delete(payload.userId);
                    console.log(`✅ [SFU] Removed screen share from user ${payload.userId}`);
                }
            }
            // Handle audio/video closure
            else {
                const participant = this.remoteParticipants.get(payload.userId);
                if (participant) {
                    // Remove specific track from participant's stream
                    const tracks =
                        payload.kind === 'audio'
                            ? participant.stream.getAudioTracks()
                            : participant.stream.getVideoTracks();
                    tracks.forEach((track) => {
                        track.stop();
                        participant.stream.removeTrack(track);
                    });
                    console.log(`✅ [SFU] Removed ${payload.kind} track from user ${payload.userId}`);
                }
            }
        });
    }

    /**
     * Join voice channel with SFU
     */
    async joinVoiceChannel(channelId: string, userId: string, otherUserIds: string[]): Promise<void> {
        console.log(`🎤 [SFU] Joining voice channel ${channelId} with users:`, otherUserIds);

        this.currentChannelId = channelId;
        this.currentUserId = userId;

        try {
            // Step 1: Initialize SFU device
            await sfuService.initDevice(channelId);

            // Step 2: Create transports
            await sfuService.createSendTransport(userId);
            await sfuService.createRecvTransport(userId);

            // Step 3: Get local media stream
            const savedDeviceId = getAudioInputDevice();
            this.localStream = await navigator.mediaDevices.getUserMedia({
                audio: savedDeviceId
                    ? {
                          deviceId: { exact: savedDeviceId },
                          echoCancellation: true,
                          noiseSuppression: true,
                          autoGainControl: true,
                      }
                    : {
                          echoCancellation: true,
                          noiseSuppression: true,
                          autoGainControl: true,
                      },
                video: false,
            });

            console.log(
                '✅ [SFU] Got local media stream',
                savedDeviceId ? `with device: ${savedDeviceId}` : '(default)'
            );

            // Step 4: Setup audio analyser
            this.setupAudioAnalyser();

            // Step 5: Produce audio to SFU
            const audioTrack = this.localStream.getAudioTracks()[0];
            if (audioTrack) {
                this.audioProducerId = await sfuService.produceAudio(audioTrack);
                console.log('🎙️ [SFU] Audio producer created:', this.audioProducerId);
            }

            // Step 6: Apply initial microphone state (PTT or VAD)
            this.updateMicrophoneState();

            // Step 7: Consume existing participants
            // NOTE: Consumption is now handled by VoiceStore when voice_state:user_joined arrives
            // This ensures we have the latest participant list from the server
            console.log('⏳ [SFU] Waiting for voice_state event to consume existing participants...');

            console.log('✅ [SFU] Successfully joined voice channel');
        } catch (error) {
            console.error('❌ [SFU] Failed to join voice channel:', error);
            await this.leaveVoiceChannel();
            throw error;
        }
    }

    /**
     * Consume streams from a participant (with retry logic)
     */
    async consumeParticipant(userId: string, retryCount = 0): Promise<void> {
        const maxRetries = 3;
        const retryDelay = 1000; // 1 second

        try {
            console.log('📥 [SFU] Consuming participant:', userId, retryCount > 0 ? `(retry ${retryCount})` : '');

            // Get list of producers from this user
            const producers = await sfuService.getProducers(userId);
            const userProducers = producers.filter((p) => p.userId === userId);

            console.log(`📋 [SFU] Found ${userProducers.length} producers for user ${userId}:`, userProducers);

            if (userProducers.length === 0) {
                if (retryCount < maxRetries) {
                    console.log(`⏳ [SFU] No producers yet for ${userId}, retrying in ${retryDelay}ms...`);
                    await new Promise((resolve) => setTimeout(resolve, retryDelay));
                    return this.consumeParticipant(userId, retryCount + 1);
                } else {
                    console.warn(`⚠️ [SFU] No producers found for ${userId} after ${maxRetries} retries`);
                    return;
                }
            }

            for (const producer of userProducers) {
                console.log(`🎬 [SFU] Processing producer:`, {
                    id: producer.id,
                    kind: producer.kind,
                    userId: producer.userId,
                });

                const track = await sfuService.consume(producer.id, this.currentUserId!);
                if (track) {
                    // Handle screen sharing separately
                    if (producer.kind === 'screen') {
                        const screenStream = new MediaStream([track]);
                        this.remoteScreenStreams.set(userId, screenStream);
                        console.log(`📺 [SFU] Added screen stream for user: ${userId}`, {
                            streamId: screenStream.id,
                            trackId: track.id,
                            trackLabel: track.label,
                        });
                    } else {
                        // Handle audio/video tracks normally
                        this.addTrackToParticipant(userId, track);
                    }
                }
            }

            console.log(`✅ [SFU] Finished consuming ${userProducers.length} producers from user ${userId}`);
        } catch (error) {
            console.error('❌ [SFU] Failed to consume participant:', error);
            if (retryCount < maxRetries) {
                console.log(`⏳ [SFU] Retrying consume for ${userId} in ${retryDelay}ms...`);
                await new Promise((resolve) => setTimeout(resolve, retryDelay));
                return this.consumeParticipant(userId, retryCount + 1);
            }
        }
    }

    /**
     * Add track to participant's stream
     */
    private addTrackToParticipant(userId: string, track: MediaStreamTrack): void {
        let participant = this.remoteParticipants.get(userId);

        if (!participant) {
            // Create new participant with stream
            const stream = new MediaStream([track]);
            participant = { userId, stream };
            this.remoteParticipants.set(userId, participant);
            console.log('➕ [SFU] Added new participant:', userId);
        } else {
            // Remove old tracks of the same kind to avoid duplicates (e.g., when user re-joins)
            const existingTracks = participant.stream.getTracks().filter((t) => t.kind === track.kind);
            if (existingTracks.length > 0) {
                console.log(
                    `🔄 [SFU] Replacing ${existingTracks.length} existing ${track.kind} track(s) for ${userId}`
                );
                existingTracks.forEach((oldTrack) => {
                    participant!.stream.removeTrack(oldTrack);
                    oldTrack.stop();
                });
            }

            // Add new track to stream
            participant.stream.addTrack(track);
            console.log('🎵 [SFU] Added track to participant:', userId, track.kind);
        }

        // Setup audio analyser for audio tracks
        if (track.kind === 'audio') {
            this.setupRemoteAudioAnalyser(participant);
        }
    }

    /**
     * Remove participant
     */
    private removeParticipant(userId: string): void {
        const participant = this.remoteParticipants.get(userId);
        if (participant) {
            participant.stream.getTracks().forEach((track) => track.stop());
            this.remoteParticipants.delete(userId);
            console.log('➖ [SFU] Removed participant:', userId);
        }

        // Also remove screen stream if exists
        const screenStream = this.remoteScreenStreams.get(userId);
        if (screenStream) {
            screenStream.getTracks().forEach((track) => track.stop());
            this.remoteScreenStreams.delete(userId);
            console.log('📺 [SFU] Removed screen stream for user:', userId);
        }
    }

    /**
     * Leave voice channel and cleanup
     */
    async leaveVoiceChannel(): Promise<void> {
        console.log('👋 [SFU] Leaving voice channel');

        // Stop volume monitoring
        if (this.volumeMonitoringInterval) {
            clearInterval(this.volumeMonitoringInterval);
            this.volumeMonitoringInterval = null;
        }

        // Stop local media stream
        if (this.localStream) {
            this.localStream.getTracks().forEach((track) => track.stop());
            this.localStream = null;
        }

        // Stop screen sharing if active
        if (this.isScreenSharing) {
            this.stopScreenShare();
        }

        // Close audio context
        if (this.audioContext) {
            this.audioContext.close();
            this.audioContext = null;
        }

        this.localAudioAnalyser = null;
        this.localVolumeLevel = 0;

        // Remove all remote participants
        this.remoteParticipants.forEach((participant) => {
            participant.stream.getTracks().forEach((track) => track.stop());
        });
        this.remoteParticipants.clear();

        // Remove all remote screen streams
        this.remoteScreenStreams.forEach((stream) => {
            stream.getTracks().forEach((track) => track.stop());
        });
        this.remoteScreenStreams.clear();

        // Leave SFU channel
        if (this.currentUserId) {
            try {
                await sfuService.leave(this.currentUserId);
            } catch (error) {
                console.error('❌ [SFU] Failed to leave channel:', error);
            }
        }

        // Reset state
        this.currentChannelId = null;
        this.currentUserId = null;
        this.audioProducerId = null;
        this.videoProducerId = null;
        this.screenProducerId = null;
        this.userMuted = false;

        console.log('✅ [SFU] Successfully left voice channel');
    }

    /**
     * Get remote participant streams (for audio playback)
     */
    getPeerStreams(): Map<string, MediaStream> {
        const streams = new Map<string, MediaStream>();
        this.remoteParticipants.forEach((participant, userId) => {
            streams.set(userId, participant.stream);
        });
        return streams;
    }

    /**
     * Get screen share streams from all participants
     * Returns Map<userId, MediaStream> for screen tracks
     */
    getScreenStreams(): Map<string, MediaStream> {
        return this.remoteScreenStreams;
    }

    /**
     * Check if currently in a voice channel with WebRTC initialized
     */
    isInChannel(): boolean {
        return this.currentChannelId !== null && this.localStream !== null;
    }

    /**
     * Setup audio analyser for local stream
     */
    private setupAudioAnalyser(): void {
        if (!this.localStream) return;

        try {
            this.audioContext = new AudioContext();
            const source = this.audioContext.createMediaStreamSource(this.localStream);
            this.localAudioAnalyser = this.audioContext.createAnalyser();
            this.localAudioAnalyser.fftSize = 256;
            source.connect(this.localAudioAnalyser);

            console.log('🎵 [SFU] Local audio analyser setup complete');

            // Start monitoring volume
            this.startVolumeMonitoring();
        } catch (error) {
            console.error('❌ [SFU] Failed to setup audio analyser:', error);
        }
    }

    /**
     * Setup audio analyser for remote participant
     */
    private setupRemoteAudioAnalyser(participant: RemoteParticipant): void {
        if (!this.audioContext || !participant.stream) return;

        try {
            const source = this.audioContext.createMediaStreamSource(participant.stream);
            const analyser = this.audioContext.createAnalyser();
            analyser.fftSize = 256;
            source.connect(analyser);
            participant.audioAnalyser = analyser;
            participant.volumeLevel = 0;

            console.log('🎵 [SFU] Remote audio analyser setup for:', participant.userId);
        } catch (error) {
            console.error('❌ [SFU] Failed to setup remote audio analyser:', error);
        }
    }

    /**
     * Start volume monitoring for all participants
     */
    private startVolumeMonitoring(): void {
        if (this.volumeMonitoringInterval) return;

        this.volumeMonitoringInterval = window.setInterval(() => {
            // Monitor local volume
            if (this.localAudioAnalyser) {
                this.localVolumeLevel = this.getVolumeLevel(this.localAudioAnalyser);
            }

            // Monitor remote volumes
            this.remoteParticipants.forEach((participant) => {
                if (participant.audioAnalyser) {
                    participant.volumeLevel = this.getVolumeLevel(participant.audioAnalyser);
                }
            });
        }, 100); // Update every 100ms
    }

    /**
     * Get volume level from analyser
     */
    private getVolumeLevel(analyser: AnalyserNode): number {
        const dataArray = new Uint8Array(analyser.frequencyBinCount);
        analyser.getByteFrequencyData(dataArray);
        const average = dataArray.reduce((acc, val) => acc + val, 0) / dataArray.length;
        return Math.min(100, (average / 128) * 100);
    }

    /**
     * Get local volume level
     */
    getLocalVolumeLevel(): number {
        return this.localVolumeLevel;
    }

    /**
     * Get remote participant volume level
     */
    getRemoteVolumeLevel(userId: string): number {
        return this.remoteParticipants.get(userId)?.volumeLevel ?? 0;
    }

    /**
     * Toggle mute/unmute
     */
    toggleMute(): boolean {
        if (!this.localStream) return false;

        const audioTrack = this.localStream.getAudioTracks()[0];
        if (!audioTrack) return false;

        this.userMuted = !this.userMuted;

        if (this.userMuted) {
            audioTrack.enabled = false;
            if (this.audioProducerId) {
                sfuService.pauseAudioProducer();
            }
            console.log('🔇 [SFU] Muted');
        } else {
            this.updateMicrophoneState();
            console.log('🎙️ [SFU] Unmuted');
        }

        return this.userMuted;
    }

    /**
     * Check if user is muted
     */
    isMuted(): boolean {
        return this.userMuted;
    }

    /**
     * Enable video (camera)
     */
    async enableVideo(): Promise<void> {
        if (!this.localStream || this.videoProducerId) return;

        try {
            const videoStream = await navigator.mediaDevices.getUserMedia({ video: true });
            const videoTrack = videoStream.getVideoTracks()[0];

            if (videoTrack) {
                this.localStream.addTrack(videoTrack);
                this.videoProducerId = await sfuService.produceVideo(videoTrack);
                console.log('📹 [SFU] Video enabled:', this.videoProducerId);
            }
        } catch (error) {
            console.error('❌ [SFU] Failed to enable video:', error);
            throw error;
        }
    }

    /**
     * Disable video (camera)
     */
    disableVideo(): void {
        if (!this.localStream || !this.videoProducerId) return;

        const videoTrack = this.localStream.getVideoTracks()[0];
        if (videoTrack) {
            videoTrack.stop();
            this.localStream.removeTrack(videoTrack);
        }

        sfuService.closeProducer(this.videoProducerId);
        this.videoProducerId = null;

        console.log('📹 [SFU] Video disabled');
    }

    // ========== Screen Share Methods ==========

    /**
     * Start screen sharing
     */
    async startScreenShare(): Promise<void> {
        if (this.isScreenSharing || this.screenProducerId) {
            console.warn('⚠️ [SFU] Already screen sharing');
            return;
        }

        try {
            // Get screen/window stream
            this.screenStream = await navigator.mediaDevices.getDisplayMedia({
                video: {
                    width: { ideal: 1920 },
                    height: { ideal: 1080 },
                    frameRate: { ideal: 30, max: 60 },
                },
                audio: false, // Screen audio can be added later
            });

            const screenTrack = this.screenStream.getVideoTracks()[0];

            // Handle screen sharing stopped by user (browser UI)
            screenTrack.onended = () => {
                console.log('📺 [SFU] Screen sharing stopped by user');
                this.stopScreenShare();
            };

            // Produce screen track to SFU
            this.screenProducerId = await sfuService.produceScreen(screenTrack);
            this.isScreenSharing = true;

            console.log('📺 [SFU] Screen sharing started:', this.screenProducerId);
        } catch (error) {
            console.error('❌ [SFU] Failed to start screen sharing:', error);
            this.screenStream = null;
            throw error;
        }
    }

    /**
     * Stop screen sharing
     */
    stopScreenShare(): void {
        if (!this.isScreenSharing || !this.screenProducerId) return;

        // Stop all tracks
        if (this.screenStream) {
            this.screenStream.getTracks().forEach((track) => track.stop());
            this.screenStream = null;
        }

        // Close producer
        sfuService.closeProducer(this.screenProducerId);
        this.screenProducerId = null;
        this.isScreenSharing = false;

        console.log('📺 [SFU] Screen sharing stopped');
    }

    /**
     * Get screen sharing state
     */
    getScreenSharingState(): boolean {
        return this.isScreenSharing;
    }

    /**
     * Get local screen stream
     */
    getScreenStream(): MediaStream | null {
        return this.screenStream;
    }

    // ========== VAD Methods ==========

    /**
     * Enable Voice Activity Detection
     */
    enableVAD(): void {
        this.vadEnabled = true;
        this.pttEnabled = false;
        this.pttActive = false; // Reset PTT state
        this.isVoiceActive = false; // Start with inactive state
        this.updateMicrophoneState();
        console.log('🎙️ [SFU] VAD enabled');
    }

    /**
     * Disable Voice Activity Detection
     */
    disableVAD(): void {
        this.vadEnabled = false;
        this.isVoiceActive = false; // Reset voice activity when disabling VAD
        this.updateMicrophoneState();
        console.log('🎙️ [SFU] VAD disabled');
    }

    /**
     * Set voice activity state (called by VAD hook)
     */
    setVADSpeaking(speaking: boolean): void {
        if (!this.vadEnabled) {
            console.warn('⚠️ [SFU] setVADSpeaking called but VAD is disabled');
            return;
        }

        console.log(`🎙️ [SFU] VAD speaking state: ${this.isVoiceActive} → ${speaking}`);
        this.isVoiceActive = speaking;
        this.updateMicrophoneState();
    }

    // ========== PTT Methods ==========

    /**
     * Enable Push-to-Talk
     */
    setPTTEnabled(enabled: boolean): void {
        this.pttEnabled = enabled;
        if (enabled) {
            this.vadEnabled = false;
            this.pttActive = false;
            this.isVoiceActive = false; // Reset voice activity state
        }
        this.updateMicrophoneState();
        console.log(`🎙️ [SFU] PTT ${enabled ? 'enabled' : 'disabled'}`);
    }

    /**
     * Activate PTT (key pressed)
     */
    activatePTT(): void {
        if (!this.pttEnabled) return;
        this.pttActive = true;
        this.updateMicrophoneState();
        console.log('🎙️ [SFU] PTT activated');
    }

    /**
     * Deactivate PTT (key released)
     */
    deactivatePTT(): void {
        if (!this.pttEnabled) return;
        this.pttActive = false;
        this.updateMicrophoneState();
        console.log('🎙️ [SFU] PTT deactivated');
    }

    /**
     * Check if PTT is enabled
     */
    isPTTEnabled(): boolean {
        return this.pttEnabled;
    }

    /**
     * Get PTT key
     */
    getPTTKey(): string {
        return this.pttKey;
    }

    /**
     * Set PTT key
     */
    setPTTKey(key: string): void {
        this.pttKey = key;
    }

    // ========== State Getters ==========

    /**
     * Check if user has peer connection
     */
    hasPeerConnection(userId: string): boolean {
        return this.remoteParticipants.has(userId);
    }

    /**
     * Get SFU service state
     */
    getSFUState() {
        return sfuService.getState();
    }
}

// Singleton instance
export const rtcService = new RTCService();
