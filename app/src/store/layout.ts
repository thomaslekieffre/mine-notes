import { useSyncExternalStore } from 'react'

// Largeur et état (réduit ou non) de la barre latérale, gardés sur cet appareil.
export const SIDEBAR_MIN = 200
export const SIDEBAR_MAX = 520
export const SIDEBAR_DEFAULT = 264

interface Layout {
  width: number
  collapsed: boolean
}

const KEY = 'mine-sidebar'
const clamp = (w: number) => Math.min(SIDEBAR_MAX, Math.max(SIDEBAR_MIN, Math.round(w)))

function load(): Layout {
  try {
    const d = JSON.parse(localStorage.getItem(KEY) ?? '{}') as Partial<Layout>
    return { width: clamp(d.width ?? SIDEBAR_DEFAULT), collapsed: d.collapsed === true }
  } catch {
    return { width: SIDEBAR_DEFAULT, collapsed: false }
  }
}

let state = load()
const listeners = new Set<() => void>()

function commit(next: Layout) {
  state = next
  try {
    localStorage.setItem(KEY, JSON.stringify(next))
  } catch {
    /* ignoré */
  }
  listeners.forEach((l) => l())
}

export const setSidebarWidth = (w: number) => commit({ ...state, width: clamp(w) })
export const setSidebarCollapsed = (collapsed: boolean) => commit({ ...state, collapsed })
export const toggleSidebar = () => setSidebarCollapsed(!state.collapsed)
export const resetSidebarWidth = () => commit({ width: SIDEBAR_DEFAULT, collapsed: false })

export function useLayout(): Layout {
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

export const isSidebarCollapsed = () => state.collapsed
export const SIDEBAR_NARROW = 236 // en dessous, le nom « Mine » disparaît de l'en-tête pour que les icônes tiennent
