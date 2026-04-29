import { useRef, useCallback, useState, useEffect } from 'react'
import { usePlayerStore } from '../store/usePlayerStore'

export function useAudioPlayer() {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [audioBlocked, setAudioBlocked] = useState(false)
  const pendingUrlRef = useRef<string | null>(null)
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
    audio.play().then(() => {
      setAudioBlocked(false)
      pendingUrlRef.current = null
    }).catch((err: Error) => {
      console.warn('[AudioPlayer] play() bloqué:', err)
      if (err?.name === 'NotAllowedError') {
        pendingUrlRef.current = previewUrl
        setAudioBlocked(true)
      }
    })
  }, [])

  const unlockAudio = useCallback(() => {
    const audio = audioRef.current
    if (!audio) return
    const url = pendingUrlRef.current ?? audio.src
    if (!url) return
    audio.src = url
    audio.currentTime = 0
    audio.play().then(() => {
      setAudioBlocked(false)
      pendingUrlRef.current = null
    }).catch(() => {})
  }, [])

  const stopSong = useCallback(() => {
    const audio = audioRef.current
    if (!audio) return
    audio.pause()
    audio.src = ''
    setIsPlaying(false)
    setAudioBlocked(false)
    pendingUrlRef.current = null
  }, [])

  const setVolume = useCallback((v: number) => {
    if (audioRef.current) audioRef.current.volume = v / 100
  }, [])

  return { playSong, stopSong, setVolume, isPlaying, audioBlocked, unlockAudio }
}
