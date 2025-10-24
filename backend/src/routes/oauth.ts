import { Router } from 'express';
import type { Request, Response, Router as ExpressRouter } from 'express';
import { GitHub } from 'arctic';
import { oauthConfig } from '../config/auth.js';
import { findOrCreateOAuthUser } from '../services/authService.js';

export const oauthRoutes: ExpressRouter = Router();

// ============================================
// OAUTH CLIENTS
// ============================================

const github = oauthConfig.github.clientId
    ? new GitHub(oauthConfig.github.clientId, oauthConfig.github.clientSecret, oauthConfig.github.callbackURL)
    : null;

// TODO: Add Google and Discord OAuth with proper PKCE flow
// Google and Discord require code_verifier for Arctic
// For now, start with GitHub which works out of the box

// ============================================
// GITHUB OAUTH
// ============================================

// GET /auth/github - Редирект на GitHub OAuth
oauthRoutes.get('/github', (req: Request, res: Response) => {
    if (!github) {
        return res.status(500).json({
            success: false,
            error: 'GitHub OAuth is not configured',
        });
    }

    const state = generateState();
    const url = github.createAuthorizationURL(state, ['user:email']);

    // В продакшене сохраняйте state в session или Redis
    res.cookie('github_oauth_state', state, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: 600000, // 10 minutes
    });

    res.redirect(url.toString());
});

// GET /auth/github/callback - Callback от GitHub
oauthRoutes.get('/github/callback', async (req: Request, res: Response) => {
    if (!github) {
        return res.status(500).json({
            success: false,
            error: 'GitHub OAuth is not configured',
        });
    }

    const { code, state } = req.query;
    const savedState = req.cookies.github_oauth_state;

    if (!code || !state || state !== savedState) {
        return res.status(400).json({
            success: false,
            error: 'Invalid OAuth state',
        });
    }

    try {
        const tokens = await github.validateAuthorizationCode(code as string);

        // Получить данные пользователя от GitHub
        const githubUserResponse = await fetch('https://api.github.com/user', {
            headers: {
                Authorization: `Bearer ${tokens.accessToken()}`,
            },
        });

        if (!githubUserResponse.ok) {
            throw new Error('Failed to fetch GitHub user');
        }

        const githubUser = (await githubUserResponse.json()) as {
            id: number;
            login: string;
            email: string | null;
            avatar_url: string;
        };

        // Получить email если он приватный
        let email = githubUser.email;
        if (!email) {
            const emailResponse = await fetch('https://api.github.com/user/emails', {
                headers: {
                    Authorization: `Bearer ${tokens.accessToken()}`,
                },
            });

            if (emailResponse.ok) {
                const emails = (await emailResponse.json()) as Array<{
                    email: string;
                    primary: boolean;
                    verified: boolean;
                }>;
                const primaryEmail = emails.find((e) => e.primary && e.verified);
                email = primaryEmail?.email || null;
            }
        }

        // Создать или найти пользователя
        const result = await findOrCreateOAuthUser({
            provider: 'github',
            providerId: githubUser.id.toString(),
            username: githubUser.login,
            email: email || undefined,
            avatarUrl: githubUser.avatar_url,
        });

        // Редирект на фронтенд с токенами
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
        const redirectUrl = `${frontendUrl}/auth/callback?access_token=${result.tokens.accessToken}&refresh_token=${result.tokens.refreshToken}&is_new_user=${result.isNewUser}`;

        res.clearCookie('github_oauth_state');
        res.redirect(redirectUrl);
    } catch (error) {
        console.error('GitHub OAuth error:', error);
        res.status(500).json({
            success: false,
            error: 'GitHub authentication failed',
        });
    }
});

// ============================================
// GOOGLE & DISCORD - TODO
// ============================================
// Google и Discord требуют PKCE flow с code_verifier
// Можно реализовать позже или использовать Passport.js для них

// ============================================
// HELPERS
// ============================================

function generateState(): string {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}
