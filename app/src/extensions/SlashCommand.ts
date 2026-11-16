import { Extension } from '@tiptap/core'
import type { Editor, Range } from '@tiptap/core'
import { Suggestion } from '@tiptap/suggestion'
import { PluginKey } from '@tiptap/pm/state'

export interface SlashItem {
  id: string
  label: string
  hint?: string
  /** Couleur d'accent (variable CSS) pour les blocs colorés. */
  color?: string
  group: string
  run: (ctx: { editor: Editor; range: Range }) => void
}

export interface SlashState {
  items: SlashItem[]
  index: number
  rect: DOMRect | null
  choose: (item: SlashItem) => void
}

export interface SlashOptions {
  getItems: (query: string) => SlashItem[]
  onState: (state: SlashState | null) => void
  /** Caractère(s) qui déclenchent le menu (« / » par défaut, « [[ » pour les liens). */
  char: string
  allowSpaces: boolean
}

interface LiveProps {
  items: SlashItem[]
  clientRect?: (() => DOMRect | null) | null
  command: (item: SlashItem) => void
}

/** Menu « / » : tape `/` dans une note pour insérer un bloc. */
export const SlashCommand = Extension.create<SlashOptions>({
  name: 'slashCommand',

  addOptions() {
    return { getItems: () => [], onState: () => {}, char: '/', allowSpaces: false }
  },

  addProseMirrorPlugins() {
    const opts = this.options
    return [
      Suggestion<SlashItem, SlashItem>({
        editor: this.editor,
        pluginKey: new PluginKey(this.name),
        char: opts.char,
        allowSpaces: opts.allowSpaces,
        items: ({ query }) => opts.getItems(query),
        command: ({ editor, range, props }) => props.run({ editor, range }),
        render: () => {
          let index = 0
          let last: LiveProps | null = null
          const emit = () => {
            if (!last) return
            opts.onState({
              items: last.items,
              index,
              rect: last.clientRect?.() ?? null,
              choose: (item) => last?.command(item),
            })
          }
          return {
            onStart: (p) => {
              index = 0
              last = p
              emit()
            },
            onUpdate: (p) => {
              last = p
              index = Math.min(index, Math.max(p.items.length - 1, 0))
              emit()
            },
            onKeyDown: ({ event }) => {
              if (!last || last.items.length === 0) return false
              const n = last.items.length
              if (event.key === 'ArrowDown') {
                index = (index + 1) % n
                emit()
                return true
              }
              if (event.key === 'ArrowUp') {
                index = (index - 1 + n) % n
                emit()
                return true
              }
              if (event.key === 'Enter' || event.key === 'Tab') {
                last.command(last.items[index])
                return true
              }
              return false
            },
            onExit: () => {
              last = null
              opts.onState(null)
            },
          }
        },
      }),
    ]
  },
})
