import { useEffect, useMemo, useState } from 'react'
import { Icon } from './Icon'
import { computeStats } from '../store/stats'
import type { Stats } from '../store/stats'
import { watchTasks } from '../store/todos'
import { dayKey } from '../store/activity'
import { dueState } from '../store/dates'
import { ensureDailyNote } from '../store/tree'
import type { TreeNode } from '../store/tree'

interface Props {
  nodes: TreeNode[]
  onOpen: (id: string) => void
}

const MONTHS = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre']
const DAYS = ['lun.', 'mar.', 'mer.', 'jeu.', 'ven.', 'sam.', 'dim.']

/** Calendrier du mois : notes du jour et tâches à échéance. Un clic sur un jour ouvre (ou crée) sa note. */
export function Calendar({ nodes, onOpen }: Props) {
  const now = new Date()
  const [cursor, setCursor] = useState(() => new Date(now.getFullYear(), now.getMonth(), 1))
  const [stats, setStats] = useState<Stats | null>(null)

  useEffect(() => {
    let alive = true
    let off: (() => void) | undefined
    let timer: number | undefined
    const refresh = () => {
      window.clearTimeout(timer)
      timer = window.setTimeout(() => void computeStats(nodes).then((s) => alive && setStats(s)), 150)
    }
    void watchTasks(nodes, refresh).then((cleanup) => {
      if (!alive) return cleanup()
      off = cleanup
      refresh()
    })
    return () => {
      alive = false
      window.clearTimeout(timer)
      off?.()
    }
  }, [nodes])

  const dailyByKey = useMemo(() => new Map(nodes.filter((n) => n.type === 'note' && n.day).map((n) => [n.day!, n])), [nodes])
  const tasksByKey = useMemo(() => {
    const m = new Map<string, NonNullable<Stats['openTasks']>>()
    for (const t of stats?.openTasks ?? []) if (t.due) m.set(t.due, [...(m.get(t.due) ?? []), t])
    return m
  }, [stats])

  const first = new Date(cursor)
  const lead = (first.getDay() + 6) % 7
  const start = new Date(first)
  start.setDate(1 - lead)
  const cells = Array.from({ length: 42 }, (_, i) => {
    const d = new Date(start)
    d.setDate(start.getDate() + i)
    return d
  })
  const rows = cells[35].getMonth() === cursor.getMonth() ? 6 : 5
  const today = dayKey()

  const openDay = (d: Date) => {
    const k = dayKey(d)
    const existing = dailyByKey.get(k)
    onOpen(existing ? existing.id : ensureDailyNote(d).noteId)
  }
  const shift = (n: number) => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + n, 1))

  return (
    <div className="doc-scroll">
      <div className="doc-wrap cal-wrap">
        <div className="crumbs">Vue d'ensemble</div>
        <div className="cal-head">
          <h1 className="doc-title static">
            {MONTHS[cursor.getMonth()]} {cursor.getFullYear()}
          </h1>
          <div className="cal-nav">
            <button type="button" className="icon-btn" aria-label="Mois précédent" onClick={() => shift(-1)}>
              <Icon name="chevR" size={14} style={{ transform: 'rotate(180deg)' }} />
            </button>
            <button type="button" className="btn" onClick={() => setCursor(new Date(now.getFullYear(), now.getMonth(), 1))}>
              Aujourd'hui
            </button>
            <button type="button" className="icon-btn" aria-label="Mois suivant" onClick={() => shift(1)}>
              <Icon name="chevR" size={14} />
            </button>
          </div>
        </div>

        <div className="cal-grid" role="grid">
          {DAYS.map((d) => (
            <div key={d} className="cal-dow">
              {d}
            </div>
          ))}
          {cells.slice(0, rows * 7).map((d) => {
            const k = dayKey(d)
            const daily = dailyByKey.get(k)
            const tasks = tasksByKey.get(k) ?? []
            const cls = ['cal-day', d.getMonth() !== cursor.getMonth() && 'out', k === today && 'today'].filter(Boolean).join(' ')
            return (
              <div key={k} className={cls} onClick={() => openDay(d)} title={daily ? 'Ouvrir la note du jour' : 'Créer la note de ce jour'}>
                <span className="cal-num">{d.getDate()}</span>
                {daily && (
                  <button
                    type="button"
                    className="cal-chip note"
                    onClick={(e) => {
                      e.stopPropagation()
                      onOpen(daily.id)
                    }}
                  >
                    Note du jour
                  </button>
                )}
                {tasks.slice(0, 3).map((t, i) => (
                  <button
                    key={i}
                    type="button"
                    className={`cal-chip task ${dueState(k)}`}
                    title={t.text}
                    onClick={(e) => {
                      e.stopPropagation()
                      onOpen(t.note.id)
                    }}
                  >
                    {t.text || '(vide)'}
                  </button>
                ))}
                {tasks.length > 3 && <span className="cal-more">+ {tasks.length - 3}</span>}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
