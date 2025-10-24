import * as mediasoup from 'mediasoup';
import type { types } from 'mediasoup';
import os from 'os';
import { sfuConfig } from '../config/sfu.config.js';
import { SFURoom, SFUParticipant, TransportOptions, ProduceRequest, ConsumeRequest } from '../types/sfu.types.js';
import type { WebSocketManager } from '../websocket/websocket.js';

// Type aliases for easier use
type Worker = types.Worker;
type Router = types.Router;
type WebRtcTransport = types.WebRtcTransport;
type Producer = types.Producer;
type Consumer = types.Consumer;
type RtpCapabilities = types.RtpCapabilities;
type WorkerLogTag = types.WorkerLogTag;

class SFUService {
    private workers: Worker[] = [];
    private rooms: Map<string, SFURoom> = new Map();
    private nextWorkerIdx = 0;
    private wsManager: WebSocketManager | null = null;

    setWebSocketManager(wsManager: WebSocketManager) {
        this.wsManager = wsManager;
        console.log('✅ WebSocketManager connected to SFUService');
    }

    async init() {
        console.log('🚀 Initializing SFU service...');

        const numWorkers = Math.min(os.cpus().length, 4);
        console.log(`Creating ${numWorkers} mediasoup workers...`);

        for (let i = 0; i < numWorkers; i++) {
            const worker = await mediasoup.createWorker({
                rtcMinPort: sfuConfig.worker.rtcMinPort,
                rtcMaxPort: sfuConfig.worker.rtcMaxPort,
                logLevel: sfuConfig.worker.logLevel,
                logTags: sfuConfig.worker.logTags as WorkerLogTag[],
            });

            worker.on('died', () => {
                console.error(`❌ Worker ${i} died, exiting...`);
                process.exit(1);
            });

            this.workers.push(worker);
            console.log(`✅ Worker ${i} created (PID: ${worker.pid})`);
        }

        console.log('✅ SFU service initialized successfully');
    }

    async getOrCreateRoom(channelId: string): Promise<Router> {
        let room = this.rooms.get(channelId);

        if (!room) {
            console.log(`📡 Creating room for channel ${channelId}`);

            const worker = this.workers[this.nextWorkerIdx];
            this.nextWorkerIdx = (this.nextWorkerIdx + 1) % this.workers.length;

            const router = await worker.createRouter({
                mediaCodecs: sfuConfig.router.mediaCodecs,
            });

            room = {
                channelId,
                router,
                participants: new Map(),
                createdAt: new Date(),
            };

            this.rooms.set(channelId, room);
            console.log(`✅ Room ${channelId} created`);
        }

        return room.router;
    }

    async createTransport(channelId: string, userId: string, direction: 'send' | 'recv'): Promise<TransportOptions> {
        const room = this.rooms.get(channelId);
        if (!room) {
            throw new Error(`Room ${channelId} not found`);
        }

        let participant = room.participants.get(userId);
        if (!participant) {
            participant = {
                userId,
                consumers: new Map(),
            };
            room.participants.set(userId, participant);
        }

        console.log(`🔌 Creating ${direction} transport for user ${userId} in channel ${channelId}`);

        const transport = await room.router.createWebRtcTransport({
            listenIps: sfuConfig.webRtcTransport.listenIps,
            enableUdp: sfuConfig.webRtcTransport.enableUdp,
            enableTcp: sfuConfig.webRtcTransport.enableTcp,
            preferUdp: sfuConfig.webRtcTransport.preferUdp,
            initialAvailableOutgoingBitrate: sfuConfig.webRtcTransport.initialAvailableOutgoingBitrate,
        });

        // DEBUG: Log ICE candidates to diagnose connection issues
        console.log(`🧊 ICE candidates for ${direction} transport:`, JSON.stringify(transport.iceCandidates, null, 2));

        if (direction === 'send') {
            participant.sendTransport = transport;
        } else {
            participant.recvTransport = transport;
        }

        return {
            id: transport.id,
            iceParameters: transport.iceParameters,
            iceCandidates: transport.iceCandidates,
            dtlsParameters: transport.dtlsParameters,
            iceServers: sfuConfig.webRtcTransport.iceServers, // Add STUN servers for NAT traversal
        };
    }

    async connectTransport(channelId: string, userId: string, transportId: string, dtlsParameters: any): Promise<void> {
        const room = this.rooms.get(channelId);
        if (!room) throw new Error(`Room ${channelId} not found`);

        const participant = room.participants.get(userId);
        if (!participant) throw new Error(`Participant ${userId} not found`);

        const transport =
            participant.sendTransport?.id === transportId
                ? participant.sendTransport
                : participant.recvTransport?.id === transportId
                ? participant.recvTransport
                : null;

        if (!transport) throw new Error(`Transport ${transportId} not found`);

        await transport.connect({ dtlsParameters });
        console.log(`✅ Transport ${transportId} connected for user ${userId}`);
    }

    async produce(request: ProduceRequest): Promise<string> {
        const { channelId, userId, kind, rtpParameters, appData } = request;

        const room = this.rooms.get(channelId);
        if (!room) throw new Error(`Room ${channelId} not found`);

        const participant = room.participants.get(userId);
        if (!participant || !participant.sendTransport) {
            throw new Error(`Send transport not found for user ${userId}`);
        }

        console.log(`🎤 Creating ${kind} producer for user ${userId}`);

        // Convert 'screen' to 'video' for mediasoup (screen sharing uses video kind)
        const mediasoupKind: 'audio' | 'video' = kind === 'screen' ? 'video' : kind;

        const producer = await participant.sendTransport.produce({
            kind: mediasoupKind,
            rtpParameters,
            appData: { ...appData, userId, producerType: kind }, // Track original type in appData
        });

        if (kind === 'audio') {
            participant.audioProducer = producer;
        } else if (kind === 'video') {
            participant.videoProducer = producer;
        } else if (kind === 'screen') {
            // Screen sharing uses video kind, store separately
            participant.screenProducer = producer;
        }

        // Handle producer close event
        producer.on('@close', () => {
            console.log(`🔴 Producer ${producer.id} closed for user ${userId}, kind: ${kind}`);

            // Clear producer reference
            if (kind === 'audio') {
                participant.audioProducer = undefined;
            } else if (kind === 'video') {
                participant.videoProducer = undefined;
            } else if (kind === 'screen') {
                participant.screenProducer = undefined;
            }

            // Notify other participants about producer closure
            if (this.wsManager) {
                console.log(`📢 Broadcasting producer_closed event for ${userId}, kind: ${kind}`);
                this.wsManager.broadcastToChannel(channelId, {
                    type: 'producer_closed',
                    data: {
                        producerId: producer.id,
                        userId,
                        kind,
                        channelId,
                    },
                    timestamp: new Date(),
                });
            }
        });

        console.log(`✅ Producer ${producer.id} created for user ${userId}`);

        // Notify other participants in the channel about new producer
        if (this.wsManager) {
            const participantCount = room.participants.size;
            console.log(
                `📢 Broadcasting new_producer event to channel ${channelId} with ${participantCount} participants:`,
                Array.from(room.participants.keys())
            );
            this.wsManager.broadcastToChannel(channelId, {
                type: 'new_producer',
                data: {
                    producerId: producer.id,
                    userId,
                    kind,
                    channelId,
                },
                timestamp: new Date(),
            });
        } else {
            console.warn('⚠️ WebSocketManager not available, cannot broadcast new_producer event');
        }

        return producer.id;
    }

    async consume(request: ConsumeRequest): Promise<any> {
        const { channelId, userId, producerId, rtpCapabilities } = request;

        const room = this.rooms.get(channelId);
        if (!room) throw new Error(`Room ${channelId} not found`);

        const participant = room.participants.get(userId);
        if (!participant || !participant.recvTransport) {
            throw new Error(`Recv transport not found for user ${userId}`);
        }

        if (!room.router.canConsume({ producerId, rtpCapabilities })) {
            throw new Error(`Cannot consume producer ${producerId}`);
        }

        console.log(`🎧 Creating consumer for user ${userId} from producer ${producerId}`);

        const consumer = await participant.recvTransport.consume({
            producerId,
            rtpCapabilities,
            paused: false,
        });

        participant.consumers.set(producerId, consumer);

        return {
            id: consumer.id,
            producerId: consumer.producerId,
            kind: consumer.kind,
            rtpParameters: consumer.rtpParameters,
        };
    }

    getProducers(channelId: string, excludeUserId: string): Array<{ id: string; userId: string; kind: string }> {
        const room = this.rooms.get(channelId);
        if (!room) return [];

        const producers: Array<{ id: string; userId: string; kind: string }> = [];

        room.participants.forEach((participant, userId) => {
            if (userId === excludeUserId) return;

            if (participant.audioProducer) {
                producers.push({
                    id: participant.audioProducer.id,
                    userId,
                    kind: 'audio',
                });
            }

            if (participant.videoProducer) {
                producers.push({
                    id: participant.videoProducer.id,
                    userId,
                    kind: 'video',
                });
            }

            if (participant.screenProducer) {
                producers.push({
                    id: participant.screenProducer.id,
                    userId,
                    kind: 'screen',
                });
            }
        });

        return producers;
    }

    getProducersForUser(channelId: string, targetUserId: string): Array<{ id: string; userId: string; kind: string }> {
        const room = this.rooms.get(channelId);
        if (!room) return [];

        const participant = room.participants.get(targetUserId);
        if (!participant) return [];

        const producers: Array<{ id: string; userId: string; kind: string }> = [];

        if (participant.audioProducer) {
            producers.push({
                id: participant.audioProducer.id,
                userId: targetUserId,
                kind: 'audio',
            });
        }

        if (participant.videoProducer) {
            producers.push({
                id: participant.videoProducer.id,
                userId: targetUserId,
                kind: 'video',
            });
        }

        if (participant.screenProducer) {
            producers.push({
                id: participant.screenProducer.id,
                userId: targetUserId,
                kind: 'screen',
            });
        }

        return producers;
    }

    async cleanup(channelId: string, userId: string): Promise<void> {
        const room = this.rooms.get(channelId);
        if (!room) return;

        const participant = room.participants.get(userId);
        if (!participant) return;

        console.log(`👋 Removing participant ${userId} from channel ${channelId}`);

        participant.sendTransport?.close();
        participant.recvTransport?.close();
        participant.audioProducer?.close();
        participant.videoProducer?.close();
        participant.consumers.forEach((consumer) => consumer.close());

        room.participants.delete(userId);

        if (room.participants.size === 0) {
            console.log(`🗑️ Room ${channelId} is empty, cleaning up`);
            room.router.close();
            this.rooms.delete(channelId);
        }
    }

    getHealth() {
        return {
            nodeId: sfuConfig.node.id,
            region: sfuConfig.node.region,
            workers: this.workers.length,
            rooms: this.rooms.size,
            totalParticipants: Array.from(this.rooms.values()).reduce((sum, room) => sum + room.participants.size, 0),
            status: 'healthy' as const,
        };
    }
}

export const sfuService = new SFUService();
