import type { Song, GameSettings } from '../types'
import { SONG_LIBRARY } from './songLibrary'

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

// Mémoire globale des chansons récemment jouées (persiste pendant la session serveur)
const recentlyPlayed = new Set<string>()

export function selectSongs(settings: GameSettings): Song[] {
  const filtered = SONG_LIBRARY.filter(
    (s) =>
      settings.genres.includes(s.genre) &&
      settings.decades.includes(s.decade)
  )

  // Exclure les chansons récemment jouées pour plus de variété
  const fresh = filtered.filter((s) => !recentlyPlayed.has(s.id))

  // Si pas assez de chansons fraîches, vider la mémoire et utiliser tout le pool
  let pool: Song[]
  if (fresh.length >= settings.rounds) {
    pool = fresh
  } else {
    recentlyPlayed.clear()
    pool = filtered
  }

  const selected = shuffle(pool).slice(0, Math.min(settings.rounds, pool.length))

  // Mémoriser les chansons sélectionnées
  selected.forEach((s) => recentlyPlayed.add(s.id))

  // Limiter la mémoire à 60 entrées max
  if (recentlyPlayed.size > 60) {
    const arr = [...recentlyPlayed]
    recentlyPlayed.clear()
    arr.slice(-60).forEach((id) => recentlyPlayed.add(id))
  }

  return selected
}

export function generateChoices(song: Song, allSongs: Song[], count = 4): string[] {
  const correctAnswer = `${song.title} - ${song.artist}`
  const sameGenre = allSongs.filter((s) => s.id !== song.id && s.genre === song.genre)
  const otherSongs = allSongs.filter((s) => s.id !== song.id && s.genre !== song.genre)

  const pool = shuffle([...sameGenre, ...otherSongs]).slice(0, count - 1)
  const choices = pool.map((s) => `${s.title} - ${s.artist}`)
  choices.push(correctAnswer)
  return shuffle(choices)
}
