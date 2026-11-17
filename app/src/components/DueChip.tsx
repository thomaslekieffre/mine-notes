import { dueLabel, dueState } from '../store/dates'

/** Pastille d'échéance d'une tâche (rouge si en retard, accent si aujourd'hui). */
export function DueChip({ due, repeat }: { due?: string; repeat?: string }) {
  if (!due) return null
  return (
    <span className={`due-chip static ${dueState(due)}`} title={`Échéance : ${due}`}>
      {repeat ? '↻ ' : ''}
      {dueLabel(due)}
    </span>
  )
}
