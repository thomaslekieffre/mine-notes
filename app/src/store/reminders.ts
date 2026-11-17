import { computeStats } from './stats'
import { dayKey } from './activity'
import { daysUntil } from './dates'
import { isTauri } from './platform'
import { DEFAULT_PREFS, getPrefs } from './prefs'
import type { TreeNode } from './tree'

// Rappel quotidien : une notification à l'heure choisie qui résume les tâches du jour et celles en retard.

const SENT_KEY = 'mine-reminded'

/** Demande l'autorisation d'afficher des notifications ; renvoie true si elle est accordée. */
export async function ensureNotifyPermission(): Promise<boolean> {
  try {
    if (isTauri()) {
      const n = await import('@tauri-apps/plugin-notification')
      if (await n.isPermissionGranted()) return true
      return (await n.requestPermission()) === 'granted'
    }
    if (!('Notification' in window)) return false
    if (Notification.permission === 'granted') return true
    return (await Notification.requestPermission()) === 'granted'
  } catch {
    return false
  }
}

export async function notify(title: string, body: string) {
  try {
    if (isTauri()) {
      const n = await import('@tauri-apps/plugin-notification')
      n.sendNotification({ title, body })
    } else if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(title, { body })
    }
  } catch {
    /* notifications indisponibles */
  }
}

/** Texte du résumé (ou null s'il n'y a rien à signaler). */
export async function digest(nodes: TreeNode[]): Promise<{ title: string; body: string } | null> {
  const stats = await computeStats(nodes)
  const due = stats.openTasks.filter((t) => t.due && daysUntil(t.due) <= 0)
  if (due.length === 0) return null
  const late = due.filter((t) => daysUntil(t.due!) < 0).length
  const today = due.length - late
  const parts = [today > 0 ? `${today} pour aujourd'hui` : '', late > 0 ? `${late} en retard` : ''].filter(Boolean)
  const names = due
    .slice(0, 3)
    .map((t) => t.text || '(vide)')
    .join(' · ')
  return { title: `Mine : ${parts.join(', ')}`, body: names + (due.length > 3 ? ` … +${due.length - 3}` : '') }
}

/** Vérifie chaque minute s'il est l'heure du rappel du jour. Renvoie la fonction d'arrêt. */
export function startReminders(getNodes: () => TreeNode[]): () => void {
  const check = async () => {
    const p = getPrefs()
    if (!p.remind) return
    const now = new Date()
    if (now.getHours() < (p.remindHour ?? DEFAULT_PREFS.remindHour)) return
    try {
      if (localStorage.getItem(SENT_KEY) === dayKey(now)) return
      localStorage.setItem(SENT_KEY, dayKey(now))
    } catch {
      return
    }
    const d = await digest(getNodes())
    if (d) await notify(d.title, d.body)
  }
  const t = setInterval(() => void check(), 60_000)
  setTimeout(() => void check(), 4000)
  return () => clearInterval(t)
}
