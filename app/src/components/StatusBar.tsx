import { Icon } from './Icon'
import { toggleReading, useReading } from '../store/reading'
import { pretty, useShortcuts } from '../store/shortcuts'
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
  const reading = useReading()
  const keys = useShortcuts()
  return (
    <footer className="statusbar">
      <button type="button" className="status-btn status-sync" onClick={onOpenData} title="Sauvegarder ou restaurer">
        <span className="dot" />
        Stocké sur cet appareil · Sauvegarde
      </button>
      <span className="grow" />
      {words !== null && (
        <span>
          {words} mot{words > 1 ? "s" : ""}{words > 0 && ` · ${Math.max(1, Math.round(words / 200))} min`}
        </span>
      )}
      <button type="button" className={reading ? 'status-btn active' : 'status-btn'} onClick={toggleReading} title={`Mode lecture (${pretty(keys.readMode)})`} aria-pressed={reading}>
        <Icon name="eye" size={13} />
        {reading ? 'Lecture' : 'Écriture'}
      </button>
      <button type="button" className="status-btn" onClick={onCycleTheme} title="Changer de thème">
        <Icon name={ICON[theme]} size={13} />
        {LABEL[theme]}
      </button>
    </footer>
  )
}
