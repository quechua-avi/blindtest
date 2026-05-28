import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { QRCodeSVG } from 'qrcode.react'
import { getSocket } from '../socket/socketClient'
import { useGameStore } from '../store/useGameStore'
import { usePlayerStore } from '../store/usePlayerStore'
import { PlayerList } from '../components/lobby/PlayerList'
import { SettingsPanel } from '../components/lobby/SettingsPanel'
import { Button } from '../components/ui/Button'
import { GENRE_LABELS, GENRE_COLORS } from '../types/game'
import type { Genre } from '../types/game'

const MODE_LABELS: Record<string, string> = {
  classic: '🎵 Classique',
  buzzer: '🔔 Buzzer',
  teams: '👥 Équipes',
  saboteur: '🕵️ Saboteur',
  streamclash: '⚡ StreamClash',
}

export function LobbyPage() {
  const navigate = useNavigate()
  const { code } = useParams<{ code: string }>()
  const { players, isHost, settings, myPlayerId, status, roomCode } = useGameStore()
  const { name } = usePlayerStore()
  const [linkCopied, setLinkCopied] = useState(false)
  const [showQR, setShowQR] = useState(false)

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
  const nonHostHumans = players.filter((p) => !p.isHost)
  const allReady = nonHostHumans.length > 0 && nonHostHumans.every((p) => p.isReady)
  const readyCount = nonHostHumans.filter((p) => p.isReady).length

  const copyLink = () => {
    navigator.clipboard.writeText(joinUrl)
    setLinkCopied(true)
    setTimeout(() => setLinkCopied(false), 2200)
  }

  if (!currentCode) return null

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col pb-28">

      {/* ── Header ─────────────────────────────────────────────── */}
      <header className="sticky top-0 z-20 bg-white/90 backdrop-blur border-b border-slate-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3 flex items-center gap-3">
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

          <div className="flex-1" />

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-slate-500 text-sm font-medium">
                {players.length} joueur{players.length > 1 ? 's' : ''}
              </span>
            </div>
            <button
              onClick={() => { getSocket().emit('lobby:leave'); navigate('/') }}
              className="text-slate-400 hover:text-slate-700 text-sm transition-colors cursor-pointer"
            >
              ← Quitter
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto w-full px-4 sm:px-6 pt-6 space-y-4">

        {/* ── Code hero ──────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-primary/20 shadow-sm overflow-hidden"
          style={{ background: 'linear-gradient(135deg, #fff7ed 0%, #ffffff 50%, #fffbeb 100%)' }}
        >
          <div className="p-6 flex flex-col sm:flex-row items-center gap-6">

            {/* Code + actions */}
            <div className="flex-1 text-center sm:text-left">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Code de la salle
              </p>
              <div className="font-display text-5xl sm:text-6xl font-extrabold tracking-[0.18em] text-slate-900 mb-4 select-all">
                {currentCode}
              </div>
              <div className="flex items-center gap-2 flex-wrap justify-center sm:justify-start">
                <motion.button
                  onClick={copyLink}
                  whileTap={{ scale: 0.94 }}
                  whileHover={{ scale: 1.02 }}
                  className="inline-flex items-center gap-2 text-sm font-semibold text-primary bg-primary/10 hover:bg-primary/15 border border-primary/25 px-4 py-2 rounded-xl transition-all cursor-pointer"
                >
                  <AnimatePresence mode="wait">
                    <motion.span
                      key={linkCopied ? 'ok' : 'copy'}
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 4 }}
                      transition={{ duration: 0.12 }}
                    >
                      {linkCopied ? '✓ Lien copié !' : '📋 Copier le lien'}
                    </motion.span>
                  </AnimatePresence>
                </motion.button>
                <button
                  onClick={() => setShowQR(!showQR)}
                  className="text-sm text-slate-400 hover:text-slate-600 border border-slate-200 hover:border-slate-300 px-3 py-2 rounded-xl transition-colors cursor-pointer"
                >
                  {showQR ? 'Masquer QR' : '📷 QR code'}
                </button>
              </div>

              {/* Mode + genres */}
              <div className="flex items-center gap-1.5 flex-wrap justify-center sm:justify-start mt-3">
                <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full">
                  {MODE_LABELS[settings.mode] ?? settings.mode}
                </span>
                {settings.mode === 'streamclash' && settings.scGenre && GENRE_LABELS[settings.scGenre as Genre] && (
                  <span
                    className="text-xs font-semibold px-2.5 py-1 rounded-full border"
                    style={{
                      color: GENRE_COLORS[settings.scGenre as Genre],
                      backgroundColor: GENRE_COLORS[settings.scGenre as Genre] + '18',
                      borderColor: GENRE_COLORS[settings.scGenre as Genre] + '40',
                    }}
                  >
                    {GENRE_LABELS[settings.scGenre as Genre]}
                  </span>
                )}
                {settings.mode !== 'streamclash' && settings.genres.map((g) =>
                  GENRE_LABELS[g as Genre] ? (
                    <span
                      key={g}
                      className="text-xs font-semibold px-2.5 py-1 rounded-full border"
                      style={{
                        color: GENRE_COLORS[g as Genre],
                        backgroundColor: GENRE_COLORS[g as Genre] + '18',
                        borderColor: GENRE_COLORS[g as Genre] + '40',
                      }}
                    >
                      {GENRE_LABELS[g as Genre]}
                    </span>
                  ) : (
                    <span
                      key={g}
                      className="text-xs font-semibold px-2.5 py-1 rounded-full border border-primary/30 text-primary bg-primary/10"
                    >
                      {g}
                    </span>
                  )
                )}
              </div>
            </div>

            {/* QR ou état de préparation */}
            <AnimatePresence mode="wait">
              {showQR ? (
                <motion.div
                  key="qr"
                  initial={{ opacity: 0, scale: 0.85 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.85 }}
                  transition={{ duration: 0.18 }}
                  className="flex-shrink-0 p-3 bg-white rounded-xl border border-slate-200 shadow-sm"
                >
                  <QRCodeSVG value={joinUrl} size={104} fgColor="#0f172a" />
                </motion.div>
              ) : (
                <motion.div
                  key="readiness"
                  initial={{ opacity: 0, scale: 0.85 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.85 }}
                  transition={{ duration: 0.18 }}
                  className="flex-shrink-0 text-center min-w-[96px]"
                >
                  {nonHostHumans.length > 0 ? (
                    <>
                      <div className="text-3xl font-display font-extrabold text-slate-900">
                        {readyCount}
                        <span className="text-slate-300 font-light mx-0.5">/</span>
                        {nonHostHumans.length}
                      </div>
                      <div className="text-xs text-slate-400 mb-2">prêts</div>
                      <div className="flex gap-1 justify-center flex-wrap">
                        {nonHostHumans.map((p) => (
                          <motion.div
                            key={p.id}
                            animate={p.isReady ? { scale: [1, 1.3, 1] } : {}}
                            transition={{ duration: 0.3 }}
                            className={`w-2.5 h-2.5 rounded-full transition-colors ${
                              p.isReady ? 'bg-emerald-400' : 'bg-slate-200'
                            }`}
                            title={p.name}
                          />
                        ))}
                      </div>
                    </>
                  ) : (
                    <div>
                      <div className="text-2xl mb-1">⏳</div>
                      <div className="text-xs text-slate-400">En attente</div>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>

        {/* ── Joueurs + Paramètres ────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

          {/* Joueurs */}
          <motion.div
            initial={{ opacity: 0, x: -10 }}
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

          {/* Paramètres */}
          <motion.div
            initial={{ opacity: 0, x: 10 }}
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

      {/* ── CTA fixe en bas ────────────────────────────────────── */}
      <div className="fixed bottom-0 left-0 right-0 z-20 bg-white/95 backdrop-blur border-t border-slate-200 px-4 py-4">
        <div className="max-w-xl mx-auto">
          {isHost ? (
            <div className="space-y-2">
              <Button
                size="lg"
                onClick={startGame}
                className={`w-full shadow-glow-sm transition-opacity ${
                  !allReady && nonHostHumans.length > 0 ? 'opacity-60' : ''
                }`}
              >
                🎵 Lancer la partie !
              </Button>
              {!allReady && nonHostHumans.length > 0 && (
                <p className="text-center text-slate-400 text-xs">
                  {readyCount}/{nonHostHumans.length} joueur{nonHostHumans.length > 1 ? 's' : ''} prêt{readyCount > 1 ? 's' : ''} — tu peux lancer quand même
                </p>
              )}
            </div>
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
        </div>
      </div>
    </div>
  )
}
