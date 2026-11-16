import { useEffect, useRef, useState } from 'react'
import { Icon } from './Icon'
import type { MathfieldElement } from 'mathlive'

interface Props {
  kind: 'inline' | 'block'
  initial: string
  editing: boolean
  onSubmit: (latex: string) => void
  onDelete: () => void
  onClose: () => void
}

const TIPS: [string, string][] = [
  ['1/3', 'fraction'],
  ['x^2', 'puissance'],
  ['x_1', 'indice'],
  ['sqrt', 'racine'],
  ['pi', 'π'],
  ['alpha', 'α'],
  ['sum', 'Σ'],
  ['int', '∫'],
  ['<=', '≤'],
  ['->', '→'],
]

/** Saisie visuelle d'une formule (MathLive) : on tape « 1/3 » et ça devient une vraie fraction. */
export function MathDialog({ kind, initial, editing, onSubmit, onDelete, onClose }: Props) {
  const host = useRef<HTMLDivElement>(null)
  const field = useRef<MathfieldElement | null>(null)
  const [latex, setLatex] = useState(initial)
  const [raw, setRaw] = useState(false)
  const latexRef = useRef(initial)
  latexRef.current = latex

  useEffect(() => {
    let alive = true
    let el: MathfieldElement | null = null
    void import('mathlive').then(({ MathfieldElement }) => {
      if (!alive || !host.current) return
      MathfieldElement.fontsDirectory = '/mathlive/fonts'
      MathfieldElement.soundsDirectory = null
      el = new MathfieldElement()
      el.mathVirtualKeyboardPolicy = 'manual'
      el.value = initial
      el.setAttribute('aria-label', 'Formule')
      el.addEventListener('input', () => setLatex(el!.value))
      el.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
          e.stopPropagation()
          onClose()
        } else if (e.key === 'Enter') {
          e.preventDefault()
          e.stopPropagation()
          const v = el!.value.trim()
          if (v) onSubmit(v)
          else onClose()
        }
      })
      host.current.appendChild(el)
      field.current = el
      setTimeout(() => el?.focus(), 30)
    })
    return () => {
      alive = false
      el?.remove()
      field.current = null
      window.mathVirtualKeyboard?.hide()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const submit = () => {
    const v = latexRef.current.trim()
    if (v) onSubmit(v)
    else onClose()
  }

  return (
    <div className="overlay center" onMouseDown={onClose}>
      <div className="dialog wide" role="dialog" aria-label="Formule" onMouseDown={(e) => e.stopPropagation()}>
        <div className="dialog-head">
          <h3>Formule {kind === 'block' ? '(bloc)' : '(dans le texte)'}</h3>
          <button type="button" className="icon-btn" aria-label="Fermer" onClick={onClose}>
            <Icon name="x" />
          </button>
        </div>
        <p>Tape directement, comme au clavier. Les raccourcis se transforment tout seuls :</p>
        <div className="math-tips">
          {TIPS.map(([k, v]) => (
            <span key={k}>
              <kbd>{k}</kbd> {v}
            </span>
          ))}
        </div>
        <div ref={host} className="math-host" />
        <div className="math-tools">
          <button
            type="button"
            className="btn"
            onClick={() => {
              const kb = window.mathVirtualKeyboard
              if (kb) kb.visible ? kb.hide() : kb.show()
              field.current?.focus()
            }}
          >
            Clavier visuel
          </button>
          <button type="button" className="btn" onClick={() => setRaw((v) => !v)}>
            {raw ? 'Masquer le LaTeX' : 'Voir le LaTeX'}
          </button>
        </div>
        {raw && (
          <textarea
            className="math-input"
            value={latex}
            aria-label="Code LaTeX"
            rows={2}
            spellCheck={false}
            onChange={(e) => {
              setLatex(e.target.value)
              if (field.current) field.current.value = e.target.value
            }}
          />
        )}
        <div className="dialog-actions">
          {editing && (
            <button type="button" className="btn danger" onClick={onDelete}>
              Supprimer
            </button>
          )}
          <span className="grow" />
          <button type="button" className="btn" onClick={onClose}>
            Annuler
          </button>
          <button type="button" className="btn primary" onClick={submit}>
            {editing ? 'Enregistrer' : 'Insérer'}
          </button>
        </div>
      </div>
    </div>
  )
}
