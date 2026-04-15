import { motion } from 'framer-motion'
import { getSocket } from '../../socket/socketClient'
import { useGameStore } from '../../store/useGameStore'

export function MultipleChoice() {
  const choices = useGameStore((s) => s.currentRound?.choices)
  const myAnswerResult = useGameStore((s) => s.myAnswerResult)
  const status = useGameStore((s) => s.status)
  const revealedSong = useGameStore((s) => s.revealedSong)

  if (!choices) return null

  const hasAnswered = myAnswerResult === 'correct' || myAnswerResult === 'wrong'
  const disabled = hasAnswered || status !== 'playing'

  const correctAnswer = revealedSong
    ? `${revealedSong.song.title} - ${revealedSong.song.artist}`
    : null

  const handleChoice = (choice: string) => {
    if (disabled) return
    getSocket().emit('game:submitAnswer', { answer: choice, timestamp: Date.now() })
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-lg mx-auto">
      {choices.map((choice, i) => {
        const isCorrect = correctAnswer && choice === correctAnswer
        const isRevealed = !!revealedSong

        let className = 'p-4 rounded-xl border text-left font-medium text-sm transition-all duration-200 '
        if (isRevealed) {
          className += isCorrect
            ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300'
            : 'bg-bg-surface border-bg-border text-slate-500'
        } else {
          className += disabled
            ? 'bg-bg-surface border-bg-border text-slate-400 cursor-not-allowed'
            : 'bg-bg-card border-bg-border text-slate-200 hover:border-primary/50 hover:bg-primary/10 cursor-pointer'
        }

        return (
          <motion.button
            key={i}
            whileTap={disabled ? {} : { scale: 0.97 }}
            onClick={() => handleChoice(choice)}
            disabled={disabled}
            className={className}
          >
            <span className="text-slate-500 mr-2">{String.fromCharCode(65 + i)}.</span>
            {choice}
            {isRevealed && isCorrect && <span className="ml-2">✓</span>}
          </motion.button>
        )
      })}
    </div>
  )
}
