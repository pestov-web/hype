# Phase 1: Pure SFU Setup (2 недели)

## 🎯 Цель

Заменить P2P на production-ready SFU архитектуру за 2 недели.

**Результат**: Простая, масштабируемая система готовая к 1000+ пользователям.

---

## 📅 Timeline: 2 недели (вместо 3)

### Week 1: Backend mediasoup (5 дней)

-   Day 1-2: Базовый SFU service
-   Day 3: API endpoints
-   Day 4: Testing
-   Day 5: Documentation

### Week 2: Frontend integration (5 дней)

-   Day 1-2: mediasoup-client service
-   Day 3: Replace P2P in rtcService
-   Day 4-5: Testing + bugfixes

---

## 🛠️ Week 1: Backend Setup

### Day 1: Установка и конфигурация

#### 1.1. Install mediasoup

```bash
cd backend
pnpm add mediasoup@3
```

#### 1.2. Create configuration

**backend/src/config/sfu.config.ts**:

```typescript
import os from 'os';

export const sfuConfig = {
    // Worker configuration
    worker: {
        rtcMinPort: 40000,
        rtcMaxPort: 49999,
        logLevel: 'warn' as const,
        logTags: ['info', 'ice', 'dtls', 'rtp', 'srtp', 'rtcp'],
    },

    // Router media codecs
    router: {
        mediaCodecs: [
            {
                kind: 'audio' as const,
                mimeType: 'audio/opus',
                clockRate: 48000,
                channels: 2,
            },
        ],
    },

    // WebRTC transport settings
    webRtcTransport: {
        listenIps: [
            {
                ip: '0.0.0.0',
                announcedIp: process.env.SFU_ANNOUNCED_IP || getLocalIp(),
            },
        ],
        enableUdp: true,
        enableTcp: true,
        preferUdp: true,
        initialAvailableOutgoingBitrate: 1000000,
    },
};

function getLocalIp(): string {
    const interfaces = os.networkInterfaces();
    for (const iface of Object.values(interfaces)) {
        if (!iface) continue;
        for (const alias of iface) {
            if (alias.family === 'IPv4' && !alias.internal) {
                return alias.address;
            }
        }
    }
    return '127.0.0.1';
}
```

#### 1.3. Create types

**backend/src/types/sfu.types.ts**:

```typescript
import { Router, Transport, Producer, Consumer, RtpCapabilities } from 'mediasoup/node/lib/types';

export interface SFURoom {
    channelId: string;
    router: Router;
    participants: Map<string, SFUParticipant>;
}

export interface SFUParticipant {
    userId: string;
    sendTransport?: Transport;
    recvTransport?: Transport;
    audioProducer?: Producer;
    consumers: Map<string, Consumer>; // producerId -> Consumer
}
```

---

### Day 2: SFU Service

**backend/src/services/sfuService.ts**:

```typescript
import * as mediasoup from 'mediasoup';
import { Worker, Router } from 'mediasoup/node/lib/types';
import { sfuConfig } from '../config/sfu.config';
import { SFURoom, SFUParticipant } from '../types/sfu.types';

class SFUService {
    private workers: Worker[] = [];
    private rooms: Map<string, SFURoom> = new Map();
    private nextWorkerIdx = 0;

    async init() {
        console.log('🚀 Initializing SFU...');

        const numWorkers = Math.min(os.cpus().length, 4);

        for (let i = 0; i < numWorkers; i++) {
            const worker = await mediasoup.createWorker(sfuConfig.worker);

            worker.on('died', () => {
                console.error(`❌ Worker died, restarting...`);
                process.exit(1);
            });

            this.workers.push(worker);
        }

        console.log(`✅ Created ${numWorkers} workers`);
    }

    async getOrCreateRoom(channelId: string): Promise<Router> {
        let room = this.rooms.get(channelId);

        if (!room) {
            const worker = this.workers[this.nextWorkerIdx];
            this.nextWorkerIdx = (this.nextWorkerIdx + 1) % this.workers.length;

            const router = await worker.createRouter({
                mediaCodecs: sfuConfig.router.mediaCodecs,
            });

            room = {
                channelId,
                router,
                participants: new Map(),
            };

            this.rooms.set(channelId, room);
            console.log(`📡 Created room for channel ${channelId}`);
        }

        return room.router;
    }

    async createTransport(channelId: string, userId: string, direction: 'send' | 'recv') {
        const room = this.rooms.get(channelId);
        if (!room) throw new Error('Room not found');

        let participant = room.participants.get(userId);
        if (!participant) {
            participant = { userId, consumers: new Map() };
            room.participants.set(userId, participant);
        }

        const transport = await room.router.createWebRtcTransport(sfuConfig.webRtcTransport);

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
        };
    }

    async connectTransport(channelId: string, userId: string, transportId: string, dtlsParameters: any) {
        const room = this.rooms.get(channelId);
        if (!room) throw new Error('Room not found');

        const participant = room.participants.get(userId);
        if (!participant) throw new Error('Participant not found');

        const transport =
            participant.sendTransport?.id === transportId
                ? participant.sendTransport
                : participant.recvTransport?.id === transportId
                ? participant.recvTransport
                : null;

        if (!transport) throw new Error('Transport not found');

        await transport.connect({ dtlsParameters });
    }

    async produce(channelId: string, userId: string, kind: 'audio' | 'video', rtpParameters: any) {
        const room = this.rooms.get(channelId);
        if (!room) throw new Error('Room not found');

        const participant = room.participants.get(userId);
        if (!participant?.sendTransport) throw new Error('Send transport not found');

        const producer = await participant.sendTransport.produce({
            kind,
            rtpParameters,
        });

        if (kind === 'audio') {
            participant.audioProducer = producer;
        }

        console.log(`✅ Producer ${producer.id} created for user ${userId}`);

        return producer.id;
    }

    async consume(channelId: string, userId: string, producerId: string, rtpCapabilities: any) {
        const room = this.rooms.get(channelId);
        if (!room) throw new Error('Room not found');

        const participant = room.participants.get(userId);
        if (!participant?.recvTransport) throw new Error('Recv transport not found');

        if (!room.router.canConsume({ producerId, rtpCapabilities })) {
            throw new Error('Cannot consume');
        }

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

    getProducers(channelId: string, excludeUserId: string) {
        const room = this.rooms.get(channelId);
        if (!room) return [];

        const producers: any[] = [];

        room.participants.forEach((participant, userId) => {
            if (userId === excludeUserId) return;

            if (participant.audioProducer) {
                producers.push({
                    userId,
                    producerId: participant.audioProducer.id,
                    kind: 'audio',
                });
            }
        });

        return producers;
    }

    async cleanup(channelId: string, userId: string) {
        const room = this.rooms.get(channelId);
        if (!room) return;

        const participant = room.participants.get(userId);
        if (!participant) return;

        participant.sendTransport?.close();
        participant.recvTransport?.close();
        participant.consumers.forEach((c) => c.close());

        room.participants.delete(userId);

        if (room.participants.size === 0) {
            room.router.close();
            this.rooms.delete(channelId);
            console.log(`🗑️ Closed empty room ${channelId}`);
        }
    }
}

export const sfuService = new SFUService();
```

---

### Day 3: API Endpoints

**backend/src/routes/voice.ts**:

```typescript
import express from 'express';
import { sfuService } from '../services/sfuService';

const router = express.Router();

// Get RTP capabilities
router.get('/rtp-capabilities/:channelId', async (req, res) => {
    try {
        const router = await sfuService.getOrCreateRoom(req.params.channelId);
        res.json({ rtpCapabilities: router.rtpCapabilities });
    } catch (error) {
        res.status(500).json({ error: 'Failed to get RTP capabilities' });
    }
});

// Create transport
router.post('/create-transport', async (req, res) => {
    try {
        const { channelId, userId, direction } = req.body;
        const transport = await sfuService.createTransport(channelId, userId, direction);
        res.json(transport);
    } catch (error) {
        res.status(500).json({ error: 'Failed to create transport' });
    }
});

// Connect transport
router.post('/connect-transport', async (req, res) => {
    try {
        const { channelId, userId, transportId, dtlsParameters } = req.body;
        await sfuService.connectTransport(channelId, userId, transportId, dtlsParameters);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Failed to connect transport' });
    }
});

// Produce
router.post('/produce', async (req, res) => {
    try {
        const { channelId, userId, kind, rtpParameters } = req.body;
        const producerId = await sfuService.produce(channelId, userId, kind, rtpParameters);
        res.json({ producerId });
    } catch (error) {
        res.status(500).json({ error: 'Failed to produce' });
    }
});

// Consume
router.post('/consume', async (req, res) => {
    try {
        const { channelId, userId, producerId, rtpCapabilities } = req.body;
        const consumer = await sfuService.consume(channelId, userId, producerId, rtpCapabilities);
        res.json(consumer);
    } catch (error) {
        res.status(500).json({ error: 'Failed to consume' });
    }
});

// Get producers
router.get('/producers/:channelId/:userId', (req, res) => {
    const producers = sfuService.getProducers(req.params.channelId, req.params.userId);
    res.json({ producers });
});

// Leave
router.post('/leave', async (req, res) => {
    try {
        const { channelId, userId } = req.body;
        await sfuService.cleanup(channelId, userId);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Failed to leave' });
    }
});

export default router;
```

**backend/src/index.ts** (ADD):

```typescript
import { sfuService } from './services/sfuService';
import voiceRoutes from './routes/voice';

async function main() {
    // Initialize SFU
    await sfuService.init();

    // Routes
    app.use('/api/voice', voiceRoutes);

    // Start server
    app.listen(3001, () => {
        console.log('✅ Server running on http://localhost:3001');
    });
}

main();
```

---

## 🛠️ Week 2: Frontend Integration

### Day 1-2: mediasoup-client Service

```bash
cd frontend
pnpm add mediasoup-client
```

**frontend/src/shared/lib/services/sfuService.ts**:

```typescript
import * as mediasoupClient from 'mediasoup-client';
import { Device, Transport, Producer, Consumer } from 'mediasoup-client/lib/types';
import { apiClient } from '@shared/api';

class SFUService {
    private device?: Device;
    private sendTransport?: Transport;
    private recvTransport?: Transport;
    private audioProducer?: Producer;
    private consumers: Map<string, Consumer> = new Map();

    private channelId?: string;
    private userId?: string;

    async init(channelId: string, userId: string) {
        this.channelId = channelId;
        this.userId = userId;

        // Create device
        this.device = new mediasoupClient.Device();

        // Get RTP capabilities
        const { data } = await apiClient.get(`/voice/rtp-capabilities/${channelId}`);
        await this.device.load({ routerRtpCapabilities: data.rtpCapabilities });

        // Create transports
        await this.createSendTransport();
        await this.createRecvTransport();
    }

    private async createSendTransport() {
        const { data } = await apiClient.post('/voice/create-transport', {
            channelId: this.channelId,
            userId: this.userId,
            direction: 'send',
        });

        this.sendTransport = this.device!.createSendTransport(data);

        this.sendTransport.on('connect', async ({ dtlsParameters }, callback, errback) => {
            try {
                await apiClient.post('/voice/connect-transport', {
                    channelId: this.channelId,
                    userId: this.userId,
                    transportId: this.sendTransport!.id,
                    dtlsParameters,
                });
                callback();
            } catch (error) {
                errback(error as Error);
            }
        });

        this.sendTransport.on('produce', async ({ kind, rtpParameters }, callback, errback) => {
            try {
                const { data } = await apiClient.post('/voice/produce', {
                    channelId: this.channelId,
                    userId: this.userId,
                    kind,
                    rtpParameters,
                });
                callback({ id: data.producerId });
            } catch (error) {
                errback(error as Error);
            }
        });
    }

    private async createRecvTransport() {
        const { data } = await apiClient.post('/voice/create-transport', {
            channelId: this.channelId,
            userId: this.userId,
            direction: 'recv',
        });

        this.recvTransport = this.device!.createRecvTransport(data);

        this.recvTransport.on('connect', async ({ dtlsParameters }, callback, errback) => {
            try {
                await apiClient.post('/voice/connect-transport', {
                    channelId: this.channelId,
                    userId: this.userId,
                    transportId: this.recvTransport!.id,
                    dtlsParameters,
                });
                callback();
            } catch (error) {
                errback(error as Error);
            }
        });
    }

    async produceAudio(track: MediaStreamTrack) {
        this.audioProducer = await this.sendTransport!.produce({ track });
    }

    async consumeAudio(producerId: string, userId: string) {
        const { data } = await apiClient.post('/voice/consume', {
            channelId: this.channelId,
            userId: this.userId,
            producerId,
            rtpCapabilities: this.device!.rtpCapabilities,
        });

        const consumer = await this.recvTransport!.consume(data);
        this.consumers.set(producerId, consumer);

        return { userId, track: consumer.track };
    }

    async consumeExisting() {
        const { data } = await apiClient.get(`/voice/producers/${this.channelId}/${this.userId}`);

        const tracks = [];
        for (const { userId, producerId } of data.producers) {
            const result = await this.consumeAudio(producerId, userId);
            tracks.push(result);
        }
        return tracks;
    }

    async cleanup() {
        this.audioProducer?.close();
        this.consumers.forEach((c) => c.close());
        this.sendTransport?.close();
        this.recvTransport?.close();

        if (this.channelId && this.userId) {
            await apiClient.post('/voice/leave', {
                channelId: this.channelId,
                userId: this.userId,
            });
        }
    }
}

export const sfuService = new SFUService();
```

---

### Day 3: Replace P2P in rtcService

**frontend/src/shared/lib/services/rtcService.ts** (SIMPLIFY):

```typescript
import { sfuService } from './sfuService';

class RTCService {
    private localStream?: MediaStream;
    private audioContext?: AudioContext;
    private remoteStreams: Map<string, MediaStream> = new Map();

    async joinVoiceChannel(channelId: string, userId: string) {
        console.log('🎙️ Joining via SFU...');

        // 1. Init SFU
        await sfuService.init(channelId, userId);

        // 2. Get microphone
        this.localStream = await navigator.mediaDevices.getUserMedia({
            audio: { echoCancellation: true, noiseSuppression: true },
        });

        // 3. Produce audio
        const audioTrack = this.localStream.getAudioTracks()[0];
        await sfuService.produceAudio(audioTrack);

        // 4. Consume existing
        const tracks = await sfuService.consumeExisting();

        for (const { userId, track } of tracks) {
            const stream = new MediaStream([track]);
            this.remoteStreams.set(userId, stream);
            this.playRemoteAudio(userId, stream);
        }

        console.log('✅ Joined SFU channel');
    }

    async leaveVoiceChannel() {
        this.localStream?.getTracks().forEach((t) => t.stop());
        this.remoteStreams.clear();
        await sfuService.cleanup();
        console.log('👋 Left SFU channel');
    }

    private playRemoteAudio(userId: string, stream: MediaStream) {
        // Create audio element
        const audio = new Audio();
        audio.srcObject = stream;
        audio.play();

        // Store for later cleanup
        this.audioElements.set(userId, audio);
    }
}

export const rtcService = new RTCService();
```

---

## ✅ Testing Checklist

### Backend Tests

```bash
# Health check
curl http://localhost:3001/api/voice/health

# RTP capabilities
curl http://localhost:3001/api/voice/rtp-capabilities/test-channel

# Create transport
curl -X POST http://localhost:3001/api/voice/create-transport \
  -H "Content-Type: application/json" \
  -d '{"channelId":"test","userId":"user1","direction":"send"}'
```

### Frontend Tests

-   [ ] 2 users can hear each other
-   [ ] 5 users simultaneously
-   [ ] 10 users simultaneously
-   [ ] User can join/leave multiple times
-   [ ] Audio quality is good
-   [ ] Latency < 150ms

---

## 🚀 Production Deployment

### Environment Variables

```bash
# .env.production
NODE_ENV=production
SFU_ANNOUNCED_IP=YOUR_PUBLIC_IP  # Important!
RTC_MIN_PORT=40000
RTC_MAX_PORT=49999
```

### Firewall

```bash
# Allow UDP ports for WebRTC
sudo ufw allow 40000:49999/udp
sudo ufw allow 3001/tcp
```

### Docker

```yaml
# docker-compose.yml
services:
    backend:
        build: ./backend
        ports:
            - '3001:3001'
            - '40000-49999:40000-49999/udp'
        environment:
            - SFU_ANNOUNCED_IP=${PUBLIC_IP}
```

---

## 📊 Success Metrics

After Phase 1, you should have:

1. ✅ **Working SFU** - 2-50 users in voice channel
2. ✅ **Simple codebase** - No P2P complexity
3. ✅ **Scalable foundation** - Ready for multi-region
4. ✅ **Low cost** - $10-20/month VPS sufficient
5. ✅ **Production ready** - Can deploy to real users

**Next**: Multi-region SFU deployment (Phase 2) 🌍
