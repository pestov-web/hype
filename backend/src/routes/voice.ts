import express, { Router } from 'express';
import { sfuService } from '../services/sfuService.js';

const router: Router = express.Router();

// Get RTP capabilities for channel
router.get('/rtp-capabilities/:channelId', async (req, res) => {
    try {
        const { channelId } = req.params;
        const router = await sfuService.getOrCreateRoom(channelId);
        res.json({ rtpCapabilities: router.rtpCapabilities });
    } catch (error) {
        console.error('Error getting RTP capabilities:', error);
        res.status(500).json({ error: 'Failed to get RTP capabilities' });
    }
});

// Create WebRTC transport
router.post('/create-transport', async (req, res) => {
    try {
        const { channelId, userId, direction } = req.body;
        const transport = await sfuService.createTransport(channelId, userId, direction);
        res.json(transport);
    } catch (error) {
        console.error('Error creating transport:', error);
        res.status(500).json({ error: 'Failed to create transport' });
    }
});

// Connect transport
router.post('/connect-transport', async (req, res) => {
    try {
        const { channelId, userId, transportId, dtlsParameters } = req.body;
        await sfuService.connectTransport(channelId, userId, transportId, dtlsParameters);
        res.json({ success: true });
    } catch (error) {
        console.error('Error connecting transport:', error);
        res.status(500).json({ error: 'Failed to connect transport' });
    }
});

// Produce (send audio/video to SFU)
router.post('/produce', async (req, res) => {
    try {
        const { channelId, userId, transportId, kind, rtpParameters, appData } = req.body;
        console.log(`📥 [/voice/produce] Received request:`, { channelId, userId, kind });
        const producerId = await sfuService.produce({
            channelId,
            userId,
            transportId,
            kind,
            rtpParameters,
            appData,
        });
        res.json({ id: producerId }); // Frontend expects { id }, not { producerId }
    } catch (error) {
        console.error('Error producing:', error);
        res.status(500).json({ error: 'Failed to produce' });
    }
});

// Consume (receive audio/video from SFU)
router.post('/consume', async (req, res) => {
    try {
        const { channelId, userId, transportId, producerId, rtpCapabilities } = req.body;
        const consumer = await sfuService.consume({
            channelId,
            userId,
            transportId,
            producerId,
            rtpCapabilities,
        });
        res.json(consumer);
    } catch (error) {
        console.error('Error consuming:', error);
        res.status(500).json({ error: 'Failed to consume' });
    }
});

// Get producers in channel (exclude requesting user's own producers)
// Get all producers in channel except specified user (for requesting user)
router.get('/producers/:channelId/exclude/:userId', (req, res) => {
    try {
        const { channelId, userId } = req.params;
        // userId is the requesting user - exclude their own producers
        const producers = sfuService.getProducers(channelId, userId);
        res.json({ producers });
    } catch (error) {
        console.error('Error getting producers:', error);
        res.status(500).json({ error: 'Failed to get producers' });
    }
});

// Get producers for specific user (for consuming)
router.get('/producers/:channelId/user/:userId', (req, res) => {
    try {
        const { channelId, userId } = req.params;
        const producers = sfuService.getProducersForUser(channelId, userId);
        res.json({ producers });
    } catch (error) {
        console.error('Error getting producers for user:', error);
        res.status(500).json({ error: 'Failed to get producers' });
    }
});

// Leave channel
router.post('/leave', async (req, res) => {
    try {
        const { channelId, userId } = req.body;
        await sfuService.cleanup(channelId, userId);
        res.json({ success: true });
    } catch (error) {
        console.error('Error leaving channel:', error);
        res.status(500).json({ error: 'Failed to leave channel' });
    }
});

// Health check
router.get('/health', (req, res) => {
    const health = sfuService.getHealth();
    res.json(health);
});

export default router;
