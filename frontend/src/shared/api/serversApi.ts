import { apiClient } from './http.js';

// Server types
export interface Server {
    id: string;
    name: string;
    iconUrl?: string;
    ownerId: string;
    createdAt: Date;
}

export interface Channel {
    id: string;
    name: string;
    serverId: string;
    type: 'TEXT' | 'VOICE';
    createdById: string;
    createdAt: Date;
}

export interface Message {
    id: string;
    content: string;
    channelId: string;
    userId: string;
    username: string;
    avatarUrl?: string;
    createdAt: Date | string; // Can be Date or ISO string from API/WebSocket
}

/**
 * Fetch all servers
 */
export async function fetchServers(): Promise<Server[]> {
    const response = await apiClient.get<Server[]>('/servers');
    if (!response.success || !response.data) {
        throw new Error(response.error || 'Failed to fetch servers');
    }
    // Parse dates
    return (response.data as Server[]).map((server) => ({
        ...server,
        createdAt: new Date(server.createdAt),
    }));
}

/**
 * Fetch channels for a specific server
 */
export async function fetchServerChannels(serverId: string): Promise<Channel[]> {
    const response = await apiClient.get<Channel[]>(`/servers/${serverId}/channels`);
    if (!response.success || !response.data) {
        throw new Error(response.error || 'Failed to fetch channels');
    }
    // Parse dates
    return (response.data as Channel[]).map((channel) => ({
        ...channel,
        createdAt: new Date(channel.createdAt),
    }));
}

/**
 * Fetch messages for a specific channel
 */
export async function fetchChannelMessages(channelId: string, limit = 50): Promise<Message[]> {
    const response = await apiClient.get<Message[]>(`/messages?channelId=${channelId}&limit=${limit}`);
    if (!response.success || !response.data) {
        throw new Error(response.error || 'Failed to fetch messages');
    }
    // Parse dates
    return (response.data as Message[]).map((message) => ({
        ...message,
        createdAt: new Date(message.createdAt),
    }));
}

/**
 * Send a message to a channel
 */
export async function sendMessage(
    channelId: string,
    content: string,
    userId: string,
    username: string,
    avatarUrl?: string
): Promise<Message> {
    const response = await apiClient.post<Message>('/messages', {
        channelId,
        content,
        userId,
        username,
        avatarUrl,
    });
    if (!response.success || !response.data) {
        throw new Error(response.error || 'Failed to send message');
    }
    // Parse date
    return {
        ...(response.data as Message),
        createdAt: new Date((response.data as Message).createdAt),
    };
}
