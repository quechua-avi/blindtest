import type { Song, AnswerCheckResult } from '../types'

function normalize(str: string): string {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')   // strip accents
    .replace(/[^a-z0-9\s]/g, '')       // remove punctuation
    .replace(/\s+/g, ' ')
    .trim()
}

function levenshtein(a: string, b: string): number {
  const m = a.length
  const n = b.length
  const dp: number[][] = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  )
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] =
        a[i - 1] === b[j - 1]
          ? dp[i - 1][j - 1]
          : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1])
    }
  }
  return dp[m][n]
}

export function checkAnswer(input: string, song: Song, options?: { titleOnly?: boolean }): AnswerCheckResult {
  const norm = normalize(input)
  if (norm.length < 2) return { correct: false }

  // Vérifier le format "Titre - Artiste" (choix multiple)
  const combined = normalize(`${song.title} - ${song.artist}`)
  if (norm === combined) return { correct: true, matched: 'exact', matchedField: 'title' }

  const titleTargets = [song.title, ...(song.alternativeTitles ?? [])].map(normalize)

  // Check title
  for (const target of titleTargets) {
    if (target === norm) return { correct: true, matched: 'exact', matchedField: 'title' }
    const threshold = Math.max(1, Math.floor(target.length / 5))
    if (levenshtein(norm, target) <= threshold) {
      return { correct: true, matched: 'fuzzy', matchedField: 'title' }
    }
    // Partial: input is contained in the target (for long titles)
    if (norm.length >= 4 && target.includes(norm)) {
      return { correct: true, matched: 'partial', matchedField: 'title' }
    }
  }

  // Check artist (désactivé pour les genres mono-artiste)
  if (!options?.titleOnly) {
    const artistTargets = [song.artist, ...(song.alternativeArtists ?? [])].map(normalize)
    for (const target of artistTargets) {
      if (target === norm) return { correct: true, matched: 'exact', matchedField: 'artist' }
      const threshold = Math.max(1, Math.floor(target.length / 5))
      if (levenshtein(norm, target) <= threshold) {
        return { correct: true, matched: 'fuzzy', matchedField: 'artist' }
      }
    }
  }

  return { correct: false }
}
