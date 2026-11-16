import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Tauri attend le serveur de dev sur cette adresse exacte.
  server: { host: '127.0.0.1', port: 5173, strictPort: true },
  clearScreen: false,
})
