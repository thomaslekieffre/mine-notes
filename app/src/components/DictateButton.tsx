import { useEffect, useRef, useState } from 'react'
import { Icon } from './Icon'
import { dictationError, dictationSupported, startDictation } from '../store/dictation'

/** Bouton micro : dicte du texte, qui arrive via `onText` phrase par phrase. */
export function DictateButton({ onText, className = 'tb-btn' }: { onText: (text: string) => void; className?: string }) {
  const [on, setOn] = useState(false)
  const [msg, setMsg] = useState('')
  const stop = useRef<(() => void) | null>(null)
  const cb = useRef(onText)
  useEffect(() => {
    cb.current = onText
  }, [onText])
  useEffect(() => () => stop.current?.(), [])
  if (!dictationSupported()) return null

  const toggle = () => {
    if (on) {
      stop.current?.()
      return
    }
    setMsg('')
    setOn(true)
    stop.current = startDictation(
      (t) => t && cb.current(t),
      (err) => {
        setOn(false)
        stop.current = null
        setMsg(dictationError(err))
      },
    )
  }

  return (
    <>
      <button
        type="button"
        className={`${className}${on ? ' recording' : ''}`}
        title={on ? 'Arrêter la dictée' : 'Dicter (reconnaissance vocale du système)'}
        aria-label="Dicter"
        aria-pressed={on}
        onMouseDown={(e) => e.preventDefault()}
        onClick={toggle}
      >
        <Icon name="mic" size={15} />
      </button>
      {msg && <span className="dictate-msg">{msg}</span>}
    </>
  )
}
