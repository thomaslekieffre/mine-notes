import { Node, mergeAttributes } from '@tiptap/core'
import { placeCursorInFirst } from './placeCursor'

export interface CalloutAttrs {
  kind: string
  label: string
  color: string
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    callout: {
      /** Insère un bloc coloré (définition, exemple, exercice ou type perso). */
      insertCallout: (attrs: CalloutAttrs, withSolution?: boolean) => ReturnType
    }
  }
}

/** Bloc coloré générique : l'étiquette et la couleur sont copiées dans le nœud. */
export const Callout = Node.create({
  name: 'callout',
  group: 'block',
  content: 'block+',
  defining: true,

  addAttributes() {
    return {
      kind: { default: 'definition', parseHTML: (el) => el.getAttribute('data-kind') },
      label: { default: 'Bloc', parseHTML: (el) => el.getAttribute('data-label') },
      color: { default: 'var(--c-blue)', parseHTML: (el) => el.getAttribute('data-color') },
    }
  },

  parseHTML() {
    return [{ tag: 'div[data-callout]' }]
  },

  renderHTML({ node, HTMLAttributes }) {
    return [
      'div',
      mergeAttributes(HTMLAttributes, {
        'data-callout': '',
        'data-kind': node.attrs.kind,
        'data-label': node.attrs.label,
        'data-color': node.attrs.color,
        style: `--bc:${node.attrs.color}`,
      }),
      0,
    ]
  },

  addCommands() {
    return {
      insertCallout:
        (attrs, withSolution = false) =>
        ({ chain, state }) => {
          const start = state.selection.from
          return chain()
            .insertContent({
              type: this.name,
              attrs,
              content: [
                { type: 'paragraph' },
                ...(withSolution
                  ? [{ type: 'solution', attrs: { open: true }, content: [{ type: 'paragraph' }] }]
                  : []),
              ],
            })
            .command(({ tr }) => placeCursorInFirst(tr, start, this.name, 2))
            .run()
        },
    }
  },
})
