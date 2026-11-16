import { Node, mergeAttributes } from '@tiptap/core'
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
