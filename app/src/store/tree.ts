import * as Y from 'yjs'
import { IndexeddbPersistence } from 'y-indexeddb'
import { useSyncExternalStore } from 'react'
import { destroyNoteDoc } from './notes'

export type NodeType = 'folder' | 'project' | 'note'
export type NoteKind = 'note' | 'todo' | 'ideas' | 'journal'
export type DropPosition = 'before' | 'after' | 'inside'

export interface TreeNode {
  id: string
  parentId: string | null
  type: NodeType
  kind: NoteKind
  name: string
  order: number
  /** Présent quand l'élément a été mis à la corbeille (date en ms). Ses enfants le suivent. */
  trashedAt?: number
  /** Note du jour : date locale « AAAA-MM-JJ ». */
  day?: string
  /** Dossier qui range les notes du jour. */
  daily?: boolean
}

interface TreeState {
  ready: boolean
  /** Éléments visibles (hors corbeille). */
  nodes: TreeNode[]
  /** Éléments mis à la corbeille, du plus récent au plus ancien. */
  trash: TreeNode[]
}

// L'arborescence est un document Yjs : chaque nœud est une Y.Map, ce qui permettra
// de fusionner proprement les modifications de plusieurs appareils (jalon E).
const doc = new Y.Doc()
const persistence = new IndexeddbPersistence('mine-tree', doc)
const yNodes = doc.getMap<Y.Map<unknown>>('nodes')
const yMeta = doc.getMap<unknown>('meta')

let state: TreeState = { ready: false, nodes: [], trash: [] }
const listeners = new Set<() => void>()

const allNodes = () => Array.from(yNodes.values()).map((m) => m.toJSON() as TreeNode)

function recompute(ready = state.ready) {
  const all = allNodes()
  const byId = new Map(all.map((n) => [n.id, n]))
  // Un élément est caché s'il est à la corbeille ou si l'un de ses parents l'est.
  const hidden = (n: TreeNode): boolean => {
    for (let p: TreeNode | undefined = n, guard = 0; p && guard < 100; p = p.parentId ? byId.get(p.parentId) : undefined, guard++) {
      if (p.trashedAt) return true
    }
    return false
  }
  state = {
    ready,
    nodes: all.filter((n) => !hidden(n)),
    trash: all.filter((n) => n.trashedAt).sort((a, b) => (b.trashedAt ?? 0) - (a.trashedAt ?? 0)),
  }
  listeners.forEach((l) => l())
}

yNodes.observeDeep(() => recompute())

const subscribe = (l: () => void) => {
  listeners.add(l)
  return () => {
    listeners.delete(l)
  }
}
const getState = () => state

export function useTree(): TreeState {
  return useSyncExternalStore(subscribe, getState)
}

function put(node: TreeNode) {
  const m = new Y.Map<unknown>()
  for (const [k, v] of Object.entries(node)) if (v !== undefined) m.set(k, v)
  yNodes.set(node.id, m)
}

function siblings(parentId: string | null): TreeNode[] {
  return Array.from(yNodes.values())
    .map((m) => m.toJSON() as TreeNode)
    .filter((n) => n.parentId === parentId && !n.trashedAt)
    .sort((a, b) => a.order - b.order)
}

function nextOrder(parentId: string | null): number {
  const s = siblings(parentId)
  return s.length ? s[s.length - 1].order + 1 : 1
}

function descendants(id: string): string[] {
  const out: string[] = []
  const walk = (pid: string) => {
    for (const n of siblings(pid)) {
      out.push(n.id)
      walk(n.id)
    }
  }
  walk(id)
  return out
}

function seed() {
  if (yMeta.get('seeded')) return
  doc.transact(() => {
    const base: Array<[string, string, NoteKind]> = [
      ['seed-todo', 'Todo', 'todo'],
      ['seed-ideas', 'Idées', 'ideas'],
      ['seed-journal', 'Journal', 'journal'],
    ]
    base.forEach(([id, name, kind], i) =>
      put({ id, parentId: null, type: 'note', kind, name, order: i + 1 }),
    )
    yMeta.set('seeded', true)
  })
}

// ───── Types de blocs (définition, exemple, exercice… et ceux créés par l'utilisateur) ─────
export type BlockColor = string // nom de la palette (voir colors.ts) ou « #rrggbb »

export interface BlockType {
  id: string
  label: string
  color: BlockColor
  order: number
  /** Absent = type disponible partout ; sinon réservé aux notes de ce projet. */
  projectId?: string
}

/** Projet qui contient ce nœud (ou null s'il est hors de tout projet). */
export function projectOf(nodes: TreeNode[], id: string): string | null {
  const byId = new Map(nodes.map((n) => [n.id, n]))
  let n = byId.get(id)
  while (n) {
    if (n.type === 'project') return n.id
    n = n.parentId ? byId.get(n.parentId) : undefined
  }
  return null
}

/** Types utilisables dans un projet donné : les types globaux plus ceux de ce projet. */
export const typesFor = (types: BlockType[], projectId: string | null) =>
  types.filter((t) => !t.projectId || t.projectId === projectId)

const yTypes = doc.getMap<Y.Map<unknown>>('blockTypes')
let typesState: BlockType[] = []
const typeListeners = new Set<() => void>()

function recomputeTypes() {
  typesState = Array.from(yTypes.values())
    .map((m) => m.toJSON() as BlockType)
    .sort((a, b) => a.order - b.order)
  typeListeners.forEach((l) => l())
}
yTypes.observeDeep(recomputeTypes)

export function useBlockTypes(): BlockType[] {
  return useSyncExternalStore(
    (l) => {
      typeListeners.add(l)
      return () => {
        typeListeners.delete(l)
      }
    },
    () => typesState,
  )
}

export function getBlockTypes(): BlockType[] {
  return typesState
}

function putType(t: BlockType) {
  const m = new Y.Map<unknown>()
  for (const [k, v] of Object.entries(t)) if (v !== undefined) m.set(k, v)
  yTypes.set(t.id, m)
}

function seedTypes() {
  if (yMeta.get('seededTypes')) return
  doc.transact(() => {
    putType({ id: 'definition', label: 'Définition', color: 'blue', order: 1 })
    putType({ id: 'example', label: 'Exemple', color: 'green', order: 2 })
    putType({ id: 'exercise', label: 'Exercice', color: 'orange', order: 3 })
    yMeta.set('seededTypes', true)
  })
}

export function addBlockType(label: string, color: BlockColor, projectId?: string): string {
  const id = crypto.randomUUID()
  const order = typesState.length ? typesState[typesState.length - 1].order + 1 : 1
  putType({ id, label, color, order, projectId })
  return id
}

export function updateBlockType(id: string, patch: Partial<Pick<BlockType, 'label' | 'color' | 'projectId'>>) {
  const m = yTypes.get(id)
  if (!m) return
  doc.transact(() => {
    for (const [k, v] of Object.entries(patch)) {
      if (v === undefined) m.delete(k)
      else m.set(k, v)
    }
  })
}

export function removeBlockType(id: string) {
  yTypes.delete(id)
}

void persistence.whenSynced.then(() => {
  seed()
  seedTypes()
  recomputeTypes()
  recompute(true)
})

export function createNode(
  parentId: string | null,
  type: NodeType,
  name: string,
  kind: NoteKind = 'note',
): string {
  const id = crypto.randomUUID()
  doc.transact(() => {
    put({ id, parentId, type, kind: type === 'note' ? kind : 'note', name, order: nextOrder(parentId) })
    if (type === 'project') {
      const tpl: Array<[string, NoteKind]> = [
        ['Todo', 'todo'],
        ['Idées', 'ideas'],
        ['Journal', 'journal'],
      ]
      tpl.forEach(([n, k], i) =>
        put({ id: crypto.randomUUID(), parentId: id, type: 'note', kind: k, name: n, order: i + 1 }),
      )
    }
  })
  return id
}

export function renameNode(id: string, name: string) {
  const m = yNodes.get(id)
  if (m) m.set('name', name)
}

/** Tous les descendants, corbeille comprise. */
function allDescendants(id: string): string[] {
  const all = allNodes()
  const out: string[] = []
  const walk = (pid: string) => {
    for (const n of all) {
      if (n.parentId === pid) {
        out.push(n.id)
        walk(n.id)
      }
    }
  }
  walk(id)
  return out
}

/** Met un élément (et tout ce qu'il contient) à la corbeille. Renvoie les identifiants qui disparaissent de la vue. */
export function trashNode(id: string): string[] {
  const ids = [id, ...descendants(id)]
  yNodes.get(id)?.set('trashedAt', Date.now())
  return ids
}

/** Sort un élément de la corbeille. Si son dossier d'origine n'existe plus ou est à la corbeille, il revient à la racine. */
export function restoreNode(id: string) {
  const m = yNodes.get(id)
  if (!m) return
  const parentId = (m.get('parentId') as string | null) ?? null
  const parentVisible = parentId !== null && state.nodes.some((n) => n.id === parentId)
  doc.transact(() => {
    m.delete('trashedAt')
    if (!parentVisible) m.set('parentId', null)
    m.set('order', nextOrder((m.get('parentId') as string | null) ?? null))
  })
}

/** Suppression définitive (vide aussi les notes et les types de blocs du projet). */
export function purgeNode(id: string) {
  const ids = [id, ...allDescendants(id)]
  const noteIds = ids.filter((i) => yNodes.get(i)?.get('type') === 'note')
  doc.transact(() => {
    ids.forEach((i) => yNodes.delete(i))
    // Les types réservés à un projet supprimé disparaissent avec lui.
    for (const [tid, m] of Array.from(yTypes.entries())) if (ids.includes(String(m.get('projectId')))) yTypes.delete(tid)
  })
  noteIds.forEach((i) => void destroyNoteDoc(i))
}

export function emptyTrash() {
  for (const n of state.trash) purgeNode(n.id)
}

/** Nombre d'éléments contenus dans un élément de la corbeille (lui non compris). */
export function trashedContentCount(id: string): number {
  return allDescendants(id).length
}

/** Chemin d'origine d'un élément (ses dossiers parents), même s'ils sont à la corbeille. */
export function originPath(id: string): string {
  const byId = new Map(allNodes().map((n) => [n.id, n]))
  const parts: string[] = []
  let p = byId.get(id)?.parentId ? byId.get(byId.get(id)!.parentId!) : undefined
  while (p) {
    parts.unshift(p.name)
    p = p.parentId ? byId.get(p.parentId) : undefined
  }
  return parts.join(' › ')
}

export function countDescendants(id: string): number {
  return descendants(id).length
}

/** Déplace `id` par rapport à `targetId`. Renvoie false si le déplacement est invalide. */
export function moveNode(id: string, targetId: string, pos: DropPosition): boolean {
  if (id === targetId) return false
  if (descendants(id).includes(targetId)) return false
  const moving = yNodes.get(id)
  const target = yNodes.get(targetId)?.toJSON() as TreeNode | undefined
  if (!moving || !target) return false

  let parentId: string | null
  let order: number
  if (pos === 'inside') {
    if (target.type === 'note') return false
    parentId = target.id
    order = nextOrder(target.id)
  } else {
    parentId = target.parentId
    const sibs = siblings(parentId).filter((n) => n.id !== id)
    const idx = sibs.findIndex((n) => n.id === targetId)
    if (pos === 'before') {
      const prev = idx > 0 ? sibs[idx - 1].order : target.order - 1
      order = (prev + target.order) / 2
    } else {
      const next = idx < sibs.length - 1 ? sibs[idx + 1].order : target.order + 1
      order = (target.order + next) / 2
    }
  }
  doc.transact(() => {
    moving.set('parentId', parentId)
    moving.set('order', order)
  })
  return true
}

export function moveToRoot(id: string) {
  const m = yNodes.get(id)
  if (!m) return
  doc.transact(() => {
    m.set('parentId', null)
    m.set('order', nextOrder(null))
  })
}

// ───── Sauvegarde / restauration ─────
export function getTreeUpdate(): Uint8Array {
  return Y.encodeStateAsUpdate(doc)
}

/** Fusionne un état sauvegardé : rien n'est écrasé, les deux versions sont combinées. */
export function applyTreeUpdate(update: Uint8Array) {
  Y.applyUpdate(doc, update)
}

export function getTreeNodes(): TreeNode[] {
  return state.nodes
}


// ───── Note du jour ─────
const pad = (n: number) => String(n).padStart(2, '0')
export const dayKey = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
const dayTitle = (d: Date) => {
  const t = d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  return t.charAt(0).toUpperCase() + t.slice(1)
}

/** Ouvre la note d'aujourd'hui : la crée (dans le dossier « Notes du jour ») si elle n'existe pas encore. */
export function ensureDailyNote(d = new Date()): { noteId: string; folderId: string } {
  const key = dayKey(d)
  const visible = state.nodes
  const existing = visible.find((n) => n.type === 'note' && n.day === key)
  if (existing) return { noteId: existing.id, folderId: existing.parentId ?? '' }

  const all = allNodes()
  let folder = all.find((n) => n.type === 'folder' && n.daily)
  if (folder?.trashedAt) {
    restoreNode(folder.id)
    folder = { ...folder, trashedAt: undefined }
  }
  const folderId = folder?.id ?? createNode(null, 'folder', 'Notes du jour')
  if (!folder) yNodes.get(folderId)?.set('daily', true)

  const noteId = crypto.randomUUID()
  // Classées par date, les plus récentes en haut du dossier (ordre = date négative).
  put({ id: noteId, parentId: folderId, type: 'note', kind: 'journal', name: dayTitle(d), order: -Number(key.replace(/-/g, '')), day: key })
  return { noteId, folderId }
}


/** Indicateurs simples stockés avec l'arborescence (ex. « la démo a déjà été créée »). */
export const getFlag = (key: string): boolean => yMeta.get(key) === true
export const setFlag = (key: string) => yMeta.set(key, true)
