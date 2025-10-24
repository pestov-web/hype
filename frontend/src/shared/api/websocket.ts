const WS_URL = import.meta.env.VITE_WS_URL;

export interface WebSocketMessage {
    type:
        | 'message'
        | 'message_edited'
        | 'message_deleted'
        | 'user_joined'
        | 'user_left'
        | 'typing'
        | 'voice_state'
        | 'speaking_state'
        | 'rtc_offer'
        | 'rtc_answer'
        | 'rtc_ice_candidate'
        | 'new_producer'
        | 'producer_closed';
    data: unknown;
    timestamp: Date;
}

export interface MessageData {
    channelId: string;
    content: string;
    userId: string;
    username: string;
    avatarUrl?: string;
}

export interface VoiceStateData {
    channelId: string | null;
    userId: string;
    username: string;
    avatarUrl?: string;
    muted?: boolean;
    deafened?: boolean;
}

export interface WebSocketConfig {
    url: string;
    reconnectInterval: number;
    maxReconnectAttempts: number;
}

type EventCallback = (data?: unknown) => void;

export class WebSocketClient {
    private ws: WebSocket | null = null;
    private config: WebSocketConfig;
    private reconnectAttempts = 0;
    private eventListeners: Map<string, EventCallback[]> = new Map();

    constructor(config: WebSocketConfig) {
        this.config = config;
    }

    connect(): Promise<void> {
        return new Promise((resolve, reject) => {
            try {
                this.ws = new WebSocket(this.config.url);

                this.ws.onopen = () => {
                    console.log('WebSocket connected');
                    this.reconnectAttempts = 0;
                    this.emit('connected');
                    resolve();
                };

                this.ws.onmessage = (event) => {
                    try {
                        const message: WebSocketMessage = JSON.parse(event.data);
                        console.log('[WebSocket] Received message:', message);
                        console.log('[WebSocket] Emitting events: "message" and "' + message.type + '"');
                        this.emit('message', message);
                        this.emit(message.type, message.data);
                    } catch (error) {
                        console.error('Failed to parse WebSocket message:', error);
                    }
                };

                this.ws.onclose = () => {
                    console.log('WebSocket disconnected');
                    this.emit('disconnected');
                    this.handleReconnect();
                };

                this.ws.onerror = (error) => {
                    console.error('WebSocket error:', error);
                    this.emit('error', error);
                    reject(error);
                };
            } catch (error) {
                reject(error);
            }
        });
    }

    disconnect(): void {
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
    }

    send(type: string, data: unknown): void {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            const message: WebSocketMessage = {
                type: type as WebSocketMessage['type'],
                data,
                timestamp: new Date(),
            };
            this.ws.send(JSON.stringify(message));
        } else {
            console.warn('WebSocket is not connected');
        }
    }

    on(event: string, callback: EventCallback): void {
        if (!this.eventListeners.has(event)) {
            this.eventListeners.set(event, []);
        }
        this.eventListeners.get(event)!.push(callback);
    }

    off(event: string, callback: EventCallback): void {
        const listeners = this.eventListeners.get(event);
        if (listeners) {
            const index = listeners.indexOf(callback);
            if (index > -1) {
                listeners.splice(index, 1);
            }
        }
    }

    private emit(event: string, data?: unknown): void {
        const listeners = this.eventListeners.get(event);
        if (listeners) {
            listeners.forEach((callback) => callback(data));
        }
    }

    private handleReconnect(): void {
        if (this.reconnectAttempts < this.config.maxReconnectAttempts) {
            this.reconnectAttempts++;
            console.log(`Attempting to reconnect... (${this.reconnectAttempts}/${this.config.maxReconnectAttempts})`);

            setTimeout(() => {
                this.connect().catch(() => {
                    // Reconnection failed, will try again
                });
            }, this.config.reconnectInterval);
        } else {
            console.error('Max reconnection attempts reached');
            this.emit('max_reconnect_attempts_reached');
        }
    }

    get isConnected(): boolean {
        return this.ws?.readyState === WebSocket.OPEN;
    }

    // Convenience methods for common operations

    /**
     * Send a chat message
     */
    sendMessage(channelId: string, content: string, userId: string, username: string, avatarUrl?: string): void {
        this.send('message', {
            channelId,
            content,
            userId,
            username,
            avatarUrl,
        } as MessageData);
    }

    /**
     * Join or leave a voice channel
     */
    updateVoiceState(
        channelId: string | null,
        userId: string,
        username: string,
        avatarUrl?: string,
        muted = false,
        deafened = false
    ): void {
        this.send('voice_state', {
            channelId,
            userId,
            username,
            avatarUrl,
            muted,
            deafened,
        } as VoiceStateData);
    }

    /**
     * Send typing indicator
     */
    sendTyping(channelId: string, userId: string): void {
        this.send('typing', { channelId, userId });
    }

    /**
     * Join a text channel to receive real-time updates
     */
    joinChannel(channelId: string): void {
        console.log('[WebSocket] Joining channel:', channelId);
        this.send('join_channel', { channelId });
    }

    /**
     * Leave a text channel
     */
    leaveChannel(channelId: string): void {
        console.log('[WebSocket] Leaving channel:', channelId);
        this.send('leave_channel', { channelId });
    }
}

// Default WebSocket client instance
export const wsClient = new WebSocketClient({
    url: WS_URL || 'ws://localhost:8080',
    reconnectInterval: 3000,
    maxReconnectAttempts: 5,
});
