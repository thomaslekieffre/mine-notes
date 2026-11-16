import { useEffect, useRef } from 'react'
import { exportMarkdown, safe } from './markdown'
import { isTauri } from './platform'
import type { TreeNode } from './tree'

// Dossier miroir : l'arborescence de Mine recopiée sur le disque (dossiers, projets, notes en .md).
// L'app garde sa base interne ; le dossier est une copie lisible. Mine ne supprime que les fichiers qu'elle a écrits.

const PATH_KEY = 'mine-mirror-path'
const FILES_KEY = 'mine-mirror-files'

const read = (k: string) => {
  try {
    return localStorage.getItem(k)
  } catch {
    return null
  }
}
const write = (k: string, v: string | null) => {
  try {
    if (v === null) localStorage.removeItem(k)
    else localStorage.setItem(k, v)
  } catch {
    /* stockage indisponible : on ignore */
  }
}

export const getMirrorPath = () => read(PATH_KEY)
export function setMirrorPath(path: string | null) {
  write(PATH_KEY, path)
  write(FILES_KEY, null)
  last.clear()
}

const last = new Map<string, string>() // contenu déjà écrit pendant cette session
const join = (base: string, rel: string) => `${base.replace(/\/+$/, '')}/${rel}`

function dirsOf(nodes: TreeNode[]): string[] {
  const byId = new Map(nodes.map((n) => [n.id, n]))
  const out: string[] = []
  for (const n of nodes) {
    if (n.type === 'note') continue
    const parts: string[] = []
    let p: TreeNode | undefined = n
    while (p) {
      parts.unshift(safe(p.name))
      p = p.parentId ? byId.get(p.parentId) : undefined
    }
    out.push(parts.join('/'))
  }
  return out
}

export interface MirrorResult {
  written: number
  removed: number
}

/** Recopie l'arborescence dans le dossier choisi. */
export async function syncMirror(nodes: TreeNode[]): Promise<MirrorResult> {
  const base = getMirrorPath()
  if (!base || !isTauri()) return { written: 0, removed: 0 }
  const { mkdir, writeTextFile, remove } = await import('@tauri-apps/plugin-fs')

  const files = await exportMarkdown(nodes)
  const dirs = dirsOf(nodes)
  const previous: { files: string[]; dirs: string[] } = JSON.parse(read(FILES_KEY) ?? '{"files":[],"dirs":[]}')

  await mkdir(base, { recursive: true })
  for (const d of dirs) await mkdir(join(base, d), { recursive: true })

  let written = 0
  for (const [rel, text] of files) {
    if (last.get(rel) === text) continue
    await writeTextFile(join(base, rel), text)
    last.set(rel, text)
    written++
  }

  let removed = 0
  for (const rel of previous.files) {
    if (files.has(rel)) continue
    try {
      await remove(join(base, rel))
      removed++
    } catch {
      /* déjà supprimé à la main */
    }
    last.delete(rel)
  }
  // Dossiers d'avant qui n'existent plus : on ne retire que ceux qui sont vides.
  const keep = new Set([...dirs, ...[...files.keys()].flatMap((f) => f.split('/').slice(0, -1).map((_, i, a) => a.slice(0, i + 1).join('/')))])
  for (const d of previous.dirs.sort((a, b) => b.length - a.length)) {
    if (keep.has(d)) continue
    try {
      await remove(join(base, d))
    } catch {
      /* pas vide ou déjà parti : on le laisse */
    }
  }
  write(FILES_KEY, JSON.stringify({ files: [...files.keys()], dirs: [...keep] }))
  return { written, removed }
}

/** Lance la copie en arrière-plan (au démarrage puis toutes les 10 s) quand un dossier est choisi. */
export function useMirror(nodes: TreeNode[], ready: boolean) {
  const ref = useRef(nodes)
  ref.current = nodes
  useEffect(() => {
    if (!ready || !isTauri()) return
    let busy = false
    const run = async () => {
      if (busy || !getMirrorPath()) return
      busy = true
      try {
        await syncMirror(ref.current)
      } catch (e) {
        console.warn('Dossier miroir :', e)
      } finally {
        busy = false
      }
    }
    void run()
    const t = setInterval(run, 10_000)
    return () => clearInterval(t)
  }, [ready])
}
