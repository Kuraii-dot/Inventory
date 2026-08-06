// frontend/vite.config.js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  clearScreen: false,
  plugins: [
    react(),
    tailwindcss(),  // Tailwind v4 — replaces postcss.config.js entirely
  ],
  server: {
    strictPort: true,
    port: 5173,
    proxy: {
      // Proxy all /api requests to Express during development
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
    },
  },
});
