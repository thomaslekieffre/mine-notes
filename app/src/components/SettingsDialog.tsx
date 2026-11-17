import { Icon } from './Icon'
import { Mascot } from './Mascot'
import { setPrefs, usePrefs } from '../store/prefs'
import type { Prefs } from '../store/prefs'
import { isMac, isTauri, openExternal, THIS_COMPUTER } from '../store/platform'
import {
  SHORTCUTS,
  accelFromEvent,
  pretty,
  resetAllShortcuts,
  resetShortcut,
  setShortcut,
  useShortcuts,
} from '../store/shortcuts'
import type { ShortcutDef } from '../store/shortcuts'
import { useEffect, useState } from 'react'
import type { Theme } from '../App'

function Seg<T extends string>({
  value,
  options,
  onPick,
  label,
}: {
  value: T
  options: [T, string][]
  onPick: (v: T) => void
  label: string
}) {
  return (
    <span className="seg" role="group" aria-label={label}>
      {options.map(([v, text]) => (
        <button key={v} type="button" aria-pressed={v === value} onClick={() => onPick(v)}>
          {text}
        </button>
      ))}
    </span>
  )
}

interface Props {
  theme: Theme
  onTheme: (t: Theme) => void
  onOpenData: () => void
  onDemo: () => void
  onClose: () => void
}

const FIXED: [string, string][] = [
  ['/', 'Insérer un bloc (colonnes, schéma, formule, tableau…)'],
  ['[[', 'Lier une page, ou en créer une'],
]

const REPO = 'https://github.com/thomaslekieffre/mine-notes'

function KeyRow({ def }: { def: ShortcutDef }) {
  const keys = useShortcuts()
  const [rec, setRec] = useState(false)
  const [error, setError] = useState<string | null>(null)
  useEffect(() => {
    if (!rec) return
    const onKey = (e: KeyboardEvent) => {
      e.preventDefault()
      e.stopPropagation()
      if (e.key === 'Escape') return setRec(false)
      const a = accelFromEvent(e)
      if (!a) return setError(isMac ? 'Ajoute ⌘, ⌃ ou ⌥ à la touche.' : 'Ajoute Ctrl ou Alt à la touche.')
      const clash = setShortcut(def.id, a)
      if (clash) return setError(`Déjà utilisé par « ${clash.label} ».`)
      setError(null)
      setRec(false)
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [rec, def.id])
  const changed = keys[def.id] !== def.default
  return (
    <div className="set-row">
      <span>
        {def.label}
        <small className={error ? 'key-error' : undefined}>
          {error ?? (def.global ? (isTauri() ? def.hint : 'Dans le navigateur : seulement quand cet onglet est actif.') : def.hint)}
        </small>
      </span>
      <span style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
        <span className="key-chip">{rec ? 'Appuie sur la combinaison…' : pretty(keys[def.id])}</span>
        <button
          type="button"
          className="btn"
          onClick={() => {
            setError(null)
            setRec((v) => !v)
          }}
        >
          {rec ? 'Annuler' : 'Changer'}
        </button>
        {changed && !rec && (
          <button type="button" className="icon-btn" title={`Revenir à ${pretty(def.default)}`} aria-label={`Réinitialiser ${def.label}`} onClick={() => resetShortcut(def.id)}>
            <Icon name="x" size={14} />
          </button>
        )}
      </span>
    </div>
  )
}

export function SettingsDialog({ theme, onTheme, onOpenData, onDemo, onClose }: Props) {
  const p = usePrefs()
  const set = <K extends keyof Prefs>(k: K) => (v: Prefs[K]) => setPrefs({ [k]: v } as Partial<Prefs>)

  return (
    <div className="overlay center" onMouseDown={onClose}>
      <div className="dialog wide settings" role="dialog" aria-label="Réglages" onMouseDown={(e) => e.stopPropagation()}>
        <div className="dialog-head">
          <h3>Réglages</h3>
          <button type="button" className="icon-btn" aria-label="Fermer" onClick={onClose}>
            <Icon name="x" />
          </button>
        </div>

        <section className="set-section">
          <h4>Apparence</h4>
          <div className="set-row">
            <span>Thème</span>
            <Seg<Theme>
              label="Thème"
              value={theme}
              onPick={onTheme}
              options={[['system', 'Auto'], ['light', 'Clair'], ['dark', 'Sombre']]}
            />
          </div>
          <div className="set-row">
            <span>
              Police des notes
              <small>Les polices choisies dans la barre d'outils restent prioritaires.</small>
            </span>
            <Seg<Prefs['font']>
              label="Police"
              value={p.font}
              onPick={set('font')}
              options={[['inter', 'Inter'], ['kalam', 'Crayon'], ['serif', 'Serif'], ['mono', 'Mono']]}
            />
          </div>
          <div className="set-row">
            <span>Taille du texte</span>
            <Seg<Prefs['size']>
              label="Taille"
              value={p.size}
              onPick={set('size')}
              options={[['S', 'Petit'], ['M', 'Normal'], ['L', 'Grand'], ['XL', 'Très grand']]}
            />
          </div>
          <div className="set-row">
            <span>Largeur de la page</span>
            <Seg<Prefs['width']>
              label="Largeur"
              value={p.width}
              onPick={set('width')}
              options={[['narrow', 'Étroite'], ['normal', 'Normale'], ['wide', 'Large']]}
            />
          </div>
          <div className="set-row">
            <span>
              Mascotte animée
              <small>Elle cligne, te regarde écrire et s'endort si tu pars. Clique dessus !</small>
            </span>
            <Seg<'on' | 'off'>
              label="Mascotte"
              value={p.mascot ? 'on' : 'off'}
              onPick={(v) => setPrefs({ mascot: v === 'on' })}
              options={[['on', 'Oui'], ['off', 'Non']]}
            />
          </div>
        </section>

        <section className="set-section">
          <h4>Données</h4>
          <div className="set-row">
            <span>
              Sauvegarde, restauration{isTauri() ? ` et dossier sur ${THIS_COMPUTER}` : ''}
              <small>Tes notes restent sur cet appareil.</small>
            </span>
            <button type="button" className="btn" onClick={onOpenData}>
              Ouvrir…
            </button>
          </div>
          <div className="set-row">
            <span>
              Note de démonstration
              <small>Crée un dossier « Démo Mine » qui utilise toutes les fonctionnalités.</small>
            </span>
            <button type="button" className="btn" onClick={onDemo}>
              Créer
            </button>
          </div>
        </section>

        <section className="set-section">
          <h4>Raccourcis</h4>
          {Array.from(new Set(SHORTCUTS.map((d) => d.group))).map((g) => (
            <div key={g}>
              <div className="set-sub">{g}</div>
              {SHORTCUTS.filter((d) => d.group === g).map((d) => (
                <KeyRow key={d.id} def={d} />
              ))}
            </div>
          ))}
          <div className="set-sub">Dans l'éditeur (fixes)</div>
          <div className="set-keys">
            {FIXED.map(([k, text]) => (
              <span key={k} style={{ display: 'contents' }}>
                <kbd>{k}</kbd>
                <span>{text}</span>
              </span>
            ))}
          </div>
          <div style={{ marginTop: 10 }}>
            <button type="button" className="btn" onClick={resetAllShortcuts}>
              Tout réinitialiser
            </button>
          </div>
        </section>

        <section className="set-section">
          <h4>À propos</h4>
          <div className="set-about">
            <Mascot size={56} />
            <span style={{ fontSize: 13 }}>
              <strong>Mine</strong> · version {__APP_VERSION__}
              <small style={{ display: 'block', color: 'var(--muted)', marginTop: 2 }}>
                Projet open source <strong>mine-notes</strong> · licence MIT
              </small>
              <small style={{ display: 'block', color: 'var(--muted)', marginTop: 2 }}>
                Mes notes, chez moi. Aucune donnée ne quitte cet appareil.
              </small>
            </span>
          </div>
          <div style={{ marginTop: 10 }}>
            <button type="button" className="btn" onClick={() => openExternal(REPO)}>
              Voir mine-notes sur GitHub
            </button>
          </div>
        </section>
      </div>
    </div>
  )
}
