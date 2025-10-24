/**
 * Voice Activity Detection Manager using @ricky0123/vad-web
 * Professional VAD solution with machine learning models
 */

import * as vad from '@ricky0123/vad-web';

type VADCallback = (isSpeaking: boolean) => void;

export class VADManager {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    private vad: any | null = null;
    private enabled = false;
    private callbacks: Set<VADCallback> = new Set();

    /**
     * Initialize VAD (will request microphone access internally)
     */
    async initialize(): Promise<void> {
        if (this.vad) {
            await this.destroy();
        }

        try {
            console.log('🎙️ VAD: Initializing with ML models...');

            this.vad = await vad.MicVAD.new({
                // Callbacks for speech events
                onSpeechStart: () => {
                    console.log('🎙️ VAD: Speech started');
                    this.notifyCallbacks(true);
                },

                onSpeechEnd: () => {
                    console.log('🎙️ VAD: Speech ended');
                    this.notifyCallbacks(false);
                },

                // Model configuration
                positiveSpeechThreshold: 0.8, // Higher = less sensitive (0-1)
                negativeSpeechThreshold: 0.65, // Hysteresis (0.8 - 0.15)

                // Frame settings (in milliseconds)
                redemptionMs: 300, // Wait 300ms before declaring end of speech
                preSpeechPadMs: 100, // Include 100ms before speech starts
                minSpeechMs: 250, // Minimum 250ms for valid speech

                // Audio processing
                submitUserSpeechOnPause: false, // We only need events, not audio data
            });

            console.log('✅ VAD: Initialized successfully');
        } catch (error) {
            console.error('❌ VAD: Initialization failed:', error);
            throw error;
        }
    }

    /**
     * Start VAD processing
     */
    async start(): Promise<void> {
        if (!this.vad) {
            throw new Error('VAD not initialized. Call initialize() first.');
        }

        if (this.enabled) {
            console.warn('⚠️ VAD: Already started');
            return;
        }

        try {
            await this.vad.start();
            this.enabled = true;
            console.log('✅ VAD: Started');
        } catch (error) {
            console.error('❌ VAD: Failed to start:', error);
            throw error;
        }
    }

    /**
     * Stop VAD processing
     */
    async stop(): Promise<void> {
        if (!this.vad || !this.enabled) {
            return;
        }

        try {
            await this.vad.pause();
            this.enabled = false;
            console.log('🛑 VAD: Stopped');
        } catch (error) {
            console.error('❌ VAD: Failed to stop:', error);
        }
    }

    /**
     * Destroy VAD instance and cleanup resources
     */
    async destroy(): Promise<void> {
        if (this.vad) {
            try {
                await this.vad.destroy();
                this.vad = null;
                this.enabled = false;
                console.log('🗑️ VAD: Destroyed');
            } catch (error) {
                console.error('❌ VAD: Failed to destroy:', error);
            }
        }
    }

    /**
     * Check if VAD is currently active
     */
    isActive(): boolean {
        return this.enabled && this.vad !== null;
    }

    /**
     * Subscribe to VAD events
     */
    onStateChange(callback: VADCallback): () => void {
        this.callbacks.add(callback);
        return () => this.callbacks.delete(callback);
    }

    /**
     * Notify all subscribers about speech state change
     */
    private notifyCallbacks(isSpeaking: boolean): void {
        this.callbacks.forEach((callback) => callback(isSpeaking));
    }
}

// Singleton instance
export const vadManager = new VADManager();
