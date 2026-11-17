import { plainText } from './search'
import { getNoteDoc } from './notes'
import { tasksOf } from './todos'
import type { TodoItem } from './todos'
import { inDemo } from './tree'
import type { NoteKind, TreeNode } from './tree'

export interface ProjectStat {
  node: TreeNode
  notes: number
  open: number
  done: number
}

export interface Stats {
  notes: number
  folders: number
  projects: number
  words: number
  tasksOpen: number
  tasksDone: number
  byKind: Record<NoteKind, number>
  projectStats: ProjectStat[]
  openTasks: Array<TodoItem & { note: TreeNode; project: TreeNode | null }>
  /** Mots par note, pour retrouver les plus longues. */
  longest: Array<{ node: TreeNode; words: number }>
}

const wordsOf = (text: string) => text.split(/\s+/).filter(Boolean).length

/** Chiffres du tableau de bord : on lit chaque note une fois (texte et cases à cocher). */
export async function computeStats(nodes: TreeNode[]): Promise<Stats> {
  const all = new Map(nodes.map((n) => [n.id, n]))
  nodes = nodes.filter((n) => !inDemo(n, all))
  const byId = new Map(nodes.map((n) => [n.id, n]))
  const projectOf = (n: TreeNode): TreeNode | null => {
    for (let p = n.parentId ? byId.get(n.parentId) : undefined; p; p = p.parentId ? byId.get(p.parentId) : undefined) {
      if (p.type === 'project') return p
    }
    return null
  }

  const stats: Stats = {
    notes: 0,
    folders: nodes.filter((n) => n.type === 'folder').length,
    projects: nodes.filter((n) => n.type === 'project').length,
    words: 0,
    tasksOpen: 0,
    tasksDone: 0,
    byKind: { note: 0, todo: 0, ideas: 0, journal: 0 },
    projectStats: [],
    openTasks: [],
    longest: [],
  }
  const perProject = new Map<string, ProjectStat>(
    nodes.filter((n) => n.type === 'project').map((n) => [n.id, { node: n, notes: 0, open: 0, done: 0 }]),
  )

  for (const n of nodes) {
    if (n.type !== 'note') continue
    const { doc, persistence } = getNoteDoc(n.id)
    await persistence.whenSynced
    const words = wordsOf(plainText(doc.getXmlFragment('content')))
    const project = projectOf(n)
    const ps = project ? perProject.get(project.id) : undefined
    stats.notes++
    stats.words += words
    stats.byKind[n.kind]++
    stats.longest.push({ node: n, words })
    if (ps) ps.notes++
    for (const t of tasksOf(n.id)) {
      if (t.checked) {
        stats.tasksDone++
        if (ps) ps.done++
      } else {
        stats.tasksOpen++
        if (ps) ps.open++
        stats.openTasks.push({ ...t, note: n, project })
      }
    }
  }
  stats.projectStats = [...perProject.values()]
  stats.longest.sort((a, b) => b.words - a.words)
  return stats
}
