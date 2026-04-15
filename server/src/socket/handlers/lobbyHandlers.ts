import type { Server, Socket } from 'socket.io'
import type { ClientToServerEvents, ServerToClientEvents } from '../../types'
import { GameManager } from '../../game/GameManager'
import { AVATAR_COLORS } from '../avatarColors'

type IoServer = Server<ClientToServerEvents, ServerToClientEvents>
type IoSocket = Socket<ClientToServerEvents, ServerToClientEvents>

function pickColor(index: number): string {
  return AVATAR_COLORS[index % AVATAR_COLORS.length]
}

export function registerLobbyHandlers(io: IoServer, socket: IoSocket) {
  socket.on('lobby:create', ({ playerName, settings }) => {
    if (!playerName?.trim()) {
      socket.emit('lobby:error', { code: 'INVALID_NAME', message: 'Nom invalide' })
      return
    }

    const color = pickColor(0)
    const room = GameManager.createRoom(io, socket, playerName.trim(), color)
    if (settings) room.updateSettings(settings)

    socket.join(room.code)
    socket.emit('lobby:created', { room: room.getPublicState() })
    console.log(`[Lobby] Room ${room.code} créée par ${playerName}`)
  })

  socket.on('lobby:join', ({ roomCode, playerName }) => {
    if (!playerName?.trim()) {
      socket.emit('lobby:error', { code: 'INVALID_NAME', message: 'Nom invalide' })
      return
    }

    const room = GameManager.getRoom(roomCode)
    if (!room) {
      socket.emit('lobby:error', { code: 'ROOM_NOT_FOUND', message: 'Salle introuvable' })
      return
    }

    const colorIndex = room.players.size
    const color = pickColor(colorIndex)
    const result = room.addPlayer(socket, playerName.trim(), color)

    if (typeof result === 'string') {
      socket.emit('lobby:error', { code: 'JOIN_FAILED', message: result })
      return
    }

    socket.join(room.code)
    const you = result
    socket.emit('lobby:joined', { room: room.getPublicState(), you })
    socket.to(room.code).emit('lobby:playerJoined', { player: you })
    console.log(`[Lobby] ${playerName} a rejoint ${room.code}`)
  })

  socket.on('lobby:leave', () => {
    handleLeave(io, socket)
  })

  socket.on('lobby:kick', ({ targetPlayerId }) => {
    const room = GameManager.getRoomByPlayerId(socket.id)
    if (!room) return
    const host = room.players.get(socket.id)
    if (!host?.isHost) return

    if (room.kickPlayer(targetPlayerId)) {
      io.to(targetPlayerId).emit('lobby:playerKicked', { playerId: targetPlayerId })
      io.to(room.code).emit('lobby:playerKicked', { playerId: targetPlayerId })
      const kickedSocket = io.sockets.sockets.get(targetPlayerId)
      kickedSocket?.leave(room.code)
    }
  })

  socket.on('lobby:ready', ({ isReady }) => {
    const room = GameManager.getRoomByPlayerId(socket.id)
    if (!room) return
    room.setReady(socket.id, isReady)
    io.to(room.code).emit('lobby:playerReady', { playerId: socket.id, isReady })
  })

  socket.on('lobby:updateSettings', ({ settings }) => {
    const room = GameManager.getRoomByPlayerId(socket.id)
    if (!room) return
    const host = room.players.get(socket.id)
    if (!host?.isHost) return
    room.updateSettings(settings)
    io.to(room.code).emit('lobby:settingsUpdated', { settings: room.settings })
  })

  socket.on('lobby:assignTeam', ({ playerId, teamId }) => {
    const room = GameManager.getRoomByPlayerId(socket.id)
    if (!room) return
    room.assignTeam(playerId, teamId)
    io.to(room.code).emit('lobby:teamAssigned', { playerId, teamId })
  })

  socket.on('disconnect', () => {
    handleLeave(io, socket)
  })
}

function handleLeave(io: IoServer, socket: IoSocket) {
  const room = GameManager.getRoomByPlayerId(socket.id)
  if (!room) return

  const { wasHost, newHostId } = room.removePlayer(socket.id)
  socket.leave(room.code)

  if (room.isEmpty) {
    GameManager.deleteRoom(room.code)
    console.log(`[Lobby] Room ${room.code} supprimée (vide)`)
    return
  }

  io.to(room.code).emit('lobby:playerLeft', {
    playerId: socket.id,
    newHostId: wasHost ? newHostId : undefined,
  })
}
