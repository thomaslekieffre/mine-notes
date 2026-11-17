import * as Y from 'yjs'
import { plainText } from './search'
import { getNoteDoc } from './notes'
import { isDueKey, isRepeat, nextDue } from './dates'
import type { Repeat } from './dates'
import type { TreeNode } from './tree'

export interface TodoLink {
  id: string
  label: string
}

export interface TodoItem {
  noteId: string
  text: string
  /** Pages liées dans la tâche ([[…]]). */
  links: TodoLink[]
  checked: boolean
  /** Échéance « AAAA-MM-JJ », si elle existe. */
  due?: string
  /** Répétition (la tâche se repousse au lieu de rester cochée). */
  repeat?: Repeat
  toggle: () => void
}

function walk(frag: Y.XmlFragment | Y.XmlElement, out: Y.XmlElement[]) {
  for (const child of frag.toArray()) {
    if (child instanceof Y.XmlElement) {
      if (child.nodeName === 'taskItem') out.push(child)
      walk(child, out)
    }
  }
}

const isChecked = (el: Y.XmlElement) => {
  const v: unknown = el.getAttribute('checked')
  return v === true || v === 'true'
}

/** Texte propre à la tâche : sans celui de ses sous-tâches. */
function ownText(el: Y.XmlElement): string {
  return el
    .toArray()
    .filter((c) => !(c instanceof Y.XmlElement && c.nodeName === 'taskList'))
    .map((c) => plainText(c as Y.XmlElement))
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function linksIn(el: Y.XmlElement | Y.XmlFragment, out: TodoLink[] = []): TodoLink[] {
  for (const child of el.toArray()) {
    if (child instanceof Y.XmlElement) {
      if (child.nodeName === 'taskList') continue
      if (child.nodeName === 'noteLink') out.push({ id: String(child.getAttribute('id') ?? ''), label: String(child.getAttribute('label') ?? '') })
      else linksIn(child, out)
    }
  }
  return out
}

/** Cases à cocher d'une note, avec de quoi les (dé)cocher directement dans le document. */
export function tasksOf(noteId: string): TodoItem[] {
  const { doc } = getNoteDoc(noteId)
  const items: Y.XmlElement[] = []
  walk(doc.getXmlFragment('content'), items)
  return items.map((el) => ({
    noteId,
    text: ownText(el),
    links: linksIn(el),
    checked: isChecked(el),
    due: isDueKey(el.getAttribute('due')) ? (el.getAttribute('due') as string) : undefined,
    repeat: isRepeat(el.getAttribute('repeat')) ? (el.getAttribute('repeat') as Repeat) : undefined,
    // TipTap enregistre `checked` comme un booléen, que les types de Yjs ne prévoient pas.
    toggle: () => {
      const set = (el as unknown as { setAttribute: (k: string, v: unknown) => void }).setAttribute.bind(el)
      const rep = el.getAttribute('repeat')
      const due = el.getAttribute('due')
      if (!isChecked(el) && isRepeat(rep) && isDueKey(due)) set('due', nextDue(due, rep))
      else set('checked', !isChecked(el))
    },
  }))
}

/** Appelle `onChange` à chaque modification d'une des notes ; renvoie la fonction de nettoyage. */
export async function watchTasks(nodes: TreeNode[], onChange: () => void): Promise<() => void> {
  const offs: Array<() => void> = []
  for (const n of nodes) {
    if (n.type !== 'note') continue
    const { doc, persistence } = getNoteDoc(n.id)
    await persistence.whenSynced
    const frag = doc.getXmlFragment('content')
    frag.observeDeep(onChange)
    offs.push(() => frag.unobserveDeep(onChange))
  }
  return () => offs.forEach((off) => off())
}


const CONVERTIBLE = new Set(['paragraph', 'heading', 'taskList', 'bulletList', 'orderedList'])

/**
 * Prépare une note de todo : tout son contenu devient une seule liste de cases à cocher
 * (paragraphes, titres et puces deviennent des tâches). Renvoie false, sans rien changer,
 * si la note contient autre chose (image, tableau, bloc…) : elle reste alors un document normal.
 */
export async function prepareTodoNote(noteId: string): Promise<boolean> {
  const { doc, persistence } = getNoteDoc(noteId)
  await persistence.whenSynced
  const frag = doc.getXmlFragment('content')
  const kids = frag.toArray()
  if (kids.length === 1 && kids[0] instanceof Y.XmlElement && kids[0].nodeName === 'taskList') return true
  if (!kids.every((k) => k instanceof Y.XmlElement && CONVERTIBLE.has(k.nodeName))) return false

  const task = (inline: Array<Y.XmlElement | Y.XmlText | Y.XmlHook>): Y.XmlElement => {
    const item = new Y.XmlElement('taskItem')
    const p = new Y.XmlElement('paragraph')
    p.insert(0, inline.filter((c): c is Y.XmlElement | Y.XmlText => !(c instanceof Y.XmlHook)).map((c) => c.clone()))
    item.insert(0, [p])
    return item
  }
  const items: Y.XmlElement[] = []
  const fromList = (list: Y.XmlElement) => {
    for (const li of list.toArray()) {
      if (!(li instanceof Y.XmlElement)) continue
      for (const c of li.toArray()) {
        if (!(c instanceof Y.XmlElement)) continue
        if (c.nodeName === 'paragraph') items.push(task(c.toArray()))
        else if (c.nodeName === 'bulletList' || c.nodeName === 'orderedList') fromList(c)
      }
    }
  }
  for (const k of kids as Y.XmlElement[]) {
    if (k.nodeName === 'taskList') {
      for (const li of k.toArray()) if (li instanceof Y.XmlElement) items.push(li.clone())
    } else if (k.nodeName === 'bulletList' || k.nodeName === 'orderedList') {
      fromList(k)
    } else if (plainText(k).trim() || linksIn(k).length > 0) {
      items.push(task(k.toArray()))
    }
  }
  if (items.length === 0) items.push(task([]))
  doc.transact(() => {
    frag.delete(0, frag.length)
    const list = new Y.XmlElement('taskList')
    list.insert(0, items)
    frag.insert(0, [list])
  })
  return true
}
