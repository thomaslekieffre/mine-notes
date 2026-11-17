import { useEffect, useMemo, useRef, useState } from 'react'
import { Icon } from './Icon'
import { appendTask, appendText, createCapturedNote } from '../store/capture'
import { ensureDailyNote } from '../store/tree'
import { inDays, nextMonday } from '../store/dates'
import { MOD } from '../store/platform'
import { DictateButton } from './DictateButton'
import type { TreeNode } from '../store/tree'

export type QuickMode = 'note' | 'todo'

interface Props {
  mode: QuickMode
  nodes: TreeNode[]
  onDone: (message: string | null) => void
}

const LAST_KEY = 'mine-quick-last'
const NEW = '__new__'
const TODAY = '__today__'

const read = (): Record<string, string> => {
  try {
    return JSON.parse(localStorage.getItem(LAST_KEY) ?? '{}')
  } catch {
    return {}
  }
}
const remember = (mode: QuickMode, id: string) => {
  try {
    localStorage.setItem(LAST_KEY, JSON.stringify({ ...read(), [mode]: id }))
  } catch {
    /* ignoré */
  }
}

/** Fenêtre de saisie rapide : une tâche ou une note, sans quitter ce qu'on fait. */
export function QuickCapture({ mode, nodes, onDone }: Props) {
  const byId = useMemo(() => new Map(nodes.map((n) => [n.id, n])), [nodes])
  const label = (n: TreeNode) => {
    const parent = n.parentId ? byId.get(n.parentId) : undefined
    return parent && parent.type === 'project' ? `${parent.name} › ${n.name}` : n.name
  }

  const targets = useMemo(() => {
    if (mode === 'todo') {
      // La Todo générale (hors projet) passe en premier : c'est le choix par défaut.
      return nodes
        .filter((n) => n.type === 'note' && n.kind === 'todo')
        .map((n) => {
          const inProject = n.parentId ? byId.get(n.parentId)?.type === 'project' : false
          return { id: n.id, label: inProject ? `Projet : ${byId.get(n.parentId!)!.name}` : 'Sans projet (Todo générale)', general: !inProject }
        })
        .sort((a, b) => Number(b.general) - Number(a.general))
    }
    return [
      { id: NEW, label: 'Nouvelle note' },
      { id: TODAY, label: 'Note du jour' },
      ...nodes
        .filter((n) => n.type === 'note' && (n.kind === 'ideas' || (n.kind === 'journal' && !n.day)))
        .map((n) => ({ id: n.id, label: `Ajouter à ${label(n)}` })),
    ]
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, nodes])

  const saved = read()[mode]
  // Tâche : par défaut « sans projet ». Note : on reprend la dernière destination.
  const [target, setTarget] = useState(mode === 'note' && targets.some((t) => t.id === saved) ? saved : targets[0]?.id ?? '')
  const [title, setTitle] = useState('')
  const [text, setText] = useState('')
  const [due, setDue] = useState('')
  const [busy, setBusy] = useState(false)
  const first = useRef<HTMLInputElement | HTMLTextAreaElement>(null)
  useEffect(() => {
    const t = setTimeout(() => first.current?.focus(), 30)
    return () => clearTimeout(t)
  }, [])

  const canSave = text.trim().length > 0 && target !== ''

  const save = async () => {
    if (!canSave || busy) return
    setBusy(true)
    try {
      if (mode === 'note') remember(mode, target)
      if (mode === 'todo') {
        await appendTask(target, text.trim(), due || undefined)
        {
          const l = targets.find((t) => t.id === target)?.label ?? ''
          onDone(l.startsWith('Projet : ') ? `Tâche ajoutée au projet « ${l.slice(9)} ».` : 'Tâche ajoutée à la Todo générale.')
        }
      } else if (target === NEW) {
        await createCapturedNote(title, text)
        onDone('Note créée.')
      } else if (target === TODAY) {
        const { noteId } = ensureDailyNote()
        await appendText(noteId, text.trim())
        onDone('Ajouté à la note du jour.')
      } else {
        await appendText(target, text.trim())
        onDone(`Ajouté à « ${targets.find((t) => t.id === target)?.label.replace('Ajouter à ', '') ?? 'la note'} ».`)
      }
    } finally {
      setBusy(false)
    }
  }

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault()
      onDone(null)
    }
    if (e.key === 'Enter' && (mode === 'todo' || e.metaKey || e.ctrlKey)) {
      e.preventDefault()
      void save()
    }
  }

  return (
    <div className="overlay center quick" onMouseDown={() => onDone(null)}>
      <div className="dialog wide quick-box" role="dialog" aria-label={mode === 'todo' ? 'Nouvelle tâche' : 'Note rapide'} onMouseDown={(e) => e.stopPropagation()} onKeyDown={onKey}>
        <div className="dialog-head">
          <h3>{mode === 'todo' ? 'Nouvelle tâche' : 'Note rapide'}</h3>
          <button type="button" className="icon-btn" aria-label="Fermer" onClick={() => onDone(null)}>
            <Icon name="x" />
          </button>
        </div>

        {mode === 'todo' ? (
          <input
            ref={first as React.RefObject<HTMLInputElement>}
            className="quick-input"
            value={text}
            placeholder="Qu'est-ce qu'il faut faire ?"
            aria-label="Tâche"
            onChange={(e) => setText(e.target.value)}
          />
        ) : (
          <>
            {target === NEW && (
              <input
                ref={first as React.RefObject<HTMLInputElement>}
                className="quick-input"
                value={title}
                placeholder="Titre (facultatif)"
                aria-label="Titre"
                onChange={(e) => setTitle(e.target.value)}
              />
            )}
            <textarea
              ref={target === NEW ? undefined : (first as React.RefObject<HTMLTextAreaElement>)}
              className="quick-text"
              value={text}
              rows={6}
              placeholder="Écris ton idée…"
              aria-label="Texte"
              onChange={(e) => setText(e.target.value)}
            />
          </>
        )}

        {mode === 'todo' && (
          <div className="quick-due">
            <span>Échéance</span>
            {[
              ["Aujourd'hui", inDays(0)],
              ['Demain', inDays(1)],
              ['Lundi', nextMonday()],
            ].map(([l, v]) => (
              <button key={v} type="button" className={due === v ? 'chip on' : 'chip'} onClick={() => setDue(due === v ? '' : v)}>
                {l}
              </button>
            ))}
            <input type="date" value={due} aria-label="Date d'échéance" onChange={(e) => setDue(e.target.value)} />
          </div>
        )}

        <div className="quick-foot">
          <select className="bt-scope" aria-label="Destination" value={target} onChange={(e) => setTarget(e.target.value)}>
            {targets.map((t) => (
              <option key={t.id} value={t.id}>
                {t.label}
              </option>
            ))}
          </select>
          <DictateButton className="icon-btn" onText={(t) => setText((cur) => (cur ? `${cur} ${t}` : t))} />
          <span className="grow quick-hint">{mode === 'todo' ? '↩ ajouter · Échap fermer' : `${MOD}↩ enregistrer · Échap fermer`}</span>
          <button type="button" className="btn primary" disabled={!canSave || busy} onClick={() => void save()}>
            {mode === 'todo' ? 'Ajouter' : 'Enregistrer'}
          </button>
        </div>
      </div>
    </div>
  )
}
