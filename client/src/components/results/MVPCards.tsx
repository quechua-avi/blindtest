import { motion } from 'framer-motion'
import type { GameResults } from '../../types/game'

interface MVPCardsProps {
  mvp: GameResults['mvp']
}

export function MVPCards({ mvp }: MVPCardsProps) {
  const cards = [
    {
      icon: '⚡',
      title: 'Plus rapide',
      player: mvp.fastestGuesser,
      stat: mvp.fastestGuesser ? `${mvp.fastestGuesser.averageGuessTime.toFixed(1)}s en moy.` : '',
    },
    {
      icon: '🎯',
      title: 'Le plus de bonnes réponses',
      player: mvp.mostCorrect,
      stat: mvp.mostCorrect ? `${mvp.mostCorrect.correctAnswers} correctes` : '',
    },
    {
      icon: '🔥',
      title: 'Meilleure série',
      player: mvp.longestStreak,
      stat: mvp.longestStreak ? `${mvp.longestStreak.bestStreak} consécutives` : '',
    },
  ]

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      {cards.map(({ icon, title, player, stat }, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 + i * 0.1 }}
          className="bg-bg-card border border-bg-border rounded-2xl p-4 text-center"
        >
          <div className="text-3xl mb-2">{icon}</div>
          <p className="text-xs text-slate-500 mb-1">{title}</p>
          {player ? (
            <>
              <div
                className="w-10 h-10 rounded-full mx-auto mb-2 flex items-center justify-center text-sm font-bold text-white"
                style={{ backgroundColor: player.avatarColor }}
              >
                {player.playerName.slice(0, 2).toUpperCase()}
              </div>
              <p className="font-bold text-white text-sm">{player.playerName}</p>
              <p className="text-xs text-primary-light">{stat}</p>
            </>
          ) : (
            <p className="text-slate-500 text-sm">—</p>
          )}
        </motion.div>
      ))}
    </div>
  )
}
