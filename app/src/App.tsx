import { useCallback, useEffect, useMemo, useState } from 'react'
import { Sidebar } from './components/Sidebar'
import { Tabs } from './components/Tabs'
import { NoteEditor } from './components/NoteEditor'
import { Palette } from './components/Palette'
import { TodoOverview } from './components/TodoOverview'
import { DataDialog } from './components/DataDialog'
import { StatusBar } from './components/StatusBar'
import { SettingsDialog } from './components/SettingsDialog'
import { useMirror } from './store/mirror'
import { Mascot } from './components/Mascot'
import { countDescendants, createNode, removeNode, renameNode, useTree } from './store/tree'
import type { NodeType, NoteKind, TreeNode } from './store/tree'
import { usePersistentState } from './store/usePersistentState'

export type Theme = 'system' | 'light' | 'dark'

/** Onglet spécial : la vue qui regroupe toutes les todo. */
const TODO_VIEW = '__todos__'
const TODO_TAB: TreeNode = {
  id: TODO_VIEW,
  parentId: null,
  type: 'note',
  kind: 'todo',
  name: 'Toutes les todo',
  order: 0,
}

interface UiState {
  openTabs: string[]
  activeId: string | null
  expanded: string[]
  theme: Theme
}

const DEFAULT_NAMES: Record<NodeType, string> = {
  note: 'Nouvelle note',
  folder: 'Nouveau dossier',
  project: 'Nouveau projet',
}

export default function App() {
  const { ready, nodes } = useTree()
  useMirror(nodes, ready)
  const [ui, setUi] = usePersistentState<UiState>('mine-ui', {
    openTabs: [],
    activeId: null,
    expanded: [],
    theme: 'system',
  })
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [pendingOpen, setPendingOpen] = useState<string | null>(null)
  const [paletteOpen, setPaletteOpen] = useState(false)
  const [toDelete, setToDelete] = useState<TreeNode | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [words, setWords] = useState<number | null>(null)
  const [dataOpen, setDataOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)

  const byId = useMemo(() => new Map(nodes.map((n) => [n.id, n])), [nodes])

  useEffect(() => {
    const root = document.documentElement
    if (ui.theme === 'system') root.removeAttribute('data-theme')
    else root.setAttribute('data-theme', ui.theme)
  }, [ui.theme])

  // Retire des onglets les notes supprimées (ou introuvables).
  useEffect(() => {
    if (!ready) return
    const alive = (id: string) => id === TODO_VIEW || byId.get(id)?.type === 'note'
    const missing = ui.openTabs.filter((id) => !alive(id))
    if (missing.length === 0 && (!ui.activeId || alive(ui.activeId))) return
    setUi((u) => {
      const openTabs = u.openTabs.filter(alive)
      const activeId = u.activeId && openTabs.includes(u.activeId) ? u.activeId : (openTabs.at(-1) ?? null)
      return { ...u, openTabs, activeId }
    })
  }, [ready, byId, ui.openTabs, ui.activeId, setUi])

  const tabs = ui.openTabs
    .map((id) => (id === TODO_VIEW ? TODO_TAB : byId.get(id)))
    .filter((n): n is TreeNode => !!n && n.type === 'note')
  const showTodos = ui.activeId === TODO_VIEW
  const active = ui.activeId ? byId.get(ui.activeId) : undefined
  const activeNote = active?.type === 'note' ? active : undefined

  const crumbs = useMemo(() => {
    const parts: string[] = []
    let p = activeNote?.parentId ? byId.get(activeNote.parentId) : undefined
    while (p) {
      parts.unshift(p.name)
      p = p.parentId ? byId.get(p.parentId) : undefined
    }
    return parts.join(' › ')
  }, [activeNote, byId])

  const openNote = useCallback(
    (id: string) => {
      setUi((u) => ({
        ...u,
        openTabs: u.openTabs.includes(id) ? u.openTabs : [...u.openTabs, id],
        activeId: id,
      }))
      setSelectedId(id)
      setSidebarOpen(false)
    },
    [setUi],
  )

  const closeTab = useCallback(
    (id: string) => {
      setUi((u) => {
        const i = u.openTabs.indexOf(id)
        const openTabs = u.openTabs.filter((t) => t !== id)
        const activeId = u.activeId === id ? (openTabs[Math.min(i, openTabs.length - 1)] ?? null) : u.activeId
        return { ...u, openTabs, activeId }
      })
    },
    [setUi],
  )

  const expand = useCallback(
    (id: string) => setUi((u) => (u.expanded.includes(id) ? u : { ...u, expanded: [...u.expanded, id] })),
    [setUi],
  )
  const toggle = useCallback(
    (id: string) =>
      setUi((u) => ({
        ...u,
        expanded: u.expanded.includes(id) ? u.expanded.filter((e) => e !== id) : [...u.expanded, id],
      })),
    [setUi],
  )

  const create = useCallback(
    (type: NodeType, parentId?: string | null, kind: NoteKind = 'note', name?: string) => {
      let parent: string | null
      if (parentId !== undefined) parent = parentId
      else {
        const sel = selectedId ? byId.get(selectedId) : undefined
        parent = !sel ? null : sel.type === 'note' ? sel.parentId : sel.id
      }
      const id = createNode(parent, type, name ?? DEFAULT_NAMES[type], kind)
      if (parent) expand(parent)
      if (type === 'project') expand(id)
      setSelectedId(id)
      if (name) {
        if (type === 'note') openNote(id)
        return
      }
      setSidebarOpen(true)
      setRenamingId(id)
      if (type === 'note') setPendingOpen(id)
    },
    [byId, selectedId, expand, openNote],
  )

  const commitRename = (id: string, name: string) => {
    const clean = name.trim()
    if (clean) renameNode(id, clean)
    setRenamingId(null)
    if (pendingOpen === id) {
      setPendingOpen(null)
      openNote(id)
    }
  }
  const cancelRename = () => {
    const id = pendingOpen
    setRenamingId(null)
    setPendingOpen(null)
    if (id) openNote(id)
  }

  const confirmDelete = () => {
    if (!toDelete) return
    const ids = removeNode(toDelete.id)
    setSelectedId((s) => (s && ids.includes(s) ? null : s))
    setToDelete(null)
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey
      if (mod && e.key.toLowerCase() === 'p') {
        e.preventDefault()
        setPaletteOpen(true)
      } else if (mod && e.key.toLowerCase() === 'n') {
        e.preventDefault()
        create('note')
      } else if (mod && e.key.toLowerCase() === 'w' && ui.activeId) {
        e.preventDefault()
        closeTab(ui.activeId)
      } else if (mod && e.key === ',') {
        e.preventDefault()
        setSettingsOpen(true)
      } else if (e.key === 'F2' && selectedId) {
        e.preventDefault()
        setRenamingId(selectedId)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [create, closeTab, ui.activeId, selectedId])

  const cycleTheme = () =>
    setUi((u) => ({ ...u, theme: u.theme === 'system' ? 'light' : u.theme === 'light' ? 'dark' : 'system' }))

  const delCount = toDelete ? countDescendants(toDelete.id) : 0

  return (
    <div className={sidebarOpen ? 'app sidebar-open' : 'app'}>
      <Sidebar
        onOpenSettings={() => setSettingsOpen(true)}
        nodes={nodes}
        selectedId={selectedId}
        activeId={ui.activeId}
        expanded={ui.expanded}
        renamingId={renamingId}
        onSelect={(n) => {
          setSelectedId(n.id)
          if (n.type === 'note') openNote(n.id)
          else toggle(n.id)
        }}
        onToggle={toggle}
        onExpand={expand}
        onCreate={(type, parentId, kind) => create(type, parentId, kind)}
        onStartRename={setRenamingId}
        onCommitRename={commitRename}
        onCancelRename={cancelRename}
        onDelete={setToDelete}
        onOpenPalette={() => setPaletteOpen(true)}
        onOpenTodos={() => openNote(TODO_VIEW)}
        todosActive={showTodos}
      />
      <div className="backdrop" onClick={() => setSidebarOpen(false)} />

      <main className="main">
        <Tabs
          tabs={tabs}
          activeId={ui.activeId}
          onActivate={(id) => openNote(id)}
          onClose={closeTab}
          onMenu={() => setSidebarOpen(true)}
        />
        {!ready ? (
          <div className="doc-loading" />
        ) : showTodos ? (
          <TodoOverview nodes={nodes} onOpen={openNote} />
        ) : activeNote ? (
          <NoteEditor key={activeNote.id} node={activeNote} crumbs={crumbs} onStats={setWords} />
        ) : (
          <div className="empty">
            <Mascot size={110} />
            <h2>Aucune note ouverte</h2>
            <p>
              <kbd>⌘P</kbd> pour chercher une note · <kbd>⌘N</kbd> pour en créer une · clic droit dans
              l'arborescence pour un dossier ou un projet.
            </p>
          </div>
        )}
      </main>

      <StatusBar words={words} theme={ui.theme} onCycleTheme={cycleTheme} onOpenData={() => setDataOpen(true)} />

      {settingsOpen && (
        <SettingsDialog
          theme={ui.theme}
          onTheme={(theme) => setUi((u) => ({ ...u, theme }))}
          onOpenData={() => {
            setSettingsOpen(false)
            setDataOpen(true)
          }}
          onClose={() => setSettingsOpen(false)}
        />
      )}
      {dataOpen && <DataDialog nodes={nodes} onClose={() => setDataOpen(false)} />}

      {paletteOpen && (
        <Palette
          nodes={nodes}
          onOpen={openNote}
          onNewNote={(name) => create('note', undefined, 'note', name)}
          onClose={() => setPaletteOpen(false)}
        />
      )}

      {toDelete && (
        <div className="overlay center" onMouseDown={() => setToDelete(null)}>
          <div className="dialog" role="alertdialog" aria-label="Confirmer la suppression" onMouseDown={(e) => e.stopPropagation()}>
            <h3>Supprimer « {toDelete.name} » ?</h3>
            <p>
              {delCount > 0
                ? `Les ${delCount} éléments qu'il contient seront supprimés aussi. `
                : ''}
              Cette action est définitive.
            </p>
            <div className="dialog-actions">
              <button type="button" className="btn" onClick={() => setToDelete(null)}>
                Annuler
              </button>
              <button type="button" className="btn danger" autoFocus onClick={confirmDelete}>
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
