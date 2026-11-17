import { useEffect, useMemo, useRef, useState } from 'react'
import { Icon, NodeIcon } from './Icon'
import { searchContent } from '../store/search'
import { collectTags, normTag, parseQuery } from '../store/tags'
import type { TagInfo } from '../store/tags'
import { projectOf } from '../store/tree'
import type { TreeNode } from '../store/tree'

interface Props {
  nodes: TreeNode[]
  onOpen: (id: string) => void
  onNewNote: (name: string) => void
  onClose: () => void
  /** Texte de départ (par exemple « #examen » quand on clique une étiquette). */
  initialQuery?: string
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

export function Palette({ nodes, onOpen, onNewNote, onClose, initialQuery = '' }: Props) {
  const [q, setQ] = useState(initialQuery)
  const [tagList, setTagList] = useState<TagInfo[]>([])
  const [idx, setIdx] = useState(0)
  const [textHits, setTextHits] = useState<Row[]>([])
  const inputRef = useRef<HTMLInputElement>(null)
  useEffect(() => inputRef.current?.focus(), [])

  const byId = useMemo(() => new Map(nodes.map((n) => [n.id, n])), [nodes])

  useEffect(() => {
    let alive = true
    void collectTags(nodes).then((t) => alive && setTagList(t))
    return () => {
      alive = false
    }
  }, [nodes])

  const parsed = useMemo(() => parseQuery(q), [q])
  const filtered = parsed.tags.length > 0 || !!parsed.kind || !!parsed.project
  // Notes qui portent toutes les étiquettes demandées.
  const tagged = useMemo(() => {
    if (parsed.tags.length === 0) return null
    return new Set(nodes.filter((n) => n.type === 'note' && parsed.tags.every((t) => tagList.some((x) => x.key.startsWith(t) && x.notes.includes(n.id)))).map((n) => n.id))
  }, [parsed.tags, tagList, nodes])
  const passes = (n: TreeNode) => {
    if (tagged && !tagged.has(n.id)) return false
    if (parsed.kind && n.kind !== parsed.kind) return false
    if (parsed.project) {
      const pid = projectOf(nodes, n.id)
      const pr = pid ? byId.get(pid) : undefined
      if (!pr || !norm(pr.name).includes(parsed.project)) return false
    }
    return true
  }
  // Suggestions d'étiquettes pendant la frappe d'un « # ».
  const lastTok = q.split(/\s+/).pop() ?? ''
  const suggestions = lastTok.startsWith('#') ? tagList.filter((t) => t.key.startsWith(normTag(lastTok.slice(1))) && t.key !== normTag(lastTok.slice(1))).slice(0, 8) : []
  const pickTag = (label: string) => {
    setQ(q.slice(0, q.length - lastTok.length) + '#' + label + ' ')
    inputRef.current?.focus()
  }

  const nameHits = useMemo<Row[]>(() => {
    const nq = norm(parsed.text.trim())
    return nodes
      .filter((n) => n.type === 'note' && passes(n))
      .map((n) => ({ n, path: pathOf(n, byId) }))
      .filter(({ n, path }) => !nq || fuzzy(nq, norm(n.name)) || norm(path).includes(nq))
      .sort((a, b) => {
        const sa = norm(a.n.name).startsWith(nq) ? 0 : 1
        const sb = norm(b.n.name).startsWith(nq) ? 0 : 1
        return sa - sb || a.n.name.localeCompare(b.n.name)
      })
      .slice(0, 30)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodes, byId, parsed, tagged])

  // Recherche dans le contenu des notes (en plus des titres), avec un petit délai.
  useEffect(() => {
    const query = parsed.text.trim()
    if (query.length < 2) {
      setTextHits([])
      return
    }
    let alive = true
    const t = setTimeout(() => {
      void searchContent(filtered ? nodes.filter(passes) : nodes, query).then((hits) => {
        if (alive) setTextHits(hits.map((h) => ({ n: h.node, path: pathOf(h.node, byId), snippet: h.snippet })))
      })
    }, 150)
    return () => {
      alive = false
      clearTimeout(t)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [parsed.text, nodes, byId, tagged])

  const inNames = new Set(nameHits.map((r) => r.n.id))
  const contentRows = textHits.filter((r) => !inNames.has(r.n.id))
  const rows = [...nameHits, ...contentRows]

  const choose = (i: number) => {
    const r = rows[i]
    if (r) onOpen(r.n.id)
    else if (parsed.text.trim() && !filtered) onNewNote(parsed.text.trim())
    onClose()
  }

  const renderRow = (r: Row, i: number) => {
    return (
      <div
        key={r.n.id}
        role="option"
        aria-selected={i === idx}
        className={i === idx ? 'palette-item active' : 'palette-item'}
        onMouseEnter={() => setIdx(i)}
        onClick={() => choose(i)}
      >
        <NodeIcon node={r.n} size={15} />
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
            placeholder="Aller à une note, chercher dans le texte, #étiquette, type:todo…"
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
              if (e.key === 'Tab' && suggestions[0]) {
                e.preventDefault()
                pickTag(suggestions[0].label)
              }
              if (e.key === 'Enter') choose(idx)
            }}
          />
        </div>
        {(suggestions.length > 0 || (!q && tagList.length > 0)) && (
          <div className="palette-tags">
            {(suggestions.length > 0 ? suggestions : tagList.slice(0, 10)).map((t) => (
              <button key={t.key} type="button" className="tag-chip" onClick={() => (suggestions.length > 0 ? pickTag(t.label) : setQ(`#${t.label} `))}>
                #{t.label} <small>{t.notes.length}</small>
              </button>
            ))}
          </div>
        )}
        <div className="palette-list" role="listbox">
          {nameHits.map((r, i) => renderRow(r, i))}
          {contentRows.length > 0 && <div className="palette-section">Dans le texte</div>}
          {contentRows.map((r, i) => renderRow(r, nameHits.length + i))}
          {rows.length === 0 && <div className="palette-empty">{filtered ? "Aucune note ne correspond à ces filtres." : "Aucune note trouvée. Entrée pour en créer une."}</div>}
        </div>
      </div>
    </div>
  )
}
