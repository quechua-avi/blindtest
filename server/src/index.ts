import express, { type Request, type Response } from 'express'
import { createServer } from 'http'
import { Server } from 'socket.io'
import cors from 'cors'
import path from 'path'
import fs from 'fs'
import jwt from 'jsonwebtoken'
import type { ClientToServerEvents, ServerToClientEvents } from './types'
import { CONFIG } from './config'
import { SONG_LIBRARY } from './songs/songLibrary'
import { registerLobbyHandlers } from './socket/handlers/lobbyHandlers'
import { registerGameHandlers } from './socket/handlers/gameHandlers'
import { registerChatHandlers } from './socket/handlers/chatHandlers'
import { authRouter } from './auth/authRoutes'
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

// Admin — liste des chansons avec URL Deezer
app.get('/api/admin/songs', (req: Request, res: Response) => {
  if (req.query.secret !== CONFIG.ADMIN_SECRET) {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }
  const songs = SONG_LIBRARY.map((s) => ({
    ...s,
    deezerSearchUrl: `https://api.deezer.com/search?q=artist:"${encodeURIComponent(s.artist.replace(/ ft\.?.+$/i, '').trim())}" track:"${encodeURIComponent(s.title)}"&limit=3&output=jsonp`,
    deezerWebUrl: `https://www.deezer.com/search/${encodeURIComponent(`${s.title} ${s.artist}`)}`,
  }))
  res.json({ total: songs.length, songs })
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

httpServer.listen(CONFIG.PORT, () => {
  console.log(`🎵 Blindtest Server → http://localhost:${CONFIG.PORT}`)
})
