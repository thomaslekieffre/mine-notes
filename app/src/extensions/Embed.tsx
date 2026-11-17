import { createContext, useContext, useMemo, useState } from 'react'
import { Node, mergeAttributes } from '@tiptap/core'
import { NodeViewWrapper, ReactNodeViewRenderer, EditorContent, useEditor } from '@tiptap/react'
import type { NodeViewProps } from '@tiptap/react'
import Collaboration from '@tiptap/extension-collaboration'
import { getNoteDoc } from '../store/notes'
import { useTree } from '../store/tree'
import { buildExtensions } from './schema'
import { OPEN_NOTE_EVENT } from './NoteLink'
import { Icon, NodeIcon } from '../components/Icon'

// Note intégrée : affiche, en lecture seule et en direct, le contenu d'une autre note.
// On l'écrit une fois, on la réutilise partout. Une note intégrée n'en intègre pas d'autre (pas de boucle).

const Depth = createContext(0)

function Embedded({ id }: { id: string }) {
  const { doc } = getNoteDoc(id)
  const extensions = useMemo(() => [...buildExtensions(), Collaboration.configure({ document: doc, field: 'content' })], [doc])
  const editor = useEditor({ extensions, editable: false, immediatelyRender: true }, [id])
  return (
    <Depth.Provider value={1}>
      <EditorContent editor={editor} className="doc embed-doc" />
    </Depth.Provider>
  )
}

function Picker({ onPick }: { onPick: (id: string) => void }) {
  const { nodes } = useTree()
  const [q, setQ] = useState('')
  const list = nodes
    .filter((n) => n.type === 'note' && n.name.toLowerCase().includes(q.toLowerCase()))
    .slice(0, 8)
  return (
    <div className="embed-picker">
      <input autoFocus value={q} placeholder="Quelle note intégrer ?" onChange={(e) => setQ(e.target.value)} />
      {list.map((n) => (
        <button key={n.id} type="button" onClick={() => onPick(n.id)}>
          <NodeIcon node={n} size={15} />
          {n.name}
        </button>
      ))}
    </div>
  )
}

function EmbedView({ node, updateAttributes, selected }: NodeViewProps) {
  const depth = useContext(Depth)
  const { nodes } = useTree()
  const id = String(node.attrs.id ?? '')
  const target = nodes.find((n) => n.id === id)

  return (
    <NodeViewWrapper className="embed-block" data-selected={selected} contentEditable={false}>
      {!id ? (
        <Picker onPick={(v) => updateAttributes({ id: v })} />
      ) : !target ? (
        <div className="embed-empty">Note intégrée introuvable (supprimée ?).</div>
      ) : depth > 0 ? (
        <div className="embed-empty">
          <Icon name="file" size={13} /> « {target.name} » (note intégrée : non affichée ici)
        </div>
      ) : (
        <>
          <div className="embed-head">
            <NodeIcon node={target} size={14} />
            <span>{target.name}</span>
            <button type="button" onClick={() => window.dispatchEvent(new CustomEvent(OPEN_NOTE_EVENT, { detail: target.id }))}>
              Ouvrir
            </button>
          </div>
          <Embedded id={target.id} />
        </>
      )}
    </NodeViewWrapper>
  )
}

export const Embed = Node.create({
  name: 'embed',
  group: 'block',
  atom: true,
  selectable: true,
  draggable: true,
  addAttributes() {
    return { id: { default: '' } }
  },
  parseHTML: () => [{ tag: 'div[data-embed]' }],
  renderHTML: ({ HTMLAttributes }) => ['div', mergeAttributes(HTMLAttributes, { 'data-embed': '' })],
  addNodeView: () => ReactNodeViewRenderer(EmbedView),
})
