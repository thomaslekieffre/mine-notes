import { useSyncExternalStore } from 'react'

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

export function setReading(on: boolean) {
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
