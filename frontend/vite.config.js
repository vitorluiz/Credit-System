import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Vite configuration. The dev server proxies API requests to the
// backend service within the Docker network. In production the
// compiled front‑end is served by nginx in its own container, so the
// proxy here only affects local development.
export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://backend:4000',
        changeOrigin: true,
        secure: false
      }
    }
  }
});
