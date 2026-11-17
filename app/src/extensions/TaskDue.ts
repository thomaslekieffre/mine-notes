import { TaskItem } from '@tiptap/extension-list'
import { Plugin, PluginKey } from '@tiptap/pm/state'
import { Decoration, DecorationSet } from '@tiptap/pm/view'
import type { EditorView } from '@tiptap/pm/view'
import { dueLabel, dueState, inDays, isDueKey, isRepeat, nextDue, nextMonday, REPEATS, repeatLabel } from '../store/dates'
import type { Repeat } from '../store/dates'

// Case à cocher avec une échéance facultative : une pastille en fin de ligne (« + date » au survol).

let pop: HTMLDivElement | null = null
const closePop = () => {
  pop?.remove()
  pop = null
  document.removeEventListener('mousedown', outside, true)
  document.removeEventListener('keydown', esc, true)
}
const outside = (e: MouseEvent) => {
  if (pop && !pop.contains(e.target as Node)) closePop()
}
const esc = (e: KeyboardEvent) => {
  if (e.key === 'Escape') {
    e.stopPropagation()
    closePop()
  }
}

function itemPos(view: EditorView, widgetPos: number): number {
  const $p = view.state.doc.resolve(widgetPos)
  for (let d = $p.depth; d > 0; d--) if ($p.node(d).type.name === 'taskItem') return $p.before(d)
  return -1
}

function setDue(view: EditorView, widgetPos: number, due: string | null, repeat?: Repeat | null) {
  const pos = itemPos(view, widgetPos)
  if (pos < 0) return
  const node = view.state.doc.nodeAt(pos)
  if (!node) return
  view.dispatch(view.state.tr.setNodeMarkup(pos, undefined, { ...node.attrs, due, repeat: due ? (repeat === undefined ? node.attrs.repeat : repeat) : null }))
}

function openPop(view: EditorView, anchor: HTMLElement, getPos: () => number | undefined, current: string | null, currentRepeat: Repeat | null) {
  closePop()
  const el = document.createElement('div')
  el.className = 'due-pop'
  const apply = (v: string | null) => {
    const p = getPos()
    if (p !== undefined) setDue(view, p, v)
    closePop()
    view.focus()
  }
  const add = (label: string, v: string) => {
    const b = document.createElement('button')
    b.type = 'button'
    b.textContent = label
    b.onclick = () => apply(v)
    el.appendChild(b)
  }
  add("Aujourd'hui", inDays(0))
  add('Demain', inDays(1))
  add('Lundi prochain', nextMonday())
  add('Dans une semaine', inDays(7))
  const input = document.createElement('input')
  input.type = 'date'
  input.value = current ?? ''
  input.setAttribute('aria-label', 'Choisir une date')
  input.onchange = () => apply(isDueKey(input.value) ? input.value : null)
  el.appendChild(input)
  const sel = document.createElement('select')
  sel.setAttribute('aria-label', 'Répétition')
  sel.innerHTML = `<option value="">Ne se répète pas</option>${REPEATS.map((r) => `<option value="${r.id}">${r.label}</option>`).join('')}`
  sel.value = currentRepeat ?? ''
  sel.onchange = () => {
    const p = getPos()
    if (p !== undefined) setDue(view, p, current ?? inDays(0), isRepeat(sel.value) ? sel.value : null)
    closePop()
    view.focus()
  }
  el.appendChild(sel)
  if (current) {
    const b = document.createElement('button')
    b.type = 'button'
    b.className = 'danger'
    b.textContent = "Retirer l'échéance"
    b.onclick = () => apply(null)
    el.appendChild(b)
  }
  document.body.appendChild(el)
  const r = anchor.getBoundingClientRect()
  const w = el.offsetWidth
  el.style.left = `${Math.max(8, Math.min(r.left, window.innerWidth - w - 8))}px`
  el.style.top = `${Math.min(r.bottom + 6, window.innerHeight - el.offsetHeight - 8)}px`
  pop = el
  setTimeout(() => {
    document.addEventListener('mousedown', outside, true)
    document.addEventListener('keydown', esc, true)
  })
}

export const TaskDue = TaskItem.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      due: {
        default: null,
        parseHTML: (el: HTMLElement) => {
          const v = el.getAttribute('data-due')
          return isDueKey(v) ? v : null
        },
        renderHTML: (attrs: Record<string, unknown>) => (isDueKey(attrs.due) ? { 'data-due': attrs.due } : {}),
      },
      repeat: {
        default: null,
        parseHTML: (el: HTMLElement) => {
          const v = el.getAttribute('data-repeat')
          return isRepeat(v) ? v : null
        },
        renderHTML: (attrs: Record<string, unknown>) => (isRepeat(attrs.repeat) ? { 'data-repeat': attrs.repeat } : {}),
      },
    }
  },

  addProseMirrorPlugins() {
    return [
      ...(this.parent?.() ?? []),
      // Une tâche répétée ne reste jamais cochée : cocher la repousse à sa prochaine échéance.
      new Plugin({
        key: new PluginKey('taskRepeat'),
        appendTransaction: (trs, _old, state) => {
          if (!trs.some((t) => t.docChanged)) return null
          let tr = state.tr
          let changed = false
          state.doc.descendants((node, pos) => {
            if (node.type.name !== 'taskItem' || !node.attrs.checked || !isRepeat(node.attrs.repeat) || !isDueKey(node.attrs.due)) return
            tr = tr.setNodeMarkup(pos, undefined, { ...node.attrs, checked: false, due: nextDue(node.attrs.due, node.attrs.repeat) })
            changed = true
          })
          return changed ? tr : null
        },
      }),
      new Plugin({
        key: new PluginKey('taskDue'),
        props: {
          decorations: (state) => {
            const decos: Decoration[] = []
            state.doc.descendants((node, pos) => {
              if (node.type.name !== 'taskItem') return
              const first = node.firstChild
              if (!first || first.type.name !== 'paragraph') return
              const due = isDueKey(node.attrs.due) ? node.attrs.due : null
              const repeat = isRepeat(node.attrs.repeat) ? node.attrs.repeat : null
              const at = pos + 1 + first.nodeSize - 1
              decos.push(
                Decoration.widget(
                  at,
                  (view, getPos) => {
                    const b = document.createElement('button')
                    b.type = 'button'
                    b.contentEditable = 'false'
                    b.className = due ? `due-chip ${dueState(due)}` : 'due-chip empty'
                    b.textContent = due ? `${repeat ? '↻ ' : ''}${dueLabel(due)}` : '+ date'
                    b.title = due ? `Échéance : ${due}${repeat ? ` · ${repeatLabel(repeat)}` : ''}` : 'Ajouter une échéance'
                    b.onmousedown = (e) => e.preventDefault()
                    b.onclick = (e) => {
                      e.preventDefault()
                      if (!view.editable) return
                      openPop(view, b, getPos, due, repeat)
                    }
                    return b
                  },
                  { side: 1, key: `due-${due ?? 'none'}-${repeat ?? ''}`, ignoreSelection: true },
                ),
              )
            })
            return DecorationSet.create(state.doc, decos)
          },
        },
      }),
    ]
  },
})
