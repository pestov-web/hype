# Hype - Real-time Communication Platform

Discord-like real-time communication platform with voice/video calls using WebRTC and Machine Learning-powered Voice Activity Detection.

**🎯 Built for Scale**: Architecture designed to grow from 10 to 10,000+ concurrent users.

## ✨ Features

-   🎤 **Multi-user Voice Calls** - WebRTC P2P voice communication
-   📹 **Video Calls** - Camera support with toggle
-   🖥️ **Screen Sharing** - Share your screen with participants
-   💬 **Text Channels** - Real-time messaging with WebSockets
-   🎙️ **Smart VAD** - ML-powered Voice Activity Detection (Silero VAD)
-   🔐 **Authentication** - JWT-based auth with PostgreSQL
-   🎨 **Modern UI** - React 19 + Radix UI + SCSS
-   📈 **Scalable Architecture** - Ready for Hybrid P2P/SFU deployment

## 🚀 Quick Start

### Prerequisites

-   Node.js 18+
-   pnpm 8+
-   PostgreSQL 14+

### Installation

```bash
# Clone repository
git clone https://github.com/pestov-web/hype.git
cd hype

# Install dependencies
pnpm install

# Setup database
cd backend
pnpm prisma migrate dev

# Start backend
pnpm dev

# In another terminal, start frontend
cd ../frontend
pnpm dev
```

Frontend: http://localhost:5173  
Backend: http://localhost:3001

## 🎙️ Voice Activity Detection

### What is VAD?

Voice Activity Detection automatically detects when you're speaking and only transmits audio during speech, saving bandwidth and reducing background noise.

### How to Use

1. Join a voice channel
2. Go to Settings → Voice & Video
3. Select "Voice Activity Detection (VAD)" mode
4. Speak - your microphone will automatically activate!

### Technical Details

-   **Library**: [@ricky0123/vad-web](https://github.com/ricky0123/vad)
-   **Model**: Silero VAD (ML-based, 95% accuracy)
-   **Latency**: ~50ms detection time
-   **No Setup**: Works out of the box, no threshold tuning needed

Read more: [VAD Documentation](docs/VAD_INTEGRATION.md)

## 🏗️ Architecture

```
Frontend (React 19 + TypeScript)
├── Feature-Sliced Design (FSD)
├── MobX State Management
├── React Router 7
├── Radix UI + SCSS
└── WebRTC + ML-powered VAD

Backend (Node.js + Express)
├── REST API
├── WebSocket Server
├── PostgreSQL + Prisma
└── JWT Authentication
```

## 📁 Project Structure

```
hype/
├── frontend/              # React application
│   ├── src/
│   │   ├── app/           # Application setup
│   │   ├── pages/         # Route pages
│   │   ├── widgets/       # Complex UI blocks
│   │   ├── features/      # Business features
│   │   ├── entities/      # Business entities
│   │   └── shared/        # Shared utilities
│   │       ├── api/       # HTTP + WebSocket clients
│   │       ├── ui/        # Reusable components
│   │       ├── lib/       # Services & utilities
│   │       └── vad/       # VAD Manager 🆕
│   └── ...
├── backend/               # Express server
│   ├── src/
│   │   ├── routes/        # API endpoints
│   │   ├── websocket/     # WebSocket handlers
│   │   └── types/         # Type definitions
│   └── prisma/            # Database schema
└── docs/                  # Documentation
    ├── VAD_INTEGRATION.md
    ├── VAD_MIGRATION.md
    └── VAD_TESTING.md
```

## 🛠️ Development

### Commands

```bash
# Frontend
cd frontend
pnpm dev          # Start dev server
pnpm build        # Build for production
pnpm lint         # Lint code

# Backend
cd backend
pnpm dev          # Start dev server (tsx watch)
pnpm build        # Build TypeScript
pnpm start        # Start production server
pnpm prisma studio # Open database UI
```

### Tech Stack

**Frontend:**

-   React 19.1.1
-   TypeScript 5.9
-   Vite 7
-   MobX 6.15
-   React Router 7.9
-   Radix UI
-   SCSS 1.93
-   @ricky0123/vad-web 0.0.28

**Backend:**

-   Node.js
-   Express 4.21
-   Prisma 6.17
-   PostgreSQL
-   WebSocket (ws 8.18)
-   JWT Authentication

## 📚 Documentation

-   [VAD Integration Guide](docs/VAD_INTEGRATION.md) - Technical details
-   [VAD Migration Guide](docs/VAD_MIGRATION.md) - Upgrading from custom VAD
-   [VAD Testing Guide](docs/VAD_TESTING.md) - Testing and troubleshooting
-   [Changelog](CHANGELOG_VAD.md) - Recent changes

## 🧪 Testing

### Manual Testing

1. Start both servers (frontend + backend)
2. Open http://localhost:5173
3. Login or continue as guest
4. Join voice channel
5. Test VAD mode in Settings

See: [VAD Testing Guide](docs/VAD_TESTING.md)

## 🚀 Production Deployment

Ready to deploy to your VPS? Follow our comprehensive deployment guide:

📖 **[Deployment Guide](DEPLOYMENT.md)** - Complete production setup

**Quick Setup:**

```bash
# On your VPS (Ubuntu 22.04)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo bash -
sudo apt install -y nodejs nginx postgresql certbot python3-certbot-nginx
npm install -g pnpm pm2

# Clone and setup
git clone https://github.com/pestov-web/hype.git
cd hype
./update.sh
```

**What you need:**

-   VPS with 4GB+ RAM (MSK-KVM-SSD-6 recommended)
-   Domain name (optional, but recommended for SSL)
-   PostgreSQL database
-   Ports: 80, 443, 3001, 8080, 40000-49999 (UDP/TCP)

See full guide: [DEPLOYMENT.md](DEPLOYMENT.md)

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## 📈 Scaling & Architecture

Hype is designed to scale from 10 to 100,000+ concurrent users with **Pure SFU architecture**.

-   📘 **[Pure SFU Approach](PURE_SFU_APPROACH.md)** - Why SFU instead of Hybrid ← START HERE
-   � **[Phase 1: SFU Setup](docs/PHASE_1_SFU_SETUP.md)** - 2-week implementation guide
-   � **[Scalability Plan](docs/SCALABILITY_ARCHITECTURE.md)** - Complete roadmap to 100K+ users
-   📕 **[Voice Architecture](VOICE_ARCHITECTURE.md)** - Old P2P reference (deprecated)

**Architecture**: Pure SFU (simple, scalable, production-ready)  
**Timeline**: 2 weeks to implement  
**Cost**: $10-20/month for 20-50 concurrent users  
**Future**: Multi-region SFU → Microservices → Cascade SFU + CDN

## �📄 License

MIT License - see LICENSE file for details

## 👥 Authors

-   **pestov-web** - Initial work

## 🙏 Acknowledgments

-   [@ricky0123/vad-web](https://github.com/ricky0123/vad) - ML-powered VAD library
-   [Silero VAD](https://github.com/snakers4/silero-vad) - Voice activity detection model
-   [VideoSDK](https://www.videosdk.live/) - WebRTC resources and guides
