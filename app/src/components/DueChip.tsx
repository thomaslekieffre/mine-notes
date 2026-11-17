import { dueLabel, dueState } from '../store/dates'

/** Pastille d'échéance d'une tâche (rouge si en retard, accent si aujourd'hui). */
export function DueChip({ due }: { due?: string }) {
  if (!due) return null
  return (
    <span className={`due-chip static ${dueState(due)}`} title={`Échéance : ${due}`}>
      {dueLabel(due)}
    </span>
  )
}
