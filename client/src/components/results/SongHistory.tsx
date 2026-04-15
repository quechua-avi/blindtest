import type { GameResults } from '../../types/game'
import { Badge } from '../ui/Badge'
import { GENRE_LABELS, GENRE_COLORS } from '../../types/game'

interface SongHistoryProps {
  songsPlayed: GameResults['songsPlayed']
  players: Array<{ id: string; name: string }>
}

export function SongHistory({ songsPlayed, players }: SongHistoryProps) {
  return (
    <div className="space-y-2">
      <h3 className="text-sm font-medium text-slate-400 mb-3">Chansons jouées</h3>
      {songsPlayed.map(({ song, winners }, i) => {
        const winnerNames = winners.map((id) => players.find((p) => p.id === id)?.name).filter(Boolean)
        return (
          <div key={i} className="flex items-center gap-3 bg-bg-surface border border-bg-border rounded-xl px-4 py-3">
            <span className="text-slate-500 text-sm font-bold w-6 text-center">{i + 1}</span>
            <div className="flex-1 min-w-0">
              <p className="text-white font-semibold text-sm truncate">{song.title}</p>
              <p className="text-slate-400 text-xs">{song.artist} · {song.year}</p>
            </div>
            <Badge label={GENRE_LABELS[song.genre]} color={GENRE_COLORS[song.genre]} />
            <div className="text-right flex-shrink-0 ml-2">
              {winnerNames.length > 0 ? (
                <p className="text-emerald-400 text-xs">✓ {winnerNames.slice(0, 2).join(', ')}{winnerNames.length > 2 ? '...' : ''}</p>
              ) : (
                <p className="text-slate-600 text-xs">Personne</p>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
