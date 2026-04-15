import { motion, AnimatePresence } from 'framer-motion'
import { useGameStore } from '../../store/useGameStore'
import { Avatar } from '../ui/Avatar'

const MEDALS = ['🥇', '🥈', '🥉']

export function Leaderboard({ compact = false }: { compact?: boolean }) {
  const leaderboard = useGameStore((s) => s.leaderboard)
  const myPlayerId = useGameStore((s) => s.myPlayerId)

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

              <Avatar name={player.playerName} color={player.avatarColor} size="sm" isAI={player.isAI} />

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
