import { useEffect, useMemo, useRef, useState } from 'react'
import type { DragEvent, MouseEvent } from 'react'
import { Icon, nodeIcon } from './Icon'
import type { IconName } from './Icon'
import { Mascot } from './Mascot'
import { pretty, useShortcuts } from '../store/shortcuts'
import { SIDEBAR_MIN, resetSidebarWidth, setSidebarCollapsed, setSidebarWidth } from '../store/layout'
import { moveNode, moveToRoot } from '../store/tree'
import type { DropPosition, NodeType, NoteKind, TreeNode } from '../store/tree'

interface Props {
  nodes: TreeNode[]
  selectedId: string | null
  activeId: string | null
  expanded: string[]
  renamingId: string | null
  onSelect: (n: TreeNode) => void
  onToggle: (id: string) => void
  onExpand: (id: string) => void
  onCreate: (type: NodeType, parentId?: string | null, kind?: NoteKind) => void
  onStartRename: (id: string) => void
  onCommitRename: (id: string, name: string) => void
  onCancelRename: () => void
  onDelete: (n: TreeNode) => void
  onOpenPalette: () => void
  onOpenTodos: () => void
  onOpenToday: () => void
  onOpenSettings: () => void
  trashCount: number
  onOpenTrash: () => void
  todosActive: boolean
}

interface MenuState {
  x: number
  y: number
  node: TreeNode | null
}

const isContainer = (n: TreeNode) => n.type !== 'note'

/** Bord de la barre latérale : on le glisse pour changer la largeur, double-clic pour revenir à la largeur d'origine. */
function Resizer() {
  const start = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault()
    document.body.classList.add('resizing')
    const box = e.currentTarget.parentElement?.getBoundingClientRect()
    const left = box?.left ?? 0
    const initial = box?.width ?? SIDEBAR_MIN
    // Écoute sur la fenêtre : la barre peut se replier (et disparaître) pendant le glissé.
    const move = (ev: PointerEvent) => {
      const w = ev.clientX - left
      // Tiré presque tout à gauche : la barre se replie.
      if (w < SIDEBAR_MIN - 70) {
        setSidebarWidth(initial) // à la réouverture, on retrouve la largeur d'avant
        setSidebarCollapsed(true)
      } else {
        setSidebarCollapsed(false)
        setSidebarWidth(w)
      }
    }
    const end = () => {
      document.body.classList.remove('resizing')
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', end)
      window.removeEventListener('pointercancel', end)
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', end)
    window.addEventListener('pointercancel', end)
  }
  return <div className="sidebar-resizer" role="separator" aria-orientation="vertical" aria-label="Redimensionner la barre latérale" title="Glisser pour redimensionner · double-clic pour réinitialiser" onPointerDown={start} onDoubleClick={resetSidebarWidth} />
}

function RenameInput({
  initial,
  onCommit,
  onCancel,
}: {
  initial: string
  onCommit: (v: string) => void
  onCancel: () => void
}) {
  const ref = useRef<HTMLInputElement>(null)
  const done = useRef(false)
  useEffect(() => {
    ref.current?.focus()
    ref.current?.select()
  }, [])
  const finish = (commit: boolean, value: string) => {
    if (done.current) return
    done.current = true
    if (commit) onCommit(value)
    else onCancel()
  }
  return (
    <input
      ref={ref}
      className="rename"
      defaultValue={initial}
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => {
        if (e.key === 'Enter') finish(true, e.currentTarget.value)
        if (e.key === 'Escape') finish(false, '')
      }}
      onBlur={(e) => finish(true, e.currentTarget.value)}
    />
  )
}

export function Sidebar(props: Props) {
  const { nodes, selectedId, activeId, expanded, renamingId } = props
  const keys = useShortcuts()
  const [menu, setMenu] = useState<MenuState | null>(null)
  const [drop, setDrop] = useState<{ id: string; pos: DropPosition } | null>(null)
  const dragId = useRef<string | null>(null)

  const byParent = useMemo(() => {
    const m = new Map<string | null, TreeNode[]>()
    for (const n of nodes) {
      const list = m.get(n.parentId) ?? []
      list.push(n)
      m.set(n.parentId, list)
    }
    for (const list of m.values()) list.sort((a, b) => a.order - b.order)
    return m
  }, [nodes])

  useEffect(() => {
    if (!menu) return
    const close = () => setMenu(null)
    window.addEventListener('pointerdown', close)
    window.addEventListener('blur', close)
    return () => {
      window.removeEventListener('pointerdown', close)
      window.removeEventListener('blur', close)
    }
  }, [menu])

  const zoneFor = (e: DragEvent<HTMLElement>, n: TreeNode): DropPosition => {
    const r = e.currentTarget.getBoundingClientRect()
    const y = (e.clientY - r.top) / r.height
    if (isContainer(n)) return y < 0.25 ? 'before' : y > 0.75 ? 'after' : 'inside'
    return y < 0.5 ? 'before' : 'after'
  }

  const onDragOver = (e: DragEvent<HTMLElement>, n: TreeNode) => {
    if (!dragId.current) return
    e.preventDefault()
    e.stopPropagation()
    const pos = zoneFor(e, n)
    setDrop((d) => (d && d.id === n.id && d.pos === pos ? d : { id: n.id, pos }))
  }

  const onDrop = (e: DragEvent<HTMLElement>, n: TreeNode) => {
    e.preventDefault()
    e.stopPropagation()
    const id = dragId.current
    const pos = zoneFor(e, n)
    dragId.current = null
    setDrop(null)
    if (id && moveNode(id, n.id, pos) && pos === 'inside') props.onExpand(n.id)
  }

  const rowMenu = (e: MouseEvent, node: TreeNode | null) => {
    e.preventDefault()
    e.stopPropagation()
    setMenu({ x: e.clientX, y: e.clientY, node })
  }

  const renderRows = (parentId: string | null, depth: number): React.ReactNode[] =>
    (byParent.get(parentId) ?? []).flatMap((n) => {
      const open = isContainer(n) && expanded.includes(n.id)
      const { icon, color } = nodeIcon(n)
      const selected = n.id === selectedId || n.id === activeId
      const cls = [
        'row',
        selected ? 'selected' : '',
        drop?.id === n.id ? `drop-${drop.pos}` : '',
      ].join(' ')
      const row = (
        <div
          key={n.id}
          role="treeitem"
          aria-expanded={isContainer(n) ? open : undefined}
          aria-selected={selected}
          className={cls}
          style={{ paddingLeft: 8 + depth * 14 }}
          draggable={renamingId !== n.id}
          onDragStart={(e) => {
            dragId.current = n.id
            e.dataTransfer.effectAllowed = 'move'
            e.dataTransfer.setData('text/plain', n.id)
          }}
          onDragEnd={() => {
            dragId.current = null
            setDrop(null)
          }}
          onDragOver={(e) => onDragOver(e, n)}
          onDrop={(e) => onDrop(e, n)}
          onClick={() => props.onSelect(n)}
          onContextMenu={(e) => rowMenu(e, n)}
        >
          {isContainer(n) ? (
            <Icon name={open ? 'chevD' : 'chevR'} size={12} />
          ) : (
            <span className="chev-space" />
          )}
          <Icon name={icon} style={{ color, flexShrink: 0 }} />
          {renamingId === n.id ? (
            <RenameInput
              initial={n.name}
              onCommit={(v) => props.onCommitRename(n.id, v)}
              onCancel={props.onCancelRename}
            />
          ) : (
            <span className="row-name">{n.name}</span>
          )}
        </div>
      )
      return open ? [row, ...renderRows(n.id, depth + 1)] : [row]
    })

  const menuItems = (n: TreeNode | null) => {
    const items: Array<{ label: string; icon: IconName; run: () => void; danger?: boolean }> = []
    const target = n && isContainer(n) ? n.id : n ? n.parentId : null
    items.push(
      { label: 'Nouvelle note', icon: 'filePlus', run: () => props.onCreate('note', target) },
      { label: 'Nouveau dossier', icon: 'folderPlus', run: () => props.onCreate('folder', target) },
      { label: 'Nouveau projet', icon: 'projectPlus', run: () => props.onCreate('project', target) },
    )
    if (n) {
      items.push(
        { label: 'Renommer', icon: 'rename', run: () => props.onStartRename(n.id) },
        { label: 'Mettre à la corbeille', icon: 'trash', run: () => props.onDelete(n), danger: true },
      )
    }
    return items
  }

  return (
    <aside className="sidebar">
      <div className="side-head" data-tauri-drag-region>
        <Mascot size={26} />
        <span className="brand">Mine</span>
        <span className="grow" />
        <button type="button" className="icon-btn" aria-label="Nouvelle note" title="Nouvelle note" onClick={() => props.onCreate('note')}>
          <Icon name="filePlus" />
        </button>
        <button type="button" className="icon-btn" aria-label="Nouveau dossier" title="Nouveau dossier" onClick={() => props.onCreate('folder')}>
          <Icon name="folderPlus" />
        </button>
        <button type="button" className="icon-btn" aria-label="Nouveau projet" title="Nouveau projet" onClick={() => props.onCreate('project')}>
          <Icon name="projectPlus" />
        </button>
        <button type="button" className="icon-btn" aria-label="Réglages" title={`Réglages (${pretty(keys.settings)})`} onClick={props.onOpenSettings}>
          <Icon name="settings" />
        </button>
      </div>

      <button type="button" className="search-pill" onClick={props.onOpenPalette}>
        <Icon name="search" size={14} />
        <span className="grow">Aller à une note…</span>
        <kbd>{pretty(keys.palette)}</kbd>
      </button>

      <button type="button" className="row overview" style={{ margin: '0 6px 2px', paddingLeft: 8 }} onClick={props.onOpenToday} title="Note du jour (⌘D)">
        <span className="chev-space" />
        <Icon name="calendar" style={{ color: 'var(--ex)', flexShrink: 0 }} />
        <span className="row-name">Note du jour</span>
      </button>

      <button
        type="button"
        className={props.todosActive ? 'row overview selected' : 'row overview'}
        style={{ margin: '0 6px 8px', paddingLeft: 8 }}
        onClick={props.onOpenTodos}
      >
        <span className="chev-space" />
        <Icon name="check" style={{ color: 'var(--exo)', flexShrink: 0 }} />
        <span className="row-name">Toutes les todo</span>
      </button>

      <div className="side-label">NOTES</div>
      <div
        className="tree"
        role="tree"
        onContextMenu={(e) => rowMenu(e, null)}
        onDragOver={(e) => {
          if (dragId.current) {
            e.preventDefault()
            setDrop(null)
          }
        }}
        onDrop={(e) => {
          e.preventDefault()
          const id = dragId.current
          dragId.current = null
          setDrop(null)
          if (id) moveToRoot(id)
        }}
      >
        {renderRows(null, 0)}
        {nodes.length === 0 && <div className="tree-empty">Aucune note pour l'instant.</div>}
      </div>

      <button type="button" className="row trash-btn" onClick={props.onOpenTrash}>
        <Icon name="trash" size={14} />
        <span className="row-name">Corbeille</span>
        {props.trashCount > 0 && <span className="trash-count">{props.trashCount}</span>}
      </button>

      <Resizer />

      {menu && (
        <div
          className="menu"
          style={{ left: Math.min(menu.x, window.innerWidth - 200), top: Math.min(menu.y, window.innerHeight - 220) }}
          onPointerDown={(e) => e.stopPropagation()}
        >
          {menuItems(menu.node).map((it) => (
            <button
              key={it.label}
              type="button"
              className={it.danger ? 'menu-item danger' : 'menu-item'}
              onClick={() => {
                setMenu(null)
                it.run()
              }}
            >
              <Icon name={it.icon} size={15} />
              {it.label}
            </button>
          ))}
        </div>
      )}
    </aside>
  )
}
