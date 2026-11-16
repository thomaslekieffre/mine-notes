import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { readFileSync } from 'node:fs'

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')) as { version: string }

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Numéro de version affiché dans les réglages : il vient de package.json.
  define: { __APP_VERSION__: JSON.stringify(pkg.version) },
  // Tauri attend le serveur de dev sur cette adresse exacte.
  server: { host: '127.0.0.1', port: 5173, strictPort: true },
  clearScreen: false,
})
