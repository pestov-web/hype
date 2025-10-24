import type { WebSocketManager } from '../websocket/websocket.js';

/**
 * Global WebSocket manager instance
 * Set during server initialization in index.ts
 */
let wsManager: WebSocketManager | null = null;

export function setWebSocketManager(manager: WebSocketManager): void {
    wsManager = manager;
}

export function getWebSocketManager(): WebSocketManager {
    if (!wsManager) {
        throw new Error('WebSocketManager not initialized. Call setWebSocketManager() first.');
    }
    return wsManager;
}

export function hasWebSocketManager(): boolean {
    return wsManager !== null;
}
