import { motion, AnimatePresence } from 'framer-motion'
import { useGameStore } from '../../store/useGameStore'

export function ScoreFeed() {
  const scoreFeed = useGameStore((s) => s.scoreFeed)

  return (
    <div className="fixed top-4 right-4 z-30 space-y-2 pointer-events-none">
      <AnimatePresence>
        {scoreFeed.slice(0, 4).map((item) => (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, x: 60, scale: 0.8 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 60, scale: 0.8 }}
            className="bg-bg-card border border-emerald-500/30 rounded-xl px-4 py-2.5 shadow-lg flex items-center gap-2"
          >
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
              style={{ backgroundColor: item.avatarColor }}
            >
              {item.playerName.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <span className="text-white text-sm font-semibold">{item.playerName}</span>
              <span className="text-slate-400 text-sm"> a trouvé !</span>
              <span className="text-emerald-400 font-bold ml-2">+{item.points}</span>
              {item.matchType === 'fuzzy' && (
                <span className="text-xs text-slate-500 ml-1">(approché)</span>
              )}
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}
