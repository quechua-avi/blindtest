# 🎵 BeatBlind — Blindtest Musical Multijoueur

Site de blindtest en temps réel, jouable sur plusieurs appareils simultanément. Musique 2000–2026, 6 genres, +600 titres.

## Prérequis

**Node.js doit être installé.** Si ce n'est pas le cas :
→ Télécharge Node.js LTS sur https://nodejs.org (v20 ou plus)

Vérifie l'installation avec :
```bash
node --version
npm --version
```

---

## Installation & Lancement

```bash
# 1. Ouvre un terminal dans ce dossier
cd C:\Users\mfl01\Documents\Perso\Blindt

# 2. Installe toutes les dépendances (une seule fois)
npm install

# 3. Lance le serveur + le client en même temps
npm run dev
```

Le site sera accessible sur :
- **Client (interface)** → http://localhost:5173
- **Serveur API** → http://localhost:3001

---

## Pour jouer à plusieurs

1. Lance `npm run dev`
2. Ouvre http://localhost:5173 sur **ton appareil**
3. Clique **"Créer une partie"**
4. Partage le **code à 6 lettres** ou le **QR code** affiché
5. Les autres joueurs ouvrent le lien sur leurs appareils et entrent le code

> Sur le même réseau Wi-Fi, remplace `localhost` par l'IP locale de ton PC
> (ex: `192.168.1.X:5173`). Pour jouer hors réseau local, utilise un service
> comme [ngrok](https://ngrok.com) ou déploie sur un serveur.

---

## Fonctionnalités

### Lobby
- Code de salle à 6 caractères + QR code pour rejoindre
- Jusqu'à 16 joueurs par salle
- Configuration complète par l'hôte

### Configuration de partie
| Option | Choix |
|--------|-------|
| **Genres** | Pop, Hip-Hop, Electronic, R&B, Musique Française, Latin |
| **Décennies** | 2000s, 2010s, 2020s |
| **Mode de jeu** | Classique / Speed Round / Équipes / Solo vs IA |
| **Difficulté** | Facile (30s) / Moyen (20s) / Difficile (15s) |
| **Réponse** | Texte libre (fuzzy matching) / Choix multiple |
| **Rounds** | 5 / 10 / 15 / 20 |

### Gameplay
- 🎵 Extraits audio Deezer (30s) via l'API preview
- 🌊 Visualiseur de waveform animé coloré par genre
- ✏️ Fuzzy matching : les fautes de frappe mineures sont acceptées
- ⚡ Score basé sur la vitesse + bonus premier à répondre
- 🔥 Bonus streak pour les séries consécutives
- 📊 Leaderboard animé en temps réel
- 💬 Chat + réactions emoji en jeu

### Fin de partie
- 🏆 Podium animé Top 3
- 🥇 Cartes MVP (plus rapide, plus de bonnes réponses, meilleure série)
- 📋 Historique de toutes les chansons jouées

---

## Structure du projet

```
Blindt/
├── server/          Node.js + Socket.io (port 3001)
│   └── src/
│       ├── game/    Moteur de jeu (GameRoom, ScoreEngine, AIPlayer...)
│       ├── songs/   Bibliothèque ~615 chansons (6 genres × 3 décennies)
│       └── socket/  Handlers en temps réel
└── client/          React + Vite + Tailwind (port 5173)
    └── src/
        ├── pages/   HomePage, LobbyPage, GamePage, ResultsPage
        ├── components/
        └── store/   État Zustand
```

---

## Scripts disponibles

```bash
npm run dev      # Lance serveur + client (recommandé)
npm run build    # Build de production

# Individuellement :
npm run dev --workspace=server   # Serveur seul
npm run dev --workspace=client   # Client seul
```
