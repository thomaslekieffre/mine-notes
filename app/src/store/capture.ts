import * as Y from 'yjs'
import { getNoteDoc } from './notes'
import { createNode } from './tree'

// Écriture directe dans le contenu d'une note (sans éditeur ouvert) pour la capture rapide.
// Si la note est ouverte, l'éditeur partage le même document Yjs et affiche l'ajout aussitôt.

async function fragmentOf(noteId: string): Promise<Y.XmlFragment> {
  const { doc, persistence } = getNoteDoc(noteId)
  await persistence.whenSynced
  return doc.getXmlFragment('content')
}

function paragraph(text: string): Y.XmlElement {
  const p = new Y.XmlElement('paragraph')
  if (text) {
    const t = new Y.XmlText()
    t.insert(0, text)
    p.insert(0, [t])
  }
  return p
}

/** Ajoute du texte (un paragraphe par ligne) à la fin d'une note. */
export async function appendText(noteId: string, text: string) {
  const f = await fragmentOf(noteId)
  f.insert(f.length, text.split('\n').map(paragraph))
}

/** Ajoute une tâche à cocher à la fin d'une note de todo (dans la dernière liste de tâches si elle existe). */
export async function appendTask(noteId: string, text: string) {
  const f = await fragmentOf(noteId)
  const item = new Y.XmlElement('taskItem')
  item.setAttribute('checked', false as unknown as string)
  item.insert(0, [paragraph(text)])
  const last = f.length > 0 ? f.get(f.length - 1) : null
  if (last instanceof Y.XmlElement && last.nodeName === 'taskList') {
    last.insert(last.length, [item])
  } else {
    const list = new Y.XmlElement('taskList')
    list.insert(0, [item])
    f.insert(f.length, [list])
  }
}

/** Crée une note à la racine. Sans titre, la première ligne en tient lieu. */
export async function createCapturedNote(title: string, body: string): Promise<string> {
  const firstLine = body.trim().split('\n')[0]?.slice(0, 60) ?? ''
  const id = createNode(null, 'note', title.trim() || firstLine || 'Note rapide')
  if (body.trim()) await appendText(id, body.trim())
  return id
}
