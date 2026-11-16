import type { CSSProperties } from 'react'
import type { TreeNode } from '../store/tree'

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

/** Icône et couleur d'un nœud de l'arborescence selon son type. */
export function nodeIcon(n: Pick<TreeNode, 'type' | 'kind'>): { icon: IconName; color: string } {
  if (n.type === 'folder') return { icon: 'folder', color: 'var(--text2)' }
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
