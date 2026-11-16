import { useEffect, useState } from 'react'

/** État React sauvegardé dans localStorage (confort par appareil, jamais vital). */
export function usePersistentState<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(key)
      if (raw) return { ...initial, ...(JSON.parse(raw) as T) }
    } catch {
      /* stockage indisponible : on repart de l'état initial */
    }
    return initial
  })
  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value))
    } catch {
      /* ignoré */
    }
  }, [key, value])
  return [value, setValue] as const
}
