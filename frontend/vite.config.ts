import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    allowedHosts: ['griffin-hierogrammatical-weakly.ngrok-free.dev'],
  },
  define: {
    'process.env': {},
    global: 'globalThis',
    'globalThis.Buffer': 'globalThis.Buffer',
  },
  resolve: {
    alias: {
      buffer: 'buffer/',
    },
  },
  optimizeDeps: {
    include: ['buffer'],
  },
});