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
}

interface TreeState {
  ready: boolean
  nodes: TreeNode[]
}

// L'arborescence est un document Yjs : chaque nœud est une Y.Map, ce qui permettra
// de fusionner proprement les modifications de plusieurs appareils (jalon E).
const doc = new Y.Doc()
const persistence = new IndexeddbPersistence('mine-tree', doc)
const yNodes = doc.getMap<Y.Map<unknown>>('nodes')
const yMeta = doc.getMap<unknown>('meta')

let state: TreeState = { ready: false, nodes: [] }
const listeners = new Set<() => void>()

function recompute(ready = state.ready) {
  state = {
    ready,
    nodes: Array.from(yNodes.values()).map((m) => m.toJSON() as TreeNode),
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
  for (const [k, v] of Object.entries(node)) m.set(k, v)
  yNodes.set(node.id, m)
}

function siblings(parentId: string | null): TreeNode[] {
  return Array.from(yNodes.values())
    .map((m) => m.toJSON() as TreeNode)
    .filter((n) => n.parentId === parentId)
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

export function removeNode(id: string): string[] {
  const ids = [id, ...descendants(id)]
  const noteIds = ids.filter((i) => yNodes.get(i)?.get('type') === 'note')
  doc.transact(() => {
    ids.forEach((i) => yNodes.delete(i))
    // Les types réservés à un projet supprimé disparaissent avec lui.
    for (const [tid, m] of Array.from(yTypes.entries())) if (ids.includes(String(m.get('projectId')))) yTypes.delete(tid)
  })
  noteIds.forEach((i) => void destroyNoteDoc(i))
  return ids
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
