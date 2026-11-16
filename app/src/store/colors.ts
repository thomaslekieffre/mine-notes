// Palette des blocs : des noms (variables CSS, qui s'adaptent au thème clair/sombre) ou une couleur libre « #rrggbb ».
export const BLOCK_COLORS: string[] = [
  'red', 'coral', 'orange', 'amber', 'yellow', 'lime', 'green', 'emerald', 'teal', 'cyan', 'sky',
  'blue', 'indigo', 'violet', 'purple', 'magenta', 'pink', 'rose', 'brown', 'slate', 'graphite',
]

export const COLOR_NAMES: Record<string, string> = {
  red: 'Rouge', coral: 'Corail', orange: 'Orange', amber: 'Ambre', yellow: 'Jaune', lime: 'Citron vert',
  green: 'Vert', emerald: 'Émeraude', teal: 'Sarcelle', cyan: 'Cyan', sky: 'Ciel', blue: 'Bleu',
  indigo: 'Indigo', violet: 'Violet', purple: 'Mauve', magenta: 'Magenta', pink: 'Rose', rose: 'Framboise',
  brown: 'Marron', slate: 'Ardoise', graphite: 'Graphite',
}

/** Valeur CSS d'une couleur de bloc. */
export const colorCss = (c: string) => (c.startsWith('#') ? c : `var(--c-${c})`)
