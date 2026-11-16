import { Icon } from './Icon'
import type { Theme } from '../App'

const LABEL: Record<Theme, string> = { system: 'Auto', light: 'Clair', dark: 'Sombre' }
const ICON = { system: 'auto', light: 'sun', dark: 'moon' } as const

export function StatusBar({
  words,
  theme,
  onCycleTheme,
  onOpenData,
}: {
  words: number | null
  theme: Theme
  onCycleTheme: () => void
  onOpenData: () => void
}) {
  return (
    <footer className="statusbar">
      <button type="button" className="status-btn status-sync" onClick={onOpenData} title="Sauvegarder ou restaurer">
        <span className="dot" />
        Stocké sur cet appareil · Sauvegarde
      </button>
      <span className="grow" />
      {words !== null && (
        <span>
          {words} mot{words > 1 ? 's' : ''}
        </span>
      )}
      <button type="button" className="status-btn" onClick={onCycleTheme} title="Changer de thème">
        <Icon name={ICON[theme]} size={13} />
        {LABEL[theme]}
      </button>
    </footer>
  )
}
