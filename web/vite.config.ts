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
        manualChunks(id: string) {
          if (
            id.includes('node_modules/react') ||
            id.includes('node_modules/react-dom') ||
            id.includes('node_modules/react-router')
          ) {
            return 'vendor';
          }
          if (id.includes('@tiptap') || id.includes('prosemirror')) {
            return 'editor';
          }
          if (id.includes('node_modules/katex')) {
            return 'katex';
          }
        },
      },
    },
  },
});
