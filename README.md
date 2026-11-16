# Mine ✏️

Une app de notes **locale d'abord** : tes notes restent sur ton appareil, rien ne part dans un cloud.
Pensée pour les idées, les cours, les todo et le journal.

- **Éditeur riche** (TipTap / ProseMirror) : titres, listes, tâches, tableaux, code, surlignage, polices, couleurs, tailles et un style « crayon gris ».
- **Blocs personnalisés** : définition, exemple, exercice… et tes propres types, avec 21 couleurs ou une couleur libre. Un type peut être global ou réservé à un projet.
- **Mise en page** : 2 ou 3 colonnes, solutions repliables, déplacement des blocs (glisser ou `Alt+↑/↓`).
- **Maths et code** : formules saisies visuellement avec MathLive (`1/3` devient une fraction ; LaTeX possible), rendues par KaTeX, blocs de code colorés avec choix du langage, blocs repliables.
- **Liens entre notes** : tape `[[` pour lier une note ; chaque note affiche les notes qui la mentionnent.
- **Confort** : recherche et remplacement dans la note (`⌘F`), plan des titres, collage de Markdown, typographie française, emoji `:smile:`, temps de lecture.
- **Images** (collage, zoom, redimensionnement) et **schémas** (Excalidraw : formes, flèches, main levée).
- **Arborescence façon IDE** : dossiers, projets avec leur propre todo / idées / journal, onglets, palette `⌘P` avec recherche dans le texte.
- **Note du jour** (bouton de la barre latérale) : crée ou rouvre la note datée d'aujourd'hui, rangée dans « Notes du jour ».
- **Capture rapide** : deux raccourcis (`⌃⌥N` note, `⌃⌥T` tâche, modifiables dans les réglages) ouvrent une petite fenêtre de saisie, même depuis une autre app (app Mac).
- **Corbeille** : supprimer met à la corbeille (annulable), restauration ou suppression définitive.
- **Barre latérale** : redimensionnable en glissant son bord (double-clic pour la largeur d'origine, glissé jusqu'à gauche pour la replier), masquable avec `⌘B`.
- **Mode lecture** (`⌘E`) : la note n'est plus modifiable ; un stylo dessine par-dessus (traits qui s'effacent tout seuls, surligneur, ou traits qui restent) pour réviser.
- **Note de démonstration** : un dossier « Démo Mine » créé au premier lancement (et via les réglages) qui utilise toutes les fonctionnalités.
- **Notes de todo** : uniquement des cases à cocher, avec des liens `[[page]]` (ou création de la page à la volée) vers les pages qui détaillent chaque tâche.
- **Vue « Toutes les todo »** qui agrège les tâches de toutes les notes.
- **Thèmes clair / sombre**, réglages d'affichage, mascotte animée.
- **Données à toi** : sauvegarde JSON complète, export Markdown, et dossier miroir sur le disque (app de bureau).

## Stack

Vite · React 19 · TypeScript · TipTap v3 · Yjs (+ y-indexeddb) · Excalidraw · Tauri 2 (app macOS).

Les notes sont des documents Yjs stockés dans IndexedDB, ce qui prépare une synchronisation entre appareils (pas encore faite).

## Lancer

```bash
cd app
npm install
npm run dev          # http://127.0.0.1:5173
```

### App de bureau (Tauri)

Prérequis : [Rust](https://rustup.rs) et les outils Xcode en ligne de commande.

```bash
cd app
npx tauri dev                     # fenêtre de développement
npx tauri build --bundles app     # Mine.app dans src-tauri/target/release/bundle/macos/
```

Les données de l'app de bureau et celles du navigateur sont séparées.

## Version

Le numéro de version est celui de `app/package.json` (affiché dans les réglages). Pour le changer partout d'un coup (npm, Tauri, Cargo) :

```bash
cd app && npm run set-version -- 0.3.0
```

## État

Voir [PLAN.md](PLAN.md) pour la vision, les jalons et ce qui reste (synchronisation, PWA iPhone).

## Licence

[MIT](LICENSE)
