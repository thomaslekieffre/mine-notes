import * as Y from 'yjs'
import { getNoteDoc } from './notes'
import { getMediaBlob, listMediaIds, putMediaWithId } from './media'
import { applyTreeUpdate, getTreeUpdate } from './tree'
import type { TreeNode } from './tree'

const FORMAT = 'mine-backup'
const VERSION = 1

interface BackupFile {
  format: typeof FORMAT
  version: number
  exportedAt: string
  tree: string
  notes: Record<string, string>
  media: Record<string, { type: string; data: string }>
}

function toBase64(bytes: Uint8Array): string {
  let bin = ''
  const chunk = 0x8000
  for (let i = 0; i < bytes.length; i += chunk) bin += String.fromCharCode(...bytes.subarray(i, i + chunk))
  return btoa(bin)
}

function fromBase64(b64: string): Uint8Array {
  const bin = atob(b64)
  const out = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
  return out
}

export interface BackupStats {
  notes: number
  images: number
  bytes: number
}

/** Sauvegarde complète et sans perte : arborescence, notes, types de blocs et images. */
export async function createBackup(nodes: TreeNode[]): Promise<{ blob: Blob; stats: BackupStats }> {
  const notes: BackupFile['notes'] = {}
  for (const n of nodes) {
    if (n.type !== 'note') continue
    const { doc, persistence } = getNoteDoc(n.id)
    await persistence.whenSynced
    notes[n.id] = toBase64(Y.encodeStateAsUpdate(doc))
  }
  const media: BackupFile['media'] = {}
  for (const id of await listMediaIds()) {
    const blob = await getMediaBlob(id)
    if (blob) media[id] = { type: blob.type, data: toBase64(new Uint8Array(await blob.arrayBuffer())) }
  }
  const file: BackupFile = {
    format: FORMAT,
    version: VERSION,
    exportedAt: new Date().toISOString(),
    tree: toBase64(getTreeUpdate()),
    notes,
    media,
  }
  const blob = new Blob([JSON.stringify(file)], { type: 'application/json' })
  return { blob, stats: { notes: Object.keys(notes).length, images: Object.keys(media).length, bytes: blob.size } }
}

/** Restaure une sauvegarde en la fusionnant avec ce qui existe déjà (rien n'est supprimé). */
export async function restoreBackup(text: string): Promise<BackupStats> {
  let file: BackupFile
  try {
    file = JSON.parse(text) as BackupFile
  } catch {
    throw new Error("Ce fichier n'est pas une sauvegarde Mine.")
  }
  if (file.format !== FORMAT || typeof file.tree !== 'string') {
    throw new Error("Ce fichier n'est pas une sauvegarde Mine.")
  }
  if (file.version > VERSION) throw new Error('Cette sauvegarde vient d\'une version plus récente de Mine.')

  applyTreeUpdate(fromBase64(file.tree))
  for (const [id, data] of Object.entries(file.notes ?? {})) {
    const { doc, persistence } = getNoteDoc(id)
    await persistence.whenSynced
    Y.applyUpdate(doc, fromBase64(data))
  }
  for (const [id, m] of Object.entries(file.media ?? {})) {
    await putMediaWithId(id, new Blob([fromBase64(m.data) as BlobPart], { type: m.type }))
  }
  return {
    notes: Object.keys(file.notes ?? {}).length,
    images: Object.keys(file.media ?? {}).length,
    bytes: text.length,
  }
}
