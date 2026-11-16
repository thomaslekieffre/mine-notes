import { useEffect, useRef } from 'react'
import type { SlashState } from '../extensions/SlashCommand'

export function SlashMenu({ state }: { state: SlashState }) {
  const activeRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    activeRef.current?.scrollIntoView({ block: 'nearest' })
  }, [state.index, state.items])

  const rect = state.rect
  if (!rect) return null
  const below = window.innerHeight - rect.bottom > 300
  const style = {
    left: Math.max(8, Math.min(rect.left, window.innerWidth - 268)),
    ...(below ? { top: rect.bottom + 6 } : { bottom: window.innerHeight - rect.top + 6 }),
  }

  return (
    <div className="slash" style={style} role="listbox" aria-label="Insérer un bloc" onMouseDown={(e) => e.preventDefault()}>
      {state.items.length === 0 && <div className="slash-empty">Aucun bloc</div>}
      {state.items.map((item, i) => (
        <div key={item.id}>
          {(i === 0 || state.items[i - 1].group !== item.group) && <div className="slash-group">{item.group}</div>}
          <div
            ref={i === state.index ? activeRef : undefined}
            role="option"
            aria-selected={i === state.index}
            className={i === state.index ? 'slash-item active' : 'slash-item'}
            onClick={() => state.choose(item)}
          >
            <span className="slash-dot" style={{ background: item.color ?? 'var(--muted)' }} />
            <span>{item.label}</span>
            {item.hint && <span className="slash-hint">{item.hint}</span>}
          </div>
        </div>
      ))}
    </div>
  )
}
