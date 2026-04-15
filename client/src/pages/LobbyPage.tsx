import { useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { getSocket } from '../socket/socketClient'
import { useGameStore } from '../store/useGameStore'
import { usePlayerStore } from '../store/usePlayerStore'
import { preloadYTApi } from '../hooks/useYouTubePlayer'
import { RoomCodeDisplay } from '../components/lobby/RoomCodeDisplay'
import { PlayerList } from '../components/lobby/PlayerList'
import { SettingsPanel } from '../components/lobby/SettingsPanel'
import { Button } from '../components/ui/Button'

export function LobbyPage() {
  const navigate = useNavigate()
  const { code } = useParams<{ code: string }>()
  const { players, isHost, settings, myPlayerId, status, roomCode } = useGameStore()
  const { name } = usePlayerStore()

  // Pré-charger l'API YouTube dès le lobby pour qu'elle soit prête au démarrage
  useEffect(() => { preloadYTApi() }, [])

  // Auto-rejoindre si on arrive par lien direct
  useEffect(() => {
    if (code && !roomCode && name) {
      getSocket().emit('lobby:join', { roomCode: code, playerName: name })
    } else if (code && !roomCode && !name) {
      navigate(`/join/${code}`)
    }
  }, [code, roomCode, name, navigate])

  // Redirection si la partie démarre
  useEffect(() => {
    if (status === 'playing') navigate('/game')
  }, [status, navigate])

  const startGame = () => getSocket().emit('game:start')

  const toggleReady = () => {
    const me = players.find((p) => p.id === myPlayerId)
    if (me) getSocket().emit('lobby:ready', { isReady: !me.isReady })
  }

  const kickPlayer = (id: string) => getSocket().emit('lobby:kick', { targetPlayerId: id })

  const updateSettings = (partial: Partial<typeof settings>) => {
    getSocket().emit('lobby:updateSettings', { settings: partial })
  }

  const assignTeam = (playerId: string, teamId: 'A' | 'B') => {
    getSocket().emit('lobby:assignTeam', { playerId, teamId })
  }

  const currentCode = roomCode ?? code ?? ''
  const me = players.find((p) => p.id === myPlayerId)
  const allReady = players.filter((p) => !p.isHost && !p.isAI).every((p) => p.isReady)

  if (!currentCode) return null

  return (
    <div className="min-h-screen bg-bg p-4">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="font-display text-2xl font-bold text-white">Salle d'attente</h1>
            <p className="text-slate-500 text-sm">{players.length} joueur{players.length > 1 ? 's' : ''} connecté{players.length > 1 ? 's' : ''}</p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => { getSocket().emit('lobby:leave'); navigate('/') }}
            className="text-slate-500"
          >
            ← Quitter
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Colonne gauche : code + joueurs */}
          <div className="space-y-6">
            <div className="bg-bg-card border border-bg-border rounded-2xl p-6">
              <RoomCodeDisplay code={currentCode} />
            </div>

            <div className="bg-bg-card border border-bg-border rounded-2xl p-5">
              <PlayerList
                players={players}
                myPlayerId={myPlayerId}
                isHost={isHost}
                onKick={kickPlayer}
                onAssignTeam={assignTeam}
                showTeams={settings.mode === 'teams'}
              />
            </div>
          </div>

          {/* Colonne principale : settings */}
          <div className="lg:col-span-2">
            <div className="bg-bg-card border border-bg-border rounded-2xl p-6">
              <h2 className="font-display text-lg font-bold text-white mb-5">
                Configuration {!isHost && <span className="text-slate-500 text-sm font-normal">(seul l'hôte peut modifier)</span>}
              </h2>
              <SettingsPanel settings={settings} isHost={isHost} onChange={updateSettings} />
            </div>
          </div>
        </div>

        {/* Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-6 flex flex-col sm:flex-row gap-3 justify-center"
        >
          {isHost ? (
            <Button
              size="lg"
              onClick={startGame}
              className="w-full sm:w-auto px-12"
            >
              🎵 Lancer la partie !
            </Button>
          ) : (
            <Button
              size="lg"
              variant={me?.isReady ? 'secondary' : 'primary'}
              onClick={toggleReady}
              className="w-full sm:w-auto px-12"
            >
              {me?.isReady ? '✓ Prêt — Annuler' : '✓ Je suis prêt !'}
            </Button>
          )}
        </motion.div>

        {isHost && !allReady && players.filter((p) => !p.isHost && !p.isAI).length > 0 && (
          <p className="text-center text-slate-500 text-sm mt-3">
            En attente que tous les joueurs soient prêts...
          </p>
        )}
      </div>
    </div>
  )
}
