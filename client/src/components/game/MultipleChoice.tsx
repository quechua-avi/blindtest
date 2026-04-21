import { useState } from 'react'
import { motion } from 'framer-motion'
import { getSocket } from '../../socket/socketClient'
import { useGameStore } from '../../store/useGameStore'

export function MultipleChoice() {
  const choices = useGameStore((s) => s.currentRound?.choices)
  const myAnswerResult = useGameStore((s) => s.myAnswerResult)
  const status = useGameStore((s) => s.status)
  const revealedSong = useGameStore((s) => s.revealedSong)
  const [selectedChoice, setSelectedChoice] = useState<string | null>(null)

  if (!choices) return null

  const hasAnswered = myAnswerResult === 'correct' || myAnswerResult === 'wrong'
  const disabled = hasAnswered || status !== 'playing'

  const correctAnswer = revealedSong
    ? `${revealedSong.song.title} - ${revealedSong.song.artist}`
    : null

  const handleChoice = (choice: string) => {
    if (disabled) return
    setSelectedChoice(choice)
    getSocket().emit('game:submitAnswer', { answer: choice, timestamp: Date.now() })
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-lg mx-auto">
      {choices.map((choice, i) => {
        const isRevealed = !!revealedSong
        const isCorrectReveal = isRevealed && correctAnswer && choice === correctAnswer
        const isSelected = choice === selectedChoice

        let className = 'p-4 rounded-xl border text-left font-medium text-sm transition-all duration-200 '

        if (isRevealed) {
          // Phase reveal : montrer la bonne réponse en vert, les autres en gris
          className += isCorrectReveal
            ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300'
            : 'bg-bg-surface border-bg-border text-slate-500'
        } else if (isSelected) {
          // Réponse sélectionnée : feedback immédiat selon le résultat
          className += myAnswerResult === 'correct'
            ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300'
            : myAnswerResult === 'wrong'
              ? 'bg-red-500/20 border-red-500/50 text-red-300'
              : 'bg-primary/20 border-primary/50 text-primary cursor-not-allowed' // pending
        } else {
          className += disabled
            ? 'bg-bg-surface border-bg-border text-slate-400 cursor-not-allowed opacity-60'
            : 'bg-bg-card border-bg-border text-slate-200 hover:border-primary/50 hover:bg-primary/10 cursor-pointer'
        }

        return (
          <motion.button
            key={i}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06, type: 'spring', stiffness: 300, damping: 24 }}
            whileTap={disabled ? {} : { scale: 0.96 }}
            whileHover={disabled ? {} : { scale: 1.02 }}
            onClick={() => handleChoice(choice)}
            disabled={disabled}
            className={className}
          >
            <span className="text-slate-500 mr-2">{String.fromCharCode(65 + i)}.</span>
            {choice}
            {isSelected && myAnswerResult === 'correct' && <span className="ml-2">✓</span>}
            {isSelected && myAnswerResult === 'wrong' && <span className="ml-2">✗</span>}
            {isRevealed && isCorrectReveal && !isSelected && <span className="ml-2">✓</span>}
          </motion.button>
        )
      })}
    </div>
  )
}
