import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'node:path';

const apiPort = process.env.API_PORT || '3000';
const apiTarget = `http://localhost:${apiPort}`;

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
      '@fluxmaster/api-types': path.resolve(__dirname, '../server/src/shared/index.ts'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': apiTarget,
      '/ws': {
        target: `ws://localhost:${apiPort}`,
        ws: true,
      },
    },
  },
  build: {
    outDir: 'dist',
  },
});
