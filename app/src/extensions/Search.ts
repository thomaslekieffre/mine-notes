import { Extension } from '@tiptap/core'
import type { Editor } from '@tiptap/core'
import { Plugin, PluginKey } from '@tiptap/pm/state'
import { Decoration, DecorationSet } from '@tiptap/pm/view'
import type { Node as PMNode } from '@tiptap/pm/model'

// Recherche dans la note (⌘F) : surlignage de toutes les occurrences, navigation, remplacement.
// La comparaison ignore la casse et les accents, caractère par caractère (les positions restent exactes).

const fold = (s: string) =>
  Array.from(s, (c) => {
    const base = c.normalize('NFD')[0].toLowerCase()
    return base.length === c.length ? base : c.toLowerCase()
  }).join('')

export interface Match {
  from: number
  to: number
}

export function findMatches(doc: PMNode, query: string): Match[] {
  const q = fold(query)
  if (!q) return []
  const out: Match[] = []
  doc.descendants((node, pos) => {
    if (!node.isText || !node.text) return
    const text = fold(node.text)
    for (let i = text.indexOf(q); i >= 0; i = text.indexOf(q, i + q.length)) {
      out.push({ from: pos + i, to: pos + i + q.length })
    }
  })
  return out
}

interface SearchState {
  query: string
  current: number
  matches: Match[]
  deco: DecorationSet
}

export const searchKey = new PluginKey<SearchState>('mineSearch')

function build(doc: PMNode, query: string, current: number): SearchState {
  const matches = findMatches(doc, query)
  const cur = matches.length ? Math.min(Math.max(current, 0), matches.length - 1) : 0
  const deco = DecorationSet.create(
    doc,
    matches.map((m, i) => Decoration.inline(m.from, m.to, { class: i === cur ? 'search-hit current' : 'search-hit' })),
  )
  return { query, current: cur, matches, deco }
}

export const Search = Extension.create({
  name: 'mineSearch',
  addProseMirrorPlugins() {
    return [
      new Plugin<SearchState>({
        key: searchKey,
        state: {
          init: (_c, { doc }) => build(doc, '', 0),
          apply(tr, prev, _old, next) {
            const meta = tr.getMeta(searchKey) as { query: string; current: number } | undefined
            if (meta) return build(next.doc, meta.query, meta.current)
            if (tr.docChanged && prev.query) return build(next.doc, prev.query, prev.current)
            return prev
          },
        },
        props: { decorations: (state) => searchKey.getState(state)?.deco },
      }),
    ]
  },
})

export const getSearch = (editor: Editor) => searchKey.getState(editor.state)

export function setSearch(editor: Editor, query: string, current = 0) {
  editor.view.dispatch(editor.state.tr.setMeta(searchKey, { query, current }))
  const st = getSearch(editor)
  const m = st?.matches[st.current]
  if (m) scrollTo(editor, m)
}

function scrollTo(editor: Editor, m: Match) {
  const dom = editor.view.domAtPos(m.from).node
  const el = dom instanceof Element ? dom : dom.parentElement
  el?.scrollIntoView({ block: 'center', behavior: 'smooth' })
}

export function stepSearch(editor: Editor, dir: 1 | -1) {
  const st = getSearch(editor)
  if (!st || st.matches.length === 0) return
  setSearch(editor, st.query, (st.current + dir + st.matches.length) % st.matches.length)
}

export function replaceCurrent(editor: Editor, text: string) {
  const st = getSearch(editor)
  const m = st?.matches[st.current]
  if (!st || !m) return
  editor.view.dispatch(editor.state.tr.insertText(text, m.from, m.to))
  setSearch(editor, st.query, st.current)
}

export function replaceAll(editor: Editor, text: string) {
  const st = getSearch(editor)
  if (!st || st.matches.length === 0) return
  const tr = editor.state.tr
  for (const m of [...st.matches].reverse()) tr.insertText(text, m.from, m.to)
  editor.view.dispatch(tr)
  setSearch(editor, st.query, 0)
}
