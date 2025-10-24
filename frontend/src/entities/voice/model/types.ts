export interface VoiceCall {
    id: string;
    channelId: string;
    participants: VoiceParticipant[];
    startedAt: Date;
    endedAt?: Date;
    status: 'active' | 'ended';
}

export interface VoiceParticipant {
    userId: string;
    username: string; // Display name
    avatarUrl?: string; // Optional avatar
    channelId?: string; // Voice channel ID they're in
    joinedAt: Date;
    leftAt?: Date;
    muted: boolean;
    deafened: boolean;
    speaking: boolean;
    volume: number; // 0-100
    peerConnection?: RTCPeerConnection;
    mediaStream?: MediaStream;
}

export interface VoiceState {
    channelId?: string;
    muted: boolean;
    deafened: boolean;
    selfMuted: boolean;
    selfDeafened: boolean;
    streaming: boolean;
    speaking: boolean;
}

export interface WebRTCConfig {
    iceServers: RTCIceServer[];
    audioConstraints: MediaTrackConstraints;
    videoConstraints: MediaTrackConstraints;
}
