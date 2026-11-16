import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Icon } from './Icon'

/** Affiche une image en grand : molette ou +/− pour zoomer, glisser pour déplacer, Échap pour fermer. */
export function Lightbox({ src, onClose }: { src: string; onClose: () => void }) {
  const [scale, setScale] = useState(1)
  const [pos, setPos] = useState({ x: 0, y: 0 })
  const drag = useRef<{ x: number; y: number; px: number; py: number } | null>(null)

  const zoom = (factor: number) => setScale((s) => Math.min(8, Math.max(0.2, s * factor)))
  const reset = () => {
    setScale(1)
    setPos({ x: 0, y: 0 })
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === '+' || e.key === '=') zoom(1.25)
      if (e.key === '-') zoom(0.8)
      if (e.key === '0') reset()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return createPortal(
    <div
      className="lightbox"
      role="dialog"
      aria-label="Image en grand"
      onWheel={(e) => zoom(e.deltaY < 0 ? 1.12 : 1 / 1.12)}
      onPointerDown={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="lightbox-bar" onPointerDown={(e) => e.stopPropagation()}>
        <button type="button" className="icon-btn" aria-label="Zoom arrière" onClick={() => zoom(0.8)}>
          −
        </button>
        <button type="button" className="lb-pct" onClick={reset} title="Taille d'origine">
          {Math.round(scale * 100)} %
        </button>
        <button type="button" className="icon-btn" aria-label="Zoom avant" onClick={() => zoom(1.25)}>
          <Icon name="plus" />
        </button>
        <button type="button" className="icon-btn" aria-label="Fermer" onClick={onClose}>
          <Icon name="x" />
        </button>
      </div>
      <img
        src={src}
        alt=""
        draggable={false}
        style={{ transform: `translate(${pos.x}px, ${pos.y}px) scale(${scale})` }}
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId)
          drag.current = { x: e.clientX, y: e.clientY, px: pos.x, py: pos.y }
        }}
        onPointerMove={(e) => {
          const d = drag.current
          if (d) setPos({ x: d.px + e.clientX - d.x, y: d.py + e.clientY - d.y })
        }}
        onPointerUp={() => (drag.current = null)}
        onDoubleClick={reset}
      />
    </div>,
    document.body,
  )
}
