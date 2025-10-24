import os from 'os';

export const sfuConfig = {
    // Worker configuration
    worker: {
        rtcMinPort: parseInt(process.env.RTC_MIN_PORT || '40000'),
        rtcMaxPort: parseInt(process.env.RTC_MAX_PORT || '49999'),
        logLevel: (process.env.SFU_LOG_LEVEL || 'debug') as any, // TEMPORARY: debug ICE issues
        logTags: ['info', 'ice', 'dtls', 'rtp', 'srtp', 'rtcp'] as any[],
    },

    // Router media codecs
    router: {
        mediaCodecs: [
            {
                kind: 'audio' as const,
                mimeType: 'audio/opus',
                clockRate: 48000,
                channels: 2,
            },
            {
                kind: 'video' as const,
                mimeType: 'video/VP8',
                clockRate: 90000,
                parameters: {
                    'x-google-start-bitrate': 1000,
                },
            },
        ],
    },

    // WebRTC transport settings
    webRtcTransport: {
        listenIps:
            process.env.NODE_ENV === 'production' && process.env.SFU_ANNOUNCED_IP
                ? [
                      {
                          // PRODUCTION: Listen on all interfaces (0.0.0.0) and announce public IP
                          ip: '0.0.0.0',
                          announcedIp: process.env.SFU_ANNOUNCED_IP,
                      },
                  ]
                : [
                      {
                          // DEVELOPMENT: Use 127.0.0.1 for local testing (no announcedIp needed)
                          ip: '127.0.0.1',
                      },
                  ],
        // Enable both UDP and TCP for maximum compatibility
        enableUdp: true,
        enableTcp: true,
        preferUdp: true,
        initialAvailableOutgoingBitrate: 1000000,
        // Google STUN servers for NAT traversal and Firefox compatibility
        iceServers: [
            {
                urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'],
            },
        ],
    },

    // Node settings
    node: {
        id: process.env.NODE_ID || 'sfu-1',
        region: process.env.NODE_REGION || 'local',
    },
};

function getLocalIp(): string {
    const interfaces = os.networkInterfaces();
    for (const iface of Object.values(interfaces)) {
        if (!iface) continue;
        for (const alias of iface) {
            if (alias.family === 'IPv4' && !alias.internal) {
                return alias.address;
            }
        }
    }
    return '127.0.0.1';
}
