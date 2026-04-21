/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    css: true,
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          // recharts + d3 + lodash (~660 KB) — only used in analytics pages
          if (
            id.includes('node_modules/recharts') ||
            id.includes('node_modules/d3-') ||
            id.includes('node_modules/lodash') ||
            id.includes('node_modules/decimal.js') ||
            id.includes('node_modules/react-smooth') ||
            id.includes('node_modules/recharts-scale') ||
            id.includes('node_modules/eventemitter3') ||
            id.includes('node_modules/fast-equals')
          ) {
            return 'vendor-charts';
          }
          // react-markdown + micromark ecosystem (~180 KB) — only used in AI page
          if (
            id.includes('node_modules/react-markdown') ||
            id.includes('node_modules/micromark') ||
            id.includes('node_modules/mdast-util') ||
            id.includes('node_modules/hast-util') ||
            id.includes('node_modules/unified') ||
            id.includes('node_modules/vfile') ||
            id.includes('node_modules/unist-util') ||
            id.includes('node_modules/property-information') ||
            id.includes('node_modules/trough') ||
            id.includes('node_modules/@ungap')
          ) {
            return 'vendor-markdown';
          }
          // zod (~130 KB) — used by shared schemas
          if (id.includes('node_modules/zod')) {
            return 'vendor-zod';
          }
        },
      },
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3000', // Direcionado ao Backend local via Proxy
        changeOrigin: true,
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
