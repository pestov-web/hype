import { Router } from 'express';
import type { Router as ExpressRouter } from 'express';
import { z } from 'zod';
import { authenticateJWT, type AuthRequest } from '../middleware/auth.js';
import { prisma } from '../config/database.js';
import { Prisma } from '../generated/prisma/index.js';

export const userRoutes: ExpressRouter = Router();

// Validation schema for profile update
const profileUpdateSchema = z.object({
    username: z
        .string()
        .min(3)
        .max(32)
        .regex(/^[a-zA-Z0-9_-]+$/)
        .optional(),
    bio: z.string().max(500).optional(),
    avatarUrl: z.string().url().optional().nullable(),
    displayName: z.string().min(1).max(32).optional(),
});

// GET /api/users - Get all users from database
userRoutes.get('/', async (req, res) => {
    try {
        const users = await prisma.user.findMany({
            select: {
                id: true,
                username: true,
                email: true,
                displayName: true,
                avatarUrl: true,
                status: true,
                customStatus: true,
                createdAt: true,
                updatedAt: true,
            },
        });

        // Map database users to API format
        const apiUsers = users.map((user) => ({
            id: user.id,
            username: user.username,
            email: user.email,
            displayName: user.displayName,
            discriminator: user.username.slice(0, 4), // Generate discriminator from username
            status: user.status.toLowerCase() as 'online' | 'idle' | 'dnd' | 'offline',
            customStatus: user.customStatus,
            avatarUrl: user.avatarUrl,
            avatar: user.avatarUrl,
            createdAt: user.createdAt,
            updatedAt: user.updatedAt,
        }));

        res.json({
            success: true,
            data: apiUsers,
        });
    } catch (error) {
        console.error('❌ Failed to load users:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to load users',
        });
    }
});

// GET /api/users/:id - Get specific user from database
userRoutes.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const user = await prisma.user.findUnique({
            where: { id },
            select: {
                id: true,
                username: true,
                email: true,
                displayName: true,
                avatarUrl: true,
                status: true,
                customStatus: true,
                createdAt: true,
                updatedAt: true,
            },
        });

        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'User not found',
            });
        }

        const apiUser = {
            id: user.id,
            username: user.username,
            email: user.email,
            displayName: user.displayName,
            discriminator: user.username.slice(0, 4),
            status: user.status.toLowerCase() as 'online' | 'idle' | 'dnd' | 'offline',
            customStatus: user.customStatus,
            avatarUrl: user.avatarUrl,
            avatar: user.avatarUrl,
            createdAt: user.createdAt,
            updatedAt: user.updatedAt,
        };

        res.json({
            success: true,
            data: apiUser,
        });
    } catch (error) {
        console.error('❌ Failed to load user:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to load user',
        });
    }
});

// PUT /api/users/:id/status - Update user status in database
userRoutes.put('/:id/status', async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        if (!['online', 'idle', 'dnd', 'offline'].includes(status)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid status',
            });
        }

        const user = await prisma.user.update({
            where: { id },
            data: {
                status: status.toUpperCase() as 'ONLINE' | 'IDLE' | 'DND' | 'OFFLINE',
                updatedAt: new Date(),
            },
            select: {
                id: true,
                username: true,
                email: true,
                displayName: true,
                avatarUrl: true,
                status: true,
                customStatus: true,
                createdAt: true,
                updatedAt: true,
            },
        });

        const apiUser = {
            id: user.id,
            username: user.username,
            email: user.email,
            displayName: user.displayName,
            discriminator: user.username.slice(0, 4),
            status: user.status.toLowerCase() as 'online' | 'idle' | 'dnd' | 'offline',
            customStatus: user.customStatus,
            avatarUrl: user.avatarUrl,
            avatar: user.avatarUrl,
            createdAt: user.createdAt,
            updatedAt: user.updatedAt,
        };

        res.json({
            success: true,
            data: apiUser,
        });
    } catch (error) {
        console.error('❌ Failed to update user status:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update user status',
        });
    }
});

// PUT /api/users/:id - Update user profile (username, bio, avatarUrl, displayName)
// Requires authentication and only the owner can update their profile
userRoutes.put('/:id', authenticateJWT, async (req: AuthRequest, res) => {
    try {
        const { id } = req.params;

        // Ensure authenticated user is updating their own profile
        if (!req.user || req.user.id !== id) {
            return res.status(403).json({
                success: false,
                error: 'Forbidden: You can only update your own profile',
            });
        }

        // Validate request body
        const data = profileUpdateSchema.parse(req.body);

        // Prepare update payload (only include provided fields)
        const updateData: any = {};
        if (data.username !== undefined) updateData.username = data.username;
        if (data.bio !== undefined) updateData.bio = data.bio;
        if (data.avatarUrl !== undefined) updateData.avatarUrl = data.avatarUrl;
        if (data.displayName !== undefined) updateData.displayName = data.displayName;

        // Update user in database
        let user;
        try {
            user = await prisma.user.update({
                where: { id },
                data: updateData,
                select: {
                    id: true,
                    username: true,
                    email: true,
                    displayName: true,
                    avatarUrl: true,
                    status: true,
                    customStatus: true,
                    bio: true,
                    createdAt: true,
                    updatedAt: true,
                },
            });
        } catch (err) {
            // Handle unique constraint violation (username already taken)
            if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
                return res.status(409).json({
                    success: false,
                    error: 'Username already taken',
                });
            }
            throw err;
        }

        // Format response
        const apiUser = {
            id: user.id,
            username: user.username,
            email: user.email,
            displayName: user.displayName,
            discriminator: user.username.slice(0, 4),
            status: user.status.toLowerCase() as 'online' | 'idle' | 'dnd' | 'offline',
            customStatus: user.customStatus,
            avatarUrl: user.avatarUrl,
            avatar: user.avatarUrl,
            bio: user.bio,
            createdAt: user.createdAt,
            updatedAt: user.updatedAt,
        };

        res.json({
            success: true,
            data: apiUser,
        });
    } catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({
                success: false,
                error: 'Validation failed',
                details: error.issues,
            });
        }
        console.error('❌ Failed to update user profile:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update profile',
        });
    }
});
