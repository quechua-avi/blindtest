import { io, Socket } from 'socket.io-client'

// En dev, Vite proxie /socket.io → localhost:3001 (pas d'URL explicite).
// En prod (Netlify), VITE_SERVER_URL pointe vers le serveur Railway.
const SERVER_URL = import.meta.env.VITE_SERVER_URL ?? ''

// Singleton socket — une seule connexion pour toute l'app
let socket: Socket | null = null

export function getSocket(): Socket {
  if (!socket) {
    const token = getStoredToken()
    socket = io(SERVER_URL, {
      autoConnect: false,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      auth: token ? { token } : {},
    })
  }
  return socket
}

export function resetSocket() {
  if (socket) {
    socket.disconnect()
    socket = null
  }
}

export function connectSocket() {
  getSocket().connect()
}

export function disconnectSocket() {
  getSocket().disconnect()
}

function getStoredToken(): string | null {
  try {
    const raw = localStorage.getItem('beatblind-auth')
    if (!raw) return null
    return JSON.parse(raw)?.state?.token ?? null
  } catch {
    return null
  }
}
