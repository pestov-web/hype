import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, LanguageSwitcher, DesktopSettings } from '../../shared/ui';
import { useVoiceStore } from '../../shared/lib/hooks/useStores';
import { useTranslation } from '../../shared/lib';
import {
    getAudioInputDevice,
    setAudioInputDevice,
    getVideoInputDevice,
    setVideoInputDevice,
    getVoiceMode,
    setVoiceMode,
    getPTTKey,
    setPTTKey,
    getVADSensitivity,
    setVADSensitivity,
    type VoiceMode,
    type VADSensitivity,
} from '../../shared/lib/utils/deviceSettings';
import styles from './SettingsPage.module.scss';

type SettingsTab = 'profile' | 'voice' | 'notifications' | 'appearance' | 'desktop';

export function SettingsPage() {
    const navigate = useNavigate();
    const voiceStore = useVoiceStore();
    const { t } = useTranslation();
    const [activeTab, setActiveTab] = useState<SettingsTab>('profile');

    // Audio settings
    const [audioDevices, setAudioDevices] = useState<MediaDeviceInfo[]>([]);
    const [selectedMicrophone, setSelectedMicrophone] = useState<string>('');
    const [microphoneVolume, setMicrophoneVolume] = useState<number>(0);
    const [isTesting, setIsTesting] = useState<boolean>(false);
    const testStreamRef = useRef<MediaStream | null>(null);
    const testIntervalRef = useRef<number | null>(null);

    // Voice mode settings
    const [voiceMode, setVoiceModeState] = useState<VoiceMode>('vad');
    const [pttKey, setPttKeyState] = useState<string>('Space');
    const [isRecordingPTT, setIsRecordingPTT] = useState<boolean>(false);

    // VAD sensitivity settings
    const [vadSensitivity, setVadSensitivityState] = useState<VADSensitivity>('high');

    // Video settings
    const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([]);
    const [selectedCamera, setSelectedCamera] = useState<string>('');
    const [isTestingCamera, setIsTestingCamera] = useState<boolean>(false);
    const videoTestRef = useRef<HTMLVideoElement | null>(null);
    const cameraStreamRef = useRef<MediaStream | null>(null);

    // Screen sharing
    const [isTestingScreenShare, setIsTestingScreenShare] = useState<boolean>(false);
    const screenTestRef = useRef<HTMLVideoElement | null>(null);
    const screenStreamRef = useRef<MediaStream | null>(null);

    const loadAudioDevices = useCallback(async () => {
        try {
            // Request permission first
            await navigator.mediaDevices.getUserMedia({ audio: true });
            const devices = await navigator.mediaDevices.enumerateDevices();
            const audioInputs = devices.filter((device) => device.kind === 'audioinput');
            setAudioDevices(audioInputs);

            // Try to load saved device, or use default
            const savedDeviceId = getAudioInputDevice();
            if (savedDeviceId && audioInputs.some((d) => d.deviceId === savedDeviceId)) {
                setSelectedMicrophone(savedDeviceId);
            } else if (audioInputs.length > 0) {
                setSelectedMicrophone(audioInputs[0].deviceId);
                setAudioInputDevice(audioInputs[0].deviceId);
            }
        } catch (error) {
            console.error('Failed to load audio devices:', error);
        }
    }, []);

    // Load audio devices on mount
    useEffect(() => {
        loadAudioDevices();

        // Load voice mode settings
        const savedVoiceMode = getVoiceMode();
        setVoiceModeState(savedVoiceMode);

        const savedPTTKey = getPTTKey();
        setPttKeyState(savedPTTKey);

        // Load VAD sensitivity settings
        const savedVADSensitivity = getVADSensitivity();
        setVadSensitivityState(savedVADSensitivity);
    }, [loadAudioDevices]);

    const loadVideoDevices = useCallback(async () => {
        try {
            // Request permission first
            await navigator.mediaDevices.getUserMedia({ video: true });
            const devices = await navigator.mediaDevices.enumerateDevices();
            const videoInputs = devices.filter((device) => device.kind === 'videoinput');
            setVideoDevices(videoInputs);

            // Try to load saved device, or use default
            const savedDeviceId = getVideoInputDevice();
            if (savedDeviceId && videoInputs.some((d) => d.deviceId === savedDeviceId)) {
                setSelectedCamera(savedDeviceId);
            } else if (videoInputs.length > 0) {
                setSelectedCamera(videoInputs[0].deviceId);
                setVideoInputDevice(videoInputs[0].deviceId);
            }
        } catch (error) {
            console.error('Failed to load video devices:', error);
        }
    }, []);

    // Load video devices on mount
    useEffect(() => {
        loadVideoDevices();
    }, [loadVideoDevices]);

    const stopMicrophoneTest = useCallback(() => {
        if (testStreamRef.current) {
            testStreamRef.current.getTracks().forEach((track) => track.stop());
            testStreamRef.current = null;
        }

        if (testIntervalRef.current) {
            clearInterval(testIntervalRef.current);
            testIntervalRef.current = null;
        }

        setIsTesting(false);
        setMicrophoneVolume(0);
    }, []);

    const stopCameraTest = useCallback(() => {
        if (cameraStreamRef.current) {
            cameraStreamRef.current.getTracks().forEach((track) => track.stop());
            cameraStreamRef.current = null;
        }

        if (videoTestRef.current) {
            videoTestRef.current.srcObject = null;
        }

        setIsTestingCamera(false);
    }, []);

    const stopScreenShareTest = useCallback(() => {
        if (screenStreamRef.current) {
            screenStreamRef.current.getTracks().forEach((track) => track.stop());
            screenStreamRef.current = null;
        }

        if (screenTestRef.current) {
            screenTestRef.current.srcObject = null;
        }

        setIsTestingScreenShare(false);
    }, []);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            stopMicrophoneTest();
            stopCameraTest();
            stopScreenShareTest();
        };
    }, [stopMicrophoneTest, stopCameraTest, stopScreenShareTest]);

    const startCameraTest = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: selectedCamera ? { deviceId: { exact: selectedCamera } } : true,
            });

            cameraStreamRef.current = stream;

            if (videoTestRef.current) {
                videoTestRef.current.srcObject = stream;
            }

            setIsTestingCamera(true);
        } catch (error) {
            console.error('Failed to start camera test:', error);
        }
    };

    const startScreenShareTest = async () => {
        try {
            // getDisplayMedia - API для захвата экрана
            const stream = await navigator.mediaDevices.getDisplayMedia({
                video: {
                    displaySurface: 'monitor', // Захват монитора
                } as MediaTrackConstraints,
                audio: false, // Можно добавить звук системы, но не все браузеры поддерживают
            });

            console.log('✅ Screen share stream obtained:', stream);
            console.log('Video tracks:', stream.getVideoTracks());

            screenStreamRef.current = stream;

            // Сначала показываем UI
            setIsTestingScreenShare(true);

            // Ждём следующий кадр, чтобы video элемент точно появился в DOM
            await new Promise((resolve) => setTimeout(resolve, 100));

            if (screenTestRef.current) {
                console.log('✅ Video element found:', screenTestRef.current);
                screenTestRef.current.srcObject = stream;
                console.log('✅ Screen share srcObject set');

                // Ждём загрузки метаданных
                await new Promise<void>((resolve, reject) => {
                    if (!screenTestRef.current) {
                        reject(new Error('Video element not found'));
                        return;
                    }

                    const video = screenTestRef.current;

                    const onLoadedMetadata = () => {
                        console.log('✅ Video metadata loaded');
                        video.removeEventListener('loadedmetadata', onLoadedMetadata);
                        resolve();
                    };

                    const onError = (e: Event) => {
                        console.error('❌ Video error:', e);
                        video.removeEventListener('error', onError);
                        reject(e);
                    };

                    video.addEventListener('loadedmetadata', onLoadedMetadata);
                    video.addEventListener('error', onError);

                    // Timeout для безопасности
                    setTimeout(() => {
                        video.removeEventListener('loadedmetadata', onLoadedMetadata);
                        video.removeEventListener('error', onError);
                        resolve();
                    }, 5000);
                });

                // Принудительно запускаем воспроизведение
                try {
                    await screenTestRef.current.play();
                    console.log('✅ Screen share video playing');
                } catch (playError) {
                    console.error('❌ Failed to play screen share video:', playError);
                }
            } else {
                console.error('❌ Video element not found in DOM');
            }

            // Автоматически останавливаем когда пользователь нажимает "Stop sharing" в браузере
            stream.getVideoTracks()[0].addEventListener('ended', () => {
                console.log('Screen sharing ended by user');
                stopScreenShareTest();
            });
        } catch (error) {
            console.error('❌ Failed to start screen share:', error);
            if (error instanceof Error) {
                // Пользователь отменил выбор или нет разрешения
                alert(`Screen sharing error: ${error.message}`);
            }
        }
    };

    const startMicrophoneTest = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: { deviceId: selectedMicrophone ? { exact: selectedMicrophone } : undefined },
            });

            testStreamRef.current = stream;
            setIsTesting(true);

            // Create audio context for volume analysis
            const audioContext = new AudioContext();
            const source = audioContext.createMediaStreamSource(stream);
            const analyser = audioContext.createAnalyser();
            analyser.fftSize = 256;
            source.connect(analyser);

            const dataArray = new Uint8Array(analyser.frequencyBinCount);

            // Update volume every 100ms
            testIntervalRef.current = window.setInterval(() => {
                analyser.getByteFrequencyData(dataArray);
                const average = dataArray.reduce((sum, value) => sum + value, 0) / dataArray.length;
                const volume = Math.min(100, Math.round((average / 255) * 100 * 2));
                setMicrophoneVolume(volume);
            }, 100);
        } catch (error) {
            console.error('Failed to start microphone test:', error);
        }
    };

    const handleVoiceModeChange = (mode: VoiceMode) => {
        setVoiceModeState(mode);
        setVoiceMode(mode); // Save to localStorage
        voiceStore.setVoiceMode(mode, pttKey); // Update store (reactive!)
    };

    const handleVADSensitivityChange = (sensitivity: VADSensitivity) => {
        setVadSensitivityState(sensitivity);
        setVADSensitivity(sensitivity); // Save to localStorage
        voiceStore.setVADSensitivity(sensitivity); // Update store (reactive!)
        console.log(`✅ VAD sensitivity changed to: ${sensitivity}`);
    };

    const handlePTTKeyRecord = () => {
        setIsRecordingPTT(true);
    };

    useEffect(() => {
        if (!isRecordingPTT) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            e.preventDefault();
            const key = e.code; // e.g., "Space", "KeyV", "ControlLeft"
            setPttKeyState(key);
            setPTTKey(key); // Save to localStorage
            voiceStore.setVoiceMode(voiceMode, key); // Update store with new key
            setIsRecordingPTT(false);
        };

        window.addEventListener('keydown', handleKeyDown);

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [isRecordingPTT, voiceMode, voiceStore]);

    const renderProfileSettings = () => (
        <>
            <div className={styles.settingsHeader}>
                <h1>{t('settings.profileSettings')}</h1>
                <Button variant='secondary' onClick={() => navigate('/')}>
                    {t('common.back')}
                </Button>
            </div>

            <div className={styles.settingsSection}>
                <h3>{t('settings.userName')}</h3>
                <input type='text' placeholder='TestUser' className={styles.settingsInput} />
            </div>

            <div className={styles.settingsSection}>
                <h3>{t('settings.email')}</h3>
                <input type='email' placeholder='test@example.com' className={styles.settingsInput} />
            </div>

            <div className={styles.settingsSection}>
                <h3>{t('settings.aboutMe')}</h3>
                <textarea placeholder={t('settings.aboutMePlaceholder')} className={styles.settingsTextarea} />
            </div>

            <div className={styles.settingsActions}>
                <Button variant='primary'>{t('settings.saveChanges')}</Button>
                <Button variant='secondary'>{t('settings.discardChanges')}</Button>
            </div>
        </>
    );

    const renderVoiceSettings = () => (
        <>
            <div className={styles.settingsHeader}>
                <h1>Voice & Video Settings</h1>
                <Button variant='secondary' onClick={() => navigate('/')}>
                    Back to Home
                </Button>
            </div>

            <div className={styles.settingsSection}>
                <h3>Input Device</h3>
                <select
                    className={styles.settingsSelect}
                    value={selectedMicrophone}
                    onChange={(e) => {
                        const newDeviceId = e.target.value;
                        setSelectedMicrophone(newDeviceId);
                        setAudioInputDevice(newDeviceId);
                    }}
                >
                    {audioDevices.map((device) => (
                        <option key={device.deviceId} value={device.deviceId}>
                            {device.label || `Microphone ${device.deviceId.slice(0, 8)}`}
                        </option>
                    ))}
                </select>
            </div>

            <div className={styles.settingsSection}>
                <h3>Microphone Test</h3>
                <div className={styles.micTestContainer}>
                    <Button
                        variant={isTesting ? 'danger' : 'primary'}
                        onClick={isTesting ? stopMicrophoneTest : startMicrophoneTest}
                    >
                        {isTesting ? 'Stop Test' : 'Test Microphone'}
                    </Button>

                    <div className={styles.volumeIndicatorContainer}>
                        <div className={styles.volumeBarBackground}>
                            <div
                                className={styles.volumeBarFill}
                                style={{
                                    width: `${microphoneVolume}%`,
                                    backgroundColor:
                                        microphoneVolume > 70
                                            ? '#43b581'
                                            : microphoneVolume > 30
                                            ? '#faa61a'
                                            : '#72767d',
                                }}
                            />
                        </div>
                        <span className={styles.volumeText}>{microphoneVolume}%</span>
                    </div>
                </div>
            </div>

            <div className={styles.settingsSection}>
                <h3>Video Device</h3>
                <select
                    className={styles.settingsSelect}
                    value={selectedCamera}
                    onChange={(e) => {
                        const newDeviceId = e.target.value;
                        setSelectedCamera(newDeviceId);
                        setVideoInputDevice(newDeviceId);
                    }}
                >
                    {videoDevices.map((device) => (
                        <option key={device.deviceId} value={device.deviceId}>
                            {device.label || `Camera ${device.deviceId.slice(0, 8)}`}
                        </option>
                    ))}
                </select>
            </div>

            <div className={styles.settingsSection}>
                <h3>Camera Test</h3>
                <div className={styles.cameraTestContainer}>
                    <Button
                        variant={isTestingCamera ? 'danger' : 'primary'}
                        onClick={isTestingCamera ? stopCameraTest : startCameraTest}
                    >
                        {isTestingCamera ? 'Stop Test' : 'Test Camera'}
                    </Button>

                    {isTestingCamera && (
                        <div className={styles.videoPreviewContainer}>
                            <video ref={videoTestRef} autoPlay playsInline muted className={styles.videoPreview} />
                        </div>
                    )}
                </div>
            </div>

            <div className={styles.settingsSection}>
                <h3>Screen Sharing Test</h3>
                <p className={styles.settingsDescription}>
                    Test screen sharing to see how your desktop will appear to other participants during calls.
                </p>
                <div className={styles.cameraTestContainer}>
                    <Button
                        variant={isTestingScreenShare ? 'danger' : 'secondary'}
                        onClick={isTestingScreenShare ? stopScreenShareTest : startScreenShareTest}
                    >
                        {isTestingScreenShare ? 'Stop Sharing' : 'Share Screen'}
                    </Button>

                    {isTestingScreenShare && (
                        <div className={styles.videoPreviewContainer}>
                            <video
                                ref={screenTestRef}
                                autoPlay
                                playsInline
                                className={styles.videoPreview}
                                style={{ maxWidth: '100%', maxHeight: '100%' }}
                            />
                            <div className={styles.screenShareLabel}>Your screen preview</div>
                        </div>
                    )}
                </div>
            </div>

            <div className={styles.settingsSection}>
                <h3>{t('settings.voiceMode')}</h3>
                <p className={styles.settingsDescription}>{t('settings.voiceModeDescription')}</p>
                <div className={styles.voiceModeOptions}>
                    <label className={styles.radioOption}>
                        <input
                            type='radio'
                            name='voiceMode'
                            value='vad'
                            checked={voiceMode === 'vad'}
                            onChange={(e) => handleVoiceModeChange(e.target.value as VoiceMode)}
                        />
                        <div className={styles.radioLabel}>
                            <strong>{t('settings.voiceActivityDetection')}</strong>
                            <span className={styles.radioDescription}>{t('settings.voiceActivityDescription')}</span>
                        </div>
                    </label>

                    <label className={styles.radioOption}>
                        <input
                            type='radio'
                            name='voiceMode'
                            value='ptt'
                            checked={voiceMode === 'ptt'}
                            onChange={(e) => handleVoiceModeChange(e.target.value as VoiceMode)}
                        />
                        <div className={styles.radioLabel}>
                            <strong>{t('settings.pushToTalk')}</strong>
                            <span className={styles.radioDescription}>
                                {t('settings.pushToTalkDescription')}
                                <br />
                                <em style={{ fontSize: '12px', color: '#faa81a' }}>
                                    ⚠️ Note: Browser keyboard events require window focus. For background operation, use
                                    VAD mode.
                                </em>
                            </span>
                        </div>
                    </label>
                </div>
            </div>

            {voiceMode === 'ptt' && (
                <div className={styles.settingsSection}>
                    <h3>{t('settings.pttKey')}</h3>
                    <p className={styles.settingsDescription}>{t('settings.pressToBind')}</p>
                    <Button variant={isRecordingPTT ? 'primary' : 'secondary'} onClick={handlePTTKeyRecord}>
                        {isRecordingPTT ? 'Press any key...' : `${t('settings.currentPttKey')} ${pttKey}`}
                    </Button>
                </div>
            )}

            {voiceMode === 'vad' && (
                <div className={styles.settingsSection}>
                    <h3>VAD Sensitivity</h3>
                    <p className={styles.settingsDescription}>
                        Adjust how sensitive the voice detection should be. Higher sensitivity is better for noisy
                        environments but may filter out quiet speech.
                    </p>
                    {voiceStore.activeVoiceChannelId && (
                        <div className={styles.vadWarning}>
                            <strong>⚠️ Note:</strong> Sensitivity changes will take effect when you rejoin the voice
                            channel.
                        </div>
                    )}
                    <div className={styles.voiceModeOptions}>
                        <label className={styles.radioOption}>
                            <input
                                type='radio'
                                name='vadSensitivity'
                                value='low'
                                checked={vadSensitivity === 'low'}
                                onChange={(e) => handleVADSensitivityChange(e.target.value as VADSensitivity)}
                            />
                            <div className={styles.radioLabel}>
                                <strong>Low Sensitivity</strong>
                                <span className={styles.radioDescription}>
                                    Detects quiet speech. May occasionally activate from loud background sounds. Best
                                    for quiet environments. (Threshold: 0.6, Min speech: 300ms)
                                </span>
                            </div>
                        </label>

                        <label className={styles.radioOption}>
                            <input
                                type='radio'
                                name='vadSensitivity'
                                value='medium'
                                checked={vadSensitivity === 'medium'}
                                onChange={(e) => handleVADSensitivityChange(e.target.value as VADSensitivity)}
                            />
                            <div className={styles.radioLabel}>
                                <strong>Medium Sensitivity</strong>
                                <span className={styles.radioDescription}>
                                    Balanced detection for normal speaking volume. Good for quiet to moderately noisy
                                    rooms. Ignores keyboard clicks. (Threshold: 0.7, Min speech: 350ms)
                                </span>
                            </div>
                        </label>

                        <label className={styles.radioOption}>
                            <input
                                type='radio'
                                name='vadSensitivity'
                                value='high'
                                checked={vadSensitivity === 'high'}
                                onChange={(e) => handleVADSensitivityChange(e.target.value as VADSensitivity)}
                            />
                            <div className={styles.radioLabel}>
                                <strong>High Sensitivity (Recommended)</strong>
                                <span className={styles.radioDescription}>
                                    Filters out most background noise. Best for noisy environments with fans, AC, or
                                    mechanical keyboards. Ignores typing sounds. (Threshold: 0.85, Min speech: 400ms)
                                </span>
                            </div>
                        </label>
                    </div>
                    <div className={styles.vadInfo}>
                        <p>
                            <strong>💡 How it works:</strong> VAD uses machine learning (Silero model) to detect speech
                            patterns with ~95% accuracy and ~50ms latency.
                        </p>
                    </div>
                </div>
            )}
        </>
    );

    return (
        <div className={styles.settingsPage}>
            <div className={styles.settingsSidebar}>
                <h2>{t('settings.title')}</h2>
                <nav className={styles.settingsNav}>
                    <button
                        className={`${styles.navItem} ${activeTab === 'profile' ? styles.active : ''}`}
                        onClick={() => setActiveTab('profile')}
                    >
                        {t('settings.account')}
                    </button>
                    <button
                        className={`${styles.navItem} ${activeTab === 'voice' ? styles.active : ''}`}
                        onClick={() => setActiveTab('voice')}
                    >
                        {t('settings.voiceVideo')}
                    </button>
                    <button
                        className={`${styles.navItem} ${activeTab === 'notifications' ? styles.active : ''}`}
                        onClick={() => setActiveTab('notifications')}
                    >
                        {t('settings.notifications')}
                    </button>
                    <button
                        className={`${styles.navItem} ${activeTab === 'appearance' ? styles.active : ''}`}
                        onClick={() => setActiveTab('appearance')}
                    >
                        {t('settings.appearance')}
                    </button>
                    <button
                        className={`${styles.navItem} ${activeTab === 'desktop' ? styles.active : ''}`}
                        onClick={() => setActiveTab('desktop')}
                    >
                        Desktop
                    </button>
                </nav>
            </div>

            <div className={styles.settingsContent}>
                {activeTab === 'profile' && renderProfileSettings()}
                {activeTab === 'voice' && renderVoiceSettings()}
                {activeTab === 'notifications' && (
                    <div className={styles.settingsHeader}>
                        <h1>{t('settings.notifications')}</h1>
                    </div>
                )}
                {activeTab === 'appearance' && (
                    <>
                        <div className={styles.settingsHeader}>
                            <h1>{t('settings.appearance')}</h1>
                        </div>
                        <div className={styles.settingsSection}>
                            <LanguageSwitcher />
                        </div>
                    </>
                )}
                {activeTab === 'desktop' && <DesktopSettings />}
            </div>
        </div>
    );
}
