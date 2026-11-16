import { useRef } from 'react'
import { createPortal } from 'react-dom'
import { Excalidraw } from '@excalidraw/excalidraw'
import '@excalidraw/excalidraw/index.css'
import { isDarkTheme } from '../store/theme'

// Gris crayon par défaut, trait « artiste » (rugueux) et police manuscrite.
const PENCIL_GREY = '#868e96'

interface Props {
  scene: string
  onDone: (scene: string) => void
  onCancel: () => void
}

type Elements = Parameters<NonNullable<React.ComponentProps<typeof Excalidraw>['onChange']>>[0]

function parse(scene: string): Elements {
  try {
    const parsed: unknown = JSON.parse(scene)
    return (Array.isArray(parsed) ? parsed : []) as unknown as Elements
  } catch {
    return [] as unknown as Elements
  }
}

/** Éditeur de schéma plein écran (Excalidraw). Chargé à la demande : la bibliothèque est lourde. */
export default function DiagramEditor({ scene, onDone, onCancel }: Props) {
  const latest = useRef<Elements>(parse(scene))

  const finish = () => {
    const kept = (latest.current as unknown as Array<{ isDeleted?: boolean }>).filter((e) => !e.isDeleted)
    onDone(kept.length ? JSON.stringify(kept) : '')
  }

  return createPortal(
    <div className="diagram-overlay" role="dialog" aria-label="Éditeur de schéma">
      <div className="diagram-bar">
        <strong>Schéma</strong>
        <span className="diagram-tip">Trait « Architecte » pour des formes propres, « Artiste » pour le crayon.</span>
        <span className="grow" />
        <button type="button" className="btn" onClick={onCancel}>
          Annuler
        </button>
        <button type="button" className="btn primary" onClick={finish}>
          Terminé
        </button>
      </div>
      <div className="diagram-canvas">
        <Excalidraw
          langCode="fr-FR"
          theme={isDarkTheme() ? 'dark' : 'light'}
          initialData={{
            elements: parse(scene),
            appState: {
              currentItemStrokeColor: PENCIL_GREY,
              currentItemRoughness: 1,
              currentItemFontFamily: 5,
              // Le thème sombre d'Excalidraw inverse les couleurs : on garde donc un fond clair ici.
              viewBackgroundColor: isDarkTheme() ? '#ffffff' : '#fcfcfb',
            },
            scrollToContent: true,
          }}
          onChange={(elements) => {
            latest.current = elements
          }}
          UIOptions={{
            tools: { image: false },
            canvasActions: { loadScene: false, saveToActiveFile: false, export: false, saveAsImage: false },
          }}
        />
      </div>
    </div>,
    document.body,
  )
}
