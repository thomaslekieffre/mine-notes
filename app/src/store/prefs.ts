import { useSyncExternalStore } from 'react'

// Préférences d'affichage, gardées sur cet appareil et appliquées via des variables CSS.
export interface Prefs {
  font: 'inter' | 'kalam' | 'serif' | 'mono'
  size: 'S' | 'M' | 'L' | 'XL'
  width: 'narrow' | 'normal' | 'wide'
  mascot: boolean
  /** Rappel quotidien des tâches (notification). */
  remind: boolean
  /** Heure du rappel (0-23). */
  remindHour: number
}

export const DEFAULT_PREFS: Prefs = { font: 'inter', size: 'M', width: 'normal', mascot: true, remind: false, remindHour: 9 }

const FONTS: Record<Prefs['font'], string> = {
  inter: "'Inter', system-ui, sans-serif",
  kalam: "'Kalam', 'Comic Sans MS', cursive",
  serif: "Georgia, 'Times New Roman', serif",
  mono: "'JetBrains Mono', monospace",
}
const SIZES: Record<Prefs['size'], string> = { S: '14.5px', M: '16px', L: '18px', XL: '20px' }
const WIDTHS: Record<Prefs['width'], string> = { narrow: '680px', normal: '820px', wide: '1060px' }

const KEY = 'mine-prefs'
function load(): Prefs {
  try {
    return { ...DEFAULT_PREFS, ...JSON.parse(localStorage.getItem(KEY) ?? '{}') }
  } catch {
    return DEFAULT_PREFS
  }
}

let state = load()
const listeners = new Set<() => void>()

function apply(p: Prefs) {
  const root = document.documentElement
  root.style.setProperty('--doc-font', FONTS[p.font])
  root.style.setProperty('--doc-size', SIZES[p.size])
  root.style.setProperty('--doc-width', WIDTHS[p.width])
}
apply(state)

export const getPrefs = () => state

export function setPrefs(patch: Partial<Prefs>) {
  state = { ...state, ...patch }
  try {
    localStorage.setItem(KEY, JSON.stringify(state))
  } catch {
    /* stockage indisponible */
  }
  apply(state)
  listeners.forEach((l) => l())
}

export function usePrefs(): Prefs {
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
