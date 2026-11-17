import { useEffect, useMemo, useState } from 'react'
import { Icon, NodeIcon } from './Icon'
import { Mascot } from './Mascot'
import { DueChip } from './DueChip'
import { byDue, dueState } from '../store/dates'
import { computeStats } from '../store/stats'
import type { Stats } from '../store/stats'
import { watchTasks } from '../store/todos'
import { dayKey, streak, useActivity } from '../store/activity'
import type { Activity } from '../store/activity'
import { listSnapshots } from '../store/history'
import { pretty, useShortcuts } from '../store/shortcuts'
import type { TreeNode } from '../store/tree'

interface Props {
  nodes: TreeNode[]
  onOpen: (id: string) => void
  onOpenTodos: () => void
  onToday: () => void
  onNewNote: () => void
  onQuickTodo: () => void
  onSearch: () => void
}

const fmt = (n: number) => n.toLocaleString('fr-FR')
const KIND_LABEL: Record<string, string> = { note: 'Notes', todo: 'Todo', ideas: 'Idées', journal: 'Journal' }
const KIND_COLOR: Record<string, string> = { note: 'var(--c-blue)', todo: 'var(--c-orange)', ideas: 'var(--c-purple)', journal: 'var(--c-green)' }

function greeting() {
  const h = new Date().getHours()
  return h < 5 ? 'Bonne nuit' : h < 12 ? 'Bonjour' : h < 18 ? 'Bon après-midi' : 'Bonsoir'
}

const ago = (t: number) => {
  const m = Math.round((Date.now() - t) / 60000)
  if (m < 1) return "à l'instant"
  if (m < 60) return `il y a ${m} min`
  const h = Math.round(m / 60)
  if (h < 24) return `il y a ${h} h`
  const d = Math.round(h / 24)
  return d === 1 ? 'hier' : `il y a ${d} jours`
}

function Tile({ label, value, sub, onClick }: { label: string; value: string; sub?: string; onClick?: () => void }) {
  const inner = (
    <>
      <span className="dash-tile-label">{label}</span>
      <span className="dash-tile-value">{value}</span>
      {sub && <span className="dash-tile-sub">{sub}</span>}
    </>
  )
  return onClick ? (
    <button type="button" className="dash-tile clickable" onClick={onClick}>
      {inner}
    </button>
  ) : (
    <div className="dash-tile">{inner}</div>
  )
}

/** Carte des 20 dernières semaines : une case par jour, d'autant plus foncée qu'on a écrit de mots. */
function Heatmap({ activity }: { activity: Activity }) {
  const [tip, setTip] = useState<string | null>(null)
  const WEEKS = 20
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  // Colonnes = semaines (lundi en haut), la dernière colonne contient aujourd'hui.
  const dow = (today.getDay() + 6) % 7
  const start = new Date(today)
  start.setDate(today.getDate() - dow - (WEEKS - 1) * 7)
  const days: Array<{ key: string; date: Date; w: number; e: number; future: boolean }> = []
  for (let i = 0; i < WEEKS * 7; i++) {
    const d = new Date(start)
    d.setDate(start.getDate() + i)
    const a = activity[dayKey(d)]
    days.push({ key: dayKey(d), date: d, w: a?.w ?? 0, e: a?.e ?? 0, future: d > today })
  }
  const max = Math.max(1, ...days.map((d) => d.w))
  const level = (d: (typeof days)[number]) => (d.e === 0 ? 0 : d.w === 0 ? 1 : 1 + Math.min(3, Math.ceil((d.w / max) * 3)))
  const label = (d: (typeof days)[number]) =>
    `${d.date.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })} : ${d.e === 0 ? 'rien écrit' : `${fmt(d.w)} mot${d.w > 1 ? 's' : ''} écrit${d.w > 1 ? 's' : ''}`}`

  return (
    <div className="heatmap-wrap">
      <div className="heatmap" role="img" aria-label="Activité d'écriture des 15 dernières semaines">
        {days.map((d) => (
          <span
            key={d.key}
            className={`hm-cell lv${level(d)}${d.future ? ' future' : ''}`}
            onMouseEnter={() => setTip(label(d))}
            onMouseLeave={() => setTip(null)}
            title={label(d)}
          />
        ))}
      </div>
      <div className="hm-legend">
        <span>{tip ?? 'Passe sur une case pour voir le détail'}</span>
        <span className="hm-scale" aria-hidden="true">
          moins {[0, 1, 2, 3, 4].map((l) => <span key={l} className={`hm-cell lv${l}`} />)} plus
        </span>
      </div>
    </div>
  )
}

/** Mots écrits par jour sur les 14 derniers jours. */
function WordsBars({ activity }: { activity: Activity }) {
  const days = Array.from({ length: 14 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (13 - i))
    return { date: d, w: activity[dayKey(d)]?.w ?? 0 }
  })
  const max = Math.max(1, ...days.map((d) => d.w))
  const total = days.reduce((n, d) => n + d.w, 0)
  return (
    <div>
      <div className="bars" role="img" aria-label={`Mots écrits sur 14 jours : ${total}`}>
        {days.map((d, i) => (
          <div key={i} className="bar-col" title={`${d.date.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })} : ${fmt(d.w)} mots`}>
            <span className="bar" style={{ height: `${Math.max(d.w > 0 ? 4 : 0, (d.w / max) * 100)}%` }} />
          </div>
        ))}
      </div>
      <div className="bars-axis">
        <span>{days[0].date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}</span>
        <span>{fmt(total)} mots sur 14 jours</span>
        <span>aujourd'hui</span>
      </div>
    </div>
  )
}

/** Écran d'accueil : ce qu'il y a à faire, ce qui bouge, et des chiffres sur l'écriture. */
export function Dashboard({ nodes, onOpen, onOpenTodos, onToday, onNewNote, onQuickTodo, onSearch }: Props) {
  const [stats, setStats] = useState<Stats | null>(null)
  const [snapTimes, setSnapTimes] = useState<Record<string, number>>({})
  const activity = useActivity()
  const keys = useShortcuts()
  const byId = useMemo(() => new Map(nodes.map((n) => [n.id, n])), [nodes])
  const todayNote = nodes.find((n) => n.type === 'note' && n.day === dayKey())

  // Chiffres : recalculés quand l'arborescence ou une case à cocher change.
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

  // Pour les notes sans date de modification (écrites avant cette version), on retombe sur leur dernier instantané.
  useEffect(() => {
    let alive = true
    void (async () => {
      const out: Record<string, number> = {}
      for (const n of nodes) {
        if (n.type !== 'note' || n.updatedAt) continue
        const l = await listSnapshots(n.id)
        if (l.length > 0) out[n.id] = l[l.length - 1].t
      }
      if (alive) setSnapTimes(out)
    })()
    return () => {
      alive = false
    }
  }, [nodes])

  const recent = useMemo(
    () =>
      nodes
        .filter((n) => n.type === 'note')
        .map((n) => ({ n, t: n.updatedAt ?? snapTimes[n.id] ?? 0 }))
        .filter((r) => r.t > 0)
        .sort((a, b) => b.t - a.t)
        .slice(0, 7),
    [nodes, snapTimes],
  )

  const pathOf = (n: TreeNode) => {
    const parts: string[] = []
    for (let p = n.parentId ? byId.get(n.parentId) : undefined; p; p = p.parentId ? byId.get(p.parentId) : undefined) parts.unshift(p.name)
    return parts.join(' › ')
  }

  const upcoming = stats ? [...stats.openTasks].sort((a, b) => byDue(a.due, b.due)) : []
  const late = upcoming.filter((t) => t.due && dueState(t.due) === 'overdue').length
  const totalTasks = stats ? stats.tasksOpen + stats.tasksDone : 0
  const doneRate = totalTasks > 0 && stats ? Math.round((stats.tasksDone / totalTasks) * 100) : 0
  const s = streak(activity)
  const weekWords = Array.from({ length: 7 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - i)
    return activity[dayKey(d)]?.w ?? 0
  }).reduce((a, b) => a + b, 0)
  const kindTotal = stats ? Object.values(stats.byKind).reduce((a, b) => a + b, 0) : 0

  return (
    <div className="doc-scroll">
      <div className="dash">
        <header className="dash-head">
          <Mascot size={64} />
          <div className="dash-hello">
            <h1>{greeting()} !</h1>
            <p>{new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
          </div>
          <div className="dash-actions">
            <button type="button" className="btn primary" onClick={onToday}>
              {todayNote ? 'Ouvrir la note du jour' : 'Écrire la note du jour'}
            </button>
            <button type="button" className="btn" onClick={onNewNote}>
              Nouvelle note
            </button>
            <button type="button" className="btn" onClick={onQuickTodo}>
              Ajouter une tâche
            </button>
            <button type="button" className="btn" onClick={onSearch}>
              Rechercher <kbd>{pretty(keys.palette)}</kbd>
            </button>
          </div>
        </header>

        <section className="dash-tiles" aria-label="Chiffres clés">
          <Tile label="Tâches à faire" value={stats ? fmt(stats.tasksOpen) : '…'} sub={stats ? (late > 0 ? `${late} en retard · ${fmt(stats.tasksDone)} faites` : `${fmt(stats.tasksDone)} faites (${doneRate} %)`) : undefined} onClick={onOpenTodos} />
          <Tile label="Série d'écriture" value={`${s} jour${s > 1 ? 's' : ''}`} sub={s > 0 ? 'd’affilée' : 'écris aujourd’hui pour la lancer'} />
          <Tile label="Mots cette semaine" value={fmt(weekWords)} sub="7 derniers jours" />
          <Tile label="Notes" value={stats ? fmt(stats.notes) : '…'} sub={stats ? `${fmt(stats.words)} mots · ${stats.projects} projet${stats.projects > 1 ? 's' : ''}` : undefined} />
        </section>

        <div className="dash-cols">
          <section className="dash-card">
            <div className="dash-card-head">
              <h2>À faire</h2>
              <button type="button" className="link-btn" onClick={onOpenTodos}>
                Toutes les todo
              </button>
            </div>
            {!stats && <div className="tree-empty">Chargement…</div>}
            {stats && stats.openTasks.length === 0 && <div className="tree-empty">Rien en attente. Profites-en !</div>}
            {upcoming.slice(0, 9).map((t, i) => (
              <label key={`${t.note.id}-${i}`} className="todo-row">
                <input type="checkbox" checked={t.checked} onChange={() => t.toggle()} />
                <span className="dash-task">
                  {t.text || '(vide)'}
                  {t.project && <small>{t.project.name}</small>}
                </span>
                <DueChip due={t.due} />
                {t.links.slice(0, 1).map((l, k) => {
                  const target = byId.get(l.id)
                  return (
                    <button
                      key={k}
                      type="button"
                      className={target ? 'note-link' : 'note-link broken'}
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
            {stats && upcoming.length > 9 && (
              <button type="button" className="link-btn more" onClick={onOpenTodos}>
                + {upcoming.length - 9} autres tâches
              </button>
            )}
          </section>

          <section className="dash-card">
            <div className="dash-card-head">
              <h2>Récemment modifiées</h2>
            </div>
            {recent.length === 0 && <div className="tree-empty">Ce qui sera modifié apparaîtra ici.</div>}
            {recent.map(({ n, t }) => (
              <button key={n.id} type="button" className="recent-row" onClick={() => onOpen(n.id)}>
                <NodeIcon node={n} size={15} />
                <span className="recent-name">{n.name}</span>
                <span className="recent-meta">{pathOf(n) ? `${pathOf(n)} · ` : ''}{ago(t)}</span>
              </button>
            ))}
          </section>
        </div>

        {stats && stats.projectStats.length > 0 && (
          <section className="dash-card">
            <div className="dash-card-head">
              <h2>Projets</h2>
            </div>
            <div className="proj-grid">
              {stats.projectStats.map((p) => {
                const total = p.open + p.done
                const rate = total ? Math.round((p.done / total) * 100) : 0
                return (
                  <button key={p.node.id} type="button" className="proj-card" onClick={() => onOpen(nodes.find((n) => n.parentId === p.node.id && n.kind === 'todo')?.id ?? p.node.id)}>
                    <span className="proj-name">
                      <NodeIcon node={p.node} size={15} /> {p.node.name}
                    </span>
                    <span className="proj-bar" role="img" aria-label={`${rate} % des tâches faites`}>
                      <span style={{ width: `${rate}%` }} />
                    </span>
                    <span className="proj-meta">
                      {total > 0 ? `${p.done}/${total} tâches · ${rate} %` : 'Pas de tâche'} · {p.notes} note{p.notes > 1 ? 's' : ''}
                    </span>
                  </button>
                )
              })}
            </div>
          </section>
        )}

        <div className="dash-cols">
          <section className="dash-card">
            <div className="dash-card-head">
              <h2>Activité d'écriture</h2>
            </div>
            <Heatmap activity={activity} />
            <div className="dash-sep" />
            <WordsBars activity={activity} />
          </section>

          <section className="dash-card">
            <div className="dash-card-head">
              <h2>Tes notes</h2>
            </div>
            {stats && kindTotal > 0 && (
              <>
                <div className="stack" role="img" aria-label="Répartition des notes par type">
                  {(['note', 'todo', 'ideas', 'journal'] as const)
                    .filter((k) => stats.byKind[k] > 0)
                    .map((k) => (
                      <span key={k} className="stack-seg" style={{ flex: stats.byKind[k], background: KIND_COLOR[k] }} title={`${KIND_LABEL[k]} : ${stats.byKind[k]}`} />
                    ))}
                </div>
                <ul className="stack-legend">
                  {(['note', 'todo', 'ideas', 'journal'] as const).map((k) => (
                    <li key={k}>
                      <i style={{ background: KIND_COLOR[k] }} /> {KIND_LABEL[k]} <b>{stats.byKind[k]}</b>
                    </li>
                  ))}
                </ul>
                <div className="dash-sep" />
                <div className="dash-subtitle">Les plus longues</div>
                {stats.longest.slice(0, 5).map(({ node, words }) => (
                  <button key={node.id} type="button" className="recent-row" onClick={() => onOpen(node.id)}>
                    <NodeIcon node={node} size={15} />
                    <span className="recent-name">{node.name}</span>
                    <span className="recent-meta">{fmt(words)} mots</span>
                  </button>
                ))}
              </>
            )}
          </section>
        </div>
      </div>
    </div>
  )
}
