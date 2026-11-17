import StarterKit from '@tiptap/starter-kit'
import Highlight from '@tiptap/extension-highlight'
import { Color, FontFamily, FontSize, TextStyle } from '@tiptap/extension-text-style'
import { TaskList } from '@tiptap/extension-list'
import { TaskDue } from './TaskDue'
import { Table, TableCell, TableHeader, TableRow } from '@tiptap/extension-table'
import { ImageBlock } from './ImageBlock'
import { Diagram } from './Diagram'
import { Callout } from './Callout'
import { Solution } from './Solution'
import { Column, Columns } from './Columns'
import { Mathematics } from '@tiptap/extension-mathematics'
import { Details, DetailsContent, DetailsSummary } from '@tiptap/extension-details'
import Typography from '@tiptap/extension-typography'
import { Markdown } from '@tiptap/markdown'
import { CodeBlock } from './CodeBlock'
import { NoteLink } from './NoteLink'
import { Tags } from './Tags'
import { Toc } from './Toc'
import { Embed } from './Embed'
import { Kanban } from './Kanban'
import { TableCalc } from './TableCalc'
import { EmojiShortcodes } from './EmojiShortcodes'
import { MarkdownPaste } from './MarkdownPaste'
import { mathBridge } from './mathBridge'
import { Document } from '@tiptap/extension-document'

/** Document d'une note de todo : une seule liste de cases à cocher. */
const TodoDocument = Document.extend({ content: 'taskList' })

/** Tout ce qui définit la structure d'une note (utilisé par l'éditeur et par l'export). */
export function buildExtensions(todo = false) {
  return [
    StarterKit.configure({ undoRedo: false, codeBlock: false, ...(todo ? { document: false as const } : {}) }),
    ...(todo ? [TodoDocument] : []),
    CodeBlock,
    Mathematics.configure({
      katexOptions: { throwOnError: false },
      inlineOptions: { onClick: (node, pos) => mathBridge.edit(node, pos) },
      blockOptions: { onClick: (node, pos) => mathBridge.edit(node, pos) },
    }),
    Details.configure({ persist: true }),
    DetailsSummary,
    DetailsContent,
    NoteLink,
    Tags,
    Toc,
    Embed,
    Kanban,
    TableCalc,
    Typography.configure({ openDoubleQuote: '« ', closeDoubleQuote: ' »' }),
    EmojiShortcodes,
    Markdown,
    MarkdownPaste,
    TextStyle,
    Color,
    FontFamily,
    FontSize,
    Highlight.configure({ multicolor: true }),
    TaskList,
    TaskDue.configure({ nested: true, onReadOnlyChecked: () => true }),
    ImageBlock,
    Diagram,
    Table.configure({ resizable: true }),
    TableRow,
    TableHeader,
    TableCell,
    Callout,
    Solution,
    Columns,
    Column,
  ]
}
