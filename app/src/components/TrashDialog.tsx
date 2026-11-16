import { useState } from 'react'
import { Icon, NodeIcon } from './Icon'
import { emptyTrash, originPath, purgeNode, restoreNode, trashedContentCount, useTree } from '../store/tree'

const ago = (t: number) => {
  const m = Math.round((Date.now() - t) / 60000)
  if (m < 1) return "à l'instant"
  if (m < 60) return `il y a ${m} min`
  const h = Math.round(m / 60)
  if (h < 24) return `il y a ${h} h`
  const d = Math.round(h / 24)
  return `il y a ${d} jour${d > 1 ? 's' : ''}`
}

/** Corbeille : on retrouve ce qu'on a supprimé, ou on le supprime pour de bon. */
export function TrashDialog({ onClose, onRestore }: { onClose: () => void; onRestore: (id: string) => void }) {
  const { trash } = useTree()
  const [confirm, setConfirm] = useState<string | 'all' | null>(null)

  return (
    <div className="overlay center" onMouseDown={onClose}>
      <div className="dialog wide" role="dialog" aria-label="Corbeille" onMouseDown={(e) => e.stopPropagation()}>
        <div className="dialog-head">
          <h3>Corbeille</h3>
          <button type="button" className="icon-btn" aria-label="Fermer" onClick={onClose}>
            <Icon name="x" />
          </button>
        </div>
        <p>
          Les éléments supprimés restent ici tant que tu ne les supprimes pas pour de bon. Rien n'est effacé
          automatiquement.
        </p>

        <div className="trash-list">
          {trash.length === 0 && <div className="tree-empty">La corbeille est vide.</div>}
          {trash.map((n) => {
            const inside = n.type === 'note' ? 0 : trashedContentCount(n.id)
            const from = originPath(n.id)
            return (
              <div key={n.id} className="trash-row">
                <NodeIcon node={n} size={15} />
                <span className="trash-main">
                  <span className="trash-name">{n.name}</span>
                  <span className="trash-meta">
                    {from ? `${from} · ` : ''}
                    {inside > 0 ? `${inside} élément${inside > 1 ? 's' : ''} · ` : ''}
                    {ago(n.trashedAt ?? 0)}
                  </span>
                </span>
                {confirm === n.id ? (
                  <>
                    <button type="button" className="btn danger" onClick={() => { purgeNode(n.id); setConfirm(null) }}>
                      Supprimer pour de bon
                    </button>
                    <button type="button" className="btn" onClick={() => setConfirm(null)}>
                      Annuler
                    </button>
                  </>
                ) : (
                  <>
                    <button type="button" className="btn" onClick={() => { restoreNode(n.id); onRestore(n.id) }}>
                      Restaurer
                    </button>
                    <button type="button" className="icon-btn" aria-label={`Supprimer ${n.name} définitivement`} title="Supprimer définitivement" onClick={() => setConfirm(n.id)}>
                      <Icon name="trash" size={15} />
                    </button>
                  </>
                )}
              </div>
            )
          })}
        </div>

        {trash.length > 0 && (
          <div className="dialog-actions">
            {confirm === 'all' ? (
              <>
                <span className="grow trash-warn">Tout supprimer définitivement ? Impossible de revenir en arrière.</span>
                <button type="button" className="btn" onClick={() => setConfirm(null)}>
                  Annuler
                </button>
                <button type="button" className="btn danger" onClick={() => { emptyTrash(); setConfirm(null) }}>
                  Vider la corbeille
                </button>
              </>
            ) : (
              <>
                <span className="grow" />
                <button type="button" className="btn" onClick={() => setConfirm('all')}>
                  Vider la corbeille
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
