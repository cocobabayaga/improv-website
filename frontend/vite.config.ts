import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: true,
    https: false, // Enable for WebRTC in production
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
})
