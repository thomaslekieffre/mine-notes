import { loadNoteText } from './search'
import type { TreeNode } from './tree'

// Étiquettes : un mot précédé de « # » dans le texte d'une note (#examen, #idée-projet).
// Rien n'est stocké à part : elles sont relues dans le texte des notes.

const TAG_RE = /(^|[\s(,;])#([\p{L}\p{N}_-]{2,40})/gu

export const normTag = (t: string) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

/** Étiquettes d'un texte (sans le #, minuscules sans accents pour comparer ; `label` garde l'écriture d'origine). */
export function tagsOfText(text: string): Array<{ key: string; label: string }> {
  const out = new Map<string, string>()
  for (const m of text.matchAll(TAG_RE)) {
    const key = normTag(m[2])
    if (!out.has(key)) out.set(key, m[2])
  }
  return [...out].map(([key, label]) => ({ key, label }))
}

export interface TagInfo {
  key: string
  label: string
  notes: string[]
}

/** Toutes les étiquettes des notes, de la plus utilisée à la moins utilisée. */
export async function collectTags(nodes: TreeNode[]): Promise<TagInfo[]> {
  const map = new Map<string, TagInfo>()
  for (const n of nodes) {
    if (n.type !== 'note' || n.trashedAt) continue
    for (const t of tagsOfText(await loadNoteText(n.id))) {
      const cur = map.get(t.key) ?? { key: t.key, label: t.label, notes: [] }
      cur.notes.push(n.id)
      map.set(t.key, cur)
    }
  }
  return [...map.values()].sort((a, b) => b.notes.length - a.notes.length || a.label.localeCompare(b.label))
}

export interface ParsedQuery {
  text: string
  tags: string[]
  kind?: TreeNode['kind']
  project?: string
}

const KINDS: Record<string, TreeNode['kind']> = { note: 'note', notes: 'note', todo: 'todo', idees: 'ideas', idee: 'ideas', ideas: 'ideas', journal: 'journal' }

/** « cours #examen type:todo projet:licence dérivée » → filtres + texte libre. */
export function parseQuery(q: string): ParsedQuery {
  const tags: string[] = []
  const rest: string[] = []
  let kind: ParsedQuery['kind']
  let project: string | undefined
  for (const tok of q.split(/\s+/).filter(Boolean)) {
    const low = normTag(tok)
    if (/^#[\p{L}\p{N}_-]+$/u.test(tok) && tok.length > 1) tags.push(normTag(tok.slice(1)))
    else if (/^(type|kind):/.test(low) && KINDS[low.split(':')[1]]) kind = KINDS[low.split(':')[1]]
    else if (/^(projet|project):./.test(low)) project = low.split(':').slice(1).join(':')
    else rest.push(tok)
  }
  return { text: rest.join(' '), tags, kind, project }
}
