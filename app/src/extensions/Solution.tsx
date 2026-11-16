import { Node, mergeAttributes } from '@tiptap/core'
import { NodeViewContent, NodeViewWrapper, ReactNodeViewRenderer } from '@tiptap/react'
import type { NodeViewProps } from '@tiptap/react'
import { Icon } from '../components/Icon'

function SolutionView({ node, updateAttributes }: NodeViewProps) {
  const open = node.attrs.open as boolean
  return (
    <NodeViewWrapper className="solution" data-open={open}>
      <div className="solution-head" contentEditable={false}>
        <button type="button" onClick={() => updateAttributes({ open: !open })}>
          <Icon name={open ? 'chevD' : 'chevR'} size={12} />
          Solution
          {!open && <span className="solution-hint">masquée</span>}
        </button>
      </div>
      <NodeViewContent className="solution-body" />
    </NodeViewWrapper>
  )
}

/** Partie repliable d'un exercice (la solution). */
export const Solution = Node.create({
  name: 'solution',
  group: 'block',
  content: 'block+',
  defining: true,

  addAttributes() {
    return {
      open: {
        default: true,
        parseHTML: (el) => el.getAttribute('data-open') !== 'false',
        renderHTML: (attrs) => ({ 'data-open': String(attrs.open) }),
      },
    }
  },

  parseHTML() {
    return [{ tag: 'div[data-solution]' }]
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-solution': '' }), 0]
  },

  addNodeView() {
    return ReactNodeViewRenderer(SolutionView)
  },
})
