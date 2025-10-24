import { makeAutoObservable, runInAction } from 'mobx';
import type { VoiceState, VoiceParticipant } from '@entities/voice/model/types';
import { rtcService } from '@shared/lib/services/rtcService';
import { wsClient } from '@shared/api';
import {
    getVoiceMode,
    getPTTKey,
    getVADSensitivity,
    setVADSensitivity,
    type VADSensitivity,
} from '@shared/lib/utils/deviceSettings';

export class VoiceStore {
    activeVoiceChannelId: string | null = null;
    participants: Map<string, VoiceParticipant> = new Map();
    currentUserId: string | null = null; // Track current user ID

    localState: VoiceState = {
        channelId: undefined,
        muted: false,
        deafened: false,
        selfMuted: false,
        selfDeafened: false,
        streaming: false,
        speaking: false,
    };

    isConnecting = false;
    error: string | null = null;
    pendingConsumers: string[] = []; // User IDs to consume after RTC is ready

    // Observable voice mode state (for reactivity in UI)
    voiceMode: 'vad' | 'ptt' = 'vad';
    pttKey: string = 'Space';
    vadSensitivity: VADSensitivity = 'high';

    constructor() {
        makeAutoObservable(this);
        this.setupWebSocketListeners();

        // Load voice mode from localStorage
        const savedMode = getVoiceMode();
        const savedKey = getPTTKey();
        const savedSensitivity = getVADSensitivity();
        this.voiceMode = savedMode;
        this.pttKey = savedKey;
        this.vadSensitivity = savedSensitivity;
    }

    /**
     * Setup WebSocket listeners for voice state updates
     */
    private setupWebSocketListeners() {
        wsClient.on('voice_state', async (data: unknown) => {
            const voiceData = data as {
                type?: string;
                participants?: VoiceParticipant[];
                userId?: string;
                channelId?: string;
                muted?: boolean;
                deafened?: boolean;
            };

            if (voiceData.type === 'user_joined' && voiceData.participants) {
                // Find the newly joined user
                const newUserId = voiceData.userId;
                const channelId = voiceData.channelId;

                console.log(
                    `📥 voice_state: user_joined, userId=${newUserId}, channelId=${channelId}, participants=`,
                    voiceData.participants?.map((p) => p.userId)
                );

                runInAction(() => {
                    // Remove all participants from this channel first (to avoid duplicates)
                    const participantsToRemove: string[] = [];
                    this.participants.forEach((p, userId) => {
                        if (p.channelId === channelId) {
                            participantsToRemove.push(userId);
                        }
                    });
                    participantsToRemove.forEach((userId) => this.participants.delete(userId));

                    // Add updated participants list for this channel
                    voiceData.participants!.forEach((p) => {
                        this.participants.set(p.userId, p);
                    });
                });

                console.log(
                    `📋 Updated participants list:`,
                    Array.from(this.participants.keys()),
                    `currentUserId=${this.currentUserId}, activeChannel=${this.activeVoiceChannelId}`
                );

                // SFU: Consume audio streams based on who joined
                if (this.activeVoiceChannelId === channelId) {
                    const rtcReady = rtcService.isInChannel();

                    if (newUserId === this.currentUserId) {
                        // I just joined - consume ALL other participants
                        const otherParticipants = voiceData.participants!.filter(
                            (p) => p.userId !== this.currentUserId
                        );

                        if (otherParticipants.length > 0) {
                            if (rtcReady) {
                                // RTC ready - consume immediately
                                console.log(
                                    `🎧 [SFU] I joined channel - consuming ${otherParticipants.length} existing participants:`,
                                    otherParticipants.map((p) => p.userId)
                                );
                                for (const participant of otherParticipants) {
                                    rtcService.consumeParticipant(participant.userId).catch((error) => {
                                        console.error(
                                            `❌ [SFU] Failed to consume participant ${participant.userId}:`,
                                            error
                                        );
                                    });
                                }
                            } else {
                                // RTC not ready - save for later
                                runInAction(() => {
                                    this.pendingConsumers = otherParticipants.map((p) => p.userId);
                                });
                                console.log(
                                    `⏳ [SFU] RTC not ready yet - saved ${this.pendingConsumers.length} participants for later:`,
                                    this.pendingConsumers
                                );
                            }
                        } else {
                            console.log(`✅ [SFU] I'm the first user in the channel`);
                        }
                    } else if (newUserId && newUserId !== this.currentUserId) {
                        // Someone else joined - consume only them
                        if (rtcReady) {
                            console.log(`🎧 [SFU] Consuming new participant: ${newUserId}`);
                            rtcService.consumeParticipant(newUserId).catch((error) => {
                                console.error(`❌ [SFU] Failed to consume participant ${newUserId}:`, error);
                            });
                        } else {
                            console.log(`⏳ [SFU] RTC not ready - cannot consume ${newUserId} yet`);
                        }
                    }
                } else {
                    console.log(
                        `⏭️ [SFU] Skipping consume - activeChannel=${this.activeVoiceChannelId}, newUser=${newUserId}, currentUser=${this.currentUserId}`
                    );
                }
            } else if (voiceData.type === 'user_updated' && voiceData.userId) {
                // Handle mute/deafen updates for existing users
                const updatedUserId = voiceData.userId;
                const channelId = voiceData.channelId;
                const muted = voiceData.muted;
                const deafened = voiceData.deafened;

                console.log(`🔄 User updated: ${updatedUserId}, muted=${muted}, deafened=${deafened}`);

                runInAction(() => {
                    const participant = this.participants.get(updatedUserId);
                    if (participant) {
                        this.participants.set(updatedUserId, {
                            ...participant,
                            muted: muted ?? participant.muted,
                            deafened: deafened ?? participant.deafened,
                        });
                    }
                });

                // SFU: If user re-joined (user_updated after disconnect), try to consume their stream
                // This handles the case where a user refreshes/rejoins the channel
                if (
                    this.activeVoiceChannelId === channelId &&
                    updatedUserId &&
                    updatedUserId !== this.currentUserId &&
                    rtcService.isInChannel()
                ) {
                    console.log(`🔄 [SFU] User re-joined, re-consuming: ${updatedUserId}`);
                    rtcService.consumeParticipant(updatedUserId).catch((error) => {
                        console.error(`❌ [SFU] Failed to re-consume participant ${updatedUserId}:`, error);
                    });
                }
            } else if (voiceData.type === 'user_left' && voiceData.userId) {
                const leftUserId = voiceData.userId;
                console.log(`👋 [SFU] User left: ${leftUserId}`);

                runInAction(() => {
                    this.participants.delete(leftUserId);
                });

                // SFU will handle cleanup automatically when WebSocket event is received
            }
        });

        // Listen for speaking state updates
        wsClient.on('speaking_state', (data: unknown) => {
            const speakingData = data as {
                channelId?: string;
                userId?: string;
                speaking?: boolean;
            };

            const { channelId, userId, speaking } = speakingData;

            if (!channelId || !userId || speaking === undefined) {
                console.warn('⚠️ Invalid speaking_state data:', speakingData);
                return;
            }

            console.log(`🎤 Speaking state update received:`, {
                channelId,
                userId,
                speaking,
                currentParticipant: this.participants.get(userId),
            });

            // Update participant speaking state
            runInAction(() => {
                const participant = this.participants.get(userId);
                if (participant) {
                    console.log(`✅ Updating participant ${userId} speaking state:`, speaking);
                    this.participants.set(userId, {
                        ...participant,
                        speaking,
                    });
                } else {
                    console.warn(`⚠️ Participant ${userId} not found in participants map`);
                }
            });
        });
    }

    get isInVoiceChannel(): boolean {
        return this.activeVoiceChannelId !== null;
    }

    get participantsList(): VoiceParticipant[] {
        // Only return participants from the current active voice channel
        if (!this.activeVoiceChannelId) return [];

        return Array.from(this.participants.values()).filter((p) => p.channelId === this.activeVoiceChannelId);
    }

    async joinVoiceChannel(channelId: string, userId: string, username: string, avatarUrl?: string) {
        if (this.isConnecting) return;

        // If already in a voice channel, leave it first
        if (this.activeVoiceChannelId && this.activeVoiceChannelId !== channelId) {
            console.log(`🔄 Switching from ${this.activeVoiceChannelId} to ${channelId}, leaving old channel...`);
            this.leaveVoiceChannel(userId, username, avatarUrl);
            // Wait a bit for cleanup
            await new Promise((resolve) => setTimeout(resolve, 100));
        }

        this.isConnecting = true;
        this.error = null;

        try {
            runInAction(() => {
                this.activeVoiceChannelId = channelId;
                this.localState.channelId = channelId;
                this.currentUserId = userId; // Store current user ID

                // Add current user to participants list
                this.participants.set(userId, {
                    userId,
                    username,
                    avatarUrl,
                    channelId, // Add channelId
                    muted: false,
                    deafened: false,
                    speaking: false,
                    volume: 0,
                    joinedAt: new Date(),
                });
            });

            // Notify server via WebSocket FIRST - this will trigger voice_state event
            // which will update participants list with other users
            wsClient.updateVoiceState(channelId, userId, username, avatarUrl, false, false);

            // Wait for WebSocket voice_state response with participants list
            // Use Promise to wait for the actual event, not just timeout
            await new Promise<void>((resolve) => {
                const maxWaitTime = 3000; // 3 seconds max
                const startTime = Date.now();

                const checkParticipants = () => {
                    // Check if we received participants list (at least ourselves)
                    const channelParticipants = Array.from(this.participants.values()).filter(
                        (p) => p.channelId === channelId
                    );

                    if (channelParticipants.length > 0) {
                        console.log(
                            `✅ Received participants list:`,
                            channelParticipants.map((p) => p.userId)
                        );
                        resolve();
                    } else if (Date.now() - startTime > maxWaitTime) {
                        console.warn('⚠️ Timeout waiting for participants list, continuing anyway...');
                        resolve();
                    } else {
                        // Check again in 50ms
                        setTimeout(checkParticipants, 50);
                    }
                };

                checkParticipants();
            });

            // Get current participants in channel (except current user)
            const otherUserIds = Array.from(this.participants.values())
                .filter((p) => p.channelId === channelId && p.userId !== userId)
                .map((p) => p.userId);

            console.log(`👥 Other users in channel:`, otherUserIds);

            // Start WebRTC call with other users FIRST to initialize local stream
            await rtcService.joinVoiceChannel(channelId, userId, otherUserIds);

            // THEN load and apply saved voice mode (after local stream is ready)
            const savedMode = getVoiceMode();
            const pttKey = getPTTKey();
            console.log(`🎙️ Applying saved voice mode: ${savedMode}, PTT key: ${pttKey}`);
            await this.setVoiceMode(savedMode, pttKey);

            // Consume pending participants (who joined before RTC was ready)
            if (this.pendingConsumers.length > 0) {
                console.log(
                    `🎧 [SFU] RTC ready - consuming ${this.pendingConsumers.length} pending participants:`,
                    this.pendingConsumers
                );
                for (const pendingUserId of this.pendingConsumers) {
                    rtcService.consumeParticipant(pendingUserId).catch((error) => {
                        console.error(`❌ [SFU] Failed to consume pending participant ${pendingUserId}:`, error);
                    });
                }
                runInAction(() => {
                    this.pendingConsumers = [];
                });
            }

            runInAction(() => {
                this.isConnecting = false;
            });

            console.log(`✅ Joined voice channel ${channelId}`);
        } catch (error) {
            runInAction(() => {
                this.error = error instanceof Error ? error.message : 'Failed to join voice channel';
                this.isConnecting = false;
            });
            console.error('Failed to join voice channel:', error);
        }
    }

    leaveVoiceChannel(userId?: string, username?: string, avatarUrl?: string) {
        if (userId) {
            // Notify server
            wsClient.updateVoiceState(null, userId, username || 'Unknown', avatarUrl, false, false);
        }

        // Stop WebRTC
        rtcService.leaveVoiceChannel();

        runInAction(() => {
            this.activeVoiceChannelId = null;
            this.localState.channelId = undefined;
            this.localState.selfMuted = false;
            this.localState.selfDeafened = false;
            this.localState.streaming = false;
            this.participants.clear();
            this.currentUserId = null; // Clear current user ID
        });

        console.log('👋 Left voice channel');
    }

    toggleMute() {
        const isMuted = rtcService.toggleMute();

        runInAction(() => {
            this.localState.selfMuted = isMuted;
            this.localState.muted = isMuted;

            // Update current participant's muted state
            if (this.currentUserId) {
                const participant = this.participants.get(this.currentUserId);
                if (participant) {
                    this.participants.set(this.currentUserId, {
                        ...participant,
                        muted: isMuted,
                    });
                }
            }
        });

        // Notify server about mute state change
        if (this.activeVoiceChannelId && this.currentUserId) {
            const participant = this.participants.get(this.currentUserId);
            if (participant) {
                wsClient.updateVoiceState(
                    this.activeVoiceChannelId,
                    this.currentUserId,
                    participant.username,
                    participant.avatarUrl,
                    isMuted,
                    this.localState.selfDeafened
                );
            }
        }

        console.log(`🎤 ${isMuted ? 'Muted' : 'Unmuted'}`);
    }

    toggleDeafen() {
        const wasDeafened = this.localState.selfDeafened;

        runInAction(() => {
            this.localState.selfDeafened = !wasDeafened;
            this.localState.deafened = !wasDeafened;

            // When deafened, also mute
            if (this.localState.selfDeafened && !this.localState.selfMuted) {
                rtcService.toggleMute();
                this.localState.selfMuted = true;
                this.localState.muted = true;
            }

            // Update current participant's deafened state
            if (this.currentUserId) {
                const participant = this.participants.get(this.currentUserId);
                if (participant) {
                    this.participants.set(this.currentUserId, {
                        ...participant,
                        deafened: !wasDeafened,
                        muted: this.localState.selfMuted, // Also update muted in case it was toggled
                    });
                }
            }
        });

        // Notify server about deafen state change
        if (this.activeVoiceChannelId && this.currentUserId) {
            const participant = this.participants.get(this.currentUserId);
            if (participant) {
                wsClient.updateVoiceState(
                    this.activeVoiceChannelId,
                    this.currentUserId,
                    participant.username,
                    participant.avatarUrl,
                    this.localState.selfMuted,
                    this.localState.selfDeafened
                );
            }
        }

        console.log(`🔇 ${this.localState.selfDeafened ? 'Deafened' : 'Undeafened'}`);
    }

    async toggleVideo() {
        if (this.localState.streaming) {
            rtcService.disableVideo();
            this.localState.streaming = false;
            console.log(`📹 Video disabled`);
        } else {
            await rtcService.enableVideo();
            this.localState.streaming = true;
            console.log(`📹 Video enabled`);
        }
    }

    // Screen sharing state
    isScreenSharing = false;
    screenShareError: string | null = null;

    async startScreenShare() {
        try {
            this.screenShareError = null;
            await rtcService.startScreenShare();
            runInAction(() => {
                this.isScreenSharing = true;
            });
            console.log(`📺 Screen sharing started`);
        } catch (error) {
            runInAction(() => {
                this.screenShareError = error instanceof Error ? error.message : 'Failed to start screen share';
                this.isScreenSharing = false;
            });
            throw error;
        }
    }

    async stopScreenShare() {
        rtcService.stopScreenShare();
        runInAction(() => {
            this.isScreenSharing = false;
            this.screenShareError = null;
        });
        console.log(`📺 Screen sharing stopped`);
    }

    setSpeaking(speaking: boolean) {
        this.localState.speaking = speaking;
    }

    addParticipant(participant: VoiceParticipant) {
        this.participants.set(participant.userId, participant);
    }

    removeParticipant(userId: string) {
        this.participants.delete(userId);
    }

    updateParticipant(userId: string, updates: Partial<VoiceParticipant>) {
        const participant = this.participants.get(userId);
        if (participant) {
            this.participants.set(userId, { ...participant, ...updates });
        }
    }

    /**
     * Get local user volume level (0-100)
     */
    getLocalVolumeLevel(): number {
        return rtcService.getLocalVolumeLevel();
    }

    /**
     * Get remote participant volume level (0-100)
     */
    getPeerVolumeLevel(userId: string): number {
        return rtcService.getRemoteVolumeLevel(userId);
    }

    /**
     * Get all remote participant streams for audio playback
     */
    getPeerStreams(): Map<string, MediaStream> {
        return rtcService.getPeerStreams();
    }

    /**
     * Get stream for specific remote participant
     */
    getPeerStream(userId: string): MediaStream | null {
        const streams = rtcService.getPeerStreams();
        return streams.get(userId) || null;
    }

    /**
     * Set voice mode: 'vad' (Voice Activity Detection) or 'ptt' (Push-to-Talk)
     */
    async setVoiceMode(mode: 'vad' | 'ptt', pttKey?: string): Promise<void> {
        console.log(`🎙️ Setting voice mode to: ${mode}`);

        // Update observable state
        runInAction(() => {
            this.voiceMode = mode;
            if (pttKey) {
                this.pttKey = pttKey;
                rtcService.setPTTKey(pttKey);
            }
        });

        // Disable all modes first
        rtcService.disableVAD();
        rtcService.setPTTEnabled(false);

        // Enable selected mode
        if (mode === 'vad') {
            rtcService.enableVAD();
        } else if (mode === 'ptt') {
            rtcService.setPTTEnabled(true);
        }
    }

    /**
     * Set VAD sensitivity level
     * @param sensitivity - 'low' (quiet environments), 'medium' (normal rooms), 'high' (noisy environments)
     */
    setVADSensitivity(sensitivity: VADSensitivity): void {
        console.log(`🎙️ Setting VAD sensitivity to: ${sensitivity}`);

        runInAction(() => {
            this.vadSensitivity = sensitivity;
        });

        // Save to localStorage
        setVADSensitivity(sensitivity);
    }

    /**
     * Get current PTT state
     */
    getPTTState(): { enabled: boolean; key: string } {
        return {
            enabled: rtcService.isPTTEnabled(),
            key: rtcService.getPTTKey(),
        };
    }

    /**
     * Get current VAD mode
     */
    isVADEnabled(): boolean {
        return this.voiceMode === 'vad';
    }
}

export const voiceStore = new VoiceStore();
