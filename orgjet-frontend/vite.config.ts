import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/auth': { target: 'http://localhost:3000', changeOrigin: true },
      '/me': { target: 'http://localhost:3000', changeOrigin: true },
      '/requests': { target: 'http://localhost:3000', changeOrigin: true },
      '/board': { target: 'http://localhost:3000', changeOrigin: true },
    }
  },
})
