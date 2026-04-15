import { useEffect, useRef, useCallback } from 'react'
import { usePlayerStore } from '../store/usePlayerStore'

declare global {
  interface Window {
    YT: typeof YT & { Player: new (...args: unknown[]) => YT.Player }
    onYouTubeIframeAPIReady: () => void
  }
}

let ytApiPromise: Promise<void> | null = null

function loadYTApi(): Promise<void> {
  if (ytApiPromise) return ytApiPromise
  ytApiPromise = new Promise((resolve) => {
    if (window.YT?.Player) { resolve(); return }
    window.onYouTubeIframeAPIReady = resolve
    const tag = document.createElement('script')
    tag.src = 'https://www.youtube.com/iframe_api'
    document.head.appendChild(tag)
  })
  return ytApiPromise
}

export function useYouTubePlayer() {
  const playerRef = useRef<YT.Player | null>(null)
  const containerRef = useRef<HTMLDivElement | null>(null)
  // File d'attente : si playSong est appelé avant que le player soit prêt
  const pendingRef = useRef<{ videoId: string; startSeconds: number } | null>(null)
  const volume = usePlayerStore((s) => s.volume)

  useEffect(() => {
    let mounted = true

    loadYTApi().then(() => {
      if (!mounted || !containerRef.current) return

      playerRef.current = new window.YT.Player(containerRef.current, {
        width: '1',
        height: '1',
        playerVars: {
          autoplay: 0,
          controls: 0,
          disablekb: 1,
          fs: 0,
          modestbranding: 1,
          rel: 0,
        },
        events: {
          onReady: (e: YT.PlayerEvent) => {
            e.target.setVolume(volume)
            // Jouer la chanson en attente si elle est arrivée avant que le player soit prêt
            if (pendingRef.current) {
              const { videoId, startSeconds } = pendingRef.current
              pendingRef.current = null
              e.target.loadVideoById({ videoId, startSeconds })
            }
          },
        },
      })
    })

    return () => {
      mounted = false
      playerRef.current?.destroy()
      playerRef.current = null
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    playerRef.current?.setVolume(volume)
  }, [volume])

  const playSong = useCallback((videoId: string, startSeconds = 15) => {
    if (playerRef.current) {
      playerRef.current.loadVideoById({ videoId, startSeconds })
    } else {
      // Player pas encore prêt → on met en file d'attente
      pendingRef.current = { videoId, startSeconds }
    }
  }, [])

  const stopSong = useCallback(() => {
    pendingRef.current = null
    playerRef.current?.stopVideo()
  }, [])

  const setVolume = useCallback((v: number) => {
    playerRef.current?.setVolume(v)
  }, [])

  return { containerRef, playSong, stopSong, setVolume }
}
