import type { PlayerScore } from '../types'

const BASE_POINTS = 1000

const FIRST_BONUS = 1.5
const SECOND_BONUS = 1.2
const MIN_SCORE_RATIO = 0.2

const STREAK_BONUS: Array<[number, number]> = [
  [7, 350],
  [5, 200],
  [3, 100],
]

export function calculatePoints(
  timeRemaining: number,
  timeLimit: number,
  correctOrder: number // 0-based index (0 = first to guess)
): number {
  const base = BASE_POINTS
  const speedRatio = Math.max(MIN_SCORE_RATIO, timeRemaining / timeLimit)
  const speedPoints = Math.round(base * speedRatio)

  const multiplier =
    correctOrder === 0 ? FIRST_BONUS : correctOrder === 1 ? SECOND_BONUS : 1.0
  return Math.round(speedPoints * multiplier)
}

export function getStreakBonus(streak: number): number {
  for (const [threshold, bonus] of STREAK_BONUS) {
    if (streak >= threshold) return bonus
  }
  return 0
}

export function createInitialScore(
  playerId: string,
  playerName: string,
  avatarColor: string,
  teamId?: 'A' | 'B'
): PlayerScore {
  return {
    playerId,
    playerName,
    avatarColor,
    score: 0,
    correctAnswers: 0,
    totalAnswers: 0,
    averageGuessTime: 0,
    totalGuessTime: 0,
    streak: 0,
    bestStreak: 0,
    teamId,
  }
}

export function applyCorrectAnswer(
  score: PlayerScore,
  points: number,
  streakBonus: number,
  guessTime: number
): PlayerScore {
  const newStreak = score.streak + 1
  const totalGuessTime = score.totalGuessTime + guessTime
  const correctAnswers = score.correctAnswers + 1
  return {
    ...score,
    score: score.score + points + streakBonus,
    correctAnswers,
    totalAnswers: score.totalAnswers + 1,
    streak: newStreak,
    bestStreak: Math.max(score.bestStreak, newStreak),
    totalGuessTime,
    averageGuessTime: totalGuessTime / correctAnswers,
  }
}

export function applyWrongAnswer(score: PlayerScore): PlayerScore {
  return {
    ...score,
    totalAnswers: score.totalAnswers + 1,
    streak: 0,
  }
}
