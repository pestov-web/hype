import { Router } from 'express';
import type { Router as ExpressRouter } from 'express';
import { prisma } from '../config/database.js';
import { authenticateJWT, type AuthRequest } from '../middleware/auth.js';
import { getWebSocketManager } from '../websocket/wsManager.js';

export const messageRoutes: ExpressRouter = Router();

// GET /api/messages?channelId=:channelId - Get messages for a channel
messageRoutes.get('/', async (req, res) => {
    try {
        const { channelId, limit = '50', offset = '0' } = req.query;

        if (!channelId || typeof channelId !== 'string') {
            return res.status(400).json({
                success: false,
                error: 'channelId query parameter is required',
            });
        }

        // Check if channel exists
        const channel = await prisma.channel.findUnique({
            where: { id: channelId },
        });

        if (!channel) {
            return res.status(404).json({
                success: false,
                error: 'Channel not found',
            });
        }

        if (channel.type !== 'TEXT') {
            return res.status(400).json({
                success: false,
                error: 'Channel is not a text channel',
            });
        }

        // Get messages with pagination
        const messages = await prisma.message.findMany({
            where: { channelId },
            orderBy: { createdAt: 'desc' },
            skip: Number(offset),
            take: Number(limit),
            include: {
                author: {
                    select: {
                        id: true,
                        username: true,
                        displayName: true,
                        avatarUrl: true,
                        status: true,
                    },
                },
                reactions: {
                    include: {
                        user: {
                            select: {
                                id: true,
                                username: true,
                            },
                        },
                    },
                },
                attachments: true,
            },
        });

        // Get total count for pagination
        const total = await prisma.message.count({
            where: { channelId },
        });

        res.json({
            success: true,
            data: messages,
            meta: {
                total,
                limit: Number(limit),
                offset: Number(offset),
            },
        });
    } catch (error) {
        console.error('Error fetching messages:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch messages',
        });
    }
});

// GET /api/messages/:id - Get specific message
messageRoutes.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const message = await prisma.message.findUnique({
            where: { id },
            include: {
                author: {
                    select: {
                        id: true,
                        username: true,
                        displayName: true,
                        avatarUrl: true,
                        status: true,
                    },
                },
                reactions: {
                    include: {
                        user: {
                            select: {
                                id: true,
                                username: true,
                            },
                        },
                    },
                },
                attachments: true,
            },
        });

        if (!message) {
            return res.status(404).json({
                success: false,
                error: 'Message not found',
            });
        }

        res.json({
            success: true,
            data: message,
        });
    } catch (error) {
        console.error('Error fetching message:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch message',
        });
    }
});

// POST /api/messages - Create new message
messageRoutes.post('/', authenticateJWT, async (req: AuthRequest, res) => {
    try {
        const { content, channelId } = req.body;
        const userId = req.user?.id;

        if (!userId) {
            return res.status(401).json({
                success: false,
                error: 'Unauthorized',
            });
        }

        if (!content || !channelId) {
            return res.status(400).json({
                success: false,
                error: 'content and channelId are required',
            });
        }

        if (typeof content !== 'string' || content.trim().length === 0) {
            return res.status(400).json({
                success: false,
                error: 'content must be a non-empty string',
            });
        }

        if (content.length > 2000) {
            return res.status(400).json({
                success: false,
                error: 'content must not exceed 2000 characters',
            });
        }

        // Check if channel exists
        const channel = await prisma.channel.findUnique({
            where: { id: channelId },
        });

        if (!channel) {
            return res.status(404).json({
                success: false,
                error: 'Channel not found',
            });
        }

        if (channel.type !== 'TEXT') {
            return res.status(400).json({
                success: false,
                error: 'Channel is not a text channel',
            });
        }

        const newMessage = await prisma.message.create({
            data: {
                content: content.trim(),
                authorId: userId,
                channelId,
            },
            include: {
                author: {
                    select: {
                        id: true,
                        username: true,
                        displayName: true,
                        avatarUrl: true,
                        status: true,
                    },
                },
                reactions: true,
                attachments: true,
            },
        });

        // Broadcast new message to all channel participants via WebSocket
        try {
            const wsManager = getWebSocketManager();
            console.log('[Messages Route] Broadcasting new message:', {
                type: 'new_message',
                channelId,
                messageId: newMessage.id,
            });
            wsManager.broadcastToChannel(channelId, {
                type: 'new_message',
                data: newMessage,
                timestamp: new Date(),
            });
            console.log('[Messages Route] Message broadcasted successfully');
        } catch (error) {
            console.error('Failed to broadcast message via WebSocket:', error);
            // Continue anyway - message is saved in DB
        }

        res.status(201).json({
            success: true,
            data: newMessage,
        });
    } catch (error) {
        console.error('Error creating message:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to create message',
        });
    }
});

// PUT /api/messages/:id - Edit message
messageRoutes.put('/:id', authenticateJWT, async (req: AuthRequest, res) => {
    try {
        const { id } = req.params;
        const { content } = req.body;
        const userId = req.user?.id;

        if (!userId) {
            return res.status(401).json({
                success: false,
                error: 'Unauthorized',
            });
        }

        if (!content) {
            return res.status(400).json({
                success: false,
                error: 'content is required',
            });
        }

        if (typeof content !== 'string' || content.trim().length === 0) {
            return res.status(400).json({
                success: false,
                error: 'content must be a non-empty string',
            });
        }

        if (content.length > 2000) {
            return res.status(400).json({
                success: false,
                error: 'content must not exceed 2000 characters',
            });
        }

        const message = await prisma.message.findUnique({
            where: { id },
        });

        if (!message) {
            return res.status(404).json({
                success: false,
                error: 'Message not found',
            });
        }

        // Check if user is the author
        if (message.authorId !== userId) {
            return res.status(403).json({
                success: false,
                error: 'Forbidden: You can only edit your own messages',
            });
        }

        const updatedMessage = await prisma.message.update({
            where: { id },
            data: {
                content: content.trim(),
                edited: true,
            },
            include: {
                author: {
                    select: {
                        id: true,
                        username: true,
                        displayName: true,
                        avatarUrl: true,
                        status: true,
                    },
                },
                reactions: {
                    include: {
                        user: {
                            select: {
                                id: true,
                                username: true,
                            },
                        },
                    },
                },
                attachments: true,
            },
        });

        // Broadcast message edit to all channel participants via WebSocket
        try {
            const wsManager = getWebSocketManager();
            wsManager.broadcastToChannel(updatedMessage.channelId, {
                type: 'message_edited',
                data: updatedMessage,
                timestamp: new Date(),
            });
        } catch (error) {
            console.error('Failed to broadcast message edit via WebSocket:', error);
        }

        res.json({
            success: true,
            data: updatedMessage,
        });
    } catch (error) {
        console.error('Error updating message:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update message',
        });
    }
});

// DELETE /api/messages/:id - Delete message
messageRoutes.delete('/:id', authenticateJWT, async (req: AuthRequest, res) => {
    try {
        const { id } = req.params;
        const userId = req.user?.id;

        if (!userId) {
            return res.status(401).json({
                success: false,
                error: 'Unauthorized',
            });
        }

        const message = await prisma.message.findUnique({
            where: { id },
        });

        if (!message) {
            return res.status(404).json({
                success: false,
                error: 'Message not found',
            });
        }

        // Check if user is the author
        if (message.authorId !== userId) {
            return res.status(403).json({
                success: false,
                error: 'Forbidden: You can only delete your own messages',
            });
        }

        const channelId = message.channelId; // Save before deletion

        await prisma.message.delete({
            where: { id },
        });

        // Broadcast message deletion to all channel participants via WebSocket
        try {
            const wsManager = getWebSocketManager();
            wsManager.broadcastToChannel(channelId, {
                type: 'message_deleted',
                data: { messageId: id, channelId },
                timestamp: new Date(),
            });
        } catch (error) {
            console.error('Failed to broadcast message deletion via WebSocket:', error);
        }

        res.json({
            success: true,
            data: { id },
        });
    } catch (error) {
        console.error('Error deleting message:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to delete message',
        });
    }
});
