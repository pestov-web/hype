import { Router } from 'express';
import type { Request, Response, Router as ExpressRouter } from 'express';
import { z } from 'zod';
import { authenticateJWT, type AuthRequest } from '../middleware/auth.js';
import { registerUser, loginUser, loginAsGuest, refreshTokens } from '../services/authService.js';
import { prisma } from '../config/database.js';

export const authRoutes: ExpressRouter = Router();

// ============================================
// VALIDATION SCHEMAS
// ============================================

const registerSchema = z.object({
    username: z
        .string()
        .min(3)
        .max(32)
        .regex(/^[a-zA-Z0-9_-]+$/),
    email: z.string().email(),
    password: z.string().min(8).max(128),
});

const loginSchema = z.object({
    email: z.string().email(),
    password: z.string().min(1),
});

const guestLoginSchema = z.object({
    username: z
        .string()
        .min(3)
        .max(32)
        .regex(/^[a-zA-Z0-9_-]+$/),
});

const refreshSchema = z.object({
    refreshToken: z.string(),
});

// ============================================
// AUTH ROUTES
// ============================================

// POST /auth/register - Регистрация нового пользователя
authRoutes.post('/register', async (req: Request, res: Response) => {
    try {
        const data = registerSchema.parse(req.body);

        const result = await registerUser(data);

        res.status(201).json({
            success: true,
            data: {
                user: result.user,
                accessToken: result.tokens.accessToken,
                refreshToken: result.tokens.refreshToken,
            },
        });
    } catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({
                success: false,
                error: 'Validation failed',
                details: error.issues,
            });
        }

        if (error instanceof Error) {
            return res.status(400).json({
                success: false,
                error: error.message,
            });
        }

        res.status(500).json({
            success: false,
            error: 'Registration failed',
        });
    }
});

// POST /auth/login - Вход по email/password
authRoutes.post('/login', async (req: Request, res: Response) => {
    try {
        const data = loginSchema.parse(req.body);

        const result = await loginUser(data);

        res.json({
            success: true,
            data: {
                user: result.user,
                accessToken: result.tokens.accessToken,
                refreshToken: result.tokens.refreshToken,
            },
        });
    } catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({
                success: false,
                error: 'Validation failed',
                details: error.issues,
            });
        }

        if (error instanceof Error) {
            return res.status(401).json({
                success: false,
                error: error.message,
            });
        }

        res.status(500).json({
            success: false,
            error: 'Login failed',
        });
    }
});

// POST /auth/guest - Гостевой вход
authRoutes.post('/guest', async (req: Request, res: Response) => {
    try {
        const data = guestLoginSchema.parse(req.body);

        const result = await loginAsGuest(data);

        res.json({
            success: true,
            data: {
                user: result.user,
                accessToken: result.tokens.accessToken,
                refreshToken: result.tokens.refreshToken,
            },
        });
    } catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({
                success: false,
                error: 'Validation failed',
                details: error.issues,
            });
        }

        if (error instanceof Error) {
            return res.status(400).json({
                success: false,
                error: error.message,
            });
        }

        res.status(500).json({
            success: false,
            error: 'Guest login failed',
        });
    }
});

// POST /auth/refresh - Обновление access token
authRoutes.post('/refresh', async (req: Request, res: Response) => {
    try {
        const data = refreshSchema.parse(req.body);

        const tokens = await refreshTokens(data.refreshToken);

        res.json({
            success: true,
            data: tokens,
        });
    } catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({
                success: false,
                error: 'Validation failed',
                details: error.issues,
            });
        }

        if (error instanceof Error) {
            return res.status(401).json({
                success: false,
                error: error.message,
            });
        }

        res.status(500).json({
            success: false,
            error: 'Token refresh failed',
        });
    }
});

// GET /auth/me - Получить текущего пользователя (требует авторизации)
authRoutes.get('/me', authenticateJWT, async (req: AuthRequest, res: Response) => {
    try {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                error: 'Not authenticated',
            });
        }

        // Получаем полные данные пользователя из БД
        const user = await prisma.user.findUnique({
            where: { id: req.user.id },
            select: {
                id: true,
                username: true,
                displayName: true,
                email: true,
                avatarUrl: true,
                status: true,
                createdAt: true,
                isOnline: true,
            },
        });

        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'User not found',
            });
        }

        res.json({
            success: true,
            data: {
                user: {
                    id: user.id,
                    username: user.username,
                    displayName: user.displayName,
                    email: user.email,
                    avatarUrl: user.avatarUrl,
                    status: user.status,
                    createdAt: user.createdAt.toISOString(),
                },
            },
        });
    } catch (error) {
        console.error('Failed to get user:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get user',
        });
    }
});

// POST /auth/logout - Выход (в будущем - инвалидация токена)
authRoutes.post('/logout', authenticateJWT, async (req: AuthRequest, res: Response) => {
    try {
        // TODO: В продакшене добавить blacklist токенов в Redis
        // Пока просто возвращаем success

        res.json({
            success: true,
            message: 'Logged out successfully',
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Logout failed',
        });
    }
});
