import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import dotenv from 'dotenv';
import { setupWebSocket } from './websocket/websocket.js';
import { setWebSocketManager } from './websocket/wsManager.js';
import { setupRoutes } from './routes/index.js';
import { initializeMessagesStore } from './data/defaultServer.js';
import { sfuService } from './services/sfuService.js';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;
const WS_PORT = process.env.WS_PORT || 8080;

// Middleware
app.use(
    cors({
        origin: [process.env.FRONTEND_URL || 'http://localhost:5173', 'http://localhost:5173', 'http://localhost:5174'],
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization'],
    })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        service: 'Hype Backend',
    });
});

// Setup API routes
setupRoutes(app);

// Create HTTP server for REST API
const httpServer = createServer(app);

// Create separate WebSocket server
const wsServer = createServer();
const wss = new WebSocketServer({ server: wsServer });

// Setup WebSocket handlers
const wsManager = setupWebSocket(wss);
setWebSocketManager(wsManager);

// Initialize SFU service
await sfuService.init();

// Connect WebSocketManager to SFUService for producer notifications
sfuService.setWebSocketManager(wsManager);

// Connect SFUService to WebSocketManager for disconnect cleanup
wsManager.setSFUService(sfuService);
console.log('✅ SFU service connected to WebSocketManager');

// Initialize messages store from persistent storage
await initializeMessagesStore();

// Start servers
httpServer.listen(PORT, () => {
    console.log(`🚀 HTTP Server running on http://localhost:${PORT}`);
    console.log(`📊 Health check: http://localhost:${PORT}/health`);
    console.log(`🎙️ SFU Voice: http://localhost:${PORT}/api/voice/health`);
});

wsServer.listen(WS_PORT, () => {
    console.log(`🔌 WebSocket Server running on ws://localhost:${WS_PORT}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('🛑 Received SIGTERM, shutting down gracefully');
    httpServer.close(() => {
        console.log('✅ HTTP Server closed');
    });
    wsServer.close(() => {
        console.log('✅ WebSocket Server closed');
    });
});

process.on('SIGINT', () => {
    console.log('🛑 Received SIGINT, shutting down gracefully');
    httpServer.close(() => {
        console.log('✅ HTTP Server closed');
    });
    wsServer.close(() => {
        console.log('✅ WebSocket Server closed');
    });
    process.exit(0);
});
