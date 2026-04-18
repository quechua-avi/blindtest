import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'react-hot-toast'
import { getSocket, connectSocket } from '../socket/socketClient'
import { useGameStore } from '../store/useGameStore'

export function useSocketSetup() {
  const navigate = useNavigate()
  const store = useGameStore()

  useEffect(() => {
    const socket = getSocket()
    connectSocket()

    // ─── Lobby ─────────────────────────────
    socket.on('lobby:created', ({ room }) => {
      store.onRoomCreated(room, socket.id!)
      navigate(`/lobby/${room.code}`)
    })

    socket.on('lobby:joined', ({ room, you }) => {
      store.onRoomJoined(room, you.id)
      navigate(`/lobby/${room.code}`)
    })

    socket.on('lobby:playerJoined', ({ player }) => {
      store.onPlayerJoined(player)
      toast(`${player.name} a rejoint la salle !`, { icon: '👋' })
    })

    socket.on('lobby:playerLeft', ({ playerId, newHostId }) => {
      const { players } = useGameStore.getState()
      const leaving = players.find((p) => p.id === playerId)
      store.onPlayerLeft(playerId, newHostId)
      if (leaving) toast(`${leaving.name} a quitté la salle`, { icon: '👋' })
      if (newHostId === socket.id) toast('Tu es maintenant hôte !', { icon: '👑' })
    })

    socket.on('lobby:playerKicked', ({ playerId }) => {
      const myId = socket.id!
      store.onPlayerKicked(playerId, myId)
      if (playerId === myId) {
        toast.error('Tu as été exclu de la salle')
        navigate('/')
      }
    })

    socket.on('lobby:playerReady', ({ playerId, isReady }) => {
      store.onPlayerReady(playerId, isReady)
    })

    socket.on('lobby:settingsUpdated', ({ settings }) => {
      store.onSettingsUpdated(settings)
    })

    socket.on('lobby:teamAssigned', ({ playerId, teamId }) => {
      store.onTeamAssigned(playerId, teamId)
    })

    socket.on('lobby:error', ({ message }) => {
      toast.error(message)
      store.setError(message)
    })

    // ─── Game ──────────────────────────────
    socket.on('game:roundStart', (round) => {
      store.onRoundStart(round)
      navigate('/game')
    })

    socket.on('game:playSong', ({ previewUrl }: { previewUrl: string }) => {
      store.onPlaySong(previewUrl)
    })

    socket.on('game:tick', ({ timeRemaining }) => {
      store.onTick(timeRemaining)
    })

    socket.on('game:correctAnswer', (data) => {
      const players = useGameStore.getState().players
      const player = players.find((p) => p.id === data.playerId)
      store.onCorrectAnswer({ ...data, avatarColor: player?.avatarColor ?? '#7c3aed' })
    })

    socket.on('game:wrongAnswer', ({ attemptsLeft }) => {
      store.onWrongAnswer(attemptsLeft)
    })

    socket.on('game:roundEnd', (data) => {
      store.onRoundEnd(data)
    })

    socket.on('game:paused', ({ paused }) => {
      toast(paused ? '⏸ Partie en pause' : '▶ Partie reprise', { duration: 2000 })
    })

    socket.on('game:ended', ({ finalResults }) => {
      store.onGameEnded(finalResults)
      navigate('/results')
    })

    // ─── Chat ──────────────────────────────
    socket.on('chat:message', (msg) => store.onChatMessage(msg))
    socket.on('chat:reaction', (reaction) => store.onReaction(reaction))

    // ─── Connexion ─────────────────────────
    socket.on('connect_error', () => {
      toast.error('Impossible de se connecter au serveur')
    })

    return () => {
      socket.removeAllListeners()
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps
}
