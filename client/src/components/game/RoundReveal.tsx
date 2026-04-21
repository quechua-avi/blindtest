import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { getSocket } from '../../socket/socketClient'
import { useGameStore } from '../../store/useGameStore'
import { Badge } from '../ui/Badge'
import { GENRE_LABELS, GENRE_COLORS } from '../../types/game'

const BETWEEN_ROUNDS_DELAY = 5

export function RoundReveal() {
  const revealedSong = useGameStore((s) => s.revealedSong)
  const players = useGameStore((s) => s.players)
  const settings = useGameStore((s) => s.settings)
  const teamScores = useGameStore((s) => s.teamScores)
  const currentRound = useGameStore((s) => s.currentRound)
  const myPlayerId = useGameStore((s) => s.myPlayerId)
  const isSaboteur = useGameStore((s) => s.isSaboteur)
  const saboteurVotesAgainstMe = useGameStore((s) => s.saboteurVotesAgainstMe)
  const myVote = useGameStore((s) => s.myVote)
  const setMyVote = useGameStore((s) => s.setMyVote)

  const [countdown, setCountdown] = useState(BETWEEN_ROUNDS_DELAY)

  useEffect(() => {
    setCountdown(BETWEEN_ROUNDS_DELAY)
    const interval = setInterval(() => {
      setCountdown((n) => Math.max(0, n - 1))
    }, 1000)
    return () => clearInterval(interval)
  }, [revealedSong])

  const handleVote = (targetId: string) => {
    setMyVote(targetId)
    getSocket().emit('game:saboteurVote', { targetPlayerId: targetId })
  }

  if (!revealedSong) return null

  const { song, correctGuessers, coverUrl } = revealedSong
  const winnerNames = correctGuessers.map((id) => players.find((p) => p.id === id)?.name).filter(Boolean)
  const isTeams = settings.mode === 'teams' && teamScores !== null
  const isSaboteurMode = settings.mode === 'saboteur'
  const otherPlayers = players.filter((p) => p.id !== myPlayerId)

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full max-w-lg mx-auto space-y-3"
    >
      <div className="bg-bg-card border border-bg-border rounded-2xl p-6 text-center space-y-3">
        {coverUrl ? (
          <motion.img
            src={coverUrl}
            alt={`${song.title} - ${song.artist}`}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
            className="w-32 h-32 rounded-xl mx-auto object-cover shadow-lg"
          />
        ) : (
          <div className="text-4xl">🎵</div>
        )}
        <h2 className="text-2xl font-bold font-display text-white">{song.title}</h2>
        <p className="text-slate-400 text-lg">{song.artist}</p>
        <div className="flex items-center justify-center gap-2">
          <Badge label={GENRE_LABELS[song.genre]} color={GENRE_COLORS[song.genre]} />
          <Badge label={String(song.year)} className="bg-bg-surface border border-bg-border text-slate-400" />
        </div>

        {winnerNames.length > 0 && (
          <p className="text-emerald-400 text-sm">
            ✓ {winnerNames.join(', ')} {winnerNames.length === 1 ? 'a trouvé' : 'ont trouvé'}
          </p>
        )}
        {winnerNames.length === 0 && (
          <p className="text-slate-500 text-sm">Personne n'a trouvé cette fois...</p>
        )}

        {/* Countdown */}
        <div className="pt-1">
          {currentRound && currentRound.roundNumber < currentRound.totalRounds ? (
            <div className="space-y-2">
              <div className="w-full h-1 bg-bg-surface rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-primary rounded-full"
                  initial={{ width: '100%' }}
                  animate={{ width: '0%' }}
                  transition={{ duration: BETWEEN_ROUNDS_DELAY, ease: 'linear' }}
                />
              </div>
              <p className="text-slate-500 text-xs">
                {countdown > 0
                  ? <>Prochain round dans <span className="text-primary font-bold">{countdown}s</span></>
                  : <span className="text-primary font-bold">C'est parti !</span>
                }
              </p>
            </div>
          ) : (
            <p className="text-slate-500 text-xs">Calcul des résultats...</p>
          )}
        </div>
      </div>

      {/* Saboteur : votes reçus (visible uniquement par le saboteur) */}
      {isSaboteurMode && isSaboteur && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4">
          <p className="text-xs text-amber-400 font-semibold uppercase tracking-wider mb-3">
            🕵️ Votes contre toi ({saboteurVotesAgainstMe.length})
          </p>
          {saboteurVotesAgainstMe.length === 0 ? (
            <p className="text-slate-500 text-sm">Personne ne te soupçonne encore...</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {saboteurVotesAgainstMe.map((v) => (
                <div key={v.voterName} className="flex items-center gap-1.5 bg-bg-surface rounded-full px-3 py-1">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: v.voterAvatarColor }} />
                  <span className="text-xs text-slate-300">{v.voterName}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Saboteur : panel de vote (pour les non-saboteurs) */}
      {isSaboteurMode && !isSaboteur && (
        <div className="bg-bg-card border border-bg-border rounded-2xl p-4">
          <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider mb-3">
            🕵️ Qui est le saboteur ?
          </p>
          <div className="flex flex-wrap gap-2">
            {otherPlayers.map((p) => (
              <motion.button
                key={p.id}
                onClick={() => handleVote(p.id)}
                whileTap={{ scale: 0.92 }}
                whileHover={{ scale: 1.04 }}
                animate={myVote === p.id ? { scale: [1, 1.08, 1] } : {}}
                transition={{ duration: 0.2 }}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-sm font-semibold transition-colors cursor-pointer ${
                  myVote === p.id
                    ? 'border-red-500/60 bg-red-500/10 text-red-300'
                    : 'border-bg-border bg-bg-surface text-slate-300 hover:border-slate-500'
                }`}
              >
                <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: p.avatarColor }} />
                {p.name}
                {myVote === p.id && <span className="text-red-400">✗</span>}
              </motion.button>
            ))}
          </div>
          {myVote && (
            <p className="text-xs text-slate-500 mt-2">
              Vote enregistré · Tu peux en changer avant la fin du round
            </p>
          )}
        </div>
      )}

      {isTeams && (
        <div className="flex gap-3">
          <div className="flex-1 bg-blue-500/10 border border-blue-500/40 rounded-xl p-3 text-center">
            <p className="text-xs text-blue-400 font-semibold mb-1">Équipe A</p>
            <p className="text-xl font-bold font-display text-blue-300">{teamScores.A.toLocaleString()}</p>
          </div>
          <div className="flex items-center text-slate-500 font-bold text-sm">VS</div>
          <div className="flex-1 bg-red-500/10 border border-red-500/40 rounded-xl p-3 text-center">
            <p className="text-xs text-red-400 font-semibold mb-1">Équipe B</p>
            <p className="text-xl font-bold font-display text-red-300">{teamScores.B.toLocaleString()}</p>
          </div>
        </div>
      )}
    </motion.div>
  )
}
