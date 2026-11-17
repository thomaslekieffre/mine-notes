# Mine — plan de développement

> Mes notes, chez moi. Statut : **version 0.22.1, utilisable au quotidien** (web + app Mac ; code adapté à Windows, pas encore testé dessus). Dépôt : [mine-notes](https://github.com/thomaslekieffre/mine-notes).
> Mascotte : un petit crayon souriant, animé dans l'app.

## 1. Vision

App de notes personnelle qui remplace 100 % des notes de son auteur : idées, cours, todo, journal.
Une fois ouverte, elle ressemble à un IDE (arborescence, onglets, palette de commandes), en plus simple.

## 2. Besoins

| Besoin | Détail |
|---|---|
| Blocs personnalisés | Définition, exemple, exercice (solution repliable), puis blocs créés par l'utilisateur |
| Mise en forme libre | Plusieurs polices, couleurs de texte, surlignage, tailles variables |
| Police « crayon gris » | Écriture graphite façon crayon, en plus des autres polices |
| Contenu riche | Captures d'écran redimensionnables et zoomables, tableaux, schémas (main levée + formes propres) |
| Colonnes | Placer des blocs côte à côte sur 2 ou 3 colonnes de largeur égale, glisser-déposer d'un bloc dans une colonne |
| Projets | Optionnels. Créer un projet qui contient ses propres todo, idées et journal (et d'autres notes), à partir d'un modèle ; les todo/idées/journal globaux restent disponibles |
| Vue d'ensemble | Une vue unique qui regroupe toutes les todo (globales + de tous les projets) |
| Arborescence | Façon VSCode : dossiers dépliables, glisser-déposer, icônes par type, palette `⌘P` |
| Thèmes et réglages | Clair et sombre, police / taille / largeur de page, mascotte animée, raccourcis modifiables |
| Maths et code | Formules saisies visuellement, blocs de code colorés |
| Liens | Liens entre notes (`[[`), liens entrants, pages créées à la volée depuis une tâche |
| Capture rapide | Écrire une note ou ajouter une tâche depuis n'importe quelle app du Mac |
| Sécurité | Corbeille avec restauration, sauvegarde complète, dossier miroir sur le disque |
| Appareils | Mac perso, Mac pro, iPhone ; pas de stylet ; Windows possible (non testé) |
| Données | 100 % chez soi (homelab), jamais de cloud tiers, fonctionne hors ligne |

## 3. Choix techniques

- **Base web** : TypeScript + React, livrée en PWA (iPhone) et en app Mac via Tauri à la fin.
- **Éditeur** : TipTap (ProseMirror) avec nœuds personnalisés pour les blocs.
- **Colonnes** : nœud TipTap personnalisé « rangée » contenant 2 ou 3 « colonnes », chacune pouvant recevoir n'importe quel bloc ; sur iPhone les colonnes s'empilent.
- **Projets** : un projet est un dossier spécial de l'arborescence, créé depuis un modèle (sous-dossiers/notes Todo, Idées, Journal préremplis), avec sa propre icône.
- **Schémas** : Excalidraw (MIT), intégré comme un bloc ; choisi à la place de tldraw pour sa licence et son rendu crayon.
- **Formules** : MathLive (saisie visuelle, `1/3` devient une fraction) pour écrire, KaTeX pour afficher ; stockées en LaTeX.
- **Code** : lowlight (coloration, langage au choix). **Liens** : nœud `noteLink` qui suit les renommages.
- **Raccourcis** : registre central, modifiable, lu selon la disposition du clavier (AZERTY) ; capture rapide via `tauri-plugin-global-shortcut`.
- **Version** : une seule source (`app/package.json`), `npm run set-version -- X.Y.Z` la propage à Tauri et Cargo.
- **Sync** : Yjs (CRDT), local-first. Chaque appareil garde une copie complète.
- **Serveur** : conteneur Docker (serveur Yjs + SQLite) sur un petit serveur perso, joignable uniquement via Tailscale.
- **HTTPS** : `tailscale serve` (certificat `*.ts.net`), nécessaire pour le mode hors-ligne d'une PWA.
- **Sauvegarde** : export Markdown/JSON régulier vers le stockage du homelab.

## 4. Jalons (ordre validé)

| Jalon | Contenu | Utilisable pour |
|---|---|---|
| **A** | Arborescence + projets (création depuis un modèle Todo / Idées / Journal) + éditeur (texte, titres, listes, todo, polices/couleurs/tailles), stockage local | Écrire au quotidien, ranger par projet |
| **B** | Blocs déf / exemple / exercice, mise en page en 2-3 colonnes, puis système de blocs perso | Les cours |
| **C** | Images (zoom, redimensionnement), tableaux | Cours avec captures |
| **D** | Schémas (Excalidraw : formes propres, main levée, style crayon) | Schémas |
| **E** | Sync homelab (Yjs + Tailscale HTTPS), PWA iPhone | Les 3 appareils |
| **F** | Recherche, app Mac Tauri, sauvegarde et export Markdown | Finitions |

## 4 bis. Avancement

### Jalons du plan initial

- **A — fait** : arborescence, projets, éditeur, onglets, palette `⌘P`, thèmes, stockage local Yjs.
- **B — fait** : blocs Définition / Exemple / Exercice (solution repliable), types de blocs perso, menu `/`, colonnes 2 et 3, déplacement de blocs par poignée.
- **C — fait** : images (collées, déposées, choisies ; redimensionnables ; zoom) dans IndexedDB, tableaux.
- **D — fait** : schémas Excalidraw (formes, flèches, texte, main levée), aperçu dans la note, éditeur plein écran. *Changement par rapport au plan : Excalidraw à la place de tldraw (licence MIT, style crayon natif).*
- **E (sync homelab) — mis de côté** à la demande de l'auteur.
- **F — fait** : recherche dans le texte, vue « Toutes les todo », sauvegarde/restauration complètes, export Markdown, app Mac Tauri.

### Ajouts depuis (versions 0.1 → 0.2.1)

- **Blocs** : 21 couleurs + couleur libre ; types de blocs globaux ou réservés à un projet ; déplacement d'un bloc avec `Alt+↑/↓` (modifiable) ; poignée de glisser agrandie.
- **Texte** : formules (MathLive + KaTeX), code coloré avec choix du langage, blocs repliables, liens `[[note]]` avec liens entrants, collage de Markdown, typographie française, emoji `:smile:`, temps de lecture.
- **Navigation** : recherche et remplacement dans la note (`⌘F`), plan des titres, note du jour (dossier « Notes du jour », classé par date).
- **Todo** : une note de todo ne contient que des cases à cocher ; chaque tâche peut lier une page, créée à la volée si elle n'existe pas ; les liens apparaissent dans « Toutes les todo ».
- **Capture rapide** : raccourcis globaux (`⌃⌥N` note, `⌃⌥T` tâche) qui ouvrent une petite fenêtre depuis n'importe quelle app.
- **Sécurité des données** : corbeille, dossier miroir sur le Mac (notes en Markdown, copie toutes les 10 s).
- **Confort** : réglages (thème, police, taille, largeur, mascotte), raccourcis modifiables avec détection des conflits, mascotte animée, nouvelle icône d'app.
- **Projet** : dépôt public, licence MIT, README, `npm run set-version`.

### Ajouts depuis (versions 0.3 → 0.11)

Accueil (tableau de bord, statistiques d'écriture), historique des versions d'une note, export PDF / impression, icônes personnalisées, barre latérale redimensionnable, mode lecture avec stylo, note de démonstration, export Markdown avec pièces jointes.

### Ajouts depuis (versions 0.12 → 0.22)

- **Échéances et organisation** : date au bout de chaque tâche (en retard en rouge, tri par date), tâches récurrentes (jour / semaine / mois), calendrier du mois, rappel quotidien par notification, favoris dans la barre latérale.
- **Recherche** : étiquettes `#tag` colorées, palette avec filtres `#tag`, `type:`, `projet:` et suggestions.
- **Blocs de page** : sommaire automatique, note intégrée (lecture seule), tableau Kanban.
- **Tableaux** : formules `=SOMME/MOYENNE/MIN/MAX/NB`, tri par colonne, ligne de total.
- **Dictée vocale** : bouton micro (éditeur et capture rapide) via la reconnaissance vocale du système.
- **Windows** : raccourcis et libellés selon le système, workflows GitHub Actions (`ci.yml` : vérifications ; `release.yml` : installeurs Mac + Windows sur un tag `v*`, release en brouillon). *Jamais exécutés pour l'instant.*
- **Démo refaite** (0.22) : couvre toutes ces fonctionnalités ; son dossier est exclu des todo, des stats, du calendrier et des rappels ; elle se remplace une fois au lancement si elle date d'avant.

### Reste à faire

- **Release** : pousser, poser le tag `v…`, vérifier que le workflow construit bien Mac et Windows, tester l'app sous Windows.
- **Non testé dans la fenêtre native** : notifications de rappel, dictée vocale (WKWebView / WebView2), raccourcis globaux, impression PDF, bloc Kanban et note intégrée.
- **Idées écartées ou non faites** : diagrammes Mermaid (abandonné), minuteur Pomodoro (abandonné), graphe des liens, modèles de notes, cartes de révision, mode concentration, objectif de mots, import Markdown / Obsidian, chiffrement.
- **Limites connues** : une tâche récurrente perd l'historique de ses cochages ; la note intégrée est en lecture seule et n'affiche pas ses propres notes intégrées ; le rappel exige que l'app soit ouverte ; fermer la fenêtre sur Mac laisse l'app vivre sans fenêtre (un clic sur le Dock ne la rouvre pas encore).
- **Plus tard** : jalon E (synchronisation homelab + PWA iPhone).

Code : `app/` (Vite + React + TypeScript + TipTap + Yjs + Tauri). Lancer : `cd app && npm run dev`. App Mac : `cd app && npx tauri build --bundles app`.

## 5. Risques

- **Données dans le navigateur** : les notes vivent dans IndexedDB ; sans sync, la sauvegarde JSON et le dossier miroir sont le filet de sécurité.
- **Mémoire limitée du serveur** : serveur Yjs léger, mais machine partagée avec d'autres conteneurs.
- **Safari/iOS** peut vider le stockage d'une PWA peu utilisée : l'ajouter à l'écran d'accueil, et le serveur sert de sauvegarde.
- **Homelab indisponible** : l'écriture continue hors-ligne et se resynchronise ensuite.
- **Périmètre** : « tout est prioritaire en v1 » ; les jalons servent à garder une app utilisable à chaque étape.

## 6. Décisions

- ~~Nom et mascotte~~ **Décidé** : **Mine**, un crayon souriant ; dépôt `mine-notes`.
- ~~Projets~~ **Décidé** : optionnels ; todo, idées et journal globaux existent à côté.
- ~~Vue d'ensemble~~ **Décidé** : une vue qui agrège toutes les todo.
- ~~Colonnes~~ **Décidé** : largeurs égales (2 ou 3), pas de redimensionnement.
- ~~Todo~~ **Décidé** : que des cases à cocher, avec liens vers des pages détaillées.
- ~~Licence~~ **Décidé** : MIT, dépôt public.
- ~~Mermaid et Pomodoro~~ **Écartés** (jugés inutiles).
- **Ouvert** : sync homelab (quand l'auteur voudra) ; modèles de notes.

## 7. Prochaine étape

Finir la mise en ligne : pousser, tag de la première release, vérification des installeurs (Mac et Windows). Ensuite, au choix : corriger la réouverture de la fenêtre depuis le Dock, sync homelab, ou une des idées non faites. Règles de travail : un commit par fonctionnalité, version à changer à chaque livraison (`npm run set-version`).
