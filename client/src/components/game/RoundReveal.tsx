import { motion } from 'framer-motion'
import { useGameStore } from '../../store/useGameStore'
import { Badge } from '../ui/Badge'
import { GENRE_LABELS, GENRE_COLORS } from '../../types/game'

export function RoundReveal() {
  const revealedSong = useGameStore((s) => s.revealedSong)
  const players = useGameStore((s) => s.players)

  if (!revealedSong) return null

  const { song, correctGuessers } = revealedSong
  const winnerNames = correctGuessers.map((id) => players.find((p) => p.id === id)?.name).filter(Boolean)

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full max-w-lg mx-auto"
    >
      <div className="bg-bg-card border border-bg-border rounded-2xl p-6 text-center space-y-3">
        <div className="text-4xl">🎵</div>
        <h2 className="text-2xl font-bold font-display text-white">{song.title}</h2>
        <p className="text-slate-400 text-lg">{song.artist}</p>
        <div className="flex items-center justify-center gap-2">
          <Badge label={GENRE_LABELS[song.genre]} color={GENRE_COLORS[song.genre]} />
          <Badge label={String(song.year)} className="bg-bg-surface border border-bg-border text-slate-400" />
        </div>

        {winnerNames.length > 0 && (
          <p className="text-emerald-400 text-sm">
            ✓ {winnerNames.join(', ')} {winnerNames.length === 1 ? 'a trouvé' : 'ont trouvé'}
          </p>
        )}
        {winnerNames.length === 0 && (
          <p className="text-slate-500 text-sm">Personne n'a trouvé cette fois...</p>
        )}

        <p className="text-slate-600 text-xs">Prochain round dans quelques secondes...</p>
      </div>
    </motion.div>
  )
}
