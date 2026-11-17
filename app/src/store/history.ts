import * as Y from 'yjs'
import { createStore, del, get, set } from 'idb-keyval'
import { plainText } from './search'
import { recordActivity } from './activity'
import { touchNode } from './tree'

// Historique des versions d'une note : des instantanés complets du document Yjs,
// pris quand on arrête d'écrire, gardés dans IndexedDB (jamais envoyés ailleurs).
const store = createStore('mine-history', 'snapshots')
const MAX = 40 // instantanés gardés par note
const IDLE_MS = 30_000 // on prend un instantané 30 s après la dernière frappe…
const MIN_GAP_MS = 3 * 60_000 // …sans en faire plus d'un toutes les 3 minutes

export interface Snapshot {
  t: number
  label?: string
  words: number
  update: Uint8Array
}

export async function listSnapshots(noteId: string): Promise<Snapshot[]> {
  return ((await get(noteId, store)) as Snapshot[] | undefined) ?? []
}

const same = (a: Uint8Array, b: Uint8Array) => a.length === b.length && a.every((v, i) => v === b[i])

/** Enregistre l'état actuel de la note (sauf s'il est identique au dernier instantané). */
export async function addSnapshot(noteId: string, doc: Y.Doc, label?: string, track = true): Promise<boolean> {
  const update = Y.encodeStateAsUpdate(doc)
  const list = await listSnapshots(noteId)
  const last = list[list.length - 1]
  if (last && same(last.update, update)) return false
  const words = plainText(doc.getXmlFragment('content')).trim().split(/\s+/).filter(Boolean).length
  list.push({ t: Date.now(), label, words, update })
  await set(noteId, list.slice(-MAX), store)
  // Séance d'écriture : on compte les mots gagnés depuis le dernier instantané (le premier sert de point de départ).
  if (track && last) recordActivity(noteId, words - last.words)
  return true
}

/** Surveille une note ouverte et prend des instantanés au fil de l'écriture. Renvoie la fonction de nettoyage. */
export function watchHistory(noteId: string, doc: Y.Doc): () => void {
  let timer: number | undefined
  let dirty = false
  let lastAt = 0
  const flush = () => {
    window.clearTimeout(timer)
    if (!dirty) return
    dirty = false
    lastAt = Date.now()
    void addSnapshot(noteId, doc)
  }
  const onUpdate = () => {
    touchNode(noteId)
    dirty = true
    window.clearTimeout(timer)
    const wait = Math.max(IDLE_MS, MIN_GAP_MS - (Date.now() - lastAt))
    timer = window.setTimeout(flush, wait)
  }
  // Point de départ : sans instantané, on en prend un à l'ouverture pour pouvoir compter les mots écrits ensuite.
  void listSnapshots(noteId).then((l) => {
    if (l.length === 0) void addSnapshot(noteId, doc, 'Départ', false)
  })
  doc.on('update', onUpdate)
  return () => {
    doc.off('update', onUpdate)
    flush() // en quittant la note, on garde ce qui a été écrit
  }
}

/** Revient à un instantané : l'état actuel est d'abord gardé (« Avant restauration »), puis le contenu est remplacé. */
export async function restoreSnapshot(noteId: string, doc: Y.Doc, snap: Snapshot) {
  await addSnapshot(noteId, doc, 'Avant restauration', false)
  const old = new Y.Doc()
  Y.applyUpdate(old, snap.update)
  const from = old.getXmlFragment('content')
  const frag = doc.getXmlFragment('content')
  doc.transact(() => {
    frag.delete(0, frag.length)
    frag.insert(0, from.toArray().map((n) => (n as Y.XmlElement).clone()))
  })
}

export async function clearHistory(noteId: string) {
  await del(noteId, store)
}
