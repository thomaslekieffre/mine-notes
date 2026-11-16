import { Icon, nodeIcon } from './Icon'
import type { TreeNode } from '../store/tree'

interface Props {
  tabs: TreeNode[]
  activeId: string | null
  onActivate: (id: string) => void
  onClose: (id: string) => void
  onMenu: () => void
}

export function Tabs({ tabs, activeId, onActivate, onClose, onMenu }: Props) {
  return (
    <div className="tabs" role="tablist" data-tauri-drag-region>
      <button type="button" className="icon-btn only-mobile" aria-label="Ouvrir les dossiers" onClick={onMenu}>
        <Icon name="menu" size={20} />
      </button>
      {tabs.map((t) => {
        const { icon, color } = nodeIcon(t)
        const active = t.id === activeId
        return (
          <div key={t.id} role="tab" aria-selected={active} className={active ? 'tab active' : 'tab'}>
            <button type="button" className="tab-main" onClick={() => onActivate(t.id)}>
              <Icon name={icon} size={14} style={{ color, flexShrink: 0 }} />
              <span className="tab-name">{t.name}</span>
            </button>
            <button type="button" className="tab-close" aria-label={`Fermer ${t.name}`} onClick={() => onClose(t.id)}>
              <Icon name="x" size={12} />
            </button>
          </div>
        )
      })}
    </div>
  )
}
