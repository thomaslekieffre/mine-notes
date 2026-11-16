import * as Y from 'yjs'
import { plainText } from './search'
import { getNoteDoc } from './notes'
import type { TreeNode } from './tree'

export interface TodoItem {
  noteId: string
  text: string
  checked: boolean
  toggle: () => void
}

function walk(frag: Y.XmlFragment | Y.XmlElement, out: Y.XmlElement[]) {
  for (const child of frag.toArray()) {
    if (child instanceof Y.XmlElement) {
      if (child.nodeName === 'taskItem') out.push(child)
      walk(child, out)
    }
  }
}

const isChecked = (el: Y.XmlElement) => {
  const v: unknown = el.getAttribute('checked')
  return v === true || v === 'true'
}

/** Cases à cocher d'une note, avec de quoi les (dé)cocher directement dans le document. */
export function tasksOf(noteId: string): TodoItem[] {
  const { doc } = getNoteDoc(noteId)
  const items: Y.XmlElement[] = []
  walk(doc.getXmlFragment('content'), items)
  return items.map((el) => ({
    noteId,
    text: plainText(el).replace(/\s+/g, ' ').trim(),
    checked: isChecked(el),
    // TipTap enregistre `checked` comme un booléen, que les types de Yjs ne prévoient pas.
    toggle: () => (el as unknown as { setAttribute: (k: string, v: boolean) => void }).setAttribute('checked', !isChecked(el)),
  }))
}

/** Appelle `onChange` à chaque modification d'une des notes ; renvoie la fonction de nettoyage. */
export async function watchTasks(nodes: TreeNode[], onChange: () => void): Promise<() => void> {
  const offs: Array<() => void> = []
  for (const n of nodes) {
    if (n.type !== 'note') continue
    const { doc, persistence } = getNoteDoc(n.id)
    await persistence.whenSynced
    const frag = doc.getXmlFragment('content')
    frag.observeDeep(onChange)
    offs.push(() => frag.unobserveDeep(onChange))
  }
  return () => offs.forEach((off) => off())
}
