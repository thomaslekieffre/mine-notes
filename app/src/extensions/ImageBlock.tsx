import { useEffect, useRef, useState } from 'react'
import { Extension, Node, mergeAttributes } from '@tiptap/core'
import type { Editor } from '@tiptap/core'
import { Plugin } from '@tiptap/pm/state'
import { NodeViewWrapper, ReactNodeViewRenderer } from '@tiptap/react'
import type { NodeViewProps } from '@tiptap/react'
import { Lightbox } from '../components/Lightbox'
import { getMediaUrl, putMedia } from '../store/media'

const MIN_WIDTH = 80

function ImageView({ node, updateAttributes, selected }: NodeViewProps) {
  const [url, setUrl] = useState<string | null | undefined>(undefined)
  const [liveWidth, setLiveWidth] = useState<number | null>(null)
  const [zoomed, setZoomed] = useState(false)
  const frame = useRef<HTMLDivElement>(null)
  const mediaId = node.attrs.mediaId as string
  const width = liveWidth ?? (node.attrs.width as number | null)

  useEffect(() => {
    let alive = true
    void getMediaUrl(mediaId).then((u) => alive && setUrl(u))
    return () => {
      alive = false
    }
  }, [mediaId])

  const startResize = (e: React.PointerEvent) => {
    e.preventDefault()
    e.stopPropagation()
    const startX = e.clientX
    const startW = frame.current?.getBoundingClientRect().width ?? 300
    const next = (ev: PointerEvent) => Math.max(MIN_WIDTH, Math.round(startW + ev.clientX - startX))
    const move = (ev: PointerEvent) => setLiveWidth(next(ev))
    const up = (ev: PointerEvent) => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      updateAttributes({ width: next(ev) })
      setLiveWidth(null)
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
  }

  return (
    <NodeViewWrapper className="img-block" data-selected={selected}>
      <div ref={frame} className="img-frame" style={{ width: width ? `${width}px` : undefined }}>
        {url ? (
          <img
            src={url}
            alt=""
            draggable={false}
            onDoubleClick={() => setZoomed(true)}
            title="Double-clic pour agrandir"
          />
        ) : (
          <div className="img-missing">{url === null ? 'Image introuvable sur cet appareil' : 'Chargement…'}</div>
        )}
        {url && (
          <>
            <button type="button" className="img-zoom" aria-label="Agrandir l'image" onClick={() => setZoomed(true)}>
              ⤢
            </button>
            <div
              className="img-handle"
              role="separator"
              aria-label="Redimensionner l'image"
              onPointerDown={startResize}
              onDoubleClick={() => updateAttributes({ width: null })}
            />
          </>
        )}
      </div>
      {zoomed && url && <Lightbox src={url} onClose={() => setZoomed(false)} />}
    </NodeViewWrapper>
  )
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    imageBlock: {
      insertImage: (mediaId: string) => ReturnType
    }
  }
}

/** Image affichée comme un bloc : redimensionnable, zoomable (double-clic). */
export const ImageBlock = Node.create({
  name: 'image',
  group: 'block',
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      mediaId: { default: '', parseHTML: (el) => el.getAttribute('data-media-id') },
      width: {
        default: null,
        parseHTML: (el) => {
          const w = Number(el.getAttribute('data-width'))
          return w > 0 ? w : null
        },
      },
    }
  },

  parseHTML() {
    return [{ tag: 'div[data-image]' }]
  },

  renderHTML({ node, HTMLAttributes }) {
    return [
      'div',
      mergeAttributes(HTMLAttributes, {
        'data-image': '',
        'data-media-id': node.attrs.mediaId,
        'data-width': node.attrs.width ?? '',
      }),
    ]
  },

  addNodeView() {
    return ReactNodeViewRenderer(ImageView)
  },

  addCommands() {
    return {
      insertImage:
        (mediaId) =>
        ({ commands }) =>
          commands.insertContent({ type: this.name, attrs: { mediaId } }),
    }
  },
})

const imageFiles = (list: FileList | null | undefined) =>
  Array.from(list ?? []).filter((f) => f.type.startsWith('image/'))

async function insertFiles(editor: Editor, files: File[], at?: number) {
  for (const file of files) {
    const mediaId = await putMedia(file)
    const node = { type: 'image', attrs: { mediaId } }
    if (at !== undefined) editor.chain().focus().insertContentAt(at, node).run()
    else editor.chain().focus().insertContent(node).run()
  }
}

/** Ouvre le sélecteur de fichiers et insère les images choisies. */
export function pickImages(editor: Editor) {
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = 'image/*'
  input.multiple = true
  input.onchange = () => void insertFiles(editor, imageFiles(input.files))
  input.click()
}

/** Colle ou dépose une image (capture d'écran, fichier) directement dans la note. */
export const ImagePaste = Extension.create({
  name: 'imagePaste',
  addProseMirrorPlugins() {
    const editor = this.editor
    return [
      new Plugin({
        props: {
          handlePaste: (_view, event) => {
            const files = imageFiles(event.clipboardData?.files)
            if (files.length === 0) return false
            event.preventDefault()
            void insertFiles(editor, files)
            return true
          },
          handleDrop: (view, event, _slice, moved) => {
            if (moved) return false
            const files = imageFiles(event.dataTransfer?.files)
            if (files.length === 0) return false
            event.preventDefault()
            const at = view.posAtCoords({ left: event.clientX, top: event.clientY })?.pos
            void insertFiles(editor, files, at)
            return true
          },
        },
      }),
    ]
  },
})
