import type { Server, Socket } from 'socket.io'
import type { ClientToServerEvents, ServerToClientEvents } from '../../types'
import { GameManager } from '../../game/GameManager'

type IoServer = Server<ClientToServerEvents, ServerToClientEvents>
type IoSocket = Socket<ClientToServerEvents, ServerToClientEvents>

const ALLOWED_EMOJIS = ['❤️', '🔥', '😮', '😂', '👏', '🎵', '🎸', '🤯', '💯', '👀']

export function registerChatHandlers(io: IoServer, socket: IoSocket) {
  socket.on('chat:message', ({ text }) => {
    const room = GameManager.getRoomByPlayerId(socket.id)
    if (!room) return
    const player = room.players.get(socket.id)
    if (!player || player.isAI) return

    const sanitized = text.slice(0, 200).trim()
    if (!sanitized) return

    io.to(room.code).emit('chat:message', {
      playerId: socket.id,
      playerName: player.name,
      text: sanitized,
      timestamp: Date.now(),
    })
  })

  socket.on('chat:reaction', ({ emoji }) => {
    const room = GameManager.getRoomByPlayerId(socket.id)
    if (!room) return
    const player = room.players.get(socket.id)
    if (!player || player.isAI) return

    if (!ALLOWED_EMOJIS.includes(emoji)) return

    io.to(room.code).emit('chat:reaction', {
      playerId: socket.id,
      playerName: player.name,
      emoji,
      timestamp: Date.now(),
    })
  })
}
