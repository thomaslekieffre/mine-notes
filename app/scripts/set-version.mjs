// Change le numéro de version partout d'un coup : npm run set-version -- 0.3.0
// (package.json, package-lock.json, src-tauri/tauri.conf.json, src-tauri/Cargo.toml).
// L'app affiche la version de package.json dans les réglages.
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const v = process.argv[2]
if (!/^\d+\.\d+\.\d+$/.test(v ?? '')) {
  console.error('Usage : npm run set-version -- X.Y.Z   (ex. 0.3.0)')
  process.exit(1)
}
const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const jsonFile = (rel, edit) => {
  const path = join(root, rel)
  const data = JSON.parse(readFileSync(path, 'utf8'))
  edit(data)
  writeFileSync(path, JSON.stringify(data, null, 2) + '\n')
}

jsonFile('package.json', (d) => (d.version = v))
jsonFile('package-lock.json', (d) => {
  d.version = v
  if (d.packages?.['']) d.packages[''].version = v
})
jsonFile('src-tauri/tauri.conf.json', (d) => (d.version = v))

const cargo = join(root, 'src-tauri/Cargo.toml')
writeFileSync(cargo, readFileSync(cargo, 'utf8').replace(/^version = ".*"$/m, `version = "${v}"`))
console.log(`Version ${v} appliquée.`)
