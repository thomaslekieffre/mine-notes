import type { Node as PMNode } from '@tiptap/pm/model'

/** L'éditeur y branche sa boîte « Formule » ; les nœuds KaTeX et le menu « / » l'appellent. */
export const mathBridge: {
  edit: (node: PMNode, pos: number) => void
  create: (kind: 'inline' | 'block') => void
} = { edit: () => {}, create: () => {} }
