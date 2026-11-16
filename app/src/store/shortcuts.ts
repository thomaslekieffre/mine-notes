import { useSyncExternalStore } from 'react'

// Raccourcis de capture rapide. Dans l'app Mac ils sont globaux (marchent depuis n'importe quelle app) ;
// dans un navigateur ils ne marchent que lorsque la page est active.
export interface QuickKeys {
  note: string
  todo: string
}

export const DEFAULT_KEYS: QuickKeys = { note: 'Control+Alt+N', todo: 'Control+Alt+T' }
const KEY = 'mine-quick-keys'

function load(): QuickKeys {
  try {
    return { ...DEFAULT_KEYS, ...JSON.parse(localStorage.getItem(KEY) ?? '{}') }
  } catch {
    return DEFAULT_KEYS
  }
}

let state = load()
const listeners = new Set<() => void>()

export function setQuickKey(which: keyof QuickKeys, accel: string) {
  state = { ...state, [which]: accel }
  try {
    localStorage.setItem(KEY, JSON.stringify(state))
  } catch {
    /* stockage indisponible */
  }
  listeners.forEach((l) => l())
}

export function useQuickKeys(): QuickKeys {
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

const MODS = ['Control', 'Alt', 'Shift', 'Command'] as const

/** Combinaison pressée → texte au format Tauri (ex. « Control+Alt+N »). Renvoie null s'il manque une touche ou un modificateur. */
export function accelFromEvent(e: KeyboardEvent): string | null {
  let key = ''
  if (/^Key[A-Z]$/.test(e.code)) key = e.code.slice(3)
  else if (/^Digit[0-9]$/.test(e.code)) key = e.code.slice(5)
  else if (/^F([1-9]|1[0-9]|2[0-4])$/.test(e.code)) key = e.code
  else if (['Space', 'Enter', 'Tab', 'Backspace', 'Slash', 'Comma', 'Period', 'Semicolon', 'Quote'].includes(e.code)) key = e.code
  if (!key) return null
  const mods = [e.ctrlKey && 'Control', e.altKey && 'Alt', e.shiftKey && 'Shift', e.metaKey && 'Command'].filter(Boolean) as string[]
  if (mods.length === 0) return null
  return [...MODS.filter((m) => mods.includes(m)), key].join('+')
}

/** La combinaison de l'événement correspond-elle à ce raccourci ? */
export function matches(accel: string, e: KeyboardEvent): boolean {
  return accelFromEvent(e) === accel
}

const SYMBOLS: Record<string, string> = { Control: '⌃', Alt: '⌥', Shift: '⇧', Command: '⌘', Space: 'Espace' }
export const pretty = (accel: string) =>
  accel
    .split('+')
    .map((p) => SYMBOLS[p] ?? p)
    .join(' ')
