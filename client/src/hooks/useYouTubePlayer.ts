import { useEffect, useRef, useCallback } from 'react'
import { usePlayerStore } from '../store/usePlayerStore'

declare global {
  interface Window {
    YT: typeof YT
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
          onReady: (e) => {
            e.target.setVolume(volume)
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

  // Mettre à jour le volume quand il change
  useEffect(() => {
    playerRef.current?.setVolume(volume)
  }, [volume])

  const playSong = useCallback((videoId: string, startSeconds = 15) => {
    playerRef.current?.loadVideoById({ videoId, startSeconds })
  }, [])

  const stopSong = useCallback(() => {
    playerRef.current?.stopVideo()
  }, [])

  const setVolume = useCallback((v: number) => {
    playerRef.current?.setVolume(v)
  }, [])

  return { containerRef, playSong, stopSong, setVolume }
}
