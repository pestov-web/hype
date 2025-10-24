import { Router, Request, Response } from 'express';
import type { Router as ExpressRouter } from 'express';
import { prisma } from '../config/database.js';

const router: ExpressRouter = Router();

/**
 * GET /api/servers
 * Get all servers (for now just the default one)
 */
router.get('/', async (req: Request, res: Response) => {
    try {
        const servers = await prisma.server.findMany({
            include: {
                owner: {
                    select: {
                        id: true,
                        username: true,
                        avatarUrl: true,
                    },
                },
                _count: {
                    select: {
                        members: true,
                        channels: true,
                    },
                },
            },
        });

        res.json({
            success: true,
            data: servers,
        });
    } catch (error) {
        console.error('Error fetching servers:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch servers',
        });
    }
});

/**
 * GET /api/servers/:serverId
 * Get specific server
 */
router.get('/:serverId', async (req: Request, res: Response) => {
    try {
        const { serverId } = req.params;

        const server = await prisma.server.findUnique({
            where: { id: serverId },
            include: {
                owner: {
                    select: {
                        id: true,
                        username: true,
                        avatarUrl: true,
                    },
                },
                _count: {
                    select: {
                        members: true,
                        channels: true,
                    },
                },
            },
        });

        if (!server) {
            return res.status(404).json({
                success: false,
                error: 'Server not found',
            });
        }

        res.json({
            success: true,
            data: server,
        });
    } catch (error) {
        console.error('Error fetching server:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch server',
        });
    }
});

/**
 * GET /api/servers/:serverId/channels
 * Get all channels for a server
 */
router.get('/:serverId/channels', async (req: Request, res: Response) => {
    try {
        const { serverId } = req.params;

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

        // Get channels for the server
        const channels = await prisma.channel.findMany({
            where: { serverId },
            orderBy: { position: 'asc' },
            include: {
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

export default router;
