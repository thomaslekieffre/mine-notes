import { useEffect, useState } from 'react'
import { Icon, NodeIcon } from './Icon'
import { findBacklinks } from '../store/links'
import { OPEN_NOTE_EVENT } from '../extensions/NoteLink'
import type { TreeNode } from '../store/tree'

/** « Liens entrants » : les notes qui pointent vers celle-ci. */
export function Backlinks({ noteId, nodes }: { noteId: string; nodes: TreeNode[] }) {
  const [list, setList] = useState<TreeNode[]>([])
  useEffect(() => {
    let alive = true
    void findBacklinks(nodes, noteId).then((l) => alive && setList(l))
    return () => {
      alive = false
    }
  }, [noteId, nodes])
  if (list.length === 0) return null
  return (
    <section className="backlinks" aria-label="Liens entrants">
      <div className="backlinks-title">
        <Icon name="file" size={13} /> Mentionnée dans {list.length} note{list.length > 1 ? 's' : ''}
      </div>
      {list.map((n) => {
        return (
          <button key={n.id} type="button" className="backlink" onClick={() => window.dispatchEvent(new CustomEvent(OPEN_NOTE_EVENT, { detail: n.id }))}>
            <NodeIcon node={n} size={13} />
            {n.name}
          </button>
        )
      })}
    </section>
  )
}
