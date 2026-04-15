import express from 'express'
import { createServer } from 'http'
import { Server } from 'socket.io'
import cors from 'cors'
import type { ClientToServerEvents, ServerToClientEvents } from './types'
import { CONFIG } from './config'
import { registerLobbyHandlers } from './socket/handlers/lobbyHandlers'
import { registerGameHandlers } from './socket/handlers/gameHandlers'
import { registerChatHandlers } from './socket/handlers/chatHandlers'

// CLIENT_URL peut contenir plusieurs origines séparées par une virgule
// ex: "https://beatblind.netlify.app,http://localhost:5173"
const allowedOrigins = CONFIG.CLIENT_URL.split(',').map((u) => u.trim())

const app = express()
app.use(cors({ origin: allowedOrigins }))
app.use(express.json())

const httpServer = createServer(app)

const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST'],
  },
})

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// Socket.io
io.on('connection', (socket) => {
  console.log(`[Socket] Connexion: ${socket.id}`)

  registerLobbyHandlers(io, socket)
  registerGameHandlers(io, socket)
  registerChatHandlers(io, socket)

  socket.on('disconnect', (reason) => {
    console.log(`[Socket] Déconnexion: ${socket.id} (${reason})`)
  })
})

httpServer.listen(CONFIG.PORT, () => {
  console.log(`🎵 Blindtest Server → http://localhost:${CONFIG.PORT}`)
})
