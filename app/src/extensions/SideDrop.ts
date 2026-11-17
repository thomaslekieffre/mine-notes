import { Extension } from '@tiptap/core'
import { Plugin, PluginKey } from '@tiptap/pm/state'
import type { Node as PMNode } from '@tiptap/pm/model'
import type { EditorView } from '@tiptap/pm/view'

// Glisser un bloc sur le bord gauche ou droit d'un autre bloc : les deux passent côte à côte (2 colonnes).
// Sur une rangée de 2 colonnes, on peut l'ajouter à gauche, à droite ou au milieu (3 colonnes).
// À 3 colonnes, la rangée est complète.

interface Strip {
  /** Où la colonne sera insérée (0 = tout à gauche). */
  index: number
  left: number
  width: number
  active: boolean
}

type Target =
  | { kind: 'wrap'; side: 'left' | 'right'; from: number; node: PMNode; strips: Strip[]; top: number; height: number }
  | { kind: 'full'; rowPos: number; rowNode: PMNode; before: boolean; strips: Strip[]; top: number; height: number }
  | { kind: 'row'; index: number; columnsPos: number; columnsNode: PMNode; strips: Strip[]; top: number; height: number }

const EDGE = 56 // largeur (px) de la zone sensible au bord d'un bloc
const ROW_EDGE = 40 // idem pour les bords d'une rangée de colonnes
const GUTTER = 48 // la marge autour du texte compte aussi comme zone de dépôt
const GAP = 24 // demi-largeur de la zone « au milieu » entre deux colonnes

const okParent = (n: PMNode) => n.type.name === 'doc' || n.type.name === 'column'

function blockAt(view: EditorView, event: { clientX: number; clientY: number }): { from: number; node: PMNode } | null {
  const box = view.dom.getBoundingClientRect()
  const x = Math.min(Math.max(event.clientX, box.left + 1), box.right - 1)
  const hit = view.posAtCoords({ left: x, top: event.clientY })
  if (!hit) return null
  const doc = view.state.doc
  if (hit.inside >= 0) {
    const n = doc.nodeAt(hit.inside)
    if (n && n.isBlock && okParent(doc.resolve(hit.inside).parent)) return { from: hit.inside, node: n }
  }
  const $p = doc.resolve(hit.pos)
  for (let d = $p.depth; d >= 1; d--) {
    if (okParent($p.node(d - 1))) return { from: $p.before(d), node: $p.node(d) }
  }
  return null
}

function find(view: EditorView, event: { clientX: number; clientY: number }): Target | null {
  const b = blockAt(view, event)
  if (!b) return null
  const doc = view.state.doc
  const x = event.clientX

  // Rangée de colonnes (soit le bloc visé est la rangée, soit il est dans une de ses colonnes).
  const $from = doc.resolve(b.from)
  const inColumn = $from.parent.type.name === 'column'
  const rowNode = b.node.type.name === 'columns' ? b.node : inColumn ? $from.node($from.depth - 1) : null
  const rowPos = b.node.type.name === 'columns' ? b.from : inColumn ? $from.before($from.depth - 1) : -1
  if (rowNode && rowPos >= 0) {
    const rowEl = view.nodeDOM(rowPos)
    if (!(rowEl instanceof HTMLElement)) return null
    if (rowNode.childCount >= 3) {
      // Rangée complète : sur les marges, le bloc se place avant ou après la rangée (jamais dans une colonne).
      const full = rowEl.getBoundingClientRect()
      if (x >= full.left && x <= full.right) return null
      return { kind: 'full', rowPos, rowNode, before: event.clientY < full.top + full.height / 2, strips: [], top: full.top, height: full.height }
    }
    const cols = [...rowEl.children].filter((c): c is HTMLElement => c instanceof HTMLElement)
    if (cols.length === 0) return null
    const rr = rowEl.getBoundingClientRect()
    if (event.clientY < rr.top - 8 || event.clientY > rr.bottom + 8) return null
    const rects = cols.map((c) => c.getBoundingClientRect())
    const strips: Strip[] = [{ index: 0, left: rects[0].left - GUTTER, width: ROW_EDGE + GUTTER, active: false }]
    for (let i = 1; i < rects.length; i++) {
      const c = (rects[i - 1].right + rects[i].left) / 2
      strips.push({ index: i, left: c - GAP, width: GAP * 2, active: false })
    }
    strips.push({ index: rects.length, left: rects[rects.length - 1].right - ROW_EDGE, width: ROW_EDGE + GUTTER, active: false })
    const hit = strips.find((s) => x >= s.left && x <= s.left + s.width)
    if (hit) hit.active = true
    return {
      kind: 'row',
      index: hit ? hit.index : -1,
      columnsPos: rowPos,
      columnsNode: rowNode,
      strips,
      top: rr.top,
      height: rr.height,
    }
  }

  // Bloc isolé : bords gauche et droit.
  const el = view.nodeDOM(b.from)
  if (!(el instanceof HTMLElement)) return null
  const r = el.getBoundingClientRect()
  const zone = Math.min(EDGE, r.width * 0.25)
  const side = x < r.left + zone ? 'left' : x > r.right - zone ? 'right' : null
  const strips: Strip[] = [
    { index: 0, left: r.left - GUTTER, width: zone + GUTTER, active: side === 'left' },
    { index: 1, left: r.right - zone, width: zone + GUTTER, active: side === 'right' },
  ]
  return { kind: 'wrap', side: side ?? 'left', from: b.from, node: b.node, strips, top: r.top, height: r.height }
}

const isActive = (t: Target) => (t.kind === 'row' ? t.index >= 0 : t.kind === 'full' ? false : t.strips.some((s) => s.active))

// Repères visuels : des bandes (discrètes) aux endroits où le bloc peut être déposé ; celle visée s'allume.
let overlay: HTMLDivElement | null = null
function mark(t: Target | null) {
  overlay?.remove()
  overlay = null
  document.body.classList.toggle('side-dropping', !!t && isActive(t))
  if (!t) return
  overlay = document.createElement('div')
  overlay.className = 'side-overlay'
  for (const s of t.strips) {
    const el = document.createElement('div')
    el.className = `side-strip${s.active ? ' active' : ''}`
    Object.assign(el.style, { left: `${s.left}px`, top: `${t.top}px`, width: `${s.width}px`, height: `${t.height}px` })
    if (s.active) el.textContent = 'Colonne'
    overlay.appendChild(el)
  }
  document.body.appendChild(overlay)
}

export const SideDrop = Extension.create({
  name: 'sideDrop',

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey('sideDrop'),
        props: {
          handleDOMEvents: {
            dragover: (view, event) => {
              mark(view.dragging ? find(view, event as DragEvent) : null)
              return false
            },
            dragleave: () => {
              mark(null)
              return false
            },
            dragend: () => {
              mark(null)
              return false
            },
          },
          handleDrop: (view, event, slice, moved) => {
            mark(null)
            if (!moved || slice.openStart || slice.openEnd) return false
            let bad = false
            slice.content.forEach((n) => {
              if (n.type.name === 'columns' || n.type.name === 'column') bad = true
            })
            if (bad) return false

            const t = find(view, event as DragEvent)
            if (!t || (!isActive(t) && t.kind !== 'full')) return false
            const sel = view.state.selection
            const { schema } = view.state
            const colType = schema.nodes.column
            const colsType = schema.nodes.columns
            if (!colType || !colsType) return false
            const tr = view.state.tr
            const fresh = colType.create(null, slice.content)

            if (t.kind === 'full') {
              if (t.rowPos >= sel.from && t.rowPos < sel.to) return false
              tr.insert(t.before ? t.rowPos : t.rowPos + t.rowNode.nodeSize, slice.content)
            } else if (t.kind === 'row') {
              if (t.columnsPos >= sel.from && t.columnsPos < sel.to) return false // déposé sur lui-même
              // Position de la colonne : après les `index` premières colonnes de la rangée.
              let pos = t.columnsPos + 1
              for (let i = 0; i < t.index; i++) pos += t.columnsNode.child(i).nodeSize
              tr.insert(pos, fresh)
            } else {
              if (t.from >= sel.from && t.from < sel.to) return false // déposé sur lui-même
              const side = t.strips[0].active ? 'left' : 'right'
              const existing = colType.create(null, t.node)
              tr.replaceWith(t.from, t.from + t.node.nodeSize, colsType.create(null, side === 'left' ? [fresh, existing] : [existing, fresh]))
            }

            // On retire le bloc d'origine (la sélection suit les changements ci-dessus).
            tr.setSelection(sel.map(tr.doc, tr.mapping))
            tr.deleteSelection()
            tr.setMeta('uiEvent', 'drop')
            view.dispatch(tr.scrollIntoView())
            view.focus()
            return true
          },
        },
      }),
    ]
  },
})
