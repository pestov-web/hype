/**
 * Default server data for guests and new users
 * This server will be available to everyone by default
 */

import { loadMessages, setupAutoSave } from './storage.js';

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
    createdAt: Date;
}

// Default server
export const defaultServer: Server = {
    id: 'default-server',
    name: 'Hype Community',
    iconUrl: undefined,
    ownerId: 'system',
    createdAt: new Date('2025-01-01'),
};

// Default channels
export const defaultChannels: Channel[] = [
    {
        id: 'text-general',
        name: 'general',
        serverId: 'default-server',
        type: 'TEXT',
        createdById: 'system',
        createdAt: new Date('2025-01-01'),
    },
    {
        id: 'text-random',
        name: 'random',
        serverId: 'default-server',
        type: 'TEXT',
        createdById: 'system',
        createdAt: new Date('2025-01-01'),
    },
    {
        id: 'voice-general',
        name: 'General Voice',
        serverId: 'default-server',
        type: 'VOICE',
        createdById: 'system',
        createdAt: new Date('2025-01-01'),
    },
    {
        id: 'voice-gaming',
        name: 'Gaming',
        serverId: 'default-server',
        type: 'VOICE',
        createdById: 'system',
        createdAt: new Date('2025-01-01'),
    },
];

// In-memory storage for messages (will be loaded from file)
export let messagesStore = new Map<string, Message[]>();

// Initialize messages from persistent storage
export async function initializeMessagesStore() {
    messagesStore = await loadMessages();

    // Initialize default channels if not present
    defaultChannels.forEach((channel) => {
        if (channel.type === 'TEXT' && !messagesStore.has(channel.id)) {
            messagesStore.set(channel.id, []);
        }
    });

    // Setup auto-save
    setupAutoSave(messagesStore);

    console.log('💬 Messages store initialized');
}

// In-memory storage for voice channel participants
export interface VoiceParticipant {
    userId: string;
    username: string;
    avatarUrl?: string;
    channelId: string;
    muted: boolean;
    deafened: boolean;
    speaking: boolean;
    joinedAt: Date;
}

export const voiceParticipants = new Map<string, VoiceParticipant[]>();

// Initialize voice channels
defaultChannels.forEach((channel) => {
    if (channel.type === 'VOICE') {
        voiceParticipants.set(channel.id, []);
    }
});
