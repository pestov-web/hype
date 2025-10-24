# Voice Modes Documentation

## Overview

Hype supports three voice activation modes for different use cases:

1. **Always On** - Traditional voice chat (microphone always active)
2. **Voice Activity Detection (VAD)** - ML-based automatic speech detection
3. **Push-to-Talk (PTT)** - Manual key-press activation

## Voice Modes

### 1. Always On

**Description**: Your microphone is always active during voice calls.

**Best for**:

-   Quiet environments
-   Small group calls
-   When you want seamless conversation

**Pros**:

-   No latency
-   Natural conversation flow
-   No need to press keys or wait for detection

**Cons**:

-   Background noise is transmitted
-   No privacy control during calls

### 2. Voice Activity Detection (VAD)

**Description**: Uses machine learning (Silero VAD model) to automatically detect when you're speaking.

**Best for**:

-   Noisy environments
-   When you want hands-free operation with noise filtering
-   Large group calls

**Technical Details**:

-   **Library**: `@ricky0123/vad-web` v0.0.28
-   **Model**: Silero VAD (ONNX WebAssembly)
-   **Accuracy**: ~95% (vs ~60% with old RMS-based approach)
-   **Latency**: ~50ms (vs ~200ms with old approach)
-   **Sensitivity**: Automatically managed by ML model

**Pros**:

-   Automatic speech detection
-   Excellent noise filtering
-   No manual intervention needed
-   High accuracy

**Cons**:

-   ~50ms latency (model processing time)
-   ~2s initial model loading time (cached afterwards)
-   Requires modern browser with WASM support

### 3. Push-to-Talk (PTT)

**Description**: Hold a key to activate your microphone. Release to mute.

**Best for**:

-   Very noisy environments
-   Group calls where you speak infrequently
-   When you want complete control over transmission

**Default Key**: `Space` (configurable in Settings)

**Pros**:

-   Complete control over when you speak
-   No accidental transmission
-   Zero latency when activated
-   Works in any environment

**Cons**:

-   Requires holding a key
-   Less natural conversation flow
-   Can't use hands for other tasks while speaking

## Configuration

### Settings Page

Go to **Settings → Voice & Video** to configure voice mode:

1. Select your preferred voice mode (Always On / VAD / PTT)
2. If PTT is selected, click "Current: {key}" button and press a key to set it
3. Settings are saved to localStorage and persist across sessions

### Supported PTT Keys

Any keyboard key can be used for PTT. Common choices:

-   `Space` (default)
-   `KeyV` (V key)
-   `ControlLeft` (Left Ctrl)
-   `AltLeft` (Left Alt)
-   Any other keyboard key code

## Implementation Details

### File Structure

```
frontend/src/
├── shared/lib/
│   ├── utils/deviceSettings.ts      # Voice mode persistence (localStorage)
│   ├── hooks/usePTT.ts               # PTT keyboard hook
│   ├── services/rtcService.ts        # WebRTC + voice mode logic
│   └── vad/vadManager.ts             # VAD library wrapper
├── app/stores/VoiceStore.ts          # Voice state management (MobX)
├── pages/settings/SettingsPage.tsx   # Voice mode configuration UI
└── widgets/voice-panel/VoicePanel.tsx # Voice mode indicators
```

### API Reference

#### deviceSettings.ts

```typescript
// Get/set voice mode
getVoiceMode(): VoiceMode // Returns 'always-on' | 'vad' | 'ptt'
setVoiceMode(mode: VoiceMode): void

// Get/set PTT key
getPTTKey(): string // Returns key code (e.g., 'Space')
setPTTKey(key: string): void
```

#### rtcService.ts

```typescript
// VAD control
async setVADEnabled(enabled: boolean): Promise<void>
getVADSettings(): { enabled: boolean }

// PTT control
setPTTEnabled(enabled: boolean, key?: string): void
activatePTT(): void
deactivatePTT(): void
getPTTState(): { enabled: boolean; active: boolean; key: string }
```

#### VoiceStore.ts

```typescript
// High-level voice mode management
async setVoiceMode(mode: 'always-on' | 'vad' | 'ptt', pttKey?: string): Promise<void>
getPTTState(): { enabled: boolean; active: boolean; key: string }
getVADSettings(): { enabled: boolean }
```

#### usePTT hook

```typescript
import { usePTT } from '@shared/lib';

// Inside component
const { pttKey, pttState } = usePTT(enabled: boolean);

// Returns:
// - pttKey: Current PTT key code
// - pttState: { enabled, active, key }
```

## Usage Examples

### Basic Voice Mode Setup

```typescript
import { VoiceStore } from '@app/stores/VoiceStore';
import { getVoiceMode, getPTTKey } from '@shared/lib/utils/deviceSettings';

// Load saved voice mode
const savedMode = getVoiceMode(); // 'always-on' | 'vad' | 'ptt'
const pttKey = getPTTKey(); // e.g., 'Space'

// Apply voice mode
await voiceStore.setVoiceMode(savedMode, pttKey);
```

### Voice Mode Indicators in UI

```typescript
// VoicePanel.tsx example
{
    voiceMode === 'ptt' && (
        <div className={`pttIndicator ${pttState.active ? 'active' : ''}`}>
            <span>{pttState.active ? '🎤' : '🔇'}</span>
            <span>{pttState.active ? 'Speaking...' : `Hold ${pttState.key} to speak`}</span>
        </div>
    );
}

{
    voiceMode === 'vad' && (
        <div className='vadIndicator'>
            <span>🤖 Voice Activity Detection: ON</span>
        </div>
    );
}
```

### PTT Hook Usage

```typescript
import { usePTT } from '@shared/lib';

function MyVoiceComponent() {
    const [voiceMode, setVoiceMode] = useState<VoiceMode>('ptt');

    // Automatically handles keyboard events when enabled
    const { pttState } = usePTT(voiceMode === 'ptt');

    // pttState.active automatically updates when key is pressed/released
    return <div>{pttState.active ? 'Speaking!' : 'Press Space to speak'}</div>;
}
```

## Testing

### Test Always On Mode

1. Go to Settings → Voice & Video
2. Select "Always On" mode
3. Join a voice channel
4. Speak - your voice should be transmitted immediately
5. Check that microphone is always active (green indicator)

### Test VAD Mode

1. Go to Settings → Voice & Video
2. Select "Voice Activity Detection (VAD)" mode
3. Join a voice channel
4. Wait ~2s for model to load (first time only)
5. Speak - VAD should detect speech and enable microphone
6. Stop speaking - microphone should disable after ~50ms
7. Check console for "🎙️ VAD: Voice ACTIVE/INACTIVE" messages

### Test PTT Mode

1. Go to Settings → Voice & Video
2. Select "Push-to-Talk (PTT)" mode
3. Optionally set a custom PTT key (click button, press key)
4. Join a voice channel
5. Hold PTT key - microphone should activate
6. Release PTT key - microphone should mute
7. Check PTT indicator shows "Speaking..." when active

## Troubleshooting

### VAD Not Working

**Problem**: VAD doesn't detect speech

**Solutions**:

-   Check browser console for VAD errors
-   Ensure browser supports WebAssembly (Chrome 91+, Firefox 89+, Safari 15+)
-   Check microphone permissions
-   Try refreshing page to reload VAD model
-   Check Network tab for ONNX model download (~2MB)

### PTT Key Not Responding

**Problem**: PTT key doesn't activate microphone

**Solutions**:

-   Check that PTT mode is selected in Settings
-   Verify correct key is set (Settings → Voice & Video)
-   Check browser console for PTT events
-   Ensure no other app is capturing the key
-   Try a different key (avoid system keys like Windows key)

### Audio Latency Issues

**Problem**: Noticeable delay in voice transmission

**Solutions**:

-   **Always On**: No latency (instant transmission)
-   **VAD**: ~50ms latency (acceptable for most use cases)
-   **PTT**: Zero latency when activated (instant when key is pressed)

If experiencing more latency:

-   Check network connection quality
-   Close other bandwidth-heavy applications
-   Ensure peer connections are established (check console)

## Browser Compatibility

### Always On

✅ All modern browsers (Chrome, Firefox, Safari, Edge)

### VAD Mode

✅ Chrome 91+ (recommended)
✅ Firefox 89+
✅ Safari 15+
✅ Edge 91+
❌ IE11 (not supported - no WebAssembly)

### PTT Mode

✅ All modern browsers (Chrome, Firefox, Safari, Edge)

## Performance Impact

### CPU Usage

-   **Always On**: ~0% (no processing)
-   **VAD**: ~2-5% (ML model inference)
-   **PTT**: ~0% (keyboard events only)

### Memory Usage

-   **Always On**: ~0MB
-   **VAD**: ~25MB (ONNX model + runtime)
-   **PTT**: ~0MB

### Network Impact

All modes have identical network usage - they only control when audio is transmitted, not how it's encoded.

## Future Improvements

Potential enhancements:

1. **VAD Sensitivity Slider**: Allow user to adjust sensitivity threshold
2. **PTT Click-to-Lock**: Click PTT button to toggle lock (no need to hold key)
3. **Multiple PTT Keys**: Support key combinations (e.g., Ctrl+Space)
4. **PTT Visual Feedback**: Show PTT activation animation
5. **Voice Overlay**: Show speaking indicators on screen during gaming
6. **Voice Activity Graph**: Show real-time voice activity visualization

## Related Documentation

-   [VAD Integration Guide](./VAD_INTEGRATION.md) - Technical details about VAD library
-   [VAD Testing Guide](./VAD_TESTING.md) - VAD testing procedures
-   [WebRTC Architecture](./WEBRTC.md) - WebRTC implementation details
-   [Settings Page](../frontend/src/pages/settings/SettingsPage.tsx) - Voice mode UI
