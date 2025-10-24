export interface Channel {
    id: string;
    name: string;
    type: 'text' | 'voice' | 'category';
    serverId: string;
    categoryId?: string; // Parent category for organization
    position: number; // Order in the channel list
    topic?: string; // Channel description
    nsfw: boolean;
    permissions: ChannelPermission[];
    createdAt: Date;
    updatedAt: Date;
}

export interface VoiceChannel extends Channel {
    type: 'voice';
    userLimit?: number; // Max users in voice channel (0 = unlimited)
    bitrate: number; // Voice quality in kbps
    connectedUsers: string[]; // User IDs currently in voice channel
}

export interface TextChannel extends Channel {
    type: 'text';
    lastMessageId?: string;
    slowMode?: number; // Seconds between messages
}

export interface ChannelPermission {
    type: 'user' | 'role';
    id: string; // User ID or Role ID
    allow: string[]; // Array of permission names
    deny: string[]; // Array of permission names
}

export interface ChannelCategory {
    id: string;
    name: string;
    serverId: string;
    position: number;
    permissions: ChannelPermission[];
    collapsed: boolean; // UI state for category
}
