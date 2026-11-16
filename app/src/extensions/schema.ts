import StarterKit from '@tiptap/starter-kit'
import Highlight from '@tiptap/extension-highlight'
import { Color, FontFamily, FontSize, TextStyle } from '@tiptap/extension-text-style'
import { TaskItem, TaskList } from '@tiptap/extension-list'
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
import { EmojiShortcodes } from './EmojiShortcodes'
import { MarkdownPaste } from './MarkdownPaste'
import { mathBridge } from './mathBridge'

/** Tout ce qui définit la structure d'une note (utilisé par l'éditeur et par l'export). */
export function buildExtensions() {
  return [
    StarterKit.configure({ undoRedo: false, codeBlock: false }),
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
    TaskItem.configure({ nested: true }),
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
