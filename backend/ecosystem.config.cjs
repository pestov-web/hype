// PM2 Ecosystem Configuration
// Usage: pm2 start ecosystem.config.cjs --env production

module.exports = {
    apps: [
        {
            name: 'hype-backend',
            script: './dist/index.js',
            cwd: '/home/mwk/hype/backend', // Adjust to your path
            instances: 1,
            exec_mode: 'fork', // Use 'cluster' for multi-core scaling
            max_memory_restart: '1G',
            autorestart: true,
            watch: false,
            error_file: './logs/backend-error.log',
            out_file: './logs/backend-out.log',
            log_date_format: 'YYYY-MM-DD HH:mm:ss',

            // Environment variables for production
            env_production: {
                NODE_ENV: 'production',

                // Server ports
                PORT: 3001,
                WS_PORT: 8080,

                // SFU Configuration (CRITICAL for WebRTC)
                SFU_ANNOUNCED_IP: '185.128.105.95', // ⚠️ REPLACE with your server's public IP
                RTC_MIN_PORT: 40000,
                RTC_MAX_PORT: 49999,
                SFU_LOG_LEVEL: 'warn',

                // Node identification
                NODE_ID: 'sfu-1',
                NODE_REGION: 'eu-west-1',

                // Frontend URL for CORS
                FRONTEND_URL: 'https://voice.pestov-web.ru',

                // Database
                DATABASE_URL: 'postgresql://user:password@localhost:5435/hype_db?schema=public', // ⚠️ Update credentials

                // JWT secrets (⚠️ CHANGE IN PRODUCTION!)
                JWT_SECRET: 'your-super-secret-jwt-key-change-in-production',
                JWT_REFRESH_SECRET: 'your-super-secret-refresh-key-change-in-production',
                JWT_EXPIRES_IN: '15m',
                JWT_REFRESH_EXPIRES_IN: '7d',

                // MinIO (optional)
                MINIO_ENDPOINT: 'localhost',
                MINIO_PORT: 9000,
                MINIO_ACCESS_KEY: 'minioadmin',
                MINIO_SECRET_KEY: 'minioadmin',
                MINIO_BUCKET_NAME: 'hype-uploads',
                MINIO_USE_SSL: false,
            },

            // Development environment (for local testing)
            env_development: {
                NODE_ENV: 'development',
                PORT: 3001,
                WS_PORT: 8080,
                FRONTEND_URL: 'http://localhost:5173',
                SFU_LOG_LEVEL: 'debug',
                DATABASE_URL: 'postgresql://user:password@localhost:5435/hype_db?schema=public',
            },
        },
    ],

    // Deployment configuration (optional)
    deploy: {
        production: {
            user: 'mwk',
            host: '185.128.105.95',
            ref: 'origin/develop',
            repo: 'git@github.com:pestov-web/hype.git',
            path: '/home/mwk/hype',
            'pre-deploy-local': '',
            'post-deploy':
                'cd backend && pnpm install --frozen-lockfile && pnpm build && pm2 reload ecosystem.config.cjs --env production',
            'pre-setup': '',
        },
    },
};
