import { useSyncExternalStore } from 'react'
import { isSidebarCollapsed, setSidebarCollapsed } from './layout'

// Mode lecture : la note n'est plus modifiable (on révise sans risquer de taper dedans).
const KEY = 'mine-reading'
const read = () => {
  try {
    return localStorage.getItem(KEY) === '1'
  } catch {
    return false
  }
}

let state = read()
const listeners = new Set<() => void>()

// En lecture, la barre latérale se replie toute seule ; en sortant, elle revient comme elle était.
let collapsedBefore: boolean | null = null

export function setReading(on: boolean) {
  if (on && !state) {
    collapsedBefore = isSidebarCollapsed()
    setSidebarCollapsed(true)
  } else if (!on && state && collapsedBefore !== null) {
    setSidebarCollapsed(collapsedBefore)
    collapsedBefore = null
  }
  state = on
  try {
    localStorage.setItem(KEY, on ? '1' : '0')
  } catch {
    /* ignoré */
  }
  listeners.forEach((l) => l())
}
export const toggleReading = () => setReading(!state)

export function useReading(): boolean {
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
