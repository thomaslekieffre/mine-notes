import { Extension } from '@tiptap/core'
import { Plugin } from '@tiptap/pm/state'
import { matches } from '../store/shortcuts'
import { TextSelection } from '@tiptap/pm/state'

/** Raccourcis « Monter / Descendre le bloc » (Alt+↑ / Alt+↓ par défaut) : fait monter ou descendre le bloc où se trouve le curseur (dans le document ou une colonne). */
function move(dir: -1 | 1) {
  return ({ editor }: { editor: import('@tiptap/core').Editor }) => {
    const { state, view } = editor
    const { $from, anchor, head } = state.selection
    let d = $from.depth
    while (d > 0 && !['doc', 'column'].includes($from.node(d - 1).type.name)) d--
    if (d === 0) return true
    const parent = $from.node(d - 1)
    const index = $from.index(d - 1)
    const sibling = parent.maybeChild(index + dir)
    if (!sibling) return true
    const node = $from.node(d)
    const start = $from.before(d)
    const end = $from.after(d)
    const tr = state.tr
    let shift: number
    if (dir < 0) {
      shift = -sibling.nodeSize
      tr.delete(start, end).insert(start + shift, node)
    } else {
      shift = sibling.nodeSize
      tr.insert(end + sibling.nodeSize, node).delete(start, end)
    }
    tr.setSelection(TextSelection.create(tr.doc, anchor + shift, head + shift))
    view.dispatch(tr.scrollIntoView())
    return true
  }
}

export const MoveBlock = Extension.create({
  name: 'moveBlock',
  // Les touches se lisent à chaque frappe : elles suivent les réglages sans recréer l'éditeur.
  addProseMirrorPlugins() {
    const editor = this.editor
    return [
      new Plugin({
        props: {
          handleKeyDown: (_view, event) => {
            if (matches('blockUp', event)) return move(-1)({ editor })
            if (matches('blockDown', event)) return move(1)({ editor })
            return false
          },
        },
      }),
    ]
  },
})
