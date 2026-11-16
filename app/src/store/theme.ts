/** Vrai si l'interface est actuellement en thème sombre (réglage manuel ou thème du système). */
export function isDarkTheme(): boolean {
  const forced = document.documentElement.getAttribute('data-theme')
  if (forced) return forced === 'dark'
  return window.matchMedia('(prefers-color-scheme: dark)').matches
}
