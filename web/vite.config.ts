import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// The API server port. Defaults to 8711 (docker-compose / CI); override with
// VITE_API_PORT or VITE_API_BASE when running E2E with an isolated API port.
const API_TARGET =
  process.env.VITE_API_BASE ||
  `http://127.0.0.1:${process.env.VITE_API_PORT || process.env.API_PORT || '8711'}`;

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5184,
    proxy: {
      '/api': {
        target: API_TARGET,
        changeOrigin: true,
      },
      '/docs': {
        target: API_TARGET,
        changeOrigin: true,
      },
      '/openapi.json': {
        target: API_TARGET,
        changeOrigin: true,
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    chunkSizeWarningLimit: 700,
    rollupOptions: {
      output: {
        // rolldown-vite: `advancedChunks` groups are honored for SHARED modules
        // (function-form `manualChunks` is only a soft hint — React core was
        // being hoisted into the `editor` chunk, making the 600 kB editor
        // bundle eager on every page load). Grouping React into `vendor`
        // FIRST keeps jsx-runtime etc. out of the lazy editor chunk.
        advancedChunks: {
          groups: [
            {
              name: 'vendor',
              test: /\/node_modules\/(react(-dom)?|react-router|scheduler|react-is)\//,
            },
            {
              name: 'editor',
              test: /\/node_modules\/(@tiptap|prosemirror)\//,
            },
            {
              name: 'katex',
              test: /\/node_modules\/katex\//,
            },
          ],
        },
      },
    },
  },
});
