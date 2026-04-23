import { motion, AnimatePresence } from 'framer-motion'
import { useGameStore } from '../../store/useGameStore'
import { Avatar } from '../ui/Avatar'
import type { PlayerScore } from '../../types/game'

const MEDALS = ['🥇', '🥈', '🥉']

function TeamSection({
  teamId,
  teamScore,
  players,
  myPlayerId,
  compact,
}: {
  teamId: 'A' | 'B'
  teamScore: number
  players: PlayerScore[]
  myPlayerId: string | null
  compact: boolean
}) {
  const isA = teamId === 'A'
  const borderClass = isA ? 'border-blue-500/40' : 'border-red-500/40'
  const bgClass = isA ? 'bg-blue-500/10' : 'bg-red-500/10'
  const textClass = isA ? 'text-blue-400' : 'text-red-400'
  const meBgClass = isA ? 'bg-blue-500/20 border-blue-500/30' : 'bg-red-500/20 border-red-500/30'

  return (
    <div className={`rounded-xl border ${borderClass} ${bgClass} p-2 space-y-1`}>
      <div className="flex items-center justify-between px-1 mb-2">
        <span className={`text-sm font-bold ${textClass}`}>Équipe {teamId}</span>
        <span className={`text-sm font-bold font-display tabular-nums ${textClass}`}>
          {teamScore.toLocaleString()} pts
        </span>
      </div>
      {players.map((player, rank) => {
        const isMe = player.playerId === myPlayerId
        return (
          <motion.div
            key={player.playerId}
            layout
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ layout: { type: 'spring', stiffness: 300, damping: 30 } }}
            className={`flex items-center gap-2 rounded-lg px-2 py-2 border transition-colors ${
              isMe ? meBgClass : 'bg-bg-surface/50 border-transparent'
            }`}
          >
            <span className="text-sm w-5 text-center flex-shrink-0 text-slate-500">{rank + 1}</span>
            <Avatar name={player.playerName} color={player.avatarColor} size="sm"  />
            <div className="flex-1 min-w-0">
              <p className={`font-semibold text-sm truncate ${isMe ? textClass : 'text-white'}`}>
                {player.playerName}{isMe && ' (toi)'}
              </p>
              {!compact && (
                <p className="text-xs text-slate-500">
                  {player.correctAnswers} bonnes{player.bestStreak > 2 ? ` · 🔥×${player.bestStreak}` : ''}
                </p>
              )}
            </div>
            <motion.p
              key={player.score}
              initial={{ scale: 1.3, color: '#10b981' }}
              animate={{ scale: 1, color: '#f1f5f9' }}
              className="font-bold text-sm font-display tabular-nums flex-shrink-0"
            >
              {player.score.toLocaleString()}
            </motion.p>
          </motion.div>
        )
      })}
      {players.length === 0 && (
        <p className="text-xs text-slate-500 text-center py-2">Aucun joueur assigné</p>
      )}
    </div>
  )
}

export function Leaderboard({ compact = false }: { compact?: boolean }) {
  const leaderboard = useGameStore((s) => s.leaderboard)
  const myPlayerId = useGameStore((s) => s.myPlayerId)
  const settings = useGameStore((s) => s.settings)
  const teamScoresFromStore = useGameStore((s) => s.teamScores)

  if (settings.mode === 'teams') {
    const teamA = leaderboard.filter((p) => p.teamId === 'A')
    const teamB = leaderboard.filter((p) => p.teamId === 'B')
    const teamScores = teamScoresFromStore ?? {
      A: teamA.reduce((sum, p) => sum + p.score, 0),
      B: teamB.reduce((sum, p) => sum + p.score, 0),
    }

    return (
      <div className="space-y-3">
        {!compact && <h3 className="text-sm font-medium text-slate-400 mb-3">Classement par équipe</h3>}
        <TeamSection teamId="A" teamScore={teamScores.A} players={teamA} myPlayerId={myPlayerId} compact={compact} />
        <TeamSection teamId="B" teamScore={teamScores.B} players={teamB} myPlayerId={myPlayerId} compact={compact} />
      </div>
    )
  }

  const displayed = compact ? leaderboard.slice(0, 5) : leaderboard

  return (
    <div className="space-y-2">
      {!compact && (
        <h3 className="text-sm font-medium text-slate-400 mb-3">Classement</h3>
      )}
      <AnimatePresence>
        {displayed.map((player, rank) => {
          const isMe = player.playerId === myPlayerId
          return (
            <motion.div
              key={player.playerId}
              layout
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ layout: { type: 'spring', stiffness: 300, damping: 30 } }}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 border transition-colors ${
                isMe
                  ? 'bg-primary/15 border-primary/30'
                  : 'bg-bg-surface border-bg-border'
              }`}
            >
              <span className="text-lg w-8 text-center flex-shrink-0">
                {rank < 3 ? MEDALS[rank] : <span className="text-slate-500 text-sm font-bold">{rank + 1}</span>}
              </span>

              <Avatar name={player.playerName} color={player.avatarColor} size="sm"  />

              <div className="flex-1 min-w-0">
                <p className={`font-semibold text-sm truncate ${isMe ? 'text-primary-light' : 'text-white'}`}>
                  {player.playerName}
                  {isMe && ' (toi)'}
                </p>
                {!compact && (
                  <p className="text-xs text-slate-500">
                    {player.correctAnswers} bonnes réponses · {player.bestStreak > 2 ? `🔥×${player.bestStreak}` : ''}
                  </p>
                )}
              </div>

              <div className="text-right flex-shrink-0">
                <motion.p
                  key={player.score}
                  initial={{ scale: 1.3, color: '#10b981' }}
                  animate={{ scale: 1, color: '#f1f5f9' }}
                  className="font-bold font-display tabular-nums"
                >
                  {player.score.toLocaleString()}
                </motion.p>
                <p className="text-xs text-slate-600">pts</p>
              </div>
            </motion.div>
          )
        })}
      </AnimatePresence>
    </div>
  )
}
