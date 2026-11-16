import { Suspense, lazy, useEffect, useState } from 'react'
import { Node, mergeAttributes } from '@tiptap/core'
import { NodeViewWrapper, ReactNodeViewRenderer } from '@tiptap/react'
import type { NodeViewProps } from '@tiptap/react'

const DiagramEditor = lazy(() => import('../components/DiagramEditor'))

// Le schéma qu'on vient d'insérer s'ouvre tout de suite dans l'éditeur.
let openNext = false

/** Aperçu statique (SVG) du schéma : pas de canvas actif tant qu'on ne l'édite pas. */
function Preview({ scene }: { scene: string }) {
  const [svg, setSvg] = useState('')
  useEffect(() => {
    let alive = true
    if (!scene) return
    void import('@excalidraw/excalidraw').then(async ({ exportToSvg }) => {
      const elements = JSON.parse(scene) as Parameters<typeof exportToSvg>[0]['elements']
      const el = await exportToSvg({
        elements,
        appState: { exportBackground: false },
        files: null,
        exportPadding: 12,
      })
      if (alive) setSvg(el.outerHTML)
    })
    return () => {
      alive = false
    }
  }, [scene])
  return <div className="diagram-preview" dangerouslySetInnerHTML={{ __html: svg }} />
}

function DiagramView({ node, updateAttributes, selected }: NodeViewProps) {
  const scene = node.attrs.scene as string
  const [editing, setEditing] = useState(() => {
    if (openNext && !scene) {
      openNext = false
      return true
    }
    return false
  })

  return (
    <NodeViewWrapper className="diagram-block" data-selected={selected}>
      {scene ? (
        <div className="diagram-frame" onDoubleClick={() => setEditing(true)} title="Double-clic pour modifier">
          <Preview scene={scene} />
          <button type="button" className="diagram-edit" onClick={() => setEditing(true)}>
            Modifier
          </button>
        </div>
      ) : (
        <button type="button" className="diagram-empty" onClick={() => setEditing(true)}>
          Schéma vide — cliquer pour dessiner
        </button>
      )}
      {editing && (
        <Suspense fallback={<div className="diagram-overlay diagram-loading">Chargement de l'éditeur…</div>}>
          <DiagramEditor
            scene={scene}
            onCancel={() => setEditing(false)}
            onDone={(next) => {
              updateAttributes({ scene: next })
              setEditing(false)
            }}
          />
        </Suspense>
      )}
    </NodeViewWrapper>
  )
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    diagram: {
      insertDiagram: () => ReturnType
    }
  }
}

/** Bloc schéma : formes propres, flèches et dessin à main levée (Excalidraw). */
export const Diagram = Node.create({
  name: 'diagram',
  group: 'block',
  atom: true,
  draggable: true,

  addAttributes() {
    return { scene: { default: '', parseHTML: (el) => el.getAttribute('data-scene') ?? '' } }
  },

  parseHTML() {
    return [{ tag: 'div[data-diagram]' }]
  },

  renderHTML({ node, HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-diagram': '', 'data-scene': node.attrs.scene })]
  },

  addNodeView() {
    return ReactNodeViewRenderer(DiagramView)
  },

  addCommands() {
    return {
      insertDiagram:
        () =>
        ({ commands }) => {
          openNext = true
          return commands.insertContent({ type: this.name })
        },
    }
  },
})
