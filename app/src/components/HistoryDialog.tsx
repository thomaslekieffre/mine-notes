import { useEffect, useMemo, useState } from 'react'
import * as Y from 'yjs'
import { EditorContent, useEditor } from '@tiptap/react'
import Collaboration from '@tiptap/extension-collaboration'
import { Icon } from './Icon'
import { buildExtensions } from '../extensions/schema'
import { addSnapshot, listSnapshots, restoreSnapshot } from '../store/history'
import type { Snapshot } from '../store/history'

const when = (t: number) => {
  const d = new Date(t)
  const day = d.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })
  const time = d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
  return { day, time }
}

function Preview({ snap }: { snap: Snapshot }) {
  const doc = useMemo(() => {
    const d = new Y.Doc()
    Y.applyUpdate(d, snap.update)
    return d
  }, [snap])
  const editor = useEditor(
    {
      editable: false,
      extensions: [...buildExtensions(), Collaboration.configure({ document: doc, field: 'content' })],
      editorProps: { attributes: { class: 'doc history-doc' } },
    },
    [doc],
  )
  useEffect(() => () => doc.destroy(), [doc])
  return <EditorContent editor={editor} />
}

/** Historique d'une note : on parcourt les versions passées, on les relit, on revient à l'une d'elles. */
export function HistoryDialog({ noteId, doc, onClose }: { noteId: string; doc: Y.Doc; onClose: () => void }) {
  const [list, setList] = useState<Snapshot[] | null>(null)
  const [index, setIndex] = useState(0)
  const [confirm, setConfirm] = useState(false)

  useEffect(() => {
    let alive = true
    void (async () => {
      // On garde d'abord l'état actuel pour qu'il apparaisse dans la liste.
      await addSnapshot(noteId, doc)
      const l = await listSnapshots(noteId)
      if (alive) {
        setList(l)
        setIndex(l.length - 1)
      }
    })()
    return () => {
      alive = false
    }
  }, [noteId, doc])

  const reversed = list ? [...list].reverse() : []
  const current = list?.[index]

  return (
    <div className="overlay center" onMouseDown={onClose}>
      <div className="dialog history" role="dialog" aria-label="Historique de la note" onMouseDown={(e) => e.stopPropagation()} onKeyDown={(e) => e.key === 'Escape' && onClose()}>
        <div className="dialog-head">
          <h3>Historique de la note</h3>
          <button type="button" className="icon-btn" aria-label="Fermer" onClick={onClose}>
            <Icon name="x" />
          </button>
        </div>
        {list === null && <div className="tree-empty">Chargement…</div>}
        {list && list.length === 0 && <div className="tree-empty">Pas encore de version enregistrée. Écris un peu, puis reviens ici.</div>}
        {list && list.length > 0 && current && (
          <div className="history-body">
            <div className="history-list" role="listbox" aria-label="Versions">
              {reversed.map((s, i) => {
                const idx = list.length - 1 - i
                const { day, time } = when(s.t)
                return (
                  <button key={s.t} type="button" role="option" aria-selected={idx === index} className={idx === index ? 'history-item on' : 'history-item'} onClick={() => { setIndex(idx); setConfirm(false) }}>
                    <span>
                      {day} · {time}
                    </span>
                    <small>
                      {s.words} mot{s.words > 1 ? 's' : ''}
                      {i === 0 ? ' · la plus récente' : ''}
                      {s.label ? ` · ${s.label}` : ''}
                    </small>
                  </button>
                )
              })}
            </div>
            <div className="history-preview">
              <Preview snap={current} />
            </div>
          </div>
        )}
        {list && list.length > 0 && current && (
          <div className="dialog-actions">
            {confirm ? (
              <>
                <span className="grow trash-warn">Remplacer le contenu actuel par cette version ? L'état actuel est gardé dans l'historique.</span>
                <button type="button" className="btn" onClick={() => setConfirm(false)}>
                  Annuler
                </button>
                <button
                  type="button"
                  className="btn primary"
                  onClick={() => {
                    void restoreSnapshot(noteId, doc, current).then(onClose)
                  }}
                >
                  Restaurer
                </button>
              </>
            ) : (
              <>
                <span className="grow history-hint">Les versions sont enregistrées sur cet appareil, 30 secondes après que tu aies fini d'écrire.</span>
                <button type="button" className="btn primary" disabled={index === list.length - 1} onClick={() => setConfirm(true)}>
                  Restaurer cette version
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
