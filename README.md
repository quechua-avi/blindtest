# BeatBlind — Blindtest Musical Multijoueur

Blindtest en temps réel, jouable sur plusieurs appareils simultanément. Extraits audio Deezer (30 s), 9 genres, jusqu'à 16 joueurs par salle.

---

## Prérequis

- **Node.js v20+** → [nodejs.org](https://nodejs.org)

```bash
node --version   # doit afficher v20.x.x ou plus
npm --version
```

---

## Déploiement Railway

### 1. Créer le projet Railway

- Connecter le dépôt GitHub
- Railway détecte automatiquement le `nixpacks.toml` : build avec `npm run build`, démarrage avec `node server/dist/index.js`

### 2. Variables d'environnement Railway

| Variable | Description | Exemple |
|----------|-------------|---------|
| `ADMIN_SECRET` | Clé d'accès à la page admin | `mon-secret-admin` |
| `JWT_SECRET` | Clé de signature des tokens auth | `une-longue-chaine-aleatoire` |
| `CLIENT_URL` | Origine autorisée pour CORS | `https://mon-app.railway.app` |
| `PORT` | (optionnel) Railway le définit automatiquement | `3001` |

> `CLIENT_URL` doit correspondre exactement à l'URL publique de l'app. En mode Railway tout-en-un (client servi par le serveur), mettre l'URL Railway elle-même.

### 3. Volume persistant

La base SQLite est stockée dans `data/beatblind.db`. Sur Railway, créer un volume persistant monté sur `/app/data` pour que les données survivent aux redéploiements.

### 4. Première synchronisation des playlists

Au premier démarrage, le scheduler tente de synchroniser les 9 playlists Deezer. Si le serveur s'est démarré mais que certains genres n'ont pas de chansons (rate-limit Deezer au démarrage) :

1. Ouvrir la **page admin** → `https://mon-app.railway.app/admin?secret=ADMIN_SECRET`
2. Section **Enrichissement / Playlists** → cliquer **Re-sync toutes les playlists**
3. Attendre ~20 secondes (9 genres × 2 s de délai anti-rate-limit)
4. Vérifier que chaque genre affiche un nombre de chansons > 0

---

## Page admin

Accessible à `/admin?secret=ADMIN_SECRET` (ou en dev : `http://localhost:5173/admin`).

| Section | Contenu |
|---------|---------|
| Salles actives | Liste des parties en cours |
| Chansons | Catalogue complet par genre |
| Charts / Playlists | État des syncs Deezer, déclenchement manuel |
| Enrichissement | Couverture des previews par genre |
| Paramètres | Mot de passe requis pour créer une salle |
| Utilisateurs | Comptes inscrits, statistiques |

---

## Genres et playlists Deezer

| Genre (clé) | Label affiché | Playlist Deezer |
|-------------|---------------|-----------------|
| `chartsweekly` | Top France | Deezer Charts France |
| `rapfr` | Rap Français | Rap Soirée FR 2010–2026 |
| `jul` | Jul | 100% Jul |
| `varfr` | Variété FR | Bleu Blanc Hits |
| `hits2000` | Années 2000 | 00s Hits |
| `hits2010` | Années 2010 | 10s HITS |
| `hits2020` | Années 2020 | 20s Hits |
| `electronic` | Electronic | Electronic Hits |
| `latino` | Latino | Fuego Latino |

Les playlists se re-synchronisent automatiquement toutes les **7 jours**.

### Ajouter un nouveau genre

1. Trouver la playlist sur deezer.com — copier l'ID depuis l'URL (`deezer.com/playlist/{ID}`)
2. Dans `server/src/types.ts`, ajouter la clé au type `Genre`
3. Dans `server/src/songs/deezerCharts.ts`, ajouter une entrée dans `GENRE_PLAYLISTS`
4. Dans `client/src/types/game.ts`, ajouter la clé dans `Genre`, `GENRE_LABELS` et `GENRE_COLORS`
5. Dans `client/src/components/lobby/SettingsPanel.tsx`, ajouter la clé dans le tableau `GENRES`
6. Dans `client/src/pages/HomePage.tsx`, ajouter le badge dans `GENRES`
7. Redéployer → la synchronisation se déclenche automatiquement au démarrage

---

## Structure du projet

```
Blindt/
├── nixpacks.toml           # Config Railway (build + start)
├── package.json            # npm workspaces root
│
├── server/
│   └── src/
│       ├── index.ts        # Express + Socket.io
│       ├── config.ts       # Variables d'environnement
│       ├── db/database.ts  # SQLite (init automatique)
│       ├── game/           # Moteur de jeu (GameRoom, ScoreEngine...)
│       ├── songs/
│       │   ├── deezerCharts.ts   # Sync playlists Deezer → DB
│       │   └── songSelector.ts   # Sélection + génération des choix
│       ├── matching/       # Fuzzy matching (Levenshtein)
│       ├── auth/           # JWT, routes /api/auth
│       └── socket/         # Handlers lobby / game / chat
│
└── client/
    └── src/
        ├── pages/          # HomePage, LobbyPage, GamePage, ResultsPage, AdminPage
        ├── components/     # UI, lobby, game, results
        ├── store/          # Zustand (useGameStore, usePlayerStore, useAuthStore)
        └── types/game.ts   # Types partagés, GENRE_LABELS, GENRE_COLORS
```

---

## Scripts

```bash
npm run dev      # Serveur + client en parallèle (développement)
npm run build    # Build de production (serveur TS + client Vite)

# Espaces de travail individuels :
npm run dev --workspace=server
npm run dev --workspace=client
```
