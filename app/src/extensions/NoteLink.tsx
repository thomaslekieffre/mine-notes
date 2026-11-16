import { Node, mergeAttributes } from '@tiptap/core'
import { NodeViewWrapper, ReactNodeViewRenderer } from '@tiptap/react'
import type { NodeViewProps } from '@tiptap/react'
import { useTree } from '../store/tree'
import { Icon } from '../components/Icon'

export const OPEN_NOTE_EVENT = 'mine:open-note'

function NoteLinkView({ node }: NodeViewProps) {
  const { nodes } = useTree()
  const target = nodes.find((n) => n.id === node.attrs.id)
  return (
    <NodeViewWrapper
      as="span"
      className={target ? 'note-link' : 'note-link broken'}
      contentEditable={false}
      title={target ? 'Ouvrir la note' : 'Note supprimée'}
      onClick={(e: React.MouseEvent) => {
        e.preventDefault()
        if (target) window.dispatchEvent(new CustomEvent(OPEN_NOTE_EVENT, { detail: target.id }))
      }}
    >
      <Icon name="file" size={12} />
      {target?.name ?? String(node.attrs.label || 'Note supprimée')}
    </NodeViewWrapper>
  )
}

/** Lien vers une autre note : tape `[[` pour en insérer un. Le nom suit les renommages. */
export const NoteLink = Node.create({
  name: 'noteLink',
  group: 'inline',
  inline: true,
  atom: true,
  selectable: true,

  addAttributes() {
    return {
      id: { default: '' },
      label: { default: '' },
    }
  },

  parseHTML() {
    return [
      {
        tag: 'span[data-note-link]',
        getAttrs: (el) => ({ id: (el as HTMLElement).getAttribute('data-note-link'), label: el.textContent ?? '' }),
      },
    ]
  },

  renderHTML({ node, HTMLAttributes }) {
    return ['span', mergeAttributes(HTMLAttributes, { 'data-note-link': node.attrs.id }), node.attrs.label]
  },

  addNodeView() {
    return ReactNodeViewRenderer(NoteLinkView)
  },
})
