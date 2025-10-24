module.exports = {
    apps: [
        {
            name: 'hype-backend',
            cwd: './backend',
            script: 'dist/index.js',
            instances: 1,
            exec_mode: 'fork',
            env: {
                NODE_ENV: 'production',
                PORT: 3001,
                WS_PORT: 8080,
            },
            error_file: './logs/backend-error.log',
            out_file: './logs/backend-out.log',
            log_date_format: 'YYYY-MM-DD HH:mm:ss',
            max_memory_restart: '1G',
            restart_delay: 4000,
            autorestart: true,
            watch: false,
        },
    ],
};
