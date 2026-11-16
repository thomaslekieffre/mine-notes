import { useEffect, useMemo, useRef, useState } from 'react'
import katex from 'katex'
import { Icon } from './Icon'

interface Props {
  kind: 'inline' | 'block'
  initial: string
  editing: boolean
  onSubmit: (latex: string) => void
  onDelete: () => void
  onClose: () => void
}

/** Saisie d'une formule LaTeX avec aperçu en direct. */
export function MathDialog({ kind, initial, editing, onSubmit, onDelete, onClose }: Props) {
  const [latex, setLatex] = useState(initial)
  const ref = useRef<HTMLTextAreaElement>(null)
  useEffect(() => {
    ref.current?.focus()
    ref.current?.select()
  }, [])

  const html = useMemo(() => {
    try {
      return katex.renderToString(latex || '\;', { displayMode: kind === 'block', throwOnError: false })
    } catch {
      return ''
    }
  }, [latex, kind])

  const submit = () => {
    if (latex.trim()) onSubmit(latex.trim())
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
        <p>
          Écris en LaTeX, par exemple <kbd>\frac{'{a}{b}'}</kbd>, <kbd>\sqrt{'{x}'}</kbd>, <kbd>\sum_{'{i=1}^{n}'}</kbd>,{' '}
          <kbd>\int_0^1</kbd>.
        </p>
        <textarea
          ref={ref}
          className="math-input"
          value={latex}
          aria-label="Formule LaTeX"
          rows={3}
          spellCheck={false}
          placeholder="x^2 + y^2 = r^2"
          onChange={(e) => setLatex(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') onClose()
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey || kind === 'inline')) {
              e.preventDefault()
              submit()
            }
          }}
        />
        <div className="math-preview" dangerouslySetInnerHTML={{ __html: html }} />
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
