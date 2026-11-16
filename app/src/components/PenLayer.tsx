import { useEffect, useRef } from 'react'

export interface PenSettings {
  on: boolean
  color: string // nom de variable CSS, ex. « --c-red »
  tool: 'pen' | 'marker'
  fade: boolean
}

interface Pt {
  x: number
  y: number
}
interface Stroke {
  pts: Pt[]
  color: string
  width: number
  alpha: number
  fade: boolean
  endedAt: number | null
}

const HOLD = 1400 // ms pendant lesquels un trait reste visible après avoir été tracé
const FADE = 1100 // ms de disparition

/** Calque de dessin au-dessus de la note : stylo qui s'efface tout seul, surligneur, traits qui restent. */
export function PenLayer({ scroller, pen, clearSignal }: { scroller: HTMLElement; pen: PenSettings; clearSignal: number }) {
  const canvas = useRef<HTMLCanvasElement>(null)
  const strokes = useRef<Stroke[]>([])
  const drawing = useRef<Stroke | null>(null)
  const raf = useRef(0)
  const penRef = useRef(pen)
  penRef.current = pen

  // Taille du calque = zone visible de la note.
  useEffect(() => {
    const c = canvas.current
    if (!c) return
    const fit = () => {
      const r = scroller.getBoundingClientRect()
      const dpr = window.devicePixelRatio || 1
      Object.assign(c.style, { left: `${r.left}px`, top: `${r.top}px`, width: `${r.width}px`, height: `${r.height}px` })
      c.width = Math.round(r.width * dpr)
      c.height = Math.round(r.height * dpr)
      c.getContext('2d')?.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    fit()
    const ro = new ResizeObserver(fit)
    ro.observe(scroller)
    window.addEventListener('resize', fit)
    return () => {
      ro.disconnect()
      window.removeEventListener('resize', fit)
    }
  }, [scroller])

  useEffect(() => {
    strokes.current = []
    drawing.current = null
  }, [clearSignal])

  useEffect(() => {
    const c = canvas.current
    if (!c) return
    const ctx = c.getContext('2d')!
    const tick = () => {
      const now = performance.now()
      const w = c.clientWidth
      const h = c.clientHeight
      ctx.clearRect(0, 0, w, h)
      const top = scroller.scrollTop
      strokes.current = strokes.current.filter((s) => {
        let a = s.alpha
        if (s.fade && s.endedAt !== null) {
          const t = now - s.endedAt - HOLD
          if (t > FADE) return false
          if (t > 0) a *= 1 - t / FADE
        }
        if (s.pts.length === 0) return false
        ctx.save()
        ctx.globalAlpha = a
        ctx.strokeStyle = s.color
        ctx.lineWidth = s.width
        ctx.lineCap = 'round'
        ctx.lineJoin = 'round'
        ctx.beginPath()
        const [first, ...rest] = s.pts
        ctx.moveTo(first.x, first.y - top)
        if (rest.length === 0) ctx.lineTo(first.x + 0.01, first.y - top)
        for (let i = 0; i < rest.length - 1; i++) {
          const mx = (rest[i].x + rest[i + 1].x) / 2
          const my = (rest[i].y + rest[i + 1].y) / 2
          ctx.quadraticCurveTo(rest[i].x, rest[i].y - top, mx, my - top)
        }
        if (rest.length > 0) ctx.lineTo(rest[rest.length - 1].x, rest[rest.length - 1].y - top)
        ctx.stroke()
        ctx.restore()
        return true
      })
      raf.current = requestAnimationFrame(tick)
    }
    raf.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf.current)
  }, [scroller])

  const point = (e: React.PointerEvent): Pt => {
    const r = scroller.getBoundingClientRect()
    return { x: e.clientX - r.left, y: e.clientY - r.top + scroller.scrollTop }
  }

  const onDown = (e: React.PointerEvent) => {
    if (!penRef.current.on || e.button !== 0) return
    e.currentTarget.setPointerCapture(e.pointerId)
    const p = penRef.current
    const css = getComputedStyle(document.documentElement).getPropertyValue(p.color).trim() || '#f2b544'
    const s: Stroke = {
      pts: [point(e)],
      color: css,
      width: p.tool === 'marker' ? 22 : 3.5,
      alpha: p.tool === 'marker' ? 0.38 : 1,
      fade: p.fade,
      endedAt: null,
    }
    drawing.current = s
    strokes.current.push(s)
  }
  const onMove = (e: React.PointerEvent) => {
    if (drawing.current) drawing.current.pts.push(point(e))
  }
  const onUp = () => {
    if (drawing.current) drawing.current.endedAt = performance.now()
    drawing.current = null
  }

  return (
    <canvas
      ref={canvas}
      className={pen.on ? 'pen-layer on' : 'pen-layer'}
      onPointerDown={onDown}
      onPointerMove={onMove}
      onPointerUp={onUp}
      onPointerCancel={onUp}
      // Le calque capte la souris quand le stylo est actif : on laisse quand même défiler la note.
      onWheel={(e) => scroller.scrollBy({ top: e.deltaY, left: e.deltaX })}
    />
  )
}
