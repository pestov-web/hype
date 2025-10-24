# Architecture Evolution - Visual Roadmap

## Phase 0: Current State (P2P Mesh)

```
┌─────────────────────────────────────────────────────────────┐
│  CURRENT: P2P Mesh (2-8 users)                              │
│                                                              │
│    User A ←──────────→ User B                                │
│      ↖                  ↗                                    │
│        ↖              ↗                                      │
│          User C ←───                                         │
│                                                              │
│  ✅ Advantages:                                              │
│  • Low latency (~50ms)                                       │
│  • No server costs                                           │
│  • No single point of failure                                │
│  • Privacy (end-to-end)                                      │
│                                                              │
│  ❌ Disadvantages:                                           │
│  • N*(N-1)/2 connections (doesn't scale)                     │
│  • High client bandwidth (N-1 uploads)                       │
│  • CPU intensive for large groups                            │
│                                                              │
│  📊 Limits:                                                  │
│  • Optimal: 2-4 users                                        │
│  • Acceptable: 5-8 users                                     │
│  • Critical: 9-10 users (too many connections)               │
└─────────────────────────────────────────────────────────────┘
```

---

## Phase 1: Hybrid P2P + SFU (Target: 3 weeks)

```
┌─────────────────────────────────────────────────────────────┐
│  PHASE 1: Hybrid Architecture                               │
│                                                              │
│  Small Groups (2-8 users):                                   │
│  ┌──────────────────────────────────────┐                   │
│  │  User A ←─────→ User B               │                   │
│  │    ↖            ↗                    │  P2P Mode         │
│  │      ↖        ↗                      │  (Direct)         │
│  │        User C                        │                   │
│  └──────────────────────────────────────┘                   │
│                                                              │
│  Large Groups (9+ users):                                    │
│  ┌──────────────────────────────────────┐                   │
│  │  User A ──┐                          │                   │
│  │  User B ──┤                          │                   │
│  │  User C ──┼──→ [SFU Server] ──┬──→ User D  │  SFU Mode  │
│  │  User E ──┤                    └──→ User F  │  (Routed)  │
│  │  User G ──┘                          │                   │
│  └──────────────────────────────────────┘                   │
│                                                              │
│  🔄 Auto-switching:                                          │
│  if (participantCount <= 8) → P2P                            │
│  if (participantCount >= 9) → SFU                            │
│                                                              │
│  💰 Cost: ~$50-100/month (1 VPS server)                      │
│  👥 Capacity: 10-50 concurrent voice users                   │
└─────────────────────────────────────────────────────────────┘
```

---

## Phase 2: Multi-Region SFU (Target: 3 months)

```
┌─────────────────────────────────────────────────────────────┐
│  PHASE 2: Multi-Region SFU Cluster                          │
│                                                              │
│             ┌─────────────────┐                              │
│             │ Load Balancer   │                              │
│             │  (Cloudflare)   │                              │
│             └────────┬─────────┘                             │
│                      │                                       │
│       ┌──────────────┼──────────────┐                        │
│       │              │              │                        │
│  ┌────▼────┐    ┌───▼────┐    ┌───▼────┐                    │
│  │ SFU US  │    │ SFU EU │    │ SFU AP │                    │
│  │ East    │    │ West   │    │ South  │                    │
│  └────┬────┘    └───┬────┘    └───┬────┘                    │
│       │             │             │                          │
│       └─────────────┼─────────────┘                          │
│                     │                                        │
│            ┌────────▼─────────┐                              │
│            │  Redis Cluster   │                              │
│            │  (coordination)  │                              │
│            └──────────────────┘                              │
│                                                              │
│  🌍 Routing:                                                 │
│  • User location → Nearest SFU                               │
│  • Channel → Sticky to one SFU node                          │
│  • Auto-failover if SFU dies                                 │
│                                                              │
│  💰 Cost: ~$300-500/month (3 SFU nodes + Redis)              │
│  👥 Capacity: 100-200 concurrent voice users                 │
└─────────────────────────────────────────────────────────────┘
```

---

## Phase 3: Microservices (Target: 6 months)

```
┌─────────────────────────────────────────────────────────────┐
│  PHASE 3: Microservices Architecture                        │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │          API Gateway (Kong/Nginx)                    │   │
│  │     Rate limiting, Auth, Routing                     │   │
│  └──────────────────┬───────────────────────────────────┘   │
│                     │                                        │
│         ┌───────────┼───────────┐                            │
│         │           │           │                            │
│    ┌────▼───┐  ┌───▼────┐  ┌──▼─────┐                       │
│    │ Auth   │  │Channel │  │ Voice  │                       │
│    │Service │  │Service │  │Service │                       │
│    └────┬───┘  └───┬────┘  └──┬─────┘                       │
│         │          │          │                              │
│         └──────────┼──────────┘                              │
│                    │                                         │
│       ┌────────────┼────────────┐                            │
│       │            │            │                            │
│  ┌────▼───┐  ┌────▼────┐  ┌───▼────┐                        │
│  │Postgres│  │  Redis  │  │ Kafka  │                        │
│  │(Shards)│  │ (Cache) │  │(Events)│                        │
│  └────────┘  └─────────┘  └────────┘                        │
│                                                              │
│  🔧 Features:                                                │
│  • Independent scaling per service                           │
│  • Database sharding by guild_id                             │
│  • Event-driven communication (Kafka)                        │
│  • Health checks + auto-recovery                             │
│                                                              │
│  💰 Cost: ~$1,500-3,000/month                                │
│  👥 Capacity: 1,000-2,000 concurrent voice users             │
└─────────────────────────────────────────────────────────────┘
```

---

## Phase 4: Massive Scale (Target: 1 year)

```
┌─────────────────────────────────────────────────────────────┐
│  PHASE 4: Discord-Level Scale                               │
│                                                              │
│  LARGE VOICE CHANNEL (100+ participants):                    │
│                                                              │
│         Speakers (active talkers)                            │
│         ┌───────┬───────┬───────┐                            │
│         │User A │User B │User C │                            │
│         └───┬───┴───┬───┴───┬───┘                            │
│             │       │       │                                │
│             └───────┼───────┘                                │
│                     │                                        │
│              ┌──────▼──────┐                                 │
│              │  Core SFU   │                                 │
│              │(Aggregator) │                                 │
│              └──────┬──────┘                                 │
│                     │                                        │
│         ┌───────────┼───────────┐                            │
│         │           │           │                            │
│    ┌────▼────┐ ┌───▼────┐ ┌───▼────┐                        │
│    │SFU Edge1│ │SFU Edge2│ │SFU Edge3│                       │
│    │(25 users)│(25 users)│(25 users)│                       │
│    └────┬────┘ └───┬────┘ └───┬────┘                        │
│         │          │          │                              │
│    Listeners  Listeners  Listeners                           │
│                                                              │
│  GAME STREAMING (1000+ viewers):                             │
│                                                              │
│    Streamer → RTMP → Transcode → CDN → HLS → Viewers        │
│                                                              │
│  📊 Features:                                                │
│  • Cascade SFU (Core → Edge)                                 │
│  • CDN for mass broadcasting                                 │
│  • Adaptive bitrate streaming                                │
│  • Global distribution                                       │
│                                                              │
│  💰 Cost: ~$8,000-15,000/month                               │
│  👥 Capacity: 10,000+ concurrent voice users                 │
└─────────────────────────────────────────────────────────────┘
```

---

## Comparison Matrix

### Connection Count

| Users | P2P Connections | SFU Connections | Cascade SFU      |
| ----- | --------------- | --------------- | ---------------- |
| 3     | 3               | 3               | 3                |
| 5     | 10              | 5               | 5                |
| 8     | 28              | 8               | 8                |
| 10    | 45 ❌           | 10 ✅           | 10 ✅            |
| 25    | 300 ❌❌        | 25 ✅           | 25 ✅            |
| 50    | 1,225 ❌❌❌    | 50 ⚠️           | 52 ✅ (2 edges)  |
| 100   | 4,950 ❌❌❌    | 100 ❌          | 104 ✅ (4 edges) |

### Bandwidth (per user)

| Architecture       | Upload (64 kbps/stream) | Download                       |
| ------------------ | ----------------------- | ------------------------------ |
| P2P (10 users)     | 576 kbps (9 streams) ❌ | 576 kbps                       |
| SFU (10 users)     | 64 kbps (1 stream) ✅   | 576 kbps                       |
| SFU (50 users)     | 64 kbps ✅              | 3,136 kbps ⚠️                  |
| Cascade (50 users) | 64 kbps ✅              | 1,280 kbps ✅ (only 20 active) |

### Latency

| Architecture | Typical Latency  | Notes                    |
| ------------ | ---------------- | ------------------------ |
| P2P          | 50-100ms ✅      | Direct connection        |
| SFU          | 100-150ms ✅     | One hop through server   |
| Cascade SFU  | 150-200ms ⚠️     | Two hops (Core → Edge)   |
| CDN (HLS)    | 2,000-5,000ms ❌ | High latency, mass scale |

---

## Decision Tree

```
Start: How many users in voice channel?

├─ 2-8 users
│  └─→ Use P2P (Phase 0/1)
│      ✅ Low latency
│      ✅ No costs
│      ✅ Best quality
│
├─ 9-25 users
│  └─→ Use Single SFU (Phase 1)
│      ✅ Scalable
│      ✅ Low costs ($50-100/m)
│      ✅ Good latency
│
├─ 26-100 users
│  └─→ Use Multi-Region SFU (Phase 2)
│      ✅ Global distribution
│      ⚠️ Medium costs ($300-500/m)
│      ✅ Good latency
│
├─ 101-1,000 users
│  └─→ Use Cascade SFU (Phase 3/4)
│      ✅ High scalability
│      ⚠️ High costs ($1,500-3,000/m)
│      ⚠️ Higher latency (150-200ms)
│
└─ 1,000+ viewers (game stream)
   └─→ Use CDN (RTMP → HLS) (Phase 4)
       ✅ Unlimited scale
       ⚠️ Very high costs (transfer fees)
       ❌ High latency (2-5 seconds)
```

---

## Timeline & Costs Summary

| Phase       | Timeline | Users       | Monthly Cost   | Effort     |
| ----------- | -------- | ----------- | -------------- | ---------- |
| **Phase 0** | Now      | 10-20       | $0-50          | ✅ Done    |
| **Phase 1** | 3 weeks  | 50-100      | $50-100        | 🔄 Next    |
| **Phase 2** | 3 months | 100-500     | $300-500       | 📋 Planned |
| **Phase 3** | 6 months | 1,000-5,000 | $1,500-3,000   | 📋 Planned |
| **Phase 4** | 1 year   | 10,000+     | $8,000-15,000+ | 📋 Future  |

---

## Next Steps

**🎯 Start Here**: Read `docs/PHASE_1_HYBRID_MODE.md` for detailed 3-week implementation plan.

**Key Points**:

1. ✅ Current P2P architecture works great for small groups
2. ✅ Hybrid mode provides smooth scaling path
3. ✅ No code rewrites between phases
4. ✅ Pay only for what you need (start cheap, scale gradually)
5. ✅ Each phase builds on previous foundation

**Remember**: Discord took 5+ years to build this. You have a complete roadmap from day one! 🚀
