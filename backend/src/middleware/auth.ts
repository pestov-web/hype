import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { jwtConfig } from '../config/auth.js';
import { prisma } from '../config/database.js';

export interface AuthRequest extends Request {
    user?: {
        id: string;
        username: string;
        email: string | null;
    };
}

export interface JwtPayload {
    userId: string;
    username: string;
    email: string | null;
}

/**
 * Middleware для проверки JWT токена
 * Добавляет информацию о пользователе в req.user
 */
export async function authenticateJWT(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            res.status(401).json({
                success: false,
                error: 'No token provided',
            });
            return;
        }

        const token = authHeader.substring(7); // Remove 'Bearer ' prefix

        try {
            const decoded = jwt.verify(token, jwtConfig.secret) as JwtPayload;

            // Проверяем, что пользователь существует
            const user = await prisma.user.findUnique({
                where: { id: decoded.userId },
                select: {
                    id: true,
                    username: true,
                    email: true,
                },
            });

            if (!user) {
                res.status(401).json({
                    success: false,
                    error: 'User not found',
                });
                return;
            }

            req.user = user;
            next();
        } catch (error) {
            if (error instanceof jwt.TokenExpiredError) {
                res.status(401).json({
                    success: false,
                    error: 'Token expired',
                });
                return;
            }

            if (error instanceof jwt.JsonWebTokenError) {
                res.status(401).json({
                    success: false,
                    error: 'Invalid token',
                });
                return;
            }

            throw error;
        }
    } catch (error) {
        console.error('JWT authentication error:', error);
        res.status(500).json({
            success: false,
            error: 'Authentication failed',
        });
    }
}

/**
 * Optional JWT middleware - не возвращает ошибку если токен отсутствует
 * Используется для роутов, которые работают как с авторизованными, так и с гостями
 */
export async function optionalAuthenticateJWT(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            next();
            return;
        }

        const token = authHeader.substring(7);

        try {
            const decoded = jwt.verify(token, jwtConfig.secret) as JwtPayload;

            const user = await prisma.user.findUnique({
                where: { id: decoded.userId },
                select: {
                    id: true,
                    username: true,
                    email: true,
                },
            });

            if (user) {
                req.user = user;
            }
        } catch (error) {
            // Игнорируем ошибки токена для optional middleware
            console.log('Optional JWT check failed:', error);
        }

        next();
    } catch (error) {
        console.error('Optional JWT authentication error:', error);
        next();
    }
}
