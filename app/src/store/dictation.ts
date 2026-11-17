// Dictée vocale : la reconnaissance vocale du système (Web Speech API).
// Attention : selon la plateforme, l'audio est traité par un service du système (Apple sur Mac, Microsoft/Google sur Windows).

interface Recognition {
  lang: string
  continuous: boolean
  interimResults: boolean
  onresult: ((e: { resultIndex: number; results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }> }) => void) | null
  onerror: ((e: { error: string }) => void) | null
  onend: (() => void) | null
  start: () => void
  stop: () => void
}

type Ctor = new () => Recognition

const ctor = (): Ctor | undefined => {
  const w = window as unknown as { SpeechRecognition?: Ctor; webkitSpeechRecognition?: Ctor }
  return w.SpeechRecognition ?? w.webkitSpeechRecognition
}

export const dictationSupported = () => typeof window !== 'undefined' && !!ctor()

/** Remplace les commandes dites à voix haute (« virgule », « point », « à la ligne »…) par la ponctuation. */
export function applyVoiceCommands(text: string): string {
  return text
    .replace(/\s+(virgule)\b/gi, ',')
    .replace(/\s+(point d'interrogation)\b/gi, ' ?')
    .replace(/\s+(point d'exclamation)\b/gi, ' !')
    .replace(/\s+(deux points)\b/gi, ' :')
    .replace(/\s+(point-virgule)\b/gi, ' ;')
    .replace(/\s+(point)\b(?!\s*[a-zé])/gi, '.')
    .replace(/\s*(à la ligne|nouvelle ligne)\s*/gi, '\n')
}

/** Lance la dictée ; `onText` reçoit chaque phrase terminée. Renvoie la fonction d'arrêt. */
export function startDictation(onText: (text: string) => void, onEnd: (error?: string) => void, lang = 'fr-FR'): () => void {
  const R = ctor()
  if (!R) {
    onEnd('unsupported')
    return () => undefined
  }
  const rec = new R()
  rec.lang = lang
  rec.continuous = true
  rec.interimResults = false
  let error: string | undefined
  rec.onresult = (e) => {
    for (let i = e.resultIndex; i < e.results.length; i++) {
      if (e.results[i].isFinal) onText(applyVoiceCommands(e.results[i][0].transcript.trim()))
    }
  }
  rec.onerror = (e) => {
    error = e.error
  }
  rec.onend = () => onEnd(error)
  try {
    rec.start()
  } catch {
    onEnd('start')
  }
  return () => rec.stop()
}

export function dictationError(code?: string): string {
  if (!code || code === 'aborted' || code === 'no-speech') return ''
  if (code === 'not-allowed' || code === 'service-not-allowed') return 'Micro ou reconnaissance vocale refusés : autorise-les dans les réglages du système.'
  if (code === 'unsupported') return 'La dictée n’est pas disponible sur ce système.'
  if (code === 'network') return 'La dictée a besoin d’une connexion internet sur ce système.'
  return `Dictée interrompue (${code}).`
}
