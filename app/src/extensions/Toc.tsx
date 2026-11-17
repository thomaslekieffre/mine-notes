import { useEffect, useState } from 'react'
import { Node, mergeAttributes } from '@tiptap/core'
import { NodeViewWrapper, ReactNodeViewRenderer } from '@tiptap/react'
import type { NodeViewProps } from '@tiptap/react'

interface Item {
  level: number
  text: string
  pos: number
}

function read(editor: NodeViewProps['editor']): Item[] {
  const out: Item[] = []
  editor.state.doc.descendants((node, pos) => {
    if (node.type.name === 'heading' && node.textContent.trim()) out.push({ level: Number(node.attrs.level), text: node.textContent, pos })
  })
  return out
}

function TocView({ editor }: NodeViewProps) {
  const [items, setItems] = useState<Item[]>(() => read(editor))
  useEffect(() => {
    const upd = () => setItems(read(editor))
    editor.on('update', upd)
    return () => {
      editor.off('update', upd)
    }
  }, [editor])

  const go = (pos: number) => {
    const dom = editor.view.nodeDOM(pos)
    if (dom instanceof HTMLElement) dom.scrollIntoView({ block: 'start', behavior: 'smooth' })
  }
  const min = items.length ? Math.min(...items.map((i) => i.level)) : 1

  return (
    <NodeViewWrapper className="toc-block" contentEditable={false}>
      <div className="toc-title">Sommaire</div>
      {items.length === 0 && <div className="toc-empty">Les titres de la note apparaîtront ici.</div>}
      {items.map((h) => (
        <button key={h.pos} type="button" className="toc-item" style={{ paddingLeft: (h.level - min) * 16 }} onClick={() => go(h.pos)}>
          {h.text}
        </button>
      ))}
    </NodeViewWrapper>
  )
}

/** Sommaire automatique : la liste des titres de la note, mise à jour en direct. */
export const Toc = Node.create({
  name: 'toc',
  group: 'block',
  atom: true,
  selectable: true,
  draggable: true,
  parseHTML: () => [{ tag: 'div[data-toc]' }],
  renderHTML: ({ HTMLAttributes }) => ['div', mergeAttributes(HTMLAttributes, { 'data-toc': '' })],
  addNodeView: () => ReactNodeViewRenderer(TocView),
})
