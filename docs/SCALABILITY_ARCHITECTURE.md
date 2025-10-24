# Архитектура масштабирования Hype

## Целевые показатели

### Этапы роста

```
Phase 1 (MVP):           100 пользователей    / 10 одновременных голосовых
Phase 2 (Growth):      1,000 пользователей    / 100 одновременных голосовых
Phase 3 (Scale):      10,000 пользователей    / 1,000 одновременных голосовых
Phase 4 (Massive):   100,000 пользователей    / 10,000 одновременных голосовых
Phase 5 (Discord):  1,000,000+ пользователей  / 100,000+ одновременных голосовых
```

### Критичные требования для голосовой связи

**Голос (приоритет #1)**:

-   ✅ Задержка < 150ms (комфортный разговор)
-   ✅ 99.9% uptime (голос не должен падать)
-   ✅ Поддержка 50+ человек в одном канале
-   ✅ Низкое потребление CPU/RAM на клиенте

**Стрим экрана (приоритет #2)**:

-   ✅ 1080p @ 30fps для игровых сессий
-   ✅ Адаптивный битрейт (от 2 до 8 Mbps)
-   ✅ Минимальная задержка (< 300ms)
-   ✅ Возможность стримить нескольким пользователям

---

## 📐 Архитектура по фазам

### Phase 1: MVP (текущая P2P → Hybrid)

**Текущая ситуация**: P2P mesh работает до 8-10 человек

**Что добавить СЕЙЧАС**:

```
┌─────────────────────────────────────────────────────────────┐
│                    FRONTEND                                 │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  rtcService (Hybrid mode)                             │  │
│  │  ├─ P2P mode (2-8 users)                              │  │
│  │  └─ SFU mode (9+ users)                               │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                           ↕
┌─────────────────────────────────────────────────────────────┐
│                    BACKEND (Single Server)                  │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────────┐   │
│  │  Express    │  │  WebSocket   │  │  mediasoup SFU   │   │
│  │  REST API   │  │  Signaling   │  │  (1 worker)      │   │
│  └─────────────┘  └──────────────┘  └──────────────────┘   │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  PostgreSQL (messages, users, channels)              │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

**Задел на будущее**:

-   ✅ Hybrid режим (P2P + SFU) - готовность к росту
-   ✅ Код уже поддерживает оба режима
-   ✅ Автопереключение по количеству участников

**Стоимость**: ~$40-80/месяц (1 VPS сервер 4GB RAM)

---

### Phase 2: Growth (100-1,000 пользователей)

**Проблемы Phase 1**:

-   ❌ Один SFU сервер - single point of failure
-   ❌ Все каналы на одном сервере - bottleneck
-   ❌ При падении сервера - все голосовые падают

**Решение: Multi-Region SFU Cluster**

```
                        ┌────────────────┐
                        │  Load Balancer │
                        │   (Cloudflare) │
                        └────────┬───────┘
                                 │
                ┌────────────────┼────────────────┐
                │                │                │
        ┌───────▼──────┐  ┌─────▼──────┐  ┌─────▼──────┐
        │   SFU Node   │  │  SFU Node  │  │  SFU Node  │
        │  US-East-1   │  │  EU-West   │  │  AP-South  │
        │              │  │            │  │            │
        │ mediasoup    │  │ mediasoup  │  │ mediasoup  │
        │ 8 workers    │  │ 8 workers  │  │ 8 workers  │
        └──────────────┘  └────────────┘  └────────────┘
                │                │                │
                └────────────────┼────────────────┘
                                 │
                        ┌────────▼────────┐
                        │  Redis Cluster  │
                        │  (coordination) │
                        └─────────────────┘
                                 │
                        ┌────────▼────────┐
                        │   PostgreSQL    │
                        │  (Primary DB)   │
                        └─────────────────┘
```

**Ключевые изменения**:

1. **Распределённые SFU ноды**:

    ```typescript
    // Backend: Роутинг пользователей на ближайший SFU
    function selectSFUNode(userLocation: string, channelId: string): string {
        // Выбираем ноду по геолокации + нагрузке
        const nodes = sfuRegistry.getAvailableNodes();
        const closest = nodes.sort((a, b) => calculateLatency(userLocation, a) - calculateLatency(userLocation, b));
        return closest[0].id;
    }
    ```

2. **Redis для координации**:

    ```typescript
    // Хранение состояния каналов в Redis
    interface ChannelState {
        channelId: string;
        sfuNodeId: string; // На каком SFU ноде сейчас канал
        participants: string[]; // Список пользователей
        createdAt: Date;
    }

    // При присоединении к каналу
    const channelState = await redis.get(`channel:${channelId}`);
    if (channelState) {
        // Канал уже существует на конкретной SFU ноде
        return channelState.sfuNodeId;
    } else {
        // Создаём канал на наименее загруженной ноде
        const bestNode = await selectBestNode();
        await redis.set(`channel:${channelId}`, { sfuNodeId: bestNode });
        return bestNode;
    }
    ```

3. **Health checks и failover**:
    ```typescript
    // Мониторинг здоровья SFU нод
    setInterval(async () => {
        for (const node of sfuNodes) {
            const health = await checkNodeHealth(node);
            if (!health.ok) {
                // Переключаем каналы на другую ноду
                await migrateChannels(node.id, findHealthyNode());
            }
        }
    }, 10000); // Каждые 10 секунд
    ```

**Стоимость**: ~$200-400/месяц

-   3 SFU ноды: $150-300/м (по $50-100 каждая)
-   Redis Cluster: $30-50/м (AWS ElastiCache)
-   PostgreSQL: $20-50/м (managed DB)

---

### Phase 3: Scale (1,000-10,000 пользователей)

**Новые проблемы**:

-   ❌ Один PostgreSQL - медленные запросы
-   ❌ WebSocket signaling на одном сервере
-   ❌ Нет аналитики и мониторинга

**Решение: Микросервисная архитектура**

```
┌──────────────────────────────────────────────────────────────────────────┐
│                         API GATEWAY (Kong/Nginx)                         │
│                    Rate limiting, Authentication, Routing                │
└────────────────────────────────┬─────────────────────────────────────────┘
                                 │
        ┌────────────────────────┼────────────────────────┐
        │                        │                        │
┌───────▼──────┐        ┌────────▼────────┐     ┌───────▼──────────┐
│  Auth Service│        │  Channel Service│     │  Voice Service   │
│  (Node.js)   │        │  (Node.js)      │     │  (SFU Manager)   │
│              │        │                 │     │                  │
│ JWT tokens   │        │ CRUD channels   │     │ Coordinate SFUs  │
│ Users        │        │ Permissions     │     │ Route users      │
└──────────────┘        └─────────────────┘     └──────────────────┘
        │                        │                        │
        └────────────────────────┼────────────────────────┘
                                 │
                ┌────────────────┼────────────────┐
                │                │                │
        ┌───────▼──────┐  ┌──────▼──────┐  ┌────▼──────────┐
        │ PostgreSQL   │  │   Redis     │  │  Kafka/RabbitMQ│
        │ (Read+Write) │  │  (Cache)    │  │  (Events)      │
        └──────────────┘  └─────────────┘  └────────────────┘
                                                   │
                                          ┌────────▼────────┐
                                          │ Analytics Service│
                                          │  (Metrics)       │
                                          └──────────────────┘
```

**Микросервисы**:

1. **Auth Service** (авторизация):

    ```typescript
    // Отдельный сервис для JWT, users, sessions
    POST / auth / register;
    POST / auth / login;
    POST / auth / refresh;
    GET / auth / me;
    ```

2. **Channel Service** (управление каналами):

    ```typescript
    GET    /channels
    POST   /channels
    PUT    /channels/:id
    DELETE /channels/:id
    GET    /channels/:id/members
    ```

3. **Voice Service** (координация голосовых):

    ```typescript
    POST /voice/join/:channelId
    POST /voice/leave/:channelId
    GET  /voice/sfu-node/:channelId  // Какой SFU использовать
    ```

4. **Signaling Service** (WebSocket):
    ```typescript
    // Отдельные WebSocket серверы с балансировкой
    WS ws://signaling-1.hype.com
    WS ws://signaling-2.hype.com
    WS ws://signaling-3.hype.com
    ```

**Database sharding по guild/server ID**:

```sql
-- User находится в Guild ID 12345
-- Все данные Guild 12345 → Shard 1 (PostgreSQL instance 1)
-- Guild 67890 → Shard 2 (PostgreSQL instance 2)

SELECT * FROM messages
WHERE guild_id = 12345
  AND channel_id = 'abc'
ORDER BY created_at DESC
LIMIT 50;
```

**Event-driven architecture (Kafka)**:

```typescript
// Сервисы общаются через события
kafka.publish('user.joined_voice', {
    userId: '123',
    channelId: 'abc',
    timestamp: Date.now(),
});

// Analytics Service слушает события
kafka.subscribe('user.joined_voice', (event) => {
    metrics.increment('voice.joins');
    analytics.track(event);
});
```

**Стоимость**: ~$1,000-2,000/месяц

-   10+ SFU ноды: $500-1,000/м
-   3 PostgreSQL shards: $200-300/м
-   Redis Cluster: $100-150/м
-   Kafka: $100-200/м
-   Load balancers: $100-200/м

---

### Phase 4: Massive Scale (10,000-100,000 пользователей)

**Новые проблемы**:

-   ❌ SFU всё ещё bottleneck для очень больших каналов
-   ❌ Слишком много соединений на SFU
-   ❌ Стримеры с 1000+ зрителями

**Решение: Cascade SFU + CDN для стримов**

```
┌──────────────────────────────────────────────────────────────┐
│                   LARGE VOICE CHANNEL                        │
│                   (100+ participants)                        │
└────────────────────────┬─────────────────────────────────────┘
                         │
              ┌──────────┴──────────┐
              │                     │
      ┌───────▼──────┐      ┌──────▼───────┐
      │  SFU Edge 1  │      │  SFU Edge 2  │
      │  (25 users)  │      │  (25 users)  │
      └───────┬──────┘      └──────┬───────┘
              │                     │
              └──────────┬──────────┘
                         │
                  ┌──────▼──────┐
                  │  SFU Core   │
                  │ (Aggregator)│
                  └─────────────┘
```

**Cascade SFU архитектура**:

```typescript
// Для больших каналов (50+ человек)
// 1. Core SFU получает стримы от спикеров
// 2. Edge SFU получают стримы от Core
// 3. Пользователи подключаются к Edge (нагрузка распределена)

class CascadeSFU {
    async joinLargeChannel(channelId: string, userId: string) {
        const participantCount = await getChannelParticipantCount(channelId);

        if (participantCount < 50) {
            // Обычный SFU
            return await sfuService.joinChannel(channelId, userId);
        } else {
            // Cascade mode
            const coreNode = await getCoreNodeForChannel(channelId);
            const edgeNode = await selectEdgeNode(coreNode, userId);

            // Спикеры подключаются к Core
            if (await isActiveSpeaker(userId)) {
                return await connectToCore(coreNode, userId);
            } else {
                // Слушатели к Edge
                return await connectToEdge(edgeNode, userId);
            }
        }
    }
}
```

**CDN для стримов экрана**:

```typescript
// Игровой стрим с 1000+ зрителей
// Не SFU, а RTMP → CDN → HLS

class StreamService {
    async startGameStream(userId: string, channelId: string) {
        // 1. Стример отправляет RTMP на ingest server
        const rtmpUrl = await getIngestUrl(userId);

        // 2. Transcoding в разные качества
        // Original: 1080p@60fps, 8 Mbps
        // High:     1080p@30fps, 4 Mbps
        // Medium:    720p@30fps, 2 Mbps
        // Low:       480p@30fps, 1 Mbps

        // 3. Распространение через CDN (Cloudflare Stream, AWS CloudFront)
        const hlsUrl = await transcodeToHLS(rtmpUrl, [
            { resolution: '1080p', fps: 60, bitrate: '8M' },
            { resolution: '1080p', fps: 30, bitrate: '4M' },
            { resolution: '720p', fps: 30, bitrate: '2M' },
            { resolution: '480p', fps: 30, bitrate: '1M' },
        ]);

        // 4. Зрители смотрят через HLS (adaptive bitrate)
        return { hlsUrl, rtmpUrl };
    }
}
```

**Стоимость**: ~$5,000-10,000/месяц

-   50+ SFU ноды: $2,500-5,000/м
-   CDN для стримов: $1,000-2,000/м (transfer costs)
-   Database clusters: $1,000-1,500/м
-   Infrastructure: $500-1,500/м

---

## 🛠️ Технический стек (финальная версия)

### Backend Services

```yaml
# API Gateway
gateway:
    - Kong / Nginx / Traefik
    - Rate limiting
    - Authentication
    - Load balancing

# Микросервисы
services:
    auth:
        tech: Node.js + TypeScript
        database: PostgreSQL
        cache: Redis

    channels:
        tech: Node.js + TypeScript
        database: PostgreSQL (sharded)
        cache: Redis

    voice:
        tech: Node.js + mediasoup
        coordination: Redis
        monitoring: Prometheus

    signaling:
        tech: Node.js + WebSocket
        scaling: Socket.io with Redis adapter

    streaming:
        tech: FFmpeg + RTMP
        cdn: Cloudflare Stream / AWS CloudFront
        storage: S3 for recordings

# Данные
databases:
    primary: PostgreSQL 15+ (sharded by guild_id)
    cache: Redis Cluster
    analytics: ClickHouse / TimescaleDB
    search: Elasticsearch (для поиска сообщений)

# Messaging
queue:
    - Kafka / RabbitMQ
    - Event-driven communication
    - Async tasks (emails, notifications)

# Monitoring
observability:
    metrics: Prometheus + Grafana
    logging: ELK Stack (Elasticsearch, Logstash, Kibana)
    tracing: Jaeger / OpenTelemetry
    alerts: PagerDuty / Opsgenie
```

### SFU Infrastructure

```yaml
# mediasoup cluster
sfu_nodes:
    regions:
        - us-east-1 # US East Coast
        - us-west-1 # US West Coast
        - eu-west-1 # EU Ireland
        - eu-central-1 # EU Frankfurt
        - ap-south-1 # Asia Pacific Singapore
        - ap-northeast-1 # Asia Pacific Tokyo

    specs:
        cpu: 8+ cores
        ram: 16GB+
        network: 1 Gbps+

    software:
        - mediasoup 3.x
        - Node.js 20+
        - Redis client
        - Health check agent

# Cascade architecture (для больших каналов)
cascade:
    core_nodes: 5-10 (мощные серверы)
    edge_nodes: 50-100 (легковесные)
    max_users_per_edge: 50
```

---

## 📊 Метрики и мониторинг

### Ключевые метрики голоса

```typescript
// Prometheus metrics
interface VoiceMetrics {
    // Качество соединения
    voice_latency_ms: Histogram; // <150ms target
    voice_packet_loss_percent: Gauge; // <1% target
    voice_jitter_ms: Histogram; // <30ms target

    // Нагрузка
    active_voice_channels: Gauge;
    active_voice_users: Gauge;
    voice_bitrate_mbps: Gauge;

    // SFU
    sfu_node_cpu_percent: Gauge;
    sfu_node_memory_percent: Gauge;
    sfu_node_connections: Gauge;
    sfu_node_health: Gauge; // 0 or 1

    // Бизнес метрики
    voice_joins_per_minute: Counter;
    voice_avg_session_duration_minutes: Histogram;
    voice_errors_per_minute: Counter;
}

// Grafana Dashboard
// - Latency chart (P50, P95, P99)
// - Active users timeline
// - SFU load heatmap
// - Error rate alert (>1% = critical)
```

### Alerting rules

```yaml
# Prometheus alerts
alerts:
    - name: HighVoiceLatency
      expr: histogram_quantile(0.95, voice_latency_ms) > 200
      for: 5m
      severity: warning

    - name: SFUNodeDown
      expr: sfu_node_health == 0
      for: 1m
      severity: critical
      action: auto_migrate_channels

    - name: HighPacketLoss
      expr: voice_packet_loss_percent > 5
      for: 2m
      severity: critical

    - name: TooManyErrors
      expr: rate(voice_errors_per_minute[5m]) > 10
      for: 5m
      severity: warning
```

---

## 🚀 План внедрения (поэтапный)

### Этап 1: Фундамент (2-3 недели)

**Цель**: Подготовить код к масштабированию

```typescript
// 1. Рефакторинг rtcService → поддержка нескольких SFU
interface SFUNode {
    id: string;
    region: string;
    url: string;
    maxConnections: number;
    currentLoad: number;
}

class RTCService {
    private currentSFUNode?: SFUNode;

    async joinVoiceChannel(channelId: string, userId: string) {
        // Запрос у backend: какой SFU использовать?
        const sfuNode = await this.selectSFUNode(channelId);
        this.currentSFUNode = sfuNode;

        // Подключение к конкретному SFU
        await sfuService.connect(sfuNode.url);
        await sfuService.joinChannel(channelId, userId);
    }

    private async selectSFUNode(channelId: string): Promise<SFUNode> {
        // Backend API: GET /voice/sfu-node/:channelId
        const response = await apiClient.get(`/voice/sfu-node/${channelId}`);
        return response.data.sfuNode;
    }
}
```

```typescript
// 2. Backend: Voice Service (простой роутинг)
class VoiceService {
    private sfuNodes: SFUNode[] = [
        { id: 'sfu-1', region: 'us-east', url: 'wss://sfu1.hype.com', ... },
        // Пока один, но код готов для нескольких
    ];

    async selectSFUNode(channelId: string): Promise<SFUNode> {
        // Phase 1: Round-robin
        // Phase 2: По нагрузке
        // Phase 3: По геолокации + нагрузке
        return this.sfuNodes[0];
    }
}
```

```typescript
// 3. Environment config
interface AppConfig {
    mode: 'development' | 'production';
    voice: {
        architecture: 'p2p' | 'sfu' | 'auto';
        sfuNodes: SFUNode[];
        maxUsersPerChannel: number;
    };
}
```

**Результат**: Код готов к добавлению новых SFU нод без изменений

---

### Этап 2: Multi-SFU (1-2 недели)

**Цель**: Несколько SFU нод + Redis координация

```bash
# Развернуть 2-3 SFU ноды
docker-compose up -d sfu-1 sfu-2 sfu-3
```

```yaml
# docker-compose.yml
version: '3.8'
services:
    sfu-1:
        build: ./sfu
        environment:
            - NODE_ID=sfu-1
            - REDIS_URL=redis://redis:6379
            - ANNOUNCED_IP=104.18.1.1
        ports:
            - '40000-49999:40000-49999/udp'

    sfu-2:
        build: ./sfu
        environment:
            - NODE_ID=sfu-2
            - REDIS_URL=redis://redis:6379
            - ANNOUNCED_IP=104.18.1.2
        ports:
            - '50000-59999:50000-59999/udp'

    redis:
        image: redis:7-alpine
        ports:
            - '6379:6379'
```

```typescript
// Backend: Координация через Redis
class VoiceCoordinator {
    async assignChannel(channelId: string): Promise<SFUNode> {
        // Проверяем есть ли канал уже на какой-то ноде
        const existing = await redis.get(`channel:${channelId}`);
        if (existing) {
            return JSON.parse(existing);
        }

        // Выбираем наименее загруженную ноду
        const nodes = await this.getHealthyNodes();
        const bestNode = nodes.sort((a, b) => a.load - b.load)[0];

        // Сохраняем маппинг
        await redis.set(`channel:${channelId}`, JSON.stringify(bestNode));
        await redis.expire(`channel:${channelId}`, 3600); // 1 час TTL

        return bestNode;
    }

    async getHealthyNodes(): Promise<SFUNode[]> {
        const keys = await redis.keys('sfu:health:*');
        const nodes = [];

        for (const key of keys) {
            const health = await redis.get(key);
            if (health && JSON.parse(health).status === 'healthy') {
                nodes.push(JSON.parse(health));
            }
        }

        return nodes;
    }
}
```

**Результат**: Каналы распределяются по нескольким SFU, отказоустойчивость

---

### Этап 3: Микросервисы (2-3 недели)

**Цель**: Разделить монолит на сервисы

```
backend/
├── services/
│   ├── auth/           # Отдельный сервис
│   │   ├── src/
│   │   ├── package.json
│   │   └── Dockerfile
│   ├── channels/       # Отдельный сервис
│   │   ├── src/
│   │   ├── package.json
│   │   └── Dockerfile
│   ├── voice/          # Координатор SFU
│   │   ├── src/
│   │   ├── package.json
│   │   └── Dockerfile
│   └── signaling/      # WebSocket кластер
│       ├── src/
│       ├── package.json
│       └── Dockerfile
├── gateway/            # API Gateway (Kong)
│   └── kong.yml
└── docker-compose.yml
```

```yaml
# docker-compose.yml (production)
services:
    gateway:
        image: kong:3.5
        environment:
            - KONG_DATABASE=postgres
        ports:
            - '8000:8000' # API
            - '8443:8443' # API SSL

    auth-service:
        build: ./services/auth
        environment:
            - DATABASE_URL=postgresql://...
            - REDIS_URL=redis://...
        replicas: 3 # Автомасштабирование

    voice-service:
        build: ./services/voice
        environment:
            - REDIS_URL=redis://...
            - SFU_NODES=sfu-1,sfu-2,sfu-3
        replicas: 2

    # ... другие сервисы
```

**Результат**: Независимое масштабирование каждого сервиса

---

### Этап 4: CDN для стримов (1 неделя)

**Цель**: Поддержка стримов с 100+ зрителями

```typescript
// Frontend: Разные пути для голоса и стрима
if (isGameStream && viewerCount > 100) {
    // HLS стрим через CDN
    const hlsUrl = await streamingService.getStreamUrl(channelId);
    player.loadSource(hlsUrl);
} else {
    // WebRTC для интерактива (голос + малые стримы)
    await rtcService.joinVoiceChannel(channelId);
}
```

```typescript
// Backend: RTMP ingest + transcode
class StreamingService {
    async startStream(userId: string, channelId: string) {
        // 1. Генерируем RTMP URL для OBS/стримера
        const rtmpUrl = `rtmp://ingest.hype.com/live/${generateStreamKey(userId)}`;

        // 2. FFmpeg транскодирование
        const ffmpeg = spawn('ffmpeg', [
            '-i',
            rtmpUrl,
            '-c:v',
            'libx264',
            '-preset',
            'veryfast',
            '-b:v',
            '4M',
            '-maxrate',
            '4M',
            '-bufsize',
            '8M',
            '-vf',
            'scale=1920:1080',
            '-g',
            '60',
            '-c:a',
            'aac',
            '-b:a',
            '128k',
            '-f',
            'hls',
            '-hls_time',
            '2',
            '-hls_list_size',
            '5',
            '-hls_flags',
            'delete_segments',
            `/var/www/hls/${userId}/playlist.m3u8`,
        ]);

        // 3. Upload HLS segments to CDN (S3 + CloudFront)
        watchHLSSegments(`/var/www/hls/${userId}/`, async (segment) => {
            await s3.upload(segment, `streams/${userId}/`);
            await invalidateCloudFrontCache(segment);
        });

        // 4. Return CDN URL
        return {
            rtmpUrl,
            hlsUrl: `https://cdn.hype.com/streams/${userId}/playlist.m3u8`,
        };
    }
}
```

**Результат**: Стримы масштабируются независимо от голоса

---

## 💰 Прогноз стоимости по фазам

| Phase                 | Users      | Concurrent Voice | Monthly Cost     | Notes                        |
| --------------------- | ---------- | ---------------- | ---------------- | ---------------------------- |
| **Phase 1 (MVP)**     | 100        | 10-20            | $50-100          | 1 VPS (Hybrid P2P+SFU)       |
| **Phase 2 (Growth)**  | 1,000      | 100-200          | $300-500         | Multi-region SFU (3 nodes)   |
| **Phase 3 (Scale)**   | 10,000     | 1,000-2,000      | $1,500-3,000     | Микросервисы + 10 SFU        |
| **Phase 4 (Massive)** | 100,000    | 10,000+          | $8,000-15,000    | Cascade SFU + CDN + Sharding |
| **Phase 5 (Discord)** | 1,000,000+ | 100,000+         | $50,000-150,000+ | Enterprise infrastructure    |

---

## 🎯 Что делать СЕЙЧАС (приоритеты)

### ✅ Must have (делаем прямо сейчас)

1. **Hybrid P2P + SFU** ← ВЫ ТУТ

    ```bash
    # Установить mediasoup
    cd backend && pnpm add mediasoup
    cd frontend && pnpm add mediasoup-client
    ```

2. **Config-driven architecture**

    ```typescript
    // config/voice.config.ts
    export const voiceConfig = {
        mode: process.env.VOICE_MODE || 'auto',
        p2pMaxUsers: 8,
        sfuNodes: process.env.SFU_NODES?.split(',') || ['localhost:3000'],
    };
    ```

3. **Database schema для масштабирования**

    ```sql
    -- Добавить guild_id для sharding в будущем
    ALTER TABLE channels ADD COLUMN guild_id UUID;
    ALTER TABLE messages ADD COLUMN guild_id UUID;

    -- Индексы для быстрых запросов
    CREATE INDEX idx_channels_guild ON channels(guild_id);
    CREATE INDEX idx_messages_channel_created
      ON messages(channel_id, created_at DESC);
    ```

### 🎨 Should have (следующие 2-4 недели)

4. **Health checks для SFU**
5. **Prometheus metrics**
6. **Redis для координации**

### 🚀 Nice to have (через 1-2 месяца)

7. **Multi-region SFU**
8. **Микросервисы**
9. **CDN для стримов**

---

## 📚 Рекомендации

### Технологии

**Точно используем**:

-   ✅ mediasoup (SFU) - лучший выбор для голоса
-   ✅ Redis - координация и кеш
-   ✅ PostgreSQL - primary database
-   ✅ Docker + docker-compose - деплой

**Рассмотрим позже**:

-   Kubernetes (когда > 10 сервисов)
-   Kafka (когда > 100k events/sec)
-   Cassandra (когда PostgreSQL не справляется)
-   Elasticsearch (для поиска по истории)

### Команда

**Phase 1-2** (MVP → Growth): 2-3 человека

-   1 Backend (Node.js + mediasoup)
-   1 Frontend (React + WebRTC)
-   1 DevOps (part-time)

**Phase 3** (Scale): 4-6 человек

-   2 Backend
-   1 Frontend
-   1 DevOps (full-time)
-   1 QA

**Phase 4+** (Massive): 10+ человек

-   Backend team (3-4)
-   Frontend team (2-3)
-   DevOps team (2-3)
-   SRE (1-2)
-   QA (1-2)

---

## 🎬 Заключение

### Ключевые принципы масштабирования:

1. **Start simple, plan for scale** ← Вы правильно думаете!
2. **Measure everything** - без метрик невозможно оптимизировать
3. **Fail gracefully** - система должна деградировать постепенно
4. **Automate operations** - ручной труд не масштабируется
5. **Cost-conscious** - не переплачивайте раньше времени

### Ваша траектория:

```
Сейчас:  P2P (8 users)
         ↓
1 месяц: Hybrid (P2P + 1 SFU) ← СЛЕДУЮЩИЙ ШАГ
         ↓
3 месяца: Multi-SFU (3-5 nodes)
         ↓
6 месяцев: Микросервисы + 10 SFU
         ↓
1 год:   Cascade SFU + CDN
         ↓
2 года:  Discord-scale infrastructure
```

**Ваше преимущество**: Закладываете правильную архитектуру СЕЙЧАС, когда это дёшево менять. Discord делал это годами методом проб и ошибок.

**Следующий PR**: Hybrid mode (P2P + SFU) с автопереключением 🚀
