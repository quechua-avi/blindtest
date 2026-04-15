import { useRef, useCallback, useState, useEffect } from 'react'
import { usePlayerStore } from '../store/usePlayerStore'

export function useAudioPlayer() {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const volume = usePlayerStore((s) => s.volume)

  // Créer l'élément audio une seule fois
  useEffect(() => {
    const audio = new Audio()
    audio.preload = 'auto'
    audio.volume = volume / 100

    audio.addEventListener('playing', () => setIsPlaying(true))
    audio.addEventListener('pause', () => setIsPlaying(false))
    audio.addEventListener('ended', () => setIsPlaying(false))
    audio.addEventListener('error', (e) => {
      console.warn('[AudioPlayer] Erreur de lecture:', e)
      setIsPlaying(false)
    })

    audioRef.current = audio

    return () => {
      audio.pause()
      audio.src = ''
      audioRef.current = null
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Sync volume
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume / 100
    }
  }, [volume])

  const playSong = useCallback((previewUrl: string) => {
    const audio = audioRef.current
    if (!audio) return

    audio.pause()
    audio.src = previewUrl
    audio.currentTime = 0
    audio.play().catch((err) => {
      console.warn('[AudioPlayer] play() bloqué:', err)
    })
  }, [])

  const stopSong = useCallback(() => {
    const audio = audioRef.current
    if (!audio) return
    audio.pause()
    audio.src = ''
    setIsPlaying(false)
  }, [])

  const setVolume = useCallback((v: number) => {
    if (audioRef.current) audioRef.current.volume = v / 100
  }, [])

  return { playSong, stopSong, setVolume, isPlaying }
}
