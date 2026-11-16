import { useEffect, useRef, useState } from 'react'
import { EditorContent, useEditor } from '@tiptap/react'
import { DragHandle } from '@tiptap/extension-drag-handle-react'
import { buildExtensions } from '../extensions/schema'
import { ImagePaste } from '../extensions/ImageBlock'
import { MoveBlock } from '../extensions/MoveBlock'
import { Search } from '../extensions/Search'
import { mathBridge } from '../extensions/mathBridge'
import { SearchBar } from './SearchBar'
import { Outline } from './Outline'
import { Backlinks } from './Backlinks'
import { MathDialog } from './MathDialog'
import type { Node as PMNode } from '@tiptap/pm/model'
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
  const [wiki, setWiki] = useState<SlashState | null>(null)
  const [searchOpen, setSearchOpen] = useState(false)
  const [outlineOpen, setOutlineOpen] = useState(false)
  const [math, setMath] = useState<{ kind: 'inline' | 'block'; latex: string; pos: number | null } | null>(null)
  const nodesRef = useRef(nodes)
  nodesRef.current = nodes

  const editor = useEditor(
    {
      extensions: [
        ...buildExtensions(),
        Collaboration.configure({ document: doc, field: 'content' }),
        Placeholder.configure({ placeholder: 'Écris quelque chose… ou tape / pour insérer un bloc' }),
        ImagePaste,
        MoveBlock,
        Search,
        SlashCommand.extend({ name: 'wikiLinkMenu' }).configure({
          char: '[[',
          allowSpaces: true,
          onState: setWiki,
          getItems: (q) => {
            const norm = (t: string) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
            const nq = norm(q.trim())
            return nodesRef.current
              .filter((n) => n.type === 'note' && n.id !== node.id && norm(n.name).includes(nq))
              .slice(0, 12)
              .map((n) => ({
                id: n.id,
                label: n.name,
                hint: (() => {
                  const parts: string[] = []
                  let p = nodesRef.current.find((x) => x.id === n.parentId)
                  while (p) {
                    parts.unshift(p.name)
                    p = nodesRef.current.find((x) => x.id === p?.parentId)
                  }
                  return parts.join(' › ') || 'Racine'
                })(),
                group: 'Lier une note',
                run: ({ editor, range }) =>
                  editor
                    .chain()
                    .focus()
                    .deleteRange(range)
                    .insertContent([{ type: 'noteLink', attrs: { id: n.id, label: n.name } }, { type: 'text', text: ' ' }])
                    .run(),
              }))
          },
        }),
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
    mathBridge.edit = (n: PMNode, pos: number) =>
      setMath({ kind: n.type.name === 'blockMath' ? 'block' : 'inline', latex: String(n.attrs.latex ?? ''), pos })
    mathBridge.create = (kind) => setMath({ kind, latex: '', pos: null })
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'f') {
        e.preventDefault()
        setSearchOpen(true)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('keydown', onKey)
      mathBridge.edit = () => {}
      mathBridge.create = () => {}
    }
  }, [editor])

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
      {editor && (
        <Toolbar
          editor={editor}
          onToggleOutline={() => setOutlineOpen((v) => !v)}
          onToggleSearch={() => setSearchOpen((v) => !v)}
        />
      )}
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
          <Backlinks noteId={node.id} nodes={nodes} />
          {editor && (
            <DragHandle editor={editor} nested>
              <span className="drag-grip" title="Glisser pour déplacer ce bloc (ou Alt+↑ / Alt+↓)">
                ⋮⋮
              </span>
            </DragHandle>
          )}
        </div>
      </div>
      {searchOpen && editor && <SearchBar editor={editor} onClose={() => { setSearchOpen(false); editor.commands.focus() }} />}
      {outlineOpen && editor && <Outline editor={editor} onClose={() => setOutlineOpen(false)} />}
      {math && editor && (
        <MathDialog
          kind={math.kind}
          initial={math.latex}
          editing={math.pos !== null}
          onClose={() => {
            setMath(null)
            editor.commands.focus()
          }}
          onDelete={() => {
            if (math.pos !== null) {
              if (math.kind === 'block') editor.chain().focus().deleteBlockMath({ pos: math.pos }).run()
              else editor.chain().focus().deleteInlineMath({ pos: math.pos }).run()
            }
            setMath(null)
          }}
          onSubmit={(latex) => {
            const c = editor.chain().focus()
            if (math.pos !== null) {
              if (math.kind === 'block') c.updateBlockMath({ latex, pos: math.pos }).run()
              else c.updateInlineMath({ latex, pos: math.pos }).run()
            } else {
              if (math.kind === 'block') c.insertBlockMath({ latex }).run()
              else c.insertInlineMath({ latex }).run()
              // Le curseur se place après la formule (sinon la frappe suivante la remplacerait).
              const to = editor.state.selection.to
              if (math.kind === 'block') {
                if (!editor.state.doc.resolve(to).nodeAfter) editor.commands.insertContentAt(to, { type: 'paragraph' })
                editor.commands.setTextSelection(to + 1)
              } else {
                editor.commands.setTextSelection(to)
              }
            }
            setMath(null)
          }}
        />
      )}
      {slash && <SlashMenu state={slash} />}
      {wiki && <SlashMenu state={wiki} />}
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
