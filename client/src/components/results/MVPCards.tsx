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
      accent: '#f59e0b',
    },
    {
      icon: '🎯',
      title: 'Le plus de bonnes réponses',
      player: mvp.mostCorrect,
      stat: mvp.mostCorrect ? `${mvp.mostCorrect.correctAnswers} correctes` : '',
      accent: '#10b981',
    },
    {
      icon: '🔥',
      title: 'Meilleure série',
      player: mvp.longestStreak,
      stat: mvp.longestStreak ? `${mvp.longestStreak.bestStreak} consécutives` : '',
      accent: '#f97316',
    },
  ]

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      {cards.map(({ icon, title, player, stat, accent }, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 + i * 0.1 }}
          className="bg-bg-card border border-bg-border rounded-2xl p-5 text-center relative overflow-hidden"
        >
          {/* Barre couleur en haut */}
          <div className="absolute top-0 left-0 right-0 h-0.5" style={{ backgroundColor: accent }} />

          <div className="text-3xl mb-2">{icon}</div>
          <p className="text-xs text-slate-500 mb-3 font-medium leading-tight">{title}</p>

          {player ? (
            <>
              <div
                className="w-12 h-12 rounded-full mx-auto mb-2 flex items-center justify-center text-white font-bold text-base"
                style={{ backgroundColor: player.avatarColor }}
              >
                {player.playerName.slice(0, 2).toUpperCase()}
              </div>
              <p className="font-bold text-white text-sm">{player.playerName}</p>
              <p className="text-xs font-semibold mt-1" style={{ color: accent }}>{stat}</p>
            </>
          ) : (
            <p className="text-slate-500 text-sm">—</p>
          )}
        </motion.div>
      ))}
    </div>
  )
}
