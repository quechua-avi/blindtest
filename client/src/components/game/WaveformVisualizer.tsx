import { GENRE_COLORS } from '../../types/game'
import type { Genre } from '../../types/game'

interface WaveformVisualizerProps {
  genre?: Genre
  isPlaying: boolean
}

const BAR_COUNT = 24

export function WaveformVisualizer({ genre, isPlaying }: WaveformVisualizerProps) {
  const color = genre ? GENRE_COLORS[genre] : '#7c3aed'

  return (
    <div className="flex items-center justify-center gap-1 h-20">
      {Array.from({ length: BAR_COUNT }, (_, i) => (
        <div
          key={i}
          className={`w-1.5 rounded-full transition-all ${isPlaying ? 'animate-waveform' : ''}`}
          style={{
            backgroundColor: color,
            height: isPlaying ? undefined : '8px',
            animationDelay: `${(i * 50) % 600}ms`,
            animationDuration: `${700 + (i * 47) % 500}ms`,
            minHeight: '8px',
            maxHeight: '56px',
          }}
        />
      ))}
    </div>
  )
}
