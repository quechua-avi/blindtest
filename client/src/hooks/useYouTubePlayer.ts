import { useEffect, useRef, useCallback, useState } from 'react'
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

// Pré-charger l'API YouTube dès le lobby pour qu'elle soit prête au démarrage du jeu
export function preloadYTApi() {
  loadYTApi()
}

export function useYouTubePlayer() {
  const playerRef = useRef<YT.Player | null>(null)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const playerReadyRef = useRef(false)        // true seulement après onReady
  const pendingRef = useRef<{ videoId: string; startSeconds: number } | null>(null)
  const currentStartSecondsRef = useRef(15)   // pour détecter les pubs
  const adCheckTimer = useRef<ReturnType<typeof setInterval> | null>(null)
  const [isAdPlaying, setIsAdPlaying] = useState(false)
  const volume = usePlayerStore((s) => s.volume)

  const clearAdCheck = () => {
    if (adCheckTimer.current) {
      clearInterval(adCheckTimer.current)
      adCheckTimer.current = null
    }
  }

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
          playsinline: 1,
        },
        events: {
          onReady: (e: YT.PlayerEvent) => {
            playerReadyRef.current = true
            e.target.setVolume(volume)
            // Jouer la chanson mise en file d'attente si elle est arrivée avant onReady
            if (pendingRef.current) {
              const { videoId, startSeconds } = pendingRef.current
              pendingRef.current = null
              currentStartSecondsRef.current = startSeconds
              e.target.loadVideoById({ videoId, startSeconds })
            }
          },
          onStateChange: (e: YT.OnStateChangeEvent) => {
            if (e.data === 1) {
              // État PLAYING — vérifier si c'est une pub ou la vraie chanson
              clearAdCheck()
              adCheckTimer.current = setInterval(() => {
                if (!playerRef.current) return
                const currentTime = playerRef.current.getCurrentTime()
                const expected = currentStartSecondsRef.current
                // Si la position courante est bien avant startSeconds → pub en cours
                if (currentTime < expected - 5) {
                  setIsAdPlaying(true)
                } else {
                  setIsAdPlaying(false)
                  clearAdCheck()
                }
              }, 500)
            } else {
              // Arrêt / pause / fin → plus de pub
              clearAdCheck()
              setIsAdPlaying(false)
            }
          },
        },
      })
    })

    return () => {
      mounted = false
      clearAdCheck()
      playerRef.current?.destroy()
      playerRef.current = null
      playerReadyRef.current = false
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    playerRef.current?.setVolume(volume)
  }, [volume])

  const playSong = useCallback((videoId: string, startSeconds = 15) => {
    currentStartSecondsRef.current = startSeconds
    if (playerRef.current && playerReadyRef.current) {
      // Player prêt → lecture immédiate
      playerRef.current.loadVideoById({ videoId, startSeconds })
    } else {
      // Player pas encore prêt → file d'attente, sera joué dans onReady
      pendingRef.current = { videoId, startSeconds }
    }
  }, [])

  const stopSong = useCallback(() => {
    clearAdCheck()
    setIsAdPlaying(false)
    pendingRef.current = null
    playerRef.current?.stopVideo()
  }, [])

  const setVolume = useCallback((v: number) => {
    playerRef.current?.setVolume(v)
  }, [])

  return { containerRef, playSong, stopSong, setVolume, isAdPlaying }
}
