import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource/inter/400.css'
import '@fontsource/inter/500.css'
import '@fontsource/inter/600.css'
import '@fontsource/kalam/400.css'
import '@fontsource/jetbrains-mono/400.css'
import 'katex/dist/katex.min.css'
import './styles.css'
import App from './App'
import { isMac, isTauri } from './store/platform'

// Polices d'Excalidraw servies localement (copiées par scripts/copy-excalidraw-assets.mjs).
;(window as unknown as { EXCALIDRAW_ASSET_PATH: string }).EXCALIDRAW_ASSET_PATH = '/excalidraw-assets/'

if (isTauri()) document.documentElement.classList.add('tauri')
if (isMac) document.documentElement.classList.add('mac')

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
