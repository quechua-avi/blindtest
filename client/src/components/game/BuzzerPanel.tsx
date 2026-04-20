import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { getSocket } from '../../socket/socketClient'
import { useGameStore } from '../../store/useGameStore'

export function BuzzerPanel() {
  const [answer, setAnswer] = useState('')
  const [timeLeft, setTimeLeft] = useState(15)
  const [wrongFlash, setWrongFlash] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  const myPlayerId = useGameStore((s) => s.myPlayerId)
  const activeBuzz = useGameStore((s) => s.activeBuzz)
  const isBuzzedOut = useGameStore((s) => s.isBuzzedOut)
  const myAnswerResult = useGameStore((s) => s.myAnswerResult)
  const status = useGameStore((s) => s.status)

  const iAmBuzzed = activeBuzz?.playerId === myPlayerId
  const someoneElseBuzzed = activeBuzz !== null && !iAmBuzzed

  useEffect(() => {
    if (iAmBuzzed) {
      setTimeLeft(15)
      setAnswer('')
      setTimeout(() => inputRef.current?.focus(), 100)
      timerRef.current = setInterval(() => {
        setTimeLeft((t) => {
          if (t <= 1) { clearInterval(timerRef.current!); return 0 }
          return t - 1
        })
      }, 1000)
    } else {
      if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null }
    }
    return () => { if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null } }
  }, [iAmBuzzed])

  // Flash rouge sur mauvaise réponse
  useEffect(() => {
    if (myAnswerResult === 'wrong' && iAmBuzzed) {
      setWrongFlash(true)
      setTimeout(() => setWrongFlash(false), 600)
    }
  }, [myAnswerResult])

  const handleBuzz = () => {
    if (isBuzzedOut || activeBuzz || myAnswerResult === 'correct') return
    getSocket().emit('game:buzz')
  }

  const submit = () => {
    if (!answer.trim() || !iAmBuzzed) return
    getSocket().emit('game:submitAnswer', { answer: answer.trim(), timestamp: Date.now() })
    setAnswer('')
  }

  // Bonne réponse
  if (myAnswerResult === 'correct') {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex items-center justify-center gap-3 bg-emerald-500/20 border border-emerald-500/40 rounded-2xl p-5 w-full max-w-lg mx-auto"
      >
        <span className="text-3xl">✅</span>
        <div>
          <p className="text-emerald-400 font-bold text-lg">Bonne réponse !</p>
          <p className="text-emerald-600 text-sm">En attente des autres joueurs...</p>
        </div>
      </motion.div>
    )
  }

  // Je suis le buzzeur — input avec countdown
  if (iAmBuzzed) {
    const urgentColor = timeLeft <= 5 ? 'text-red-400' : 'text-primary-light'
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-lg mx-auto space-y-3"
      >
        <div className="flex items-center justify-between px-1">
          <span className="text-white font-semibold text-sm">C'est ton tour !</span>
          <span className={`font-bold text-lg font-display ${urgentColor}`}>
            {timeLeft}s
          </span>
        </div>
        <motion.div
          className="flex gap-2"
          animate={wrongFlash ? { x: [-6, 6, -4, 4, 0] } : {}}
          transition={{ duration: 0.35 }}
        >
          <input
            ref={inputRef}
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && submit()}
            placeholder="Titre ou artiste..."
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            className={`
              flex-1 bg-bg-card border rounded-xl px-4 py-3.5
              text-white placeholder-slate-600 text-base
              focus:outline-none focus:ring-2 transition-all duration-200
              ${wrongFlash
                ? 'border-red-500/60 focus:ring-red-500/40'
                : 'border-primary/60 focus:ring-primary/60'
              }
            `}
          />
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={submit}
            disabled={!answer.trim()}
            className="bg-primary hover:bg-primary-glow text-white rounded-xl px-5 py-3.5 font-semibold text-sm transition-all shadow-glow-sm disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Envoyer
          </motion.button>
        </motion.div>
      </motion.div>
    )
  }

  // Quelqu'un d'autre a buzzé
  if (someoneElseBuzzed) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex items-center justify-center gap-3 bg-yellow-500/10 border border-yellow-500/30 rounded-2xl p-5 w-full max-w-lg mx-auto"
      >
        <div
          className="w-8 h-8 rounded-full flex-shrink-0"
          style={{ backgroundColor: activeBuzz!.avatarColor }}
        />
        <div>
          <p className="text-yellow-300 font-bold">{activeBuzz!.playerName} répond...</p>
          <p className="text-yellow-600 text-sm">La musique est en pause</p>
        </div>
      </motion.div>
    )
  }

  // Éliminé ce round
  if (isBuzzedOut) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex items-center justify-center gap-3 bg-red-500/10 border border-red-500/30 rounded-2xl p-5 w-full max-w-lg mx-auto"
      >
        <span className="text-3xl">❌</span>
        <div>
          <p className="text-red-400 font-bold">Éliminé ce round</p>
          <p className="text-red-600 text-sm">Continue d'écouter...</p>
        </div>
      </motion.div>
    )
  }

  // Bouton BUZZ principal
  return (
    <div className="flex flex-col items-center gap-3 w-full max-w-lg mx-auto">
      <motion.button
        whileTap={{ scale: 0.93 }}
        whileHover={{ scale: 1.03 }}
        onClick={handleBuzz}
        disabled={status !== 'playing'}
        className="
          w-full py-6 rounded-2xl font-display font-extrabold text-3xl
          bg-primary hover:bg-primary-glow text-white
          shadow-glow transition-all duration-150
          disabled:opacity-40 disabled:cursor-not-allowed
          active:shadow-none
        "
      >
        BUZZ !
      </motion.button>
      <p className="text-slate-500 text-xs">Premier à buzzer répond en 15 secondes</p>
    </div>
  )
}
