# План миграции на SFU архитектуру

## Когда мигрировать?

**Триггеры для миграции**:

-   🟢 2-8 пользователей: P2P работает отлично
-   🟡 8-10 пользователей: P2P начинает тормозить
-   🔴 10+ пользователей: SFU обязателен

## Фаза 1: Установка mediasoup (Backend)

### 1. Установить зависимости

```bash
cd backend
pnpm add mediasoup
pnpm add -D @types/node
```

### 2. Создать SFU сервис

```typescript
// backend/src/services/sfuService.ts
import * as mediasoup from 'mediasoup';
import type { Router, WebRtcTransport, Producer, Consumer } from 'mediasoup/node/lib/types';

interface SFURoom {
    router: Router;
    transports: Map<string, WebRtcTransport[]>; // userId -> transports
    producers: Map<string, Producer[]>; // userId -> producers
    consumers: Map<string, Consumer[]>; // userId -> consumers
}

class SFUService {
    private workers: mediasoup.types.Worker[] = [];
    private rooms: Map<string, SFURoom> = new Map(); // channelId -> room
    private currentWorkerIndex = 0;

    async init() {
        // Create mediasoup workers (one per CPU core)
        const numWorkers = require('os').cpus().length;

        for (let i = 0; i < numWorkers; i++) {
            const worker = await mediasoup.createWorker({
                logLevel: 'warn',
                rtcMinPort: 40000,
                rtcMaxPort: 49999,
            });

            worker.on('died', () => {
                console.error('mediasoup worker died, exiting in 2 seconds...');
                setTimeout(() => process.exit(1), 2000);
            });

            this.workers.push(worker);
            console.log(`✅ mediasoup worker #${i} created`);
        }
    }

    // Get next worker using round-robin
    private getWorker(): mediasoup.types.Worker {
        const worker = this.workers[this.currentWorkerIndex];
        this.currentWorkerIndex = (this.currentWorkerIndex + 1) % this.workers.length;
        return worker;
    }

    // Create room (router) for voice channel
    async createRoom(channelId: string): Promise<Router> {
        if (this.rooms.has(channelId)) {
            return this.rooms.get(channelId)!.router;
        }

        const worker = this.getWorker();
        const router = await worker.createRouter({
            mediaCodecs: [
                {
                    kind: 'audio',
                    mimeType: 'audio/opus',
                    clockRate: 48000,
                    channels: 2,
                },
            ],
        });

        this.rooms.set(channelId, {
            router,
            transports: new Map(),
            producers: new Map(),
            consumers: new Map(),
        });

        console.log(`🎙️ Created SFU room for channel ${channelId}`);
        return router;
    }

    // Get router capabilities for client
    getRouterRtpCapabilities(channelId: string) {
        const room = this.rooms.get(channelId);
        if (!room) throw new Error(`Room ${channelId} not found`);
        return room.router.rtpCapabilities;
    }

    // Create WebRTC transport for client
    async createWebRtcTransport(channelId: string, userId: string, direction: 'send' | 'recv') {
        const room = this.rooms.get(channelId);
        if (!room) throw new Error(`Room ${channelId} not found`);

        const transport = await room.router.createWebRtcTransport({
            listenIps: [
                {
                    ip: '0.0.0.0',
                    announcedIp: process.env.ANNOUNCED_IP || '127.0.0.1', // Your server public IP
                },
            ],
            enableUdp: true,
            enableTcp: true,
            preferUdp: true,
        });

        // Store transport
        const userTransports = room.transports.get(userId) || [];
        userTransports.push(transport);
        room.transports.set(userId, userTransports);

        return {
            id: transport.id,
            iceParameters: transport.iceParameters,
            iceCandidates: transport.iceCandidates,
            dtlsParameters: transport.dtlsParameters,
        };
    }

    // Connect transport
    async connectTransport(channelId: string, transportId: string, dtlsParameters: any) {
        const room = this.rooms.get(channelId);
        if (!room) throw new Error(`Room ${channelId} not found`);

        // Find transport
        let transport: WebRtcTransport | undefined;
        for (const transports of room.transports.values()) {
            transport = transports.find((t) => t.id === transportId);
            if (transport) break;
        }

        if (!transport) throw new Error(`Transport ${transportId} not found`);

        await transport.connect({ dtlsParameters });
    }

    // Produce (send audio to SFU)
    async produce(channelId: string, userId: string, transportId: string, kind: string, rtpParameters: any) {
        const room = this.rooms.get(channelId);
        if (!room) throw new Error(`Room ${channelId} not found`);

        // Find transport
        const userTransports = room.transports.get(userId) || [];
        const transport = userTransports.find((t) => t.id === transportId);
        if (!transport) throw new Error(`Transport ${transportId} not found`);

        const producer = await transport.produce({
            kind: kind as 'audio',
            rtpParameters,
        });

        // Store producer
        const userProducers = room.producers.get(userId) || [];
        userProducers.push(producer);
        room.producers.set(userId, userProducers);

        console.log(`📤 User ${userId} producing ${kind} in channel ${channelId}`);

        // Notify other users about new producer
        return { id: producer.id };
    }

    // Consume (receive audio from SFU)
    async consume(channelId: string, userId: string, transportId: string, producerId: string, rtpCapabilities: any) {
        const room = this.rooms.get(channelId);
        if (!room) throw new Error(`Room ${channelId} not found`);

        // Check if can consume
        if (!room.router.canConsume({ producerId, rtpCapabilities })) {
            throw new Error('Cannot consume');
        }

        // Find transport
        const userTransports = room.transports.get(userId) || [];
        const transport = userTransports.find((t) => t.id === transportId);
        if (!transport) throw new Error(`Transport ${transportId} not found`);

        const consumer = await transport.consume({
            producerId,
            rtpCapabilities,
            paused: false,
        });

        // Store consumer
        const userConsumers = room.consumers.get(userId) || [];
        userConsumers.push(consumer);
        room.consumers.set(userId, userConsumers);

        console.log(`📥 User ${userId} consuming ${producerId} in channel ${channelId}`);

        return {
            id: consumer.id,
            producerId,
            kind: consumer.kind,
            rtpParameters: consumer.rtpParameters,
        };
    }

    // Get all producers in room (for new user joining)
    getProducers(channelId: string, excludeUserId?: string): Array<{ userId: string; producerId: string }> {
        const room = this.rooms.get(channelId);
        if (!room) return [];

        const producers: Array<{ userId: string; producerId: string }> = [];
        room.producers.forEach((userProducers, userId) => {
            if (userId !== excludeUserId) {
                userProducers.forEach((producer) => {
                    producers.push({ userId, producerId: producer.id });
                });
            }
        });

        return producers;
    }

    // Clean up user resources
    async cleanupUser(channelId: string, userId: string) {
        const room = this.rooms.get(channelId);
        if (!room) return;

        // Close producers
        const producers = room.producers.get(userId) || [];
        for (const producer of producers) {
            producer.close();
        }
        room.producers.delete(userId);

        // Close consumers
        const consumers = room.consumers.get(userId) || [];
        for (const consumer of consumers) {
            consumer.close();
        }
        room.consumers.delete(userId);

        // Close transports
        const transports = room.transports.get(userId) || [];
        for (const transport of transports) {
            transport.close();
        }
        room.transports.delete(userId);

        console.log(`🧹 Cleaned up user ${userId} from channel ${channelId}`);
    }

    // Clean up room if empty
    async cleanupRoom(channelId: string) {
        const room = this.rooms.get(channelId);
        if (!room) return;

        if (room.producers.size === 0) {
            room.router.close();
            this.rooms.delete(channelId);
            console.log(`🧹 Closed empty room ${channelId}`);
        }
    }
}

export const sfuService = new SFUService();
```

### 3. Добавить SFU endpoints в WebSocket

```typescript
// backend/src/websocket/websocket.ts

import { sfuService } from '../services/sfuService';

// В handleMessage добавить новые случаи:

case 'sfu_get_router_capabilities':
    this.handleGetRouterCapabilities(clientId, data);
    break;

case 'sfu_create_transport':
    await this.handleCreateTransport(clientId, data);
    break;

case 'sfu_connect_transport':
    await this.handleConnectTransport(clientId, data);
    break;

case 'sfu_produce':
    await this.handleProduce(clientId, data);
    break;

case 'sfu_consume':
    await this.handleConsume(clientId, data);
    break;

// Реализация handlers:

private handleGetRouterCapabilities(clientId: string, data: any) {
    const { channelId } = data;
    const capabilities = sfuService.getRouterRtpCapabilities(channelId);

    this.sendToClient(clientId, {
        type: 'sfu_router_capabilities',
        data: { channelId, rtpCapabilities: capabilities },
        timestamp: new Date(),
    });
}

private async handleCreateTransport(clientId: string, data: any) {
    const { channelId, userId, direction } = data;

    const transportParams = await sfuService.createWebRtcTransport(
        channelId,
        userId,
        direction
    );

    this.sendToClient(clientId, {
        type: 'sfu_transport_created',
        data: { channelId, direction, ...transportParams },
        timestamp: new Date(),
    });
}

private async handleConnectTransport(clientId: string, data: any) {
    const { channelId, transportId, dtlsParameters } = data;

    await sfuService.connectTransport(channelId, transportId, dtlsParameters);

    this.sendToClient(clientId, {
        type: 'sfu_transport_connected',
        data: { channelId, transportId },
        timestamp: new Date(),
    });
}

private async handleProduce(clientId: string, data: any) {
    const { channelId, userId, transportId, kind, rtpParameters } = data;

    const { id: producerId } = await sfuService.produce(
        channelId,
        userId,
        transportId,
        kind,
        rtpParameters
    );

    // Notify producer
    this.sendToClient(clientId, {
        type: 'sfu_produced',
        data: { channelId, producerId },
        timestamp: new Date(),
    });

    // Notify all other users in channel about new producer
    this.broadcastToChannel(
        channelId,
        {
            type: 'sfu_new_producer',
            data: { channelId, userId, producerId, kind },
            timestamp: new Date(),
        },
        [clientId] // exclude sender
    );
}

private async handleConsume(clientId: string, data: any) {
    const { channelId, userId, transportId, producerId, rtpCapabilities } = data;

    const consumerParams = await sfuService.consume(
        channelId,
        userId,
        transportId,
        producerId,
        rtpCapabilities
    );

    this.sendToClient(clientId, {
        type: 'sfu_consumed',
        data: { channelId, ...consumerParams },
        timestamp: new Date(),
    });
}
```

### 4. Инициализация в main server

```typescript
// backend/src/index.ts

import { sfuService } from './services/sfuService';

// После инициализации Express:
await sfuService.init();
console.log('✅ SFU service initialized');
```

## Фаза 2: Изменения Frontend

### 1. Установить mediasoup-client

```bash
cd frontend
pnpm add mediasoup-client
```

### 2. Создать SFU клиент

```typescript
// frontend/src/shared/lib/services/sfuService.ts

import * as mediasoupClient from 'mediasoup-client';
import type { Device, Transport, Producer, Consumer } from 'mediasoup-client/lib/types';
import { wsClient } from '@shared/api';

class SFUService {
    private device?: Device;
    private sendTransport?: Transport;
    private recvTransport?: Transport;
    private producers: Map<string, Producer> = new Map(); // kind -> producer
    private consumers: Map<string, Consumer> = new Map(); // producerId -> consumer
    private channelId?: string;
    private userId?: string;

    /**
     * Initialize device and load router capabilities
     */
    async init(channelId: string, userId: string) {
        this.channelId = channelId;
        this.userId = userId;

        // Create mediasoup device
        this.device = new mediasoupClient.Device();

        // Get router RTP capabilities from server
        const routerCapabilities = await this.getRouterCapabilities(channelId);

        // Load device with router capabilities
        await this.device.load({ routerRtpCapabilities: routerCapabilities });

        console.log('✅ SFU device initialized');
    }

    /**
     * Create send transport (for uploading audio to SFU)
     */
    async createSendTransport(): Promise<void> {
        if (!this.device) throw new Error('Device not initialized');

        const transportParams = await this.createTransport('send');

        this.sendTransport = this.device.createSendTransport(transportParams);

        // Handle connection
        this.sendTransport.on('connect', async ({ dtlsParameters }, callback, errback) => {
            try {
                await this.connectTransport(this.sendTransport!.id, dtlsParameters);
                callback();
            } catch (error) {
                errback(error as Error);
            }
        });

        // Handle produce
        this.sendTransport.on('produce', async ({ kind, rtpParameters }, callback, errback) => {
            try {
                const { id: producerId } = await this.produce(this.sendTransport!.id, kind, rtpParameters);
                callback({ id: producerId });
            } catch (error) {
                errback(error as Error);
            }
        });

        console.log('✅ Send transport created');
    }

    /**
     * Create receive transport (for downloading audio from SFU)
     */
    async createRecvTransport(): Promise<void> {
        if (!this.device) throw new Error('Device not initialized');

        const transportParams = await this.createTransport('recv');

        this.recvTransport = this.device.createRecvTransport(transportParams);

        // Handle connection
        this.recvTransport.on('connect', async ({ dtlsParameters }, callback, errback) => {
            try {
                await this.connectTransport(this.recvTransport!.id, dtlsParameters);
                callback();
            } catch (error) {
                errback(error as Error);
            }
        });

        console.log('✅ Receive transport created');
    }

    /**
     * Produce audio (send to SFU)
     */
    async produceAudio(track: MediaStreamTrack): Promise<void> {
        if (!this.sendTransport) throw new Error('Send transport not created');

        const producer = await this.sendTransport.produce({
            track,
            codecOptions: {
                opusStereo: true,
                opusDtx: true,
            },
        });

        this.producers.set('audio', producer);
        console.log('📤 Producing audio to SFU');
    }

    /**
     * Consume audio from another user
     */
    async consumeAudio(producerId: string): Promise<MediaStream> {
        if (!this.recvTransport || !this.device) {
            throw new Error('Receive transport or device not ready');
        }

        const consumerParams = await this.consume(this.recvTransport.id, producerId, this.device.rtpCapabilities);

        const consumer = await this.recvTransport.consume(consumerParams);

        this.consumers.set(producerId, consumer);

        // Create MediaStream from track
        const stream = new MediaStream([consumer.track]);

        console.log(`📥 Consuming audio from producer ${producerId}`);
        return stream;
    }

    /**
     * Close all resources
     */
    close(): void {
        // Close producers
        this.producers.forEach((producer) => producer.close());
        this.producers.clear();

        // Close consumers
        this.consumers.forEach((consumer) => consumer.close());
        this.consumers.clear();

        // Close transports
        this.sendTransport?.close();
        this.recvTransport?.close();

        this.sendTransport = undefined;
        this.recvTransport = undefined;
    }

    // ===== Private methods (WebSocket communication) =====

    private getRouterCapabilities(channelId: string): Promise<any> {
        return new Promise((resolve) => {
            wsClient.send('sfu_get_router_capabilities', { channelId });
            wsClient.once('sfu_router_capabilities', (data: any) => {
                resolve(data.rtpCapabilities);
            });
        });
    }

    private createTransport(direction: 'send' | 'recv'): Promise<any> {
        return new Promise((resolve) => {
            wsClient.send('sfu_create_transport', {
                channelId: this.channelId,
                userId: this.userId,
                direction,
            });
            wsClient.once('sfu_transport_created', (data: any) => {
                resolve(data);
            });
        });
    }

    private connectTransport(transportId: string, dtlsParameters: any): Promise<void> {
        return new Promise((resolve) => {
            wsClient.send('sfu_connect_transport', {
                channelId: this.channelId,
                transportId,
                dtlsParameters,
            });
            wsClient.once('sfu_transport_connected', () => {
                resolve();
            });
        });
    }

    private produce(transportId: string, kind: string, rtpParameters: any): Promise<{ id: string }> {
        return new Promise((resolve) => {
            wsClient.send('sfu_produce', {
                channelId: this.channelId,
                userId: this.userId,
                transportId,
                kind,
                rtpParameters,
            });
            wsClient.once('sfu_produced', (data: any) => {
                resolve({ id: data.producerId });
            });
        });
    }

    private consume(transportId: string, producerId: string, rtpCapabilities: any): Promise<any> {
        return new Promise((resolve) => {
            wsClient.send('sfu_consume', {
                channelId: this.channelId,
                userId: this.userId,
                transportId,
                producerId,
                rtpCapabilities,
            });
            wsClient.once('sfu_consumed', (data: any) => {
                resolve(data);
            });
        });
    }
}

export const sfuService = new SFUService();
```

### 3. Обновить rtcService для поддержки SFU

```typescript
// frontend/src/shared/lib/services/rtcService.ts

import { sfuService } from './sfuService';

class RTCService {
    private mode: 'p2p' | 'sfu' = 'p2p'; // Default to P2P

    // ... existing code ...

    async joinVoiceChannel(channelId: string, userId: string, otherUserIds: string[]): Promise<void> {
        console.log(`🎤 Joining voice channel ${channelId} with ${otherUserIds.length} users`);

        // Determine mode based on participant count
        const participantCount = otherUserIds.length + 1; // +1 for current user
        this.mode = participantCount > 8 ? 'sfu' : 'p2p';

        console.log(`📊 Using ${this.mode.toUpperCase()} mode for ${participantCount} participants`);

        // Get local stream
        this.localStream = await navigator.mediaDevices.getUserMedia({
            audio: {
                /* ... */
            },
            video: false,
        });

        if (this.mode === 'sfu') {
            await this.joinViaSFU(channelId, userId);
        } else {
            await this.joinViaP2P(channelId, userId, otherUserIds);
        }
    }

    private async joinViaSFU(channelId: string, userId: string): Promise<void> {
        console.log('🔀 Connecting via SFU...');

        // Initialize SFU device
        await sfuService.init(channelId, userId);

        // Create transports
        await sfuService.createSendTransport();
        await sfuService.createRecvTransport();

        // Start producing audio
        const audioTrack = this.localStream!.getAudioTracks()[0];
        await sfuService.produceAudio(audioTrack);

        // Listen for new producers (other users)
        wsClient.on('sfu_new_producer', async (data: any) => {
            const { userId: producerUserId, producerId } = data;

            if (producerUserId !== userId) {
                console.log(`📥 New producer detected: ${producerUserId}`);
                const stream = await sfuService.consumeAudio(producerId);
                this.playRemoteStream(producerUserId, stream);
            }
        });

        console.log('✅ Connected via SFU');
    }

    private async joinViaP2P(channelId: string, userId: string, otherUserIds: string[]): Promise<void> {
        console.log('🔗 Connecting via P2P...');

        // Existing P2P logic
        for (const otherUserId of otherUserIds) {
            if (otherUserId !== userId) {
                await this.createPeerConnection(otherUserId, true);
            }
        }

        console.log('✅ Connected via P2P');
    }

    leaveVoiceChannel(): void {
        if (this.mode === 'sfu') {
            sfuService.close();
        } else {
            // Existing P2P cleanup
            this.peers.forEach((peer) => peer.connection.close());
            this.peers.clear();
        }

        // Common cleanup
        if (this.localStream) {
            this.localStream.getTracks().forEach((track) => track.stop());
            this.localStream = null;
        }
    }
}
```

## Фаза 3: Гибридный режим (P2P + SFU)

```typescript
// frontend/src/shared/lib/utils/deviceSettings.ts

export function getVoiceArchitecture(): 'p2p' | 'sfu' | 'auto' {
    return (localStorage.getItem('hype_voice_architecture') as any) || 'auto';
}

export function setVoiceArchitecture(mode: 'p2p' | 'sfu' | 'auto'): void {
    localStorage.setItem('hype_voice_architecture', mode);
}
```

```typescript
// В rtcService:

async joinVoiceChannel(channelId: string, userId: string, otherUserIds: string[]): Promise<void> {
    const participantCount = otherUserIds.length + 1;
    const userPreference = getVoiceArchitecture();

    if (userPreference === 'auto') {
        // Automatic selection based on participant count
        this.mode = participantCount > 8 ? 'sfu' : 'p2p';
    } else {
        // User override
        this.mode = userPreference === 'sfu' ? 'sfu' : 'p2p';
    }

    console.log(`📊 Using ${this.mode.toUpperCase()} (${participantCount} users, pref: ${userPreference})`);

    // ... rest of the logic
}
```

## Фаза 4: Settings UI для выбора режима

```tsx
// In SettingsPage.tsx

<div className={styles.settingsSection}>
    <h3>Voice Architecture</h3>
    <p className={styles.settingsDescription}>
        Choose how voice data is transmitted. Auto mode switches based on participant count.
    </p>
    <div className={styles.voiceModeOptions}>
        <label className={styles.radioOption}>
            <input
                type='radio'
                name='voiceArchitecture'
                value='auto'
                checked={voiceArchitecture === 'auto'}
                onChange={(e) => handleArchitectureChange(e.target.value)}
            />
            <div className={styles.radioLabel}>
                <strong>Auto (Recommended)</strong>
                <span className={styles.radioDescription}>P2P for small groups (2-8), SFU for large groups (9+)</span>
            </div>
        </label>

        <label className={styles.radioOption}>
            <input
                type='radio'
                name='voiceArchitecture'
                value='p2p'
                checked={voiceArchitecture === 'p2p'}
                onChange={(e) => handleArchitectureChange(e.target.value)}
            />
            <div className={styles.radioLabel}>
                <strong>P2P (Peer-to-Peer)</strong>
                <span className={styles.radioDescription}>Direct connections, lowest latency. Best for 2-8 users.</span>
            </div>
        </label>

        <label className={styles.radioOption}>
            <input
                type='radio'
                name='voiceArchitecture'
                value='sfu'
                checked={voiceArchitecture === 'sfu'}
                onChange={(e) => handleArchitectureChange(e.target.value)}
            />
            <div className={styles.radioLabel}>
                <strong>SFU (Selective Forwarding)</strong>
                <span className={styles.radioDescription}>Server relay, scalable. Best for 9+ users.</span>
            </div>
        </label>
    </div>
</div>
```

## Стоимость и требования

### Сервер для SFU (AWS/DigitalOcean/Hetzner)

**Минимальные требования (10-20 пользователей)**:

-   2 CPU cores
-   4GB RAM
-   100 Mbps bandwidth
-   ~$20-40/month

**Средние требования (50-100 пользователей)**:

-   4 CPU cores
-   8GB RAM
-   500 Mbps bandwidth
-   ~$80-120/month

**Большие требования (200+ пользователей)**:

-   8+ CPU cores
-   16GB+ RAM
-   1 Gbps bandwidth
-   $200+/month

### Пропускная способность

**Пример расчёта**: 50 пользователей, 64 kbps аудио

-   Upload от клиентов: 50 × 64 kbps = 3.2 Mbps
-   Download к клиентам: 50 × (49 × 64 kbps) = 156 Mbps
-   **Итого серверу**: ~160 Mbps

## Итоговое сравнение

| Параметр                 | P2P Mesh             | SFU                       | MCU                |
| ------------------------ | -------------------- | ------------------------- | ------------------ |
| **Латентность**          | Самая низкая ✅✅✅  | Низкая ✅✅               | Средняя ✅         |
| **Масштабируемость**     | 2-8 пользователей ✅ | 100+ пользователей ✅✅✅ | 200+ ✅✅✅        |
| **Upload клиента**       | Высокий ❌           | Низкий ✅✅               | Низкий ✅✅        |
| **Стоимость сервера**    | Минимальная ✅✅✅   | Средняя ⚠️                | Высокая ❌         |
| **Сложность реализации** | Простая ✅✅         | Средняя ⚠️                | Сложная ❌         |
| **Приватность**          | Максимальная ✅✅✅  | Средняя ⚠️                | Низкая ❌          |
| **CPU клиента**          | Высокая ❌           | Средняя ✅                | Низкая ✅✅        |
| **CPU сервера**          | Нет ✅✅✅           | Средняя ⚠️                | Очень высокая ❌❌ |

## Рекомендация для Hype

**Текущий этап**: Оставить P2P  
**Когда мигрировать**: При 8-10+ одновременных пользователях  
**Рекомендуемое решение**: mediasoup + гибридный режим (auto-switch)  
**Стратегия**: Постепенная миграция с backward compatibility

**Преимущества гибридного подхода**:

-   Малые группы: P2P (низкая задержка, нет расходов на сервер)
-   Большие группы: SFU (масштабируемость)
-   Плавный переход без breaking changes
