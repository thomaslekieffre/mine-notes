import type { CSSProperties } from 'react'
import type { TreeNode } from '../store/tree'
import { colorCss } from '../store/colors'

const PATHS = {
  folder: 'M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z',
  folderPlus: 'M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2zM12 10v6M9 13h6',
  file: 'M7 3h7l5 5v13H7zM14 3v5h5',
  filePlus: 'M7 3h7l5 5v13H7zM14 3v5h5M12 12v6M9 15h6',
  project: 'M12 3l8 4.5v9L12 21l-8-4.5v-9zM4 7.5l8 4.5 8-4.5M12 12v9',
  projectPlus: 'M12 3l8 4.5v9L12 21l-8-4.5v-9zM4 7.5l8 4.5 8-4.5M12 12v9',
  check: 'M4 5h16v14H4zM8 12l3 3 5-6',
  bulb: 'M9 18h6M10 21h4M8 14a6 6 0 1 1 8 0c-1 1-1 2-1 4H9c0-2 0-3-1-4z',
  calendar: 'M5 6h14v14H5zM5 10h14M9 3v4M15 3v4',
  chevR: 'M9 6l6 6-6 6',
  chevD: 'M6 9l6 6 6-6',
  plus: 'M12 5v14M5 12h14',
  search: 'M17 11a6 6 0 1 1-12 0a6 6 0 0 1 12 0zM20 20l-4-4',
  x: 'M6 6l12 12M18 6L6 18',
  menu: 'M4 7h16M4 12h16M4 17h10',
  sun: 'M12 8a4 4 0 1 0 0 8a4 4 0 0 0 0-8zM12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4',
  moon: 'M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z',
  auto: 'M12 3a9 9 0 1 0 0 18a9 9 0 0 0 0-18zM12 3v18',
  list: 'M9 6h11M9 12h11M9 18h11M4 6h.01M4 12h.01M4 18h.01',
  listOrdered: 'M10 6h10M10 12h10M10 18h10M4 5l1-1v4M3.5 13.5c1-1 2.5-.5 2.5.5s-2 1.5-2.5 2.5H6',
  quote: 'M5 17c0-4 1-7 4-8M13 17c0-4 1-7 4-8M5 17h4v-3H5zM13 17h4v-3h-4z',
  code: 'M9 8l-4 4 4 4M15 8l4 4-4 4',
  highlight: 'M4 20h6M14 4l6 6-9 9-6-6z',
  rename: 'M4 20h4l10-10-4-4L4 16zM13 7l4 4',
  trash: 'M5 7h14M10 7V4h4v3M7 7l1 13h8l1-13',
  image: 'M4 5h16v14H4zM4 16l5-5 4 4 3-3 4 4M9 9h.01',
  table: 'M4 5h16v14H4zM4 10h16M4 15h16M10 5v14M15 5v14',
  settings: 'M12 9a3 3 0 1 0 0 6a3 3 0 0 0 0-6zM19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z',
  eye: 'M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12zM12 9a3 3 0 1 0 0 6a3 3 0 0 0 0-6z',
  pen: 'M4 20l1-4L16 5l3 3L8 19zM14 7l3 3',
  folderOpen: 'M3 18V7a2 2 0 0 1 2-2h4l2 2h7a2 2 0 0 1 2 2v2M3 18l3-8h16l-3 8z',
  star: 'M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z',
  heart: 'M12 20s-7-4.6-7-10a4 4 0 0 1 7-2.5A4 4 0 0 1 19 10c0 5.4-7 10-7 10z',
  bookmark: 'M6 3h12v18l-6-4-6 4z',
  flag: 'M5 21V4M5 4h11l-2 4 2 4H5',
  bolt: 'M13 3L5 13h6l-1 8 8-10h-6z',
  flask: 'M9 3h6M10 3v6l-5 9a2 2 0 0 0 2 3h10a2 2 0 0 0 2-3l-5-9V3',
  book: 'M5 4h11a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3zM5 17a3 3 0 0 1 3-3h11',
  graduation: 'M2 9l10-5 10 5-10 5zM6 11v5c0 1.5 3 3 6 3s6-1.5 6-3v-5',
  terminal: 'M4 5h16v14H4zM7 10l3 2-3 2M12 15h5',
  database: 'M4 6c0-1.7 3.6-3 8-3s8 1.3 8 3-3.6 3-8 3-8-1.3-8-3zM4 6v6c0 1.7 3.6 3 8 3s8-1.3 8-3V6M4 12v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6',
  globe: 'M12 3a9 9 0 1 0 0 18a9 9 0 0 0 0-18zM3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18',
  music: 'M9 18V6l11-2v12M9 18a3 3 0 1 1-6 0a3 3 0 0 1 6 0zM20 16a3 3 0 1 1-6 0a3 3 0 0 1 6 0z',
  camera: 'M4 7h3l2-3h6l2 3h3v13H4zM12 10a3.5 3.5 0 1 0 0 7a3.5 3.5 0 0 0 0-7z',
  clip: 'M20 11l-8.5 8.5a5 5 0 0 1-7-7L13 4a3.3 3.3 0 0 1 5 5l-8.5 8.5a1.7 1.7 0 0 1-2.5-2.5L14 8',
  lock: 'M5 11h14v10H5zM8 11V8a4 4 0 0 1 8 0v3',
  key: 'M15 8a4 4 0 1 1-4 4M11 12L4 19M4 19h3M7 16v3',
  home: 'M3 11l9-8 9 8M5 10v10h14V10M10 20v-6h4v6',
  user: 'M12 4a4 4 0 1 0 0 8a4 4 0 0 0 0-8zM4 21c0-4 4-6 8-6s8 2 8 6',
  cart: 'M3 4h3l2 11h11l2-8H7M9 20h.01M18 20h.01',
  clock: 'M12 3a9 9 0 1 0 0 18a9 9 0 0 0 0-18zM12 7v5l3 2',
  mail: 'M3 6h18v13H3zM3 7l9 7 9-7',
  chat: 'M4 5h16v11H9l-5 4z',
  target: 'M12 3a9 9 0 1 0 0 18a9 9 0 0 0 0-18zM12 8a4 4 0 1 0 0 8a4 4 0 0 0 0-8zM12 12h.01',
  rocket: 'M5 19c0-3 2-5 4-5M14 5c3 0 5 2 5 5-2 4-5 7-9 9l-3-3c2-4 5-7 7-11zM15 10h.01',
  leaf: 'M5 19C5 10 10 5 20 4c0 10-5 15-14 15zM5 19l8-8',
  cloud: 'M7 18a4 4 0 0 1-.5-8A6 6 0 0 1 18 9a4.5 4.5 0 0 1 0 9z',
  palette: 'M12 3a9 9 0 1 0 0 18c1.5 0 2-1 1.5-2-.5-1 0-2 1.5-2h2a3 3 0 0 0 3-3A9 9 0 0 0 12 3zM7.5 11h.01M10 7h.01M15 7h.01',
  sigma: 'M18 5H6l6 7-6 7h12',
  chart: 'M4 20V4M4 20h16M8 16v-4M12 16V8M16 16v-6',
  wrench: 'M15 6a4 4 0 0 0-5 5L4 17l3 3 6-6a4 4 0 0 0 5-5l-3 3-2-1-1-2z',
  trophy: 'M7 4h10v5a5 5 0 0 1-10 0zM7 6H4v2a3 3 0 0 0 3 3M17 6h3v2a3 3 0 0 1-3 3M12 14v4M8 21h8M10 18h4',
  shapes: 'M3 4h8v8H3zM17 8a4 4 0 1 0 0 8a4 4 0 0 0 0-8zM6 20l4-6 4 6z',
} as const

export type IconName = keyof typeof PATHS

export function Icon({
  name,
  size = 16,
  style,
}: {
  name: IconName
  size?: number
  style?: CSSProperties
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={style}
      aria-hidden="true"
    >
      <path d={PATHS[name]} />
    </svg>
  )
}

/** Icônes proposées dans le sélecteur d'icône d'un élément. */
export const ICON_CHOICES: IconName[] = [
  'file', 'folder', 'project', 'check', 'bulb', 'calendar', 'book', 'graduation', 'flask', 'sigma', 'code', 'terminal',
  'database', 'chart', 'globe', 'image', 'camera', 'music', 'palette', 'shapes', 'star', 'heart', 'bookmark', 'flag',
  'bolt', 'target', 'rocket', 'trophy', 'leaf', 'cloud', 'sun', 'moon', 'home', 'user', 'mail', 'chat', 'clock', 'cart',
  'lock', 'key', 'clip', 'wrench',
]

/** Emoji proposés dans le sélecteur d'icône. */
export const EMOJI_CHOICES = [
  '📚', '📖', '📝', '✏️', '📌', '📎', '🗂️', '📁', '🧠', '💡', '🎯', '🚀', '⭐', '❤️', '🔥', '✅', '❗', '❓', '🧪', '🔬',
  '🧮', '📐', '📊', '📈', '💻', '🖥️', '📱', '🎮', '🎵', '🎬', '📷', '🎨', '🌍', '🌱', '☀️', '🌙', '🏠', '💼', '💰', '🛒',
  '✈️', '🚗', '🍎', '☕', '🎓', '🏆', '🔑', '🔒', '⚙️', '🧩', '🗓️', '⏰', '📧', '💬', '🐱', '🐶',
]

const asIconName = (v?: string): IconName | undefined => (v && v in PATHS ? (v as IconName) : undefined)

/** Icône et couleur d'un nœud : celles qu'il a choisies, sinon celles de son type. */
export function nodeIcon(
  n: Pick<TreeNode, 'type' | 'kind'> & { icon?: string; iconColor?: string },
  open = false,
): { icon: IconName; color: string; emoji?: string } {
  const color = n.iconColor ? colorCss(n.iconColor) : undefined
  if (n.icon) {
    const named = asIconName(n.icon)
    if (named) return { icon: named, color: color ?? 'var(--text2)' }
    return { icon: 'file', color: 'var(--text2)', emoji: n.icon }
  }
  if (n.type === 'folder') return { icon: open ? 'folderOpen' : 'folder', color: 'var(--text2)' }
  if (n.type === 'project') return { icon: 'project', color: 'var(--def)' }
  switch (n.kind) {
    case 'todo':
      return { icon: 'check', color: 'var(--exo)' }
    case 'ideas':
      return { icon: 'bulb', color: 'var(--accent)' }
    case 'journal':
      return { icon: 'calendar', color: 'var(--ex)' }
    default:
      return { icon: 'file', color: 'var(--text2)' }
  }
}

/** L'icône d'un élément de l'arborescence (icône ou emoji, selon son choix). */
export function NodeIcon({
  node,
  size = 16,
  open = false,
}: {
  node: Pick<TreeNode, 'type' | 'kind'> & { icon?: string; iconColor?: string }
  size?: number
  open?: boolean
}) {
  const { icon, color, emoji } = nodeIcon(node, open)
  if (emoji) {
    return (
      <span className="node-emoji" style={{ fontSize: size - 1, width: size, height: size, flexShrink: 0 }} aria-hidden="true">
        {emoji}
      </span>
    )
  }
  return <Icon name={icon} size={size} style={{ color, flexShrink: 0 }} />
}
