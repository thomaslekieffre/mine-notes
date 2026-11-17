import { Extension } from '@tiptap/core'
import { Plugin, PluginKey } from '@tiptap/pm/state'
import type { Node as PMNode } from '@tiptap/pm/model'
import type { EditorView } from '@tiptap/pm/view'

// Glisser un bloc sur le bord gauche ou droit d'un autre bloc : les deux passent côte à côte
// (2 colonnes, puis 3 si on recommence). Sur le bord d'une rangée existante, une colonne s'ajoute.

interface Target {
  side: 'left' | 'right' | null
  zone: number
  rect: DOMRect
  from: number
  node: PMNode
  el: HTMLElement
  column: { pos: number; node: PMNode; columnsCount: number } | null
}

const EDGE = 56 // largeur (px) de la zone sensible, sur chaque bord

function find(view: EditorView, event: { clientX: number; clientY: number }): Target | null {
  const box = view.dom.getBoundingClientRect()
  const x = Math.min(Math.max(event.clientX, box.left + 1), box.right - 1)
  const hit = view.posAtCoords({ left: x, top: event.clientY })
  if (!hit) return null
  const doc = view.state.doc
  const okParent = (n: PMNode) => n.type.name === 'doc' || n.type.name === 'column'

  let from = -1
  let node: PMNode | null = null
  if (hit.inside >= 0) {
    const n = doc.nodeAt(hit.inside)
    if (n && n.isBlock && okParent(doc.resolve(hit.inside).parent)) {
      from = hit.inside
      node = n
    }
  }
  if (!node) {
    const $p = doc.resolve(hit.pos)
    for (let d = $p.depth; d >= 1; d--) {
      if (okParent($p.node(d - 1))) {
        from = $p.before(d)
        node = $p.node(d)
        break
      }
    }
  }
  if (!node || from < 0) return null
  const el = view.nodeDOM(from)
  if (!(el instanceof HTMLElement)) return null
  const r = el.getBoundingClientRect()
  const zone = Math.min(EDGE, r.width * 0.25)
  const side = event.clientX < r.left + zone ? 'left' : event.clientX > r.right - zone ? 'right' : null

  const $from = doc.resolve(from)
  const column =
    $from.parent.type.name === 'column'
      ? { pos: $from.before($from.depth), node: $from.parent, columnsCount: $from.node($from.depth - 1).childCount }
      : null
  return { side, zone, rect: r, from, node, el, column }
}

// Repères visuels : deux bandes sur les bords du bloc survolé (discrètes), celle où l'on se trouve s'allume.
let overlay: HTMLDivElement | null = null
function strip(side: 'left' | 'right', t: Target, active: boolean) {
  const el = document.createElement('div')
  el.className = `side-strip side-strip-${side}${active ? ' active' : ''}`
  const x = side === 'left' ? t.rect.left - 10 : t.rect.right - t.zone
  Object.assign(el.style, { left: `${x}px`, top: `${t.rect.top}px`, width: `${t.zone + 10}px`, height: `${t.rect.height}px` })
  if (active) el.textContent = 'Colonne'
  return el
}
function mark(t: Target | null) {
  overlay?.remove()
  overlay = null
  document.body.classList.toggle('side-dropping', !!t?.side)
  if (!t) return
  overlay = document.createElement('div')
  overlay.className = 'side-overlay'
  overlay.append(strip('left', t, t.side === 'left'), strip('right', t, t.side === 'right'))
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
            if (!t || !t.side) return false
            const sel = view.state.selection
            if (t.from >= sel.from && t.from < sel.to) return false // déposé sur lui-même

            const { schema } = view.state
            const colType = schema.nodes.column
            const colsType = schema.nodes.columns
            if (!colType || !colsType) return false
            const tr = view.state.tr
            const fresh = colType.create(null, slice.content)

            if (t.column) {
              if (t.column.columnsCount >= 3) return false
              tr.insert(t.side === 'left' ? t.column.pos : t.column.pos + t.column.node.nodeSize, fresh)
            } else if (t.node.type.name === 'columns') {
              if (t.node.childCount >= 3) return false
              tr.insert(t.side === 'left' ? t.from + 1 : t.from + t.node.nodeSize - 1, fresh)
            } else {
              const existing = colType.create(null, t.node)
              tr.replaceWith(t.from, t.from + t.node.nodeSize, colsType.create(null, t.side === 'left' ? [fresh, existing] : [existing, fresh]))
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
