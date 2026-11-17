import { useRef, useState } from 'react'
import { Node, mergeAttributes } from '@tiptap/core'
import { NodeViewWrapper, ReactNodeViewRenderer } from '@tiptap/react'
import type { NodeViewProps } from '@tiptap/react'

// Tableau Kanban : des colonnes de cartes qu'on glisse de l'une à l'autre. Stocké en JSON dans un attribut.

interface Card {
  id: string
  text: string
}
interface Column {
  id: string
  title: string
  cards: Card[]
}
interface Board {
  columns: Column[]
}

const uid = () => Math.random().toString(36).slice(2, 9)

export const defaultBoard = (): Board => ({
  columns: [
    { id: uid(), title: 'À faire', cards: [] },
    { id: uid(), title: 'En cours', cards: [] },
    { id: uid(), title: 'Fait', cards: [] },
  ],
})

function parse(raw: unknown): Board {
  try {
    const b = JSON.parse(String(raw)) as Board
    if (Array.isArray(b.columns)) return b
  } catch {
    /* vide ou abîmé */
  }
  return defaultBoard()
}

function KanbanView({ node, updateAttributes, selected, editor }: NodeViewProps) {
  const board = parse(node.attrs.data)
  const [over, setOver] = useState<string | null>(null)
  const drag = useRef<{ card: string; from: string } | null>(null)
  const editable = editor.isEditable

  const save = (b: Board) => updateAttributes({ data: JSON.stringify(b) })
  const patchCol = (id: string, f: (c: Column) => Column) => save({ columns: board.columns.map((c) => (c.id === id ? f(c) : c)) })

  const drop = (to: string, before?: string) => {
    const d = drag.current
    drag.current = null
    setOver(null)
    if (!d || !editable) return
    const src = board.columns.find((c) => c.id === d.from)
    const card = src?.cards.find((c) => c.id === d.card)
    if (!src || !card) return
    if (before === card.id) return
    const cols = board.columns.map((c) => ({ ...c, cards: c.cards.filter((x) => x.id !== card.id) }))
    const dest = cols.find((c) => c.id === to)
    if (!dest) return
    const at = before ? dest.cards.findIndex((x) => x.id === before) : -1
    dest.cards.splice(at < 0 ? dest.cards.length : at, 0, card)
    save({ columns: cols })
  }

  return (
    <NodeViewWrapper className="kanban" data-selected={selected} contentEditable={false}>
      <div className="kanban-cols">
        {board.columns.map((col) => (
          <div
            key={col.id}
            className={over === col.id ? 'kanban-col over' : 'kanban-col'}
            onDragOver={(e) => {
              if (!drag.current) return
              e.preventDefault()
              e.stopPropagation()
              setOver(col.id)
            }}
            onDragLeave={() => setOver((o) => (o === col.id ? null : o))}
            onDrop={(e) => {
              e.preventDefault()
              e.stopPropagation()
              drop(col.id)
            }}
          >
            <div className="kanban-head">
              <input
                value={col.title}
                readOnly={!editable}
                aria-label="Titre de la colonne"
                onChange={(e) => patchCol(col.id, (c) => ({ ...c, title: e.target.value }))}
              />
              <small>{col.cards.length}</small>
              {editable && board.columns.length > 1 && (
                <button type="button" aria-label="Supprimer la colonne" title="Supprimer la colonne" onClick={() => save({ columns: board.columns.filter((c) => c.id !== col.id) })}>
                  ×
                </button>
              )}
            </div>
            {col.cards.map((card) => (
              <div
                key={card.id}
                className="kanban-card"
                draggable={editable}
                onDragStart={(e) => {
                  e.stopPropagation()
                  drag.current = { card: card.id, from: col.id }
                  e.dataTransfer.effectAllowed = 'move'
                  e.dataTransfer.setData('text/plain', '')
                }}
                onDragEnd={() => {
                  drag.current = null
                  setOver(null)
                }}
                onDragOver={(e) => {
                  if (!drag.current) return
                  e.preventDefault()
                  e.stopPropagation()
                  setOver(col.id)
                }}
                onDrop={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  drop(col.id, card.id)
                }}
              >
                <textarea
                  value={card.text}
                  rows={1}
                  readOnly={!editable}
                  aria-label="Carte"
                  onChange={(e) => patchCol(col.id, (c) => ({ ...c, cards: c.cards.map((x) => (x.id === card.id ? { ...x, text: e.target.value } : x)) }))}
                  ref={(el) => {
                    if (el) {
                      el.style.height = 'auto'
                      el.style.height = `${el.scrollHeight}px`
                    }
                  }}
                />
                {editable && (
                  <button type="button" aria-label="Supprimer la carte" onClick={() => patchCol(col.id, (c) => ({ ...c, cards: c.cards.filter((x) => x.id !== card.id) }))}>
                    ×
                  </button>
                )}
              </div>
            ))}
            {editable && (
              <button type="button" className="kanban-add" onClick={() => patchCol(col.id, (c) => ({ ...c, cards: [...c.cards, { id: uid(), text: '' }] }))}>
                + Carte
              </button>
            )}
          </div>
        ))}
      </div>
      {editable && (
        <button type="button" className="kanban-newcol" onClick={() => save({ columns: [...board.columns, { id: uid(), title: 'Colonne', cards: [] }] })}>
          + Colonne
        </button>
      )}
    </NodeViewWrapper>
  )
}

export const Kanban = Node.create({
  name: 'kanban',
  group: 'block',
  atom: true,
  selectable: true,
  addAttributes() {
    return { data: { default: '' } }
  },
  parseHTML: () => [{ tag: 'div[data-kanban]' }],
  renderHTML: ({ HTMLAttributes }) => ['div', mergeAttributes({ 'data-kanban': '' }, HTMLAttributes.data ? { 'data-board': String(HTMLAttributes.data) } : {})],
  addNodeView: () => ReactNodeViewRenderer(KanbanView),
})
