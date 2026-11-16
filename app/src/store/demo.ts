import { getNoteDoc } from './notes'
import { putMedia } from './media'
import { addBlockType, createNode, getBlockTypes } from './tree'

// Dossier de démonstration : une note qui utilise toutes les fonctionnalités de Mine,
// une todo qui renvoie vers une page détaillée, et la page détaillée elle-même.

type Json = { type: string; attrs?: Record<string, unknown>; content?: Json[]; text?: string; marks?: Json[] }

const text = (t: string, ...marks: Json[]): Json => ({ type: 'text', text: t, ...(marks.length ? { marks } : {}) })
const mark = (type: string, attrs?: Record<string, unknown>): Json => ({ type, ...(attrs ? { attrs } : {}) })
const style = (attrs: Record<string, string>) => mark('textStyle', attrs)
const p = (...inline: Json[]): Json => ({ type: 'paragraph', ...(inline.length ? { content: inline } : {}) })
const h = (level: number, t: string): Json => ({ type: 'heading', attrs: { level }, content: [text(t)] })
const li = (...inline: Json[]): Json => ({ type: 'listItem', content: [p(...inline)] })
const task = (checked: boolean, inline: Json[], sub?: Json[]): Json => ({
  type: 'taskItem',
  attrs: { checked },
  content: [p(...inline), ...(sub ? [{ type: 'taskList', content: sub }] : [])],
})
const callout = (kind: string, label: string, color: string, ...content: Json[]): Json => ({
  type: 'callout',
  attrs: { kind, label, color },
  content,
})
const cell = (t: string, header = false): Json => ({ type: header ? 'tableHeader' : 'tableCell', content: [p(text(t))] })
const row = (header: boolean, ...cells: string[]): Json => ({ type: 'tableRow', content: cells.map((c) => cell(c, header)) })
const link = (id: string, label: string): Json => ({ type: 'noteLink', attrs: { id, label } })

async function write(noteId: string, content: Json[], todo = false) {
  const { doc, persistence } = getNoteDoc(noteId)
  await persistence.whenSynced
  const [{ prosemirrorJSONToYXmlFragment }, { getSchema }, { buildExtensions }] = await Promise.all([
    import('@tiptap/y-tiptap'),
    import('@tiptap/core'),
    import('../extensions/schema'),
  ])
  const schema = getSchema(buildExtensions(todo))
  prosemirrorJSONToYXmlFragment(schema, { type: 'doc', content }, doc.getXmlFragment('content'))
}

/** Petite image d'exemple (la mascotte), dessinée à la volée pour ne rien embarquer de lourd. */
async function demoImage(): Promise<string | null> {
  try {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="720" height="300" viewBox="0 0 720 300">
      <rect width="720" height="300" rx="18" fill="#2b2d31"/>
      <g transform="translate(60 22) scale(1.7)">
        <polygon points="60,14 36,58 84,58" fill="#e9c9a0"/><polygon points="60,14 53,28 67,28" fill="#3d4047"/>
        <rect x="30" y="56" width="60" height="76" rx="4" fill="#f2b544"/><rect x="30" y="132" width="60" height="12" fill="#b8bcc4"/>
        <rect x="30" y="144" width="60" height="12" rx="5" fill="#e58b8b"/>
        <circle cx="52" cy="88" r="5" fill="#1e1f22"/><circle cx="72" cy="88" r="5" fill="#1e1f22"/>
        <path d="M54 102Q62 110 70 102" stroke="#1e1f22" stroke-width="3.5" fill="none" stroke-linecap="round"/>
      </g>
      <text x="290" y="130" fill="#dcdee2" font-family="Inter, Helvetica, Arial, sans-serif" font-size="36" font-weight="600">Une image dans la note</text>
      <text x="300" y="175" fill="#a8acb4" font-family="Inter, Helvetica, Arial, sans-serif" font-size="22">Colle une capture, redimensionne-la,</text>
      <text x="300" y="205" fill="#a8acb4" font-family="Inter, Helvetica, Arial, sans-serif" font-size="22">double-clique pour zoomer.</text>
    </svg>`
    const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }))
    const img = new Image()
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve()
      img.onerror = () => reject(new Error('image'))
      img.src = url
    })
    const canvas = document.createElement('canvas')
    canvas.width = 720
    canvas.height = 300
    canvas.getContext('2d')!.drawImage(img, 0, 0)
    URL.revokeObjectURL(url)
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'))
    return blob ? await putMedia(blob) : null
  } catch {
    return null
  }
}

/** Schéma d'exemple (formes propres et flèches), au même style que l'éditeur de schémas. */
async function demoScene(): Promise<string> {
  try {
    const { convertToExcalidrawElements } = await import('@excalidraw/excalidraw')
    const base = { strokeColor: '#868e96', roughness: 1, strokeWidth: 2 } as const
    const elements = convertToExcalidrawElements([
      { type: 'rectangle', x: 0, y: 40, width: 150, height: 70, label: { text: 'Idée', fontSize: 22 }, ...base },
      { type: 'ellipse', x: 260, y: 30, width: 170, height: 90, label: { text: 'Note', fontSize: 22 }, ...base },
      { type: 'diamond', x: 540, y: 15, width: 190, height: 120, label: { text: 'Projet', fontSize: 22 }, ...base },
      { type: 'arrow', x: 155, y: 75, width: 100, height: 0, endArrowhead: 'arrow', ...base },
      { type: 'arrow', x: 435, y: 75, width: 100, height: 0, endArrowhead: 'arrow', ...base },
    ])
    return JSON.stringify(elements)
  } catch {
    return ''
  }
}

/** Crée le dossier « Démo Mine » et renvoie l'identifiant de la note principale. */
export async function createDemo(): Promise<string> {
  // Deux types de blocs perso pour la démo, s'ils n'existent pas déjà.
  const types = getBlockTypes()
  if (!types.some((t) => t.label === 'Théorème')) addBlockType('Théorème', 'purple')
  if (!types.some((t) => t.label === 'Astuce')) addBlockType('Astuce', 'emerald')

  const folder = createNode(null, 'folder', 'Démo Mine')
  const main = createNode(folder, 'note', 'Démo : toutes les fonctionnalités')
  const todo = createNode(folder, 'note', 'Démo : une todo', 'todo')
  const detail = createNode(folder, 'note', 'Feature A (page détaillée)')

  const [mediaId, scene] = await Promise.all([demoImage(), demoScene()])
  const blue = 'var(--c-blue)'

  const doc: Json[] = [
    h(1, 'Bienvenue dans Mine ✏️'),
    p(
      text('Cette note utilise '),
      text('toutes', mark('bold')),
      text(' les fonctionnalités de Mine. Parcours-la, modifie-la, casse-la : elle est là pour ça. Tape '),
      text('/', mark('code')),
      text(' pour insérer un bloc, '),
      text('[[', mark('code')),
      text(' pour lier une page.'),
    ),

    h(2, '1. Mise en forme du texte'),
    p(
      text('Du '),
      text('gras', mark('bold')),
      text(', de l’'),
      text('italique', mark('italic')),
      text(', du '),
      text('souligné', mark('underline')),
      text(', du '),
      text('barré', mark('strike')),
      text(', du '),
      text('code en ligne', mark('code')),
      text(' et du texte '),
      text('surligné', mark('highlight', { color: 'var(--h-yellow)' })),
      text(' (quatre couleurs : '),
      text('jaune', mark('highlight', { color: 'var(--h-yellow)' })),
      text(', '),
      text('vert', mark('highlight', { color: 'var(--h-green)' })),
      text(', '),
      text('bleu', mark('highlight', { color: 'var(--h-blue)' })),
      text(', '),
      text('rose', mark('highlight', { color: 'var(--h-pink)' })),
      text(').'),
    ),
    p(
      text('Des couleurs : '),
      text('rouge ', style({ color: 'var(--c-red)' })),
      text('orange ', style({ color: 'var(--c-orange)' })),
      text('vert ', style({ color: 'var(--c-green)' })),
      text('bleu ', style({ color: 'var(--c-blue)' })),
      text('violet', style({ color: 'var(--c-purple)' })),
      text('. Des tailles : '),
      text('petit ', style({ fontSize: '12px' })),
      text('normal ', style({ fontSize: '16px' })),
      text('grand ', style({ fontSize: '24px' })),
      text('énorme', style({ fontSize: '32px' })),
      text('.'),
    ),
    p(
      text('Des polices : '),
      text('Inter par défaut, '),
      text('le crayon gris façon cahier, ', style({ fontFamily: 'Kalam, cursive', color: 'var(--c-graphite)', fontSize: '20px' })),
      text('une Serif classique, ', style({ fontFamily: "Georgia, 'Times New Roman', serif" })),
      text('et de la Mono.', style({ fontFamily: "'JetBrains Mono', monospace" })),
    ),
    p(text('Et des emoji en tapant '), text(':smile:', mark('code')), text(' → 😄, des « guillemets français » et des liens '), text('https://github.com/thomaslekieffre/mine-notes', mark('link', { href: 'https://github.com/thomaslekieffre/mine-notes' })), text('.')),

    h(2, '2. Titres, listes, citations'),
    h(3, 'Un titre de niveau 3'),
    { type: 'bulletList', content: [li(text('Une liste à puces')), li(text('avec plusieurs éléments'))] },
    { type: 'orderedList', content: [li(text('Une liste numérotée')), li(text('dans l’ordre'))] },
    { type: 'taskList', content: [task(true, [text('Une case déjà cochée')]), task(false, [text('Une case à cocher')], [task(false, [text('avec une sous-tâche')])])] },
    { type: 'blockquote', content: [p(text('Une citation : « Ce qu’on sait bien, on l’écrit bien. »'))] },
    { type: 'horizontalRule' },

    h(2, '3. Blocs colorés pour les cours'),
    callout('definition', 'Définition', 'var(--c-blue)', p(text('Une '), text('limite', mark('bold')), text(' décrit le comportement d’une fonction près d’un point.'))),
    callout('example', 'Exemple', 'var(--c-green)', p(text('La limite de sin(x)/x en 0 vaut 1.'))),
    callout('exercise', 'Exercice', 'var(--c-orange)', p(text('Calculer la limite de (x² − 1)/(x − 1) quand x tend vers 1.')), {
      type: 'solution',
      attrs: { open: false },
      content: [p(text('On factorise : (x − 1)(x + 1)/(x − 1) = x + 1, donc la limite vaut 2. Clique sur « Solution » pour replier ou déplier.'))],
    }),
    callout('theoreme', 'Théorème', 'var(--c-purple)', p(text('Un bloc perso : crée tes propres types (nom + couleur) avec « Gérer les types de blocs » dans le menu '), text('/', mark('code')), text('. Ils peuvent être réservés à un projet.'))),
    callout('astuce', 'Astuce', 'var(--c-emerald)', p(text('21 couleurs au choix, plus une couleur libre.'))),

    h(2, '4. Colonnes'),
    {
      type: 'columns',
      content: [
        { type: 'column', content: [callout('definition', 'Définition', blue, p(text('Colonne 1')))] },
        { type: 'column', content: [p(text('Colonne 2 : du texte normal. Glisse un bloc avec la poignée ⋮⋮ pour le déplacer, ou utilise Alt + ↑ / ↓.'))] },
        { type: 'column', content: [callout('example', 'Exemple', 'var(--c-green)', p(text('Colonne 3')))] },
      ],
    },

    h(2, '5. Maths'),
    p(text('Une formule dans le texte : '), { type: 'inlineMath', attrs: { latex: 'E = mc^2' } }, text('. Clique dessus pour la modifier : tu tapes comme au clavier (1/3 devient une fraction).')),
    { type: 'blockMath', attrs: { latex: '\\int_0^1 x^2\\,dx = \\frac{1}{3}' } },
    { type: 'blockMath', attrs: { latex: '\\sum_{k=1}^{n} k = \\frac{n(n+1)}{2}' } },

    h(2, '6. Code coloré'),
    { type: 'codeBlock', attrs: { language: 'javascript' }, content: [text('// Le langage se choisit en haut à droite du bloc\nfunction bonjour(nom) {\n  return `Salut ${nom} !`\n}\nconsole.log(bonjour("Mine"))')] },
    { type: 'codeBlock', attrs: { language: 'python' }, content: [text('def carre(n):\n    """Retourne n au carré."""\n    return n * n\n\nprint([carre(i) for i in range(5)])')] },

    h(2, '7. Tableau'),
    {
      type: 'table',
      content: [
        row(true, 'Fonctionnalité', 'Raccourci', 'Où ?'),
        row(false, 'Chercher une note', '⌘P', 'Partout'),
        row(false, 'Chercher dans la note', '⌘F', 'Éditeur'),
        row(false, 'Capture rapide', '⌃⌥N / ⌃⌥T', 'Depuis n’importe quelle app'),
      ],
    },

    h(2, '8. Image et schéma'),
    ...(mediaId ? [{ type: 'image', attrs: { mediaId, width: 520 } }] : [p(text('(Image d’exemple indisponible.)'))]),
    ...(scene ? [{ type: 'diagram', attrs: { scene } }] : [p(text('(Schéma d’exemple indisponible.)'))]),
    p(text('Double-clique sur le schéma pour le modifier : formes propres, flèches, texte et main levée.', style({ color: 'var(--c-graphite)' }))),

    h(2, '9. Bloc repliable'),
    {
      type: 'details',
      attrs: { open: false },
      content: [
        { type: 'detailsSummary', content: [text('Clique pour déplier')] },
        { type: 'detailsContent', content: [p(text('Voilà un contenu masqué. Utile pour les démonstrations ou les détails.'))] },
      ],
    },

    h(2, '10. Liens entre notes'),
    p(text('Tape '), text('[[', mark('code')), text(' pour lier une page. Par exemple : '), link(detail, 'Feature A (page détaillée)'), text(' ou la todo '), link(todo, 'Démo : une todo'), text('. Chaque note affiche en bas celles qui la mentionnent.')),

    h(2, '11. Et aussi, dans l’app'),
    { type: 'bulletList', content: [
      li(text('Projets', mark('bold')), text(' avec leur propre Todo, Idées et Journal.')),
      li(text('Toutes les todo', mark('bold')), text(' : une vue qui regroupe les cases de toutes les notes.')),
      li(text('Note du jour', mark('bold')), text(' : un clic crée la note datée d’aujourd’hui.')),
      li(text('Capture rapide', mark('bold')), text(' : ⌃⌥N pour une note, ⌃⌥T pour une tâche, depuis n’importe quelle app.')),
      li(text('Corbeille', mark('bold')), text(' : rien n’est perdu, tu peux tout restaurer.')),
      li(text('Plan', mark('bold')), text(' de la note, '), text('recherche', mark('bold')), text(' et '), text('remplacement', mark('bold')), text(' (⌘F).')),
      li(text('Sauvegarde', mark('bold')), text(' complète, export Markdown et dossier miroir sur le Mac.')),
      li(text('Réglages', mark('bold')), text(' : thème, police, taille, largeur, mascotte animée, raccourcis modifiables.')),
    ] },
    p(text('Fin de la visite. Supprime ce dossier quand tu veux : il part à la corbeille. 🗑️')),
  ]

  const todoDoc: Json[] = [
    {
      type: 'taskList',
      content: [
        task(false, [text('Lire la '), link(main, 'Démo : toutes les fonctionnalités')]),
        task(false, [text('Faire la feature A '), link(detail, 'Feature A (page détaillée)')]),
        task(true, [text('Cocher cette case')]),
        task(false, [text('Une tâche avec des sous-tâches')], [task(false, [text('première étape')]), task(false, [text('deuxième étape')])]),
      ],
    },
  ]

  const detailDoc: Json[] = [
    p(text('Voici la page qui explique la feature A en détail. Elle est liée depuis la todo : un clic sur le lien dans la tâche ouvre cette page.')),
    h(2, 'Objectif'),
    p(text('Décrire ce qu’on veut faire, pourquoi, et comment on saura que c’est terminé.')),
    callout('example', 'Exemple', 'var(--c-green)', p(text('Dans une todo, tape [[ puis un nom : si la page n’existe pas, Mine propose de la créer.'))),
    h(2, 'Étapes'),
    { type: 'taskList', content: [task(false, [text('Écrire la spécification')]), task(false, [text('Implémenter')]), task(false, [text('Tester')])] },
    p(text('Retour à la '), link(main, 'visite complète'), text('.')),
  ]

  await write(main, doc)
  await write(todo, todoDoc, true)
  await write(detail, detailDoc)
  return main
}
