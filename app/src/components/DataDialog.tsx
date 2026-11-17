import { useRef, useState } from 'react'
import { getMirrorPath, setMirrorPath, syncMirror } from '../store/mirror'
import { Icon } from './Icon'
import { createBackup, restoreBackup } from '../store/backup'
import { exportMarkdownFull } from '../store/markdown'
import { isTauri } from '../store/platform'
import type { TreeNode } from '../store/tree'

const fmt = (b: number) => (b > 1e6 ? `${(b / 1e6).toFixed(1)} Mo` : `${Math.max(1, Math.round(b / 1e3))} Ko`)

export function DataDialog({ nodes, onClose }: { nodes: TreeNode[]; onClose: () => void }) {
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [busy, setBusy] = useState(false)
  const input = useRef<HTMLInputElement>(null)
  const [mirror, setMirror] = useState(getMirrorPath())

  const pickMirror = async () => {
    try {
      const { open } = await import('@tauri-apps/plugin-dialog')
      const dir = await open({ directory: true, multiple: false, title: 'Dossier où recopier tes notes' })
      if (typeof dir !== 'string') return
      setMirrorPath(dir)
      setMirror(dir)
      setBusy(true)
      const r = await syncMirror(nodes)
      setMsg({ ok: true, text: `Dossier choisi : ${r.written} fichiers écrits. La copie se met à jour toute seule.` })
    } catch (e) {
      setMsg({ ok: false, text: `Impossible d'écrire dans ce dossier : ${(e as Error).message}` })
    } finally {
      setBusy(false)
    }
  }

  const syncNow = async () => {
    setBusy(true)
    try {
      const r = await syncMirror(nodes)
      setMsg({ ok: true, text: `Copie à jour (${r.written} écrits, ${r.removed} retirés).` })
    } catch (e) {
      setMsg({ ok: false, text: `Échec de la copie : ${(e as Error).message}` })
    } finally {
      setBusy(false)
    }
  }

  const exportAll = async () => {
    setBusy(true)
    try {
      const { blob, stats } = await createBackup(nodes)
      const name = `mine-sauvegarde-${new Date().toISOString().slice(0, 10)}.json`
      if (isTauri()) {
        // Dans la fenêtre Mac, un lien de téléchargement ne marche pas : on passe par « Enregistrer sous ».
        const { save } = await import('@tauri-apps/plugin-dialog')
        const { writeFile } = await import('@tauri-apps/plugin-fs')
        const path = await save({ defaultPath: name, filters: [{ name: 'Sauvegarde Mine', extensions: ['json'] }] })
        if (!path) return
        await writeFile(path, new Uint8Array(await blob.arrayBuffer()))
      } else {
        const a = document.createElement('a')
        a.href = URL.createObjectURL(blob)
        a.download = name
        a.click()
        setTimeout(() => URL.revokeObjectURL(a.href), 1000)
      }
      setMsg({ ok: true, text: `Sauvegarde créée : ${stats.notes} notes, ${stats.images} images (${fmt(stats.bytes)}).` })
    } catch (e) {
      setMsg({ ok: false, text: `Échec de la sauvegarde : ${(e as Error).message}` })
    } finally {
      setBusy(false)
    }
  }

  const exportMd = async () => {
    setBusy(true)
    try {
      const { texts: files, binaries } = await exportMarkdownFull(nodes)
      const { zipSync, strToU8 } = await import('fflate')
      const zip = zipSync({
        ...Object.fromEntries([...files].map(([path, text]) => [path, strToU8(text)])),
        ...Object.fromEntries(await Promise.all([...binaries].map(async ([path, load]) => [path, await load()] as const))),
      })
      const name = `mine-markdown-${new Date().toISOString().slice(0, 10)}.zip`
      if (isTauri()) {
        const { save } = await import('@tauri-apps/plugin-dialog')
        const { writeFile } = await import('@tauri-apps/plugin-fs')
        const path = await save({ defaultPath: name, filters: [{ name: 'Archive zip', extensions: ['zip'] }] })
        if (!path) return
        await writeFile(path, zip)
      } else {
        const a = document.createElement('a')
        a.href = URL.createObjectURL(new Blob([zip as BlobPart], { type: 'application/zip' }))
        a.download = name
        a.click()
        setTimeout(() => URL.revokeObjectURL(a.href), 1000)
      }
      setMsg({ ok: true, text: `${files.size} notes exportées en Markdown, avec ${binaries.size} pièce${binaries.size > 1 ? 's' : ''} jointe${binaries.size > 1 ? 's' : ''} (images et schémas).` })
    } catch (e) {
      setMsg({ ok: false, text: `Échec de l'export : ${(e as Error).message}` })
    } finally {
      setBusy(false)
    }
  }

  const importFile = async (file: File) => {
    setBusy(true)
    try {
      const stats = await restoreBackup(await file.text())
      setMsg({ ok: true, text: `Restauré : ${stats.notes} notes, ${stats.images} images fusionnées.` })
    } catch (e) {
      setMsg({ ok: false, text: (e as Error).message })
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="overlay center" onMouseDown={onClose}>
      <div className="dialog wide" role="dialog" aria-label="Sauvegarde" onMouseDown={(e) => e.stopPropagation()}>
        <div className="dialog-head">
          <h3>Sauvegarde</h3>
          <button type="button" className="icon-btn" aria-label="Fermer" onClick={onClose}>
            <Icon name="x" />
          </button>
        </div>
        <p>
          Tes notes sont stockées dans ce navigateur, sur cet appareil. Exporte régulièrement un fichier de
          sauvegarde : il contient tout (notes, dossiers, blocs, images) et se restaure sans rien écraser.
        </p>
        <div className="data-actions">
          <button type="button" className="btn primary" disabled={busy} onClick={exportAll}>
            Exporter tout
          </button>
          <button type="button" className="btn" disabled={busy} onClick={exportMd}>
            Exporter en Markdown
          </button>
          <button type="button" className="btn" disabled={busy} onClick={() => input.current?.click()}>
            Restaurer un fichier…
          </button>
          <input
            ref={input}
            type="file"
            accept="application/json,.json"
            hidden
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) void importFile(f)
              e.target.value = ''
            }}
          />
        </div>
        {isTauri() && (
          <>
            <h4 className="data-sub">Dossier sur ce Mac</h4>
            <p>
              Choisis un dossier : Mine y recopie tes dossiers, projets et notes (en Markdown) et garde la copie à
              jour. Les blocs colorés deviennent des citations ; images et schémas restent seulement dans l'app.
            </p>
            {mirror && <p className="data-path">{mirror}</p>}
            <div className="data-actions">
              <button type="button" className="btn" disabled={busy} onClick={pickMirror}>
                {mirror ? 'Changer de dossier…' : 'Choisir un dossier…'}
              </button>
              {mirror && (
                <>
                  <button type="button" className="btn" disabled={busy} onClick={syncNow}>
                    Copier maintenant
                  </button>
                  <button
                    type="button"
                    className="btn"
                    disabled={busy}
                    onClick={() => {
                      setMirrorPath(null)
                      setMirror(null)
                    }}
                  >
                    Arrêter
                  </button>
                </>
              )}
            </div>
          </>
        )}
        {msg && <p className={msg.ok ? 'data-msg ok' : 'data-msg err'}>{msg.text}</p>}
      </div>
    </div>
  )
}
