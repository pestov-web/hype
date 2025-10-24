export interface Message {
    id: string;
    content: string;
    authorId: string;
    channelId: string;
    type: 'default' | 'system' | 'call' | 'join' | 'leave';
    attachments: MessageAttachment[];
    embeds: MessageEmbed[];
    mentions: MessageMention[];
    reactions: MessageReaction[];
    edited: boolean;
    editedAt?: Date;
    createdAt: Date;
    replyTo?: {
        messageId: string;
        authorId: string;
        content: string; // Partial content for preview
    };
}

export interface MessageAttachment {
    id: string;
    filename: string;
    url: string;
    size: number;
    contentType: string;
    width?: number;
    height?: number;
}

export interface MessageEmbed {
    type: 'rich' | 'image' | 'video' | 'link';
    title?: string;
    description?: string;
    url?: string;
    color?: string;
    timestamp?: Date;
    thumbnail?: {
        url: string;
        width?: number;
        height?: number;
    };
    image?: {
        url: string;
        width?: number;
        height?: number;
    };
    author?: {
        name: string;
        url?: string;
        iconUrl?: string;
    };
    fields?: Array<{
        name: string;
        value: string;
        inline?: boolean;
    }>;
}

export interface MessageMention {
    type: 'user' | 'role' | 'channel' | 'everyone';
    id: string;
    name: string;
}

export interface MessageReaction {
    emoji: {
        id?: string; // Custom emoji ID
        name: string; // Unicode or custom emoji name
        url?: string; // Custom emoji URL
    };
    count: number;
    userIds: string[]; // Users who reacted
    me: boolean; // Whether current user reacted
}

/**
 * Message from backend API (simplified structure)
 */
export interface ApiMessage {
    id: string;
    content: string;
    edited: boolean;
    authorId: string;
    channelId: string;
    author: {
        id: string;
        username: string;
        displayName: string | null;
        avatarUrl: string | null;
        status: 'ONLINE' | 'IDLE' | 'DND' | 'OFFLINE';
    };
    reactions: Array<{
        id: string;
        emoji: string;
        user: {
            id: string;
            username: string;
        };
    }>;
    attachments: Array<{
        id: string;
        filename: string;
        url: string;
        size: number;
        mimeType: string;
    }>;
    createdAt: string | Date;
    updatedAt: string | Date;
}

/**
 * Get messages response with pagination
 */
export interface GetMessagesResponse {
    data: ApiMessage[];
    meta: {
        total: number;
        limit: number;
        offset: number;
    };
}

/**
 * Create message payload
 */
export interface CreateMessagePayload {
    content: string;
    channelId: string;
}

/**
 * Update message payload
 */
export interface UpdateMessagePayload {
    content: string;
}

/**
 * Real-time message event from WebSocket
 */
export interface MessageEvent {
    type: 'message' | 'message_edited' | 'message_deleted';
    message?: ApiMessage;
    messageId?: string;
    channelId: string;
}
