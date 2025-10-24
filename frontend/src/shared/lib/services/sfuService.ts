/**
 * SFU Service - mediasoup-client wrapper for Pure SFU architecture
 *
 * Responsibilities:
 * - Initialize mediasoup Device with router RTP capabilities
 * - Create WebRTC transports (send/recv) for media streams
 * - Produce audio/video streams to SFU
 * - Consume audio/video streams from other participants
 * - Handle transport connection and media routing
 *
 * Architecture: Pure SFU (no P2P, all media goes through server)
 */

import { Device } from 'mediasoup-client';
import type { types } from 'mediasoup-client';
import { apiClient } from '@shared/api/http';

// Type aliases for easier use
type Transport = types.Transport;
type Producer = types.Producer;
type Consumer = types.Consumer;
type RtpCapabilities = types.RtpCapabilities;
type DtlsParameters = types.DtlsParameters;
type IceCandidate = types.IceCandidate;
type IceParameters = types.IceParameters;

interface TransportOptions {
    id: string;
    iceParameters: IceParameters;
    iceCandidates: IceCandidate[];
    dtlsParameters: DtlsParameters;
    iceServers?: Array<{
        urls: string | string[];
        username?: string;
        credential?: string;
    }>; // STUN/TURN servers for NAT traversal
}

interface ProducerInfo {
    id: string;
    userId: string;
    kind: 'audio' | 'video' | 'screen';
}

class SFUService {
    private device: Device | null = null;
    private sendTransport: Transport | null = null;
    private recvTransport: Transport | null = null;
    private producers: Map<string, Producer> = new Map(); // producerId -> Producer
    private consumers: Map<string, Consumer> = new Map(); // consumerId -> Consumer
    private currentChannelId: string | null = null;

    /**
     * Initialize mediasoup Device with router RTP capabilities
     */
    async initDevice(channelId: string): Promise<void> {
        try {
            console.log('[SFU] Initializing device for channel:', channelId);
            this.currentChannelId = channelId;

            // Get router RTP capabilities from SFU
            const response = await apiClient.get<{ rtpCapabilities: RtpCapabilities }>(
                `/voice/rtp-capabilities/${channelId}`
            );

            // Create mediasoup Device
            this.device = new Device();
            await this.device.load({ routerRtpCapabilities: response.data.rtpCapabilities });

            console.log('[SFU] Device initialized, RTP capabilities loaded');
        } catch (error) {
            console.error('[SFU] Failed to initialize device:', error);
            throw error;
        }
    }

    /**
     * Create send transport for producing audio/video to SFU
     */
    async createSendTransport(userId: string): Promise<void> {
        if (!this.device) {
            throw new Error('Device not initialized');
        }

        try {
            console.log('[SFU] Creating send transport...');

            // Request transport creation from SFU
            const response = await apiClient.post<TransportOptions>('/voice/create-transport', {
                channelId: this.currentChannelId,
                userId,
                direction: 'send',
            });

            // DEBUG: Log received ICE candidates
            console.log('🧊 [SFU] Received ICE candidates for send transport:', response.data.iceCandidates);
            console.log('🌐 [SFU] ICE servers from backend:', response.data.iceServers);

            // Create local send transport with ICE servers for NAT traversal
            this.sendTransport = this.device.createSendTransport({
                id: response.data.id,
                iceParameters: response.data.iceParameters,
                iceCandidates: response.data.iceCandidates, // Use all candidates (UDP + TCP)
                dtlsParameters: response.data.dtlsParameters,
                iceServers: response.data.iceServers, // STUN servers from backend
            });

            // DEBUG: Log transport state changes
            this.sendTransport.on('connectionstatechange', (state) => {
                console.log(`🔌 [SFU] Send transport connection state: ${state}`);
            });

            // Handle 'connect' event - send DTLS parameters to server
            this.sendTransport.on(
                'connect',
                async (
                    { dtlsParameters }: { dtlsParameters: DtlsParameters },
                    callback: () => void,
                    errback: (error: Error) => void
                ) => {
                    try {
                        console.log('[SFU] Send transport connecting...');
                        await apiClient.post('/voice/connect-transport', {
                            channelId: this.currentChannelId,
                            userId,
                            transportId: this.sendTransport!.id,
                            dtlsParameters,
                        });
                        callback();
                        console.log('[SFU] Send transport connected');
                    } catch (error) {
                        console.error('[SFU] Send transport connect failed:', error);
                        errback(error as Error);
                    }
                }
            );

            // Handle 'produce' event - notify server about new producer
            this.sendTransport.on(
                'produce',
                async (
                    {
                        kind,
                        rtpParameters,
                        appData,
                    }: { kind: types.MediaKind; rtpParameters: types.RtpParameters; appData?: { kind?: string } },
                    callback: (params: { id: string }) => void,
                    errback: (error: Error) => void
                ) => {
                    try {
                        // Use appData.kind if available (for screen sharing), otherwise use mediasoup kind
                        const producerKind = (appData?.kind as 'audio' | 'video' | 'screen') || kind;
                        console.log(`[SFU] Producing ${producerKind} (mediasoup kind: ${kind})...`);

                        const response = await apiClient.post<{ id: string }>('/voice/produce', {
                            transportId: this.sendTransport!.id,
                            channelId: this.currentChannelId,
                            userId,
                            kind: producerKind, // Send 'screen' for screen sharing
                            rtpParameters,
                        });
                        callback({ id: response.data.id });
                        console.log(`[SFU] ${producerKind} producer created:`, response.data.id);
                    } catch (error) {
                        console.error(`[SFU] Produce ${kind} failed:`, error);
                        errback(error as Error);
                    }
                }
            );

            console.log('[SFU] Send transport created:', this.sendTransport.id);
        } catch (error) {
            console.error('[SFU] Failed to create send transport:', error);
            throw error;
        }
    }

    /**
     * Create receive transport for consuming audio/video from SFU
     */
    async createRecvTransport(userId: string): Promise<void> {
        if (!this.device) {
            throw new Error('Device not initialized');
        }

        try {
            console.log('[SFU] Creating recv transport...');

            // Request transport creation from SFU
            const response = await apiClient.post<TransportOptions>('/voice/create-transport', {
                channelId: this.currentChannelId,
                userId,
                direction: 'recv',
            });

            // DEBUG: Log received ICE candidates
            console.log('🧊 [SFU] Received ICE candidates for recv transport:', response.data.iceCandidates);
            console.log('🌐 [SFU] ICE servers from backend:', response.data.iceServers);

            // Create local recv transport with ICE servers for NAT traversal
            this.recvTransport = this.device.createRecvTransport({
                id: response.data.id,
                iceParameters: response.data.iceParameters,
                iceCandidates: response.data.iceCandidates, // Use all candidates (UDP + TCP)
                dtlsParameters: response.data.dtlsParameters,
                iceServers: response.data.iceServers, // STUN servers from backend
            });

            // DEBUG: Log transport state changes
            this.recvTransport.on('connectionstatechange', (state) => {
                console.log(`🔌 [SFU] Recv transport connection state: ${state}`);
            });

            // Handle 'connect' event
            this.recvTransport.on(
                'connect',
                async (
                    { dtlsParameters }: { dtlsParameters: DtlsParameters },
                    callback: () => void,
                    errback: (error: Error) => void
                ) => {
                    try {
                        console.log('[SFU] Recv transport connecting...');
                        await apiClient.post('/voice/connect-transport', {
                            channelId: this.currentChannelId,
                            userId,
                            transportId: this.recvTransport!.id,
                            dtlsParameters,
                        });
                        callback();
                        console.log('[SFU] Recv transport connected');
                    } catch (error) {
                        console.error('[SFU] Recv transport connect failed:', error);
                        errback(error as Error);
                    }
                }
            );

            console.log('[SFU] Recv transport created:', this.recvTransport.id);
        } catch (error) {
            console.error('[SFU] Failed to create recv transport:', error);
            throw error;
        }
    }

    /**
     * Produce audio track to SFU
     */
    async produceAudio(track: MediaStreamTrack): Promise<string> {
        if (!this.sendTransport) {
            throw new Error('Send transport not created');
        }

        try {
            console.log('[SFU] Producing audio track...');
            const producer = await this.sendTransport.produce({
                track,
                codecOptions: {
                    opusStereo: true,
                    opusDtx: true, // Discontinuous transmission for silence suppression
                },
            });

            this.producers.set(producer.id, producer);
            console.log('[SFU] Audio producer created:', producer.id);

            // Handle producer close
            producer.on('trackended', () => {
                console.log('[SFU] Audio track ended');
                this.closeProducer(producer.id);
            });

            producer.on('transportclose', () => {
                console.log('[SFU] Transport closed, removing audio producer');
                this.producers.delete(producer.id);
            });

            return producer.id;
        } catch (error) {
            console.error('[SFU] Failed to produce audio:', error);
            throw error;
        }
    }

    /**
     * Produce video track to SFU
     */
    async produceVideo(track: MediaStreamTrack): Promise<string> {
        if (!this.sendTransport) {
            throw new Error('Send transport not created');
        }

        try {
            console.log('[SFU] Producing video track...');
            const producer = await this.sendTransport.produce({ track });

            this.producers.set(producer.id, producer);
            console.log('[SFU] Video producer created:', producer.id);

            // Handle producer close
            producer.on('trackended', () => {
                console.log('[SFU] Video track ended');
                this.closeProducer(producer.id);
            });

            producer.on('transportclose', () => {
                console.log('[SFU] Transport closed, removing video producer');
                this.producers.delete(producer.id);
            });

            return producer.id;
        } catch (error) {
            console.error('[SFU] Failed to produce video:', error);
            throw error;
        }
    }

    /**
     * Produce screen share track to SFU
     */
    async produceScreen(track: MediaStreamTrack): Promise<string> {
        if (!this.sendTransport) {
            throw new Error('Send transport not created');
        }

        try {
            console.log('[SFU] Producing screen share track...');
            const producer = await this.sendTransport.produce({
                track,
                // Pass 'screen' kind in appData so the produce event handler can use it
                appData: { kind: 'screen' },
                // Screen sharing specific settings
                encodings: [
                    {
                        maxBitrate: 3000000, // 3 Mbps for high quality screen
                        scalabilityMode: 'L1T3', // Temporal layers for adaptive bitrate
                    },
                ],
            });

            this.producers.set(producer.id, producer);
            console.log('[SFU] Screen producer created:', producer.id);

            // Handle producer close
            producer.on('trackended', () => {
                console.log('[SFU] Screen track ended');
                this.closeProducer(producer.id);
            });

            producer.on('transportclose', () => {
                console.log('[SFU] Transport closed, removing screen producer');
                this.producers.delete(producer.id);
            });

            return producer.id;
        } catch (error) {
            console.error('[SFU] Failed to produce screen:', error);
            throw error;
        }
    }

    /**
     * Consume audio/video from another participant
     */
    async consume(producerId: string, userId: string): Promise<MediaStreamTrack | null> {
        if (!this.recvTransport || !this.device) {
            throw new Error('Recv transport or device not initialized');
        }

        try {
            console.log('[SFU] Consuming producer:', producerId);

            // Request consumption from SFU
            const response = await apiClient.post<{
                id: string;
                kind: 'audio' | 'video' | 'screen';
                rtpParameters: types.RtpParameters;
                producerId: string;
            }>('/voice/consume', {
                transportId: this.recvTransport.id,
                channelId: this.currentChannelId,
                userId,
                producerId,
                rtpCapabilities: this.device.rtpCapabilities,
            });

            // Create local consumer
            // Note: screen sharing uses 'video' kind in mediasoup, but we track it as 'screen' in our app
            const consumerKind = response.data.kind === 'screen' ? 'video' : response.data.kind;
            const consumer = await this.recvTransport.consume({
                id: response.data.id,
                producerId: response.data.producerId,
                kind: consumerKind as 'audio' | 'video',
                rtpParameters: response.data.rtpParameters,
            });

            this.consumers.set(consumer.id, consumer);
            console.log(`[SFU] ${response.data.kind} consumer created:`, consumer.id);

            // Handle consumer close
            consumer.on('transportclose', () => {
                console.log('[SFU] Transport closed, removing consumer');
                this.consumers.delete(consumer.id);
            });

            return consumer.track;
        } catch (error) {
            console.error('[SFU] Failed to consume:', error);
            return null;
        }
    }

    /**
     * Get list of producers in channel (for consuming)
     */
    async getProducers(userId: string): Promise<ProducerInfo[]> {
        if (!this.currentChannelId) {
            throw new Error('Not joined to any channel');
        }

        try {
            console.log(`📋 [SFU] Fetching producers for userId: ${userId} in channel: ${this.currentChannelId}`);
            const response = await apiClient.get<{ producers: ProducerInfo[] }>(
                `/voice/producers/${this.currentChannelId}/user/${userId}`
            );
            console.log(`📋 [SFU] Found ${response.data.producers.length} producers:`, response.data.producers);
            return response.data.producers;
        } catch (error) {
            console.error('[SFU] Failed to get producers:', error);
            return [];
        }
    }

    /**
     * Close specific producer
     */
    closeProducer(producerId: string): void {
        const producer = this.producers.get(producerId);
        if (producer) {
            producer.close();
            this.producers.delete(producerId);
            console.log('[SFU] Producer closed:', producerId);
        }
    }

    /**
     * Close specific consumer
     */
    closeConsumer(consumerId: string): void {
        const consumer = this.consumers.get(consumerId);
        if (consumer) {
            consumer.close();
            this.consumers.delete(consumerId);
            console.log('[SFU] Consumer closed:', consumerId);
        }
    }

    /**
     * Leave voice channel and cleanup all resources
     */
    async leave(userId: string): Promise<void> {
        try {
            console.log('[SFU] Leaving channel...');

            // Close all producers
            this.producers.forEach((producer, id) => {
                producer.close();
                console.log('[SFU] Closed producer:', id);
            });
            this.producers.clear();

            // Close all consumers
            this.consumers.forEach((consumer, id) => {
                consumer.close();
                console.log('[SFU] Closed consumer:', id);
            });
            this.consumers.clear();

            // Close transports
            if (this.sendTransport) {
                this.sendTransport.close();
                this.sendTransport = null;
                console.log('[SFU] Send transport closed');
            }

            if (this.recvTransport) {
                this.recvTransport.close();
                this.recvTransport = null;
                console.log('[SFU] Recv transport closed');
            }

            // Notify server
            if (this.currentChannelId) {
                await apiClient.post('/voice/leave', {
                    channelId: this.currentChannelId,
                    userId,
                });
            }

            this.currentChannelId = null;
            this.device = null;

            console.log('[SFU] Left channel successfully');
        } catch (error) {
            console.error('[SFU] Failed to leave channel:', error);
            throw error;
        }
    }

    /**
     * Pause/resume audio producer (mute/unmute)
     */
    pauseAudioProducer(): void {
        this.producers.forEach((producer) => {
            if (producer.kind === 'audio' && !producer.paused) {
                producer.pause();
                console.log('[SFU] Audio producer paused');
            }
        });
    }

    resumeAudioProducer(): void {
        this.producers.forEach((producer) => {
            if (producer.kind === 'audio' && producer.paused) {
                producer.resume();
                console.log('[SFU] Audio producer resumed');
            }
        });
    }

    /**
     * Pause/resume video producer (camera off/on)
     */
    pauseVideoProducer(): void {
        this.producers.forEach((producer) => {
            if (producer.kind === 'video' && !producer.paused) {
                producer.pause();
                console.log('[SFU] Video producer paused');
            }
        });
    }

    resumeVideoProducer(): void {
        this.producers.forEach((producer) => {
            if (producer.kind === 'video' && producer.paused) {
                producer.resume();
                console.log('[SFU] Video producer resumed');
            }
        });
    }

    /**
     * Get current state
     */
    getState() {
        return {
            isInitialized: !!this.device,
            hasTransports: !!(this.sendTransport && this.recvTransport),
            producerCount: this.producers.size,
            consumerCount: this.consumers.size,
            channelId: this.currentChannelId,
        };
    }
}

// Singleton instance
export const sfuService = new SFUService();
