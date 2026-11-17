import { Extension } from '@tiptap/core'
import type { Editor } from '@tiptap/core'
import { Fragment } from '@tiptap/pm/model'
import type { Node as PMNode } from '@tiptap/pm/model'
import { Plugin, PluginKey } from '@tiptap/pm/state'
import { Decoration, DecorationSet } from '@tiptap/pm/view'

// Calculs dans les tableaux : une cellule « =SOMME(B) » affiche le résultat à côté de sa formule.
// Fonctions : SOMME, MOYENNE, MIN, MAX, NB. Argument : une colonne (B) ou une plage (B2:B5).

const FN_RE = /^=\s*(SOMME|MOYENNE|MIN|MAX|NB|SUM|AVERAGE|COUNT)\s*\(\s*([A-Z]+)(\d+)?(?::([A-Z]+)?(\d+))?\s*\)\s*$/i

const colIndex = (letters: string) => [...letters.toUpperCase()].reduce((n, ch) => n * 26 + ch.charCodeAt(0) - 64, 0) - 1
export const colLetter = (i: number) => {
  let s = ''
  for (let n = i + 1; n > 0; n = Math.floor((n - 1) / 26)) s = String.fromCharCode(65 + ((n - 1) % 26)) + s
  return s
}

export function parseNumber(text: string): number | null {
  const t = text.replace(/[\s€$%]/g, '').replace(',', '.')
  return /^-?\d+(\.\d+)?$/.test(t) ? Number(t) : null
}

const fmt = (n: number) => new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 2 }).format(n)

function evaluate(text: string, rows: string[][], row: number, col: number, header: boolean): string | null {
  const m = FN_RE.exec(text.trim())
  if (!m) return null
  const fn = m[1].toUpperCase()
  const c = colIndex(m[2])
  const first = m[3] ? Number(m[3]) - 1 : header ? 1 : 0
  const last = m[5] ? Number(m[5]) - 1 : rows.length - 1
  const nums: number[] = []
  let count = 0
  for (let r = first; r <= last && r < rows.length; r++) {
    if (r === row && c === col) continue
    const cell = rows[r]?.[c]
    if (cell === undefined || cell.trim() === '' || FN_RE.test(cell.trim())) continue
    const n = parseNumber(cell)
    count++
    if (n !== null) nums.push(n)
  }
  if (fn === 'NB' || fn === 'COUNT') return fmt(count)
  if (nums.length === 0) return '—'
  if (fn === 'SOMME' || fn === 'SUM') return fmt(nums.reduce((a, b) => a + b, 0))
  if (fn === 'MOYENNE' || fn === 'AVERAGE') return fmt(nums.reduce((a, b) => a + b, 0) / nums.length)
  if (fn === 'MIN') return fmt(Math.min(...nums))
  return fmt(Math.max(...nums))
}

export const TableCalc = Extension.create({
  name: 'tableCalc',
  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey('tableCalc'),
        props: {
          decorations: (state) => {
            const decos: Decoration[] = []
            state.doc.descendants((node, pos) => {
              if (node.type.name !== 'table') return
              const grid: string[][] = []
              node.forEach((row) => {
                const cells: string[] = []
                row.forEach((cell) => cells.push(cell.textContent))
                grid.push(cells)
              })
              const header = node.firstChild?.firstChild?.type.name === 'tableHeader'
              node.forEach((row, rowOff, r) => {
                row.forEach((cell, cellOff, c) => {
                  const result = evaluate(cell.textContent, grid, r, c, header)
                  if (result === null) return
                  const para = cell.firstChild
                  if (!para) return
                  const at = pos + 1 + rowOff + 1 + cellOff + 1 + para.nodeSize - 1
                  decos.push(
                    Decoration.widget(
                      at,
                      () => {
                        const s = document.createElement('span')
                        s.className = 'calc-result'
                        s.contentEditable = 'false'
                        s.textContent = `= ${result}`
                        return s
                      },
                      { side: 1, key: `calc-${result}-${cell.textContent}` },
                    ),
                  )
                })
              })
              return false
            })
            return DecorationSet.create(state.doc, decos)
          },
        },
      }),
    ]
  },
})

function currentTable(editor: Editor): { node: PMNode; pos: number; col: number } | null {
  const { $from } = editor.state.selection
  let col = 0
  let row: number | null = null
  for (let d = $from.depth; d > 0; d--) {
    const n = $from.node(d)
    if (n.type.name === 'tableCell' || n.type.name === 'tableHeader') col = $from.index(d - 1)
    if (n.type.name === 'tableRow') row = d
    if (n.type.name === 'table') return row === null ? null : { node: n, pos: $from.before(d), col }
  }
  return null
}

/** Trie les lignes du tableau selon la colonne du curseur (en-tête et lignes de calcul restent en place). */
export function sortTable(editor: Editor, dir: 'asc' | 'desc') {
  const t = currentTable(editor)
  if (!t) return
  const rows: PMNode[] = []
  t.node.forEach((r) => rows.push(r))
  const head = rows[0]?.firstChild?.type.name === 'tableHeader' ? [rows[0]] : []
  const body = rows.slice(head.length)
  const isCalc = (r: PMNode) => {
    let calc = false
    r.forEach((c) => {
      if (FN_RE.test(c.textContent.trim())) calc = true
    })
    return calc
  }
  const data = body.filter((r) => !isCalc(r))
  const calc = body.filter(isCalc)
  const text = (r: PMNode) => r.maybeChild(t.col)?.textContent.trim() ?? ''
  const allNum = data.every((r) => text(r) === '' || parseNumber(text(r)) !== null)
  data.sort((a, b) => (allNum ? (parseNumber(text(a)) ?? -Infinity) - (parseNumber(text(b)) ?? -Infinity) : text(a).localeCompare(text(b), 'fr', { numeric: true })))
  if (dir === 'desc') data.reverse()
  const next = t.node.type.create(t.node.attrs, Fragment.from([...head, ...data, ...calc]))
  editor.view.dispatch(editor.state.tr.replaceWith(t.pos, t.pos + t.node.nodeSize, next))
  editor.view.focus()
}

/** Ajoute une ligne « Total » : une somme sous chaque colonne de nombres. */
export function addTotalRow(editor: Editor) {
  const t = currentTable(editor)
  if (!t) return
  const { schema } = editor.state
  const rows: PMNode[] = []
  t.node.forEach((r) => rows.push(r))
  const header = rows[0]?.firstChild?.type.name === 'tableHeader'
  const body = rows.slice(header ? 1 : 0)
  const cols = rows[0]?.childCount ?? 0
  const cells: PMNode[] = []
  for (let c = 0; c < cols; c++) {
    const vals = body.map((r) => r.maybeChild(c)?.textContent.trim() ?? '').filter((v) => v !== '' && !FN_RE.test(v))
    const numeric = vals.length > 0 && vals.every((v) => parseNumber(v) !== null)
    const label = c === 0 && !numeric ? 'Total' : numeric ? `=SOMME(${colLetter(c)})` : ''
    cells.push(schema.nodes.tableCell.create(null, schema.nodes.paragraph.create(null, label ? schema.text(label) : undefined)))
  }
  const row = schema.nodes.tableRow.create(null, cells)
  editor.view.dispatch(editor.state.tr.insert(t.pos + t.node.nodeSize - 1, row))
  editor.view.focus()
}
