# Mine — plan de développement

> Mes notes, chez moi. Statut : **plan à valider, aucun code écrit.**
> Mascotte : un petit crayon souriant (maquette : artefact « Mine — maquette de l'app de notes »).

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
| Thèmes | Clair et sombre, suivant le système |
| Appareils | Mac perso, Mac pro, iPhone ; pas de stylet |
| Données | 100 % chez soi (homelab), jamais de cloud tiers, fonctionne hors ligne |

## 3. Choix techniques

- **Base web** : TypeScript + React, livrée en PWA (iPhone) et en app Mac via Tauri à la fin.
- **Éditeur** : TipTap (ProseMirror) avec nœuds personnalisés pour les blocs.
- **Colonnes** : nœud TipTap personnalisé « rangée » contenant 2 ou 3 « colonnes », chacune pouvant recevoir n'importe quel bloc ; sur iPhone les colonnes s'empilent.
- **Projets** : un projet est un dossier spécial de l'arborescence, créé depuis un modèle (sous-dossiers/notes Todo, Idées, Journal préremplis), avec sa propre icône.
- **Schémas** : Excalidraw (MIT), intégré comme un bloc ; choisi à la place de tldraw pour sa licence et son rendu crayon.
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
| **D** | Schémas (tldraw : formes propres, main levée, style crayon) | Schémas |
| **E** | Sync homelab (Yjs + Tailscale HTTPS), PWA iPhone | Les 3 appareils |
| **F** | Recherche, app Mac Tauri, sauvegarde et export Markdown | Finitions |

## 4 bis. Avancement

- **A — fait** (arborescence, projets, éditeur, onglets, palette `⌘P`, thèmes, stockage local Yjs).
- **B — en grande partie fait** : blocs Définition / Exemple / Exercice (avec solution repliable), types de blocs perso (créer, renommer, recolorer, supprimer), menu `/`, colonnes 2 et 3 de largeur égale, déplacement de blocs par poignée jusqu'dans une colonne. Reste : vue d'ensemble des todo.
- **C — fait** : images (collées, déposées ou choisies ; redimensionnables ; zoom par double-clic avec molette) stockées dans IndexedDB, tableaux (colonnes redimensionnables, ajout/suppression de lignes et colonnes).
- **D — fait** : bloc Schéma (formes, flèches, texte, main levée) avec aperçu dans la note et éditeur plein écran, gris crayon et trait rugueux par défaut. **Changement par rapport au plan : Excalidraw (licence MIT, style crayon natif) à la place de tldraw (filigrane et licence à payer hors usage perso).**
- **F (partie web) — fait** : recherche dans le texte des notes (palette `⌘P`), vue « Toutes les todo » (cases cochables depuis la vue), sauvegarde et restauration complètes en un fichier (notes, dossiers, blocs, images).
- **E (sync homelab) : mis de côté à la demande de l'auteur.**
- **Export Markdown — fait** (un .zip qui reprend l'arborescence ; blocs colorés en citations, colonnes empilées, images et schémas en simple mention).
- **App Mac Tauri — fait** : `app/src-tauri` (fenêtre sans barre de titre, icône mascotte, sauvegarde via « Enregistrer sous »). Build : `cd app && npx tauri build --bundles app` → `app/src-tauri/target/release/bundle/macos/Mine.app` (15 Mo). Lancement vérifié. Ses données sont séparées de celles du navigateur : passer par Sauvegarde → Restaurer.
- Reste : PWA iPhone (peu utile sans sync).

Code : `app/` (Vite + React + TypeScript + TipTap + Yjs). Lancer : `cd app && npm run dev`.

## 5. Risques

- **Mémoire limitée du serveur** : serveur Yjs léger, mais machine partagée avec d'autres conteneurs.
- **Safari/iOS** peut vider le stockage d'une PWA peu utilisée : l'ajouter à l'écran d'accueil, et le serveur sert de sauvegarde.
- **Homelab indisponible** : l'écriture continue hors-ligne et se resynchronise ensuite.
- **Périmètre** : « tout est prioritaire en v1 » ; les jalons servent à garder une app utilisable à chaque étape.

## 6. Décisions encore ouvertes

- Choix définitif du nom et de la mascotte (proposition : **Mine**).
- Choix des polices (2-3 candidates « crayon » à tester).
- Format exact des blocs personnalisés (champs, icône, couleur).
- ~~Projets~~ **Décidé** : les projets sont optionnels. Todo, idées et journal globaux existent à côté, pour ce qui n'appartient à aucun projet.
- ~~Vue d'ensemble~~ **Décidé** : une vue qui agrège toutes les todo (globales + de chaque projet), à placer dans le jalon B ou F selon la complexité.
- ~~Colonnes~~ **Décidé** : largeurs égales (2 ou 3 colonnes), pas de redimensionnement dans la v1.

## 7. Prochaine étape

Validation de ce plan et de la maquette par l'auteur. **Aucun code tant que « go » n'est pas dit.**
