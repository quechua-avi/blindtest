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

export function selectSongs(settings: GameSettings): Song[] {
  const filtered = SONG_LIBRARY.filter(
    (s) =>
      settings.genres.includes(s.genre) &&
      settings.decades.includes(s.decade)
  )

  const shuffled = shuffle(filtered)
  return shuffled.slice(0, Math.min(settings.rounds, shuffled.length))
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
