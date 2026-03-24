import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      '/classify': 'http://localhost:8000',
      '/models': 'http://localhost:8000',
      '/test-cases': 'http://localhost:8000',
      '/batch': 'http://localhost:8000',
      '/export': 'http://localhost:8000',
      '/cache': 'http://localhost:8000',
      '/health': 'http://localhost:8000',
    },
  },
})
