export interface User {
    id: string;
    username: string;
    displayName: string | null;
    email: string | null;
    avatarUrl: string | null;
    bio: string | null;
    isGuest: boolean; // Флаг гостевого пользователя
    status: 'ONLINE' | 'IDLE' | 'DND' | 'OFFLINE';
    customStatus: string | null;
    isOnline: boolean;
    createdAt: Date;
    updatedAt: Date;
}

export interface UserPresence {
    userId: string;
    status: User['status'];
    lastSeen: Date;
    currentActivity?: {
        type: 'playing' | 'streaming' | 'listening' | 'watching';
        name: string;
        details?: string;
    };
}

export interface UserSettings {
    userId: string;
    theme: 'light' | 'dark';
    notifications: {
        desktop: boolean;
        sounds: boolean;
        mentions: boolean;
    };
    voice: {
        inputDevice?: string;
        outputDevice?: string;
        inputVolume: number;
        outputVolume: number;
        echoCancellation: boolean;
        noiseSuppression: boolean;
    };
}

/**
 * User profile update payload
 */
export interface UpdateUserProfilePayload {
    displayName?: string;
    bio?: string;
    avatarUrl?: string;
}

/**
 * User status update payload
 */
export interface UpdateUserStatusPayload {
    status: 'ONLINE' | 'IDLE' | 'DND' | 'OFFLINE';
}
