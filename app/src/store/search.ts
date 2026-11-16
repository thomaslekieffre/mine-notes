import * as Y from 'yjs'
import { getNoteDoc } from './notes'
import type { TreeNode } from './tree'

export interface ContentHit {
  node: TreeNode
  snippet: string
}

/** Texte brut d'un nœud Yjs de l'éditeur (paragraphes séparés par des espaces). */
export function plainText(node: Y.XmlFragment | Y.XmlElement | Y.XmlText): string {
  if (node instanceof Y.XmlText) {
    return (node.toDelta() as Array<{ insert?: unknown }>)
      .map((d) => (typeof d.insert === 'string' ? d.insert : ''))
      .join('')
  }
  return node
    .toArray()
    .map((child) => (child instanceof Y.XmlHook ? '' : plainText(child as Y.XmlElement | Y.XmlText)))
    .join(' ')
}

/** Minuscules sans accents, en gardant la même longueur pour retrouver l'extrait. */
const fold = (s: string) =>
  Array.from(s, (ch) => {
    const f = ch.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
    return f.length === 1 ? f : ch.toLowerCase()
  }).join('')

export async function loadNoteText(id: string): Promise<string> {
  const { doc, persistence } = getNoteDoc(id)
  await persistence.whenSynced
  return plainText(doc.getXmlFragment('content')).replace(/\s+/g, ' ').trim()
}

/** Cherche `query` dans le texte de toutes les notes. */
export async function searchContent(nodes: TreeNode[], query: string, limit = 20): Promise<ContentHit[]> {
  const q = fold(query.trim())
  if (!q) return []
  const hits: ContentHit[] = []
  for (const node of nodes) {
    if (node.type !== 'note') continue
    const text = await loadNoteText(node.id)
    const at = fold(text).indexOf(q)
    if (at < 0) continue
    const start = Math.max(0, at - 30)
    const end = Math.min(text.length, at + q.length + 50)
    hits.push({
      node,
      snippet: `${start > 0 ? '…' : ''}${text.slice(start, end)}${end < text.length ? '…' : ''}`,
    })
    if (hits.length >= limit) break
  }
  return hits
}
