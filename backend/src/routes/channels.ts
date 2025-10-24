import { Router } from 'express';
import type { Router as ExpressRouter } from 'express';
import { prisma } from '../config/database.js';

export const channelRoutes: ExpressRouter = Router();

// GET /api/channels - Get all channels
channelRoutes.get('/', async (req, res) => {
    try {
        const channels = await prisma.channel.findMany({
            orderBy: { position: 'asc' },
            include: {
                server: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
                createdBy: {
                    select: {
                        id: true,
                        username: true,
                    },
                },
                _count: {
                    select: {
                        messages: true,
                        voiceStates: true,
                    },
                },
            },
        });

        res.json({
            success: true,
            data: channels,
        });
    } catch (error) {
        console.error('Error fetching channels:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch channels',
        });
    }
});

// GET /api/channels/:id - Get specific channel
channelRoutes.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const channel = await prisma.channel.findUnique({
            where: { id },
            include: {
                server: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
                createdBy: {
                    select: {
                        id: true,
                        username: true,
                    },
                },
                _count: {
                    select: {
                        messages: true,
                        voiceStates: true,
                    },
                },
            },
        });

        if (!channel) {
            return res.status(404).json({
                success: false,
                error: 'Channel not found',
            });
        }

        res.json({
            success: true,
            data: channel,
        });
    } catch (error) {
        console.error('Error fetching channel:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch channel',
        });
    }
});

// POST /api/channels - Create new channel (requires auth in production)
channelRoutes.post('/', async (req, res) => {
    try {
        const { name, type, topic, serverId, createdById, userLimit, bitrate, position } = req.body;

        if (!name || !type || !serverId || !createdById) {
            return res.status(400).json({
                success: false,
                error: 'Name, type, serverId, and createdById are required',
            });
        }

        // Validate channel type
        if (!['TEXT', 'VOICE', 'ANNOUNCEMENT'].includes(type)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid channel type. Must be TEXT, VOICE, or ANNOUNCEMENT',
            });
        }

        // Check if server exists
        const server = await prisma.server.findUnique({
            where: { id: serverId },
        });

        if (!server) {
            return res.status(404).json({
                success: false,
                error: 'Server not found',
            });
        }

        // Check if user exists
        const user = await prisma.user.findUnique({
            where: { id: createdById },
        });

        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'User not found',
            });
        }

        const newChannel = await prisma.channel.create({
            data: {
                name,
                type,
                topic,
                serverId,
                createdById,
                position: position ?? 0,
                userLimit: type === 'VOICE' ? userLimit : null,
                bitrate: type === 'VOICE' ? bitrate ?? 64 : null,
            },
            include: {
                server: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
                createdBy: {
                    select: {
                        id: true,
                        username: true,
                    },
                },
            },
        });

        res.status(201).json({
            success: true,
            data: newChannel,
        });
    } catch (error) {
        console.error('Error creating channel:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to create channel',
        });
    }
});

// PUT /api/channels/:id - Update channel
channelRoutes.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { name, topic, position, userLimit, bitrate } = req.body;

        const channel = await prisma.channel.findUnique({
            where: { id },
        });

        if (!channel) {
            return res.status(404).json({
                success: false,
                error: 'Channel not found',
            });
        }

        const updatedChannel = await prisma.channel.update({
            where: { id },
            data: {
                ...(name && { name }),
                ...(topic !== undefined && { topic }),
                ...(position !== undefined && { position }),
                ...(userLimit !== undefined && { userLimit }),
                ...(bitrate !== undefined && { bitrate }),
            },
            include: {
                server: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
                createdBy: {
                    select: {
                        id: true,
                        username: true,
                    },
                },
            },
        });

        res.json({
            success: true,
            data: updatedChannel,
        });
    } catch (error) {
        console.error('Error updating channel:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update channel',
        });
    }
});

// DELETE /api/channels/:id - Delete channel
channelRoutes.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const channel = await prisma.channel.findUnique({
            where: { id },
        });

        if (!channel) {
            return res.status(404).json({
                success: false,
                error: 'Channel not found',
            });
        }

        await prisma.channel.delete({
            where: { id },
        });

        res.json({
            success: true,
            data: channel,
        });
    } catch (error) {
        console.error('Error deleting channel:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to delete channel',
        });
    }
});
