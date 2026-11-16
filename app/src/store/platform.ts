/** Vrai quand l'app tourne dans la fenêtre Tauri (et pas dans un navigateur). */
export const isTauri = () => typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window

/** Ouvre une adresse web dans le navigateur du système. */
export async function openExternal(url: string) {
  if (isTauri()) {
    const { openUrl } = await import('@tauri-apps/plugin-opener')
    await openUrl(url)
  } else {
    window.open(url, '_blank', 'noopener,noreferrer')
  }
}
