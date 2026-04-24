import type { Song, GameSettings } from '../types'
import { SONG_LIBRARY } from './songLibrary'
import { getDynamicSongs } from './deezerCharts'

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
  // Construire le pool : bibliothèque statique + chansons dynamiques si chartsweekly sélectionné
  const includeCharts = settings.genres.includes('chartsweekly')
  const dynamicSongs = includeCharts ? getDynamicSongs() : []

  const staticGenres = settings.genres.filter((g) => g !== 'chartsweekly')
  const staticFiltered = staticGenres.length > 0
    ? SONG_LIBRARY.filter((s) => staticGenres.includes(s.genre))
    : []

  const allSongs = [...staticFiltered, ...dynamicSongs]
  const filtered = allSongs

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
  const needed = count - 1

  // Priorité : même genre + même décennie
  const sameGenreAndDecade = shuffle(
    allSongs.filter((s) => s.id !== song.id && s.genre === song.genre && s.decade === song.decade)
  )
  // Fallback : même genre, décennie différente
  const sameGenreOtherDecade = shuffle(
    allSongs.filter((s) => s.id !== song.id && s.genre === song.genre && s.decade !== song.decade)
  )
  // Dernier recours : autre genre
  const otherGenre = shuffle(
    allSongs.filter((s) => s.id !== song.id && s.genre !== song.genre)
  )

  const distractors: Song[] = []
  for (const pool of [sameGenreAndDecade, sameGenreOtherDecade, otherGenre]) {
    for (const s of pool) {
      if (distractors.length >= needed) break
      distractors.push(s)
    }
    if (distractors.length >= needed) break
  }

  const choices = distractors.map((s) => `${s.title} - ${s.artist}`)
  choices.push(correctAnswer)
  return shuffle(choices)
}
