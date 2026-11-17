import { getNoteDoc } from './notes'
import { getMediaBlob } from './media'
import type { TreeNode } from './tree'

// Export lisible : chaque note devient un fichier .md dans un dossier qui reprend l'arborescence.
// Les blocs colorés deviennent des citations titrées, les schémas et images des mentions.

interface PMNode {
  type: string
  attrs?: Record<string, unknown>
  content?: PMNode[]
  text?: string
  marks?: Array<{ type: string; attrs?: Record<string, unknown> }>
}

function inline(nodes: PMNode[] = []): string {
  return nodes
    .map((n) => {
      if (n.type === 'hardBreak') return '  \n'
      if (n.type === 'inlineMath' || n.type === 'noteLink') return block(n)
      let t = n.text ?? ''
      for (const m of n.marks ?? []) {
        if (m.type === 'bold') t = `**${t}**`
        else if (m.type === 'italic') t = `*${t}*`
        else if (m.type === 'strike') t = `~~${t}~~`
        else if (m.type === 'code') t = `\`${t}\``
        else if (m.type === 'highlight') t = `==${t}==`
        else if (m.type === 'link') t = `[${t}](${String(m.attrs?.href ?? '')})`
      }
      return t
    })
    .join('')
}

const indent = (s: string, pad: string) =>
  s
    .split('\n')
    .map((l) => (l ? pad + l : l))
    .join('\n')

function blocks(nodes: PMNode[] = []): string {
  return nodes.map(block).filter((b) => b !== '').join('\n\n')
}

function block(n: PMNode): string {
  switch (n.type) {
    case 'paragraph':
      return inline(n.content)
    case 'heading':
      return `${'#'.repeat(Number(n.attrs?.level ?? 1))} ${inline(n.content)}`
    case 'bulletList':
      return (n.content ?? []).map((li) => `- ${indent(blocks(li.content), '  ').trimStart()}`).join('\n')
    case 'orderedList':
      return (n.content ?? [])
        .map((li, i) => `${i + 1}. ${indent(blocks(li.content), '   ').trimStart()}`)
        .join('\n')
    case 'taskList':
      return (n.content ?? [])
        .map((li) => `- [${li.attrs?.checked ? 'x' : ' '}] ${indent(blocks(li.content), '  ').trimStart()}${li.attrs?.due ? ` 📅 ${String(li.attrs.due)}` : ''}`)
        .join('\n')
    case 'blockquote':
      return indent(blocks(n.content), '> ').replace(/^(?! )/gm, '')
    case 'codeBlock':
      return `\`\`\`${String(n.attrs?.language ?? '')}\n${inline(n.content)}\n\`\`\``
    case 'horizontalRule':
      return '---'
    case 'callout': {
      const label = String(n.attrs?.label ?? 'Bloc')
      return `> **${label}**\n${indent(blocks(n.content), '> ')}`
    }
    case 'solution':
      return `<details>\n<summary>Solution</summary>\n\n${blocks(n.content)}\n\n</details>`
    case 'columns':
      // Markdown n'a pas de colonnes : on les empile, séparées par un filet.
      return (n.content ?? [])
        .map((c) => blocks(c.content))
        .filter((c) => c !== '')
        .join('\n\n---\n\n')
    case 'table': {
      const rows = (n.content ?? []).map((r) =>
        (r.content ?? []).map((c) => blocks(c.content).replace(/\n+/g, ' ').replace(/\|/g, '\\|')),
      )
      if (rows.length === 0) return ''
      const width = Math.max(...rows.map((r) => r.length))
      const pad = (r: string[]) => `| ${Array.from({ length: width }, (_, i) => r[i] ?? '').join(' | ')} |`
      return [pad(rows[0]), `| ${Array(width).fill('---').join(' | ')} |`, ...rows.slice(1).map(pad)].join('\n')
    }
    case 'inlineMath':
      return `$${String(n.attrs?.latex ?? '')}$`
    case 'blockMath':
      return `$$\n${String(n.attrs?.latex ?? '')}\n$$`
    case 'noteLink':
      return `[[${String(n.attrs?.label ?? 'note')}]]`
    case 'details':
      return `<details>\n${blocks(n.content)}\n</details>`
    case 'detailsSummary':
      return `<summary>${inline(n.content)}</summary>`
    case 'detailsContent':
      return blocks(n.content)
    case 'image': {
      const ext = ctx.imageExt.get(String(n.attrs?.mediaId ?? ''))
      return ext ? `![image](${ctx.prefix}${ATTACH}/${n.attrs?.mediaId}.${ext})` : '*[image]*'
    }
    case 'diagram': {
      const file = ctx.diagrams.get(String(n.attrs?.scene ?? ''))
      return file ? `![schéma](${ctx.prefix}${ATTACH}/${file})` : '*[schéma]*'
    }
    default:
      return n.content ? blocks(n.content) : inline([n])
  }
}

// Pièces jointes (images, schémas) : écrites dans un dossier « attachments » à la racine de l'export.
const ATTACH = 'attachments'
interface Ctx {
  prefix: string
  imageExt: Map<string, string>
  diagrams: Map<string, string> // scène → nom du fichier .svg
}
let ctx: Ctx = { prefix: '', imageExt: new Map(), diagrams: new Map() }

const EXT: Record<string, string> = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/gif': 'gif', 'image/webp': 'webp', 'image/svg+xml': 'svg' }
const hash = (s: string) => {
  let h = 5381
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0
  return (h >>> 0).toString(36)
}

function collect(n: PMNode, images: Set<string>, scenes: Set<string>) {
  if (n.type === 'image' && n.attrs?.mediaId) images.add(String(n.attrs.mediaId))
  if (n.type === 'diagram' && n.attrs?.scene) scenes.add(String(n.attrs.scene))
  n.content?.forEach((c) => collect(c, images, scenes))
}

/** Contenu d'une pièce jointe, lu seulement quand on en a besoin. */
export type Loader = () => Promise<Uint8Array>

async function sceneToSvg(scene: string): Promise<Uint8Array | null> {
  try {
    const { exportToSvg } = await import('@excalidraw/excalidraw')
    const elements = JSON.parse(scene) as Parameters<typeof exportToSvg>[0]['elements']
    const svg = await exportToSvg({ elements, appState: { exportBackground: true, viewBackgroundColor: '#ffffff' }, files: null, exportPadding: 12 })
    return new TextEncoder().encode(new XMLSerializer().serializeToString(svg))
  } catch {
    return null
  }
}

/** Markdown d'une note + ses pièces jointes (nom → contenu). `depth` = nombre de dossiers au-dessus de la note. */
export async function noteToMarkdownFull(id: string, depth = 0): Promise<{ md: string; attachments: Map<string, Loader> }> {
  const { doc, persistence } = getNoteDoc(id)
  await persistence.whenSynced
  const { yXmlFragmentToProseMirrorRootNode } = await import('@tiptap/y-tiptap')
  const { getSchema } = await import('@tiptap/core')
  const { buildExtensions } = await import('../extensions/schema')
  const schema = getSchema(buildExtensions())
  const root = (yXmlFragmentToProseMirrorRootNode(doc.getXmlFragment('content'), schema).toJSON() as PMNode)

  const images = new Set<string>()
  const scenes = new Set<string>()
  collect(root, images, scenes)
  const attachments = new Map<string, Loader>()
  const next: Ctx = { prefix: '../'.repeat(depth), imageExt: new Map(), diagrams: new Map() }
  for (const mediaId of images) {
    const blob = await getMediaBlob(mediaId)
    if (!blob) continue
    const ext = EXT[blob.type] ?? 'bin'
    next.imageExt.set(mediaId, ext)
    attachments.set(`${mediaId}.${ext}`, async () => new Uint8Array(await blob.arrayBuffer()))
  }
  for (const scene of scenes) {
    const name = `schema-${hash(scene)}.svg`
    next.diagrams.set(scene, name)
    attachments.set(name, async () => (await sceneToSvg(scene)) ?? new Uint8Array())
  }
  ctx = next
  try {
    return { md: blocks(root.content).trim() + '\n', attachments }
  } finally {
    ctx = { prefix: '', imageExt: new Map(), diagrams: new Map() }
  }
}

/** Contenu Markdown d'une note (sans son titre, qui sert de nom de fichier ; images et schémas en simple mention). */
export async function noteToMarkdown(id: string): Promise<string> {
  const { md } = await noteToMarkdownFull(id)
  return md
}

export const safe = (name: string) => name.replace(/[\\/:*?"<>|]/g, '-').replace(/\s+/g, ' ').trim() || 'Sans titre'

/** Notes en Markdown + pièces jointes (images, schémas SVG) de toute l'arborescence. Les chemins sont relatifs à la racine de l'export. */
export async function exportMarkdownFull(nodes: TreeNode[]): Promise<{ texts: Map<string, string>; binaries: Map<string, Loader> }> {
  const byId = new Map(nodes.map((n) => [n.id, n]))
  const texts = new Map<string, string>()
  const binaries = new Map<string, Loader>()
  for (const n of nodes) {
    if (n.type !== 'note') continue
    const parts: string[] = []
    let p = n.parentId ? byId.get(n.parentId) : undefined
    while (p) {
      parts.unshift(safe(p.name))
      p = p.parentId ? byId.get(p.parentId) : undefined
    }
    let path = [...parts, `${safe(n.name)}.md`].join('/')
    for (let i = 2; texts.has(path); i++) path = [...parts, `${safe(n.name)} (${i}).md`].join('/')
    const { md, attachments } = await noteToMarkdownFull(n.id, parts.length)
    texts.set(path, `# ${n.name}\n\n${md}`)
    for (const [name, load] of attachments) binaries.set(`${ATTACH}/${name}`, load)
  }
  return { texts, binaries }
}

/** Fichiers .md de toute l'arborescence : chemin relatif → contenu. */
export async function exportMarkdown(nodes: TreeNode[]): Promise<Map<string, string>> {
  const byId = new Map(nodes.map((n) => [n.id, n]))
  const files = new Map<string, string>()
  for (const n of nodes) {
    if (n.type !== 'note') continue
    const parts: string[] = []
    let p = n.parentId ? byId.get(n.parentId) : undefined
    while (p) {
      parts.unshift(safe(p.name))
      p = p.parentId ? byId.get(p.parentId) : undefined
    }
    let path = [...parts, `${safe(n.name)}.md`].join('/')
    for (let i = 2; files.has(path); i++) path = [...parts, `${safe(n.name)} (${i}).md`].join('/')
    files.set(path, `# ${n.name}\n\n${await noteToMarkdown(n.id)}`)
  }
  return files
}
