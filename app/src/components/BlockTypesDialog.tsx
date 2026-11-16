import { useState } from 'react'
import { Icon } from './Icon'
import { addBlockType, removeBlockType, typesFor, updateBlockType, useBlockTypes } from '../store/tree'
import { BLOCK_COLORS, COLOR_NAMES, colorCss } from '../store/colors'

function Swatches({ value, onPick }: { value: string; onPick: (c: string) => void }) {
  const custom = value.startsWith('#')
  return (
    <span className="bt-swatches">
      {BLOCK_COLORS.map((c) => (
        <button
          key={c}
          type="button"
          className={c === value ? 'swatch active' : 'swatch'}
          style={{ background: colorCss(c) }}
          aria-label={COLOR_NAMES[c]}
          title={COLOR_NAMES[c]}
          onClick={() => onPick(c)}
        />
      ))}
      <label
        className={custom ? 'swatch active' : 'swatch'}
        title="Couleur libre"
        style={{
          background: custom ? value : 'conic-gradient(red, yellow, lime, cyan, blue, magenta, red)',
          position: 'relative',
          cursor: 'pointer',
        }}
      >
        <input
          type="color"
          aria-label="Couleur libre"
          value={custom ? value : '#8888ff'}
          onChange={(e) => onPick(e.target.value)}
          style={{ opacity: 0, position: 'absolute', inset: 0, width: '100%', height: '100%', cursor: 'pointer' }}
        />
      </label>
    </span>
  )
}

interface Props {
  onClose: () => void
  projectId: string | null
  projectName?: string
}

export function BlockTypesDialog({ onClose, projectId, projectName }: Props) {
  const types = typesFor(useBlockTypes(), projectId)
  const [label, setLabel] = useState('')
  const [color, setColor] = useState('purple')
  const [onlyHere, setOnlyHere] = useState(false)
  const [picking, setPicking] = useState<string | null>(null)

  const add = () => {
    const name = label.trim()
    if (!name) return
    addBlockType(name, color, onlyHere && projectId ? projectId : undefined)
    setLabel('')
  }

  return (
    <div className="overlay center" onMouseDown={onClose}>
      <div className="dialog wide" role="dialog" aria-label="Types de blocs" onMouseDown={(e) => e.stopPropagation()}>
        <div className="dialog-head">
          <h3>Types de blocs</h3>
          <button type="button" className="icon-btn" aria-label="Fermer" onClick={onClose}>
            <Icon name="x" />
          </button>
        </div>
        <p>
          Chaque type devient un bloc coloré que tu insères avec <kbd>/</kbd>. Un type peut être disponible
          partout ou réservé à un projet. Les blocs déjà écrits gardent leur nom et leur couleur.
        </p>

        <div className="bt-list">
          {types.map((t) => (
            <div key={t.id}>
              <div className="bt-row">
                <button
                  type="button"
                  className="swatch"
                  style={{ background: colorCss(t.color) }}
                  aria-label={`Changer la couleur de ${t.label}`}
                  title="Changer la couleur"
                  onClick={() => setPicking(picking === t.id ? null : t.id)}
                />
                <input
                  className="bt-name"
                  defaultValue={t.label}
                  aria-label={`Nom du type ${t.label}`}
                  onBlur={(e) => {
                    const v = e.target.value.trim()
                    if (v && v !== t.label) updateBlockType(t.id, { label: v })
                    else e.target.value = t.label
                  }}
                />
                {projectId ? (
                  <button
                    type="button"
                    className="bt-badge"
                    title="Cliquer pour changer la portée"
                    onClick={() => updateBlockType(t.id, { projectId: t.projectId ? undefined : projectId })}
                  >
                    {t.projectId ? `Projet ${projectName ?? ''}` : 'Partout'}
                  </button>
                ) : (
                  <span className="bt-badge" style={{ cursor: 'default' }}>
                    Partout
                  </span>
                )}
                <button
                  type="button"
                  className="icon-btn"
                  aria-label={`Supprimer ${t.label}`}
                  title="Supprimer ce type"
                  onClick={() => removeBlockType(t.id)}
                >
                  <Icon name="trash" size={15} />
                </button>
              </div>
              {picking === t.id && (
                <div className="bt-pick">
                  <Swatches value={t.color} onPick={(c) => updateBlockType(t.id, { color: c })} />
                </div>
              )}
            </div>
          ))}
          {types.length === 0 && <div className="tree-empty">Aucun type pour l'instant.</div>}
        </div>

        <div className="bt-new-wrap">
          <div className="bt-row bt-new">
            <span className="bt-chip" style={{ background: colorCss(color) }} />
            <input
              className="bt-name"
              placeholder="Nouveau type (ex. Théorème, Astuce, À retenir…)"
              value={label}
              aria-label="Nom du nouveau type"
              onChange={(e) => setLabel(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && add()}
            />
            {projectId && (
              <select
                className="bt-scope"
                aria-label="Portée du nouveau type"
                value={onlyHere ? 'here' : 'all'}
                onChange={(e) => setOnlyHere(e.target.value === 'here')}
              >
                <option value="all">Partout</option>
                <option value="here">Ce projet</option>
              </select>
            )}
            <button type="button" className="btn" onClick={add} disabled={!label.trim()}>
              Ajouter
            </button>
          </div>
          <div className="bt-pick">
            <Swatches value={color} onPick={setColor} />
          </div>
        </div>
      </div>
    </div>
  )
}
