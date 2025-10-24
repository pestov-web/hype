import type { Express } from 'express';
import { channelRoutes } from './channels.js';
import { userRoutes } from './users.js';
import { messageRoutes } from './messages.js';
import serversRouter from './servers.js';
import { authRoutes } from './auth.js';
import voiceRoutes from './voice.js';

export function setupRoutes(app: Express) {
    // Auth routes (no /api prefix for auth)
    app.use('/auth', authRoutes);

    // API prefix
    const apiPrefix = '/api';

    // Register route modules
    app.use(`${apiPrefix}/servers`, serversRouter);
    app.use(`${apiPrefix}/channels`, channelRoutes);
    app.use(`${apiPrefix}/users`, userRoutes);
    app.use(`${apiPrefix}/messages`, messageRoutes);
    app.use(`${apiPrefix}/voice`, voiceRoutes);

    // API info endpoint
    app.get(`${apiPrefix}`, (req, res) => {
        res.json({
            name: 'Hype API',
            version: '1.0.0',
            description: 'Discord-like communication platform API',
            endpoints: {
                servers: `${apiPrefix}/servers`,
                channels: `${apiPrefix}/channels`,
                users: `${apiPrefix}/users`,
                messages: `${apiPrefix}/messages`,
                voice: `${apiPrefix}/voice`,
            },
        });
    });
}
