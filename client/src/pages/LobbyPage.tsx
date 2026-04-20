import { useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { QRCodeSVG } from 'qrcode.react'
import { useState } from 'react'
import { getSocket } from '../socket/socketClient'
import { useGameStore } from '../store/useGameStore'
import { usePlayerStore } from '../store/usePlayerStore'
import { PlayerList } from '../components/lobby/PlayerList'
import { SettingsPanel } from '../components/lobby/SettingsPanel'
import { Button } from '../components/ui/Button'

export function LobbyPage() {
  const navigate = useNavigate()
  const { code } = useParams<{ code: string }>()
  const { players, isHost, settings, myPlayerId, status, roomCode } = useGameStore()
  const { name } = usePlayerStore()
  const [linkCopied, setLinkCopied] = useState(false)

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
  const kickPlayer     = (id: string) => getSocket().emit('lobby:kick', { targetPlayerId: id })
  const updateSettings = (partial: Partial<typeof settings>) =>
    getSocket().emit('lobby:updateSettings', { settings: partial })
  const assignTeam = (playerId: string, teamId: 'A' | 'B') =>
    getSocket().emit('lobby:assignTeam', { playerId, teamId })

  const currentCode = roomCode ?? code ?? ''
  const joinUrl = typeof window !== 'undefined' ? `${window.location.origin}/join/${currentCode}` : ''
  const me = players.find((p) => p.id === myPlayerId)
  const nonHostHumans = players.filter((p) => !p.isHost && !p.isAI)
  const allReady = nonHostHumans.every((p) => p.isReady)

  const copyLink = () => {
    navigator.clipboard.writeText(joinUrl)
    setLinkCopied(true)
    setTimeout(() => setLinkCopied(false), 2000)
  }

  if (!currentCode) return null

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col pb-32">
      {/* Nav */}
      <nav className="sticky top-0 z-20 bg-white/90 backdrop-blur border-b border-slate-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-end gap-0.5 h-4">
              {[0.5, 0.9, 1, 0.7, 0.85].map((h, i) => (
                <div
                  key={i}
                  className="w-0.5 rounded-full bg-primary animate-waveform"
                  style={{ height: `${h * 100}%`, animationDelay: `${i * 0.12}s` }}
                />
              ))}
            </div>
            <span className="font-display font-extrabold text-slate-900">
              Beat<span className="text-primary">Blind</span>
            </span>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-1.5 text-slate-500 text-sm">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              {players.length} joueur{players.length > 1 ? 's' : ''}
            </div>
            <button
              onClick={() => { getSocket().emit('lobby:leave'); navigate('/') }}
              className="text-slate-400 hover:text-slate-700 text-sm transition-colors"
            >
              ← Quitter
            </button>
          </div>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto w-full px-4 sm:px-6 pt-6 space-y-4">
        {/* Hero code */}
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6"
        >
          <div className="flex flex-col sm:flex-row items-center gap-6">
            {/* QR */}
            <div className="flex-shrink-0 p-2 bg-slate-50 border border-slate-200 rounded-xl">
              <QRCodeSVG value={joinUrl} size={90} fgColor="#0f172a" />
            </div>

            {/* Info */}
            <div className="flex-1 text-center sm:text-left">
              <p className="text-slate-400 text-xs font-medium uppercase tracking-wider mb-1">Code de la salle</p>
              <div className="font-display text-4xl sm:text-5xl font-extrabold tracking-widest text-slate-900 mb-3">
                {currentCode}
              </div>
              <div className="flex items-center gap-2 justify-center sm:justify-start flex-wrap">
                <button
                  onClick={copyLink}
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-primary border border-primary/30 hover:border-primary/60 hover:bg-primary/5 px-3 py-1.5 rounded-lg transition-all"
                >
                  {linkCopied ? '✓ Lien copié !' : '📋 Copier le lien d\'invitation'}
                </button>
                <span className="text-slate-300 text-xs hidden sm:inline">·</span>
                <span className="text-slate-400 text-xs">Ou scanne le QR code</span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Joueurs + Settings */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Joueurs */}
          <motion.div
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5"
          >
            <PlayerList
              players={players}
              myPlayerId={myPlayerId}
              isHost={isHost}
              onKick={kickPlayer}
              onAssignTeam={assignTeam}
              showTeams={settings.mode === 'teams'}
              light
            />
          </motion.div>

          {/* Settings */}
          <motion.div
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.15 }}
            className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm p-6"
          >
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-display text-base font-bold text-slate-900">Configuration</h2>
              {!isHost && (
                <span className="text-xs text-slate-400 bg-slate-100 px-2.5 py-1 rounded-full">
                  Lecture seule
                </span>
              )}
            </div>
            <SettingsPanel settings={settings} isHost={isHost} onChange={updateSettings} light />
          </motion.div>
        </div>
      </div>

      {/* CTA sticky */}
      <div className="fixed bottom-0 left-0 right-0 z-20 bg-white/95 backdrop-blur border-t border-slate-200 px-4 py-4">
        <div className="max-w-xl mx-auto space-y-2">
          {isHost ? (
            <Button size="lg" onClick={startGame} className="w-full shadow-glow-sm">
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
            <p className="text-center text-slate-400 text-xs">
              En attente que tous les joueurs soient prêts…
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
