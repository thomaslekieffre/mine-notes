import * as Y from 'yjs'
import { IndexeddbPersistence } from 'y-indexeddb'

type Entry = { doc: Y.Doc; persistence: IndexeddbPersistence }

const cache = new Map<string, Entry>()
const dbName = (id: string) => `mine-note-${id}`

/** Un document Yjs par note, persisté localement dans IndexedDB. */
export function getNoteDoc(id: string): Entry {
  let entry = cache.get(id)
  if (!entry) {
    const doc = new Y.Doc()
    entry = { doc, persistence: new IndexeddbPersistence(dbName(id), doc) }
    cache.set(id, entry)
  }
  return entry
}

export async function destroyNoteDoc(id: string): Promise<void> {
  const entry = cache.get(id)
  if (entry) {
    await entry.persistence.clearData()
    entry.doc.destroy()
    cache.delete(id)
  } else {
    indexedDB.deleteDatabase(dbName(id))
  }
}
