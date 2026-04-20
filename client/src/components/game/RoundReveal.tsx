import { motion } from 'framer-motion'
import { useGameStore } from '../../store/useGameStore'
import { Badge } from '../ui/Badge'
import { GENRE_LABELS, GENRE_COLORS } from '../../types/game'

export function RoundReveal() {
  const revealedSong = useGameStore((s) => s.revealedSong)
  const players = useGameStore((s) => s.players)
  const settings = useGameStore((s) => s.settings)
  const teamScores = useGameStore((s) => s.teamScores)

  if (!revealedSong) return null

  const { song, correctGuessers, coverUrl } = revealedSong
  const winnerNames = correctGuessers.map((id) => players.find((p) => p.id === id)?.name).filter(Boolean)
  const isTeams = settings.mode === 'teams' && teamScores !== null

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full max-w-lg mx-auto space-y-3"
    >
      <div className="bg-bg-card border border-bg-border rounded-2xl p-6 text-center space-y-3">
        {coverUrl ? (
          <motion.img
            src={coverUrl}
            alt={`${song.title} - ${song.artist}`}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
            className="w-32 h-32 rounded-xl mx-auto object-cover shadow-lg"
          />
        ) : (
          <div className="text-4xl">🎵</div>
        )}
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

      {isTeams && (
        <div className="flex gap-3">
          <div className="flex-1 bg-blue-500/10 border border-blue-500/40 rounded-xl p-3 text-center">
            <p className="text-xs text-blue-400 font-semibold mb-1">Équipe A</p>
            <p className="text-xl font-bold font-display text-blue-300">{teamScores.A.toLocaleString()}</p>
          </div>
          <div className="flex items-center text-slate-500 font-bold text-sm">VS</div>
          <div className="flex-1 bg-red-500/10 border border-red-500/40 rounded-xl p-3 text-center">
            <p className="text-xs text-red-400 font-semibold mb-1">Équipe B</p>
            <p className="text-xl font-bold font-display text-red-300">{teamScores.B.toLocaleString()}</p>
          </div>
        </div>
      )}
    </motion.div>
  )
}
