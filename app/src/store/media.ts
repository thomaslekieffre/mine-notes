import { createStore, get, keys, set } from 'idb-keyval'

// Les images ne sont pas stockées dans le texte de la note (trop lourd pour la sync) :
// chaque fichier vit dans IndexedDB, identifié par son empreinte SHA-256, et la note
// ne garde que cet identifiant. Le jalon E enverra ces fichiers au homelab.
const store = createStore('mine-media', 'blobs')
const urls = new Map<string, string>()

async function sha256(blob: Blob): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', await blob.arrayBuffer())
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0'))
    .join('')
    .slice(0, 40)
}

export async function putMedia(blob: Blob): Promise<string> {
  const id = await sha256(blob)
  if (!(await get(id, store))) await set(id, blob, store)
  return id
}

/** URL utilisable dans un <img>, ou null si le fichier est introuvable sur cet appareil. */
export async function getMediaUrl(id: string): Promise<string | null> {
  const cached = urls.get(id)
  if (cached) return cached
  const blob = (await get(id, store)) as Blob | undefined
  if (!blob) return null
  const url = URL.createObjectURL(blob)
  urls.set(id, url)
  return url
}

export async function listMediaIds(): Promise<string[]> {
  return (await keys(store)) as string[]
}

export async function getMediaBlob(id: string): Promise<Blob | undefined> {
  return (await get(id, store)) as Blob | undefined
}

export async function putMediaWithId(id: string, blob: Blob): Promise<void> {
  await set(id, blob, store)
  const old = urls.get(id)
  if (old) {
    URL.revokeObjectURL(old)
    urls.delete(id)
  }
}
