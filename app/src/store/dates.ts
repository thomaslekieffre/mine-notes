import { dayKey } from './activity'

// Échéances des tâches : une date locale « AAAA-MM-JJ » (ou vide).

export type DueState = 'overdue' | 'today' | 'soon' | 'later'

const MONTHS = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.']
const DAYS = ['dim.', 'lun.', 'mar.', 'mer.', 'jeu.', 'ven.', 'sam.']

const parse = (key: string) => {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y, (m || 1) - 1, d || 1)
}

export const isDueKey = (v: unknown): v is string => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v)

/** Nombre de jours entre aujourd'hui et l'échéance (négatif = en retard). */
export function daysUntil(due: string, now = new Date()): number {
  const a = parse(dayKey(now)).getTime()
  const b = parse(due).getTime()
  return Math.round((b - a) / 86_400_000)
}

export function dueState(due: string): DueState {
  const n = daysUntil(due)
  return n < 0 ? 'overdue' : n === 0 ? 'today' : n <= 3 ? 'soon' : 'later'
}

export function dueLabel(due: string): string {
  const n = daysUntil(due)
  if (n === 0) return "Aujourd'hui"
  if (n === 1) return 'Demain'
  if (n === -1) return 'Hier'
  if (n < 0) return `En retard · ${-n} j`
  const d = parse(due)
  if (n < 7) return `${DAYS[d.getDay()]} ${d.getDate()}`
  const sameYear = d.getFullYear() === new Date().getFullYear()
  return `${d.getDate()} ${MONTHS[d.getMonth()]}${sameYear ? '' : ` ${d.getFullYear()}`}`
}

/** Date d'aujourd'hui décalée de `days` jours. */
export function inDays(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return dayKey(d)
}

/** Prochain lundi (jamais aujourd'hui). */
export function nextMonday(): string {
  const d = new Date()
  d.setDate(d.getDate() + (((8 - d.getDay()) % 7) || 7))
  return dayKey(d)
}

/** Tri : en retard d'abord, puis par date, puis les tâches sans échéance. */
export const byDue = (a?: string, b?: string) => (a && b ? a.localeCompare(b) : a ? -1 : b ? 1 : 0)
