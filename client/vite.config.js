import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      '/api': 'http://localhost:3001',
      '/inventory': 'http://localhost:3001',
      '/sales': 'http://localhost:3001',
      '/overhead': 'http://localhost:3001',
      '/settings': 'http://localhost:3001',
      '/health': 'http://localhost:3001'
    }
  }
});
