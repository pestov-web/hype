/**
 * Helper functions for managing audio/video device settings in localStorage
 */

const STORAGE_KEYS = {
    AUDIO_INPUT: 'hype_audio_input_device',
    AUDIO_OUTPUT: 'hype_audio_output_device',
    VIDEO_INPUT: 'hype_video_input_device',
    VOICE_MODE: 'hype_voice_mode',
    PTT_KEY: 'hype_ptt_key',
    VAD_SENSITIVITY: 'hype_vad_sensitivity',
} as const;

export type VoiceMode = 'vad' | 'ptt';
export type VADSensitivity = 'low' | 'medium' | 'high';

export interface DeviceSettings {
    audioInputId: string | null;
    audioOutputId: string | null;
    videoInputId: string | null;
    voiceMode: VoiceMode;
    pttKey: string;
}

/**
 * Get saved audio input device ID
 */
export function getAudioInputDevice(): string | null {
    try {
        return localStorage.getItem(STORAGE_KEYS.AUDIO_INPUT);
    } catch (error) {
        console.error('Failed to get audio input device from localStorage:', error);
        return null;
    }
}

/**
 * Save audio input device ID
 */
export function setAudioInputDevice(deviceId: string): void {
    try {
        localStorage.setItem(STORAGE_KEYS.AUDIO_INPUT, deviceId);
    } catch (error) {
        console.error('Failed to save audio input device to localStorage:', error);
    }
}

/**
 * Get saved audio output device ID
 */
export function getAudioOutputDevice(): string | null {
    try {
        return localStorage.getItem(STORAGE_KEYS.AUDIO_OUTPUT);
    } catch (error) {
        console.error('Failed to get audio output device from localStorage:', error);
        return null;
    }
}

/**
 * Save audio output device ID
 */
export function setAudioOutputDevice(deviceId: string): void {
    try {
        localStorage.setItem(STORAGE_KEYS.AUDIO_OUTPUT, deviceId);
    } catch (error) {
        console.error('Failed to save audio output device to localStorage:', error);
    }
}

/**
 * Get saved video input device ID
 */
export function getVideoInputDevice(): string | null {
    try {
        return localStorage.getItem(STORAGE_KEYS.VIDEO_INPUT);
    } catch (error) {
        console.error('Failed to get video input device from localStorage:', error);
        return null;
    }
}

/**
 * Save video input device ID
 */
export function setVideoInputDevice(deviceId: string): void {
    try {
        localStorage.setItem(STORAGE_KEYS.VIDEO_INPUT, deviceId);
    } catch (error) {
        console.error('Failed to save video input device to localStorage:', error);
    }
}

/**
 * Get saved voice mode (VAD or PTT)
 */
export function getVoiceMode(): VoiceMode {
    try {
        const mode = localStorage.getItem(STORAGE_KEYS.VOICE_MODE);
        if (mode === 'vad' || mode === 'ptt') {
            return mode;
        }
        return 'vad'; // Default to VAD (Voice Activity Detection)
    } catch (error) {
        console.error('Failed to get voice mode from localStorage:', error);
        return 'vad';
    }
}

/**
 * Save voice mode
 */
export function setVoiceMode(mode: VoiceMode): void {
    try {
        localStorage.setItem(STORAGE_KEYS.VOICE_MODE, mode);
    } catch (error) {
        console.error('Failed to save voice mode to localStorage:', error);
    }
}

/**
 * Get saved PTT key
 */
export function getPTTKey(): string {
    try {
        return localStorage.getItem(STORAGE_KEYS.PTT_KEY) || 'Space'; // Default to Space
    } catch (error) {
        console.error('Failed to get PTT key from localStorage:', error);
        return 'Space';
    }
}

/**
 * Save PTT key
 */
export function setPTTKey(key: string): void {
    try {
        localStorage.setItem(STORAGE_KEYS.PTT_KEY, key);
    } catch (error) {
        console.error('Failed to save PTT key to localStorage:', error);
    }
}

/**
 * Get all saved device settings
 */
export function getAllDeviceSettings(): DeviceSettings {
    return {
        audioInputId: getAudioInputDevice(),
        audioOutputId: getAudioOutputDevice(),
        videoInputId: getVideoInputDevice(),
        voiceMode: getVoiceMode(),
        pttKey: getPTTKey(),
    };
}

/**
 * Get saved VAD sensitivity
 */
export function getVADSensitivity(): VADSensitivity {
    try {
        const sensitivity = localStorage.getItem(STORAGE_KEYS.VAD_SENSITIVITY);
        if (sensitivity === 'low' || sensitivity === 'medium' || sensitivity === 'high') {
            return sensitivity;
        }
        return 'high'; // Default to high (less noise sensitivity)
    } catch (error) {
        console.error('Failed to get VAD sensitivity from localStorage:', error);
        return 'high';
    }
}

/**
 * Save VAD sensitivity
 */
export function setVADSensitivity(sensitivity: VADSensitivity): void {
    try {
        localStorage.setItem(STORAGE_KEYS.VAD_SENSITIVITY, sensitivity);
    } catch (error) {
        console.error('Failed to save VAD sensitivity to localStorage:', error);
    }
}

/**
 * Clear all device settings
 */
export function clearDeviceSettings(): void {
    try {
        localStorage.removeItem(STORAGE_KEYS.AUDIO_INPUT);
        localStorage.removeItem(STORAGE_KEYS.AUDIO_OUTPUT);
        localStorage.removeItem(STORAGE_KEYS.VIDEO_INPUT);
        localStorage.removeItem(STORAGE_KEYS.VOICE_MODE);
        localStorage.removeItem(STORAGE_KEYS.PTT_KEY);
        localStorage.removeItem(STORAGE_KEYS.VAD_SENSITIVITY);
    } catch (error) {
        console.error('Failed to clear device settings from localStorage:', error);
    }
}
