import { useEffect, useRef, useState } from 'react'
import { EditorContent, useEditor } from '@tiptap/react'
import { DragHandle } from '@tiptap/extension-drag-handle-react'
import { buildExtensions } from '../extensions/schema'
import { ImagePaste } from '../extensions/ImageBlock'
import { MoveBlock } from '../extensions/MoveBlock'
import { SlashCommand } from '../extensions/SlashCommand'
import type { SlashState } from '../extensions/SlashCommand'
import { buildSlashItems, filterSlashItems } from '../extensions/slashItems'
import { SlashMenu } from './SlashMenu'
import { BlockTypesDialog } from './BlockTypesDialog'
import Collaboration from '@tiptap/extension-collaboration'
import Placeholder from '@tiptap/extension-placeholder'
import { Toolbar } from './Toolbar'
import { getNoteDoc } from '../store/notes'
import { projectOf, renameNode, typesFor, useBlockTypes, useTree } from '../store/tree'
import type { TreeNode } from '../store/tree'

interface Props {
  node: TreeNode
  crumbs: string
  onStats: (words: number | null) => void
}

function Body({ node, crumbs, onStats }: Props) {
  const { doc } = getNoteDoc(node.id)
  const { nodes } = useTree()
  const projectId = projectOf(nodes, node.id)
  const types = typesFor(useBlockTypes(), projectId)
  const typesRef = useRef(types)
  typesRef.current = types
  const [slash, setSlash] = useState<SlashState | null>(null)
  const [typesOpen, setTypesOpen] = useState(false)

  const editor = useEditor(
    {
      extensions: [
        ...buildExtensions(),
        Collaboration.configure({ document: doc, field: 'content' }),
        Placeholder.configure({ placeholder: 'Écris quelque chose… ou tape / pour insérer un bloc' }),
        ImagePaste,
        MoveBlock,
        SlashCommand.configure({
          getItems: (q) => filterSlashItems(buildSlashItems(typesRef.current, () => setTypesOpen(true)), q),
          onState: setSlash,
        }),
      ],
      editorProps: { attributes: { class: 'doc', spellcheck: 'true' } },
    },
    [doc],
  )

  useEffect(() => {
    if (!editor) return
    const count = () => {
      const t = editor.getText().trim()
      onStats(t ? t.split(/\s+/).length : 0)
    }
    count()
    editor.on('update', count)
    return () => {
      editor.off('update', count)
      onStats(null)
    }
  }, [editor, onStats])

  return (
    <>
      {editor && <Toolbar editor={editor} />}
      <div className="doc-scroll">
        <div className="doc-wrap">
          {crumbs && <div className="crumbs">{crumbs}</div>}
          <input
            className="doc-title"
            value={node.name}
            placeholder="Sans titre"
            aria-label="Titre de la note"
            onChange={(e) => renameNode(node.id, e.target.value)}
            onBlur={(e) => {
              if (!e.target.value.trim()) renameNode(node.id, 'Sans titre')
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === 'ArrowDown') {
                e.preventDefault()
                editor?.commands.focus('start')
              }
            }}
          />
          <EditorContent editor={editor} />
          {editor && (
            <DragHandle editor={editor} nested>
              <span className="drag-grip" title="Glisser pour déplacer ce bloc (ou Alt+↑ / Alt+↓)">
                ⋮⋮
              </span>
            </DragHandle>
          )}
        </div>
      </div>
      {slash && <SlashMenu state={slash} />}
      {typesOpen && <BlockTypesDialog
          projectId={projectId}
          projectName={nodes.find((n) => n.id === projectId)?.name}
          onClose={() => setTypesOpen(false)}
        />}
    </>
  )
}

/** Charge le document local de la note avant de monter l'éditeur. */
export function NoteEditor(props: Props) {
  const { persistence } = getNoteDoc(props.node.id)
  const [synced, setSynced] = useState(persistence.synced)
  useEffect(() => {
    let alive = true
    void persistence.whenSynced.then(() => alive && setSynced(true))
    return () => {
      alive = false
    }
  }, [persistence])
  if (!synced) return <div className="doc-loading" />
  return <Body {...props} />
}
