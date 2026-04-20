import { useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { getSocket } from '../socket/socketClient'
import { useGameStore } from '../store/useGameStore'
import { usePlayerStore } from '../store/usePlayerStore'
import { RoomCodeDisplay } from '../components/lobby/RoomCodeDisplay'
import { PlayerList } from '../components/lobby/PlayerList'
import { SettingsPanel } from '../components/lobby/SettingsPanel'
import { Button } from '../components/ui/Button'

export function LobbyPage() {
  const navigate = useNavigate()
  const { code } = useParams<{ code: string }>()
  const { players, isHost, settings, myPlayerId, status, roomCode } = useGameStore()
  const { name } = usePlayerStore()

  useEffect(() => {
    if (code && !roomCode && name) {
      getSocket().emit('lobby:join', { roomCode: code, playerName: name })
    } else if (code && !roomCode && !name) {
      navigate(`/join/${code}`)
    }
  }, [code, roomCode, name, navigate])

  useEffect(() => {
    if (status === 'playing') navigate('/game')
  }, [status, navigate])

  const startGame   = () => getSocket().emit('game:start')
  const toggleReady = () => {
    const me = players.find((p) => p.id === myPlayerId)
    if (me) getSocket().emit('lobby:ready', { isReady: !me.isReady })
  }
  const kickPlayer    = (id: string) => getSocket().emit('lobby:kick', { targetPlayerId: id })
  const updateSettings = (partial: Partial<typeof settings>) =>
    getSocket().emit('lobby:updateSettings', { settings: partial })
  const assignTeam = (playerId: string, teamId: 'A' | 'B') =>
    getSocket().emit('lobby:assignTeam', { playerId, teamId })

  const currentCode = roomCode ?? code ?? ''
  const me = players.find((p) => p.id === myPlayerId)
  const nonHostHumans = players.filter((p) => !p.isHost && !p.isAI)
  const allReady = nonHostHumans.every((p) => p.isReady)

  if (!currentCode) return null

  return (
    <div className="min-h-screen bg-bg pb-32">
      {/* Nav sticky */}
      <nav className="sticky top-0 z-20 bg-bg/90 backdrop-blur border-b border-bg-border">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <button
            onClick={() => { getSocket().emit('lobby:leave'); navigate('/') }}
            className="text-slate-500 hover:text-white text-sm flex items-center gap-1.5 transition-colors"
          >
            ← Quitter
          </button>
          <div className="flex items-center gap-2 text-slate-400 text-sm">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            {players.length} joueur{players.length > 1 ? 's' : ''} connecté{players.length > 1 ? 's' : ''}
          </div>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-4 pt-5 space-y-4">
        {/* Hero : code de la salle */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-bg-card border border-bg-border rounded-2xl p-6"
        >
          <RoomCodeDisplay code={currentCode} horizontal />
        </motion.div>

        {/* Contenu : joueurs + settings */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Joueurs */}
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-bg-card border border-bg-border rounded-2xl p-5"
          >
            <PlayerList
              players={players}
              myPlayerId={myPlayerId}
              isHost={isHost}
              onKick={kickPlayer}
              onAssignTeam={assignTeam}
              showTeams={settings.mode === 'teams'}
            />
          </motion.div>

          {/* Settings */}
          <motion.div
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.15 }}
            className="lg:col-span-2 bg-bg-card border border-bg-border rounded-2xl p-6"
          >
            <h2 className="font-display text-base font-bold text-white mb-5 flex items-center gap-2">
              Configuration
              {!isHost && (
                <span className="text-slate-500 text-xs font-normal">(seul l'hôte peut modifier)</span>
              )}
            </h2>
            <SettingsPanel settings={settings} isHost={isHost} onChange={updateSettings} />
          </motion.div>
        </div>
      </div>

      {/* CTA sticky en bas */}
      <div className="fixed bottom-0 left-0 right-0 z-20 bg-bg/95 backdrop-blur border-t border-bg-border px-4 py-4">
        <div className="max-w-xl mx-auto space-y-2">
          {isHost ? (
            <Button size="lg" onClick={startGame} className="w-full">
              🎵 Lancer la partie !
            </Button>
          ) : (
            <Button
              size="lg"
              variant={me?.isReady ? 'secondary' : 'primary'}
              onClick={toggleReady}
              className="w-full"
            >
              {me?.isReady ? '✓ Prêt — Annuler' : '✓ Je suis prêt !'}
            </Button>
          )}
          {isHost && !allReady && nonHostHumans.length > 0 && (
            <p className="text-center text-slate-500 text-xs">
              En attente que tous les joueurs soient prêts…
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
