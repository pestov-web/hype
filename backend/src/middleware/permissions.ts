import type { Response, NextFunction } from 'express';
import type { AuthRequest } from './auth.js';
import { prisma } from '../config/database.js';

/**
 * Middleware для проверки что пользователь НЕ гость
 * Гости не могут создавать серверы и выполнять административные действия
 */
export async function requireAuthenticatedUser(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    if (!req.user) {
        res.status(401).json({
            success: false,
            error: 'Authentication required',
        });
        return;
    }

    // Получаем полную информацию о пользователе
    const user = await prisma.user.findUnique({
        where: { id: req.user.id },
        select: { id: true, isGuest: true },
    });

    if (!user) {
        res.status(401).json({
            success: false,
            error: 'User not found',
        });
        return;
    }

    if (user.isGuest) {
        res.status(403).json({
            success: false,
            error: 'Guest users cannot perform this action. Please register an account.',
        });
        return;
    }

    next();
}

/**
 * Middleware для проверки что пользователь является владельцем сервера
 * Используется для создания/удаления каналов и управления сервером
 */
export async function requireServerOwner(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    if (!req.user) {
        res.status(401).json({
            success: false,
            error: 'Authentication required',
        });
        return;
    }

    const { serverId } = req.params;

    if (!serverId) {
        res.status(400).json({
            success: false,
            error: 'Server ID is required',
        });
        return;
    }

    const server = await prisma.server.findUnique({
        where: { id: serverId },
        select: { id: true, ownerId: true },
    });

    if (!server) {
        res.status(404).json({
            success: false,
            error: 'Server not found',
        });
        return;
    }

    if (server.ownerId !== req.user.id) {
        res.status(403).json({
            success: false,
            error: 'Only server owner can perform this action',
        });
        return;
    }

    next();
}

/**
 * Middleware для проверки что пользователь является участником сервера
 * Используется для доступа к каналам и сообщениям
 */
export async function requireServerMember(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    if (!req.user) {
        res.status(401).json({
            success: false,
            error: 'Authentication required',
        });
        return;
    }

    const { serverId } = req.params;

    if (!serverId) {
        res.status(400).json({
            success: false,
            error: 'Server ID is required',
        });
        return;
    }

    const server = await prisma.server.findUnique({
        where: { id: serverId },
        select: {
            id: true,
            ownerId: true,
            members: {
                where: { userId: req.user.id },
                select: { id: true },
            },
        },
    });

    if (!server) {
        res.status(404).json({
            success: false,
            error: 'Server not found',
        });
        return;
    }

    // Проверяем: владелец или участник
    const isOwner = server.ownerId === req.user.id;
    const isMember = server.members.length > 0;

    if (!isOwner && !isMember) {
        res.status(403).json({
            success: false,
            error: 'You are not a member of this server',
        });
        return;
    }

    next();
}

/**
 * Middleware для проверки владельца канала
 * Канал может редактировать/удалять только тот, кто его создал
 */
export async function requireChannelOwner(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    if (!req.user) {
        res.status(401).json({
            success: false,
            error: 'Authentication required',
        });
        return;
    }

    const { channelId } = req.params;

    if (!channelId) {
        res.status(400).json({
            success: false,
            error: 'Channel ID is required',
        });
        return;
    }

    const channel = await prisma.channel.findUnique({
        where: { id: channelId },
        select: { id: true, createdById: true },
    });

    if (!channel) {
        res.status(404).json({
            success: false,
            error: 'Channel not found',
        });
        return;
    }

    if (channel.createdById !== req.user.id) {
        res.status(403).json({
            success: false,
            error: 'Only channel creator can perform this action',
        });
        return;
    }

    next();
}
