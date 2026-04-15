import { useState } from 'react'
import { getSocket } from '../../socket/socketClient'
import { useGameStore } from '../../store/useGameStore'
import { Button } from '../ui/Button'

export function HostControls() {
  const isHost = useGameStore((s) => s.isHost)
  const [paused, setPaused] = useState(false)

  if (!isHost) return null

  const skip = () => getSocket().emit('game:skipSong')
  const togglePause = () => {
    const next = !paused
    setPaused(next)
    getSocket().emit('game:pause', { paused: next })
  }
  const endGame = () => {
    if (confirm('Terminer la partie maintenant ?')) {
      getSocket().emit('game:end')
    }
  }

  return (
    <div className="flex items-center gap-2 justify-center">
      <Button variant="secondary" size="sm" onClick={togglePause}>
        {paused ? '▶ Reprendre' : '⏸ Pause'}
      </Button>
      <Button variant="secondary" size="sm" onClick={skip}>
        ⏭ Passer
      </Button>
      <Button variant="danger" size="sm" onClick={endGame}>
        ✕ Terminer
      </Button>
    </div>
  )
}
