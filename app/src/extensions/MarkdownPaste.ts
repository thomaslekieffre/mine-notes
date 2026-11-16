import { Extension } from '@tiptap/core'
import { Plugin } from '@tiptap/pm/state'

const LOOKS_MD = /^(#{1,6} .+|\s*[-*+] .+|\s*\d+\. .+|> .+|```|\|.+\|)$|\*\*[^*]+\*\*|\[[^\]]+\]\([^)]+\)/m

/** Colle du Markdown (texte brut qui en a l'air) : il devient de la vraie mise en forme. */
export const MarkdownPaste = Extension.create({
  name: 'markdownPaste',
  addProseMirrorPlugins() {
    const editor = this.editor
    return [
      new Plugin({
        props: {
          handlePaste: (_view, event) => {
            const data = event.clipboardData
            const text = data?.getData('text/plain') ?? ''
            if (!data || data.getData('text/html') || data.files.length > 0) return false
            if (!LOOKS_MD.test(text)) return false
            return editor.commands.insertContent(text, { contentType: 'markdown' })
          },
        },
      }),
    ]
  },
})
