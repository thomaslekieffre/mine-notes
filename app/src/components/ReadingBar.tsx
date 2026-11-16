import { Icon } from './Icon'
import { setReading } from '../store/reading'
import type { PenSettings } from './PenLayer'

const COLORS: [string, string][] = [
  ['--c-red', 'Rouge'],
  ['--c-orange', 'Orange'],
  ['--c-green', 'Vert'],
  ['--c-blue', 'Bleu'],
  ['--c-purple', 'Violet'],
]

interface Props {
  pen: PenSettings
  onPen: (patch: Partial<PenSettings>) => void
  onClear: () => void
  onPrint: () => void
}

/** Barre flottante du mode lecture : stylo qui s'efface, surligneur, couleurs. */
export function ReadingBar({ pen, onPen, onClear, onPrint }: Props) {
  return (
    <div className="reading-bar" role="toolbar" aria-label="Mode lecture">
      <span className="rb-title">
        <Icon name="eye" size={14} /> Lecture
      </span>
      <button type="button" className={pen.on ? 'rb-btn on' : 'rb-btn'} aria-pressed={pen.on} onClick={() => onPen({ on: !pen.on })} title="Stylo : dessiner par-dessus la note">
        <Icon name="pen" size={14} /> Stylo
      </button>
      {pen.on && (
        <>
          <span className="seg" role="group" aria-label="Outil">
            <button type="button" aria-pressed={pen.tool === 'pen'} onClick={() => onPen({ tool: 'pen' })}>
              Trait
            </button>
            <button type="button" aria-pressed={pen.tool === 'marker'} onClick={() => onPen({ tool: 'marker' })}>
              Surligneur
            </button>
          </span>
          <span className="rb-colors">
            {COLORS.map(([v, name]) => (
              <button
                key={v}
                type="button"
                className={pen.color === v ? 'swatch active' : 'swatch'}
                style={{ background: `var(${v})` }}
                aria-label={name}
                title={name}
                onClick={() => onPen({ color: v })}
              />
            ))}
          </span>
          <span className="seg" role="group" aria-label="Durée">
            <button type="button" aria-pressed={pen.fade} onClick={() => onPen({ fade: true })} title="Les traits disparaissent au bout de quelques secondes">
              S'efface
            </button>
            <button type="button" aria-pressed={!pen.fade} onClick={() => onPen({ fade: false })} title="Les traits restent jusqu'à ce que tu les effaces">
              Reste
            </button>
          </span>
          <button type="button" className="rb-btn" onClick={onClear} title="Effacer tous les traits">
            Effacer
          </button>
        </>
      )}
      <button type="button" className="rb-btn" onClick={onPrint} title="Exporter en PDF">
        <Icon name="printer" size={14} /> PDF
      </button>
      <button type="button" className="rb-btn" onClick={() => setReading(false)} title="Quitter le mode lecture">
        Modifier
      </button>
    </div>
  )
}
