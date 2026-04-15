import { motion, AnimatePresence } from 'framer-motion'
import { useGameStore } from '../../store/useGameStore'
import { getSocket } from '../../socket/socketClient'
import { ALLOWED_REACTIONS } from '../../types/game'

export function ReactionOverlay() {
  const reactions = useGameStore((s) => s.reactions)

  return (
    <>
      {/* Réactions flottantes */}
      <div className="fixed inset-0 pointer-events-none z-40 overflow-hidden">
        <AnimatePresence>
          {reactions.map((r, i) => (
            <motion.div
              key={`${r.playerId}-${r.timestamp}`}
              initial={{ opacity: 1, y: 0, x: 20 + (i * 47) % 80, scale: 1 }}
              animate={{ opacity: 0, y: -150, scale: 1.5 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 2.5, ease: 'easeOut' }}
              className="absolute bottom-32 text-4xl"
              style={{ left: `${10 + (i * 137) % 70}%` }}
            >
              {r.emoji}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Boutons de réaction */}
      <ReactionBar />
    </>
  )
}

function ReactionBar() {
  const sendReaction = (emoji: string) => {
    getSocket().emit('chat:reaction', { emoji })
  }

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-30">
      <div className="flex gap-2 bg-bg-card border border-bg-border rounded-2xl px-3 py-2 shadow-lg">
        {ALLOWED_REACTIONS.map((emoji) => (
          <button
            key={emoji}
            onClick={() => sendReaction(emoji)}
            className="text-2xl hover:scale-125 transition-transform cursor-pointer p-1"
          >
            {emoji}
          </button>
        ))}
      </div>
    </div>
  )
}
