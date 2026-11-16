import { getNoteDoc } from './notes'
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
        .map((li) => `- [${li.attrs?.checked ? 'x' : ' '}] ${indent(blocks(li.content), '  ').trimStart()}`)
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
    case 'image':
      return '*[image]*'
    case 'diagram':
      return '*[schéma]*'
    default:
      return n.content ? blocks(n.content) : inline([n])
  }
}

/** Contenu Markdown d'une note (sans son titre, qui sert de nom de fichier). */
export async function noteToMarkdown(id: string): Promise<string> {
  const { doc, persistence } = getNoteDoc(id)
  await persistence.whenSynced
  const { yXmlFragmentToProseMirrorRootNode } = await import('@tiptap/y-tiptap')
  const { getSchema } = await import('@tiptap/core')
  const { buildExtensions } = await import('../extensions/schema')
  const schema = getSchema(buildExtensions())
  const root = yXmlFragmentToProseMirrorRootNode(doc.getXmlFragment('content'), schema)
  return blocks((root.toJSON() as PMNode).content).trim() + '\n'
}

export const safe = (name: string) => name.replace(/[\\/:*?"<>|]/g, '-').replace(/\s+/g, ' ').trim() || 'Sans titre'

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
