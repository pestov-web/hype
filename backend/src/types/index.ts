// Shared types between frontend and backend
export interface User {
    id: string;
    username: string;
    email: string;
    avatar?: string;
    discriminator: string;
    status: 'online' | 'idle' | 'dnd' | 'offline';
    createdAt: Date;
    updatedAt: Date;
}

export interface Channel {
    id: string;
    name: string;
    type: 'text' | 'voice';
    serverId: string;
    position: number;
    topic?: string;
    nsfw: boolean;
    createdAt: Date;
    updatedAt: Date;
}

export interface VoiceChannel extends Channel {
    type: 'voice';
    userLimit?: number;
    bitrate: number;
    connectedUsers: string[];
}

export interface Message {
    id: string;
    content: string;
    authorId: string;
    channelId: string;
    type: 'default' | 'system';
    edited: boolean;
    editedAt?: Date;
    createdAt: Date;
}

export interface VoiceState {
    userId: string;
    channelId?: string;
    muted?: boolean;
    deafened?: boolean;
    speaking?: boolean;
    selfMute?: boolean;
    selfDeaf?: boolean;
    selfVideo?: boolean;
}

export interface WebSocketMessage {
    type:
        | 'new_message' // New message created
        | 'message_edited'
        | 'message_deleted'
        | 'user_joined'
        | 'user_left'
        | 'join_channel' // Join text channel for real-time updates
        | 'leave_channel' // Leave text channel
        | 'typing'
        | 'voice_state'
        | 'speaking_state'
        | 'rtc_offer'
        | 'rtc_answer'
        | 'rtc_ice_candidate'
        | 'new_producer' // SFU: New producer created
        | 'producer_closed'; // SFU: Producer closed
    data: any;
    timestamp: Date;
}

// WebRTC Signaling types
export interface RTCSignalingData {
    from: string; // userId
    to: string; // userId
    channelId: string;
}

export interface RTCOfferData extends RTCSignalingData {
    offer: RTCSessionDescriptionInit;
}

export interface RTCAnswerData extends RTCSignalingData {
    answer: RTCSessionDescriptionInit;
}

export interface RTCIceCandidateData extends RTCSignalingData {
    candidate: RTCIceCandidateInit;
}
