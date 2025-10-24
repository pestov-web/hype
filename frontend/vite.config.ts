import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import electron from 'vite-plugin-electron';
import renderer from 'vite-plugin-electron-renderer';
import { viteStaticCopy } from 'vite-plugin-static-copy';

// Check if we should enable Electron (via environment variable)
const ENABLE_ELECTRON = process.env.ENABLE_ELECTRON === 'true';

console.log('=== Vite Config ===');
console.log('ENABLE_ELECTRON:', ENABLE_ELECTRON);
console.log('NODE_ENV:', process.env.NODE_ENV);

// https://vite.dev/config/W
export default defineConfig(({ command }) => {
    const isDev = command === 'serve';

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const plugins: any[] = [react()];

    // Copy onnxruntime-web WASM files to dist (for both web and Electron builds)
    plugins.push(
        viteStaticCopy({
            targets: [
                {
                    src: 'node_modules/onnxruntime-web/dist/*.wasm',
                    dest: 'onnxruntime-web',
                },
                {
                    src: 'node_modules/onnxruntime-web/dist/*.mjs',
                    dest: 'onnxruntime-web',
                },
            ],
        })
    );

    // Only add Electron plugins if explicitly enabled
    if (ENABLE_ELECTRON) {
        const electronPlugins = electron([
            {
                entry: 'electron/main.ts',
                onstart(options) {
                    if (command === 'serve') {
                        options.startup();
                    }
                },
                vite: {
                    build: {
                        outDir: 'dist-electron/main',
                        minify: !isDev,
                        sourcemap: isDev,
                        target: 'node20',
                    },
                },
            },
            {
                entry: 'electron/preload.ts',
                onstart(options) {
                    if (command === 'serve') {
                        options.reload();
                    }
                },
                vite: {
                    build: {
                        outDir: 'dist-electron/preload',
                        minify: !isDev,
                        sourcemap: isDev,
                        target: 'node20',
                    },
                },
            },
        ]);

        if (Array.isArray(electronPlugins)) {
            plugins.push(...electronPlugins);
        } else {
            plugins.push(electronPlugins);
        }

        plugins.push(renderer());
    }

    return {
        plugins,
        base: ENABLE_ELECTRON ? './' : '/',
        resolve: {
            alias: {
                '@app': path.resolve(__dirname, './src/app'),
                '@pages': path.resolve(__dirname, './src/pages'),
                '@widgets': path.resolve(__dirname, './src/widgets'),
                '@features': path.resolve(__dirname, './src/features'),
                '@entities': path.resolve(__dirname, './src/entities'),
                '@shared': path.resolve(__dirname, './src/shared'),
            },
        },
        css: {
            modules: {
                localsConvention: 'camelCase',
                generateScopedName: '[name]__[local]__[hash:base64:5]',
            },
            preprocessorOptions: {
                scss: {
                    additionalData: `@use "@shared/styles/variables" as *; @use "@shared/styles/mixins" as *;`,
                },
            },
        },
        assetsInclude: ['**/*.onnx', '**/*.wasm'],
        build: {
            sourcemap: false,
        },
        server: {
            proxy: {
                '/api': {
                    target: 'http://localhost:3001',
                    changeOrigin: true,
                },
                '/auth': {
                    target: 'http://localhost:3001',
                    changeOrigin: true,
                },
            },
        },
    };
});
