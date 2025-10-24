/**
 * Push-to-Talk (PTT) Manager
 * Handles microphone activation via keyboard or mouse buttons
 */

export type PTTKey = {
    type: 'keyboard' | 'mouse';
    code: string; // KeyboardEvent.code or 'Mouse3', 'Mouse4', etc.
};

type PTTCallback = (isActive: boolean) => void;

export class PTTManager {
    private isActive = false;
    private pttKey: PTTKey = { type: 'keyboard', code: 'Space' }; // Default: Space key
    private enabled = false;
    private callbacks: Set<PTTCallback> = new Set();

    constructor() {
        this.setupEventListeners();
    }

    private setupEventListeners() {
        // Keyboard events
        window.addEventListener('keydown', this.handleKeyDown);
        window.addEventListener('keyup', this.handleKeyUp);

        // Mouse events
        window.addEventListener('mousedown', this.handleMouseDown);
        window.addEventListener('mouseup', this.handleMouseUp);

        // Prevent losing focus
        window.addEventListener('blur', this.handleBlur);
    }

    private handleKeyDown = (event: KeyboardEvent) => {
        if (!this.enabled || this.pttKey.type !== 'keyboard') return;

        if (event.code === this.pttKey.code && !this.isActive) {
            event.preventDefault();
            this.activate();
        }
    };

    private handleKeyUp = (event: KeyboardEvent) => {
        if (!this.enabled || this.pttKey.type !== 'keyboard') return;

        if (event.code === this.pttKey.code && this.isActive) {
            event.preventDefault();
            this.deactivate();
        }
    };

    private handleMouseDown = (event: MouseEvent) => {
        if (!this.enabled || this.pttKey.type !== 'mouse') return;

        const mouseCode = `Mouse${event.button}`;
        if (mouseCode === this.pttKey.code && !this.isActive) {
            event.preventDefault();
            this.activate();
        }
    };

    private handleMouseUp = (event: MouseEvent) => {
        if (!this.enabled || this.pttKey.type !== 'mouse') return;

        const mouseCode = `Mouse${event.button}`;
        if (mouseCode === this.pttKey.code && this.isActive) {
            event.preventDefault();
            this.deactivate();
        }
    };

    private handleBlur = () => {
        // Deactivate PTT when window loses focus
        if (this.isActive) {
            this.deactivate();
        }
    };

    private activate() {
        this.isActive = true;
        console.log('🎙️ PTT: Activated');
        this.notifyCallbacks(true);
    }

    private deactivate() {
        this.isActive = false;
        console.log('🎙️ PTT: Deactivated');
        this.notifyCallbacks(false);
    }

    private notifyCallbacks(isActive: boolean) {
        this.callbacks.forEach((callback) => callback(isActive));
    }

    // Public API
    setEnabled(enabled: boolean) {
        this.enabled = enabled;
        if (!enabled && this.isActive) {
            this.deactivate();
        }
        console.log(`🎙️ PTT: ${enabled ? 'Enabled' : 'Disabled'}`);
    }

    setPTTKey(key: PTTKey) {
        this.pttKey = key;
        console.log('🎙️ PTT: Key set to', key);
    }

    getPTTKey(): PTTKey {
        return { ...this.pttKey };
    }

    getIsActive(): boolean {
        return this.isActive;
    }

    getIsEnabled(): boolean {
        return this.enabled;
    }

    // Subscribe to PTT state changes
    onStateChange(callback: PTTCallback) {
        this.callbacks.add(callback);
        return () => this.callbacks.delete(callback);
    }

    // Cleanup
    destroy() {
        window.removeEventListener('keydown', this.handleKeyDown);
        window.removeEventListener('keyup', this.handleKeyUp);
        window.removeEventListener('mousedown', this.handleMouseDown);
        window.removeEventListener('mouseup', this.handleMouseUp);
        window.removeEventListener('blur', this.handleBlur);
        this.callbacks.clear();
    }
}

// Singleton instance
export const pttManager = new PTTManager();

// Helper to format PTT key for display
export function formatPTTKey(key: PTTKey): string {
    if (key.type === 'keyboard') {
        // Convert KeyboardEvent.code to readable format
        const codeMap: Record<string, string> = {
            Space: 'Space',
            KeyV: 'V',
            Backquote: '`',
            ShiftLeft: 'Left Shift',
            ShiftRight: 'Right Shift',
            ControlLeft: 'Left Ctrl',
            ControlRight: 'Right Ctrl',
            AltLeft: 'Left Alt',
            AltRight: 'Right Alt',
        };
        return codeMap[key.code] || key.code.replace('Key', '');
    } else {
        // Mouse buttons
        const mouseMap: Record<string, string> = {
            Mouse0: 'Left Click',
            Mouse1: 'Middle Click',
            Mouse2: 'Right Click',
            Mouse3: 'Mouse 4 (Back)',
            Mouse4: 'Mouse 5 (Forward)',
        };
        return mouseMap[key.code] || key.code;
    }
}
