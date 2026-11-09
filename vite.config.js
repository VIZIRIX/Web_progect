import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  root: 'client',
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'client/index.html'),
        calendar: resolve(__dirname, 'client/calendar/booking.html'),
      },
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:5000',
    },
  },
});