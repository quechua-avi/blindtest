import { useEffect, useRef } from 'react'
import { useGameStore } from '../../store/useGameStore'
import { useYouTubePlayer } from '../../hooks/useYouTubePlayer'
import { WaveformVisualizer } from './WaveformVisualizer'
import { Badge } from '../ui/Badge'
import { GENRE_LABELS, GENRE_COLORS, DECADE_LABELS } from '../../types/game'

export function YouTubePlayer() {
  const currentRound = useGameStore((s) => s.currentRound)
  const status = useGameStore((s) => s.status)
  const { containerRef, playSong, stopSong } = useYouTubePlayer()
  const lastSongId = useRef<string | null>(null)

  const isPlaying = status === 'playing'

  // On joue la chanson quand le round démarre
  // Note: le serveur envoie l'id de la chanson uniquement dans roundEnd pour éviter la triche
  // Pendant le playing, le serveur déclenche la lecture via roundStart qui contient l'id
  // On récupère l'id depuis un état externe
  useEffect(() => {
    const store = useGameStore.getState()
    // L'id est stocké dans currentRound si on l'ajoute côté client après roundEnd
    // En pratique, on écoute un event spécial dédié au player
  }, [currentRound])

  return (
    <div className="flex flex-col items-center gap-6 py-8">
      {/* Iframe caché — DOIT être dans le DOM, pas display:none */}
      <div
        ref={containerRef}
        style={{ position: 'absolute', left: '-9999px', width: 1, height: 1, overflow: 'hidden' }}
        aria-hidden="true"
      />

      {/* Infos du round */}
      {currentRound && (
        <div className="flex items-center gap-2">
          <Badge
            label={GENRE_LABELS[currentRound.genre]}
            color={GENRE_COLORS[currentRound.genre]}
          />
          <Badge
            label={DECADE_LABELS[currentRound.decade]}
            className="bg-bg-card border border-bg-border text-slate-400"
          />
          <span className="text-slate-500 text-sm">
            Round {currentRound.roundNumber}/{currentRound.totalRounds}
          </span>
        </div>
      )}

      {/* Visualiseur */}
      <div className="relative w-full max-w-sm">
        <div className="bg-bg-card border border-bg-border rounded-2xl p-8 flex flex-col items-center gap-4">
          {isPlaying ? (
            <>
              <div className="text-4xl animate-bounce-subtle">🎵</div>
              <WaveformVisualizer genre={currentRound?.genre} isPlaying={true} />
              <p className="text-slate-500 text-sm">Écoute bien...</p>
            </>
          ) : (
            <>
              <div className="text-4xl">⏸</div>
              <WaveformVisualizer genre={currentRound?.genre} isPlaying={false} />
              <p className="text-slate-500 text-sm">En attente...</p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// Export des fonctions pour usage externe
export { useYouTubePlayer }
