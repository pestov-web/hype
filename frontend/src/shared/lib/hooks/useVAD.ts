import { useMicVAD } from '@ricky0123/vad-react';
import { useEffect, useRef, useState } from 'react';

interface UseVADOptions {
    enabled: boolean;
    onSpeechStart?: () => void;
    onSpeechEnd?: () => void;
    sensitivity?: 'low' | 'medium' | 'high';
}

interface SensitivityConfig {
    positiveSpeechThreshold: number;
    negativeSpeechThreshold: number;
    redemptionMs: number;
    minSpeechMs: number;
    preSpeechPadMs: number;
}

const RELEASE_PADDING_MS = 200;
const FAILSAFE_EXTRA_MS = 1500;

const SENSITIVITY_PRESETS: Record<'low' | 'medium' | 'high', SensitivityConfig> = {
    low: {
        positiveSpeechThreshold: 0.6,
        negativeSpeechThreshold: 0.45,
        redemptionMs: 1200,
        minSpeechMs: 100,
        preSpeechPadMs: 100,
    },
    medium: {
        positiveSpeechThreshold: 0.7,
        negativeSpeechThreshold: 0.55,
        redemptionMs: 1000,
        minSpeechMs: 150,
        preSpeechPadMs: 100,
    },
    high: {
        positiveSpeechThreshold: 0.85,
        negativeSpeechThreshold: 0.7,
        redemptionMs: 800,
        minSpeechMs: 200,
        preSpeechPadMs: 100,
    },
};

export function useVAD({ enabled, onSpeechStart, onSpeechEnd, sensitivity = 'medium' }: UseVADOptions) {
    console.log('🎤 useVAD called:', { enabled, sensitivity });

    const hasStartedRef = useRef(false);
    const onSpeechStartRef = useRef(onSpeechStart);
    const onSpeechEndRef = useRef(onSpeechEnd);
    const lastReportedSpeakingRef = useRef(false);
    const prevSensitivityRef = useRef(sensitivity);

    const [debouncedUserSpeaking, setDebouncedUserSpeaking] = useState(false);
    const debounceTimerRef = useRef<number | null>(null);
    const failSafeTimerRef = useRef<number | null>(null);

    useEffect(() => {
        onSpeechStartRef.current = onSpeechStart;
    }, [onSpeechStart]);

    useEffect(() => {
        onSpeechEndRef.current = onSpeechEnd;
    }, [onSpeechEnd]);

    const config = SENSITIVITY_PRESETS[sensitivity];
    const releaseDelayMs = config.redemptionMs + RELEASE_PADDING_MS;

    // Определяем базовый путь в зависимости от окружения
    const isElectron = import.meta.env.VITE_IS_ELECTRON === 'true';

    // В Electron используем абсолютный file:// путь
    let baseAssetPath: string;
    let onnxWASMBasePath: string;

    if (isElectron) {
        // Получаем путь к текущему HTML файлу
        const currentPath = window.location.href; // file:///C:/path/to/dist/index.html#/channels/...
        // Убираем hash и filename, оставляем только путь к dist/
        const distPath = currentPath.split('/index.html')[0] + '/'; // file:///C:/path/to/dist/

        baseAssetPath = distPath;
        onnxWASMBasePath = `${distPath}onnxruntime-web/`;
    } else {
        baseAssetPath = `${window.location.origin}/`;
        onnxWASMBasePath = `${window.location.origin}/node_modules/onnxruntime-web/dist/`;
    }

    console.log('🎤 VAD paths:', { isElectron, baseAssetPath, onnxWASMBasePath });
    const vad = useMicVAD({
        model: 'v5',
        baseAssetPath,
        onnxWASMBasePath,
        startOnLoad: false, // НЕ запускаем автоматически, контролируем через enabled
        positiveSpeechThreshold: config.positiveSpeechThreshold,
        negativeSpeechThreshold: config.negativeSpeechThreshold,
        redemptionMs: config.redemptionMs,
        minSpeechMs: config.minSpeechMs,
        preSpeechPadMs: config.preSpeechPadMs,
        submitUserSpeechOnPause: false,
        ortConfig: (ort) => {
            ort.env.wasm.numThreads = 1;
            ort.env.wasm.simd = true;
            ort.env.wasm.wasmPaths = onnxWASMBasePath;
        },
    });

    useEffect(() => {
        console.log('🎤 VAD useEffect triggered:', {
            enabled,
            loading: vad.loading,
            errored: vad.errored,
            listening: vad.listening,
            hasStarted: hasStartedRef.current,
        });

        // Если нужно включить, модель загружена и ещё не запустили
        if (enabled && !vad.loading && !vad.errored && !hasStartedRef.current) {
            console.log(`✅ VAD: starting with ${sensitivity} sensitivity`);
            console.log('VAD config:', config);
            prevSensitivityRef.current = sensitivity;
            hasStartedRef.current = true;
            vad.start();
            return;
        }

        // Если нужно выключить и мы запускали
        if (!enabled && hasStartedRef.current) {
            console.log('🛑 VAD: pausing');
            hasStartedRef.current = false;
            vad.pause();

            if (debounceTimerRef.current) {
                clearTimeout(debounceTimerRef.current);
                debounceTimerRef.current = null;
            }

            if (failSafeTimerRef.current) {
                clearTimeout(failSafeTimerRef.current);
                failSafeTimerRef.current = null;
            }

            setDebouncedUserSpeaking(false);

            if (lastReportedSpeakingRef.current) {
                lastReportedSpeakingRef.current = false;
                onSpeechEndRef.current?.();
            }
        }

        return () => {
            if (hasStartedRef.current) {
                console.log('🧹 VAD: cleanup on unmount');
                hasStartedRef.current = false;
                vad.pause();
            }

            if (debounceTimerRef.current) {
                clearTimeout(debounceTimerRef.current);
                debounceTimerRef.current = null;
            }

            if (failSafeTimerRef.current) {
                clearTimeout(failSafeTimerRef.current);
                failSafeTimerRef.current = null;
            }

            if (lastReportedSpeakingRef.current) {
                lastReportedSpeakingRef.current = false;
                onSpeechEndRef.current?.();
            }
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [enabled, vad.loading, vad.errored]);

    useEffect(() => {
        if (hasStartedRef.current && prevSensitivityRef.current !== sensitivity) {
            console.warn(
                `⚠️ VAD: sensitivity changed from ${prevSensitivityRef.current} to ${sensitivity}. Restart voice session to apply.`
            );
            prevSensitivityRef.current = sensitivity;
        }
    }, [sensitivity]);

    useEffect(() => {
        if (!hasStartedRef.current) {
            return;
        }

        if (debounceTimerRef.current) {
            clearTimeout(debounceTimerRef.current);
            debounceTimerRef.current = null;
        }

        if (vad.userSpeaking) {
            console.log('🎙️ VAD: live speech detected');
            setDebouncedUserSpeaking(true);

            if (failSafeTimerRef.current) {
                clearTimeout(failSafeTimerRef.current);
            }

            failSafeTimerRef.current = window.setTimeout(() => {
                console.warn('⚠️ VAD: fail-safe speech end triggered');
                setDebouncedUserSpeaking(false);
                failSafeTimerRef.current = null;
            }, releaseDelayMs + FAILSAFE_EXTRA_MS);
            return;
        }

        if (failSafeTimerRef.current) {
            clearTimeout(failSafeTimerRef.current);
            failSafeTimerRef.current = null;
        }

        debounceTimerRef.current = window.setTimeout(() => {
            console.log('🔇 VAD: speech released after delay');
            setDebouncedUserSpeaking(false);
            debounceTimerRef.current = null;
        }, releaseDelayMs);

        return () => {
            if (debounceTimerRef.current) {
                clearTimeout(debounceTimerRef.current);
                debounceTimerRef.current = null;
            }

            if (failSafeTimerRef.current) {
                clearTimeout(failSafeTimerRef.current);
                failSafeTimerRef.current = null;
            }
        };
    }, [vad.userSpeaking, releaseDelayMs]);

    useEffect(() => {
        if (!hasStartedRef.current) {
            return;
        }

        const prev = lastReportedSpeakingRef.current;

        if (debouncedUserSpeaking && !prev) {
            console.log('📢 VAD: firing onSpeechStart');
            lastReportedSpeakingRef.current = true;
            onSpeechStartRef.current?.();
            return;
        }

        if (!debouncedUserSpeaking && prev) {
            console.log('📴 VAD: firing onSpeechEnd');
            lastReportedSpeakingRef.current = false;
            onSpeechEndRef.current?.();
        }
    }, [debouncedUserSpeaking]);

    return {
        userSpeaking: debouncedUserSpeaking,
        loading: vad.loading,
        errored: vad.errored,
    };
}
