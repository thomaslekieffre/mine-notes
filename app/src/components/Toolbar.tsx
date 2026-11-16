import { useEditorState } from '@tiptap/react'
import type { Editor } from '@tiptap/react'
import { Icon } from './Icon'
import type { IconName } from './Icon'
import { pickImages } from '../extensions/ImageBlock'

const FONTS = [
  { label: 'Inter', value: '' },
  { label: 'Crayon', value: "Kalam, cursive" },
  { label: 'Serif', value: "Georgia, 'Times New Roman', serif" },
  { label: 'Mono', value: "'JetBrains Mono', monospace" },
]
const SIZES = ['12px', '14px', '16px', '18px', '20px', '24px', '32px']
const COLORS = [
  { name: 'Graphite', value: 'var(--c-graphite)' },
  { name: 'Bleu', value: 'var(--c-blue)' },
  { name: 'Vert', value: 'var(--c-green)' },
  { name: 'Orange', value: 'var(--c-orange)' },
  { name: 'Rouge', value: 'var(--c-red)' },
  { name: 'Violet', value: 'var(--c-purple)' },
]
const HIGHLIGHTS = [
  { name: 'Jaune', value: 'var(--h-yellow)' },
  { name: 'Vert', value: 'var(--h-green)' },
  { name: 'Bleu', value: 'var(--h-blue)' },
  { name: 'Rose', value: 'var(--h-pink)' },
]

// Garde la sélection dans l'éditeur quand on clique sur un bouton de la barre.
const keepFocus = (e: React.MouseEvent) => e.preventDefault()

function Btn({
  label,
  active,
  onClick,
  children,
}: {
  label: string
  active?: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      className={active ? 'tb-btn active' : 'tb-btn'}
      aria-label={label}
      aria-pressed={active}
      title={label}
      onMouseDown={keepFocus}
      onClick={onClick}
    >
      {children}
    </button>
  )
}

export function Toolbar({ editor, onToggleOutline, onToggleSearch }: { editor: Editor; onToggleOutline: () => void; onToggleSearch: () => void }) {
  const s = useEditorState({
    editor,
    selector: ({ editor: e }) => {
      const ts = e.getAttributes('textStyle') as { fontFamily?: string; fontSize?: string; color?: string }
      return {
        bold: e.isActive('bold'),
        italic: e.isActive('italic'),
        underline: e.isActive('underline'),
        strike: e.isActive('strike'),
        h1: e.isActive('heading', { level: 1 }),
        h2: e.isActive('heading', { level: 2 }),
        h3: e.isActive('heading', { level: 3 }),
        bullet: e.isActive('bulletList'),
        ordered: e.isActive('orderedList'),
        task: e.isActive('taskList'),
        quote: e.isActive('blockquote'),
        code: e.isActive('codeBlock'),
        inTable: e.isActive('table'),
        highlight: e.isActive('highlight'),
        fontFamily: ts.fontFamily ?? '',
        fontSize: ts.fontSize ?? '',
        color: ts.color ?? '',
      }
    },
  })
  const c = () => editor.chain().focus()
  const known = FONTS.some((f) => f.value === s.fontFamily)

  const heading = (level: 1 | 2 | 3) => c().toggleHeading({ level }).run()

  const iconBtn = (label: string, icon: IconName, active: boolean, run: () => void) => (
    <Btn label={label} active={active} onClick={run}>
      <Icon name={icon} size={16} />
    </Btn>
  )

  return (
    <div className="toolbar" role="toolbar" aria-label="Mise en forme">
      <select
        className="tb-select tb-font"
        aria-label="Police"
        value={known ? s.fontFamily : ''}
        style={{ fontFamily: s.fontFamily || undefined }}
        onChange={(e) =>
          e.target.value ? c().setFontFamily(e.target.value).run() : c().unsetFontFamily().run()
        }
      >
        {FONTS.map((f) => (
          <option key={f.label} value={f.value}>
            {f.label}
          </option>
        ))}
      </select>
      <select
        className="tb-select tb-size"
        aria-label="Taille"
        value={s.fontSize}
        onChange={(e) =>
          e.target.value ? c().setFontSize(e.target.value).run() : c().unsetFontSize().run()
        }
      >
        <option value="">Auto</option>
        {SIZES.map((z) => (
          <option key={z} value={z}>
            {z.replace('px', '')}
          </option>
        ))}
      </select>

      <span className="tb-sep" />
      <Btn label="Gras (⌘B)" active={s.bold} onClick={() => c().toggleBold().run()}>
        <b>B</b>
      </Btn>
      <Btn label="Italique (⌘I)" active={s.italic} onClick={() => c().toggleItalic().run()}>
        <i className="serif-i">I</i>
      </Btn>
      <Btn label="Souligné (⌘U)" active={s.underline} onClick={() => c().toggleUnderline().run()}>
        <u>U</u>
      </Btn>
      <Btn label="Barré" active={s.strike} onClick={() => c().toggleStrike().run()}>
        <s>S</s>
      </Btn>

      <span className="tb-sep" />
      {COLORS.map((col) => (
        <button
          key={col.name}
          type="button"
          className={s.color === col.value ? 'swatch active' : 'swatch'}
          style={{ background: col.value }}
          aria-label={`Couleur ${col.name}`}
          title={`Couleur ${col.name}`}
          onMouseDown={keepFocus}
          onClick={() =>
            s.color === col.value ? c().unsetColor().run() : c().setColor(col.value).run()
          }
        />
      ))}

      <span className="tb-sep" />
      {HIGHLIGHTS.map((h) => (
        <button
          key={h.name}
          type="button"
          className="swatch hl"
          style={{ background: h.value }}
          aria-label={`Surligner ${h.name}`}
          title={`Surligner ${h.name}`}
          onMouseDown={keepFocus}
          onClick={() => c().toggleHighlight({ color: h.value }).run()}
        />
      ))}
      {iconBtn('Retirer le surlignage', 'highlight', s.highlight, () => c().unsetHighlight().run())}

      <span className="tb-sep" />
      <Btn label="Titre 1" active={s.h1} onClick={() => heading(1)}>
        H1
      </Btn>
      <Btn label="Titre 2" active={s.h2} onClick={() => heading(2)}>
        H2
      </Btn>
      <Btn label="Titre 3" active={s.h3} onClick={() => heading(3)}>
        H3
      </Btn>

      <span className="tb-sep" />
      {iconBtn('Liste à puces', 'list', s.bullet, () => c().toggleBulletList().run())}
      {iconBtn('Liste numérotée', 'listOrdered', s.ordered, () => c().toggleOrderedList().run())}
      {iconBtn('Liste de tâches', 'check', s.task, () => c().toggleTaskList().run())}
      {iconBtn('Citation', 'quote', s.quote, () => c().toggleBlockquote().run())}
      {iconBtn('Bloc de code', 'code', s.code, () => c().toggleCodeBlock().run())}

      {iconBtn('Insérer une image', 'image', false, () => pickImages(editor))}
      {iconBtn('Insérer un schéma', 'shapes', false, () => c().insertDiagram().run())}
      {iconBtn('Insérer un tableau', 'table', s.inTable, () =>
        c().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run(),
      )}

      <span className="grow" />
      <button type="button" className="tb-btn" title="Rechercher dans la note (⌘F)" aria-label="Rechercher dans la note" onMouseDown={keepFocus} onClick={onToggleSearch}>
        <Icon name="search" size={15} />
      </button>
      <button type="button" className="tb-btn" title="Plan de la note" aria-label="Plan de la note" onMouseDown={keepFocus} onClick={onToggleOutline}>
        <Icon name="menu" size={15} />
      </button>
      <button
        type="button"
        className="tb-add"
        title="Insérer un bloc (ou tape / dans la note)"
        onMouseDown={keepFocus}
        onClick={() => c().insertContent('/').run()}
      >
        + Bloc <kbd>/</kbd>
      </button>

      {s.inTable && (
        <div className="table-bar" role="group" aria-label="Tableau">
          <span className="table-bar-label">Tableau</span>
          <button type="button" className="tb-text" onMouseDown={keepFocus} onClick={() => c().addRowAfter().run()}>
            + Ligne
          </button>
          <button type="button" className="tb-text" onMouseDown={keepFocus} onClick={() => c().addColumnAfter().run()}>
            + Colonne
          </button>
          <button type="button" className="tb-text" onMouseDown={keepFocus} onClick={() => c().deleteRow().run()}>
            − Ligne
          </button>
          <button type="button" className="tb-text" onMouseDown={keepFocus} onClick={() => c().deleteColumn().run()}>
            − Colonne
          </button>
          <button type="button" className="tb-text" onMouseDown={keepFocus} onClick={() => c().toggleHeaderRow().run()}>
            En-tête
          </button>
          <button type="button" className="tb-text danger" onMouseDown={keepFocus} onClick={() => c().deleteTable().run()}>
            Supprimer le tableau
          </button>
        </div>
      )}
    </div>
  )
}
