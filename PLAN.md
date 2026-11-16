# Mine — plan de développement

> Mes notes, chez moi. Statut : **version 0.2.1, utilisable au quotidien** (web + app Mac). Dépôt : [mine-notes](https://github.com/thomaslekieffre/mine-notes).
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
| Appareils | Mac perso, Mac pro, iPhone ; pas de stylet |
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
- **Todo** : une note de todo ne contient que des cases à cocher (une note qui contient autre chose reste un document normal) ; chaque tâche peut lier une page, créée à la volée si elle n'existe pas ; les liens apparaissent dans « Toutes les todo ».
- **Capture rapide** : raccourcis globaux (`⌃⌥N` note, `⌃⌥T` tâche) qui ouvrent une petite fenêtre depuis n'importe quelle app ; les tâches vont par défaut dans la Todo générale.
- **Sécurité des données** : corbeille (suppression douce, annulation, restauration, suppression définitive), dossier miroir sur le Mac (notes en Markdown, copie mise à jour toutes les 10 s).
- **Confort** : réglages (thème, police, taille, largeur, mascotte), raccourcis tous modifiables avec détection des conflits, mascotte animée (cligne, suit l'écriture, saute, dort), nouvelle icône d'app, version et nom du projet dans « À propos ».
- **Projet** : dépôt public, licence MIT, README, `npm run set-version`.

### Reste à faire

- **Priorité proposée** : modèles de notes, cartes de révision (Question / Réponse + mode « Réviser »), export PDF / impression, mode concentration, historique des versions d'une note, release GitHub avec le `.dmg`, tests automatiques.
- **À rediscuter** : blocs « qui changent la façon de faire » (diagrammes Mermaid, tableau Kanban, minuteur Pomodoro, étiquettes `#tag` et dates, intégrations).
- **Plus tard** : jalon E (synchronisation homelab + PWA iPhone).
- **Non testé dans la fenêtre native** : raccourcis globaux, bouton GitHub, clavier visuel des formules.

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
- **Ouvert** : format exact des modèles de notes ; sync homelab (quand l'auteur voudra).

## 7. Prochaine étape

Choisir dans « Reste à faire » : la suite proposée est modèles de notes, puis cartes de révision. Règles de travail : un commit par fonctionnalité, version à changer à chaque livraison (`npm run set-version`).
