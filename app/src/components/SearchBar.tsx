import { useEffect, useRef, useState } from 'react'
import type { Editor } from '@tiptap/core'
import { Icon } from './Icon'
import { getSearch, replaceAll, replaceCurrent, setSearch, stepSearch } from '../extensions/Search'

/** Barre de recherche / remplacement dans la note (⌘F). */
export function SearchBar({ editor, onClose }: { editor: Editor; onClose: () => void }) {
  const [q, setQ] = useState('')
  const [r, setR] = useState('')
  const [showReplace, setShowReplace] = useState(false)
  const [, bump] = useState(0)
  const input = useRef<HTMLInputElement>(null)

  useEffect(() => {
    input.current?.focus()
    input.current?.select()
    const upd = () => bump((n) => n + 1)
    editor.on('update', upd)
    return () => {
      editor.off('update', upd)
      setSearch(editor, '')
    }
  }, [editor])

  const st = getSearch(editor)
  const total = st?.matches.length ?? 0

  return (
    <div className="searchbar" role="search" aria-label="Rechercher dans la note">
      <div className="sb-row">
        <input
          ref={input}
          value={q}
          placeholder="Rechercher dans la note…"
          aria-label="Rechercher"
          onChange={(e) => {
            setQ(e.target.value)
            setSearch(editor, e.target.value)
            bump((n) => n + 1)
          }}
          onKeyDown={(e) => {
            if (e.key === 'Escape') onClose()
            if (e.key === 'Enter') {
              e.preventDefault()
              stepSearch(editor, e.shiftKey ? -1 : 1)
              bump((n) => n + 1)
            }
          }}
        />
        <span className="sb-count">{q ? (total ? `${(st?.current ?? 0) + 1}/${total}` : '0') : ''}</span>
        <button type="button" className="icon-btn" aria-label="Précédent" title="Précédent (⇧↩)" onClick={() => { stepSearch(editor, -1); bump((n) => n + 1) }}>
          <Icon name="chevD" size={14} style={{ transform: 'rotate(180deg)' }} />
        </button>
        <button type="button" className="icon-btn" aria-label="Suivant" title="Suivant (↩)" onClick={() => { stepSearch(editor, 1); bump((n) => n + 1) }}>
          <Icon name="chevD" size={14} />
        </button>
        <button type="button" className={showReplace ? 'icon-btn on' : 'icon-btn'} aria-label="Remplacer" title="Remplacer" onClick={() => setShowReplace((v) => !v)}>
          <Icon name="rename" size={14} />
        </button>
        <button type="button" className="icon-btn" aria-label="Fermer la recherche" onClick={onClose}>
          <Icon name="x" size={14} />
        </button>
      </div>
      {showReplace && (
        <div className="sb-row">
          <input value={r} placeholder="Remplacer par…" aria-label="Remplacer par" onChange={(e) => setR(e.target.value)} onKeyDown={(e) => e.key === 'Escape' && onClose()} />
          <button type="button" className="btn" disabled={!total} onClick={() => { replaceCurrent(editor, r); bump((n) => n + 1) }}>
            Remplacer
          </button>
          <button type="button" className="btn" disabled={!total} onClick={() => { replaceAll(editor, r); bump((n) => n + 1) }}>
            Tout
          </button>
        </div>
      )}
    </div>
  )
}
