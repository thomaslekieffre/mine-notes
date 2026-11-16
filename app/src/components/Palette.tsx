import { useEffect, useMemo, useRef, useState } from 'react'
import { Icon, nodeIcon } from './Icon'
import { searchContent } from '../store/search'
import type { TreeNode } from '../store/tree'

interface Props {
  nodes: TreeNode[]
  onOpen: (id: string) => void
  onNewNote: (name: string) => void
  onClose: () => void
}

interface Row {
  n: TreeNode
  path: string
  snippet?: string
}

function pathOf(n: TreeNode, byId: Map<string, TreeNode>): string {
  const parts: string[] = []
  let p = n.parentId ? byId.get(n.parentId) : undefined
  while (p) {
    parts.unshift(p.name)
    p = p.parentId ? byId.get(p.parentId) : undefined
  }
  return parts.join(' › ')
}

const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

/** Vrai si les lettres de `q` apparaissent dans l'ordre dans `s`. */
function fuzzy(q: string, s: string): boolean {
  let i = 0
  for (const ch of s) if (ch === q[i]) i++
  return i === q.length
}

export function Palette({ nodes, onOpen, onNewNote, onClose }: Props) {
  const [q, setQ] = useState('')
  const [idx, setIdx] = useState(0)
  const [textHits, setTextHits] = useState<Row[]>([])
  const inputRef = useRef<HTMLInputElement>(null)
  useEffect(() => inputRef.current?.focus(), [])

  const byId = useMemo(() => new Map(nodes.map((n) => [n.id, n])), [nodes])

  const nameHits = useMemo<Row[]>(() => {
    const nq = norm(q.trim())
    return nodes
      .filter((n) => n.type === 'note')
      .map((n) => ({ n, path: pathOf(n, byId) }))
      .filter(({ n, path }) => !nq || fuzzy(nq, norm(n.name)) || norm(path).includes(nq))
      .sort((a, b) => {
        const sa = norm(a.n.name).startsWith(nq) ? 0 : 1
        const sb = norm(b.n.name).startsWith(nq) ? 0 : 1
        return sa - sb || a.n.name.localeCompare(b.n.name)
      })
      .slice(0, 30)
  }, [nodes, byId, q])

  // Recherche dans le contenu des notes (en plus des titres), avec un petit délai.
  useEffect(() => {
    const query = q.trim()
    if (query.length < 2) {
      setTextHits([])
      return
    }
    let alive = true
    const t = setTimeout(() => {
      void searchContent(nodes, query).then((hits) => {
        if (alive) setTextHits(hits.map((h) => ({ n: h.node, path: pathOf(h.node, byId), snippet: h.snippet })))
      })
    }, 150)
    return () => {
      alive = false
      clearTimeout(t)
    }
  }, [q, nodes, byId])

  const inNames = new Set(nameHits.map((r) => r.n.id))
  const contentRows = textHits.filter((r) => !inNames.has(r.n.id))
  const rows = [...nameHits, ...contentRows]

  const choose = (i: number) => {
    const r = rows[i]
    if (r) onOpen(r.n.id)
    else if (q.trim()) onNewNote(q.trim())
    onClose()
  }

  const renderRow = (r: Row, i: number) => {
    const { icon, color } = nodeIcon(r.n)
    return (
      <div
        key={r.n.id}
        role="option"
        aria-selected={i === idx}
        className={i === idx ? 'palette-item active' : 'palette-item'}
        onMouseEnter={() => setIdx(i)}
        onClick={() => choose(i)}
      >
        <Icon name={icon} size={15} style={{ color }} />
        <span style={{ minWidth: 0 }}>
          <span>{r.n.name}</span>
          {r.snippet && <span className="palette-snippet">{r.snippet}</span>}
        </span>
        {r.path && <span className="palette-path">{r.path}</span>}
      </div>
    )
  }

  return (
    <div className="overlay" onMouseDown={onClose}>
      <div className="palette" role="dialog" aria-label="Aller à une note" onMouseDown={(e) => e.stopPropagation()}>
        <div className="palette-input">
          <Icon name="search" size={16} />
          <input
            ref={inputRef}
            value={q}
            placeholder="Aller à une note ou chercher dans le texte…"
            onChange={(e) => {
              setQ(e.target.value)
              setIdx(0)
            }}
            onKeyDown={(e) => {
              if (e.key === 'Escape') onClose()
              if (e.key === 'ArrowDown') {
                e.preventDefault()
                setIdx((i) => Math.min(i + 1, Math.max(rows.length - 1, 0)))
              }
              if (e.key === 'ArrowUp') {
                e.preventDefault()
                setIdx((i) => Math.max(i - 1, 0))
              }
              if (e.key === 'Enter') choose(idx)
            }}
          />
        </div>
        <div className="palette-list" role="listbox">
          {nameHits.map((r, i) => renderRow(r, i))}
          {contentRows.length > 0 && <div className="palette-section">Dans le texte</div>}
          {contentRows.map((r, i) => renderRow(r, nameHits.length + i))}
          {rows.length === 0 && <div className="palette-empty">Aucune note trouvée. Entrée pour en créer une.</div>}
        </div>
      </div>
    </div>
  )
}
