import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
    plugins: [react()],
    server: {
        fs: {
            allow: [path.resolve(__dirname, '../..')],
        },
    },
    test: {
        environment: 'jsdom',
        globals: true,
        setupFiles: ['./tests/setup.ts'],
        include: [
            './tests/unit/**/*.test.{ts,tsx}',
            './tests/integration/**/*.test.{ts,tsx}',
            './tests/contract/**/*.test.{ts,tsx}',
        ],
    },
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src'),
        },
    },
});
