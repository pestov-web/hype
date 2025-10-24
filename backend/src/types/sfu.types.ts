import type { types } from 'mediasoup';

export interface SFURoom {
    channelId: string;
    router: types.Router;
    participants: Map<string, SFUParticipant>;
    createdAt: Date;
}

export interface SFUParticipant {
    userId: string;
    sendTransport?: types.Transport;
    recvTransport?: types.Transport;
    audioProducer?: types.Producer;
    videoProducer?: types.Producer;
    screenProducer?: types.Producer; // Screen sharing producer
    consumers: Map<string, types.Consumer>; // producerId -> Consumer
}

export interface TransportOptions {
    id: string;
    iceParameters: any;
    iceCandidates: any[];
    dtlsParameters: types.DtlsParameters;
    iceServers?: Array<{
        urls: string | string[];
        username?: string;
        credential?: string;
    }>; // STUN/TURN servers for NAT traversal
}

export interface ProduceRequest {
    channelId: string;
    userId: string;
    transportId: string;
    kind: 'audio' | 'video' | 'screen';
    rtpParameters: any;
    appData?: any;
}

export interface ConsumeRequest {
    channelId: string;
    userId: string;
    transportId: string;
    producerId: string;
    rtpCapabilities: types.RtpCapabilities;
}
