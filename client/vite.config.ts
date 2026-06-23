import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 4000,
    proxy: {
      '/health':  { target: 'http://localhost:3000', changeOrigin: true },
      '/metrics': { target: 'http://localhost:3000', changeOrigin: true },
      '/test':    { target: 'http://localhost:3000', changeOrigin: true },
      '/api':     { target: 'http://localhost:3000', changeOrigin: true },
    },
  },
})
