import { useEffect, useRef, useState } from 'react'
import { usePrefs } from '../store/prefs'

type Mood = 'idle' | 'typing' | 'happy' | 'sleep'

/** Le crayon Mine : il cligne, respire, suit ce que tu écris, saute quand on le clique et dort quand tu pars. */
export function Mascot({ size = 28, interactive = true }: { size?: number; interactive?: boolean }) {
  const { mascot } = usePrefs()
  const [mood, setMood] = useState<Mood>('idle')
  const timers = useRef<{ typing?: number; sleep?: number; happy?: number }>({})
  const alive = mascot && interactive

  useEffect(() => {
    if (!alive) return
    const t = timers.current
    const wake = () => {
      window.clearTimeout(t.sleep)
      t.sleep = window.setTimeout(() => setMood('sleep'), 90_000)
      setMood((m) => (m === 'sleep' ? 'idle' : m))
    }
    const onKey = () => {
      wake()
      setMood((m) => (m === 'happy' ? m : 'typing'))
      window.clearTimeout(t.typing)
      t.typing = window.setTimeout(() => setMood((m) => (m === 'typing' ? 'idle' : m)), 1400)
    }
    wake()
    document.addEventListener('keydown', onKey, true)
    document.addEventListener('pointerdown', wake, true)
    return () => {
      document.removeEventListener('keydown', onKey, true)
      document.removeEventListener('pointerdown', wake, true)
      Object.values(t).forEach((id) => window.clearTimeout(id))
    }
  }, [alive])

  const cheer = () => {
    if (!alive) return
    const t = timers.current
    setMood('happy')
    window.clearTimeout(t.happy)
    t.happy = window.setTimeout(() => setMood('idle'), 1300)
  }

  const m: Mood = alive ? mood : 'idle'
  const look = m === 'typing' ? { x: -2, y: 2.5 } : { x: 0, y: 0 }

  return (
    <svg
      className={`mascot mascot-${m}${alive ? ' alive' : ''}`}
      width={(size * 120) / 160}
      height={size}
      viewBox="0 0 120 160"
      role="img"
      aria-label="Mine, la mascotte"
      onMouseEnter={() => m === 'sleep' && setMood('idle')}
      onClick={cheer}
    >
      <defs>
        <linearGradient id="mn-body" x1="0" x2="1">
          <stop offset="0" stopColor="#f7c75a" />
          <stop offset="0.55" stopColor="#f2b544" />
          <stop offset="1" stopColor="#e19f2c" />
        </linearGradient>
        <linearGradient id="mn-wood" x1="0" x2="1">
          <stop offset="0" stopColor="#f0cfa6" />
          <stop offset="1" stopColor="#dcb184" />
        </linearGradient>
        <linearGradient id="mn-metal" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#d7dbe2" />
          <stop offset="0.5" stopColor="#a9aeb8" />
          <stop offset="1" stopColor="#c6cad2" />
        </linearGradient>
      </defs>
      <ellipse className="m-shadow" cx="60" cy="157" rx="26" ry="3" fill="#000" opacity="0.18" />
      <g className="m-body">
        <polygon points="60,14 36,58 84,58" fill="url(#mn-wood)" />
        <polygon points="60,14 53,28 67,28" fill="#3d4047" className="m-lead" />
        <rect x="30" y="56" width="60" height="76" rx="4" fill="url(#mn-body)" />
        <rect x="30" y="56" width="13" height="76" fill="#d9962a" opacity="0.55" />
        <rect x="76" y="56" width="5" height="76" fill="#fff" opacity="0.18" />
        <rect x="30" y="132" width="60" height="12" fill="url(#mn-metal)" />
        <path d="M30 136h60M30 140h60" stroke="#8f95a1" strokeWidth="0.8" opacity="0.7" />
        <rect x="30" y="144" width="60" height="12" rx="5" fill="#e98e8e" />
        <rect x="35" y="146" width="50" height="3" rx="1.5" fill="#fff" opacity="0.28" />

        <g className="m-cheeks" opacity={m === 'happy' ? 0.85 : 0.55} fill="#e58b8b">
          <circle cx="45" cy="100" r="4.5" />
          <circle cx="79" cy="100" r="4.5" />
        </g>

        {m === 'sleep' ? (
          <g stroke="#1e1f22" strokeWidth="3" strokeLinecap="round" fill="none">
            <path d="M47 89q5 4 10 0" />
            <path d="M67 89q5 4 10 0" />
          </g>
        ) : m === 'happy' ? (
          <g stroke="#1e1f22" strokeWidth="3.4" strokeLinecap="round" fill="none">
            <path d="M47 91q5-7 10 0" />
            <path d="M67 91q5-7 10 0" />
          </g>
        ) : (
          <g className="m-eyes" style={{ transform: `translate(${look.x}px, ${look.y}px)` }}>
            <g className="m-eye">
              <circle cx="52" cy="88" r="5.4" fill="#1e1f22" />
              <circle cx="53.8" cy="86.2" r="1.7" fill="#fff" />
            </g>
            <g className="m-eye">
              <circle cx="72" cy="88" r="5.4" fill="#1e1f22" />
              <circle cx="73.8" cy="86.2" r="1.7" fill="#fff" />
            </g>
          </g>
        )}

        {m === 'happy' ? (
          <path d="M53 101q9 13 18 0z" fill="#1e1f22" stroke="#1e1f22" strokeWidth="2" strokeLinejoin="round" />
        ) : m === 'sleep' ? (
          <ellipse cx="62" cy="105" rx="3" ry="2.4" fill="#1e1f22" />
        ) : m === 'typing' ? (
          <path d="M56 104q6 4 12 0" stroke="#1e1f22" strokeWidth="3.4" fill="none" strokeLinecap="round" />
        ) : (
          <path d="M54 102Q62 110 70 102" stroke="#1e1f22" strokeWidth="3.5" fill="none" strokeLinecap="round" />
        )}
      </g>
      {m === 'sleep' && (
        <g className="m-zzz" fill="var(--muted, #8d9199)" fontFamily="Inter, sans-serif" fontWeight="600">
          <text x="88" y="46" fontSize="16">z</text>
          <text x="98" y="30" fontSize="12">z</text>
        </g>
      )}
      {m === 'happy' && (
        <g className="m-spark" fill="#f2b544">
          <path d="M18 40l3 7 7 3-7 3-3 7-3-7-7-3 7-3z" />
          <path d="M102 62l2 5 5 2-5 2-2 5-2-5-5-2 5-2z" />
        </g>
      )}
    </svg>
  )
}
