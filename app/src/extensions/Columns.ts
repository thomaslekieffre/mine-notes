import { Node, mergeAttributes } from '@tiptap/core'
import { Fragment } from '@tiptap/pm/model'
import type { Node as PMNode } from '@tiptap/pm/model'
import { Plugin, PluginKey } from '@tiptap/pm/state'
import { Mapping } from '@tiptap/pm/transform'
import { placeCursorInFirst } from './placeCursor'

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    columns: {
      /** Insère une rangée de 2 ou 3 colonnes de largeur égale. */
      insertColumns: (count: 2 | 3) => ReturnType
    }
  }
}

export const Column = Node.create({
  name: 'column',
  content: 'block+',
  isolating: true,
  parseHTML() {
    return [{ tag: 'div[data-column]' }]
  },
  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-column': '' }), 0]
  },
})

export const Columns = Node.create({
  name: 'columns',
  group: 'block',
  content: 'column{2,3}',
  isolating: true,
  defining: true,

  parseHTML() {
    return [{ tag: 'div[data-columns]' }]
  },

  renderHTML({ node, HTMLAttributes }) {
    return [
      'div',
      mergeAttributes(HTMLAttributes, {
        'data-columns': '',
        'data-count': String(node.childCount),
        style: `grid-template-columns: repeat(${node.childCount}, minmax(0, 1fr))`,
      }),
      0,
    ]
  },

  // Quand on sort le dernier bloc d'une colonne par glisser-déposer, la colonne vidée disparaît
  // (s'il ne reste qu'une colonne, son contenu reprend sa place dans la note).
  addProseMirrorPlugins() {
    const isEmpty = (c: PMNode) => c.childCount === 1 && c.firstChild!.type.name === 'paragraph' && c.firstChild!.content.size === 0
    return [
      new Plugin({
        key: new PluginKey('columnsCleanup'),
        appendTransaction(trs, oldState, newState) {
          if (!trs.some((t) => t.docChanged && t.getMeta('uiEvent') === 'drop')) return null
          const mapping = new Mapping()
          trs.forEach((t) => mapping.appendMapping(t.mapping))
          const inv = mapping.invert()
          const fixes: Array<{ pos: number; node: PMNode; drop: number[] }> = []
          newState.doc.descendants((node, pos) => {
            if (node.type.name !== 'columns') return
            const before = oldState.doc.nodeAt(inv.map(pos, -1))
            if (!before || before.type.name !== 'columns' || before.childCount !== node.childCount) return false
            const drop: number[] = []
            node.forEach((col, _o, i) => {
              if (isEmpty(col) && !isEmpty(before.child(i))) drop.push(i)
            })
            if (drop.length > 0 && drop.length < node.childCount) fixes.push({ pos, node, drop })
            return false
          })
          if (fixes.length === 0) return null
          const tr = newState.tr
          // Du bas vers le haut, pour que les positions restent valables.
          for (const { pos, node, drop } of fixes.reverse()) {
            const keep: PMNode[] = []
            node.forEach((col, _o, i) => {
              if (!drop.includes(i)) keep.push(col)
            })
            if (keep.length >= 2) tr.replaceWith(pos, pos + node.nodeSize, node.type.create(node.attrs, Fragment.from(keep)))
            else tr.replaceWith(pos, pos + node.nodeSize, keep[0].content)
          }
          return tr
        },
      }),
    ]
  },

  addCommands() {
    return {
      insertColumns:
        (count) =>
        ({ chain, state }) => {
          const start = state.selection.from
          return chain()
            .insertContent({
              type: this.name,
              content: Array.from({ length: count }, () => ({
                type: 'column',
                content: [{ type: 'paragraph' }],
              })),
            })
            .command(({ tr }) => placeCursorInFirst(tr, start, this.name, 3))
            .run()
        },
    }
  },
})
