import type { SlashItem } from './SlashCommand'
import type { BlockType } from '../store/tree'
import { pickImages } from './ImageBlock'
import { colorCss } from '../store/colors'
import { mathBridge } from './mathBridge'
import { defaultBoard } from './Kanban'
import { placeCursorInFirst } from './placeCursor'

// Sans accents, sans espaces : « 3col » trouve « 3 colonnes ».
const norm = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, '')
    .toLowerCase()

/** Tous les blocs insérables depuis le menu « / ». */
export function buildSlashItems(types: BlockType[], manageTypes: () => void): SlashItem[] {
  const blocks: SlashItem[] = types.map((t) => {
    const color = colorCss(t.color)
    return {
      id: `block-${t.id}`,
      label: t.label,
      hint: 'Bloc coloré',
      color,
      group: 'Blocs',
      run: ({ editor, range }) =>
        editor
          .chain()
          .focus()
          .deleteRange(range)
          .insertCallout({ kind: t.id, label: t.label, color }, t.id === 'exercise')
          .run(),
    }
  })

  const layout: SlashItem[] = [
    {
      id: 'cols-2',
      label: '2 colonnes',
      hint: 'Mise en page',
      group: 'Mise en page',
      run: ({ editor, range }) => editor.chain().focus().deleteRange(range).insertColumns(2).run(),
    },
    {
      id: 'cols-3',
      label: '3 colonnes',
      hint: 'Mise en page',
      group: 'Mise en page',
      run: ({ editor, range }) => editor.chain().focus().deleteRange(range).insertColumns(3).run(),
    },
    {
      id: 'kanban',
      label: 'Tableau Kanban',
      hint: 'Colonnes de cartes à glisser',
      group: 'Mise en page',
      run: ({ editor, range }) => editor.chain().focus().deleteRange(range).insertContent({ type: 'kanban', attrs: { data: JSON.stringify(defaultBoard()) } }).run(),
    },
    {
      id: 'embed',
      label: 'Note intégrée',
      hint: 'Affiche le contenu d’une autre note',
      group: 'Mise en page',
      run: ({ editor, range }) => editor.chain().focus().deleteRange(range).insertContent({ type: 'embed' }).run(),
    },
    {
      id: 'toc',
      label: 'Sommaire',
      hint: 'Liste des titres de la note',
      group: 'Mise en page',
      run: ({ editor, range }) => editor.chain().focus().deleteRange(range).insertContent({ type: 'toc' }).run(),
    },
    {
      id: 'details',
      label: 'Bloc repliable',
      hint: 'Titre + contenu masquable',
      group: 'Mise en page',
      run: ({ editor, range }) =>
        editor
          .chain()
          .focus()
          .deleteRange(range)
          .insertContent({
            type: 'details',
            attrs: { open: true },
            content: [{ type: 'detailsSummary' }, { type: 'detailsContent', content: [{ type: 'paragraph' }] }],
          })
          .command(({ tr }) => placeCursorInFirst(tr, range.from, 'details', 2))
          .run(),
    },
    {
      id: 'solution',
      label: 'Solution repliable',
      hint: 'À mettre dans un exercice',
      group: 'Mise en page',
      run: ({ editor, range }) =>
        editor
          .chain()
          .focus()
          .deleteRange(range)
          .insertContent({ type: 'solution', attrs: { open: true }, content: [{ type: 'paragraph' }] })
          .run(),
    },
  ]

  const maths: SlashItem[] = [
    {
      id: 'math-block',
      label: 'Formule (bloc)',
      hint: 'LaTeX, ou tape $$…$$',
      group: 'Maths',
      run: ({ editor, range }) => {
        editor.chain().focus().deleteRange(range).run()
        mathBridge.create('block')
      },
    },
    {
      id: 'math-inline',
      label: 'Formule (dans le texte)',
      hint: 'Ou tape $…$',
      group: 'Maths',
      run: ({ editor, range }) => {
        editor.chain().focus().deleteRange(range).run()
        mathBridge.create('inline')
      },
    },
  ]

  const media: SlashItem[] = [
    {
      id: 'image',
      label: 'Image…',
      hint: 'Ou colle une capture',
      group: 'Média',
      run: ({ editor, range }) => {
        editor.chain().focus().deleteRange(range).run()
        pickImages(editor)
      },
    },
    {
      id: 'diagram',
      label: 'Schéma',
      hint: 'Formes, flèches, crayon',
      group: 'Média',
      run: ({ editor, range }) => editor.chain().focus().deleteRange(range).insertDiagram().run(),
    },
    {
      id: 'table',
      label: 'Tableau',
      hint: '3 × 3',
      group: 'Média',
      run: ({ editor, range }) =>
        editor.chain().focus().deleteRange(range).insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run(),
    },
  ]

  const text: SlashItem[] = [
    ...([1, 2, 3] as const).map(
      (level): SlashItem => ({
        id: `h${level}`,
        label: `Titre ${level}`,
        group: 'Texte',
        run: ({ editor, range }) => editor.chain().focus().deleteRange(range).setHeading({ level }).run(),
      }),
    ),
    {
      id: 'bullet',
      label: 'Liste à puces',
      group: 'Texte',
      run: ({ editor, range }) => editor.chain().focus().deleteRange(range).toggleBulletList().run(),
    },
    {
      id: 'ordered',
      label: 'Liste numérotée',
      group: 'Texte',
      run: ({ editor, range }) => editor.chain().focus().deleteRange(range).toggleOrderedList().run(),
    },
    {
      id: 'task',
      label: 'Liste de tâches',
      group: 'Texte',
      run: ({ editor, range }) => editor.chain().focus().deleteRange(range).toggleTaskList().run(),
    },
    {
      id: 'quote',
      label: 'Citation',
      group: 'Texte',
      run: ({ editor, range }) => editor.chain().focus().deleteRange(range).setBlockquote().run(),
    },
    {
      id: 'code',
      label: 'Bloc de code',
      group: 'Texte',
      run: ({ editor, range }) => editor.chain().focus().deleteRange(range).setCodeBlock().run(),
    },
    {
      id: 'rule',
      label: 'Séparateur',
      group: 'Texte',
      run: ({ editor, range }) => editor.chain().focus().deleteRange(range).setHorizontalRule().run(),
    },
  ]

  const manage: SlashItem = {
    id: 'manage-types',
    label: 'Gérer les types de blocs…',
    hint: 'Créer, renommer, recolorer',
    group: 'Blocs',
    run: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).run()
      manageTypes()
    },
  }

  return [...blocks, manage, ...layout, ...maths, ...media, ...text]
}

export function filterSlashItems(items: SlashItem[], query: string): SlashItem[] {
  const q = norm(query.trim())
  if (!q) return items
  return items.filter((i) => norm(i.label).includes(q) || norm(i.id).includes(q))
}
