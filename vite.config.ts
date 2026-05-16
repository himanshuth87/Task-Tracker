import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  appType: 'spa',         // serve index.html for all routes (SPA fallback)
  server: { port: 5173 },
  preview: { port: 4173 },
})
