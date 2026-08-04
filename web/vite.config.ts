import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5184,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8711',
        changeOrigin: true,
      },
      '/docs': {
        target: 'http://127.0.0.1:8711',
        changeOrigin: true,
      },
      '/openapi.json': {
        target: 'http://127.0.0.1:8711',
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
