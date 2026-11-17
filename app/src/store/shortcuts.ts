import { useSyncExternalStore } from 'react'
import { isMac } from './platform'

// Tous les raccourcis de Mine, modifiables dans les réglages.
// Format d'une combinaison : « Command+P », « Control+Alt+N », « F2 »… (le même que celui de Tauri).
export type ShortcutId =
  | 'palette'
  | 'newNote'
  | 'home'
  | 'closeTab'
  | 'toggleSidebar'
  | 'settings'
  | 'rename'
  | 'findInNote'
  | 'readMode'
  | 'exportPdf'
  | 'history'
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

const BASE: ShortcutDef[] = [
  { id: 'palette', label: 'Aller à une note', hint: 'Cherche aussi dans le texte', group: 'Navigation', default: 'Command+P' },
  { id: 'newNote', label: 'Nouvelle note', group: 'Navigation', default: 'Command+N' },
  { id: 'home', label: 'Accueil', hint: 'Tableau de bord : tâches, notes récentes, statistiques', group: 'Navigation', default: 'Command+Shift+D' },
  { id: 'closeTab', label: "Fermer l'onglet", group: 'Navigation', default: 'Command+W' },
  { id: 'toggleSidebar', label: 'Afficher / masquer la barre latérale', group: 'Navigation', default: 'Command+B' },
  { id: 'settings', label: 'Réglages', group: 'Navigation', default: 'Command+,' },
  { id: 'rename', label: 'Renommer', hint: "L'élément sélectionné dans l'arborescence", group: 'Navigation', default: 'F2' },
  { id: 'findInNote', label: 'Rechercher dans la note', group: 'Édition', default: 'Command+F' },
  { id: 'exportPdf', label: 'Exporter en PDF', hint: 'Ouvre l’impression ; choisis « Enregistrer au format PDF »', group: 'Édition', default: 'Command+Shift+E' },
  { id: 'history', label: 'Historique de la note', group: 'Édition', default: 'Command+Shift+H' },
  { id: 'readMode', label: 'Mode lecture', hint: 'Bloque l’écriture et active le stylo pour réviser', group: 'Édition', default: 'Command+E' },
  { id: 'blockUp', label: 'Monter le bloc', group: 'Édition', default: 'Alt+ArrowUp' },
  { id: 'blockDown', label: 'Descendre le bloc', group: 'Édition', default: 'Alt+ArrowDown' },
  { id: 'quickNote', label: 'Écrire une note', hint: 'Marche partout sur le Mac, même quand Mine est en arrière-plan', group: 'Capture rapide', default: 'Control+Alt+N', global: true },
  { id: 'quickTodo', label: 'Ajouter une tâche', hint: 'Ouvre une petite fenêtre pour saisir une todo', group: 'Capture rapide', default: 'Control+Alt+T', global: true },
]

// Windows / Linux : Ctrl remplace ⌘, et Ctrl+Alt (= AltGr sur un clavier AZERTY) laisse la place à Alt+Maj pour les raccourcis globaux.
export const SHORTCUTS: ShortcutDef[] = isMac
  ? BASE
  : BASE.map((s) => ({
      ...s,
      default: s.global ? s.default.replace('Control+Alt', 'Alt+Shift') : s.default.replace('Command', 'Control'),
      hint: s.hint?.replace('sur le Mac', "sur l'ordinateur"),
    }))

export type ShortcutMap = Record<ShortcutId, string>

// v2 : les combinaisons sont désormais lues selon la disposition du clavier (AZERTY…), plus selon la position physique des touches.
const KEY = 'mine-shortcuts-v2'
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
const NAMED = ['Space', 'Enter', 'Tab', 'Backspace', 'Delete', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight']

// Touches de ponctuation : position physique → caractère (utilisé quand Option/Maj brouille le caractère reçu).
const PUNCT: Record<string, string> = {
  Comma: ',', Period: '.', Slash: '/', Semicolon: ';', Quote: "'", Minus: '-', Equal: '=',
  BracketLeft: '[', BracketRight: ']', Backquote: '`',
}
const PUNCT_CODE = Object.fromEntries(Object.entries(PUNCT).map(([code, ch]) => [ch, code]))

// Disposition du clavier : on apprend « position physique → lettre » à chaque frappe (et via l'API du navigateur quand elle existe).
// Avant d'avoir appris, on suppose un AZERTY si la langue est le français.
const LAYOUT_KEY = 'mine-keymap'
const learned: Record<string, string> = (() => {
  try {
    return JSON.parse(localStorage.getItem(LAYOUT_KEY) ?? '{}')
  } catch {
    return {}
  }
})()
const AZERTY_SEED: Record<string, string> = { KeyA: 'Q', KeyQ: 'A', KeyW: 'Z', KeyZ: 'W', Semicolon: 'M' }
const guessAzerty = typeof navigator !== 'undefined' && navigator.language.toLowerCase().startsWith('fr')

function letterOfCode(code: string): string | undefined {
  if (learned[code]) return learned[code]
  if (guessAzerty && AZERTY_SEED[code]) return AZERTY_SEED[code]
  return /^Key[A-Z]$/.test(code) ? code.slice(3) : undefined
}

function learn(e: KeyboardEvent) {
  if (e.altKey || e.key.length !== 1 || !/^[a-z]$/i.test(e.key)) return
  if (!/^(Key[A-Z]|Semicolon)$/.test(e.code)) return
  const letter = e.key.toUpperCase()
  if (learned[e.code] === letter) return
  learned[e.code] = letter
  try {
    localStorage.setItem(LAYOUT_KEY, JSON.stringify(learned))
  } catch {
    /* ignoré */
  }
}
if (typeof window !== 'undefined') {
  window.addEventListener('keydown', learn, true)
  const kb = (navigator as unknown as { keyboard?: { getLayoutMap?: () => Promise<Map<string, string>> } }).keyboard
  void kb?.getLayoutMap?.().then((map) => {
    for (const [code, key] of map) if (/^(Key[A-Z]|Semicolon)$/.test(code) && /^[a-z]$/i.test(key)) learned[code] = key.toUpperCase()
  })
}

/** La touche de l'événement, lue selon la disposition du clavier (ex. W sur AZERTY est sur la touche physique « Z »). */
function keyOf(e: KeyboardEvent): string | null {
  if (/^F([1-9]|1[0-9]|2[0-4])$/.test(e.code)) return e.code
  if (/^Digit[0-9]$/.test(e.code)) return e.code.slice(5)
  if (NAMED.includes(e.code)) return e.code
  // Sans Option, le caractère reçu est fiable. Avec Option, macOS le remplace par un symbole : on passe par la position de la touche.
  if (!e.altKey && e.key.length === 1) {
    if (/^[a-z]$/i.test(e.key)) return e.key.toUpperCase()
    if (!e.shiftKey && e.key !== ' ' && PUNCT_CODE[e.key]) return e.key
  }
  const letter = /^(Key[A-Z]|Semicolon)$/.test(e.code) ? letterOfCode(e.code) : undefined
  if (letter && (e.altKey || e.code !== 'Semicolon')) return letter
  if (PUNCT[e.code]) return PUNCT[e.code]
  return null
}

/** Combinaison pressée → texte (« Command+P », « Control+Alt+N », « F2 »…). Renvoie null s'il manque une touche, ou un modificateur (sauf touches F1–F24). */
export function accelFromEvent(e: KeyboardEvent): string | null {
  const key = keyOf(e)
  if (!key) return null
  const mods = [e.ctrlKey && 'Control', e.altKey && 'Alt', e.shiftKey && 'Shift', e.metaKey && 'Command'].filter(Boolean) as string[]
  if (mods.length === 0 && !/^F\d+$/.test(key)) return null
  return [...MODS.filter((m) => mods.includes(m)), key].join('+')
}

/** La combinaison de l'événement correspond-elle à ce raccourci ? */
export function matches(id: ShortcutId, e: KeyboardEvent): boolean {
  return accelFromEvent(e) === state[id]
}

/** Combinaison au format des raccourcis globaux de Tauri (qui travaillent sur la position physique des touches). */
export function toGlobalAccel(accel: string): string {
  const parts = accel.split('+')
  const key = parts.pop() ?? ''
  let code = key
  if (/^[A-Z]$/.test(key)) {
    const found = Object.keys(learned).find((c) => learned[c] === key) ?? (guessAzerty ? Object.keys(AZERTY_SEED).find((c) => AZERTY_SEED[c] === key) : undefined)
    code = found ?? `Key${key}`
  } else if (PUNCT_CODE[key]) code = PUNCT_CODE[key]
  return [...parts, code].join('+')
}

const SYMBOLS: Record<string, string> = {
  Control: '⌃', Alt: '⌥', Shift: '⇧', Command: '⌘', Space: 'Espace', ArrowUp: '↑', ArrowDown: '↓',
  ArrowLeft: '←', ArrowRight: '→', Enter: '↩', Backspace: '⌫', Delete: '⌦', Tab: '⇥',
}

/** Version lisible : « ⌘P », « ⌃⌥N », « ⌥↑ »… */
export const pretty = (accel: string) =>
  isMac
    ? accel
        .split('+')
        .map((p) => SYMBOLS[p] ?? p)
        .join('')
    : accel
        .split('+')
        .map((p) => (p === 'Control' ? 'Ctrl' : (SYMBOLS[p] ?? p)))
        .join('+')
