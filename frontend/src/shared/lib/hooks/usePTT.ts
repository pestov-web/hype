import { useEffect, useCallback, useState } from 'react';
import { rtcService } from '../services/rtcService';
import { getPTTKey } from '../utils/deviceSettings';

/**
 * Hook for handling Push-to-Talk keyboard events
 * Automatically activates/deactivates PTT when the configured key is pressed/released
 */
export function usePTT(enabled: boolean) {
    const pttKey = getPTTKey();
    const [pttActive, setPttActive] = useState(false);

    const handleKeyDown = useCallback(
        (event: KeyboardEvent) => {
            if (!enabled) return;

            // Ignore repeated keydown events (when key is held down)
            if (event.repeat) return;

            // Check if the pressed key matches PTT key
            if (event.code === pttKey) {
                event.preventDefault();
                console.log(`🔘 PTT key pressed: ${pttKey}`);
                rtcService.activatePTT();
                setPttActive(true);
            }
        },
        [enabled, pttKey]
    );

    const handleKeyUp = useCallback(
        (event: KeyboardEvent) => {
            if (!enabled) return;

            // Check if the released key matches PTT key
            if (event.code === pttKey) {
                event.preventDefault();
                console.log(`🔘 PTT key released: ${pttKey}`);
                rtcService.deactivatePTT();
                setPttActive(false);
            }
        },
        [enabled, pttKey]
    );

    useEffect(() => {
        if (!enabled) {
            setPttActive(false);
            return;
        }

        console.log(`🎙️ PTT listeners registered for key: ${pttKey}`);

        // Add event listeners with capture phase for better coverage
        // Note: Browser keyboard events only work when window is focused (security limitation)
        // For background operation, use VAD mode instead
        document.addEventListener('keydown', handleKeyDown, { capture: true });
        document.addEventListener('keyup', handleKeyUp, { capture: true });

        // Cleanup
        return () => {
            document.removeEventListener('keydown', handleKeyDown, { capture: true });
            document.removeEventListener('keyup', handleKeyUp, { capture: true });
            rtcService.deactivatePTT();
            setPttActive(false);
        };
    }, [enabled, pttKey, handleKeyDown, handleKeyUp]);

    return {
        pttKey,
        pttActive,
    };
}
