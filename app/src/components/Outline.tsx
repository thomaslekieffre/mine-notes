import { useEffect, useState } from 'react'
import type { Editor } from '@tiptap/core'
import { Icon } from './Icon'

interface Item {
  level: number
  text: string
  pos: number
}

function read(editor: Editor): Item[] {
  const out: Item[] = []
  editor.state.doc.descendants((node, pos) => {
    if (node.type.name === 'heading' && node.textContent.trim()) {
      out.push({ level: Number(node.attrs.level), text: node.textContent, pos })
    }
  })
  return out
}

/** Plan de la note : liste des titres, un clic y emmène. */
export function Outline({ editor, onClose }: { editor: Editor; onClose: () => void }) {
  const [items, setItems] = useState<Item[]>(() => read(editor))
  useEffect(() => {
    const upd = () => setItems(read(editor))
    editor.on('update', upd)
    return () => {
      editor.off('update', upd)
    }
  }, [editor])

  const go = (pos: number) => {
    editor.chain().focus().setTextSelection(pos + 1).run()
    const dom = editor.view.nodeDOM(pos)
    if (dom instanceof HTMLElement) dom.scrollIntoView({ block: 'start', behavior: 'smooth' })
  }

  return (
    <aside className="outline" aria-label="Plan de la note">
      <div className="outline-head">
        <span>Plan</span>
        <button type="button" className="icon-btn" aria-label="Fermer le plan" onClick={onClose}>
          <Icon name="x" size={13} />
        </button>
      </div>
      {items.length === 0 && <div className="outline-empty">Ajoute des titres (H1, H2, H3) pour voir le plan.</div>}
      {items.map((h) => (
        <button key={h.pos} type="button" className="outline-item" style={{ paddingLeft: 8 + (h.level - 1) * 12 }} onClick={() => go(h.pos)}>
          {h.text}
        </button>
      ))}
    </aside>
  )
}
