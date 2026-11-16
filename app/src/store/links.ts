import * as Y from 'yjs'
import { getNoteDoc } from './notes'
import type { TreeNode } from './tree'

function linksTo(frag: Y.XmlFragment | Y.XmlElement, id: string): boolean {
  for (const child of frag.toArray()) {
    if (child instanceof Y.XmlElement) {
      if (child.nodeName === 'noteLink' && child.getAttribute('id') === id) return true
      if (linksTo(child, id)) return true
    }
  }
  return false
}

/** Notes qui contiennent un lien [[…]] vers `id`. */
export async function findBacklinks(nodes: TreeNode[], id: string): Promise<TreeNode[]> {
  const out: TreeNode[] = []
  for (const n of nodes) {
    if (n.type !== 'note' || n.id === id) continue
    const { doc, persistence } = getNoteDoc(n.id)
    await persistence.whenSynced
    if (linksTo(doc.getXmlFragment('content'), id)) out.push(n)
  }
  return out
}
