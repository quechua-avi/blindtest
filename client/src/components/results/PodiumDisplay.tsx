import { motion } from 'framer-motion'
import { Avatar } from '../ui/Avatar'
import type { PlayerScore } from '../../types/game'

interface PodiumDisplayProps {
  leaderboard: PlayerScore[]
}

export function PodiumDisplay({ leaderboard }: PodiumDisplayProps) {
  const [first, second, third] = leaderboard

  const podium = [
    { player: second, rank: 2, height: 'h-24', delay: 0.2 },
    { player: first, rank: 1, height: 'h-36', delay: 0 },
    { player: third, rank: 3, height: 'h-16', delay: 0.3 },
  ]

  const medals = ['🥈', '🥇', '🥉']
  const colors = ['bg-slate-400', 'bg-yellow-400', 'bg-amber-600']

  return (
    <div className="flex items-end justify-center gap-3 px-4">
      {podium.map(({ player, rank, height, delay }, i) => {
        if (!player) return <div key={i} className="w-24" />
        return (
          <motion.div
            key={player.playerId}
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay, type: 'spring', stiffness: 200 }}
            className="flex flex-col items-center gap-2"
          >
            <Avatar name={player.playerName} color={player.avatarColor} size="lg" />
            <p className="text-white font-bold text-sm text-center max-w-[80px] truncate">{player.playerName}</p>
            <p className="text-slate-400 text-xs font-bold">{player.score.toLocaleString()} pts</p>
            <motion.div
              initial={{ scaleY: 0 }}
              animate={{ scaleY: 1 }}
              transition={{ delay: delay + 0.3, duration: 0.5 }}
              style={{ transformOrigin: 'bottom' }}
              className={`w-20 ${height} ${colors[i]} rounded-t-xl flex items-start justify-center pt-2`}
            >
              <span className="text-2xl">{medals[i]}</span>
            </motion.div>
          </motion.div>
        )
      })}
    </div>
  )
}
