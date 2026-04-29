import express, { type Request, type Response } from 'express'
import { createServer } from 'http'
import { Server } from 'socket.io'
import cors from 'cors'
import path from 'path'
import fs from 'fs'
import jwt from 'jsonwebtoken'
import type { ClientToServerEvents, ServerToClientEvents, Genre } from './types'
import { CONFIG } from './config'
import { GameManager } from './game/GameManager'
import { registerLobbyHandlers } from './socket/handlers/lobbyHandlers'
import { registerGameHandlers } from './socket/handlers/gameHandlers'
import { registerChatHandlers } from './socket/handlers/chatHandlers'
import { authRouter } from './auth/authRoutes'
import { syncCharts, getDynamicSongs, getAllSyncInfos, startChartScheduler, GENRE_PLAYLISTS, patchMissingRanks } from './songs/deezerCharts'
import './db/database'  // init SQLite
import { db } from './db/database'

const app = express()

// En dev, le client Vite tourne sur un port différent → CORS nécessaire
// En prod, client et serveur sont sur la même origine → CORS optionnel mais inoffensif
app.use(cors({ origin: CONFIG.CLIENT_URL }))
app.use(express.json())

const httpServer = createServer(app)

const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
  cors: {
    origin: CONFIG.CLIENT_URL,
    methods: ['GET', 'POST'],
  },
})

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// Auth routes
app.use('/api/auth', authRouter)

// Helpers settings
function getSetting(key: string): string | undefined {
  const row = db.prepare('SELECT value FROM app_settings WHERE key = ?').get(key) as { value: string } | undefined
  return row?.value
}
function setSetting(key: string, value: string) {
  db.prepare('INSERT OR REPLACE INTO app_settings (key, value) VALUES (?, ?)').run(key, value)
}

// GET /api/settings — public, retourne si le mot de passe est requis pour créer une salle
app.get('/api/settings', (_req: Request, res: Response) => {
  res.json({ requireRoomPassword: getSetting('require_room_password') === '1' })
})

// GET /api/admin/settings — paramètres complets (admin)
app.get('/api/admin/settings', (req: Request, res: Response) => {
  if (req.query.secret !== CONFIG.ADMIN_SECRET) { res.status(401).json({ error: 'Unauthorized' }); return }
  res.json({
    requireRoomPassword: getSetting('require_room_password') === '1',
    roomPassword: getSetting('room_password') ?? '',
  })
})

// PUT /api/admin/settings — modifier les paramètres
app.put('/api/admin/settings', (req: Request, res: Response) => {
  if (req.query.secret !== CONFIG.ADMIN_SECRET) { res.status(401).json({ error: 'Unauthorized' }); return }
  const { requireRoomPassword, roomPassword } = req.body ?? {}
  if (typeof requireRoomPassword === 'boolean') {
    setSetting('require_room_password', requireRoomPassword ? '1' : '0')
  }
  if (typeof roomPassword === 'string' && roomPassword.trim().length >= 4) {
    setSetting('room_password', roomPassword.trim())
  }
  res.json({
    requireRoomPassword: getSetting('require_room_password') === '1',
    roomPassword: getSetting('room_password') ?? '',
  })
})

// ─── StreamClash — catalogue dynamique (rapfr depuis DB) ──────────────────────
app.get('/api/streamclash/songs', (_req: Request, res: Response) => {
  const songs = getDynamicSongs('rapfr').filter((s) => !!s.previewUrl)
  res.json(songs)
})

// Admin — liste des chansons (dynamic_songs depuis Deezer)
app.get('/api/admin/songs', (req: Request, res: Response) => {
  if (req.query.secret !== CONFIG.ADMIN_SECRET) {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }
  const dynamic = getDynamicSongs()
  const songs = dynamic.map((s) => {
    const deezerId = s.id.replace('deezer-', '')
    return {
      ...s,
      deezerWebUrl: `https://www.deezer.com/track/${deezerId}`,
      deezerSearchUrl: `https://www.deezer.com/search/${encodeURIComponent(`${s.title} ${s.artist}`)}`,
    }
  })
  res.json({ total: songs.length, songs })
})

// Admin — salles actives
app.get('/api/admin/rooms', (req: Request, res: Response) => {
  if (req.query.secret !== CONFIG.ADMIN_SECRET) {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }
  const rooms = GameManager.getAllRooms().map((r) => r.getPublicState())
  res.json({ total: rooms.length, rooms })
})

// Admin — liste des utilisateurs
app.get('/api/admin/users', (req: Request, res: Response) => {
  if (req.query.secret !== CONFIG.ADMIN_SECRET) {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }
  const users = db.prepare(`
    SELECT u.id, u.email, u.username, u.avatar_color, u.created_at, u.last_login,
           s.games_played, s.games_won, s.total_score, s.best_score, s.correct_answers, s.best_streak
    FROM users u LEFT JOIN user_stats s ON s.user_id = u.id
    ORDER BY u.created_at DESC
  `).all()
  res.json({ total: (users as unknown[]).length, users })
})

// Admin — état des charts + liste des chansons dynamiques
app.get('/api/admin/charts', (req: Request, res: Response) => {
  if (req.query.secret !== CONFIG.ADMIN_SECRET) { res.status(401).json({ error: 'Unauthorized' }); return }
  const source = (req.query.source as string) ?? 'chartsweekly'
  const songs = getDynamicSongs(source)
  const syncInfos = getAllSyncInfos()
  res.json({ songs, syncInfos, currentSource: source })
})

// Admin — déclencher une synchronisation manuelle
app.post('/api/admin/charts/sync', async (req: Request, res: Response) => {
  if (req.query.secret !== CONFIG.ADMIN_SECRET) { res.status(401).json({ error: 'Unauthorized' }); return }
  const genre = ((req.query.source as string) ?? 'chartsweekly') as Genre
  const result = await syncCharts(genre)
  res.json(result)
})

// Admin — statut des previews (songs dynamiques Deezer)
app.get('/api/admin/enrichment', (req: Request, res: Response) => {
  if (req.query.secret !== CONFIG.ADMIN_SECRET) { res.status(401).json({ error: 'Unauthorized' }); return }
  const total = (db.prepare('SELECT COUNT(*) as c FROM dynamic_songs').get() as { c: number }).c
  const cached = (db.prepare("SELECT COUNT(*) as c FROM dynamic_songs WHERE preview_url != ''").get() as { c: number }).c
  res.json({ total, cached, missing: 0, pending: total - cached })
})

// Admin — patch rank pour les chansons sans rank (sans re-sync complet)
app.post('/api/admin/enrichment/patch-rank', async (req: Request, res: Response) => {
  if (req.query.secret !== CONFIG.ADMIN_SECRET) { res.status(401).json({ error: 'Unauthorized' }); return }
  const result = await patchMissingRanks()
  res.json({ ok: true, ...result })
})

// Admin — re-sync toutes les playlists (remplace l'enrichissement statique)
app.post('/api/admin/enrichment/run', async (req: Request, res: Response) => {
  if (req.query.secret !== CONFIG.ADMIN_SECRET) { res.status(401).json({ error: 'Unauthorized' }); return }
  const genres = Object.keys(GENRE_PLAYLISTS) as Genre[]
  const results = []
  for (const g of genres) {
    const r = await syncCharts(g)
    results.push(r)
    await new Promise((resolve) => setTimeout(resolve, 2000))
  }
  res.json({ ok: true, message: `${genres.length} playlists re-syncées`, results })
})

// Admin — supprimer un utilisateur
app.delete('/api/admin/users/:id', (req: Request, res: Response) => {
  if (req.query.secret !== CONFIG.ADMIN_SECRET) {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }
  const userId = parseInt(req.params.id, 10)
  if (isNaN(userId)) { res.status(400).json({ error: 'ID invalide' }); return }
  db.prepare('DELETE FROM users WHERE id = ?').run(userId)
  res.json({ ok: true })
})

// Socket.io — auth middleware (optionnel, permet de lier userId)
io.use((socket, next) => {
  const token = socket.handshake.auth?.token
  if (token) {
    try {
      const payload = jwt.verify(token, CONFIG.JWT_SECRET) as { userId: number }
      socket.data.userId = payload.userId
    } catch {}
  }
  next()
})

io.on('connection', (socket) => {
  console.log(`[Socket] Connexion: ${socket.id}`)

  registerLobbyHandlers(io, socket)
  registerGameHandlers(io, socket)
  registerChatHandlers(io, socket)

  socket.on('disconnect', (reason) => {
    console.log(`[Socket] Déconnexion: ${socket.id} (${reason})`)
  })
})

// Servir le client React en production
// Le serveur tourne depuis la racine du repo sur Railway
// process.cwd() = /app, client/dist = /app/client/dist
// Essaie les deux chemins possibles selon le répertoire de lancement
const clientDistFromRoot = path.join(process.cwd(), 'client', 'dist')
const clientDistFromServer = path.join(__dirname, '..', '..', 'client', 'dist')
const clientDist = fs.existsSync(path.join(clientDistFromRoot, 'index.html'))
  ? clientDistFromRoot
  : clientDistFromServer
console.log(`[Static] cwd=${process.cwd()} → serving from: ${clientDist}`)
app.use(express.static(clientDist))

// Catch-all pour React Router (toutes les routes renvoient index.html)
app.get('*', (_req: Request, res: Response) => {
  res.sendFile(path.join(clientDist, 'index.html'))
})

// Démarrer le scheduler de synchronisation des playlists Deezer (toutes les semaines)
startChartScheduler()


httpServer.listen(CONFIG.PORT, () => {
  console.log(`🎵 Blindtest Server → http://localhost:${CONFIG.PORT}`)
})
