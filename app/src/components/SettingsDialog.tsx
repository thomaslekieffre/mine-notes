import { Icon } from './Icon'
import { Mascot } from './Mascot'
import { setPrefs, usePrefs } from '../store/prefs'
import type { Prefs } from '../store/prefs'
import { isTauri } from '../store/platform'
import { accelFromEvent, pretty, setQuickKey, useQuickKeys } from '../store/shortcuts'
import type { QuickKeys } from '../store/shortcuts'
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
  onClose: () => void
}

const SHORTCUTS: [string, string][] = [
  ['⌘P', 'Aller à une note / chercher dans le texte'],
  ['⌘N', 'Nouvelle note'],
  ['⌘W', "Fermer l'onglet"],
  ['⌘,', 'Réglages'],
  ['F2', 'Renommer'],
  ['/', 'Insérer un bloc (colonnes, schéma, tableau…)'],
  ['Alt + ↑ / ↓', 'Monter ou descendre le bloc'],
]

function KeyRow({ which, title, hint }: { which: keyof QuickKeys; title: string; hint: string }) {
  const keys = useQuickKeys()
  const [rec, setRec] = useState(false)
  useEffect(() => {
    if (!rec) return
    const onKey = (e: KeyboardEvent) => {
      e.preventDefault()
      e.stopPropagation()
      if (e.key === 'Escape') return setRec(false)
      const a = accelFromEvent(e)
      if (a) {
        setQuickKey(which, a)
        setRec(false)
      }
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [rec, which])
  return (
    <div className="set-row">
      <span>
        {title}
        <small>{hint}</small>
      </span>
      <span style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <span className="key-chip">{rec ? 'Appuie sur la combinaison…' : pretty(keys[which])}</span>
        <button type="button" className="btn" onClick={() => setRec((v) => !v)}>
          {rec ? 'Annuler' : 'Changer'}
        </button>
      </span>
    </div>
  )
}

export function SettingsDialog({ theme, onTheme, onOpenData, onClose }: Props) {
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
          <h4>Capture rapide</h4>
          <KeyRow which="note" title="Écrire une note" hint={isTauri() ? 'Marche partout sur le Mac, même quand Mine est en arrière-plan.' : 'Dans le navigateur : seulement quand cet onglet est actif.'} />
          <KeyRow which="todo" title="Ajouter une tâche" hint="Ouvre une petite fenêtre pour saisir une todo." />
        </section>

        <section className="set-section">
          <h4>Données</h4>
          <div className="set-row">
            <span>
              Sauvegarde, restauration{isTauri() ? ' et dossier sur ce Mac' : ''}
              <small>Tes notes restent sur cet appareil.</small>
            </span>
            <button type="button" className="btn" onClick={onOpenData}>
              Ouvrir…
            </button>
          </div>
        </section>

        <section className="set-section">
          <h4>Raccourcis</h4>
          <div className="set-keys">
            {SHORTCUTS.map(([k, text]) => (
              <span key={k} style={{ display: 'contents' }}>
                <kbd>{k}</kbd>
                <span>{text}</span>
              </span>
            ))}
          </div>
        </section>

        <section className="set-section">
          <h4>À propos</h4>
          <div className="set-about">
            <Mascot size={56} />
            <span style={{ fontSize: 13 }}>
              <strong>Mine</strong> · version 0.1.0
              <small style={{ display: 'block', color: 'var(--muted)', marginTop: 2 }}>
                Mes notes, chez moi. Aucune donnée ne quitte cet appareil.
              </small>
            </span>
          </div>
        </section>
      </div>
    </div>
  )
}
