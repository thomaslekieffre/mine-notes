import { useCallback, useEffect, useMemo, useState } from 'react'
import { Sidebar } from './components/Sidebar'
import { Tabs } from './components/Tabs'
import { NoteEditor } from './components/NoteEditor'
import { Palette } from './components/Palette'
import { TodoOverview } from './components/TodoOverview'
import { DataDialog } from './components/DataDialog'
import { StatusBar } from './components/StatusBar'
import { SettingsDialog } from './components/SettingsDialog'
import { TrashDialog } from './components/TrashDialog'
import { restoreNode } from './store/tree'
import { useMirror } from './store/mirror'
import { OPEN_NOTE_EVENT } from './extensions/NoteLink'
import { QuickCapture } from './components/QuickCapture'
import { createDemo } from './store/demo'
import type { QuickMode } from './components/QuickCapture'
import { matches, pretty, toGlobalAccel, useShortcuts } from './store/shortcuts'
import { isTauri } from './store/platform'
import { Mascot } from './components/Mascot'
import { countDescendants, createNode, ensureDailyNote, getFlag, getTreeNodes, setFlag, renameNode, trashNode, useTree } from './store/tree'
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
  const { ready, nodes, trash } = useTree()
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
  const [trashOpen, setTrashOpen] = useState(false)
  const [undo, setUndo] = useState<{ id: string; name: string } | null>(null)
  const [quick, setQuick] = useState<{ mode: QuickMode; fromOutside: boolean } | null>(null)
  const [flash, setFlash] = useState<string | null>(null)
  const keys = useShortcuts()

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
  const openToday = useCallback(() => {
    const { noteId, folderId } = ensureDailyNote()
    if (folderId) expand(folderId)
    openNote(noteId)
  }, [expand, openNote])

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
    const ids = trashNode(toDelete.id)
    setSelectedId((s) => (s && ids.includes(s) ? null : s))
    setUndo({ id: toDelete.id, name: toDelete.name })
    setToDelete(null)
  }

  useEffect(() => {
    const onOpen = (e: Event) => openNote((e as CustomEvent<string>).detail)
    window.addEventListener(OPEN_NOTE_EVENT, onOpen)
    return () => window.removeEventListener(OPEN_NOTE_EVENT, onOpen)
  }, [openNote])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (matches('palette', e)) {
        e.preventDefault()
        setPaletteOpen(true)
      } else if (matches('newNote', e)) {
        e.preventDefault()
        create('note')
      } else if (matches('closeTab', e) && ui.activeId) {
        e.preventDefault()
        closeTab(ui.activeId)
      } else if (matches('settings', e)) {
        e.preventDefault()
        setSettingsOpen(true)
      } else if (matches('rename', e) && selectedId) {
        e.preventDefault()
        setRenamingId(selectedId)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [create, closeTab, ui.activeId, selectedId])

  const cycleTheme = () =>
    setUi((u) => ({ ...u, theme: u.theme === 'system' ? 'light' : u.theme === 'light' ? 'dark' : 'system' }))

  useEffect(() => {
    if (!undo) return
    const t = setTimeout(() => setUndo(null), 7000)
    return () => clearTimeout(t)
  }, [undo])

  // Première ouverture : on crée une fois le dossier de démonstration.
  useEffect(() => {
    if (!ready || getFlag('demoCreated')) return
    setFlag('demoCreated')
    void createDemo().then((id) => {
      const note = getTreeNodes().find((n) => n.id === id)
      if (note?.parentId) expand(note.parentId)
      openNote(id)
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready])

  // Raccourcis de capture rapide : globaux dans l'app Mac, locaux dans un navigateur.
  useEffect(() => {
    const open = (mode: QuickMode, fromOutside: boolean) => setQuick({ mode, fromOutside })
    if (!isTauri()) {
      const onKey = (e: KeyboardEvent) => {
        if (matches('quickNote', e)) {
          e.preventDefault()
          open('note', false)
        } else if (matches('quickTodo', e)) {
          e.preventDefault()
          open('todo', false)
        }
      }
      window.addEventListener('keydown', onKey)
      return () => window.removeEventListener('keydown', onKey)
    }
    let cancelled = false
    const summon = async (mode: QuickMode) => {
      const { getCurrentWindow } = await import('@tauri-apps/api/window')
      const w = getCurrentWindow()
      const inFront = (await w.isVisible()) && (await w.isFocused())
      await w.show()
      await w.unminimize()
      await w.setFocus()
      open(mode, !inFront)
    }
    void (async () => {
      const gs = await import('@tauri-apps/plugin-global-shortcut')
      await gs.unregisterAll()
      for (const mode of ['note', 'todo'] as const) {
        if (cancelled) return
        try {
          await gs.register(toGlobalAccel(keys[mode === 'note' ? 'quickNote' : 'quickTodo']), (ev) => {
            if (ev.state === 'Pressed') void summon(mode)
          })
        } catch (e) {
          console.warn(`Raccourci « ${keys[mode === 'note' ? 'quickNote' : 'quickTodo']} » indisponible :`, e)
        }
      }
    })()
    return () => {
      cancelled = true
      void import('@tauri-apps/plugin-global-shortcut').then((gs) => gs.unregisterAll())
    }
  }, [keys.quickNote, keys.quickTodo])

  useEffect(() => {
    if (!flash) return
    const t = setTimeout(() => setFlash(null), 2200)
    return () => clearTimeout(t)
  }, [flash])

  const delCount = toDelete ? countDescendants(toDelete.id) : 0

  return (
    <div className={sidebarOpen ? 'app sidebar-open' : 'app'}>
      <Sidebar
        trashCount={trash.length}
        onOpenTrash={() => setTrashOpen(true)}
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
        onOpenToday={openToday}
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
              <kbd>{pretty(keys.palette)}</kbd> pour chercher une note · <kbd>{pretty(keys.newNote)}</kbd> pour en créer une · clic droit dans
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
          onDemo={() => {
            setSettingsOpen(false)
            void createDemo().then((id) => {
              const note = getTreeNodes().find((n) => n.id === id)
              if (note?.parentId) expand(note.parentId)
              openNote(id)
            })
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

      {quick && (
        <QuickCapture
          mode={quick.mode}
          nodes={nodes}
          onDone={(message) => {
            const outside = quick.fromOutside
            setQuick(null)
            if (message) setFlash(message)
            // Appelé depuis une autre app : on rend la main à cette app.
            if (outside && isTauri()) void import('@tauri-apps/api/app').then((a) => a.hide())
          }}
        />
      )}

      {flash && (
        <div className="toast" role="status">
          <span>{flash}</span>
        </div>
      )}

      {trashOpen && (
        <TrashDialog
          onClose={() => setTrashOpen(false)}
          onRestore={() => setUndo(null)}
        />
      )}

      {undo && (
        <div className="toast" role="status">
          <span>« {undo.name} » est à la corbeille.</span>
          <button
            type="button"
            onClick={() => {
              restoreNode(undo.id)
              setUndo(null)
            }}
          >
            Annuler
          </button>
        </div>
      )}

      {toDelete && (
        <div className="overlay center" onMouseDown={() => setToDelete(null)}>
          <div className="dialog" role="alertdialog" aria-label="Confirmer la suppression" onMouseDown={(e) => e.stopPropagation()}>
            <h3>Mettre « {toDelete.name} » à la corbeille ?</h3>
            <p>
              {delCount > 0 ? `Les ${delCount} éléments qu'il contient iront avec lui. ` : ''}
              Tu pourras le restaurer depuis la corbeille.
            </p>
            <div className="dialog-actions">
              <button type="button" className="btn" onClick={() => setToDelete(null)}>
                Annuler
              </button>
              <button type="button" className="btn danger" autoFocus onClick={confirmDelete}>
                Mettre à la corbeille
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
