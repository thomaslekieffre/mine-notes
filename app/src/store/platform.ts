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

/** Imprime la note affichée (la feuille de style d'impression ne garde que le document). Dans l'app Mac : fenêtre d'impression, avec « Enregistrer au format PDF ». */
export async function printPage() {
  if (isTauri()) {
    const { invoke } = await import('@tauri-apps/api/core')
    await invoke('print_page')
  } else {
    window.print()
  }
}
