import { useState } from 'react'
import { EMOJI_CHOICES, ICON_CHOICES, Icon, NodeIcon } from './Icon'
import { setNodeIcon } from '../store/tree'
import type { TreeNode } from '../store/tree'
import { COLOR_NAMES, colorCss } from '../store/colors'

const COLORS = ['red', 'orange', 'amber', 'green', 'teal', 'sky', 'blue', 'violet', 'pink', 'slate']

/** Choix de l'icône d'une note, d'un dossier ou d'un projet : icône colorée ou emoji. */
export function IconPicker({ node, onClose }: { node: TreeNode; onClose: () => void }) {
  const isEmoji = !!node.icon && !ICON_CHOICES.includes(node.icon as never)
  const [tab, setTab] = useState<'icons' | 'emoji'>(isEmoji ? 'emoji' : 'icons')
  const [color, setColor] = useState<string | null>(node.iconColor ?? null)

  const pickIcon = (name: string) => {
    setNodeIcon(node.id, name, color)
    onClose()
  }
  const pickEmoji = (emoji: string) => {
    setNodeIcon(node.id, emoji, null)
    onClose()
  }

  return (
    <div className="overlay center" onMouseDown={onClose}>
      <div className="dialog wide" role="dialog" aria-label="Changer l'icône" onMouseDown={(e) => e.stopPropagation()} onKeyDown={(e) => e.key === 'Escape' && onClose()}>
        <div className="dialog-head">
          <h3 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <NodeIcon node={node} size={18} /> Icône de « {node.name} »
          </h3>
          <button type="button" className="icon-btn" aria-label="Fermer" onClick={onClose}>
            <Icon name="x" />
          </button>
        </div>

        <span className="seg" role="group" aria-label="Type d'icône">
          <button type="button" aria-pressed={tab === 'icons'} onClick={() => setTab('icons')}>
            Icônes
          </button>
          <button type="button" aria-pressed={tab === 'emoji'} onClick={() => setTab('emoji')}>
            Emoji
          </button>
        </span>

        {tab === 'icons' && (
          <>
            <div className="icon-colors" style={{ marginTop: 12 }}>
              <button type="button" className={color === null ? 'swatch active' : 'swatch'} style={{ background: 'var(--text2)' }} aria-label="Couleur automatique" title="Automatique" onClick={() => setColor(null)} />
              {COLORS.map((c) => (
                <button key={c} type="button" className={color === c ? 'swatch active' : 'swatch'} style={{ background: colorCss(c) }} aria-label={COLOR_NAMES[c]} title={COLOR_NAMES[c]} onClick={() => setColor(c)} />
              ))}
            </div>
            <div className="icon-grid">
              {ICON_CHOICES.map((name) => (
                <button key={name} type="button" className={node.icon === name ? 'icon-cell on' : 'icon-cell'} aria-label={name} title={name} onClick={() => pickIcon(name)} style={{ color: color ? colorCss(color) : undefined }}>
                  <Icon name={name} size={20} />
                </button>
              ))}
            </div>
          </>
        )}

        {tab === 'emoji' && (
          <div className="icon-grid">
            {EMOJI_CHOICES.map((e) => (
              <button key={e} type="button" className={node.icon === e ? 'icon-cell on' : 'icon-cell'} onClick={() => pickEmoji(e)}>
                {e}
              </button>
            ))}
          </div>
        )}

        <div className="dialog-actions">
          <button
            type="button"
            className="btn"
            disabled={!node.icon}
            onClick={() => {
              setNodeIcon(node.id, null, null)
              onClose()
            }}
          >
            Icône par défaut
          </button>
          <span className="grow" />
          <button type="button" className="btn" onClick={onClose}>
            Fermer
          </button>
        </div>
      </div>
    </div>
  )
}
