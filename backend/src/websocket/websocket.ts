import { WebSocketServer, WebSocket } from 'ws';
import { v4 as uuidv4 } from 'uuid';
import type { WebSocketMessage, User, VoiceState } from '../types/index.js';
import { messagesStore, voiceParticipants, type Message, type VoiceParticipant } from '../data/defaultServer.js';
import { saveMessages } from '../data/storage.js';

interface ConnectedClient {
    id: string;
    ws: WebSocket;
    user?: User;
    channels: Set<string>;
}

// Import SFU service type for cleanup
type SFUService = {
    cleanup(channelId: string, userId: string): Promise<void>;
};

export class WebSocketManager {
    private clients = new Map<string, ConnectedClient>();
    private channels = new Map<string, Set<string>>(); // channelId -> Set of clientIds
    private voiceStates = new Map<string, VoiceState>(); // userId -> VoiceState
    private sfuService: SFUService | null = null;

    constructor(private wss: WebSocketServer) {
        this.setupWebSocket();
    }

    // Method to set SFU service (called from index.ts after initialization)
    setSFUService(sfuService: SFUService) {
        this.sfuService = sfuService;
        console.log('✅ SFU service connected to WebSocketManager');
    }

    private setupWebSocket() {
        this.wss.on('connection', (ws: WebSocket) => {
            const clientId = uuidv4();
            const client: ConnectedClient = {
                id: clientId,
                ws,
                channels: new Set(),
            };

            this.clients.set(clientId, client);
            console.log(`🔌 Client connected: ${clientId}`);

            ws.on('message', (data: Buffer) => {
                try {
                    const message: WebSocketMessage = JSON.parse(data.toString());
                    this.handleMessage(clientId, message);
                } catch (error) {
                    console.error('Failed to parse WebSocket message:', error);
                }
            });

            ws.on('close', () => {
                // Fire and forget async cleanup
                this.handleDisconnect(clientId).catch((error) => {
                    console.error(`❌ Error during disconnect cleanup for ${clientId}:`, error);
                });
            });

            ws.on('error', (error) => {
                console.error(`WebSocket error for client ${clientId}:`, error);
            });

            // Send welcome message
            this.sendToClient(clientId, {
                type: 'user_joined',
                data: { clientId },
                timestamp: new Date(),
            });
        });
    }

    private handleMessage(clientId: string, message: WebSocketMessage) {
        const client = this.clients.get(clientId);
        if (!client) {
            console.log(`⚠️ handleMessage: client not found for ${clientId}`);
            return;
        }

        console.log(
            `📨 Message from ${clientId}:`,
            message.type,
            'data:',
            JSON.stringify(message.data).substring(0, 100)
        );

        switch (message.type) {
            case 'new_message':
                this.handleChatMessage(clientId, message.data);
                break;
            case 'user_joined':
                this.handleUserJoined(clientId, message.data);
                break;
            case 'join_channel':
                this.handleJoinChannel(clientId, message.data);
                break;
            case 'leave_channel':
                this.handleLeaveChannel(clientId, message.data);
                break;
            case 'voice_state':
                this.handleVoiceState(clientId, message.data);
                break;
            case 'speaking_state':
                this.handleSpeakingState(clientId, message.data);
                break;
            case 'typing':
                this.handleTyping(clientId, message.data);
                break;
            case 'rtc_offer':
                this.handleRTCOffer(clientId, message.data);
                break;
            case 'rtc_answer':
                this.handleRTCAnswer(clientId, message.data);
                break;
            case 'rtc_ice_candidate':
                this.handleRTCIceCandidate(clientId, message.data);
                break;
            default:
                console.warn('Unknown message type:', message.type);
        }
    }

    private handleChatMessage(clientId: string, data: any) {
        const { channelId, content, userId, username, avatarUrl } = data;
        const client = this.clients.get(clientId);
        if (!client) return;

        // Auto-join channel if not already joined
        if (!client.channels.has(channelId)) {
            this.joinChannel(clientId, channelId);
        }

        // Create message object
        const messageData: Message = {
            id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            content,
            channelId,
            userId,
            username,
            avatarUrl,
            createdAt: new Date(),
        };

        // Store message
        const messages = messagesStore.get(channelId) || [];
        messages.push(messageData);
        messagesStore.set(channelId, messages);

        // Save to disk immediately
        saveMessages(messagesStore).catch((error) => {
            console.error('❌ Failed to save messages:', error);
        });

        console.log(`💬 Message from ${username} in channel ${channelId}: "${content}"`);

        // Broadcast to all clients in the channel
        this.broadcastToChannel(channelId, {
            type: 'new_message',
            data: messageData,
            timestamp: new Date(),
        });
    }

    private handleUserJoined(clientId: string, data: any) {
        const client = this.clients.get(clientId);
        if (!client) return;

        client.user = data.user;
        console.log(`👤 User joined: ${data.user?.username || 'Unknown'} (${clientId})`);
    }

    private handleJoinChannel(clientId: string, data: any) {
        const { channelId } = data;
        if (!channelId) {
            console.warn('⚠️ handleJoinChannel: missing channelId');
            return;
        }

        this.joinChannel(clientId, channelId);
        console.log(`📺 Client ${clientId} explicitly joined text channel ${channelId}`);
    }

    private handleLeaveChannel(clientId: string, data: any) {
        const { channelId } = data;
        if (!channelId) {
            console.warn('⚠️ handleLeaveChannel: missing channelId');
            return;
        }

        const client = this.clients.get(clientId);
        if (!client) return;

        client.channels.delete(channelId);

        const channelClients = this.channels.get(channelId);
        if (channelClients) {
            channelClients.delete(clientId);
            if (channelClients.size === 0) {
                this.channels.delete(channelId);
            }
        }

        console.log(`👋 Client ${clientId} explicitly left text channel ${channelId}`);
    }

    private handleVoiceState(clientId: string, data: any) {
        const client = this.clients.get(clientId);
        if (!client) {
            console.log(`⚠️ handleVoiceState: client not found for ${clientId}`);
            return;
        }

        console.log(`🎙️ handleVoiceState received data:`, JSON.stringify(data, null, 2));

        const { channelId, userId, username, avatarUrl, muted, deafened } = data;

        // Set client.user if not already set (for voice calls without explicit user_joined)
        if (!client.user && userId && username) {
            client.user = {
                id: userId,
                username,
                email: '',
                discriminator: '0000',
                avatar: avatarUrl,
                status: 'online',
                createdAt: new Date(),
                updatedAt: new Date(),
            };
            console.log(`👤 Auto-set user from voice_state: ${username} (${userId})`);
        }

        const oldState = this.voiceStates.get(userId);

        console.log(
            `🎙️ Voice state update: userId=${userId}, oldChannel=${oldState?.channelId}, newChannel=${channelId}`
        );

        // If user left a voice channel (channelId is null or different)
        if (oldState?.channelId && oldState.channelId !== channelId) {
            // Remove from voiceParticipants
            const participants = voiceParticipants.get(oldState.channelId) || [];
            const filteredParticipants = participants.filter((p) => p.userId !== userId);
            voiceParticipants.set(oldState.channelId, filteredParticipants);

            console.log(`👋 User ${username} left channel ${oldState.channelId}`);

            this.broadcastToChannel(oldState.channelId, {
                type: 'voice_state',
                data: {
                    type: 'user_left',
                    channelId: oldState.channelId,
                    userId,
                    participants: filteredParticipants,
                },
                timestamp: new Date(),
            });
        }

        // Update voice state
        if (channelId) {
            // User is in a voice channel
            this.voiceStates.set(userId, {
                userId,
                channelId,
                selfMute: muted || false,
                selfDeaf: deafened || false,
                selfVideo: false,
            });
        } else {
            // User left all voice channels
            this.voiceStates.delete(userId);
        }

        // If user joined a voice channel
        if (channelId) {
            // Join the channel so they can receive broadcasts
            this.joinChannel(clientId, channelId);

            const newParticipant: VoiceParticipant = {
                userId,
                username,
                avatarUrl,
                channelId,
                muted: muted || false,
                deafened: deafened || false,
                speaking: false,
                joinedAt: new Date(),
            };

            // Add to voiceParticipants
            const participants = voiceParticipants.get(channelId) || [];
            const existingIndex = participants.findIndex((p) => p.userId === userId);

            if (existingIndex >= 0) {
                participants[existingIndex] = newParticipant;
            } else {
                participants.push(newParticipant);
            }
            voiceParticipants.set(channelId, participants);

            console.log(
                `🔊 Broadcasting voice_state to channel ${channelId}, participants:`,
                participants.map((p) => p.username)
            );

            // ALWAYS send 'user_joined' when user connects to voice channel
            // This ensures that other users will create consumers for this user's producer
            // Even if the user re-joined after a refresh/disconnect
            this.broadcastToChannel(channelId, {
                type: 'voice_state',
                data: {
                    type: 'user_joined',
                    channelId,
                    userId,
                    participants,
                    muted,
                    deafened,
                },
                timestamp: new Date(),
            });
        }
    }

    private handleTyping(clientId: string, data: any) {
        const { channelId, userId } = data;

        // Broadcast typing indicator to other users in channel
        this.broadcastToChannel(
            channelId,
            {
                type: 'typing',
                data: { userId, channelId },
                timestamp: new Date(),
            },
            [clientId]
        ); // Exclude sender
    }

    private handleSpeakingState(clientId: string, data: any) {
        const { channelId, userId, speaking } = data;
        const client = this.clients.get(clientId);
        if (!client) return;

        console.log(`🎤 Speaking state update: userId=${userId}, channelId=${channelId}, speaking=${speaking}`);

        // Update participant speaking state
        const participants = voiceParticipants.get(channelId) || [];
        const participantIndex = participants.findIndex((p) => p.userId === userId);

        if (participantIndex >= 0) {
            participants[participantIndex].speaking = speaking;
            voiceParticipants.set(channelId, participants);

            // Broadcast speaking state update to all users in channel
            this.broadcastToChannel(channelId, {
                type: 'speaking_state',
                data: {
                    channelId,
                    userId,
                    speaking,
                },
                timestamp: new Date(),
            });
        }
    }

    private async handleDisconnect(clientId: string) {
        const client = this.clients.get(clientId);
        if (!client) return;

        const userId = client.user?.id;
        const username = client.user?.username || 'Unknown';

        console.log(`🔌 Client disconnected: ${clientId} (user: ${username})`);

        // Remove from all channels
        client.channels.forEach((channelId) => {
            const channelClients = this.channels.get(channelId);
            if (channelClients) {
                channelClients.delete(clientId);
                if (channelClients.size === 0) {
                    this.channels.delete(channelId);
                }
            }
        });

        // Remove voice state and clean up voice participants
        if (client.user && userId) {
            const voiceState = this.voiceStates.get(userId);

            if (voiceState?.channelId) {
                const channelId = voiceState.channelId;

                // Clean up SFU resources (transports, producers, consumers)
                if (this.sfuService) {
                    try {
                        await this.sfuService.cleanup(channelId, userId);
                        console.log(`🧹 SFU cleanup completed for user ${username} in channel ${channelId}`);
                    } catch (error) {
                        console.error(`❌ SFU cleanup failed for user ${userId}:`, error);
                    }
                }

                // Remove from voiceParticipants
                const participants = voiceParticipants.get(channelId) || [];
                const filteredParticipants = participants.filter((p) => p.userId !== userId);
                voiceParticipants.set(channelId, filteredParticipants);

                console.log(`👋 User ${username} (${userId}) removed from voice channel ${channelId} on disconnect`);
                console.log(
                    `   Remaining participants:`,
                    filteredParticipants.map((p) => p.username)
                );

                // Broadcast user_left to remaining participants
                this.broadcastToChannel(channelId, {
                    type: 'voice_state',
                    data: {
                        type: 'user_left',
                        channelId,
                        userId,
                        username,
                        participants: filteredParticipants,
                    },
                    timestamp: new Date(),
                });
            }

            this.voiceStates.delete(userId);
        }

        this.clients.delete(clientId);
    }

    private joinChannel(clientId: string, channelId: string) {
        const client = this.clients.get(clientId);
        if (!client) return;

        client.channels.add(channelId);

        if (!this.channels.has(channelId)) {
            this.channels.set(channelId, new Set());
        }
        this.channels.get(channelId)!.add(clientId);

        console.log(`📺 Client ${clientId} joined channel ${channelId}`);
    }

    private broadcastToChannelInternal(channelId: string, message: WebSocketMessage, excludeClients: string[] = []) {
        const channelClients = this.channels.get(channelId);
        if (!channelClients) return;

        const messageData = JSON.stringify(message);

        channelClients.forEach((clientId) => {
            if (excludeClients.includes(clientId)) return;

            const client = this.clients.get(clientId);
            if (client && client.ws.readyState === WebSocket.OPEN) {
                client.ws.send(messageData);
            }
        });
    }

    // Public method for broadcasting (used by SFUService)
    public broadcastToChannel(channelId: string, message: WebSocketMessage, excludeClients: string[] = []) {
        const channelClients = this.channels.get(channelId);
        console.log(`📡 [WebSocket] Broadcasting ${message.type} to channel ${channelId}:`, {
            channelExists: !!channelClients,
            clientCount: channelClients?.size || 0,
            clients: channelClients ? Array.from(channelClients) : [],
            excludeClients,
        });
        this.broadcastToChannelInternal(channelId, message, excludeClients);
    }

    private sendToClient(clientId: string, message: WebSocketMessage) {
        const client = this.clients.get(clientId);
        if (client && client.ws.readyState === WebSocket.OPEN) {
            client.ws.send(JSON.stringify(message));
        }
    }

    // Public methods for external use
    public getConnectedUsers(): User[] {
        return Array.from(this.clients.values())
            .map((client) => client.user)
            .filter((user) => user !== undefined) as User[];
    }

    public getVoiceStates(): VoiceState[] {
        return Array.from(this.voiceStates.values());
    }

    public getChannelUsers(channelId: string): User[] {
        const channelClients = this.channels.get(channelId);
        if (!channelClients) return [];

        return Array.from(channelClients)
            .map((clientId) => this.clients.get(clientId)?.user)
            .filter((user) => user !== undefined) as User[];
    }

    // WebRTC Signaling handlers
    private handleRTCOffer(clientId: string, data: any) {
        const { to, from, channelId, offer } = data;
        console.log(`📞 RTC Offer from ${from} to ${to} in channel ${channelId}`);

        // Find target client by userId
        const targetClient = this.findClientByUserId(to);
        if (targetClient) {
            this.sendToClient(targetClient.id, {
                type: 'rtc_offer',
                data: { from, to, channelId, offer },
                timestamp: new Date(),
            });
        } else {
            console.warn(`Target user ${to} not found for RTC offer`);
        }
    }

    private handleRTCAnswer(clientId: string, data: any) {
        const { to, from, channelId, answer } = data;
        console.log(`📞 RTC Answer from ${from} to ${to} in channel ${channelId}`);

        // Find target client by userId
        const targetClient = this.findClientByUserId(to);
        if (targetClient) {
            this.sendToClient(targetClient.id, {
                type: 'rtc_answer',
                data: { from, to, channelId, answer },
                timestamp: new Date(),
            });
        } else {
            console.warn(`Target user ${to} not found for RTC answer`);
        }
    }

    private handleRTCIceCandidate(clientId: string, data: any) {
        const { to, from, channelId, candidate } = data;
        console.log(`🧊 ICE Candidate from ${from} to ${to} in channel ${channelId}`);

        // Find target client by userId
        const targetClient = this.findClientByUserId(to);
        if (targetClient) {
            this.sendToClient(targetClient.id, {
                type: 'rtc_ice_candidate',
                data: { from, to, channelId, candidate },
                timestamp: new Date(),
            });
        } else {
            console.warn(`Target user ${to} not found for ICE candidate`);
        }
    }

    private findClientByUserId(userId: string): ConnectedClient | undefined {
        for (const client of this.clients.values()) {
            if (client.user?.id === userId) {
                return client;
            }
        }
        return undefined;
    }
}

export function setupWebSocket(wss: WebSocketServer): WebSocketManager {
    return new WebSocketManager(wss);
}
