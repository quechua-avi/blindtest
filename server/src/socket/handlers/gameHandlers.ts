import type { Server, Socket } from 'socket.io'
import type { ClientToServerEvents, ServerToClientEvents } from '../../types'
import { GameManager } from '../../game/GameManager'

type IoServer = Server<ClientToServerEvents, ServerToClientEvents>
type IoSocket = Socket<ClientToServerEvents, ServerToClientEvents>

export function registerGameHandlers(io: IoServer, socket: IoSocket) {
  socket.on('game:start', () => {
    const room = GameManager.getRoomByPlayerId(socket.id)
    if (!room) return
    const host = room.players.get(socket.id)
    if (!host?.isHost) return

    const error = room.startGame()
    if (error) {
      socket.emit('lobby:error', { code: 'START_FAILED', message: error })
    }
  })

  socket.on('game:submitAnswer', ({ answer, timestamp }) => {
    const room = GameManager.getRoomByPlayerId(socket.id)
    if (!room) return
    room.handleAnswer(socket.id, answer, timestamp)
  })

  socket.on('game:buzz', () => {
    const room = GameManager.getRoomByPlayerId(socket.id)
    if (!room) return
    room.handleBuzz(socket.id)
  })

  socket.on('game:skipSong', () => {
    const room = GameManager.getRoomByPlayerId(socket.id)
    if (!room) return
    const host = room.players.get(socket.id)
    if (!host?.isHost) return
    room.skipRound()
  })

  socket.on('game:pause', ({ paused }) => {
    const room = GameManager.getRoomByPlayerId(socket.id)
    if (!room) return
    const host = room.players.get(socket.id)
    if (!host?.isHost) return
    room.pauseGame(paused)
  })

  socket.on('game:end', () => {
    const room = GameManager.getRoomByPlayerId(socket.id)
    if (!room) return
    const host = room.players.get(socket.id)
    if (!host?.isHost) return
    room.endGame()
  })

  socket.on('game:saboteurVote', ({ targetPlayerId }) => {
    const room = GameManager.getRoomByPlayerId(socket.id)
    if (!room) return
    room.handleSaboteurVote(socket.id, targetPlayerId)
  })

  socket.on('streamclash:vote', ({ side }) => {
    const room = GameManager.getRoomByPlayerId(socket.id)
    if (!room) return
    room.handleScVote(socket.id, side)
  })
}
