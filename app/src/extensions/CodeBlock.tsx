import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight'
import { NodeViewContent, NodeViewWrapper, ReactNodeViewRenderer } from '@tiptap/react'
import type { NodeViewProps } from '@tiptap/react'
import { common, createLowlight } from 'lowlight'

export const lowlight = createLowlight(common)

const LANGS: [string, string][] = [
  ['', 'Auto'], ['plaintext', 'Texte'], ['javascript', 'JavaScript'], ['typescript', 'TypeScript'],
  ['python', 'Python'], ['java', 'Java'], ['c', 'C'], ['cpp', 'C++'], ['csharp', 'C#'], ['rust', 'Rust'],
  ['go', 'Go'], ['sql', 'SQL'], ['bash', 'Shell'], ['xml', 'HTML / XML'], ['css', 'CSS'], ['json', 'JSON'],
  ['yaml', 'YAML'], ['markdown', 'Markdown'], ['php', 'PHP'], ['swift', 'Swift'], ['kotlin', 'Kotlin'],
  ['ruby', 'Ruby'],
]

function CodeBlockView({ node, updateAttributes }: NodeViewProps) {
  return (
    <NodeViewWrapper className="codeblock">
      <select
        className="code-lang"
        contentEditable={false}
        aria-label="Langage"
        value={(node.attrs.language as string) ?? ''}
        onChange={(e) => updateAttributes({ language: e.target.value || null })}
      >
        {LANGS.map(([v, label]) => (
          <option key={v} value={v}>
            {label}
          </option>
        ))}
      </select>
      <pre>
        <NodeViewContent<'code'> as="code" className={node.attrs.language ? `language-${node.attrs.language}` : ''} />
      </pre>
    </NodeViewWrapper>
  )
}

/** Bloc de code coloré selon le langage (détection automatique par défaut). */
export const CodeBlock = CodeBlockLowlight.extend({
  addNodeView() {
    return ReactNodeViewRenderer(CodeBlockView)
  },
}).configure({ lowlight, defaultLanguage: null })
