/** Vrai quand l'app tourne dans la fenêtre Tauri (et pas dans un navigateur). */
export const isTauri = () => typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window
