import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { prisma } from '../config/database.js';
import { jwtConfig } from '../config/auth.js';
import type { User } from '@prisma/client';

const SALT_ROUNDS = 10;

export interface TokenPair {
    accessToken: string;
    refreshToken: string;
}

export interface UserResponse {
    id: string;
    username: string;
    displayName: string | null;
    email: string | null;
    avatarUrl: string | null;
    status: string;
    createdAt: Date;
}

/**
 * Генерация пары JWT токенов (access + refresh)
 */
export function generateTokens(user: Pick<User, 'id' | 'username' | 'email'>): TokenPair {
    const payload = {
        userId: user.id,
        username: user.username,
        email: user.email,
    };

    // Используем упрощенный вариант без типизации options
    const accessToken = jwt.sign(payload, jwtConfig.secret, { expiresIn: '15m' } as any);
    const refreshToken = jwt.sign(payload, jwtConfig.refreshSecret, { expiresIn: '7d' } as any);

    return { accessToken, refreshToken };
}

/**
 * Хеширование пароля
 */
export async function hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, SALT_ROUNDS);
}

/**
 * Проверка пароля
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
}

/**
 * Регистрация пользователя с email/password
 */
export async function registerUser(data: {
    username: string;
    email: string;
    password: string;
}): Promise<{ user: UserResponse; tokens: TokenPair }> {
    // Проверка на существование
    const existingUser = await prisma.user.findFirst({
        where: {
            OR: [{ username: data.username }, { email: data.email }],
        },
    });

    if (existingUser) {
        if (existingUser.username === data.username) {
            throw new Error('Username already taken');
        }
        throw new Error('Email already registered');
    }

    // Хеширование пароля
    const passwordHash = await hashPassword(data.password);

    // Создание пользователя
    const user = await prisma.user.create({
        data: {
            username: data.username,
            email: data.email,
            passwordHash,
            displayName: data.username,
            status: 'ONLINE',
            isOnline: true,
        },
    });

    // Генерация токенов
    const tokens = generateTokens(user);

    return {
        user: formatUserResponse(user),
        tokens,
    };
}

/**
 * Вход пользователя с email/password
 */
export async function loginUser(data: {
    email: string;
    password: string;
}): Promise<{ user: UserResponse; tokens: TokenPair }> {
    // Поиск пользователя
    const user = await prisma.user.findUnique({
        where: { email: data.email },
    });

    if (!user || !user.passwordHash) {
        throw new Error('Invalid email or password');
    }

    // Проверка пароля
    const isValidPassword = await verifyPassword(data.password, user.passwordHash);

    if (!isValidPassword) {
        throw new Error('Invalid email or password');
    }

    // Обновление статуса
    await prisma.user.update({
        where: { id: user.id },
        data: {
            status: 'ONLINE',
            isOnline: true,
            lastSeenAt: new Date(),
        },
    });

    // Генерация токенов
    const tokens = generateTokens(user);

    return {
        user: formatUserResponse(user),
        tokens,
    };
}

/**
 * Гостевой вход (временный пользователь)
 */
export async function loginAsGuest(data: { username: string }): Promise<{ user: UserResponse; tokens: TokenPair }> {
    // Проверка на существование username
    const existingUser = await prisma.user.findUnique({
        where: { username: data.username },
    });

    if (existingUser) {
        throw new Error('Username already taken');
    }

    // Создание гостевого пользователя (без пароля и email)
    const user = await prisma.user.create({
        data: {
            username: data.username,
            displayName: data.username, // Без префикса "Guest"
            isGuest: true, // Помечаем как гостя
            status: 'ONLINE',
            isOnline: true,
        },
    });

    // Генерация токенов
    const tokens = generateTokens(user);

    return {
        user: formatUserResponse(user),
        tokens,
    };
}

/**
 * Обновление токенов по refresh token
 */
export async function refreshTokens(refreshToken: string): Promise<TokenPair> {
    try {
        const decoded = jwt.verify(refreshToken, jwtConfig.refreshSecret) as {
            userId: string;
            username: string;
            email: string | null;
        };

        // Проверка существования пользователя
        const user = await prisma.user.findUnique({
            where: { id: decoded.userId },
            select: { id: true, username: true, email: true },
        });

        if (!user) {
            throw new Error('User not found');
        }

        // Генерация новых токенов
        return generateTokens(user);
    } catch (error) {
        if (error instanceof jwt.TokenExpiredError) {
            throw new Error('Refresh token expired');
        }
        if (error instanceof jwt.JsonWebTokenError) {
            throw new Error('Invalid refresh token');
        }
        throw error;
    }
}

/**
 * OAuth: Найти или создать пользователя
 */
export async function findOrCreateOAuthUser(data: {
    provider: 'github' | 'google' | 'discord';
    providerId: string;
    username: string;
    email?: string;
    avatarUrl?: string;
}): Promise<{ user: UserResponse; tokens: TokenPair; isNewUser: boolean }> {
    const providerIdField = `${data.provider}Id` as 'githubId' | 'googleId' | 'discordId';

    // Поиск существующего пользователя
    let user = await prisma.user.findFirst({
        where: {
            OR: [{ [providerIdField]: data.providerId }, data.email ? { email: data.email } : {}],
        },
    });

    let isNewUser = false;

    if (user) {
        // Обновление provider ID если еще не установлен
        if (!user[providerIdField]) {
            user = await prisma.user.update({
                where: { id: user.id },
                data: { [providerIdField]: data.providerId },
            });
        }
    } else {
        // Создание нового пользователя
        isNewUser = true;
        user = await prisma.user.create({
            data: {
                [providerIdField]: data.providerId,
                username: await generateUniqueUsername(data.username),
                displayName: data.username,
                email: data.email,
                avatarUrl: data.avatarUrl,
                status: 'ONLINE',
                isOnline: true,
            },
        });
    }

    // Обновление статуса
    await prisma.user.update({
        where: { id: user.id },
        data: {
            status: 'ONLINE',
            isOnline: true,
            lastSeenAt: new Date(),
        },
    });

    const tokens = generateTokens(user);

    return {
        user: formatUserResponse(user),
        tokens,
        isNewUser,
    };
}

/**
 * Генерация уникального username (добавляет числа если занят)
 */
async function generateUniqueUsername(baseUsername: string): Promise<string> {
    let username = baseUsername;
    let counter = 1;

    while (await prisma.user.findUnique({ where: { username } })) {
        username = `${baseUsername}${counter}`;
        counter++;
    }

    return username;
}

/**
 * Форматирование ответа пользователя (скрывает приватные данные)
 */
function formatUserResponse(user: User): UserResponse {
    return {
        id: user.id,
        username: user.username,
        displayName: user.displayName,
        email: user.email,
        avatarUrl: user.avatarUrl,
        status: user.status,
        createdAt: user.createdAt,
    };
}
