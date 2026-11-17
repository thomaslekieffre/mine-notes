import { useEffect, useMemo, useState } from 'react'
import { Icon } from './Icon'
import { DueChip } from './DueChip'
import { byDue, dueState } from '../store/dates'
import { tasksOf, watchTasks } from '../store/todos'
import type { TodoItem } from '../store/todos'
import type { TreeNode } from '../store/tree'

interface Props {
  nodes: TreeNode[]
  onOpen: (id: string) => void
}

interface Group {
  node: TreeNode
  path: string
  tasks: TodoItem[]
}

/** Toutes les cases à cocher de toutes les notes, regroupées par note. */
export function TodoOverview({ nodes, onOpen }: Props) {
  const [groups, setGroups] = useState<Group[]>([])
  const [loading, setLoading] = useState(true)
  const [hideDone, setHideDone] = useState(false)
  const byId = useMemo(() => new Map(nodes.map((n) => [n.id, n])), [nodes])

  useEffect(() => {
    let alive = true
    let off: (() => void) | undefined
    const pathOf = (n: TreeNode) => {
      const parts: string[] = []
      let p = n.parentId ? byId.get(n.parentId) : undefined
      while (p) {
        parts.unshift(p.name)
        p = p.parentId ? byId.get(p.parentId) : undefined
      }
      return parts.join(' › ')
    }
    const refresh = () => {
      if (!alive) return
      const next = nodes
        .filter((n) => n.type === 'note')
        .map((node) => ({ node, path: pathOf(node), tasks: tasksOf(node.id) }))
        .filter((g) => g.tasks.length > 0)
      setGroups(next)
    }
    void watchTasks(nodes, refresh).then((cleanup) => {
      if (!alive) return cleanup()
      off = cleanup
      refresh()
      setLoading(false)
    })
    return () => {
      alive = false
      off?.()
    }
  }, [nodes, byId])

  const total = groups.reduce((n, g) => n + g.tasks.length, 0)
  const late = groups.reduce((n, g) => n + g.tasks.filter((t) => !t.checked && t.due && dueState(t.due) === 'overdue').length, 0)
  const done = groups.reduce((n, g) => n + g.tasks.filter((t) => t.checked).length, 0)

  return (
    <div className="doc-scroll">
      <div className="doc-wrap">
        <div className="crumbs">Vue d'ensemble</div>
        <h1 className="doc-title static">Toutes les todo</h1>
        <div className="todo-meta">
          <span>
            {done} faite{done > 1 ? 's' : ''} sur {total}
            {late > 0 && <b className="late-count"> · {late} en retard</b>}
          </span>
          <label className="todo-filter">
            <input type="checkbox" checked={hideDone} onChange={(e) => setHideDone(e.target.checked)} />
            Masquer les terminées
          </label>
        </div>

        {loading && <div className="tree-empty">Chargement…</div>}
        {!loading && total === 0 && (
          <div className="tree-empty">
            Aucune case à cocher pour l'instant. Dans une note, tape <kbd>/tâches</kbd> pour en créer.
          </div>
        )}

        {groups.map((g) => {
          const visible = hideDone ? g.tasks.filter((t) => !t.checked) : g.tasks
          const tasks = [...visible].sort((a, b) => Number(a.checked) - Number(b.checked) || byDue(a.due, b.due))
          if (tasks.length === 0) return null
          return (
            <section key={g.node.id} className="todo-group">
              <button type="button" className="todo-group-head" onClick={() => onOpen(g.node.id)}>
                <Icon name="check" size={14} />
                <span className="todo-note">{g.node.name}</span>
                {g.path && <span className="todo-path">{g.path}</span>}
              </button>
              {tasks.map((t, i) => (
                <label key={`${g.node.id}-${i}`} className={t.checked ? 'todo-row done' : 'todo-row'}>
                  <input type="checkbox" checked={t.checked} onChange={() => t.toggle()} />
                  <span>{t.text || '(vide)'}</span>
                  {!t.checked && <DueChip due={t.due} repeat={t.repeat} />}
                  {t.links.map((l, k) => {
                    const target = byId.get(l.id)
                    return (
                      <button
                        key={k}
                        type="button"
                        className={target ? 'note-link' : 'note-link broken'}
                        title={target ? 'Ouvrir la page' : 'Page supprimée'}
                        onClick={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          if (target) onOpen(target.id)
                        }}
                      >
                        <Icon name="file" size={12} />
                        {target?.name ?? l.label}
                      </button>
                    )
                  })}
                </label>
              ))}
            </section>
          )
        })}
      </div>
    </div>
  )
}
