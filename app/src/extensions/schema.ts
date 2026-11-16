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

/** Tout ce qui définit la structure d'une note (utilisé par l'éditeur et par l'export). */
export function buildExtensions() {
  return [
    StarterKit.configure({ undoRedo: false }),
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
