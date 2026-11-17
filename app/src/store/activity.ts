import { useSyncExternalStore } from 'react'

// Activité d'écriture par jour (pour le tableau de bord) : mots écrits, nombre de séances d'écriture, notes touchées.
export interface Day {
  w: number // mots écrits
  e: number // séances d'écriture (un instantané = une séance)
  n: string[] // notes touchées ce jour-là
}
export type Activity = Record<string, Day>

const KEY = 'mine-activity'
const pad = (n: number) => String(n).padStart(2, '0')
export const dayKey = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

function load(): Activity {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '{}') as Activity
  } catch {
    return {}
  }
}

let state = load()
const listeners = new Set<() => void>()

/** Compte une séance d'écriture sur `noteId` avec les mots gagnés (jamais négatif). */
export function recordActivity(noteId: string, words: number) {
  const key = dayKey()
  const day = state[key] ?? { w: 0, e: 0, n: [] }
  const next: Day = { w: day.w + Math.max(0, words), e: day.e + 1, n: day.n.includes(noteId) ? day.n : [...day.n, noteId].slice(-60) }
  state = { ...state, [key]: next }
  try {
    localStorage.setItem(KEY, JSON.stringify(state))
  } catch {
    /* ignoré */
  }
  listeners.forEach((l) => l())
}

export function useActivity(): Activity {
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

/** Jours d'affilée avec de l'écriture (aujourd'hui compte s'il y en a, sinon on part d'hier). */
export function streak(a: Activity): number {
  const d = new Date()
  if (!a[dayKey(d)]?.e) d.setDate(d.getDate() - 1)
  let n = 0
  while (a[dayKey(d)]?.e) {
    n++
    d.setDate(d.getDate() - 1)
  }
  return n
}
