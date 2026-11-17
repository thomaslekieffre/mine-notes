<div align="center">

<img src="app/src-tauri/icons/128x128.png" width="96" alt="Mine, un petit crayon souriant" />

# Mine

**Tes notes, chez toi.** Une app de notes *locale d'abord* pour les idées, les cours, les todo et le journal : rien ne part dans un cloud.

![Vite](https://img.shields.io/badge/Vite-React%2019-646cff?logo=vite&logoColor=white)
![TipTap](https://img.shields.io/badge/%C3%89diteur-TipTap%20v3-0b0b0b)
![Tauri](https://img.shields.io/badge/App%20Mac%20%2B%20Windows-Tauri%202-24c8db?logo=tauri&logoColor=white)
![Local first](https://img.shields.io/badge/donn%C3%A9es-100%25%20locales-3ba55d)
[![Licence MIT](https://img.shields.io/badge/licence-MIT-blue)](LICENSE)

![Démo de Mine : blocs colorés, maths, code, schémas, échéances, Kanban, palette avec étiquettes, accueil, calendrier, mode lecture avec stylo, thème clair](docs/media/demo.gif)

<sub>Version vidéo plus nette : [docs/media/demo.mp4](docs/media/demo.mp4)</sub>

</div>

## Aperçu

<table>
<tr>
<td width="50%"><img src="docs/media/hero-dark.png" alt="Éditeur, thème sombre" /><br/><sub><b>Éditeur riche</b> · thème sombre</sub></td>
<td width="50%"><img src="docs/media/hero-light.png" alt="Éditeur, thème clair" /><br/><sub><b>Thème clair</b> · polices, couleurs, surlignage</sub></td>
</tr>
<tr>
<td><img src="docs/media/blocs.png" alt="Blocs colorés et colonnes" /><br/><sub><b>Blocs colorés</b> (définition, exemple, exercice avec solution repliable…) et <b>colonnes</b></sub></td>
<td><img src="docs/media/maths.png" alt="Formules mathématiques" /><br/><sub><b>Maths</b> saisies visuellement (MathLive + KaTeX)</sub></td>
</tr>
<tr>
<td><img src="docs/media/code.png" alt="Blocs de code colorés" /><br/><sub><b>Code</b> coloré, langage au choix</sub></td>
<td><img src="docs/media/image-schema.png" alt="Image et schéma Excalidraw" /><br/><sub><b>Images</b> et <b>schémas</b> Excalidraw</sub></td>
</tr>
<tr>
<td><img src="docs/media/echeances.png" alt="Tâches avec échéances et répétitions" /><br/><sub><b>Échéances</b> et <b>tâches récurrentes</b> : une pastille de date au bout de chaque tâche</sub></td>
<td><img src="docs/media/kanban.png" alt="Tableau Kanban" /><br/><sub><b>Kanban</b> : des cartes à glisser d'une colonne à l'autre</sub></td>
</tr>
<tr>
<td><img src="docs/media/sommaire.png" alt="Sommaire automatique" /><br/><sub><b>Sommaire</b> toujours à jour (et <b>note intégrée</b> : le contenu d'une autre note, en direct)</sub></td>
<td><img src="docs/media/tableau.png" alt="Tableau avec formules" /><br/><sub><b>Tableaux</b> : <code>=MOYENNE(B)</code>, <code>=SOMME(C)</code>, tri, ligne de total</sub></td>
</tr>
<tr>
<td><img src="docs/media/etiquettes.png" alt="Étiquettes colorées dans le texte" /><br/><sub><b>Étiquettes</b> <code>#tag</code> colorées dans le texte</sub></td>
<td><img src="docs/media/palette.png" alt="Palette de commandes avec filtre d'étiquette" /><br/><sub><b>Palette <code>⌘P</code></b> : recherche dans le texte et filtres (<code>#cours</code>, <code>type:todo</code>, <code>projet:…</code>)</sub></td>
</tr>
<tr>
<td><img src="docs/media/accueil.png" alt="Accueil : tâches, notes récentes, statistiques" /><br/><sub><b>Accueil</b> : tâches (en retard en rouge), notes récentes, série d'écriture, statistiques</sub></td>
<td><img src="docs/media/calendrier.png" alt="Calendrier du mois" /><br/><sub><b>Calendrier</b> : notes du jour et échéances sur le mois</sub></td>
</tr>
<tr>
<td><img src="docs/media/lecture.png" alt="Mode lecture avec stylo" /><br/><sub><b>Mode lecture <code>⌘E</code></b> : le stylo dessine par-dessus la note</sub></td>
<td><img src="docs/media/liens.png" alt="Liens entre notes" /><br/><sub><b>Liens</b> <code>[[note]]</code> et notes qui te mentionnent</sub></td>
</tr>
<tr>
<td colspan="2"><img src="docs/media/reglages.png" alt="Réglages" width="50%" /><br/><sub><b>Réglages</b> : thème, police, largeur, rappel quotidien, raccourcis, sauvegarde</sub></td>
</tr>
</table>

> Les pages d'édition viennent de la **note de démonstration** livrée avec l'app (dossier « Démo Mine », créé au premier lancement ou depuis les réglages). Ses tâches ne comptent ni dans « Toutes les todo », ni dans l'accueil, ni dans les rappels. L'accueil et le calendrier montrent des notes d'exemple.

## Fonctionnalités

- **Éditeur riche** (TipTap / ProseMirror) : titres, listes, tâches, tableaux, code, surlignage, polices, couleurs, tailles et un style « crayon gris ».
- **Blocs personnalisés** : définition, exemple, exercice… et tes propres types, avec 21 couleurs ou une couleur libre. Un type peut être global ou réservé à un projet.
- **Mise en page** : 2 ou 3 colonnes (glisse un bloc sur le bord gauche ou droit d'un autre : les deux passent côte à côte, une troisième colonne s'ajoute en recommençant), solutions repliables, déplacement des blocs (glisser ou `Alt+↑/↓`).
- **Maths et code** : formules saisies visuellement avec MathLive (`1/3` devient une fraction ; LaTeX possible), rendues par KaTeX, blocs de code colorés avec choix du langage, blocs repliables.
- **Liens entre notes** : tape `[[` pour lier une note ; chaque note affiche les notes qui la mentionnent.
- **Confort** : recherche et remplacement dans la note (`⌘F`), plan des titres, collage de Markdown, typographie française, emoji `:smile:`, temps de lecture.
- **Images** (collage, zoom, redimensionnement) et **schémas** (Excalidraw : formes, flèches, main levée).
- **Arborescence façon IDE** : dossiers, projets avec leur propre todo / idées / journal, onglets, palette `⌘P` avec recherche dans le texte.
- **Note du jour** (bouton de la barre latérale) : crée ou rouvre la note datée d'aujourd'hui, rangée dans « Notes du jour ».
- **Capture rapide** : deux raccourcis (`⌃⌥N` note, `⌃⌥T` tâche, modifiables dans les réglages) ouvrent une petite fenêtre de saisie, même depuis une autre app (app Mac).
- **Corbeille** : supprimer met à la corbeille (annulable), restauration ou suppression définitive.
- **Accueil** (`⌘⇧D`) : tableau de bord avec les tâches à faire, les notes récemment modifiées, l'avancement des projets et des statistiques d'écriture (série de jours, mots par jour, carte d'activité, répartition des notes).
- **Historique des versions** (`⌘⇧H`, ou le bouton horloge) : des instantanés pris 30 secondes après chaque pause d'écriture (40 gardés par note) ; aperçu en lecture seule et restauration d'une version.
- **Export PDF** (`⌘⇧E`, ou le bouton imprimante) : feuille de style d'impression qui ne garde que la note, en clair ; dans l'app Mac, « Enregistrer au format PDF » depuis la fenêtre d'impression.
- **Icônes personnalisées** : clic droit sur une note, un dossier ou un projet, « Changer l'icône… » (42 icônes colorables ou des emoji) ; les dossiers ont une icône ouverte/fermée.
- **Barre latérale** : redimensionnable en glissant son bord (double-clic pour la largeur d'origine, glissé jusqu'à gauche pour la replier), masquable avec `⌘B`.
- **Mode lecture** (`⌘E`) : la note n'est plus modifiable ; un stylo dessine par-dessus (traits qui s'effacent tout seuls, surligneur, ou traits qui restent) pour réviser.
- **Note de démonstration** : un dossier « Démo Mine » créé au premier lancement (et via les réglages, qui le recréent) qui utilise toutes les fonctionnalités ; ses tâches sont exclues des todo, des stats et des rappels.
- **Notes de todo** : uniquement des cases à cocher, avec des liens `[[page]]` (ou création de la page à la volée) vers les pages qui détaillent chaque tâche.
- **Échéances** : chaque tâche peut avoir une date (pastille « + date » au bout de la ligne : aujourd'hui, demain, lundi, ou un jour précis) ; en retard en rouge, tri par date dans l'accueil et « Toutes les todo », date possible depuis la capture rapide.
- **Tâches récurrentes** : chaque jour, semaine ou mois ; cocher la tâche repousse l'échéance et la laisse décochée.
- **Vue « Toutes les todo »** qui agrège les tâches de toutes les notes.
- **Étiquettes** : `#tag` n'importe où dans une note (coloré ; `Ctrl/⌘`+clic lance la recherche). La palette filtre avec `#tag`, `type:todo`, `projet:nom`, avec suggestions (Tab pour compléter).
- **Favoris** : clic droit sur une note ou un dossier, « Épingler dans les favoris » ; section FAVORIS en haut de la barre latérale.
- **Calendrier** : le mois avec les notes du jour et les échéances ; un clic sur un jour ouvre ou crée sa note.
- **Rappel quotidien** (réglable dans les réglages) : une notification avec les tâches du jour et en retard, à l'heure choisie (l'app doit être ouverte).
- **Blocs de page** : `/sommaire` (plan automatique), `/note intégrée` (le contenu d'une autre note, en direct, en lecture seule), `/kanban` (colonnes de cartes à glisser).
- **Tableaux** : formules `=SOMME(B)`, `=MOYENNE`, `=MIN`, `=MAX`, `=NB` (colonne ou plage), tri par colonne, ligne de total.
- **Dictée vocale** : bouton micro dans l'éditeur et dans la capture rapide, avec « virgule », « point », « à la ligne ». Elle passe par la reconnaissance vocale du système : sur Mac c'est celle d'Apple, sur Windows elle peut envoyer l'audio à un service en ligne ; le bouton n'apparaît pas si le système ne la propose pas.
- **Thèmes clair / sombre**, réglages d'affichage, mascotte animée.
- **Données à toi** : sauvegarde JSON complète, export Markdown, et dossier miroir sur le disque (app de bureau).

## Stack

Vite · React 19 · TypeScript · TipTap v3 · Yjs (+ y-indexeddb) · Excalidraw · Tauri 2 (app macOS et Windows).

Les notes sont des documents Yjs stockés dans IndexedDB, ce qui prépare une synchronisation entre appareils (pas encore faite).

## Télécharger

Les installeurs (Mac Apple Silicon ou Intel : `.dmg` ; Windows : `.exe` / `.msi`) sont dans les [releases](https://github.com/thomaslekieffre/mine-notes/releases). Ils ne sont pas signés :

- **Mac** : au premier lancement, clic droit sur Mine > Ouvrir (ou Réglages Système > Confidentialité et sécurité > « Ouvrir quand même »).
- **Windows** : SmartScreen affiche « Windows a protégé votre ordinateur » : clique sur « Informations complémentaires » puis « Exécuter quand même ».

Le code est adapté à Windows (raccourcis, installeurs), mais l'app n'a pas encore été testée sur cette plateforme. Sur Windows, les raccourcis utilisent `Ctrl` à la place de `⌘` (et `Alt+Maj+N` / `Alt+Maj+T` pour la capture rapide) ; ils restent modifiables dans les réglages.

## Essayer

```bash
git clone https://github.com/thomaslekieffre/mine-notes.git
cd mine-notes/app
npm install
npm run dev          # http://127.0.0.1:5173
```

Au premier lancement, la note « Démo : toutes les fonctionnalités » te fait faire le tour.

### App de bureau (Tauri)

Prérequis : [Rust](https://rustup.rs), et les outils Xcode en ligne de commande (Mac) ou les « Outils de génération C++ » de Visual Studio et WebView2 (Windows).

```bash
cd app
npx tauri dev                     # fenêtre de développement
npx tauri build --bundles app     # Mac : Mine.app dans src-tauri/target/release/bundle/macos/
npx tauri build                   # Windows : installeurs dans src-tauri/target/release/bundle/
```

Les données de l'app de bureau et celles du navigateur sont séparées.

## Version

Le numéro de version est celui de `app/package.json` (affiché dans les réglages). Pour le changer partout d'un coup (npm, Tauri, Cargo) :

```bash
cd app && npm run set-version -- 0.23.0
```

### Publier une version

Changer le numéro (`npm run set-version -- X.Y.Z`), commit, puis pousser un tag : GitHub Actions construit les installeurs Mac et Windows et prépare une release en brouillon.

```bash
git tag vX.Y.Z && git push origin vX.Y.Z
```

## État

Voir [PLAN.md](PLAN.md) pour la vision, les jalons et ce qui reste (synchronisation, PWA iPhone).

## Licence

[MIT](LICENSE)
