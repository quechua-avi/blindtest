import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { getSocket } from '../../socket/socketClient'
import { useGameStore } from '../../store/useGameStore'

export function AnswerInput() {
  const [answer, setAnswer] = useState('')
  const [wrongFlash, setWrongFlash] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const myAnswerResult = useGameStore((s) => s.myAnswerResult)
  const attemptsLeft = useGameStore((s) => s.attemptsLeft)
  const status = useGameStore((s) => s.status)

  const done = myAnswerResult === 'correct' || myAnswerResult === 'wrong'
  const disabled = done || status !== 'playing'

  useEffect(() => {
    if (status === 'playing') {
      setAnswer('')
      setWrongFlash(false)
      setTimeout(() => inputRef.current?.focus(), 300)
    }
  }, [status])

  // Flash rouge quand une mauvaise tentative arrive (mais pas finale)
  useEffect(() => {
    if (myAnswerResult === 'pending' && attemptsLeft < 3) {
      setAnswer('')
      setWrongFlash(true)
      const t = setTimeout(() => setWrongFlash(false), 600)
      return () => clearTimeout(t)
    }
  }, [attemptsLeft])

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
              <p className="text-red-400 font-bold text-lg">Plus d'essais</p>
              <p className="text-red-600 text-sm">Continue d'écouter...</p>
            </div>
          </motion.div>
        )}

        {!done && (
          <motion.div key="input" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-2">
            <motion.div
              className="flex gap-2"
              animate={wrongFlash ? { x: [-6, 6, -4, 4, 0] } : {}}
              transition={{ duration: 0.35 }}
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
                className={`
                  flex-1 bg-bg-card border rounded-xl px-4 py-3.5
                  text-white placeholder-slate-600 text-base
                  focus:outline-none focus:ring-2 focus:border-primary/60
                  transition-all duration-200
                  ${wrongFlash
                    ? 'border-red-500/60 focus:ring-red-500/40'
                    : 'border-bg-border focus:ring-primary/60'
                  }
                `}
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

            {/* Indicateur d'essais */}
            <div className="flex items-center gap-1.5 justify-center">
              {Array.from({ length: 3 }).map((_, i) => (
                <div
                  key={i}
                  className={`w-2 h-2 rounded-full transition-all duration-300 ${
                    i < attemptsLeft ? 'bg-primary' : 'bg-slate-700'
                  }`}
                />
              ))}
              <span className="text-xs text-slate-500 ml-1">
                {attemptsLeft === 3
                  ? '3 essais'
                  : attemptsLeft === 1
                  ? '1 essai restant'
                  : `${attemptsLeft} essais restants`}
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
