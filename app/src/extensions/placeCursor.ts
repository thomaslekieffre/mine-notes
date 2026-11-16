import { TextSelection } from '@tiptap/pm/state'
import type { Transaction } from '@tiptap/pm/state'

/**
 * Place le curseur dans le premier champ du bloc `typeName` inséré à partir de `start`.
 * `depth` = nombre de nœuds ouvrants à franchir pour atteindre le premier paragraphe.
 */
export function placeCursorInFirst(tr: Transaction, start: number, typeName: string, depth: number) {
  let target = -1
  tr.doc.nodesBetween(Math.max(0, start - 1), Math.min(tr.doc.content.size, tr.selection.to + 1), (node, pos) => {
    if (target < 0 && node.type.name === typeName) target = pos + depth
    return target < 0
  })
  if (target >= 0) tr.setSelection(TextSelection.near(tr.doc.resolve(target)))
  return true
}
