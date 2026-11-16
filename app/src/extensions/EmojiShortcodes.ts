import { Extension, InputRule } from '@tiptap/core'
import { emojis } from '@tiptap/extension-emoji'

const byCode = new Map<string, string>()
for (const e of emojis) for (const code of e.shortcodes) if (e.emoji) byCode.set(code, e.emoji)

/** Tape `:smile:` : le code est remplacé par l'emoji (du vrai texte, qui s'exporte partout). */
export const EmojiShortcodes = Extension.create({
  name: 'emojiShortcodes',
  addInputRules() {
    return [
      new InputRule({
        find: /:([a-z0-9_+-]{2,}):$/,
        handler: ({ state, range, match }) => {
          const emoji = byCode.get(match[1])
          if (emoji) state.tr.insertText(emoji, range.from, range.to)
        },
      }),
    ]
  },
})
