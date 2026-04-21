import type { Server, Socket } from 'socket.io'
import type { ClientToServerEvents, ServerToClientEvents } from '../types'
import { GameRoom } from './GameRoom'

type IoServer = Server<ClientToServerEvents, ServerToClientEvents>

const ROOM_CODE_CHARS = 'ACDEFGHJKLMNPQRSTUVWXY23456789'

function generateCode(existing: Set<string>): string {
  let code: string
  do {
    code = Array.from({ length: 6 }, () =>
      ROOM_CODE_CHARS[Math.floor(Math.random() * ROOM_CODE_CHARS.length)]
    ).join('')
  } while (existing.has(code))
  return code
}

class GameManagerClass {
  private rooms: Map<string, GameRoom> = new Map()

  createRoom(
    io: IoServer,
    socket: Socket,
    playerName: string,
    avatarColor: string,
    userId?: number
  ): GameRoom {
    const code = generateCode(new Set(this.rooms.keys()))
    const room = new GameRoom(io, socket, playerName, avatarColor, userId)
    // Hack pour injecter le code (GameRoom ne peut pas le générer lui-même sans le manager)
    ;(room as any).code = code
    this.rooms.set(code, room)
    return room
  }

  getRoom(code: string): GameRoom | undefined {
    return this.rooms.get(code.toUpperCase())
  }

  deleteRoom(code: string) {
    const room = this.rooms.get(code)
    if (room) {
      room.destroy()
      this.rooms.delete(code)
    }
  }

  getRoomByPlayerId(playerId: string): GameRoom | undefined {
    for (const room of this.rooms.values()) {
      if (room.players.has(playerId)) return room
    }
    return undefined
  }

  cleanup(code: string) {
    const room = this.rooms.get(code)
    if (room && room.isEmpty) {
      this.deleteRoom(code)
    }
  }

  get size(): number {
    return this.rooms.size
  }
}

export const GameManager = new GameManagerClass()
