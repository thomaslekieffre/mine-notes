// Excalidraw charge ses polices depuis un CDN par défaut. Pour que Mine marche hors ligne,
// on les copie dans public/ (hors police CJK, très lourde) avant dev et build.
import { cpSync, mkdirSync, readdirSync, rmSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const src = join(root, 'node_modules/@excalidraw/excalidraw/dist/prod/fonts')
const dest = join(root, 'public/excalidraw-assets/fonts')

rmSync(dest, { recursive: true, force: true })
mkdirSync(dest, { recursive: true })
for (const name of readdirSync(src)) {
  if (name === 'Xiaolai') continue
  cpSync(join(src, name), join(dest, name), { recursive: true })
}
console.log('Polices Excalidraw copiées dans public/excalidraw-assets/fonts')

// MathLive (saisie visuelle des formules) charge ses polices depuis un CDN par défaut : on les sert en local.
const mlSrc = join(root, 'node_modules/mathlive/fonts')
const mlDest = join(root, 'public/mathlive/fonts')
rmSync(mlDest, { recursive: true, force: true })
mkdirSync(mlDest, { recursive: true })
cpSync(mlSrc, mlDest, { recursive: true })
console.log('Polices MathLive copiées dans public/mathlive/fonts')
