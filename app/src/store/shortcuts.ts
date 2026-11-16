import { useSyncExternalStore } from 'react'

// Tous les raccourcis de Mine, modifiables dans les réglages.
// Format d'une combinaison : « Command+P », « Control+Alt+N », « F2 »… (le même que celui de Tauri).
export type ShortcutId =
  | 'palette'
  | 'newNote'
  | 'closeTab'
  | 'settings'
  | 'rename'
  | 'findInNote'
  | 'blockUp'
  | 'blockDown'
  | 'quickNote'
  | 'quickTodo'

export interface ShortcutDef {
  id: ShortcutId
  label: string
  hint?: string
  group: string
  default: string
  /** Raccourci global de l'app Mac (marche depuis n'importe quelle app). */
  global?: boolean
}

export const SHORTCUTS: ShortcutDef[] = [
  { id: 'palette', label: 'Aller à une note', hint: 'Cherche aussi dans le texte', group: 'Navigation', default: 'Command+P' },
  { id: 'newNote', label: 'Nouvelle note', group: 'Navigation', default: 'Command+N' },
  { id: 'closeTab', label: "Fermer l'onglet", group: 'Navigation', default: 'Command+W' },
  { id: 'settings', label: 'Réglages', group: 'Navigation', default: 'Command+Comma' },
  { id: 'rename', label: 'Renommer', hint: "L'élément sélectionné dans l'arborescence", group: 'Navigation', default: 'F2' },
  { id: 'findInNote', label: 'Rechercher dans la note', group: 'Édition', default: 'Command+F' },
  { id: 'blockUp', label: 'Monter le bloc', group: 'Édition', default: 'Alt+ArrowUp' },
  { id: 'blockDown', label: 'Descendre le bloc', group: 'Édition', default: 'Alt+ArrowDown' },
  { id: 'quickNote', label: 'Écrire une note', hint: 'Marche partout sur le Mac, même quand Mine est en arrière-plan', group: 'Capture rapide', default: 'Control+Alt+N', global: true },
  { id: 'quickTodo', label: 'Ajouter une tâche', hint: 'Ouvre une petite fenêtre pour saisir une todo', group: 'Capture rapide', default: 'Control+Alt+T', global: true },
]

export type ShortcutMap = Record<ShortcutId, string>

const KEY = 'mine-shortcuts'
const OLD_KEY = 'mine-quick-keys' // ancien stockage des deux raccourcis de capture rapide

const defaults = (): ShortcutMap => Object.fromEntries(SHORTCUTS.map((s) => [s.id, s.default])) as ShortcutMap

function load(): ShortcutMap {
  const map = defaults()
  try {
    const old = JSON.parse(localStorage.getItem(OLD_KEY) ?? '{}') as { note?: string; todo?: string }
    if (old.note) map.quickNote = old.note
    if (old.todo) map.quickTodo = old.todo
    Object.assign(map, JSON.parse(localStorage.getItem(KEY) ?? '{}'))
  } catch {
    /* stockage indisponible ou corrompu : valeurs par défaut */
  }
  return map
}

let state = load()
const listeners = new Set<() => void>()

function commit(next: ShortcutMap) {
  state = next
  try {
    const custom = Object.fromEntries(SHORTCUTS.filter((s) => next[s.id] !== s.default).map((s) => [s.id, next[s.id]]))
    localStorage.setItem(KEY, JSON.stringify(custom))
    localStorage.removeItem(OLD_KEY)
  } catch {
    /* ignoré */
  }
  listeners.forEach((l) => l())
}

export function useShortcuts(): ShortcutMap {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l)
      return () => {
        listeners.delete(l)
      }
    },
    () => state,
  )
}

/** Raccourci déjà utilisé par une autre action, s'il y en a un. */
export function conflictOf(id: ShortcutId, accel: string): ShortcutDef | undefined {
  return SHORTCUTS.find((s) => s.id !== id && state[s.id] === accel)
}

/** Change un raccourci. Renvoie l'action en conflit (et ne change rien) si la combinaison est déjà prise. */
export function setShortcut(id: ShortcutId, accel: string): ShortcutDef | undefined {
  const clash = conflictOf(id, accel)
  if (clash) return clash
  commit({ ...state, [id]: accel })
  return undefined
}

export function resetShortcut(id: ShortcutId) {
  commit({ ...state, [id]: SHORTCUTS.find((s) => s.id === id)!.default })
}

export function resetAllShortcuts() {
  commit(defaults())
}

const MODS = ['Control', 'Alt', 'Shift', 'Command'] as const
const NAMED = [
  'Space', 'Enter', 'Tab', 'Backspace', 'Delete', 'Slash', 'Comma', 'Period', 'Semicolon', 'Quote',
  'Minus', 'Equal', 'BracketLeft', 'BracketRight', 'Backquote',
  'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight',
]

/** Combinaison pressée → texte au format Tauri. Renvoie null s'il manque une touche, ou un modificateur (sauf touches F1–F24). */
export function accelFromEvent(e: KeyboardEvent): string | null {
  let key = ''
  let isF = false
  if (/^Key[A-Z]$/.test(e.code)) key = e.code.slice(3)
  else if (/^Digit[0-9]$/.test(e.code)) key = e.code.slice(5)
  else if (/^F([1-9]|1[0-9]|2[0-4])$/.test(e.code)) {
    key = e.code
    isF = true
  } else if (NAMED.includes(e.code)) key = e.code
  if (!key) return null
  const mods = [e.ctrlKey && 'Control', e.altKey && 'Alt', e.shiftKey && 'Shift', e.metaKey && 'Command'].filter(Boolean) as string[]
  if (mods.length === 0 && !isF) return null
  return [...MODS.filter((m) => mods.includes(m)), key].join('+')
}

/** La combinaison de l'événement correspond-elle à ce raccourci ? */
export function matches(id: ShortcutId, e: KeyboardEvent): boolean {
  return accelFromEvent(e) === state[id]
}

const SYMBOLS: Record<string, string> = {
  Control: '⌃', Alt: '⌥', Shift: '⇧', Command: '⌘', Space: 'Espace', Comma: ',', Period: '.', Slash: '/', Semicolon: ';',
  Quote: "'", Minus: '-', Equal: '=', BracketLeft: '[', BracketRight: ']', Backquote: '`', ArrowUp: '↑', ArrowDown: '↓',
  ArrowLeft: '←', ArrowRight: '→', Enter: '↩', Backspace: '⌫', Delete: '⌦', Tab: '⇥',
}

/** Version lisible : « ⌘P », « ⌃⌥N », « ⌥↑ »… */
export const pretty = (accel: string) =>
  accel
    .split('+')
    .map((p) => SYMBOLS[p] ?? p)
    .join('')
