import { Extension } from '@tiptap/core'
import { Plugin, PluginKey } from '@tiptap/pm/state'
import { Decoration, DecorationSet } from '@tiptap/pm/view'

export const OPEN_TAG_EVENT = 'mine:open-tag'

const RE = /(^|[\s(,;])(#[\p{L}\p{N}_-]{2,40})/gu

/** Colore les #étiquettes du texte ; un clic cherche toutes les notes qui les portent. */
export const Tags = Extension.create({
  name: 'tags',
  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey('tags'),
        props: {
          decorations: (state) => {
            const decos: Decoration[] = []
            state.doc.descendants((node, pos, parent) => {
              if (!node.isText || !node.text || parent?.type.name === 'codeBlock') return
              if (node.marks.some((m) => m.type.name === 'code')) return
              for (const m of node.text.matchAll(RE)) {
                const from = pos + (m.index ?? 0) + m[1].length
                decos.push(Decoration.inline(from, from + m[2].length, { class: 'hashtag', 'data-tag': m[2] }))
              }
            })
            return DecorationSet.create(state.doc, decos)
          },
          handleClick: (_view, _pos, event) => {
            const el = (event.target as HTMLElement | null)?.closest?.('.hashtag')
            // Clic simple avec ⌘/Ctrl : ouvre la recherche (un clic seul place le curseur pour éditer).
            if (el && (event.metaKey || event.ctrlKey)) {
              window.dispatchEvent(new CustomEvent(OPEN_TAG_EVENT, { detail: el.getAttribute('data-tag') }))
              return true
            }
            return false
          },
        },
      }),
    ]
  },
})
