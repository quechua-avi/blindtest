import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { getSocket } from '../../socket/socketClient'
import { useGameStore } from '../../store/useGameStore'

export function AnswerInput() {
  const [answer, setAnswer] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const myAnswerResult = useGameStore((s) => s.myAnswerResult)
  const status = useGameStore((s) => s.status)

  const hasAnswered = myAnswerResult === 'correct' || myAnswerResult === 'wrong'
  const disabled = hasAnswered || status !== 'playing'

  useEffect(() => {
    if (status === 'playing') {
      setAnswer('')
      setTimeout(() => inputRef.current?.focus(), 300)
    }
  }, [status])

  const submit = () => {
    if (!answer.trim() || disabled) return
    getSocket().emit('game:submitAnswer', { answer: answer.trim(), timestamp: Date.now() })
    setAnswer('')
  }

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') submit()
  }

  return (
    <div className="w-full max-w-lg mx-auto">
      <AnimatePresence mode="wait">
        {myAnswerResult === 'correct' && (
          <motion.div
            key="correct"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex items-center justify-center gap-3 bg-emerald-500/20 border border-emerald-500/40 rounded-2xl p-5"
          >
            <span className="text-3xl">✅</span>
            <div>
              <p className="text-emerald-400 font-bold text-lg">Bonne réponse !</p>
              <p className="text-emerald-600 text-sm">En attente des autres joueurs...</p>
            </div>
          </motion.div>
        )}

        {myAnswerResult === 'wrong' && (
          <motion.div
            key="wrong"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex items-center justify-center gap-3 bg-red-500/10 border border-red-500/30 rounded-2xl p-5"
          >
            <span className="text-3xl">❌</span>
            <div>
              <p className="text-red-400 font-bold text-lg">Mauvaise réponse</p>
              <p className="text-red-600 text-sm">Continue d'écouter...</p>
            </div>
          </motion.div>
        )}

        {!hasAnswered && (
          <motion.div
            key="input"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex gap-2"
          >
            <input
              ref={inputRef}
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              onKeyDown={handleKey}
              disabled={disabled}
              placeholder="Titre ou artiste..."
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
              className="
                flex-1 bg-bg-card border border-bg-border rounded-xl px-4 py-3.5
                text-white placeholder-slate-600 text-base
                focus:outline-none focus:ring-2 focus:ring-primary/60 focus:border-primary/60
                transition-all duration-200
              "
            />
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={submit}
              disabled={!answer.trim() || disabled}
              className="
                bg-primary hover:bg-primary-glow text-white rounded-xl px-5 py-3.5
                font-semibold text-sm transition-all shadow-glow-sm
                disabled:opacity-40 disabled:cursor-not-allowed
              "
            >
              Envoyer
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
